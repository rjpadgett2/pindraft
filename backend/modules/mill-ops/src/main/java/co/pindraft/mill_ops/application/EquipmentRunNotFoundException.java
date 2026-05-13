package co.pindraft.mill_ops.application;

import co.pindraft.common.error.PindraftException;
import java.util.UUID;

public class EquipmentRunNotFoundException extends PindraftException {
    public EquipmentRunNotFoundException(UUID id) {
        super("equipment_run_not_found", "Equipment run " + id + " not found", 404);
    }
}
