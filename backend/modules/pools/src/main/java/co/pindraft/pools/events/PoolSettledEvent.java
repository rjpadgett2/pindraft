package co.pindraft.pools.events;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

/**
 * Published from {@code PoolService.distribute}. Drives the {@code pool.settled}
 * webhook (interop) and the settlement record creation (billing).
 *
 * <p>{@link #distributions} is the per-contributor breakdown — billing uses it to
 * write {@code settlement_distributions} rows; interop's webhook summarizes via
 * {@code distributions().size()} and the rolled-up {@code totalRevenue}.
 */
public record PoolSettledEvent(
    UUID poolId,
    UUID tenantId,
    BigDecimal totalRevenue,
    int contributorCount,
    List<Distribution> distributions,
    Instant occurredAt
) {
    /**
     * One contributor's share of the pool's settlement.
     *
     * <p>{@code amountOwed} may be {@code null} when the pool was settled without
     * revenue (rare but allowed for record-keeping).
     */
    public record Distribution(
        UUID contributionId,
        UUID customerId,
        String customerDisplayName,
        BigDecimal weightKg,
        BigDecimal sharePercent,
        @Nullable BigDecimal amountOwed
    ) {}
}
