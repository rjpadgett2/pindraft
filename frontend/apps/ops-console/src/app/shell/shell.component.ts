import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '@pindraft/auth';
import { IconComponent, SnackbarContainerComponent } from '@pindraft/ui';

/**
 * Ops console shell — top nav + outlet. Vanilla flex layout; no Material toolbar.
 * The dark slate background carries the operator-side brand mood (industrial,
 * dense, distinct from the customer-portal's cream chrome).
 */
@Component({
  selector: 'ops-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    IconComponent, SnackbarContainerComponent,
  ],
  template: `
    <header class="ops-top">
      <span class="ops-top__brand">Pindraft</span>
      <nav class="ops-top__nav">
        <a routerLink="/ops/reservations" routerLinkActive="active">Reservations</a>
        <a routerLink="/ops/customers" routerLinkActive="active">Customers</a>
        <a routerLink="/ops/queues" routerLinkActive="active">Queues</a>
        <a routerLink="/ops/scan" routerLinkActive="active">Scan</a>
        <a routerLink="/marketplace/listings" routerLinkActive="active">Listings</a>
        <a routerLink="/pools" routerLinkActive="active">Pools</a>
        <a routerLink="/billing/invoices" routerLinkActive="active">Invoices</a>
        <a routerLink="/setup" routerLinkActive="active">Setup</a>
      </nav>
      <span class="ops-top__spacer"></span>
      <span class="ops-top__tenant">{{ tenantLabel() }}</span>
      <span class="ops-top__operator">{{ operatorLabel() }}</span>
      <button type="button" class="ops-top__icon-btn"
              (click)="logout()" aria-label="Sign out" title="Sign out">
        <pd-icon name="logout" size="20" />
      </button>
    </header>
    <main><router-outlet /></main>
    <pd-snackbar-container />
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: var(--pd-color-bg-app); }
    .ops-top {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 0 16px;
      height: 56px;
      background: #1a1a1a;
      color: white;
    }
    .ops-top__brand { font-weight: 600; font-size: 16px; letter-spacing: 0.02em; }
    .ops-top__nav { display: flex; gap: 2px; }
    .ops-top__nav a {
      color: rgba(255, 255, 255, 0.72);
      text-decoration: none;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      line-height: 1;
      transition: background 120ms ease, color 120ms ease;
    }
    .ops-top__nav a:hover { color: white; background: rgba(255, 255, 255, 0.06); }
    .ops-top__nav a.active { color: white; background: rgba(255, 255, 255, 0.12); }
    .ops-top__spacer { flex: 1; }
    .ops-top__tenant { font-size: 13px; opacity: 0.9; }
    .ops-top__operator { font-size: 12px; opacity: 0.7; margin-right: 8px; }
    .ops-top__icon-btn {
      background: transparent;
      border: 0;
      color: rgba(255, 255, 255, 0.85);
      cursor: pointer;
      padding: 8px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background 120ms ease;
    }
    .ops-top__icon-btn:hover { background: rgba(255, 255, 255, 0.08); color: white; }
    main { padding: 0; }
  `],
})
export class ShellComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly tenantLabel = computed(() => {
    const user = this.auth.currentUser();
    const tid = this.auth.activeTenantId();
    if (!user || !tid) return '';
    const membership = user.staffMemberships.find((m) => m.tenantId === tid);
    return membership ? membership.role.replace('_', ' ').toLowerCase() : '';
  });

  readonly operatorLabel = computed(() => this.auth.currentUser()?.name ?? '');
  logout(): void { this.auth.logout(); }
}
