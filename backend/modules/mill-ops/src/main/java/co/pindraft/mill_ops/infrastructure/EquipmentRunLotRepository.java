package co.pindraft.mill_ops.infrastructure;

import co.pindraft.mill_ops.domain.EquipmentRunLotEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EquipmentRunLotRepository extends JpaRepository<EquipmentRunLotEntity, UUID> {
    List<EquipmentRunLotEntity> findByEquipmentRunId(UUID equipmentRunId);
}
