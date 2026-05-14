/*
 * @pindraft/ui — shared design system primitives.
 *
 * Components here are *presentation only*. No business logic, no service
 * dependencies, no router awareness. They consume design tokens from
 * `lib/tokens.css` (which apps must import once in their global styles.scss)
 * and accept all variable data via inputs / content projection.
 *
 * Adding a new primitive? Conventions:
 *   - Prefix the selector with `pd-` (e.g. `pd-page-header`).
 *   - Prefix CSS class names with `pd-<component>__<element>` (BEM-ish).
 *   - Style with `var(--pd-…)` only; never hard-code hex / px in component CSS.
 *   - Standalone + OnPush.
 */

// Design token TS constants — runtime tokens live in `lib/tokens.css`, which
// each app imports once via its global styles.scss.
export * from './lib/tokens';

// Primitives
export * from './lib/button/button.component';
export * from './lib/card/card.component';
export * from './lib/input/input.component';
export * from './lib/select/select.component';
export * from './lib/datepicker/datepicker.component';
export * from './lib/table/table.component';
export * from './lib/snackbar/snackbar.service';
export * from './lib/snackbar/snackbar-container.component';
export * from './lib/status-badge/status-badge.component';
export * from './lib/status-chip/status-chip.component';
export * from './lib/page-header/page-header.component';
export * from './lib/money-display/money-display.component';
export * from './lib/empty-state/empty-state.component';
export * from './lib/key-value-grid/key-value-grid.component';
