import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@pindraft/auth';

/**
 * Self-service mill registration. Calls /auth/register-mill which creates
 * user + tenant + MILL_ADMIN membership atomically. Tenant starts in SETUP
 * (not visible in the public mill directory until they go live), so the
 * directory doesn't get spammed by abandoned signups.
 */
@Component({
  selector: 'ops-register',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatCheckboxModule,
  ],
  template: `
    <div class="ops-register">
      <aside class="ops-register__hero">
        <a routerLink="/login" class="ops-register__brand">Pindraft</a>
        <h1 class="ops-register__headline">Set up your mill in five minutes.</h1>
        <p class="ops-register__lead">Create your account and a tenant for your operation. Configure your workflow stages, equipment, and pricing — then go live.</p>
        <ol class="ops-register__steps">
          <li><span>1</span> Account + mill name</li>
          <li><span>2</span> Workflow stages &amp; equipment</li>
          <li><span>3</span> Pricing templates</li>
          <li><span>4</span> Go live, take reservations</li>
        </ol>
      </aside>

      <main class="ops-register__form-wrap">
        <div class="ops-register__form-card">
          <h2 class="ops-register__form-title">Create your mill</h2>
          <p class="ops-register__form-sub">You'll land on the setup hub. The mill won't be visible in the public directory until you've finished onboarding.</p>
          <form [formGroup]="form" (ngSubmit)="submit()" class="ops-register__form">
            <mat-form-field appearance="outline">
              <mat-label>Mill name</mat-label>
              <input matInput formControlName="millName" autocomplete="organization" placeholder="Sturnella Farm Mill" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Your name</mat-label>
              <input matInput formControlName="name" autocomplete="name" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="email" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Password (8+ characters)</mat-label>
              <input matInput type="password" formControlName="password" autocomplete="new-password" />
            </mat-form-field>
            <mat-checkbox formControlName="terms" class="ops-register__terms">
              I agree to the Pindraft terms of service
            </mat-checkbox>
            @if (errorMessage()) {
              <p class="ops-register__error">{{ errorMessage() }}</p>
            }
            <button mat-flat-button color="primary" type="submit" class="ops-register__submit"
                    [disabled]="form.invalid || loading()">
              {{ loading() ? 'Creating…' : 'Create mill & sign in' }}
            </button>
          </form>
          <p class="ops-register__signin">
            Already have an account? <a routerLink="/login">Sign in</a>
          </p>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .ops-register { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); min-height: 100vh; background: var(--pd-color-bg-app); }
    .ops-register__hero {
      background: linear-gradient(135deg, var(--pd-slate-900) 0%, var(--pd-slate-800) 50%, var(--pd-brand-accent-strong) 100%);
      color: var(--pd-brand-text-on-accent);
      padding: var(--pd-space-16) var(--pd-space-12);
      display: flex; flex-direction: column; justify-content: center;
    }
    .ops-register__brand {
      font-family: var(--pd-font-sans);
      font-size: var(--pd-text-lg);
      font-weight: var(--pd-weight-semibold);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: var(--pd-space-8);
      text-decoration: none;
    }
    .ops-register__headline { margin: 0; font-size: 36px; line-height: 1.15; font-weight: var(--pd-weight-semibold); letter-spacing: -0.02em; max-width: 18ch; }
    .ops-register__lead { margin: var(--pd-space-4) 0 var(--pd-space-8); font-size: var(--pd-text-md); line-height: 1.5; color: rgba(255, 255, 255, 0.78); max-width: 42ch; }
    .ops-register__steps { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--pd-space-3); }
    .ops-register__steps li { display: flex; gap: var(--pd-space-3); align-items: center; color: rgba(255, 255, 255, 0.85); font-size: var(--pd-text-base); }
    .ops-register__steps li span {
      flex: 0 0 28px; height: 28px; border-radius: var(--pd-radius-full);
      background: rgba(255, 255, 255, 0.1); display: inline-flex; align-items: center; justify-content: center;
      font-size: var(--pd-text-sm); font-weight: var(--pd-weight-semibold);
    }
    .ops-register__form-wrap { display: flex; align-items: center; justify-content: center; padding: var(--pd-space-12); }
    .ops-register__form-card { width: 100%; max-width: 460px; }
    .ops-register__form-title { margin: 0; font-size: var(--pd-text-2xl); line-height: var(--pd-leading-2xl); font-weight: var(--pd-weight-semibold); color: var(--pd-color-text); letter-spacing: -0.01em; }
    .ops-register__form-sub { margin: var(--pd-space-1) 0 var(--pd-space-6); color: var(--pd-color-text-muted); font-size: var(--pd-text-base); }
    .ops-register__form { display: flex; flex-direction: column; gap: var(--pd-space-2); }
    .ops-register__terms { margin: var(--pd-space-2) 0; }
    .ops-register__submit { margin-top: var(--pd-space-3); }
    .ops-register__error { color: var(--pd-red-700); font-size: var(--pd-text-sm); margin: var(--pd-space-1) 0; }
    .ops-register__signin { margin: var(--pd-space-6) 0 0; font-size: var(--pd-text-sm); color: var(--pd-color-text-muted); text-align: center; }
    .ops-register__signin a { color: var(--pd-brand-accent); text-decoration: none; font-weight: var(--pd-weight-medium); }
    @media (max-width: 880px) {
      .ops-register { grid-template-columns: 1fr; }
      .ops-register__hero { padding: var(--pd-space-8) var(--pd-space-6); }
      .ops-register__headline { font-size: 24px; }
      .ops-register__steps { display: none; }
    }
  `],
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.group({
    millName: ['', [Validators.required]],
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    terms: [false, [Validators.requiredTrue]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMessage.set(null);
    const { email, password, name, millName } = this.form.value;
    this.auth.registerMill(email!, password!, name!, millName!).subscribe({
      next: () => {
        this.auth.loadCurrentUser().subscribe({
          next: () => this.router.navigate(['/setup']),
          error: () => this.handleError('Account created — please sign in'),
        });
      },
      error: (err) => this.handleError(
        err?.status === 409
          ? 'An account with that email already exists. Try signing in instead.'
          : (err?.error?.detail ?? 'Could not create your mill. Please try again.')),
    });
  }

  private handleError(message: string): void {
    this.errorMessage.set(message);
    this.loading.set(false);
  }
}
