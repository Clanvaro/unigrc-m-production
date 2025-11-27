/**
 * Helper functions for calculating aggregated risk validation status
 * across multiple process links
 */

export type ValidationStatus = 'pending_validation' | 'validated' | 'observed' | 'rejected';

export type AggregatedValidationStatus = 
  | 'validated'           // Todos los procesos validaron
  | 'partially_validated' // Algunos validaron, otros pendientes
  | 'pending_validation'  // Ninguno ha validado aún
  | 'rejected'            // Al menos uno rechazó
  | 'observed';           // Al menos uno observó (sin rechazos)

export interface ProcessValidationInfo {
  processId?: string;
  macroprocesoId?: string;
  subprocesoId?: string;
  processName?: string;
  macroprocesoName?: string;
  subprocesoName?: string;
  validationStatus: ValidationStatus;
  validatedBy?: string;
  validatedAt?: Date;
  validationComments?: string;
  responsibleName?: string;
}

export interface AggregatedValidationResult {
  aggregatedStatus: AggregatedValidationStatus;
  statusLabel: string;
  statusIcon: string;
  totalLinks: number;
  validatedCount: number;
  observedCount: number;
  rejectedCount: number;
  pendingCount: number;
  processValidations: ProcessValidationInfo[];
}

/**
 * Calcula el estado agregado de validación de un riesgo
 * basándose en los estados de validación de sus enlaces con procesos
 */
export function calculateAggregatedValidationStatus(
  processLinks: ProcessValidationInfo[]
): AggregatedValidationResult {
  const totalLinks = processLinks.length;
  
  if (totalLinks === 0) {
    return {
      aggregatedStatus: 'pending_validation',
      statusLabel: 'Sin procesos asociados',
      statusIcon: '⚠️',
      totalLinks: 0,
      validatedCount: 0,
      observedCount: 0,
      rejectedCount: 0,
      pendingCount: 0,
      processValidations: [],
    };
  }

  const validatedCount = processLinks.filter(
    link => link.validationStatus === 'validated'
  ).length;
  
  const observedCount = processLinks.filter(
    link => link.validationStatus === 'observed'
  ).length;
  
  const rejectedCount = processLinks.filter(
    link => link.validationStatus === 'rejected'
  ).length;
  
  const pendingCount = processLinks.filter(
    link => link.validationStatus === 'pending_validation'
  ).length;

  let aggregatedStatus: AggregatedValidationStatus;
  let statusLabel: string;
  let statusIcon: string;

  // Lógica de agregación:
  // 1. Si hay al menos un rechazo -> "rejected"
  // 2. Si hay al menos una observación (sin rechazos) -> "observed"
  // 3. Si todos están validados -> "validated"
  // 4. Si algunos validados y otros pendientes -> "partially_validated"
  // 5. Si todos pendientes -> "pending_validation"

  if (rejectedCount > 0) {
    aggregatedStatus = 'rejected';
    statusLabel = `Rechazado (${rejectedCount}/${totalLinks})`;
    statusIcon = '❌';
  } else if (observedCount > 0) {
    aggregatedStatus = 'observed';
    statusLabel = `Observado (${observedCount}/${totalLinks})`;
    statusIcon = '👁️';
  } else if (validatedCount === totalLinks) {
    aggregatedStatus = 'validated';
    statusLabel = 'Totalmente validado';
    statusIcon = '✅';
  } else if (validatedCount > 0 && pendingCount > 0) {
    aggregatedStatus = 'partially_validated';
    statusLabel = `Parcialmente validado (${validatedCount}/${totalLinks})`;
    statusIcon = '⚠️';
  } else {
    aggregatedStatus = 'pending_validation';
    statusLabel = 'Pendiente de validación';
    statusIcon = '⏳';
  }

  return {
    aggregatedStatus,
    statusLabel,
    statusIcon,
    totalLinks,
    validatedCount,
    observedCount,
    rejectedCount,
    pendingCount,
    processValidations: processLinks,
  };
}

/**
 * Obtiene un label amigable para un estado de validación individual
 */
export function getValidationStatusLabel(status: ValidationStatus): string {
  const labels: Record<ValidationStatus, string> = {
    'pending_validation': 'Pendiente',
    'validated': 'Validado',
    'observed': 'Observado',
    'rejected': 'Rechazado',
  };
  return labels[status] || status;
}

/**
 * Obtiene un ícono para un estado de validación individual
 */
export function getValidationStatusIcon(status: ValidationStatus): string {
  const icons: Record<ValidationStatus, string> = {
    'pending_validation': '⏳',
    'validated': '✅',
    'observed': '👁️',
    'rejected': '❌',
  };
  return icons[status] || '❓';
}

/**
 * Obtiene el nombre del proceso/macroproceso/subproceso
 */
export function getProcessDisplayName(validation: ProcessValidationInfo): string {
  if (validation.subprocesoName) {
    return validation.subprocesoName;
  }
  if (validation.processName) {
    return validation.processName;
  }
  if (validation.macroprocesoName) {
    return validation.macroprocesoName;
  }
  return 'Proceso sin nombre';
}
