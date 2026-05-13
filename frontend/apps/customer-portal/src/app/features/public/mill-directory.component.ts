import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { MillSummary, PublicMarketplaceService } from './services/public-marketplace.service';
import { PublicHeaderComponent } from './public-header.component';

@Component({
  selector: 'customer-mill-directory',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatCardModule, PublicHeaderComponent],
  template: `
    <customer-public-header />
    <div class="public-page">
      <h1>Mills on Pindraft</h1>
      <p class="lead">Small mills processing fiber from the shepherds, designers, and ranchers who grow it.</p>

      @if (!loading()) {
        @if (mills().length === 0) {
          <div class="empty">No mills currently active.</div>
        } @else {
          <div class="grid">
            @for (m of mills(); track m.id) {
              <a class="card" [routerLink]="['/mills', m.id]">
                <h2>{{ m.name }}</h2>
                <p>{{ m.listingCount }} listing{{ m.listingCount === 1 ? '' : 's' }}</p>
              </a>
            }
          </div>
        }
      } @else {
        <p>Loading…</p>
      }
    </div>
  `,
  styles: [`
    .public-page { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }
    h1 { font-size: 28px; font-weight: 500; margin: 0 0 8px; }
    .lead { color: #666; font-size: 15px; margin: 0 0 32px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
    .card { display: block; background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; text-decoration: none; color: inherit; transition: all 0.15s; }
    .card:hover { border-color: #2563eb; transform: translateY(-2px); }
    .card h2 { font-size: 18px; font-weight: 500; margin: 0 0 8px; }
    .card p { color: #666; font-size: 13px; margin: 0; }
    .empty { padding: 48px; text-align: center; color: #666; }
  `],
})
export class PublicMillDirectoryComponent {
  private service = inject(PublicMarketplaceService);

  readonly loading = signal(true);
  readonly mills = signal<MillSummary[]>([]);

  constructor() {
    this.service.listMills().subscribe({
      next: (list) => { this.mills.set(list); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
