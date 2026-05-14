import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterOutlet } from '@angular/router';
import { AuthService } from '@pindraft/auth';
import { SnackbarContainerComponent } from '@pindraft/ui';
import { SyncService } from '../core/sync.service';

@Component({
  selector: 'shearer-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, MatToolbarModule, MatButtonModule, MatIconModule, SnackbarContainerComponent],
  template: `
    <mat-toolbar class="top">
      <span class="brand">Shearer</span>
      <span class="spacer"></span>
      <span class="status" [class.offline]="!online()" [title]="statusTitle()">
        <mat-icon>{{ online() ? 'cloud_done' : 'cloud_off' }}</mat-icon>
        @if (pendingCount() > 0) {
          <span class="badge">{{ pendingCount() }}</span>
        }
      </span>
      <button mat-icon-button (click)="logout()" aria-label="Sign out" title="Sign out">
        <mat-icon>logout</mat-icon>
      </button>
    </mat-toolbar>
    <main><router-outlet /></main>
    <pd-snackbar-container />
  `,
  styles: [`
    .top { display: flex; align-items: center; gap: 8px; padding: 0 12px; background: #1a1a1a; color: white; }
    .brand { font-weight: 500; font-size: 16px; }
    .spacer { flex: 1; }
    .status { display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 12px; background: rgba(16, 185, 129, 0.2); }
    .status mat-icon { font-size: 18px; height: 18px; width: 18px; }
    .status.offline { background: rgba(220, 38, 38, 0.2); }
    .status .badge { font-size: 11px; padding: 1px 6px; background: #f59e0b; color: white; border-radius: 8px; font-weight: 500; }
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
