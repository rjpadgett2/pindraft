import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { CustomerLot, CustomerLotsService } from './services/customer.service';
import { DatePipe } from '@angular/common';

/**
 * The shepherd's home. Lists every lot of theirs across every mill — the
 * cross-tenant view that's the customer portal's reason to exist.
 *
 * Grouped by tenant when there are multiple. Status chips and weight per lot.
 */
@Component({
  selector: 'customer-my-lots',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatCardModule, MatButtonModule, MatTableModule, DatePipe],
  template: `
    <div class="page">
      <h1 class="page-title">My fiber</h1>
      <p class="page-subtitle">Every lot you've shipped, across every mill you work with.</p>

      @if (!loading()) {
        @if (lots().length === 0) {
          <div class="empty">
            <p>Nothing here yet. Once a mill receives your fiber, it'll show up here.</p>
          </div>
        } @else {
          @for (group of groupedByTenant(); track group.tenantId) {
            <h2 class="tenant-group">Mill {{ group.tenantId.substring(0, 8) }}</h2>
            <table mat-table [dataSource]="group.lots">
              <ng-container matColumnDef="lot">
                <th mat-header-cell *matHeaderCellDef>Lot</th>
                <td mat-cell *matCellDef="let lot">
                  <a [routerLink]="['/lots', lot.id]">{{ lot.id.substring(0, 8) }}</a>
                </td>
              </ng-container>
              <ng-container matColumnDef="weight">
                <th mat-header-cell *matHeaderCellDef>Intake</th>
                <td mat-cell *matCellDef="let lot">{{ lot.weightIntakeKg }} kg</td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let lot">
                  <span class="status" [class]="lot.status">{{ lot.status }}</span>
                </td>
              </ng-container>
              <ng-container matColumnDef="created">
                <th mat-header-cell *matHeaderCellDef>Received</th>
                <td mat-cell *matCellDef="let lot">{{ lot.createdAt | date:'mediumDate' }}</td>
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
    .empty { padding: 32px; background: #f9fafb; border-radius: 8px; text-align: center; color: #666; }
    .tenant-group { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #666; margin: 24px 0 8px; font-weight: 500; }
    table { width: 100%; background: white; margin-bottom: 16px; }
    a { color: #2563eb; text-decoration: none; font-family: monospace; }
    .status { font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 500; }
    .status.ACTIVE    { background: #dbeafe; color: #1e40af; }
    .status.COMPLETED { background: #d1fae5; color: #065f46; }
    .status.CANCELLED { background: #e5e7eb; color: #374151; }
  `],
})
export class MyLotsComponent {
  private service = inject(CustomerLotsService);

  readonly loading = signal(true);
  readonly lots = signal<CustomerLot[]>([]);
  readonly cols = ['lot', 'weight', 'status', 'created'];

  /** Group lots by tenant for display. */
  readonly groupedByTenant = computed(() => {
    const groups = new Map<string, CustomerLot[]>();
    for (const lot of this.lots()) {
      const list = groups.get(lot.tenantId) ?? [];
      list.push(lot);
      groups.set(lot.tenantId, list);
    }
    return Array.from(groups.entries()).map(([tenantId, lots]) => ({ tenantId, lots }));
  });

  constructor() {
    this.service.listMyLots().subscribe({
      next: (list) => { this.lots.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
