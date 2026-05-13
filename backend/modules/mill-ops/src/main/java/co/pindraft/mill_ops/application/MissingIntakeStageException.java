package co.pindraft.mill_ops.application;

import co.pindraft.common.error.PindraftException;

public class MissingIntakeStageException extends PindraftException {
    public MissingIntakeStageException() {
        super(
            "missing_intake_stage",
            "This tenant's workflow does not have an INTAKE stage configured",
            400
        );
    }
}
