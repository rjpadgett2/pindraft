package co.pindraft.mill_ops.infrastructure;

import co.pindraft.mill_ops.domain.LotLineageEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LotLineageRepository extends JpaRepository<LotLineageEntity, UUID> {
    List<LotLineageEntity> findByParentLotId(UUID parentLotId);
    List<LotLineageEntity> findByChildLotId(UUID childLotId);
}
