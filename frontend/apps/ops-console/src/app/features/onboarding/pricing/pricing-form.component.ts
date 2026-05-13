import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CreatePricingTemplateRequest, PricingKind, TieredTier } from '@pindraft/api-client';

/**
 * Presentational form for creating a pricing template. Switches the rendered
 * fields based on the selected pricing kind.
 *
 * Emits a `save` event with the constructed CreatePricingTemplateRequest payload.
 * Parent component handles persistence.
 */
@Component({
  selector: 'ops-pricing-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule,
  ],
  template: `
    <div class="form">
      <div class="row">
        <mat-form-field appearance="outline" class="grow">
          <mat-label>Template name</mat-label>
          <input matInput [(ngModel)]="name" placeholder="e.g., Standard per-pound" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Kind</mat-label>
          <mat-select [(value)]="kind">
            <mat-option value="PER_POUND">Per pound (simplest)</mat-option>
            <mat-option value="HYBRID">Flat fee + per pound</mat-option>
            <mat-option value="TIERED_BY_GRADE">Tiered by micron grade</mat-option>
            <mat-option value="REVENUE_SPLIT">Revenue split</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      @switch (kind) {
        @case ('PER_POUND') {
          <div class="row">
            <mat-form-field appearance="outline" class="grow">
              <mat-label>Price per kilogram (USD)</mat-label>
              <input matInput type="number" min="0" step="0.01" [(ngModel)]="pricePerKg" />
            </mat-form-field>
          </div>
        }
        @case ('HYBRID') {
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Flat fee (USD)</mat-label>
              <input matInput type="number" min="0" step="0.01" [(ngModel)]="flatFee" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Plus per kilogram (USD)</mat-label>
              <input matInput type="number" min="0" step="0.01" [(ngModel)]="pricePerKg" />
            </mat-form-field>
          </div>
        }
        @case ('REVENUE_SPLIT') {
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Mill percent</mat-label>
              <input matInput type="number" min="0" max="100" [(ngModel)]="millPercent" (ngModelChange)="syncBrandPercent()" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Brand percent</mat-label>
              <input matInput type="number" min="0" max="100" [(ngModel)]="brandPercent" />
            </mat-form-field>
            <p class="hint">Must sum to 100.</p>
          </div>
        }
        @case ('TIERED_BY_GRADE') {
          <div class="tiers">
            <p class="hint">Lower-micron fibers price higher. Add tiers in micron order.</p>
            @for (tier of tiers(); track $index) {
              <div class="tier-row">
                <mat-form-field appearance="outline">
                  <mat-label>Max micron</mat-label>
                  <input matInput type="number" min="1" [(ngModel)]="tier.maxMicron" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Price per kg (USD)</mat-label>
                  <input matInput type="number" min="0" step="0.01" [(ngModel)]="tier.pricePerKg" />
                </mat-form-field>
                <button mat-icon-button (click)="removeTier($index)" [disabled]="tiers().length === 1">
                  <mat-icon>remove_circle_outline</mat-icon>
                </button>
              </div>
            }
            <button mat-stroked-button (click)="addTier()">+ Add tier</button>
          </div>
        }
      }

      <div class="actions">
        <button mat-button (click)="cancel.emit()">Cancel</button>
        <button mat-flat-button color="primary" [disabled]="!canSave()" (click)="onSave()">
          Save template
        </button>
      </div>
    </div>
  `,
  styles: [`
    .form { background: #f9fafb; padding: 20px; border-radius: 8px; }
    .row { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-start; }
    .row mat-form-field { min-width: 180px; }
    .row .grow { flex: 1; min-width: 240px; }
    .tiers { display: flex; flex-direction: column; gap: 8px; }
    .tier-row { display: flex; gap: 8px; align-items: center; }
    .hint { font-size: 12px; color: #666; margin: 4px 0 8px; }
    .actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; }
  `],
})
export class PricingFormComponent {
  readonly save = output<CreatePricingTemplateRequest>();
  readonly cancel = output<void>();

  name = '';
  kind: PricingKind = 'PER_POUND';
  pricePerKg = 0;
  flatFee = 0;
  millPercent = 60;
  brandPercent = 40;
  readonly tiers = signal<TieredTier[]>([{ maxMicron: 22, pricePerKg: 0 }]);

  syncBrandPercent(): void {
    const remaining = 100 - this.millPercent;
    if (remaining >= 0 && remaining <= 100) this.brandPercent = remaining;
  }

  addTier(): void {
    this.tiers.update((list) => [...list, { maxMicron: 0, pricePerKg: 0 }]);
  }

  removeTier(index: number): void {
    this.tiers.update((list) => list.filter((_, i) => i !== index));
  }

  canSave(): boolean {
    if (!this.name.trim()) return false;
    switch (this.kind) {
      case 'PER_POUND': return this.pricePerKg > 0;
      case 'HYBRID': return this.flatFee >= 0 && this.pricePerKg > 0;
      case 'REVENUE_SPLIT': return Math.abs(this.millPercent + this.brandPercent - 100) < 0.01;
      case 'TIERED_BY_GRADE': return this.tiers().every((t) => t.maxMicron > 0 && t.pricePerKg > 0);
    }
  }

  onSave(): void {
    let config;
    switch (this.kind) {
      case 'PER_POUND': config = { pricePerKg: this.pricePerKg }; break;
      case 'HYBRID': config = { flatFee: this.flatFee, pricePerKg: this.pricePerKg }; break;
      case 'REVENUE_SPLIT': config = { millPercent: this.millPercent, brandPercent: this.brandPercent }; break;
      case 'TIERED_BY_GRADE': config = { tiers: this.tiers() }; break;
    }
    this.save.emit({ name: this.name.trim(), kind: this.kind, config });
  }
}
