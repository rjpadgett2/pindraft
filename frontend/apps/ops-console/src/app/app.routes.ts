import { Routes } from '@angular/router';
import { authGuard } from '@pindraft/auth';

export const appRoutes: Routes = [
  {
    // Public marketing landing — first thing prospective mills see. No auth gate.
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
    // Self-service mill registration — public, creates user + tenant + MILL_ADMIN.
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register.component').then((m) => m.RegisterComponent),
  },
  {
    // Public accept page — no auth guard. Recipient hasn't signed in yet.
    path: 'invite/:token',
    loadComponent: () =>
      import('./features/team/accept-invite.component').then((m) => m.AcceptInviteComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shell/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: 'setup',
        children: [
          { path: '', loadComponent: () => import('./features/onboarding/hub.component').then((m) => m.OnboardingHubComponent) },
          { path: 'mill-profile', loadComponent: () => import('./features/onboarding/mill-profile.component').then((m) => m.MillProfileComponent) },
          { path: 'workflow-stages', loadComponent: () => import('./features/onboarding/workflow-stages.component').then((m) => m.WorkflowStagesComponent) },
          { path: 'equipment', loadComponent: () => import('./features/onboarding/equipment.component').then((m) => m.EquipmentComponent) },
          { path: 'pricing', loadComponent: () => import('./features/onboarding/pricing/pricing-templates.component').then((m) => m.PricingTemplatesComponent) },
          { path: 'team', loadComponent: () => import('./features/team/team.component').then((m) => m.TeamComponent) },
        ],
      },
      {
        path: 'ops',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'reservations' },
          { path: 'reservations', loadComponent: () => import('./features/operations/reservations-list.component').then((m) => m.ReservationsListComponent) },
          { path: 'reservations/new', loadComponent: () => import('./features/operations/new-reservation.component').then((m) => m.NewReservationComponent) },
          { path: 'reservations/:id/intake', loadComponent: () => import('./features/operations/intake-processing.component').then((m) => m.IntakeProcessingComponent) },
          { path: 'walk-in-intake', loadComponent: () => import('./features/operations/walk-in-intake.component').then((m) => m.WalkInIntakeComponent) },
          { path: 'lots/:id', loadComponent: () => import('./features/operations/lot-detail.component').then((m) => m.LotDetailComponent) },
          { path: 'queues', loadComponent: () => import('./features/operations/queue-dashboard.component').then((m) => m.QueueDashboardComponent) },
          { path: 'scan', loadComponent: () => import('./features/operations/scan-station.component').then((m) => m.ScanStationComponent) },
        ],
      },
      {
        path: 'marketplace',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'listings' },
          { path: 'listings', loadComponent: () => import('./features/marketplace/listings.component').then((m) => m.ListingsComponent) },
          { path: 'listings/new', loadComponent: () => import('./features/marketplace/new-listing.component').then((m) => m.NewListingComponent) },
        ],
      },
      {
        path: 'pools',
        children: [
          { path: '', loadComponent: () => import('./features/pools/pools-list.component').then((m) => m.PoolsListComponent) },
          { path: 'new', loadComponent: () => import('./features/pools/new-pool.component').then((m) => m.NewPoolComponent) },
          { path: ':id', loadComponent: () => import('./features/pools/pool-detail.component').then((m) => m.PoolDetailComponent) },
        ],
      },
      {
        path: 'billing',
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'invoices' },
          { path: 'invoices', loadComponent: () => import('./features/billing/invoices-list.component').then((m) => m.InvoicesListComponent) },
          { path: 'invoices/:id', loadComponent: () => import('./features/billing/invoice-detail.component').then((m) => m.InvoiceDetailComponent) },
        ],
      },
      { path: '', pathMatch: 'full', redirectTo: 'setup' },
    ],
  },
  { path: '**', redirectTo: '' },
];
