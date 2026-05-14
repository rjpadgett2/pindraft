import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Equipment, EquipmentType, WorkflowStage } from '@pindraft/api-client';
import { AuthService } from '@pindraft/auth';
import {
  ButtonComponent, CardComponent, InputComponent, PageHeaderComponent,
  SelectComponent, SelectOption, SnackbarService,
} from '@pindraft/ui';
import { forkJoin } from 'rxjs';
import { OnboardingService } from './services/onboarding.service';

/**
 * Equipment inventory configuration. Grouped by workflow stage. Add equipment with a
 * type from the platform-shared taxonomy, name, optional capacity hints. Soft-delete
 * (deactivate) preserves history.
 */
@Component({
  selector: 'ops-equipment',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, RouterLink,
    ButtonComponent, CardComponent, InputComponent, PageHeaderComponent, SelectComponent,
  ],
  template: `
    <div class="page">
      <a routerLink="/setup" class="back">← Back to setup</a>
      <pd-page-header
        title="Equipment"
        subtitle="Add equipment for each stage that needs it. Soft-deleted equipment is hidden from operator screens but preserved for historical traces." />

      @if (!loading()) {
        <div class="grouped">
          @for (stage of stages(); track stage.id) {
            <section>
              <h2>{{ stage.displayName }}</h2>
              @if (equipmentForStage(stage.id).length === 0) {
                <p class="empty">No equipment for this stage yet.</p>
              } @else {
                <ul>
                  @for (e of equipmentForStage(stage.id); track e.id) {
                    <li>
                      <div>
                        <strong>{{ e.name }}</strong>
                        <span class="type">{{ equipmentTypeName(e.equipmentType) }}</span>
                      </div>
                      <pd-button variant="ghost" size="sm" (click)="remove(e)">Remove</pd-button>
                    </li>
                  }
                </ul>
              }
            </section>
          }
        </div>

        <pd-card variant="sunken" class="add-form">
          <h3>Add equipment</h3>
          <div class="add-row">
            <pd-select label="Type" [(ngModel)]="newType" [options]="typeOptions()" />
            <pd-input label="Name" [(ngModel)]="newName" />
            <pd-select label="Stage (optional)" [(ngModel)]="newStageId" [options]="stageOptions()" />
            <pd-button variant="primary"
                [disabled]="!newType || !newName" (click)="add()">
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
    .grouped { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
    section { background: white; border-radius: 8px; padding: 16px 20px; border: 1px solid var(--pd-color-border, #e5e7eb); }
    section h2 { margin: 0 0 8px; font-size: 14px; font-weight: 600; color: var(--pd-color-text, #374151); }
    .empty { font-size: 13px; color: var(--pd-color-muted, #9ca3af); margin: 4px 0 0; }
    ul { list-style: none; padding: 0; margin: 0; }
    li { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-top: 1px solid #f3f4f6; font-size: 13px; }
    li:first-child { border-top: none; }
    .type { margin-left: 8px; padding: 2px 8px; font-size: 11px; background: #f3f4f6; color: var(--pd-color-muted, #666); border-radius: 4px; }
    .add-form h3 { margin: 0 0 12px; font-size: 14px; font-weight: 600; }
    .add-row { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
    .add-row pd-select, .add-row pd-input { flex: 1; min-width: 160px; }
  `],
})
export class EquipmentComponent {
  private onboarding = inject(OnboardingService);
  private auth = inject(AuthService);
  private snack = inject(SnackbarService);

  readonly loading = signal(true);
  readonly equipment = signal<Equipment[]>([]);
  readonly equipmentTypes = signal<EquipmentType[]>([]);
  readonly stages = signal<WorkflowStage[]>([]);

  readonly typeOptions = computed<SelectOption[]>(() =>
    this.equipmentTypes().map((t) => ({ value: t.code, label: t.name })),
  );
  readonly stageOptions = computed<SelectOption[]>(() => [
    { value: '', label: '— none —' },
    ...this.stages().map((s) => ({ value: s.id, label: s.displayName })),
  ]);

  newType = '';
  newName = '';
  newStageId = '';

  constructor() {
    const tid = this.auth.activeTenantId();
    if (!tid) return;

    forkJoin({
      equipment: this.onboarding.listEquipment(tid),
      types: this.onboarding.listEquipmentTypes(),
      stages: this.onboarding.listWorkflowStages(tid),
    }).subscribe({
      next: ({ equipment, types, stages }) => {
        this.equipment.set(equipment);
        this.equipmentTypes.set(types);
        this.stages.set(stages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  equipmentForStage(stageId: string): Equipment[] {
    return this.equipment().filter((e) => e.workflowStageId === stageId);
  }

  equipmentTypeName(code: string): string {
    return this.equipmentTypes().find((t) => t.code === code)?.name ?? code;
  }

  add(): void {
    const tid = this.auth.activeTenantId();
    if (!tid || !this.newType || !this.newName) return;

    this.onboarding.createEquipment(tid, {
      equipmentType: this.newType,
      name: this.newName,
      workflowStageId: this.newStageId || undefined,
    }).subscribe({
      next: (e) => {
        this.equipment.update((list) => [...list, e]);
        this.newType = '';
        this.newName = '';
        this.newStageId = '';
      },
      error: (err) => this.snack.show('Add failed: ' + (err?.error?.detail ?? 'unknown')),
    });
  }

  remove(e: Equipment): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    if (!confirm(`Remove ${e.name}?`)) return;
    this.onboarding.deactivateEquipment(tid, e.id).subscribe({
      next: () => this.equipment.update((list) => list.filter((x) => x.id !== e.id)),
      error: (err) => this.snack.show('Remove failed: ' + (err?.error?.detail ?? 'unknown')),
    });
  }
}
