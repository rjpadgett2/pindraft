import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  ButtonComponent, CardComponent, KeyValueGridComponent, KvComponent,
  PageHeaderComponent, SnackbarService,
} from '@pindraft/ui';
import {
  CustomerLotDetail,
  CustomerLotsService,
  LotStatusProjection,
  MeFiberTest,
  TraceMeta,
} from './services/customer.service';

/**
 * Read-only lot detail for the shepherd, with trace-visibility toggle.
 * Stage names come pre-resolved from the backend now — no more raw UUIDs.
 */
@Component({
  selector: 'customer-lot-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, RouterLink,
    ButtonComponent, CardComponent, KeyValueGridComponent, KvComponent,
    PageHeaderComponent,
  ],
  template: `
    <div class="page">
      <a routerLink="/lots" class="back">← Back to my fiber</a>

      @if (detail(); as d) {
        <pd-page-header
          [title]="'Lot ' + d.lot.id.substring(0, 8)"
          [subtitle]="receivedLabel(d.lot.createdAt)" />

        @if (status(); as s) {
          <pd-card variant="accent" class="status-card">
            <small>Current status</small>
            <div class="status-text">{{ s.customerVisibleStatus }}</div>
            @if (s.currentStage && s.currentStage.queuePosition > 1) {
              <small class="position-hint">{{ s.currentStage.queuePosition - 1 }} lot(s) ahead of yours at this stage.</small>
            }
          </pd-card>
        }

        <pd-key-value-grid>
          <pd-kv label="Intake weight">{{ d.lot.weightIntakeKg }} kg</pd-kv>
          <pd-kv label="Current stage">{{ d.lot.currentStageDisplayName ?? '—' }}</pd-kv>
          <pd-kv label="Status">{{ d.lot.status }}</pd-kv>
        </pd-key-value-grid>

        @if (trace(); as t) {
          <pd-card class="trace-card">
            <div class="trace-row">
              <div>
                <strong>Public provenance page</strong>
                <p>Make this lot's journey through the mill publicly viewable at a short URL.</p>
              </div>
              <label class="toggle">
                <input type="checkbox" [checked]="t.publicVisible"
                       (change)="toggleVisibility(getChecked($event))" />
                <span class="track"><span class="thumb"></span></span>
                <span class="toggle-label">{{ t.publicVisible ? 'Public' : 'Private' }}</span>
              </label>
            </div>
            @if (t.publicVisible) {
              <div class="trace-url">
                <code>{{ traceUrl(t.slug) }}</code>
                <pd-button variant="ghost" size="sm" (click)="copyTraceUrl(t.slug)" title="Copy URL">
                  Copy
                </pd-button>
              </div>
            }
          </pd-card>
        }

        <h2 class="section">Journey through the mill</h2>
        <ol class="timeline">
          @for (event of d.history; track event.id) {
            <li>
              <strong>{{ event.stageDisplayName ?? 'Stage' }}</strong>
              <div class="meta">
                Entered {{ event.enteredAt | date:'short' }}
                @if (event.exitedAt) {
                  • Exited {{ event.exitedAt | date:'short' }}
                  • {{ event.weightInKg }} kg → {{ event.weightOutKg }} kg
                } @else {
                  • <em>Currently here</em>
                }
              </div>
            </li>
          }
        </ol>

        <h2 class="section">Your fleeces in this lot</h2>
        <ul class="fleeces">
          @for (f of d.fleeces; track f.id) {
            <li>
              <strong>{{ f.sourceAnimalName || 'Unnamed' }}</strong>
              @if (f.breedCode) { <span class="chip">{{ f.breedCode }}</span> }
              <span class="weight">{{ f.weightKg }} kg</span>
            </li>
          }
        </ul>

        @if (fiberTests().length > 0) {
          <h2 class="section">Fiber test results</h2>
          <ul class="tests">
            @for (t of fiberTests(); track t.id) {
              <li>
                <strong>{{ formatTestType(t.testType) }}</strong>
                @if (t.resultNumeric !== null) {
                  <span class="result">{{ t.resultNumeric }}{{ t.resultUnit ? ' ' + t.resultUnit : '' }}</span>
                }
                @if (t.instrument) { <span class="chip">{{ t.instrument }}</span> }
                <span class="weight">{{ t.testedAt | date:'mediumDate' }}</span>
              </li>
            }
          </ul>
        }
      } @else if (loading()) {
        <p class="muted">Loading…</p>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px 32px; }
    .back { display: inline-block; margin-bottom: 12px; font-size: 13px; color: var(--pd-color-link, #2563eb); text-decoration: none; }
    .muted { color: var(--pd-color-muted, #6b7280); font-size: 13px; }
    .status-card { margin: 0 0 16px; }
    .status-card small { color: var(--pd-color-muted, #6b7280); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    .status-text { font-size: 18px; font-weight: 600; margin-top: 4px; color: var(--pd-color-text, #111); }
    .position-hint { display: block; margin-top: 6px; color: var(--pd-color-muted, #6b7280); text-transform: none; letter-spacing: normal; font-size: 12px; }
    .trace-card { margin: 16px 0; }
    .trace-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
    .trace-row p { font-size: 12px; color: var(--pd-color-muted, #666); margin: 4px 0 0; }
    .trace-url { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding: 8px 12px; background: var(--pd-color-bg-sunken, #f9fafb); border-radius: 6px; }
    .trace-url code { flex: 1; font-size: 13px; color: var(--pd-color-text, #1a1a1a); font-family: var(--pd-font-mono, ui-monospace, monospace); }
    .toggle { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; user-select: none; }
    .toggle input { position: absolute; opacity: 0; pointer-events: none; }
    .toggle .track { display: inline-block; width: 36px; height: 20px; background: #d1d5db; border-radius: 999px; position: relative; transition: background 0.15s; }
    .toggle .thumb { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; background: white; border-radius: 50%; transition: transform 0.15s; box-shadow: 0 1px 2px rgba(0,0,0,0.15); }
    .toggle input:checked + .track { background: var(--pd-brand-accent, #c2410c); }
    .toggle input:checked + .track .thumb { transform: translateX(16px); }
    .toggle input:focus-visible + .track { outline: 2px solid var(--pd-brand-accent, #c2410c); outline-offset: 2px; }
    .section { font-size: 14px; font-weight: 600; margin: 24px 0 12px; color: var(--pd-color-text, #111); }
    .timeline { list-style: none; padding: 0; margin: 0; border-left: 2px solid var(--pd-color-border, #e5e7eb); padding-left: 16px; }
    .timeline li { padding: 8px 0; }
    .timeline .meta { font-size: 12px; color: var(--pd-color-muted, #666); margin-top: 2px; }
    .fleeces, .tests { list-style: none; padding: 0; margin: 0; }
    .fleeces li, .tests li { padding: 8px 12px; background: white; border: 1px solid var(--pd-color-border, #e5e7eb); border-radius: 6px; margin-bottom: 6px; display: flex; gap: 12px; align-items: center; font-size: 13px; }
    .fleeces .chip, .tests .chip { font-size: 11px; padding: 2px 8px; background: #f3f4f6; border-radius: 4px; }
    .fleeces .weight, .tests .weight { margin-left: auto; color: var(--pd-color-muted, #666); }
    .tests .result { font-weight: 600; font-family: var(--pd-font-mono, ui-monospace, monospace); color: var(--pd-color-text, #1a1a1a); }
  `],
})
export class CustomerLotDetailComponent {
  private service = inject(CustomerLotsService);
  private route = inject(ActivatedRoute);
  private snack = inject(SnackbarService);

