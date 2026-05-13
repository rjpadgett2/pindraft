package co.pindraft.pools.application;

import co.pindraft.pools.domain.PoolContributionEntity;
import co.pindraft.pools.domain.PoolEntity;
import co.pindraft.pools.domain.PoolKind;
import co.pindraft.pools.domain.SettlementDistributionEntity;
import co.pindraft.pools.domain.SettlementEntity;
import co.pindraft.pools.events.ContributionRecordedEvent;
import co.pindraft.pools.events.PoolSettledEvent;
import co.pindraft.pools.infrastructure.PoolContributionRepository;
import co.pindraft.pools.infrastructure.PoolRepository;
import co.pindraft.pools.infrastructure.SettlementRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.jspecify.annotations.Nullable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Pool lifecycle service. Owns creation, contribution recording, closure, settlement.
 * Publishes {@link ContributionRecordedEvent} and {@link PoolSettledEvent} from inside
 * transactions; interop subscribes via Spring Modulith's event registry.
 */
@Service
public class PoolService {

    private static final String DEFAULT_CURRENCY = "USD";

    private final PoolRepository pools;
    private final PoolContributionRepository contributions;
    private final SettlementRepository settlements;
    private final ApplicationEventPublisher eventPublisher;

    public PoolService(
        PoolRepository pools,
        PoolContributionRepository contributions,
        SettlementRepository settlements,
        ApplicationEventPublisher eventPublisher
    ) {
        this.pools = pools;
        this.contributions = contributions;
        this.settlements = settlements;
        this.eventPublisher = eventPublisher;
    }

    public List<PoolEntity> listForTenant(UUID tenantId) {
        return pools.findByTenantIdOrderByCreatedAtDesc(tenantId);
    }

    public PoolEntity getOne(UUID tenantId, UUID id) {
        var pool = pools.findById(id).orElseThrow(() -> new PoolNotFoundException(id));
        if (!pool.getTenantId().equals(tenantId)) throw new PoolNotFoundException(id);
        return pool;
    }

    public PoolEntity findById(UUID id) {
        return pools.findById(id).orElseThrow(() -> new PoolNotFoundException(id));
    }

    public List<PoolEntity> findAllAcceptingForTenant(UUID tenantId) {
        return pools.findByTenantIdOrderByCreatedAtDesc(tenantId).stream()
            .filter(p -> p.getStatus() == co.pindraft.pools.domain.PoolStatus.ACCEPTING)
            .toList();
    }

    public List<PoolContributionEntity> listContributions(UUID poolId) {
        return contributions.findByPoolIdOrderByAcceptedAt(poolId);
    }

    /** Cross-tenant query — used by the customer-portal /me/pools endpoint. */
    public List<PoolContributionEntity> findContributionsForCustomers(List<UUID> customerIds) {
        if (customerIds.isEmpty()) return List.of();
        return contributions.findByCustomerIdIn(customerIds);
    }

    @Transactional
    public PoolEntity create(UUID tenantId, String name, @Nullable String description, PoolKind kind) {
        var pool = new PoolEntity(UUID.randomUUID(), tenantId, name, description, kind);
        return pools.save(pool);
    }

    @Transactional
    public PoolContributionEntity recordContribution(
        UUID tenantId, UUID poolId, UUID customerId, String customerDisplayName,
        BigDecimal weightKg, @Nullable String notes
    ) {
        return recordContribution(tenantId, poolId, customerId, customerDisplayName, weightKg, notes, null);
    }

