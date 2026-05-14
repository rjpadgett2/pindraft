import { Injectable, signal } from '@angular/core';

export type SnackTone = 'info' | 'success' | 'warning' | 'error';

export interface SnackbarMessage {
  id: number;
  text: string;
  tone: SnackTone;
  durationMs: number;
  /** Optional action button label; clicking it fires {@code onAction}. */
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Vanilla-CSS snackbar service — replaces Material's MatSnackBar.
 *
 * Usage anywhere in the app:
 *   constructor(private snack = inject(SnackbarService)) {}
 *   ...
 *   this.snack.show('Lot completed', { tone: 'success' });
 *   this.snack.error('Could not save');
 *   this.snack.show('Saved', { actionLabel: 'Undo', onAction: () => undo() });
 *
 * To render: drop {@code <pd-snackbar-container />} once near the app shell
 * (typically inside app.component.html). The container subscribes to this
 * service's signal and animates messages in/out.
 */
@Injectable({ providedIn: 'root' })
export class SnackbarService {
  private nextId = 1;
  private readonly _messages = signal<SnackbarMessage[]>([]);
  readonly messages = this._messages.asReadonly();

  show(text: string, opts: Partial<Omit<SnackbarMessage, 'id' | 'text'>> = {}): number {
    const id = this.nextId++;
    const msg: SnackbarMessage = {
      id,
      text,
      tone: opts.tone ?? 'info',
      durationMs: opts.durationMs ?? 3000,
      actionLabel: opts.actionLabel,
      onAction: opts.onAction,
    };
    this._messages.update((list) => [...list, msg]);
    if (msg.durationMs > 0) {
      setTimeout(() => this.dismiss(id), msg.durationMs);
    }
    return id;
  }

  /** Shorthands. */
  success(text: string, opts: Partial<Omit<SnackbarMessage, 'id' | 'text' | 'tone'>> = {}): number {
    return this.show(text, { ...opts, tone: 'success' });
  }
  error(text: string, opts: Partial<Omit<SnackbarMessage, 'id' | 'text' | 'tone'>> = {}): number {
    // Errors stay longer by default — give the user time to read.
    return this.show(text, { durationMs: 5000, ...opts, tone: 'error' });
  }
  warning(text: string, opts: Partial<Omit<SnackbarMessage, 'id' | 'text' | 'tone'>> = {}): number {
    return this.show(text, { ...opts, tone: 'warning' });
  }

  dismiss(id: number): void {
    this._messages.update((list) => list.filter((m) => m.id !== id));
  }
}
