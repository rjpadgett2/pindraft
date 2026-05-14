import { Routes } from '@angular/router';
import { authGuard } from '@pindraft/auth';

export const appRoutes: Routes = [
  // Public — no auth, no shell
  {
    path: 'trace/:slug',
    loadComponent: () =>
      import('./features/public/trace.component').then((m) => m.PublicTraceComponent),
  },
  {
    path: 'marketplace',
    loadComponent: () =>
      import('./features/public/marketplace.component').then((m) => m.PublicMarketplaceComponent),
  },
  {
    path: 'marketplace/:id',
    loadComponent: () =>
      import('./features/public/marketplace-listing-detail.component')
        .then((m) => m.PublicListingDetailComponent),
  },
  {
    path: 'mills',
    loadComponent: () =>
      import('./features/public/mill-directory.component').then((m) => m.PublicMillDirectoryComponent),
  },
  {
    path: 'mills/:id',
    loadComponent: () =>
      import('./features/public/mill-detail.component').then((m) => m.PublicMillDetailComponent),
  },

  // Auth gate
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    // Public registration — shepherds and designers sign up here.
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register.component').then((m) => m.RegisterComponent),
  },

  // OAuth consent — authGuard so unauthenticated users get redirected to login first
  {
    path: 'oauth/consent',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/oauth/consent.component').then((m) => m.OAuthConsentComponent),
  },

  // Authenticated
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shell/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: 'lots',
        loadComponent: () =>
          import('./features/lots/my-lots.component').then((m) => m.MyLotsComponent),
      },
      {
        path: 'lots/:id',
        loadComponent: () =>
          import('./features/lots/lot-detail.component').then((m) => m.CustomerLotDetailComponent),
      },
      {
        path: 'pools',
        loadComponent: () =>
          import('./features/pools/my-pools.component').then((m) => m.MyPoolsComponent),
      },
      { path: '', pathMatch: 'full', redirectTo: 'lots' },
    ],
  },

  { path: '**', redirectTo: 'marketplace' },
];
