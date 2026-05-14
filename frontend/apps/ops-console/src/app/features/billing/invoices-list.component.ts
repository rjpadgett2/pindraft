import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@pindraft/auth';
import {
  EmptyStateComponent, MoneyDisplayComponent, PageHeaderComponent, TableComponent,
} from '@pindraft/ui';
import { Invoice, InvoicesService } from './services/invoices.service';

@Component({
  selector: 'ops-invoices-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, DatePipe,
    EmptyStateComponent, MoneyDisplayComponent, PageHeaderComponent, TableComponent,
  ],
  template: `
    <div class="page">
      <pd-page-header
        title="Invoices"
        subtitle="Generated automatically when a lot is marked complete, applying the pricing snapshot frozen at intake." />

      @if (!loading()) {
        @if (invoices().length === 0) {
          <pd-empty-state title="No invoices yet" description="Complete a lot to auto-generate one." />
        } @else {
          <pd-table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Lot</th>
                <th>Status</th>
                <th class="pd-table__num">Total</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              @for (i of invoices(); track i.id) {
                <tr>
                  <td>
                    <a [routerLink]="['/billing/invoices', i.id]">{{ i.invoiceNumber }}</a>
                  </td>
                  <td>
                    <a [routerLink]="['/ops/lots', i.lotId]" class="muted">{{ i.lotId.substring(0, 8) }}…</a>
                  </td>
                  <td><span class="status" [class]="i.status">{{ i.status }}</span></td>
                  <td class="pd-table__num">
                    <pd-money [cents]="i.totalCents" [currency]="i.currency" />
                  </td>
                  <td>{{ i.createdAt | date:'mediumDate' }}</td>
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
    a { color: var(--pd-color-link, #2563eb); text-decoration: none; font-weight: 600; }
    a.muted { color: var(--pd-color-muted, #6b7280); font-family: var(--pd-font-mono, ui-monospace, monospace); font-weight: 400; font-size: 12px; }
    .muted { color: var(--pd-color-muted, #6b7280); font-size: 13px; }
    .status { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 600; }
    .status.DRAFT  { background: #f3f4f6; color: #4b5563; }
    .status.ISSUED { background: var(--pd-color-info-bg, #dbeafe); color: var(--pd-color-info-text, #1e40af); }
    .status.PAID   { background: var(--pd-color-success-bg, #d1fae5); color: var(--pd-color-success-text, #065f46); }
    .status.VOID   { background: var(--pd-color-danger-bg, #fee2e2); color: var(--pd-color-danger-text, #991b1b); text-decoration: line-through; }
  `],
})
export class InvoicesListComponent {
  private service = inject(InvoicesService);
  private auth = inject(AuthService);

  readonly loading = signal(true);
  readonly invoices = signal<Invoice[]>([]);

  constructor() {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    this.service.list(tid).subscribe({
      next: (list) => { this.invoices.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
