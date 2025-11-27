// Advanced Chart Components for Analytics Dashboard
export { HeatMap } from './HeatMap';
export { GaugeChart } from './GaugeChart';
export { ComboChart } from './ComboChart';
export { EnhancedLineChart } from './EnhancedLineChart';
export { EnhancedBarChart } from './EnhancedBarChart';

// Chart component types and interfaces
export type { HeatMapData, ChartDataPoint, TimeSeriesData, ComparisonData } from '@shared/schema';

// Chart configuration types
export interface ChartConfig {
  width?: number;
  height?: number;
  colors?: string[];
  animated?: boolean;
  interactive?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
}

export interface DrillDownConfig {
  enabled: boolean;
  onDataPointClick?: (data: any) => void;
  onDataPointHover?: (data: any) => void;
}

export interface ExportConfig {
  enabled: boolean;
  formats?: ('png' | 'svg' | 'pdf')[];
  filename?: string;
}