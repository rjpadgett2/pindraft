package co.pindraft.mill_ops.infrastructure;

import co.pindraft.mill_ops.domain.FiberTestEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FiberTestRepository extends JpaRepository<FiberTestEntity, UUID> {
    List<FiberTestEntity> findByLotIdOrderByTestedAtDesc(UUID lotId);
    List<FiberTestEntity> findByLotIdInOrderByTestedAtDesc(List<UUID> lotIds);
}
