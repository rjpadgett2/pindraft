import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { AuthService } from '@pindraft/auth';
import { Listing, ListingsService } from './services/listings.service';

/**
 * Mill-side listings dashboard. Shows everything (draft, published, sold, archived)
 * with state chips and per-row action menu (publish / mark sold / archive).
 *
 * State transitions go through the backend, which enforces the lifecycle rules —
 * we just present the affordances.
 */
@Component({
  selector: 'ops-listings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatTableModule, MatButtonModule, MatChipsModule, MatIconModule, MatMenuModule,
  ],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1 class="page-title">Marketplace listings</h1>
          <p class="page-subtitle">Finished products and fiber available for sale.</p>
        </div>
        <button mat-flat-button color="primary" routerLink="/marketplace/listings/new">
          + New listing
        </button>
      </header>

      @if (!loading()) {
        @if (listings().length === 0) {
          <div class="empty">
            No listings yet. Create one to start showing finished products on the public marketplace.
          </div>
        } @else {
          <table mat-table [dataSource]="listings()">
            <ng-container matColumnDef="title">
              <th mat-header-cell *matHeaderCellDef>Title</th>
              <td mat-cell *matCellDef="let l">
                <strong>{{ l.title }}</strong>
                @if (l.traceSlug) { <mat-icon class="trace-icon" title="Has provenance">verified</mat-icon> }
              </td>
            </ng-container>
            <ng-container matColumnDef="kind">
              <th mat-header-cell *matHeaderCellDef>Kind</th>
              <td mat-cell *matCellDef="let l">{{ l.kind }}</td>
            </ng-container>
            <ng-container matColumnDef="price">
              <th mat-header-cell *matHeaderCellDef>Price</th>
              <td mat-cell *matCellDef="let l">\${{ l.pricePerKg }}/kg × {{ l.quantityKg }} kg</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let l">
                <span class="status" [class]="l.status">{{ l.status }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let l">
                <button mat-icon-button [matMenuTriggerFor]="menu">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  @if (l.status === 'DRAFT') {
                    <button mat-menu-item (click)="publish(l.id)">
                      <mat-icon>publish</mat-icon> Publish
                    </button>
                  }
                  @if (l.status === 'PUBLISHED') {
                    <button mat-menu-item (click)="markSold(l.id)">
                      <mat-icon>sell</mat-icon> Mark sold
                    </button>
                  }
                  @if (l.status !== 'SOLD') {
                    <button mat-menu-item (click)="archive(l.id)">
                      <mat-icon>archive</mat-icon> Archive
                    </button>
                  }
                </mat-menu>
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
    .empty { padding: 32px; background: #f9fafb; border-radius: 8px; text-align: center; color: #666; }
    table { width: 100%; background: white; }
    .trace-icon { color: #10b981; font-size: 16px; height: 16px; width: 16px; vertical-align: middle; margin-left: 4px; }
    .status { font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 500; }
    .status.DRAFT     { background: #f3f4f6; color: #374151; }
    .status.PUBLISHED { background: #d1fae5; color: #065f46; }
    .status.SOLD      { background: #fef3c7; color: #92400e; }
    .status.ARCHIVED  { background: #e5e7eb; color: #6b7280; }
  `],
})
export class ListingsComponent {
  private service = inject(ListingsService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly listings = signal<Listing[]>([]);
  readonly cols = ['title', 'kind', 'price', 'status', 'actions'];

  constructor() { this.refresh(); }

  private refresh(): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    this.loading.set(true);
    this.service.list(tid).subscribe({
      next: (list) => { this.listings.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  publish(id: string): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    this.service.publish(tid, id).subscribe({
      next: () => { this.snack.open('Published', 'OK', { duration: 1500 }); this.refresh(); },
      error: (e) => this.snack.open('Failed: ' + (e?.error?.detail ?? 'unknown'), 'OK'),
    });
  }

  markSold(id: string): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    this.service.markSold(tid, id).subscribe({
      next: () => { this.snack.open('Marked sold', 'OK', { duration: 1500 }); this.refresh(); },
      error: (e) => this.snack.open('Failed: ' + (e?.error?.detail ?? 'unknown'), 'OK'),
    });
  }

  archive(id: string): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    this.service.archive(tid, id).subscribe({
      next: () => { this.snack.open('Archived', 'OK', { duration: 1500 }); this.refresh(); },
      error: (e) => this.snack.open('Failed: ' + (e?.error?.detail ?? 'unknown'), 'OK'),
    });
  }
}
