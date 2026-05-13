import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Header for the public-facing surfaces. Same brand bar regardless of whether the
 * visitor is browsing the marketplace, viewing a trace, or looking through the mill
 * directory. Not authenticated — no operator name, no sign-out button.
 */
@Component({
  selector: 'customer-public-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <header class="public-header">
      <a class="brand" routerLink="/marketplace">Pindraft</a>
      <nav>
        <a routerLink="/marketplace">Marketplace</a>
        <a routerLink="/mills">Mills</a>
        <a class="sign-in" routerLink="/login">Sign in</a>
      </nav>
    </header>
  `,
  styles: [`
    .public-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; border-bottom: 1px solid #e5e7eb; background: white; }
    .brand { font-weight: 500; font-size: 18px; color: #1a1a1a; text-decoration: none; }
    nav { display: flex; gap: 24px; align-items: center; }
    nav a { color: #666; text-decoration: none; font-size: 14px; }
    nav a:hover { color: #1a1a1a; }
    .sign-in { color: #2563eb; }
  `],
})
export class PublicHeaderComponent {}
