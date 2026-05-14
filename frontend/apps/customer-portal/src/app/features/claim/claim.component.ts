import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Customer } from '@pindraft/api-client';
import {
  ButtonComponent, CardComponent, InputComponent,
  PageHeaderComponent, SnackbarService,
} from '@pindraft/ui';
import { ClaimService } from './claim.service';

/**
 * "Got a code from your mill?" page. Lives behind the customer-portal auth so we
 * know which user account to attach the record to. Lightweight: one input, one
 * button, contextual success/error messaging.
 */
@Component({
  selector: 'customer-claim',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, RouterLink,
    ButtonComponent, CardComponent, InputComponent, PageHeaderComponent,
  ],
  template: `
    <div class="page">
      <pd-page-header
        title="Connect to a mill"
        subtitle="If a mill has fiber records for you under a different email — or no email at all — they can hand you a one-time code to attach those records to your account here." />

      <div class="layout">
        <pd-card padding="lg" class="form-card">
          <h2>Enter your claim code</h2>
          <p class="hint">
            Ask the mill operator to generate a code from your customer record. Codes
            are 8 characters (letters + digits, case doesn't matter) and stay valid
            for 7 days.
          </p>

          <pd-input label="Claim code"
                    [(ngModel)]="code"
                    [error]="error()"
                    autocomplete="off" />

          <div class="actions">
            <pd-button variant="ghost" routerLink="/lots">Cancel</pd-button>
            <pd-button variant="primary"
                       [disabled]="!canSubmit() || submitting()"
                       (click)="submit()">
              {{ submitting() ? 'Connecting…' : 'Connect' }}
            </pd-button>
          </div>
        </pd-card>

        @if (linked(); as c) {
          <pd-card variant="accent" padding="lg" class="success-card">
            <strong>Connected.</strong>
            <p>
              Your account is now attached to <em>{{ c.displayName }}</em> at this mill.
              Their lots will appear in your fiber list on next refresh.
            </p>
            <pd-button variant="primary" routerLink="/lots">View my fiber →</pd-button>
          </pd-card>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 32px 24px; max-width: 720px; margin: 0 auto; }
    .layout { display: flex; flex-direction: column; gap: 16px; }
    .form-card h2 { margin: 0 0 8px; font-size: 16px; font-weight: 600; color: var(--pd-color-text, #111); }
    .hint { font-size: 13px; color: var(--pd-color-muted, #6b7280); margin: 0 0 16px; line-height: 1.5; }
    pd-input { display: block; margin-bottom: 16px; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; }
    .success-card strong { display: block; margin-bottom: 8px; }
    .success-card p { margin: 0 0 16px; font-size: 14px; line-height: 1.5; }
    .success-card em { font-style: normal; font-weight: 600; }
  `],
})
export class ClaimComponent {
  private claim = inject(ClaimService);
  private snack = inject(SnackbarService);

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly linked = signal<Customer | null>(null);

  code = '';

  canSubmit(): boolean {
    // Codes are 8 chars but we let the user paste with spaces/dashes; backend
    // will trim and uppercase. Just check there's *something* to submit.
    return this.code.trim().length >= 4;
  }

  submit(): void {
    if (!this.canSubmit()) return;
    this.submitting.set(true);
    this.error.set(null);
    this.claim.redeem(this.code.trim()).subscribe({
      next: (customer) => {
        this.linked.set(customer);
        this.snack.show('Connected to ' + customer.displayName, { durationMs: 2500 });
        this.code = '';
        this.submitting.set(false);
      },
      error: (e) => {
        const detail = e?.error?.detail ?? 'Could not redeem code';
        this.error.set(detail);
        this.submitting.set(false);
      },
    });
  }
}
