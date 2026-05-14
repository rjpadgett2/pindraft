import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Formats integer-cent money values consistently across the platform. All money on
 * the backend lives in cents (BIGINT) to avoid decimal drift; this component is
 * the one place that converts to a display string. Use it everywhere money shows
 * up so currency, thousands separators, and "—" for zero/null stay consistent.
 *
 * Usage:
 *   <pd-money [cents]="invoice.totalCents" [currency]="invoice.currency" />
 *   <pd-money [cents]="0" [zeroAs]="'—'" />              (renders an em-dash)
 *   <pd-money [cents]="line.unitPriceCents" muted />     (subtle styling)
 *
 * Tab numerals are forced via font-variant-numeric so columns of money align
 * regardless of digit width. The mono font is used for the digits and the
 * sans for the currency symbol — looks intentional in a dense table.
 */
@Component({
  selector: 'pd-money',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="pd-money" [class.pd-money--muted]="muted()">{{ display() }}</span>`,
  styles: [`
    .pd-money {
      font-variant-numeric: tabular-nums;
      color: var(--pd-color-text);
    }
    .pd-money--muted { color: var(--pd-color-text-muted); }
  `],
})
export class MoneyDisplayComponent {
  readonly cents = input<number | null>(0);
  readonly currency = input<string>('USD');
  readonly zeroAs = input<string | null>(null);   // optional: render "—" when 0
  readonly muted = input<boolean, unknown>(false, { transform: (v) => v !== false && v != null });

  readonly display = computed(() => {
    const c = this.cents();
    if (c === null || c === undefined) return this.zeroAs() ?? '—';
    if (c === 0 && this.zeroAs() !== null) return this.zeroAs()!;
    const dollars = c / 100;
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(dollars);
  });
}
