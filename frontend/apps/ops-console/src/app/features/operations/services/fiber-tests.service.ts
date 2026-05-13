import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export type FiberTestType = 'MICRON_DIAMETER' | 'COMFORT_FACTOR' | 'STAPLE_LENGTH' | 'IWTO_47_DISTRIBUTION';

export interface FiberTest {
  id: string;
  lotId: string;
  testType: FiberTestType;
  instrument: string | null;
  resultNumeric: number | null;
  resultUnit: string | null;
  resultJson: string | null;
  testedAt: string;
  createdAt: string;
}

export interface AttachTestRequest {
  testType: FiberTestType;
  instrument?: string;
  resultNumeric?: number;
  resultUnit?: string;
  resultJson?: string;
  testedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class FiberTestsService {
  private http = inject(HttpClient);

  list(tenantId: string, lotId: string): Observable<FiberTest[]> {
    return this.http.get<FiberTest[]>(
      `/api/v1/tenants/${tenantId}/lots/${lotId}/fiber-tests`);
  }

  attach(tenantId: string, lotId: string, req: AttachTestRequest): Observable<FiberTest> {
    return this.http.post<FiberTest>(
      `/api/v1/tenants/${tenantId}/lots/${lotId}/fiber-tests`, req);
  }
}
