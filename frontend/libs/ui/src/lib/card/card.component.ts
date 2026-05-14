import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type CardVariant = 'default' | 'sunken' | 'elevated' | 'accent';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

/**
 * Vanilla-CSS card — replacement for <mat-card>. Wrapper element that gives
 * any content a consistent surface, border, and radius. No header / actions /
 * footer slots like Material — those are layout details the consuming
 * component knows better than this one. Just a flat surface.
 *
 * Usage:
 *   <pd-card>Anything</pd-card>
 *   <pd-card variant="sunken" padding="sm">Compact info</pd-card>
 *   <pd-card variant="elevated">Drops a small shadow.</pd-card>
 *   <pd-card variant="accent">Wool-cream brand surface for landing sections.</pd-card>
 */
@Component({
  selector: 'pd-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pd-card"
         [attr.data-variant]="variant()"
         [attr.data-padding]="padding()">
      <ng-content />
    </div>
  `,
  styles: [`
    :host { display: block; }
    .pd-card {
      border-radius: var(--pd-radius-lg);
      background: var(--pd-color-bg-surface);
      border: 1px solid var(--pd-color-border);
    }
    .pd-card[data-variant="sunken"] {
      background: var(--pd-color-bg-sunken);
      border-color: transparent;
    }
    .pd-card[data-variant="elevated"] {
      border-color: transparent;
      box-shadow: var(--pd-shadow-md);
    }
    .pd-card[data-variant="accent"] {
      background: var(--pd-brand-accent-bg);
      border-color: transparent;
    }

    .pd-card[data-padding="none"] { padding: 0; }
    .pd-card[data-padding="sm"]   { padding: var(--pd-space-3) var(--pd-space-4); }
    .pd-card[data-padding="md"]   { padding: var(--pd-space-5) var(--pd-space-6); }
    .pd-card[data-padding="lg"]   { padding: var(--pd-space-8); }
  `],
})
export class CardComponent {
  readonly variant = input<CardVariant>('default');
  readonly padding = input<CardPadding>('md');
}
