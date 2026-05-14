-- V17: Self-service customer claim codes.
--
-- A mill operator generates a short claim code for a walk-in customer record
-- (tenant_customers row with user_id IS NULL). They hand the code to the
-- customer (in person or via their own out-of-band channel). The customer
-- redeems it through the customer portal to attach their user account.
--
-- The code is short (8 alphanumeric chars, base32-ish) so it's hand-typeable,
-- and bound to a single tenant_customer row. Expires after 7 days; cleared on
-- successful claim.

ALTER TABLE tenant_customers
    ADD COLUMN claim_code VARCHAR(16),
    ADD COLUMN claim_code_expires_at TIMESTAMPTZ;

-- Codes are unique while active so a redeem lookup is unambiguous. NULL allowed
-- because most rows won't have an active code at any given time.
CREATE UNIQUE INDEX idx_tenant_customers_claim_code
    ON tenant_customers(claim_code)
    WHERE claim_code IS NOT NULL;
