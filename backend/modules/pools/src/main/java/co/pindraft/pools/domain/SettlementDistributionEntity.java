package co.pindraft.pools.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.NullMarked;
import org.jspecify.annotations.Nullable;

@Entity
@Table(name = "settlement_distributions")
@NullMarked
public class SettlementDistributionEntity {
    @Id
    @Column(name = "id", columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "settlement_id", nullable = false)
    private SettlementEntity settlement;

    @Column(name = "customer_id", columnDefinition = "uuid", nullable = false)
    private UUID customerId;

    @Column(name = "customer_display_name", nullable = false, length = 255)
    private String customerDisplayName;

    @Column(name = "weight_kg", precision = 12, scale = 3, nullable = false)
    private BigDecimal weightKg;

    @Column(name = "share_percent", precision = 7, scale = 4, nullable = false)
    private BigDecimal sharePercent;

    @Column(name = "amount_cents", nullable = false)
    private long amountCents;

    @Column(name = "paid_at") @Nullable
    private Instant paidAt;

    protected SettlementDistributionEntity() {}

    public SettlementDistributionEntity(UUID id, UUID customerId, String customerDisplayName,
                                        BigDecimal weightKg, BigDecimal sharePercent, long amountCents) {
        this.id = id;
        this.customerId = customerId;
        this.customerDisplayName = customerDisplayName;
        this.weightKg = weightKg;
        this.sharePercent = sharePercent;
        this.amountCents = amountCents;
    }

    void attachTo(SettlementEntity s) { this.settlement = s; }

    public void markPaid() { this.paidAt = Instant.now(); }

    public UUID getId() { return id; }
    public UUID getCustomerId() { return customerId; }
    public String getCustomerDisplayName() { return customerDisplayName; }
    public BigDecimal getWeightKg() { return weightKg; }
    public BigDecimal getSharePercent() { return sharePercent; }
    public long getAmountCents() { return amountCents; }
    @Nullable public Instant getPaidAt() { return paidAt; }
}
