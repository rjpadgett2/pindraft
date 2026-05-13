import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { TenantProfile } from '@pindraft/api-client';
import { AuthService } from '@pindraft/auth';
import { OnboardingService } from './services/onboarding.service';

@Component({
  selector: 'ops-mill-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule,
  ],
  template: `
    <div class="page">
      <a routerLink="/setup" class="back">← Back to setup</a>
      <h1 class="page-title">Mill profile</h1>
      <p class="page-subtitle">Basics that show up on every operator screen and customer-facing artifact.</p>

      @if (profile(); as p) {
        <div class="form">
          <mat-form-field appearance="outline">
            <mat-label>Mill name</mat-label>
            <input matInput [(ngModel)]="name" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Default weight unit</mat-label>
            <mat-select [(value)]="defaultUnit">
              <mat-option value="kg">Kilograms (kg)</mat-option>
              <mat-option value="lb">Pounds (lb)</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Time zone</mat-label>
            <input matInput [(ngModel)]="timeZone" placeholder="e.g., America/New_York" />
          </mat-form-field>

          <div class="actions">
            <button mat-button routerLink="/setup">Cancel</button>
            <button mat-flat-button color="primary" [disabled]="saving()" (click)="save()">
              {{ saving() ? 'Saving…' : 'Save changes' }}
            </button>
          </div>
        </div>
      } @else if (loading()) {
        <p>Loading…</p>
      }
    </div>
  `,
  styles: [`
    .back { display: inline-block; margin-bottom: 12px; font-size: 13px; color: #2563eb; text-decoration: none; }
    .form { display: flex; flex-direction: column; gap: 16px; max-width: 480px; }
    mat-form-field { width: 100%; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
  `],
})
export class MillProfileComponent {
  private onboarding = inject(OnboardingService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly profile = signal<TenantProfile | null>(null);

  name = '';
  defaultUnit: 'kg' | 'lb' = 'kg';
  timeZone = '';

  constructor() {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    this.onboarding.getMillProfile(tid).subscribe({
      next: (p) => {
        this.profile.set(p);
        this.name = p.name;
        this.defaultUnit = p.defaultUnit;
        this.timeZone = p.timeZone;
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  save(): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    this.saving.set(true);
    this.onboarding.updateMillProfile(tid, {
      name: this.name,
      defaultUnit: this.defaultUnit,
      timeZone: this.timeZone,
    }).subscribe({
      next: (p) => {
        this.profile.set(p);
        this.snack.open('Profile saved', 'OK', { duration: 2000 });
        this.saving.set(false);
      },
      error: (e) => {
        this.snack.open('Save failed: ' + (e?.error?.detail ?? 'unknown'), 'OK');
        this.saving.set(false);
      },
    });
  }
}
