import {
  ChangeDetectionStrategy, Component, computed, forwardRef, input, signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Vanilla-CSS date picker — wraps a native <input type="date">. Cross-browser
 * native calendar UI, free keyboard navigation, free mobile picker. Trade-off
 * is we don't get pixel-identical styling across browsers — Chrome / Safari /
 * Firefox each render the picker dialog slightly differently. For Pindraft's
 * use cases (reservation slot, tested_at, expires_at) that's acceptable; the
 * value semantics matter more than the visual chrome.
 *
 * Value format is the native ISO-date string ({@code YYYY-MM-DD}). To/from
 * Date objects must be converted in the parent if needed.
 *
 * Usage:
 *   <pd-datepicker label="Slot date" formControlName="slotDate" />
 *   <pd-datepicker label="Expires" [(ngModel)]="expiresAt" [min]="today" />
 */
@Component({
  selector: 'pd-datepicker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => DatepickerComponent),
    multi: true,
  }],
  template: `
    <label class="pd-date" [attr.data-state]="state()">
      <input
        class="pd-date__field"
        type="date"
        [value]="value()"
        [disabled]="isDisabled()"
        [required]="required()"
        [min]="min()"
        [max]="max()"
        [attr.aria-invalid]="!!error() || null"
        (input)="onInput($any($event.target).value)"
        (blur)="onTouched()" />
      <span class="pd-date__label">
        {{ label() }}@if (required()) { <span class="pd-date__req" aria-hidden="true">*</span> }
      </span>
    </label>
    @if (error()) { <p class="pd-date__error">{{ error() }}</p> }
    @else if (helper()) { <p class="pd-date__helper">{{ helper() }}</p> }
  `,
  styles: [`
    :host { display: block; }
    .pd-date {
      display: block;
      position: relative;
      border: 1px solid var(--pd-color-border-strong);
      border-radius: var(--pd-radius-md);
      background: var(--pd-color-bg-surface);
      transition: border-color 120ms ease, box-shadow 120ms ease;
    }
    .pd-date:hover { border-color: var(--pd-color-text-muted); }
    .pd-date:focus-within {
      border-color: var(--pd-color-border-focus);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--pd-color-border-focus) 20%, transparent);
    }
    .pd-date__field {
      width: 100%;
      padding: 18px 12px 6px;
      background: transparent;
      border: none;
      outline: none;
      font-family: var(--pd-font-sans);
      font-size: var(--pd-text-base);
      line-height: var(--pd-leading-base);
      color: var(--pd-color-text);
      box-sizing: border-box;
    }
    .pd-date__field:disabled { color: var(--pd-color-text-subtle); }

    /* Float the label always — the native date input never shows a "placeholder"
       in the way a text input does, so the label sits in the floated position. */
    .pd-date__label {
      position: absolute;
      left: 12px;
      top: -8px;
      font-family: var(--pd-font-sans);
      font-size: calc(var(--pd-text-base) * 0.86);
      line-height: 1;
      color: var(--pd-color-text-muted);
      pointer-events: none;
      background: var(--pd-color-bg-surface);
      padding: 0 4px;
    }
    .pd-date:focus-within .pd-date__label { color: var(--pd-color-border-focus); }
    .pd-date__req { color: var(--pd-red-600); }

    .pd-date[data-state="error"] { border-color: var(--pd-red-600); }
    .pd-date[data-state="error"] .pd-date__label { color: var(--pd-red-700); }
    .pd-date[data-state="disabled"] { background: var(--pd-color-bg-sunken); }

    .pd-date__helper { margin: 4px 4px 0; font-size: var(--pd-text-xs); color: var(--pd-color-text-muted); }
    .pd-date__error  { margin: 4px 4px 0; font-size: var(--pd-text-xs); color: var(--pd-red-700); }
  `],
})
export class DatepickerComponent implements ControlValueAccessor {
  readonly label = input.required<string>();
  readonly helper = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly required = input<boolean, unknown>(false, { transform: (v) => v !== false && v != null });
  readonly min = input<string | null>(null);
  readonly max = input<string | null>(null);

  readonly value = signal<string>('');
  readonly isDisabled = signal(false);
  readonly state = computed<'error' | 'disabled' | null>(() => {
    if (this.error()) return 'error';
    if (this.isDisabled()) return 'disabled';
    return null;
  });

  private _onChange: (v: string) => void = () => {};
  onTouched: () => void = () => {};

  onInput(v: string): void {
    this.value.set(v);
    this._onChange(v);
  }

  writeValue(value: string): void { this.value.set(value ?? ''); }
  registerOnChange(fn: (v: string) => void): void { this._onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.isDisabled.set(disabled); }
}
