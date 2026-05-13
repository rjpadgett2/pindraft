-- V1: Identity core schema
-- Tables: users, tenants, tenant_memberships, tenant_customers, refresh_tokens

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id                 UUID PRIMARY KEY,
    email              VARCHAR(255) NOT NULL UNIQUE,
    password_hash      VARCHAR(255) NOT NULL,
    name               VARCHAR(255) NOT NULL,
    is_platform_admin  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email_lower ON users (LOWER(email));

CREATE TABLE tenants (
    id            UUID PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    kind          VARCHAR(32) NOT NULL,
    status        VARCHAR(32) NOT NULL DEFAULT 'SETUP',
    default_unit  VARCHAR(2) NOT NULL DEFAULT 'kg',
    time_zone     VARCHAR(64) NOT NULL DEFAULT 'America/New_York',
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_tenant_kind   CHECK (kind IN ('MILL')),
    CONSTRAINT chk_tenant_status CHECK (status IN ('SETUP', 'LIVE', 'PAUSED')),
    CONSTRAINT chk_tenant_unit   CHECK (default_unit IN ('kg', 'lb'))
);

CREATE TABLE tenant_memberships (
    id          UUID PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role        VARCHAR(32) NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_membership      UNIQUE (user_id, tenant_id),
    CONSTRAINT chk_membership_role CHECK (role IN ('MILL_ADMIN', 'MILL_OPERATOR'))
);

CREATE INDEX idx_memberships_user   ON tenant_memberships(user_id);
CREATE INDEX idx_memberships_tenant ON tenant_memberships(tenant_id);

CREATE TABLE tenant_customers (
    id                UUID PRIMARY KEY,
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_kind     VARCHAR(32) NOT NULL,
    external_source   VARCHAR(64),
    external_user_id  VARCHAR(255),
    created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_tenant_customer        UNIQUE (user_id, tenant_id),
    CONSTRAINT chk_customer_kind         CHECK (customer_kind IN ('SHEPHERD', 'DESIGNER')),
    CONSTRAINT uq_external_user          UNIQUE (external_source, external_user_id, tenant_id)
);

CREATE INDEX idx_customers_user   ON tenant_customers(user_id);
CREATE INDEX idx_customers_tenant ON tenant_customers(tenant_id);

CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked     BOOLEAN NOT NULL DEFAULT FALSE,
    rotated_to  UUID REFERENCES refresh_tokens(id),
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);
