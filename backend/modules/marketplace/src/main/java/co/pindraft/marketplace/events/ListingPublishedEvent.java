package co.pindraft.marketplace.events;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

/**
 * Published from {@code ListingService.publish}. Drives the {@code listing.published}
 * webhook so external systems can mirror the mill's marketplace surface in real time.
 */
public record ListingPublishedEvent(
    UUID listingId,
    UUID tenantId,
    String kind,
    String title,
    BigDecimal pricePerKg,
    BigDecimal quantityKg,
    @Nullable String traceSlug,
    Instant occurredAt
) {}
