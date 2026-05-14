import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@pindraft/auth';

/**
 * Shearer-pwa login — sage palette, mobile-first vertical card. Distinct from
 * ops-console (slate-blue industrial) and customer-portal (terracotta warm).
 * Outdoor-coded copy because shearers work in barns, on phones, between farms.
 */
@Component({
  selector: 'shearer-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div class="sh-login">
      <header class="sh-login__top">
        <div class="sh-login__brand">Pindraft <span>Shearer</span></div>
        <p class="sh-login__tagline">Book your week. Route your roads. Track your sheep.</p>
      </header>

      <main class="sh-login__form-card">
        <h1 class="sh-login__title">Sign in</h1>
        <form [formGroup]="form" (ngSubmit)="submit()" class="sh-login__form">
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email" inputmode="email" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <input matInput type="password" formControlName="password" autocomplete="current-password" />
          </mat-form-field>
          @if (errorMessage()) {
            <p class="sh-login__error">{{ errorMessage() }}</p>
          }
          <button mat-flat-button color="primary" type="submit" class="sh-login__submit"
                  [disabled]="form.invalid || loading()">
            {{ loading() ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>
        <p class="sh-login__signup">
          New to Pindraft? <a routerLink="/register">Sign up as a shearer →</a>
        </p>
      </main>

      <footer class="sh-login__footer">Offline-first. Designed for phones in barns.</footer>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: var(--pd-brand-accent-bg); }
    .sh-login {
      max-width: 460px;
      margin: 0 auto;
      min-height: 100vh;
      padding: var(--pd-space-8) var(--pd-space-5);
      display: flex;
      flex-direction: column;
      gap: var(--pd-space-6);
    }
    .sh-login__top {
      text-align: center;
      padding: var(--pd-space-8) 0 var(--pd-space-4);
    }
    .sh-login__brand {
      font-family: var(--pd-font-sans);
      font-size: var(--pd-text-2xl);
      font-weight: var(--pd-weight-semibold);
      letter-spacing: -0.02em;
      color: var(--pd-brand-accent-strong);
    }
    .sh-login__brand span {
      display: inline-block;
      margin-left: var(--pd-space-2);
      padding: 2px var(--pd-space-2);
      background: var(--pd-brand-accent);
      color: var(--pd-brand-text-on-accent);
      font-size: var(--pd-text-sm);
      font-weight: var(--pd-weight-medium);
      letter-spacing: 0.05em;
      text-transform: uppercase;
      border-radius: var(--pd-radius-sm);
      vertical-align: middle;
    }
    .sh-login__tagline {
      margin: var(--pd-space-4) 0 0;
      color: var(--pd-brand-accent-strong);
      font-size: var(--pd-text-md);
      max-width: 32ch;
      margin-left: auto;
      margin-right: auto;
    }
    .sh-login__form-card {
      background: var(--pd-color-bg-surface);
      border: 1px solid var(--pd-color-border);
      border-radius: var(--pd-radius-xl);
      padding: var(--pd-space-8) var(--pd-space-6);
      box-shadow: 0 8px 24px rgba(69, 88, 55, 0.08);
    }
    .sh-login__title {
      margin: 0 0 var(--pd-space-5);
      font-size: var(--pd-text-xl);
      line-height: var(--pd-leading-xl);
      font-weight: var(--pd-weight-semibold);
      color: var(--pd-color-text);
    }
    .sh-login__form { display: flex; flex-direction: column; gap: var(--pd-space-2); }
    .sh-login__submit { margin-top: var(--pd-space-3); }
    .sh-login__error { color: var(--pd-red-700); font-size: var(--pd-text-sm); margin: var(--pd-space-1) 0; }
    .sh-login__signup { font-size: var(--pd-text-sm); color: var(--pd-color-text-muted); margin: var(--pd-space-5) 0 0; text-align: center; }
    .sh-login__signup a { color: var(--pd-brand-accent); text-decoration: none; font-weight: var(--pd-weight-medium); }
    .sh-login__footer {
      text-align: center;
      margin-top: auto;
      padding-top: var(--pd-space-6);
      color: var(--pd-brand-accent-strong);
      font-size: var(--pd-text-xs);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      opacity: 0.7;
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
        next: () => this.router.navigate(['/events']),
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
