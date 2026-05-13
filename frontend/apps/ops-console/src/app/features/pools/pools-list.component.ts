import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { AuthService } from '@pindraft/auth';
import { Pool, PoolsService } from './services/pools.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'ops-pools-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatTableModule, MatButtonModule, DatePipe],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1 class="page-title">Wool pools</h1>
          <p class="page-subtitle">Many customers contributing to a shared pool; revenue distributed proportionally.</p>
        </div>
        <button mat-flat-button color="primary" routerLink="/pools/new">+ New pool</button>
      </header>

      @if (!loading()) {
        @if (pools().length === 0) {
          <div class="empty">No pools yet. Create one to start accepting contributions.</div>
        } @else {
          <table mat-table [dataSource]="pools()">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Pool</th>
              <td mat-cell *matCellDef="let p">
                <a [routerLink]="['/pools', p.id]">{{ p.name }}</a>
              </td>
            </ng-container>
            <ng-container matColumnDef="kind">
              <th mat-header-cell *matHeaderCellDef>Kind</th>
              <td mat-cell *matCellDef="let p">{{ formatKind(p.kind) }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let p">
                <span class="status" [class]="p.status">{{ p.status }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="revenue">
              <th mat-header-cell *matHeaderCellDef>Revenue</th>
              <td mat-cell *matCellDef="let p">{{ p.totalRevenue ? '$' + p.totalRevenue : '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="created">
              <th mat-header-cell *matHeaderCellDef>Created</th>
              <td mat-cell *matCellDef="let p">{{ p.createdAt | date:'mediumDate' }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols"></tr>
          </table>
        }
      } @else {
        <p>Loading…</p>
      }
    </div>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .empty { padding: 32px; background: #f9fafb; border-radius: 8px; text-align: center; color: #666; }
    table { width: 100%; background: white; }
    a { color: #2563eb; text-decoration: none; font-weight: 500; }
    .status { font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 500; }
    .status.ACCEPTING   { background: #dbeafe; color: #1e40af; }
    .status.CLOSED      { background: #fef3c7; color: #92400e; }
    .status.DISTRIBUTED { background: #d1fae5; color: #065f46; }
  `],
})
export class PoolsListComponent {
  private service = inject(PoolsService);
  private auth = inject(AuthService);

  readonly loading = signal(true);
  readonly pools = signal<Pool[]>([]);
  readonly cols = ['name', 'kind', 'status', 'revenue', 'created'];

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
