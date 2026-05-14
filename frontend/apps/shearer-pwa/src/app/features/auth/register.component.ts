import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@pindraft/auth';
import { ButtonComponent, InputComponent } from '@pindraft/ui';

/**
 * Shearer registration. Backend sets userType=SHEARER server-side via the
 * dedicated /auth/register-shearer endpoint — no client trust needed.
 */
@Component({
  selector: 'shearer-register',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, InputComponent],
  template: `
    <div class="sh-register">
      <header class="sh-register__top">
        <div class="sh-register__brand">Pindraft <span>Shearer</span></div>
        <p class="sh-register__tagline">Sign up to start booking farms and routing your week.</p>
      </header>

      <main class="sh-register__form-card">
        <h1 class="sh-register__title">Create your shearer account</h1>
        <form [formGroup]="form" (ngSubmit)="submit()" class="sh-register__form">
          <pd-input label="Your name" formControlName="name" autocomplete="name" />
          <pd-input label="Email" type="email" formControlName="email"
                    autocomplete="email" inputmode="email" />
          <pd-input label="Password (8+ characters)" type="password"
                    formControlName="password" autocomplete="new-password" />
          @if (errorMessage()) {
            <p class="sh-register__error">{{ errorMessage() }}</p>
          }
          <pd-button variant="primary" type="submit"
                  [disabled]="form.invalid || loading()">
            {{ loading() ? 'Creating account…' : 'Create account' }}
          </pd-button>
        </form>
        <p class="sh-register__signin">
          Already have an account? <a routerLink="/login">Sign in</a>
        </p>
      </main>

      <footer class="sh-register__footer">Pindraft Shearer · v1</footer>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: var(--pd-brand-accent-bg); }
    .sh-register {
      max-width: 460px; margin: 0 auto; min-height: 100vh;
      padding: var(--pd-space-8) var(--pd-space-5);
      display: flex; flex-direction: column; gap: var(--pd-space-6);
    }
    .sh-register__top { text-align: center; padding: var(--pd-space-8) 0 var(--pd-space-4); }
    .sh-register__brand {
      font-family: var(--pd-font-sans);
      font-size: var(--pd-text-2xl);
      font-weight: var(--pd-weight-semibold);
      letter-spacing: -0.02em;
      color: var(--pd-brand-accent-strong);
    }
    .sh-register__brand span {
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
    .sh-register__tagline {
      margin: var(--pd-space-4) 0 0;
      color: var(--pd-brand-accent-strong);
      font-size: var(--pd-text-md);
      max-width: 32ch;
      margin-left: auto; margin-right: auto;
    }
    .sh-register__form-card {
      background: var(--pd-color-bg-surface);
      border: 1px solid var(--pd-color-border);
      border-radius: var(--pd-radius-xl);
      padding: var(--pd-space-8) var(--pd-space-6);
      box-shadow: 0 8px 24px rgba(69, 88, 55, 0.08);
    }
    .sh-register__title {
      margin: 0 0 var(--pd-space-5);
      font-size: var(--pd-text-xl);
      line-height: var(--pd-leading-xl);
      font-weight: var(--pd-weight-semibold);
      color: var(--pd-color-text);
    }
    .sh-register__form { display: flex; flex-direction: column; gap: var(--pd-space-4); }
    .sh-register__form pd-input { display: block; }
    .sh-register__form pd-button { margin-top: var(--pd-space-2); }
    .sh-register__error { color: var(--pd-red-700); font-size: var(--pd-text-sm); margin: 0; }
    .sh-register__signin { font-size: var(--pd-text-sm); color: var(--pd-color-text-muted); margin: var(--pd-space-5) 0 0; text-align: center; }
    .sh-register__signin a { color: var(--pd-brand-accent); text-decoration: none; font-weight: var(--pd-weight-medium); }
    .sh-register__footer {
      text-align: center; margin-top: auto; padding-top: var(--pd-space-6);
      color: var(--pd-brand-accent-strong);
      font-size: var(--pd-text-xs); letter-spacing: 0.04em; text-transform: uppercase; opacity: 0.7;
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
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMessage.set(null);
    const { name, email, password } = this.form.value;
    this.auth.registerShearer(email!, password!, name!).subscribe({
      next: () => this.auth.loadCurrentUser().subscribe({
        next: () => this.router.navigate(['/events']),
        error: () => this.handleError('Account created — please sign in'),
      }),
      error: (err) => this.handleError(
        err?.status === 409
          ? 'An account with that email already exists. Try signing in.'
          : (err?.error?.detail ?? 'Could not create your account. Please try again.')),
    });
  }

  private handleError(message: string): void {
    this.errorMessage.set(message);
    this.loading.set(false);
  }
}
