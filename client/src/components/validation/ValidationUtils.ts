import { getRiskLevelText } from "@/lib/risk-calculations";

export const isUUID = (str: string | null | undefined): boolean => {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const displayResponsible = (responsible: string | null | undefined): string => {
  if (!responsible || isUUID(responsible)) {
    return "N/A";
  }
  return responsible;
};

export const formatDate = (date: string | null | undefined): string => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString();
};

export const getRiskLevelColor = (riskValue: number | null | undefined): string => {
  if (riskValue === null || riskValue === undefined) return "bg-gray-100 text-gray-800";
  const level = getRiskLevelText(riskValue).toLowerCase();
  switch (level) {
    case "crítico":
      return "bg-red-100 text-red-800";
    case "alto":
      return "bg-orange-100 text-orange-800";
    case "medio":
      return "bg-yellow-100 text-yellow-800";
    case "bajo":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const getControlTypeText = (type: string): string => {
  const typeMap: Record<string, string> = {
    'preventive': 'Preventivo',
    'detective': 'Detectivo',
    'corrective': 'Correctivo',
  };
  return typeMap[type] || type;
};

export const getAutomationLevelText = (level: string): string => {
  const levelMap: Record<string, string> = {
    'manual': 'Manual',
    'semi_automated': 'Semi-automatizado',
    'automated': 'Automatizado',
  };
  return levelMap[level] || level;
};

export const getFrequencyText = (frequency: string): string => {
  const frequencyMap: Record<string, string> = {
    'continuous': 'Continuo',
    'daily': 'Diario',
    'weekly': 'Semanal',
    'monthly': 'Mensual',
    'quarterly': 'Trimestral',
    'annual': 'Anual',
    'on_demand': 'Bajo Demanda',
  };
  return frequencyMap[frequency] || frequency;
};

export const getEffectivenessText = (effectiveness: string): string => {
  const effectivenessMap: Record<string, string> = {
    'effective': 'Efectivo',
    'partially_effective': 'Parcialmente Efectivo',
    'not_effective': 'No Efectivo',
    'not_tested': 'No Probado',
  };
  return effectivenessMap[effectiveness] || effectiveness;
};

export const getValidationStatusInfo = (status: string): { label: string; colorClass: string } => {
  const statusMap: Record<string, { label: string; colorClass: string }> = {
    'pending_validation': { label: 'Pendiente', colorClass: 'bg-gray-100 text-gray-800' },
    'validated': { label: 'Aprobado', colorClass: 'bg-green-100 text-green-800' },
    'observed': { label: 'Observado', colorClass: 'bg-orange-100 text-orange-800' },
    'rejected': { label: 'Rechazado', colorClass: 'bg-red-100 text-red-800' },
  };
  return statusMap[status] || { label: status, colorClass: 'bg-gray-100 text-gray-800' };
};
