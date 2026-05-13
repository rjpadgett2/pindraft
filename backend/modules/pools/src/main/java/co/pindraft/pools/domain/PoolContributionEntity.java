package co.pindraft.pools.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;

/**
 * One customer's contribution to a pool. {@code customerDisplayName} is denormalized
 * at the moment of contribution — if the customer renames themselves later, this pool
 * still shows what they were called when they contributed.
 */
@Entity
@Table(name = "pool_contributions")
@NullMarked
public class PoolContributionEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "pool_id", columnDefinition = "uuid", nullable = false)
    private UUID poolId;

    @Column(name = "customer_id", columnDefinition = "uuid", nullable = false)
    private UUID customerId;

    @Column(name = "customer_display_name", nullable = false)
    private String customerDisplayName;

    @Column(name = "weight_kg", nullable = false, precision = 10, scale = 2)
    private BigDecimal weightKg;

    @Column(name = "notes", columnDefinition = "text") @Nullable
    private String notes;

    @Column(name = "accepted_at", nullable = false)
    private Instant acceptedAt;

    @Column(name = "source_lot_id", columnDefinition = "uuid") @Nullable
    private UUID sourceLotId;

    protected PoolContributionEntity() {}

    public PoolContributionEntity(UUID id, UUID poolId, UUID customerId,
                                   String customerDisplayName, BigDecimal weightKg,
                                   @Nullable String notes) {
        this.id = id;
        this.poolId = poolId;
        this.customerId = customerId;
        this.customerDisplayName = customerDisplayName;
        this.weightKg = weightKg;
        this.notes = notes;
        this.acceptedAt = Instant.now();
    }

    public PoolContributionEntity(UUID id, UUID poolId, UUID customerId,
                                   String customerDisplayName, BigDecimal weightKg,
                                   @Nullable String notes, @Nullable UUID sourceLotId) {
        this(id, poolId, customerId, customerDisplayName, weightKg, notes);
        this.sourceLotId = sourceLotId;
    }

    public UUID getId() { return id; }
    public UUID getPoolId() { return poolId; }
    public UUID getCustomerId() { return customerId; }
    public String getCustomerDisplayName() { return customerDisplayName; }
    public BigDecimal getWeightKg() { return weightKg; }
    @Nullable public String getNotes() { return notes; }
    public Instant getAcceptedAt() { return acceptedAt; }
    @Nullable public UUID getSourceLotId() { return sourceLotId; }
}
