import { Routes } from '@angular/router';
import { authGuard } from '@pindraft/auth';

export const appRoutes: Routes = [
  {
    // Public marketing landing for shearer signup.
    path: 'welcome',
    loadComponent: () =>
      import('./features/welcome/welcome.component').then((m) => m.WelcomeComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shell/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: 'events',
        loadComponent: () =>
          import('./features/events/events-list.component').then((m) => m.EventsListComponent),
      },
      {
        path: 'events/new',
        loadComponent: () =>
          import('./features/events/log-event.component').then((m) => m.LogEventComponent),
      },
      { path: '', pathMatch: 'full', redirectTo: 'events' },
    ],
  },
  { path: '**', redirectTo: '' },
];
