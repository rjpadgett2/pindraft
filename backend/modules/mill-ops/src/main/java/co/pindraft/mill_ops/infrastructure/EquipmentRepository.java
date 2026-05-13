package co.pindraft.mill_ops.infrastructure;

import co.pindraft.mill_ops.domain.EquipmentEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EquipmentRepository extends JpaRepository<EquipmentEntity, UUID> {
    List<EquipmentEntity> findByTenantIdAndActiveTrueOrderByName(UUID tenantId);
    long countByTenantIdAndActiveTrue(UUID tenantId);
}
