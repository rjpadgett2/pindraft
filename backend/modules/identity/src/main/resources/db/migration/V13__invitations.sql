-- V13: Tenant invitations. Operator invitation flow per spec onboarding's optional
-- step. Tokens are stored as hashes only (BCrypt); the plaintext is shown to the
-- inviter once at creation time so they can hand the URL to the new operator.
-- Email-sending integration is a v1.1 follow-up (no decision on provider yet).

CREATE TABLE tenant_invitations (
    id                UUID PRIMARY KEY,
    tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email             VARCHAR(255) NOT NULL,
    role              VARCHAR(32) NOT NULL,
    token_hash        VARCHAR(255) NOT NULL,
    status            VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    invited_by        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    expires_at        TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at       TIMESTAMP WITH TIME ZONE,
    accepted_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_invitation_status CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')),
    CONSTRAINT chk_invitation_role   CHECK (role IN ('MILL_ADMIN', 'MILL_OPERATOR'))
);

CREATE INDEX idx_invitations_tenant_status ON tenant_invitations(tenant_id, status);
CREATE INDEX idx_invitations_email         ON tenant_invitations(LOWER(email));
CREATE UNIQUE INDEX uq_invitations_token_hash ON tenant_invitations(token_hash);
