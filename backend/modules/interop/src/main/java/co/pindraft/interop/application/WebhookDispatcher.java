package co.pindraft.interop.application;

import co.pindraft.interop.domain.WebhookDeliveryEntity;
import co.pindraft.interop.infrastructure.WebhookDeliveryRepository;
import co.pindraft.marketplace.events.ListingPublishedEvent;
import co.pindraft.marketplace.events.ListingSoldEvent;
import co.pindraft.mill_ops.events.LotIntakedEvent;
import co.pindraft.mill_ops.events.LotStageTransitionedEvent;
import co.pindraft.pools.events.ContributionRecordedEvent;
import co.pindraft.pools.events.PoolSettledEvent;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Webhook dispatcher. Subscribes to domain events from mill-ops, pools, and marketplace
 * via Spring Modulith's event registry. Enqueues delivery rows, then a scheduled sender
 * picks them up and POSTs with HMAC-SHA256 signatures.
 *
 * <p>Six event types: {@code shipment.received_at_mill}, {@code lot.stage_transition},
 * {@code pool.contribution_recorded}, {@code pool.settled}, {@code listing.published},
 * {@code listing.sold}.
 */
@Component
public class WebhookDispatcher {

    private static final Logger log = LoggerFactory.getLogger(WebhookDispatcher.class);
    private static final String SIGNATURE_HEADER = "X-Pindraft-Signature";

    private final WebhookSubscriptionService subscriptions;
    private final WebhookDeliveryRepository deliveries;
    private final ObjectMapper mapper;
    private final RestClient restClient;

    public WebhookDispatcher(
        WebhookSubscriptionService subscriptions,
        WebhookDeliveryRepository deliveries,
        ObjectMapper mapper
    ) {
        this.subscriptions = subscriptions;
        this.deliveries = deliveries;
        this.mapper = mapper;
        this.restClient = RestClient.builder().build();
    }

    @ApplicationModuleListener
    public void onLotIntaked(LotIntakedEvent event) {
        enqueueForSubscribers(event.tenantId(), "shipment.received_at_mill", Map.of(
            "event_type", "shipment.received_at_mill",
            "occurred_at", event.occurredAt().toString(),
            "tenant_id", event.tenantId().toString(),
            "external_shipment_id", event.externalShipmentId() == null ? "" : event.externalShipmentId(),
            "subject", Map.of(
                "lot_id", event.lotId().toString(),
                "customer_id", event.customerId().toString(),
                "intake_weight_kg", event.weightKg())));
    }

    @ApplicationModuleListener
    public void onLotStageTransitioned(LotStageTransitionedEvent event) {
        enqueueForSubscribers(event.tenantId(), "lot.stage_transition", Map.of(
            "event_type", "lot.stage_transition",
            "occurred_at", event.occurredAt().toString(),
            "tenant_id", event.tenantId().toString(),
            "subject", Map.of(
                "lot_id", event.lotId().toString(),
                "from_stage_type", event.fromStageType(),
                "to_stage_type", event.toStageType(),
                "weight_out_kg", event.weightOutKg())));
    }

    @ApplicationModuleListener
    public void onContributionRecorded(ContributionRecordedEvent event) {
        enqueueForSubscribers(event.tenantId(), "pool.contribution_recorded", Map.of(
            "event_type", "pool.contribution_recorded",
            "occurred_at", event.occurredAt().toString(),
            "tenant_id", event.tenantId().toString(),
            "subject", Map.of(
                "pool_id", event.poolId().toString(),
                "contribution_id", event.contributionId().toString(),
                "customer_id", event.customerId().toString(),
                "customer_display_name", event.customerDisplayName(),
                "weight_kg", event.weightKg())));
    }

    @ApplicationModuleListener
    public void onPoolSettled(PoolSettledEvent event) {
        enqueueForSubscribers(event.tenantId(), "pool.settled", Map.of(
            "event_type", "pool.settled",
            "occurred_at", event.occurredAt().toString(),
            "tenant_id", event.tenantId().toString(),
            "subject", Map.of(
                "pool_id", event.poolId().toString(),
                "total_revenue", event.totalRevenue(),
                "contributor_count", event.contributorCount())));
    }

    @ApplicationModuleListener
    public void onListingPublished(ListingPublishedEvent event) {
        enqueueForSubscribers(event.tenantId(), "listing.published", Map.of(
            "event_type", "listing.published",
            "occurred_at", event.occurredAt().toString(),
            "tenant_id", event.tenantId().toString(),
            "subject", Map.of(
                "listing_id", event.listingId().toString(),
                "kind", event.kind(),
                "title", event.title(),
                "price_per_kg", event.pricePerKg(),
                "quantity_kg", event.quantityKg(),
                "trace_slug", event.traceSlug() == null ? "" : event.traceSlug())));
    }

    @ApplicationModuleListener
    public void onListingSold(ListingSoldEvent event) {
        enqueueForSubscribers(event.tenantId(), "listing.sold", Map.of(
            "event_type", "listing.sold",
            "occurred_at", event.occurredAt().toString(),
            "tenant_id", event.tenantId().toString(),
            "subject", Map.of(
                "listing_id", event.listingId().toString(),
                "price_per_kg", event.pricePerKg(),
                "quantity_kg", event.quantityKg())));
    }

    @Transactional
    void enqueueForSubscribers(UUID tenantId, String eventType, Map<String, Object> payload) {
        var subs = subscriptions.findActiveSubscribers(tenantId, eventType);
        if (subs.isEmpty()) return;

        String payloadJson;
        try {
            payloadJson = mapper.writeValueAsString(payload);
        } catch (JacksonException e) {
            log.error("Failed to serialize webhook payload for {} on tenant {}", eventType, tenantId, e);
            return;
        }

        var eventId = UUID.randomUUID().toString();
        for (var sub : subs) {
            var delivery = new WebhookDeliveryEntity(
                UUID.randomUUID(), sub.getId(), eventId, eventType, payloadJson);
            deliveries.save(delivery);
        }
    }

    @Scheduled(fixedDelay = 30_000)
    @Transactional
    public void sendDueDeliveries() {
        var due = deliveries.findDue(Instant.now());
        for (var delivery : due) {
            sendOne(delivery);
        }
    }

    private void sendOne(WebhookDeliveryEntity delivery) {
        var sub = subscriptions.findById(delivery.getSubscriptionId()).orElse(null);
        if (sub == null || !sub.isActive()) {
            delivery.markFailed("subscription unavailable");
            deliveries.save(delivery);
            return;
        }

        try {
            String signature = computeHmacSignature(delivery.getPayloadJson(), sub.getSigningSecret());
            restClient.post()
                .uri(sub.getDeliveryUrl())
                .header("Content-Type", "application/json")
                .header("X-Pindraft-Event-Type", delivery.getEventType())
                .header("X-Pindraft-Event-Id", delivery.getEventId())
                .header(SIGNATURE_HEADER, "sha256=" + signature)
                .body(delivery.getPayloadJson())
                .retrieve()
                .toBodilessEntity();
            delivery.markSent();
        } catch (RuntimeException e) {  // RestClientException extends RuntimeException
            log.warn("Webhook delivery {} failed (attempt {}): {}",
                delivery.getId(), delivery.getAttempts() + 1, e.getMessage());
            delivery.markFailed(e.getMessage());
        }
        deliveries.save(delivery);
    }

    private static String computeHmacSignature(String payload, String secret) {
        try {
            var mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            var digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("HMAC computation failed", e);
        }
    }
}
