import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Vanilla-CSS button — first Pindraft primitive in the Material-replacement
 * track. No Material dependency. Uses the brand accent tokens (--pd-brand-*)
 * so each app's button color follows its per-app brand override.
 *
 * Usage:
 *   <pd-button variant="primary" (click)="save()">Save</pd-button>
 *   <pd-button variant="secondary" size="lg">Cancel</pd-button>
 *   <pd-button variant="ghost" disabled>Disabled</pd-button>
 *   <pd-button type="submit" [loading]="saving()">Save</pd-button>
 *
 * Accessibility: renders a native <button> so keyboard nav, focus management,
 * and screen-reader semantics work out of the box. Loading state sets
 * aria-busy and visually replaces text but stays the same width to avoid
 * layout shift.
 */
@Component({
  selector: 'pd-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [type]="type()"
      [disabled]="disabled() || loading()"
      [attr.aria-busy]="loading() ? 'true' : null"
      class="pd-btn"
      [attr.data-variant]="variant()"
      [attr.data-size]="size()">
      @if (loading()) {
        <span class="pd-btn__spinner" aria-hidden="true"></span>
      }
      <span class="pd-btn__label" [class.pd-btn__label--loading]="loading()">
        <ng-content />
      </span>
    </button>
  `,
  styles: [`
    :host { display: inline-flex; }
    .pd-btn {
      /* Layout */
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--pd-space-2);
      position: relative;
      box-sizing: border-box;
      /* Reset native button */
      border: 1px solid transparent;
      cursor: pointer;
      font-family: var(--pd-font-sans);
      font-weight: var(--pd-weight-medium);
      letter-spacing: -0.005em;
      text-decoration: none;
      transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
      white-space: nowrap;
      /* Focus ring */
      outline: none;
    }
    .pd-btn:focus-visible {
      box-shadow: 0 0 0 2px var(--pd-color-bg-app), 0 0 0 4px var(--pd-color-border-focus);
    }
    .pd-btn:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    /* Sizes */
    .pd-btn[data-size="sm"] { padding: 6px 12px; font-size: var(--pd-text-sm); line-height: 18px; border-radius: var(--pd-radius-sm); min-height: 30px; }
    .pd-btn[data-size="md"] { padding: 8px 16px; font-size: var(--pd-text-base); line-height: 20px; border-radius: var(--pd-radius-md); min-height: 38px; }
    .pd-btn[data-size="lg"] { padding: 12px 22px; font-size: var(--pd-text-md); line-height: 22px; border-radius: var(--pd-radius-md); min-height: 46px; }

    /* Primary: filled brand-accent */
    .pd-btn[data-variant="primary"] {
      background: var(--pd-brand-accent);
      color: var(--pd-brand-text-on-accent);
      border-color: var(--pd-brand-accent);
    }
    .pd-btn[data-variant="primary"]:hover:not(:disabled) {
      background: var(--pd-brand-accent-hover);
      border-color: var(--pd-brand-accent-hover);
    }

    /* Secondary: bordered slate, white surface */
    .pd-btn[data-variant="secondary"] {
      background: var(--pd-color-bg-surface);
      color: var(--pd-color-text);
      border-color: var(--pd-color-border-strong);
    }
    .pd-btn[data-variant="secondary"]:hover:not(:disabled) {
      background: var(--pd-color-bg-sunken);
      border-color: var(--pd-color-text-muted);
    }

    /* Ghost: text-only, hover-tints with brand */
    .pd-btn[data-variant="ghost"] {
      background: transparent;
      color: var(--pd-color-text);
      border-color: transparent;
    }
    .pd-btn[data-variant="ghost"]:hover:not(:disabled) {
      background: var(--pd-color-bg-sunken);
    }

    /* Danger: red filled — for destructive confirmations */
    .pd-btn[data-variant="danger"] {
      background: var(--pd-red-600);
      color: #ffffff;
      border-color: var(--pd-red-600);
    }
    .pd-btn[data-variant="danger"]:hover:not(:disabled) {
      background: var(--pd-red-700);
      border-color: var(--pd-red-700);
    }

    /* Loading state — spinner overlay, label invisible but reserves width */
    .pd-btn__label--loading { visibility: hidden; }
    .pd-btn__spinner {
      position: absolute;
      width: 14px;
      height: 14px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: pd-spin 600ms linear infinite;
    }
    @keyframes pd-spin {
      to { transform: rotate(360deg); }
    }
  `],
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input<boolean, unknown>(false, { transform: (v) => v !== false && v != null });
  readonly loading = input<boolean, unknown>(false, { transform: (v) => v !== false && v != null });
}
