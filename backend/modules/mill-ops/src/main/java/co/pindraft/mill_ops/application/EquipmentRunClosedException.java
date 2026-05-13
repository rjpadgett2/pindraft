package co.pindraft.mill_ops.application;

import co.pindraft.common.error.PindraftException;
import java.util.UUID;

public class EquipmentRunClosedException extends PindraftException {
    public EquipmentRunClosedException(UUID id) {
        super("equipment_run_closed", "Equipment run " + id + " is already closed", 400);
    }
}
