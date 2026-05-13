import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
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
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1 class="page-title">Today's work</h1>
          <p class="page-subtitle">All events save locally and sync when connected.</p>
        </div>
        <button mat-flat-button color="primary" routerLink="/events/new">
          <mat-icon>add</mat-icon> New
        </button>
      </header>

      @if (!loading()) {
        @if (events().length === 0) {
          <div class="empty">
            <mat-icon>pets</mat-icon>
            <h2>No events yet</h2>
            <p>Tap "New" to log your first shearing.</p>
          </div>
        } @else {
          <ul class="events">
            @for (e of events(); track e.localId) {
              <li [class.pending]="e.status === 'pending'">
                <div class="row">
                  <strong>{{ e.animalName }}</strong>
                  @if (e.breedCode) { <span class="chip">{{ e.breedCode }}</span> }
                  @if (e.status === 'pending') {
                    <span class="pending-badge" title="Not yet synced">
                      <mat-icon>schedule</mat-icon> Pending
                    </span>
                  } @else {
                    <mat-icon class="synced" title="Synced">cloud_done</mat-icon>
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
        <p>Loading…</p>
      }
    </div>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .empty { text-align: center; padding: 48px 16px; color: #666; }
    .empty mat-icon { font-size: 48px; height: 48px; width: 48px; color: #9ca3af; }
    .empty h2 { font-size: 18px; margin: 16px 0 8px; }
    .events { list-style: none; padding: 0; margin: 0; }
    .events li { padding: 12px 14px; background: white; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 8px; }
    .events li.pending { border-left: 3px solid #f59e0b; }
    .row { display: flex; align-items: center; gap: 8px; }
    .chip { font-size: 10px; padding: 2px 6px; background: #f3f4f6; border-radius: 4px; color: #666; }
    .pending-badge { margin-left: auto; font-size: 11px; color: #92400e; display: flex; align-items: center; gap: 4px; }
    .pending-badge mat-icon { font-size: 14px; height: 14px; width: 14px; }
    .synced { margin-left: auto; color: #10b981; font-size: 18px; height: 18px; width: 18px; }
    .meta { font-size: 12px; color: #666; margin-top: 4px; }
    .notes { font-size: 13px; color: #374151; margin-top: 6px; font-style: italic; }
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
