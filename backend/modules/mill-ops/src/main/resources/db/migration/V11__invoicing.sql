-- V11: Invoicing on top of completed lots.
--
-- Invoices are generated from a LotCompletedEvent by applying the pricing arrangement
-- snapshot that was frozen onto the lot at intake. One invoice per lot. Pool-merged
-- lots (lot.pool_id IS NOT NULL) bypass invoicing — settlement_distributions in the
-- pools module covers those payouts instead.
--
-- Money is stored in integer cents (BIGINT) to avoid decimal drift; presentation
-- decides the currency-specific divisor. Currency is denormalized onto every invoice
-- to support future multi-currency tenants without a schema change.

CREATE TABLE invoices (
    id                UUID PRIMARY KEY,
    tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id       UUID NOT NULL REFERENCES tenant_customers(id) ON DELETE CASCADE,
    lot_id            UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
    invoice_number    VARCHAR(64) NOT NULL,
    status            VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    subtotal_cents    BIGINT NOT NULL DEFAULT 0,
    total_cents       BIGINT NOT NULL DEFAULT 0,
    currency          VARCHAR(3) NOT NULL DEFAULT 'USD',
    notes             TEXT,
    issued_at         TIMESTAMP WITH TIME ZONE,
    paid_at           TIMESTAMP WITH TIME ZONE,
    created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_invoice_status CHECK (status IN ('DRAFT', 'ISSUED', 'PAID', 'VOID')),
    CONSTRAINT uq_invoice_lot UNIQUE (lot_id),
    CONSTRAINT uq_invoice_tenant_number UNIQUE (tenant_id, invoice_number)
);

CREATE INDEX idx_invoices_tenant_customer ON invoices(tenant_id, customer_id);
CREATE INDEX idx_invoices_tenant_status   ON invoices(tenant_id, status);

-- Per-invoice lines computed from the pricing snapshot. PER_POUND collapses to one
-- line; HYBRID expands to a flat-fee + per-kg pair; TIERED_BY_GRADE picks the tier
-- that matches a recorded fiber test (or the lowest tier if none recorded yet).
CREATE TABLE invoice_lines (
    id                  UUID PRIMARY KEY,
    invoice_id          UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description         VARCHAR(255) NOT NULL,
    quantity            NUMERIC(12, 3) NOT NULL,
    unit                VARCHAR(16) NOT NULL,
    unit_price_cents    BIGINT NOT NULL,
    line_total_cents    BIGINT NOT NULL,

    CONSTRAINT chk_invoice_line_qty_nonneg CHECK (quantity >= 0)
);

CREATE INDEX idx_invoice_lines_invoice ON invoice_lines(invoice_id);
