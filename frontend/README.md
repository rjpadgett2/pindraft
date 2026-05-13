# Frontend — Pindraft Nx workspace

Nx 21 workspace with three Angular 21 applications and four shared libraries.

## Layout

```
frontend/
├── apps/
│   ├── ops-console/           — mill operator UI (FUNCTIONAL: login + onboarding hub)
│   ├── customer-portal/       — shepherd + designer UI (stub)
│   └── shearer-pwa/           — shearer field tool (stub)
└── libs/
    ├── api-client/            — generated TypeScript API client
    ├── auth/                  — JWT interceptor, route guards, auth service
    ├── ui/                    — shared components and design tokens
    └── domain/                — shared TypeScript types
```

## Stack

| Concern        | Choice                                       |
|----------------|----------------------------------------------|
| Framework      | Angular 21.2 (zoneless default, standalone)  |
| State          | Signals (`signal`, `computed`, `effect`)     |
| HTTP           | `HttpClient` via generated services only     |
| Forms          | Reactive forms; Signal Forms for new work    |
| UI library     | Angular Material 21                          |
| Test runner    | Vitest (Angular 21 default)                  |
| Workspace      | Nx 21                                        |

## First-time setup

```bash
npm install
```

## Daily commands

```bash
# Serve an app
npx nx serve ops-console               # http://localhost:4200
npx nx serve customer-portal           # http://localhost:4201
npx nx serve shearer-pwa               # http://localhost:4202

# Test an app or lib
npx nx test ops-console
npx nx test auth

# Lint
npx nx lint ops-console

# Build for production
npx nx build ops-console --configuration=production

# Show what tests depend on what (Nx's dependency graph)
npx nx graph

# Regenerate the API client after backend changes
npx nx run api-client:generate
```

## File-size discipline

Per `docs/coding-standards.md`:

- Components: soft ceiling 200 lines. If you approach it, extract child components.
- Services: soft ceiling 300 lines. Split by domain concern.
- One class per file; one feature per folder.

## Architecture conventions

- **Standalone components only.** No `NgModule`. Imports declared at the component.
- **Inject function over constructor params.** `private foo = inject(FooService)`.
- **Signals for component state**, RxJS for HTTP and event streams.
- **Smart vs presentational** — feature folders own smart components (data fetching); `libs/ui` owns reusable presentational ones.
- **API access only through `@pindraft/api-client`.** Don't construct `HttpClient` calls directly.

See `apps/ops-console/src/app/features/onboarding/` for the canonical example of how a feature folder is organized.
