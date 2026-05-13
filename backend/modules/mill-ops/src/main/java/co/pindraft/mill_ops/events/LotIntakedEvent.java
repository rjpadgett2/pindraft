package co.pindraft.mill_ops.events;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

/**
 * Published when a lot is created from either a reservation
 * ({@code LotService.intake}) or a walk-in ({@code LotService.walkInIntake}).
 *
 * <p>{@code reservationId} and {@code externalShipmentId} are both null for walk-in
 * intake — listeners must handle that gracefully (interop's webhook dispatcher
 * already coalesces null external IDs to empty strings).
 */
public record LotIntakedEvent(
    UUID lotId,
    UUID tenantId,
    UUID customerId,
    @Nullable UUID reservationId,
    @Nullable String externalShipmentId,
    BigDecimal weightKg,
    Instant occurredAt
) {}
