// Reservations, lots, intake, stage transitions, queues, equipment runs.

export type ReservationStatus = 'PENDING' | 'RECEIVED' | 'CANCELLED';

export interface Reservation {
  id: string;
  customerId: string;
  pricingArrangementId: string | null;
  expectedWeightKg: number;
  slotStart: string;
  status: ReservationStatus;
  externalSource: string | null;
}

export interface CreateReservationRequest {
  customerId: string;
  pricingArrangementId?: string;
  expectedWeightKg: number;
  slotStart: string;
}

export type LotStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface Lot {
  id: string;
  customerId: string;
  reservationId: string | null;
  poolId: string | null;
  currentStageId: string | null;
  weightIntakeKg: number | null;
  status: LotStatus;
  createdAt: string;
}

export interface LotFleece {
  id: string;
  weightKg: number;
  sourceAnimalName: string | null;
  breedCode: string | null;
  notes: string | null;
}

export interface LotDetail {
  lot: Lot;
  fleeces: LotFleece[];
}

export interface IntakeFleeceInput {
  weightKg: number;
  sourceAnimalName?: string;
  breedCode?: string;
  notes?: string;
}

export interface IntakeRequest {
  reservationId: string;
  poolId?: string;
  fleeces: IntakeFleeceInput[];
}

export interface LotHistoryEvent {
  id: string;
  workflowStageId: string;
  enteredAt: string;
  exitedAt: string | null;
  weightInKg: number | null;
  weightOutKg: number | null;
  actorUserId: string | null;
}

export interface LotDetailFull {
  lot: Lot & {
    pricingKindSnapshot: string | null;
    pricingConfigSnapshot: string | null;
  };
  fleeces: LotFleece[];
  history: LotHistoryEvent[];
}

export interface TransitionRequest {
  targetStageId?: string;
  weightOutKg: number;
  notes?: string;
}

export interface TransitionWithEquipmentRequest {
  targetStageId?: string;
  weightOutKg: number;
  equipmentId?: string;
  notes?: string;
}

export interface StageQueueSummary {
  stageId: string;
  displayName: string;
  stageType: string;
  orderIndex: number;
  waitingCount: number;
}

export interface QueueEntry {
  lotId: string;
  customerId: string;
  weightIntakeKg: number;
  enteredAt: string;
  weightInKg: number;
  dwellSeconds: number;
}

export interface EquipmentRun {
  id: string;
  equipmentId: string;
  startedAt: string;
  finishedAt: string | null;
  operatorId: string | null;
}

export interface EquipmentRunLot {
  id: string;
  equipmentRunId: string;
  lotId: string;
  weightInKg: number | null;
  weightOutKg: number | null;
}
