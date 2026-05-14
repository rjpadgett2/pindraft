-- V15: allow LOT_COMPLETED scan_kind for the operator-initiated lot completion
-- audit trail written by LotService.completeLot. Semantically distinct from a
-- STAGE_TRANSITION since no new stage opens.

ALTER TABLE scan_events DROP CONSTRAINT chk_scan_kind;
ALTER TABLE scan_events ADD CONSTRAINT chk_scan_kind
    CHECK (scan_kind IN ('STAGE_TRANSITION', 'NOTE', 'ISSUE', 'LOCATION_UPDATE',
                         'WEIGHT_CHECK', 'LOT_COMPLETED'));
