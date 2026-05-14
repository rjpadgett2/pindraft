import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Customer } from '@pindraft/api-client';
import { Observable } from 'rxjs';

/**
 * Customer-portal self-service claim flow. The user enters a short code their mill
 * generated and handed to them (in person or out-of-band). The backend matches the
 * code to an unlinked tenant_customers row, attaches the user's account to it, and
 * returns the now-linked customer record so we can show a "you're linked to X"
 * confirmation.
 */
@Injectable({ providedIn: 'root' })
export class ClaimService {
  private http = inject(HttpClient);

  redeem(code: string): Observable<Customer> {
    return this.http.post<Customer>('/api/v1/me/claim', { code });
  }
}
