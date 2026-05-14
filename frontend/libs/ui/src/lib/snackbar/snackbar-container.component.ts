import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SnackbarMessage, SnackbarService } from './snackbar.service';

/**
 * Renders {@link SnackbarService} messages. Drop once near the app root:
 *   <pd-snackbar-container />
 *
 * Stacked top-right (desktop) / bottom-center (mobile) so it doesn't obscure
 * the bottom-of-page action buttons operators care about.
 */
@Component({
  selector: 'pd-snackbar-container',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pd-snack-stack" role="status" aria-live="polite">
      @for (m of service.messages(); track m.id) {
        <div class="pd-snack" [attr.data-tone]="m.tone">
          <span class="pd-snack__text">{{ m.text }}</span>
          @if (m.actionLabel) {
            <button class="pd-snack__action" (click)="onAction(m)">{{ m.actionLabel }}</button>
          }
          <button class="pd-snack__close" aria-label="Dismiss" (click)="service.dismiss(m.id)">×</button>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      position: fixed;
      top: var(--pd-space-5);
      right: var(--pd-space-5);
      z-index: 9999;
      pointer-events: none;
    }
    .pd-snack-stack {
      display: flex;
      flex-direction: column;
      gap: var(--pd-space-2);
      align-items: flex-end;
      max-width: 420px;
    }
    .pd-snack {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: var(--pd-space-3);
      padding: var(--pd-space-3) var(--pd-space-4);
      border-radius: var(--pd-radius-md);
      box-shadow: var(--pd-shadow-md);
      font-size: var(--pd-text-sm);
      line-height: var(--pd-leading-sm);
      background: var(--pd-color-bg-elevated);
      color: var(--pd-color-text);
      border-left: 4px solid var(--pd-color-border);
      animation: pd-snack-slide 200ms ease-out;
    }
    @keyframes pd-snack-slide {
      from { transform: translateX(16px); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }
    .pd-snack[data-tone="info"]    { border-left-color: var(--pd-blue-600); }
    .pd-snack[data-tone="success"] { border-left-color: var(--pd-green-600); }
    .pd-snack[data-tone="warning"] { border-left-color: var(--pd-amber-600); }
    .pd-snack[data-tone="error"]   { border-left-color: var(--pd-red-600); }

    .pd-snack__text { flex: 1; }
    .pd-snack__action {
      background: transparent;
      border: none;
      color: var(--pd-brand-accent);
      font-family: var(--pd-font-sans);
      font-weight: var(--pd-weight-medium);
      font-size: var(--pd-text-sm);
      cursor: pointer;
      padding: 0;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .pd-snack__action:hover { color: var(--pd-brand-accent-hover); }
    .pd-snack__close {
      background: transparent;
      border: none;
      color: var(--pd-color-text-muted);
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      padding: 0 4px;
    }
    .pd-snack__close:hover { color: var(--pd-color-text); }

    @media (max-width: 720px) {
      :host { top: auto; right: var(--pd-space-3); bottom: var(--pd-space-3); left: var(--pd-space-3); }
      .pd-snack-stack { align-items: stretch; max-width: none; }
    }
  `],
})
export class SnackbarContainerComponent {
  readonly service = inject(SnackbarService);

  onAction(m: SnackbarMessage): void {
    m.onAction?.();
    this.service.dismiss(m.id);
  }
}
