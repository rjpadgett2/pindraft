package co.pindraft.mill_ops.application;

import co.pindraft.common.error.PindraftException;

public class UnknownEquipmentTypeException extends PindraftException {
    public UnknownEquipmentTypeException(String type) {
        super(
            "unknown_equipment_type",
            "Equipment type " + type + " is not in the platform-shared taxonomy",
            400
        );
    }
}
