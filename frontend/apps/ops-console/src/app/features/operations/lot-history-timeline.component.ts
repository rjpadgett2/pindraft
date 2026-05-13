import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LotHistoryEvent, WorkflowStage } from '@pindraft/api-client';

/**
 * Presentational timeline of stage events. Pure render — parent owns the data.
 */
@Component({
  selector: 'ops-lot-history-timeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  template: `
    <ol class="timeline">
      @for (event of events(); track event.id) {
        <li>
          <strong>{{ stageName(event.workflowStageId) }}</strong>
          <div class="meta">
            Entered {{ event.enteredAt | date:'short' }}
            @if (event.exitedAt) {
              • Exited {{ event.exitedAt | date:'short' }}
              • {{ event.weightInKg }} kg → {{ event.weightOutKg }} kg
            } @else {
              • <em>Still in progress</em>
            }
          </div>
        </li>
      }
    </ol>
  `,
  styles: [`
    .timeline { list-style: none; padding: 0; margin: 0; border-left: 2px solid #e5e7eb; padding-left: 16px; }
    .timeline li { padding: 8px 0; }
    .timeline .meta { font-size: 12px; color: #666; margin-top: 2px; }
  `],
})
export class LotHistoryTimelineComponent {
  readonly events = input.required<LotHistoryEvent[]>();
  readonly stages = input.required<WorkflowStage[]>();

  stageName(stageId: string): string {
    return this.stages().find((s) => s.id === stageId)?.displayName ?? stageId.substring(0, 8);
  }
}
