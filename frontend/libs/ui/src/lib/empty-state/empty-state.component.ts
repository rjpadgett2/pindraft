import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The "nothing here yet" panel that every list-screen needs. Replaces the
 * ad-hoc `<div class="empty">No invoices yet.</div>` blocks scattered across
 * components, all with slightly different paddings and copy tones.
 *
 * Usage:
 *   <pd-empty-state
 *     title="No invoices yet"
 *     description="Complete a lot to auto-generate the first one.">
 *     <a mat-stroked-button routerLink="/ops/lots">Go to lots</a>
 *   </pd-empty-state>
 *
 * The content slot is for an optional primary action — pass a button or link
 * if the user can take action from here, omit it for true empty states (no
 * data ever existed).
 */
@Component({
  selector: 'pd-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pd-empty">
      <h3 class="pd-empty__title">{{ title() }}</h3>
      @if (description()) {
        <p class="pd-empty__description">{{ description() }}</p>
      }
      <div class="pd-empty__actions">
        <ng-content />
      </div>
    </div>
  `,
  styles: [`
    .pd-empty {
      padding: var(--pd-space-12) var(--pd-space-6);
      background: var(--pd-color-bg-sunken);
      border-radius: var(--pd-radius-lg);
      border: 1px dashed var(--pd-color-border-strong);
      text-align: center;
    }
    .pd-empty__title {
      margin: 0;
      font-family: var(--pd-font-sans);
      font-size: var(--pd-text-md);
      line-height: var(--pd-leading-md);
      font-weight: var(--pd-weight-medium);
      color: var(--pd-color-text);
    }
    .pd-empty__description {
      margin: var(--pd-space-2) auto 0;
      max-width: 48ch;
      font-size: var(--pd-text-sm);
      line-height: var(--pd-leading-sm);
      color: var(--pd-color-text-muted);
    }
    .pd-empty__actions {
      margin-top: var(--pd-space-4);
      display: flex;
      gap: var(--pd-space-2);
      justify-content: center;
    }
    .pd-empty__actions:empty { display: none; }
  `],
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
}
