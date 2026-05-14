import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Two-up label / value grid used for metadata blocks — invoice meta, lot facts,
 * customer details, pool summary. Replaces the per-component `.meta { grid… }`
 * boilerplate scattered across the codebase.
 *
 * Usage:
 *   <pd-key-value-grid>
 *     <pd-kv label="Lot">A4F2…</pd-kv>
 *     <pd-kv label="Customer">Bramble Farm</pd-kv>
 *     <pd-kv label="Status"><pd-status-chip label="ACTIVE" tone="info" /></pd-kv>
 *   </pd-key-value-grid>
 *
 * Layout auto-fits to the available width with 3 columns at desktop, 2 at
 * tablet, 1 at mobile.
 */
@Component({
  selector: 'pd-key-value-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<dl class="pd-kv-grid"><ng-content /></dl>`,
  styles: [`
    .pd-kv-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--pd-space-3) var(--pd-space-6);
      margin: 0;
    }
  `],
})
export class KeyValueGridComponent {}

/**
 * A single label/value pair inside a KeyValueGrid. Two slots — the label is
 * structured via input, the value goes through content projection so callers
 * can pass plain text, components, or formatted nodes.
 */
@Component({
  selector: 'pd-kv',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pd-kv">
      <dt class="pd-kv__label">{{ label() }}</dt>
      <dd class="pd-kv__value"><ng-content /></dd>
    </div>
  `,
  styles: [`
    .pd-kv {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .pd-kv__label {
      font-family: var(--pd-font-sans);
      font-size: var(--pd-text-xs);
      line-height: var(--pd-leading-xs);
      font-weight: var(--pd-weight-medium);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--pd-color-text-muted);
      margin: 0;
    }
    .pd-kv__value {
      margin: var(--pd-space-1) 0 0;
      font-size: var(--pd-text-base);
      line-height: var(--pd-leading-base);
      color: var(--pd-color-text);
      overflow-wrap: anywhere;
    }
  `],
})
export class KvComponent {
  readonly label = input.required<string>();
}
