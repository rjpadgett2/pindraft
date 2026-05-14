---
name: Frontend design pass deferred
description: Acknowledged design/styling work to revisit after feature build-out
type: project
---

User flagged that the existing frontends have inconsistent, ad-hoc styling and asked to revisit design later (not now). All feature work I've shipped uses Material component defaults with per-component inline styles (`<style>` blocks each with their own color literals and spacing values). The `libs/ui` library exists but is barely used.

**Why:** Speed of feature shipping was the priority — designs would slow each component build. The shape is intentionally functional, not polished. The user is aware and explicitly deferred.

**How to apply:** When a focused design-system project is greenlit, the scope is roughly:
- Establish design tokens (color palette, spacing scale, type scale) in `libs/ui`
- Build shared primitives: `PageHeader`, `PageTitle`, `StatusChip`, `EmptyState`, `MoneyDisplay`, `KeyValueGrid`
- Replace per-component inline style blocks (every `lot-detail`, `invoices-list`, etc.) to use those primitives + tokens
- Most-impactful surfaces to redo first: ops-console `/ops/lots/:id` (most actions concentrated), customer-portal `/lots/:id` (highest shepherd-facing visibility), `/billing/invoices/:id` (money-facing)
- Don't touch behavior, only presentation — TypeScript controllers stay as-is

This is ~1–2 days of focused UX work and is best done with screenshots of the working flows in hand. Until then, don't pile more inline-style work into existing components unless functionally necessary.
