-- V14: track the upstream source lot for a pool contribution, when one exists.
--
-- Most pool contributions are raw fiber arriving without a prior lot (a shepherd
-- ships into a pool directly). For those, source_lot_id stays NULL. When a mill
-- contributes an already-processed lot into a pool (the spec's partial-handoff case),
-- source_lot_id captures the parent so the eventual pooled lot can write MERGE
-- lineage rows from each contribution's source.
--
-- No FK to lots: enforcing referential integrity across modules at the DB level
-- locks the schema; Spring Modulith treats this as a soft reference.

ALTER TABLE pool_contributions
    ADD COLUMN source_lot_id UUID;

CREATE INDEX idx_pool_contributions_source_lot ON pool_contributions(source_lot_id)
    WHERE source_lot_id IS NOT NULL;
