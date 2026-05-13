import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '@pindraft/auth';
import { InvoiceDetail, InvoicesService } from './services/invoices.service';

@Component({
  selector: 'ops-invoice-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatCardModule, MatButtonModule, MatTableModule, DatePipe],
  template: `
    <div class="page">
      <a routerLink="/billing/invoices" class="back">← All invoices</a>

      @if (data(); as d) {
        <header class="page-header">
          <div>
            <h1 class="page-title">{{ d.invoice.invoiceNumber }}</h1>
            <p class="page-subtitle">
              <span class="status" [class]="d.invoice.status">{{ d.invoice.status }}</span>
              · created {{ d.invoice.createdAt | date:'medium' }}
              @if (d.invoice.issuedAt) { · issued {{ d.invoice.issuedAt | date:'medium' }} }
              @if (d.invoice.paidAt) { · paid {{ d.invoice.paidAt | date:'medium' }} }
            </p>
          </div>
          <div class="actions">
            @if (d.invoice.status === 'DRAFT') {
              <button mat-flat-button color="primary" (click)="issue()">Issue</button>
            }
            @if (d.invoice.status === 'ISSUED') {
              <button mat-flat-button color="primary" (click)="markPaid()">Mark paid</button>
            }
            @if (d.invoice.status !== 'VOID' && d.invoice.status !== 'PAID') {
              <button mat-stroked-button (click)="voidInvoice()">Void</button>
            }
          </div>
        </header>

        <mat-card>
          <mat-card-content>
            <div class="meta">
              <div><label>Lot</label><a [routerLink]="['/ops/lots', d.invoice.lotId]" class="mono">{{ d.invoice.lotId }}</a></div>
              <div><label>Customer</label><span class="mono">{{ d.invoice.customerId }}</span></div>
              <div><label>Currency</label>{{ d.invoice.currency }}</div>
            </div>

            <h3>Line items</h3>
            <table mat-table [dataSource]="d.lines">
              <ng-container matColumnDef="description">
                <th mat-header-cell *matHeaderCellDef>Description</th>
                <td mat-cell *matCellDef="let l">{{ l.description }}</td>
              </ng-container>
              <ng-container matColumnDef="qty">
                <th mat-header-cell *matHeaderCellDef>Qty</th>
                <td mat-cell *matCellDef="let l">{{ l.quantity }} {{ l.unit }}</td>
              </ng-container>
              <ng-container matColumnDef="unit-price">
                <th mat-header-cell *matHeaderCellDef>Unit price</th>
                <td mat-cell *matCellDef="let l">{{ formatMoney(l.unitPriceCents, d.invoice.currency) }}</td>
              </ng-container>
              <ng-container matColumnDef="total">
                <th mat-header-cell *matHeaderCellDef>Line total</th>
                <td mat-cell *matCellDef="let l"><strong>{{ formatMoney(l.lineTotalCents, d.invoice.currency) }}</strong></td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let row; columns: cols"></tr>
            </table>

            <div class="totals">
              <div><label>Subtotal</label><strong>{{ formatMoney(d.invoice.subtotalCents, d.invoice.currency) }}</strong></div>
              <div class="grand"><label>Total</label><strong>{{ formatMoney(d.invoice.totalCents, d.invoice.currency) }}</strong></div>
            </div>
          </mat-card-content>
        </mat-card>
      } @else {
        <p>Loading…</p>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px 32px; }
    .back { color: #6b7280; font-size: 14px; text-decoration: none; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin: 16px 0 24px; }
    .page-title { margin: 0; font-size: 24px; }
    .page-subtitle { color: #666; margin: 4px 0 0; }
    .actions { display: flex; gap: 8px; }
    .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
    .meta label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; margin-bottom: 2px; }
    .mono { font-family: ui-monospace, monospace; font-size: 13px; }
    h3 { margin: 0 0 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; }
    table { width: 100%; }
    .totals { margin-top: 24px; text-align: right; }
    .totals div { padding: 8px 16px; }
    .totals label { display: inline-block; min-width: 100px; color: #6b7280; }
    .grand { border-top: 2px solid #e5e7eb; margin-top: 8px; font-size: 18px; }
    .status { font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 500; margin-right: 6px; }
    .status.DRAFT  { background: #f3f4f6; color: #4b5563; }
    .status.ISSUED { background: #dbeafe; color: #1e40af; }
    .status.PAID   { background: #d1fae5; color: #065f46; }
    .status.VOID   { background: #fee2e2; color: #991b1b; }
  `],
})
export class InvoiceDetailComponent {
  private service = inject(InvoicesService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);

  readonly data = signal<InvoiceDetail | null>(null);
  readonly cols = ['description', 'qty', 'unit-price', 'total'];

  constructor() {
    this.reload();
  }

  private reload(): void {
    const tid = this.auth.activeTenantId();
    const id = this.route.snapshot.paramMap.get('id');
    if (!tid || !id) return;
    this.service.get(tid, id).subscribe({
      next: (d) => this.data.set(d),
    });
  }

  issue(): void {
    const tid = this.auth.activeTenantId();
    const id = this.route.snapshot.paramMap.get('id');
    if (!tid || !id) return;
    this.service.issue(tid, id).subscribe({
      next: () => { this.snack.open('Invoice issued', 'OK', { duration: 2000 }); this.reload(); },
      error: (e) => this.snack.open('Failed: ' + (e?.error?.detail ?? e?.message ?? 'unknown'), 'OK', { duration: 4000 }),
    });
  }

  markPaid(): void {
    const tid = this.auth.activeTenantId();
    const id = this.route.snapshot.paramMap.get('id');
    if (!tid || !id) return;
    this.service.markPaid(tid, id).subscribe({
      next: () => { this.snack.open('Marked paid', 'OK', { duration: 2000 }); this.reload(); },
    });
  }

  voidInvoice(): void {
    const tid = this.auth.activeTenantId();
    const id = this.route.snapshot.paramMap.get('id');
    if (!tid || !id) return;
    this.service.voidInvoice(tid, id).subscribe({
      next: () => { this.snack.open('Voided', 'OK', { duration: 2000 }); this.reload(); },
    });
  }

  formatMoney(cents: number, currency: string): string {
    const dollars = (cents / 100).toFixed(2);
    return currency === 'USD' ? `$${dollars}` : `${dollars} ${currency}`;
  }
}
