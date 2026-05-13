# common — shared kernel

The shared infrastructure every other module depends on. No business logic.

## What lives here

- `scope/Scope.java` — the three-scope enum (PLATFORM_SHARED, TENANT_SCOPED, USER_SCOPED).
- `security/TenantContext.java` — request-scoped bean carrying the authenticated user's identity and tenant relationships.
- `security/TenantAccessGuard.java` — resource-level authorization (staff and customer modes).
- `security/UserOwnershipGuard.java` — user-scoped resource authorization.
- `error/PindraftException.java` — base for domain exceptions; subclasses define their HTTP problem type.
- `error/ProblemDetailHandler.java` — global controller advice mapping exceptions to RFC 7807 problem-details.
- `api/ApiVersion.java` — Spring Boot 4.0 API version constants for endpoints.

## What does not live here

- Entities (each module owns its own).
- Repositories (each module owns its own).
- Anything domain-specific.

This module should remain small. If something accumulates here that feels domain-specific, it probably belongs in a real module.
