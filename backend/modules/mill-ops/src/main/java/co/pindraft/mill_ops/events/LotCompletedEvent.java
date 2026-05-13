package co.pindraft.mill_ops.events;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

/**
 * Published when an operator marks a lot complete via {@code LotService.completeLot}.
 *
 * <p>Carries the pricing snapshot fields straight off the lot so downstream listeners
 * (billing's invoice generator) don't need to reach back into mill-ops state to apply
 * the pricing arrangement that was agreed to at intake.
 *
 * <p>{@code finalWeightKg} is the weight_out reconciled at the final stage; falls
 * back to {@code weightIntakeKg} if the operator completes without a final-stage
 * weight reconciliation (rare, but allowed).
 */
public record LotCompletedEvent(
    UUID lotId,
    UUID tenantId,
    UUID customerId,
    @Nullable BigDecimal weightIntakeKg,
    @Nullable BigDecimal finalWeightKg,
    @Nullable String pricingKindSnapshot,
    @Nullable String pricingConfigSnapshot,
    Instant occurredAt
) {}
