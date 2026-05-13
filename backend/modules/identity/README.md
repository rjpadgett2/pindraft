# identity — users, tenants, auth

The module that owns who can do what. Functional in the scaffold.

## What this module owns

| Entity                   | Scope             | Purpose                                          |
|--------------------------|-------------------|--------------------------------------------------|
| `users`                  | PLATFORM_SHARED   | The person — email, password hash, name           |
| `tenants`                | PLATFORM_SHARED   | A mill — name, status (SETUP/LIVE/PAUSED)         |
| `tenant_memberships`     | TENANT_SCOPED     | Staff with roles inside a tenant                  |
| `tenant_customers`       | TENANT_SCOPED     | Customer relationship between user and tenant     |
| `refresh_tokens`         | USER_SCOPED       | Rotating refresh tokens                           |

## API surface

| Endpoint                          | Auth         | Purpose                                  |
|-----------------------------------|--------------|------------------------------------------|
| `POST /api/v1/auth/login`         | none         | Email + password → access + refresh tokens |
| `POST /api/v1/auth/refresh`       | refresh JWT  | Refresh token → new access + refresh tokens |
| `POST /api/v1/auth/logout`        | access JWT   | Revoke refresh token                     |
| `POST /api/v1/auth/register`      | none         | Self-serve registration                  |
| `GET  /api/v1/me`                 | access JWT   | Current user + memberships               |
| `POST /api/v1/bootstrap/admin`    | none, flagged| One-time first-admin creation (dev only) |

## Auth flow

1. User POSTs credentials to `/auth/login`.
2. `AuthService` verifies the password hash (BCrypt).
3. `JwtService` mints an access token (1h TTL) and a refresh token (90d TTL).
4. Refresh token is stored hashed in `refresh_tokens`.
5. Client stores both; sends access token as `Authorization: Bearer <token>` on subsequent requests.
6. `JwtAuthenticationFilter` validates the JWT on every request, populates `SecurityContext` and `TenantContextHolder`.
7. When access expires, client POSTs refresh token to `/auth/refresh`. Old refresh token is revoked, new pair issued (rotation).

## Cross-module API

Other modules use the identity module via these published interfaces:

- `TenantContextHolder` (from common) — request-scoped current user info.
- `TenantAccessGuard` (from common) — resource-level checks.

This module does not expose entities or repositories to other modules.

## What's not yet built

- OAuth 2.0 authorization server endpoints (for Hirsel integration). The OAuth client and grant tables are in the migration, but the endpoints live in the `interop` module (still a stub).
- Email verification flow.
- Password reset flow.
- SSO providers.
- Audit logging of auth events.
