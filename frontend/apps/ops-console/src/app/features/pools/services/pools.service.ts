import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export type PoolKind = 'FINE_WOOL' | 'MEDIUM_WOOL' | 'LONG_WOOL' | 'COLORED_WOOL' | 'MIXED' | 'OTHER';
export type PoolStatus = 'ACCEPTING' | 'CLOSED' | 'DISTRIBUTED';

export interface Pool {
  id: string;
  name: string;
  description: string | null;
  kind: PoolKind;
  status: PoolStatus;
  totalRevenue: number | null;
  createdAt: string;
  closedAt: string | null;
  distributedAt: string | null;
}

export interface PoolContribution {
  id: string;
  customerId: string;
  customerDisplayName: string;
  weightKg: number;
  notes: string | null;
  acceptedAt: string;
}

export interface PoolShare {
  contributionId: string;
  customerId: string;
  customerDisplayName: string;
  weightKg: number;
  sharePercent: number;
  amountOwed: number | null;
}

export interface PoolDetail {
  pool: Pool;
  contributions: PoolContribution[];
  shares: PoolShare[];
}

export interface CreatePoolRequest {
  name: string;
  description?: string;
  kind: PoolKind;
}

export interface ContributionRequest {
  customerId: string;
  customerDisplayName: string;
  weightKg: number;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class PoolsService {
  private http = inject(HttpClient);

  list(tenantId: string): Observable<Pool[]> {
    return this.http.get<Pool[]>(`/api/v1/tenants/${tenantId}/pools`);
  }

  listAccepting(tenantId: string): Observable<Pool[]> {
    return this.http.get<Pool[]>(`/api/v1/tenants/${tenantId}/pools/accepting`);
  }

  getOne(tenantId: string, poolId: string): Observable<PoolDetail> {
    return this.http.get<PoolDetail>(`/api/v1/tenants/${tenantId}/pools/${poolId}`);
  }

  create(tenantId: string, req: CreatePoolRequest): Observable<Pool> {
    return this.http.post<Pool>(`/api/v1/tenants/${tenantId}/pools`, req);
  }

  contribute(tenantId: string, poolId: string, req: ContributionRequest): Observable<PoolContribution> {
    return this.http.post<PoolContribution>(
      `/api/v1/tenants/${tenantId}/pools/${poolId}/contributions`, req);
  }

  close(tenantId: string, poolId: string): Observable<Pool> {
    return this.http.post<Pool>(`/api/v1/tenants/${tenantId}/pools/${poolId}/close`, {});
  }

  distribute(tenantId: string, poolId: string, totalRevenue: number): Observable<Pool> {
    return this.http.post<Pool>(
      `/api/v1/tenants/${tenantId}/pools/${poolId}/distribute`, { totalRevenue });
  }
}
