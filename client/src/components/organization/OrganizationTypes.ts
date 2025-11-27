import type { Macroproceso, Process, Subproceso, ProcessOwner } from "@shared/schema";

export interface MacroprocesoWithRisks extends Macroproceso {
  inherentRisk?: number;
  residualRisk?: number;
  riskCount?: number;
  owner?: ProcessOwner | null;
}

export interface ProcessWithRisks extends Process {
  inherentRisk?: number;
  residualRisk?: number;
  riskCount?: number;
  owner?: ProcessOwner | null;
}

export interface SubprocesoWithRisks extends Subproceso {
  inherentRisk?: number;
  residualRisk?: number;
  riskCount?: number;
  owner?: ProcessOwner | null;
}
