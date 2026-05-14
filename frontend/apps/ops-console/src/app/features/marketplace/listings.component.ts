import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@pindraft/auth';
import { ButtonComponent, EmptyStateComponent, IconComponent, PageHeaderComponent, SnackbarService, TableComponent } from '@pindraft/ui';
import { Listing, ListingsService } from './services/listings.service';

/**
 * Mill-side listings dashboard. Shows everything (draft, published, sold, archived)
 * with state chips and per-row inline actions (publish / mark sold / archive).
 *
 * State transitions go through the backend, which enforces the lifecycle rules —
 * we just present the affordances.
 */
@Component({
  selector: 'ops-listings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink, ButtonComponent, EmptyStateComponent, PageHeaderComponent, TableComponent, IconComponent
  ],
  template: `
    <div class="page">
      <pd-page-header
        title="Marketplace listings"
        subtitle="Finished products and fiber available for sale.">
        <pd-button variant="primary" routerLink="/marketplace/listings/new">+ New listing</pd-button>
      </pd-page-header>

      @if (!loading()) {
        @if (listings().length === 0) {
          <pd-empty-state
            title="No listings yet"
            description="Create one to start showing finished products on the public marketplace." />
        } @else {
          <pd-table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Kind</th>
                <th class="pd-table__num">Price</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (l of listings(); track l.id) {
                <tr>
                  <td>
                    <strong>{{ l.title }}</strong>
                    @if (l.traceSlug) {
                      <pd-icon name="verified"  class="trace-icon" title="Has provenance" />
                    }
                  </td>
                  <td>{{ l.kind }}</td>
                  <td class="pd-table__num">\${{ l.pricePerKg }}/kg × {{ l.quantityKg }} kg</td>
                  <td><span class="status" [class]="l.status">{{ l.status }}</span></td>
                  <td class="row-actions">
                    @if (l.status === 'DRAFT') {
                      <pd-button variant="ghost" size="sm" (click)="publish(l.id)">Publish</pd-button>
                    }
                    @if (l.status === 'PUBLISHED') {
                      <pd-button variant="ghost" size="sm" (click)="markSold(l.id)">Mark sold</pd-button>
                    }
                    @if (l.status !== 'SOLD' && l.status !== 'ARCHIVED') {
                      <pd-button variant="ghost" size="sm" (click)="archive(l.id)">Archive</pd-button>
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
    .trace-icon { color: var(--pd-color-success, #10b981); font-size: 16px; height: 16px; width: 16px; vertical-align: middle; margin-left: 4px; }
    .status { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 600; }
    .status.DRAFT     { background: #f3f4f6; color: #374151; }
    .status.PUBLISHED { background: var(--pd-color-success-bg, #d1fae5); color: var(--pd-color-success-text, #065f46); }
    .status.SOLD      { background: var(--pd-color-warning-bg, #fef3c7); color: var(--pd-color-warning-text, #92400e); }
    .status.ARCHIVED  { background: #e5e7eb; color: var(--pd-color-muted, #6b7280); }
    .row-actions { display: flex; gap: 4px; justify-content: flex-end; }
  `],
})
export class ListingsComponent {
  private service = inject(ListingsService);
  private auth = inject(AuthService);
  private snack = inject(SnackbarService);

  readonly loading = signal(true);
  readonly listings = signal<Listing[]>([]);

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
      next: () => { this.snack.show('Published', { durationMs: 1500 }); this.refresh(); },
      error: (e) => this.snack.show('Failed: ' + (e?.error?.detail ?? 'unknown')),
    });
  }

  markSold(id: string): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    this.service.markSold(tid, id).subscribe({
      next: () => { this.snack.show('Marked sold', { durationMs: 1500 }); this.refresh(); },
      error: (e) => this.snack.show('Failed: ' + (e?.error?.detail ?? 'unknown')),
    });
  }

  archive(id: string): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    this.service.archive(tid, id).subscribe({
      next: () => { this.snack.show('Archived', { durationMs: 1500 }); this.refresh(); },
      error: (e) => this.snack.show('Failed: ' + (e?.error?.detail ?? 'unknown')),
    });
  }
}
