import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Customer, Reservation } from '@pindraft/api-client';
import { AuthService } from '@pindraft/auth';
import {
  ButtonComponent, EmptyStateComponent, PageHeaderComponent,
  StatusChipComponent, TableComponent,
} from '@pindraft/ui';
import { forkJoin } from 'rxjs';
import { OperationsService } from './services/operations.service';

/**
 * Reservations dashboard — the operator's daily landing surface. Lists upcoming and
 * in-progress reservations with their customer, expected weight, and slot date.
 *
 * Smart parent. Joins reservations with customer data for display. Filtering by
 * status will come in the next iteration; for v1 shows all non-cancelled.
 */
@Component({
  selector: 'ops-reservations-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, DatePipe,
    ButtonComponent, EmptyStateComponent, PageHeaderComponent,
    StatusChipComponent, TableComponent,
  ],
  template: `
    <div class="page">
      <pd-page-header
        title="Reservations"
        subtitle="Upcoming bookings and pending intakes.">
        <pd-button variant="secondary" routerLink="/ops/walk-in-intake">Walk-in intake</pd-button>
        <pd-button variant="primary" routerLink="/ops/reservations/new">+ New reservation</pd-button>
      </pd-page-header>

      @if (!loading()) {
        @if (reservations().length === 0) {
          <pd-empty-state
            title="No reservations yet"
            description="Create one to start receiving fiber." />
        } @else {
          <pd-table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Slot</th>
                <th class="pd-table__num">Expected</th>
                <th>Status</th>
                <th>Source</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (r of reservations(); track r.id) {
                <tr>
                  <td>{{ customerName(r.customerId) }}</td>
                  <td>{{ r.slotStart | date:'mediumDate' }}</td>
                  <td class="pd-table__num">{{ r.expectedWeightKg }} kg</td>
                  <td><span class="status" [class]="r.status">{{ r.status }}</span></td>
                  <td>
                    @if (r.externalSource === 'hirsel') {
                      <pd-status-chip label="Hirsel" tone="info" />
                    } @else {
                      <pd-status-chip label="Manual" tone="neutral" />
                    }
                  </td>
                  <td>
                    @if (r.status === 'PENDING') {
                      <a [routerLink]="['/ops/reservations', r.id, 'intake']" class="action-link">
                        Receive fiber →
                      </a>
                    } @else if (r.status === 'RECEIVED') {
                      <span class="received-tag">Lot created</span>
                    }
                  </td>
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
    .status { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 600; }
    .status.PENDING   { background: var(--pd-color-warning-bg, #fef3c7); color: var(--pd-color-warning-text, #92400e); }
    .status.RECEIVED  { background: var(--pd-color-success-bg, #d1fae5); color: var(--pd-color-success-text, #065f46); }
    .status.CANCELLED { background: #e5e7eb; color: #374151; }
    .received-tag { font-size: 12px; color: var(--pd-color-muted, #6b7280); }
    .action-link { color: var(--pd-color-link, #2563eb); font-weight: 600; text-decoration: none; font-size: 13px; }
    .action-link:hover { text-decoration: underline; }
  `],
})
export class ReservationsListComponent {
  private ops = inject(OperationsService);
  private auth = inject(AuthService);

  readonly loading = signal(true);
  readonly reservations = signal<Reservation[]>([]);
  readonly customers = signal<Customer[]>([]);

  constructor() {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    forkJoin({
      reservations: this.ops.listReservations(tid),
      customers: this.ops.listCustomers(tid),
    }).subscribe({
      next: ({ reservations, customers }) => {
        this.reservations.set(reservations);
        this.customers.set(customers);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  customerName(customerId: string): string {
    return this.customers().find((c) => c.id === customerId)?.displayName ?? '—';
  }
}
