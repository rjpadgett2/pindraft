import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * `<pd-checkbox>` — token-driven checkbox primitive. Native semantics under the
 * hood (real `<input type="checkbox">`) styled with CSS so it inherits the
 * design system colors and focus rings.
 *
 * Reactive forms & template-driven both work via {@link ControlValueAccessor};
 * label text is content-projected so callers can include links or formatting.
 *
 * Usage:
 *   <pd-checkbox formControlName="terms">
 *     I accept the <a routerLink="/terms">terms of service</a>.
 *   </pd-checkbox>
 *
 *   <pd-checkbox [(ngModel)]="optedIn">Email me updates</pd-checkbox>
 */
@Component({
  selector: 'pd-checkbox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: CheckboxComponent,
    multi: true,
  }],
  template: `
    <label class="pd-checkbox" [class.pd-checkbox--disabled]="isDisabled()">
      <input
        type="checkbox"
        class="pd-checkbox__input"
        [checked]="checked()"
        [disabled]="isDisabled()"
        (change)="onChange($event)"
        (blur)="onTouched()"
      />
      <span class="pd-checkbox__box" aria-hidden="true">
        <svg viewBox="0 0 16 16" class="pd-checkbox__tick">
          <path d="M3 8.5l3.5 3.5L13 5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
      <span class="pd-checkbox__label"><ng-content /></span>
    </label>
  `,
  styles: [`
    .pd-checkbox {
      display: inline-flex;
      align-items: flex-start;
      gap: var(--pd-space-2);
      cursor: pointer;
      font-family: var(--pd-font-sans);
      font-size: var(--pd-text-sm);
      line-height: var(--pd-leading-sm);
      color: var(--pd-color-text);
      user-select: none;
    }
    .pd-checkbox--disabled { cursor: not-allowed; opacity: 0.6; }

    .pd-checkbox__input {
      /* Visually hidden but keyboard accessible. The styled box reflects state. */
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
      pointer-events: none;
    }

    .pd-checkbox__box {
      flex: 0 0 auto;
      width: 18px;
      height: 18px;
      border: 1.5px solid var(--pd-color-border-strong, var(--pd-color-border));
      border-radius: var(--pd-radius-sm);
      background: var(--pd-color-bg-elevated, white);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background-color 120ms ease, border-color 120ms ease;
      margin-top: 1px; /* optical alignment with label first line */
    }

    .pd-checkbox__tick {
      width: 14px;
      height: 14px;
      color: var(--pd-brand-text-on-accent, white);
      opacity: 0;
      transform: scale(0.6);
      transition: opacity 120ms ease, transform 120ms ease;
    }

    .pd-checkbox__input:checked + .pd-checkbox__box {
      background: var(--pd-brand-accent);
      border-color: var(--pd-brand-accent);
    }
    .pd-checkbox__input:checked + .pd-checkbox__box .pd-checkbox__tick {
      opacity: 1;
      transform: scale(1);
    }
    .pd-checkbox__input:focus-visible + .pd-checkbox__box {
      outline: 2px solid var(--pd-brand-accent);
      outline-offset: 2px;
    }
    .pd-checkbox:hover .pd-checkbox__box {
      border-color: var(--pd-brand-accent);
    }

    .pd-checkbox__label { flex: 1; }
    .pd-checkbox__label a { color: var(--pd-brand-accent); font-weight: var(--pd-weight-medium); }
    .pd-checkbox__label a:hover { color: var(--pd-brand-accent-hover); }
  `],
})
export class CheckboxComponent implements ControlValueAccessor {
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
