package co.pindraft.mill_ops.application;

import co.pindraft.common.error.PindraftException;
import java.util.UUID;

public class LotNotFoundException extends PindraftException {
    public LotNotFoundException(UUID id) {
        super("lot_not_found", "Lot " + id + " not found", 404);
    }
}
