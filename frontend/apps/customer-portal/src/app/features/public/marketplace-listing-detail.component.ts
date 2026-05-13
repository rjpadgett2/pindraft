import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PublicListing, PublicMarketplaceService } from './services/public-marketplace.service';
import { PublicHeaderComponent } from './public-header.component';

/**
 * Public listing detail. The trace link, when present, is the differentiating element —
 * a click-through to the provenance page anyone can read without an account.
 */
@Component({
  selector: 'customer-marketplace-listing-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, MatCardModule, MatButtonModule, MatIconModule, PublicHeaderComponent],
  template: `
    <customer-public-header />
    <div class="public-page">
      <a routerLink="/marketplace" class="back">← Back to marketplace</a>

      @if (listing(); as l) {
        <div class="header">
          <span class="kind-badge">{{ l.kind }}</span>
          <h1>{{ l.title }}</h1>
          <p class="mill">
            From <a [routerLink]="['/mills', l.tenantId]">{{ l.millName }}</a>
          </p>
        </div>

        <div class="content">
          <div class="main">
            @if (l.description) {
              <p class="description">{{ l.description }}</p>
            }

            <div class="facts">
              <div>
                <small>Price</small>
                <div class="big">\${{ l.pricePerKg }}/kg</div>
              </div>
              <div>
                <small>Available</small>
                <div class="big">{{ l.quantityKg }} kg</div>
              </div>
              <div>
                <small>Published</small>
                <div>{{ l.publishedAt | date:'mediumDate' }}</div>
              </div>
            </div>
          </div>

          @if (l.traceSlug) {
            <mat-card class="trace-card">
              <mat-card-content>
                <div class="trace-header">
                  <mat-icon class="verified">verified</mat-icon>
                  <strong>Provenance available</strong>
                </div>
                <p>Trace this batch from the animal that grew the fiber through every stage of the mill.</p>
                <a mat-flat-button color="primary" [routerLink]="['/trace', l.traceSlug]">
                  See the journey
                </a>
              </mat-card-content>
            </mat-card>
          }
        </div>
      } @else if (notFound()) {
        <div class="not-found">
          <h1>Listing not found</h1>
          <p>This listing may have been sold or removed.</p>
        </div>
      } @else {
        <p>Loading…</p>
      }
    </div>
  `,
  styles: [`
    .public-page { max-width: 900px; margin: 0 auto; padding: 32px 24px; }
    .back { display: inline-block; margin-bottom: 16px; font-size: 13px; color: #2563eb; text-decoration: none; }
    .header { margin-bottom: 32px; }
    .kind-badge { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 8px; background: #f3f4f6; border-radius: 4px; color: #666; font-weight: 500; }
    h1 { font-size: 28px; font-weight: 500; margin: 8px 0; }
    .mill { font-size: 14px; color: #666; margin: 0; }
    .mill a { color: #2563eb; text-decoration: none; }
    .content { display: grid; grid-template-columns: 2fr 1fr; gap: 32px; }
    @media (max-width: 768px) { .content { grid-template-columns: 1fr; } }
    .description { font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
    .facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 16px; padding: 16px; background: #f9fafb; border-radius: 8px; }
    .facts small { color: #666; font-size: 12px; }
    .facts .big { font-size: 18px; font-weight: 500; margin-top: 4px; }
    .trace-card { background: #ecfdf5; border: 1px solid #10b981; }
    .trace-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .trace-card .verified { color: #10b981; }
    .trace-card p { font-size: 13px; color: #065f46; margin: 0 0 16px; }
    .not-found { text-align: center; padding: 48px; color: #666; }
  `],
})
export class PublicListingDetailComponent {
  private service = inject(PublicMarketplaceService);
  private route = inject(ActivatedRoute);

  readonly listing = signal<PublicListing | null>(null);
  readonly notFound = signal(false);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.notFound.set(true); return; }
    this.service.getListing(id).subscribe({
      next: (l) => this.listing.set(l),
      error: () => this.notFound.set(true),
    });
  }
}
