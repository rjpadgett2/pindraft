import { HttpClient } from '@angular/common/http';
import { Injectable, signal, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { OfflineQueueService, OutboxEvent } from './offline-queue.service';

/**
 * Opportunistic sync. Triggered on three signals:
 *   - App startup (constructor)
 *   - Browser online event
 *   - Manual trigger (after a user successfully submits a new event)
 *
 * Public signals: pendingCount, online, syncing.
 */
@Injectable({ providedIn: 'root' })
export class SyncService {
  private http = inject(HttpClient);
  private queue = inject(OfflineQueueService);

  readonly pendingCount = signal(0);
  readonly online = signal(navigator.onLine);
  readonly syncing = signal(false);

  constructor() {
    window.addEventListener('online', () => {
      this.online.set(true);
      this.trySync();
    });
    window.addEventListener('offline', () => this.online.set(false));
    this.refreshPendingCount();
    this.trySync();
  }

  async refreshPendingCount(): Promise<void> {
    const pending = await this.queue.listPending();
    this.pendingCount.set(pending.length);
  }

  async trySync(): Promise<void> {
    if (!this.online() || this.syncing()) return;
    this.syncing.set(true);
    try {
      const pending = await this.queue.listPending();
      for (const event of pending) {
        try {
          await this.postOne(event);
          await this.queue.markSynced(event.localId);
        } catch (err) {
          // Stop on first failure — likely we just went offline mid-sync
          console.warn('Sync failed for', event.localId, err);
          break;
        }
      }
    } finally {
      this.syncing.set(false);
      this.refreshPendingCount();
    }
  }

  private async postOne(event: OutboxEvent): Promise<void> {
    await firstValueFrom(this.http.post('/api/v1/me/shearing-events', {
      clientLocalId: event.localId,
      animalName: event.animalName,
      animalExternalId: event.animalExternalId,
      breedCode: event.breedCode,
      fleeceWeightKg: event.fleeceWeightKg,
      shornAt: event.shornAt,
      location: event.location,
      notes: event.notes,
    }));
  }
}
