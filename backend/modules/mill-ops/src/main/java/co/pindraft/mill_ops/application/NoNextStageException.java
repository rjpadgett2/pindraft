package co.pindraft.mill_ops.application;

import co.pindraft.common.error.PindraftException;
import java.util.UUID;

public class NoNextStageException extends PindraftException {
    public NoNextStageException(UUID stageId) {
        super(
            "no_next_stage",
            "Lot is at the final workflow stage; nowhere to transition to",
            400
        );
    }
}
