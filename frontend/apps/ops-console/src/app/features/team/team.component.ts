import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '@pindraft/auth';
import {
  ButtonComponent, CardComponent, EmptyStateComponent,
  InputComponent, PageHeaderComponent, SelectComponent, SelectOption,
  SnackbarService, TableComponent,
} from '@pindraft/ui';
import { Invitation, InvitationsService, InviteRole } from './services/invitations.service';

@Component({
  selector: 'ops-team',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, RouterLink, DatePipe,
    ButtonComponent, CardComponent, EmptyStateComponent,
    InputComponent, PageHeaderComponent, SelectComponent, TableComponent,
  ],
  template: `
    <div class="page">
      <a routerLink="/setup" class="back">← Back to setup</a>
      <pd-page-header
        title="Team"
        subtitle="Invite operators and admins. Email sending is manual for v1 — you'll get a copyable URL to forward." />

      <pd-card>
        <h2 class="section">Send an invitation</h2>
        <div class="invite-form">
          <pd-input class="grow" label="Email" type="email" [(ngModel)]="inviteEmail" autocomplete="off" />
          <pd-select label="Role" [(ngModel)]="inviteRole" [options]="roleOptions" />
          <pd-button variant="primary"
                  [disabled]="!canInvite() || sending()" (click)="send()">
            {{ sending() ? 'Inviting…' : 'Send invite' }}
          </pd-button>
        </div>

        @if (lastInviteUrl(); as url) {
          <div class="just-created">
            <div class="hint">
              <strong>Invitation created.</strong> Copy this URL and send it to the invitee — it won't be shown again.
            </div>
            <div class="url-row">
              <code>{{ url }}</code>
              <pd-button variant="ghost" size="sm" (click)="copy(url)" title="Copy URL">Copy</pd-button>
            </div>
          </div>
        }
      </pd-card>

      <h2 class="section">Existing invitations</h2>
      @if (loading()) {
        <p class="muted">Loading…</p>
      } @else if (invitations().length === 0) {
        <pd-empty-state title="No invitations yet" description="Invite admins or operators using the form above." />
      } @else {
        <pd-table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Expires</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (i of invitations(); track i.id) {
              <tr>
                <td>{{ i.email }}</td>
                <td>{{ formatRole(i.role) }}</td>
                <td><span class="status" [class]="i.status">{{ i.status }}</span></td>
                <td>{{ i.expiresAt | date:'mediumDate' }}</td>
                <td>
                  @if (i.status === 'PENDING') {
                    <pd-button variant="ghost" size="sm" (click)="revoke(i.id)">Revoke</pd-button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </pd-table>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px 32px; }
    .back { display: inline-block; margin-bottom: 12px; font-size: 13px; color: var(--pd-color-link, #2563eb); text-decoration: none; }
    .section { font-size: 14px; font-weight: 600; margin: 24px 0 12px; color: var(--pd-color-text, #111); }
    .invite-form { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; margin-top: 8px; }
    .invite-form .grow { flex: 1; min-width: 240px; }
    .just-created { margin-top: 16px; padding: 12px; background: var(--pd-color-success-bg, #ecfdf5); border: 1px solid var(--pd-color-success-border, #a7f3d0); border-radius: 8px; }
    .just-created .hint { font-size: 13px; color: var(--pd-color-success-text, #065f46); margin-bottom: 8px; }
    .url-row { display: flex; align-items: center; gap: 8px; background: white; padding: 8px 12px; border-radius: 6px; }
    .url-row code { flex: 1; font-size: 12px; word-break: break-all; }
    .muted { color: var(--pd-color-muted, #6b7280); font-size: 13px; }
    .status { font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 600; }
    .status.PENDING  { background: var(--pd-color-warning-bg, #fef3c7); color: var(--pd-color-warning-text, #92400e); }
    .status.ACCEPTED { background: var(--pd-color-success-bg, #d1fae5); color: var(--pd-color-success-text, #065f46); }
    .status.EXPIRED  { background: #f3f4f6; color: #4b5563; }
    .status.REVOKED  { background: var(--pd-color-danger-bg, #fee2e2); color: var(--pd-color-danger-text, #991b1b); }
  `],
})
export class TeamComponent {
  private service = inject(InvitationsService);
  private auth = inject(AuthService);
  private snack = inject(SnackbarService);

  readonly loading = signal(true);
  readonly sending = signal(false);
  readonly invitations = signal<Invitation[]>([]);
  readonly lastInviteUrl = signal<string | null>(null);

  readonly roleOptions: SelectOption[] = [
    { value: 'MILL_OPERATOR', label: 'Mill operator' },
    { value: 'MILL_ADMIN', label: 'Mill admin' },
  ];

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
        this.snack.show('Invite failed: ' + (e?.error?.detail ?? 'unknown'));
        this.sending.set(false);
      },
    });
  }

  revoke(id: string): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    this.service.revoke(tid, id).subscribe({
      next: () => { this.snack.show('Revoked', { durationMs: 1500 }); this.reload(); },
    });
  }

  copy(url: string): void {
    navigator.clipboard.writeText(url).then(() =>
      this.snack.show('URL copied', { durationMs: 1500 })
    );
  }
}
