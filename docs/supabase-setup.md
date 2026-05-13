# Supabase setup

How to provision a Supabase project for use as Pindraft's Postgres database. **We use Supabase strictly as managed Postgres** — no Supabase Auth, no RLS, no client SDK. Pindraft owns access control in Spring.

## Why Supabase

Postgres-as-a-service with no ops overhead, generous free tier (500MB DB, 2GB transfer, 50K MAU on free, way more than enough for a single-mill design partner phase), branch databases for preview environments, point-in-time recovery on paid tiers, and a UI that's actually useful for poking at data during development.

## Step 1: Create the project

1. Sign up / log in at [supabase.com](https://supabase.com).
2. Click **New project**.
3. **Name**: `pindraft-dev` (use `pindraft-prod` for production). One project per environment.
4. **Database password**: generate a strong one (Supabase suggests one) and save it to your password manager. You cannot recover it later — only reset it.
5. **Region**: choose closest to your users. For eastern US, `us-east-1` (N. Virginia). For latency-sensitive ops console use, match the mill's region.
6. **Pricing plan**: free tier is fine for development. Pro ($25/mo) unlocks daily backups and is recommended for production.
7. Click **Create new project**. Provisioning takes 1–2 minutes.

## Step 2: Get the connection string

Once provisioned:

1. Go to **Project Settings → Database → Connection string**.
2. Choose the **Session pooler** tab — this is the recommended mode for long-lived backend services like Spring Boot.
3. Select **Java/JDBC** from the language tabs.
4. Copy the JDBC URL. It looks like:

```
jdbc:postgresql://aws-0-us-east-1.pooler.supabase.com:5432/postgres?user=postgres.YOUR_REF
```

Note the `YOUR_REF` placeholder — that's a six-character identifier specific to your project. Supabase will have already substituted in your real value.

5. The connection components for `application-local.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://aws-0-us-east-1.pooler.supabase.com:5432/postgres
    username: postgres.YOUR_REF
    password: YOUR_DB_PASSWORD
    driver-class-name: org.postgresql.Driver
```

## Step 3: Network access

For development:

1. Go to **Project Settings → Database → Network Restrictions**.
2. Add your current IP address to the allow-list, or for convenience during dev, allow `0.0.0.0/0` and re-secure before production.

For production:

- Allow only your application server's static IP, or use a VPC peering / private connection if you're on a paid Supabase plan.

## Step 4: Disable Supabase Auth (we don't use it)

Pindraft handles auth in Spring. Supabase Auth would be redundant and could cause confusion:

1. Go to **Authentication → Providers**.
2. Disable all providers (Email, OAuth providers, etc.).
3. Go to **Authentication → Configuration** and turn off email confirmations.

The `auth.users` table that Supabase auto-creates stays empty. Pindraft creates its own `users` table in the `public` schema via Flyway migrations.

## Step 5: Disable RLS by default

Pindraft enforces access in Spring, not Postgres RLS. RLS would actively interfere because Spring connects as the postgres user.

For each table Flyway creates, RLS will be off by default (Postgres default). Confirm by running this query in **SQL Editor** after migrations run:

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

All rows should show `rowsecurity = false`. If any are `true` (e.g., from a leftover Supabase template), disable with:

```sql
ALTER TABLE public.your_table DISABLE ROW LEVEL SECURITY;
```

## Step 6: Run Flyway migrations

Migrations are versioned SQL files in `backend/modules/<module>/src/main/resources/db/migration/`. Flyway runs on application boot and tracks state in a `flyway_schema_history` table.

First run — start the backend:

```bash
cd backend
./gradlew :application:bootRun
```

You should see Flyway log lines like:

```
Successfully validated 2 migrations (execution time 00:00.012s)
Creating Schema History table "public"."flyway_schema_history" ...
Current version of schema "public": << Empty Schema >>
Migrating schema "public" to version "1 - identity core"
Migrating schema "public" to version "2 - mill ops core"
```

Verify in Supabase SQL Editor:

```sql
SELECT * FROM flyway_schema_history;
```

## Step 7: Production considerations

When you stand up `pindraft-prod`:

1. Use a separate Supabase project (not just a separate database in the dev project).
2. Set up daily backups (Pro plan).
3. Enable point-in-time recovery.
4. Use a connection pooler size appropriate for your Spring Boot connection pool (default HikariCP is 10 connections; Supabase session pooler defaults to 15 — coordinate these).
5. Store the production JWT secret and DB password in your secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.), not in plain config.
6. Lock network restrictions to your application server's IP only.
7. Monitor Postgres metrics via the Supabase dashboard — watch for slow queries and pool exhaustion.

## Troubleshooting

**Connection refused / timeout**: check Network Restrictions allowing your IP.

**Authentication failed**: confirm the username includes `.YOUR_REF` (the project ref suffix), not just `postgres`. Supabase's session pooler requires the full username.

**Flyway sees existing tables it didn't create**: another tool (Supabase's own migrations, perhaps from a template) created tables in `public`. Either drop them or use a different schema (`pindraft`) for Flyway-managed tables.

**Slow queries**: check the Supabase Performance tab. The query advisor surfaces missing indexes and suggests `EXPLAIN` plans.
