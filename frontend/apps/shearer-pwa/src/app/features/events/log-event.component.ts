import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
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
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule,
  ],
  template: `
    <div class="page">
      <a routerLink="/events" class="back">← Back</a>
      <h1 class="page-title">Log shearing</h1>
      <p class="page-subtitle">Saves instantly, syncs when connected.</p>

      <div class="form">
        <mat-form-field appearance="outline">
          <mat-label>Animal name</mat-label>
          <input matInput [(ngModel)]="animalName" autofocus />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Breed</mat-label>
          <mat-select [(value)]="breedCode">
            <mat-option [value]="null">— Not specified —</mat-option>
            <mat-option value="ROMNEY">Romney</mat-option>
            <mat-option value="MERINO">Merino</mat-option>
            <mat-option value="CORRIEDALE">Corriedale</mat-option>
            <mat-option value="JACOB">Jacob</mat-option>
            <mat-option value="SHETLAND">Shetland</mat-option>
            <mat-option value="MIXED">Mixed</mat-option>
            <mat-option value="OTHER">Other</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Fleece weight (kg)</mat-label>
          <input matInput type="number" min="0" step="0.1" [(ngModel)]="weightKg" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Location (optional)</mat-label>
          <input matInput [(ngModel)]="location" placeholder="e.g., Bramble Farm" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Notes (optional)</mat-label>
          <textarea matInput rows="2" [(ngModel)]="notes"></textarea>
        </mat-form-field>

        <div class="actions">
          <button mat-button routerLink="/events">Cancel</button>
          <button mat-flat-button color="primary" [disabled]="!canSave()" (click)="save()">
            Save
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .back { display: inline-block; margin-bottom: 12px; font-size: 13px; color: #2563eb; text-decoration: none; }
    .form { display: flex; flex-direction: column; gap: 12px; }
    mat-form-field { width: 100%; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
  `],
})
export class LogEventComponent {
  private queue = inject(OfflineQueueService);
  private sync = inject(SyncService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  animalName = '';
  breedCode: string | null = null;
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
      breedCode: this.breedCode ?? undefined,
      fleeceWeightKg: this.weightKg ?? undefined,
      shornAt: new Date().toISOString(),
      location: this.location.trim() || undefined,
      notes: this.notes.trim() || undefined,
    });
    this.snack.open('Saved locally', 'OK', { duration: 1500 });
    this.sync.trySync();  // fire-and-forget; sync happens in background
    this.router.navigate(['/events']);
  }
}
