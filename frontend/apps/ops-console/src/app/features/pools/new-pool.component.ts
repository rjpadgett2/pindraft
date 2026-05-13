import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@pindraft/auth';
import { PoolKind, PoolsService } from './services/pools.service';

@Component({
  selector: 'ops-new-pool',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule,
  ],
  template: `
    <div class="page">
      <a routerLink="/pools" class="back">← Back to pools</a>
      <h1 class="page-title">New pool</h1>
      <p class="page-subtitle">New pools open in ACCEPTING state.</p>

      <div class="form">
        <mat-form-field appearance="outline">
          <mat-label>Name</mat-label>
          <input matInput [(ngModel)]="name" placeholder="e.g., Spring 2026 fine-wool collective" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Kind</mat-label>
          <mat-select [(value)]="kind">
            <mat-option value="FINE_WOOL">Fine wool</mat-option>
            <mat-option value="MEDIUM_WOOL">Medium wool</mat-option>
            <mat-option value="LONG_WOOL">Long wool</mat-option>
            <mat-option value="COLORED_WOOL">Colored wool</mat-option>
            <mat-option value="MIXED">Mixed</mat-option>
            <mat-option value="OTHER">Other</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Description (optional)</mat-label>
          <textarea matInput rows="3" [(ngModel)]="description"></textarea>
        </mat-form-field>

        <div class="actions">
          <button mat-button routerLink="/pools">Cancel</button>
          <button mat-flat-button color="primary" [disabled]="!canSave()" (click)="save()">Create pool</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .back { display: inline-block; margin-bottom: 12px; font-size: 13px; color: #2563eb; text-decoration: none; }
    .form { display: flex; flex-direction: column; gap: 16px; max-width: 600px; }
    mat-form-field { width: 100%; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
  `],
})
export class NewPoolComponent {
  private service = inject(PoolsService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  name = '';
  description = '';
  kind: PoolKind = 'FINE_WOOL';

  canSave(): boolean {
    return this.name.trim().length > 0;
  }

  save(): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    this.service.create(tid, {
      name: this.name.trim(),
      description: this.description || undefined,
      kind: this.kind,
    }).subscribe({
      next: (p) => {
        this.snack.open('Pool created', 'OK', { duration: 1500 });
        this.router.navigate(['/pools', p.id]);
      },
      error: (e) => this.snack.open('Failed: ' + (e?.error?.detail ?? 'unknown'), 'OK'),
    });
  }
}
