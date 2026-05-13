# shearer-pwa

Offline-first PWA for independent shearers logging events on-farm. The only client surface in the Pindraft system that's expected to run reliably without network for hours at a time.

## What works

- Login at `/login` against the same `/api/v1/auth/login` endpoint as other clients.
- Events list at `/events` showing today's + history, with pending vs synced indicators.
- Log a new event at `/events/new` — saves to IndexedDB first, navigates immediately, syncs in the background.
- Online/offline indicator in the toolbar with pending-count badge.
- Service worker (`sw.js`) caches the app shell so the PWA boots even with no network.

## The offline architecture

Two independent layers:

1. **Service worker** handles HTTP-level network failures. Cache-first for static assets so the app shell boots offline; network-first for API calls (let them fail rather than serve stale data).
2. **OfflineQueueService** handles application-level durability via IndexedDB. Every event submission writes to the outbox first with status `pending`, then the SyncService opportunistically POSTs them and marks them `synced`.

This separation matters: the SW handles transport, the queue handles semantics. A failed API call falls through to the application code, which decides what to do (here: keep retrying via the queue).

## Sync semantics

- **Client local ID**: every event gets a stable `localId` (e.g. `loc_1715628523_abc12def`) generated at write time.
- **Server-side idempotency**: the backend dedupes on `(shearer_user_id, client_local_id)` via a unique index. A second POST with the same local ID returns the existing row.
- **Retry safety**: if the sync HTTP call times out after the server has already processed it, the next retry finds the existing row and is a no-op.

## What's still ahead

- Animal autocomplete against Hirsel (currently free text).
- Multi-farm sessions to group events by visit.
- Equipment/cutter tracking.
- Bluetooth scale integration to capture weights automatically.
- Background sync via the Periodic Background Sync API (currently sync only runs when the app is open or focused).
