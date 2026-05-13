package co.pindraft.interop.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;

/**
 * One enqueued or completed webhook delivery. State machine: PENDING → SENT / RETRY → FAILED.
 *
 * <p>The dispatcher's scheduled job picks up PENDING and RETRY rows whose
 * {@code nextAttemptAt} has passed, POSTs the payload, and updates status accordingly.
 * Exponential backoff between retries; after {@code MAX_ATTEMPTS} the row is marked
 * FAILED and dropped.
 */
@Entity
@Table(name = "webhook_deliveries")
@NullMarked
public class WebhookDeliveryEntity {

    public static final int MAX_ATTEMPTS = 5;

    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "subscription_id", columnDefinition = "uuid", nullable = false)
    private UUID subscriptionId;

    @Column(name = "event_id", nullable = false)
    private String eventId;

    @Column(name = "event_type", nullable = false, length = 64)
    private String eventType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload_json", columnDefinition = "jsonb", nullable = false)
    private String payloadJson;

    @Column(name = "status", nullable = false, length = 16)
    private String status;

    @Column(name = "attempts", nullable = false)
    private int attempts;

    @Column(name = "last_attempt_at") @Nullable
    private Instant lastAttemptAt;

    @Column(name = "next_attempt_at", nullable = false)
    private Instant nextAttemptAt;

    @Column(name = "last_error", columnDefinition = "text") @Nullable
    private String lastError;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "sent_at") @Nullable
    private Instant sentAt;

    protected WebhookDeliveryEntity() {}

    public WebhookDeliveryEntity(UUID id, UUID subscriptionId, String eventId,
                                  String eventType, String payloadJson) {
        this.id = id;
        this.subscriptionId = subscriptionId;
        this.eventId = eventId;
        this.eventType = eventType;
        this.payloadJson = payloadJson;
        this.status = "PENDING";
        this.attempts = 0;
        this.createdAt = Instant.now();
        this.nextAttemptAt = this.createdAt;
    }

    public UUID getId() { return id; }
    public UUID getSubscriptionId() { return subscriptionId; }
    public String getEventId() { return eventId; }
    public String getEventType() { return eventType; }
    public String getPayloadJson() { return payloadJson; }
    public String getStatus() { return status; }
    public int getAttempts() { return attempts; }
    @Nullable public Instant getLastAttemptAt() { return lastAttemptAt; }
    public Instant getNextAttemptAt() { return nextAttemptAt; }
    @Nullable public String getLastError() { return lastError; }
    public Instant getCreatedAt() { return createdAt; }
    @Nullable public Instant getSentAt() { return sentAt; }

    public void markSent() {
        this.status = "SENT";
        this.sentAt = Instant.now();
        this.attempts++;
        this.lastAttemptAt = this.sentAt;
    }

    /** Mark a failed attempt and schedule the next retry, or mark FAILED if max attempts hit. */
    public void markFailed(String error) {
        this.attempts++;
        this.lastAttemptAt = Instant.now();
        this.lastError = error;
        if (this.attempts >= MAX_ATTEMPTS) {
            this.status = "FAILED";
        } else {
            this.status = "RETRY";
            // Exponential backoff: 30s, 1m, 2m, 4m, 8m
            long backoffSeconds = (long) (30L * Math.pow(2, this.attempts - 1));
            this.nextAttemptAt = Instant.now().plusSeconds(backoffSeconds);
        }
    }
}
