import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Tone } from '../tokens';

/**
 * A small colored pill used to display lifecycle states — invoice DRAFT / ISSUED /
 * PAID / VOID, lot ACTIVE / COMPLETED, pool ACCEPTING / CLOSED / DISTRIBUTED, etc.
 *
 * Caller maps the domain status string → a tone. Five tones cover every state
 * machine in the platform: info, success, warning, danger, neutral.
 *
 * Usage:
 *   <pd-status-chip [label]="i.status" [tone]="toneForInvoice(i.status)" />
 *
 *   toneForInvoice(s: InvoiceStatus): Tone {
 *     return s === 'PAID' ? 'success' : s === 'VOID' ? 'danger'
 *       : s === 'ISSUED' ? 'info' : 'neutral';
 *   }
 *
 * This avoids the previous pattern of per-component .status.DRAFT/.ISSUED CSS
 * rules — each component had to redefine the palette and they drifted.
 */
@Component({
  selector: 'pd-status-chip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="pd-chip" [attr.data-tone]="tone()">{{ label() }}</span>`,
  styles: [`
    .pd-chip {
      display: inline-flex;
      align-items: center;
      padding: 2px var(--pd-space-2);
      border-radius: var(--pd-radius-full);
      font-family: var(--pd-font-sans);
      font-size: var(--pd-text-xs);
      line-height: var(--pd-leading-xs);
      font-weight: var(--pd-weight-medium);
      letter-spacing: 0.02em;
      white-space: nowrap;
      background: var(--pd-tone-neutral-bg);
      color:      var(--pd-tone-neutral-text);
    }
    .pd-chip[data-tone="info"]    { background: var(--pd-tone-info-bg);    color: var(--pd-tone-info-text); }
    .pd-chip[data-tone="success"] { background: var(--pd-tone-success-bg); color: var(--pd-tone-success-text); }
    .pd-chip[data-tone="warning"] { background: var(--pd-tone-warning-bg); color: var(--pd-tone-warning-text); }
    .pd-chip[data-tone="danger"]  { background: var(--pd-tone-danger-bg);  color: var(--pd-tone-danger-text); }
  `],
})
export class StatusChipComponent {
  readonly label = input.required<string>();
  readonly tone = input<Tone>('neutral');
}
