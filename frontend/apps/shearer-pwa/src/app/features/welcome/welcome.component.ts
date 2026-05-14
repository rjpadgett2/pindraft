import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonComponent, CardComponent } from '@pindraft/ui';

/**
 * Public landing for the shearer-pwa. Mobile-first vertical because shearers
 * are on phones in barns — the desktop case is rare. Sage palette throughout.
 * Vanilla CSS, no Material.
 */
@Component({
  selector: 'shearer-welcome',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonComponent, CardComponent],
  template: `
    <header class="sh-welcome__nav">
      <a routerLink="/welcome" class="sh-welcome__brand">
        Pindraft <span>Shearer</span>
      </a>
      <a routerLink="/login" class="sh-welcome__nav-signin">Sign in</a>
    </header>

    <section class="sh-welcome__hero">
      <h1 class="sh-welcome__title">Book your week. Route your roads. Track your sheep.</h1>
      <p class="sh-welcome__lead">
        The shearer's tool, built for the realities of the route — clusters of farms shorn in a few days,
        weather sensitivity, equipment logistics. Mobile-first because you work outdoors on a phone.
      </p>
      <div class="sh-welcome__hero-actions">
        <a routerLink="/register">
          <pd-button variant="primary" size="lg">Sign up as a shearer</pd-button>
        </a>
        <a routerLink="/login">
          <pd-button variant="ghost" size="lg">Sign in</pd-button>
        </a>
      </div>
    </section>

    <section class="sh-welcome__features">
      <pd-card padding="md">
        <div class="sh-welcome__feature">
          <div class="sh-welcome__feature-icon">📅</div>
          <h3>Bookings</h3>
          <p>Farms request you with crew size and pen count up front.</p>
        </div>
      </pd-card>

      <pd-card padding="md">
        <div class="sh-welcome__feature">
          <div class="sh-welcome__feature-icon">🛣</div>
          <h3>Route optimization</h3>
          <p>Cluster farms in the same week to minimize driving.</p>
        </div>
      </pd-card>

      <pd-card padding="md">
        <div class="sh-welcome__feature">
          <div class="sh-welcome__feature-icon">📶</div>
          <h3>Offline-first</h3>
          <p>Log events without signal. Sync when you're back.</p>
        </div>
      </pd-card>

      <pd-card padding="md">
        <div class="sh-welcome__feature">
          <div class="sh-welcome__feature-icon">📋</div>
          <h3>Event journal</h3>
          <p>Per-farm shearing log: counts, breeds, notes, photos.</p>
        </div>
      </pd-card>
    </section>

    <section class="sh-welcome__cta">
      <pd-card variant="accent" padding="lg">
        <h2>Spring shearing season is around the corner.</h2>
        <p>Sign up free, list yourself, and start taking bookings.</p>
        <a routerLink="/register">
          <pd-button variant="primary" size="lg">Sign up as a shearer</pd-button>
        </a>
      </pd-card>
    </section>

    <footer class="sh-welcome__footer">
      Pindraft Shearer · part of the Pindraft fiber platform
    </footer>
  `,
  styles: [`
    :host { display: block; background: var(--pd-brand-accent-bg); min-height: 100vh; color: var(--pd-color-text); }

    .sh-welcome__nav {
      display: flex; align-items: center; justify-content: space-between;
      padding: var(--pd-space-5) var(--pd-space-6);
    }
    .sh-welcome__brand {
      font-family: var(--pd-font-sans);
      font-size: var(--pd-text-lg);
      font-weight: var(--pd-weight-semibold);
      letter-spacing: -0.02em;
      color: var(--pd-brand-accent-strong);
      text-decoration: none;
    }
    .sh-welcome__brand span {
      display: inline-block;
      margin-left: var(--pd-space-2);
      padding: 2px var(--pd-space-2);
      background: var(--pd-brand-accent);
      color: var(--pd-brand-text-on-accent);
      font-size: var(--pd-text-xs);
      font-weight: var(--pd-weight-medium);
      letter-spacing: 0.05em;
      text-transform: uppercase;
      border-radius: var(--pd-radius-sm);
      vertical-align: middle;
    }
    .sh-welcome__nav-signin {
      color: var(--pd-brand-accent-strong);
      font-size: var(--pd-text-sm);
      font-weight: var(--pd-weight-medium);
      text-decoration: none;
    }

    .sh-welcome__hero {
      max-width: 720px;
      margin: 0 auto;
      padding: var(--pd-space-8) var(--pd-space-6) var(--pd-space-12);
      text-align: center;
    }
    .sh-welcome__title {
      margin: 0;
      font-size: clamp(32px, 5vw, 44px);
      line-height: 1.1;
      font-weight: var(--pd-weight-semibold);
      letter-spacing: -0.025em;
      color: var(--pd-slate-900);
    }
    .sh-welcome__lead {
      margin: var(--pd-space-5) auto var(--pd-space-8);
      font-size: var(--pd-text-md);
      line-height: 1.55;
      color: var(--pd-slate-700);
      max-width: 50ch;
    }
    .sh-welcome__hero-actions {
      display: flex; gap: var(--pd-space-3);
      justify-content: center; flex-wrap: wrap;
    }

    .sh-welcome__features {
      max-width: 720px;
      margin: 0 auto;
      padding: 0 var(--pd-space-6);
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--pd-space-3);
    }
    .sh-welcome__feature { text-align: left; }
    .sh-welcome__feature-icon { font-size: 28px; margin-bottom: var(--pd-space-2); }
    .sh-welcome__feature h3 { margin: 0 0 var(--pd-space-1); font-size: var(--pd-text-base); font-weight: var(--pd-weight-semibold); color: var(--pd-color-text); }
    .sh-welcome__feature p { margin: 0; font-size: var(--pd-text-sm); line-height: 1.5; color: var(--pd-color-text-muted); }

    .sh-welcome__cta { max-width: 720px; margin: var(--pd-space-12) auto var(--pd-space-8); padding: 0 var(--pd-space-6); }
    .sh-welcome__cta h2 { margin: 0; font-size: var(--pd-text-lg); line-height: var(--pd-leading-lg); font-weight: var(--pd-weight-semibold); }
    .sh-welcome__cta p { margin: var(--pd-space-2) 0 var(--pd-space-5); color: var(--pd-color-text-muted); font-size: var(--pd-text-sm); }

    .sh-welcome__footer {
      text-align: center;
      padding: var(--pd-space-6);
      color: var(--pd-brand-accent-strong);
      font-size: var(--pd-text-xs);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      opacity: 0.6;
    }
  `],
})
export class WelcomeComponent {}
