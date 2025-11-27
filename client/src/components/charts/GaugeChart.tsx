import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface GaugeChartProps {
  value: number;
  min?: number;
  max?: number;
  title?: string;
  subtitle?: string;
  unit?: string;
  size?: number;
  thickness?: number;
  showValue?: boolean;
  showLabels?: boolean;
  colorScale?: 'performance' | 'risk' | 'custom';
  customColors?: string[];
  thresholds?: { value: number; color: string; label?: string }[];
  animated?: boolean;
  className?: string;
  onClick?: () => void;
}

export function GaugeChart({
  value,
  min = 0,
  max = 100,
  title,
  subtitle,
  unit = '%',
  size = 200,
  thickness = 20,
  showValue = true,
  showLabels = true,
  colorScale = 'performance',
  customColors,
  thresholds,
  animated = true,
  className,
  onClick
}: GaugeChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [animatedValue, setAnimatedValue] = useState(animated ? min : value);

  // Calculate gauge properties
  const radius = (size - thickness) / 2;
  const center = size / 2;
  const circumference = Math.PI * radius;
  const progress = Math.max(0, Math.min(1, (animatedValue - min) / (max - min)));
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress * circumference);

  // Get colors based on value and scale
  const getColor = (val: number): string => {
    if (customColors && customColors.length > 0) {
      const index = Math.floor((val / max) * (customColors.length - 1));
      return customColors[Math.min(index, customColors.length - 1)];
    }

    if (thresholds) {
      const threshold = thresholds
        .slice()
        .reverse()
        .find(t => val >= t.value);
      return threshold?.color || '#6b7280';
    }

    const normalizedValue = (val - min) / (max - min);

    switch (colorScale) {
      case 'performance':
        if (normalizedValue >= 0.8) return '#10b981'; // Green - Excellent
        if (normalizedValue >= 0.6) return '#3b82f6'; // Blue - Good
        if (normalizedValue >= 0.4) return '#f59e0b'; // Yellow - Average
        return '#ef4444'; // Red - Poor

      case 'risk':
        if (normalizedValue >= 0.8) return '#ef4444'; // Red - High Risk
        if (normalizedValue >= 0.6) return '#f59e0b'; // Yellow - Medium Risk
        if (normalizedValue >= 0.4) return '#3b82f6'; // Blue - Low Risk
        return '#10b981'; // Green - Very Low Risk

      case 'custom':
        return `hsl(${240 - (normalizedValue * 120)}, 70%, 50%)`;

      default:
        return '#6b7280';
    }
  };

  const currentColor = getColor(animatedValue);

  // Animation effect
  useEffect(() => {
    if (!animated) {
      setAnimatedValue(value);
      return;
    }

    const startValue = animatedValue;
    const endValue = value;
    const duration = 1500; // 1.5 seconds
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = startValue + (endValue - startValue) * easedProgress;
      setAnimatedValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, animated]);

  return (
    <div 
      className={cn("flex flex-col items-center", className)}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      data-testid="gauge-chart"
    >
      {title && (
        <h3 className="text-lg font-semibold mb-2 text-center" data-testid="gauge-title">
          {title}
        </h3>
      )}
      
      <div className="relative">
        <svg
          ref={svgRef}
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={thickness}
            className="dark:stroke-gray-700"
          />
          
          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={currentColor}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300 ease-in-out"
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
            }}
          />
          
          {/* Threshold markers */}
          {thresholds && showLabels && thresholds.map((threshold, index) => {
            const angle = ((threshold.value - min) / (max - min)) * Math.PI - Math.PI / 2;
            const x1 = center + (radius - thickness / 2) * Math.cos(angle);
            const y1 = center + (radius - thickness / 2) * Math.sin(angle);
            const x2 = center + (radius + 10) * Math.cos(angle);
            const y2 = center + (radius + 10) * Math.sin(angle);
            
            return (
              <g key={index}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={threshold.color}
                  strokeWidth="2"
                  className="transform rotate-90"
                  style={{
                    transformOrigin: `${center}px ${center}px`
                  }}
                />
              </g>
            );
          })}
        </svg>
        
        {/* Center value display */}
        {showValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div 
              className="text-2xl font-bold"
              style={{ color: currentColor }}
              data-testid="gauge-value"
            >
              {animatedValue.toFixed(1)}{unit}
            </div>
            {subtitle && (
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1" data-testid="gauge-subtitle">
                {subtitle}
              </div>
            )}
          </div>
        )}

        {/* Labels */}
        {showLabels && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-full h-full">
              <div className="absolute bottom-2 left-2 text-xs text-gray-500">
                {min}{unit}
              </div>
              <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                {max}{unit}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Threshold legend */}
      {thresholds && thresholds.some(t => t.label) && (
        <div className="mt-4 flex flex-wrap gap-2 justify-center" data-testid="gauge-legend">
          {thresholds.filter(t => t.label).map((threshold, index) => (
            <div key={index} className="flex items-center gap-1 text-xs">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: threshold.color }}
              />
              <span>{threshold.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}