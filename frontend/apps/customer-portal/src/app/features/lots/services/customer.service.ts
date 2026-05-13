import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface CustomerLot {
  id: string;
  tenantId: string;
  customerId: string;
  currentStageId: string | null;
  currentStageType: string | null;
  currentStageDisplayName: string | null;
  weightIntakeKg: number | null;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export interface CustomerFleece {
  id: string;
  weightKg: number;
  sourceAnimalName: string | null;
  breedCode: string | null;
}

export interface CustomerHistoryEvent {
  id: string;
  workflowStageId: string;
  stageType: string | null;
  stageDisplayName: string | null;
  enteredAt: string;
  exitedAt: string | null;
  weightInKg: number | null;
  weightOutKg: number | null;
}

export interface CustomerLotDetail {
  lot: CustomerLot;
  fleeces: CustomerFleece[];
  history: CustomerHistoryEvent[];
}

export interface TraceMeta {
  lotId: string;
  slug: string;
  publicVisible: boolean;
  customerDisplayName: string;
  intakeWeightKg: number;
  createdAt: string;
}

export interface CompletedStage {
  workflowStageId: string;
  stageType: string | null;
  stageDisplayName: string | null;
  enteredAt: string;
  exitedAt: string;
  weightOutKg: number | null;
}

export interface CurrentStage {
  workflowStageId: string;
  stageType: string | null;
  stageDisplayName: string | null;
  enteredAt: string;
  queuePosition: number;
}

export interface LotStatusProjection {
  lotId: string;
  lotStatus: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  customerVisibleStatus: string;  // e.g. "Scoured. Drying. In carding queue, position 7."
  completedStages: CompletedStage[];
  currentStage: CurrentStage | null;
}

export interface MeFiberTest {
  id: string;
  lotId: string;
  testType: string;
  instrument: string | null;
  resultNumeric: number | null;
  resultUnit: string | null;
  testedAt: string;
}

@Injectable({ providedIn: 'root' })
export class CustomerLotsService {
  private http = inject(HttpClient);

  listMyLots(): Observable<CustomerLot[]> {
    return this.http.get<CustomerLot[]>('/api/v1/me/lots');
  }

  getLot(lotId: string): Observable<CustomerLotDetail> {
    return this.http.get<CustomerLotDetail>(`/api/v1/me/lots/${lotId}`);
  }

  getTraceMeta(lotId: string): Observable<TraceMeta> {
    return this.http.get<TraceMeta>(`/api/v1/me/traces/${lotId}`);
  }

  setTraceVisibility(lotId: string, publicVisible: boolean): Observable<TraceMeta> {
    return this.http.patch<TraceMeta>(
      `/api/v1/me/traces/${lotId}/visibility`,
      { publicVisible }
    );
  }

  /** Customer-visible status projection — "Scoured. Drying. In spinning queue, position 7." */
  getLotStatus(lotId: string): Observable<LotStatusProjection> {
    return this.http.get<LotStatusProjection>(`/api/v1/me/lots/${lotId}/status`);
  }

  /** Fiber test results attached to one of my lots — feeds the lifetime micron view. */
  getFiberTests(lotId: string): Observable<MeFiberTest[]> {
    return this.http.get<MeFiberTest[]>(`/api/v1/me/lots/${lotId}/fiber-tests`);
  }
}
