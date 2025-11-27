// Cálculo de probabilidad basado en 5 factores con pesos específicos (SISTEMA LEGACY)
export interface ProbabilityFactors {
  frequencyOccurrence: number; // 1-5: Frecuencia de ocurrencia
  exposureVolume: number; // 1-5: Exposición volumen/valor
  exposureMassivity: number; // 1-5: Masividad personas/áreas
  exposureCriticalPath: number; // 1-5: Ruta crítica Core/Soporte
  complexity: number; // 1-5: Complejidad e interdependencias
  changeVolatility: number; // 1-5: Cambio/volatilidad y proximidad
  vulnerabilities: number; // 1-5: Vulnerabilidades/predisposiciones
}

// ============= SISTEMA DINÁMICO DE CRITERIOS DE PROBABILIDAD =============

// Tipo para criterios de probabilidad dinámicos
export interface DynamicCriterion {
  id: string;
  name: string;
  fieldName: string;
  description: string | null;
  weight: number;
  order: number;
  isActive: boolean;
}

// Factores de probabilidad dinámicos - objeto con claves dinámicas
export interface DynamicProbabilityFactors {
  [fieldName: string]: number; // 1-5: valor del factor
}

// Pesos dinámicos basados en los criterios activos
export interface DynamicProbabilityWeights {
  [fieldName: string]: number; // peso porcentual
}

// Pesos por defecto para cada factor (en porcentajes, suman 100)
export const PROBABILITY_WEIGHTS = {
  frequency: 25, // 25%
  exposureAndScope: 25, // 25%
  complexity: 20, // 20%
  changeVolatility: 15, // 15%
  vulnerabilities: 15, // 15%
} as const;

/**
 * Calcula el factor compuesto de Exposición y Alcance
 * Como promedio de: Exposición (volumen/valor), Masividad y Ruta Crítica
 */
export function calculateExposureAndScope(
  exposureVolume: number,
  exposureMassivity: number,
  exposureCriticalPath: number
): number {
  return Math.round((exposureVolume + exposureMassivity + exposureCriticalPath) / 3);
}

// Interface para pesos configurables
export interface ProbabilityWeights {
  frequency: number;
  exposureAndScope: number;
  complexity: number;
  changeVolatility: number;
  vulnerabilities: number;
}

/**
 * Calcula la probabilidad final basada en los 5 factores y sus pesos
 * Retorna un valor entre 1 y 5 (redondeado)
 * @param factors Los factores de probabilidad (1-5 cada uno)
 * @param weights Pesos configurables opcionales. Si no se proporcionan, usa los valores por defecto
 */
export function calculateProbability(factors: ProbabilityFactors, weights?: ProbabilityWeights): number {
  // Usar pesos configurables si se proporcionan, caso contrario usar los por defecto
  const finalWeights = weights || {
    frequency: PROBABILITY_WEIGHTS.frequency,
    exposureAndScope: PROBABILITY_WEIGHTS.exposureAndScope,
    complexity: PROBABILITY_WEIGHTS.complexity,
    changeVolatility: PROBABILITY_WEIGHTS.changeVolatility,
    vulnerabilities: PROBABILITY_WEIGHTS.vulnerabilities,
  };

  // Calcular factor compuesto de exposición y alcance
  const exposureAndScopeScore = calculateExposureAndScope(
    factors.exposureVolume,
    factors.exposureMassivity,
    factors.exposureCriticalPath
  );

  // Aplicar pesos a cada factor
  const weightedSum = 
    (factors.frequencyOccurrence * finalWeights.frequency / 100) +
    (exposureAndScopeScore * finalWeights.exposureAndScope / 100) +
    (factors.complexity * finalWeights.complexity / 100) +
    (factors.changeVolatility * finalWeights.changeVolatility / 100) +
    (factors.vulnerabilities * finalWeights.vulnerabilities / 100);

  // Redondear al entero más cercano y asegurar que esté entre 1 y 5
  const result = Math.round(weightedSum);
  return Math.max(1, Math.min(5, result));
}

/**
 * Obtiene la descripción textual de un factor de frecuencia
 */
export function getFrequencyDescription(value: number): string {
  const descriptions = {
    1: "Casi nunca (Anual o menos)",
    2: "Improbable (Mensual)",
    3: "Moderado (Semanal)",
    4: "Probable (Diario)",
    5: "Casi cierto (Varias veces al día)"
  };
  return descriptions[value as keyof typeof descriptions] || "Desconocido";
}

/**
 * Obtiene la descripción textual de un factor de exposición volumen
 */
export function getExposureVolumeDescription(value: number): string {
  const descriptions = {
    1: "Bajo",
    2: "Bajo/Moderado",
    3: "Moderado",
    4: "Moderado/Alto",
    5: "Alto"
  };
  return descriptions[value as keyof typeof descriptions] || "Desconocido";
}

