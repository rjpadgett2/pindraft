# Pindraft

A multi-tenant operations and marketplace platform for the U.S. small-mill fiber industry. Mills run their day-to-day operations on it; shepherds and designers track their fiber through the mill; the public discovers mills and reads provenance traces; external systems like Hirsel integrate through OAuth.

## What's in this repo

```
backend/             Spring Boot 4.0.5 modular monolith (Java 21)
frontend/            Nx workspace with three Angular 21 apps
docs/                Spec, integration guide, setup
nginx/               Production reverse proxy config
docker-compose.yml   Local Postgres for development
Dockerfile           Production image build
DEPLOY.md            Production deployment guide
```

The canonical product and architecture spec is [`docs/Pindraft_Spec.md`](docs/Pindraft_Spec.md). For setup, see [`SETUP.md`](SETUP.md). For production deployment, see [`DEPLOY.md`](DEPLOY.md).

**Integrating with Hirsel? Start at [`docs/HIRSEL_INTEGRATION.md`](docs/HIRSEL_INTEGRATION.md).** That document is self-contained — everything Hirsel-side work needs is there, including OAuth flow, endpoint reference, webhook handling, and Java code samples.

## Stack

| Layer       | Choice                                                              |
|-------------|---------------------------------------------------------------------|
| Backend     | Spring Boot 4.0.5, Java 21, Spring Modulith, Spring Security 7      |
| API spec    | OpenAPI 3.1 via springdoc-openapi (code-first)                      |
| Database    | Postgres 16 (managed Postgres in dev/prod; Supabase or equivalent)  |
| Migrations  | Flyway                                                              |
| Frontend    | Angular 21 (standalone, zoneless, signals), vanilla `@pindraft/ui`  |
| Workspace   | Nx 21 with three Angular apps + four shared libs                    |
| Design sys. | `libs/ui` — token-driven SCSS primitives (button, card, input, select, datepicker, checkbox, toggle, radio, icon, icon-button, status-chip, table, snackbar, …). No Angular Material. |
| Test runner | Vitest (Angular), JUnit 5 + Testcontainers (backend)                |

## Three frontends

- **ops-console** (`app.pindraft.co`) — what mill staff use. Onboarding, reservations, intake, lots, queues, scan stations, equipment runs, marketplace listings, wool pools, customer roster (with link-to-user + claim-code generation), OAuth client registration.
- **customer-portal** (`portal.pindraft.co`) — what shepherds use. View lots across mills, view pool memberships, toggle public trace visibility, redeem claim codes to attach mill-side records to their account. Also serves the unauthenticated public marketplace, mill directory, and trace pages — and the OAuth consent screen.
- **shearer-pwa** (`shearer.pindraft.co`) — what shearers use on-farm. Offline-first PWA with IndexedDB outbox, service worker, idempotent sync.

Each frontend has a distinct brand palette layered on the shared design tokens — slate-blue for ops-console (industrial), terracotta + cream for customer-portal (craft/warm), sage for shearer-pwa (outdoors/calm). The palette swap happens entirely through `--pd-brand-*` CSS custom properties; component code is identical across apps.

## Backend modules

Nine modules, one Spring Boot application, one database. Spring Modulith verifies the dependency graph at startup.

| Module          | Purpose                                                                       |
|-----------------|-------------------------------------------------------------------------------|
| `common`        | TenantContext, security primitives, problem-details responses                 |
| `identity`      | Users, tenants, memberships, customers, JWT auth                              |
| `mill-ops`      | The operational core: reservations, lots, stages, equipment runs, scan events |
| `billing`       | Pricing template CRUD with per-kind config validation                         |
| `traceability`  | Trace records, segments, public lookup by short slug, visibility toggle       |
| `marketplace`   | Listings (CRUD + state machine), public browse, mill directory                |
| `pools`         | Wool pool lifecycle, contributions, proportional share calculation            |
| `shearer`       | Independent shearer event log with idempotent sync                            |
| `interop`       | OAuth 2.1+PKCE, manifest ingest, HMAC-signed webhook dispatch                 |

## Module dependency graph

The graph is acyclic, with `common` as the leaf and `interop` as the root that subscribes to events from everything else:

```
common ← identity ← traceability
common ← identity ← billing      ← mill-ops
common ← identity ← marketplace
common ← identity                 ← mill-ops ← interop
common ← identity ← pools         ← mill-ops ← interop
common ← identity ← shearer
```

Cross-module communication uses two patterns:

- **Synchronous published interfaces** — e.g. `mill-ops.ReservationCreator`, consumed by `interop` for manifest ingest. The interface lives in mill-ops's root package; interop imports it directly.
- **Application events via Spring Modulith** — mill-ops, pools, and marketplace publish domain events. Interop subscribes via `@ApplicationModuleListener` to dispatch webhooks. The event publication registry guarantees at-least-once delivery even across restarts.

