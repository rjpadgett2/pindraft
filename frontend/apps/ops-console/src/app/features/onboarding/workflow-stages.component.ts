import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { ProcessingStageType, WorkflowStage } from '@pindraft/api-client';
import { AuthService } from '@pindraft/auth';
import { forkJoin } from 'rxjs';
import { OnboardingService } from './services/onboarding.service';

/**
 * Workflow stages configuration. The screen that proves the mill-agnostic-by-configuration
 * principle: type column is the canonical platform taxonomy, display name is what humans see.
 *
 * Smart component. Renders inline editing for stages plus an add-stage form. Reorder via
 * up/down buttons rather than drag-and-drop for simplicity in v1.
 */
@Component({
  selector: 'ops-workflow-stages',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, RouterLink,
    MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatIconModule,
  ],
  template: `
    <div class="page">
      <a routerLink="/setup" class="back">← Back to setup</a>
      <h1 class="page-title">Workflow stages</h1>
      <p class="page-subtitle">
        The type column is the canonical platform taxonomy (powers reporting and
        integrations); the display name is what your team and customers see.
      </p>

      @if (stages().length > 0) {
        <div class="flow-preview">
          @for (stage of stages(); track stage.id; let last = $last) {
            <span class="chip">{{ stage.displayName }}</span>
            @if (!last) { <span class="arrow">→</span> }
          }
        </div>
      }

      @if (!loading()) {
        <table>
          <thead>
            <tr>
              <th style="width: 6%"></th>
              <th style="width: 6%">#</th>
              <th style="width: 22%">Type</th>
              <th>Display name</th>
              <th style="width: 14%"></th>
            </tr>
          </thead>
          <tbody>
            @for (stage of stages(); track stage.id; let i = $index) {
              <tr>
                <td class="handle">
                  <button mat-icon-button [disabled]="i === 0" (click)="moveUp(i)">
                    <mat-icon>arrow_upward</mat-icon>
                  </button>
                </td>
                <td>{{ stage.orderIndex }}</td>
                <td><code class="type">{{ stage.stageType }}</code></td>
                <td>
                  <input class="name-input" [(ngModel)]="stage.displayName"
                    (blur)="saveDisplayName(stage)" />
                </td>
                <td class="actions-col">
                  @if (isRequired(stage.stageType)) {
                    <span class="required-tag">Required</span>
                  } @else {
                    <button mat-button color="warn" (click)="remove(stage)">Remove</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>

        <div class="add-form">
          <h3>Add a stage</h3>
          <div class="add-row">
            <mat-form-field appearance="outline">
              <mat-label>Stage type</mat-label>
              <mat-select [(value)]="newStageType">
                @for (type of availableStageTypes(); track type.code) {
                  <mat-option [value]="type.code">{{ type.name }} — <small>{{ type.description }}</small></mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Display name</mat-label>
              <input matInput [(ngModel)]="newDisplayName" placeholder="What your team will call this step" />
            </mat-form-field>
            <button mat-flat-button color="primary" [disabled]="!newStageType || !newDisplayName" (click)="addStage()">
              Add
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .back { display: inline-block; margin-bottom: 12px; font-size: 13px; color: #2563eb; text-decoration: none; }
    .flow-preview { display: flex; flex-wrap: wrap; gap: 6px; padding: 12px; background: #f3f4f6; border-radius: 8px; margin: 16px 0 24px; }
    .chip { padding: 4px 10px; background: white; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px; }
    .arrow { color: #9ca3af; }
    table { width: 100%; background: white; border-collapse: collapse; margin-bottom: 24px; }
    th, td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 13px; }
    th { color: #666; font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
    .handle { padding-left: 0; }
    .type { font-size: 11px; padding: 2px 8px; background: #f3f4f6; border-radius: 4px; }
    .name-input { width: 100%; padding: 6px 8px; border: 1px solid #e5e7eb; border-radius: 4px; font-size: 13px; }
    .name-input:focus { outline: none; border-color: #2563eb; }
    .required-tag { color: #9ca3af; font-size: 11px; }
    .actions-col { text-align: right; }
    .add-form { background: #f9fafb; padding: 16px 20px; border-radius: 8px; }
    .add-form h3 { margin: 0 0 12px; font-size: 14px; font-weight: 500; }
    .add-row { display: flex; gap: 12px; align-items: flex-start; }
    .add-row mat-form-field { flex: 1; }
  `],
})
export class WorkflowStagesComponent {
  private onboarding = inject(OnboardingService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly stages = signal<WorkflowStage[]>([]);
  readonly stageTypes = signal<ProcessingStageType[]>([]);

  readonly availableStageTypes = computed(() => {
    const used = new Set(this.stages().map((s) => s.stageType));
    return this.stageTypes().filter((t) => !used.has(t.code));
  });

  newStageType: string | null = null;
  newDisplayName = '';

  constructor() {
    const tid = this.auth.activeTenantId();
    if (!tid) return;

    forkJoin({
      stages: this.onboarding.listWorkflowStages(tid),
      types: this.onboarding.listStageTypes(),
    }).subscribe({
      next: ({ stages, types }) => {
        this.stages.set(stages);
        this.stageTypes.set(types);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  isRequired(stageType: string): boolean {
    return stageType === 'INTAKE' || stageType === 'SHIP';
  }

  saveDisplayName(stage: WorkflowStage): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    this.onboarding.renameWorkflowStage(tid, stage.id, stage.displayName).subscribe({
      next: () => this.snack.open('Saved', 'OK', { duration: 1500 }),
      error: (e) => this.snack.open('Save failed: ' + (e?.error?.detail ?? 'unknown'), 'OK'),
    });
  }

  remove(stage: WorkflowStage): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    if (!confirm(`Remove "${stage.displayName}"?`)) return;
    this.onboarding.deleteWorkflowStage(tid, stage.id).subscribe({
      next: () => this.stages.update((list) => list.filter((s) => s.id !== stage.id)),
      error: (e) => this.snack.open('Remove failed: ' + (e?.error?.detail ?? 'unknown'), 'OK'),
    });
  }

  moveUp(index: number): void {
    if (index === 0) return;
    const tid = this.auth.activeTenantId();
    if (!tid) return;

    const reordered = [...this.stages()];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    this.stages.set(reordered);

    this.onboarding.reorderWorkflowStages(tid, reordered.map((s) => s.id)).subscribe({
      error: (e) => this.snack.open('Reorder failed: ' + (e?.error?.detail ?? 'unknown'), 'OK'),
    });
  }

  addStage(): void {
    const tid = this.auth.activeTenantId();
    if (!tid || !this.newStageType) return;
    this.onboarding.createWorkflowStage(tid, {
      stageType: this.newStageType,
      displayName: this.newDisplayName,
      requiresEquipment: true,
    }).subscribe({
      next: (stage) => {
        this.stages.update((list) => [...list, stage]);
        this.newStageType = null;
        this.newDisplayName = '';
      },
      error: (e) => this.snack.open('Add failed: ' + (e?.error?.detail ?? 'unknown'), 'OK'),
    });
  }
}