  readonly loading = signal(true);
  readonly detail = signal<CustomerLotDetail | null>(null);
  readonly trace = signal<TraceMeta | null>(null);
  readonly status = signal<LotStatusProjection | null>(null);
  readonly fiberTests = signal<MeFiberTest[]>([]);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.service.getLot(id).subscribe({
      next: (d) => { this.detail.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });

    this.service.getTraceMeta(id).subscribe({
      next: (t) => this.trace.set(t),
      error: () => { /* trace might not exist yet — fine */ },
    });

    this.service.getLotStatus(id).subscribe({
      next: (s) => this.status.set(s),
      error: () => { /* status projection optional — don't block render */ },
    });

    this.service.getFiberTests(id).subscribe({
      next: (tests) => this.fiberTests.set(tests),
      error: () => { /* tests may not exist yet — fine */ },
    });
  }

  receivedLabel(iso: string): string {
    return 'Received ' + new Date(iso).toLocaleString();
  }

  formatTestType(t: string): string {
    return t.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
  }

  traceUrl(slug: string): string {
    return `${window.location.origin}/trace/${slug}`;
  }

  copyTraceUrl(slug: string): void {
    navigator.clipboard.writeText(this.traceUrl(slug)).then(() =>
      this.snack.show('URL copied', { durationMs: 1500 })
    );
  }

  getChecked(e: Event): boolean {
    return (e.target as HTMLInputElement).checked;
  }

  toggleVisibility(checked: boolean): void {
    const lotId = this.detail()?.lot.id;
    if (!lotId) return;
    this.service.setTraceVisibility(lotId, checked).subscribe({
      next: (t) => {
        this.trace.set(t);
        this.snack.show(checked ? 'Now public' : 'Now private', { durationMs: 1500 });
      },
      error: (e) => this.snack.show('Failed: ' + (e?.error?.detail ?? 'unknown')),
    });
  }
}
