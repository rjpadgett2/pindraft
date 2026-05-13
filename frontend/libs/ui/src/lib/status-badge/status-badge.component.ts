import { ChangeDetectionStrategy, Component, input } from '@angular/core';

type Status = 'DONE' | 'PARTIAL' | 'NOT_STARTED' | 'LIVE' | 'SETUP' | 'PAUSED';

@Component({
  selector: 'pd-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge" [class]="status()">
      {{ label() }}
    </span>
  `,
  styles: [`
    .badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
      line-height: 18px;
    }
    .badge.DONE, .badge.LIVE { background: #d1fae5; color: #065f46; }
    .badge.PARTIAL          { background: #fef3c7; color: #92400e; }
    .badge.NOT_STARTED      { background: #fee2e2; color: #991b1b; }
    .badge.SETUP            { background: #dbeafe; color: #1e40af; }
    .badge.PAUSED           { background: #e5e7eb; color: #374151; }
  `],
})
export class StatusBadgeComponent {
  readonly status = input.required<Status>();
  readonly label = input.required<string>();
}
