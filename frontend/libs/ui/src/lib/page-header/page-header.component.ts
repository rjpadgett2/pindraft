import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Page-level header with title, optional subtitle, and a right-aligned actions slot.
 * Sets the visual rhythm at the top of every operational screen.
 *
 * Usage:
 *   <pd-page-header title="Invoices" subtitle="Generated when a lot completes">
 *     <button mat-flat-button color="primary">+ New invoice</button>
 *   </pd-page-header>
 *
 * The actions slot accepts any number of buttons. The component does not impose
 * a button style — callers wire their own Material / native buttons.
 */
@Component({
  selector: 'pd-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="pd-page-header">
      <div class="pd-page-header__text">
        <h1 class="pd-page-header__title">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="pd-page-header__subtitle">{{ subtitle() }}</p>
        }
      </div>
      <div class="pd-page-header__actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: [`
    .pd-page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--pd-space-4);
      margin-bottom: var(--pd-space-6);
      padding-bottom: var(--pd-space-4);
      border-bottom: 1px solid var(--pd-color-border);
    }
    .pd-page-header__text { min-width: 0; }
    .pd-page-header__title {
      margin: 0;
      font-family: var(--pd-font-sans);
      font-size: var(--pd-text-2xl);
      line-height: var(--pd-leading-2xl);
      font-weight: var(--pd-weight-semibold);
      color: var(--pd-color-text);
      letter-spacing: -0.01em;
    }
    .pd-page-header__subtitle {
      margin: var(--pd-space-1) 0 0;
      font-size: var(--pd-text-base);
      line-height: var(--pd-leading-base);
      color: var(--pd-color-text-muted);
      max-width: 64ch;
    }
    .pd-page-header__actions {
      display: flex;
      gap: var(--pd-space-2);
      flex-shrink: 0;
    }
  `],
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
}
