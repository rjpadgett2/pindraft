# Integrating Hirsel with Pindraft

This document is the complete reference for integrating Hirsel with Pindraft. Read this once end-to-end and you have everything needed to do the Hirsel-side implementation independently. The OpenAPI spec at [`hirsel-interop-spec.yaml`](hirsel-interop-spec.yaml) is the formal contract; this doc is the practical walkthrough.

## Mental model

Hirsel is the OAuth client. Pindraft is the authorization server **and** the resource server. A shepherd uses Hirsel to manage their flock, and at some point wants to ship fiber to a specific mill that runs on Pindraft. They grant Hirsel consent to act on their behalf at that mill, and from then on Hirsel can push shipment data and receive lifecycle webhooks back.

The consent is per-shepherd and per-mill. A shepherd who works with three mills has three separate OAuth grants. Each grant produces tokens bound to that exact `(shepherd, mill)` pair; a compromised token has limited blast radius.

There's nothing Hirsel needs to know about Pindraft's internals — just these endpoints and the contract below.

## One-time setup per mill

Before any code runs, the mill admin and the Hirsel team need to coordinate once:

1. **Mill admin registers Hirsel as an OAuth client at their mill.** They log into the Pindraft ops-console, navigate to OAuth client settings, and create a client with:
   - Name: "Hirsel"
   - Redirect URIs: the URL(s) on Hirsel's side that will receive the auth code, e.g. `https://hirsel.app/oauth/callback`
   - PKCE required: yes

   Pindraft returns a `clientId` (UUID) and `clientSecret` (one-time-readable string).

2. **Mill admin shares the credentials with Hirsel out-of-band** (email, password manager, whatever). Hirsel stores them, scoped to that mill's tenant ID. Both are needed: `clientId` for every OAuth call, `clientSecret` for token exchange.

3. **Hirsel stores three things per mill:**
   - `tenant_id` (the Pindraft tenant UUID; the mill admin tells Hirsel this)
   - `client_id`
   - `client_secret`

   That's the pre-flight state. Everything else flows from a shepherd granting consent.

## The OAuth flow

When a shepherd in Hirsel says "I want to ship to Bramble Mill", Hirsel initiates the OAuth authorization code flow with PKCE.

### Step 1: Generate the PKCE pair

Hirsel generates a `code_verifier` — a 43-128 character random string — and derives the `code_challenge` as `BASE64URL(SHA256(code_verifier))`. The verifier stays server-side at Hirsel; only the challenge goes to Pindraft.

```java
// Hirsel side, Java
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.nio.charset.StandardCharsets;

public class PkcePair {
    public final String verifier;
    public final String challenge;

    private PkcePair(String verifier, String challenge) {
        this.verifier = verifier;
        this.challenge = challenge;
    }

    public static PkcePair generate() throws Exception {
        var random = new SecureRandom();
        var bytes = new byte[32];
        random.nextBytes(bytes);
        var verifier = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        var digest = MessageDigest.getInstance("SHA-256")
            .digest(verifier.getBytes(StandardCharsets.US_ASCII));
        var challenge = Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        return new PkcePair(verifier, challenge);
    }
}
```

Hirsel also generates a `state` value — a random string used as CSRF protection. Pindraft echoes `state` back unchanged when redirecting to Hirsel's callback; Hirsel verifies it matches what was sent. Same lifetime as the verifier.

