package co.pindraft.traceability.infrastructure;

import co.pindraft.traceability.domain.TraceRecordEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TraceRecordRepository extends JpaRepository<TraceRecordEntity, UUID> {
    Optional<TraceRecordEntity> findBySlug(String slug);
    Optional<TraceRecordEntity> findByLotId(UUID lotId);
    boolean existsBySlug(String slug);
}
