import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  EmptyStateComponent, PageHeaderComponent, TableComponent,
} from '@pindraft/ui';
import { CustomerLot, CustomerLotsService } from './services/customer.service';

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
  imports: [
    RouterLink, DatePipe,
    EmptyStateComponent, PageHeaderComponent, TableComponent,
  ],
  template: `
    <div class="page">
      <pd-page-header
        title="My fiber"
        subtitle="Every lot you've shipped, across every mill you work with." />

      @if (!loading()) {
        @if (lots().length === 0) {
          <pd-empty-state
            title="Nothing here yet"
            description="Once a mill receives your fiber, it'll show up here." />
        } @else {
          @for (group of groupedByTenant(); track group.tenantId) {
            <h2 class="tenant-group">Mill {{ group.tenantId.substring(0, 8) }}</h2>
            <pd-table>
              <thead>
                <tr>
                  <th>Lot</th>
                  <th class="pd-table__num">Intake</th>
                  <th>Status</th>
                  <th>Received</th>
                </tr>
              </thead>
              <tbody>
                @for (lot of group.lots; track lot.id) {
                  <tr>
                    <td>
                      <a [routerLink]="['/lots', lot.id]">{{ lot.id.substring(0, 8) }}</a>
                    </td>
                    <td class="pd-table__num">{{ lot.weightIntakeKg }} kg</td>
                    <td><span class="status" [class]="lot.status">{{ lot.status }}</span></td>
                    <td>{{ lot.createdAt | date:'mediumDate' }}</td>
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
    .muted { color: var(--pd-color-muted, #6b7280); font-size: 13px; }
    .tenant-group { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--pd-color-muted, #666); margin: 24px 0 8px; font-weight: 600; }
    a { color: var(--pd-color-link, #2563eb); text-decoration: none; font-family: var(--pd-font-mono, ui-monospace, monospace); }
    .status { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 600; }
    .status.ACTIVE    { background: var(--pd-color-info-bg, #dbeafe); color: var(--pd-color-info-text, #1e40af); }
    .status.COMPLETED { background: var(--pd-color-success-bg, #d1fae5); color: var(--pd-color-success-text, #065f46); }
    .status.CANCELLED { background: #e5e7eb; color: #374151; }
  `],
})
export class MyLotsComponent {
  private service = inject(CustomerLotsService);

  readonly loading = signal(true);
  readonly lots = signal<CustomerLot[]>([]);

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
