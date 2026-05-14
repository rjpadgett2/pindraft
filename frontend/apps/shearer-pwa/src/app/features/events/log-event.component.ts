import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  ButtonComponent, InputComponent, PageHeaderComponent,
  SelectComponent, SelectOption, SnackbarService,
} from '@pindraft/ui';
import { OfflineQueueService } from '../../core/offline-queue.service';
import { SyncService } from '../../core/sync.service';

/**
 * Log a shearing event. Save is optimistic — writes to the local outbox first,
 * navigates immediately to the list. Sync happens in the background via SyncService.
 *
 * The shearer never waits on the network. Even mid-shear with no signal, they can
 * record an animal in under five seconds.
 */
@Component({
  selector: 'shearer-log-event',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, RouterLink,
    ButtonComponent, InputComponent, PageHeaderComponent, SelectComponent,
  ],
  template: `
    <div class="page">
      <a routerLink="/events" class="back">← Back</a>
      <pd-page-header title="Log shearing" subtitle="Saves instantly, syncs when connected." />

      <div class="form">
        <pd-input label="Animal name" [(ngModel)]="animalName" />
        <pd-select label="Breed" [(ngModel)]="breedCode" [options]="breedOptions" />
        <pd-input label="Fleece weight (kg)" type="number" [(ngModel)]="weightKg" />
        <pd-input label="Location (optional)" [(ngModel)]="location"
                  helper="e.g., Bramble Farm" />

        <label class="textarea-field">
          <span>Notes (optional)</span>
          <textarea rows="2" [(ngModel)]="notes" name="notes"></textarea>
        </label>

        <div class="actions">
          <pd-button variant="ghost" routerLink="/events">Cancel</pd-button>
          <pd-button variant="primary" [disabled]="!canSave()" (click)="save()">
            Save
          </pd-button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 16px; }
    .back { display: inline-block; margin-bottom: 12px; font-size: 13px; color: var(--pd-color-link, #2563eb); text-decoration: none; }
    .form { display: flex; flex-direction: column; gap: 12px; }
    pd-input, pd-select { display: block; }
    .textarea-field { display: flex; flex-direction: column; gap: 4px; }
    .textarea-field span { font-size: 12px; font-weight: 600; color: var(--pd-color-muted, #6b7280); }
    .textarea-field textarea {
      padding: 10px 12px;
      border: 1px solid var(--pd-color-border, #d1d5db);
      border-radius: 8px;
      font-family: inherit;
      font-size: 14px;
      resize: vertical;
      background: white;
    }
    .textarea-field textarea:focus { outline: none; border-color: var(--pd-brand-accent, #2563eb); }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
  `],
})
export class LogEventComponent {
  private queue = inject(OfflineQueueService);
  private sync = inject(SyncService);
  private router = inject(Router);
  private snack = inject(SnackbarService);

  readonly breedOptions: SelectOption[] = [
    { value: '', label: '— Not specified —' },
    { value: 'ROMNEY', label: 'Romney' },
    { value: 'MERINO', label: 'Merino' },
    { value: 'CORRIEDALE', label: 'Corriedale' },
    { value: 'JACOB', label: 'Jacob' },
    { value: 'SHETLAND', label: 'Shetland' },
    { value: 'MIXED', label: 'Mixed' },
    { value: 'OTHER', label: 'Other' },
  ];

  animalName = '';
  breedCode = '';
  weightKg: number | null = null;
  location = '';
  notes = '';

  canSave(): boolean {
    return this.animalName.trim().length > 0;
  }

  async save(): Promise<void> {
    if (!this.canSave()) return;
    await this.queue.enqueue({
      localId: this.queue.generateLocalId(),
      animalName: this.animalName.trim(),
      breedCode: this.breedCode || undefined,
      fleeceWeightKg: this.weightKg ?? undefined,
      shornAt: new Date().toISOString(),
      location: this.location.trim() || undefined,
      notes: this.notes.trim() || undefined,
    });
    this.snack.show('Saved locally', { durationMs: 1500 });
    this.sync.trySync();  // fire-and-forget; sync happens in background
    this.router.navigate(['/events']);
  }
}
