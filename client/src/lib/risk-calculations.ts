export function calculateInherentRisk(probability: number, impact: number): number {
  return probability * impact;
}

// Legacy function for backward compatibility - use calculateResidualRiskFromControls for new logic
export function calculateResidualRisk(inherentRisk: number, controlEffectiveness: number): number {
  return Math.round((inherentRisk * (1 - controlEffectiveness / 100)) * 10) / 10;
}

// New calculation logic: controls affect probability and/or impact separately
export function calculateResidualProbability(
  inherentProbability: number, 
  controls: Array<{effectiveness: number, effectTarget: string}>
): number {
  // Apply only controls that affect probability
  const probabilityControls = controls.filter(c => c.effectTarget === 'probability' || c.effectTarget === 'both');
  
  if (probabilityControls.length === 0) {
    return inherentProbability;
  }

  // Apply effectiveness multiplicatively
  let residualProbability = inherentProbability;
  for (const control of probabilityControls) {
    const reductionFactor = 1 - (control.effectiveness / 100);
    residualProbability = residualProbability * reductionFactor;
  }

  // Ensure result is within valid range [0.1, 5] and round to 1 decimal
  return Math.max(0.1, Math.min(5, Math.round(residualProbability * 10) / 10));
}

export function calculateResidualImpact(
  inherentImpact: number, 
  controls: Array<{effectiveness: number, effectTarget: string}>
): number {
  // Apply only controls that affect impact
  const impactControls = controls.filter(c => c.effectTarget === 'impact' || c.effectTarget === 'both');
  
  if (impactControls.length === 0) {
    return inherentImpact;
  }

  // Apply effectiveness multiplicatively
  let residualImpact = inherentImpact;
  for (const control of impactControls) {
    const reductionFactor = 1 - (control.effectiveness / 100);
    residualImpact = residualImpact * reductionFactor;
  }

  // Ensure result is within valid range [0.1, 5] and round to 1 decimal
  return Math.max(0.1, Math.min(5, Math.round(residualImpact * 10) / 10));
}

export function calculateResidualRiskFromControls(
  inherentProbability: number, 
  inherentImpact: number, 
  controls: Array<{effectiveness: number, effectTarget: string}>
): number {
  const residualProbability = calculateResidualProbability(inherentProbability, controls);
  const residualImpact = calculateResidualImpact(inherentImpact, controls);
  
  // Final residual risk is the product of residual probability and impact
  // Ensure final result is at least 0.1 to prevent zero residual risk
  const finalRisk = residualProbability * residualImpact;
  return Math.max(0.1, Math.round(finalRisk * 10) / 10);
}

// Dynamic risk level calculation using configurable ranges
export function getRiskLevel(riskValue: number, ranges?: {lowMax: number, mediumMax: number, highMax: number}): number {
  // Use default values if ranges not provided
  const lowMax = ranges?.lowMax ?? 6;
  const mediumMax = ranges?.mediumMax ?? 12;
  const highMax = ranges?.highMax ?? 19;
  
  if (riskValue <= lowMax) return 1; // Low
  if (riskValue <= mediumMax) return 2; // Medium  
  if (riskValue <= highMax) return 3; // High
  return 4; // Critical
}

// Backward compatibility function - uses default ranges
export function getRiskLevelStatic(riskValue: number): number {
  return getRiskLevel(riskValue);
}

export function getRiskLevelText(riskValue: number, ranges?: {lowMax: number, mediumMax: number, highMax: number}): string {
  const level = getRiskLevel(riskValue, ranges);
  switch (level) {
    case 1: return "Bajo";
    case 2: return "Medio";
    case 3: return "Alto";
    case 4: return "Crítico";
    default: return "Desconocido";
  }
}

export function getRiskColor(riskValue: number, ranges?: {lowMax: number, mediumMax: number, highMax: number}): string {
  const level = getRiskLevel(riskValue, ranges);
  switch (level) {
    case 1: return "bg-green-100 text-green-800";
    case 2: return "bg-yellow-100 text-yellow-800";
    case 3: return "bg-orange-100 text-orange-800";
    case 4: return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

// Colores específicos para riesgo residual según rangos definidos por el usuario
export function getResidualRiskColor(riskValue: number): string {
  // Rangos específicos: Bajo (<1 y 1-6), Medio (7-12), Alto (13-19), Crítico (20-25)
  if (riskValue <= 6) {
    return "bg-green-500 text-white"; // Verde sólido (incluye valores < 1)
  } else if (riskValue >= 7 && riskValue <= 12) {
    return "bg-yellow-500 text-white"; // Amarillo sólido
  } else if (riskValue >= 13 && riskValue <= 19) {
    return "bg-orange-500 text-white"; // Naranja sólido
  } else if (riskValue >= 20 && riskValue <= 25) {
    return "bg-red-500 text-white"; // Rojo sólido
  } else {
    return "bg-gray-500 text-white"; // Gris para valores fuera de rango
  }
}

// Colores específicos para riesgo inherente usando los mismos rangos
export function getInherentRiskColor(riskValue: number): string {
  // Rangos específicos: Bajo (<1 y 1-6), Medio (7-12), Alto (13-19), Crítico (20-25)
  if (riskValue <= 6) {
    return "bg-green-500 text-white"; // Verde sólido (incluye valores < 1)
  } else if (riskValue >= 7 && riskValue <= 12) {
    return "bg-yellow-500 text-white"; // Amarillo sólido
  } else if (riskValue >= 13 && riskValue <= 19) {
    return "bg-orange-500 text-white"; // Naranja sólido
  } else if (riskValue >= 20 && riskValue <= 25) {
    return "bg-red-500 text-white"; // Rojo sólido
  } else {
    return "bg-gray-500 text-white"; // Gris para valores fuera de rango
  }
}

// Hook to fetch and manage risk level ranges
export async function getRiskLevelRanges(): Promise<{lowMax: number, mediumMax: number, highMax: number}> {
  try {
    const response = await fetch('/api/system-config/risk-level-ranges');
    if (!response.ok) {
      throw new Error('Failed to fetch risk level ranges');
    }
    return await response.json();
  } catch (error) {
    // Return default values if fetch fails
    console.warn('Using default risk level ranges:', error);
    return { lowMax: 6, mediumMax: 12, highMax: 19 };
  }
}
