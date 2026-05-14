import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CreatePricingTemplateRequest, PricingKind, TieredTier } from '@pindraft/api-client';
import {
  ButtonComponent, InputComponent, SelectComponent, SelectOption,
} from '@pindraft/ui';

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
    ButtonComponent, InputComponent, SelectComponent,
  ],
  template: `
    <div class="form">
      <div class="row">
        <pd-input class="grow" label="Template name" [(ngModel)]="name" />
        <pd-select label="Kind" [(ngModel)]="kind" [options]="kindOptions" />
      </div>

      @switch (kind) {
        @case ('PER_POUND') {
          <div class="row">
            <pd-input class="grow" label="Price per kilogram (USD)" type="number" [(ngModel)]="pricePerKg" />
          </div>
        }
        @case ('HYBRID') {
          <div class="row">
            <pd-input label="Flat fee (USD)" type="number" [(ngModel)]="flatFee" />
            <pd-input label="Plus per kilogram (USD)" type="number" [(ngModel)]="pricePerKg" />
          </div>
        }
        @case ('REVENUE_SPLIT') {
          <div class="row">
            <pd-input label="Mill percent" type="number" [(ngModel)]="millPercent" (ngModelChange)="syncBrandPercent()" />
            <pd-input label="Brand percent" type="number" [(ngModel)]="brandPercent" />
          </div>
          <p class="hint">Must sum to 100.</p>
        }
        @case ('TIERED_BY_GRADE') {
          <div class="tiers">
            <p class="hint">Lower-micron fibers price higher. Add tiers in micron order.</p>
            @for (tier of tiers(); track $index) {
              <div class="tier-row">
                <pd-input label="Max micron" type="number" [(ngModel)]="tier.maxMicron" />
                <pd-input label="Price per kg (USD)" type="number" [(ngModel)]="tier.pricePerKg" />
                <pd-button variant="ghost" size="sm" (click)="removeTier($index)" [disabled]="tiers().length === 1">
                  Remove
                </pd-button>
              </div>
            }
            <div>
              <pd-button variant="secondary" size="sm" (click)="addTier()">+ Add tier</pd-button>
            </div>
          </div>
        }
      }

      <div class="actions">
        <pd-button variant="ghost" (click)="cancel.emit()">Cancel</pd-button>
        <pd-button variant="primary" [disabled]="!canSave()" (click)="onSave()">
          Save template
        </pd-button>
      </div>
    </div>
  `,
  styles: [`
    .form { background: var(--pd-color-bg-sunken, #f9fafb); padding: 20px; border-radius: 8px; }
    .row { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; margin-bottom: 12px; }
    .row pd-input, .row pd-select { min-width: 180px; }
    .row .grow { flex: 1; min-width: 240px; }
    .tiers { display: flex; flex-direction: column; gap: 8px; }
    .tier-row { display: flex; gap: 8px; align-items: flex-end; }
    .tier-row pd-input { flex: 1; }
    .hint { font-size: 12px; color: var(--pd-color-muted, #666); margin: 4px 0 8px; }
    .actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; }
  `],
})
export class PricingFormComponent {
  readonly save = output<CreatePricingTemplateRequest>();
  readonly cancel = output<void>();

  readonly kindOptions: SelectOption[] = [
    { value: 'PER_POUND', label: 'Per pound (simplest)' },
    { value: 'HYBRID', label: 'Flat fee + per pound' },
    { value: 'TIERED_BY_GRADE', label: 'Tiered by micron grade' },
    { value: 'REVENUE_SPLIT', label: 'Revenue split' },
  ];

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
