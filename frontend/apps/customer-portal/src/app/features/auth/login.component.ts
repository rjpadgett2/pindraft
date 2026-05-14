import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@pindraft/auth';
import { ButtonComponent, InputComponent } from '@pindraft/ui';

/**
 * Customer-portal login — warm wool-white + terracotta palette. The hero side
 * carries the consumer/shepherd-facing framing (trace your fiber, browse mills)
 * to distinguish from the operator-facing ops-console login.
 */
@Component({
  selector: 'customer-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, InputComponent],
  template: `
    <div class="cp-login">
      <main class="cp-login__form-wrap">
        <div class="cp-login__form-card">
          <a routerLink="/marketplace" class="cp-login__brand">Pindraft</a>
          <h1 class="cp-login__form-title">Welcome back.</h1>
          <p class="cp-login__form-sub">Sign in to see your fiber across the mills you ship to.</p>
          <form [formGroup]="form" (ngSubmit)="submit()" class="cp-login__form">
            <pd-input label="Email" type="email" formControlName="email" autocomplete="email" />
            <pd-input label="Password" type="password" formControlName="password" autocomplete="current-password" />
            @if (errorMessage()) {
              <p class="cp-login__error">{{ errorMessage() }}</p>
            }
            <pd-button variant="primary" type="submit"
                    [disabled]="form.invalid || loading()">
              {{ loading() ? 'Signing in…' : 'Sign in' }}
            </pd-button>
          </form>
          <p class="cp-login__signup">
            New to Pindraft? <a routerLink="/register">Create an account</a>
          </p>
          <p class="cp-login__browse">
            <a routerLink="/marketplace">Or browse the marketplace without signing in →</a>
          </p>
        </div>
      </main>

      <aside class="cp-login__hero">
        <div class="cp-login__hero-content">
          <span class="cp-login__eyebrow">For shepherds &amp; designers</span>
          <h2 class="cp-login__headline">Follow your fiber from the animal to the garment.</h2>
          <p class="cp-login__hero-lead">Watch your wool move through the mill. Open a QR-scannable trace on every finished piece. Get paid faster with progress payments at intake.</p>
          <div class="cp-login__hero-stat">
            <div class="cp-login__stat-num">28d</div>
            <div class="cp-login__stat-label">Median turnaround on Pindraft, down from 4–6 months.</div>
          </div>
        </div>
      </aside>
    </div>
  `,
  styles: [`
    .cp-login {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      min-height: 100vh;
      background: var(--pd-color-bg-app);
    }
    .cp-login__form-wrap { display: flex; align-items: center; justify-content: center; padding: var(--pd-space-12); background: var(--pd-color-bg-app); }
    .cp-login__form-card { width: 100%; max-width: 420px; }
    .cp-login__brand {
      display: inline-block;
      font-family: var(--pd-font-sans);
      font-size: var(--pd-text-lg);
      font-weight: var(--pd-weight-semibold);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--pd-brand-accent);
      text-decoration: none;
      margin-bottom: var(--pd-space-8);
    }
    .cp-login__form-title {
      margin: 0;
      font-size: var(--pd-text-2xl);
      line-height: var(--pd-leading-2xl);
      font-weight: var(--pd-weight-semibold);
      color: var(--pd-color-text);
      letter-spacing: -0.01em;
    }
    .cp-login__form-sub {
      margin: var(--pd-space-2) 0 var(--pd-space-6);
      color: var(--pd-color-text-muted);
      font-size: var(--pd-text-md);
    }
    .cp-login__form { display: flex; flex-direction: column; gap: var(--pd-space-4); }
    .cp-login__form pd-input { display: block; }
    .cp-login__form pd-button { margin-top: var(--pd-space-2); }
    .cp-login__error { color: var(--pd-red-700); font-size: var(--pd-text-sm); margin: 0; }
    .cp-login__signup { font-size: var(--pd-text-sm); color: var(--pd-color-text-muted); margin: var(--pd-space-6) 0 var(--pd-space-2); text-align: center; }
    .cp-login__signup a { color: var(--pd-brand-accent); text-decoration: none; font-weight: var(--pd-weight-medium); }
    .cp-login__browse { font-size: var(--pd-text-sm); margin: 0; text-align: center; }
    .cp-login__browse a { color: var(--pd-color-text-muted); text-decoration: none; }
    .cp-login__browse a:hover { color: var(--pd-brand-accent); }
    .cp-login__hero {
      background: linear-gradient(160deg, var(--pd-brand-accent) 0%, var(--pd-brand-accent-strong) 60%, #4a2a1a 100%);
      color: var(--pd-brand-text-on-accent);
      padding: var(--pd-space-16) var(--pd-space-12);
      display: flex;
      align-items: center;
      position: relative;
      overflow: hidden;
    }
    .cp-login__hero::before {
      content: '';
      position: absolute; inset: 0;
      background:
        radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.08) 0%, transparent 50%),
        radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.05) 0%, transparent 50%);
      pointer-events: none;
    }
    .cp-login__hero-content { position: relative; max-width: 48ch; }
    .cp-login__eyebrow {
      display: inline-block;
      padding: 4px var(--pd-space-3);
      background: rgba(255, 255, 255, 0.12);
      border-radius: var(--pd-radius-full);
      font-size: var(--pd-text-xs);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.85);
      margin-bottom: var(--pd-space-6);
    }
    .cp-login__headline {
      margin: 0;
      font-size: 40px;
      line-height: 1.1;
      font-weight: var(--pd-weight-semibold);
      letter-spacing: -0.02em;
    }
    .cp-login__hero-lead {
      margin: var(--pd-space-5) 0 var(--pd-space-10);
      font-size: var(--pd-text-md);
      line-height: 1.5;
      color: rgba(255, 255, 255, 0.85);
    }
    .cp-login__hero-stat {
      display: flex; gap: var(--pd-space-4); align-items: baseline;
      padding-top: var(--pd-space-6);
      border-top: 1px solid rgba(255, 255, 255, 0.2);
    }
    .cp-login__stat-num { font-size: 56px; line-height: 1; font-weight: var(--pd-weight-semibold); letter-spacing: -0.04em; }
    .cp-login__stat-label { font-size: var(--pd-text-sm); color: rgba(255, 255, 255, 0.78); line-height: 1.5; max-width: 28ch; }
    @media (max-width: 880px) {
      .cp-login { grid-template-columns: 1fr; grid-template-rows: auto auto; }
      .cp-login__hero { padding: var(--pd-space-10) var(--pd-space-6); order: -1; }
      .cp-login__headline { font-size: 26px; }
      .cp-login__stat-num { font-size: 40px; }
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
    password: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMessage.set(null);
    const { email, password } = this.form.value;
    this.auth.login(email!, password!).subscribe({
      next: () => this.auth.loadCurrentUser().subscribe({
        next: () => this.router.navigate(['/lots']),
        error: () => this.handleError('Could not load user details'),
      }),
      error: (err) => this.handleError(err?.error?.detail ?? 'Invalid email or password'),
    });
  }

  private handleError(message: string): void {
    this.errorMessage.set(message);
    this.loading.set(false);
  }
}
