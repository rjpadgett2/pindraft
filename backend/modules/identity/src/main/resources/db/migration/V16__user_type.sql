-- V16: user_type column on users. Captures what kind of person the user is,
-- orthogonal to per-tenant role (which lives in tenant_memberships.role).
--
-- A new mill admin signing up via /auth/register-mill becomes user_type = MILL_STAFF
-- and gets a MILL_ADMIN membership. A shepherd registering via /auth/register
-- with user_type = SHEPHERD doesn't get any membership — they may be added as a
-- tenant_customer later by a mill, or arrive via Hirsel. Default is NULL (existing
-- users predate this column; they keep working).

ALTER TABLE users ADD COLUMN user_type VARCHAR(32);

ALTER TABLE users ADD CONSTRAINT chk_user_type CHECK (
    user_type IS NULL OR user_type IN ('SHEPHERD', 'DESIGNER', 'SHEARER', 'MILL_STAFF')
);

CREATE INDEX idx_users_user_type ON users(user_type) WHERE user_type IS NOT NULL;
