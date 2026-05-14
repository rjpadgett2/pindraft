import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@pindraft/auth';
import { ButtonComponent, InputComponent } from '@pindraft/ui';

/**
 * Public registration for shepherds / designers. Creates a user with no tenant
 * relationships and immediately logs them in. They can then browse public surfaces
 * (marketplace, mill directory, trace pages); their `/lots` and `/pools` populate
 * as mills add them as customers or as Hirsel manifests arrive.
 *
 * Visual treatment mirrors the customer-portal login: cream + terracotta, hero
 * column on the right with consumer-facing framing. Mill operators don't use this —
 * they're created via /bootstrap/admin (first one) or accept an invitation.
 */
@Component({
  selector: 'customer-register',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, InputComponent],
  template: `
    <div class="cp-register">
      <main class="cp-register__form-wrap">
        <div class="cp-register__form-card">
          <a routerLink="/marketplace" class="cp-register__brand">Pindraft</a>
          <h1 class="cp-register__form-title">Create your account.</h1>
          <p class="cp-register__form-sub">Follow your fiber across every mill you work with.</p>
          <form [formGroup]="form" (ngSubmit)="submit()" class="cp-register__form">
            <pd-input label="Your name" formControlName="name" autocomplete="name" />
            <pd-input label="Email" type="email" formControlName="email" autocomplete="email" />
            <pd-input label="Password (8+ characters)" type="password"
                      formControlName="password" autocomplete="new-password" />
            @if (errorMessage()) {
              <p class="cp-register__error">{{ errorMessage() }}</p>
            }
            <pd-button variant="primary" type="submit"
                       [disabled]="form.invalid || loading()">
              {{ loading() ? 'Creating account…' : 'Create account' }}
            </pd-button>
          </form>
          <p class="cp-register__signin">
            Already have an account? <a routerLink="/login">Sign in</a>
          </p>
        </div>
      </main>

      <aside class="cp-register__hero">
        <div class="cp-register__hero-content">
          <span class="cp-register__eyebrow">For shepherds &amp; designers</span>
          <h2 class="cp-register__headline">From the animal to the garment, all in one account.</h2>
          <ul class="cp-register__benefits">
            <li><span class="cp-register__tick">✓</span> See your fiber's stage across every mill</li>
            <li><span class="cp-register__tick">✓</span> Get paid faster with intake-time progress payments</li>
            <li><span class="cp-register__tick">✓</span> Share QR-scannable provenance on every batch</li>
            <li><span class="cp-register__tick">✓</span> Browse the marketplace and discover mills</li>
          </ul>
        </div>
      </aside>
    </div>
  `,
  styles: [`
    .cp-register { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); min-height: 100vh; background: var(--pd-color-bg-app); }
    .cp-register__form-wrap { display: flex; align-items: center; justify-content: center; padding: var(--pd-space-12); background: var(--pd-color-bg-app); }
    .cp-register__form-card { width: 100%; max-width: 420px; }
    .cp-register__brand {
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
    .cp-register__form-title { margin: 0; font-size: var(--pd-text-2xl); line-height: var(--pd-leading-2xl); font-weight: var(--pd-weight-semibold); color: var(--pd-color-text); letter-spacing: -0.01em; }
    .cp-register__form-sub { margin: var(--pd-space-2) 0 var(--pd-space-6); color: var(--pd-color-text-muted); font-size: var(--pd-text-md); }
    .cp-register__form { display: flex; flex-direction: column; gap: var(--pd-space-4); }
    .cp-register__form pd-input { display: block; }
    .cp-register__form pd-button { margin-top: var(--pd-space-2); }
    .cp-register__error { color: var(--pd-red-700); font-size: var(--pd-text-sm); margin: 0; }
    .cp-register__signin { font-size: var(--pd-text-sm); color: var(--pd-color-text-muted); margin: var(--pd-space-6) 0 0; text-align: center; }
    .cp-register__signin a { color: var(--pd-brand-accent); text-decoration: none; font-weight: var(--pd-weight-medium); }
    .cp-register__hero {
      background: linear-gradient(160deg, var(--pd-brand-accent) 0%, var(--pd-brand-accent-strong) 60%, #4a2a1a 100%);
      color: var(--pd-brand-text-on-accent);
      padding: var(--pd-space-16) var(--pd-space-12);
      display: flex; align-items: center; position: relative; overflow: hidden;
    }
    .cp-register__hero::before {
      content: '';
      position: absolute; inset: 0;
      background:
        radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.08) 0%, transparent 50%),
        radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.05) 0%, transparent 50%);
      pointer-events: none;
    }
    .cp-register__hero-content { position: relative; max-width: 48ch; }
    .cp-register__eyebrow {
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
    .cp-register__headline { margin: 0; font-size: 36px; line-height: 1.15; font-weight: var(--pd-weight-semibold); letter-spacing: -0.02em; }
    .cp-register__benefits { list-style: none; padding: 0; margin: var(--pd-space-8) 0 0; display: flex; flex-direction: column; gap: var(--pd-space-3); }
    .cp-register__benefits li { display: flex; gap: var(--pd-space-3); align-items: baseline; color: rgba(255, 255, 255, 0.9); font-size: var(--pd-text-base); }
    .cp-register__tick { color: rgba(255, 255, 255, 0.95); font-weight: var(--pd-weight-semibold); }
    @media (max-width: 880px) {
      .cp-register { grid-template-columns: 1fr; }
      .cp-register__hero { padding: var(--pd-space-10) var(--pd-space-6); order: -1; }
      .cp-register__headline { font-size: 24px; }
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
    this.auth.register(email!, password!, name!).subscribe({
      next: () => this.auth.loadCurrentUser().subscribe({
        next: () => this.router.navigate(['/lots']),
        error: () => this.handleError('Account created — please sign in'),
      }),
      error: (err) => this.handleError(
        err?.status === 409
          ? 'An account with that email already exists. Try signing in.'
          : (err?.error?.detail ?? 'Registration failed. Please try again.')),
    });
  }

  private handleError(message: string): void {
    this.errorMessage.set(message);
    this.loading.set(false);
  }
}
