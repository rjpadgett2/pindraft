package co.pindraft.mill_ops.events;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Published from {@code LotService.transitionToNextStage}. Drives the
 * {@code lot.stage_transition} webhook for subscribers tracking lot progress.
 */
public record LotStageTransitionedEvent(
    UUID lotId,
    UUID tenantId,
    String fromStageType,
    String toStageType,
    BigDecimal weightOutKg,
    Instant occurredAt
) {}
