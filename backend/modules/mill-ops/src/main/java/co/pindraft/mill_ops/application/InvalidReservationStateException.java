package co.pindraft.mill_ops.application;

import co.pindraft.common.error.PindraftException;
import co.pindraft.mill_ops.domain.ReservationStatus;

public class InvalidReservationStateException extends PindraftException {
    public InvalidReservationStateException(ReservationStatus current, String action) {
        super(
            "invalid_reservation_state",
            "Cannot " + action + " a reservation in " + current + " state",
            400
        );
    }
}
