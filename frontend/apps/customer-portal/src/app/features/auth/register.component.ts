import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@pindraft/auth';

/**
 * Public registration for shepherds / designers. Creates a user with no tenant
 * relationships and immediately logs them in. They can then browse public surfaces
 * (marketplace, mill directory, trace pages); their `/lots` and `/pools` populate
 * as mills add them as customers or as Hirsel manifests arrive.
 *
 * Mill operators don't use this — they're created via /bootstrap/admin (first one)
 * or accept an invitation.
 */
@Component({
  selector: 'customer-register',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div class="register-page">
      <mat-card class="register-card">
        <mat-card-header>
          <mat-card-title>Pindraft</mat-card-title>
          <mat-card-subtitle>Create an account to follow your fiber and browse mills</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline">
              <mat-label>Your name</mat-label>
              <input matInput type="text" formControlName="name" autocomplete="name" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="email" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Password (8+ characters)</mat-label>
              <input matInput type="password" formControlName="password" autocomplete="new-password" />
            </mat-form-field>
            @if (errorMessage()) {
              <p class="error">{{ errorMessage() }}</p>
            }
            <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || loading()">
              {{ loading() ? 'Creating account…' : 'Create account' }}
            </button>
          </form>
          <p class="signin-prompt">
            Already have an account? <a routerLink="/login">Sign in</a>
          </p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .register-page { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .register-card { width: 100%; max-width: 400px; }
    form { display: flex; flex-direction: column; gap: 8px; padding-top: 16px; }
    .error { color: #b91c1c; font-size: 13px; margin: 4px 0 12px; }
    button { margin-top: 8px; }
    .signin-prompt { font-size: 13px; color: #6b7280; margin: 16px 0 0; text-align: center; }
    .signin-prompt a { color: #2563eb; text-decoration: none; }
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
