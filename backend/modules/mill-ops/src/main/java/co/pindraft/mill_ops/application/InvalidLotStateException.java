package co.pindraft.mill_ops.application;

import co.pindraft.common.error.PindraftException;
import co.pindraft.mill_ops.domain.LotStatus;

public class InvalidLotStateException extends PindraftException {
    public InvalidLotStateException(LotStatus current, String action) {
        super(
            "invalid_lot_state",
            "Cannot " + action + " a lot in " + current + " state",
            400
        );
    }
}
