package co.pindraft.mill_ops.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;

@Entity
@Table(name = "lot_reservations")
@NullMarked
public class ReservationEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "tenant_id", columnDefinition = "uuid", nullable = false)
    private UUID tenantId;

    @Column(name = "customer_id", columnDefinition = "uuid", nullable = false)
    private UUID customerId;

    @Column(name = "pricing_arrangement_id", columnDefinition = "uuid") @Nullable
    private UUID pricingArrangementId;

    @Column(name = "expected_weight_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal expectedWeightKg;

    @Column(name = "slot_start", nullable = false)
    private Instant slotStart;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private ReservationStatus status;

    @Column(name = "external_source") @Nullable
    private String externalSource;

    @Column(name = "external_shipment_id") @Nullable
    private String externalShipmentId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ReservationEntity() {}

    public ReservationEntity(UUID id, UUID tenantId, UUID customerId,
                             @Nullable UUID pricingArrangementId,
                             BigDecimal expectedWeightKg, Instant slotStart) {
        this.id = id;
        this.tenantId = tenantId;
        this.customerId = customerId;
        this.pricingArrangementId = pricingArrangementId;
        this.expectedWeightKg = expectedWeightKg;
        this.slotStart = slotStart;
        this.status = ReservationStatus.PENDING;
        var now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public UUID getTenantId() { return tenantId; }
    public UUID getCustomerId() { return customerId; }
    @Nullable public UUID getPricingArrangementId() { return pricingArrangementId; }
    public BigDecimal getExpectedWeightKg() { return expectedWeightKg; }
    public Instant getSlotStart() { return slotStart; }
    public ReservationStatus getStatus() { return status; }
    @Nullable public String getExternalSource() { return externalSource; }
    @Nullable public String getExternalShipmentId() { return externalShipmentId; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setExternalSource(@Nullable String externalSource, @Nullable String externalShipmentId) {
        this.externalSource = externalSource;
        this.externalShipmentId = externalShipmentId;
        this.updatedAt = Instant.now();
    }

    public void markReceived() {
        this.status = ReservationStatus.RECEIVED;
        this.updatedAt = Instant.now();
    }

    public void cancel() {
        this.status = ReservationStatus.CANCELLED;
        this.updatedAt = Instant.now();
    }
}
