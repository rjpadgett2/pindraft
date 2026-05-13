package co.pindraft.mill_ops.application;

import co.pindraft.common.error.PindraftException;
import java.util.UUID;

public class ReservationNotFoundException extends PindraftException {
    public ReservationNotFoundException(UUID id) {
        super("reservation_not_found", "Reservation " + id + " not found", 404);
    }
}
