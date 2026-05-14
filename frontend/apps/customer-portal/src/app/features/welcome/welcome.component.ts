import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonComponent, CardComponent } from '@pindraft/ui';

/**
 * Public landing for the customer-portal. Pitches Pindraft to shepherds and
 * designers separately — they want very different things, so the page splits
 * into two audience-tracks. Vanilla CSS, no Material.
 */
@Component({
  selector: 'customer-welcome',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonComponent, CardComponent],
  template: `
    <header class="cp-welcome__nav">
      <a routerLink="/welcome" class="cp-welcome__brand">Pindraft</a>
      <nav class="cp-welcome__nav-links">
        <a routerLink="/marketplace">Marketplace</a>
        <a routerLink="/mills">Mills</a>
        <a routerLink="/login">Sign in</a>
        <a routerLink="/register" class="cp-welcome__cta-link">Sign up →</a>
      </nav>
    </header>

    <section class="cp-welcome__hero">
      <div class="cp-welcome__hero-content">
        <h1 class="cp-welcome__title">
          Follow your fiber from the animal to the garment.
        </h1>
        <p class="cp-welcome__lead">
          Pindraft is the connective tissue of the U.S. small-mill fiber industry. Ship your wool, watch it move through the mill in real time, open a QR-scannable trace on every finished piece — and get paid faster.
        </p>
        <div class="cp-welcome__hero-actions">
          <a routerLink="/register">
            <pd-button variant="primary" size="lg">Create an account</pd-button>
          </a>
          <a routerLink="/marketplace">
            <pd-button variant="secondary" size="lg">Browse the marketplace</pd-button>
          </a>
        </div>
      </div>
      <div class="cp-welcome__hero-photo" aria-hidden="true">
        <div class="cp-welcome__hero-photo-inner">
          <div class="cp-welcome__photo-tag cp-welcome__photo-tag--1">Bramble · Romney · 31.8 µm</div>
          <div class="cp-welcome__photo-tag cp-welcome__photo-tag--2">Trace: <span>5C8A3E9D</span></div>
          <div class="cp-welcome__photo-tag cp-welcome__photo-tag--3">Status: Scoured. Drying.</div>
        </div>
      </div>
    </section>

    <section class="cp-welcome__audience">
      <div class="cp-welcome__audience-grid">

        <pd-card padding="lg">
          <span class="cp-welcome__audience-tag cp-welcome__audience-tag--shepherd">For shepherds</span>
          <h2 class="cp-welcome__audience-title">Your fleeces, in three places at once.</h2>
          <ul class="cp-welcome__audience-list">
            <li><strong>Reservations before shipping.</strong> No more bags piling up at the mill for months.</li>
            <li><strong>Cross-mill view.</strong> See your lots at every mill you ship to, in one place.</li>
            <li><strong>Lifetime micron history</strong> per animal. Test results follow the fleece and the breeding line.</li>
            <li><strong>Progress payments</strong> at intake, not pay-on-final-sale.</li>
            <li><strong>Wool pool participation.</strong> Combine your clip with neighbors' to fetch better prices.</li>
          </ul>
          <a routerLink="/register">
            <pd-button variant="primary">Sign up as a shepherd</pd-button>
          </a>
        </pd-card>

        <pd-card padding="lg">
          <span class="cp-welcome__audience-tag cp-welcome__audience-tag--designer">For designers &amp; brands</span>
          <h2 class="cp-welcome__audience-title">Sourcing with provenance.</h2>
          <ul class="cp-welcome__audience-list">
            <li><strong>Mill directory</strong> filtered by capability, capacity, and lead time.</li>
            <li><strong>Fleece marketplace</strong> — search by breed, micron, comfort factor, color, region.</li>
            <li><strong>QR-scannable trace</strong> from animal to finished garment for every piece.</li>
            <li><strong>Custom processing specs</strong> — breed, micron target, end product, color, finish.</li>
            <li><strong>Mill capacity calendars.</strong> Book ahead the way mills actually want.</li>
          </ul>
          <a routerLink="/marketplace">
            <pd-button variant="primary">Browse the marketplace</pd-button>
          </a>
        </pd-card>

      </div>
    </section>

    <section class="cp-welcome__how">
      <div class="cp-welcome__how-inner">
        <h2 class="cp-welcome__section-title">How a fleece travels.</h2>
        <p class="cp-welcome__section-lead">From the animal to a QR on a yarn label — every transformation captured.</p>

        <ol class="cp-welcome__how-steps">
          <li>
            <span class="cp-welcome__step-num">01</span>
            <h3>Reservation</h3>
            <p>Shepherd books a slot at a mill before shipping. Mill knows what's coming.</p>
          </li>
          <li>
            <span class="cp-welcome__step-num">02</span>
            <h3>Intake</h3>
            <p>Fleece arrives. Mill weighs each one, snaps it to the reservation, creates a lot.</p>
          </li>
          <li>
            <span class="cp-welcome__step-num">03</span>
            <h3>Processing</h3>
            <p>Scour → dry → pick → card → spin → ply → wind. Every stage scanned and journaled.</p>
          </li>
          <li>
            <span class="cp-welcome__step-num">04</span>
            <h3>Trace QR</h3>
            <p>Finished product gets a 6-character trace slug. Anyone scanning it sees the journey.</p>
          </li>
          <li>
            <span class="cp-welcome__step-num">05</span>
            <h3>Settle</h3>
            <p>Invoice generates from the pricing snapshot frozen at intake. Real money, exactly right.</p>
          </li>
        </ol>
      </div>
    </section>

    <section class="cp-welcome__final-cta">
      <pd-card variant="accent" padding="lg">
        <div class="cp-welcome__final-cta-inner">
          <div>
            <h2 class="cp-welcome__cta-title">Join the platform that's compressing turnaround from months to weeks.</h2>
            <p class="cp-welcome__cta-lead">Free to sign up. Browse without an account if you'd rather.</p>
          </div>
          <a routerLink="/register">
            <pd-button variant="primary" size="lg">Create your account</pd-button>
          </a>
        </div>
      </pd-card>
    </section>

    <footer class="cp-welcome__footer">
      <div class="cp-welcome__footer-inner">
        <span>Pindraft · The U.S. small-mill fiber platform</span>
        <span>
          <a routerLink="/marketplace">Marketplace</a> ·
          <a routerLink="/mills">Mills</a> ·
          <a routerLink="/login">Sign in</a>
        </span>
      </div>
    </footer>
  `,
  styles: [`
    :host { display: block; background: var(--pd-color-bg-app); color: var(--pd-color-text); }

    .cp-welcome__nav {
      display: flex; align-items: center; justify-content: space-between;
      padding: var(--pd-space-4) var(--pd-space-8);
      border-bottom: 1px solid var(--pd-cream-200);
      background: var(--pd-color-bg-app);
    }
    .cp-welcome__brand {
      font-size: var(--pd-text-md);
      font-weight: var(--pd-weight-semibold);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--pd-brand-accent-strong);
      text-decoration: none;
    }
    .cp-welcome__nav-links { display: flex; gap: var(--pd-space-6); align-items: center; }
    .cp-welcome__nav-links a { color: var(--pd-color-text-muted); text-decoration: none; font-size: var(--pd-text-sm); font-weight: var(--pd-weight-medium); }
    .cp-welcome__nav-links a:hover { color: var(--pd-color-text); }
    .cp-welcome__cta-link { color: var(--pd-brand-accent) !important; }

    .cp-welcome__hero {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: var(--pd-space-12);
      padding: var(--pd-space-16) var(--pd-space-12);
      align-items: center;
      background: linear-gradient(135deg, var(--pd-cream-50) 0%, var(--pd-cream-100) 100%);
    }
    .cp-welcome__hero-content { max-width: 56ch; }
    .cp-welcome__title {
      margin: 0;
      font-size: clamp(36px, 5vw, 60px);
      line-height: 1.05;
      font-weight: var(--pd-weight-semibold);
      letter-spacing: -0.025em;
      color: var(--pd-slate-900);
    }
    .cp-welcome__lead {
      margin: var(--pd-space-6) 0 var(--pd-space-8);
      font-size: var(--pd-text-md);
      line-height: 1.55;
      color: var(--pd-slate-700);
      max-width: 54ch;
    }
    .cp-welcome__hero-actions { display: flex; gap: var(--pd-space-3); flex-wrap: wrap; }

    /* Hero "photo" placeholder — a layered illustration of a fleece with overlay tags.
       Real photo would replace this; the illustration carries the brand even without one. */
    .cp-welcome__hero-photo {
      aspect-ratio: 5/6;
      border-radius: var(--pd-radius-xl);
      background:
        radial-gradient(ellipse at 30% 35%, var(--pd-cream-100) 0%, var(--pd-cream-200) 40%, var(--pd-hay-300) 100%);
      box-shadow: 0 30px 60px -20px rgba(74, 42, 26, 0.25);
      position: relative;
      overflow: hidden;
    }
    .cp-welcome__hero-photo-inner { position: absolute; inset: 0; }
    .cp-welcome__photo-tag {
      position: absolute;
      background: rgba(255, 255, 255, 0.95);
      padding: var(--pd-space-2) var(--pd-space-3);
      border-radius: var(--pd-radius-md);
      font-family: var(--pd-font-mono);
      font-size: var(--pd-text-xs);
      color: var(--pd-slate-800);
      box-shadow: 0 2px 8px rgba(74, 42, 26, 0.15);
    }
    .cp-welcome__photo-tag--1 { top: 12%; left: 8%; }
    .cp-welcome__photo-tag--2 { top: 45%; right: 6%; background: var(--pd-brand-accent); color: #fff; }
    .cp-welcome__photo-tag--2 span { font-weight: var(--pd-weight-semibold); }
    .cp-welcome__photo-tag--3 { bottom: 12%; left: 12%; }

    .cp-welcome__audience { max-width: var(--pd-page-max-width); margin: 0 auto; padding: var(--pd-space-16) var(--pd-space-8); }
    .cp-welcome__audience-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: var(--pd-space-6); }
    .cp-welcome__audience-tag {
      display: inline-block;
      padding: 4px var(--pd-space-3);
      border-radius: var(--pd-radius-full);
      font-size: var(--pd-text-xs);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: var(--pd-space-4);
    }
    .cp-welcome__audience-tag--shepherd { background: var(--pd-hay-300); color: var(--pd-slate-900); }
    .cp-welcome__audience-tag--designer { background: var(--pd-sage-100); color: var(--pd-sage-900); }
    .cp-welcome__audience-title {
      margin: 0;
      font-size: var(--pd-text-xl);
      line-height: var(--pd-leading-xl);
      font-weight: var(--pd-weight-semibold);
      letter-spacing: -0.01em;
      color: var(--pd-color-text);
    }
    .cp-welcome__audience-list {
      list-style: none;
      padding: 0;
      margin: var(--pd-space-5) 0 var(--pd-space-6);
      display: flex;
      flex-direction: column;
      gap: var(--pd-space-3);
    }
    .cp-welcome__audience-list li {
      padding-left: var(--pd-space-5);
      position: relative;
      font-size: var(--pd-text-base);
      line-height: 1.55;
      color: var(--pd-color-text-muted);
    }
    .cp-welcome__audience-list li::before {
      content: '';
      position: absolute;
      left: 0; top: 9px;
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--pd-brand-accent);
    }
    .cp-welcome__audience-list li strong { color: var(--pd-color-text); font-weight: var(--pd-weight-semibold); }

    .cp-welcome__how { background: var(--pd-slate-900); color: rgba(255, 255, 255, 0.85); }
    .cp-welcome__how-inner { max-width: var(--pd-page-max-width); margin: 0 auto; padding: var(--pd-space-16) var(--pd-space-8); }
    .cp-welcome__section-title { margin: 0; color: #fff; font-size: clamp(28px, 3vw, 40px); font-weight: var(--pd-weight-semibold); letter-spacing: -0.02em; line-height: 1.1; }
    .cp-welcome__section-lead { margin: var(--pd-space-4) 0 var(--pd-space-12); color: rgba(255, 255, 255, 0.65); font-size: var(--pd-text-md); max-width: 60ch; }
    .cp-welcome__how-steps {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: var(--pd-space-6);
    }
    .cp-welcome__how-steps li { padding-top: var(--pd-space-6); border-top: 1px solid rgba(255, 255, 255, 0.15); }
    .cp-welcome__step-num { font-family: var(--pd-font-mono); font-size: var(--pd-text-sm); color: var(--pd-hay-300); letter-spacing: 0.1em; }
    .cp-welcome__how-steps h3 { margin: var(--pd-space-3) 0 var(--pd-space-2); color: #fff; font-size: var(--pd-text-lg); font-weight: var(--pd-weight-semibold); }
    .cp-welcome__how-steps p { margin: 0; color: rgba(255, 255, 255, 0.65); font-size: var(--pd-text-base); line-height: 1.55; }

    .cp-welcome__final-cta { max-width: var(--pd-page-max-width); margin: 0 auto var(--pd-space-16); padding: var(--pd-space-16) var(--pd-space-8) 0; }
    .cp-welcome__final-cta-inner { display: flex; justify-content: space-between; align-items: center; gap: var(--pd-space-6); flex-wrap: wrap; }
    .cp-welcome__cta-title { margin: 0; font-size: var(--pd-text-xl); line-height: var(--pd-leading-xl); font-weight: var(--pd-weight-semibold); color: var(--pd-color-text); max-width: 36ch; }
    .cp-welcome__cta-lead { margin: var(--pd-space-2) 0 0; color: var(--pd-color-text-muted); font-size: var(--pd-text-base); }

    .cp-welcome__footer { background: var(--pd-cream-100); padding: var(--pd-space-6) var(--pd-space-8); }
    .cp-welcome__footer-inner { max-width: var(--pd-page-max-width); margin: 0 auto; display: flex; justify-content: space-between; align-items: center; gap: var(--pd-space-4); flex-wrap: wrap; font-size: var(--pd-text-sm); color: var(--pd-color-text-muted); }
    .cp-welcome__footer a { color: var(--pd-brand-accent-strong); text-decoration: none; }
    .cp-welcome__footer a:hover { text-decoration: underline; }

    @media (max-width: 880px) {
      .cp-welcome__nav { padding: var(--pd-space-3) var(--pd-space-5); gap: var(--pd-space-3); }
      .cp-welcome__nav-links { gap: var(--pd-space-3); font-size: var(--pd-text-xs); }
      .cp-welcome__hero { grid-template-columns: 1fr; padding: var(--pd-space-12) var(--pd-space-5); }
      .cp-welcome__hero-photo { aspect-ratio: 4/3; }
      .cp-welcome__audience { padding: var(--pd-space-12) var(--pd-space-5); }
      .cp-welcome__how-inner { padding: var(--pd-space-12) var(--pd-space-5); }
      .cp-welcome__final-cta { padding: var(--pd-space-12) var(--pd-space-5) 0; }
    }
  `],
})
export class WelcomeComponent {}
