import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { PublicTraceResponse, PublicTraceService } from './services/public-trace.service';

/**
 * Unauthenticated public trace page. Renders the journey of one lot through a mill,
 * resolved by short slug. No login required — this is what a printed QR code or
 * marketplace provenance link leads to.
 *
 * Stage labels are friendly versions of the canonical taxonomy (INTAKE → "Received",
 * SCOUR → "Washed", etc.) since the visitor doesn't know any mill's local vocabulary.
 */
@Component({
  selector: 'customer-public-trace',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatCardModule, MatIconModule],
  template: `
    <div class="public-page">
      <header class="public-header">
        <span class="brand">Pindraft</span>
        <span class="tagline">Provenance for your fiber</span>
      </header>

      @if (trace(); as t) {
        <h1>{{ t.customerDisplayName }}</h1>
        <p class="lead">
          {{ t.intakeWeightKg }} kg of fiber, received {{ t.createdAt | date:'mediumDate' }}.
        </p>

        <h2>Journey through the mill</h2>
        <ol class="timeline">
          @for (segment of t.segments; track segment.enteredAt) {
            <li>
              <div class="stage">{{ stageLabel(segment.stageType) }}</div>
              <div class="dates">
                {{ segment.enteredAt | date:'mediumDate' }}
                @if (segment.exitedAt) {
                  → {{ segment.exitedAt | date:'mediumDate' }}
                  <span class="duration">({{ daysBetween(segment.enteredAt, segment.exitedAt) }} days)</span>
                } @else {
                  <em>— currently here</em>
                }
              </div>
              @if (segment.exitedAt && segment.weightInKg !== null && segment.weightOutKg !== null) {
                <div class="weights">
                  {{ segment.weightInKg }} kg in → {{ segment.weightOutKg }} kg out
                </div>
              }
            </li>
          }
        </ol>

        <footer class="public-footer">
          <small>Trace ID: {{ t.slug }}</small>
        </footer>
      } @else if (notFound()) {
        <div class="not-found">
          <mat-icon>search_off</mat-icon>
          <h1>Trace not found</h1>
          <p>This trace ID doesn't exist, or its owner hasn't made it public.</p>
        </div>
      } @else {
        <p>Loading…</p>
      }
    </div>
  `,
  styles: [`
    .public-page { max-width: 640px; margin: 0 auto; padding: 32px 24px; }
    .public-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 32px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb; }
    .brand { font-size: 18px; font-weight: 500; }
    .tagline { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
    h1 { font-size: 28px; font-weight: 500; margin: 0 0 8px; }
    .lead { color: #666; font-size: 15px; margin: 0 0 32px; }
    h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #666; margin: 24px 0 12px; font-weight: 500; }
    .timeline { list-style: none; padding: 0; margin: 0; border-left: 2px solid #e5e7eb; padding-left: 20px; }
    .timeline li { padding: 12px 0; }
    .timeline .stage { font-weight: 500; font-size: 16px; }
    .timeline .dates { font-size: 13px; color: #666; margin-top: 2px; }
    .timeline .duration { color: #9ca3af; margin-left: 4px; }
    .timeline .weights { font-size: 12px; color: #9ca3af; margin-top: 2px; }
    .public-footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; }
    .public-footer small { color: #9ca3af; font-family: monospace; }
    .not-found { text-align: center; padding: 48px 24px; color: #666; }
    .not-found mat-icon { font-size: 48px; height: 48px; width: 48px; color: #9ca3af; }
    .not-found h1 { font-size: 20px; margin: 16px 0 8px; }
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
