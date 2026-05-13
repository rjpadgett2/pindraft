-- V5: Marketplace listings.
-- Tenant-scoped at write, surfaces to public-shared when status = PUBLISHED.

CREATE TABLE marketplace_listings (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    kind            VARCHAR(16) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    price_per_kg    NUMERIC(10, 2) NOT NULL,
    quantity_kg     NUMERIC(10, 2) NOT NULL,
    status          VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
    trace_slug      VARCHAR(16),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    published_at    TIMESTAMP WITH TIME ZONE,

    CONSTRAINT chk_listing_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'SOLD', 'ARCHIVED')),
    CONSTRAINT chk_listing_kind   CHECK (kind   IN ('FLEECE', 'ROVING', 'YARN', 'BLANK', 'OTHER'))
);

CREATE INDEX idx_listings_tenant  ON marketplace_listings(tenant_id);
CREATE INDEX idx_listings_status  ON marketplace_listings(status);
CREATE INDEX idx_listings_kind    ON marketplace_listings(kind) WHERE status = 'PUBLISHED';
