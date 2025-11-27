import { useQuery } from "@tanstack/react-query";
import type { RiskControl, RiskWithProcess, Macroproceso, Process } from "@shared/schema";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { getRiskLevelText } from "@/lib/risk-calculations";
import { RiskValue } from "@/components/RiskValue";
import { Check, ChevronsUpDown, Filter } from "lucide-react";

// Searchable Combobox Component
interface SearchableComboboxProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  testId?: string;
}

function SearchableCombobox({
  label,
  value,
  onValueChange,
  options,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  emptyText = "No se encontraron resultados.",
  testId,
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const selectedOption = options.find((option) => option.value === value);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <div>
      <label className="text-sm font-medium mb-2 block">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            role="combobox"
            aria-expanded={open}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid={testId}
          >
            <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder={searchPlaceholder}
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => {
                      onValueChange(option.value);
                      setOpen(false);
                      setSearchValue("");
                    }}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${
                        value === option.value ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface CriticalityGapMatrixProps {
  onRiskClick?: (risk: RiskWithProcess) => void;
}

export default function CriticalityGapMatrix({ onRiskClick }: CriticalityGapMatrixProps) {
  const [selectedRisk, setSelectedRisk] = useState<RiskWithProcess | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    macroproceso: 'all',
    process: 'all',
    validationStatus: 'all',
    category: 'all'
  });

  const { data: risks = [] } = useQuery<RiskWithProcess[]>({
    queryKey: ["/api/risks-with-details"],
  });

  const { data: allRiskControls = [] } = useQuery<RiskControl[]>({
    queryKey: ["/api/risk-controls"],
  });

  const { data: macroprocesos = [] } = useQuery<Macroproceso[]>({
    queryKey: ["/api/macroprocesos"],
  });

  const { data: processes = [] } = useQuery<Process[]>({
    queryKey: ["/api/processes"],
  });

  const { data: subprocesos = [] } = useQuery<any[]>({
    queryKey: ["/api/subprocesos"],
  });

  const { data: riskCategories = [] } = useQuery<any[]>({
    queryKey: ["/api/risk-categories"],
  });

  // Hierarchical filtering logic
  const filteredRisks = risks.filter(risk => {
    // Hierarchical Macroproceso filter
    if (filters.macroproceso !== 'all') {
      const childProcesses = processes.filter((p: any) => p.macroprocesoId === filters.macroproceso);
      const childProcessIds = childProcesses.map((p: any) => p.id);
      const childSubprocesos = subprocesos.filter((sp: any) => 
        childProcesses.some((p: any) => p.id === sp.procesoId)
      );
      const childSubprocesoIds = childSubprocesos.map((sp: any) => sp.id);
      
      const belongsToMacroproceso = 
        risk.macroprocesoId === filters.macroproceso || 
        childProcessIds.includes(risk.processId) || 
        childSubprocesoIds.includes(risk.subprocesoId);
      
      if (!belongsToMacroproceso) return false;
    }

    // Hierarchical Process filter
    if (filters.process !== 'all') {
      const childSubprocesos = subprocesos.filter((sp: any) => sp.procesoId === filters.process);
      const childSubprocesoIds = childSubprocesos.map((sp: any) => sp.id);
      
      const belongsToProcess = 
        risk.processId === filters.process || 
        childSubprocesoIds.includes(risk.subprocesoId);
      
      if (!belongsToProcess) return false;
    }

    // Validation status filter
    if (filters.validationStatus !== 'all') {
      const status = risk.validationStatus || 'pending';
      
      let validationMatch = false;
      switch (filters.validationStatus) {
        case 'validated':
          validationMatch = status === 'validated' || status === 'approved';
          break;
        case 'pending':
          validationMatch = status === 'pending' || status === 'pending_validation' || status === 'notified';
          break;
        case 'observed':
          validationMatch = status === 'observed';
          break;
        case 'rejected':
          validationMatch = status === 'rejected';
          break;
        default:
          validationMatch = true;
      }
      
      if (!validationMatch) return false;
    }
    
    // Category filter
    if (filters.category !== 'all') {
      const categories = risk.category || [];
      if (!categories.includes(filters.category)) return false;
    }
    
    return true;
  });

  // Calculate residual risk for each filtered risk
  const risksWithResidual = filteredRisks.map(risk => {
    const riskResidualMap = new Map<string, number>();
    
    // Get minimum residual risk for this specific risk
    const controlsForRisk = allRiskControls.filter(rc => rc.riskId === risk.id);
    let residualRisk = risk.inherentRisk;
    
    controlsForRisk.forEach(rc => {
      const currentMin = riskResidualMap.get(rc.riskId) || Infinity;
      const residualRiskNum = Number(rc.residualRisk);
      if (residualRiskNum < currentMin) {
        riskResidualMap.set(rc.riskId, residualRiskNum);
      }
    });
    
    const finalResidualRisk = riskResidualMap.get(risk.id) || risk.inherentRisk;
    
    return {
      ...risk,
      residualRisk: finalResidualRisk,
      inherentImpact: risk.impact,
      // Convert residual risk to 1-5 scale
      residualRiskLevel: Math.min(5, Math.max(1, Math.ceil(finalResidualRisk / 5)))
    };
  });

  const handleRiskClick = (risk: RiskWithProcess & { residualRisk: number, inherentImpact: number, residualRiskLevel: number }) => {
    setSelectedRisk(risk);
    setDialogOpen(true);
    if (onRiskClick) {
      onRiskClick(risk);
    }
  };

  // Matrix dimensions and scaling
  const matrixWidth = 600;
  const matrixHeight = 400;
  const padding = 60;

  // Cascade filtering for processes
  const filteredProcesses = filters.macroproceso !== 'all'
    ? processes.filter((p: any) => p.macroprocesoId === filters.macroproceso)
    : processes;

  return (
    <div className="space-y-6">
      {/* Title and Filters */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Matriz de Criticidad y Brecha</h3>
          <div className="text-sm text-muted-foreground">
            {filteredRisks.length} riesgos • Actualizado: {new Date().toLocaleDateString('es-ES', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
        
        {/* Filters */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4" />
            <h4 className="text-sm font-semibold">Filtros</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SearchableCombobox
              label="Macroproceso"
              value={filters.macroproceso}
              onValueChange={(value) => setFilters({ ...filters, macroproceso: value, process: 'all' })}
              options={[
                { value: 'all', label: 'Todos los macroprocesos' },
                ...macroprocesos.map((m: any) => ({ value: m.id, label: m.name }))
              ]}
              placeholder="Todos los macroprocesos"
              searchPlaceholder="Buscar macroproceso..."
              testId="criticality-select-macroproceso"
            />

            <SearchableCombobox
              label="Proceso"
              value={filters.process}
              onValueChange={(value) => setFilters({ ...filters, process: value })}
              options={[
                { value: 'all', label: 'Todos los procesos' },
                ...filteredProcesses.map((p: any) => ({ value: p.id, label: p.name }))
              ]}
              placeholder="Todos los procesos"
              searchPlaceholder="Buscar proceso..."
              testId="criticality-select-process"
            />

            <SearchableCombobox
              label="Estado de Validación"
              value={filters.validationStatus}
              onValueChange={(value) => setFilters({ ...filters, validationStatus: value })}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'validated', label: 'Validados' },
                { value: 'pending', label: 'Pendientes' },
                { value: 'observed', label: 'Observados' },
                { value: 'rejected', label: 'Rechazados' }
              ]}
              placeholder="Todos"
              searchPlaceholder="Buscar estado de validación..."
              testId="criticality-select-validation-status"
            />

            <SearchableCombobox
              label="Categoría"
              value={filters.category}
              onValueChange={(value) => setFilters({ ...filters, category: value })}
              options={[
                { value: 'all', label: 'Todas las categorías' },
                ...riskCategories.map((category: any) => ({ value: category.name, label: category.name }))
              ]}
              placeholder="Todas las categorías"
              searchPlaceholder="Buscar categoría..."
              testId="criticality-select-category"
            />
          </div>
        </Card>
      </div>

      {/* Matrix Container */}
      <div className="flex justify-center">
        <div className="relative" style={{ width: matrixWidth + padding * 2, height: matrixHeight + padding * 2 }}>
          {/* SVG Matrix */}
          <svg width={matrixWidth + padding * 2} height={matrixHeight + padding * 2} className="border rounded-lg bg-white dark:bg-gray-900">
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="0.5" opacity="0.5"/>
              </pattern>
            </defs>
            <rect width={matrixWidth} height={matrixHeight} x={padding} y={padding} fill="url(#grid)" />
            
            {/* Main dividing lines at point 3 in the 0.5-5.5 range */}
            {/* Vertical line at x=3 */}
            <line 
              x1={padding + (matrixWidth * ((3 - 0.5) / 5))} 
              y1={padding} 
              x2={padding + (matrixWidth * ((3 - 0.5) / 5))} 
              y2={padding + matrixHeight} 
              stroke="#f59e0b" 
              strokeWidth="2" 
              strokeDasharray="8,4"
            />
            
            {/* Horizontal line at y=3 */}
            <line 
              x1={padding} 
              y1={padding + (matrixHeight * (1 - ((3 - 0.5) / 5)))} 
              x2={padding + matrixWidth} 
              y2={padding + (matrixHeight * (1 - ((3 - 0.5) / 5)))} 
              stroke="#f59e0b" 
              strokeWidth="2" 
              strokeDasharray="8,4"
            />

            {/* Axis labels */}
            {/* X-axis */}
            <text 
              x={padding + matrixWidth / 2} 
              y={padding + matrixHeight + 40} 
              textAnchor="middle" 
              className="text-sm fill-gray-700 dark:fill-gray-300"
            >
              Impacto (severidad)
            </text>
            
            {/* Y-axis */}
            <text 
              x={20} 
              y={padding + matrixHeight / 2} 
              textAnchor="middle" 
              className="text-sm fill-gray-700 dark:fill-gray-300"
              transform={`rotate(-90 20 ${padding + matrixHeight / 2})`}
            >
              Probabilidad →
            </text>

            {/* Axis numbers */}
            {/* X-axis numbers */}
            {[1, 2, 3, 4, 5].map(num => (
              <text 
                key={`x-${num}`}
                x={padding + (matrixWidth * ((num - 0.5) / 5))} 
                y={padding + matrixHeight + 20} 
                textAnchor="middle" 
                className="text-xs fill-gray-600 dark:fill-gray-400"
              >
                {num}
              </text>
            ))}
            
            {/* Y-axis numbers */}
            {[1, 2, 3, 4, 5].map(num => (
              <text 
                key={`y-${num}`}
                x={padding - 15} 
                y={padding + matrixHeight * (1 - ((num - 0.5) / 5))} 
                textAnchor="middle" 
                className="text-xs fill-gray-600 dark:fill-gray-400"
              >
                {num}
              </text>
            ))}

            {/* Risk points with circular dispersion for overlapping positions */}
            {(() => {
              // Group risks by their original coordinates to detect overlaps
              type RiskWithPositions = typeof risksWithResidual[0] & {
                originalX: number;
                originalY: number;
              };
              const positionGroups = new Map<string, RiskWithPositions[]>();
              
              risksWithResidual.forEach(risk => {
                // Swapped axes: Y = probability, X = impact
                const expandedImpact = risk.inherentImpact; // X-axis
                const expandedProbability = risk.probability; // Y-axis (use original probability)
                const x = padding + (matrixWidth * ((expandedImpact - 0.5) / 5));
                const y = padding + (matrixHeight * (1 - ((expandedProbability - 0.5) / 5)));
                const key = `${x.toFixed(1)}-${y.toFixed(1)}`;
                
                if (!positionGroups.has(key)) {
                  positionGroups.set(key, []);
                }
                positionGroups.get(key)!.push({
                  ...risk,
                  originalX: x,
                  originalY: y
                });
              });
              
              // Generate dispersed positions for overlapping risks
              const dispersedRisks: Array<typeof risksWithResidual[0] & {
                finalX: number;
                finalY: number;
                originalX: number;
                originalY: number;
              }> = [];
              
              positionGroups.forEach(riskGroup => {
                if (riskGroup.length === 1) {
                  // Single risk - use original position
                  const risk = riskGroup[0];
                  dispersedRisks.push({
                    ...risk,
                    finalX: risk.originalX,
                    finalY: risk.originalY
                  });
                } else {
                  // Multiple risks - disperse in circle
                  const radius = 15; // Radius for circular dispersion
                  const angleStep = (2 * Math.PI) / riskGroup.length;
                  
                  riskGroup.forEach((risk, index) => {
                    const angle = angleStep * index;
                    const offsetX = Math.cos(angle) * radius;
                    const offsetY = Math.sin(angle) * radius;
                    
                    dispersedRisks.push({
                      ...risk,
                      finalX: risk.originalX + offsetX,
                      finalY: risk.originalY + offsetY
                    });
                  });
                }
              });
              
              return dispersedRisks.map(risk => (
                <g key={risk.id}>
                  {/* Star shape for risk points */}
                  <path
                    d={`M ${risk.finalX},${risk.finalY-8} L ${risk.finalX+2.4},${risk.finalY-2.4} L ${risk.finalX+8},${risk.finalY-2.4} L ${risk.finalX+3.2},${risk.finalY+1.6} L ${risk.finalX+5.6},${risk.finalY+8} L ${risk.finalX},${risk.finalY+4} L ${risk.finalX-5.6},${risk.finalY+8} L ${risk.finalX-3.2},${risk.finalY+1.6} L ${risk.finalX-8},${risk.finalY-2.4} L ${risk.finalX-2.4},${risk.finalY-2.4} Z`}
                    fill="#f59e0b"
                    stroke="#d97706"
                    strokeWidth="1"
                    className="cursor-pointer hover:fill-orange-500 transition-colors"
                    onClick={() => handleRiskClick(risk)}
                  />
                  {/* Risk code label */}
                  <text 
                    x={risk.finalX} 
                    y={risk.finalY + 18} 
                    textAnchor="middle" 
                    className="text-xs fill-gray-700 dark:fill-gray-300 pointer-events-none"
                    style={{ fontSize: '10px' }}
                  >
                    {risk.code}
                  </text>
                  {/* Connection line to original position for dispersed risks */}
                  {Math.abs(risk.finalX - risk.originalX) > 1 || Math.abs(risk.finalY - risk.originalY) > 1 ? (
                    <line
                      x1={risk.originalX}
                      y1={risk.originalY}
                      x2={risk.finalX}
                      y2={risk.finalY}
                      stroke="#d1d5db"
                      strokeWidth="1"
                      strokeDasharray="2,2"
                      className="pointer-events-none opacity-60"
                    />
                  ) : null}
                </g>
              ));
            })()}
          </svg>

          {/* Quadrant background colors positioned behind risk points */}
          {/* Calculate quadrant positions using the same 0.5-5.5 coordinate system */}
          {/* Top Left - Higiene de control (impact < 3, residual >= 3) */}
          <div 
            className="absolute bg-blue-100/40 dark:bg-blue-900/25 rounded-lg pointer-events-none"
            style={{ 
              top: padding + 5, 
              left: padding + 5, 
              width: matrixWidth * ((3 - 0.5) / 5) - 10, 
              height: matrixHeight * (1 - ((3 - 0.5) / 5)) - 10,
              zIndex: 0
            }}
          />
          <div 
            className="absolute p-2 text-center pointer-events-none"
            style={{ 
              top: padding + 10, 
              left: padding + 10, 
              width: matrixWidth * ((3 - 0.5) / 5) - 20, 
              height: matrixHeight * (1 - ((3 - 0.5) / 5)) - 20,
              zIndex: 2
            }}
          >
            <div className="text-sm font-medium text-blue-800 dark:text-blue-200">Monitoreo frecuente</div>
            <div className="text-xs text-blue-700 dark:text-blue-300">(Alta probabilidad / Bajo impacto)</div>
          </div>

          {/* Top Right - Prioridad inmediata (impact >= 3, residual >= 3) */}
          <div 
            className="absolute bg-red-100/40 dark:bg-red-900/25 rounded-lg pointer-events-none"
            style={{ 
              top: padding + 5, 
              left: padding + matrixWidth * ((3 - 0.5) / 5) + 5, 
              width: matrixWidth * (1 - ((3 - 0.5) / 5)) - 10, 
              height: matrixHeight * (1 - ((3 - 0.5) / 5)) - 10,
              zIndex: 0
            }}
          />
          <div 
            className="absolute p-2 text-center pointer-events-none"
            style={{ 
              top: padding + 10, 
              left: padding + matrixWidth * ((3 - 0.5) / 5) + 10, 
              width: matrixWidth * (1 - ((3 - 0.5) / 5)) - 20, 
              height: matrixHeight * (1 - ((3 - 0.5) / 5)) - 20,
              zIndex: 2
            }}
          >
            <div className="text-sm font-medium text-red-800 dark:text-red-200">Prioridad inmediata</div>
            <div className="text-xs text-red-700 dark:text-red-300">(Alta probabilidad / Alto impacto)</div>
          </div>

          {/* Bottom Left - Monitoreo liviano (impact < 3, residual < 3) */}
          <div 
            className="absolute bg-green-100/40 dark:bg-green-900/25 rounded-lg pointer-events-none"
            style={{ 
              top: padding + matrixHeight * (1 - ((3 - 0.5) / 5)) + 5, 
              left: padding + 5, 
              width: matrixWidth * ((3 - 0.5) / 5) - 10, 
              height: matrixHeight * ((3 - 0.5) / 5) - 10,
              zIndex: 0
            }}
          />
          <div 
            className="absolute p-2 text-center pointer-events-none"
            style={{ 
              top: padding + matrixHeight * (1 - ((3 - 0.5) / 5)) + 10, 
              left: padding + 10, 
              width: matrixWidth * ((3 - 0.5) / 5) - 20, 
              height: matrixHeight * ((3 - 0.5) / 5) - 20,
              zIndex: 2
            }}
          >
            <div className="text-sm font-medium text-green-800 dark:text-green-200">Monitoreo liviano</div>
            <div className="text-xs text-green-700 dark:text-green-300">(Baja probabilidad / Bajo impacto)</div>
          </div>

          {/* Bottom Right - Crítico bien controlado (impact >= 3, residual < 3) */}
          <div 
            className="absolute bg-amber-100/40 dark:bg-amber-900/25 rounded-lg pointer-events-none"
            style={{ 
              top: padding + matrixHeight * (1 - ((3 - 0.5) / 5)) + 5, 
              left: padding + matrixWidth * ((3 - 0.5) / 5) + 5, 
              width: matrixWidth * (1 - ((3 - 0.5) / 5)) - 10, 
              height: matrixHeight * ((3 - 0.5) / 5) - 10,
              zIndex: 0
            }}
          />
          <div 
            className="absolute p-2 text-center pointer-events-none"
            style={{ 
              top: padding + matrixHeight * (1 - ((3 - 0.5) / 5)) + 10, 
              left: padding + matrixWidth * ((3 - 0.5) / 5) + 10, 
              width: matrixWidth * (1 - ((3 - 0.5) / 5)) - 20, 
              height: matrixHeight * ((3 - 0.5) / 5) - 20,
              zIndex: 2
            }}
          >
            <div className="text-sm font-medium text-amber-800 dark:text-amber-200">Impacto severo</div>
            <div className="text-xs text-amber-700 dark:text-amber-300">(Baja probabilidad / Alto impacto)</div>
          </div>
        </div>
      </div>

      {/* Risk Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle del Riesgo</DialogTitle>
            <DialogDescription>
              Información detallada del riesgo seleccionado y su evaluación.
            </DialogDescription>
          </DialogHeader>
          {selectedRisk && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{selectedRisk.code}</h4>
                <Badge variant="outline">
                  {getRiskLevelText(selectedRisk.probability * selectedRisk.impact)} (<RiskValue value={selectedRisk.probability * selectedRisk.impact} />)
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">{selectedRisk.name}</p>
                <p className="text-xs text-muted-foreground">{selectedRisk.description}</p>
              </div>
              
              {/* Process Information */}
              <div className="space-y-1">
                {selectedRisk.macroproceso && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Macroproceso:</span> {selectedRisk.macroproceso.name}
                  </div>
                )}
                {selectedRisk.process && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Proceso:</span> {selectedRisk.process.name}
                  </div>
                )}
                {selectedRisk.subproceso && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Subproceso:</span> {selectedRisk.subproceso.name}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-medium">Impacto Inherente:</span> <RiskValue value={selectedRisk.impact} />
                </div>
                <div>
                  <span className="font-medium">Riesgo Residual:</span> <RiskValue value={(selectedRisk as any).residualRisk} />
                </div>
                <div>
                  <span className="font-medium">Probabilidad:</span> <RiskValue value={selectedRisk.probability} />
                </div>
                <div>
                  <span className="font-medium">Riesgo Inherente:</span> <RiskValue value={selectedRisk.inherentRisk} />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}