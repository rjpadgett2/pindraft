package co.pindraft.pools.infrastructure;

import co.pindraft.pools.domain.PoolContributionEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PoolContributionRepository extends JpaRepository<PoolContributionEntity, UUID> {

    /** All contributions to one pool. */
    List<PoolContributionEntity> findByPoolIdOrderByAcceptedAt(UUID poolId);

    /**
     * All contributions made by any of the given customers. Cross-tenant — used by
     * {@code MePoolController} to surface a shepherd's stake across all mills.
     */
    List<PoolContributionEntity> findByCustomerIdIn(List<UUID> customerIds);
}
