import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Customer, LotDetailFull, WorkflowStage } from '@pindraft/api-client';
import { AuthService } from '@pindraft/auth';
import {
  ButtonComponent,
  EmptyStateComponent,
  InputComponent,
  KeyValueGridComponent,
  KvComponent,
  PageHeaderComponent,
  SelectComponent,
  SelectOption,
  SnackbarService,
  StatusChipComponent,
  type Tone,
} from '@pindraft/ui';
import { forkJoin } from 'rxjs';
import { OnboardingService } from '../onboarding/services/onboarding.service';
import { LotHistoryTimelineComponent } from './lot-history-timeline.component';
import { FiberTest, FiberTestsService, FiberTestType } from './services/fiber-tests.service';
import { OperationsService } from './services/operations.service';

/**
 * Lot detail — the most-used operator surface. Composed against the @pindraft/ui
 * primitives: pd-page-header for the top, pd-key-value-grid for lot metadata,
 * pd-status-chip for lifecycle state, pd-empty-state for the no-tests case.
 * All visual values come from design tokens (var(--pd-…)) so theming or design
 * tuning happens in libs/ui rather than here.
 */
@Component({
  selector: 'ops-lot-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, RouterLink, DatePipe,
    LotHistoryTimelineComponent,
    ButtonComponent, EmptyStateComponent, InputComponent,
    KeyValueGridComponent, KvComponent, PageHeaderComponent,
    SelectComponent, StatusChipComponent,
  ],
  template: `
    <div class="page">
      <a routerLink="/ops/reservations" class="back">← Back</a>

      @if (detail(); as d) {
        <pd-page-header
          [title]="'Lot ' + d.lot.id.substring(0, 8)"
          [subtitle]="customerName() + ' · created ' + (d.lot.createdAt | date:'medium')">
          <pd-status-chip [label]="d.lot.status" [tone]="statusTone()" />
        </pd-page-header>

        <section class="meta">
          <pd-key-value-grid>
            <pd-kv label="Intake weight">
              <span class="numeric">{{ d.lot.weightIntakeKg }} kg</span>
            </pd-kv>
            <pd-kv label="Current stage">{{ currentStageName() }}</pd-kv>
            <pd-kv label="Pricing">
              <span class="mono">{{ pricingSummary() }}</span>
            </pd-kv>
            <pd-kv label="Lot ID">
              <span class="mono mono--id">{{ d.lot.id }}</span>
            </pd-kv>
          </pd-key-value-grid>
        </section>

        <h2 class="section-title">Stage history</h2>
        <ops-lot-history-timeline [events]="d.history" [stages]="stages()" />

        <h2 class="section-title">Fleeces</h2>
        <ul class="list">
          @for (f of d.fleeces; track f.id) {
            <li class="list__item">
              <strong>{{ f.sourceAnimalName || 'Unnamed' }}</strong>
              @if (f.breedCode) { <span class="tag">{{ f.breedCode }}</span> }
              <span class="numeric meta-right">{{ f.weightKg }} kg</span>
              @if (f.notes) { <em class="dim">— {{ f.notes }}</em> }
            </li>
          }
        </ul>

        @if (canTransition()) {
          <h2 class="section-title">Move to next stage</h2>
          <div class="action-panel">
            <p class="action-panel__lead">Next: <strong>{{ nextStageName() }}</strong></p>
            <div class="form-row">
              <pd-input label="Weight out (kg)" type="number" [(ngModel)]="weightOut" />
              <pd-input class="grow" label="Notes (optional)" [(ngModel)]="notes" />
              <pd-button variant="primary"
                  [disabled]="!canSaveTransition() || transitioning()" (click)="transition()">
                {{ transitioning() ? 'Moving…' : 'Move to ' + nextStageName() }}
              </pd-button>
            </div>
          </div>
        }

        <h2 class="section-title">Fiber tests</h2>
        <div class="action-panel">
          @if (fiberTests().length === 0) {
            <pd-empty-state
              title="No tests attached yet"
              description="Record micron, comfort factor, or staple length here. Results show up in the shepherd's lifetime micron view." />
          } @else {
            <ul class="list">
              @for (t of fiberTests(); track t.id) {
                <li class="list__item">
                  <strong>{{ formatTestType(t.testType) }}</strong>
                  @if (t.resultNumeric !== null) {
                    <span class="numeric numeric--strong">{{ t.resultNumeric }}{{ t.resultUnit ? ' ' + t.resultUnit : '' }}</span>
                  }
                  @if (t.instrument) { <span class="tag">{{ t.instrument }}</span> }
                  <span class="dim meta-right">{{ t.testedAt | date:'mediumDate' }}</span>
                </li>
              }
            </ul>
          }
          <div class="form-row form-row--tight">
            <pd-select label="Test" [(ngModel)]="newTest.testType" [options]="testTypeOptions" />
            <pd-input label="Instrument" [(ngModel)]="newTest.instrument" />
            <pd-input label="Result" type="number" [(ngModel)]="newTest.resultNumeric" />
            <pd-input label="Unit" [(ngModel)]="newTest.resultUnit" />
            <pd-button variant="primary"
                    [disabled]="!canAttachTest() || attachingTest()" (click)="attachTest()">
              {{ attachingTest() ? 'Saving…' : 'Attach test' }}
            </pd-button>
          </div>
        </div>

        @if (d.lot.status === 'ACTIVE') {
          <h2 class="section-title">Complete this lot</h2>
          <div class="action-panel">
            <p class="action-panel__lead dim">Closes the open stage event with a final weight and auto-generates a draft invoice (unless this lot is pool-merged).</p>
            <div class="form-row">
              <pd-input label="Final weight (kg, optional)" type="number" [(ngModel)]="completeWeight" />
              <pd-button variant="primary"
                  [disabled]="completing()" (click)="complete()">
                {{ completing() ? 'Completing…' : 'Mark complete' }}
              </pd-button>
            </div>
          </div>

          <h2 class="section-title">Split this lot</h2>
          <div class="action-panel">
            <p class="action-panel__lead dim">The parent lot is marked complete; each child inherits the pricing snapshot and continues from the current stage. Lineage is recorded.</p>
            <div class="split-rows">
              @for (c of splitChildren; track $index) {
                <div class="form-row">
                  <pd-input [label]="'Child #' + ($index + 1) + ' weight (kg)'" type="number" [(ngModel)]="c.weightKg" />
                  <pd-input class="grow" label="Notes" [(ngModel)]="c.notes" />
                  @if (splitChildren.length > 2) {
                    <pd-button variant="ghost" size="sm" (click)="removeSplitChild($index)" aria-label="Remove child">
                      ×
                    </pd-button>
                  }
                </div>
              }
            </div>
            <div class="split-actions">
              <pd-button variant="secondary" (click)="addSplitChild()">+ Add child</pd-button>
              <pd-button variant="primary"
                  [disabled]="!canSplit() || splitting()" (click)="split()">
                {{ splitting() ? 'Splitting…' : 'Split into ' + splitChildren.length + ' lots' }}
              </pd-button>
            </div>
          </div>
        }
      } @else if (loading()) {
        <p class="dim">Loading…</p>
      }
    </div>
  `,
  styles: [`
    /*
     * Local rules only — anything that could be reused belongs in @pindraft/ui.
     * Every color / size / spacing here goes through a token var(--pd-…).
     */

    .back {
      display: inline-block;
      margin-bottom: var(--pd-space-3);
      font-size: var(--pd-text-sm);
      color: var(--pd-color-text-link);
      text-decoration: none;
    }
    .back:hover { text-decoration: underline; }

    .meta {
      margin: var(--pd-space-4) 0 var(--pd-space-8);
      padding: var(--pd-space-5) var(--pd-space-6);
      background: var(--pd-color-bg-surface);
      border: 1px solid var(--pd-color-border);
      border-radius: var(--pd-radius-lg);
    }

    .section-title {
      font-family: var(--pd-font-sans);
      font-size: var(--pd-text-xs);
      line-height: var(--pd-leading-xs);
      font-weight: var(--pd-weight-semibold);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--pd-color-text-muted);
      margin: var(--pd-space-8) 0 var(--pd-space-3);
    }

    /* Reusable inline atoms — likely candidates for promotion to libs/ui later */
    .numeric { font-variant-numeric: tabular-nums; }
    .numeric--strong { font-weight: var(--pd-weight-medium); font-family: var(--pd-font-mono); color: var(--pd-color-text); }
    .mono { font-family: var(--pd-font-mono); font-size: var(--pd-text-sm); }
    .mono--id { color: var(--pd-color-text-muted); word-break: break-all; }
    .dim { color: var(--pd-color-text-muted); }

    .tag {
      display: inline-flex;
      align-items: center;
      padding: 1px var(--pd-space-2);
      background: var(--pd-color-bg-sunken);
      border: 1px solid var(--pd-color-border);
      border-radius: var(--pd-radius-sm);
      font-family: var(--pd-font-mono);
      font-size: var(--pd-text-xs);
      color: var(--pd-color-text-muted);
    }

    /* Row-based lists for fleeces, tests, stage events */
    .list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: var(--pd-space-2);
    }
    .list__item {
      display: flex;
      align-items: center;
      gap: var(--pd-space-3);
      padding: var(--pd-space-3) var(--pd-space-4);
      background: var(--pd-color-bg-surface);
      border: 1px solid var(--pd-color-border);
      border-radius: var(--pd-radius-md);
      font-size: var(--pd-text-sm);
      line-height: var(--pd-leading-sm);
    }
    .meta-right { margin-left: auto; }

    /* Action panels: complete, split, attach test, transition */
    .action-panel {
      padding: var(--pd-space-5) var(--pd-space-6);
      background: var(--pd-color-bg-surface);
      border: 1px solid var(--pd-color-border);
      border-radius: var(--pd-radius-lg);
    }
    .action-panel + .action-panel { margin-top: 0; }
    .action-panel__lead {
      margin: 0 0 var(--pd-space-3);
      font-size: var(--pd-text-sm);
      line-height: var(--pd-leading-sm);
    }

    .form-row {
      display: flex;
      gap: var(--pd-space-3);
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .form-row .grow { flex: 1; min-width: 200px; }
    .form-row--tight { gap: var(--pd-space-2); }
    .form-row--tight pd-input,
    .form-row--tight pd-select { min-width: 140px; }
    .form-row pd-input,
    .form-row pd-select { display: block; }
    .form-row .grow { flex: 1 1 200px; }

    .split-rows {
      display: flex;
      flex-direction: column;
      gap: var(--pd-space-2);
    }
    .split-actions {
      display: flex;
      gap: var(--pd-space-3);
      margin-top: var(--pd-space-4);
    }
    .remove-x { font-size: 18px; line-height: 1; }
  `],
})
export class LotDetailComponent {
  private ops = inject(OperationsService);
  private onboarding = inject(OnboardingService);
  private fiberTestsService = inject(FiberTestsService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private snack = inject(SnackbarService);

  readonly loading = signal(true);
  readonly transitioning = signal(false);
  readonly completing = signal(false);
  readonly splitting = signal(false);
  readonly attachingTest = signal(false);
  readonly detail = signal<LotDetailFull | null>(null);
  readonly stages = signal<WorkflowStage[]>([]);
  readonly customer = signal<Customer | null>(null);
  readonly fiberTests = signal<FiberTest[]>([]);

  weightOut = 0;
  notes = '';
  completeWeight: number | null = null;
  splitChildren: { weightKg: number; notes: string }[] = [
    { weightKg: 0, notes: '' },
    { weightKg: 0, notes: '' },
  ];
  newTest: {
    testType: FiberTestType;
    instrument: string;
    resultNumeric: number | null;
    resultUnit: string;
  } = { testType: 'MICRON_DIAMETER', instrument: '', resultNumeric: null, resultUnit: 'µm' };

  readonly testTypeOptions: SelectOption[] = [
    { value: 'MICRON_DIAMETER', label: 'Micron diameter' },
    { value: 'COMFORT_FACTOR', label: 'Comfort factor' },
    { value: 'STAPLE_LENGTH', label: 'Staple length' },
    { value: 'IWTO_47_DISTRIBUTION', label: 'IWTO 47 distribution' },
  ];

  readonly customerName = computed(() => this.customer()?.displayName ?? '—');
  readonly currentStageName = computed(() => {
    const id = this.detail()?.lot.currentStageId;
    return this.stages().find((s) => s.id === id)?.displayName ?? '—';
  });
  readonly nextStageIndex = computed(() => {
    const id = this.detail()?.lot.currentStageId;
    return this.stages().findIndex((s) => s.id === id);
  });
  readonly canTransition = computed(() => {
    const idx = this.nextStageIndex();
    return idx >= 0 && idx < this.stages().length - 1 && this.detail()?.lot.status === 'ACTIVE';
  });
  readonly nextStageName = computed(() => {
    const idx = this.nextStageIndex();
    return (idx >= 0 && idx < this.stages().length - 1) ? this.stages()[idx + 1].displayName : '—';
  });
  readonly pricingSummary = computed(() => {
    const lot = this.detail()?.lot;
    if (!lot?.pricingKindSnapshot) return 'None';
    try {
      const cfg = JSON.parse(lot.pricingConfigSnapshot ?? '{}');
      switch (lot.pricingKindSnapshot) {
        case 'PER_POUND': return `$${cfg.pricePerKg}/kg`;
        case 'HYBRID': return `$${cfg.flatFee} + $${cfg.pricePerKg}/kg`;
        case 'REVENUE_SPLIT': return `${cfg.millPercent}% / ${cfg.brandPercent}%`;
        case 'TIERED_BY_GRADE': return `${cfg.tiers?.length ?? 0} tiers`;
      }
      return lot.pricingKindSnapshot;
    } catch { return lot.pricingKindSnapshot; }
  });

  /** Maps lot lifecycle to a chip tone — keeps the chip generic, this is the per-domain decision. */
  readonly statusTone = computed<Tone>(() => {
    switch (this.detail()?.lot.status) {
      case 'COMPLETED': return 'success';
      case 'CANCELLED': return 'danger';
      case 'ACTIVE':    return 'info';
      default:          return 'neutral';
    }
  });

  constructor() { this.refresh(); }

  private refresh(): void {
    const tid = this.auth.activeTenantId();
    const id = this.route.snapshot.paramMap.get('id');
    if (!tid || !id) return;
    this.loading.set(true);
    forkJoin({
      detail: this.ops.getLot(tid, id),
      stages: this.onboarding.listWorkflowStages(tid),
      customers: this.ops.listCustomers(tid),
      tests: this.fiberTestsService.list(tid, id),
    }).subscribe({
      next: ({ detail, stages, customers, tests }) => {
        this.detail.set(detail);
        this.stages.set(stages);
        this.customer.set(customers.find((c) => c.id === detail.lot.customerId) ?? null);
        this.fiberTests.set(tests);
        this.weightOut = Number(detail.lot.weightIntakeKg ?? 0);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  canAttachTest(): boolean {
    return !!this.newTest.testType;
  }

  formatTestType(t: string): string {
    return t.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
  }

  attachTest(): void {
    const tid = this.auth.activeTenantId();
    const lot = this.detail()?.lot;
    if (!tid || !lot) return;
    this.attachingTest.set(true);
    this.fiberTestsService.attach(tid, lot.id, {
      testType: this.newTest.testType,
      instrument: this.newTest.instrument.trim() || undefined,
      resultNumeric: this.newTest.resultNumeric ?? undefined,
      resultUnit: this.newTest.resultUnit.trim() || undefined,
    }).subscribe({
      next: () => {
        this.snack.show('Test attached', { durationMs: 1500 });
        this.newTest = { testType: 'MICRON_DIAMETER', instrument: '', resultNumeric: null, resultUnit: 'µm' };
        this.refresh();
        this.attachingTest.set(false);
      },
      error: (e) => {
        this.snack.show('Failed: ' + (e?.error?.detail ?? 'unknown'));
        this.attachingTest.set(false);
      },
    });
  }

  canSaveTransition(): boolean {
    return this.weightOut > 0 && this.canTransition();
  }

  transition(): void {
    const tid = this.auth.activeTenantId();
    const lot = this.detail()?.lot;
    if (!tid || !lot) return;
    this.transitioning.set(true);
    this.ops.transitionLot(tid, lot.id, {
      weightOutKg: this.weightOut,
      notes: this.notes || undefined,
    }).subscribe({
      next: () => {
        this.snack.show('Moved to ' + this.nextStageName(), { durationMs: 2000 });
        this.notes = '';
        this.refresh();
        this.transitioning.set(false);
      },
      error: (e) => {
        this.snack.show('Failed: ' + (e?.error?.detail ?? 'unknown'));
        this.transitioning.set(false);
      },
    });
  }

  complete(): void {
    const tid = this.auth.activeTenantId();
    const lot = this.detail()?.lot;
    if (!tid || !lot) return;
    this.completing.set(true);
    const weight = this.completeWeight && this.completeWeight > 0 ? this.completeWeight : undefined;
    this.ops.completeLot(tid, lot.id, weight).subscribe({
      next: () => {
        this.snack.show('Lot completed — invoice generating', { durationMs: 3000 });
        this.refresh();
        this.completing.set(false);
      },
      error: (e) => {
        this.snack.show('Failed: ' + (e?.error?.detail ?? 'unknown'));
        this.completing.set(false);
      },
    });
  }

  addSplitChild(): void {
    this.splitChildren = [...this.splitChildren, { weightKg: 0, notes: '' }];
  }

  removeSplitChild(i: number): void {
    if (this.splitChildren.length <= 2) return;
    this.splitChildren = this.splitChildren.filter((_, idx) => idx !== i);
  }

  canSplit(): boolean {
    return this.splitChildren.length >= 2 && this.splitChildren.every((c) => c.weightKg > 0);
  }

  split(): void {
    const tid = this.auth.activeTenantId();
    const lot = this.detail()?.lot;
    if (!tid || !lot || !this.canSplit()) return;
    this.splitting.set(true);
    this.ops.splitLot(tid, lot.id, this.splitChildren.map((c) => ({
      weightKg: c.weightKg,
      notes: c.notes || undefined,
    }))).subscribe({
      next: (children) => {
        this.snack.show(`Split into ${children.length} lots`, { durationMs: 3000 });
        this.refresh();
        this.splitting.set(false);
      },
      error: (e) => {
        this.snack.show('Failed: ' + (e?.error?.detail ?? 'unknown'));
        this.splitting.set(false);
      },
    });
  }
}
