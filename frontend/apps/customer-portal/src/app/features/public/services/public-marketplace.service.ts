import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export type ListingKind = 'FLEECE' | 'ROVING' | 'YARN' | 'BLANK' | 'OTHER';

export interface PublicListing {
  id: string;
  tenantId: string;
  millName: string;
  kind: ListingKind;
  title: string;
  description: string | null;
  pricePerKg: number;
  quantityKg: number;
  traceSlug: string | null;
  publishedAt: string;
}

export interface MillSummary {
  id: string;
  name: string;
  listingCount: number;
}

export interface MillDetail {
  id: string;
  name: string;
  defaultUnit: string;
  timeZone: string;
  listingCount: number;
}

@Injectable({ providedIn: 'root' })
export class PublicMarketplaceService {
  private http = inject(HttpClient);

  browse(kind?: ListingKind): Observable<PublicListing[]> {
    let params = new HttpParams();
    if (kind) params = params.set('kind', kind);
    return this.http.get<PublicListing[]>('/api/v1/public/listings', { params });
  }

  getListing(id: string): Observable<PublicListing> {
    return this.http.get<PublicListing>(`/api/v1/public/listings/${id}`);
  }

  listMills(): Observable<MillSummary[]> {
    return this.http.get<MillSummary[]>('/api/v1/public/mills');
  }

  getMill(id: string): Observable<MillDetail> {
    return this.http.get<MillDetail>(`/api/v1/public/mills/${id}`);
  }
}
