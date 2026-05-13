package co.pindraft.billing.infrastructure;

import co.pindraft.billing.domain.PricingArrangementEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PricingArrangementRepository extends JpaRepository<PricingArrangementEntity, UUID> {
    List<PricingArrangementEntity> findByTenantIdAndActiveTrueOrderByName(UUID tenantId);
    long countByTenantIdAndActiveTrue(UUID tenantId);
}
