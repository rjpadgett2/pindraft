import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { Customer, Equipment, LotDetailFull, WorkflowStage } from '@pindraft/api-client';
import { AuthService } from '@pindraft/auth';
import {
  ButtonComponent, CardComponent, InputComponent,
  KeyValueGridComponent, KvComponent, PageHeaderComponent,
  SelectComponent, SelectOption, SnackbarService,
} from '@pindraft/ui';
import { forkJoin } from 'rxjs';
import { OnboardingService } from '../onboarding/services/onboarding.service';
import { OperationsService } from './services/operations.service';

/**
 * Scan station — the always-open ambient surface for fast stage transitions.
 *
 * Two modes:
 *   - SINGLE: scan a lot → see context → confirm transition → input clears.
 *   - BATCH: pre-select equipment → every scan adds to the same active run with one tap.
 *
 * Mode is sticky for the session. Input auto-focuses after each scan to keep flow tight.
 *
 * "Scan" in this implementation is typing or pasting a lot ID. Real QR/barcode scanners
 * emulate keystrokes; this works with them too.
 */
@Component({
  selector: 'ops-scan-station',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, RouterLink, DatePipe, MatIconModule,
    ButtonComponent, CardComponent, InputComponent,
    KeyValueGridComponent, KvComponent, PageHeaderComponent, SelectComponent,
  ],
  template: `
    <div class="page">
      <pd-page-header
        title="Scan station"
        subtitle="Scan a lot QR or paste a lot ID to advance it through the workflow." />

      <pd-card class="mode-card">
        <div class="mode-row">
          <span class="mode-label">Mode:</span>
          <pd-button [variant]="mode() === 'SINGLE' ? 'primary' : 'ghost'" size="sm" (click)="setMode('SINGLE')">
            Single lot
          </pd-button>
          <pd-button [variant]="mode() === 'BATCH' ? 'primary' : 'ghost'" size="sm" (click)="setMode('BATCH')">
            Batch to equipment
          </pd-button>
        </div>

        @if (mode() === 'BATCH') {
          <div class="equipment-row">
            <pd-select class="equipment-select" label="Equipment"
                       [(ngModel)]="selectedEquipmentId"
                       [options]="equipmentOptions()" />
          </div>
          @if (selectedEquipmentId) {
            <p class="hint">Every subsequent scan attaches to this equipment's open run.</p>
          }
        }
      </pd-card>

      <div class="scan-input">
        <input #scanInput
            class="pd-scan-field"
            [(ngModel)]="lotIdInput"
            (keyup.enter)="onScan()"
            placeholder="Scan or paste lot ID (e.g., 81f0c2…)"
            autocomplete="off" />
      </div>

      @if (currentLot(); as lot) {
        <pd-card class="lot-card">
          <header>
            <strong>{{ lot.lot.id.substring(0, 8) }}</strong>
            <span class="meta">{{ customerName(lot.lot.customerId) }}</span>
          </header>
          <pd-key-value-grid>
            <pd-kv label="Current stage">{{ currentStageName() }}</pd-kv>
            <pd-kv label="Intake weight">{{ lot.lot.weightIntakeKg }} kg</pd-kv>
            <pd-kv label="Next stage">{{ nextStageName() }}</pd-kv>
          </pd-key-value-grid>

          @if (canTransition()) {
            <div class="action-row">
              <pd-input label="Weight out (kg)" type="number" [(ngModel)]="weightOut" />
              <pd-button variant="primary"
                  [disabled]="!canConfirm() || working()"
                  (click)="confirm()">
                {{ working() ? 'Moving…' : 'Move to ' + nextStageName() }}
              </pd-button>
              <pd-button variant="ghost" [routerLink]="['/ops/lots', lot.lot.id]">View detail</pd-button>
            </div>
          } @else {
            <p class="muted">No next stage available.</p>
          }
        </pd-card>
      }

      @if (recentActions().length > 0) {
        <h2 class="section">Recent</h2>
        <ul class="recent">
          @for (a of recentActions(); track a.id) {
            <li>
              <mat-icon>check_circle</mat-icon>
              <span>{{ a.label }}</span>
              <small>{{ a.at | date:'shortTime' }}</small>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px 32px; }
    .mode-card { margin-bottom: 16px; }
    .mode-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .mode-label { font-size: 13px; color: var(--pd-color-muted, #666); margin-right: 8px; }
    .equipment-row { margin-top: 12px; }
    .equipment-select { display: block; }
    .hint { font-size: 12px; color: var(--pd-color-muted, #666); margin: 8px 0 0; }
    .scan-input { max-width: 600px; margin-bottom: 16px; }
    .pd-scan-field {
      width: 100%;
      padding: 14px 16px;
      font-size: 18px;
      font-family: var(--pd-font-mono, ui-monospace, monospace);
      background: white;
      border: 2px solid var(--pd-color-border, #e5e7eb);
      border-radius: 8px;
      outline: none;
      transition: border-color 0.15s;
    }
    .pd-scan-field:focus { border-color: var(--pd-brand-accent, #2563eb); }
    .lot-card header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 12px; }
    .lot-card header .meta { color: var(--pd-color-muted, #666); font-size: 13px; }
    .action-row { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; margin-top: 16px; }
    .muted { color: var(--pd-color-muted, #9ca3af); }
    .section { font-size: 14px; font-weight: 600; margin: 24px 0 8px; color: var(--pd-color-text, #111); }
    .recent { list-style: none; padding: 0; margin: 0; }
    .recent li { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 13px; }
    .recent mat-icon { color: var(--pd-color-success, #10b981); font-size: 18px; height: 18px; width: 18px; }
    .recent small { margin-left: auto; color: var(--pd-color-muted, #9ca3af); }
  `],
})
export class ScanStationComponent {
  private ops = inject(OperationsService);
  private onboarding = inject(OnboardingService);
  private auth = inject(AuthService);
  private snack = inject(SnackbarService);

