import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '@pindraft/auth';
import { IconComponent, SnackbarContainerComponent } from '@pindraft/ui';

@Component({
  selector: 'customer-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive,
    IconComponent, SnackbarContainerComponent,
  ],
  template: `
    <header class="cp-top">
      <span class="cp-top__brand">Pindraft</span>
      <nav class="cp-top__nav">
        <a routerLink="/lots" routerLinkActive="active">My fiber</a>
        <a routerLink="/pools" routerLinkActive="active">My pools</a>
        <a routerLink="/marketplace">Marketplace</a>
        <a routerLink="/mills">Mills</a>
        <a routerLink="/claim" routerLinkActive="active">Connect mill</a>
      </nav>
      <span class="cp-top__spacer"></span>
      <span class="cp-top__name">{{ name() }}</span>
      <button type="button" class="cp-top__icon-btn"
              (click)="logout()" aria-label="Sign out" title="Sign out">
        <pd-icon name="logout" size="20" />
      </button>
    </header>
    <main><router-outlet /></main>
    <pd-snackbar-container />
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: var(--pd-color-bg-app); }
    .cp-top {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 0 16px;
      height: 56px;
      background: #1a1a1a;
      color: white;
    }
    .cp-top__brand { font-weight: 600; font-size: 16px; letter-spacing: 0.02em; }
    .cp-top__nav { display: flex; gap: 2px; }
    .cp-top__nav a {
      color: rgba(255, 255, 255, 0.72);
      text-decoration: none;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      line-height: 1;
      transition: background 120ms ease, color 120ms ease;
    }
    .cp-top__nav a:hover { color: white; background: rgba(255, 255, 255, 0.06); }
    .cp-top__nav a.active { color: white; background: rgba(255, 255, 255, 0.12); }
    .cp-top__spacer { flex: 1; }
    .cp-top__name { font-size: 13px; opacity: 0.85; margin-right: 8px; }
    .cp-top__icon-btn {
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
    .cp-top__icon-btn:hover { background: rgba(255, 255, 255, 0.08); color: white; }
    main { padding: 0; }
  `],
})
export class ShellComponent {
  private auth = inject(AuthService);
  readonly name = computed(() => this.auth.currentUser()?.name ?? '');
  logout(): void { this.auth.logout(); }
}
