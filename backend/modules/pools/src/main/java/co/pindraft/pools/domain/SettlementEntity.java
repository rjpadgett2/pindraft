package co.pindraft.pools.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;

/**
 * Recorded settlement for a wool pool. One per pool (the unique key on pool_id
 * enforces this). Created inside {@code PoolService.distribute}'s transaction;
 * idempotent — re-distributing fails the unique constraint and the operator must
 * void the existing settlement first.
 */
@Entity
@Table(name = "settlements")
@NullMarked
public class SettlementEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @Column(name = "tenant_id", columnDefinition = "uuid", nullable = false)
    private UUID tenantId;

    @Column(name = "pool_id", columnDefinition = "uuid", nullable = false)
    private UUID poolId;

    @Column(name = "total_revenue_cents", nullable = false)
    private long totalRevenueCents;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "notes") @Nullable
    private String notes;

    @Column(name = "settled_at", nullable = false)
    private Instant settledAt;

    @OneToMany(mappedBy = "settlement", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<SettlementDistributionEntity> distributions = new ArrayList<>();

    protected SettlementEntity() {}

    public SettlementEntity(UUID id, UUID tenantId, UUID poolId, long totalRevenueCents, String currency) {
        this.id = id;
        this.tenantId = tenantId;
        this.poolId = poolId;
        this.totalRevenueCents = totalRevenueCents;
        this.currency = currency;
        this.settledAt = Instant.now();
    }

    public void addDistribution(SettlementDistributionEntity d) {
        d.attachTo(this);
        distributions.add(d);
    }

    public UUID getId() { return id; }
    public UUID getTenantId() { return tenantId; }
    public UUID getPoolId() { return poolId; }
    public long getTotalRevenueCents() { return totalRevenueCents; }
    public String getCurrency() { return currency; }
    @Nullable public String getNotes() { return notes; }
    public Instant getSettledAt() { return settledAt; }
    public List<SettlementDistributionEntity> getDistributions() { return distributions; }
}
