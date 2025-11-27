import { useQuery } from "@tanstack/react-query";

export interface RiskBand {
  label: string;
  min: number;
  max: number;
  color: string;
}

export interface RiskMathConfig {
  ranges: {
    lowMax: number;
    mediumMax: number;
    highMax: number;
  };
  decimals: {
    enabled: boolean;
    precision: number;
  };
}

/**
 * Hook para cálculos matemáticos de riesgos
 * Centraliza toda la lógica de cálculo inherente, residual, clasificación y colores
 */
export function useRiskMath() {
  // Obtener configuración de rangos de riesgo
  const { data: rangesData } = useQuery<{ lowMax: number; mediumMax: number; highMax: number }>({
    queryKey: ["/api/system-config/risk-level-ranges"],
  });

  // Obtener configuración de decimales
  const { data: decimalsData } = useQuery<{ enabled: boolean; precision: number }>({
    queryKey: ["/api/system-config/risk-decimals"],
  });

  const ranges = rangesData || { lowMax: 6, mediumMax: 12, highMax: 19 };
  const decimals = decimalsData || { enabled: false, precision: 0 };

  /**
   * Redondea un valor según la configuración de decimales
   */
  const round = (value: number): number => {
    if (!decimals.enabled || decimals.precision === 0) {
      return Math.round(value);
    }
    const factor = Math.pow(10, decimals.precision);
    return Math.round(value * factor) / factor;
  };

  /**
   * Calcula el riesgo inherente (P × I)
   */
  const inherent = (probability: number, impact: number): number => {
    return round(probability * impact);
  };

  /**
   * Combina efectividades de múltiples controles
   * Soporta dos métodos: suma con tope y compuesto
   */
  const combineControls = (
    effectivenesses: number[],
    mode: 'sum' | 'compound' = 'compound',
    maxEffectiveness: number = 0.9
  ): number => {
    if (!effectivenesses || effectivenesses.length === 0) return 0;

    // Convertir efectividades de 0-100 a 0-1
    const normalized = effectivenesses.map(e => e / 100);

    if (mode === 'sum') {
      // Modo suma: sumar todas las efectividades con tope
      const sum = normalized.reduce((acc, e) => acc + e, 0);
      return Math.min(sum, maxEffectiveness);
    }

    // Modo compuesto: 1 - ∏(1 - eᵢ)
    const product = normalized.reduce((acc, e) => acc * (1 - e), 1);
    const combined = 1 - product;
    return Math.min(combined, maxEffectiveness);
  };

  /**
   * Calcula el riesgo residual aplicando efectividad de controles
   */
  const residualFromControls = (
    inherentScore: number,
    combinedEffectiveness: number
  ): number => {
    const residual = inherentScore * (1 - combinedEffectiveness);
    return round(residual);
  };

  /**
   * Obtiene las bandas de riesgo basadas en la configuración actual
   */
  const getBands = (): RiskBand[] => {
    return [
      {
        label: "Bajo",
        min: 1,
        max: ranges.lowMax,
        color: "#22c55e", // green-500
      },
      {
        label: "Medio",
        min: ranges.lowMax + 1,
        max: ranges.mediumMax,
        color: "#eab308", // yellow-500
      },
      {
        label: "Alto",
        min: ranges.mediumMax + 1,
        max: ranges.highMax,
        color: "#f97316", // orange-500
      },
      {
        label: "Extremo",
        min: ranges.highMax + 1,
        max: 25,
        color: "#ef4444", // red-500
      },
    ];
  };

  /**
   * Clasifica un score de riesgo en su banda correspondiente
   */
  const classify = (score: number): RiskBand => {
    const bands = getBands();
    const band = bands.find(b => score >= b.min && score <= b.max);
    return band || bands[0]; // Default a "Bajo" si no se encuentra
  };

  /**
   * Obtiene el color para un score de riesgo
   */
  const colorFor = (score: number): string => {
    return classify(score).color;
  };

  /**
   * Calcula el promedio ponderado de dimensiones con pesos
   */
  const weightedAverage = (
    dimensions: number[],
    weights: number[]
  ): number => {
    if (dimensions.length !== weights.length) {
      throw new Error("Dimensions and weights arrays must have the same length");
    }

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight === 0) return 0;

    const weightedSum = dimensions.reduce((sum, dim, i) => sum + dim * weights[i], 0);
    return round(weightedSum / totalWeight);
  };

  /**
   * Calcula el riesgo residual completo desde datos de riesgo y controles
   */
  const calculateResidual = (
    probability: number,
    impact: number,
    controlEffectiveness: number[]
  ): {
    inherentScore: number;
    residualScore: number;
    effectivenessReduction: number;
  } => {
    const inherentScore = inherent(probability, impact);
    const combinedEff = combineControls(controlEffectiveness);
    const residualScore = residualFromControls(inherentScore, combinedEff);

    return {
      inherentScore,
      residualScore,
      effectivenessReduction: combinedEff,
    };
  };

  return {
    // Configuración
    ranges,
    decimals,
    
    // Funciones básicas
    round,
    inherent,
    combineControls,
    residualFromControls,
    
    // Clasificación y colores
    getBands,
    classify,
    colorFor,
    
    // Utilidades
    weightedAverage,
    calculateResidual,
  };
}
