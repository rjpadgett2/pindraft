import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { Equipment, EquipmentType, WorkflowStage } from '@pindraft/api-client';
import { AuthService } from '@pindraft/auth';
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
    MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule,
  ],
  template: `
    <div class="page">
      <a routerLink="/setup" class="back">← Back to setup</a>
      <h1 class="page-title">Equipment</h1>
      <p class="page-subtitle">
        Add equipment for each stage that needs it. Soft-deleted equipment is hidden
        from operator screens but preserved for historical traces.
      </p>

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
                      <button mat-button color="warn" (click)="remove(e)">Remove</button>
                    </li>
                  }
                </ul>
              }
            </section>
          }
        </div>

        <div class="add-form">
          <h3>Add equipment</h3>
          <div class="add-row">
            <mat-form-field appearance="outline">
              <mat-label>Type</mat-label>
              <mat-select [(value)]="newType">
                @for (t of equipmentTypes(); track t.code) {
                  <mat-option [value]="t.code">{{ t.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Name</mat-label>
              <input matInput [(ngModel)]="newName" placeholder="e.g., Sort table A" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Stage (optional)</mat-label>
              <mat-select [(value)]="newStageId">
                <mat-option [value]="null">— none —</mat-option>
                @for (s of stages(); track s.id) {
                  <mat-option [value]="s.id">{{ s.displayName }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <button mat-flat-button color="primary"
                [disabled]="!newType || !newName" (click)="add()">
              Add
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .back { display: inline-block; margin-bottom: 12px; font-size: 13px; color: #2563eb; text-decoration: none; }
    .grouped { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
    section { background: white; border-radius: 8px; padding: 16px 20px; border: 1px solid #e5e7eb; }
    section h2 { margin: 0 0 8px; font-size: 14px; font-weight: 500; color: #374151; }
    .empty { font-size: 13px; color: #9ca3af; margin: 4px 0 0; }
    ul { list-style: none; padding: 0; margin: 0; }
    li { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-top: 1px solid #f3f4f6; font-size: 13px; }
    li:first-child { border-top: none; }
    .type { margin-left: 8px; padding: 2px 8px; font-size: 11px; background: #f3f4f6; color: #666; border-radius: 4px; }
    .add-form { background: #f9fafb; padding: 16px 20px; border-radius: 8px; }
    .add-form h3 { margin: 0 0 12px; font-size: 14px; font-weight: 500; }
    .add-row { display: flex; gap: 12px; align-items: flex-start; }
    .add-row mat-form-field { flex: 1; }
  `],
})
export class EquipmentComponent {
  private onboarding = inject(OnboardingService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly equipment = signal<Equipment[]>([]);
  readonly equipmentTypes = signal<EquipmentType[]>([]);
  readonly stages = signal<WorkflowStage[]>([]);

  newType: string | null = null;
  newName = '';
  newStageId: string | null = null;

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
      workflowStageId: this.newStageId ?? undefined,
    }).subscribe({
      next: (e) => {
        this.equipment.update((list) => [...list, e]);
        this.newType = null;
        this.newName = '';
        this.newStageId = null;
      },
      error: (err) => this.snack.open('Add failed: ' + (err?.error?.detail ?? 'unknown'), 'OK'),
    });
  }

  remove(e: Equipment): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    if (!confirm(`Remove ${e.name}?`)) return;
    this.onboarding.deactivateEquipment(tid, e.id).subscribe({
      next: () => this.equipment.update((list) => list.filter((x) => x.id !== e.id)),
      error: (err) => this.snack.open('Remove failed: ' + (err?.error?.detail ?? 'unknown'), 'OK'),
    });
  }
}
