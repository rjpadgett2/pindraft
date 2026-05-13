# Local dev workflow

For when you want a fully self-contained dev environment without an internet round-trip to Supabase.

## Option A: Docker Postgres (no Supabase needed)

A `docker-compose.yml` at the repo root spins up Postgres 16:

```bash
docker compose up -d
```

Then point `application-local.yml` at it:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/pindraft
    username: pindraft
    password: pindraft
```

Stop it when done:

```bash
docker compose down       # keeps data
docker compose down -v    # wipes the volume
```

## Option B: Local Postgres install

If you have Postgres 16+ installed natively:

```bash
createdb pindraft
createuser -P pindraft   # prompt for password
psql -d pindraft -c "GRANT ALL ON SCHEMA public TO pindraft;"
```

Then same `application-local.yml` config as Option A.

## Daily commands

```bash
# Start backend
cd backend && ./gradlew :application:bootRun

# Start ops console
cd frontend && npx nx serve ops-console

# Run all backend tests
cd backend && ./gradlew test

# Run a single module's tests
cd backend && ./gradlew :modules:identity:test

# Run a single test class
cd backend && ./gradlew :modules:identity:test --tests "co.pindraft.identity.api.AuthControllerTest"

# Frontend tests for one app
cd frontend && npx nx test ops-console

# Frontend lint
cd frontend && npx nx lint ops-console

# Regenerate API client
cd backend && ./gradlew :application:openApiGenerate
cd frontend && npx nx run api-client:generate
```

## Adding a new backend module

1. Create `backend/modules/<name>/build.gradle.kts`.
2. Add the module to `backend/settings.gradle.kts`.
3. Create the package structure: `co.pindraft.<name>.{api,application,domain,infrastructure}`.
4. Add a `package-info.java` with `@ApplicationModule` (Spring Modulith).
5. Add a `README.md` describing what the module owns.
6. Add a Flyway migration in `src/main/resources/db/migration/V<N>__<name>_core.sql`.
7. Re-run `./gradlew :application:bootRun` — the new module is auto-detected.

## Adding a new frontend app or lib

```bash
cd frontend
npx nx generate @nx/angular:app new-app
npx nx generate @nx/angular:lib new-lib
```

## Resetting state during dev

Wipe the database and re-migrate:

```bash
# Docker Postgres
docker compose down -v && docker compose up -d
cd backend && ./gradlew :application:bootRun

# Supabase
# Use SQL Editor: drop and recreate the schema, then restart the backend
```

For Supabase, drop-and-recreate is heavy-handed. Prefer adding a new migration that undoes what you don't want, or branch the Supabase project.
