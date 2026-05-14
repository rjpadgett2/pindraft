import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Customer, IntakeFleeceInput, Reservation } from '@pindraft/api-client';
import { AuthService } from '@pindraft/auth';
import {
  ButtonComponent, CardComponent, KeyValueGridComponent, KvComponent,
  PageHeaderComponent, SelectComponent, SelectOption, SnackbarService,
  StatusChipComponent,
} from '@pindraft/ui';
import { forkJoin } from 'rxjs';
import { Pool, PoolsService } from '../pools/services/pools.service';
import { IntakeFleeceTableComponent } from './intake-fleece-table.component';
import { OperationsService } from './services/operations.service';

/**
 * Intake processing — the workhorse. When fiber arrives:
 * 1. Confirm the reservation context (customer, expected weight, processing).
 * 2. Optionally attach to a pool (if this fiber is part of a collective).
 * 3. Enter per-fleece weights.
 * 4. Save → intake transaction creates the lot.
 */
@Component({
  selector: 'ops-intake-processing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, RouterLink, DatePipe,
    ButtonComponent, CardComponent, KeyValueGridComponent, KvComponent,
    PageHeaderComponent, SelectComponent, StatusChipComponent,
    IntakeFleeceTableComponent,
  ],
  template: `
    <div class="page">
      <a routerLink="/ops/reservations" class="back">← Back to reservations</a>

      @if (reservation(); as r) {
        <pd-page-header title="Receive fiber" subtitle="Weigh each fleece, then save to create the lot." />

        <pd-card class="context">
          <div class="context-header">
            <strong>{{ customer()?.displayName ?? '—' }}</strong>
            @if (r.externalSource === 'hirsel') {
              <pd-status-chip label="From Hirsel" tone="info" />
            }
          </div>
          <pd-key-value-grid>
            <pd-kv label="Slot">{{ r.slotStart | date:'mediumDate' }}</pd-kv>
            <pd-kv label="Expected">{{ r.expectedWeightKg }} kg</pd-kv>
            <pd-kv label="Pricing">{{ r.pricingArrangementId ? 'Set' : 'TBD' }}</pd-kv>
          </pd-key-value-grid>
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
          <pd-button variant="primary" [disabled]="!canSave() || saving()" (click)="save()">
            {{ saving() ? 'Creating lot…' : 'Save and create lot' }}
          </pd-button>
        </div>
      } @else if (loading()) {
        <p class="muted">Loading…</p>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px 32px; }
    .back { display: inline-block; margin-bottom: 12px; font-size: 13px; color: var(--pd-color-link, #2563eb); text-decoration: none; }
    .context { margin: 16px 0 24px; }
    .context-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; font-size: 16px; }
    .section { font-size: 14px; font-weight: 600; margin: 24px 0 8px; color: var(--pd-color-text, #111); }
    .pool-select { display: block; max-width: 480px; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }
    .muted { color: var(--pd-color-muted, #6b7280); font-size: 13px; }
  `],
})
export class IntakeProcessingComponent {
  private ops = inject(OperationsService);
  private pools = inject(PoolsService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snack = inject(SnackbarService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly reservation = signal<Reservation | null>(null);
  readonly customer = signal<Customer | null>(null);
  readonly acceptingPools = signal<Pool[]>([]);
  readonly fleeces = signal<IntakeFleeceInput[]>([{ weightKg: 0 }]);

  readonly poolOptions = computed<SelectOption[]>(() => [
    { value: '', label: '— Not part of a pool —' },
    ...this.acceptingPools().map((p) => ({
      value: p.id,
      label: `${p.name} (${this.formatKind(p.kind)})`,
    })),
  ]);

  selectedPoolId = '';

  constructor() {
    const tid = this.auth.activeTenantId();
    const id = this.route.snapshot.paramMap.get('id');
    if (!tid || !id) return;

    forkJoin({
      reservation: this.ops.getReservation(tid, id),
      customers: this.ops.listCustomers(tid),
      pools: this.pools.listAccepting(tid),
    }).subscribe({
      next: ({ reservation, customers, pools }) => {
        this.reservation.set(reservation);
        this.customer.set(customers.find((c) => c.id === reservation.customerId) ?? null);
        this.acceptingPools.set(pools);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  canSave(): boolean {
    return this.fleeces().every((f) => f.weightKg > 0);
  }

  formatKind(k: string): string {
    return k.replace('_', ' ').toLowerCase();
  }

  save(): void {
    const tid = this.auth.activeTenantId();
    const r = this.reservation();
    if (!tid || !r) return;
    this.saving.set(true);
    this.ops.intake(tid, {
      reservationId: r.id,
      fleeces: this.fleeces(),
      poolId: this.selectedPoolId || undefined,
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
