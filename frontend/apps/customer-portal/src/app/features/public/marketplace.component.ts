import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ListingKind, PublicListing, PublicMarketplaceService } from './services/public-marketplace.service';
import { PublicHeaderComponent } from './public-header.component';

/**
 * Public marketplace browse. Grid of all PUBLISHED listings across all mills.
 * Kind filter chips at the top; the verified-trace icon flags listings with provenance.
 */
@Component({
  selector: 'customer-public-marketplace',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule, PublicHeaderComponent],
  template: `
    <customer-public-header />
    <div class="public-page">
      <h1>Fiber from independent mills</h1>
      <p class="lead">Yarn, roving, fleece, and finished panels — sold directly by the mills that processed them.</p>

      <div class="filters">
        <button mat-stroked-button [class.active]="!kind()" (click)="filter(null)">All</button>
        <button mat-stroked-button [class.active]="kind() === 'YARN'" (click)="filter('YARN')">Yarn</button>
        <button mat-stroked-button [class.active]="kind() === 'ROVING'" (click)="filter('ROVING')">Roving</button>
        <button mat-stroked-button [class.active]="kind() === 'FLEECE'" (click)="filter('FLEECE')">Fleece</button>
        <button mat-stroked-button [class.active]="kind() === 'BLANK'" (click)="filter('BLANK')">Panels</button>
      </div>

      @if (!loading()) {
        @if (listings().length === 0) {
          <div class="empty">No listings match that filter.</div>
        } @else {
          <div class="grid">
            @for (l of listings(); track l.id) {
              <a class="card" [routerLink]="['/marketplace', l.id]">
                <div class="card-body">
                  <div class="card-header">
                    <span class="kind-badge">{{ l.kind }}</span>
                    @if (l.traceSlug) {
                      <mat-icon class="trace-icon" title="Provenance available">verified</mat-icon>
                    }
                  </div>
                  <h2>{{ l.title }}</h2>
                  <p class="mill">From {{ l.millName }}</p>
                  <p class="price">
                    <strong>\${{ l.pricePerKg }}</strong>/kg • {{ l.quantityKg }} kg available
                  </p>
                </div>
              </a>
            }
          </div>
        }
      } @else {
        <p>Loading…</p>
      }
    </div>
  `,
  styles: [`
    .public-page { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }
    h1 { font-size: 28px; font-weight: 500; margin: 0 0 8px; }
    .lead { color: #666; font-size: 15px; margin: 0 0 32px; }
    .filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }
    .filters button.active { background: #1a1a1a; color: white; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
    .card { display: block; background: white; border: 1px solid #e5e7eb; border-radius: 8px; text-decoration: none; color: inherit; transition: all 0.15s; }
    .card:hover { border-color: #2563eb; transform: translateY(-2px); }
    .card-body { padding: 16px; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .kind-badge { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 8px; background: #f3f4f6; border-radius: 4px; color: #666; font-weight: 500; }
    .trace-icon { color: #10b981; font-size: 18px; height: 18px; width: 18px; }
    .card h2 { font-size: 16px; font-weight: 500; margin: 4px 0 8px; }
    .mill { font-size: 13px; color: #666; margin: 0 0 12px; }
    .price { margin: 0; font-size: 14px; color: #1a1a1a; }
    .empty { padding: 48px; text-align: center; color: #666; }
  `],
})
export class PublicMarketplaceComponent {
  private service = inject(PublicMarketplaceService);

  readonly loading = signal(true);
  readonly listings = signal<PublicListing[]>([]);
  readonly kind = signal<ListingKind | null>(null);

  constructor() { this.refresh(); }

  filter(kind: ListingKind | null): void {
    this.kind.set(kind);
    this.refresh();
  }

  private refresh(): void {
    this.loading.set(true);
    this.service.browse(this.kind() ?? undefined).subscribe({
      next: (list) => { this.listings.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
