package co.pindraft.pools.infrastructure;

import co.pindraft.pools.domain.SettlementEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SettlementRepository extends JpaRepository<SettlementEntity, UUID> {
    List<SettlementEntity> findByTenantIdOrderBySettledAtDesc(UUID tenantId);
    Optional<SettlementEntity> findByPoolId(UUID poolId);
}
