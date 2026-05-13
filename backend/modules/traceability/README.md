# traceability — trace records and segments

The provenance backbone. Every lot accrues a trace record (one per lot, created at intake) with a chain of trace segments (one per stage). When the shepherd opts in, the trace record's slug becomes a public URL anyone can visit to see the lot's journey.

## What's in the scaffold

| Entity            | Scope             | Purpose                                                       |
|-------------------|-------------------|---------------------------------------------------------------|
| `trace_records`   | PLATFORM_SHARED   | One per lot. Slug, visibility flag, customer display name.    |
| `trace_segments`  | PLATFORM_SHARED   | One per stage entered. Open segments have `exited_at == null`.|

## Cross-module integration

This module **publishes** [`TraceEmitter`](src/main/java/co/pindraft/traceability/TraceEmitter.java) — a single-purpose interface other modules call to record events. `mill-ops` consumes it from inside its existing transactions:

- `LotService.intake` → `emitIntake(...)` creates the trace record (with a fresh slug, visibility off by default) and the first INTAKE segment.
- `LotService.transitionToNextStage` → `emitStageTransition(...)` closes the current open segment and opens a new one for the destination stage.

This is the canonical Spring Modulith pattern for emission — same shape as billing's `PricingArrangementLookup`. The emitter does not depend on mill-ops; mill-ops depends on traceability.

## API surface

| Endpoint                                       | Auth        | Purpose                                |
|------------------------------------------------|-------------|----------------------------------------|
| `GET /api/v1/public/trace/{slug}`              | none        | Public lookup. 404s if not visible.    |
| `GET /api/v1/me/traces/{lotId}`                | customer    | Get trace metadata for owned lot       |
| `PATCH /api/v1/me/traces/{lotId}/visibility`   | customer    | Toggle public visibility               |

## What still needs building

- Fleece details in the public view (currently lot-level only).
- Public packaging of trace data into a customer-friendly format with mill name, dates, weights formatted in the operator's chosen unit.
- QR code generation for slugs (the printed-tag use case).
- Trace embedding in marketplace listings.
