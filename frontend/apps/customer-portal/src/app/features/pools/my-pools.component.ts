import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CardComponent, EmptyStateComponent, PageHeaderComponent } from '@pindraft/ui';
import { CustomerPoolMembership, CustomerPoolsService } from './services/customer-pools.service';

/**
 * The shepherd's view of pools they've contributed to. Cross-tenant by design,
 * surfaced through /api/v1/me/pools.
 *
 * For each pool: pool name, mill (by tenant ID since cross-mill resolution would
 * need another query), their own contribution weight, share percentage, dollar
 * amount when settled.
 */
@Component({
  selector: 'customer-my-pools',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, CardComponent, EmptyStateComponent, PageHeaderComponent],
  template: `
    <div class="page">
      <pd-page-header
        title="My pools"
        subtitle="Wool pools you've contributed to across all mills." />

      @if (!loading()) {
        @if (memberships().length === 0) {
          <pd-empty-state
            title="You haven't contributed to any pools yet"
            description="When a mill records a contribution from you, it'll show up here." />
        } @else {
          <div class="pool-list">
            @for (m of memberships(); track m.poolId) {
              <pd-card class="pool-card">
                <header>
                  <strong>{{ m.name }}</strong>
                  <span class="status" [class]="m.status">{{ m.status }}</span>
                </header>
                <p class="kind">{{ formatKind(m.kind) }}</p>
                @if (m.description) { <p class="desc">{{ m.description }}</p> }

                <div class="stake">
                  <div>
                    <small>Your contribution</small>
                    <div class="big">{{ m.myTotalWeight }} kg</div>
                  </div>
                  @if (totalSharePercent(m); as pct) {
                    <div>
                      <small>Your share</small>
                      <div class="big">{{ pct }}%</div>
                    </div>
                  }
                  @if (totalAmountOwed(m); as amt) {
                    <div>
                      <small>Amount owed</small>
                      <div class="big amount">\${{ amt }}</div>
                    </div>
                  }
                </div>

                <footer>
                  Joined {{ m.createdAt | date:'mediumDate' }}
                  @if (m.distributedAt) { • Settled {{ m.distributedAt | date:'mediumDate' }} }
                </footer>
              </pd-card>
            }
          </div>
        }
      } @else {
        <p class="muted">Loading…</p>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px 32px; }
    .muted { color: var(--pd-color-muted, #6b7280); font-size: 13px; }
    .pool-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
    .pool-card header { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
    .status { font-size: 10px; padding: 2px 8px; border-radius: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .status.ACCEPTING { background: var(--pd-color-info-bg, #dbeafe); color: var(--pd-color-info-text, #1e40af); }
    .status.CLOSED { background: var(--pd-color-warning-bg, #fef3c7); color: var(--pd-color-warning-text, #92400e); }
    .status.DISTRIBUTED { background: var(--pd-color-success-bg, #d1fae5); color: var(--pd-color-success-text, #065f46); }
    .kind { font-size: 12px; color: var(--pd-color-muted, #666); text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px; }
    .desc { font-size: 13px; color: var(--pd-color-text, #374151); margin: 0 0 16px; }
    .stake { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 12px; padding: 12px; background: var(--pd-color-bg-sunken, #f9fafb); border-radius: 6px; margin-bottom: 12px; }
    .stake small { font-size: 11px; color: var(--pd-color-muted, #666); }
    .stake .big { font-size: 18px; font-weight: 600; margin-top: 2px; }
    .stake .amount { color: var(--pd-color-success-text, #065f46); }
    footer { font-size: 12px; color: var(--pd-color-muted, #9ca3af); }
  `],
})
export class MyPoolsComponent {
  private service = inject(CustomerPoolsService);

  readonly loading = signal(true);
  readonly memberships = signal<CustomerPoolMembership[]>([]);

  constructor() {
    this.service.listMyPools().subscribe({
      next: (list) => { this.memberships.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  formatKind(k: string): string {
    return k.replace('_', ' ').toLowerCase();
  }

  totalSharePercent(m: CustomerPoolMembership): string | null {
    if (m.myShares.length === 0) return null;
    const total = m.myShares.reduce((sum, s) => sum + Number(s.sharePercent), 0);
    return total.toFixed(2);
  }

  totalAmountOwed(m: CustomerPoolMembership): string | null {
    if (m.status !== 'DISTRIBUTED' || m.myShares.length === 0) return null;
    const total = m.myShares.reduce((sum, s) => sum + Number(s.amountOwed ?? 0), 0);
    return total.toFixed(2);
  }
}
