# interop — external system integration

Implements the contract specified by [`docs/hirsel-interop-spec.yaml`](../../../docs/hirsel-interop-spec.yaml): machine-to-machine authentication, idempotent manifest ingest, webhook dispatch for lifecycle events.

## Authentication

Two schemes coexist; the auth filter handles both transparently.

### OAuth 2.1 + PKCE (preferred)

Full OAuth authorization code flow with PKCE. Token format: `Bearer oat_<base64url>`.

**Endpoints:**
- `GET  /api/v1/oauth/authorize` — entry. Redirects to consent UI in the customer-portal.
- `POST /api/v1/oauth/authorize/approve` — called by consent UI after user approves; issues an authorization code.
- `POST /api/v1/oauth/token` — exchanges code (+PKCE verifier) or refresh token for an access token pair.
- `POST /api/v1/oauth/revoke` — revokes an access or refresh token.
- `GET  /.well-known/jwks.json` — public RSA keys for token verification.

**Tokens are opaque + hashed at rest.** SHA-256 hash stored; plaintext never persisted. Even a DB breach can't replay tokens.

**Refresh token rotation:** single-use. Using a refresh token issues a new pair and marks the old one used. Reuse of a used refresh is a strong signal of compromise.

**Scope format:** `mill:{tenant_id}:interop`. The (tenant, user) pair is bound into the token; even a compromised token has limited blast radius.

### v1 bearer (legacy, still supported)

Pre-OAuth scheme. Token format: `Bearer pdt_<client_id>_<secret>`. No user_id — machine-to-machine only.

Maintained for backwards compatibility while v1 clients migrate. New integrations should use OAuth.

## Webhook dispatch

Driven by Spring Modulith application events. mill-ops and pools publish events from inside their transactions; the WebhookDispatcher's `@ApplicationModuleListener` methods catch them and enqueue `webhook_deliveries` rows. A `@Scheduled` sender POSTs them with HMAC-SHA256 signatures, exponential backoff on failure (30s, 1m, 2m, 4m, 8m).

Event types currently fired:
- `shipment.received_at_mill`
- `lot.stage_transition`
- `pool.contribution_recorded`
- `pool.settled`

## Manifest ingest

`POST /api/v1/interop/v1/shipments` — Hirsel pushes shepherd shipment manifests. Idempotent on `external_shipment_id`. Resolves the shepherd's `tenant_customers` row by external source identity; auto-creates a walk-in row if no match exists.

Once accepted, the manifest becomes a reservation; the next `LotService.intake()` call against that reservation creates the lot.
