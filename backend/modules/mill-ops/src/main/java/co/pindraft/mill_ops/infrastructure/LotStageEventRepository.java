package co.pindraft.mill_ops.infrastructure;

import co.pindraft.mill_ops.domain.LotStageEventEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LotStageEventRepository extends JpaRepository<LotStageEventEntity, UUID> {

    /** The currently-open stage event for a lot (entered_at set, exited_at null). */
    @Query("SELECT e FROM LotStageEventEntity e WHERE e.lotId = :lotId AND e.exitedAt IS NULL")
    Optional<LotStageEventEntity> findOpenForLot(@Param("lotId") UUID lotId);

    /** All stage events for a lot, oldest first — for the timeline view. */
    List<LotStageEventEntity> findByLotIdOrderByEnteredAt(UUID lotId);

    /** All open events at a given stage — backs the queue dashboard. */
    @Query("SELECT e FROM LotStageEventEntity e WHERE e.workflowStageId = :stageId AND e.exitedAt IS NULL")
    List<LotStageEventEntity> findOpenAtStage(@Param("stageId") UUID stageId);
}
