import { ChangeDetectionStrategy, Component, computed, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IntakeFleeceInput } from '@pindraft/api-client';
import { ButtonComponent } from '@pindraft/ui';

/**
 * Presentational table for entering fleeces being received. Two-way binding via
 * `model()` so the parent's signal updates in place. Emits no events — pure form.
 *
 * Uses raw inputs rather than `pd-input` because we're rendering a dense grid of
 * cells where the floating-label affordance would dominate; column headers in the
 * table do the labeling job. The cell inputs reuse the design tokens so colors
 * and focus rings still match the rest of the design system.
 */
@Component({
  selector: 'ops-intake-fleece-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ButtonComponent],
  template: `
    <div class="pd-fleece-table-wrap">
      <table class="pd-fleece-table">
        <thead>
          <tr>
            <th style="width: 28%">Animal name (optional)</th>
            <th style="width: 22%">Breed code</th>
            <th style="width: 18%">Weight (kg)</th>
            <th>Notes</th>
            <th style="width: 6%"></th>
          </tr>
        </thead>
        <tbody>
          @for (fleece of fleeces(); track $index; let i = $index) {
            <tr>
              <td><input [(ngModel)]="fleece.sourceAnimalName" placeholder="e.g., Bramble" /></td>
              <td><input [(ngModel)]="fleece.breedCode" placeholder="e.g., ROMNEY" /></td>
              <td>
                <input type="number" min="0" step="0.1"
                  [(ngModel)]="fleece.weightKg" (ngModelChange)="recompute()" />
              </td>
              <td><input [(ngModel)]="fleece.notes" placeholder="Optional" /></td>
              <td class="pd-fleece-table__remove">
                <button type="button"
                  class="pd-fleece-table__remove-btn"
                  [disabled]="fleeces().length === 1"
                  aria-label="Remove fleece"
                  title="Remove fleece"
                  (click)="removeRow(i)">−</button>
              </td>
            </tr>
          }
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2">
              <pd-button variant="secondary" size="sm" (click)="addRow()">+ Add fleece</pd-button>
            </td>
            <td colspan="3" class="pd-fleece-table__total">
              Total: <strong>{{ totalWeight().toFixed(2) }} kg</strong>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  `,
  styles: [`
    .pd-fleece-table-wrap {
      background: var(--pd-color-bg-elevated, white);
      border: 1px solid var(--pd-color-border, #e5e7eb);
      border-radius: var(--pd-radius-md, 8px);
      overflow: hidden;
    }
    .pd-fleece-table { width: 100%; border-collapse: collapse; }
    .pd-fleece-table th,
    .pd-fleece-table td {
      padding: var(--pd-space-2, 8px);
      border-bottom: 1px solid var(--pd-color-border, #e5e7eb);
      text-align: left;
      font-size: var(--pd-text-sm, 13px);
    }
    .pd-fleece-table tbody tr:last-child td { border-bottom: none; }
    .pd-fleece-table th {
      color: var(--pd-color-text-muted, #666);
      font-weight: var(--pd-weight-semibold, 600);
      font-size: var(--pd-text-xs, 12px);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: var(--pd-color-bg-sunken, #f9fafb);
    }
    .pd-fleece-table tfoot td {
      border-bottom: none;
      border-top: 1px solid var(--pd-color-border, #e5e7eb);
      background: var(--pd-color-bg-sunken, #f9fafb);
    }
    .pd-fleece-table input {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid var(--pd-color-border, #e5e7eb);
      border-radius: var(--pd-radius-sm, 4px);
      font-size: var(--pd-text-sm, 13px);
      font-family: inherit;
      background: white;
      color: var(--pd-color-text, #111);
    }
    .pd-fleece-table input:focus {
      outline: none;
      border-color: var(--pd-brand-accent, #2563eb);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--pd-brand-accent, #2563eb) 18%, transparent);
    }
    .pd-fleece-table__remove { text-align: center; }
    .pd-fleece-table__remove-btn {
      width: 26px; height: 26px;
      border: 1px solid var(--pd-color-border, #e5e7eb);
      background: white;
      border-radius: 50%;
      cursor: pointer;
      color: var(--pd-color-text-muted, #6b7280);
      font-size: 16px;
      line-height: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: color 120ms ease, border-color 120ms ease, background 120ms ease;
    }
    .pd-fleece-table__remove-btn:hover:not(:disabled) {
      color: var(--pd-color-danger-text, #b91c1c);
      border-color: var(--pd-color-danger-text, #b91c1c);
      background: var(--pd-color-danger-bg, #fee2e2);
    }
    .pd-fleece-table__remove-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .pd-fleece-table__total { text-align: right; padding: 12px 8px; font-size: var(--pd-text-sm, 13px); }
  `],
})
export class IntakeFleeceTableComponent {
  readonly fleeces = model.required<IntakeFleeceInput[]>();
  readonly totalWeight = computed(() =>
    this.fleeces().reduce((sum, f) => sum + (f.weightKg || 0), 0)
  );

  recompute(): void {
    // Trigger update by re-setting the signal with a new array reference
    this.fleeces.update((list) => [...list]);
  }

  addRow(): void {
    this.fleeces.update((list) => [...list, { weightKg: 0 }]);
  }

  removeRow(index: number): void {
    this.fleeces.update((list) => list.filter((_, i) => i !== index));
  }
}
