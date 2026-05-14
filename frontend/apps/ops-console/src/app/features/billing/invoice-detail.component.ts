import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '@pindraft/auth';
import {
  ButtonComponent, CardComponent, KeyValueGridComponent, KvComponent,
  MoneyDisplayComponent, PageHeaderComponent, SnackbarService, TableComponent,
} from '@pindraft/ui';
import { InvoiceDetail, InvoicesService } from './services/invoices.service';

@Component({
  selector: 'ops-invoice-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, DatePipe,
    ButtonComponent, CardComponent, KeyValueGridComponent, KvComponent,
    MoneyDisplayComponent, PageHeaderComponent, TableComponent,
  ],
  template: `
    <div class="page">
      <a routerLink="/billing/invoices" class="back">← All invoices</a>

      @if (data(); as d) {
        <pd-page-header [title]="d.invoice.invoiceNumber">
          @if (d.invoice.status === 'DRAFT') {
            <pd-button variant="primary" (click)="issue()">Issue</pd-button>
          }
          @if (d.invoice.status === 'ISSUED') {
            <pd-button variant="primary" (click)="markPaid()">Mark paid</pd-button>
          }
          @if (d.invoice.status !== 'VOID' && d.invoice.status !== 'PAID') {
            <pd-button variant="secondary" (click)="voidInvoice()">Void</pd-button>
          }
        </pd-page-header>
        <p class="meta">
          <span class="status" [class]="d.invoice.status">{{ d.invoice.status }}</span>
          · created {{ d.invoice.createdAt | date:'medium' }}
          @if (d.invoice.issuedAt) { · issued {{ d.invoice.issuedAt | date:'medium' }} }
          @if (d.invoice.paidAt) { · paid {{ d.invoice.paidAt | date:'medium' }} }
        </p>

        <pd-card>
          <pd-key-value-grid>
            <pd-kv label="Lot">
              <a [routerLink]="['/ops/lots', d.invoice.lotId]" class="mono">{{ d.invoice.lotId }}</a>
            </pd-kv>
            <pd-kv label="Customer"><span class="mono">{{ d.invoice.customerId }}</span></pd-kv>
            <pd-kv label="Currency">{{ d.invoice.currency }}</pd-kv>
          </pd-key-value-grid>

          <h3>Line items</h3>
          <pd-table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="pd-table__num">Qty</th>
                <th class="pd-table__num">Unit price</th>
                <th class="pd-table__num">Line total</th>
              </tr>
            </thead>
            <tbody>
              @for (l of d.lines; track l.id) {
                <tr>
                  <td>{{ l.description }}</td>
                  <td class="pd-table__num">{{ l.quantity }} {{ l.unit }}</td>
                  <td class="pd-table__num">
                    <pd-money [cents]="l.unitPriceCents" [currency]="d.invoice.currency" />
                  </td>
                  <td class="pd-table__num">
                    <strong><pd-money [cents]="l.lineTotalCents" [currency]="d.invoice.currency" /></strong>
                  </td>
                </tr>
              }
            </tbody>
          </pd-table>

          <div class="totals">
            <div>
              <label>Subtotal</label>
              <strong><pd-money [cents]="d.invoice.subtotalCents" [currency]="d.invoice.currency" /></strong>
            </div>
            <div class="grand">
              <label>Total</label>
              <strong><pd-money [cents]="d.invoice.totalCents" [currency]="d.invoice.currency" /></strong>
            </div>
          </div>
        </pd-card>
      } @else {
        <p class="muted">Loading…</p>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px 32px; }
    .back { color: var(--pd-color-muted, #6b7280); font-size: 14px; text-decoration: none; }
    .meta { margin: -16px 0 24px; color: var(--pd-color-muted, #6b7280); font-size: 13px; }
    .mono { font-family: var(--pd-font-mono, ui-monospace, monospace); font-size: 13px; color: var(--pd-color-text, #111); }
    h3 { margin: 24px 0 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--pd-color-muted, #6b7280); font-weight: 600; }
    .muted { color: var(--pd-color-muted, #6b7280); font-size: 13px; }
    .totals { margin-top: 24px; text-align: right; }
    .totals div { padding: 8px 16px; }
    .totals label { display: inline-block; min-width: 100px; color: var(--pd-color-muted, #6b7280); }
    .grand { border-top: 2px solid var(--pd-color-border, #e5e7eb); margin-top: 8px; font-size: 18px; }
    .status { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 600; margin-right: 6px; }
    .status.DRAFT  { background: #f3f4f6; color: #4b5563; }
    .status.ISSUED { background: var(--pd-color-info-bg, #dbeafe); color: var(--pd-color-info-text, #1e40af); }
    .status.PAID   { background: var(--pd-color-success-bg, #d1fae5); color: var(--pd-color-success-text, #065f46); }
    .status.VOID   { background: var(--pd-color-danger-bg, #fee2e2); color: var(--pd-color-danger-text, #991b1b); }
  `],
})
export class InvoiceDetailComponent {
  private service = inject(InvoicesService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private snack = inject(SnackbarService);

  readonly data = signal<InvoiceDetail | null>(null);

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
      next: () => { this.snack.show('Invoice issued', { durationMs: 2000 }); this.reload(); },
      error: (e) => this.snack.show('Failed: ' + (e?.error?.detail ?? e?.message ?? 'unknown'), { durationMs: 4000 }),
    });
  }

  markPaid(): void {
    const tid = this.auth.activeTenantId();
    const id = this.route.snapshot.paramMap.get('id');
    if (!tid || !id) return;
    this.service.markPaid(tid, id).subscribe({
      next: () => { this.snack.show('Marked paid', { durationMs: 2000 }); this.reload(); },
    });
  }

  voidInvoice(): void {
    const tid = this.auth.activeTenantId();
    const id = this.route.snapshot.paramMap.get('id');
    if (!tid || !id) return;
    this.service.voidInvoice(tid, id).subscribe({
      next: () => { this.snack.show('Voided', { durationMs: 2000 }); this.reload(); },
    });
  }
}
