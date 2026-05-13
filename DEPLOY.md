# Pindraft deployment

The production stack is two containers — the Spring Boot API and an nginx that serves the three Angular frontends and reverse-proxies the API. The database is external (managed Postgres recommended — Supabase, RDS, Crunchy Bridge).

## Prerequisites

- A host with Docker and docker-compose. 2 vCPU and 2 GB RAM is enough for early traffic.
- Three DNS A records pointing at the host: `app.pindraft.co`, `portal.pindraft.co`, `shearer.pindraft.co`.
- A managed Postgres instance. Apply the schema by booting the API once with a fresh DB — Flyway runs all 10 migrations automatically.

## First-time setup

1. **Clone and prepare environment.**

   ```bash
   git clone https://github.com/your-org/pindraft.git
   cd pindraft
   cp .env.example .env  # then edit with your values
   ```

   Required env vars:

   ```
   DATABASE_URL=jdbc:postgresql://host:5432/pindraft
   DATABASE_USER=pindraft_app
   DATABASE_PASSWORD=<long random string>
   JWT_SECRET=<at least 64 random chars>
   ALLOWED_ORIGINS=https://app.pindraft.co,https://portal.pindraft.co,https://shearer.pindraft.co
   ```

2. **Build the frontends.** The nginx image bakes the Angular dist directories in.

   ```bash
   cd frontend
   npm install
   npx nx run-many --target=build --projects=ops-console,customer-portal,shearer-pwa --configuration=production
   cd ..
   ```

3. **Initial certificate issuance via certbot.** Run before bringing up nginx; the SSL config in `nginx/sites/*.conf` references certificate paths that must exist.

   ```bash
   sudo apt-get install certbot
   sudo certbot certonly --standalone \
     -d app.pindraft.co -d portal.pindraft.co -d shearer.pindraft.co
   ```

   Certificates land in `/etc/letsencrypt/live/<domain>/`. The compose file bind-mounts this read-only into the nginx container.

4. **Bring up the stack.**

   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

   First API boot runs all Flyway migrations. The healthcheck waits 60s before reporting healthy to allow for startup.

5. **Verify.**

   ```bash
   curl https://app.pindraft.co/api/v1/actuator/health
   # {"status":"UP"}
   ```

## Certificate renewal

Let's Encrypt certificates expire in 90 days. Renew via cron:

```cron
0 3 * * * certbot renew --quiet && docker compose -f /path/to/docker-compose.prod.yml exec pindraft-nginx nginx -s reload
```

## Updates

Roll forward by rebuilding the image. Spring Boot's graceful shutdown finishes in-flight requests; webhook deliveries are durable in the DB and resume after restart.

```bash
git pull
cd frontend && npx nx run-many --target=build --projects=ops-console,customer-portal,shearer-pwa --configuration=production
cd ..
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

## Backups

Postgres is external. Use the managed provider's backup features — daily snapshots, point-in-time recovery, off-region replicas as needed. The Spring Boot app and nginx are stateless; their containers can be destroyed and recreated without data loss.

## Observability

`/actuator/health` and `/actuator/info` are exposed for liveness and readiness. Other actuator endpoints are deliberately disabled in `application-prod.yml` — extend `management.endpoints.web.exposure.include` if you want metrics scraping.

Logs go to stdout. `docker compose logs -f pindraft-api` follows the API logs; pipe to whatever aggregator (Loki, Datadog, CloudWatch) you use.

## What's not here

- **Multi-region deployment** — single host for v1. Postgres replication and a second compute region are future work.
- **Background-job workers** — webhook dispatch runs in-process via `@Scheduled`. Fine for now; if dispatch volume grows past one worker can handle, split it out into a separate deployment of the same image with a feature flag.
- **CDN** — assets are served by nginx directly. Adding Cloudflare in front is one DNS change away.
