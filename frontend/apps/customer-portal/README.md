# customer-portal

Shepherd's-eye view of fiber across every mill the shepherd transacts with. The cross-tenant counterpart to the operator-facing ops-console.

## What works

- Login at `/login` against `/api/v1/auth/login` — same auth as ops-console.
- My fiber dashboard at `/lots` showing all lots across all mills the user is a customer at, grouped by tenant.
- Lot detail at `/lots/:id` with stage timeline and fleeces.

## What's still to build

- Trace records and provenance display (waits on traceability module).
- Mill-specific workflow-stage names in the timeline (currently shows stage IDs).
- Marketplace listing creation for finished products.
- Wool-pool participation views.
- Profile editing.
- Reservation creation (lets shepherds book slots from this side, complementing Hirsel-pushed reservations).

## How the cross-tenant pattern works

The backend has `/api/v1/me/lots` and `/api/v1/me/lots/{id}` (distinct from `/api/v1/tenants/{tid}/lots` which is staff-scoped). These find the current user's `tenant_customers` records — one per mill they work with — and then query lots whose `customer_id` is in that set. No tenant is named in the URL because the query naturally spans them all.

This exercises the customer-access mode of `TenantAccessGuard` (well, conceptually — the implementation here is even simpler since the user_id-keyed filter is implicit).
