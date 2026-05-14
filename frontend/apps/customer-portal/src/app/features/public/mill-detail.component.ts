import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MillDetail, PublicListing, PublicMarketplaceService } from './services/public-marketplace.service';
import { PublicHeaderComponent } from './public-header.component';
import { IconComponent } from '@pindraft/ui';

/**
 * Public mill profile page. Lists the mill's published listings inline.
 */
@Component({
  selector: 'customer-mill-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PublicHeaderComponent, IconComponent],
  template: `
    <customer-public-header />
    <div class="public-page">
      <a routerLink="/mills" class="back">← Back to mills</a>

      @if (mill(); as m) {
        <h1>{{ m.name }}</h1>
        <p class="meta">{{ m.listingCount }} active listing{{ m.listingCount === 1 ? '' : 's' }}</p>

        <h2 class="section">Listings</h2>
        @if (listings().length === 0) {
          <div class="empty">No listings currently available from this mill.</div>
        } @else {
          <div class="grid">
            @for (l of listings(); track l.id) {
              <a class="card" [routerLink]="['/marketplace', l.id]">
                <div class="card-header">
                  <span class="kind-badge">{{ l.kind }}</span>
                  @if (l.traceSlug) { <pd-icon name="verified"  class="trace-icon" title="Provenance available" /> }
                </div>
                <h3>{{ l.title }}</h3>
                <p class="price">\${{ l.pricePerKg }}/kg • {{ l.quantityKg }} kg</p>
              </a>
            }
          </div>
        }
      } @else if (notFound()) {
        <div class="not-found">
          <h1>Mill not found</h1>
        </div>
      } @else {
        <p>Loading…</p>
      }
    </div>
  `,
  styles: [`
    .public-page { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }
    .back { display: inline-block; margin-bottom: 16px; font-size: 13px; color: #2563eb; text-decoration: none; }
    h1 { font-size: 28px; font-weight: 500; margin: 0 0 8px; }
    .meta { color: #666; font-size: 14px; margin: 0 0 24px; }
    .section { font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #666; margin: 32px 0 16px; font-weight: 500; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
    .card { display: block; background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-decoration: none; color: inherit; transition: all 0.15s; }
    .card:hover { border-color: #2563eb; transform: translateY(-2px); }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .kind-badge { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 8px; background: #f3f4f6; border-radius: 4px; color: #666; font-weight: 500; }
    .trace-icon { color: #10b981; font-size: 18px; height: 18px; width: 18px; }
    .card h3 { font-size: 15px; font-weight: 500; margin: 4px 0 8px; }
    .price { margin: 0; font-size: 13px; color: #666; }
    .empty { padding: 32px; background: #f9fafb; border-radius: 8px; text-align: center; color: #666; }
    .not-found { text-align: center; padding: 48px; color: #666; }
  `],
})
export class PublicMillDetailComponent {
  private service = inject(PublicMarketplaceService);
  private route = inject(ActivatedRoute);

  readonly mill = signal<MillDetail | null>(null);
  readonly listings = signal<PublicListing[]>([]);
  readonly notFound = signal(false);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.notFound.set(true); return; }
    forkJoin({
      mill: this.service.getMill(id),
      listings: this.service.browse().pipe((source) => source),
    }).subscribe({
      next: ({ mill, listings }) => {
        this.mill.set(mill);
        // Filter to this mill's listings
        this.listings.set(listings.filter((l) => l.tenantId === mill.id));
      },
      error: () => this.notFound.set(true),
    });
  }
}
