import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Customer, QueueEntry, StageQueueSummary } from '@pindraft/api-client';
import { AuthService } from '@pindraft/auth';
import {
  ButtonComponent, CardComponent, EmptyStateComponent,
  PageHeaderComponent, TableComponent,
} from '@pindraft/ui';
import { forkJoin } from 'rxjs';
import { OperationsService, OptimizerEntry } from './services/operations.service';

/**
 * Per-stage queue dashboard. Top-level shows summary cards for every workflow stage
 * with waiting counts. Selecting a stage shows the waiting lots, sorted by dwell time.
 */
@Component({
  selector: 'ops-queue-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ButtonComponent, CardComponent, EmptyStateComponent,
    PageHeaderComponent, TableComponent,
  ],
  template: `
    <div class="page">
      <pd-page-header
        title="Queues"
        subtitle="Lots currently waiting at each stage, sorted by dwell time." />

      @if (!loading()) {
        <div class="summary-grid">
          @for (s of summaries(); track s.stageId) {
            <pd-card class="summary-card"
                [class.selected]="s.stageId === selectedStageId()"
                (click)="select(s.stageId)">
              <small>{{ s.displayName }}</small>
              <div class="count">{{ s.waitingCount }}</div>
              <div class="hint">waiting</div>
            </pd-card>
          }
        </div>

        @if (selectedStageId(); as sid) {
          <div class="queue-header">
            <h2 class="section">{{ selectedStageName() }} queue</h2>
            <div class="view-toggle">
              <button [class.active]="!showOptimizer()" (click)="showOptimizer.set(false)">
                FIFO (by dwell)
              </button>
              <button [class.active]="showOptimizer()" (click)="loadOptimizer()">
                Optimizer suggestion
              </button>
            </div>
          </div>

          @if (showOptimizer()) {
            @if (optimizerEntries().length === 0) {
              <pd-empty-state title="No proposal" description="Queue is empty." />
            } @else {
              <p class="muted">Groups same-breed lots together to minimize equipment changeovers; orders groups by longest-dwell so nothing gets starved. Operator action is canonical.</p>
              <pd-table>
                <thead>
                  <tr>
                    <th class="pd-table__num">#</th>
                    <th>Breed</th>
                    <th>Customer</th>
                    <th class="pd-table__num">Dwell</th>
                    <th>Why</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (e of optimizerEntries(); track e.lotId) {
                    <tr>
                      <td class="pd-table__num"><strong>{{ e.proposedPosition }}</strong></td>
                      <td><span class="chip">{{ e.groupKey }}</span></td>
                      <td>{{ customerName(e.customerId) }}</td>
                      <td class="pd-table__num" [class.long]="e.dwellSeconds > 86400">
                        {{ formatDwell(e.dwellSeconds) }}
                      </td>
                      <td class="muted reasoning">{{ e.reasoning }}</td>
                      <td>
                        <pd-button variant="ghost" size="sm" [routerLink]="['/ops/lots', e.lotId]">Open</pd-button>
                      </td>
                    </tr>
                  }
                </tbody>
              </pd-table>
            }
          } @else if (queueEntries().length === 0) {
            <pd-empty-state title="Nothing waiting" description="This stage has no waiting lots." />
          } @else {
            <pd-table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th class="pd-table__num">Weight</th>
                  <th class="pd-table__num">Dwell</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (e of queueEntries(); track e.lotId) {
                  <tr>
                    <td>{{ customerName(e.customerId) }}</td>
                    <td class="pd-table__num">{{ e.weightInKg }} kg</td>
                    <td class="pd-table__num" [class.long]="e.dwellSeconds > 86400">
                      {{ formatDwell(e.dwellSeconds) }}
                    </td>
                    <td>
                      <pd-button variant="ghost" size="sm" [routerLink]="['/ops/lots', e.lotId]">Open</pd-button>
                    </td>
                  </tr>
                }
              </tbody>
            </pd-table>
          }
        }
      } @else {
        <p class="muted">Loading…</p>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px 32px; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; margin-bottom: 24px; }
    .summary-card { cursor: pointer; transition: all 0.15s; }
    .summary-card:hover { background: var(--pd-color-bg-sunken, #f9fafb); }
    .summary-card.selected { background: var(--pd-color-info-bg, #dbeafe); border-color: var(--pd-brand-accent, #2563eb); border-width: 2px; }
    .summary-card small { color: var(--pd-color-muted, #666); font-size: 12px; }
    .summary-card .count { font-size: 28px; font-weight: 600; line-height: 1; margin: 6px 0; }
    .summary-card .hint { font-size: 11px; color: var(--pd-color-muted, #9ca3af); }
    .section { font-size: 14px; font-weight: 600; margin: 24px 0 12px; color: var(--pd-color-text, #111); }
    .queue-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .view-toggle { display: flex; gap: 4px; border: 1px solid var(--pd-color-border, #e5e7eb); border-radius: 6px; padding: 2px; background: white; }
    .view-toggle button { background: transparent; border: 0; padding: 6px 12px; font-size: 13px; cursor: pointer; border-radius: 4px; color: var(--pd-color-text, #1a1a1a); }
    .view-toggle button.active { background: var(--pd-color-text, #1a1a1a); color: white; }
    .muted { color: var(--pd-color-muted, #6b7280); font-size: 13px; margin: 0 0 8px; }
    .reasoning { font-size: 12px; max-width: 320px; }
    .chip { font-size: 11px; padding: 2px 8px; background: #f3f4f6; border-radius: 4px; font-family: var(--pd-font-mono, ui-monospace, monospace); }
    td.long { color: var(--pd-color-danger-text, #b91c1c); font-weight: 600; }
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
