import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '@pindraft/auth';
import { SnackbarContainerComponent } from '@pindraft/ui';

@Component({
  selector: 'ops-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    MatToolbarModule, MatButtonModule, MatIconModule,
    SnackbarContainerComponent,
  ],
  template: `
    <mat-toolbar class="top">
      <span class="brand">Pindraft</span>
      <nav>
        <a mat-button routerLink="/ops/reservations" routerLinkActive="active">Reservations</a>
        <a mat-button routerLink="/ops/queues" routerLinkActive="active">Queues</a>
        <a mat-button routerLink="/ops/scan" routerLinkActive="active">Scan</a>
        <a mat-button routerLink="/marketplace/listings" routerLinkActive="active">Listings</a>
        <a mat-button routerLink="/pools" routerLinkActive="active">Pools</a>
        <a mat-button routerLink="/billing/invoices" routerLinkActive="active">Invoices</a>
        <a mat-button routerLink="/setup" routerLinkActive="active">Setup</a>
      </nav>
      <span class="spacer"></span>
      <span class="tenant">{{ tenantLabel() }}</span>
      <span class="operator">{{ operatorLabel() }}</span>
      <button mat-icon-button (click)="logout()" aria-label="Sign out" title="Sign out">
        <mat-icon>logout</mat-icon>
      </button>
    </mat-toolbar>
    <main><router-outlet /></main>
    <pd-snackbar-container />
  `,
  styles: [`
    .top { display: flex; align-items: center; gap: 16px; padding: 0 16px; background: #1a1a1a; color: white; }
    .brand { font-weight: 500; font-size: 16px; }
    nav { display: flex; gap: 4px; }
    nav a { color: rgba(255, 255, 255, 0.8); }
    nav a.active { color: white; background: rgba(255, 255, 255, 0.1); }
    .spacer { flex: 1; }
    .tenant { font-size: 13px; opacity: 0.9; }
    .operator { font-size: 12px; opacity: 0.7; margin-right: 8px; }
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
