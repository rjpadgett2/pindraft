import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * `<pd-icon>` — inline-SVG icon primitive. Replaces Material Icons (heavy web
 * font + extra request) with a small curated set rendered as inline SVG so they
 * inherit `currentColor` and respond to font-size sizing.
 *
 * Adding an icon? Drop a 24×24 SVG path into {@link ICONS}. Each entry is
 * either a single path string (stroke-based, no fill) or a tuple of paths.
 * Keep them stroke-based to match Heroicons-outline style; tune `stroke-width`
 * inline if you need a heavier weight.
 *
 * Usage:
 *   <pd-icon name="check" />
 *   <pd-icon name="logout" size="20" />
 *   <pd-icon name="check_circle" class="status-icon" />
 *
 * Unknown icon names render an empty box (no crash) and log a one-time warning
 * so missing icons surface in dev without breaking pages.
 */
@Component({
  selector: 'pd-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg class="pd-icon"
         [attr.width]="size()"
         [attr.height]="size()"
         viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         [attr.stroke-width]="strokeWidth()"
         stroke-linecap="round"
         stroke-linejoin="round"
         aria-hidden="true"
         focusable="false"
         [innerHTML]="paths()"></svg>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: currentColor;
      line-height: 0;
    }
    .pd-icon { display: block; }
  `],
})
export class IconComponent {
  readonly name = input.required<string>();
  /** CSS length string (px, em, rem). Defaults to 1em so icons scale with surrounding text. */
  readonly size = input<string | number>('1em');
  readonly strokeWidth = input<string | number>(1.75);

  readonly paths = computed(() => {
    const def = ICONS[this.name()];
    if (!def) {
      if (!warned.has(this.name())) {
        warned.add(this.name());
        // eslint-disable-next-line no-console
        console.warn(`[pd-icon] unknown icon "${this.name()}"`);
      }
      return '';
    }
    return def;
  });
}

const warned = new Set<string>();

/**
 * Icon body markup (inside the `<svg>` element). Stroke-based to keep weight light
 * and to inherit color via `currentColor`. Names mirror Material Icons / Heroicons
 * outline so existing call sites migrate without renaming.
 *
 * If you need a filled variant of an existing icon, add a suffixed entry like
 * `check_circle_filled` rather than mutating the original.
 */
const ICONS: Record<string, string> = {
  add: `<path d="M12 5v14M5 12h14" />`,
  arrow_upward: `<path d="M12 19V5M5 12l7-7 7 7" />`,
  check: `<path d="M5 12l5 5L20 7" />`,
  check_circle: `
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12l3 3 5-6" />`,
  cloud_done: `
    <path d="M7 18a4 4 0 010-8 5 5 0 019.6-1.4A4 4 0 0117 18H7z" />
    <path d="M9 14l2 2 4-4" />`,
  cloud_off: `
    <path d="M3 3l18 18" />
    <path d="M7 18a4 4 0 01-1.7-7.6M9.6 6.6A5 5 0 0116.6 8 4 4 0 0119 13.6M9 18h8" />`,
  content_copy: `
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" />`,
  key: `
    <circle cx="8" cy="15" r="3" />
    <path d="M10.1 13L21 2.1M17 6l3 3M14 9l3 3" />`,
  logout: `
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />`,
  more_vert: `
    <circle cx="12" cy="5" r="1.25" />
    <circle cx="12" cy="12" r="1.25" />
    <circle cx="12" cy="19" r="1.25" />`,
  pets: `
    <ellipse cx="6.5" cy="9.5" rx="1.7" ry="2.3" />
    <ellipse cx="17.5" cy="9.5" rx="1.7" ry="2.3" />
    <ellipse cx="9.5" cy="5.5" rx="1.5" ry="2" />
    <ellipse cx="14.5" cy="5.5" rx="1.5" ry="2" />
    <path d="M8 17a4 4 0 018 0 3 3 0 01-3 3h-2a3 3 0 01-3-3z" />`,
  remove_circle_outline: `
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12h8" />`,
  schedule: `
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />`,
  verified: `
    <path d="M12 2l2.5 2 3.5-.5 1 3.5 3 2-2 3 .5 3.5-3.5 1-2 3-3-2-3 2-2-3-3.5-1 .5-3.5-3-2 1-3.5 3.5.5L12 2z" />
    <path d="M9 12l2 2 4-4" />`,
};
