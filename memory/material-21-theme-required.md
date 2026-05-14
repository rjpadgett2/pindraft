---
name: Material 21 requires mat.theme() or blank page
description: Pre-existing scaffold gotcha — Material components are invisible without mat.theme()
type: project
---

If any of the three Angular apps render a blank white page despite a clean build, the first thing to check is whether `apps/<app>/src/styles.scss` calls `mat.theme(...)`. In Angular Material 21, `mat.elevation-classes()` + `mat.app-background()` alone are not enough — they don't define the `--mat-sys-*` system tokens that mat-card / mat-form-field / mat-button etc. read at runtime. Without those tokens, components render with no color, no typography, no shape — visually invisible against a white background.

**Why:** the scaffold from the initial commit only included `elevation-classes()` and `app-background()`. This was a pre-existing latent bug — the apps had probably never been rendered in a browser before; nobody noticed until the design pass exposed it.

**How to apply:** every app's `styles.scss` must contain:

```scss
@use '@angular/material' as mat;

html {
  @include mat.theme((
    color: mat.$azure-palette,
    typography: Roboto,
    density: 0,
  ));
}
```

Fixed across ops-console, customer-portal, and shearer-pwa as part of the design-tokens pass. `azure-palette` chosen because it's the Material 21 palette closest to our `--pd-blue-700` slate-blue accent. If a different brand color is wanted later, swap to another built-in palette (mat.$blue-palette, mat.$violet-palette, etc.) or define one with `mat.define-palette()`.
