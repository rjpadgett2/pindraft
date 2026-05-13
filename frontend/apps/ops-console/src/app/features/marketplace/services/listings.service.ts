import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export type ListingKind = 'FLEECE' | 'ROVING' | 'YARN' | 'BLANK' | 'OTHER';
export type ListingStatus = 'DRAFT' | 'PUBLISHED' | 'SOLD' | 'ARCHIVED';

export interface Listing {
  id: string;
  tenantId: string;
  kind: ListingKind;
  title: string;
  description: string | null;
  pricePerKg: number;
  quantityKg: number;
  status: ListingStatus;
  traceSlug: string | null;
  createdAt: string;
  publishedAt: string | null;
}

export interface CreateListingRequest {
  kind: ListingKind;
  title: string;
  description?: string;
  pricePerKg: number;
  quantityKg: number;
  traceSlug?: string;
}

@Injectable({ providedIn: 'root' })
export class ListingsService {
  private http = inject(HttpClient);

  list(tenantId: string, status?: ListingStatus): Observable<Listing[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<Listing[]>(`/api/v1/tenants/${tenantId}/listings`, { params });
  }

  create(tenantId: string, req: CreateListingRequest): Observable<Listing> {
    return this.http.post<Listing>(`/api/v1/tenants/${tenantId}/listings`, req);
  }

  publish(tenantId: string, id: string): Observable<Listing> {
    return this.http.post<Listing>(`/api/v1/tenants/${tenantId}/listings/${id}/publish`, {});
  }

  markSold(tenantId: string, id: string): Observable<Listing> {
    return this.http.post<Listing>(`/api/v1/tenants/${tenantId}/listings/${id}/sold`, {});
  }

  archive(tenantId: string, id: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/tenants/${tenantId}/listings/${id}`);
  }
}
