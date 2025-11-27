import { useEffect, useRef, useState } from 'react';
import { type HeatMapData } from '@shared/schema';
import { cn } from '@/lib/utils';

interface HeatMapProps {
  data: HeatMapData[];
  width?: number;
  height?: number;
  onCellClick?: (data: HeatMapData) => void;
  onCellHover?: (data: HeatMapData | null) => void;
  colorScale?: 'risk' | 'performance' | 'custom';
  className?: string;
  title?: string;
  showTooltip?: boolean;
  interactive?: boolean;
}

export function HeatMap({
  data,
  width = 800,
  height = 400,
  onCellClick,
  onCellHover,
  colorScale = 'risk',
  className,
  title,
  showTooltip = true,
  interactive = true
}: HeatMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredCell, setHoveredCell] = useState<HeatMapData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Get unique X and Y values
  const xValues = Array.from(new Set(data.map(d => d.x)));
  const yValues = Array.from(new Set(data.map(d => d.y)));

  // Calculate cell dimensions
  const margin = { top: 60, right: 40, bottom: 60, left: 120 };
  const cellWidth = (width - margin.left - margin.right) / xValues.length;
  const cellHeight = (height - margin.top - margin.bottom) / yValues.length;

  // Color scales
  const getColor = (value: number, max: number): string => {
    const intensity = value / max;
    
    switch (colorScale) {
      case 'risk':
        if (intensity <= 0.3) return `hsl(120, 70%, ${85 - intensity * 30}%)`; // Green
        if (intensity <= 0.7) return `hsl(60, 70%, ${85 - intensity * 30}%)`; // Yellow
        return `hsl(0, 70%, ${85 - intensity * 30}%)`; // Red
      
      case 'performance':
        return `hsl(200, 70%, ${85 - intensity * 50}%)`; // Blue scale
      
      case 'custom':
        return `hsl(280, 70%, ${85 - intensity * 50}%)`; // Purple scale
      
      default:
        return `hsl(0, 0%, ${85 - intensity * 50}%)`; // Gray scale
    }
  };

  const maxValue = Math.max(...data.map(d => d.value));

  const handleCellClick = (cellData: HeatMapData) => {
    if (interactive && onCellClick) {
      onCellClick(cellData);
    }
  };

  const handleCellHover = (cellData: HeatMapData | null, event?: React.MouseEvent) => {
    setHoveredCell(cellData);
    if (event) {
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    }
    if (interactive && onCellHover) {
      onCellHover(cellData);
    }
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // Clear previous content
    svg.innerHTML = '';

    // Create the chart
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${margin.left}, ${margin.top})`);

    // Draw cells
    data.forEach(d => {
      const xIndex = xValues.indexOf(d.x);
      const yIndex = yValues.indexOf(d.y);
      
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', (xIndex * cellWidth).toString());
      rect.setAttribute('y', (yIndex * cellHeight).toString());
      rect.setAttribute('width', cellWidth.toString());
      rect.setAttribute('height', cellHeight.toString());
      rect.setAttribute('fill', d.color || getColor(d.value, maxValue));
      rect.setAttribute('stroke', '#fff');
      rect.setAttribute('stroke-width', '1');
      
      if (interactive) {
        rect.style.cursor = 'pointer';
        rect.addEventListener('click', () => handleCellClick(d));
        rect.addEventListener('mouseenter', (e) => handleCellHover(d, e as any));
        rect.addEventListener('mouseleave', () => handleCellHover(null));
      }

      g.appendChild(rect);

      // Add value text
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', (xIndex * cellWidth + cellWidth / 2).toString());
      text.setAttribute('y', (yIndex * cellHeight + cellHeight / 2).toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('fill', d.value > maxValue * 0.6 ? '#fff' : '#000');
      text.setAttribute('font-size', '12');
      text.textContent = d.value.toFixed(1);
      
      g.appendChild(text);
    });

    // Add X axis labels
    xValues.forEach((label, index) => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', (index * cellWidth + cellWidth / 2).toString());
      text.setAttribute('y', (yValues.length * cellHeight + 20).toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '12');
      text.textContent = label;
      g.appendChild(text);
    });

    // Add Y axis labels
    yValues.forEach((label, index) => {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', '-10');
      text.setAttribute('y', (index * cellHeight + cellHeight / 2).toString());
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('font-size', '12');
      text.textContent = label;
      g.appendChild(text);
    });

    // Add title
    if (title) {
      const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      titleText.setAttribute('x', ((xValues.length * cellWidth) / 2).toString());
      titleText.setAttribute('y', '-30');
      titleText.setAttribute('text-anchor', 'middle');
      titleText.setAttribute('font-size', '16');
      titleText.setAttribute('font-weight', 'bold');
      titleText.textContent = title;
      g.appendChild(titleText);
    }

    svg.appendChild(g);
  }, [data, width, height, maxValue, colorScale, title, interactive]);

  return (
    <div className={cn("relative", className)}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="border rounded-lg"
        data-testid="heatmap-chart"
      />
      
      {showTooltip && hoveredCell && (
        <div
          className="absolute bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-3 py-2 rounded-lg shadow-lg pointer-events-none z-10"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 10,
            transform: 'translate(-50%, -100%)'
          }}
          data-testid="heatmap-tooltip"
        >
          <div className="text-sm font-semibold">{hoveredCell.x} × {hoveredCell.y}</div>
          <div className="text-sm">Value: {hoveredCell.value.toFixed(2)}</div>
          {hoveredCell.tooltip && (
            <div className="text-xs mt-1 opacity-90">{hoveredCell.tooltip}</div>
          )}
        </div>
      )}
    </div>
  );
}