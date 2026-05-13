-- V4: Traceability schema. Platform-shared scope (no tenant_id).

CREATE TABLE trace_records (
    id                     UUID PRIMARY KEY,
    lot_id                 UUID NOT NULL UNIQUE,
    slug                   VARCHAR(16) NOT NULL UNIQUE,
    public_visible         BOOLEAN NOT NULL DEFAULT FALSE,
    customer_display_name  VARCHAR(255) NOT NULL,
    intake_weight_kg       NUMERIC(10, 2),
    created_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trace_records_slug ON trace_records(slug);
CREATE INDEX idx_trace_records_lot  ON trace_records(lot_id);

CREATE TABLE trace_segments (
    id                UUID PRIMARY KEY,
    trace_record_id   UUID NOT NULL REFERENCES trace_records(id) ON DELETE CASCADE,
    stage_type        VARCHAR(32) NOT NULL,
    entered_at        TIMESTAMP WITH TIME ZONE NOT NULL,
    exited_at         TIMESTAMP WITH TIME ZONE,
    weight_in_kg      NUMERIC(10, 2),
    weight_out_kg     NUMERIC(10, 2)
);

CREATE INDEX idx_trace_segments_record ON trace_segments(trace_record_id);
