import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClaimCodeIssued, Customer, UserLookupResult } from '@pindraft/api-client';
import { AuthService } from '@pindraft/auth';
import {
  ButtonComponent, CardComponent, EmptyStateComponent,
  InputComponent, PageHeaderComponent, SnackbarService, TableComponent,
} from '@pindraft/ui';
import { OperationsService } from './services/operations.service';

/**
 * Operator's customer roster. Solves the operator side of the customer↔user linking
 * gap: shows every customer record with its current link state, lets the operator
 * look up a user by email and attach the record, unlink a bad mapping, or generate
 * a one-time claim code that the customer can redeem in their portal.
 *
 * Linked / Unlinked is the central piece of data here — that's the bit the rest of
 * the platform cares about for cross-tenant /me/lots visibility.
 */
@Component({
  selector: 'ops-customers-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ButtonComponent, CardComponent, EmptyStateComponent,
    InputComponent, PageHeaderComponent, TableComponent,
  ],
  template: `
    <div class="page">
      <pd-page-header
        title="Customers"
        subtitle="Walk-ins and Pindraft-linked accounts. Linking a record means the customer sees their lots in their portal automatically." />

      @if (!loading()) {
        @if (customers().length === 0) {
          <pd-empty-state
            title="No customers yet"
            description="Customers appear here when you create a walk-in or accept a reservation." />
        } @else {
          <pd-table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Kind</th>
                <th>Email</th>
                <th>Linked</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (c of customers(); track c.id) {
                <tr [class.row-active]="selectedId() === c.id">
                  <td><strong>{{ c.displayName }}</strong></td>
                  <td><span class="kind">{{ formatKind(c.customerKind) }}</span></td>
                  <td>{{ c.email ?? '—' }}</td>
                  <td>
                    @if (c.userId) {
                      <span class="link link--yes">Linked</span>
                    } @else if (c.activeClaimCode) {
                      <span class="link link--pending">Code issued</span>
                    } @else {
                      <span class="link link--no">Unlinked</span>
                    }
                  </td>
                  <td class="row-actions">
                    <pd-button variant="ghost" size="sm" (click)="toggle(c.id)">
                      {{ selectedId() === c.id ? 'Close' : 'Manage' }}
                    </pd-button>
                  </td>
                </tr>
                @if (selectedId() === c.id) {
                  <tr class="detail-row">
                    <td colspan="5">
                      <pd-card variant="sunken" class="detail-card">
                        @if (c.userId) {
                          <p class="info">
                            This record is attached to user
                            <code>{{ c.userId.substring(0, 8) }}</code>.
                            Their portal already shows lots created against this record.
                          </p>
                          <div class="actions">
                            <pd-button variant="ghost" size="sm" (click)="unlink(c)">
                              Unlink user
                            </pd-button>
                          </div>
                        } @else {
                          <h3>Link to a user</h3>
                          <p class="hint">
                            Enter the email of a registered Pindraft user to attach this record. Mismatched email is fine — this is the manual override.
                          </p>
                          <div class="lookup-row">
                            <pd-input class="grow" label="User email" type="email"
                                      [(ngModel)]="lookupEmail" />
                            <pd-button variant="secondary" size="sm"
                                       [disabled]="!canLookup() || lookingUp()"
                                       (click)="doLookup(c.id)">
                              {{ lookingUp() ? 'Looking up…' : 'Find user' }}
                            </pd-button>
                          </div>
                          @if (lookupResult(); as u) {
                            <div class="lookup-hit">
                              <div>
                                <strong>{{ u.name }}</strong>
                                <span class="muted">{{ u.email }}</span>
                              </div>
                              <pd-button variant="primary" size="sm"
                                         [disabled]="linking()"
                                         (click)="linkTo(c.id, u.id)">
                                {{ linking() ? 'Linking…' : 'Link this user' }}
                              </pd-button>
                            </div>
                          }
                          @if (lookupMiss()) {
                            <p class="miss">No registered user with that email. Try a claim code instead — the customer can redeem it in their portal even if their email doesn't match.</p>
                          }

                          <hr />

                          <h3>Or issue a claim code</h3>
                          <p class="hint">
                            Generates an 8-character code valid for 7 days. Share it with the customer — they redeem it in their portal under "Connect mill".
                          </p>
                          @if (c.activeClaimCode) {
                            <div class="code-active">
                              <code class="code">{{ c.activeClaimCode }}</code>
                              <small>Active until {{ formatDate(c.claimCodeExpiresAt) }}</small>
                              <pd-button variant="ghost" size="sm" (click)="copyCode(c.activeClaimCode)">
                                Copy
                              </pd-button>
                            </div>
                          }
                          <pd-button variant="secondary" size="sm"
                                     [disabled]="generating()"
                                     (click)="generateCode(c.id)">
                            {{ generating() ? 'Generating…' : (c.activeClaimCode ? 'Replace code' : 'Generate code') }}
                          </pd-button>
                        }
                      </pd-card>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </pd-table>
        }
      } @else {
        <p class="muted">Loading…</p>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px 32px; }
    .muted { color: var(--pd-color-muted, #6b7280); font-size: 13px; }
    .kind { font-size: 11px; padding: 2px 8px; background: #f3f4f6; border-radius: 4px; color: var(--pd-color-muted, #6b7280); text-transform: capitalize; }
    .link { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 600; }
    .link--yes     { background: var(--pd-color-success-bg, #d1fae5); color: var(--pd-color-success-text, #065f46); }
    .link--pending { background: var(--pd-color-warning-bg, #fef3c7); color: var(--pd-color-warning-text, #92400e); }
    .link--no      { background: #f3f4f6; color: var(--pd-color-muted, #6b7280); }
    .row-active { background: var(--pd-color-bg-sunken, #f9fafb); }
    .row-actions { text-align: right; }
    .detail-row td { padding: 0 !important; }
    .detail-card { margin: 0 12px 16px; padding: 20px; }
    .detail-card h3 { margin: 0 0 8px; font-size: 13px; font-weight: 600; color: var(--pd-color-text, #111); text-transform: uppercase; letter-spacing: 0.05em; }
    .detail-card h3:not(:first-child) { margin-top: 16px; }
    .detail-card hr { border: 0; border-top: 1px solid var(--pd-color-border, #e5e7eb); margin: 20px 0; }
    .hint { font-size: 13px; color: var(--pd-color-muted, #6b7280); margin: 0 0 12px; line-height: 1.5; }
    .info { font-size: 13px; margin: 0 0 12px; }
    .info code { font-family: var(--pd-font-mono, ui-monospace, monospace); background: white; padding: 2px 6px; border-radius: 4px; }
    .lookup-row { display: flex; gap: 8px; align-items: flex-end; }
    .lookup-row .grow { flex: 1; }
    .lookup-hit { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 12px; padding: 12px; background: white; border: 1px solid var(--pd-color-success-border, #a7f3d0); border-radius: 6px; }
    .lookup-hit strong { display: block; }
    .lookup-hit .muted { font-size: 12px; }
    .miss { font-size: 12px; color: var(--pd-color-warning-text, #92400e); margin: 8px 0 0; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; }
    .code-active { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding: 12px; background: white; border: 1px dashed var(--pd-color-warning-border, #fbbf24); border-radius: 6px; }
    .code { font-family: var(--pd-font-mono, ui-monospace, monospace); font-size: 18px; font-weight: 600; letter-spacing: 0.1em; color: var(--pd-color-warning-text, #92400e); }
    .code-active small { flex: 1; color: var(--pd-color-muted, #6b7280); font-size: 12px; }
  `],
})
export class CustomersListComponent {
  private ops = inject(OperationsService);
  private auth = inject(AuthService);
  private snack = inject(SnackbarService);

