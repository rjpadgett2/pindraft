import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

/** Rewrites `/api/...` paths to the configured backend base URL. */
export const apiBaseInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith('/api/')) {
    return next(req.clone({ url: environment.apiBase + req.url }));
  }
  return next(req);
};
