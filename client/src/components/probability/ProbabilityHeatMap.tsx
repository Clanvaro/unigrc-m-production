import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { calculateProbability, type ProbabilityFactors } from "@shared/probability-calculation";
import { RiskValue } from "@/components/RiskValue";

interface Factor {
  key: keyof ProbabilityFactors;
  name: string;
  icon: string;
  descriptions: string[];
}

const factors: Factor[] = [
  {
    key: "frequencyOccurrence",
    name: "Frecuencia",
    icon: "🔁",
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
    name: "Exposición Vol.",
    icon: "💰",
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
    icon: "👥", 
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
    icon: "⚡",
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
    icon: "🔧",
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
    icon: "📈",
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
    icon: "🛡️",
    descriptions: [
      "Sin vulnerabilidades, <5% rotación",
      "1 vulnerabilidad menor, 5-10%",
      "2-3 moderadas, 10-15%", 
      "Vulnerabilidades graves, 15-25%",
      "Críticas, dependencia total"
    ]
  }
];

const levelColors = [
  "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300",
  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300", 
  "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-300",
  "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300",
  "bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100 border-red-400"
];

interface ProbabilityHeatMapProps {
  onFactorsChange?: (factors: ProbabilityFactors) => void;
  initialFactors?: ProbabilityFactors;
}

export default function ProbabilityHeatMap({ onFactorsChange, initialFactors }: ProbabilityHeatMapProps) {
  const [selectedFactors, setSelectedFactors] = useState<ProbabilityFactors>(() => ({
    frequencyOccurrence: initialFactors?.frequencyOccurrence ?? 3,
    exposureVolume: initialFactors?.exposureVolume ?? 3,
    exposureMassivity: initialFactors?.exposureMassivity ?? 3,
    exposureCriticalPath: initialFactors?.exposureCriticalPath ?? 3,
    complexity: initialFactors?.complexity ?? 3,
    changeVolatility: initialFactors?.changeVolatility ?? 3,
    vulnerabilities: initialFactors?.vulnerabilities ?? 3
  }));

  const [calculatedProbability, setCalculatedProbability] = useState<number>(3);

  // Actualizar estado interno si cambian los valores iniciales (útil para edición)
  useEffect(() => {
    if (initialFactors) {
      const newFactors = {
        frequencyOccurrence: initialFactors.frequencyOccurrence ?? 3,
        exposureVolume: initialFactors.exposureVolume ?? 3,
        exposureMassivity: initialFactors.exposureMassivity ?? 3,
        exposureCriticalPath: initialFactors.exposureCriticalPath ?? 3,
        complexity: initialFactors.complexity ?? 3,
        changeVolatility: initialFactors.changeVolatility ?? 3,
        vulnerabilities: initialFactors.vulnerabilities ?? 3
      };

      // Solo actualizar si los valores realmente cambiaron (evitar bucles)
      setSelectedFactors(prev => {
        const hasChanges = Object.keys(newFactors).some(key => 
          prev[key as keyof ProbabilityFactors] !== newFactors[key as keyof ProbabilityFactors]
        );
        return hasChanges ? newFactors : prev;
      });
    }
  }, [initialFactors]);

  useEffect(() => {
    const newProbability = calculateProbability(selectedFactors);
    setCalculatedProbability(newProbability);
    onFactorsChange?.(selectedFactors);
  }, [selectedFactors, onFactorsChange]);

  const handleCellClick = (factorKey: keyof ProbabilityFactors, level: number) => {
    setSelectedFactors(prev => ({
      ...prev,
      [factorKey]: level
    }));
  };

  const getRiskLevelText = (level: number): string => {
    const texts = ["Muy Bajo", "Bajo", "Medio", "Alto", "Muy Alto"];
    return texts[level - 1] || "Medio";
  };

  const getProbabilityColor = (level: number): string => {
    return levelColors[level - 1] || levelColors[2];
  };

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔥 Matriz Heat Map Interactiva
            <Badge className={getProbabilityColor(calculatedProbability)}>
              Probabilidad: <RiskValue value={calculatedProbability} /> - {getRiskLevelText(calculatedProbability)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Header con niveles */}
            <div className="grid grid-cols-6 gap-2 mb-4">
              <div className="text-sm font-medium text-muted-foreground">Factor</div>
              {[1, 2, 3, 4, 5].map(level => (
                <div key={level} className="text-center text-sm font-medium text-muted-foreground">
                  Nivel {level}
                </div>
              ))}
            </div>

            {/* Filas de factores */}
            {factors.map((factor) => (
              <div key={factor.key} className="grid grid-cols-6 gap-2 items-center">
                {/* Nombre del factor */}
                <div className="flex items-center gap-2 text-sm font-medium min-h-[40px]">
                  <span className="text-lg">{factor.icon}</span>
                  <span className="truncate">{factor.name}</span>
                </div>

                {/* Celdas clickeables para cada nivel */}
                {[1, 2, 3, 4, 5].map(level => {
                  const isSelected = selectedFactors[factor.key] === level;
                  
                  return (
                    <Tooltip key={level}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "h-10 rounded-md border-2 cursor-pointer transition-all duration-200 flex items-center justify-center text-sm font-medium",
                            isSelected 
                              ? `${levelColors[level - 1]} border-current shadow-md scale-105`
                              : "bg-muted/30 border-muted hover:bg-muted/50 hover:border-muted-foreground/30 hover:scale-102",
                          )}
                          onClick={() => handleCellClick(factor.key, level)}
                          data-testid={`cell-${factor.key}-${level}`}
                        >
                          {level}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="font-medium text-sm mb-1">
                          {factor.name} - Nivel {level}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {factor.descriptions[level - 1]}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}