    /**
     * Record a contribution to a pool. {@code sourceLotId} is optional — set it when
     * the contribution comes from an existing lot (the partial-handoff case in the
     * spec). When the pool is later processed into a single pooled lot, source-lot
     * links become MERGE lineage rows on the new lot.
     */
    @Transactional
    public PoolContributionEntity recordContribution(
        UUID tenantId, UUID poolId, UUID customerId, String customerDisplayName,
        BigDecimal weightKg, @Nullable String notes, @Nullable UUID sourceLotId
    ) {
        var pool = getOne(tenantId, poolId);
        if (pool.getStatus() != co.pindraft.pools.domain.PoolStatus.ACCEPTING) {
            throw new InvalidPoolStateException(pool.getStatus(), "record contribution");
        }
        var contribution = new PoolContributionEntity(
            UUID.randomUUID(), poolId, customerId, customerDisplayName, weightKg, notes, sourceLotId);
        contributions.save(contribution);

        eventPublisher.publishEvent(new ContributionRecordedEvent(
            contribution.getId(), poolId, tenantId, customerId,
            customerDisplayName, weightKg, Instant.now()));

        return contribution;
    }

    @Transactional
    public PoolEntity close(UUID tenantId, UUID poolId) {
        var pool = getOne(tenantId, poolId);
        pool.close();
        return pools.save(pool);
    }

    @Transactional
    public PoolEntity distribute(UUID tenantId, UUID poolId, BigDecimal totalRevenue) {
        var pool = getOne(tenantId, poolId);
        pool.distribute(totalRevenue);
        pools.save(pool);

        // calculateShares() reads the pool we just saved (with total_revenue set) and
        // produces per-contributor proportional shares — the same math used by the
        // /pools/{id}/shares endpoint. Translating to event-side records here so
        // downstream listeners (interop's webhook) don't have to redo the math against
        // the database.
        var shares = calculateShares(poolId);
        var distributions = shares.stream()
            .map(s -> new PoolSettledEvent.Distribution(
                s.contributionId(), s.customerId(), s.customerDisplayName(),
                s.weightKg(), s.sharePercent(), s.amountOwed()))
            .toList();

        // Persist the settlement record inside the same transaction. Idempotency comes
        // from the unique key on settlements.pool_id — re-distributing throws and the
        // operator has to void the existing settlement first.
        long revenueCents = toCents(totalRevenue);
        var settlement = new SettlementEntity(
            UUID.randomUUID(), tenantId, poolId, revenueCents, DEFAULT_CURRENCY);
        for (var d : shares) {
            settlement.addDistribution(new SettlementDistributionEntity(
                UUID.randomUUID(), d.customerId(), d.customerDisplayName(),
                d.weightKg(), d.sharePercent(),
                d.amountOwed() == null ? 0L : toCents(d.amountOwed())));
        }
        settlements.save(settlement);

        eventPublisher.publishEvent(new PoolSettledEvent(
            poolId, tenantId, totalRevenue, distributions.size(), distributions, Instant.now()));

        return pool;
    }

    private static long toCents(BigDecimal dollars) {
        return dollars.multiply(BigDecimal.valueOf(100))
            .setScale(0, RoundingMode.HALF_UP).longValueExact();
    }

    public List<ContributorShare> calculateShares(UUID poolId) {
        var pool = pools.findById(poolId).orElseThrow(() -> new PoolNotFoundException(poolId));
        var contribList = contributions.findByPoolIdOrderByAcceptedAt(poolId);
        if (contribList.isEmpty()) return List.of();

        var totalWeight = contribList.stream()
            .map(PoolContributionEntity::getWeightKg)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (totalWeight.signum() <= 0) return List.of();

        var revenue = pool.getTotalRevenue();

        return contribList.stream().map(c -> {
            var sharePercent = c.getWeightKg()
                .multiply(new BigDecimal("100"))
                .divide(totalWeight, 4, RoundingMode.HALF_UP);
            BigDecimal amount = null;
            if (revenue != null) {
                amount = revenue.multiply(sharePercent)
                    .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            }
            return new ContributorShare(
                c.getId(), c.getCustomerId(), c.getCustomerDisplayName(),
                c.getWeightKg(), sharePercent, amount);
        }).toList();
    }

    public record ContributorShare(
        UUID contributionId, UUID customerId, String customerDisplayName,
        BigDecimal weightKg, BigDecimal sharePercent, @Nullable BigDecimal amountOwed) {}
}
