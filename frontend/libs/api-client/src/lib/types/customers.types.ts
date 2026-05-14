// Tenant customer records and walk-in customer creation.

export interface Customer {
  id: string;
  /**
   * If non-null, this customer record is attached to a Pindraft user account.
   * Walk-ins have `userId === null` until the user registers and matches by
   * email (auto-link), an operator manually links them, or the customer
   * redeems a claim code via the customer portal.
   */
  userId: string | null;
  customerKind: 'SHEPHERD' | 'DESIGNER';
  displayName: string;
  email: string | null;
  externalSource: string | null;
  /**
   * Currently outstanding claim code for this record (operator can see it so
   * they can re-share it with the customer). Cleared once redeemed or expired.
   */
  activeClaimCode: string | null;
  claimCodeExpiresAt: string | null;
}

export interface CreateCustomerRequest {
  customerKind: 'SHEPHERD' | 'DESIGNER';
  displayName: string;
  email?: string;
}

/** Operator's user lookup result — 404 from the backend collapses to null in the client. */
export interface UserLookupResult {
  id: string;
  email: string;
  name: string;
}

/** Issued by `POST /tenants/{id}/customers/{customerId}/claim-code`. */
export interface ClaimCodeIssued {
  customerId: string;
  code: string;
  expiresAt: string;
}
