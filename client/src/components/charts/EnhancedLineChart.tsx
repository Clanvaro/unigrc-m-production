import { useEffect, useRef, useState } from 'react';
import { type TimeSeriesData, type ChartDataPoint } from '@shared/schema';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface EnhancedLineChartProps {
  data: TimeSeriesData[];
  width?: number;
  height?: number;
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  interactive?: boolean;
  animated?: boolean;
  onDataPointClick?: (data: ChartDataPoint) => void;
  onDataPointHover?: (data: ChartDataPoint | null) => void;
  yAxisLabel?: string;
  title?: string;
  className?: string;
  smoothCurve?: boolean;
  showDataPoints?: boolean;
  gradientFill?: boolean;
  zoomable?: boolean;
  multiSeries?: boolean;
}

export function EnhancedLineChart({
  data,
  width = 800,
  height = 400,
  colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
  showLegend = true,
  showGrid = true,
  showTooltip = true,
  interactive = true,
  animated = true,
  onDataPointClick,
  onDataPointHover,
  yAxisLabel,
  title,
  className,
  smoothCurve = true,
  showDataPoints = true,
  gradientFill = false,
  zoomable = false,
  multiSeries = false
}: EnhancedLineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  const margin = { top: 60, right: 60, bottom: 80, left: 80 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Group data by category for multi-series
  const seriesData = multiSeries 
    ? data.reduce((acc, point) => {
        const category = point.category || 'Default';
        if (!acc[category]) acc[category] = [];
        acc[category].push(point);
        return acc;
      }, {} as Record<string, TimeSeriesData[]>)
    : { Default: data };

  // Calculate scales
  const allValues = data.map(d => d.value);
  const allDates = data.map(d => d.date);
  
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const valueRange = maxValue - minValue;
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
  const timeRange = maxDate.getTime() - minDate.getTime();

  const getX = (date: Date) => ((date.getTime() - minDate.getTime()) / timeRange) * chartWidth;
  const getY = (value: number) => chartHeight - ((value - minValue) / valueRange) * chartHeight;

  // Create smooth curve path
  const createSmoothPath = (points: TimeSeriesData[]): string => {
    if (points.length < 2) return '';
    
    if (!smoothCurve) {
      return points.map((point, index) => {
        const x = getX(point.date);
        const y = getY(point.value);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ');
    }

    // Create smooth bezier curves
    let path = '';
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const x = getX(point.date);
      const y = getY(point.value);

      if (i === 0) {
        path += `M ${x} ${y}`;
      } else {
        const prevPoint = points[i - 1];
        const prevX = getX(prevPoint.date);
        const prevY = getY(prevPoint.value);
        
        // Calculate control points for smooth curve
        const cp1x = prevX + (x - prevX) / 3;
        const cp1y = prevY;
        const cp2x = x - (x - prevX) / 3;
        const cp2y = y;
        
        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y}`;
      }
    }
    return path;
  };

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
    g.setAttribute('transform', `translate(${margin.left}, ${margin.top}) scale(${zoomLevel}) translate(${panOffset.x}, ${panOffset.y})`);

    // Gradient definitions
    if (gradientFill) {
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      Object.keys(seriesData).forEach((seriesName, seriesIndex) => {
        const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        gradient.setAttribute('id', `gradient-${seriesIndex}`);
        gradient.setAttribute('x1', '0%');
        gradient.setAttribute('y1', '0%');
        gradient.setAttribute('x2', '0%');
        gradient.setAttribute('y2', '100%');
        
        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', colors[seriesIndex % colors.length]);
        stop1.setAttribute('stop-opacity', '0.3');
        
        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('stop-color', colors[seriesIndex % colors.length]);
        stop2.setAttribute('stop-opacity', '0.05');
        
        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        defs.appendChild(gradient);
      });
      g.appendChild(defs);
    }

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
        line.setAttribute('stroke-dasharray', '2,2');
        line.classList.add('dark:stroke-gray-700');
        g.appendChild(line);
      }

      // Vertical grid lines
      const timeStep = timeRange / 6;
      for (let i = 0; i <= 6; i++) {
        const date = new Date(minDate.getTime() + (timeStep * i));
        const x = getX(date);
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

    // Draw series
    Object.entries(seriesData).forEach(([seriesName, points], seriesIndex) => {
      const color = colors[seriesIndex % colors.length];
      
      // Create area fill if gradient is enabled
      if (gradientFill && points.length > 0) {
        const areaPath = createSmoothPath(points) + 
          ` L ${getX(points[points.length - 1].date)} ${chartHeight} L ${getX(points[0].date)} ${chartHeight} Z`;
        
        const area = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        area.setAttribute('d', areaPath);
        area.setAttribute('fill', `url(#gradient-${seriesIndex})`);
        area.setAttribute('stroke', 'none');
        
        if (animated) {
          area.style.opacity = '0';
          area.style.transition = 'opacity 0.8s ease-in-out';
          setTimeout(() => {
            area.style.opacity = '1';
          }, seriesIndex * 200);
        }
        
        g.appendChild(area);
      }

      // Draw line
      const linePath = createSmoothPath(points);
      if (linePath) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', linePath);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', '3');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('stroke-linecap', 'round');
        
        if (animated) {
          const pathLength = path.getTotalLength();
          path.style.strokeDasharray = pathLength.toString();
          path.style.strokeDashoffset = pathLength.toString();
          path.style.transition = 'stroke-dashoffset 1.5s ease-in-out';
          setTimeout(() => {
            path.style.strokeDashoffset = '0';
          }, seriesIndex * 300);
        }
        
        g.appendChild(path);
      }

      // Draw data points
      if (showDataPoints) {
        points.forEach((point, pointIndex) => {
          const x = getX(point.date);
          const y = getY(point.value);
          
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', x.toString());
          circle.setAttribute('cy', y.toString());
          circle.setAttribute('r', '5');
          circle.setAttribute('fill', color);
          circle.setAttribute('stroke', '#fff');
          circle.setAttribute('stroke-width', '2');
          circle.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))';
          
          if (interactive) {
            circle.style.cursor = 'pointer';
            circle.addEventListener('mouseenter', () => {
              circle.setAttribute('r', '7');
            });
            circle.addEventListener('mouseleave', () => {
              circle.setAttribute('r', '5');
            });
            
            const pointData: ChartDataPoint = {
              x: format(point.date, 'MMM dd, yyyy'),
              y: point.value,
              label: point.category || seriesName,
              metadata: { series: seriesName, date: point.date }
            };
            
            circle.addEventListener('click', () => handlePointClick(pointData));
            circle.addEventListener('mouseenter', (e) => handlePointHover(pointData, e as any));
            circle.addEventListener('mouseleave', () => handlePointHover(null));
          }
          
          if (animated) {
            circle.style.opacity = '0';
            circle.style.transform = 'scale(0)';
            circle.style.transition = 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out';
            setTimeout(() => {
              circle.style.opacity = '1';
              circle.style.transform = 'scale(1)';
            }, (seriesIndex * 300) + (pointIndex * 50) + 800);
          }
          
          g.appendChild(circle);
        });
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

    // X-axis labels (dates)
    const timeStep = timeRange / 6;
    for (let i = 0; i <= 6; i++) {
      const date = new Date(minDate.getTime() + (timeStep * i));
      const x = getX(date);
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x.toString());
      text.setAttribute('y', (chartHeight + 25).toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '12');
      text.setAttribute('fill', '#6b7280');
      text.textContent = format(date, 'MMM dd');
      g.appendChild(text);
    }

    // Y-axis labels
    for (let i = 0; i <= 5; i++) {
      const value = minValue + ((maxValue - minValue) / 5) * i;
      const y = chartHeight - (i * chartHeight / 5);
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', '-15');
      text.setAttribute('y', y.toString());
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('font-size', '12');
      text.setAttribute('fill', '#6b7280');
      text.textContent = value.toFixed(1);
      g.appendChild(text);
    }

    // Y-axis label
    if (yAxisLabel) {
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', (-chartHeight / 2).toString());
      label.setAttribute('y', '-45');
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', '14');
      label.setAttribute('fill', '#374151');
      label.setAttribute('transform', `rotate(-90, ${-chartHeight / 2}, -45)`);
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

    // Zoom functionality
    if (zoomable && interactive) {
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoomLevel(prev => Math.max(0.5, Math.min(3, prev * delta)));
      };

      svg.addEventListener('wheel', handleWheel);
      return () => svg.removeEventListener('wheel', handleWheel);
    }
  }, [data, width, height, animated, colors, showGrid, smoothCurve, showDataPoints, gradientFill, zoomLevel, panOffset]);

  return (
    <div className={cn("relative", className)}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="border rounded-lg bg-white dark:bg-gray-800 overflow-hidden"
        data-testid="enhanced-line-chart"
      />

      {showTooltip && hoveredPoint && (
        <div
          className="absolute bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-3 rounded-lg shadow-lg pointer-events-none z-10"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 10,
            transform: 'translate(-50%, -100%)'
          }}
          data-testid="line-chart-tooltip"
        >
          <div className="text-sm font-semibold">{hoveredPoint.label}</div>
          <div className="text-sm">Value: {hoveredPoint.y.toFixed(2)}</div>
          <div className="text-xs opacity-90">{typeof hoveredPoint.x === 'object' && hoveredPoint.x instanceof Date ? hoveredPoint.x.toLocaleDateString() : hoveredPoint.x}</div>
          {hoveredPoint.metadata?.tooltip && (
            <div className="text-xs mt-1 opacity-80">{hoveredPoint.metadata.tooltip}</div>
          )}
        </div>
      )}

      {showLegend && multiSeries && (
        <div className="mt-4 flex flex-wrap gap-4 justify-center" data-testid="line-chart-legend">
          {Object.keys(seriesData).map((seriesName, index) => (
            <div key={seriesName} className="flex items-center gap-2">
              <div 
                className="w-4 h-1 rounded"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span className="text-sm">{seriesName}</span>
            </div>
          ))}
        </div>
      )}

      {zoomable && (
        <div className="mt-2 flex gap-2 justify-center" data-testid="zoom-controls">
          <button
            onClick={() => setZoomLevel(prev => Math.max(0.5, prev * 0.8))}
            className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Zoom Out
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Reset
          </button>
          <button
            onClick={() => setZoomLevel(prev => Math.min(3, prev * 1.2))}
            className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Zoom In
          </button>
        </div>
      )}
    </div>
  );
}