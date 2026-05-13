-- V12: Settlements for wool pools.
--
-- When PoolService.distribute runs, it computes proportional shares from
-- contributions and writes one settlements row + N settlement_distributions rows
-- inside the same transaction. The /pools/{id}/shares endpoint stays as a "preview"
-- — settlements rows are the recorded truth.

CREATE TABLE settlements (
    id                    UUID PRIMARY KEY,
    tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pool_id               UUID NOT NULL REFERENCES wool_pools(id) ON DELETE CASCADE,
    total_revenue_cents   BIGINT NOT NULL DEFAULT 0,
    currency              VARCHAR(3) NOT NULL DEFAULT 'USD',
    notes                 TEXT,
    settled_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_settlement_pool UNIQUE (pool_id)
);

CREATE INDEX idx_settlements_tenant ON settlements(tenant_id);

CREATE TABLE settlement_distributions (
    id                    UUID PRIMARY KEY,
    settlement_id         UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
    customer_id           UUID NOT NULL REFERENCES tenant_customers(id) ON DELETE CASCADE,
    customer_display_name VARCHAR(255) NOT NULL,
    weight_kg             NUMERIC(12, 3) NOT NULL,
    share_percent         NUMERIC(7, 4) NOT NULL,
    amount_cents          BIGINT NOT NULL,
    paid_at               TIMESTAMP WITH TIME ZONE,

    CONSTRAINT chk_settlement_dist_share CHECK (share_percent >= 0 AND share_percent <= 100)
);

CREATE INDEX idx_settlement_dists_settlement ON settlement_distributions(settlement_id);
CREATE INDEX idx_settlement_dists_customer   ON settlement_distributions(customer_id);
