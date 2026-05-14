import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonComponent, CardComponent } from '@pindraft/ui';

/**
 * Public landing for the ops-console — pitches Pindraft to prospective mills.
 * Uses only vanilla-CSS primitives (<pd-button>, <pd-card>) — zero Material
 * dependency. This page is the first of the Material-replacement track.
 */
@Component({
  selector: 'ops-welcome',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonComponent, CardComponent],
  template: `
    <header class="ops-welcome__nav">
      <a routerLink="/welcome" class="ops-welcome__brand">Pindraft</a>
      <nav class="ops-welcome__nav-links">
        <a routerLink="/login">Sign in</a>
        <a routerLink="/register" class="ops-welcome__cta-link">Start your mill →</a>
      </nav>
    </header>

    <section class="ops-welcome__hero">
      <div class="ops-welcome__hero-content">
        <span class="ops-welcome__eyebrow">For mill operators</span>
        <h1 class="ops-welcome__title">
          The operations platform regional fiber mills run on.
        </h1>
        <p class="ops-welcome__lead">
          Replace spreadsheets, hand-written carder logs, and "where's my wool" calls.
          Pindraft compresses the 4–6 month yarn turnaround that's standard in U.S.
          small-mill processing into something operators and shepherds can actually
          live with.
        </p>
        <div class="ops-welcome__hero-actions">
          <a routerLink="/register">
            <pd-button variant="primary" size="lg">Start your mill on Pindraft</pd-button>
          </a>
          <a routerLink="/login">
            <pd-button variant="ghost" size="lg">Sign in</pd-button>
          </a>
        </div>
        <p class="ops-welcome__hero-fineprint">
          Self-service signup. Your mill is private and unlisted until you complete onboarding and click "Go live".
        </p>
      </div>

      <div class="ops-welcome__hero-stat">
        <div class="ops-welcome__stat-num">28<span class="ops-welcome__stat-unit">d</span></div>
        <div class="ops-welcome__stat-label">Target turnaround on Pindraft</div>
        <div class="ops-welcome__stat-vs">vs. <strong>4–6 months</strong> industry standard</div>
      </div>
    </section>

    <section class="ops-welcome__features">
      <h2 class="ops-welcome__section-title">Built for the floor.</h2>
      <p class="ops-welcome__section-lead">Designed with Sturnella Farm Mill as the day-one partner. Every screen is what an operator wanted three months in, not what a designer drew up front.</p>

      <div class="ops-welcome__feature-grid">
        <pd-card padding="lg">
          <div class="ops-welcome__feature-num">01</div>
          <h3 class="ops-welcome__feature-title">Intake &amp; reservations</h3>
          <p class="ops-welcome__feature-body">
            Shepherds book slots before shipping. You only accept fiber when you can start it. No more limbo with bags piling up in the back room.
          </p>
        </pd-card>

        <pd-card padding="lg">
          <div class="ops-welcome__feature-num">02</div>
          <h3 class="ops-welcome__feature-title">Barcoded lot tracking</h3>
          <p class="ops-welcome__feature-body">
            QR scans at every stage — scour, dry, card, pindraft, spin, ply, wind, ship. State changes drive shepherd-facing notifications automatically.
          </p>
        </pd-card>

        <pd-card padding="lg">
          <div class="ops-welcome__feature-num">03</div>
          <h3 class="ops-welcome__feature-title">Queue &amp; changeover optimizer</h3>
          <p class="ops-welcome__feature-body">
            Suggests sequencing that minimizes equipment changeovers while honoring dwell time. Non-binding — operator action stays canonical.
          </p>
        </pd-card>

        <pd-card padding="lg">
          <div class="ops-welcome__feature-num">04</div>
          <h3 class="ops-welcome__feature-title">Wool pool settlement</h3>
          <p class="ops-welcome__feature-body">
            Combine three shepherds' clips into one mill-ready lot. Pindraft does the proportional-share math when the pool sells. Real money, exactly right.
          </p>
        </pd-card>

        <pd-card padding="lg">
          <div class="ops-welcome__feature-num">05</div>
          <h3 class="ops-welcome__feature-title">Automated invoicing</h3>
          <p class="ops-welcome__feature-body">
            Pricing arrangement frozen at intake. When a lot completes, the invoice generates from the snapshot. Pay-by-weight, tiered-by-grade, hybrid, or revenue-split — all supported.
          </p>
        </pd-card>

        <pd-card padding="lg">
          <div class="ops-welcome__feature-num">06</div>
          <h3 class="ops-welcome__feature-title">Traceability built in</h3>
          <p class="ops-welcome__feature-body">
            Every transformation writes a trace segment. A QR on the finished skein resolves to the animal it came from. Designers and yarn shops love this.
          </p>
        </pd-card>
      </div>
    </section>

    <section class="ops-welcome__cta">
      <pd-card variant="accent" padding="lg">
        <div class="ops-welcome__cta-inner">
          <div>
            <h2 class="ops-welcome__cta-title">Run your mill on Pindraft.</h2>
            <p class="ops-welcome__cta-lead">Five minutes to set up. Your mill stays private until you're ready to take reservations.</p>
          </div>
          <a routerLink="/register">
            <pd-button variant="primary" size="lg">Create your mill</pd-button>
          </a>
        </div>
      </pd-card>
    </section>

    <footer class="ops-welcome__footer">
      <div class="ops-welcome__footer-inner">
        <span>Pindraft · A platform for the U.S. small-mill fiber industry</span>
        <span>
          <a routerLink="/login">Sign in</a> ·
          <a routerLink="/register">Sign up</a>
        </span>
      </div>
    </footer>
  `,
  styles: [`
    :host { display: block; background: var(--pd-color-bg-app); color: var(--pd-color-text); }

    .ops-welcome__nav {
      display: flex; align-items: center; justify-content: space-between;
      padding: var(--pd-space-4) var(--pd-space-8);
      border-bottom: 1px solid var(--pd-color-border);
      background: var(--pd-color-bg-surface);
    }
    .ops-welcome__brand {
      font-size: var(--pd-text-md);
      font-weight: var(--pd-weight-semibold);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--pd-color-text);
      text-decoration: none;
    }
    .ops-welcome__nav-links { display: flex; gap: var(--pd-space-6); align-items: center; }
    .ops-welcome__nav-links a { color: var(--pd-color-text-muted); text-decoration: none; font-size: var(--pd-text-sm); font-weight: var(--pd-weight-medium); }
    .ops-welcome__nav-links a:hover { color: var(--pd-color-text); }
    .ops-welcome__cta-link { color: var(--pd-brand-accent) !important; }

    .ops-welcome__hero {
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: var(--pd-space-12);
      padding: var(--pd-space-16) var(--pd-space-12);
      background: linear-gradient(160deg, var(--pd-slate-900) 0%, var(--pd-slate-800) 60%, var(--pd-brand-accent-strong) 120%);
      color: #ffffff;
      align-items: center;
    }
    .ops-welcome__hero-content { max-width: 56ch; }
    .ops-welcome__eyebrow {
      display: inline-block;
      padding: 4px var(--pd-space-3);
      background: rgba(255, 255, 255, 0.1);
      border-radius: var(--pd-radius-full);
      font-size: var(--pd-text-xs);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.85);
      margin-bottom: var(--pd-space-5);
    }
    .ops-welcome__title {
      margin: 0;
      font-size: clamp(36px, 5vw, 56px);
      line-height: 1.05;
      font-weight: var(--pd-weight-semibold);
      letter-spacing: -0.02em;
    }
    .ops-welcome__lead {
      margin: var(--pd-space-6) 0 var(--pd-space-8);
      font-size: var(--pd-text-md);
      line-height: 1.55;
      color: rgba(255, 255, 255, 0.82);
      max-width: 56ch;
    }
    .ops-welcome__hero-actions { display: flex; gap: var(--pd-space-3); flex-wrap: wrap; }
    /* Override ghost button on dark hero so it reads */
    .ops-welcome__hero-actions :host ::ng-deep .pd-btn[data-variant="ghost"] { color: #ffffff; }
    .ops-welcome__hero-actions :host ::ng-deep .pd-btn[data-variant="ghost"]:hover { background: rgba(255, 255, 255, 0.08); }
    .ops-welcome__hero-fineprint {
      margin: var(--pd-space-5) 0 0;
      font-size: var(--pd-text-sm);
      color: rgba(255, 255, 255, 0.6);
      max-width: 50ch;
    }
    .ops-welcome__hero-stat {
      padding: var(--pd-space-8);
      border-left: 4px solid var(--pd-brand-accent);
      background: rgba(255, 255, 255, 0.04);
      border-radius: var(--pd-radius-lg);
    }
    .ops-welcome__stat-num {
      font-size: 96px;
      line-height: 1;
      font-weight: var(--pd-weight-semibold);
      letter-spacing: -0.05em;
      color: var(--pd-hay-300);
    }
    .ops-welcome__stat-unit { font-size: 56px; color: rgba(255, 255, 255, 0.6); }
    .ops-welcome__stat-label { margin-top: var(--pd-space-3); font-size: var(--pd-text-md); color: rgba(255, 255, 255, 0.85); }
    .ops-welcome__stat-vs { margin-top: var(--pd-space-2); font-size: var(--pd-text-sm); color: rgba(255, 255, 255, 0.55); }

    .ops-welcome__features { max-width: var(--pd-page-max-width); margin: 0 auto; padding: var(--pd-space-16) var(--pd-space-8); }
    .ops-welcome__section-title { margin: 0; font-size: clamp(28px, 3vw, 40px); line-height: 1.1; font-weight: var(--pd-weight-semibold); letter-spacing: -0.02em; }
    .ops-welcome__section-lead { margin: var(--pd-space-4) 0 var(--pd-space-12); max-width: 60ch; color: var(--pd-color-text-muted); font-size: var(--pd-text-md); line-height: 1.55; }
    .ops-welcome__feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--pd-space-4); }
    .ops-welcome__feature-num {
      font-family: var(--pd-font-mono);
      font-size: var(--pd-text-sm);
      color: var(--pd-brand-accent);
      letter-spacing: 0.1em;
    }
    .ops-welcome__feature-title { margin: var(--pd-space-3) 0 var(--pd-space-2); font-size: var(--pd-text-lg); line-height: var(--pd-leading-lg); font-weight: var(--pd-weight-semibold); }
    .ops-welcome__feature-body { margin: 0; color: var(--pd-color-text-muted); line-height: 1.55; font-size: var(--pd-text-base); }

    .ops-welcome__cta { max-width: var(--pd-page-max-width); margin: 0 auto var(--pd-space-16); padding: 0 var(--pd-space-8); }
    .ops-welcome__cta-inner { display: flex; justify-content: space-between; align-items: center; gap: var(--pd-space-6); flex-wrap: wrap; }
    .ops-welcome__cta-title { margin: 0; font-size: var(--pd-text-xl); line-height: var(--pd-leading-xl); font-weight: var(--pd-weight-semibold); color: var(--pd-color-text); }
    .ops-welcome__cta-lead { margin: var(--pd-space-2) 0 0; color: var(--pd-color-text-muted); font-size: var(--pd-text-base); }

    .ops-welcome__footer { background: var(--pd-slate-900); color: rgba(255, 255, 255, 0.55); padding: var(--pd-space-6) var(--pd-space-8); }
    .ops-welcome__footer-inner { max-width: var(--pd-page-max-width); margin: 0 auto; display: flex; justify-content: space-between; align-items: center; gap: var(--pd-space-4); flex-wrap: wrap; font-size: var(--pd-text-sm); }
    .ops-welcome__footer a { color: rgba(255, 255, 255, 0.75); text-decoration: none; }
    .ops-welcome__footer a:hover { color: #ffffff; }

    @media (max-width: 880px) {
      .ops-welcome__hero { grid-template-columns: 1fr; padding: var(--pd-space-12) var(--pd-space-5); }
      .ops-welcome__hero-stat { border-left: none; border-top: 4px solid var(--pd-brand-accent); }
      .ops-welcome__stat-num { font-size: 64px; }
      .ops-welcome__stat-unit { font-size: 36px; }
      .ops-welcome__nav { padding: var(--pd-space-3) var(--pd-space-5); }
      .ops-welcome__features { padding: var(--pd-space-12) var(--pd-space-5); }
      .ops-welcome__cta { padding: 0 var(--pd-space-5); margin-bottom: var(--pd-space-12); }
    }
  `],
})
export class WelcomeComponent {}
