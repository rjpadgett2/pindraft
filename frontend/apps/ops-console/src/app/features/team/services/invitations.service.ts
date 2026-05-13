import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
export type InviteRole = 'MILL_ADMIN' | 'MILL_OPERATOR';

export interface Invitation {
  id: string;
  tenantId: string;
  email: string;
  role: InviteRole;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt: string | null;
  invitedBy: string;
  createdAt: string;
}

export interface InvitationCreated {
  invitation: Invitation;
  acceptTokenPlaintext: string;  // shown ONCE — admin forwards the URL
}

export interface InvitationPublicInfo {
  tenantId: string;
  email: string;
  role: InviteRole;
  status: InvitationStatus;
  expiresAt: string;
}

export interface AcceptInput {
  password: string | null;
  name: string | null;
}

@Injectable({ providedIn: 'root' })
export class InvitationsService {
  private http = inject(HttpClient);

  invite(tenantId: string, email: string, role: InviteRole): Observable<InvitationCreated> {
    return this.http.post<InvitationCreated>(
      `/api/v1/tenants/${tenantId}/invitations`, { email, role });
  }

  list(tenantId: string): Observable<Invitation[]> {
    return this.http.get<Invitation[]>(`/api/v1/tenants/${tenantId}/invitations`);
  }

  revoke(tenantId: string, id: string): Observable<Invitation> {
    return this.http.post<Invitation>(
      `/api/v1/tenants/${tenantId}/invitations/${id}/revoke`, {});
  }

  // Public — no auth header
  lookup(token: string): Observable<InvitationPublicInfo> {
    return this.http.get<InvitationPublicInfo>(`/api/v1/invitations/${token}`);
  }

  accept(token: string, body: AcceptInput): Observable<{ userId: string; tenantId: string; role: string }> {
    return this.http.post<{ userId: string; tenantId: string; role: string }>(
      `/api/v1/invitations/${token}/accept`, body);
  }
}
