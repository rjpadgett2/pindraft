package co.pindraft.mill_ops.domain;

/**
 * Why a lineage row was written. Matches the CHECK constraint on lot_lineage_links.
 *
 * <p>SPLIT — one big lot became multiple smaller lots at the spinning stage.
 * MERGE — multiple lots combined into one (wool pool processing, partial-handoff).
 */
public enum LotLineageTransition {
    SPLIT,
    MERGE
}
