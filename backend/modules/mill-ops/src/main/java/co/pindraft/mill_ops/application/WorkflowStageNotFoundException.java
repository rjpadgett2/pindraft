package co.pindraft.mill_ops.application;

import co.pindraft.common.error.PindraftException;
import java.util.UUID;

public class WorkflowStageNotFoundException extends PindraftException {
    public WorkflowStageNotFoundException(UUID id) {
        super("workflow_stage_not_found", "Workflow stage " + id + " not found", 404);
    }
}
