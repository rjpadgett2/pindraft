import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IconButtonVariant = 'default' | 'ghost' | 'danger';
export type IconButtonSize = 'sm' | 'md' | 'lg';

/**
 * `<pd-icon-button>` — square button optimized for a single glyph. Use for
 * row-affordances ("remove this fleece"), toolbar actions ("sign out"), and
 * other places where text would be redundant alongside a clear icon.
 *
 * Always pass `aria-label` (passed through as an attribute) so the screen-reader
 * has a name to announce. The component uses native `<button>` so keyboard nav,
 * focus management, and form-association behavior work out of the box.
 *
 * Usage:
 *   <pd-icon-button aria-label="Move up" (click)="moveUp(i)">
 *     <pd-icon name="arrow_upward" size="18" />
 *   </pd-icon-button>
 *
 *   <pd-icon-button variant="danger" size="sm" (click)="remove()">
 *     <pd-icon name="remove_circle_outline" size="16" />
 *   </pd-icon-button>
 */
@Component({
  selector: 'pd-icon-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [type]="type()"
      [disabled]="disabled()"
      class="pd-icon-btn"
      [attr.data-variant]="variant()"
      [attr.data-size]="size()">
      <ng-content />
    </button>
  `,
  styles: [`
    :host { display: inline-flex; }
    .pd-icon-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--pd-radius-md);
      border: 1px solid transparent;
      background: transparent;
      color: inherit;
      cursor: pointer;
      padding: 0;
      transition: background-color 120ms ease, color 120ms ease, border-color 120ms ease;
    }
    .pd-icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .pd-icon-btn:focus-visible {
      outline: 2px solid var(--pd-brand-accent);
      outline-offset: 2px;
    }

    /* Sizes — square box sized to fit a comfortable touch target. */
    .pd-icon-btn[data-size="sm"] { width: 28px; height: 28px; }
    .pd-icon-btn[data-size="md"] { width: 36px; height: 36px; }
    .pd-icon-btn[data-size="lg"] { width: 44px; height: 44px; }

    /* Variants. */
    .pd-icon-btn[data-variant="default"] {
      color: var(--pd-color-text-muted);
    }
    .pd-icon-btn[data-variant="default"]:hover:not(:disabled) {
      background: var(--pd-color-bg-sunken);
      color: var(--pd-color-text);
    }
    .pd-icon-btn[data-variant="ghost"] {
      color: var(--pd-color-text-muted);
    }
    .pd-icon-btn[data-variant="ghost"]:hover:not(:disabled) {
      background: color-mix(in srgb, currentColor 8%, transparent);
      color: var(--pd-color-text);
    }
    .pd-icon-btn[data-variant="danger"] {
      color: var(--pd-tone-danger-text, var(--pd-red-700));
    }
    .pd-icon-btn[data-variant="danger"]:hover:not(:disabled) {
      background: var(--pd-tone-danger-bg, var(--pd-red-50));
      border-color: var(--pd-tone-danger-text, var(--pd-red-700));
    }
  `],
})
export class IconButtonComponent {
  readonly variant = input<IconButtonVariant>('default');
  readonly size = input<IconButtonSize>('md');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input<boolean, unknown>(false, { transform: (v) => v !== false && v != null });
}
