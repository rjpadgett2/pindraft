-- V10: OAuth 2.1 + PKCE schema.

CREATE TABLE oauth_clients (
    id                    UUID PRIMARY KEY,
    tenant_id             UUID NOT NULL REFERENCES tenants(id),
    name                  VARCHAR(255) NOT NULL,
    client_secret_hash    VARCHAR(255) NOT NULL,
    redirect_uris         JSONB NOT NULL,
    pkce_required         BOOLEAN NOT NULL DEFAULT TRUE,
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oauth_clients_tenant ON oauth_clients(tenant_id);

CREATE TABLE oauth_authorization_codes (
    id                       UUID PRIMARY KEY,
    code                     VARCHAR(64) NOT NULL UNIQUE,
    client_id                UUID NOT NULL REFERENCES oauth_clients(id),
    user_id                  UUID NOT NULL REFERENCES users(id),
    tenant_id                UUID NOT NULL REFERENCES tenants(id),
    redirect_uri             VARCHAR(2048) NOT NULL,
    code_challenge           VARCHAR(128) NOT NULL,
    code_challenge_method    VARCHAR(8) NOT NULL,
    scope                    VARCHAR(255) NOT NULL,
    expires_at               TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed_at              TIMESTAMP WITH TIME ZONE,
    created_at               TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oauth_codes_lookup ON oauth_authorization_codes(code) WHERE consumed_at IS NULL;

CREATE TABLE oauth_access_tokens (
    id           UUID PRIMARY KEY,
    token_hash   VARCHAR(128) NOT NULL UNIQUE,
    client_id    UUID NOT NULL REFERENCES oauth_clients(id),
    user_id      UUID NOT NULL REFERENCES users(id),
    tenant_id    UUID NOT NULL REFERENCES tenants(id),
    scope        VARCHAR(255) NOT NULL,
    expires_at   TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at   TIMESTAMP WITH TIME ZONE,
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oauth_access_active ON oauth_access_tokens(token_hash) WHERE revoked_at IS NULL;

CREATE TABLE oauth_refresh_tokens (
    id              UUID PRIMARY KEY,
    token_hash      VARCHAR(128) NOT NULL UNIQUE,
    client_id       UUID NOT NULL REFERENCES oauth_clients(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    scope           VARCHAR(255) NOT NULL,
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at         TIMESTAMP WITH TIME ZONE,
    revoked_at      TIMESTAMP WITH TIME ZONE,
    rotated_from    UUID REFERENCES oauth_refresh_tokens(id),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oauth_refresh_active ON oauth_refresh_tokens(token_hash)
    WHERE used_at IS NULL AND revoked_at IS NULL;

CREATE TABLE oauth_rsa_keys (
    id                    UUID PRIMARY KEY,
    key_id                VARCHAR(32) NOT NULL UNIQUE,
    public_key_b64        TEXT NOT NULL,
    private_key_b64       TEXT NOT NULL,
    active_for_signing    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
