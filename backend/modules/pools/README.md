# pools — wool pool formation and proportional distribution

The inverse of customer-access. Where mill-ops/customer-portal flows have one customer per lot, pools have many customers contributing to a shared lot, with revenue from sales distributed proportionally back to contributors.

## Domain

| Entity | Purpose |
|---|---|
| `PoolEntity` | A named pool (e.g. "Spring 2026 fine-wool collective"). Status transitions ACCEPTING → CLOSED → DISTRIBUTED. |
| `PoolContributionEntity` | One customer's contribution. Captures the customer's display name denormalized at contribution time. |

## Share calculation

When a pool is settled with revenue, each contributor's share is computed at read time from contribution weight as a percent of total pool weight, multiplied by revenue. No money movement — Pindraft surfaces what's owed; payment rails are out of scope for v1.

## What's still ahead

- Pool → lot linkage (when a pool's fiber is intaked, attach lot to pool).
- Cost line items (mill fees, scour shrinkage, etc.) that reduce distributable revenue.
- Customer-portal view of pools the customer participates in.
- Webhook events: `pool.contribution_recorded`, `pool.settled`, `settlement.recorded`.
