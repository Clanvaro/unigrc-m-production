import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Generic interface for any factor type
export interface GenericFactor<T = string> {
  key: T;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  description?: string; // General description of the factor/criterion
  descriptions: string[]; // Level descriptions
}

// Generic props for the factor wheel
export interface BaseFactorWheelProps<TFactors extends Record<TFactorKey, number>, TFactorKey extends string | number | symbol> {
  title: string;
  titleIcon: string;
  factors: GenericFactor<TFactorKey>[];
  value?: TFactors; // Controlled value for form integration
  initialFactors?: TFactors; // Uncontrolled initial value
  onChange?: (factors: TFactors) => void; // Primary change handler
  onFactorsChange?: (factors: TFactors) => void; // Legacy compatibility
  calculateScore: (factors: TFactors) => number;
  getScoreLevelText: (level: number) => string;
  getScoreColor: (level: number) => string;
  createDefaultFactors: () => TFactors;
  updateFactorInObject: (factors: TFactors, factorKey: TFactorKey, level: number) => TFactors;
  className?: string; // For responsive styling
  size?: 'small' | 'medium' | 'large' | 'xlarge'; // Predefined sizes
}

export default function BaseFactorWheel<TFactors extends Record<TFactorKey, number>, TFactorKey extends string | number | symbol>({
  title,
  titleIcon,
  factors,
  value,
  initialFactors,
  onChange,
  onFactorsChange,
  calculateScore,
  getScoreLevelText,
  getScoreColor,
  createDefaultFactors,
  updateFactorInObject,
  className = '',
  size = 'medium'
}: BaseFactorWheelProps<TFactors, TFactorKey>) {
  // Handle both controlled and uncontrolled modes
  const isControlled = value !== undefined;
  const [internalFactors, setInternalFactors] = useState<TFactors>(() => 
    value || initialFactors || createDefaultFactors()
  );
  
  const selectedFactors = isControlled ? value : internalFactors;
  
  const [calculatedScore, setCalculatedScore] = useState<number>(3);
  const [hoveredSegment, setHoveredSegment] = useState<{
    factor: string, 
    level: number, 
    x: number, 
    y: number
  } | null>(null);

  // Update internal state when props change
  useEffect(() => {
    if (!isControlled) {
      if (initialFactors) {
        setInternalFactors(initialFactors);
      }
    }
  }, [initialFactors, isControlled]);

  useEffect(() => {
    const newScore = calculateScore(selectedFactors);
    setCalculatedScore(newScore);
    
    // Only emit onChange for uncontrolled mode to avoid duplicate events
    if (!isControlled) {
      onChange?.(selectedFactors);
      onFactorsChange?.(selectedFactors); // Legacy compatibility
    }
  }, [selectedFactors, onChange, onFactorsChange, calculateScore, isControlled]);

  const handleSegmentClick = (factorKey: TFactorKey, level: number) => {
    const newFactors = updateFactorInObject(selectedFactors, factorKey, level);
    
    if (isControlled) {
      // In controlled mode, just call onChange
      onChange?.(newFactors);
      onFactorsChange?.(newFactors); // Legacy compatibility
    } else {
      // In uncontrolled mode, update internal state
      setInternalFactors(newFactors);
    }
  };

  // Calcular paths SVG para cada segmento
  const segments = useMemo(() => {
    const centerX = 166.25;
    const centerY = 166.25; 
    const innerRadius = 47.5;
    const segmentHeight = 19;
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

        const centerAngle = (startAngle + endAngle) / 2;
        const radius = (innerR + outerRadius) / 2;

        levels.push({
          level,
          pathData,
          factor: factor.key,
          factorIndex,
          centerAngle,
          radius
        });
      }

      return {
        factor,
        levels,
        labelAngle: (startAngle + endAngle) / 2,
        labelRadius: innerRadius + 5 * segmentHeight + 20
      };
    });
  }, [factors]);

  const getFactorValue = (factorKey: TFactorKey): number => {
    const value = selectedFactors[factorKey];
    return typeof value === 'number' ? Math.max(1, Math.min(5, value)) : 3;
  };

  const getSizeClasses = (size: 'small' | 'medium' | 'large' | 'xlarge') => {
    switch (size) {
      case 'small': return 'max-w-xs';
      case 'large': return 'max-w-2xl';
      case 'xlarge': return 'max-w-4xl';
      default: return 'max-w-lg';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {titleIcon} {title}
          <Badge className={getScoreColor(calculatedScore)}>
            {title}: {calculatedScore} - {getScoreLevelText(calculatedScore)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center space-y-4">
          {/* Rueda SVG */}
          <div className={`relative ${getSizeClasses(size)} ${className}`}>
            <svg 
              viewBox="0 0 332.5 332.5" 
              className="w-full h-auto overflow-visible"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Segmentos clickeables */}
              {segments.map(({ factor, levels }) => 
                levels.map(({ level, pathData, factor: factorKey, centerAngle, radius }) => {
                  const isSelected = getFactorValue(factorKey) === level;
                  
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
                  const segmentCenterX = 166.25 + radius * Math.cos(centerAngle);
                  const segmentCenterY = 166.25 + radius * Math.sin(centerAngle);

                  return (
                    <path
                      key={`${String(factorKey)}-${level}`}
                      d={pathData}
                      fill={fillColor}
                      fillOpacity={opacity}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? "3" : "1"}
                      className="cursor-pointer transition-all duration-200 hover:opacity-80"
                      onClick={() => handleSegmentClick(factorKey, level)}
                      onMouseEnter={() => {
                        setHoveredSegment({
                          factor: String(factorKey),
                          level,
                          x: segmentCenterX,
                          y: segmentCenterY
                        });
                      }}
                      onMouseLeave={() => setHoveredSegment(null)}
                      data-testid={`segment-${String(factorKey)}-${level}`}
                    />
                  );
                })
              )}

              {/* Labels de factores */}
              {segments.map(({ factor, labelAngle, labelRadius }) => {
                const labelX = 166.25 + labelRadius * Math.cos(labelAngle);
                const labelY = 166.25 + labelRadius * Math.sin(labelAngle);
                
                return (
                  <g key={String(factor.key)}>
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
                cx="166.25"
                cy="166.25" 
                r="42.75"
                fill="white"
                stroke="#e2e8f0"
                strokeWidth="2"
                className="drop-shadow-md"
              />
              
              <text x="166.25" y="153.9" textAnchor="middle" style={{ fontSize: '10px' }} className="font-medium fill-muted-foreground">
                {title}
              </text>
              <text x="166.25" y="171" textAnchor="middle" className="text-xl font-bold fill-foreground">
                {calculatedScore}
              </text>
              <text x="166.25" y="183.35" textAnchor="middle" style={{ fontSize: '10px' }} className="fill-muted-foreground">
                {getScoreLevelText(calculatedScore)}
              </text>

              {/* Tooltip expandido para segmentos usando foreignObject */}
              {hoveredSegment && (
                <foreignObject
                  x={hoveredSegment.x - 140}
                  y={hoveredSegment.y - 80}
                  width={280}
                  height={120}
                  className="overflow-visible pointer-events-none"
                >
                  <div className="flex justify-center">
                    <div className="relative bg-gray-900/80 text-white text-[10px] rounded-lg px-3 py-3 shadow-xl max-w-xs border border-gray-700/50 backdrop-blur-sm">
                      {(() => {
                        const factorInfo = factors.find(f => String(f.key) === hoveredSegment.factor);
                        const levelDescription = factorInfo?.descriptions?.[hoveredSegment.level - 1] || 'Descripción no disponible';
                        
                        return (
                          <div className="space-y-2">
                            <div className="border-b border-gray-600 pb-1">
                              <span className="text-sm">{factorInfo?.icon}</span>
                              <span className="font-semibold text-sm text-blue-300 ml-1">{factorInfo?.name}</span>
                              {factorInfo?.description && (
                                <span className="text-gray-300">: {factorInfo.description}</span>
                              )}
                            </div>
                            <div>
                              <span className="text-yellow-300 font-medium">Nivel {hoveredSegment.level}:</span>
                              <div className="mt-1 text-gray-200 leading-relaxed">{levelDescription}</div>
                            </div>
                          </div>
                        );
                      })()}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-6 border-r-6 border-t-6 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </foreignObject>
              )}

              {/* Tooltips de factores usando foreignObject para alineación precisa */}
              {segments.map(({ factor, labelAngle, labelRadius }) => {
                const labelX = 166.25 + labelRadius * Math.cos(labelAngle);
                const labelY = 166.25 + labelRadius * Math.sin(labelAngle);
                
                // Create tooltip content with factor description
                const tooltipContent = (
                  <div className="max-w-xs">
                    <div className="text-sm">
                      {factor.description || factor.name}
                    </div>
                  </div>
                );
                
                return (
                  <foreignObject
                    key={`tooltip-${String(factor.key)}`}
                    x={labelX - 16}
                    y={labelY - 16}
                    width={32}
                    height={32}
                    className="overflow-visible"
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="w-8 h-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                          tabIndex={0}
                          role="button"
                          aria-label={`Detalles de ${factor.name}`}
                          data-testid={`tooltip-trigger-${String(factor.key)}`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              // Tooltip se abre automáticamente en focus para usuarios de teclado
                            }
                          }}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-sm z-50">
                        {tooltipContent}
                      </TooltipContent>
                    </Tooltip>
                  </foreignObject>
                );
              })}
            </svg>
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
  );
}