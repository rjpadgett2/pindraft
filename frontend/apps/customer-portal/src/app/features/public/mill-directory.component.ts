import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardComponent, EmptyStateComponent } from '@pindraft/ui';
import { MillSummary, PublicMarketplaceService } from './services/public-marketplace.service';
import { PublicHeaderComponent } from './public-header.component';

/**
 * Public mill directory. Cream + terracotta palette, vanilla SCSS, matching
 * the marketplace + landing visual language. Each mill renders as a warm
 * card; the listing count gives a quick sense of activity.
 */
@Component({
  selector: 'customer-mill-directory',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PublicHeaderComponent, CardComponent, EmptyStateComponent],
  template: `
    <customer-public-header />

    <section class="md-hero">
      <div class="md-hero__inner">
        <span class="md-hero__eyebrow">Mill directory</span>
        <h1 class="md-hero__title">Independent mills on Pindraft.</h1>
        <p class="md-hero__lead">
          Small mills processing fiber from the shepherds, designers, and ranchers who grow it.
          Pick one to see their listings, capabilities, and current capacity.
        </p>
      </div>
    </section>

    <div class="md-page">
      @if (!loading()) {
        @if (mills().length === 0) {
          <pd-empty-state
            title="No mills active yet"
            message="Pindraft is just getting started. Mills appear here once they've gone live with their first lot." />
        } @else {
          <div class="md-grid">
            @for (m of mills(); track m.id) {
              <a class="md-card-link" [routerLink]="['/mills', m.id]">
                <pd-card padding="lg">
                  <div class="md-card__seal" aria-hidden="true">
                    {{ initialsFor(m.name) }}
                  </div>
                  <h2 class="md-card__name">{{ m.name }}</h2>
                  <p class="md-card__stat">
                    <span class="md-card__count">{{ m.listingCount }}</span>
                    listing{{ m.listingCount === 1 ? '' : 's' }} on the marketplace
                  </p>
                  <span class="md-card__more">View mill →</span>
                </pd-card>
              </a>
            }
          </div>
        }
      } @else {
        <p class="md-loading">Loading mills…</p>
      }
    </div>
  `,
  styles: [`
    :host { display: block; background: var(--pd-color-bg-app); min-height: 100vh; }

    .md-hero {
      background: linear-gradient(135deg, var(--pd-cream-50) 0%, var(--pd-cream-100) 100%);
      border-bottom: 1px solid var(--pd-cream-200);
      padding: var(--pd-space-12) var(--pd-space-8);
    }
    .md-hero__inner { max-width: var(--pd-page-max-width); margin: 0 auto; }
    .md-hero__eyebrow {
      display: inline-block;
      padding: 4px var(--pd-space-3);
      background: var(--pd-sage-500);
      color: white;
      border-radius: var(--pd-radius-full);
      font-size: var(--pd-text-xs);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-weight: var(--pd-weight-medium);
      margin-bottom: var(--pd-space-4);
    }
    .md-hero__title { margin: 0; font-size: clamp(28px, 4vw, 44px); line-height: 1.1; font-weight: var(--pd-weight-semibold); letter-spacing: -0.02em; color: var(--pd-slate-900); }
    .md-hero__lead { margin: var(--pd-space-4) 0 0; max-width: 64ch; color: var(--pd-slate-700); font-size: var(--pd-text-md); line-height: 1.55; }

    .md-page { max-width: var(--pd-page-max-width); margin: 0 auto; padding: var(--pd-space-8); }
    .md-loading { padding: var(--pd-space-12); text-align: center; color: var(--pd-color-text-muted); }

    .md-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: var(--pd-space-4);
    }
    .md-card-link { text-decoration: none; color: inherit; display: block; transition: transform 150ms ease; }
    .md-card-link:hover { transform: translateY(-2px); }
    .md-card-link:hover pd-card ::ng-deep .pd-card { border-color: var(--pd-brand-accent); }

    .md-card__seal {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--pd-hay-300) 0%, var(--pd-brand-accent) 100%);
      color: var(--pd-brand-text-on-accent);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--pd-text-lg);
      font-weight: var(--pd-weight-semibold);
      letter-spacing: 0.04em;
      margin-bottom: var(--pd-space-4);
    }
    .md-card__name { margin: 0 0 var(--pd-space-3); font-size: var(--pd-text-lg); line-height: var(--pd-leading-lg); font-weight: var(--pd-weight-semibold); color: var(--pd-color-text); }
    .md-card__stat { margin: 0; color: var(--pd-color-text-muted); font-size: var(--pd-text-sm); }
    .md-card__count { color: var(--pd-color-text); font-weight: var(--pd-weight-semibold); font-variant-numeric: tabular-nums; }
    .md-card__more { display: inline-block; margin-top: var(--pd-space-4); color: var(--pd-brand-accent); font-size: var(--pd-text-sm); font-weight: var(--pd-weight-medium); }
  `],
})
export class PublicMillDirectoryComponent {
  private service = inject(PublicMarketplaceService);

  readonly loading = signal(true);
  readonly mills = signal<MillSummary[]>([]);

  constructor() {
    this.service.listMills().subscribe({
      next: (list) => { this.mills.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  /** "Sturnella Farm Mill" → "SFM". Quick monogram fallback while real logos
   *  aren't uploaded yet. */
  initialsFor(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((w) => w[0]!.toUpperCase())
      .join('');
  }
}
