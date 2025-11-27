import type { Risk, Control } from "@shared/schema";

export type ValidationAction = "validated" | "observed" | "rejected";
export type ValidationType = "risk" | "control" | "action-plan" | "risk-process-link";
export type BulkActionTarget = "risks" | "controls" | "action-plans";

export interface ProcessValidationDashboard {
  macroprocesoId: string;
  processName: string;
  processOwner: string;
  validationStatus: 'pending' | 'in_progress' | 'completed';
  totalRisks: number;
  validatedRisks: number;
  pendingRisks: number;
  totalControls: number;
  validatedControls: number;
  pendingControls: number;
  completionPercentage: number;
  lastValidatedAt?: string;
}

export interface RiskProcessLink {
  id: string;
  riskId: string;
  risk?: Risk;
  macroprocesoId?: string;
  macroproceso?: { id: string; name: string; ownerId?: string };
  processId?: string;
  process?: { id: string; name: string; ownerId?: string };
  subprocesoId?: string;
  subproceso?: { id: string; name: string; ownerId?: string };
  responsibleUser?: { id: string; fullName: string; email?: string };
  validationStatus?: string;
  validationComments?: string;
  validatedAt?: string;
  validatedBy?: string;
  notifiedAt?: string;
}

export interface ValidationHistoryItem {
  id: string;
  riskCode?: string;
  riskName?: string;
}
