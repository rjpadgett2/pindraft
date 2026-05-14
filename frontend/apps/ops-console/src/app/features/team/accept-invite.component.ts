import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '@pindraft/auth';
import { ButtonComponent, CardComponent, InputComponent } from '@pindraft/ui';
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
  imports: [FormsModule, RouterLink, ButtonComponent, CardComponent, InputComponent],
  template: `
    <div class="accept-page">
      <pd-card class="accept-card" padding="lg">
        <h1 class="title">Pindraft</h1>
        <p class="subtitle">Accept your invitation</p>

        @if (loading()) {
          <p>Verifying invitation…</p>
        } @else if (lookupError()) {
          <p class="error">{{ lookupError() }}</p>
          <pd-button variant="secondary" routerLink="/login">Go to sign in</pd-button>
        } @else if (info(); as inv) {
          <p class="lead">
            You've been invited as <strong>{{ formatRole(inv.role) }}</strong>.
            Set a password to accept and join your mill.
          </p>
          <form (submit)="$event.preventDefault(); accept()">
            <label class="readonly-field">
              <span>Email</span>
              <input [value]="inv.email" readonly />
            </label>
            <pd-input label="Your name" [(ngModel)]="name" name="name" autocomplete="name" />
            <pd-input label="Choose a password" type="password"
                      [(ngModel)]="password" name="password" autocomplete="new-password" />
            @if (acceptError()) {
              <p class="error">{{ acceptError() }}</p>
            }
            <pd-button variant="primary" type="submit"
                [disabled]="!canAccept() || accepting()">
              {{ accepting() ? 'Accepting…' : 'Accept and sign in' }}
            </pd-button>
          </form>
        }
      </pd-card>
    </div>
  `,
  styles: [`
    .accept-page { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; background: var(--pd-color-bg-app, #f9fafb); }
    .accept-card { width: 100%; max-width: 420px; }
    .title { margin: 0; font-size: 20px; font-weight: 600; color: var(--pd-color-text, #111); }
    .subtitle { margin: 4px 0 16px; color: var(--pd-color-muted, #6b7280); font-size: 14px; }
    .lead { font-size: 14px; color: var(--pd-color-text, #4b5563); margin: 12px 0 16px; }
    form { display: flex; flex-direction: column; gap: 12px; padding-top: 8px; }
    .readonly-field { display: flex; flex-direction: column; gap: 4px; }
    .readonly-field span { font-size: 12px; font-weight: 600; color: var(--pd-color-muted, #6b7280); }
    .readonly-field input { padding: 10px 12px; border: 1px solid var(--pd-color-border, #d1d5db); border-radius: 8px; background: #f9fafb; color: var(--pd-color-text, #111); font-size: 14px; }
    .error { color: var(--pd-color-danger-text, #b91c1c); font-size: 13px; margin: 4px 0 0; }
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
