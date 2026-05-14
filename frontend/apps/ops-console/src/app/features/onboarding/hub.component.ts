import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SetupCategory, SetupStatusResponse } from '@pindraft/api-client';
import { AuthService } from '@pindraft/auth';
import {
  ButtonComponent, CardComponent, PageHeaderComponent,
  SnackbarService, StatusBadgeComponent,
} from '@pindraft/ui';
import { OnboardingService } from './services/onboarding.service';

/**
 * Mill onboarding hub. The setup checklist that gates `tenants.status` SETUP → LIVE.
 *
 * Each card shows a required setup category with its current completion status from the
 * backend's setup-status view. The Go-Live button is the explicit gate at the bottom.
 */
@Component({
  selector: 'ops-onboarding-hub',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ButtonComponent, CardComponent, PageHeaderComponent, StatusBadgeComponent,
  ],
  template: `
    <div class="page">
      <pd-page-header
        title="Get your mill ready"
        subtitle="Complete the four required steps to start accepting reservations." />

      @if (status(); as s) {
        <div class="progress">
          <div class="bar"><div class="fill" [style.width.%]="progressPercent()"></div></div>
          <span>{{ completedCount() }} of {{ s.required.length }} required complete</span>
        </div>

        <h2 class="section-title">Required</h2>
        <div class="grid">
          @for (cat of s.required; track cat.key) {
            <pd-card class="cat-card">
              <header>
                <strong>{{ cat.label }}</strong>
                <pd-status-badge [status]="cat.status" [label]="statusLabel(cat.status)" />
              </header>
              <p class="summary">{{ cat.summary }}</p>
              @if (cat.whatsMissing) {
                <p class="missing">{{ cat.whatsMissing }}</p>
              }
              @if (linkFor(cat.key); as link) {
                <pd-button variant="secondary" size="sm" [routerLink]="link">
                  {{ cat.status === 'DONE' ? 'Review' : 'Continue' }}
                </pd-button>
              }
            </pd-card>
          }
        </div>

        <h2 class="section-title">Optional — can do later</h2>
        <div class="grid optional">
          @for (cat of s.optional; track cat.key) {
            <pd-card class="cat-card compact">
              <strong>{{ cat.label }}</strong>
              <p class="summary">{{ cat.summary }}</p>
            </pd-card>
          }
        </div>

        <h3 class="section-title">Team</h3>
        <pd-card class="cat-card compact">
          <strong>Operator invitations</strong>
          <p class="summary">Invite admins and operators to this mill. Optional — solo admins can skip.</p>
          <pd-button variant="secondary" size="sm" routerLink="/setup/team">Manage team</pd-button>
        </pd-card>

        <div class="go-live">
          <div>
            <strong>Go live</strong>
            <p>
              @if (s.tenantStatus === 'LIVE') {
                Your mill is live and accepting reservations.
              } @else if (s.readyToGoLive) {
                All required steps complete.
              } @else {
                Complete remaining required steps to enable reservations.
              }
            </p>
          </div>
          <pd-button variant="primary"
              [disabled]="!s.readyToGoLive || s.tenantStatus === 'LIVE'"
              (click)="goLive()">
            {{ s.tenantStatus === 'LIVE' ? 'Live' : 'Go live' }}
          </pd-button>
        </div>
      } @else if (loading()) {
        <p class="muted">Loading…</p>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px 32px; }
    .progress { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
    .progress .bar { flex: 1; height: 6px; background: var(--pd-color-border, #e5e7eb); border-radius: 3px; overflow: hidden; }
    .progress .fill { height: 100%; background: var(--pd-brand-accent, #2563eb); transition: width 0.3s; }
    .progress span { font-size: 13px; color: var(--pd-color-muted, #666); }
    .section-title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--pd-color-muted, #666); margin: 24px 0 12px; font-weight: 600; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .grid.optional { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
    .cat-card header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .cat-card .summary { font-size: 13px; color: var(--pd-color-muted, #666); margin: 6px 0 12px; }
    .cat-card .missing { font-size: 12px; color: var(--pd-color-danger-text, #b91c1c); margin: 0 0 12px; }
    .cat-card.compact .summary { margin-bottom: 8px; }
    .go-live { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 16px 20px; background: #f3f4f6; border-radius: 8px; margin-top: 24px; }
    .go-live p { font-size: 13px; color: var(--pd-color-muted, #666); margin: 4px 0 0; }
    .muted { color: var(--pd-color-muted, #6b7280); font-size: 13px; }
  `],
})
export class OnboardingHubComponent {
  private onboarding = inject(OnboardingService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snack = inject(SnackbarService);

  readonly loading = signal(true);
  readonly status = signal<SetupStatusResponse | null>(null);
  readonly completedCount = computed(
    () => this.status()?.required.filter((c) => c.status === 'DONE').length ?? 0
  );
  readonly progressPercent = computed(() => {
    const s = this.status();
    if (!s) return 0;
    return (this.completedCount() / s.required.length) * 100;
  });

  constructor() {
    this.refresh();
  }

  private refresh(): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    this.onboarding.getSetupStatus(tid).subscribe({
      next: (s) => {
        this.status.set(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  statusLabel(s: SetupCategory['status']): string {
    return s === 'DONE' ? 'Done' : s === 'PARTIAL' ? 'In progress' : 'Not started';
  }

  linkFor(key: string): string | null {
    switch (key) {
      case 'workflow_stages': return '/setup/workflow-stages';
      case 'equipment': return '/setup/equipment';
      case 'profile': return '/setup/mill-profile';
      case 'pricing': return '/setup/pricing';
      default: return null;
    }
  }

  goLive(): void {
    const tid = this.auth.activeTenantId();
    if (!tid) return;
    this.onboarding.goLive(tid).subscribe({
      next: (s) => {
        this.status.set(s);
        this.snack.show('Mill is now live', { durationMs: 3000 });
      },
      error: (e) => this.snack.show('Go-live failed: ' + (e?.error?.detail ?? 'unknown'), { durationMs: 4000 }),
    });
  }
}
