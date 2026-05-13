import { ChangeDetectionStrategy, Component, computed, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { IntakeFleeceInput } from '@pindraft/api-client';

/**
 * Presentational table for entering fleeces being received. Two-way binding via
 * `model()` so the parent's signal updates in place. Emits no events — pure form.
 */
@Component({
  selector: 'ops-intake-fleece-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatButtonModule, MatIconModule],
  template: `
    <table>
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
            <td>
              <button mat-icon-button (click)="removeRow(i)" [disabled]="fleeces().length === 1">
                <mat-icon>remove_circle_outline</mat-icon>
              </button>
            </td>
          </tr>
        }
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2">
            <button mat-stroked-button (click)="addRow()">+ Add fleece</button>
          </td>
          <td colspan="3" class="total">
            Total: <strong>{{ totalWeight().toFixed(2) }} kg</strong>
          </td>
        </tr>
      </tfoot>
    </table>
  `,
  styles: [`
    table { width: 100%; background: white; border-collapse: collapse; }
    th, td { padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 13px; }
    th { color: #666; font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
    input { width: 100%; padding: 6px 8px; border: 1px solid #e5e7eb; border-radius: 4px; font-size: 13px; }
    input:focus { outline: none; border-color: #2563eb; }
    .total { text-align: right; padding: 12px 8px; font-size: 13px; }
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
