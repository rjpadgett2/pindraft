import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '@pindraft/auth';
import { IconComponent, SnackbarContainerComponent } from '@pindraft/ui';
import { SyncService } from '../core/sync.service';

@Component({
  selector: 'shearer-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, IconComponent, SnackbarContainerComponent],
  template: `
    <header class="sh-top">
      <span class="sh-top__brand">Shearer</span>
      <span class="sh-top__spacer"></span>
      <span class="sh-top__status" [class.offline]="!online()" [title]="statusTitle()">
        <pd-icon [name]="online() ? 'cloud_done' : 'cloud_off'" size="18" />
        @if (pendingCount() > 0) {
          <span class="sh-top__badge">{{ pendingCount() }}</span>
        }
      </span>
      <button type="button" class="sh-top__icon-btn"
              (click)="logout()" aria-label="Sign out" title="Sign out">
        <pd-icon name="logout" size="20" />
      </button>
    </header>
    <main><router-outlet /></main>
    <pd-snackbar-container />
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: var(--pd-color-bg-app); }
    .sh-top {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 12px;
      height: 52px;
      background: #1a1a1a;
      color: white;
    }
    .sh-top__brand { font-weight: 600; font-size: 16px; letter-spacing: 0.02em; }
    .sh-top__spacer { flex: 1; }
    .sh-top__status { display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 12px; background: rgba(16, 185, 129, 0.2); }
    .sh-top__status.offline { background: rgba(220, 38, 38, 0.2); }
    .sh-top__badge { font-size: 11px; padding: 1px 6px; background: var(--pd-color-warning, #f59e0b); color: white; border-radius: 8px; font-weight: 600; }
    .sh-top__icon-btn {
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
    .sh-top__icon-btn:hover { background: rgba(255, 255, 255, 0.08); color: white; }
    main { padding: 0; }
  `],
})
export class ShellComponent {
  private auth = inject(AuthService);
  private sync = inject(SyncService);

  readonly online = this.sync.online;
  readonly pendingCount = this.sync.pendingCount;
  readonly syncing = this.sync.syncing;

  readonly statusTitle = computed(() => {
    if (!this.online()) return 'Offline — events save locally';
    if (this.pendingCount() > 0) return `${this.pendingCount()} pending sync`;
    return 'Online and synced';
  });

  logout(): void { this.auth.logout(); }
}
