import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@pindraft/auth';
import {
  ButtonComponent, EmptyStateComponent, PageHeaderComponent, TableComponent,
} from '@pindraft/ui';
import { Pool, PoolsService } from './services/pools.service';

@Component({
  selector: 'ops-pools-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, DatePipe,
    ButtonComponent, EmptyStateComponent, PageHeaderComponent, TableComponent,
  ],
  template: `
    <div class="page">
      <pd-page-header
        title="Wool pools"
        subtitle="Many customers contributing to a shared pool; revenue distributed proportionally.">
        <pd-button variant="primary" routerLink="/pools/new">+ New pool</pd-button>
      </pd-page-header>

      @if (!loading()) {
        @if (pools().length === 0) {
          <pd-empty-state
            title="No pools yet"
            description="Create one to start accepting contributions." />
        } @else {
          <pd-table>
            <thead>
              <tr>
                <th>Pool</th>
                <th>Kind</th>
                <th>Status</th>
                <th class="pd-table__num">Revenue</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              @for (p of pools(); track p.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/pools', p.id]">{{ p.name }}</a>
                  </td>
                  <td>{{ formatKind(p.kind) }}</td>
                  <td><span class="status" [class]="p.status">{{ p.status }}</span></td>
                  <td class="pd-table__num">{{ p.totalRevenue ? '$' + p.totalRevenue : '—' }}</td>
                  <td>{{ p.createdAt | date:'mediumDate' }}</td>
                </tr>
              }
            </tbody>
          </pd-table>
        }
      } @else {
        <p class="muted">Loading…</p>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px 32px; }
    .muted { color: var(--pd-color-muted, #6b7280); font-size: 13px; }
    a { color: var(--pd-color-link, #2563eb); text-decoration: none; font-weight: 600; }
    .status { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 600; }
    .status.ACCEPTING   { background: var(--pd-color-info-bg, #dbeafe); color: var(--pd-color-info-text, #1e40af); }
    .status.CLOSED      { background: var(--pd-color-warning-bg, #fef3c7); color: var(--pd-color-warning-text, #92400e); }
    .status.DISTRIBUTED { background: var(--pd-color-success-bg, #d1fae5); color: var(--pd-color-success-text, #065f46); }
  `],
})
export class PoolsListComponent {
  private service = inject(PoolsService);
  private auth = inject(AuthService);

  readonly loading = signal(true);
  readonly pools = signal<Pool[]>([]);

  constructor() {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    this.service.list(tid).subscribe({
      next: (list) => { this.pools.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  formatKind(k: string): string {
    return k.replace('_', ' ').toLowerCase();
  }
}
