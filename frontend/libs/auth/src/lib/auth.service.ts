import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { TokenStorage } from './token.storage';

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

interface MeResponse {
  id: string;
  email: string;
  name: string;
  isPlatformAdmin: boolean;
  staffMemberships: { tenantId: string; role: string }[];
  customerRelationships: { tenantId: string; customerKind: string }[];
}

/**
 * Centralized auth state.
 *
 * Signals:
 * - `currentUser` — the authenticated user with their memberships, or null.
 * - `activeTenantId` — the tenant the operator is currently acting in.
 *   For users with one staff membership, this is auto-selected.
 *   For users with multiple, they explicitly pick one.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private storage = inject(TokenStorage);
  private router = inject(Router);

  private readonly _currentUser = signal<MeResponse | null>(null);
  private readonly _activeTenantId = signal<string | null>(null);

  readonly currentUser = this._currentUser.asReadonly();
  readonly activeTenantId = this._activeTenantId.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);
  readonly activeRole = computed(() => {
    const user = this._currentUser();
    const tid = this._activeTenantId();
    if (!user || !tid) return null;
    return user.staffMemberships.find((m) => m.tenantId === tid)?.role ?? null;
  });

  private readonly apiBase = '/api/v1';

  login(email: string, password: string): Observable<TokenResponse> {
    return this.http
      .post<TokenResponse>(`${this.apiBase}/auth/login`, { email, password })
      .pipe(tap((tokens) => this.handleTokenResponse(tokens)));
  }

  /**
   * Public registration — creates a user with no tenant relationships and
   * auto-issues tokens. Used by the customer-portal sign-up page. New mill setup
   * is a separate flow.
   */
  register(email: string, password: string, name: string): Observable<TokenResponse> {
    return this.http
      .post<TokenResponse>(`${this.apiBase}/auth/register`, { email, password, name })
      .pipe(tap((tokens) => this.handleTokenResponse(tokens)));
  }

  refreshAccessToken(): Observable<TokenResponse> {
    const refresh = this.storage.getRefreshToken();
    return this.http
      .post<TokenResponse>(`${this.apiBase}/auth/refresh`, { refreshToken: refresh })
      .pipe(tap((tokens) => this.handleTokenResponse(tokens)));
  }

  loadCurrentUser(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${this.apiBase}/me`).pipe(
      tap((user) => {
        this._currentUser.set(user);
        if (user.staffMemberships.length === 1) {
          this._activeTenantId.set(user.staffMemberships[0].tenantId);
        }
      })
    );
  }

  setActiveTenant(tenantId: string): void {
    this._activeTenantId.set(tenantId);
  }

  logout(): void {
    const refresh = this.storage.getRefreshToken();
    if (refresh) {
      this.http
        .post(`${this.apiBase}/auth/logout`, { refreshToken: refresh })
        .subscribe({ complete: () => this.completeLogout() });
    } else {
      this.completeLogout();
    }
  }

  private handleTokenResponse(tokens: TokenResponse): void {
    this.storage.setTokens(tokens.accessToken, tokens.refreshToken);
  }

  private completeLogout(): void {
    this.storage.clear();
    this._currentUser.set(null);
    this._activeTenantId.set(null);
    this.router.navigate(['/login']);
  }
}
