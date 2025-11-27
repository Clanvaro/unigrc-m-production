import { useEffect, useRef, useState } from 'react';
import { type ChartDataPoint } from '@shared/schema';
import { cn } from '@/lib/utils';

interface ComboChartData {
  label: string;
  bars?: number[];
  lines?: number[];
  areas?: number[];
}

interface ComboChartProps {
  data: ComboChartData[];
  width?: number;
  height?: number;
  barColors?: string[];
  lineColors?: string[];
  areaColors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  interactive?: boolean;
  onDataPointClick?: (data: ChartDataPoint) => void;
  onDataPointHover?: (data: ChartDataPoint | null) => void;
  yAxisLabel?: string;
  y2AxisLabel?: string;
  title?: string;
  className?: string;
  animated?: boolean;
}

export function ComboChart({
  data,
  width = 800,
  height = 400,
  barColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
  lineColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316'],
  areaColors = ['rgba(59, 130, 246, 0.2)', 'rgba(16, 185, 129, 0.2)'],
  showLegend = true,
  showGrid = true,
  showTooltip = true,
  interactive = true,
  onDataPointClick,
  onDataPointHover,
  yAxisLabel,
  y2AxisLabel,
  title,
  className,
  animated = true
}: ComboChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const margin = { top: 60, right: 80, bottom: 80, left: 80 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Calculate scales and ranges
  const allBarValues = data.flatMap(d => d.bars || []);
  const allLineValues = data.flatMap(d => d.lines || []);
  const allAreaValues = data.flatMap(d => d.areas || []);
  
  const maxBarValue = allBarValues.length > 0 ? Math.max(...allBarValues) : 0;
  const maxLineValue = Math.max(...allLineValues, ...allAreaValues);
  const minLineValue = Math.min(...allLineValues, ...allAreaValues, 0);
  
  const barScale = maxBarValue > 0 ? chartHeight / maxBarValue : 1;
  const lineScale = (maxLineValue - minLineValue) > 0 ? chartHeight / (maxLineValue - minLineValue) : 1;
  
  const xStep = chartWidth / Math.max(data.length - 1, 1);
  const barWidth = xStep * 0.6;

  const getBarY = (value: number) => chartHeight - (value * barScale);
  const getLineY = (value: number) => chartHeight - ((value - minLineValue) * lineScale);

  const handlePointClick = (point: ChartDataPoint) => {
    if (interactive && onDataPointClick) {
      onDataPointClick(point);
    }
  };

  const handlePointHover = (point: ChartDataPoint | null, event?: React.MouseEvent) => {
    setHoveredPoint(point);
    if (event) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        setTooltipPosition({ 
          x: event.clientX - rect.left, 
          y: event.clientY - rect.top 
        });
      }
    }
    if (interactive && onDataPointHover) {
      onDataPointHover(point);
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
      // Horizontal grid lines
      for (let i = 0; i <= 5; i++) {
        const y = (chartHeight / 5) * i;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', '0');
        line.setAttribute('y1', y.toString());
        line.setAttribute('x2', chartWidth.toString());
        line.setAttribute('y2', y.toString());
        line.setAttribute('stroke', '#e5e7eb');
        line.setAttribute('stroke-width', '0.5');
        line.classList.add('dark:stroke-gray-700');
        g.appendChild(line);
      }

      // Vertical grid lines
      data.forEach((_, index) => {
        const x = index * xStep;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x.toString());
        line.setAttribute('y1', '0');
        line.setAttribute('x2', x.toString());
        line.setAttribute('y2', chartHeight.toString());
        line.setAttribute('stroke', '#e5e7eb');
        line.setAttribute('stroke-width', '0.5');
        line.classList.add('dark:stroke-gray-700');
        g.appendChild(line);
      });
    }

    // Draw areas first (background)
    if (data.some(d => d.areas)) {
      const maxAreas = Math.max(...data.map(d => (d.areas || []).length));
      for (let seriesIndex = 0; seriesIndex < maxAreas; seriesIndex++) {
        const pathData = data.map((d, index) => {
          const value = (d.areas || [])[seriesIndex] || 0;
          const x = index * xStep;
          const y = getLineY(value);
          return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');
        
        const closePath = ` L ${(data.length - 1) * xStep} ${chartHeight} L 0 ${chartHeight} Z`;
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData + closePath);
        path.setAttribute('fill', areaColors[seriesIndex % areaColors.length]);
        path.setAttribute('stroke', 'none');
        
        if (animated) {
          path.style.opacity = '0';
          path.style.transition = 'opacity 0.5s ease-in-out';
          setTimeout(() => {
            path.style.opacity = '1';
          }, seriesIndex * 100);
        }
        
        g.appendChild(path);
      }
    }

    // Draw bars
    if (data.some(d => d.bars)) {
      const maxBars = Math.max(...data.map(d => (d.bars || []).length));
      const barGroupWidth = barWidth / maxBars;
      
      data.forEach((d, dataIndex) => {
        (d.bars || []).forEach((value, seriesIndex) => {
          const x = dataIndex * xStep - barWidth / 2 + seriesIndex * barGroupWidth;
          const y = getBarY(value);
          const barHeight = chartHeight - y;
          
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', x.toString());
          rect.setAttribute('y', y.toString());
          rect.setAttribute('width', barGroupWidth.toString());
          rect.setAttribute('height', barHeight.toString());
          rect.setAttribute('fill', barColors[seriesIndex % barColors.length]);
          rect.setAttribute('stroke', '#fff');
          rect.setAttribute('stroke-width', '1');
          
          if (interactive) {
            rect.style.cursor = 'pointer';
            const pointData: ChartDataPoint = {
              x: d.label,
              y: value,
              label: `Bar ${seriesIndex + 1}`,
              metadata: { type: 'bar', seriesIndex, dataIndex }
            };
            rect.addEventListener('click', () => handlePointClick(pointData));
            rect.addEventListener('mouseenter', (e) => handlePointHover(pointData, e as any));
            rect.addEventListener('mouseleave', () => handlePointHover(null));
          }
          
          if (animated) {
            rect.style.transform = 'scaleY(0)';
            rect.style.transformOrigin = 'bottom';
            rect.style.transition = 'transform 0.5s ease-in-out';
            setTimeout(() => {
              rect.style.transform = 'scaleY(1)';
            }, (dataIndex * maxBars + seriesIndex) * 50);
          }
          
          g.appendChild(rect);
        });
      });
    }

    // Draw lines
    if (data.some(d => d.lines)) {
      const maxLines = Math.max(...data.map(d => (d.lines || []).length));
      for (let seriesIndex = 0; seriesIndex < maxLines; seriesIndex++) {
        const pathData = data.map((d, index) => {
          const value = (d.lines || [])[seriesIndex];
          if (value === undefined) return '';
          const x = index * xStep;
          const y = getLineY(value);
          return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', lineColors[seriesIndex % lineColors.length]);
        path.setAttribute('stroke-width', '2');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('stroke-linecap', 'round');
        
        if (animated) {
          const pathLength = path.getTotalLength();
          path.style.strokeDasharray = pathLength.toString();
          path.style.strokeDashoffset = pathLength.toString();
          path.style.transition = 'stroke-dashoffset 1s ease-in-out';
          setTimeout(() => {
            path.style.strokeDashoffset = '0';
          }, seriesIndex * 200);
        }
        
        g.appendChild(path);

        // Draw line points
        data.forEach((d, dataIndex) => {
          const value = (d.lines || [])[seriesIndex];
          if (value === undefined) return;
          
          const x = dataIndex * xStep;
          const y = getLineY(value);
          
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', x.toString());
          circle.setAttribute('cy', y.toString());
          circle.setAttribute('r', '4');
          circle.setAttribute('fill', lineColors[seriesIndex % lineColors.length]);
          circle.setAttribute('stroke', '#fff');
          circle.setAttribute('stroke-width', '2');
          
          if (interactive) {
            circle.style.cursor = 'pointer';
            const pointData: ChartDataPoint = {
              x: d.label,
              y: value,
              label: `Line ${seriesIndex + 1}`,
              metadata: { type: 'line', seriesIndex, dataIndex }
            };
            circle.addEventListener('click', () => handlePointClick(pointData));
            circle.addEventListener('mouseenter', (e) => handlePointHover(pointData, e as any));
            circle.addEventListener('mouseleave', () => handlePointHover(null));
          }
          
          if (animated) {
            circle.style.opacity = '0';
            circle.style.transition = 'opacity 0.3s ease-in-out';
            setTimeout(() => {
              circle.style.opacity = '1';
            }, (seriesIndex * 200) + (dataIndex * 50) + 500);
          }
          
          g.appendChild(circle);
        });
      }
    }

    // X-axis
    const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    xAxis.setAttribute('x1', '0');
    xAxis.setAttribute('y1', chartHeight.toString());
    xAxis.setAttribute('x2', chartWidth.toString());
    xAxis.setAttribute('y2', chartHeight.toString());
    xAxis.setAttribute('stroke', '#374151');
    xAxis.setAttribute('stroke-width', '1');
    g.appendChild(xAxis);

    // Y-axis
    const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    yAxis.setAttribute('x1', '0');
    yAxis.setAttribute('y1', '0');
    yAxis.setAttribute('x2', '0');
    yAxis.setAttribute('y2', chartHeight.toString());
    yAxis.setAttribute('stroke', '#374151');
    yAxis.setAttribute('stroke-width', '1');
    g.appendChild(yAxis);

    // X-axis labels
    data.forEach((d, index) => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', (index * xStep).toString());
      text.setAttribute('y', (chartHeight + 20).toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '12');
      text.setAttribute('fill', '#6b7280');
      text.textContent = d.label;
      g.appendChild(text);
    });

    // Y-axis labels (left - bars)
    if (maxBarValue > 0) {
      for (let i = 0; i <= 5; i++) {
        const value = (maxBarValue / 5) * i;
        const y = chartHeight - (i * chartHeight / 5);
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '-10');
        text.setAttribute('y', y.toString());
        text.setAttribute('text-anchor', 'end');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('font-size', '12');
        text.setAttribute('fill', '#6b7280');
        text.textContent = value.toFixed(0);
        g.appendChild(text);
      }
    }

    // Y-axis labels (right - lines)
    if (maxLineValue > minLineValue) {
      const rightYAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      rightYAxis.setAttribute('x1', chartWidth.toString());
      rightYAxis.setAttribute('y1', '0');
      rightYAxis.setAttribute('x2', chartWidth.toString());
      rightYAxis.setAttribute('y2', chartHeight.toString());
      rightYAxis.setAttribute('stroke', '#374151');
      rightYAxis.setAttribute('stroke-width', '1');
      g.appendChild(rightYAxis);

      for (let i = 0; i <= 5; i++) {
        const value = minLineValue + ((maxLineValue - minLineValue) / 5) * i;
        const y = chartHeight - (i * chartHeight / 5);
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', (chartWidth + 10).toString());
        text.setAttribute('y', y.toString());
        text.setAttribute('text-anchor', 'start');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('font-size', '12');
        text.setAttribute('fill', '#6b7280');
        text.textContent = value.toFixed(1);
        g.appendChild(text);
      }
    }

    // Axis labels
    if (yAxisLabel) {
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', (-chartHeight / 2).toString());
      label.setAttribute('y', '-50');
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', '14');
      label.setAttribute('fill', '#374151');
      label.setAttribute('transform', `rotate(-90, ${-chartHeight / 2}, -50)`);
      label.textContent = yAxisLabel;
      g.appendChild(label);
    }

    if (y2AxisLabel) {
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', (chartWidth + 60).toString());
      label.setAttribute('y', (chartHeight / 2).toString());
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', '14');
      label.setAttribute('fill', '#374151');
      label.setAttribute('transform', `rotate(90, ${chartWidth + 60}, ${chartHeight / 2})`);
      label.textContent = y2AxisLabel;
      g.appendChild(label);
    }

    // Title
    if (title) {
      const titleElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      titleElement.setAttribute('x', (chartWidth / 2).toString());
      titleElement.setAttribute('y', '-30');
      titleElement.setAttribute('text-anchor', 'middle');
      titleElement.setAttribute('font-size', '16');
      titleElement.setAttribute('font-weight', 'bold');
      titleElement.setAttribute('fill', '#111827');
      titleElement.classList.add('dark:fill-white');
      titleElement.textContent = title;
      g.appendChild(titleElement);
    }

    svg.appendChild(g);
  }, [data, width, height, animated, barColors, lineColors, areaColors, showGrid]);

  return (
    <div className={cn("relative", className)}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="border rounded-lg bg-white dark:bg-gray-800"
        data-testid="combo-chart"
      />

      {showTooltip && hoveredPoint && (
        <div
          className="absolute bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-3 py-2 rounded-lg shadow-lg pointer-events-none z-10"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 10,
            transform: 'translate(-50%, -100%)'
          }}
          data-testid="combo-chart-tooltip"
        >
          <div className="text-sm font-semibold">{hoveredPoint.label}</div>
          <div className="text-sm">Value: {hoveredPoint.y.toFixed(2)}</div>
          <div className="text-xs opacity-90">{typeof hoveredPoint.x === 'object' && hoveredPoint.x instanceof Date ? hoveredPoint.x.toLocaleDateString() : hoveredPoint.x}</div>
        </div>
      )}

      {showLegend && (
        <div className="mt-4 flex flex-wrap gap-4 justify-center" data-testid="combo-chart-legend">
          {data[0]?.bars && data[0].bars.map((_, index) => (
            <div key={`bar-${index}`} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded"
                style={{ backgroundColor: barColors[index % barColors.length] }}
              />
              <span className="text-sm">Bar Series {index + 1}</span>
            </div>
          ))}
          {data[0]?.lines && data[0].lines.map((_, index) => (
            <div key={`line-${index}`} className="flex items-center gap-2">
              <div 
                className="w-4 h-1 rounded"
                style={{ backgroundColor: lineColors[index % lineColors.length] }}
              />
              <span className="text-sm">Line Series {index + 1}</span>
            </div>
          ))}
          {data[0]?.areas && data[0].areas.map((_, index) => (
            <div key={`area-${index}`} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded opacity-50"
                style={{ backgroundColor: areaColors[index % areaColors.length].replace('rgba', 'rgb').replace(/,\s*[\d.]+\)/, ')') }}
              />
              <span className="text-sm">Area Series {index + 1}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}