import { useRef, useCallback, ReactNode, KeyboardEvent, useState, useEffect, Component, ErrorInfo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

// Error boundary for individual cells to prevent entire table from crashing
class CellErrorBoundary extends Component<
  { children: ReactNode; columnId: string; rowIndex: number },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; columnId: string; rowIndex: number }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[VirtualizedTable] Cell render error in column "${this.props.columnId}", row ${this.props.rowIndex}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <span className="text-xs text-red-500" title={this.state.error?.message}>
          Error
        </span>
      );
    }
    return this.props.children;
  }
}

export interface VirtualizedTableColumn<T> {
  id: string;
  header: ReactNode;
  width?: string;
  minWidth?: string;
  cell: (item: T, index: number) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  visible?: boolean;
  hideOnMobile?: boolean;
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: VirtualizedTableColumn<T>[];
  estimatedRowHeight?: number;
  overscan?: number;
  getRowKey: (item: T, index: number) => string;
  onRowClick?: (item: T, index: number) => void;
  headerClassName?: string;
  rowClassName?: string | ((item: T, index: number) => string);
  isLoading?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

export function VirtualizedTable<T>({
  data,
  columns,
  estimatedRowHeight = 65,
  overscan = 5,
  getRowKey,
  onRowClick,
  headerClassName = "",
  rowClassName = "",
  isLoading = false,
  ariaLabel = "Tabla de datos",
  ariaDescribedBy,
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);

  // Filter visible columns based on viewport size
  const visibleColumns = columns.filter(col => {
    if (col.visible === false) return false;
    // hideOnMobile is handled via CSS (@md:hidden) on the column itself
    return true;
  });

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan,
  });

  const items = virtualizer.getVirtualItems();

  // Keyboard navigation handler - WCAG 2.1.1
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>, rowIndex: number) => {
    switch(e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (rowIndex < data.length - 1) {
          setFocusedRowIndex(rowIndex + 1);
          // Focus the next row
          const nextRow = document.querySelector(`[data-row-index="${rowIndex + 1}"]`) as HTMLElement;
          nextRow?.focus();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (rowIndex > 0) {
          setFocusedRowIndex(rowIndex - 1);
          // Focus the previous row
          const prevRow = document.querySelector(`[data-row-index="${rowIndex - 1}"]`) as HTMLElement;
          prevRow?.focus();
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (onRowClick) {
          onRowClick(data[rowIndex], rowIndex);
        }
        break;
    }
  };

  if (isLoading) {
    return (
      <div 
        className="flex items-center justify-center p-8" 
        role="status" 
        aria-live="polite" 
        aria-busy="true"
      >
        <div className="text-muted-foreground">Cargando...</div>
        <span className="sr-only">Cargando datos de la tabla</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div 
        className="flex items-center justify-center p-8" 
        role="status"
      >
        <div className="text-muted-foreground">No hay datos para mostrar</div>
      </div>
    );
  }

  return (
    <div 
      ref={parentRef} 
      className="@container overflow-auto border rounded-md w-full h-full"
      role="grid"
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      style={{ 
        minHeight: '400px',
        contain: 'strict',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {/* Header */}
      <div 
        role="rowgroup"
        className={`sticky top-0 z-10 bg-muted border-b ${headerClassName}`}
        style={{ 
          display: 'grid', 
          gridTemplateColumns: visibleColumns.map(col => col.width || 'minmax(100px, 1fr)').join(' '),
          minWidth: 'max-content',
          width: '100%'
        }}
      >
        {visibleColumns.map((column) => (
          <div
            key={column.id}
            role="columnheader"
            className={`p-4 font-medium text-left ${column.hideOnMobile ? 'hidden @md:block' : ''} ${column.headerClassName || ''}`}
            style={{ minWidth: column.minWidth }}
          >
            {column.header}
          </div>
        ))}
      </div>

      {/* Virtual rows container */}
      <div
        role="rowgroup"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {items.map((virtualRow) => {
          const item = data[virtualRow.index];
          const rowKey = getRowKey(item, virtualRow.index);
          const rowClass = typeof rowClassName === 'function' 
            ? rowClassName(item, virtualRow.index) 
            : rowClassName;

          return (
            <div
              key={rowKey}
              data-testid={`virtualized-row-${rowKey}`}
              data-row-index={virtualRow.index}
              role="row"
              tabIndex={0}
              aria-rowindex={virtualRow.index + 1}
              onKeyDown={(e) => handleKeyDown(e, virtualRow.index)}
              className={`border-b hover:bg-muted/50 transition-colors ${rowClass} ${onRowClick ? 'cursor-pointer' : ''}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                minWidth: 'max-content',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                display: 'grid',
                gridTemplateColumns: visibleColumns.map(col => col.width || 'minmax(100px, 1fr)').join(' '),
              }}
              onClick={() => onRowClick?.(item, virtualRow.index)}
            >
              {visibleColumns.map((column) => (
                <div
                  key={column.id}
                  role="gridcell"
                  className={`p-4 flex overflow-hidden ${column.hideOnMobile ? 'hidden @md:flex' : ''} ${column.cellClassName || 'items-start'}`}
                  style={{ 
                    minWidth: 0,
                    overflow: 'hidden'
                  }}
                >
                  <CellErrorBoundary columnId={column.id} rowIndex={virtualRow.index}>
                    {column.cell(item, virtualRow.index)}
                  </CellErrorBoundary>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Utility function to generate mock data for testing
export function generateMockRisks(count: number) {
  const mockData = [];
  const categories = ['Operacional', 'Financiero', 'Estratégico', 'Tecnológico', 'Legal'];
  const processes = ['Ventas', 'Compras', 'RRHH', 'TI', 'Finanzas'];
  
  for (let i = 0; i < count; i++) {
    mockData.push({
      id: `mock-risk-${i}`,
      code: `R-${String(i + 1).padStart(6, '0')}`,
      name: `Riesgo de Prueba ${i + 1}`,
      description: `Descripción detallada del riesgo ${i + 1} para pruebas de rendimiento`,
      category: [categories[Math.floor(Math.random() * categories.length)]],
      probability: Math.floor(Math.random() * 5) + 1,
      impact: Math.floor(Math.random() * 5) + 1,
      inherentRisk: (Math.random() * 20 + 5).toFixed(1),
      processOwner: `Responsable ${i % 10}`,
      processId: `proc-${i % 5}`,
      macroprocesoId: null,
      subprocesoId: null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  
  return mockData;
}

export function generateMockControls(count: number) {
  const mockData = [];
  const types = ['preventive', 'detective', 'corrective'];
  const frequencies = ['daily', 'weekly', 'monthly', 'quarterly'];
  
  for (let i = 0; i < count; i++) {
    mockData.push({
      id: `mock-control-${i}`,
      code: `C-${String(i + 1).padStart(6, '0')}`,
      name: `Control de Prueba ${i + 1}`,
      description: `Descripción del control ${i + 1}`,
      type: types[Math.floor(Math.random() * types.length)],
      frequency: frequencies[Math.floor(Math.random() * frequencies.length)],
      effectiveness: Math.floor(Math.random() * 30) + 70,
      lastReview: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      validationStatus: ['validated', 'pending_validation', 'rejected'][Math.floor(Math.random() * 3)],
      validatedAt: Math.random() > 0.5 ? new Date().toISOString() : null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  
  return mockData;
}

export function generateMockEvents(count: number) {
  const mockData = [];
  const eventTypes = ['materializado', 'fraude', 'delito'];
  const statuses = ['abierto', 'en_investigacion', 'cerrado', 'escalado'];
  const severities = ['baja', 'media', 'alta', 'critica'];
  
  for (let i = 0; i < count; i++) {
    mockData.push({
      id: `mock-event-${i}`,
      code: `E-${String(i + 1).padStart(6, '0')}`,
      description: `Evento de riesgo ${i + 1} para pruebas`,
      eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      eventDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      lossAmount: Math.floor(Math.random() * 1000000),
      riskId: `risk-${i % 100}`,
      processId: `proc-${i % 5}`,
      reportedBy: `Usuario ${i % 10}`,
      involvedPersons: `Persona ${i % 20}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  
  return mockData;
}
