# Backend — Pindraft Spring Boot

Spring Boot 4.0.5 modular monolith. Java 21. Spring Modulith for module boundaries.

## Layout

```
backend/
├── gradlew, gradlew.bat        — committed Gradle 9.5.1 wrapper
├── gradle/wrapper/             — wrapper jar + properties
├── settings.gradle.kts         — module registration
├── build.gradle.kts            — root build config (versions, java-library + BOMs)
├── application/                — bootable Spring Boot entry point
│   ├── build.gradle.kts        — wires in every module, Flyway autoconfig, OpenAPI gen
│   └── src/main/java/.../PindraftApplication.java
└── modules/
    ├── common/                 — shared kernel: TenantContext, problem-details, no business logic
    ├── identity/               — users, tenants, memberships, customers, JWT auth + filter
    ├── mill-ops/               — reservations, lots, stages, equipment, scan events, queues
    ├── billing/                — pricing arrangements with per-kind config validation
    ├── marketplace/            — listings (CRUD + state machine), public browse, mill directory
    ├── traceability/           — trace records, segments, public slug lookup, visibility toggle
    ├── pools/                  — wool pool lifecycle, contributions, proportional share
    ├── shearer/                — independent shearer event log with idempotent sync
    └── interop/                — OAuth 2.1+PKCE, v1 bearer (legacy), Hirsel ingest, HMAC webhooks
```

Every module is wired up and boots cleanly; "fullness" varies by feature surface. See `docs/Pindraft_Spec.md` for the canonical scope per module.

## Why modular monolith

One process, one database, one deploy unit — but enforced module boundaries. Spring Modulith verifies the package structure: a class in `co.pindraft.mill_ops.*` cannot directly reference a class in `co.pindraft.billing.infrastructure.*` (only the published API in `co.pindraft.billing.api.*`).

Benefits over microservices for this stage:

- One PR can land a change spanning modules.
- One database, one transaction, no eventual consistency.
- Easy local dev (one `bootRun`).
- Cheap to extract a module into its own service later if load profile or team ownership justifies it.

## Build

Prerequisites: **Java 21** on `PATH` / `JAVA_HOME`. The Gradle wrapper (`./gradlew`) is committed and pins Gradle 9.5.1 — no system Gradle install is needed.

```bash
./gradlew :application:bootRun       # start the server
./gradlew test                       # all tests
./gradlew :modules:identity:test     # one module's tests
./gradlew clean build                # full clean rebuild
```

`bootRun` reads secrets and connection info from `<repo>/.env` (gitignored). Copy `<repo>/.env.example` to `<repo>/.env` and fill in `DATABASE_URL`, `DATABASE_USER`, `DATABASE_PASSWORD`, and `JWT_SECRET` before the first boot. The wiring is in `application.yml` (`spring.config.import: optional:file:./.env[.properties]`) and `application/build.gradle.kts` (sets `bootRun.workingDir` to the repo root so the relative path resolves). See [`../SETUP.md`](../SETUP.md) for the full walkthrough.

On first boot Flyway runs every migration (V1…V10) against the configured database; the app starts at `http://localhost:8080` and `/actuator/health` should return `UP`. Bootstrap the first admin user via `POST /api/v1/bootstrap/admin` — see [`../SETUP.md`](../SETUP.md) §5.

Optional dev overlay: `application-local.example.yml` is preserved as an opt-in for SQL/security debug logging. Copy it to `application-local.yml` (gitignored) only if you want the verbosity.

If `./gradlew` is missing entirely (e.g. you wiped the wrapper), regenerate it with a system Gradle ≥ 8.10: `gradle wrapper --gradle-version 9.5.1 --distribution-type bin`.

## Module conventions

Every module has:

- `build.gradle.kts` declaring dependencies
- `src/main/java/co/pindraft/<module>/` with package structure:
  - `api/` — REST controllers, DTOs
  - `application/` — services, orchestration
  - `domain/` — entities, value objects, domain events
  - `infrastructure/` — repositories, external integrations
  - `package-info.java` — `@ApplicationModule` declaration
- `src/main/resources/db/migration/` — Flyway migrations (if the module owns tables)
- `README.md` — what the module owns

