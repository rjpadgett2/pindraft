package co.pindraft.pools.events;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Published from {@code PoolService.recordContribution}. Drives the
 * {@code pool.contribution_recorded} webhook for subscribers tracking pool activity.
 */
public record ContributionRecordedEvent(
    UUID contributionId,
    UUID poolId,
    UUID tenantId,
    UUID customerId,
    String customerDisplayName,
    BigDecimal weightKg,
    Instant occurredAt
) {}
