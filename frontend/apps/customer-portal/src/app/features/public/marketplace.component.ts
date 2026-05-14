import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ButtonComponent, CardComponent, EmptyStateComponent } from '@pindraft/ui';
import { ListingKind, PublicListing, PublicMarketplaceService } from './services/public-marketplace.service';
import { PublicHeaderComponent } from './public-header.component';

/**
 * Public marketplace browse. Cream/terracotta palette matching the customer-portal
 * landing aesthetic — warm surfaces, kraft-paper feel, no Material card chrome.
 * Vanilla SCSS throughout; only Material dependency left is mat-icon for the
 * verified-trace badge (small footprint, worth keeping for the meaningful glyph).
 */
@Component({
  selector: 'customer-public-marketplace',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, PublicHeaderComponent, ButtonComponent, CardComponent, EmptyStateComponent],
  template: `
    <customer-public-header />

    <section class="mp-hero">
      <div class="mp-hero__inner">
        <span class="mp-hero__eyebrow">Marketplace</span>
        <h1 class="mp-hero__title">Fiber from independent mills.</h1>
        <p class="mp-hero__lead">Yarn, roving, fleece, and finished panels — sold directly by the mills that processed them. The {{ '🌿' }} icon flags listings with full QR-scannable trace from animal to skein.</p>
      </div>
    </section>

    <div class="mp-page">
      <div class="mp-filters">
        <pd-button [variant]="!kind() ? 'primary' : 'secondary'" size="sm" (click)="filter(null)">All</pd-button>
        <pd-button [variant]="kind() === 'YARN' ? 'primary' : 'secondary'" size="sm" (click)="filter('YARN')">Yarn</pd-button>
        <pd-button [variant]="kind() === 'ROVING' ? 'primary' : 'secondary'" size="sm" (click)="filter('ROVING')">Roving</pd-button>
        <pd-button [variant]="kind() === 'FLEECE' ? 'primary' : 'secondary'" size="sm" (click)="filter('FLEECE')">Fleece</pd-button>
        <pd-button [variant]="kind() === 'BLANK' ? 'primary' : 'secondary'" size="sm" (click)="filter('BLANK')">Panels</pd-button>
      </div>

      @if (!loading()) {
        @if (listings().length === 0) {
          <pd-empty-state
            title="No listings match that filter"
            message="Try a different fiber kind or browse all listings.">
            <pd-button variant="secondary" (click)="filter(null)">View all</pd-button>
          </pd-empty-state>
        } @else {
          <div class="mp-grid">
            @for (l of listings(); track l.id) {
              <a class="mp-card-link" [routerLink]="['/marketplace', l.id]">
                <pd-card padding="none">
                  <div class="mp-card__media">
                    <span class="mp-card__kind">{{ l.kind }}</span>
                    @if (l.traceSlug) {
                      <span class="mp-card__trace" title="Provenance available">
                        <mat-icon>verified</mat-icon> Traced
                      </span>
                    }
                  </div>
                  <div class="mp-card__body">
                    <h2 class="mp-card__title">{{ l.title }}</h2>
                    <p class="mp-card__mill">From {{ l.millName }}</p>
                    <div class="mp-card__price">
                      <span class="mp-card__price-amount">\${{ l.pricePerKg }}</span>
                      <span class="mp-card__price-unit">/kg</span>
                      <span class="mp-card__price-qty">· {{ l.quantityKg }} kg available</span>
                    </div>
                  </div>
                </pd-card>
              </a>
            }
          </div>
        }
      } @else {
        <p class="mp-loading">Loading marketplace…</p>
      }
    </div>
  `,
  styles: [`
    :host { display: block; background: var(--pd-color-bg-app); min-height: 100vh; }

    .mp-hero {
      background: linear-gradient(135deg, var(--pd-cream-50) 0%, var(--pd-cream-100) 100%);
      border-bottom: 1px solid var(--pd-cream-200);
      padding: var(--pd-space-12) var(--pd-space-8);
    }
    .mp-hero__inner { max-width: var(--pd-page-max-width); margin: 0 auto; }
    .mp-hero__eyebrow {
      display: inline-block;
      padding: 4px var(--pd-space-3);
      background: var(--pd-brand-accent);
      color: var(--pd-brand-text-on-accent);
      border-radius: var(--pd-radius-full);
      font-size: var(--pd-text-xs);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-weight: var(--pd-weight-medium);
      margin-bottom: var(--pd-space-4);
    }
    .mp-hero__title { margin: 0; font-size: clamp(28px, 4vw, 44px); line-height: 1.1; font-weight: var(--pd-weight-semibold); letter-spacing: -0.02em; color: var(--pd-slate-900); }
    .mp-hero__lead { margin: var(--pd-space-4) 0 0; max-width: 64ch; color: var(--pd-slate-700); font-size: var(--pd-text-md); line-height: 1.55; }

    .mp-page { max-width: var(--pd-page-max-width); margin: 0 auto; padding: var(--pd-space-8); }
    .mp-filters { display: flex; gap: var(--pd-space-2); flex-wrap: wrap; margin-bottom: var(--pd-space-6); }
    .mp-loading { padding: var(--pd-space-12); text-align: center; color: var(--pd-color-text-muted); }

    .mp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--pd-space-4); }
    .mp-card-link { text-decoration: none; color: inherit; transition: transform 150ms ease; display: block; }
    .mp-card-link:hover { transform: translateY(-2px); }
    .mp-card-link:hover pd-card ::ng-deep .pd-card { border-color: var(--pd-brand-accent); }

    /* Card "media" — placeholder colored band that varies by kind. Real photography
       would replace this; the colored band keeps the grid visually rhythmic without one. */
    .mp-card__media {
      aspect-ratio: 16 / 10;
      background: linear-gradient(135deg, var(--pd-cream-100) 0%, var(--pd-hay-300) 100%);
      border-radius: var(--pd-radius-lg) var(--pd-radius-lg) 0 0;
      position: relative;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: var(--pd-space-3);
    }
    .mp-card__kind {
      font-family: var(--pd-font-mono);
      font-size: var(--pd-text-xs);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--pd-slate-900);
      background: rgba(255, 255, 255, 0.85);
      padding: 4px var(--pd-space-2);
      border-radius: var(--pd-radius-sm);
      font-weight: var(--pd-weight-medium);
    }
    .mp-card__trace {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: var(--pd-green-700);
      color: white;
      padding: 4px var(--pd-space-2);
      border-radius: var(--pd-radius-sm);
      font-size: var(--pd-text-xs);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      font-weight: var(--pd-weight-medium);
    }
    .mp-card__trace mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .mp-card__body { padding: var(--pd-space-4) var(--pd-space-5) var(--pd-space-5); }
    .mp-card__title { margin: 0 0 var(--pd-space-2); font-size: var(--pd-text-md); line-height: var(--pd-leading-md); font-weight: var(--pd-weight-semibold); color: var(--pd-color-text); }
    .mp-card__mill { margin: 0 0 var(--pd-space-3); color: var(--pd-color-text-muted); font-size: var(--pd-text-sm); }
    .mp-card__price { display: flex; align-items: baseline; gap: 2px; font-variant-numeric: tabular-nums; }
    .mp-card__price-amount { font-size: var(--pd-text-lg); font-weight: var(--pd-weight-semibold); color: var(--pd-brand-accent-strong); }
    .mp-card__price-unit { font-size: var(--pd-text-sm); color: var(--pd-color-text-muted); }
    .mp-card__price-qty { font-size: var(--pd-text-sm); color: var(--pd-color-text-muted); margin-left: var(--pd-space-2); }
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
