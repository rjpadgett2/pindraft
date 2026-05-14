import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ButtonComponent, EmptyStateComponent, IconComponent, PageHeaderComponent,
} from '@pindraft/ui';
import { OfflineQueueService, OutboxEvent } from '../../core/offline-queue.service';

/**
 * Combined view of synced + pending events from the local IndexedDB outbox.
 *
 * The PWA's truth is the outbox — the server's authoritative copy comes back via
 * sync but is treated as a confirmation layer rather than a source. This means
 * a shearer always sees their work, regardless of network.
 */
@Component({
  selector: 'shearer-events-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, RouterLink,
    ButtonComponent, EmptyStateComponent, IconComponent, PageHeaderComponent,
  ],
  template: `
    <div class="page">
      <pd-page-header
        title="Today's work"
        subtitle="All events save locally and sync when connected.">
        <pd-button variant="primary" routerLink="/events/new">
          <pd-icon name="add" /> New
        </pd-button>
      </pd-page-header>

      @if (!loading()) {
        @if (events().length === 0) {
          <pd-empty-state
            title="No events yet"
            description="Tap “New” to log your first shearing." />
        } @else {
          <ul class="events">
            @for (e of events(); track e.localId) {
              <li [class.pending]="e.status === 'pending'">
                <div class="row">
                  <strong>{{ e.animalName }}</strong>
                  @if (e.breedCode) { <span class="chip">{{ e.breedCode }}</span> }
                  @if (e.status === 'pending') {
                    <span class="pending-badge" title="Not yet synced">
                      <pd-icon name="schedule" size="14" /> Pending
                    </span>
                  } @else {
                    <pd-icon name="cloud_done" class="synced" size="18" />
                  }
                </div>
                <div class="meta">
                  {{ e.shornAt | date:'short' }}
                  @if (e.fleeceWeightKg) { • {{ e.fleeceWeightKg }} kg }
                  @if (e.location) { • {{ e.location }} }
                </div>
                @if (e.notes) { <div class="notes">{{ e.notes }}</div> }
              </li>
            }
          </ul>
        }
      } @else {
        <p class="muted">Loading…</p>
      }
    </div>
  `,
  styles: [`
    .page { padding: 16px; }
    .muted { color: var(--pd-color-muted, #6b7280); font-size: 13px; }
    .events { list-style: none; padding: 0; margin: 0; }
    .events li { padding: 12px 14px; background: white; border: 1px solid var(--pd-color-border, #e5e7eb); border-radius: 8px; margin-bottom: 8px; }
    .events li.pending { border-left: 3px solid var(--pd-color-warning, #f59e0b); }
    .row { display: flex; align-items: center; gap: 8px; }
    .chip { font-size: 10px; padding: 2px 6px; background: #f3f4f6; border-radius: 4px; color: var(--pd-color-muted, #666); }
    .pending-badge { margin-left: auto; font-size: 11px; color: var(--pd-color-warning-text, #92400e); display: inline-flex; align-items: center; gap: 4px; }
    .synced { margin-left: auto; color: var(--pd-color-success, #10b981); }
    .meta { font-size: 12px; color: var(--pd-color-muted, #666); margin-top: 4px; }
    .notes { font-size: 13px; color: var(--pd-color-text, #374151); margin-top: 6px; font-style: italic; }
  `],
})
export class EventsListComponent {
  private queue = inject(OfflineQueueService);

  readonly loading = signal(true);
  readonly events = signal<OutboxEvent[]>([]);

  constructor() {
    this.queue.listAll().then((events) => {
      this.events.set(events);
      this.loading.set(false);
    });
  }
}
