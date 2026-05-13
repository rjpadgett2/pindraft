package co.pindraft.mill_ops.infrastructure;

import co.pindraft.mill_ops.domain.EquipmentRunEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EquipmentRunRepository extends JpaRepository<EquipmentRunEntity, UUID> {
    @Query("SELECT r FROM EquipmentRunEntity r WHERE r.equipmentId = :equipmentId AND r.finishedAt IS NULL")
    Optional<EquipmentRunEntity> findOpenForEquipment(@Param("equipmentId") UUID equipmentId);

    @Query("SELECT r FROM EquipmentRunEntity r WHERE r.finishedAt IS NULL")
    List<EquipmentRunEntity> findAllOpen();
}
