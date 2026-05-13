package co.pindraft.interop.api;

import co.pindraft.common.security.TenantAccessGuard;
import co.pindraft.interop.application.WebhookSubscriptionService;
import co.pindraft.interop.domain.WebhookSubscriptionEntity;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * Tenant-side admin for webhook subscriptions. Mill staff configure which event types
 * to receive and where to deliver them.
 *
 * <p>The signing secret is returned only on creation — subscribers store it to verify
 * incoming webhooks. There's no way to retrieve it later. Lost it? Recreate the
 * subscription.
 */
@RestController
@RequestMapping("/api/v1/tenants/{tenantId}/webhook-subscriptions")
@Tag(name = "Interop", description = "Webhook subscription admin")
public class WebhookSubscriptionController {

    private final WebhookSubscriptionService service;
    private final TenantAccessGuard accessGuard;

    public WebhookSubscriptionController(WebhookSubscriptionService service, TenantAccessGuard accessGuard) {
        this.service = service;
        this.accessGuard = accessGuard;
    }

    @GetMapping
    @Operation(summary = "List active webhook subscriptions for the tenant")
    public List<SubscriptionResponse> list(@PathVariable UUID tenantId) {
        accessGuard.requireRole(tenantId, "MILL_ADMIN");
        return service.listForTenant(tenantId).stream().map(WebhookSubscriptionController::toResponse).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a subscription; signing secret returned in response only")
    public SubscriptionCreatedResponse create(
        @PathVariable UUID tenantId, @Valid @RequestBody CreateRequest req
    ) {
        accessGuard.requireRole(tenantId, "MILL_ADMIN");
        var sub = service.create(tenantId, req.eventType(), req.deliveryUrl());
        return new SubscriptionCreatedResponse(toResponse(sub), sub.getSigningSecret());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Deactivate a webhook subscription")
    public void delete(@PathVariable UUID tenantId, @PathVariable UUID id) {
        accessGuard.requireRole(tenantId, "MILL_ADMIN");
        service.deactivate(tenantId, id);
    }

    private static SubscriptionResponse toResponse(WebhookSubscriptionEntity s) {
        return new SubscriptionResponse(
            s.getId(), s.getEventType(), s.getDeliveryUrl(), s.isActive(), s.getCreatedAt());
    }

    public record SubscriptionResponse(
        UUID id, String eventType, String deliveryUrl, boolean active, Instant createdAt) {}

    public record SubscriptionCreatedResponse(
        SubscriptionResponse subscription, String signingSecret) {}

    public record CreateRequest(
        @NotBlank String eventType,
        @NotBlank String deliveryUrl) {}
}
