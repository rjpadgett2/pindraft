# Setup

End-to-end guide from a fresh machine to a running Pindraft backend + ops console talking to a Supabase Postgres database.

## Prerequisites

| Tool            | Version  | Install hint                            |
|-----------------|----------|-----------------------------------------|
| Java            | 21       | `brew install openjdk@21` or sdkman     |
| Node            | 20 LTS+  | `nvm install 20`                        |
| npm             | 10+      | bundled with Node 20                    |
| Docker          | latest   | for the optional local Postgres path    |
| Git             | any      | obviously                               |
| Supabase CLI    | latest   | `brew install supabase/tap/supabase` (optional but recommended) |

Verify:

```bash
java -version          # 21.x
node --version         # v20.x or v21.x
docker --version
```

## 1. Clone and structure

```bash
git clone <repo-url> pindraft
cd pindraft
```

## 2. Set up Supabase (the database)

Pindraft uses Supabase as managed Postgres only. **We do not use Supabase Auth, Supabase RLS, or the Supabase client SDKs.** Pindraft owns auth and tenant scoping in Spring. Supabase is the database provider, nothing more.

Full walkthrough: [`docs/supabase-setup.md`](docs/supabase-setup.md). Quick path:

1. Create a project at [supabase.com](https://supabase.com). Choose a region close to you (us-east-1 for eastern US).
2. Pick a strong database password and save it. You'll need it for Flyway.
3. Once the project is provisioned, go to **Project Settings → Database → Connection string** and copy the **session pooler** URI for Java/JDBC. It looks like `jdbc:postgresql://aws-0-us-east-1.pooler.supabase.com:5432/postgres?user=postgres.YOUR_REF`.
4. In **Project Settings → Database → Network restrictions**, allow your IP for development.
5. **Disable email confirmations** in Authentication settings — we won't use Supabase Auth, but this prevents warnings.

For local-only development with Docker Postgres instead of Supabase, see [`docs/local-dev.md`](docs/local-dev.md).

## 3. Backend setup

All connection info and secrets live in a single `.env` file at the repo root. The same variable names feed the production container (`docker-compose.prod.yml`), so what you wire up locally also documents what production needs.

```bash
cp .env.example .env
```

Edit `.env` with your Supabase connection details:

```dotenv
DATABASE_URL=jdbc:postgresql://aws-0-us-east-1.pooler.supabase.com:5432/postgres
DATABASE_USER=postgres.YOUR_REF
DATABASE_PASSWORD=YOUR_DB_PASSWORD
JWT_SECRET=GENERATE_A_STRONG_SECRET_HERE   # see below
```

Generate a JWT secret (32+ bytes, base64):

```bash
openssl rand -base64 48
```

`.env` is gitignored. Spring picks it up automatically via `spring.config.import: optional:file:./.env[.properties]` in `application.yml`, with `bootRun.workingDir` set to the repo root so the relative path resolves.

The Gradle wrapper (`./gradlew`) is committed and pins Gradle 9.5.1 — you only need Java 21 on `PATH`. Verify:

```bash
java -version          # 21.x
./gradlew --version    # Gradle 9.5.1, Launcher JVM 21
```

Run migrations and start the server:

```bash
cd backend
./gradlew :application:bootRun
```

If you want extra dev verbosity (SQL logging, debug logs), there is an optional overlay you can opt into:

```bash
cp backend/application/src/main/resources/application-local.example.yml \
   backend/application/src/main/resources/application-local.yml
```

This file is gitignored and not required to boot.

First boot will run Flyway migrations against your Supabase database, creating the identity and mill-ops schemas. The app starts at `http://localhost:8080`. OpenAPI docs at `http://localhost:8080/v3/api-docs`, Swagger UI at `http://localhost:8080/swagger-ui.html`.

Sanity check:

```bash
curl http://localhost:8080/actuator/health
# {"status":"UP"}
```

## 4. Frontend setup

```bash
cd frontend
npm install
```

Configure the API base URL. Default for local dev is already `http://localhost:8080`, set in `apps/ops-console/src/environments/environment.ts`. Override per app if needed.

Start the ops console:

```bash
npx nx serve ops-console
```

Opens at `http://localhost:4200`. You should land on the login screen.

## 5. Create your first mill admin

The first user has to be created via a one-time bootstrap endpoint (disabled in production by a config flag):

```bash
curl -X POST http://localhost:8080/api/v1/bootstrap/admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "you@yourfarm.com",
    "password": "a-strong-password",
    "name": "Your Name",
    "tenantName": "Sturnella Farm Mill"
  }'
```

This creates the first user (with `is_platform_admin = true` for bootstrap purposes), a tenant in `SETUP` status, and a `MILL_ADMIN` membership linking them.

Log in at `http://localhost:4200/login` with the email and password you just chose. You'll land on the onboarding hub at `/setup`.

## 6. Daily dev loop

```bash
# Terminal 1
cd backend && ./gradlew :application:bootRun

# Terminal 2
cd frontend && npx nx serve ops-console
```

Run tests:

```bash
# Backend
cd backend && ./gradlew test

# Frontend
cd frontend && npx nx test ops-console
```

## What's working in this scaffold

The scaffold ships with one functional vertical slice end-to-end:

- **Auth**: register, login, JWT issuance + refresh, token rotation
- **Tenant context**: JWT-driven tenant scoping in every request
- **Onboarding hub**: the tenant setup checklist, with the workflow stages screen functional
- **OpenAPI**: code-first generation from the running app, accessible at `/v3/api-docs`

Everything else is stubbed with module-level READMEs explaining what goes there. See the spec in `docs/Pindraft_Spec.md` for what to build next.
