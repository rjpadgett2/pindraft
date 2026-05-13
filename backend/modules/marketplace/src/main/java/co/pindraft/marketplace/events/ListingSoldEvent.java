package co.pindraft.marketplace.events;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Published from {@code ListingService.markSold}. Drives the {@code listing.sold}
 * webhook for inventory sync.
 */
public record ListingSoldEvent(
    UUID listingId,
    UUID tenantId,
    BigDecimal pricePerKg,
    BigDecimal quantityKg,
    Instant occurredAt
) {}
