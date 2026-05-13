package co.pindraft.mill_ops.application;

import co.pindraft.mill_ops.domain.WorkflowStageEntity;
import co.pindraft.mill_ops.infrastructure.ProcessingStageTypeRepository;
import co.pindraft.mill_ops.infrastructure.WorkflowStageRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WorkflowStageService {

    private final WorkflowStageRepository stages;
    private final ProcessingStageTypeRepository stageTypes;

    public WorkflowStageService(WorkflowStageRepository stages, ProcessingStageTypeRepository stageTypes) {
        this.stages = stages;
        this.stageTypes = stageTypes;
    }

    public List<WorkflowStageEntity> listForTenant(UUID tenantId) {
        return stages.findByTenantIdOrderByOrderIndex(tenantId);
    }

    @Transactional
    public WorkflowStageEntity create(UUID tenantId, String stageType, String displayName, boolean requiresEquipment) {
        validateStageTypeExists(stageType);
        int nextOrder = stages.findByTenantIdOrderByOrderIndex(tenantId).stream()
            .mapToInt(WorkflowStageEntity::getOrderIndex).max().orElse(0) + 10;

        var stage = new WorkflowStageEntity(
            UUID.randomUUID(), tenantId, stageType, displayName, nextOrder, requiresEquipment);
        return stages.save(stage);
    }

    @Transactional
    public WorkflowStageEntity rename(UUID tenantId, UUID stageId, String displayName) {
        var stage = stages.findById(stageId).orElseThrow(() -> new WorkflowStageNotFoundException(stageId));
        if (!stage.getTenantId().equals(tenantId)) {
            throw new WorkflowStageNotFoundException(stageId);
        }
        stage.setDisplayName(displayName);
        return stages.save(stage);
    }

    @Transactional
    public void delete(UUID tenantId, UUID stageId) {
        var stage = stages.findById(stageId).orElseThrow(() -> new WorkflowStageNotFoundException(stageId));
        if (!stage.getTenantId().equals(tenantId)) {
            throw new WorkflowStageNotFoundException(stageId);
        }
        if ("INTAKE".equals(stage.getStageType()) || "SHIP".equals(stage.getStageType())) {
            throw new CannotRemoveRequiredStageException(stage.getStageType());
        }
        // TODO: check that no active lots are currently at this stage before deleting
        stages.delete(stage);
    }

    @Transactional
    public void reorder(UUID tenantId, List<UUID> stageIdsInOrder) {
        var current = stages.findByTenantIdOrderByOrderIndex(tenantId);
        if (current.size() != stageIdsInOrder.size()) {
            throw new IllegalArgumentException("Reorder must include all stages");
        }
        int idx = 10;
        for (UUID id : stageIdsInOrder) {
            var stage = current.stream()
                .filter(s -> s.getId().equals(id))
                .findFirst()
                .orElseThrow(() -> new WorkflowStageNotFoundException(id));
            stage.setOrderIndex(idx);
            idx += 10;
        }
        stages.saveAll(current);
    }

    private void validateStageTypeExists(String stageType) {
        if (!stageTypes.existsById(stageType)) {
            throw new UnknownStageTypeException(stageType);
        }
    }
}
