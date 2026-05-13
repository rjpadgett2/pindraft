package co.pindraft.pools.application;

import co.pindraft.pools.PoolReader;
import co.pindraft.pools.infrastructure.PoolContributionRepository;
import co.pindraft.pools.infrastructure.PoolRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Implementation of {@link PoolReader} backing cross-module reads. Lives inside
 * pools but exposes the simple shape that mill-ops needs to build pooled lots.
 */
@Component
public class PoolReaderImpl implements PoolReader {

    private final PoolRepository pools;
    private final PoolContributionRepository contributions;

    public PoolReaderImpl(PoolRepository pools, PoolContributionRepository contributions) {
        this.pools = pools;
        this.contributions = contributions;
    }

    @Override
    public Optional<PoolSummary> findPool(UUID poolId) {
        return pools.findById(poolId).map(p ->
            new PoolSummary(p.getId(), p.getTenantId(), p.getName(), p.getStatus().name()));
    }

    @Override
    public List<PoolContribution> findContributions(UUID poolId) {
        return contributions.findByPoolIdOrderByAcceptedAt(poolId).stream()
            .map(c -> new PoolContribution(
                c.getId(), c.getPoolId(), c.getCustomerId(), c.getCustomerDisplayName(),
                c.getWeightKg(), c.getSourceLotId()))
            .toList();
    }
}
