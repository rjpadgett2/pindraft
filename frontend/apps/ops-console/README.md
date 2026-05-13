# ops-console — Mill operator UI

Desktop-first Angular 21 app for mill operators. The wedge that gets Sturnella Farm Mill onto Pindraft.

## What works in the scaffold

- **Login** at `/login` — email + password against the backend, stores tokens.
- **Onboarding hub** at `/setup` — pulls setup status from the backend and renders the
  four required + three optional setup categories.
- **Workflow stages config** at `/setup/workflow-stages` — view stages, edit display names.

## What's still to build (in priority order)

1. Other onboarding spokes: mill profile form, equipment inventory, pricing templates,
   operator invitations, directory listing toggle, label printer.
2. Reservations dashboard.
3. Intake processing screen.
4. Scan station.
5. Per-stage queue dashboard.
6. Walk-in path.

Each builds on the same pattern as `features/onboarding/`.

## Folder structure

```
src/app/
├── app.component.ts            — root component (just <router-outlet />)
├── app.config.ts               — providers, zoneless config, HTTP interceptors
├── app.routes.ts               — route table
├── shell/                      — global layout (header, nav, tenant context display)
└── features/
    ├── auth/
    │   └── login.component.ts
    └── onboarding/
        ├── hub.component.ts
        ├── workflow-stages.component.ts
        └── services/
            └── onboarding.service.ts
```

## Conventions

Per `docs/coding-standards.md`:

- Standalone components only.
- Use `inject()`, not constructor params.
- Signals for component state.
- One feature = one folder.
- Component files cap at ~200 lines; extract when over.
