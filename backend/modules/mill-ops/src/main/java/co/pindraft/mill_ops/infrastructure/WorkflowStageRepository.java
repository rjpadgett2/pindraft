package co.pindraft.mill_ops.infrastructure;

import co.pindraft.mill_ops.domain.WorkflowStageEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkflowStageRepository extends JpaRepository<WorkflowStageEntity, UUID> {
    List<WorkflowStageEntity> findByTenantIdOrderByOrderIndex(UUID tenantId);
    long countByTenantId(UUID tenantId);
}
