-- V7: Wool pools — many customers contributing to a shared pool, proportional distribution.

CREATE TABLE pools (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    kind            VARCHAR(32) NOT NULL,
    status          VARCHAR(16) NOT NULL DEFAULT 'ACCEPTING',
    total_revenue   NUMERIC(12, 2),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    closed_at       TIMESTAMP WITH TIME ZONE,
    distributed_at  TIMESTAMP WITH TIME ZONE,

    CONSTRAINT chk_pool_status CHECK (status IN ('ACCEPTING', 'CLOSED', 'DISTRIBUTED')),
    CONSTRAINT chk_pool_kind   CHECK (kind   IN ('FINE_WOOL', 'MEDIUM_WOOL', 'LONG_WOOL', 'COLORED_WOOL', 'MIXED', 'OTHER'))
);

CREATE INDEX idx_pools_tenant ON pools(tenant_id);

CREATE TABLE pool_contributions (
    id                     UUID PRIMARY KEY,
    pool_id                UUID NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
    customer_id            UUID NOT NULL,
    customer_display_name  VARCHAR(255) NOT NULL,
    weight_kg              NUMERIC(10, 2) NOT NULL,
    notes                  TEXT,
    accepted_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pool_contributions_pool ON pool_contributions(pool_id);
