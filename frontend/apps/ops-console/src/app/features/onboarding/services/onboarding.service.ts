import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  CreateEquipmentRequest,
  CreatePricingTemplateRequest,
  CreateWorkflowStageRequest,
  Equipment,
  EquipmentType,
  PricingTemplate,
  ProcessingStageType,
  SetupStatusResponse,
  TenantProfile,
  UpdateProfileRequest,
  WorkflowStage,
} from '@pindraft/api-client';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private http = inject(HttpClient);

  // Setup status
  getSetupStatus(tenantId: string): Observable<SetupStatusResponse> {
    return this.http.get<SetupStatusResponse>(`/api/v1/tenants/${tenantId}/setup-status`);
  }
  goLive(tenantId: string): Observable<SetupStatusResponse> {
    return this.http.post<SetupStatusResponse>(`/api/v1/tenants/${tenantId}/go-live`, {});
  }

  // Mill profile
  getMillProfile(tenantId: string): Observable<TenantProfile> {
    return this.http.get<TenantProfile>(`/api/v1/tenants/${tenantId}/profile`);
  }
  updateMillProfile(tenantId: string, req: UpdateProfileRequest): Observable<TenantProfile> {
    return this.http.patch<TenantProfile>(`/api/v1/tenants/${tenantId}/profile`, req);
  }

  // Workflow stages
  listWorkflowStages(tenantId: string): Observable<WorkflowStage[]> {
    return this.http.get<WorkflowStage[]>(`/api/v1/tenants/${tenantId}/workflow-stages`);
  }
  createWorkflowStage(tenantId: string, req: CreateWorkflowStageRequest): Observable<WorkflowStage> {
    return this.http.post<WorkflowStage>(`/api/v1/tenants/${tenantId}/workflow-stages`, req);
  }
  renameWorkflowStage(tenantId: string, stageId: string, displayName: string): Observable<WorkflowStage> {
    return this.http.patch<WorkflowStage>(
      `/api/v1/tenants/${tenantId}/workflow-stages/${stageId}`, { displayName });
  }
  deleteWorkflowStage(tenantId: string, stageId: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/tenants/${tenantId}/workflow-stages/${stageId}`);
  }
  reorderWorkflowStages(tenantId: string, stageIds: string[]): Observable<void> {
    return this.http.post<void>(`/api/v1/tenants/${tenantId}/workflow-stages/reorder`, { stageIds });
  }

  // Equipment
  listEquipment(tenantId: string): Observable<Equipment[]> {
    return this.http.get<Equipment[]>(`/api/v1/tenants/${tenantId}/equipment`);
  }
  createEquipment(tenantId: string, req: CreateEquipmentRequest): Observable<Equipment> {
    return this.http.post<Equipment>(`/api/v1/tenants/${tenantId}/equipment`, req);
  }
  deactivateEquipment(tenantId: string, equipmentId: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/tenants/${tenantId}/equipment/${equipmentId}`);
  }

  // Pricing templates
  listPricingTemplates(tenantId: string): Observable<PricingTemplate[]> {
    return this.http.get<PricingTemplate[]>(`/api/v1/tenants/${tenantId}/pricing-templates`);
  }
  createPricingTemplate(tenantId: string, req: CreatePricingTemplateRequest): Observable<PricingTemplate> {
    return this.http.post<PricingTemplate>(`/api/v1/tenants/${tenantId}/pricing-templates`, req);
  }
  deactivatePricingTemplate(tenantId: string, id: string): Observable<void> {
    return this.http.delete<void>(`/api/v1/tenants/${tenantId}/pricing-templates/${id}`);
  }

  // Reference data
  listStageTypes(): Observable<ProcessingStageType[]> {
    return this.http.get<ProcessingStageType[]>('/api/v1/processing-stage-types');
  }
  listEquipmentTypes(): Observable<EquipmentType[]> {
    return this.http.get<EquipmentType[]>('/api/v1/equipment-types');
  }
}
