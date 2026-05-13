package co.pindraft.mill_ops.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;

/**
 * A fiber lot. Created at intake from a reservation (or walk-in). Advances through
 * the mill's workflow stages, completes when the finished product ships.
 *
 * <p>{@code poolId} links a lot back to its source pool when the intake fiber came
 * from a {@code wool_pools} collective contribution. Optional — most lots have a
 * single shepherd customer.
 *
 * <p>{@code pricingKindSnapshot} and {@code pricingConfigSnapshot} capture the
 * arrangement at intake — the spec's snapshot-at-decision-moment pattern.
 */
@Entity
@Table(name = "lots")
@NullMarked
public class LotEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "tenant_id", columnDefinition = "uuid", nullable = false)
    private UUID tenantId;

    @Column(name = "customer_id", columnDefinition = "uuid", nullable = false)
    private UUID customerId;

    @Column(name = "reservation_id", columnDefinition = "uuid") @Nullable
    private UUID reservationId;

    @Column(name = "pool_id", columnDefinition = "uuid") @Nullable
    private UUID poolId;

    @Column(name = "current_stage_id", columnDefinition = "uuid") @Nullable
    private UUID currentStageId;

    @Column(name = "pricing_arrangement_id", columnDefinition = "uuid") @Nullable
    private UUID pricingArrangementId;

    @Column(name = "pricing_kind_snapshot", length = 32) @Nullable
    private String pricingKindSnapshot;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "pricing_config_snapshot", columnDefinition = "jsonb") @Nullable
    private String pricingConfigSnapshot;

    @Column(name = "weight_intake_kg", precision = 10, scale = 2) @Nullable
    private BigDecimal weightIntakeKg;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private LotStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected LotEntity() {}

    public LotEntity(UUID id, UUID tenantId, UUID customerId) {
        this.id = id;
        this.tenantId = tenantId;
        this.customerId = customerId;
        this.status = LotStatus.ACTIVE;
        var now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    public UUID getId() { return id; }
    public UUID getTenantId() { return tenantId; }
    public UUID getCustomerId() { return customerId; }
    @Nullable public UUID getReservationId() { return reservationId; }
    @Nullable public UUID getPoolId() { return poolId; }
    @Nullable public UUID getCurrentStageId() { return currentStageId; }
    @Nullable public UUID getPricingArrangementId() { return pricingArrangementId; }
    @Nullable public String getPricingKindSnapshot() { return pricingKindSnapshot; }
    @Nullable public String getPricingConfigSnapshot() { return pricingConfigSnapshot; }
    @Nullable public BigDecimal getWeightIntakeKg() { return weightIntakeKg; }
    public LotStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void linkToReservation(UUID reservationId) {
        this.reservationId = reservationId;
        touch();
    }

    public void linkToPool(UUID poolId) {
        this.poolId = poolId;
        touch();
    }

    public void setCurrentStageId(@Nullable UUID stageId) {
        this.currentStageId = stageId;
        touch();
    }

    public void setIntakeWeight(BigDecimal weightKg) {
        this.weightIntakeKg = weightKg;
        touch();
    }

    public void snapshotPricing(UUID arrangementId, String kind, String configJson) {
        this.pricingArrangementId = arrangementId;
        this.pricingKindSnapshot = kind;
        this.pricingConfigSnapshot = configJson;
        touch();
    }

    /** Terminal transition — operator marked the lot complete via LotService.completeLot. */
    public void markCompleted() {
        this.status = LotStatus.COMPLETED;
        touch();
    }

    private void touch() { this.updatedAt = Instant.now(); }
}
