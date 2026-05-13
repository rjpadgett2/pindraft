# api-client — shared TypeScript types and services for the Pindraft frontends

Three apps consume this library: `ops-console`, `customer-portal`, `shearer-pwa`. They import `@pindraft/api-client` for type definitions and Angular services that wrap the backend's HTTP API.

## Current state

The library is **hand-maintained**. Types live in `src/lib/types.ts`. Service classes live alongside them. This has worked through 22 iterations of evolving APIs because it's fast to update and the surface is small enough to track manually.

## Switching to generated code

The Spring Boot application emits an OpenAPI 3.1 spec via springdoc. Generating TypeScript from it is one Gradle task away.

```bash
# Terminal 1: run the backend
./gradlew :application:bootRun

# Terminal 2: regenerate
./gradlew :application:generateApiClient
```

The output lands in `frontend/libs/api-client/generated/`. Update `src/index.ts` to re-export from `./generated` instead of `./lib`, and apps will pick up the generated services automatically.

## When to switch

The hand-maintained version is fine while:

- The API surface is changing fast and you'd be regenerating constantly.
- You need fine-grained control over what the frontend sees (e.g. omitting fields not yet wired through).
- The hand-typed types are catching mismatches that generated types would silently accept.

The generated version is better when:

- The API is stable and breakage from drift is the bigger risk.
- You want enums and discriminated unions enforced from the source of truth.
- Multiple frontends depend on the same client and updating them all by hand becomes a chore.

## Generator output structure

```
generated/
├── api/                  # one service per @Tag in the controllers
│   ├── operations.service.ts
│   ├── customer.service.ts
│   ├── public.service.ts
│   └── ...
├── model/                # one type per @Schema reference
│   ├── lot.ts
│   ├── reservation.ts
│   └── ...
├── configuration.ts      # base URL, auth, override hooks
└── index.ts              # public exports
```

## Keeping the hand-maintained version

You can keep `lib/` and `generated/` side by side. Apps that want generated services can import from `@pindraft/api-client/generated`; others use the default `@pindraft/api-client` export. The two need to stay roughly in sync, which is the next step's first chore.
