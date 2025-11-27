import { calculateProbability, type ProbabilityFactors } from "@shared/probability-calculation";
import BaseFactorWheel, { type GenericFactor } from "@/components/shared/BaseFactorWheel";
import { useQuery } from "@tanstack/react-query";

type ProbabilityFactorKey = keyof ProbabilityFactors;

interface ProbabilityCriterion {
  id: string;
  name: string;
  fieldName: string;
  description: string;
  weight: number;
  order: number;
  isActive: boolean;
  level1Description?: string;
  level2Description?: string;
  level3Description?: string;
  level4Description?: string;
  level5Description?: string;
  createdAt: string;
  updatedAt: string;
}

// Default fallback descriptions if API fails
const defaultProbabilityFactors: GenericFactor<ProbabilityFactorKey>[] = [
  {
    key: "frequencyOccurrence",
    name: "Frecuencia de Ocurrencia",
    shortName: "Frecuencia",
    icon: "🔁",
    color: "#3b82f6", // blue
    description: "Corresponde a la frecuencia de actividad asociada al riesgo",
    descriptions: [
      "Muy rara vez ≥24 meses",
      "Rara vez: 12-24 meses", 
      "Ocasional: 3-12 meses",
      "Probable: 1-3 meses",
      "Muy probable: <1 mes"
    ]
  },
  {
    key: "exposureVolume",
    name: "Exposición Volumen",
    shortName: "Volumen", 
    icon: "💰",
    color: "#10b981", // emerald
    description: "Volumen monetario o porcentaje de ingresos expuesto al riesgo",
    descriptions: [
      "≤$1M o ≤5% ingresos",
      "$1M-$5M o 5-15%",
      "$5M-$20M o 15-30%", 
      "$20M-$50M o 30-50%",
      ">$50M o >50% ingresos"
    ]
  },
  {
    key: "exposureMassivity",
    name: "Masividad",
    shortName: "Masividad",
    icon: "👥",
    color: "#f59e0b", // amber
    description: "Cantidad de personas y áreas geográficas afectadas por el riesgo",
    descriptions: [
      "≤10 personas/1 área",
      "11-50 personas/2-3 áreas",
      "51-200 personas/múltiples áreas",
      "201-1000 personas/regional", 
      ">1000 personas/nacional"
    ]
  },
  {
    key: "exposureCriticalPath",
    name: "Ruta Crítica", 
    shortName: "Crítico",
    icon: "⚡",
    color: "#ef4444", // red
    description: "Importancia estratégica del proceso o actividad para la organización",
    descriptions: [
      "Soporte - No crítico",
      "Soporte - Importante",
      "Core - Secundario",
      "Core - Principal", 
      "Core - Crítico vital"
    ]
  },
  {
    key: "complexity",
    name: "Complejidad",
    shortName: "Complej.",
    icon: "🔧", 
    color: "#8b5cf6", // violet
    description: "Nivel de complejidad técnica y operacional del proceso",
    descriptions: [
      "1 sistema, ≥80% automatizado",
      "2 sistemas, 1 integración",
      "3-4 sistemas, 40-60% manual",
      "≥5 sistemas, 60-80% manual",
      "≥7 sistemas, alta manualidad"
    ]
  },
  {
    key: "changeVolatility",
    name: "Volatilidad",
    shortName: "Volat.",
    icon: "📈",
    color: "#06b6d4", // cyan
    description: "Frecuencia de cambios normativos, regulatorios o de mercado",
    descriptions: [
      "≤1 cambio/año, >24 meses",
      "2-3 cambios/año, 12-24 meses", 
      "Cambios trimestrales, 3-12 meses",
      "Cambios mensuales, 1-3 meses",
      "Cambios semanales, <1 mes"
    ]
  },
  {
    key: "vulnerabilities",
    name: "Vulnerabilidades",
    shortName: "Vulner.",
    icon: "🛡️",
    color: "#84cc16", // lime
    description: "Debilidades internas que pueden ser explotadas por amenazas",
    descriptions: [
      "Sin vulnerabilidades, <5% rotación",
      "1 vulnerabilidad menor, 5-10%",
      "2-3 moderadas, 10-15%", 
      "Vulnerabilidades graves, 15-25%",
      "Críticas, dependencia total"
    ]
  }
];

// Helper to map field names to factor keys
const fieldNameToKey: Record<string, ProbabilityFactorKey> = {
  frequency_occurrence: "frequencyOccurrence",
  exposure_volume: "exposureVolume",
  exposure_massivity: "exposureMassivity",
  exposure_critical_path: "exposureCriticalPath",
  complexity: "complexity",
  change_volatility: "changeVolatility",
  vulnerabilities: "vulnerabilities"
};

