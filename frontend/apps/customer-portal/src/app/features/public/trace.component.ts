import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CardComponent, EmptyStateComponent } from '@pindraft/ui';
import { PublicTraceResponse, PublicTraceService } from './services/public-trace.service';

/**
 * Public unauthenticated trace page. Resolved by short slug — what a printed
 * QR code or marketplace provenance link leads to. The most consumer-facing
 * Pindraft surface; reads as a polished story, not a database dump.
 *
 * Stage labels are friendly versions of the canonical taxonomy (INTAKE →
 * "Received", SCOUR → "Washed", etc.) since the visitor doesn't know any
 * mill's local vocabulary.
 */
@Component({
  selector: 'customer-public-trace',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, MatIconModule, CardComponent, EmptyStateComponent],
  template: `
    <div class="tr">
      <header class="tr__header">
        <a routerLink="/welcome" class="tr__brand">Pindraft</a>
        <span class="tr__tagline">Provenance for fiber</span>
      </header>

      @if (trace(); as t) {
        <main class="tr__main">
          <section class="tr__hero">
            <span class="tr__eyebrow">Trace · {{ t.slug }}</span>
            <h1 class="tr__title">{{ t.customerDisplayName }}</h1>
            <p class="tr__lead">
              {{ t.intakeWeightKg }} kg of fiber, received {{ t.createdAt | date:'mediumDate' }}.
              Every transformation captured at the moment it happened.
            </p>
          </section>

          <section class="tr__journey">
            <h2 class="tr__section-title">Journey through the mill</h2>

            <ol class="tr__timeline">
              @for (segment of t.segments; track segment.enteredAt) {
                <li class="tr__step" [class.tr__step--current]="!segment.exitedAt">
                  <div class="tr__step-dot" aria-hidden="true">
                    @if (segment.exitedAt) {
                      <mat-icon class="tr__step-icon">check</mat-icon>
                    } @else {
                      <span class="tr__step-pulse"></span>
                    }
                  </div>
                  <div class="tr__step-body">
                    <div class="tr__step-stage">{{ stageLabel(segment.stageType) }}</div>
                    <div class="tr__step-dates">
                      {{ segment.enteredAt | date:'mediumDate' }}
                      @if (segment.exitedAt) {
                        <span class="tr__step-arrow">→</span>
                        {{ segment.exitedAt | date:'mediumDate' }}
                        <span class="tr__step-duration">({{ daysBetween(segment.enteredAt, segment.exitedAt) }} days)</span>
                      } @else {
                        <em class="tr__step-current-label">— currently here</em>
                      }
                    </div>
                    @if (segment.exitedAt && segment.weightInKg !== null && segment.weightOutKg !== null) {
                      <div class="tr__step-weights">
                        <span class="tr__weight-in">{{ segment.weightInKg }} kg</span>
                        <span class="tr__weight-arrow">→</span>
                        <span class="tr__weight-out">{{ segment.weightOutKg }} kg</span>
                      </div>
                    }
                  </div>
                </li>
              }
            </ol>
          </section>

          <pd-card variant="accent" padding="lg">
            <h3 class="tr__cta-title">Want to follow your own fiber?</h3>
            <p class="tr__cta-lead">Pindraft is the platform that captures these traces. Sign up as a shepherd to send fiber to a participating mill, or browse the marketplace for traced yarn.</p>
            <div class="tr__cta-actions">
              <a routerLink="/register" class="tr__cta-primary">Sign up</a>
              <a routerLink="/marketplace" class="tr__cta-secondary">Browse marketplace →</a>
            </div>
          </pd-card>

          <footer class="tr__footer">
            <span>Trace ID: <code>{{ t.slug }}</code></span>
            <span>Verified by Pindraft</span>
          </footer>
        </main>
      } @else if (notFound()) {
        <main class="tr__main">
          <pd-empty-state
            title="Trace not found"
            description="This trace ID doesn't exist, or its owner hasn't made it public.">
            <a routerLink="/marketplace" class="tr__cta-primary">Browse the marketplace</a>
          </pd-empty-state>
        </main>
      } @else {
        <p class="tr__loading">Loading trace…</p>
      }
    </div>
  `,
  styles: [`
    :host { display: block; background: var(--pd-color-bg-app); min-height: 100vh; }

    .tr__header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      max-width: 720px;
      margin: 0 auto;
      padding: var(--pd-space-6) var(--pd-space-6) var(--pd-space-4);
      border-bottom: 1px solid var(--pd-cream-200);
    }
    .tr__brand {
      font-size: var(--pd-text-md);
      font-weight: var(--pd-weight-semibold);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--pd-brand-accent-strong);
      text-decoration: none;
    }
    .tr__tagline {
      font-size: var(--pd-text-xs);
      color: var(--pd-color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .tr__main { max-width: 720px; margin: 0 auto; padding: var(--pd-space-8) var(--pd-space-6); }
    .tr__loading { padding: var(--pd-space-12); text-align: center; color: var(--pd-color-text-muted); }

    .tr__hero { margin-bottom: var(--pd-space-12); }
    .tr__eyebrow {
      display: inline-block;
      font-family: var(--pd-font-mono);
      font-size: var(--pd-text-xs);
      color: var(--pd-brand-accent);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: var(--pd-space-3);
    }
    .tr__title {
      margin: 0;
      font-size: clamp(32px, 5vw, 44px);
      line-height: 1.1;
      font-weight: var(--pd-weight-semibold);
      letter-spacing: -0.02em;
      color: var(--pd-slate-900);
    }
    .tr__lead {
      margin: var(--pd-space-4) 0 0;
      font-size: var(--pd-text-md);
      line-height: 1.55;
      color: var(--pd-slate-700);
      max-width: 56ch;
    }

    .tr__journey { margin-bottom: var(--pd-space-12); }
    .tr__section-title {
      font-size: var(--pd-text-xs);
      line-height: var(--pd-leading-xs);
      font-weight: var(--pd-weight-semibold);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--pd-color-text-muted);
      margin: 0 0 var(--pd-space-5);
    }

    .tr__timeline { list-style: none; padding: 0; margin: 0; position: relative; }
    .tr__timeline::before {
      content: '';
      position: absolute;
      left: 11px;
      top: 16px;
      bottom: 16px;
      width: 2px;
      background: var(--pd-cream-200);
    }
    .tr__step {
      display: flex;
      gap: var(--pd-space-4);
      padding: var(--pd-space-3) 0;
      position: relative;
    }
    .tr__step-dot {
      flex: 0 0 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--pd-brand-accent);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 1;
    }
    .tr__step-icon { font-size: 16px; height: 16px; width: 16px; }
    .tr__step--current .tr__step-dot {
      background: var(--pd-color-bg-app);
      border: 2px solid var(--pd-brand-accent);
    }
    .tr__step-pulse {
      width: 10px; height: 10px; border-radius: 50%;
      background: var(--pd-brand-accent);
      animation: tr-pulse 1.5s ease-in-out infinite;
    }
    @keyframes tr-pulse {
      0%, 100% { opacity: 0.5; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.1); }
    }
    .tr__step-body { flex: 1; padding-top: 2px; }
    .tr__step-stage {
      font-size: var(--pd-text-md);
      font-weight: var(--pd-weight-semibold);
      color: var(--pd-color-text);
    }
    .tr__step-dates {
      font-size: var(--pd-text-sm);
      color: var(--pd-color-text-muted);
      margin-top: 2px;
    }
    .tr__step-arrow { color: var(--pd-color-text-subtle); margin: 0 4px; }
    .tr__step-duration { color: var(--pd-color-text-subtle); margin-left: 4px; }
    .tr__step-current-label { color: var(--pd-brand-accent); font-style: italic; }
    .tr__step-weights {
      display: inline-flex;
      align-items: baseline;
      gap: 6px;
      margin-top: var(--pd-space-2);
      padding: 2px var(--pd-space-2);
      background: var(--pd-color-bg-sunken);
      border-radius: var(--pd-radius-sm);
      font-family: var(--pd-font-mono);
      font-size: var(--pd-text-xs);
      color: var(--pd-color-text-muted);
    }
    .tr__weight-in { color: var(--pd-color-text); font-weight: var(--pd-weight-medium); }
    .tr__weight-out { color: var(--pd-color-text); font-weight: var(--pd-weight-medium); }
    .tr__weight-arrow { color: var(--pd-color-text-subtle); }

    .tr__cta-title { margin: 0 0 var(--pd-space-2); font-size: var(--pd-text-md); font-weight: var(--pd-weight-semibold); color: var(--pd-color-text); }
    .tr__cta-lead { margin: 0 0 var(--pd-space-5); font-size: var(--pd-text-sm); line-height: 1.55; color: var(--pd-color-text-muted); }
    .tr__cta-actions { display: flex; gap: var(--pd-space-3); align-items: center; flex-wrap: wrap; }
    .tr__cta-primary {
      display: inline-block;
      padding: 8px var(--pd-space-4);
      background: var(--pd-brand-accent);
      color: var(--pd-brand-text-on-accent);
      text-decoration: none;
      border-radius: var(--pd-radius-md);
      font-weight: var(--pd-weight-medium);
      font-size: var(--pd-text-sm);
    }
    .tr__cta-primary:hover { background: var(--pd-brand-accent-hover); }
    .tr__cta-secondary {
      color: var(--pd-brand-accent);
      text-decoration: none;
      font-size: var(--pd-text-sm);
      font-weight: var(--pd-weight-medium);
    }
    .tr__cta-secondary:hover { color: var(--pd-brand-accent-hover); }

    .tr__footer {
      margin-top: var(--pd-space-10);
      padding-top: var(--pd-space-5);
      border-top: 1px solid var(--pd-cream-200);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: var(--pd-text-xs);
      color: var(--pd-color-text-muted);
    }
    .tr__footer code {
      font-family: var(--pd-font-mono);
      color: var(--pd-color-text);
      background: var(--pd-color-bg-sunken);
      padding: 2px 6px;
      border-radius: var(--pd-radius-sm);
    }
  `],
})
export class PublicTraceComponent {
  private service = inject(PublicTraceService);
  private route = inject(ActivatedRoute);

  readonly trace = signal<PublicTraceResponse | null>(null);
  readonly notFound = signal(false);

  private readonly STAGE_LABELS: Record<string, string> = {
    INTAKE: 'Received',
    SORT: 'Sorted',
    SCOUR: 'Washed',
    DRY: 'Dried',
    PICK: 'Picked',
    SEPARATE: 'Separated',
    CARD: 'Carded',
    PINDRAFT: 'Aligned',
    SPIN: 'Spun',
    PLY: 'Plied',
    WIND: 'Wound',
    SHIP: 'Shipped back',
  };

  constructor() {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.notFound.set(true);
      return;
    }
    this.service.getBySlug(slug).subscribe({
      next: (t) => this.trace.set(t),
      error: () => this.notFound.set(true),
    });
  }

  stageLabel(stageType: string): string {
    return this.STAGE_LABELS[stageType] ?? stageType;
  }

  daysBetween(a: string, b: string): number {
    const ms = new Date(b).getTime() - new Date(a).getTime();
    return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
  }
}
