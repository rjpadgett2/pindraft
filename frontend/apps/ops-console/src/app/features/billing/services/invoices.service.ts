import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Hand-written types matching backend `co.pindraft.mill_ops.api.InvoiceController`.
 * Will be regenerated into `@pindraft/api-client` next time
 * `./gradlew :application:generateApiClient` runs against the live backend.
 */
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID';

export interface Invoice {
  id: string;
  tenantId: string;
  customerId: string;
  lotId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  subtotalCents: number;
  totalCents: number;
  currency: string;
  notes: string | null;
  issuedAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface InvoiceDetail {
  invoice: Invoice;
  lines: InvoiceLine[];
}

@Injectable({ providedIn: 'root' })
export class InvoicesService {
  private http = inject(HttpClient);

  list(tenantId: string, customerId?: string): Observable<Invoice[]> {
    let params = new HttpParams();
    if (customerId) params = params.set('customer_id', customerId);
    return this.http.get<Invoice[]>(`/api/v1/tenants/${tenantId}/invoices`, { params });
  }

  get(tenantId: string, id: string): Observable<InvoiceDetail> {
    return this.http.get<InvoiceDetail>(`/api/v1/tenants/${tenantId}/invoices/${id}`);
  }

  issue(tenantId: string, id: string): Observable<Invoice> {
    return this.http.post<Invoice>(`/api/v1/tenants/${tenantId}/invoices/${id}/issue`, {});
  }
  markPaid(tenantId: string, id: string): Observable<Invoice> {
    return this.http.post<Invoice>(`/api/v1/tenants/${tenantId}/invoices/${id}/mark-paid`, {});
  }
  voidInvoice(tenantId: string, id: string): Observable<Invoice> {
    return this.http.post<Invoice>(`/api/v1/tenants/${tenantId}/invoices/${id}/void`, {});
  }
}
