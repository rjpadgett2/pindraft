import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * `<pd-toggle>` — sliding-thumb toggle (a.k.a. switch). Semantically an `<input
 * type="checkbox" role="switch">` so screen readers announce "switch, on/off"
 * rather than "checkbox, checked". Distinct from `pd-checkbox` visually so the
 * affordance signals "live setting that applies immediately" rather than
 * "selection in a form".
 *
 * Reactive forms & ngModel both work via {@link ControlValueAccessor}.
 *
 * Usage:
 *   <pd-toggle [(ngModel)]="publicVisible">Public provenance</pd-toggle>
 *   <pd-toggle formControlName="optedIn" />
 */
@Component({
  selector: 'pd-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: ToggleComponent,
    multi: true,
  }],
  template: `
    <label class="pd-toggle" [class.pd-toggle--disabled]="isDisabled()">
      <input
        type="checkbox"
        role="switch"
        class="pd-toggle__input"
        [checked]="checked()"
        [disabled]="isDisabled()"
        (change)="onChange($event)"
        (blur)="onTouched()"
      />
      <span class="pd-toggle__track" aria-hidden="true">
        <span class="pd-toggle__thumb"></span>
      </span>
      <span class="pd-toggle__label"><ng-content /></span>
    </label>
  `,
  styles: [`
    .pd-toggle {
      display: inline-flex;
      align-items: center;
      gap: var(--pd-space-3);
      cursor: pointer;
      user-select: none;
      font-family: var(--pd-font-sans);
      font-size: var(--pd-text-sm);
      color: var(--pd-color-text);
    }
    .pd-toggle--disabled { cursor: not-allowed; opacity: 0.6; }

    .pd-toggle__input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
      pointer-events: none;
    }

    .pd-toggle__track {
      position: relative;
      display: inline-block;
      width: 36px;
      height: 20px;
      background: var(--pd-color-border-strong, #d1d5db);
      border-radius: 999px;
      transition: background-color 150ms ease;
      flex-shrink: 0;
    }
    .pd-toggle__thumb {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      background: white;
      border-radius: 50%;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
      transition: transform 150ms ease;
    }

    .pd-toggle__input:checked + .pd-toggle__track { background: var(--pd-brand-accent); }
    .pd-toggle__input:checked + .pd-toggle__track .pd-toggle__thumb { transform: translateX(16px); }
    .pd-toggle__input:focus-visible + .pd-toggle__track {
      outline: 2px solid var(--pd-brand-accent);
      outline-offset: 2px;
    }

    .pd-toggle__label:empty { display: none; }
  `],
})
export class ToggleComponent implements ControlValueAccessor {
  readonly required = input<boolean, unknown>(false, { transform: (v) => v !== false && v != null });

  readonly checked = signal(false);
  readonly isDisabled = signal(false);

  private _onChange: (v: boolean) => void = () => {};
  onTouched: () => void = () => {};

  onChange(e: Event): void {
    const next = (e.target as HTMLInputElement).checked;
    this.checked.set(next);
    this._onChange(next);
  }

  // ControlValueAccessor
  writeValue(value: boolean): void { this.checked.set(!!value); }
  registerOnChange(fn: (v: boolean) => void): void { this._onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.isDisabled.set(disabled); }
}
