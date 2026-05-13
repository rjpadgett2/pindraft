import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Customer, IntakeFleeceInput, Reservation } from '@pindraft/api-client';
import { AuthService } from '@pindraft/auth';
import { forkJoin } from 'rxjs';
import { Pool, PoolsService } from '../pools/services/pools.service';
import { IntakeFleeceTableComponent } from './intake-fleece-table.component';
import { OperationsService } from './services/operations.service';
import { DatePipe } from '@angular/common';

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
    FormsModule, RouterLink,
    MatCardModule, MatButtonModule, MatFormFieldModule, MatSelectModule,
    IntakeFleeceTableComponent, DatePipe
  ],
  template: `
    <div class="page">
      <a routerLink="/ops/reservations" class="back">← Back to reservations</a>

      @if (reservation(); as r) {
        <h1 class="page-title">Receive fiber</h1>
        <p class="page-subtitle">Weigh each fleece, then save to create the lot.</p>

        <mat-card class="context">
          <mat-card-content>
            <div class="context-header">
              <strong>{{ customer()?.displayName ?? '—' }}</strong>
              @if (r.externalSource === 'hirsel') {
                <span class="chip-hirsel">From Hirsel</span>
              }
            </div>
            <div class="context-grid">
              <div><small>Slot</small><div>{{ r.slotStart | date:'mediumDate' }}</div></div>
              <div><small>Expected</small><div>{{ r.expectedWeightKg }} kg</div></div>
              <div><small>Pricing</small><div>{{ r.pricingArrangementId ? 'Set' : 'TBD' }}</div></div>
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
                <mat-option [value]="p.id">{{ p.name }} ({{ formatKind(p.kind) }})</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }

        <h2 class="section">Fleeces</h2>
        <ops-intake-fleece-table [(fleeces)]="fleeces" />

        <div class="actions">
          <button mat-button routerLink="/ops/reservations">Cancel</button>
          <button mat-flat-button color="primary" [disabled]="!canSave() || saving()" (click)="save()">
            {{ saving() ? 'Creating lot…' : 'Save and create lot' }}
          </button>
        </div>
      } @else if (loading()) {
        <p>Loading…</p>
      }
    </div>
  `,
  styles: [`
    .back { display: inline-block; margin-bottom: 12px; font-size: 13px; color: #2563eb; text-decoration: none; }
    .context { margin: 16px 0 24px; }
    .context-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .chip-hirsel { font-size: 11px; padding: 2px 8px; background: #dbeafe; color: #1e40af; border-radius: 4px; }
    .context-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; }
    .context-grid small { color: #666; font-size: 12px; }
    .context-grid div { margin-top: 2px; font-size: 14px; }
    .section { font-size: 14px; font-weight: 500; margin: 16px 0 8px; }
    .pool-select { width: 100%; max-width: 480px; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }
  `],
})
export class IntakeProcessingComponent {
  private ops = inject(OperationsService);
  private pools = inject(PoolsService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly reservation = signal<Reservation | null>(null);
  readonly customer = signal<Customer | null>(null);
  readonly acceptingPools = signal<Pool[]>([]);
  readonly fleeces = signal<IntakeFleeceInput[]>([{ weightKg: 0 }]);

  selectedPoolId: string | null = null;

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
      poolId: this.selectedPoolId ?? undefined,
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
