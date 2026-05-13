package co.pindraft.mill_ops.application;

import co.pindraft.common.error.PindraftException;

public class CannotRemoveRequiredStageException extends PindraftException {
    public CannotRemoveRequiredStageException(String stageType) {
        super(
            "cannot_remove_required_stage",
            "Stage " + stageType + " is required and cannot be removed (every lot has to enter and leave)",
            400
        );
    }
}
