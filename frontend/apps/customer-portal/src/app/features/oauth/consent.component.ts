import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@pindraft/auth';
import { ButtonComponent, CardComponent, IconComponent } from '@pindraft/ui';

/**
 * OAuth consent UI. The /authorize backend endpoint redirects here with the grant
 * parameters in the query string. We:
 *   1. If the user isn't logged in, redirect to /login with a return-here URL.
 *   2. Show the consent screen: which client, which mill, what scope.
 *   3. On approve, POST to /authorize/approve with the carried params. The backend
 *      issues an authorization code and returns the final redirect URL; we navigate there.
 *   4. On deny, redirect back to the client's redirect_uri with error=access_denied.
 */
@Component({
  selector: 'customer-oauth-consent',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, CardComponent, IconComponent],
  template: `
    <div class="consent-page">
      <pd-card class="consent-card" padding="lg">
        @if (!authenticated()) {
          <p>Redirecting to sign in…</p>
        } @else {
          <header>
            <pd-icon name="key"  class="key-icon" />
            <h1>Authorize {{ clientName() }}</h1>
          </header>
          <p>
            <strong>{{ clientName() }}</strong> wants to access your data at this mill on your behalf.
          </p>
          <p class="muted">
            You'll be able to revoke this access at any time from your account settings.
          </p>

          <div class="scope-box">
            <small>Scope</small>
            <code>{{ scope() }}</code>
          </div>

          <div class="actions">
            <pd-button variant="ghost" (click)="deny()">Deny</pd-button>
            <pd-button variant="primary" [disabled]="working()" (click)="approve()">
              {{ working() ? 'Authorizing…' : 'Authorize' }}
            </pd-button>
          </div>
        }
      </pd-card>
    </div>
  `,
  styles: [`
    .consent-page { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; background: var(--pd-color-bg-app, #f9fafb); }
    .consent-card { max-width: 480px; width: 100%; }
    header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    h1 { font-size: 20px; font-weight: 600; margin: 0; }
    .key-icon { color: var(--pd-brand-accent, #2563eb); font-size: 28px; height: 28px; width: 28px; }
    .muted { color: var(--pd-color-muted, #666); font-size: 13px; margin: 8px 0; }
    .scope-box { background: #f3f4f6; padding: 12px; border-radius: 6px; margin: 16px 0; }
    .scope-box small { display: block; color: var(--pd-color-muted, #666); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .scope-box code { font-size: 13px; color: var(--pd-color-text, #1a1a1a); font-family: var(--pd-font-mono, ui-monospace, monospace); }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
  `],
})
export class OAuthConsentComponent {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly working = signal(false);
  readonly authenticated = computed(() => !!this.auth.currentUser());

  readonly clientId = this.route.snapshot.queryParamMap.get('client_id') ?? '';
  readonly clientNameStr = this.route.snapshot.queryParamMap.get('client_name') ?? 'an application';
  readonly redirectUri = this.route.snapshot.queryParamMap.get('redirect_uri') ?? '';
  readonly scopeStr = this.route.snapshot.queryParamMap.get('scope') ?? '';
  readonly state = this.route.snapshot.queryParamMap.get('state') ?? '';
  readonly codeChallenge = this.route.snapshot.queryParamMap.get('code_challenge') ?? '';
  readonly codeChallengeMethod = this.route.snapshot.queryParamMap.get('code_challenge_method') ?? 'S256';

  readonly clientName = () => this.clientNameStr;
  readonly scope = () => this.scopeStr;

  constructor() {
    if (!this.authenticated()) {
      // Preserve the consent URL so login can return here
      const returnUrl = this.router.url;
      this.router.navigate(['/login'], { queryParams: { returnUrl } });
    }
  }

  approve(): void {
    this.working.set(true);
    this.http.post<{ location: string }>(
      '/api/v1/oauth/authorize/approve',
      {
        clientId: this.clientId,
        redirectUri: this.redirectUri,
        scope: this.scopeStr,
        state: this.state,
        codeChallenge: this.codeChallenge,
        codeChallengeMethod: this.codeChallengeMethod,
      }
    ).subscribe({
      next: (response) => {
        // Backend has issued the code and built the redirect URL — go there
        window.location.href = response.location;
      },
      error: () => this.working.set(false),
    });
  }

  deny(): void {
    const separator = this.redirectUri.includes('?') ? '&' : '?';
    window.location.href =
      this.redirectUri + separator +
      'error=access_denied' +
      '&state=' + encodeURIComponent(this.state);
  }
}
