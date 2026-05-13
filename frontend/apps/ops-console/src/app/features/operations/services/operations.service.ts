import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

export interface OptimizerEntry {
  proposedPosition: number;
  lotId: string;
  customerId: string;
  weightIntakeKg: number | null;
  enteredAt: string;
  dwellSeconds: number;
  groupKey: string;       // primary breed bucket, "MIXED" if no breed code
  reasoning: string;      // human-readable why-this-position
}

import {
  CreateCustomerRequest,
  CreateReservationRequest,
  Customer,
  EquipmentRun,
  EquipmentRunLot,
  IntakeRequest,
  Lot,
  LotDetailFull,
  QueueEntry,
  Reservation,
  ReservationStatus,
  StageQueueSummary,
  TransitionWithEquipmentRequest,
} from '@pindraft/api-client';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OperationsService {
  private http = inject(HttpClient);

  // Customers
  listCustomers(tenantId: string): Observable<Customer[]> {
    return this.http.get<Customer[]>(`/api/v1/tenants/${tenantId}/customers`);
  }
  createCustomer(tenantId: string, req: CreateCustomerRequest): Observable<Customer> {
    return this.http.post<Customer>(`/api/v1/tenants/${tenantId}/customers`, req);
  }

  // Reservations
  listReservations(tenantId: string, status?: ReservationStatus): Observable<Reservation[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<Reservation[]>(`/api/v1/tenants/${tenantId}/reservations`, { params });
  }
  getReservation(tenantId: string, id: string): Observable<Reservation> {
    return this.http.get<Reservation>(`/api/v1/tenants/${tenantId}/reservations/${id}`);
  }
  createReservation(tenantId: string, req: CreateReservationRequest): Observable<Reservation> {
    return this.http.post<Reservation>(`/api/v1/tenants/${tenantId}/reservations`, req);
  }
  cancelReservation(tenantId: string, id: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/tenants/${tenantId}/reservations/${id}`);
  }

  // Lots
  listLots(tenantId: string): Observable<Lot[]> {
    return this.http.get<Lot[]>(`/api/v1/tenants/${tenantId}/lots`);
  }
  getLot(tenantId: string, id: string): Observable<LotDetailFull> {
    return this.http.get<LotDetailFull>(`/api/v1/tenants/${tenantId}/lots/${id}`);
  }
  intake(tenantId: string, req: IntakeRequest): Observable<Lot> {
    return this.http.post<Lot>(`/api/v1/tenants/${tenantId}/lots/intake`, req);
  }
  transitionLot(tenantId: string, lotId: string, req: TransitionWithEquipmentRequest): Observable<Lot> {
    return this.http.post<Lot>(`/api/v1/tenants/${tenantId}/lots/${lotId}/transition`, req);
  }

  // Lot completion — closes the open stage event, marks the lot COMPLETED, and
  // triggers invoice auto-generation via LotCompletedEvent on the backend.
  completeLot(tenantId: string, lotId: string, finalWeightKg?: number): Observable<Lot> {
    const body = finalWeightKg ? { finalWeightKg } : {};
    return this.http.post<Lot>(`/api/v1/tenants/${tenantId}/lots/${lotId}/complete`, body);
  }

  // Lot split — parent is closed and marked COMPLETED; N child lots are created
  // inheriting pricing snapshot and current stage; lineage rows tie them together.
  splitLot(tenantId: string, lotId: string, children: { weightKg: number; notes?: string }[]): Observable<Lot[]> {
    return this.http.post<Lot[]>(`/api/v1/tenants/${tenantId}/lots/${lotId}/split`, { children });
  }

  // Walk-in intake — no prior reservation. Operator picks customer + pricing directly.
  walkInIntake(tenantId: string, req: {
    customerId: string;
    pricingArrangementId?: string;
    poolId?: string;
    fleeces: { weightKg: number; sourceAnimalName?: string; breedCode?: string; notes?: string }[];
  }): Observable<Lot> {
    return this.http.post<Lot>(`/api/v1/tenants/${tenantId}/lots/walk-in-intake`, req);
  }

  // Wool-pool batching — sums contributions into one pooled lot and writes MERGE
  // lineage rows for any contributions that carry an upstream source lot.
  intakeFromPool(tenantId: string, poolId: string): Observable<Lot> {
    return this.http.post<Lot>(
      `/api/v1/tenants/${tenantId}/lots/intake-from-pool`, { poolId });
  }

  // Queues
  listQueueSummaries(tenantId: string): Observable<StageQueueSummary[]> {
    return this.http.get<StageQueueSummary[]>(`/api/v1/tenants/${tenantId}/queues`);
  }
  queueForStage(tenantId: string, stageId: string): Observable<QueueEntry[]> {
    return this.http.get<QueueEntry[]>(`/api/v1/tenants/${tenantId}/queues/${stageId}`);
  }

  /**
   * Optimizer's proposed sequence for a stage's queue. Returns proposed positions
   * with reasoning strings — operator can accept or override (non-binding).
   */
  optimizerProposal(tenantId: string, stageId: string): Observable<OptimizerEntry[]> {
    return this.http.get<OptimizerEntry[]>(
      `/api/v1/tenants/${tenantId}/queues/${stageId}/optimizer-proposal`);
  }

  // Equipment runs
  listOpenEquipmentRuns(tenantId: string): Observable<EquipmentRun[]> {
    return this.http.get<EquipmentRun[]>(`/api/v1/tenants/${tenantId}/equipment-runs`);
  }
  lotsInRun(tenantId: string, runId: string): Observable<EquipmentRunLot[]> {
    return this.http.get<EquipmentRunLot[]>(`/api/v1/tenants/${tenantId}/equipment-runs/${runId}/lots`);
  }
  closeRun(tenantId: string, runId: string): Observable<EquipmentRun> {
    return this.http.post<EquipmentRun>(`/api/v1/tenants/${tenantId}/equipment-runs/${runId}/close`, {});
  }
}
