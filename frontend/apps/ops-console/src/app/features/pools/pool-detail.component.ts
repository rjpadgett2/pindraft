import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '@pindraft/auth';
import { Router } from '@angular/router';
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
    MatCardModule, MatTableModule, MatButtonModule,
    MatFormFieldModule, MatInputModule,
  ],
  template: `
    <div class="page">
      <a routerLink="/pools" class="back">← Back to pools</a>

      @if (detail(); as d) {
        <header class="page-header">
          <div>
            <h1 class="page-title">{{ d.pool.name }}</h1>
            <p class="page-subtitle">
              <span class="status" [class]="d.pool.status">{{ d.pool.status }}</span>
              • {{ formatKind(d.pool.kind) }}
              @if (d.pool.description) { • {{ d.pool.description }} }
            </p>
          </div>
        </header>

        <div class="summary">
          <mat-card><mat-card-content>
            <small>Total weight</small>
            <div class="big">{{ totalWeight() }} kg</div>
          </mat-card-content></mat-card>
          <mat-card><mat-card-content>
            <small>Contributors</small>
            <div class="big">{{ d.contributions.length }}</div>
          </mat-card-content></mat-card>
          @if (d.pool.totalRevenue) {
            <mat-card><mat-card-content>
              <small>Total revenue</small>
              <div class="big">\${{ d.pool.totalRevenue }}</div>
            </mat-card-content></mat-card>
          }
        </div>

        <h2 class="section">Contributions</h2>
        @if (d.contributions.length === 0) {
          <p class="muted">No contributions yet.</p>
        } @else {
          <table mat-table [dataSource]="d.shares" class="shares-table">
            <ng-container matColumnDef="customer">
              <th mat-header-cell *matHeaderCellDef>Contributor</th>
              <td mat-cell *matCellDef="let s">{{ s.customerDisplayName }}</td>
            </ng-container>
            <ng-container matColumnDef="weight">
              <th mat-header-cell *matHeaderCellDef>Weight</th>
              <td mat-cell *matCellDef="let s">{{ s.weightKg }} kg</td>
            </ng-container>
            <ng-container matColumnDef="share">
              <th mat-header-cell *matHeaderCellDef>Share</th>
              <td mat-cell *matCellDef="let s">{{ s.sharePercent }}%</td>
            </ng-container>
            <ng-container matColumnDef="amount">
              <th mat-header-cell *matHeaderCellDef>Owed</th>
              <td mat-cell *matCellDef="let s">{{ s.amountOwed ? '$' + s.amountOwed : '—' }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="shareCols"></tr>
            <tr mat-row *matRowDef="let row; columns: shareCols"></tr>
          </table>
        }

        @if (d.pool.status === 'ACCEPTING') {
          <h2 class="section">Add a contribution</h2>
          <div class="form">
            <mat-form-field appearance="outline">
              <mat-label>Customer name</mat-label>
              <input matInput [(ngModel)]="newName" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Customer ID (UUID)</mat-label>
              <input matInput [(ngModel)]="newCustomerId" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Weight (kg)</mat-label>
              <input matInput type="number" min="0" step="0.1" [(ngModel)]="newWeight" />
            </mat-form-field>
            <button mat-flat-button color="primary" [disabled]="!canAddContribution()" (click)="addContribution()">
              Add
            </button>
          </div>

          <div class="state-actions">
            <button mat-stroked-button (click)="close()">Close pool — no more contributions</button>
          </div>
        }

        @if (d.pool.status === 'CLOSED' && d.contributions.length > 0) {
          <h2 class="section">Process into a lot</h2>
          <p class="muted">Combines all contributions into a single pooled lot at INTAKE. MERGE lineage rows are written for any contributions that carry an upstream source lot.</p>
          <div class="state-actions">
            <button mat-flat-button color="primary"
                    [disabled]="processing()" (click)="processIntoLot()">
              {{ processing() ? 'Creating pooled lot…' : 'Create pooled lot' }}
            </button>
          </div>
        }

        @if (d.pool.status === 'CLOSED') {
          <h2 class="section">Settle the pool</h2>
          <p class="muted">Record total revenue and compute distributions.</p>
          <div class="settle-row">
            <mat-form-field appearance="outline">
              <mat-label>Total revenue ($)</mat-label>
              <input matInput type="number" min="0" step="0.01" [(ngModel)]="totalRevenue" />
            </mat-form-field>
            <button mat-flat-button color="primary" [disabled]="!totalRevenue || totalRevenue <= 0" (click)="distribute()">
              Distribute
            </button>
          </div>
        }
      } @else if (loading()) {
        <p>Loading…</p>
      }
    </div>
  `,
  styles: [`
    .back { display: inline-block; margin-bottom: 12px; font-size: 13px; color: #2563eb; text-decoration: none; }
    .page-header { margin-bottom: 16px; }
    .status { font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 500; }
    .status.ACCEPTING { background: #dbeafe; color: #1e40af; }
    .status.CLOSED { background: #fef3c7; color: #92400e; }
    .status.DISTRIBUTED { background: #d1fae5; color: #065f46; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin: 16px 0 24px; }
    .summary small { color: #666; font-size: 12px; }
    .summary .big { font-size: 22px; font-weight: 500; margin-top: 4px; }
    .section { font-size: 14px; font-weight: 500; margin: 24px 0 12px; }
    .muted { color: #9ca3af; font-size: 13px; }
    .shares-table { width: 100%; background: white; margin-bottom: 16px; }
    .form { display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap; background: #f9fafb; padding: 16px; border-radius: 8px; }
    .form mat-form-field { min-width: 180px; }
    .state-actions { margin-top: 16px; }
    .settle-row { display: flex; gap: 12px; align-items: flex-start; }
  `],
})
export class PoolDetailComponent {
  private service = inject(PoolsService);
  private ops = inject(OperationsService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly processing = signal(false);
  readonly detail = signal<PoolDetail | null>(null);
  readonly shareCols = ['customer', 'weight', 'share', 'amount'];

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
        this.snack.open('Contribution recorded', 'OK', { duration: 1500 });
        this.newName = ''; this.newCustomerId = ''; this.newWeight = 0;
        this.refresh();
      },
      error: (e) => this.snack.open('Failed: ' + (e?.error?.detail ?? 'unknown'), 'OK'),
    });
  }

  close(): void {
    const tid = this.auth.activeTenantId();
    const id = this.detail()?.pool.id;
    if (!tid || !id) return;
    this.service.close(tid, id).subscribe({
      next: () => { this.snack.open('Pool closed', 'OK', { duration: 1500 }); this.refresh(); },
      error: (e) => this.snack.open('Failed: ' + (e?.error?.detail ?? 'unknown'), 'OK'),
    });
  }

  distribute(): void {
    const tid = this.auth.activeTenantId();
    const id = this.detail()?.pool.id;
    if (!tid || !id) return;
    this.service.distribute(tid, id, this.totalRevenue).subscribe({
      next: () => { this.snack.open('Distributed', 'OK', { duration: 1500 }); this.refresh(); },
      error: (e) => this.snack.open('Failed: ' + (e?.error?.detail ?? 'unknown'), 'OK'),
    });
  }

  processIntoLot(): void {
    const tid = this.auth.activeTenantId();
    const id = this.detail()?.pool.id;
    if (!tid || !id) return;
    this.processing.set(true);
    this.ops.intakeFromPool(tid, id).subscribe({
      next: (lot) => {
        this.snack.open('Pooled lot created', 'OK', { duration: 2000 });
        this.router.navigate(['/ops/lots', lot.id]);
      },
      error: (e) => {
        this.snack.open('Failed: ' + (e?.error?.detail ?? 'unknown'), 'OK');
        this.processing.set(false);
      },
    });
  }
}
