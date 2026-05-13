import { Injectable } from '@angular/core';

const ACCESS_KEY = 'pindraft.access_token';
const REFRESH_KEY = 'pindraft.refresh_token';

/**
 * Token storage abstraction. Currently localStorage; swap for httpOnly cookie
 * when we move auth handling server-side for the customer portal.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorage {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  setTokens(access: string, refresh: string): void {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  }

  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }
}
