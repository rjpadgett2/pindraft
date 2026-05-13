import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenStorage } from './token.storage';

/**
 * Attaches the access token to outgoing requests as `Authorization: Bearer ...`.
 * Token refresh on 401 lives in a separate interceptor (`refreshTokenInterceptor`).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(TokenStorage);
  const token = storage.getAccessToken();

  if (token && !req.url.includes('/auth/')) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }
  return next(req);
};
