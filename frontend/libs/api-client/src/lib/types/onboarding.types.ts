// Setup status, workflow stages, equipment, tenant profile.

export interface SetupCategory {
  key: string;
  label: string;
  status: 'DONE' | 'PARTIAL' | 'NOT_STARTED';
  summary: string;
  whatsMissing: string;
}

export interface SetupStatusResponse {
  tenantId: string;
  tenantStatus: 'SETUP' | 'LIVE' | 'PAUSED';
  required: SetupCategory[];
  optional: SetupCategory[];
  readyToGoLive: boolean;
}

export interface WorkflowStage {
  id: string;
  stageType: string;
  displayName: string;
  orderIndex: number;
  requiresEquipment: boolean;
  tenantCustom: boolean;
}

export interface ProcessingStageType {
  code: string;
  name: string;
  description: string;
  typicalOrder: number;
}

export interface EquipmentType {
  code: string;
  name: string;
  description: string;
  stageCode: string;
}

export interface Equipment {
  id: string;
  equipmentType: string;
  name: string;
  workflowStageId: string | null;
  maxWeightKg: number | null;
  typicalRunMinutes: number | null;
}

export interface CreateWorkflowStageRequest {
  stageType: string;
  displayName: string;
  requiresEquipment: boolean;
}

export interface CreateEquipmentRequest {
  equipmentType: string;
  name: string;
  workflowStageId?: string;
  maxWeightKg?: number;
  typicalRunMinutes?: number;
}

export interface TenantProfile {
  id: string;
  name: string;
  status: 'SETUP' | 'LIVE' | 'PAUSED';
  defaultUnit: 'kg' | 'lb';
  timeZone: string;
}

export interface UpdateProfileRequest {
  name?: string;
  defaultUnit?: 'kg' | 'lb';
  timeZone?: string;
}
