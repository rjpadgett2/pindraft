# billing — pricing templates, invoicing, settlements

Owns the money math.

## What's in the scaffold

| Entity                  | Scope          | Purpose                                        |
|-------------------------|----------------|------------------------------------------------|
| `pricing_arrangements`  | TENANT_SCOPED  | A tenant's pricing template library ✅          |

Pricing arrangements use a discriminated-union design — one of four `kind` values, with the `config` JSONB column shape varying per kind:

- **`PER_POUND`** — flat per-kilogram price. Config: `{ pricePerKg: number }`.
- **`TIERED_BY_GRADE`** — tiered by micron grade. Config: `{ tiers: [{ maxMicron, pricePerKg }] }`.
- **`HYBRID`** — flat fee plus per-kilogram. Config: `{ flatFee, pricePerKg }`.
- **`REVENUE_SPLIT`** — mill/brand percentage split. Config: `{ millPercent, brandPercent }`.

When a reservation is created, the chosen template's full structure is **snapshotted onto the lot** so later changes to the template don't affect in-flight work. (Snapshot mechanism is in mill-ops; this module owns the templates themselves.)

## API surface

| Endpoint                                              | Purpose                       |
|-------------------------------------------------------|-------------------------------|
| `GET    /api/v1/tenants/{id}/pricing-templates`       | List active templates         |
| `POST   /api/v1/tenants/{id}/pricing-templates`       | Create template               |
| `PATCH  /api/v1/tenants/{id}/pricing-templates/{id}`  | Rename / edit config          |
| `DELETE /api/v1/tenants/{id}/pricing-templates/{id}`  | Soft-delete (preserves audit) |

## What still needs building

- Invoicing — generate invoices from completed lots using snapshotted pricing.
- Settlements — handle `REVENUE_SPLIT` and wool-pool distributions.
- Payment integration (Stripe Connect for direct mill payouts).
- Reporting (mill revenue by service, by customer, by grade).
