# ui — shared presentational components and design tokens

Presentational (dumb) components used across all three apps. No business logic, no API calls.

## What lives here

- Design tokens (color palette, spacing scale, typography ramp).
- Layout primitives (card, page-header, breadcrumb).
- Common patterns (status-badge, progress-bar, empty-state).

## What does not live here

- Feature components (those live in the app under `features/`).
- Smart components that fetch data.
- Anything that needs auth or tenant context.
