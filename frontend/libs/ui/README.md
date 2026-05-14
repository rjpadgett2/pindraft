# @pindraft/ui — shared design system primitives

Presentational components and design tokens for all three apps. No business logic, no API calls, no router awareness.

## Aesthetic

**Modern industrial** — slate-blue + cool gray. System font stack, flat surfaces, restrained color, monospace for IDs and weights. Built for the operator's dense daily-use surfaces; reads serious without being cold.

## Layout

```
libs/ui/src/
├── index.ts                          ← public surface (apps import from '@pindraft/ui')
└── lib/
    ├── tokens.css                    ← :root CSS custom properties (the source of truth)
    ├── tokens.ts                     ← TS mirror for programmatic style values
    ├── page-header/                  ← <pd-page-header>
    ├── status-chip/                  ← <pd-status-chip>      generalized state pill
    ├── status-badge/                 ← <pd-status-badge>     onboarding-specific legacy
    ├── money-display/                ← <pd-money>            cents → formatted string
    ├── empty-state/                  ← <pd-empty-state>
    └── key-value-grid/               ← <pd-key-value-grid> + <pd-kv>
```

## Wiring into an app

Each app imports tokens.css once in its global styles:

```scss
/* apps/<app>/src/styles.scss */
@import '../../../libs/ui/src/lib/tokens.css';
```

That sets the `:root { --pd-… }` custom properties so every primitive can resolve them. Components import from `@pindraft/ui` per their `imports:` array.

## Conventions

- **Selector prefix**: `pd-` (e.g. `pd-page-header`).
- **CSS class prefix**: BEM-ish: `pd-<component>__<element>` / `pd-<component>--<modifier>`.
- **Never** hard-code hex values, font families, or pixel literals in a component. Always reference `var(--pd-…)`. If the token doesn't exist, add it to `tokens.css` rather than inlining.
- Standalone + OnPush.
- Inputs for structured data; content projection (`<ng-content />`) for arbitrary children.

## Tokens overview

| Group | Tokens | Purpose |
|---|---|---|
| Palette | `--pd-slate-50` … `-900`, `--pd-blue-*`, `--pd-green-*`, `--pd-amber-*`, `--pd-red-*` | Raw color values. Don't reference from components directly — use semantic tokens. |
| Surface | `--pd-color-bg-app`, `-surface`, `-sunken`, `-elevated` | Page / card / panel backgrounds. |
| Text | `--pd-color-text`, `-muted`, `-subtle`, `-inverse`, `-link` | Text colors by emphasis. |
| Border | `--pd-color-border`, `-strong`, `-focus` | Hairlines, dividers, focus rings. |
| Accent | `--pd-color-accent`, `-hover`, `-bg` | Brand blue. |
| Status tones | `--pd-tone-info/success/warning/danger/neutral-bg/text` | Paired bg+text for status pills. Five tones cover every state machine. |
| Typography | `--pd-font-sans/mono`, `--pd-text-xs/sm/base/md/lg/xl/2xl` + matching `--pd-leading-*`, `--pd-weight-regular/medium/semibold` | One scale, pick from it. |
| Spacing | `--pd-space-0/1/2/3/4/5/6/8/10/12/16` (4px grid) | Margins, padding, gaps. |
| Radius | `--pd-radius-sm/md/lg/xl/full` | Border radii. |
| Shadow | `--pd-shadow-sm/md` | Flat-ish elevation. |
| Layout | `--pd-page-max-width`, `--pd-page-gutter-x/y` | Page container. |

## What does not live here

- Feature components (those live in the app under `features/`).
- Smart components that fetch data.
- Anything that needs auth or tenant context.