## Getting started

```bash
# 1. Database — pick one
docker compose up -d                                              # local Postgres, OR
# create a Supabase project and grab the JDBC URL (see SETUP.md §2)

# 2. Local env vars (one-time, at repo root)
cp .env.example .env
# edit .env — fill in DATABASE_URL, DATABASE_USER, DATABASE_PASSWORD, JWT_SECRET
# (.env is gitignored; the same variable names feed docker-compose.prod.yml)

# 3. Backend (Java 21 required; ./gradlew bundles Gradle 9.5.1)
cd backend
./gradlew :application:bootRun

# 4. Frontend (in another terminal)
cd ../frontend
npm install
npx nx serve ops-console     # http://localhost:4200
npx nx serve customer-portal # http://localhost:4201
npx nx serve shearer-pwa     # http://localhost:4202
```

First boot runs all Flyway migrations from the modules' `db/migration/` directories. Springdoc serves the live OpenAPI spec at `http://localhost:8080/v3/api-docs` and Swagger UI at `/swagger-ui.html`.

For full setup including Supabase project creation, see [`SETUP.md`](SETUP.md).

## Authentication & integrations

Three auth schemes coexist:

1. **User JWT** — for ops-console, customer-portal, shearer-pwa. Issued by `/api/v1/auth/login`, validated by `JwtAuthenticationFilter`.
2. **OAuth 2.1 + PKCE** — for external integrations like Hirsel. Full authorization code flow with PKCE, opaque hashed tokens, single-use refresh rotation, JWKS endpoint, RFC 7009 revocation. See [`docs/HIRSEL_INTEGRATION.md`](docs/HIRSEL_INTEGRATION.md).
3. **v1 bearer (legacy)** — `Bearer pdt_<client-id>_<secret>`. Maintained for backwards compatibility while early clients migrate. Use OAuth for new integrations.

Webhooks are HMAC-SHA256 signed with `X-Pindraft-Signature: sha256=<hex>`. Six event types currently fire: `shipment.received_at_mill`, `lot.stage_transition`, `pool.contribution_recorded`, `pool.settled`, `listing.published`, `listing.sold`.

## End-to-end fiber journey

A complete trip from animal to public provenance, exercising the platform:

1. Hirsel pushes a shipment manifest to Pindraft via OAuth-authenticated POST to `/api/v1/interop/v1/shipments`. A reservation appears at the mill, idempotent on the shepherd's external shipment ID.
2. The mill operator intakes fiber via ops-console. The reservation becomes a lot; a trace record with a 6-char slug is emitted; the `shipment.received_at_mill` webhook fires back to Hirsel.
3. The operator advances the lot through workflow stages. Each transition emits a trace segment and fires `lot.stage_transition`.
4. Fiber completes processing. The operator creates a marketplace listing, attaching the lot's trace slug. On publish, `listing.published` fires.
5. The shepherd logs into customer-portal, opens their lot detail, flips the trace visibility toggle to public. (If the shepherd registered *after* the mill recorded the walk-in, registration auto-linked their account by email match. If email didn't match, the operator generated a claim code from `/ops/customers` and the shepherd redeemed it at `/claim`.)
6. A yarn shop owner browses `portal.pindraft.co/marketplace`, sees the listing with a verified-trace icon, clicks through to `/trace/{slug}`, reads the full provenance.

## Deployment

See [`DEPLOY.md`](DEPLOY.md) for the production setup: Dockerfile (multi-stage), nginx (three subdomains, HTTPS via Let's Encrypt), `docker-compose.prod.yml`, environment variables, certificate renewal.

## Documentation map

| Document                                                             | Purpose                                                |
|----------------------------------------------------------------------|--------------------------------------------------------|
| [`README.md`](README.md)                                             | This file. Orientation.                                |
| [`SETUP.md`](SETUP.md)                                               | First-time local setup.                                |
| [`DEPLOY.md`](DEPLOY.md)                                             | Production deployment with HTTPS.                      |
| [`docs/Pindraft_Spec.md`](docs/Pindraft_Spec.md)                     | Canonical product and architecture spec.               |
| [`docs/HIRSEL_INTEGRATION.md`](docs/HIRSEL_INTEGRATION.md)           | **Hirsel-side integration guide.** Self-contained.     |
| [`docs/hirsel-interop-spec.yaml`](docs/hirsel-interop-spec.yaml)     | OpenAPI 3.1 spec for the interop surface.              |
| [`docs/coding-standards.md`](docs/coding-standards.md)               | Code style conventions.                                |
| [`docs/local-dev.md`](docs/local-dev.md)                             | Developer ergonomics tips.                             |
| [`docs/supabase-setup.md`](docs/supabase-setup.md)                   | Supabase project creation for managed Postgres.        |
