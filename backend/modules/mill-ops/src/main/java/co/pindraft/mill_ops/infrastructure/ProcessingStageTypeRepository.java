package co.pindraft.mill_ops.infrastructure;

import co.pindraft.mill_ops.domain.ProcessingStageTypeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProcessingStageTypeRepository extends JpaRepository<ProcessingStageTypeEntity, String> {}
