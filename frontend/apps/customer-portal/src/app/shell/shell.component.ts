import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '@pindraft/auth';
import { SnackbarContainerComponent } from '@pindraft/ui';

@Component({
  selector: 'customer-shell',
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
        <a mat-button routerLink="/lots" routerLinkActive="active">My fiber</a>
        <a mat-button routerLink="/pools" routerLinkActive="active">My pools</a>
        <a mat-button routerLink="/marketplace">Marketplace</a>
        <a mat-button routerLink="/mills">Mills</a>
      </nav>
      <span class="spacer"></span>
      <span class="operator">{{ name() }}</span>
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
    .operator { font-size: 13px; opacity: 0.85; margin-right: 8px; }
    main { padding: 0; }
  `],
})
export class ShellComponent {
  private auth = inject(AuthService);
  readonly name = computed(() => this.auth.currentUser()?.name ?? '');
  logout(): void { this.auth.logout(); }
}
