import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { Customer, Reservation } from '@pindraft/api-client';
import { AuthService } from '@pindraft/auth';
import { forkJoin } from 'rxjs';
import { OperationsService } from './services/operations.service';
import { DatePipe } from '@angular/common';

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
    RouterLink,
    MatTableModule, MatButtonModule, MatChipsModule, MatIconModule, DatePipe
  ],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1 class="page-title">Reservations</h1>
          <p class="page-subtitle">Upcoming bookings and pending intakes.</p>
        </div>
        <div class="header-actions">
          <button mat-stroked-button routerLink="/ops/walk-in-intake">
            Walk-in intake
          </button>
          <button mat-flat-button color="primary" routerLink="/ops/reservations/new">
            + New reservation
          </button>
        </div>
      </header>

      @if (!loading()) {
        @if (reservations().length === 0) {
          <div class="empty">
            No reservations yet. Create one to start receiving fiber.
          </div>
        } @else {
          <table mat-table [dataSource]="reservations()">
            <ng-container matColumnDef="customer">
              <th mat-header-cell *matHeaderCellDef>Customer</th>
              <td mat-cell *matCellDef="let r">{{ customerName(r.customerId) }}</td>
            </ng-container>
            <ng-container matColumnDef="slot">
              <th mat-header-cell *matHeaderCellDef>Slot</th>
              <td mat-cell *matCellDef="let r">{{ r.slotStart | date:'mediumDate' }}</td>
            </ng-container>
            <ng-container matColumnDef="weight">
              <th mat-header-cell *matHeaderCellDef>Expected</th>
              <td mat-cell *matCellDef="let r">{{ r.expectedWeightKg }} kg</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let r">
                <span class="status" [class]="r.status">{{ r.status }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="source">
              <th mat-header-cell *matHeaderCellDef>Source</th>
              <td mat-cell *matCellDef="let r">
                @if (r.externalSource === 'hirsel') {
                  <span class="chip-hirsel">Hirsel</span>
                } @else {
                  <span class="chip-walkin">Manual</span>
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let r">
                @if (r.status === 'PENDING') {
                  <a mat-stroked-button [routerLink]="['/ops/reservations', r.id, 'intake']">
                    Receive fiber
                  </a>
                } @else if (r.status === 'RECEIVED') {
                  <span class="received-tag">Lot created</span>
                }
              </td>
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
    .header-actions { display: flex; gap: 8px; }
    .empty { padding: 32px; background: #f9fafb; border-radius: 8px; text-align: center; color: #666; }
    table { width: 100%; background: white; }
    .status { font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 500; }
    .status.PENDING   { background: #fef3c7; color: #92400e; }
    .status.RECEIVED  { background: #d1fae5; color: #065f46; }
    .status.CANCELLED { background: #e5e7eb; color: #374151; }
    .chip-hirsel  { font-size: 11px; padding: 2px 8px; background: #dbeafe; color: #1e40af; border-radius: 4px; }
    .chip-walkin  { font-size: 11px; padding: 2px 8px; background: #f3f4f6; color: #666; border-radius: 4px; }
    .received-tag { font-size: 12px; color: #6b7280; }
  `],
})
export class ReservationsListComponent {
  private ops = inject(OperationsService);
  private auth = inject(AuthService);

  readonly loading = signal(true);
  readonly reservations = signal<Reservation[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly cols = ['customer', 'slot', 'weight', 'status', 'source', 'actions'];

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
