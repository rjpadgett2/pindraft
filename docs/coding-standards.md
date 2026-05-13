# Coding standards

The rules below are tight on purpose. Keeping files small and patterns consistent makes the codebase navigable as it grows from one developer to many.

## File size

- **Components**: 200 lines is a soft ceiling. If a component approaches 200 lines, extract child components or services.
- **Services**: 300 lines is a soft ceiling. If a service grows past this, it's doing too much; split by domain concern.
- **Controllers (Spring)**: 150 lines per controller. One controller per resource.
- **No "kitchen sink" files**: don't dump multiple unrelated classes into one file just because they're related conceptually. Each class lives in its own file, with the file named after the class.

## Backend (Java)

- **Package by feature, then by layer**: `co.pindraft.<module>.<feature>.api / application / domain / infrastructure`.
- **Entities live in `domain/`** — pure JPA entities, no Spring annotations beyond `@Entity` and column mappings.
- **Services live in `application/`** — Spring `@Service` beans, orchestrating domain logic.
- **Controllers live in `api/`** — REST adapters; thin, never contain business logic.
- **Repositories live in `infrastructure/`** — Spring Data JPA interfaces.
- **Null handling**: use JSpecify `@Nullable` and `@NonNull` annotations (default to non-null). Spring Boot 4.0 ships with JSpecify and NullAway checks.
- **Constructor injection only** — no field `@Autowired`.
- **DTOs are records** — Java records for API request/response types, never entities directly across the wire.
- **Validation** — Bean Validation 3.1 annotations on DTOs (`@NotNull`, `@Size`, `@Email`, etc.).

## Frontend (Angular 21)

- **Standalone components only** — modules (`NgModule`) are dead in Angular 21 default templates.
- **Signals over RxJS where possible** — `signal()`, `computed()`, `effect()` for component state. Keep RxJS for HTTP and event streams.
- **Zoneless by default** — Angular 21 ships zoneless as default for new apps; don't import `zone.js`.
- **Inject function, not constructor params** — `private foo = inject(FooService);`. Easier to refactor.
- **One feature, one folder** — `features/<feature>/` contains the feature's components, services, types.
- **Smart vs presentational** — feature folders own smart components (data fetching, state); reusable presentational components live in `libs/ui`.
- **Don't construct `HttpClient` calls directly** — always go through `@pindraft/api-client` generated services. Exceptions need a code comment explaining why.
- **Forms**: prefer Signal Forms for new work (Angular 21 introduced these — still experimental but stable enough for new code). Use reactive forms (FormBuilder) where Signal Forms don't yet fit.
- **CSS**: component-scoped styles via the `.scss` file alongside each component. Global styles only for design tokens.

## Naming

- **Java classes**: PascalCase, suffix by role (`AuthController`, `TenantService`, `UserRepository`, `IntakeFleeceEntity`).
- **TypeScript classes**: PascalCase, suffix optional but consistent (`AuthService`, `TenantContext`, `OnboardingHubComponent`).
- **Files**: kebab-case for frontend (`onboarding-hub.component.ts`), match-the-class for backend (`AuthController.java`).
- **Database tables**: snake_case plural (`workflow_stages`, `lot_stage_events`).
- **Database columns**: snake_case (`created_at`, `tenant_id`).
- **API endpoints**: kebab-case plural (`/api/v1/workflow-stages`).

## Commits and branches

- Branch per change, descriptive name (`feat/onboarding-hub`, `fix/jwt-refresh-race`).
- Conventional Commits format for messages — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- One concern per PR. Cross-cutting changes (e.g., adding an endpoint that needs frontend + backend + migration) belong in one PR because they're inseparable.

## Tests

- **Backend**: every controller has at least a happy-path slice test (`@WebMvcTest`). Every service with meaningful logic has unit tests. Integration tests against a Testcontainers Postgres in `*IT.java` files.
- **Frontend**: every component with non-trivial logic has a Vitest component test. Don't test framework behavior — test your code.
- **Don't test getters/setters or DTOs**.

## Error handling

- **Backend**: throw domain exceptions (`TenantNotFoundException`, `InvalidStageTransitionException`), let the global `ProblemDetailHandler` map them to RFC 7807 problem-details responses. Never `catch (Exception e)` and swallow.
- **Frontend**: HTTP errors flow through a global interceptor that maps to a toast for user-visible errors and a console.error for unexpected ones.

## Documentation

- Every backend module has a `README.md` at its root explaining what it owns, what its API surface is, and what depends on it.
- Every frontend app/lib has a `README.md` with the same structure.
- The repo-level spec (`docs/Pindraft_Spec.md`) is the source of truth for product and architecture decisions. When implementation diverges, update the spec.
