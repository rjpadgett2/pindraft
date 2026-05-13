package co.pindraft.mill_ops.infrastructure;

import co.pindraft.mill_ops.domain.EquipmentTypeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EquipmentTypeRepository extends JpaRepository<EquipmentTypeEntity, String> {}
