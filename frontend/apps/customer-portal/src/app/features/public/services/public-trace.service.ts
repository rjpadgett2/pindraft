import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface TraceSegment {
  stageType: string;
  enteredAt: string;
  exitedAt: string | null;
  weightInKg: number | null;
  weightOutKg: number | null;
}

export interface PublicTraceResponse {
  slug: string;
  customerDisplayName: string;
  intakeWeightKg: number;
  createdAt: string;
  segments: TraceSegment[];
}

@Injectable({ providedIn: 'root' })
export class PublicTraceService {
  private http = inject(HttpClient);

  getBySlug(slug: string): Observable<PublicTraceResponse> {
    return this.http.get<PublicTraceResponse>(`/api/v1/public/trace/${slug}`);
  }
}
