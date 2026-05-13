package co.pindraft.mill_ops.infrastructure;

import co.pindraft.mill_ops.domain.IntakeFleeceEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IntakeFleeceRepository extends JpaRepository<IntakeFleeceEntity, UUID> {
    List<IntakeFleeceEntity> findByLotId(UUID lotId);
}
