import { calculateImpact, type ImpactFactors, getImpactLevelText } from "@shared/impact-calculation";
import BaseFactorWheel, { type GenericFactor } from "@/components/shared/BaseFactorWheel";
import { useQuery } from "@tanstack/react-query";

type ImpactFactorKey = keyof ImpactFactors;

interface ImpactCriterion {
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
const defaultImpactFactors: GenericFactor<ImpactFactorKey>[] = [
  {
    key: "infrastructure",
    name: "Infraestructura",
    shortName: "Infraestr.",
    icon: "🏗️",
    color: "#3b82f6", // blue
    descriptions: [
      "Zona/oficina: menos de 1 día de interrupción",
      "Zona/oficina: 1 día a menos de 1 semana de interrupción",
      "Zona/oficina: 1 semana o más de interrupción",
      "Operaciones de la compañía: 1 día a menos de 1 semana de interrupción",
      "Operaciones de la compañía: 1 semana o más de interrupción"
    ]
  },
  {
    key: "reputation",
    name: "Reputación",
    shortName: "Reputación", 
    icon: "📰",
    color: "#10b981", // emerald
    descriptions: [
      "Difusión a nivel interno (proceso, equipo de trabajo)",
      "Cobertura adversa puntual en medios a nivel local",
      "Cobertura adversa de amplia difusión en medios a nivel regional/nacional",
      "Cobertura nacional con pérdida grave de credibilidad de grupos de interés",
      "Cobertura adversa de amplia difusión en medios a nivel internacional"
    ]
  },
  {
    key: "economic",
    name: "Económico",
    shortName: "Económico",
    icon: "💰",
    color: "#f59e0b", // amber
    descriptions: [
      "Pérdidas económicas menores $10M USD",
      "Pérdidas económicas entre $10M-$100M USD",
      "Pérdidas económicas entre $100M-$250M USD", 
      "Pérdidas económicas entre $250M-$500M USD",
      "Pérdidas mayores a $500M USD"
    ]
  },
  {
    key: "permits",
    name: "Permisos",
    shortName: "Permisos", 
    icon: "⚖️",
    color: "#ef4444", // red
    descriptions: [
      "Incumplimiento regulatorio que no implica sanciones",
      "Sanciones menores por incumplimiento contractual. Demandas laborales",
      "Sanciones por incumplimientos provenientes del ente regulador. Inspección del trabajo",
      "Cierre definitivo de planta o terminal marítimo. Prohibición de celebrar contratos con organismos del Estado",
      "Disolución de la persona jurídica. Multas máximas del tribunal de libre competencia. Sentencia condenatoria para miembros del directorio y altos ejecutivos"
    ]
  },
  {
    key: "knowhow",
    name: "Knowhow",
    shortName: "Knowhow",
    icon: "🧠", 
    color: "#8b5cf6", // violet
    descriptions: [
      "Ineficiencia administrativa por no disponer de tecnología o conocimientos requeridos",
      "Pérdida de tecnología crítica interna (requiere rediseño/implementación)",
      "Divulgación no autorizada de conocimiento o tecnología operacional a terceros",
      "Divulgación no autorizada de conocimiento o tecnología estratégica a terceros",
      "Divulgación no autorizada de conocimiento o tecnología crítica a terceros"
    ]
  },
  {
    key: "people",
    name: "Personas",
    shortName: "Personas",
    icon: "👥",
    color: "#06b6d4", // cyan
    descriptions: [
      "Primeros auxilios (atención primaria)",
      "Daño reversible en la salud que provoque incapacidad temporal por menos de 15 días",
      "Daño reversible en la salud que provoque incapacidad temporal por sobre 15 días",
      "Daño irreversible en la salud que provoque incapacidad permanente",
      "Fatalidad de una o más personas"
    ]
  },
  {
    key: "information",
    name: "Información",
    shortName: "Informac.",
    icon: "🔒",
    color: "#84cc16", // lime
    descriptions: [
      "Error en operaciones internas de algunas transacciones",
      "Filtración de información interna no relevante",
      "Filtración de información confidencial sin publicidad",
      "Filtración de información confidencial con publicidad",
      "Filtración de información 'Confidencial Externa' con/sin publicidad negativa"
    ]
  }
];

// Helper to map field names to factor keys
const fieldNameToKey: Record<string, ImpactFactorKey> = {
  infrastructure: "infrastructure",
  reputation: "reputation",
  economic: "economic",
  permits: "permits",
  knowhow: "knowhow",
  people: "people",
  information: "information"
};

// Helper to get icon for field name
const getIconForFieldName = (fieldName: string): string => {
  const iconMap: Record<string, string> = {
    infrastructure: "🏗️",
    reputation: "📰",
    economic: "💰",
    permits: "⚖️",
    knowhow: "🧠",
    people: "👥",
    information: "🔒"
  };
  return iconMap[fieldName] || "📊";
};

// Helper to get color for field name  
const getColorForFieldName = (fieldName: string): string => {
  const colorMap: Record<string, string> = {
    infrastructure: "#3b82f6",
    reputation: "#10b981",
    economic: "#f59e0b",
    permits: "#ef4444",
    knowhow: "#8b5cf6",
    people: "#06b6d4",
    information: "#84cc16"
  };
  return colorMap[fieldName] || "#6b7280";
};

// Custom hook to get impact factors with custom descriptions
const useImpactFactors = (): GenericFactor<ImpactFactorKey>[] => {
  const { data: criteria = [] } = useQuery<ImpactCriterion[]>({
    queryKey: ["/api/impact-criteria"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Convert API criteria to factor format
  const customFactors: GenericFactor<ImpactFactorKey>[] = criteria
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
  return customFactors.length > 0 ? customFactors : defaultImpactFactors;
};

interface ImpactWheelProps {
  value?: ImpactFactors; // For controlled mode
  initialFactors?: ImpactFactors; // For uncontrolled mode
  onChange?: (factors: ImpactFactors) => void; // Primary handler
  onFactorsChange?: (factors: ImpactFactors) => void; // Legacy compatibility
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

const getImpactColor = (level: number): string => {
  const colors = [
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", 
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    "bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100"
  ];
  return colors[level - 1] || colors[2];
};

const createDefaultImpactFactors = (): ImpactFactors => ({
  infrastructure: 1,
  reputation: 1,
  economic: 1,
  permits: 1,
  knowhow: 1,
  people: 1,
  information: 1
});

const updateImpactFactor = (factors: ImpactFactors, factorKey: ImpactFactorKey, level: number): ImpactFactors => ({
  ...factors,
  [factorKey]: level
});

export default function ImpactWheel(props: ImpactWheelProps) {
  const {
    value, 
    initialFactors, 
    onChange, 
    onFactorsChange, 
    className, 
    size 
  } = props;
  
  const impactFactors = useImpactFactors();

  return (
    <BaseFactorWheel
      title="Rueda de Impacto"
      titleIcon="🎯"
      factors={impactFactors}
      value={value}
      initialFactors={initialFactors}
      onChange={onChange}
      onFactorsChange={onFactorsChange}
      calculateScore={calculateImpact}
      getScoreLevelText={getImpactLevelText}
      getScoreColor={getImpactColor}
      createDefaultFactors={createDefaultImpactFactors}
      updateFactorInObject={updateImpactFactor}
      className={className}
      size={size}
    />
  );
}