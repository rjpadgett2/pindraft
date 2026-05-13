// Tenant customer records and walk-in customer creation.

export interface Customer {
  id: string;
  customerKind: 'SHEPHERD' | 'DESIGNER';
  displayName: string;
  email: string | null;
  externalSource: string | null;
}

export interface CreateCustomerRequest {
  customerKind: 'SHEPHERD' | 'DESIGNER';
  displayName: string;
  email?: string;
}
