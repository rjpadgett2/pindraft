package co.pindraft.mill_ops.application;

import co.pindraft.common.error.PindraftException;
import java.util.UUID;

public class EquipmentNotFoundException extends PindraftException {
    public EquipmentNotFoundException(UUID id) {
        super("equipment_not_found", "Equipment " + id + " not found", 404);
    }
}