  readonly loading = signal(true);
  readonly customers = signal<Customer[]>([]);
  readonly selectedId = signal<string | null>(null);

  readonly lookingUp = signal(false);
  readonly linking = signal(false);
  readonly generating = signal(false);

  readonly lookupResult = signal<UserLookupResult | null>(null);
  readonly lookupMiss = signal(false);

  lookupEmail = '';

  constructor() { this.refresh(); }

  private refresh(): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    this.loading.set(true);
    this.ops.listCustomers(tid).subscribe({
      next: (list) => { this.customers.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  toggle(id: string): void {
    const wasOpen = this.selectedId() === id;
    this.selectedId.set(wasOpen ? null : id);
    // Reset transient lookup state when switching rows.
    this.lookupEmail = '';
    this.lookupResult.set(null);
    this.lookupMiss.set(false);
  }

  formatKind(k: string): string {
    return k.toLowerCase();
  }

  formatDate(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleString();
  }

  canLookup(): boolean {
    return /.+@.+\..+/.test(this.lookupEmail);
  }

  doLookup(_customerId: string): void {
    const tid = this.auth.activeTenantId();
    if (!tid || !this.canLookup()) return;
    this.lookingUp.set(true);
    this.lookupResult.set(null);
    this.lookupMiss.set(false);
    this.ops.userLookup(tid, this.lookupEmail.trim()).subscribe({
      next: (result) => {
        if (result) this.lookupResult.set(result);
        else this.lookupMiss.set(true);
        this.lookingUp.set(false);
      },
      error: () => {
        this.lookupMiss.set(true);
        this.lookingUp.set(false);
      },
    });
  }

  linkTo(customerId: string, userId: string): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    this.linking.set(true);
    this.ops.linkCustomerToUser(tid, customerId, userId).subscribe({
      next: (updated) => {
        this.replaceCustomer(updated);
        this.snack.show('Linked to user', { durationMs: 1500 });
        this.linking.set(false);
        this.lookupResult.set(null);
        this.lookupEmail = '';
      },
      error: (e) => {
        this.snack.show('Link failed: ' + (e?.error?.detail ?? 'unknown'));
        this.linking.set(false);
      },
    });
  }

  unlink(c: Customer): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    if (!confirm(`Unlink ${c.displayName} from their user account?`)) return;
    this.ops.unlinkCustomer(tid, c.id).subscribe({
      next: (updated) => {
        this.replaceCustomer(updated);
        this.snack.show('Unlinked', { durationMs: 1500 });
      },
      error: (e) => this.snack.show('Unlink failed: ' + (e?.error?.detail ?? 'unknown')),
    });
  }

  generateCode(customerId: string): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    this.generating.set(true);
    this.ops.issueClaimCode(tid, customerId).subscribe({
      next: (issued: ClaimCodeIssued) => {
        // Refresh full record so the new code shows up alongside its expiry.
        this.replaceCustomer({
          ...this.customers().find((c) => c.id === customerId)!,
          activeClaimCode: issued.code,
          claimCodeExpiresAt: issued.expiresAt,
        });
        this.snack.show('Code generated', { durationMs: 1500 });
        this.generating.set(false);
      },
      error: (e) => {
        this.snack.show('Code generation failed: ' + (e?.error?.detail ?? 'unknown'));
        this.generating.set(false);
      },
    });
  }

  copyCode(code: string): void {
    navigator.clipboard.writeText(code).then(() =>
      this.snack.show('Code copied', { durationMs: 1500 })
    );
  }

  private replaceCustomer(updated: Customer): void {
    this.customers.update((list) => list.map((c) => (c.id === updated.id ? updated : c)));
  }
}
