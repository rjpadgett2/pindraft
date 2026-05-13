# shearer — independent professional shearing events

Distinct from every other module: shearers don't belong to any tenant. They have a Pindraft user account and log events about animals they shear, on whatever farms they visit. The events are theirs alone — read by the shearer only, optionally pushed to Hirsel later for the shepherd's animal records.

## What this enables

- Shearer keeps a history of every animal they've shorn, with weights and notes.
- Shearer-PWA's IndexedDB outbox can durably queue events while offline and sync them later.
- Future iteration: events flow to Hirsel via webhook, populating the shepherd's animal performance records.

## What's not here yet

- Animal lookup against Hirsel (currently shearer types animal name as free text).
- Aggregate views — "every fleece weight from this flock over time", etc.
- Equipment tracking (clippers, combs, cutters).
- Multi-farm sessions.
