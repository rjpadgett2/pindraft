import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/**
 * Header for the public-facing customer-portal surfaces — marketplace, mill
 * directory, trace pages. Token-driven; uses the customer-portal brand
 * (terracotta accent on cream) so the public surface reads as one piece with
 * the /welcome landing.
 */
@Component({
  selector: 'customer-public-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="ph">
      <a class="ph__brand" routerLink="/welcome">Pindraft</a>
      <nav class="ph__nav">
        <a routerLink="/marketplace" routerLinkActive="ph__active">Marketplace</a>
        <a routerLink="/mills" routerLinkActive="ph__active">Mills</a>
        <a routerLink="/login">Sign in</a>
        <a routerLink="/register" class="ph__signup">Sign up</a>
      </nav>
    </header>
  `,
  styles: [`
    .ph {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--pd-space-4) var(--pd-space-8);
      background: var(--pd-color-bg-app);
      border-bottom: 1px solid var(--pd-cream-200);
      position: sticky;
      top: 0;
      z-index: 10;
      backdrop-filter: blur(8px);
    }
    .ph__brand {
      font-family: var(--pd-font-sans);
      font-size: var(--pd-text-md);
      font-weight: var(--pd-weight-semibold);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--pd-brand-accent-strong);
      text-decoration: none;
    }
    .ph__nav { display: flex; gap: var(--pd-space-5); align-items: center; }
    .ph__nav a {
      color: var(--pd-color-text-muted);
      text-decoration: none;
      font-size: var(--pd-text-sm);
      font-weight: var(--pd-weight-medium);
      padding: 4px 0;
      border-bottom: 2px solid transparent;
      transition: color 120ms ease, border-color 120ms ease;
    }
    .ph__nav a:hover { color: var(--pd-color-text); }
    .ph__nav a.ph__active {
      color: var(--pd-brand-accent-strong);
      border-bottom-color: var(--pd-brand-accent);
    }
    .ph__signup {
      background: var(--pd-brand-accent);
      color: var(--pd-brand-text-on-accent) !important;
      padding: 6px var(--pd-space-3);
      border-radius: var(--pd-radius-md);
      border-bottom: none !important;
    }
    .ph__signup:hover { background: var(--pd-brand-accent-hover); }

    @media (max-width: 720px) {
      .ph { padding: var(--pd-space-3) var(--pd-space-4); }
      .ph__nav { gap: var(--pd-space-3); }
      .ph__nav a { font-size: var(--pd-text-xs); }
    }
  `],
})
export class PublicHeaderComponent {}
