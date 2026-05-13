import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { AuthService } from '@pindraft/auth';

@Component({
  selector: 'customer-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div class="login-page">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>Pindraft</mat-card-title>
          <mat-card-subtitle>Sign in to see your fiber across the mills you ship to</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="email" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Password</mat-label>
              <input matInput type="password" formControlName="password" autocomplete="current-password" />
            </mat-form-field>
            @if (errorMessage()) {
              <p class="error">{{ errorMessage() }}</p>
            }
            <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || loading()">
              {{ loading() ? 'Signing in…' : 'Sign in' }}
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-page { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .login-card { width: 100%; max-width: 400px; }
    form { display: flex; flex-direction: column; gap: 8px; padding-top: 16px; }
    .error { color: #b91c1c; font-size: 13px; margin: 4px 0 12px; }
    button { margin-top: 8px; }
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
