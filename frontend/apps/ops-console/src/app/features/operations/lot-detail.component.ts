import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Customer, LotDetailFull, WorkflowStage } from '@pindraft/api-client';
import { AuthService } from '@pindraft/auth';
import { forkJoin } from 'rxjs';
import { OnboardingService } from '../onboarding/services/onboarding.service';
import { LotHistoryTimelineComponent } from './lot-history-timeline.component';
import { OperationsService } from './services/operations.service';
import { FiberTest, FiberTestsService, FiberTestType } from './services/fiber-tests.service';
import { MatSelectModule } from '@angular/material/select';
import { DatePipe } from '@angular/common';

/**
 * Lot detail with full context: lot facts, customer, pricing snapshot, fleeces,
 * stage history timeline (extracted into child), and a transition action.
 */
@Component({
  selector: 'ops-lot-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, RouterLink,
    MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    LotHistoryTimelineComponent, DatePipe
  ],
  template: `
    <div class="page">
      <a routerLink="/ops/reservations" class="back">← Back</a>

      @if (detail(); as d) {
        <h1 class="page-title">Lot {{ d.lot.id.substring(0, 8) }}</h1>
        <p class="page-subtitle">{{ customerName() }} — created {{ d.lot.createdAt | date:'medium' }}</p>

        <div class="grid">
          <mat-card><mat-card-content>
            <small>Intake weight</small>
            <div class="big">{{ d.lot.weightIntakeKg }} kg</div>
          </mat-card-content></mat-card>
          <mat-card><mat-card-content>
            <small>Current stage</small>
            <div class="big">{{ currentStageName() }}</div>
          </mat-card-content></mat-card>
          <mat-card><mat-card-content>
            <small>Status</small>
            <div class="big">{{ d.lot.status }}</div>
          </mat-card-content></mat-card>
          <mat-card><mat-card-content>
            <small>Pricing</small>
            <div>{{ pricingSummary() }}</div>
          </mat-card-content></mat-card>
        </div>

        <h2 class="section">Stage history</h2>
        <ops-lot-history-timeline [events]="d.history" [stages]="stages()" />

        <h2 class="section">Fleeces</h2>
        <ul class="fleeces">
          @for (f of d.fleeces; track f.id) {
            <li>
              <strong>{{ f.sourceAnimalName || 'Unnamed' }}</strong>
              @if (f.breedCode) { <span class="chip">{{ f.breedCode }}</span> }
              <span class="weight">{{ f.weightKg }} kg</span>
              @if (f.notes) { <em>{{ f.notes }}</em> }
            </li>
          }
        </ul>

        @if (canTransition()) {
          <h2 class="section">Move to next stage</h2>
          <mat-card><mat-card-content>
            <p>Next: <strong>{{ nextStageName() }}</strong></p>
            <div class="transition-form">
              <mat-form-field appearance="outline">
                <mat-label>Weight out (kg)</mat-label>
                <input matInput type="number" min="0" step="0.1" [(ngModel)]="weightOut" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="grow">
                <mat-label>Notes (optional)</mat-label>
                <input matInput [(ngModel)]="notes" />
              </mat-form-field>
              <button mat-flat-button color="primary"
                  [disabled]="!canSaveTransition() || transitioning()" (click)="transition()">
                {{ transitioning() ? 'Moving…' : 'Move to ' + nextStageName() }}
              </button>
            </div>
          </mat-card-content></mat-card>
        }

        <h2 class="section">Fiber tests</h2>
        <mat-card><mat-card-content>
          @if (fiberTests().length === 0) {
            <p class="muted">No tests attached yet.</p>
          } @else {
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
          <div class="test-form">
            <mat-form-field appearance="outline">
              <mat-label>Test</mat-label>
              <mat-select [(value)]="newTest.testType">
                <mat-option value="MICRON_DIAMETER">Micron diameter</mat-option>
                <mat-option value="COMFORT_FACTOR">Comfort factor</mat-option>
                <mat-option value="STAPLE_LENGTH">Staple length</mat-option>
                <mat-option value="IWTO_47_DISTRIBUTION">IWTO 47 distribution</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Instrument</mat-label>
              <input matInput [(ngModel)]="newTest.instrument" placeholder="FibreLux / OFDA2000 / lab" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Result</mat-label>
              <input matInput type="number" step="0.01" [(ngModel)]="newTest.resultNumeric" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Unit</mat-label>
              <input matInput [(ngModel)]="newTest.resultUnit" placeholder="µm / % / mm" />
            </mat-form-field>
            <button mat-flat-button color="primary"
                    [disabled]="!canAttachTest() || attachingTest()" (click)="attachTest()">
              {{ attachingTest() ? 'Saving…' : 'Attach test' }}
            </button>
          </div>
        </mat-card-content></mat-card>

        @if (detail()?.lot?.status === 'ACTIVE') {
          <h2 class="section">Complete this lot</h2>
          <mat-card><mat-card-content>
            <p class="muted">Closes the open stage event with a final weight and auto-generates a draft invoice (unless this lot is pool-merged).</p>
            <div class="transition-form">
              <mat-form-field appearance="outline">
                <mat-label>Final weight (kg, optional)</mat-label>
                <input matInput type="number" min="0" step="0.1" [(ngModel)]="completeWeight" />
              </mat-form-field>
              <button mat-flat-button color="primary"
                  [disabled]="completing()" (click)="complete()">
                {{ completing() ? 'Completing…' : 'Mark complete' }}
              </button>
            </div>
          </mat-card-content></mat-card>

          <h2 class="section">Split this lot</h2>
          <mat-card><mat-card-content>
            <p class="muted">The parent lot is marked complete; each child inherits the pricing snapshot and continues from the current stage. Lineage is recorded.</p>
            <div class="split-rows">
              @for (c of splitChildren; track $index) {
                <div class="split-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Child #{{ $index + 1 }} weight (kg)</mat-label>
                    <input matInput type="number" min="0" step="0.1" [(ngModel)]="c.weightKg" />
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="grow">
                    <mat-label>Notes</mat-label>
                    <input matInput [(ngModel)]="c.notes" />
                  </mat-form-field>
                  @if (splitChildren.length > 2) {
                    <button mat-icon-button (click)="removeSplitChild($index)" aria-label="Remove">
                      <span style="font-size:18px;">×</span>
                    </button>
                  }
                </div>
              }
            </div>
            <div class="split-actions">
              <button mat-stroked-button (click)="addSplitChild()">+ Add child</button>
              <button mat-flat-button color="primary"
                  [disabled]="!canSplit() || splitting()" (click)="split()">
                {{ splitting() ? 'Splitting…' : 'Split into ' + splitChildren.length + ' lots' }}
              </button>
            </div>
          </mat-card-content></mat-card>
        }
      } @else if (loading()) { <p>Loading…</p> }
    </div>
  `,
  styles: [`
    .back { display: inline-block; margin-bottom: 12px; font-size: 13px; color: #2563eb; text-decoration: none; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin: 16px 0 24px; }
    .grid small { color: #666; font-size: 12px; }
    .grid .big { font-size: 18px; font-weight: 500; margin-top: 4px; }
    .section { font-size: 14px; font-weight: 500; margin: 24px 0 12px; }
    .fleeces { list-style: none; padding: 0; margin: 0; }
    .fleeces li { padding: 8px 12px; background: white; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 6px; display: flex; gap: 12px; align-items: center; font-size: 13px; }
    .fleeces .chip { font-size: 11px; padding: 2px 8px; background: #f3f4f6; border-radius: 4px; }
    .fleeces .weight { margin-left: auto; color: #666; }
    .transition-form { display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap; margin-top: 8px; }
    .transition-form .grow { flex: 1; min-width: 200px; }
    .muted { color: #6b7280; font-size: 13px; margin: 0 0 12px; }
    .split-rows { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
    .split-row { display: flex; gap: 12px; align-items: center; }
    .split-row .grow { flex: 1; min-width: 180px; }
    .split-actions { display: flex; gap: 12px; margin-top: 12px; }
    .tests { list-style: none; padding: 0; margin: 0 0 12px; }
    .tests li { padding: 8px 12px; background: #f9fafb; border-radius: 6px; margin-bottom: 6px; display: flex; gap: 12px; align-items: center; font-size: 13px; }
    .tests .chip { font-size: 11px; padding: 2px 8px; background: white; border: 1px solid #e5e7eb; border-radius: 4px; }
    .tests .weight { margin-left: auto; color: #666; }
    .tests .result { font-weight: 500; font-family: ui-monospace, monospace; color: #1a1a1a; }
    .test-form { display: flex; gap: 8px; align-items: flex-start; flex-wrap: wrap; margin-top: 8px; }
    .test-form mat-form-field { min-width: 140px; }
  `],
})
export class LotDetailComponent {
  private ops = inject(OperationsService);
  private onboarding = inject(OnboardingService);
  private fiberTestsService = inject(FiberTestsService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);

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
        this.snack.open('Test attached', 'OK', { duration: 1500 });
        this.newTest = { testType: 'MICRON_DIAMETER', instrument: '', resultNumeric: null, resultUnit: 'µm' };
        this.refresh();
        this.attachingTest.set(false);
      },
      error: (e) => {
        this.snack.open('Failed: ' + (e?.error?.detail ?? 'unknown'), 'OK');
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
        this.snack.open('Moved to ' + this.nextStageName(), 'OK', { duration: 2000 });
        this.notes = '';
        this.refresh();
        this.transitioning.set(false);
      },
      error: (e) => {
        this.snack.open('Failed: ' + (e?.error?.detail ?? 'unknown'), 'OK');
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
        this.snack.open('Lot completed — invoice generating', 'OK', { duration: 3000 });
        this.refresh();
        this.completing.set(false);
      },
      error: (e) => {
        this.snack.open('Failed: ' + (e?.error?.detail ?? 'unknown'), 'OK');
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
        this.snack.open(`Split into ${children.length} lots`, 'OK', { duration: 3000 });
        this.refresh();
        this.splitting.set(false);
      },
      error: (e) => {
        this.snack.open('Failed: ' + (e?.error?.detail ?? 'unknown'), 'OK');
        this.splitting.set(false);
      },
    });
  }
}
