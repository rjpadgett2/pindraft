package co.pindraft.marketplace.domain;

/**
 * The kind of fiber product a listing represents. Maps to canonical taxonomy
 * that public viewers recognize across mills.
 */
public enum ListingKind {
    FLEECE,    // Raw or skirted fleece
    ROVING,    // Cleaned & combed, ready to spin
    YARN,      // Spun, optionally plied
    BLANK,     // Felted or woven panel
    OTHER
}
