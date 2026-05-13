package co.pindraft.pools;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

/**
 * Published interface for cross-module reads of pool data. Mill-ops consumes this
 * when creating the pooled lot at PROCESSING — it needs the contributions (with
 * their optional source-lot links) to compute total weight and write MERGE
 * lineage rows. Same pattern as {@code billing.PricingArrangementLookup}.
 */
public interface PoolReader {
    Optional<PoolSummary> findPool(UUID poolId);

    /** Contributions in acceptance order. */
    List<PoolContribution> findContributions(UUID poolId);

    record PoolSummary(UUID id, UUID tenantId, String name, String status) {}

    record PoolContribution(
        UUID id, UUID poolId, UUID customerId, String customerDisplayName,
        BigDecimal weightKg, @Nullable UUID sourceLotId) {}
}
