import { useEffect, useRef, useState } from 'react';
import { type ComparisonData, type ChartDataPoint } from '@shared/schema';
import { cn } from '@/lib/utils';

interface EnhancedBarChartProps {
  data: ComparisonData[];
  width?: number;
  height?: number;
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  interactive?: boolean;
  animated?: boolean;
  onBarClick?: (data: ChartDataPoint) => void;
  onBarHover?: (data: ChartDataPoint | null) => void;
  yAxisLabel?: string;
  title?: string;
  className?: string;
  orientation?: 'vertical' | 'horizontal';
  showValues?: boolean;
  groupSpacing?: number;
  barSpacing?: number;
  sortBy?: 'category' | 'current' | 'target' | 'none';
  sortOrder?: 'asc' | 'desc';
  showTrendIndicators?: boolean;
  showTargetLine?: boolean;
}

export function EnhancedBarChart({
  data,
  width = 800,
  height = 400,
  colors = ['#3b82f6', '#10b981', '#f59e0b', '#6b7280'],
  showLegend = true,
  showGrid = true,
  showTooltip = true,
  interactive = true,
  animated = true,
  onBarClick,
  onBarHover,
  yAxisLabel,
  title,
  className,
  orientation = 'vertical',
  showValues = true,
  groupSpacing = 0.8,
  barSpacing = 0.1,
  sortBy = 'none',
  sortOrder = 'desc',
  showTrendIndicators = true,
  showTargetLine = true
}: EnhancedBarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredBar, setHoveredBar] = useState<ChartDataPoint | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const margin = { top: 60, right: 60, bottom: 80, left: 80 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Sort data if required
  const sortedData = [...data].sort((a, b) => {
    if (sortBy === 'none') return 0;
    
    let valueA: number, valueB: number;
    switch (sortBy) {
      case 'current':
        valueA = a.current;
        valueB = b.current;
        break;
      case 'target':
        valueA = a.target || 0;
        valueB = b.target || 0;
        break;
      case 'category':
        return sortOrder === 'asc' 
          ? a.category.localeCompare(b.category)
          : b.category.localeCompare(a.category);
      default:
        return 0;
    }
    
    return sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
  });

  // Calculate scales
  const allValues = sortedData.flatMap(d => [
    d.current,
    d.target || 0,
    d.previous || 0,
    d.benchmark || 0
  ].filter(v => v !== undefined));
  
  const maxValue = Math.max(...allValues, 0);
  const minValue = Math.min(...allValues, 0);
  const valueRange = maxValue - minValue;

  // Bar dimensions
  const groupWidth = (orientation === 'vertical' ? chartWidth : chartHeight) / sortedData.length * groupSpacing;
  const barsPerGroup = ['current', 'target', 'previous', 'benchmark']
    .filter(key => sortedData.some(d => d[key as keyof ComparisonData] !== undefined)).length;
  const barWidth = (groupWidth / barsPerGroup) * (1 - barSpacing);

  const getPosition = (value: number): number => {
    if (orientation === 'vertical') {
      return chartHeight - ((value - minValue) / valueRange) * chartHeight;
    } else {
      return ((value - minValue) / valueRange) * chartWidth;
    }
  };

  const getBarSize = (value: number): number => {
    if (orientation === 'vertical') {
      return ((value - minValue) / valueRange) * chartHeight;
    } else {
      return ((value - minValue) / valueRange) * chartWidth;
    }
  };

  const handleBarClick = (bar: ChartDataPoint) => {
    if (interactive && onBarClick) {
      onBarClick(bar);
    }
  };

  const handleBarHover = (bar: ChartDataPoint | null, event?: React.MouseEvent) => {
    setHoveredBar(bar);
    if (event) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        setTooltipPosition({ 
          x: event.clientX - rect.left, 
          y: event.clientY - rect.top 
        });
      }
    }
    if (interactive && onBarHover) {
      onBarHover(bar);
    }
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable'): string => {
    switch (trend) {
      case 'up': return '↗';
      case 'down': return '↘';
      case 'stable': return '→';
      default: return '';
    }
  };

  const getTrendColor = (trend?: 'up' | 'down' | 'stable'): string => {
    switch (trend) {
      case 'up': return '#10b981';
      case 'down': return '#ef4444';
      case 'stable': return '#6b7280';
      default: return '#6b7280';
    }
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    svg.innerHTML = '';

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${margin.left}, ${margin.top})`);

    // Grid lines
    if (showGrid) {
      const gridLines = 5;
      for (let i = 0; i <= gridLines; i++) {
        const value = minValue + ((maxValue - minValue) / gridLines) * i;
        
        if (orientation === 'vertical') {
          const y = getPosition(value);
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', '0');
          line.setAttribute('y1', y.toString());
          line.setAttribute('x2', chartWidth.toString());
          line.setAttribute('y2', y.toString());
          line.setAttribute('stroke', '#e5e7eb');
          line.setAttribute('stroke-width', '0.5');
          line.setAttribute('stroke-dasharray', '2,2');
          line.classList.add('dark:stroke-gray-700');
          g.appendChild(line);
        } else {
          const x = getPosition(value);
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', x.toString());
          line.setAttribute('y1', '0');
          line.setAttribute('x2', x.toString());
          line.setAttribute('y2', chartHeight.toString());
          line.setAttribute('stroke', '#e5e7eb');
          line.setAttribute('stroke-width', '0.5');
          line.setAttribute('stroke-dasharray', '2,2');
          line.classList.add('dark:stroke-gray-700');
          g.appendChild(line);
        }
      }
    }

    // Target line
    if (showTargetLine && sortedData.some(d => d.target)) {
      const avgTarget = sortedData.reduce((sum, d) => sum + (d.target || 0), 0) / sortedData.length;
      
      if (orientation === 'vertical') {
        const y = getPosition(avgTarget);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', '0');
        line.setAttribute('y1', y.toString());
        line.setAttribute('x2', chartWidth.toString());
        line.setAttribute('y2', y.toString());
        line.setAttribute('stroke', '#f59e0b');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '5,5');
        g.appendChild(line);

        // Target label
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', (chartWidth - 10).toString());
        label.setAttribute('y', (y - 5).toString());
        label.setAttribute('text-anchor', 'end');
        label.setAttribute('font-size', '10');
        label.setAttribute('fill', '#f59e0b');
        label.textContent = `Target: ${avgTarget.toFixed(1)}`;
        g.appendChild(label);
      }
    }

    // Draw bars
    sortedData.forEach((dataPoint, groupIndex) => {
      const groupPosition = orientation === 'vertical' 
        ? (groupIndex * chartWidth / sortedData.length)
        : (groupIndex * chartHeight / sortedData.length);
      
      let barIndex = 0;
      
      // Current value bar
      if (dataPoint.current !== undefined) {
        const value = dataPoint.current;
        const barPosition = groupPosition + (barIndex * (barWidth + barSpacing * groupWidth));
        
        let x, y, barWidthActual, barHeight;
        
        if (orientation === 'vertical') {
          x = barPosition;
          y = getPosition(value);
          barWidthActual = barWidth;
          barHeight = getBarSize(value) - getBarSize(minValue);
        } else {
          x = getPosition(minValue);
          y = barPosition;
          barWidthActual = getBarSize(value) - getBarSize(minValue);
          barHeight = barWidth;
        }
        
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x.toString());
        rect.setAttribute('y', y.toString());
        rect.setAttribute('width', barWidthActual.toString());
        rect.setAttribute('height', barHeight.toString());
        rect.setAttribute('fill', colors[0]);
        rect.setAttribute('stroke', '#fff');
        rect.setAttribute('stroke-width', '1');
        rect.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))';
        
        if (interactive) {
          rect.style.cursor = 'pointer';
          rect.addEventListener('mouseenter', () => {
            rect.setAttribute('opacity', '0.8');
          });
          rect.addEventListener('mouseleave', () => {
            rect.setAttribute('opacity', '1');
          });
          
          const barData: ChartDataPoint = {
            x: dataPoint.category,
            y: value,
            label: 'Current',
            metadata: { type: 'current', groupIndex, trend: dataPoint.trend }
          };
          
          rect.addEventListener('click', () => handleBarClick(barData));
          rect.addEventListener('mouseenter', (e) => handleBarHover(barData, e as any));
          rect.addEventListener('mouseleave', () => handleBarHover(null));
        }
        
        if (animated) {
          if (orientation === 'vertical') {
            rect.style.transform = 'scaleY(0)';
            rect.style.transformOrigin = 'bottom';
          } else {
            rect.style.transform = 'scaleX(0)';
            rect.style.transformOrigin = 'left';
          }
          rect.style.transition = 'transform 0.6s ease-in-out';
          setTimeout(() => {
            rect.style.transform = 'scale(1)';
          }, groupIndex * 100);
        }
        
        g.appendChild(rect);

        // Value label
        if (showValues) {
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          if (orientation === 'vertical') {
            text.setAttribute('x', (x + barWidthActual / 2).toString());
            text.setAttribute('y', (y - 5).toString());
          } else {
            text.setAttribute('x', (x + barWidthActual + 5).toString());
            text.setAttribute('y', (y + barHeight / 2).toString());
            text.setAttribute('dominant-baseline', 'middle');
          }
          text.setAttribute('text-anchor', orientation === 'vertical' ? 'middle' : 'start');
          text.setAttribute('font-size', '10');
          text.setAttribute('fill', '#374151');
          text.textContent = value.toFixed(1);
          g.appendChild(text);
        }

        barIndex++;
      }

      // Target value bar (if exists)
      if (dataPoint.target !== undefined) {
        const value = dataPoint.target;
        const barPosition = groupPosition + (barIndex * (barWidth + barSpacing * groupWidth));
        
        let x, y, barWidthActual, barHeight;
        
        if (orientation === 'vertical') {
          x = barPosition;
          y = getPosition(value);
          barWidthActual = barWidth;
          barHeight = getBarSize(value) - getBarSize(minValue);
        } else {
          x = getPosition(minValue);
          y = barPosition;
          barWidthActual = getBarSize(value) - getBarSize(minValue);
          barHeight = barWidth;
        }
        
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x.toString());
        rect.setAttribute('y', y.toString());
        rect.setAttribute('width', barWidthActual.toString());
        rect.setAttribute('height', barHeight.toString());
        rect.setAttribute('fill', colors[1]);
        rect.setAttribute('stroke', '#fff');
        rect.setAttribute('stroke-width', '1');
        rect.setAttribute('opacity', '0.7');
        
        if (animated) {
          if (orientation === 'vertical') {
            rect.style.transform = 'scaleY(0)';
            rect.style.transformOrigin = 'bottom';
          } else {
            rect.style.transform = 'scaleX(0)';
            rect.style.transformOrigin = 'left';
          }
          rect.style.transition = 'transform 0.6s ease-in-out';
          setTimeout(() => {
            rect.style.transform = 'scale(1)';
          }, groupIndex * 100 + 200);
        }
        
        g.appendChild(rect);
        barIndex++;
      }

      // Trend indicator
      if (showTrendIndicators && dataPoint.trend) {
        const trendIcon = getTrendIcon(dataPoint.trend);
        const trendColor = getTrendColor(dataPoint.trend);
        
        if (orientation === 'vertical') {
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', (groupPosition + groupWidth / 2).toString());
          text.setAttribute('y', (chartHeight + 35).toString());
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('font-size', '14');
          text.setAttribute('fill', trendColor);
          text.textContent = trendIcon;
          g.appendChild(text);
        }
      }
    });

    // Axes
    const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    xAxis.setAttribute('x1', '0');
    xAxis.setAttribute('y1', chartHeight.toString());
    xAxis.setAttribute('x2', chartWidth.toString());
    xAxis.setAttribute('y2', chartHeight.toString());
    xAxis.setAttribute('stroke', '#374151');
    xAxis.setAttribute('stroke-width', '2');
    g.appendChild(xAxis);

    const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    yAxis.setAttribute('x1', '0');
    yAxis.setAttribute('y1', '0');
    yAxis.setAttribute('x2', '0');
    yAxis.setAttribute('y2', chartHeight.toString());
    yAxis.setAttribute('stroke', '#374151');
    yAxis.setAttribute('stroke-width', '2');
    g.appendChild(yAxis);

    // Category labels
    sortedData.forEach((dataPoint, index) => {
      const position = orientation === 'vertical' 
        ? (index * chartWidth / sortedData.length) + (groupWidth / 2)
        : (index * chartHeight / sortedData.length) + (groupWidth / 2);
      
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      
      if (orientation === 'vertical') {
        text.setAttribute('x', position.toString());
        text.setAttribute('y', (chartHeight + 20).toString());
        text.setAttribute('text-anchor', 'middle');
      } else {
        text.setAttribute('x', '-15');
        text.setAttribute('y', position.toString());
        text.setAttribute('text-anchor', 'end');
        text.setAttribute('dominant-baseline', 'middle');
      }
      
      text.setAttribute('font-size', '12');
      text.setAttribute('fill', '#6b7280');
      text.textContent = dataPoint.category;
      g.appendChild(text);
    });

    // Value axis labels
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const value = minValue + ((maxValue - minValue) / gridLines) * i;
      
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      
      if (orientation === 'vertical') {
        const y = getPosition(value);
        text.setAttribute('x', '-15');
        text.setAttribute('y', y.toString());
        text.setAttribute('text-anchor', 'end');
        text.setAttribute('dominant-baseline', 'middle');
      } else {
        const x = getPosition(value);
        text.setAttribute('x', x.toString());
        text.setAttribute('y', (chartHeight + 20).toString());
        text.setAttribute('text-anchor', 'middle');
      }
      
      text.setAttribute('font-size', '12');
      text.setAttribute('fill', '#6b7280');
      text.textContent = value.toFixed(1);
      g.appendChild(text);
    }

    // Y-axis label
    if (yAxisLabel) {
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      if (orientation === 'vertical') {
        label.setAttribute('x', (-chartHeight / 2).toString());
        label.setAttribute('y', '-45');
        label.setAttribute('transform', `rotate(-90, ${-chartHeight / 2}, -45)`);
      } else {
        label.setAttribute('x', (chartWidth / 2).toString());
        label.setAttribute('y', (chartHeight + 50).toString());
      }
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', '14');
      label.setAttribute('fill', '#374151');
      label.textContent = yAxisLabel;
      g.appendChild(label);
    }

    // Title
    if (title) {
      const titleElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      titleElement.setAttribute('x', (chartWidth / 2).toString());
      titleElement.setAttribute('y', '-25');
      titleElement.setAttribute('text-anchor', 'middle');
      titleElement.setAttribute('font-size', '18');
      titleElement.setAttribute('font-weight', 'bold');
      titleElement.setAttribute('fill', '#111827');
      titleElement.classList.add('dark:fill-white');
      titleElement.textContent = title;
      g.appendChild(titleElement);
    }

    svg.appendChild(g);
  }, [sortedData, width, height, orientation, animated, colors, showGrid, showValues, showTrendIndicators, showTargetLine]);

  return (
    <div className={cn("relative", className)}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="border rounded-lg bg-white dark:bg-gray-800"
        data-testid="enhanced-bar-chart"
      />

      {showTooltip && hoveredBar && (
        <div
          className="absolute bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-3 rounded-lg shadow-lg pointer-events-none z-10"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 10,
            transform: 'translate(-50%, -100%)'
          }}
          data-testid="bar-chart-tooltip"
        >
          <div className="text-sm font-semibold">{typeof hoveredBar.x === 'object' && hoveredBar.x instanceof Date ? hoveredBar.x.toLocaleDateString() : hoveredBar.x}</div>
          <div className="text-sm">{hoveredBar.label}: {hoveredBar.y.toFixed(2)}</div>
          {hoveredBar.metadata?.trend && (
            <div className="text-xs opacity-90">
              Trend: {getTrendIcon(hoveredBar.metadata.trend)} {hoveredBar.metadata.trend}
            </div>
          )}
        </div>
      )}

      {showLegend && (
        <div className="mt-4 flex flex-wrap gap-4 justify-center" data-testid="bar-chart-legend">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: colors[0] }} />
            <span className="text-sm">Current</span>
          </div>
          {sortedData.some(d => d.target) && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded opacity-70" style={{ backgroundColor: colors[1] }} />
              <span className="text-sm">Target</span>
            </div>
          )}
          {showTrendIndicators && (
            <div className="flex items-center gap-4 ml-4">
              <div className="flex items-center gap-1">
                <span style={{ color: getTrendColor('up') }}>↗</span>
                <span className="text-xs">Improving</span>
              </div>
              <div className="flex items-center gap-1">
                <span style={{ color: getTrendColor('stable') }}>→</span>
                <span className="text-xs">Stable</span>
              </div>
              <div className="flex items-center gap-1">
                <span style={{ color: getTrendColor('down') }}>↘</span>
                <span className="text-xs">Declining</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}