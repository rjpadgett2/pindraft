# Architecture overview

Brief reference. The canonical document is [`docs/Pindraft_Spec.md`](docs/Pindraft_Spec.md).

## Topology

```
                           Browser / device
                                  │
            ┌─────────────────────┼─────────────────────┐
            │                     │                     │
    ops-console            customer-portal         shearer-pwa
   (Angular 21, MD)       (Angular 21, SSR)        (Angular 21, PWA)
            └─────────────────────┼─────────────────────┘
                                  │
                            REST (OpenAPI 3.1)
                                  │
                       Spring Boot 4.0 monolith
                          (Spring Modulith)
                                  │
                ┌────────┬────────┼────────┬────────┬────────┐
              identity  mill-ops marketplace ... interop  common
                │
            Postgres 16  ←  Supabase (managed)
```

## Module boundaries (backend)

The backend is one Spring Boot application with Spring Modulith enforcing package-level module isolation. Each module owns its own schema namespace in Postgres (Flyway migrations live with the module) and exposes a published API to other modules.

| Module        | Owns                                                       |
|---------------|------------------------------------------------------------|
| `common`      | TenantContext, scope enum, security primitives, problem-details |
| `identity`    | users, tenants, memberships, customers, JWT, OAuth        |
| `mill-ops`    | lots, batches, stages, equipment, scans, pools            |
| `marketplace` | listings, mill directory                                  |
| `traceability`| trace records and segments                                |
| `pools`       | wool-pool formation and economics                         |
| `billing`     | pricing, invoicing, settlements                           |
| `shearer`     | shearer profiles, booking, routes                         |
| `interop`     | Hirsel integration: OAuth, webhooks, shipment ingest      |

Modules talk to each other via published interfaces, never via direct repository access. Cross-module side effects happen through Spring Modulith events.

## Three data scopes

Every table belongs to exactly one scope, enforced at the JPA repository layer:

- **Platform-shared** — cross-tenant readable. Users, tenants, reference taxonomies, marketplace listings, trace records.
- **Tenant-scoped** — every row carries `tenant_id`. Lots, equipment, invoices, customers-of-this-mill.
- **User-scoped** — every row carries `owner_user_id`. Animals, pre-shipment fleeces, OAuth grants.

See `backend/modules/common/src/main/java/co/pindraft/common/scope/Scope.java` and the spec's "Three data scopes" section.

## Auth model

Pindraft owns auth. Spring Security 7 with custom JWT issuance, BCrypt passwords, refresh-token rotation in Postgres.

The JWT carries:

- `sub` (user_id)
- `is_platform_admin` (boolean)
- `tenant_memberships` (array of `{tenant_id, role}` for staff access)
- `tenant_customers` (array of `{tenant_id, customer_kind}` for customer access)

On every request, a `TenantContextFilter` populates a request-scoped `TenantContext` bean from the validated JWT. Repositories consult `TenantContext` for filter injection; controllers can additionally guard methods with `@PreAuthorize` and resources with `TenantAccessGuard`.

## Frontend workspace

Nx workspace with three apps and four libs.

| Path                          | Purpose                              |
|-------------------------------|--------------------------------------|
| `apps/ops-console`            | Mill operator UI (desktop-first)     |
| `apps/customer-portal`        | Shepherd + designer + marketplace UI |
| `apps/shearer-pwa`            | Shearer field tool (PWA)             |
| `libs/api-client`             | Generated TypeScript API client      |
| `libs/ui`                     | Shared design tokens + components    |
| `libs/auth`                   | JWT interceptor, route guards        |
| `libs/domain`                 | Shared TypeScript types and constants |

Apps import generated services from `@pindraft/api-client`; they never construct `HttpClient` calls directly.

## OpenAPI workflow

Code-first via springdoc-openapi:

1. Backend controllers carry `@Operation` and `@ApiResponse` annotations.
2. `./gradlew :application:openApiGenerate` writes `docs/api-spec.yaml` from the running Spring context.
3. `npx nx run api-client:generate` regenerates `libs/api-client/src/lib/generated/` from the YAML.
4. Generated code is committed to git so diffs show up in code review.

The `api-client` lib's services are typed Angular services; you inject them like any other service.
