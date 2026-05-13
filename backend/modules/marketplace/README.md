# marketplace — Marketplace

**Status:** stub. Not yet implemented.

Fleece marketplace, mill directory, public surfaces.

## What to build first

See `docs/Pindraft_Spec.md` for the canonical design of this module. The recommended build order is in `Open items / next moves` at the bottom of that document.

## Conventions

When implementing:

1. Add `co.pindraft.marketplace` package with:
   - `api/` — REST controllers, DTOs
   - `application/` — services
   - `domain/` — entities
   - `infrastructure/` — repositories
   - `package-info.java` with `@ApplicationModule` declaration
2. Add Flyway migrations under `src/main/resources/db/migration/`.
3. Update this README to describe what the module owns.
4. Add the module's tests under `src/test/java/`.