/**
 * Obtiene la descripción textual de un factor de masividad
 */
export function getMassivityDescription(value: number): string {
  const descriptions = {
    1: "1 persona",
    2: "2-5 personas",
    3: "1 área",
    4: "2-3 áreas",
    5: "≥4 áreas/organización"
  };
  return descriptions[value as keyof typeof descriptions] || "Desconocido";
}

/**
 * Obtiene la descripción textual de un factor de ruta crítica
 */
export function getCriticalPathDescription(value: number): string {
  const descriptions = {
    1: "Soporte no crítico",
    2: "Soporte relevante",
    3: "Mixto (Soporte/Core)",
    4: "Core relevante",
    5: "Core crítico"
  };
  return descriptions[value as keyof typeof descriptions] || "Desconocido";
}

/**
 * Obtiene la descripción textual de un factor de complejidad
 */
export function getComplexityDescription(value: number): string {
  const descriptions = {
    1: "1 sistema, 0 integraciones, sin terceros, ≥80% automatizado",
    2: "2 sistemas, 1 integración, 1 tercero no crítico",
    3: "3-4 sistemas, 2-3 integraciones, 1-2 terceros, 40-60% manual",
    4: "≥5 sistemas, ≥4 integraciones, ≥2 terceros críticos, 60-80% manual",
    5: "≥7 sistemas, múltiples terceros críticos, alta manualidad"
  };
  return descriptions[value as keyof typeof descriptions] || "Desconocido";
}

/**
 * Obtiene la descripción textual de un factor de cambio/volatilidad
 */
export function getChangeVolatilityDescription(value: number): string {
  const descriptions = {
    1: "Entorno estable; ≤1 cambio/año; ocurrencia >24 meses",
    2: "2-3 cambios/año; 12-24 meses",
    3: "Cambios trimestrales; 3-12 meses",
    4: "Cambios mensuales; 1-3 meses",
    5: "Cambios semanales; <1 mes"
  };
  return descriptions[value as keyof typeof descriptions] || "Desconocido";
}

/**
 * Obtiene la descripción textual de un factor de vulnerabilidades
 */
export function getVulnerabilitiesDescription(value: number): string {
  const descriptions = {
    1: "Sin vulnerabilidades; tecnología al día; SoD completa; rotación <5%",
    2: "1 vulnerabilidad menor; rotación 5-10%",
    3: "2-3 vulnerabilidades moderadas; rotación 10-15%",
    4: "Vulnerabilidades graves; rotación 15-25%",
    5: "Críticas (obsolescencia severa, sin SoD, dependencia total)"
  };
  return descriptions[value as keyof typeof descriptions] || "Desconocido";
}

// ============= FUNCIONES PARA EL SISTEMA DINÁMICO =============

/**
 * Calcula la probabilidad usando criterios dinámicos
 * @param factors Factores dinámicos con valores 1-5 para cada criterio
 * @param criteria Criterios activos con sus pesos configurados
 */
export function calculateDynamicProbability(
  factors: DynamicProbabilityFactors, 
  criteria: DynamicCriterion[]
): number {
  if (!criteria.length) {
    console.warn("No active criteria found for probability calculation");
    return 3; // Valor por defecto
  }

  // Filtrar solo criterios activos y ordenarlos
  const activeCriteria = criteria.filter(c => c.isActive).sort((a, b) => a.order - b.order);
  
  if (!activeCriteria.length) {
    console.warn("No active criteria found for probability calculation");
    return 3; // Valor por defecto
  }

  // Verificar que los pesos sumen 100
  const totalWeight = activeCriteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  if (totalWeight !== 100) {
    console.warn(`Total weight is ${totalWeight}, expected 100. Normalizing weights.`);
  }

  // Calcular suma ponderada
  let weightedSum = 0;
  let usedWeight = 0;

  for (const criterion of activeCriteria) {
    const factorValue = factors[criterion.fieldName];
    if (factorValue !== undefined) {
      const normalizedWeight = totalWeight === 100 ? criterion.weight : (criterion.weight / totalWeight * 100);
      weightedSum += (factorValue * normalizedWeight / 100);
      usedWeight += normalizedWeight;
    } else {
      console.warn(`Missing factor value for criterion: ${criterion.fieldName}`);
    }
  }

  // Si no se usaron todos los pesos, normalizar el resultado
  if (usedWeight > 0 && usedWeight !== 100) {
    weightedSum = (weightedSum / usedWeight) * 100;
  }

  // Redondear y asegurar que esté entre 1 y 5
  const result = Math.round(weightedSum);
  return Math.max(1, Math.min(5, result));
}