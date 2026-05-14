import {
  ChangeDetectionStrategy, Component, computed, forwardRef, input, signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
export type InputSize = 'sm' | 'md' | 'lg';

/**
 * Vanilla-CSS text input — replacement for <mat-form-field appearance="outline">
 * + matInput. Wraps a native <input> with a floating label, helper text, and
 * error state. Implements ControlValueAccessor so it works with [(ngModel)]
 * and Reactive Forms via formControlName.
 *
 * Usage:
 *   <pd-input label="Email" type="email" formControlName="email" />
 *   <pd-input label="Name" [(ngModel)]="name" helper="As it appears on tax forms" />
 *   <pd-input label="Password" type="password" [error]="pwError()" required />
 *
 * Accessibility: the <label> wraps the input so clicking the label focuses the
 * field. aria-invalid + aria-describedby wire up error and helper text to
 * screen readers.
 */
@Component({
  selector: 'pd-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => InputComponent),
    multi: true,
  }],
  template: `
    <label class="pd-input" [attr.data-size]="size()" [attr.data-state]="state()">
      <input
        class="pd-input__field"
        [type]="type()"
        [value]="value()"
        [disabled]="isDisabled()"
        [required]="required()"
        [autocomplete]="autocomplete()"
        [attr.inputmode]="inputmode()"
        [attr.placeholder]="' '"
        [attr.aria-invalid]="!!error() || null"
        [attr.aria-describedby]="describedBy()"
        (input)="onInput($any($event.target).value)"
        (blur)="onTouched()"
      />
      <span class="pd-input__label">
        {{ label() }}@if (required()) { <span class="pd-input__req" aria-hidden="true">*</span> }
      </span>
    </label>
    @if (error()) {
      <p class="pd-input__error" [id]="describedBy()">{{ error() }}</p>
    } @else if (helper()) {
      <p class="pd-input__helper" [id]="describedBy()">{{ helper() }}</p>
    }
  `,
  styles: [`
    :host { display: block; }

    .pd-input {
      display: block;
      position: relative;
      border: 1px solid var(--pd-color-border-strong);
      border-radius: var(--pd-radius-md);
      background: var(--pd-color-bg-surface);
      transition: border-color 120ms ease, box-shadow 120ms ease;
    }
    .pd-input:hover { border-color: var(--pd-color-text-muted); }
    .pd-input:focus-within {
      border-color: var(--pd-color-border-focus);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--pd-color-border-focus) 20%, transparent);
    }

    .pd-input[data-size="sm"] { --field-pad-y: 8px;  --field-pad-x: 10px; --field-font: var(--pd-text-sm);   --field-line: var(--pd-leading-sm);   --label-shift: -8px;  }
    .pd-input[data-size="md"] { --field-pad-y: 12px; --field-pad-x: 12px; --field-font: var(--pd-text-base); --field-line: var(--pd-leading-base); --label-shift: -8px;  }
    .pd-input[data-size="lg"] { --field-pad-y: 16px; --field-pad-x: 14px; --field-font: var(--pd-text-md);   --field-line: var(--pd-leading-md);   --label-shift: -10px; }

    .pd-input__field {
      width: 100%;
      padding: var(--field-pad-y) var(--field-pad-x);
      padding-top: calc(var(--field-pad-y) + 6px);
      padding-bottom: calc(var(--field-pad-y) - 6px);
      background: transparent;
      border: none;
      outline: none;
      font-family: var(--pd-font-sans);
      font-size: var(--field-font);
      line-height: var(--field-line);
      color: var(--pd-color-text);
      box-sizing: border-box;
    }
    .pd-input__field:disabled {
      color: var(--pd-color-text-subtle);
      cursor: not-allowed;
    }

    .pd-input__label {
      position: absolute;
      left: var(--field-pad-x);
      top: 50%;
      transform: translateY(-50%);
      font-family: var(--pd-font-sans);
      font-size: var(--field-font);
      line-height: 1;
      color: var(--pd-color-text-muted);
      pointer-events: none;
      transition: transform 120ms ease, font-size 120ms ease, color 120ms ease, background 120ms ease;
      padding: 0 4px;
      background: transparent;
    }

    /* When the input has content or is focused, float the label */
    .pd-input__field:focus ~ .pd-input__label,
    .pd-input__field:not(:placeholder-shown) ~ .pd-input__label {
      transform: translateY(var(--label-shift)) scale(0.86);
      transform-origin: 0 0;
      background: var(--pd-color-bg-surface);
      color: var(--pd-color-text-muted);
    }
    .pd-input__field:focus ~ .pd-input__label {
      color: var(--pd-color-border-focus);
    }
    .pd-input__req { color: var(--pd-red-600); }

    /* Error state */
    .pd-input[data-state="error"] { border-color: var(--pd-red-600); }
    .pd-input[data-state="error"]:focus-within { box-shadow: 0 0 0 3px color-mix(in srgb, var(--pd-red-600) 20%, transparent); }
    .pd-input[data-state="error"] .pd-input__field:focus ~ .pd-input__label,
    .pd-input[data-state="error"] .pd-input__field:not(:placeholder-shown) ~ .pd-input__label {
      color: var(--pd-red-700);
    }

    /* Disabled state */
    .pd-input[data-state="disabled"] { background: var(--pd-color-bg-sunken); cursor: not-allowed; }

    .pd-input__helper { margin: 4px 4px 0; font-size: var(--pd-text-xs); line-height: var(--pd-leading-xs); color: var(--pd-color-text-muted); }
    .pd-input__error { margin: 4px 4px 0; font-size: var(--pd-text-xs); line-height: var(--pd-leading-xs); color: var(--pd-red-700); }
  `],
})
export class InputComponent implements ControlValueAccessor {
  readonly label = input.required<string>();
  readonly type = input<InputType>('text');
  readonly size = input<InputSize>('md');
  readonly helper = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly required = input<boolean, unknown>(false, { transform: (v) => v !== false && v != null });
  readonly autocomplete = input<string | null>(null);
  readonly inputmode = input<string | null>(null);

  // CVA state
  readonly value = signal('');
  readonly isDisabled = signal(false);

  readonly state = computed<'error' | 'disabled' | null>(() => {
    if (this.error()) return 'error';
    if (this.isDisabled()) return 'disabled';
    return null;
  });
  // Stable ID so aria-describedby resolves to the helper/error <p>
  private static _idCounter = 0;
  private readonly _id = ++InputComponent._idCounter;
  readonly describedBy = computed(() => `pd-input-${this._id}-msg`);

  private _onChange: (v: string) => void = () => {};
  onTouched: () => void = () => {};

  onInput(v: string): void {
    this.value.set(v);
    this._onChange(v);
  }

  // ControlValueAccessor
  writeValue(value: string): void { this.value.set(value ?? ''); }
  registerOnChange(fn: (v: string) => void): void { this._onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.isDisabled.set(disabled); }
}