// Helper to get icon for field name
const getIconForFieldName = (fieldName: string): string => {
  const iconMap: Record<string, string> = {
    frequency_occurrence: "🔁",
    exposure_volume: "💰",
    exposure_massivity: "👥",
    exposure_critical_path: "⚡",
    complexity: "🔧",
    change_volatility: "📈",
    vulnerabilities: "🛡️"
  };
  return iconMap[fieldName] || "📊";
};

// Helper to get color for field name  
const getColorForFieldName = (fieldName: string): string => {
  const colorMap: Record<string, string> = {
    frequency_occurrence: "#3b82f6",
    exposure_volume: "#10b981",
    exposure_massivity: "#f59e0b",
    exposure_critical_path: "#ef4444",
    complexity: "#8b5cf6",
    change_volatility: "#06b6d4",
    vulnerabilities: "#84cc16"
  };
  return colorMap[fieldName] || "#6b7280";
};

// Custom hook to get probability factors with custom descriptions
const useProbabilityFactors = (): GenericFactor<ProbabilityFactorKey>[] => {
  const { data: criteria = [] } = useQuery<ProbabilityCriterion[]>({
    queryKey: ["/api/probability-criteria"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Convert API criteria to factor format
  const customFactors: GenericFactor<ProbabilityFactorKey>[] = criteria
    .filter(c => c.isActive && fieldNameToKey[c.fieldName])
    .sort((a, b) => a.order - b.order)
    .map(criterion => {
      const key = fieldNameToKey[criterion.fieldName];
      return {
        key,
        name: criterion.name,
        shortName: criterion.name.length > 10 ? criterion.name.substring(0, 10) + "." : criterion.name,
        icon: getIconForFieldName(criterion.fieldName),
        color: getColorForFieldName(criterion.fieldName),
        description: criterion.description, // General description of the criterion
        descriptions: [
          criterion.level1Description || "Nivel 1",
          criterion.level2Description || "Nivel 2",
          criterion.level3Description || "Nivel 3",
          criterion.level4Description || "Nivel 4",
          criterion.level5Description || "Nivel 5"
        ]
      };
    });

  // Use custom factors if available, otherwise fall back to defaults
  return customFactors.length > 0 ? customFactors : defaultProbabilityFactors;
};

interface ProbabilityWheelProps {
  value?: ProbabilityFactors; // For controlled mode
  initialFactors?: ProbabilityFactors; // For uncontrolled mode
  onChange?: (factors: ProbabilityFactors) => void; // Primary handler
  onFactorsChange?: (factors: ProbabilityFactors) => void; // Legacy compatibility
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

const getRiskLevelText = (level: number): string => {
  const texts = ["Muy Bajo", "Bajo", "Medio", "Alto", "Muy Alto"];
  return texts[level - 1] || "Medio";
};

const getProbabilityColor = (level: number): string => {
  const colors = [
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", 
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    "bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100"
  ];
  return colors[level - 1] || colors[2];
};

const createDefaultProbabilityFactors = (): ProbabilityFactors => ({
  frequencyOccurrence: 1,
  exposureVolume: 1,
  exposureMassivity: 1,
  exposureCriticalPath: 1,
  complexity: 1,
  changeVolatility: 1,
  vulnerabilities: 1
});

const updateProbabilityFactor = (factors: ProbabilityFactors, factorKey: ProbabilityFactorKey, level: number): ProbabilityFactors => ({
  ...factors,
  [factorKey]: level
});

export default function ProbabilityWheel(props: ProbabilityWheelProps) {
  const {
    value, 
    initialFactors, 
    onChange, 
    onFactorsChange, 
    className, 
    size 
  } = props;
  
  const probabilityFactors = useProbabilityFactors();

  return (
    <BaseFactorWheel
      title="Rueda de Probabilidad"
      titleIcon="⚙️"
      factors={probabilityFactors}
      value={value}
      initialFactors={initialFactors}
      onChange={onChange}
      onFactorsChange={onFactorsChange}
      calculateScore={calculateProbability}
      getScoreLevelText={getRiskLevelText}
      getScoreColor={getProbabilityColor}
      createDefaultFactors={createDefaultProbabilityFactors}
      updateFactorInObject={updateProbabilityFactor}
      className={className}
      size={size}
    />
  );
}