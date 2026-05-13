package co.pindraft.mill_ops.application;

import co.pindraft.common.error.PindraftException;

public class UnknownStageTypeException extends PindraftException {
    public UnknownStageTypeException(String stageType) {
        super(
            "unknown_stage_type",
            "Stage type " + stageType + " is not in the platform-shared taxonomy",
            400
        );
    }
}
