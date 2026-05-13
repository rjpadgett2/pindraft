# mill-ops — lots, batches, stages, equipment

The heart of the operator surface. Onboarding-facing endpoints functional; lot lifecycle still to build.

## What this module owns

| Entity                       | Scope             | Purpose                                          |
|------------------------------|-------------------|--------------------------------------------------|
| `processing_stage_types`     | PLATFORM_SHARED   | Canonical stage taxonomy (INTAKE, SCOUR, …)      |
| `equipment_types`            | PLATFORM_SHARED   | Canonical equipment taxonomy                     |
| `workflow_stages`            | TENANT_SCOPED     | A tenant's ordered stage configuration ✅         |
| `equipment`                  | TENANT_SCOPED     | A tenant's equipment inventory ✅                 |
| `pricing_arrangements`       | TENANT_SCOPED     | A tenant's pricing template library              |
| `lot_reservations`           | TENANT_SCOPED     | Pre-shipment slot bookings                       |
| `lots`                       | TENANT_SCOPED     | Fiber lots being processed                       |
| `lot_specifications`         | TENANT_SCOPED     | Spec attached to each lot                        |
| `lot_stage_events`           | TENANT_SCOPED     | Journal of stage transitions per lot             |
| `lot_lineage_links`          | TENANT_SCOPED     | Split/merge DAG between lots                     |
| `equipment_runs`             | TENANT_SCOPED     | A batched processing session                     |
| `equipment_run_lots`         | TENANT_SCOPED     | Many-to-many between runs and lots               |
| `intake_fleeces`             | TENANT_SCOPED     | Fleece records attached to lots at intake        |
| `scan_events`                | TENANT_SCOPED     | Every QR scan                                    |
| `fiber_tests`                | TENANT_SCOPED     | Micron / staple / comfort test results           |
| `wool_pools`                 | TENANT_SCOPED     | Pool record administered by a single mill        |
| `wool_pool_contributions`    | TENANT_SCOPED     | Shepherd contributions to a pool                 |

(✅ = entity + repository + service + REST controller fully wired up.)

## API surface

| Endpoint                                                  | Purpose                          |
|-----------------------------------------------------------|----------------------------------|
| `GET    /api/v1/tenants/{id}/setup-status`                | Onboarding hub state             |
| `POST   /api/v1/tenants/{id}/go-live`                     | SETUP → LIVE transition          |
| `GET    /api/v1/tenants/{id}/workflow-stages`             | List stages                      |
| `POST   /api/v1/tenants/{id}/workflow-stages`             | Add stage                        |
| `PATCH  /api/v1/tenants/{id}/workflow-stages/{stageId}`   | Rename stage                     |
| `DELETE /api/v1/tenants/{id}/workflow-stages/{stageId}`   | Remove stage                     |
| `POST   /api/v1/tenants/{id}/workflow-stages/reorder`     | Reorder stages                   |
| `GET    /api/v1/tenants/{id}/equipment`                   | List equipment                   |
| `POST   /api/v1/tenants/{id}/equipment`                   | Add equipment                    |
| `DELETE /api/v1/tenants/{id}/equipment/{id}`              | Deactivate equipment             |
| `GET    /api/v1/processing-stage-types`                   | Reference taxonomy               |
| `GET    /api/v1/equipment-types`                          | Reference taxonomy               |

## What still needs building

In priority order, from the spec's "Open items":

1. **Pricing-template configuration** — backend entity + service + controller, frontend screen.
2. **Mill profile editing** — PATCH on `/tenants/{id}` for name, default unit, time zone.
3. **Lot lifecycle endpoints** — reservation booking, intake, stage transitions, queue dashboard.
4. **Equipment-run batching logic** — for the floor-batching pattern.
5. **Wool pool formation and distribution.**
6. **Queue and changeover optimizer.**
7. **Fiber test attachment.**
8. **Trace segment emission** — writes to `traceability` module.

## Cross-module integration

- Reads from `identity` (TenantContextHolder, TenantRepository).
- Will emit events to `traceability`, `billing`, `interop` (webhooks to Hirsel) at lot lifecycle moments.