Both values are short-lived (5 minutes is reasonable, matching Pindraft's authorization-code TTL). Store them in a server-side session keyed by `state`. When Pindraft calls back, Hirsel looks up the verifier by the echoed `state`.

### Step 2: Redirect the shepherd to Pindraft's authorize endpoint

```
https://api.pindraft.co/api/v1/oauth/authorize
  ?response_type=code
  &client_id=<HIRSEL_CLIENT_ID>
  &redirect_uri=https://hirsel.app/oauth/callback
  &scope=mill:<MILL_TENANT_ID>:interop
  &state=<RANDOM_STATE>
  &code_challenge=<PKCE_CHALLENGE>
  &code_challenge_method=S256
```

The scope format is `mill:{tenant_id}:interop` — a literal token that binds the grant to one mill. Pindraft's authorize endpoint validates everything, then redirects the shepherd's browser to Pindraft's consent UI (which handles login if needed).

The shepherd sees: "Hirsel wants to access your data at Bramble Mill on your behalf." They approve. Pindraft issues an authorization code and redirects back to:

```
https://hirsel.app/oauth/callback?code=<AUTH_CODE>&state=<RANDOM_STATE>
```

If they deny, Pindraft redirects back with `?error=access_denied&state=<RANDOM_STATE>`. Treat this as a normal user action, not an error condition.

### Step 3: Exchange the code for tokens

Hirsel's `/oauth/callback` endpoint receives the redirect. It looks up the verifier by `state` (and verifies state matches what was sent), then exchanges the code:

```bash
curl -X POST https://api.pindraft.co/api/v1/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=<AUTH_CODE>" \
  -d "redirect_uri=https://hirsel.app/oauth/callback" \
  -d "client_id=<HIRSEL_CLIENT_ID>" \
  -d "client_secret=<HIRSEL_CLIENT_SECRET>" \
  -d "code_verifier=<PKCE_VERIFIER>"
```

Successful response (200):

```json
{
  "access_token": "oat_dGhpcy1pcy1ub3QtYS1yZWFsLXRva2Vu...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "ort_dGhpcy1pcy1ub3QtYS1yZWFsLXJlZnJlc2g...",
  "scope": "mill:7f2a-...:interop"
}
```

Store both tokens, keyed by the `(shepherd, mill)` pair. Note their lifetimes:

- `access_token` — 1 hour. Used as `Authorization: Bearer <token>` on every interop call.
- `refresh_token` — 90 days. Single-use; using it returns a new pair.

Error response (400):

```json
{
  "error": "invalid_grant",
  "error_description": "PKCE verification failed"
}
```

Error codes follow RFC 6749 §5.2: `invalid_request`, `invalid_client`, `invalid_grant`, `unauthorized_client`, `unsupported_grant_type`, `invalid_scope`.

### Step 4: Refresh tokens before they expire

When the access token nears expiry (Hirsel checks `expires_in` on issuance), it refreshes:

```bash
curl -X POST https://api.pindraft.co/api/v1/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "refresh_token=<OLD_REFRESH_TOKEN>" \
  -d "client_id=<HIRSEL_CLIENT_ID>" \
  -d "client_secret=<HIRSEL_CLIENT_SECRET>"
```

The response shape is identical to the initial exchange — a fresh pair. **Critically: the refresh token is single-use.** Using it invalidates it; the response includes a brand-new refresh token. Save the new pair atomically and discard the old refresh token.

**Refresh token reuse triggers chain revocation.** If Hirsel uses a refresh token twice (because a retry didn't realize it succeeded, or because two replicas of Hirsel each tried to refresh independently), Pindraft revokes the entire rotation chain and returns `invalid_grant`. The shepherd has to re-authenticate. This is intentional: a reused refresh token is the canonical signal of compromise, and Pindraft can't tell legitimate retries from attacker replays.

Practical implication: serialize refresh attempts per `(shepherd, mill)` pair. A simple mutex/lock is sufficient. Don't refresh in parallel from multiple processes.

### Step 5: Revocation (optional but recommended on logout)

When the shepherd revokes the grant from Hirsel's side, or unlinks the mill:

```bash
curl -X POST https://api.pindraft.co/api/v1/oauth/revoke \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=<REFRESH_TOKEN>" \
  -d "token_type_hint=refresh_token" \
  -d "client_id=<HIRSEL_CLIENT_ID>" \
  -d "client_secret=<HIRSEL_CLIENT_SECRET>"
```

Returns 200 regardless of whether the token existed (RFC 7009 §2.2). Revoke the refresh token; the access token will expire naturally within an hour.

## Pushing shipment manifests

This is the main reason Hirsel calls Pindraft. When a shepherd creates a shipment to the mill in Hirsel, Hirsel POSTs a manifest to:

```
POST https://api.pindraft.co/api/v1/interop/v1/shipments
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

Body:

```json
{
  "externalShipmentId": "hirsel-ship-20260512-001",
  "expectedArrivalDate": "2026-05-15",
  "shepherd": {
    "externalCustomerId": "hirsel-shepherd-42",
    "displayName": "Bramble Farm"
  },
  "fleeces": [
    {
      "externalFleeceId": "hirsel-fleece-001",
      "estimatedGreaseWeightKg": 3.8,
      "breedCode": "ROMNEY",
      "sourceAnimalName": "Maple"
    },
    {
      "externalFleeceId": "hirsel-fleece-002",
      "estimatedGreaseWeightKg": 4.1,
      "breedCode": "ROMNEY",
      "sourceAnimalName": "Birch"
    }
  ]
}
```

Successful response (201):

```json
{
  "shipmentId": "f3a8c1d2-...",
  "externalShipmentId": "hirsel-ship-20260512-001",
  "status": "PENDING"
}
```

`shipmentId` is Pindraft's reservation UUID. Store it alongside Hirsel's shipment record; you'll see it in webhook payloads later.

### Idempotency

The endpoint is idempotent on `externalShipmentId`. POSTing the same manifest twice returns the existing reservation with the same `shipmentId` — no duplicate. Hirsel can retry network failures freely.

`externalShipmentId` should be globally unique within Hirsel's namespace. A combination of timestamp + Hirsel shipment row ID is fine.

### Customer resolution

The mill doesn't necessarily know who the shepherd is yet. Pindraft resolves the shepherd's `tenant_customers` row by `(tenant_id, external_source='hirsel', external_user_id=shepherd.externalCustomerId)`. If no match exists, Pindraft auto-creates a "walk-in" customer record with the supplied display name, tagged with the external identity.

This means the first shipment from a brand-new shepherd is silently fine. The mill admin can later edit the customer record (assign pricing, attach an email, etc.) but doesn't have to do anything to receive the shipment.

### When things go wrong

| Status | Error code (in body)        | Meaning                                                               |
|--------|------------------------------|----------------------------------------------------------------------|
| 400    | `invalid_manifest`           | The manifest didn't parse or missed a required field. Don't retry.    |
| 401    | (Bearer auth failure)        | Token invalid or expired. Refresh and retry once.                     |
| 403    | (auth scope mismatch)        | Token scope doesn't match the mill's tenant. Token is wrong; re-auth. |
| 500    | (internal)                   | Server fault. Retry with exponential backoff.                         |

The `application/problem+json` body follows RFC 7807 with a Pindraft-specific `code` extension.

## Receiving webhooks from Pindraft

Pindraft pushes events back to Hirsel as the lot progresses. To receive them, Hirsel registers a webhook subscription per mill it works with.

### Registering a subscription

A mill admin registers the subscription on Hirsel's behalf via the ops-console, or Hirsel-side automation calls the admin endpoint (which requires a mill admin's JWT, not Hirsel's OAuth token):

```
POST https://api.pindraft.co/api/v1/tenants/{tenant_id}/webhook-subscriptions
```

Body:

```json
{
  "eventType": "lot.stage_transition",
  "deliveryUrl": "https://hirsel.app/webhooks/pindraft/lot-stage"
}
```

Response (201) includes a one-time-readable signing secret:

```json
{
  "subscription": { "id": "...", "eventType": "lot.stage_transition", "deliveryUrl": "...", "active": true, "createdAt": "..." },
  "signingSecret": "Iv-K7Q3xy9w...Tu82mP4q"
}
```

**Store `signingSecret` immediately.** It's never returned again. Hirsel needs it to verify the HMAC signature on incoming webhooks. Lost it? Delete the subscription and recreate.

Subscribe to whichever event types Hirsel cares about. The six currently fired:

| Event type                     | When it fires                                                          |
|--------------------------------|------------------------------------------------------------------------|
| `shipment.received_at_mill`    | Fiber arrived; reservation became a lot.                              |
| `lot.stage_transition`         | Lot advanced to next workflow stage (e.g. WASH → CARD).                |
| `pool.contribution_recorded`   | A shepherd contributed fiber to a wool pool.                          |
| `pool.settled`                 | A pool was distributed with revenue.                                  |
| `listing.published`            | A marketplace listing went live.                                      |
| `listing.sold`                 | A marketplace listing was marked sold.                                |

### Webhook payload shape

Every webhook delivery is a POST with:

**Headers:**

```
Content-Type: application/json
X-Pindraft-Event-Type: lot.stage_transition
X-Pindraft-Event-Id: 6f4a8c20-...
X-Pindraft-Signature: sha256=4f9e2c8a31b...
```

**Body:**

```json
{
  "event_type": "lot.stage_transition",
  "occurred_at": "2026-05-15T14:23:08Z",
  "tenant_id": "7f2a-4b1e-...",
  "subject": {
    "lot_id": "...",
    "from_stage_type": "WASH",
    "to_stage_type": "CARD",
    "weight_out_kg": 38.4
  }
}
```

### Verifying the HMAC signature

The `X-Pindraft-Signature` header is `sha256=` followed by the hex-encoded HMAC-SHA256 of the request body using your signing secret. Verify it with a constant-time compare:

```java
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.security.MessageDigest;

public class WebhookSignatureVerifier {

    public static boolean verify(String rawBody, String signatureHeader, String signingSecret) {
        if (!signatureHeader.startsWith("sha256=")) return false;
        var supplied = signatureHeader.substring("sha256=".length());

        String computed;
        try {
            var mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(signingSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            computed = HexFormat.of().formatHex(mac.doFinal(rawBody.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            return false;
        }

        // Constant-time compare via MessageDigest.isEqual
        return MessageDigest.isEqual(
            computed.getBytes(StandardCharsets.UTF_8),
            supplied.getBytes(StandardCharsets.UTF_8));
    }
}
```

A few important details:

- **Compute HMAC on the raw body bytes, not on a re-serialized object.** If Hirsel's framework deserializes the body before the verification handler runs, capture the raw bytes first.
- **Use a constant-time comparison.** `Arrays.equals` or `String.equals` leaks timing information. `MessageDigest.isEqual` is the standard JDK helper for this.
- **Reject anything that doesn't verify.** Return 401. Don't try to process malformed or unsigned events even if the body looks plausible.

### Deduplication

`X-Pindraft-Event-Id` is the dedup key. Pindraft retries failed deliveries with exponential backoff (30s, 1m, 2m, 4m, 8m, then FAILED after 5 attempts). A successful delivery that timed out before sending an HTTP response will be retried, and Hirsel will see the same `event_id` twice. Track recent event IDs (a sliding window of a day or two is plenty) and treat repeats as no-ops.

### Acknowledging

Return `200` to acknowledge. Any non-2xx response causes Pindraft to retry. Hirsel's handler should be fast and idempotent — do the minimum needed to durably remember the event, then respond. Heavy processing happens out-of-band.

## Local development

Pindraft runs locally at `http://localhost:8080` with three frontends at `4200`, `4201`, `4202`. Hirsel's OAuth callback in local dev needs to point at Hirsel's local URL (e.g. `http://localhost:8081/oauth/callback`).

Steps to test the full flow against local Pindraft:

1. **Bring up local Pindraft.**

   ```bash
   cd pindraft
   docker compose up -d           # local Postgres
   cd backend && ./gradlew :application:bootRun &
   cd frontend && npx nx serve customer-portal &
   ```

2. **Create a Pindraft user and tenant.** Use the bootstrap endpoint or seed the DB manually.

3. **Register Hirsel as an OAuth client.** Either via the ops-console UI or directly:

   ```bash
   curl -X POST http://localhost:8080/api/v1/tenants/<TENANT_ID>/oauth-clients \
     -H "Authorization: Bearer <MILL_ADMIN_JWT>" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Hirsel local",
       "redirectUris": ["http://localhost:8081/oauth/callback"],
       "pkceRequired": true
     }'
   ```

   Save the `clientId` and `clientSecret` from the response.

4. **From Hirsel, initiate the auth flow.** Redirect to `http://localhost:8080/api/v1/oauth/authorize?...`. Pindraft will redirect to `http://localhost:4201/oauth/consent?...`. Sign in as the shepherd, approve, get redirected to Hirsel's callback with the code.

5. **Exchange the code and start calling interop endpoints.**

Tip: Pindraft serves the live OpenAPI spec at `http://localhost:8080/v3/api-docs` and Swagger UI at `http://localhost:8080/swagger-ui.html`. Use Swagger UI to poke at endpoints by hand while developing.

## Error handling cheatsheet

What to do when various failures hit:

| Failure                                | What to do                                                                |
|----------------------------------------|---------------------------------------------------------------------------|
| Auth code exchange returns 400         | The code is consumed or expired. Restart the OAuth flow from /authorize.  |
| `invalid_grant` on refresh             | Refresh chain was revoked (reuse detected) or token expired. Re-auth.     |
| 401 on interop call                    | Access token expired. Refresh once, retry. If 401 again, re-auth.         |
| 423 on shipment POST                   | Mill paused intake. Backoff and retry later; surface to shepherd.         |
| Webhook signature mismatch             | Don't process. Return 401. Investigate — likely a wrong signing secret.   |
| Webhook event_id seen before           | No-op; return 200 to acknowledge.                                         |
| Network timeout on shipment POST       | Retry with the same `externalShipmentId`. Idempotent.                     |

## Reference: endpoints Hirsel calls

| Method | Path                                              | Auth                         | Purpose                                  |
|--------|---------------------------------------------------|------------------------------|------------------------------------------|
| GET    | `/api/v1/oauth/authorize`                         | None (redirect entry)        | Start the consent flow                   |
| POST   | `/api/v1/oauth/token`                             | client_id + client_secret    | Exchange code or refresh                 |
| POST   | `/api/v1/oauth/revoke`                            | client_id + client_secret    | Revoke a token                           |
| GET    | `/.well-known/jwks.json`                          | None                         | Fetch RSA public keys                    |
| POST   | `/api/v1/interop/v1/shipments`                    | Bearer access token          | Submit a shipment manifest               |

## Reference: webhooks Hirsel may receive

Each webhook is a POST to a URL Hirsel registered, with `X-Pindraft-Signature`, `X-Pindraft-Event-Type`, and `X-Pindraft-Event-Id` headers. The body follows the `WebhookEnvelope` schema in [`hirsel-interop-spec.yaml`](hirsel-interop-spec.yaml).

| Event type                     | Subject contains                                                                   |
|--------------------------------|------------------------------------------------------------------------------------|
| `shipment.received_at_mill`    | `lot_id`, `customer_id`, `intake_weight_kg`                                       |
| `lot.stage_transition`         | `lot_id`, `from_stage_type`, `to_stage_type`, `weight_out_kg`                     |
| `pool.contribution_recorded`   | `pool_id`, `contribution_id`, `customer_id`, `customer_display_name`, `weight_kg` |
| `pool.settled`                 | `pool_id`, `total_revenue`, `contributor_count`                                    |
| `listing.published`            | `listing_id`, `kind`, `title`, `price_per_kg`, `quantity_kg`, `trace_slug`         |
| `listing.sold`                 | `listing_id`, `price_per_kg`, `quantity_kg`                                        |

## What's deliberately not in v2 of this contract

The early version of the spec had several event types and request fields that haven't been implemented yet. They're not in the current contract; Hirsel shouldn't expect them:

- `shipment.received` (only `shipment.received_at_mill` fires; received is the same moment as becoming a lot)
- `lot.test_recorded`, `lot.completed`, `lot.shipped`
- `settlement.recorded` (replaced by `pool.settled`)
- `ProcessingRequest` block on shipment manifests (the mill operator enters processing requirements directly in the ops-console for now)
- `Animal` block with birth date, sex, registry (only breed code + name today)
- `micron_history` array on fleeces (not yet captured)

When these become real, the contract version will bump and this doc will update. Hirsel can subscribe defensively (ignore unknown event types) and forward-compatibility will hold.

## Questions and edge cases

**Q: What if a shepherd has multiple shepherds-of-record at the mill, or one shepherd account that buys for several farms?**

The shipment manifest carries one `externalCustomerId` per submission. If a Hirsel user maps to multiple Pindraft customer records, Hirsel decides which one to attribute the shipment to. Pindraft has no opinion.

**Q: Can Hirsel ship to multiple mills in one manifest?**

No. Each manifest goes to one mill (the access token's scope is `mill:{tenant_id}:interop`, single mill). Multi-mill shipping is a Hirsel-side aggregation if it makes sense for users.

**Q: How does Hirsel know which mill the shepherd is shipping to?**

Hirsel asks the shepherd. The set of mills Hirsel offers is whichever ones the shepherd has completed an OAuth grant for — i.e. wherever the shepherd has tokens stored in Hirsel.

**Q: What if the mill admin revokes Hirsel's OAuth client globally?**

All access tokens issued under that client become invalid; Hirsel gets 401s. The mill admin would presumably contact Hirsel to negotiate; Hirsel surfaces the disconnection to affected shepherds.

**Q: How do we test webhook retries?**

Locally, have Hirsel's webhook handler return 500 for the first few calls. Pindraft will retry on the schedule above. The `webhook_deliveries` table in Pindraft's DB shows the retry state directly if you want to inspect.

**Q: Schema versioning when the contract changes?**

The interop path itself carries the contract version (`/api/v1/interop/v1/...`). When breaking changes happen, a new path appears (e.g. `/api/v1/interop/v2/...`) and the old version is maintained for a deprecation window. Webhook payloads include `event_type`; new event types are additive (don't break existing handlers).