Module builds use the `java-library` plugin (applied to every subproject from the root `build.gradle.kts`), which is what enables the `api(project(":modules:common"))` configuration used throughout. Pure `java` does not expose `api`, so swapping the plugin breaks the entire module graph.

## Gotchas when adding code

A short list of things that bit us coming up on Spring Boot 4 — worth knowing before you write more code:

**Jackson 3, not Jackson 2.** Spring Boot 4 ships Jackson 3, which moved every package from `com.fasterxml.jackson.*` to `tools.jackson.*`. The Jackson 2 jars are not on the classpath at all, so an `@Autowired ObjectMapper` typed against `com.fasterxml.jackson.databind.ObjectMapper` fails at context init with "no qualifying bean". Always import:

```java
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.JsonNode;
import tools.jackson.core.JacksonException;     // checked-exception base in Jackson 3
import tools.jackson.core.type.TypeReference;
```

**Spring Boot 4 split autoconfigure into per-area jars.** `spring-boot-autoconfigure` in 4.x is much smaller; Flyway, JDBC, JPA, Hibernate, security, etc. each live in their own `spring-boot-<area>` module. Adding a new integration usually means adding both the integration's own library (`org.flywaydb:flyway-core`) **and** Spring Boot's autoconfig sibling (`org.springframework.boot:spring-boot-flyway`). The starters pull what they pull; if your starter doesn't pull what you need, declare it explicitly.

**Spring Data JPA repository bean names default to `<simpleName>(camel)`.** Two `RefreshTokenRepository` interfaces in different packages collide on bean name `refreshTokenRepository` even though their FQNs differ. Either pick a globally unique class name (we did `OAuthRefreshTokenRepository` in interop) or annotate with `@Repository("uniqueBeanName")`. Same risk for service/component bean names if you reuse generic class names across modules.

**`TenantContextHolder` is `@RequestScope`.** Don't try to `clear()` it manually from a filter — the bean dies with the request via Spring's scoped proxy. Match the pattern in `identity.JwtAuthenticationFilter`: set, call `chain.doFilter`, return. No try/finally cleanup.

**Cross-module annotations live in `common`.** If you add a new annotation library that more than one module needs (e.g. Swagger added `swagger-annotations` here), declare it `api(...)` in `modules/common/build.gradle.kts` so every module inherits it transitively, rather than declaring it `implementation` in each one. Conventional: starters in `common` are `api`, module-private libraries are `implementation`.

## Running migrations

Flyway runs automatically at application boot via `spring-boot-flyway` autoconfig (declared in `application/build.gradle.kts` alongside `flyway-core` and `flyway-database-postgresql`). To disable, set `spring.flyway.enabled=false`.

Two config knobs that matter against managed Postgres providers (Supabase in particular):

- `baseline-on-migrate: true` — required because Supabase auto-installs objects in the `public` schema (an `rls_auto_enable()` function and `ensure_rls` event trigger), which Flyway sees as a "non-empty schema".
- `baseline-version: 0` — set explicitly so the baseline lands **before** V1 and every numbered migration still runs. The Flyway default of `1` would cause V1 to be silently skipped.

Migration versions are **global across modules** — `V1__identity_core.sql` lives in `identity/`, `V2__mill_ops_core.sql` in `mill-ops/`, `V6__interop.sql` in `interop/`, etc. When adding a new module migration, pick the next unused number across the whole tree.

There is no standalone migrate task; the Flyway Gradle plugin is not applied. If you want to run migrations without booting the web layer, add `--args='--spring.main.web-application-type=none'` to `bootRun` (the JPA + Flyway path still executes on context init).

## OpenAPI

springdoc-openapi generates the spec from running controllers. Endpoints (with the app booted):

- Spec JSON: `http://localhost:8080/v3/api-docs`
- Spec YAML: `http://localhost:8080/v3/api-docs.yaml`
- Swagger UI: `http://localhost:8080/swagger-ui.html` (302s to `/swagger-ui/index.html`)

To regenerate the frontend TypeScript client from the live spec:

```bash
# In one terminal:
./gradlew :application:bootRun
# In another, once the app is up:
./gradlew :application:generateApiClient
# → frontend/libs/api-client/generated/
```

The `openApiGenerate` task is configured in `application/build.gradle.kts` and writes Angular-flavored services + models the three frontends consume via the existing `@pindraft/api-client` import.
