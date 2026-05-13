package co.pindraft.billing.domain;

/**
 * Discriminator for {@link PricingArrangementEntity#getConfigJson()}.
 *
 * <p>Each value implies a different config shape — validated at the service layer
 * by {@code PricingArrangementService.validateConfig}.
 */
public enum PricingKind {
    /** Flat per-kilogram price. Config: {@code { pricePerKg: number }}. */
    PER_POUND,
    /** Tiered by micron grade. Config: {@code { tiers: [{ maxMicron, pricePerKg }] }}. */
    TIERED_BY_GRADE,
    /** Flat fee plus per-kilogram. Config: {@code { flatFee, pricePerKg }}. */
    HYBRID,
    /** Mill/brand percentage split. Config: {@code { millPercent, brandPercent }}. */
    REVENUE_SPLIT
}
