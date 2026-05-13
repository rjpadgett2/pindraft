import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { Customer, Equipment, LotDetailFull, WorkflowStage } from '@pindraft/api-client';
import { AuthService } from '@pindraft/auth';
import { forkJoin } from 'rxjs';
import { OnboardingService } from '../onboarding/services/onboarding.service';
import { OperationsService } from './services/operations.service';
import { DatePipe } from '@angular/common';

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
    FormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatChipsModule, MatIconModule, DatePipe
  ],
  template: `
    <div class="page">
      <h1 class="page-title">Scan station</h1>
      <p class="page-subtitle">Scan a lot QR or paste a lot ID to advance it through the workflow.</p>

      <mat-card class="mode-card">
        <mat-card-content>
          <div class="mode-row">
            <span class="mode-label">Mode:</span>
            <button mat-button [class.active]="mode() === 'SINGLE'" (click)="setMode('SINGLE')">
              Single lot
            </button>
            <button mat-button [class.active]="mode() === 'BATCH'" (click)="setMode('BATCH')">
              Batch to equipment
            </button>
          </div>

          @if (mode() === 'BATCH') {
            <mat-form-field appearance="outline" class="equipment-select">
              <mat-label>Equipment</mat-label>
              <mat-select [(value)]="selectedEquipmentId">
                <mat-option [value]="null">— None / cancel batch —</mat-option>
                @for (e of equipment(); track e.id) {
                  <mat-option [value]="e.id">{{ e.name }} ({{ stageDisplayName(e.workflowStageId) }})</mat-option>
                }
              </mat-select>
            </mat-form-field>
            @if (selectedEquipmentId) {
              <p class="hint">Every subsequent scan attaches to this equipment's open run.</p>
            }
          }
        </mat-card-content>
      </mat-card>

      <mat-form-field appearance="outline" class="scan-input">
        <mat-label>Scan or paste lot ID</mat-label>
        <input #scanInput matInput
            [(ngModel)]="lotIdInput"
            (keyup.enter)="onScan()"
            placeholder="e.g., 81f0c2…"
            autocomplete="off" />
      </mat-form-field>

      @if (currentLot(); as lot) {
        <mat-card class="lot-card">
          <mat-card-content>
            <header>
              <strong>{{ lot.lot.id.substring(0, 8) }}</strong>
              <span class="meta">{{ customerName(lot.lot.customerId) }}</span>
            </header>
            <div class="grid">
              <div><small>Current stage</small><div>{{ currentStageName() }}</div></div>
              <div><small>Intake weight</small><div>{{ lot.lot.weightIntakeKg }} kg</div></div>
              <div><small>Next stage</small><div>{{ nextStageName() }}</div></div>
            </div>

            @if (canTransition()) {
              <div class="action-row">
                <mat-form-field appearance="outline">
                  <mat-label>Weight out (kg)</mat-label>
                  <input matInput type="number" min="0" step="0.1" [(ngModel)]="weightOut" />
                </mat-form-field>
                <button mat-flat-button color="primary"
                    [disabled]="!canConfirm() || working()"
                    (click)="confirm()">
                  {{ working() ? 'Moving…' : 'Move to ' + nextStageName() }}
                </button>
                <a mat-button [routerLink]="['/ops/lots', lot.lot.id]">View detail</a>
              </div>
            } @else {
              <p class="muted">No next stage available.</p>
            }
          </mat-card-content>
        </mat-card>
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
    .mode-card { margin-bottom: 16px; }
    .mode-row { display: flex; align-items: center; gap: 4px; }
    .mode-label { font-size: 13px; color: #666; margin-right: 8px; }
    .mode-row button.active { background: #dbeafe; color: #1e40af; }
    .equipment-select { width: 100%; margin-top: 12px; }
    .hint { font-size: 12px; color: #666; margin: 0; }
    .scan-input { width: 100%; max-width: 600px; }
    .scan-input ::ng-deep input { font-size: 18px; font-family: monospace; }
    .lot-card { margin-top: 16px; }
    .lot-card header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 12px; }
    .lot-card header .meta { color: #666; font-size: 13px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .grid small { color: #666; font-size: 12px; }
    .grid div div { font-size: 14px; font-weight: 500; margin-top: 2px; }
    .action-row { display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap; }
    .muted { color: #9ca3af; }
    .section { font-size: 14px; font-weight: 500; margin: 24px 0 8px; }
    .recent { list-style: none; padding: 0; margin: 0; }
    .recent li { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 13px; }
    .recent mat-icon { color: #10b981; font-size: 18px; height: 18px; width: 18px; }
    .recent small { margin-left: auto; color: #9ca3af; }
  `],
})
export class ScanStationComponent {
  private ops = inject(OperationsService);
  private onboarding = inject(OnboardingService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);

  private scanInput = viewChild<ElementRef<HTMLInputElement>>('scanInput');

  readonly mode = signal<'SINGLE' | 'BATCH'>('SINGLE');
  readonly currentLot = signal<LotDetailFull | null>(null);
  readonly equipment = signal<Equipment[]>([]);
  readonly stages = signal<WorkflowStage[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly recentActions = signal<{ id: string; label: string; at: Date }[]>([]);
  readonly working = signal(false);

  lotIdInput = '';
  selectedEquipmentId: string | null = null;
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
    if (m === 'SINGLE') this.selectedEquipmentId = null;
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
        this.snack.open('Lot not found: ' + (e?.error?.detail ?? id), 'OK', { duration: 3000 });
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
      equipmentId: this.mode() === 'BATCH' ? this.selectedEquipmentId ?? undefined : undefined,
    }).subscribe({
      next: () => {
        const label = `Moved ${lot.id.substring(0, 8)} to ${this.nextStageName()}`;
        this.recentActions.update((list) => [
          { id: Date.now().toString(), label, at: new Date() },
          ...list,
        ].slice(0, 8));
        this.snack.open(label, 'OK', { duration: 1500 });
        this.lotIdInput = '';
        this.currentLot.set(null);
        this.working.set(false);
        this.focusInput();
      },
      error: (e) => {
        this.snack.open('Failed: ' + (e?.error?.detail ?? 'unknown'), 'OK');
        this.working.set(false);
      },
    });
  }

  private focusInput(): void {
    setTimeout(() => this.scanInput()?.nativeElement.focus(), 50);
  }
}
