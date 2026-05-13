import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '@pindraft/auth';
import {
  InvitationPublicInfo,
  InvitationsService,
} from './services/invitations.service';

/**
 * Public accept page — runs pre-login. Looks up the invitation by token to show
 * the recipient who invited them, asks for password (and name if the user is new),
 * accepts, then logs them in and routes to /setup.
 */
@Component({
  selector: 'ops-accept-invite',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div class="accept-page">
      <mat-card class="accept-card">
        <mat-card-header>
          <mat-card-title>Pindraft</mat-card-title>
          <mat-card-subtitle>Accept your invitation</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          @if (loading()) {
            <p>Verifying invitation…</p>
          } @else if (lookupError()) {
            <p class="error">{{ lookupError() }}</p>
            <a routerLink="/login" mat-stroked-button>Go to sign in</a>
          } @else if (info(); as inv) {
            <p class="lead">
              You've been invited as <strong>{{ formatRole(inv.role) }}</strong>.
              Set a password to accept and join your mill.
            </p>
            <form (submit)="$event.preventDefault(); accept()">
              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput [value]="inv.email" readonly />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Your name</mat-label>
                <input matInput [(ngModel)]="name" name="name" autocomplete="name" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Choose a password</mat-label>
                <input matInput type="password" [(ngModel)]="password" name="password" autocomplete="new-password" />
              </mat-form-field>
              @if (acceptError()) {
                <p class="error">{{ acceptError() }}</p>
              }
              <button mat-flat-button color="primary" type="submit"
                  [disabled]="!canAccept() || accepting()">
                {{ accepting() ? 'Accepting…' : 'Accept and sign in' }}
              </button>
            </form>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .accept-page { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .accept-card { width: 100%; max-width: 420px; }
    .lead { font-size: 14px; color: #4b5563; margin: 12px 0 16px; }
    form { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; }
    .error { color: #b91c1c; font-size: 13px; margin: 4px 0 12px; }
    button { margin-top: 8px; }
  `],
})
export class AcceptInviteComponent {
  private service = inject(InvitationsService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly loading = signal(true);
  readonly accepting = signal(false);
  readonly info = signal<InvitationPublicInfo | null>(null);
  readonly lookupError = signal<string | null>(null);
  readonly acceptError = signal<string | null>(null);

  name = '';
  password = '';

  constructor() {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.lookupError.set('Invalid invitation link.');
      this.loading.set(false);
      return;
    }
    this.service.lookup(token).subscribe({
      next: (i) => {
        if (i.status !== 'PENDING') {
          this.lookupError.set('This invitation is ' + i.status.toLowerCase() + '.');
        } else if (new Date(i.expiresAt).getTime() < Date.now()) {
          this.lookupError.set('This invitation has expired.');
        } else {
          this.info.set(i);
        }
        this.loading.set(false);
      },
      error: () => {
        this.lookupError.set('Invitation not found or token invalid.');
        this.loading.set(false);
      },
    });
  }

  canAccept(): boolean {
    return this.password.length >= 8 && this.name.trim().length > 0;
  }

  formatRole(r: string): string {
    return r.replace('_', ' ').toLowerCase();
  }

  accept(): void {
    const token = this.route.snapshot.paramMap.get('token');
    const inv = this.info();
    if (!token || !inv || !this.canAccept()) return;
    this.accepting.set(true);
    this.acceptError.set(null);
    this.service.accept(token, { password: this.password, name: this.name.trim() }).subscribe({
      next: () => {
        // Log in with the credentials they just set — picks up the new membership.
        this.auth.login(inv.email, this.password).subscribe({
          next: () => this.router.navigate(['/setup']),
          error: () => {
            // Accept succeeded but login failed — bounce to /login with email hint.
            this.router.navigate(['/login']);
          },
        });
      },
      error: (e) => {
        this.acceptError.set(e?.error?.detail ?? 'Could not accept invitation.');
        this.accepting.set(false);
      },
    });
  }
}
