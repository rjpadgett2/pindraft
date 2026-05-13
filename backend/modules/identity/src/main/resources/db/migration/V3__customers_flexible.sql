-- V3: Make tenant_customers more flexible for walk-in customers without user accounts.
-- Add snapshot columns to lots for pricing-at-decision-moment.

-- Allow tenant_customers without an existing user account (walk-in customers)
ALTER TABLE tenant_customers ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE tenant_customers ADD COLUMN display_name VARCHAR(255);
ALTER TABLE tenant_customers ADD COLUMN email VARCHAR(255);

-- One of (user_id, display_name) must be set; both can be set when a walk-in later claims an account.
ALTER TABLE tenant_customers ADD CONSTRAINT chk_customer_identity
    CHECK (user_id IS NOT NULL OR display_name IS NOT NULL);

-- The unique constraint on (user_id, tenant_id) doesn't work when user_id is null
-- because Postgres allows multiple nulls. We don't need uniqueness for walk-ins anyway.
-- Keep the existing constraint; it just won't prevent duplicate walk-ins (acceptable).

-- Snapshot pricing onto the lot at intake so later template edits don't retroactively
-- change in-flight work. This is the snapshot-at-decision-moment pattern from the spec.
ALTER TABLE lots ADD COLUMN pricing_kind_snapshot VARCHAR(32);
ALTER TABLE lots ADD COLUMN pricing_config_snapshot JSONB;
