package co.pindraft.traceability.infrastructure;

import co.pindraft.traceability.domain.TraceSegmentEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TraceSegmentRepository extends JpaRepository<TraceSegmentEntity, UUID> {
    List<TraceSegmentEntity> findByTraceRecordIdOrderByEnteredAt(UUID traceRecordId);

    @Query("SELECT s FROM TraceSegmentEntity s WHERE s.traceRecordId = :recordId AND s.exitedAt IS NULL")
    Optional<TraceSegmentEntity> findOpenForRecord(@Param("recordId") UUID recordId);
}
