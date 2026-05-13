import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

/**
 * Rewrites relative `/api/v1/...` URLs to the configured backend base URL.
 * Lets components and services use clean relative paths.
 */
export const apiBaseInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith('/api/')) {
    return next(req.clone({ url: environment.apiBase + req.url }));
  }
  return next(req);
};
