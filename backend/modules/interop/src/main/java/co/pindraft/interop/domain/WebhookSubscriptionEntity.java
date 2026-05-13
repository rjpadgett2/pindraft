package co.pindraft.interop.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;

/**
 * A tenant's subscription to one event type. When events of that type are published
 * within the tenant's scope, a {@link WebhookDeliveryEntity} is enqueued for this
 * subscription and the dispatcher POSTs to {@code deliveryUrl}.
 */
@Entity
@Table(name = "webhook_subscriptions")
@NullMarked
public class WebhookSubscriptionEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "tenant_id", columnDefinition = "uuid", nullable = false)
    private UUID tenantId;

    @Column(name = "event_type", nullable = false, length = 64)
    private String eventType;

    @Column(name = "delivery_url", nullable = false)
    private String deliveryUrl;

    @Column(name = "signing_secret", nullable = false)
    private String signingSecret;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected WebhookSubscriptionEntity() {}

    public WebhookSubscriptionEntity(UUID id, UUID tenantId, String eventType,
                                      String deliveryUrl, String signingSecret) {
        this.id = id;
        this.tenantId = tenantId;
        this.eventType = eventType;
        this.deliveryUrl = deliveryUrl;
        this.signingSecret = signingSecret;
        this.active = true;
        this.createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getTenantId() { return tenantId; }
    public String getEventType() { return eventType; }
    public String getDeliveryUrl() { return deliveryUrl; }
    public String getSigningSecret() { return signingSecret; }
    public boolean isActive() { return active; }
    public Instant getCreatedAt() { return createdAt; }

    public void deactivate() { this.active = false; }
}
