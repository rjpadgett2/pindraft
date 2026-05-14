import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Route guard that requires an authenticated user. Unauthenticated visitors are
 * sent to {@code /welcome} — the public marketing landing — rather than directly
 * to the login form. That lets first-time visitors see what Pindraft is before
 * being asked for credentials. The landing has both "Sign in" and "Sign up"
 * CTAs, so users who already know what they want still get there in one click.
 *
 * Use as: `{ path: 'setup', component: HubComponent, canActivate: [authGuard] }`
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  router.navigate(['/welcome']);
  return false;
};
