package co.pindraft.mill_ops;

import co.pindraft.mill_ops.domain.ReservationStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Published interface for creating reservations from outside mill-ops.
 *
 * <p>Used by the interop module to materialize Hirsel-pushed manifests as reservations.
 * Idempotent on {@code externalShipmentId} — calling with the same external ID returns
 * the existing reservation rather than creating a duplicate.
 */
public interface ReservationCreator {

    Reservation createFromExternalShipment(ExternalShipmentInput input);

    record ExternalShipmentInput(
        UUID tenantId,
        UUID customerId,
        BigDecimal expectedWeightKg,
        Instant slotStart,
        String externalSource,
        String externalShipmentId
    ) {}

    record Reservation(
        UUID id,
        UUID tenantId,
        String externalShipmentId,
        ReservationStatus status
    ) {}
}
