import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { AuthService } from '@pindraft/auth';
import { Invitation, InvitationsService, InviteRole } from './services/invitations.service';

@Component({
  selector: 'ops-team',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, RouterLink, DatePipe,
    MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatTableModule, MatIconModule,
  ],
  template: `
    <div class="page">
      <a routerLink="/setup" class="back">← Back to setup</a>
      <h1 class="page-title">Team</h1>
      <p class="page-subtitle">Invite operators and admins. Email sending is manual for v1 — you'll get a copyable URL to forward.</p>

      <mat-card>
        <mat-card-content>
          <h2 class="section">Send an invitation</h2>
          <div class="invite-form">
            <mat-form-field appearance="outline" class="grow">
              <mat-label>Email</mat-label>
              <input matInput type="email" [(ngModel)]="inviteEmail" autocomplete="off" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Role</mat-label>
              <mat-select [(value)]="inviteRole">
                <mat-option value="MILL_OPERATOR">Mill operator</mat-option>
                <mat-option value="MILL_ADMIN">Mill admin</mat-option>
              </mat-select>
            </mat-form-field>
            <button mat-flat-button color="primary"
                    [disabled]="!canInvite() || sending()" (click)="send()">
              {{ sending() ? 'Inviting…' : 'Send invite' }}
            </button>
          </div>

          @if (lastInviteUrl(); as url) {
            <div class="just-created">
              <div class="hint">
                <strong>Invitation created.</strong> Copy this URL and send it to the invitee — it won't be shown again.
              </div>
              <div class="url-row">
                <code>{{ url }}</code>
                <button mat-icon-button (click)="copy(url)" title="Copy URL"><mat-icon>content_copy</mat-icon></button>
              </div>
            </div>
          }
        </mat-card-content>
      </mat-card>

      <h2 class="section">Existing invitations</h2>
      @if (loading()) {
        <p>Loading…</p>
      } @else if (invitations().length === 0) {
        <div class="empty">No invitations yet.</div>
      } @else {
        <table mat-table [dataSource]="invitations()">
          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef>Email</th>
            <td mat-cell *matCellDef="let i">{{ i.email }}</td>
          </ng-container>
          <ng-container matColumnDef="role">
            <th mat-header-cell *matHeaderCellDef>Role</th>
            <td mat-cell *matCellDef="let i">{{ formatRole(i.role) }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let i"><span class="status" [class]="i.status">{{ i.status }}</span></td>
          </ng-container>
          <ng-container matColumnDef="expires">
            <th mat-header-cell *matHeaderCellDef>Expires</th>
            <td mat-cell *matCellDef="let i">{{ i.expiresAt | date:'mediumDate' }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let i">
              @if (i.status === 'PENDING') {
                <button mat-stroked-button (click)="revoke(i.id)">Revoke</button>
              }
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px 32px; }
    .back { display: inline-block; margin-bottom: 12px; font-size: 13px; color: #2563eb; text-decoration: none; }
    .page-title { margin: 0; font-size: 24px; }
    .page-subtitle { color: #666; margin: 4px 0 24px; }
    .section { font-size: 14px; font-weight: 500; margin: 16px 0 12px; }
    .invite-form { display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap; margin-top: 8px; }
    .invite-form .grow { flex: 1; min-width: 240px; }
    .just-created { margin-top: 12px; padding: 12px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; }
    .just-created .hint { font-size: 13px; color: #065f46; margin-bottom: 8px; }
    .url-row { display: flex; align-items: center; gap: 6px; background: white; padding: 6px 12px; border-radius: 6px; }
    .url-row code { flex: 1; font-size: 12px; word-break: break-all; }
    .empty { padding: 32px; background: #f9fafb; border-radius: 8px; text-align: center; color: #666; }
    table { width: 100%; background: white; margin-top: 8px; }
    .status { font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 500; }
    .status.PENDING  { background: #fef3c7; color: #92400e; }
    .status.ACCEPTED { background: #d1fae5; color: #065f46; }
    .status.EXPIRED  { background: #f3f4f6; color: #4b5563; }
    .status.REVOKED  { background: #fee2e2; color: #991b1b; }
  `],
})
export class TeamComponent {
  private service = inject(InvitationsService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);

  readonly loading = signal(true);
  readonly sending = signal(false);
  readonly invitations = signal<Invitation[]>([]);
  readonly lastInviteUrl = signal<string | null>(null);
  readonly cols = ['email', 'role', 'status', 'expires', 'actions'];

  inviteEmail = '';
  inviteRole: InviteRole = 'MILL_OPERATOR';

  constructor() { this.reload(); }

  private reload(): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    this.loading.set(true);
    this.service.list(tid).subscribe({
      next: (list) => { this.invitations.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  canInvite(): boolean {
    return /.+@.+\..+/.test(this.inviteEmail) && !!this.inviteRole;
  }

  formatRole(r: string): string {
    return r.replace('_', ' ').toLowerCase();
  }

  send(): void {
    const tid = this.auth.activeTenantId();
    if (!tid || !this.canInvite()) return;
    this.sending.set(true);
    this.service.invite(tid, this.inviteEmail.trim(), this.inviteRole).subscribe({
      next: (created) => {
        this.lastInviteUrl.set(
          `${window.location.origin}/invite/${created.acceptTokenPlaintext}`);
        this.inviteEmail = '';
        this.sending.set(false);
        this.reload();
      },
      error: (e) => {
        this.snack.open('Invite failed: ' + (e?.error?.detail ?? 'unknown'), 'OK');
        this.sending.set(false);
      },
    });
  }

  revoke(id: string): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    this.service.revoke(tid, id).subscribe({
      next: () => { this.snack.open('Revoked', 'OK', { duration: 1500 }); this.reload(); },
    });
  }

  copy(url: string): void {
    navigator.clipboard.writeText(url).then(() =>
      this.snack.open('URL copied', 'OK', { duration: 1500 })
    );
  }
}
