import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { calculateProbability, type ProbabilityFactors } from "@shared/probability-calculation";

interface Factor {
  key: keyof ProbabilityFactors;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  descriptions: string[];
}

const factors: Factor[] = [
  {
    key: "frequencyOccurrence",
    name: "Frecuencia de Ocurrencia",
    shortName: "Frecuencia",
    icon: "🔁",
    color: "#3b82f6", // blue
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
    descriptions: [
      "Sin vulnerabilidades, <5% rotación",
      "1 vulnerabilidad menor, 5-10%",
      "2-3 moderadas, 10-15%", 
      "Vulnerabilidades graves, 15-25%",
      "Críticas, dependencia total"
    ]
  }
];

interface ProbabilityWheelProps {
  onFactorsChange?: (factors: ProbabilityFactors) => void;
  initialFactors?: ProbabilityFactors;
}

export default function ProbabilityWheel({ onFactorsChange, initialFactors }: ProbabilityWheelProps) {
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
  const [hoveredSegment, setHoveredSegment] = useState<{factor: string, level: number, x: number, y: number} | null>(null);

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

  const handleSegmentClick = (factorKey: keyof ProbabilityFactors, level: number) => {
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
    const colors = [
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", 
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      "bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100"
    ];
    return colors[level - 1] || colors[2];
  };

  // Calcular paths SVG para cada segmento
  const segments = useMemo(() => {
    const centerX = 175;
    const centerY = 175; 
    const innerRadius = 50;
    const segmentHeight = 20;
    const anglePerFactor = (2 * Math.PI) / factors.length;

    return factors.map((factor, factorIndex) => {
      const startAngle = factorIndex * anglePerFactor - Math.PI / 2; // Empezar desde arriba
      const endAngle = (factorIndex + 1) * anglePerFactor - Math.PI / 2;

      const levels = [];
      for (let level = 1; level <= 5; level++) {
        const outerRadius = innerRadius + (level * segmentHeight);
        const innerR = innerRadius + ((level - 1) * segmentHeight);

        const x1Inner = centerX + innerR * Math.cos(startAngle);
        const y1Inner = centerY + innerR * Math.sin(startAngle);
        const x2Inner = centerX + innerR * Math.cos(endAngle);
        const y2Inner = centerY + innerR * Math.sin(endAngle);

        const x1Outer = centerX + outerRadius * Math.cos(startAngle);
        const y1Outer = centerY + outerRadius * Math.sin(startAngle);
        const x2Outer = centerX + outerRadius * Math.cos(endAngle);
        const y2Outer = centerY + outerRadius * Math.sin(endAngle);

        const largeArcFlag = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;

        const pathData = [
          `M ${x1Inner} ${y1Inner}`,
          `A ${innerR} ${innerR} 0 ${largeArcFlag} 1 ${x2Inner} ${y2Inner}`,
          `L ${x2Outer} ${y2Outer}`,
          `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${x1Outer} ${y1Outer}`,
          'Z'
        ].join(' ');

        levels.push({
          level,
          pathData,
          factor: factor.key,
          factorIndex,
          centerAngle: (startAngle + endAngle) / 2,
          radius: (innerR + outerRadius) / 2
        });
      }

      return {
        factor,
        levels,
        labelAngle: (startAngle + endAngle) / 2,
        labelRadius: innerRadius + 5 * segmentHeight + 20
      };
    });
  }, []);

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ⚙️ Rueda de Probabilidad
            <Badge className={getProbabilityColor(calculatedProbability)}>
              Probabilidad: {calculatedProbability} - {getRiskLevelText(calculatedProbability)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-4">
            {/* Rueda SVG */}
            <div className="relative">
              <svg width="350" height="350" viewBox="0 0 350 350" className="overflow-visible">
                {/* Segmentos clickeables */}
                {segments.map(({ factor, levels }) => 
                  levels.map(({ level, pathData, factor: factorKey, centerAngle, radius }) => {
                    const isSelected = selectedFactors[factorKey] === level;
                    
                    // Colores por nivel
                    let fillColor = "#f1f5f9"; // slate-100
                    let strokeColor = "#cbd5e1"; // slate-300
                    let opacity = 0.3;

                    if (isSelected) {
                      const intensities = ["#22c55e", "#eab308", "#f97316", "#ef4444", "#dc2626"]; // green, yellow, orange, red, dark red
                      fillColor = intensities[level - 1];
                      strokeColor = factor.color;
                      opacity = 0.8;
                    }

                    const factorInfo = factors.find(f => f.key === factorKey);
                    const segmentCenterX = 175 + radius * Math.cos(centerAngle);
                    const segmentCenterY = 175 + radius * Math.sin(centerAngle);

                    return (
                      <path
                        key={`${factorKey}-${level}`}
                        d={pathData}
                        fill={fillColor}
                        fillOpacity={opacity}
                        stroke={strokeColor}
                        strokeWidth={isSelected ? "3" : "1"}
                        className="cursor-pointer transition-all duration-200 hover:opacity-80"
                        onClick={() => handleSegmentClick(factorKey, level)}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredSegment({
                            factor: factorKey,
                            level,
                            x: segmentCenterX,
                            y: segmentCenterY
                          });
                        }}
                        onMouseLeave={() => setHoveredSegment(null)}
                        data-testid={`segment-${factorKey}-${level}`}
                      />
                    );
                  })
                )}

                {/* Labels de factores */}
                {segments.map(({ factor, labelAngle, labelRadius }) => {
                  const labelX = 175 + labelRadius * Math.cos(labelAngle);
                  const labelY = 175 + labelRadius * Math.sin(labelAngle);
                  
                  return (
                    <g key={factor.key}>
                      <text
                        x={labelX}
                        y={labelY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-xs font-medium fill-current"
                        style={{ color: factor.color }}
                      >
                        <tspan x={labelX} dy="-0.3em" className="text-base">{factor.icon}</tspan>
                        <tspan x={labelX} dy="1.1em" style={{ fontSize: '10px' }}>{factor.shortName}</tspan>
                      </text>
                    </g>
                  );
                })}

                {/* Centro con resultado */}
                <circle
                  cx="175"
                  cy="175" 
                  r="45"
                  fill="white"
                  stroke="#e2e8f0"
                  strokeWidth="2"
                  className="drop-shadow-md"
                />
                
                <text x="175" y="162" textAnchor="middle" style={{ fontSize: '10px' }} className="font-medium fill-muted-foreground">
                  Probabilidad
                </text>
                <text x="175" y="180" textAnchor="middle" className="text-xl font-bold fill-foreground">
                  {calculatedProbability}
                </text>
                <text x="175" y="193" textAnchor="middle" style={{ fontSize: '10px' }} className="fill-muted-foreground">
                  {getRiskLevelText(calculatedProbability)}
                </text>
              </svg>
              
              {/* Tooltip personalizado instantáneo */}
              {hoveredSegment && (
                <div 
                  className="absolute pointer-events-none z-50"
                  style={{
                    left: hoveredSegment.x,
                    top: hoveredSegment.y - 40,
                    transform: 'translate(-50%, -100%)'
                  }}
                >
                  <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                    {(() => {
                      const factorInfo = factors.find(f => f.key === hoveredSegment.factor);
                      return `${factorInfo?.name || 'Factor'} - Nivel ${hoveredSegment.level}: ${factorInfo?.descriptions?.[hoveredSegment.level - 1] || 'Descripción no disponible'}`;
                    })()}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                  </div>
                </div>
              )}
            </div>

            {/* Leyenda de niveles */}
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              {[1, 2, 3, 4, 5].map(level => (
                <div key={level} className="flex flex-col items-center space-y-1">
                  <div 
                    className="w-6 h-6 rounded-full border-2"
                    style={{
                      backgroundColor: ["#22c55e", "#eab308", "#f97316", "#ef4444", "#dc2626"][level - 1],
                      opacity: 0.8
                    }}
                  />
                  <span className="font-medium">Nivel {level}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}