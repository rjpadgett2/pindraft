import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TenantProfile } from '@pindraft/api-client';
import { AuthService } from '@pindraft/auth';
import {
  ButtonComponent, InputComponent, PageHeaderComponent,
  SelectComponent, SelectOption, SnackbarService,
} from '@pindraft/ui';
import { OnboardingService } from './services/onboarding.service';

@Component({
  selector: 'ops-mill-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, RouterLink,
    ButtonComponent, InputComponent, PageHeaderComponent, SelectComponent,
  ],
  template: `
    <div class="page">
      <a routerLink="/setup" class="back">← Back to setup</a>
      <pd-page-header
        title="Mill profile"
        subtitle="Basics that show up on every operator screen and customer-facing artifact." />

      @if (profile(); as p) {
        <div class="form">
          <pd-input label="Mill name" [(ngModel)]="name" />
          <pd-select label="Default weight unit" [(ngModel)]="defaultUnit" [options]="unitOptions" />
          <pd-input label="Time zone" [(ngModel)]="timeZone"
                    helper="e.g., America/New_York" />

          <div class="actions">
            <pd-button variant="ghost" routerLink="/setup">Cancel</pd-button>
            <pd-button variant="primary" [disabled]="saving()" (click)="save()">
              {{ saving() ? 'Saving…' : 'Save changes' }}
            </pd-button>
          </div>
        </div>
      } @else if (loading()) {
        <p class="muted">Loading…</p>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px 32px; }
    .back { display: inline-block; margin-bottom: 12px; font-size: 13px; color: var(--pd-color-link, #2563eb); text-decoration: none; }
    .form { display: flex; flex-direction: column; gap: 16px; max-width: 480px; }
    pd-input, pd-select { display: block; }
    .muted { color: var(--pd-color-muted, #6b7280); font-size: 13px; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
  `],
})
export class MillProfileComponent {
  private onboarding = inject(OnboardingService);
  private auth = inject(AuthService);
  private snack = inject(SnackbarService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly profile = signal<TenantProfile | null>(null);

  readonly unitOptions: SelectOption[] = [
    { value: 'kg', label: 'Kilograms (kg)' },
    { value: 'lb', label: 'Pounds (lb)' },
  ];

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
        this.snack.show('Profile saved', { durationMs: 2000 });
        this.saving.set(false);
      },
      error: (e) => {
        this.snack.show('Save failed: ' + (e?.error?.detail ?? 'unknown'));
        this.saving.set(false);
      },
    });
  }
}
