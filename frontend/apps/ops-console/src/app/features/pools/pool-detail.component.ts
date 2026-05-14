import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '@pindraft/auth';
import {
  ButtonComponent, CardComponent, EmptyStateComponent,
  InputComponent, PageHeaderComponent, SnackbarService, TableComponent,
} from '@pindraft/ui';
import { OperationsService } from '../operations/services/operations.service';
import { PoolDetail, PoolsService } from './services/pools.service';

/**
 * Pool detail: shows summary, contributions table, computed shares table.
 * Inline actions for ACCEPTING state (add contribution, close pool); for CLOSED
 * state (record revenue and distribute); for DISTRIBUTED state (read-only).
 */
@Component({
  selector: 'ops-pool-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, RouterLink,
    ButtonComponent, CardComponent, EmptyStateComponent,
    InputComponent, PageHeaderComponent, TableComponent,
  ],
  template: `
    <div class="page">
      <a routerLink="/pools" class="back">← Back to pools</a>

      @if (detail(); as d) {
        <pd-page-header [title]="d.pool.name" />
        <p class="meta">
          <span class="status" [class]="d.pool.status">{{ d.pool.status }}</span>
          • {{ formatKind(d.pool.kind) }}
          @if (d.pool.description) { • {{ d.pool.description }} }
        </p>

        <div class="summary">
          <pd-card>
            <small>Total weight</small>
            <div class="big">{{ totalWeight() }} kg</div>
          </pd-card>
          <pd-card>
            <small>Contributors</small>
            <div class="big">{{ d.contributions.length }}</div>
          </pd-card>
          @if (d.pool.totalRevenue) {
            <pd-card variant="accent">
              <small>Total revenue</small>
              <div class="big">\${{ d.pool.totalRevenue }}</div>
            </pd-card>
          }
        </div>

        <h2 class="section">Contributions</h2>
        @if (d.contributions.length === 0) {
          <pd-empty-state title="No contributions yet" description="Add the first contributor below." />
        } @else {
          <pd-table>
            <thead>
              <tr>
                <th>Contributor</th>
                <th class="pd-table__num">Weight</th>
                <th class="pd-table__num">Share</th>
                <th class="pd-table__num">Owed</th>
              </tr>
            </thead>
            <tbody>
              @for (s of d.shares; track s.customerId) {
                <tr>
                  <td>{{ s.customerDisplayName }}</td>
                  <td class="pd-table__num">{{ s.weightKg }} kg</td>
                  <td class="pd-table__num">{{ s.sharePercent }}%</td>
                  <td class="pd-table__num">{{ s.amountOwed ? '$' + s.amountOwed : '—' }}</td>
                </tr>
              }
            </tbody>
          </pd-table>
        }

        @if (d.pool.status === 'ACCEPTING') {
          <h2 class="section">Add a contribution</h2>
          <pd-card variant="sunken">
            <div class="form">
              <pd-input class="grow" label="Customer name" [(ngModel)]="newName" />
              <pd-input class="grow" label="Customer ID (UUID)" [(ngModel)]="newCustomerId" />
              <pd-input label="Weight (kg)" type="number" [(ngModel)]="newWeight" />
              <pd-button variant="primary" [disabled]="!canAddContribution()" (click)="addContribution()">
                Add
              </pd-button>
            </div>
          </pd-card>

          <div class="state-actions">
            <pd-button variant="secondary" (click)="close()">Close pool — no more contributions</pd-button>
          </div>
        }

        @if (d.pool.status === 'CLOSED' && d.contributions.length > 0) {
          <h2 class="section">Process into a lot</h2>
          <p class="muted">Combines all contributions into a single pooled lot at INTAKE. MERGE lineage rows are written for any contributions that carry an upstream source lot.</p>
          <div class="state-actions">
            <pd-button variant="primary"
                    [disabled]="processing()" (click)="processIntoLot()">
              {{ processing() ? 'Creating pooled lot…' : 'Create pooled lot' }}
            </pd-button>
          </div>
        }

        @if (d.pool.status === 'CLOSED') {
          <h2 class="section">Settle the pool</h2>
          <p class="muted">Record total revenue and compute distributions.</p>
          <div class="settle-row">
            <pd-input label="Total revenue ($)" type="number" [(ngModel)]="totalRevenue" />
            <pd-button variant="primary" [disabled]="!totalRevenue || totalRevenue <= 0" (click)="distribute()">
              Distribute
            </pd-button>
          </div>
        }
      } @else if (loading()) {
        <p class="muted">Loading…</p>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px 32px; }
    .back { display: inline-block; margin-bottom: 12px; font-size: 13px; color: var(--pd-color-link, #2563eb); text-decoration: none; }
    .meta { margin: -16px 0 16px; font-size: 13px; color: var(--pd-color-muted, #6b7280); }
    .status { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 600; margin-right: 6px; }
    .status.ACCEPTING { background: var(--pd-color-info-bg, #dbeafe); color: var(--pd-color-info-text, #1e40af); }
    .status.CLOSED { background: var(--pd-color-warning-bg, #fef3c7); color: var(--pd-color-warning-text, #92400e); }
    .status.DISTRIBUTED { background: var(--pd-color-success-bg, #d1fae5); color: var(--pd-color-success-text, #065f46); }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin: 16px 0 24px; }
    .summary small { color: var(--pd-color-muted, #6b7280); font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px; }
    .summary .big { font-size: 22px; font-weight: 600; margin-top: 4px; color: var(--pd-color-text, #111); }
    .section { font-size: 14px; font-weight: 600; margin: 24px 0 12px; color: var(--pd-color-text, #111); }
    .muted { color: var(--pd-color-muted, #6b7280); font-size: 13px; }
    .form { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
    .form .grow { flex: 1; min-width: 180px; }
    .state-actions { margin-top: 16px; }
    .settle-row { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
  `],
})
export class PoolDetailComponent {
  private service = inject(PoolsService);
  private ops = inject(OperationsService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snack = inject(SnackbarService);

  readonly loading = signal(true);
  readonly processing = signal(false);
  readonly detail = signal<PoolDetail | null>(null);

  newName = '';
  newCustomerId = '';
  newWeight = 0;
  totalRevenue = 0;

  constructor() { this.refresh(); }

  totalWeight(): string {
    const d = this.detail();
    if (!d) return '0';
    return d.contributions.reduce((sum, c) => sum + Number(c.weightKg), 0).toFixed(2);
  }

  canAddContribution(): boolean {
    return this.newName.trim().length > 0 && this.newCustomerId.trim().length > 0 && this.newWeight > 0;
  }

  formatKind(k: string): string {
    return k.replace('_', ' ').toLowerCase();
  }

  private refresh(): void {
    const tid = this.auth.activeTenantId();
    const id = this.route.snapshot.paramMap.get('id');
    if (!tid || !id) return;
    this.loading.set(true);
    this.service.getOne(tid, id).subscribe({
      next: (d) => { this.detail.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  addContribution(): void {
    const tid = this.auth.activeTenantId();
    const id = this.detail()?.pool.id;
    if (!tid || !id) return;
    this.service.contribute(tid, id, {
      customerId: this.newCustomerId.trim(),
      customerDisplayName: this.newName.trim(),
      weightKg: this.newWeight,
    }).subscribe({
      next: () => {
        this.snack.show('Contribution recorded', { durationMs: 1500 });
        this.newName = ''; this.newCustomerId = ''; this.newWeight = 0;
        this.refresh();
      },
      error: (e) => this.snack.show('Failed: ' + (e?.error?.detail ?? 'unknown')),
    });
  }

  close(): void {
    const tid = this.auth.activeTenantId();
    const id = this.detail()?.pool.id;
    if (!tid || !id) return;
    this.service.close(tid, id).subscribe({
      next: () => { this.snack.show('Pool closed', { durationMs: 1500 }); this.refresh(); },
      error: (e) => this.snack.show('Failed: ' + (e?.error?.detail ?? 'unknown')),
    });
  }

  distribute(): void {
    const tid = this.auth.activeTenantId();
    const id = this.detail()?.pool.id;
    if (!tid || !id) return;
    this.service.distribute(tid, id, this.totalRevenue).subscribe({
      next: () => { this.snack.show('Distributed', { durationMs: 1500 }); this.refresh(); },
      error: (e) => this.snack.show('Failed: ' + (e?.error?.detail ?? 'unknown')),
    });
  }

  processIntoLot(): void {
    const tid = this.auth.activeTenantId();
    const id = this.detail()?.pool.id;
    if (!tid || !id) return;
    this.processing.set(true);
    this.ops.intakeFromPool(tid, id).subscribe({
      next: (lot) => {
        this.snack.show('Pooled lot created', { durationMs: 2000 });
        this.router.navigate(['/ops/lots', lot.id]);
      },
      error: (e) => {
        this.snack.show('Failed: ' + (e?.error?.detail ?? 'unknown'));
        this.processing.set(false);
      },
    });
  }
}
