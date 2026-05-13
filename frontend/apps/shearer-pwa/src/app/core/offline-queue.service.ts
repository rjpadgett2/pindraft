import { Injectable } from '@angular/core';

/**
 * IndexedDB-backed outbox for shearing events.
 *
 * Design:
 *   - Every event is written to the outbox first with status 'pending'.
 *   - The sync service picks up pending events, POSTs them, marks 'synced' on success.
 *   - Failed posts stay 'pending' and retry on next sync cycle.
 *   - Local IDs are generated client-side and sent to the backend as client_local_id;
 *     the backend dedupes on (user_id, client_local_id), so replays are safe.
 *
 * The key separation from the service worker: the SW handles HTTP-level network
 * failures (offline → cache lookup); this queue handles application-level durability
 * (writes survive across app restarts even with no network at all).
 */
export interface OutboxEvent {
  localId: string;
  animalName: string;
  animalExternalId?: string;
  breedCode?: string;
  fleeceWeightKg?: number;
  shornAt: string;
  location?: string;
  notes?: string;
  status: 'pending' | 'synced';
  createdAt: string;
  syncedAt?: string;
}

const DB_NAME = 'pindraft-shearer';
const DB_VERSION = 1;
const STORE = 'outbox';

@Injectable({ providedIn: 'root' })
export class OfflineQueueService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'localId' });
          store.createIndex('status', 'status', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.dbPromise;
  }

  /** Generate a client-side local ID. Stable enough that retries don't double-write. */
  generateLocalId(): string {
    return `loc_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  async enqueue(event: Omit<OutboxEvent, 'status' | 'createdAt'>): Promise<OutboxEvent> {
    const db = await this.getDb();
    const full: OutboxEvent = {
      ...event,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).add(full);
      tx.oncomplete = () => resolve(full);
      tx.onerror = () => reject(tx.error);
    });
  }

  async markSynced(localId: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.get(localId);
      req.onsuccess = () => {
        const existing = req.result as OutboxEvent | undefined;
        if (existing) {
          existing.status = 'synced';
          existing.syncedAt = new Date().toISOString();
          store.put(existing);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async listPending(): Promise<OutboxEvent[]> {
    return this.listByStatus('pending');
  }

  async listAll(): Promise<OutboxEvent[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result as OutboxEvent[])
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      req.onerror = () => reject(req.error);
    });
  }

  private async listByStatus(status: 'pending' | 'synced'): Promise<OutboxEvent[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).index('status').getAll(status);
      req.onsuccess = () => resolve(req.result as OutboxEvent[]);
      req.onerror = () => reject(req.error);
    });
  }
}
