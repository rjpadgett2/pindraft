package co.pindraft.pools.infrastructure;

import co.pindraft.pools.domain.SettlementDistributionEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SettlementDistributionRepository extends JpaRepository<SettlementDistributionEntity, UUID> {
    List<SettlementDistributionEntity> findByCustomerIdOrderByIdDesc(UUID customerId);
}
