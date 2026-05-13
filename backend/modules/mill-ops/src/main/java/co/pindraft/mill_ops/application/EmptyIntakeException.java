package co.pindraft.mill_ops.application;

import co.pindraft.common.error.PindraftException;

public class EmptyIntakeException extends PindraftException {
    public EmptyIntakeException() {
        super("empty_intake", "Intake must include at least one fleece", 400);
    }
}
