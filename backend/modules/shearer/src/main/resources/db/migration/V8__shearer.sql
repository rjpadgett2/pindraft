-- V8: Shearer events. User-scoped (no tenant_id) — shearers work across many farms.

CREATE TABLE shearing_events (
    id                   UUID PRIMARY KEY,
    shearer_user_id      UUID NOT NULL REFERENCES users(id),
    client_local_id      VARCHAR(64),
    animal_external_id   VARCHAR(128),
    animal_name          VARCHAR(255) NOT NULL,
    breed_code           VARCHAR(32),
    fleece_weight_kg     NUMERIC(10, 2),
    shorn_at             TIMESTAMP WITH TIME ZONE NOT NULL,
    location             VARCHAR(255),
    notes                TEXT,
    created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shearing_events_shearer ON shearing_events(shearer_user_id, shorn_at DESC);

-- Idempotency index — sync retries from the same client+local row return the existing event
CREATE UNIQUE INDEX uq_shearing_events_local_id
    ON shearing_events(shearer_user_id, client_local_id)
    WHERE client_local_id IS NOT NULL;
