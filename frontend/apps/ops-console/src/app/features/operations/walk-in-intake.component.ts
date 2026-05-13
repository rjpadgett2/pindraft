import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { Customer, IntakeFleeceInput, PricingTemplate } from '@pindraft/api-client';
import { AuthService } from '@pindraft/auth';
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
    MatCardModule, MatButtonModule, MatFormFieldModule, MatSelectModule,
    IntakeFleeceTableComponent, DatePipe,
  ],
  template: `
    <div class="page">
      <a routerLink="/ops/reservations" class="back">← Back to reservations</a>

      <h1 class="page-title">Walk-in intake</h1>
      <p class="page-subtitle">Fiber arriving without a prior reservation. Pick the customer and pricing, weigh each fleece, then save to create the lot.</p>

      @if (!loading()) {
        <mat-card class="context">
          <mat-card-content>
            <h2 class="section">Customer &amp; pricing</h2>
            <div class="picker-row">
              <mat-form-field appearance="outline" class="grow">
                <mat-label>Customer</mat-label>
                <mat-select [(value)]="selectedCustomerId">
                  @for (c of customers(); track c.id) {
                    <mat-option [value]="c.id">{{ c.displayName }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="grow">
                <mat-label>Pricing template (optional)</mat-label>
                <mat-select [(value)]="selectedPricingId">
                  <mat-option [value]="null">— No pricing snapshot —</mat-option>
                  @for (p of pricingTemplates(); track p.id) {
                    <mat-option [value]="p.id">{{ p.name }} ({{ formatPricingKind(p.kind) }})</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        @if (acceptingPools().length > 0) {
          <h2 class="section">Wool pool (optional)</h2>
          <mat-form-field appearance="outline" class="pool-select">
            <mat-label>Link this lot to a pool</mat-label>
            <mat-select [(value)]="selectedPoolId">
              <mat-option [value]="null">— Not part of a pool —</mat-option>
              @for (p of acceptingPools(); track p.id) {
                <mat-option [value]="p.id">{{ p.name }} ({{ formatPoolKind(p.kind) }})</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }

        <h2 class="section">Fleeces</h2>
        <ops-intake-fleece-table [(fleeces)]="fleeces" />

        <div class="actions">
          <button mat-button routerLink="/ops/reservations">Cancel</button>
          <button mat-flat-button color="primary"
                  [disabled]="!canSave() || saving()" (click)="save()">
            {{ saving() ? 'Creating lot…' : 'Save and create lot' }}
          </button>
        </div>
      } @else {
        <p>Loading…</p>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px 32px; }
    .back { display: inline-block; margin-bottom: 12px; font-size: 13px; color: #2563eb; text-decoration: none; }
    .page-title { margin: 0; font-size: 24px; }
    .page-subtitle { color: #666; margin: 4px 0 0; }
    .context { margin: 16px 0 24px; }
    .picker-row { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 8px; }
    .picker-row .grow { flex: 1; min-width: 240px; }
    .section { font-size: 14px; font-weight: 500; margin: 24px 0 12px; }
    .pool-select { width: 100%; max-width: 480px; }
    .actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; }
  `],
})
export class WalkInIntakeComponent {
  private ops = inject(OperationsService);
  private onboarding = inject(OnboardingService);
  private pools = inject(PoolsService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly customers = signal<Customer[]>([]);
  readonly pricingTemplates = signal<PricingTemplate[]>([]);
  readonly acceptingPools = signal<Pool[]>([]);
  readonly fleeces = signal<IntakeFleeceInput[]>([{ weightKg: 0 }]);

  selectedCustomerId: string | null = null;
  selectedPricingId: string | null = null;
  selectedPoolId: string | null = null;

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
      pricingArrangementId: this.selectedPricingId ?? undefined,
      poolId: this.selectedPoolId ?? undefined,
      fleeces: this.fleeces().map((f) => ({
        weightKg: f.weightKg,
        sourceAnimalName: f.sourceAnimalName,
        breedCode: f.breedCode,
        notes: f.notes,
      })),
    }).subscribe({
      next: (lot) => {
        this.snack.open('Lot created', 'OK', { duration: 2000 });
        this.router.navigate(['/ops/lots', lot.id]);
      },
      error: (e) => {
        this.snack.open('Intake failed: ' + (e?.error?.detail ?? 'unknown'), 'OK');
        this.saving.set(false);
      },
    });
  }
}
