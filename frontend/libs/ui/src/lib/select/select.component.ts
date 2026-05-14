import {
  ChangeDetectionStrategy, Component, computed, forwardRef, input, signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export type SelectSize = 'sm' | 'md' | 'lg';

/**
 * Vanilla-CSS select — replacement for <mat-form-field> + <mat-select>. Wraps a
 * native <select> with the same floating-label aesthetic as <pd-input>. Native
 * select means: free mobile-friendly UI, free keyboard navigation, free screen
 * reader semantics, zero custom dropdown logic.
 *
 * Usage:
 *   <pd-select label="Role" formControlName="role" [options]="roles" />
 *   <pd-select label="Customer" [(ngModel)]="customerId">
 *     <option value="">— Select —</option>
 *     @for (c of customers(); track c.id) {
 *       <option [value]="c.id">{{ c.displayName }}</option>
 *     }
 *   </pd-select>
 *
 * Either pass {@code options} as an array OR use content projection with native
 * <option> children. The array form is convenient for static lists; projection
 * is better when options come from a query.
 *
 * Type note: the value type is `string` because {@link ControlValueAccessor}
 * isn't generic. Binding `[(ngModel)]` to an enum-union variable
 * (`PricingKind`, `ListingKind`, etc.) is fine in practice — the union types
 * are string subtypes so assignment works in both directions and Angular's
 * default template type-check is lenient enough not to warn. If you need
 * stronger type guarantees, use {@code [ngModel]="value()"} +
 * {@code (ngModelChange)="set($any($event))"} instead.
 */
@Component({
  selector: 'pd-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => SelectComponent),
    multi: true,
  }],
  template: `
    <label class="pd-select" [attr.data-size]="size()" [attr.data-state]="state()">
      <select
        class="pd-select__field"
        [value]="value()"
        [disabled]="isDisabled()"
        [required]="required()"
        [attr.aria-invalid]="!!error() || null"
        (change)="onChange($any($event.target).value)"
        (blur)="onTouched()">
        @if (options() && options()!.length > 0) {
          @for (o of options(); track o.value) {
            <option [value]="o.value" [disabled]="!!o.disabled">{{ o.label }}</option>
          }
        }
        <ng-content />
      </select>
      <span class="pd-select__label">
        {{ label() }}@if (required()) { <span class="pd-select__req" aria-hidden="true">*</span> }
      </span>
      <span class="pd-select__chevron" aria-hidden="true">▾</span>
    </label>
    @if (error()) { <p class="pd-select__error">{{ error() }}</p> }
    @else if (helper()) { <p class="pd-select__helper">{{ helper() }}</p> }
  `,
  styles: [`
    :host { display: block; }

    .pd-select {
      display: block;
      position: relative;
      border: 1px solid var(--pd-color-border-strong);
      border-radius: var(--pd-radius-md);
      background: var(--pd-color-bg-surface);
      transition: border-color 120ms ease, box-shadow 120ms ease;
    }
    .pd-select:hover { border-color: var(--pd-color-text-muted); }
    .pd-select:focus-within {
      border-color: var(--pd-color-border-focus);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--pd-color-border-focus) 20%, transparent);
    }

    .pd-select[data-size="sm"] { --field-pad-y: 8px;  --field-pad-x: 10px; --field-font: var(--pd-text-sm);   --field-line: var(--pd-leading-sm); }
    .pd-select[data-size="md"] { --field-pad-y: 12px; --field-pad-x: 12px; --field-font: var(--pd-text-base); --field-line: var(--pd-leading-base); }
    .pd-select[data-size="lg"] { --field-pad-y: 16px; --field-pad-x: 14px; --field-font: var(--pd-text-md);   --field-line: var(--pd-leading-md); }

    .pd-select__field {
      width: 100%;
      padding: var(--field-pad-y) var(--field-pad-x);
      padding-top: calc(var(--field-pad-y) + 6px);
      padding-bottom: calc(var(--field-pad-y) - 6px);
      padding-right: var(--pd-space-8);
      background: transparent;
      border: none;
      outline: none;
      font-family: var(--pd-font-sans);
      font-size: var(--field-font);
      line-height: var(--field-line);
      color: var(--pd-color-text);
      appearance: none;
      -webkit-appearance: none;
      cursor: pointer;
      box-sizing: border-box;
    }
    .pd-select__field:disabled { color: var(--pd-color-text-subtle); cursor: not-allowed; }

    .pd-select__label {
      position: absolute;
      left: var(--field-pad-x);
      top: -8px;
      font-family: var(--pd-font-sans);
      font-size: calc(var(--field-font) * 0.86);
      line-height: 1;
      color: var(--pd-color-text-muted);
      pointer-events: none;
      background: var(--pd-color-bg-surface);
      padding: 0 4px;
    }
    .pd-select:focus-within .pd-select__label { color: var(--pd-color-border-focus); }
    .pd-select__req { color: var(--pd-red-600); }

    .pd-select__chevron {
      position: absolute;
      right: var(--field-pad-x);
      top: 50%;
      transform: translateY(-50%);
      color: var(--pd-color-text-muted);
      font-size: var(--field-font);
      pointer-events: none;
    }

    .pd-select[data-state="error"] { border-color: var(--pd-red-600); }
    .pd-select[data-state="error"] .pd-select__label { color: var(--pd-red-700); }
    .pd-select[data-state="disabled"] { background: var(--pd-color-bg-sunken); cursor: not-allowed; }

    .pd-select__helper { margin: 4px 4px 0; font-size: var(--pd-text-xs); line-height: var(--pd-leading-xs); color: var(--pd-color-text-muted); }
    .pd-select__error  { margin: 4px 4px 0; font-size: var(--pd-text-xs); line-height: var(--pd-leading-xs); color: var(--pd-red-700); }
  `],
})
export class SelectComponent implements ControlValueAccessor {
  readonly label = input.required<string>();
  readonly size = input<SelectSize>('md');
  readonly options = input<SelectOption[] | null>(null);
  readonly helper = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly required = input<boolean, unknown>(false, { transform: (v) => v !== false && v != null });

  readonly value = signal<string>('');
  readonly isDisabled = signal(false);

  readonly state = computed<'error' | 'disabled' | null>(() => {
    if (this.error()) return 'error';
    if (this.isDisabled()) return 'disabled';
    return null;
  });

  private _onChange: (v: string) => void = () => {};
  onTouched: () => void = () => {};

  onChange(v: string): void {
    this.value.set(v);
    this._onChange(v);
  }

  writeValue(value: string): void { this.value.set(value ?? ''); }
  registerOnChange(fn: (v: string) => void): void { this._onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.isDisabled.set(disabled); }
}
