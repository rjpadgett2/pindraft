import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { AuthService } from '@pindraft/auth';
import { Invoice, InvoicesService } from './services/invoices.service';

@Component({
  selector: 'ops-invoices-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatTableModule, MatButtonModule, DatePipe],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1 class="page-title">Invoices</h1>
          <p class="page-subtitle">Generated automatically when a lot is marked complete, applying the pricing snapshot frozen at intake.</p>
        </div>
      </header>

      @if (!loading()) {
        @if (invoices().length === 0) {
          <div class="empty">No invoices yet. Complete a lot to auto-generate one.</div>
        } @else {
          <table mat-table [dataSource]="invoices()">
            <ng-container matColumnDef="number">
              <th mat-header-cell *matHeaderCellDef>Invoice #</th>
              <td mat-cell *matCellDef="let i">
                <a [routerLink]="['/billing/invoices', i.id]">{{ i.invoiceNumber }}</a>
              </td>
            </ng-container>
            <ng-container matColumnDef="lot">
              <th mat-header-cell *matHeaderCellDef>Lot</th>
              <td mat-cell *matCellDef="let i">
                <a [routerLink]="['/ops/lots', i.lotId]" class="muted">{{ i.lotId.substring(0, 8) }}…</a>
              </td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let i">
                <span class="status" [class]="i.status">{{ i.status }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="total">
              <th mat-header-cell *matHeaderCellDef>Total</th>
              <td mat-cell *matCellDef="let i">{{ formatMoney(i.totalCents, i.currency) }}</td>
            </ng-container>
            <ng-container matColumnDef="created">
              <th mat-header-cell *matHeaderCellDef>Created</th>
              <td mat-cell *matCellDef="let i">{{ i.createdAt | date:'mediumDate' }}</td>
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
    .page { padding: 24px 32px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-title { margin: 0; font-size: 24px; }
    .page-subtitle { color: #666; margin: 4px 0 0; }
    .empty { padding: 32px; background: #f9fafb; border-radius: 8px; text-align: center; color: #666; }
    table { width: 100%; background: white; }
    a { color: #2563eb; text-decoration: none; font-weight: 500; }
    a.muted { color: #6b7280; font-family: ui-monospace, monospace; font-weight: 400; font-size: 12px; }
    .status { font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 500; }
    .status.DRAFT  { background: #f3f4f6; color: #4b5563; }
    .status.ISSUED { background: #dbeafe; color: #1e40af; }
    .status.PAID   { background: #d1fae5; color: #065f46; }
    .status.VOID   { background: #fee2e2; color: #991b1b; text-decoration: line-through; }
  `],
})
export class InvoicesListComponent {
  private service = inject(InvoicesService);
  private auth = inject(AuthService);

  readonly loading = signal(true);
  readonly invoices = signal<Invoice[]>([]);
  readonly cols = ['number', 'lot', 'status', 'total', 'created'];

  constructor() {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    this.service.list(tid).subscribe({
      next: (list) => { this.invoices.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  formatMoney(cents: number, currency: string): string {
    const dollars = (cents / 100).toFixed(2);
    return currency === 'USD' ? `$${dollars}` : `${dollars} ${currency}`;
  }
}
