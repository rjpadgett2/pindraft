package co.pindraft.mill_ops.infrastructure;

import co.pindraft.mill_ops.domain.ScanEventEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScanEventRepository extends JpaRepository<ScanEventEntity, UUID> {
    List<ScanEventEntity> findByLotIdOrderByScannedAtDesc(UUID lotId);
}
