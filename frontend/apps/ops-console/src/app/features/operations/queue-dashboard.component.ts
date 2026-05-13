import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { Customer, QueueEntry, StageQueueSummary } from '@pindraft/api-client';
import { AuthService } from '@pindraft/auth';
import { forkJoin, switchMap } from 'rxjs';
import { OperationsService, OptimizerEntry } from './services/operations.service';

/**
 * Per-stage queue dashboard. Top-level shows summary cards for every workflow stage
 * with waiting counts. Selecting a stage shows the waiting lots, sorted by dwell time.
 */
@Component({
  selector: 'ops-queue-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCardModule, MatButtonModule, MatTableModule, RouterLink],
  template: `
    <div class="page">
      <h1 class="page-title">Queues</h1>
      <p class="page-subtitle">Lots currently waiting at each stage, sorted by dwell time.</p>

      @if (!loading()) {
        <div class="summary-grid">
          @for (s of summaries(); track s.stageId) {
            <mat-card class="summary-card"
                [class.selected]="s.stageId === selectedStageId()"
                (click)="select(s.stageId)">
              <mat-card-content>
                <small>{{ s.displayName }}</small>
                <div class="count">{{ s.waitingCount }}</div>
                <div class="hint">waiting</div>
              </mat-card-content>
            </mat-card>
          }
        </div>

        @if (selectedStageId(); as sid) {
          <div class="queue-header">
            <h2 class="section">{{ selectedStageName() }} queue</h2>
            <div class="view-toggle">
              <button mat-button [class.active]="!showOptimizer()" (click)="showOptimizer.set(false)">
                FIFO (by dwell)
              </button>
              <button mat-button [class.active]="showOptimizer()" (click)="loadOptimizer()">
                Optimizer suggestion
              </button>
            </div>
          </div>

          @if (showOptimizer()) {
            @if (optimizerEntries().length === 0) {
              <div class="empty">No proposal — queue is empty.</div>
            } @else {
              <p class="muted">Groups same-breed lots together to minimize equipment changeovers; orders groups by longest-dwell so nothing gets starved. Operator action is canonical.</p>
              <table mat-table [dataSource]="optimizerEntries()">
                <ng-container matColumnDef="pos">
                  <th mat-header-cell *matHeaderCellDef>#</th>
                  <td mat-cell *matCellDef="let e"><strong>{{ e.proposedPosition }}</strong></td>
                </ng-container>
                <ng-container matColumnDef="group">
                  <th mat-header-cell *matHeaderCellDef>Breed</th>
                  <td mat-cell *matCellDef="let e"><span class="chip">{{ e.groupKey }}</span></td>
                </ng-container>
                <ng-container matColumnDef="customer">
                  <th mat-header-cell *matHeaderCellDef>Customer</th>
                  <td mat-cell *matCellDef="let e">{{ customerName(e.customerId) }}</td>
                </ng-container>
                <ng-container matColumnDef="dwell">
                  <th mat-header-cell *matHeaderCellDef>Dwell</th>
                  <td mat-cell *matCellDef="let e" [class.long]="e.dwellSeconds > 86400">
                    {{ formatDwell(e.dwellSeconds) }}
                  </td>
                </ng-container>
                <ng-container matColumnDef="reasoning">
                  <th mat-header-cell *matHeaderCellDef>Why</th>
                  <td mat-cell *matCellDef="let e" class="muted reasoning">{{ e.reasoning }}</td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let e">
                    <a mat-stroked-button [routerLink]="['/ops/lots', e.lotId]">Open</a>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="optCols"></tr>
                <tr mat-row *matRowDef="let row; columns: optCols"></tr>
              </table>
            }
          } @else if (queueEntries().length === 0) {
            <div class="empty">Nothing waiting at this stage.</div>
          } @else {
            <table mat-table [dataSource]="queueEntries()">
              <ng-container matColumnDef="customer">
                <th mat-header-cell *matHeaderCellDef>Customer</th>
                <td mat-cell *matCellDef="let e">{{ customerName(e.customerId) }}</td>
              </ng-container>
              <ng-container matColumnDef="weight">
                <th mat-header-cell *matHeaderCellDef>Weight</th>
                <td mat-cell *matCellDef="let e">{{ e.weightInKg }} kg</td>
              </ng-container>
              <ng-container matColumnDef="dwell">
                <th mat-header-cell *matHeaderCellDef>Dwell</th>
                <td mat-cell *matCellDef="let e" [class.long]="e.dwellSeconds > 86400">
                  {{ formatDwell(e.dwellSeconds) }}
                </td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let e">
                  <a mat-stroked-button [routerLink]="['/ops/lots', e.lotId]">Open</a>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let row; columns: cols"></tr>
            </table>
          }
        }
      } @else {
        <p>Loading…</p>
      }
    </div>
  `,
  styles: [`
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; margin-bottom: 24px; }
    .summary-card { cursor: pointer; transition: all 0.15s; }
    .summary-card:hover { background: #f9fafb; }
    .summary-card.selected { background: #dbeafe; border: 2px solid #2563eb; }
    .summary-card small { color: #666; font-size: 12px; }
    .summary-card .count { font-size: 28px; font-weight: 500; line-height: 1; margin: 6px 0; }
    .summary-card .hint { font-size: 11px; color: #9ca3af; }
    .section { font-size: 14px; font-weight: 500; margin: 24px 0 12px; }
    .queue-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .view-toggle { display: flex; gap: 4px; border: 1px solid #e5e7eb; border-radius: 6px; padding: 2px; }
    .view-toggle button.active { background: #1a1a1a; color: white; }
    .muted { color: #6b7280; font-size: 13px; margin: 0 0 8px; }
    .reasoning { font-size: 12px; max-width: 320px; }
    .chip { font-size: 11px; padding: 2px 8px; background: #f3f4f6; border-radius: 4px; font-family: ui-monospace, monospace; }
    .empty { padding: 32px; background: #f9fafb; border-radius: 8px; text-align: center; color: #666; }
    table { width: 100%; background: white; }
    td.long { color: #b91c1c; font-weight: 500; }
  `],
})
export class QueueDashboardComponent {
  private ops = inject(OperationsService);
  private auth = inject(AuthService);

