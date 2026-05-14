import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface RadioOption<T = string> {
  value: T;
  label: string;
  description?: string;
}

/**
 * `<pd-radio-group>` — exclusive-choice control built on a real `<input type="radio">`
 * stack so keyboard navigation (arrow keys, space) and forms-association work out of
 * the box. Stack the options vertically by default; horizontal layout via `direction`.
 *
 * Used where a `pd-select` would feel heavy (≤ 4 options) and you want all choices
 * visible at once — visit type, pricing kind, customer kind, fleece grade, etc.
 *
 * Usage:
 *   <pd-radio-group label="Customer kind"
 *                   [options]="[{value:'SHEPHERD', label:'Shepherd'}, {value:'DESIGNER', label:'Designer'}]"
 *                   [(ngModel)]="kind" />
 */
@Component({
  selector: 'pd-radio-group',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: RadioGroupComponent,
    multi: true,
  }],
  template: `
    <fieldset class="pd-radio-group" [attr.data-direction]="direction()">
      @if (label()) { <legend class="pd-radio-group__legend">{{ label() }}</legend> }
      @for (opt of options(); track opt.value) {
        <label class="pd-radio" [class.pd-radio--disabled]="isDisabled()">
          <input
            type="radio"
            class="pd-radio__input"
            [attr.name]="groupName"
            [value]="opt.value"
            [checked]="value() === opt.value"
            [disabled]="isDisabled()"
            (change)="onChange(opt.value)"
            (blur)="onTouched()"
          />
          <span class="pd-radio__dot" aria-hidden="true"></span>
          <span class="pd-radio__text">
            <span class="pd-radio__label">{{ opt.label }}</span>
            @if (opt.description) {
              <span class="pd-radio__description">{{ opt.description }}</span>
            }
          </span>
        </label>
      }
    </fieldset>
  `,
  styles: [`
    .pd-radio-group {
      border: 0;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: var(--pd-space-2);
    }
    .pd-radio-group[data-direction="horizontal"] { flex-direction: row; gap: var(--pd-space-4); }

    .pd-radio-group__legend {
      padding: 0 0 var(--pd-space-2);
      font-family: var(--pd-font-sans);
      font-size: var(--pd-text-xs);
      line-height: var(--pd-leading-xs);
      font-weight: var(--pd-weight-medium);
      color: var(--pd-color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .pd-radio {
      display: inline-flex;
      align-items: flex-start;
      gap: var(--pd-space-2);
      cursor: pointer;
      font-family: var(--pd-font-sans);
      font-size: var(--pd-text-sm);
      color: var(--pd-color-text);
      user-select: none;
    }
    .pd-radio--disabled { cursor: not-allowed; opacity: 0.6; }

    .pd-radio__input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
      pointer-events: none;
    }

    .pd-radio__dot {
      flex: 0 0 auto;
      width: 18px;
      height: 18px;
      border: 1.5px solid var(--pd-color-border-strong, var(--pd-color-border));
      border-radius: 50%;
      background: var(--pd-color-bg-elevated, white);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: border-color 120ms ease;
      margin-top: 1px;
    }
    .pd-radio__dot::after {
      content: '';
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--pd-brand-accent);
      transform: scale(0);
      transition: transform 120ms ease;
    }

    .pd-radio__input:checked + .pd-radio__dot { border-color: var(--pd-brand-accent); }
    .pd-radio__input:checked + .pd-radio__dot::after { transform: scale(1); }
    .pd-radio__input:focus-visible + .pd-radio__dot {
      outline: 2px solid var(--pd-brand-accent);
      outline-offset: 2px;
    }
    .pd-radio:hover .pd-radio__dot { border-color: var(--pd-brand-accent); }

    .pd-radio__text { display: flex; flex-direction: column; gap: 2px; }
    .pd-radio__label { line-height: var(--pd-leading-sm); }
    .pd-radio__description {
      font-size: var(--pd-text-xs);
      line-height: var(--pd-leading-xs);
      color: var(--pd-color-text-muted);
    }
  `],
})
export class RadioGroupComponent<T = string> implements ControlValueAccessor {
  readonly label = input<string | null>(null);
  readonly options = input.required<RadioOption<T>[]>();
  readonly direction = input<'vertical' | 'horizontal'>('vertical');

  readonly value = signal<T | null>(null);
  readonly isDisabled = signal(false);

  /** Stable per-instance name so the browser groups the radios together. */
  private static _instance = 0;
  readonly groupName = `pd-radio-group-${++RadioGroupComponent._instance}`;

  private _onChange: (v: T | null) => void = () => {};
  onTouched: () => void = () => {};

  onChange(value: T): void {
    this.value.set(value);
    this._onChange(value);
  }

  // ControlValueAccessor
  writeValue(value: T | null): void { this.value.set(value); }
  registerOnChange(fn: (v: T | null) => void): void { this._onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.isDisabled.set(disabled); }
}
