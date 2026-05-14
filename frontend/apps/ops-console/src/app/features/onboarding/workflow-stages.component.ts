import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProcessingStageType, WorkflowStage } from '@pindraft/api-client';
import { AuthService } from '@pindraft/auth';
import { ButtonComponent, CardComponent, IconButtonComponent, IconComponent, InputComponent, PageHeaderComponent, SelectComponent, SelectOption, SnackbarService } from '@pindraft/ui';
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
    FormsModule, RouterLink, ButtonComponent, CardComponent, IconButtonComponent, IconComponent, InputComponent, PageHeaderComponent, SelectComponent
  ],
  template: `
    <div class="page">
      <a routerLink="/setup" class="back">← Back to setup</a>
      <pd-page-header
        title="Workflow stages"
        subtitle="The type column is the canonical platform taxonomy (powers reporting and integrations); the display name is what your team and customers see." />

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
                  <pd-icon-button size="sm" [disabled]="i === 0"
                                  aria-label="Move up" (click)="moveUp(i)">
                    <pd-icon name="arrow_upward" size="16" />
                  </pd-icon-button>
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
                    <pd-button variant="ghost" size="sm" (click)="remove(stage)">Remove</pd-button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>

        <pd-card variant="sunken" class="add-form">
          <h3>Add a stage</h3>
          <div class="add-row">
            <pd-select label="Stage type" [(ngModel)]="newStageType" [options]="availableTypeOptions()" />
            <pd-input label="Display name" [(ngModel)]="newDisplayName"
                      helper="What your team will call this step" />
            <pd-button variant="primary" [disabled]="!newStageType || !newDisplayName" (click)="addStage()">
              Add
            </pd-button>
          </div>
        </pd-card>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px 32px; }
    .back { display: inline-block; margin-bottom: 12px; font-size: 13px; color: var(--pd-color-link, #2563eb); text-decoration: none; }
    .flow-preview { display: flex; flex-wrap: wrap; gap: 6px; padding: 12px; background: #f3f4f6; border-radius: 8px; margin: 16px 0 24px; align-items: center; }
    .chip { padding: 4px 10px; background: white; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px; }
    .arrow { color: var(--pd-color-muted, #9ca3af); }
    table { width: 100%; background: white; border-collapse: collapse; margin-bottom: 24px; border-radius: 8px; overflow: hidden; }
    th, td { padding: 8px 12px; border-bottom: 1px solid var(--pd-color-border, #e5e7eb); text-align: left; font-size: 13px; }
    th { color: var(--pd-color-muted, #666); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; background: #f9fafb; }
    .handle { padding-left: 0; }
    .type { font-size: 11px; padding: 2px 8px; background: #f3f4f6; border-radius: 4px; font-family: var(--pd-font-mono, ui-monospace, monospace); }
    .name-input { width: 100%; padding: 6px 8px; border: 1px solid var(--pd-color-border, #e5e7eb); border-radius: 4px; font-size: 13px; }
    .name-input:focus { outline: none; border-color: var(--pd-brand-accent, #2563eb); }
    .required-tag { color: var(--pd-color-muted, #9ca3af); font-size: 11px; }
    .actions-col { text-align: right; }
    .add-form h3 { margin: 0 0 12px; font-size: 14px; font-weight: 600; }
    .add-row { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
    .add-row pd-select, .add-row pd-input { flex: 1; min-width: 200px; }
  `],
})
export class WorkflowStagesComponent {
  private onboarding = inject(OnboardingService);
  private auth = inject(AuthService);
  private snack = inject(SnackbarService);

  readonly loading = signal(true);
  readonly stages = signal<WorkflowStage[]>([]);
  readonly stageTypes = signal<ProcessingStageType[]>([]);

  readonly availableStageTypes = computed(() => {
    const used = new Set(this.stages().map((s) => s.stageType));
    return this.stageTypes().filter((t) => !used.has(t.code));
  });
  readonly availableTypeOptions = computed<SelectOption[]>(() =>
    this.availableStageTypes().map((t) => ({
      value: t.code,
      label: `${t.name} — ${t.description}`,
    })),
  );

  newStageType = '';
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
      next: () => this.snack.show('Saved', { durationMs: 1500 }),
      error: (e) => this.snack.show('Save failed: ' + (e?.error?.detail ?? 'unknown')),
    });
  }

  remove(stage: WorkflowStage): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    if (!confirm(`Remove "${stage.displayName}"?`)) return;
    this.onboarding.deleteWorkflowStage(tid, stage.id).subscribe({
      next: () => this.stages.update((list) => list.filter((s) => s.id !== stage.id)),
      error: (e) => this.snack.show('Remove failed: ' + (e?.error?.detail ?? 'unknown')),
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
      error: (e) => this.snack.show('Reorder failed: ' + (e?.error?.detail ?? 'unknown')),
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
        this.newStageType = '';
        this.newDisplayName = '';
      },
      error: (e) => this.snack.show('Add failed: ' + (e?.error?.detail ?? 'unknown')),
    });
  }
}