  private scanInput = viewChild<ElementRef<HTMLInputElement>>('scanInput');

  readonly mode = signal<'SINGLE' | 'BATCH'>('SINGLE');
  readonly currentLot = signal<LotDetailFull | null>(null);
  readonly equipment = signal<Equipment[]>([]);
  readonly stages = signal<WorkflowStage[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly recentActions = signal<{ id: string; label: string; at: Date }[]>([]);
  readonly working = signal(false);

  readonly equipmentOptions = computed<SelectOption[]>(() => [
    { value: '', label: '— None / cancel batch —' },
    ...this.equipment().map((e) => ({
      value: e.id,
      label: `${e.name} (${this.stageDisplayName(e.workflowStageId)})`,
    })),
  ]);

  lotIdInput = '';
  selectedEquipmentId = '';
  weightOut = 0;

  readonly currentStageName = computed(() => {
    const id = this.currentLot()?.lot.currentStageId;
    return this.stages().find((s) => s.id === id)?.displayName ?? '—';
  });
  readonly nextStageName = computed(() => {
    const id = this.currentLot()?.lot.currentStageId;
    const idx = this.stages().findIndex((s) => s.id === id);
    if (idx < 0 || idx >= this.stages().length - 1) return '—';
    return this.stages()[idx + 1].displayName;
  });
  readonly canTransition = computed(() => {
    const id = this.currentLot()?.lot.currentStageId;
    const idx = this.stages().findIndex((s) => s.id === id);
    return idx >= 0 && idx < this.stages().length - 1 && this.currentLot()?.lot.status === 'ACTIVE';
  });

  constructor() {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    forkJoin({
      stages: this.onboarding.listWorkflowStages(tid),
      equipment: this.onboarding.listEquipment(tid),
      customers: this.ops.listCustomers(tid),
    }).subscribe(({ stages, equipment, customers }) => {
      this.stages.set(stages);
      this.equipment.set(equipment);
      this.customers.set(customers);
    });
  }

  setMode(m: 'SINGLE' | 'BATCH'): void {
    this.mode.set(m);
    if (m === 'SINGLE') this.selectedEquipmentId = '';
    this.focusInput();
  }

  stageDisplayName(stageId: string | null): string {
    if (!stageId) return '—';
    return this.stages().find((s) => s.id === stageId)?.displayName ?? '—';
  }

  customerName(customerId: string): string {
    return this.customers().find((c) => c.id === customerId)?.displayName ?? '—';
  }

  onScan(): void {
    const tid = this.auth.activeTenantId();
    const id = this.lotIdInput.trim();
    if (!tid || !id) return;
    this.ops.getLot(tid, id).subscribe({
      next: (detail) => {
        this.currentLot.set(detail);
        this.weightOut = Number(detail.lot.weightIntakeKg ?? 0);
      },
      error: (e) => {
        this.snack.show('Lot not found: ' + (e?.error?.detail ?? id), { durationMs: 3000 });
        this.currentLot.set(null);
      },
    });
  }

  canConfirm(): boolean {
    return this.weightOut > 0 && this.canTransition();
  }

  confirm(): void {
    const tid = this.auth.activeTenantId();
    const lot = this.currentLot()?.lot;
    if (!tid || !lot) return;
    this.working.set(true);
    this.ops.transitionLot(tid, lot.id, {
      weightOutKg: this.weightOut,
      equipmentId: this.mode() === 'BATCH' ? (this.selectedEquipmentId || undefined) : undefined,
    }).subscribe({
      next: () => {
        const label = `Moved ${lot.id.substring(0, 8)} to ${this.nextStageName()}`;
        this.recentActions.update((list) => [
          { id: Date.now().toString(), label, at: new Date() },
          ...list,
        ].slice(0, 8));
        this.snack.show(label, { durationMs: 1500 });
        this.lotIdInput = '';
        this.currentLot.set(null);
        this.working.set(false);
        this.focusInput();
      },
      error: (e) => {
        this.snack.show('Failed: ' + (e?.error?.detail ?? 'unknown'));
        this.working.set(false);
      },
    });
  }

  private focusInput(): void {
    setTimeout(() => this.scanInput()?.nativeElement.focus(), 50);
  }
}
