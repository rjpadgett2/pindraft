import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Customer, IntakeFleeceInput, PricingTemplate } from '@pindraft/api-client';
import { AuthService } from '@pindraft/auth';
import {
  ButtonComponent, CardComponent, PageHeaderComponent,
  SelectComponent, SelectOption, SnackbarService,
} from '@pindraft/ui';
import { forkJoin } from 'rxjs';
import { OnboardingService } from '../onboarding/services/onboarding.service';
import { Pool, PoolsService } from '../pools/services/pools.service';
import { IntakeFleeceTableComponent } from './intake-fleece-table.component';
import { OperationsService } from './services/operations.service';

/**
 * Walk-in intake — the spec's variant of intake processing for fiber arriving
 * without a prior reservation. Customer is picked from existing tenant_customers,
 * pricing template comes from the tenant's library, fleeces are entered manually.
 * Same fleece-table component as the reservation path. No Hirsel badge.
 */
@Component({
  selector: 'ops-walk-in-intake',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, RouterLink,
    ButtonComponent, CardComponent, PageHeaderComponent,
    SelectComponent,
    IntakeFleeceTableComponent,
  ],
  template: `
    <div class="page">
      <a routerLink="/ops/reservations" class="back">← Back to reservations</a>

      <pd-page-header
        title="Walk-in intake"
        subtitle="Fiber arriving without a prior reservation. Pick the customer and pricing, weigh each fleece, then save to create the lot." />

      @if (!loading()) {
        <pd-card class="context">
          <h2 class="section first">Customer &amp; pricing</h2>
          <div class="picker-row">
            <pd-select class="grow" label="Customer"
                       [(ngModel)]="selectedCustomerId"
                       [options]="customerOptions()" />
            <pd-select class="grow" label="Pricing template (optional)"
                       [(ngModel)]="selectedPricingId"
                       [options]="pricingOptions()" />
          </div>
        </pd-card>

        @if (acceptingPools().length > 0) {
          <h2 class="section">Wool pool (optional)</h2>
          <pd-select class="pool-select" label="Link this lot to a pool"
                     [(ngModel)]="selectedPoolId"
                     [options]="poolOptions()" />
        }

        <h2 class="section">Fleeces</h2>
        <ops-intake-fleece-table [(fleeces)]="fleeces" />

        <div class="actions">
          <pd-button variant="ghost" routerLink="/ops/reservations">Cancel</pd-button>
          <pd-button variant="primary"
                  [disabled]="!canSave() || saving()" (click)="save()">
            {{ saving() ? 'Creating lot…' : 'Save and create lot' }}
          </pd-button>
        </div>
      } @else {
        <p class="muted">Loading…</p>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px 32px; }
    .back { display: inline-block; margin-bottom: 12px; font-size: 13px; color: var(--pd-color-link, #2563eb); text-decoration: none; }
    .context { margin: 16px 0 24px; }
    .picker-row { display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-end; }
    .picker-row .grow { flex: 1; min-width: 240px; }
    .section { font-size: 14px; font-weight: 600; margin: 24px 0 12px; color: var(--pd-color-text, #111); }
    .section.first { margin-top: 0; }
    .pool-select { display: block; max-width: 480px; }
    .actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; }
    .muted { color: var(--pd-color-muted, #6b7280); font-size: 13px; }
  `],
})
export class WalkInIntakeComponent {
  private ops = inject(OperationsService);
  private onboarding = inject(OnboardingService);
  private pools = inject(PoolsService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snack = inject(SnackbarService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly customers = signal<Customer[]>([]);
  readonly pricingTemplates = signal<PricingTemplate[]>([]);
  readonly acceptingPools = signal<Pool[]>([]);
  readonly fleeces = signal<IntakeFleeceInput[]>([{ weightKg: 0 }]);

  readonly customerOptions = computed<SelectOption[]>(() =>
    this.customers().map((c) => ({ value: c.id, label: c.displayName })),
  );
  readonly pricingOptions = computed<SelectOption[]>(() => [
    { value: '', label: '— No pricing snapshot —' },
    ...this.pricingTemplates().map((p) => ({
      value: p.id,
      label: `${p.name} (${this.formatPricingKind(p.kind)})`,
    })),
  ]);
  readonly poolOptions = computed<SelectOption[]>(() => [
    { value: '', label: '— Not part of a pool —' },
    ...this.acceptingPools().map((p) => ({
      value: p.id,
      label: `${p.name} (${this.formatPoolKind(p.kind)})`,
    })),
  ]);

  selectedCustomerId = '';
  selectedPricingId = '';
  selectedPoolId = '';

  constructor() {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    forkJoin({
      customers: this.ops.listCustomers(tid),
      pricingTemplates: this.onboarding.listPricingTemplates(tid),
      pools: this.pools.listAccepting(tid),
    }).subscribe({
      next: ({ customers, pricingTemplates, pools }) => {
        this.customers.set(customers);
        this.pricingTemplates.set(pricingTemplates);
        this.acceptingPools.set(pools);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  canSave(): boolean {
    return !!this.selectedCustomerId && this.fleeces().every((f) => f.weightKg > 0);
  }

  formatPricingKind(k: string): string {
    return k.replace(/_/g, ' ').toLowerCase();
  }
  formatPoolKind(k: string): string {
    return k.replace('_', ' ').toLowerCase();
  }

  save(): void {
    const tid = this.auth.activeTenantId();
    if (!tid || !this.selectedCustomerId) return;
    this.saving.set(true);
    this.ops.walkInIntake(tid, {
      customerId: this.selectedCustomerId,
      pricingArrangementId: this.selectedPricingId || undefined,
      poolId: this.selectedPoolId || undefined,
      fleeces: this.fleeces().map((f) => ({
        weightKg: f.weightKg,
        sourceAnimalName: f.sourceAnimalName,
        breedCode: f.breedCode,
        notes: f.notes,
      })),
    }).subscribe({
      next: (lot) => {
        this.snack.show('Lot created', { durationMs: 2000 });
        this.router.navigate(['/ops/lots', lot.id]);
      },
      error: (e) => {
        this.snack.show('Intake failed: ' + (e?.error?.detail ?? 'unknown'));
        this.saving.set(false);
      },
    });
  }
}