  readonly loading = signal(true);
  readonly summaries = signal<StageQueueSummary[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly queueEntries = signal<QueueEntry[]>([]);
  readonly optimizerEntries = signal<OptimizerEntry[]>([]);
  readonly showOptimizer = signal(false);
  readonly selectedStageId = signal<string | null>(null);
  readonly cols = ['customer', 'weight', 'dwell', 'actions'];
  readonly optCols = ['pos', 'group', 'customer', 'dwell', 'reasoning', 'actions'];

  readonly selectedStageName = computed(() =>
    this.summaries().find((s) => s.stageId === this.selectedStageId())?.displayName ?? ''
  );

  constructor() {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    forkJoin({
      summaries: this.ops.listQueueSummaries(tid),
      customers: this.ops.listCustomers(tid),
    }).subscribe({
      next: ({ summaries, customers }) => {
        this.summaries.set(summaries);
        this.customers.set(customers);
        this.loading.set(false);
        // Auto-select first stage with waiting lots
        const firstNonEmpty = summaries.find((s) => s.waitingCount > 0);
        if (firstNonEmpty) this.select(firstNonEmpty.stageId);
      },
      error: () => this.loading.set(false),
    });
  }

  select(stageId: string): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    this.selectedStageId.set(stageId);
    this.showOptimizer.set(false);
    this.ops.queueForStage(tid, stageId).subscribe({
      next: (entries) => this.queueEntries.set(entries),
    });
  }

  loadOptimizer(): void {
    const tid = this.auth.activeTenantId();
    const sid = this.selectedStageId();
    if (!tid || !sid) return;
    this.showOptimizer.set(true);
    this.ops.optimizerProposal(tid, sid).subscribe({
      next: (entries) => this.optimizerEntries.set(entries),
    });
  }

  customerName(customerId: string): string {
    return this.customers().find((c) => c.id === customerId)?.displayName ?? '—';
  }

  formatDwell(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
  }
}
