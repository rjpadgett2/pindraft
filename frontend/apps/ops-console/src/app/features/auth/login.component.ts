import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@pindraft/auth';

/**
 * Ops console login. Two-column "industrial" treatment with slate-blue brand
 * accent. The hero column carries product framing so a misclicked tab is
 * obvious without scrolling — distinguishes this page from the customer-portal
 * and shearer-pwa logins which use different palettes and copy.
 */
@Component({
  selector: 'ops-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div class="ops-login">
      <aside class="ops-login__hero">
        <div class="ops-login__brand">Pindraft</div>
        <h1 class="ops-login__headline">Run your mill on operations-grade software.</h1>
        <p class="ops-login__lead">Intake. Lot tracking. Queue optimization. Wool pool settlement. The dense daily-use surface your floor needs.</p>
        <ul class="ops-login__features">
          <li><span class="ops-login__tick">✓</span> Online intake and reservation</li>
          <li><span class="ops-login__tick">✓</span> Barcoded lot tracking at every stage</li>
          <li><span class="ops-login__tick">✓</span> Queue + changeover optimizer</li>
          <li><span class="ops-login__tick">✓</span> Automated invoicing &amp; settlement</li>
        </ul>
      </aside>

      <main class="ops-login__form-wrap">
        <div class="ops-login__form-card">
          <h2 class="ops-login__form-title">Sign in</h2>
          <p class="ops-login__form-sub">Access your mill's operations console.</p>
          <form [formGroup]="form" (ngSubmit)="submit()" class="ops-login__form">
            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="email" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Password</mat-label>
              <input matInput type="password" formControlName="password" autocomplete="current-password" />
            </mat-form-field>
            @if (errorMessage()) {
              <p class="ops-login__error">{{ errorMessage() }}</p>
            }
            <button mat-flat-button color="primary" type="submit" class="ops-login__submit"
                    [disabled]="form.invalid || loading()">
              {{ loading() ? 'Signing in…' : 'Sign in' }}
            </button>
          </form>
          <div class="ops-login__sep"></div>
          <p class="ops-login__signup">
            Starting a new mill?
            <a routerLink="/register">Create your mill on Pindraft →</a>
          </p>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .ops-login {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      min-height: 100vh;
      background: var(--pd-color-bg-app);
    }
    .ops-login__hero {
      background: linear-gradient(135deg, var(--pd-slate-900) 0%, var(--pd-slate-800) 50%, var(--pd-brand-accent-strong) 100%);
      color: var(--pd-brand-text-on-accent);
      padding: var(--pd-space-16) var(--pd-space-12);
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .ops-login__brand {
      font-family: var(--pd-font-sans);
      font-size: var(--pd-text-lg);
      font-weight: var(--pd-weight-semibold);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: var(--pd-space-8);
    }
    .ops-login__headline {
      margin: 0;
      font-size: 36px;
      line-height: 1.15;
      font-weight: var(--pd-weight-semibold);
      letter-spacing: -0.02em;
      max-width: 18ch;
    }
    .ops-login__lead {
      margin: var(--pd-space-4) 0 var(--pd-space-8);
      font-size: var(--pd-text-md);
      line-height: 1.5;
      color: rgba(255, 255, 255, 0.78);
      max-width: 40ch;
    }
    .ops-login__features { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--pd-space-2); }
    .ops-login__features li { font-size: var(--pd-text-base); color: rgba(255, 255, 255, 0.85); display: flex; gap: var(--pd-space-3); align-items: baseline; }
    .ops-login__tick { color: var(--pd-blue-500); font-weight: var(--pd-weight-semibold); }
    .ops-login__form-wrap { display: flex; align-items: center; justify-content: center; padding: var(--pd-space-12); }
    .ops-login__form-card { width: 100%; max-width: 420px; }
    .ops-login__form-title { margin: 0; font-size: var(--pd-text-2xl); line-height: var(--pd-leading-2xl); font-weight: var(--pd-weight-semibold); color: var(--pd-color-text); letter-spacing: -0.01em; }
    .ops-login__form-sub { margin: var(--pd-space-1) 0 var(--pd-space-6); color: var(--pd-color-text-muted); font-size: var(--pd-text-base); }
    .ops-login__form { display: flex; flex-direction: column; gap: var(--pd-space-2); }
    .ops-login__submit { margin-top: var(--pd-space-3); }
    .ops-login__error { color: var(--pd-red-700); font-size: var(--pd-text-sm); margin: var(--pd-space-1) 0 var(--pd-space-2); }
    .ops-login__sep { height: 1px; background: var(--pd-color-border); margin: var(--pd-space-6) 0 var(--pd-space-4); }
    .ops-login__signup { font-size: var(--pd-text-sm); color: var(--pd-color-text-muted); margin: 0; text-align: center; }
    .ops-login__signup a { color: var(--pd-brand-accent); text-decoration: none; font-weight: var(--pd-weight-medium); }
    .ops-login__signup a:hover { color: var(--pd-brand-accent-hover); text-decoration: underline; }
    @media (max-width: 880px) {
      .ops-login { grid-template-columns: 1fr; }
      .ops-login__hero { padding: var(--pd-space-12) var(--pd-space-6); }
      .ops-login__headline { font-size: 28px; }
      .ops-login__features { display: none; }
    }
  `],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(1)]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.form.value;
    this.auth.login(email!, password!).subscribe({
      next: () => {
        this.auth.loadCurrentUser().subscribe({
          next: () => this.router.navigate(['/setup']),
          error: () => this.handleError('Could not load user details'),
        });
      },
      error: (err) => this.handleError(err?.error?.detail ?? 'Invalid email or password'),
    });
  }

  private handleError(message: string): void {
    this.errorMessage.set(message);
    this.loading.set(false);
  }
}
