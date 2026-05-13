-- V6: Interop module — bearer-token client auth, webhook subscriptions, deliveries.

CREATE TABLE interop_clients (
    id            UUID PRIMARY KEY,
    tenant_id     UUID NOT NULL REFERENCES tenants(id),
    name          VARCHAR(255) NOT NULL,
    secret_hash   VARCHAR(255) NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interop_clients_tenant ON interop_clients(tenant_id);

CREATE TABLE webhook_subscriptions (
    id               UUID PRIMARY KEY,
    tenant_id        UUID NOT NULL REFERENCES tenants(id),
    event_type       VARCHAR(64) NOT NULL,
    delivery_url     VARCHAR(2048) NOT NULL,
    signing_secret   VARCHAR(255) NOT NULL,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_subs_tenant_event ON webhook_subscriptions(tenant_id, event_type) WHERE is_active;

CREATE TABLE webhook_deliveries (
    id                UUID PRIMARY KEY,
    subscription_id   UUID NOT NULL REFERENCES webhook_subscriptions(id),
    event_id          VARCHAR(255) NOT NULL,
    event_type        VARCHAR(64) NOT NULL,
    payload_json      JSONB NOT NULL,
    status            VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    attempts          INTEGER NOT NULL DEFAULT 0,
    last_attempt_at   TIMESTAMP WITH TIME ZONE,
    next_attempt_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_error        TEXT,
    created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    sent_at           TIMESTAMP WITH TIME ZONE,

    CONSTRAINT chk_delivery_status CHECK (status IN ('PENDING', 'RETRY', 'SENT', 'FAILED'))
);

CREATE INDEX idx_webhook_deliveries_due ON webhook_deliveries(next_attempt_at, status)
    WHERE status IN ('PENDING', 'RETRY');

-- Spring Modulith's event publication registry — required for @ApplicationModuleListener
-- to provide at-least-once delivery semantics by storing events in the DB until handled.
CREATE TABLE IF NOT EXISTS event_publication (
    id               UUID PRIMARY KEY,
    listener_id      TEXT NOT NULL,
    event_type       TEXT NOT NULL,
    serialized_event TEXT NOT NULL,
    publication_date TIMESTAMP WITH TIME ZONE NOT NULL,
    completion_date  TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_event_pub_completion ON event_publication(completion_date);
