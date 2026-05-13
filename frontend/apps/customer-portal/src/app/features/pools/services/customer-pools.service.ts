import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export type PoolKind = 'FINE_WOOL' | 'MEDIUM_WOOL' | 'LONG_WOOL' | 'COLORED_WOOL' | 'MIXED' | 'OTHER';
export type PoolStatus = 'ACCEPTING' | 'CLOSED' | 'DISTRIBUTED';

export interface CustomerPoolShare {
  weightKg: number;
  sharePercent: number;
  amountOwed: number | null;
}

export interface CustomerPoolMembership {
  poolId: string;
  tenantId: string;
  name: string;
  description: string | null;
  kind: PoolKind;
  status: PoolStatus;
  totalRevenue: number | null;
  createdAt: string;
  closedAt: string | null;
  distributedAt: string | null;
  myTotalWeight: number;
  myShares: CustomerPoolShare[];
}

@Injectable({ providedIn: 'root' })
export class CustomerPoolsService {
  private http = inject(HttpClient);

  listMyPools(): Observable<CustomerPoolMembership[]> {
    return this.http.get<CustomerPoolMembership[]>('/api/v1/me/pools');
  }
}
