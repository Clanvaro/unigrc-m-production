import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar, AlertTriangle, Sparkles, BarChart3, Clock, FileImage, Download, Building2, ArrowRight, Network, Layers, Building, Check, ChevronsUpDown, Printer, Sliders } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CriticalityGapMatrix from "@/components/risk-matrix/criticality-gap-matrix";
import { getRiskLevelText } from "@/lib/risk-calculations";
import { RiskValue } from "@/components/RiskValue";
import type { RiskWithProcess } from "@shared/schema";
import { RiskHeatmapRecharts } from "@/components/risk/RiskHeatmapRecharts";
import { RiskLegend } from "@/components/risk/RiskLegend";
import html2canvas from "html2canvas";

// Type for historical risk comparison response
type HistoricalComparisonData = {
  company: {
    initial: number;
    final: number;
    change: number;
    changePercent: number;
  };
  byGerencia: Array<{
    id: string;
    name: string;
    initial: number;
    final: number;
    change: number;
    changePercent: number;
  }>;
  byMacroproceso: Array<{
    id: string;
    name: string;
    initial: number;
    final: number;
    change: number;
    changePercent: number;
  }>;
  byProceso: Array<{
    id: string;
    name: string;
    initial: number;
    final: number;
    change: number;
    changePercent: number;
  }>;
};

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

export default function RiskMatrix() {
  const [matrixType, setMatrixType] = useState<'criticality-gap' | 'comparison' | 'visualization'>('visualization');
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRisks, setSelectedRisks] = useState<RiskWithProcess[]>([]);
  const [matrixInfo, setMatrixInfo] = useState({ probability: 0, impact: 0, matrixType: '' });
  const [selectedProcessFilter, setSelectedProcessFilter] = useState<string>('all');
  const [selectedGerenciaFilter, setSelectedGerenciaFilter] = useState<string>('all');
  const [validationStatusFilter, setValidationStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Estados para Heatmap
  const [heatmapMode, setHeatmapMode] = useState<'inherent' | 'residual'>('inherent');
  const [heatmapFilters, setHeatmapFilters] = useState({
    macroproceso: 'all',
    process: 'all',
    validationStatus: 'all',
    category: 'all',
  });
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const heatmapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // OPTIMIZACIÓN: Cargar todos los datos del risk matrix en una sola query
  const { data: riskMatrixData, isLoading: matrixLoading } = useQuery<{
    risksWithDetails: any[];
    processes: any[];
    macroprocesos: any[];
    subprocesos: any[];
    gerencias: any[];
    processGerencias: any[];
    riskCategories: any[];
    riskControlsWithDetails: any[];
    actionPlans: any[];
    controls: any[];
    processOwners: any[];
    riskLevelRanges: { lowMax: number; mediumMax: number; highMax: number };
  }>({
    queryKey: ["/api/risk-matrix"],
  });

  // Extraer datos de la respuesta agregada con valores por defecto
  const riskRanges = riskMatrixData?.riskLevelRanges || { lowMax: 6, mediumMax: 12, highMax: 19 };
  const processes = riskMatrixData?.processes || [];
  const macroprocesos = riskMatrixData?.macroprocesos || [];
  const subprocesos = riskMatrixData?.subprocesos || [];
  const gerencias = riskMatrixData?.gerencias || [];
  const processGerenciasAssoc = riskMatrixData?.processGerencias || [];
  const riskCategories = riskMatrixData?.riskCategories || [];
  const risksWithDetails = riskMatrixData?.risksWithDetails || [];
  const riskControlsWithDetails = riskMatrixData?.riskControlsWithDetails || [];
  const actionPlans = riskMatrixData?.actionPlans || [];
  const allControls = riskMatrixData?.controls || [];
  const processOwners = riskMatrixData?.processOwners || [];

  // Fetch historical risk comparison (no manual snapshots required)
  const { data: comparisonData, isLoading: comparisonLoading } = useQuery<HistoricalComparisonData>({
    queryKey: ["/api/risks/historical-comparison", { startDate, endDate }],
    enabled: !!startDate && !!endDate,
  });

  // Usar datos del endpoint agregado para el heatmap
  const heatmapData = risksWithDetails;
  const heatmapLoading = matrixLoading;

  const formatDate = (date: string) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString();
  };

  // Listen for filter changes from header
  useEffect(() => {
    const handleFiltersChanged = (event: any) => {
      const { processFilter, gerenciaFilter } = event.detail;
      if (processFilter !== undefined) {
        setSelectedProcessFilter(processFilter);
      }
      if (gerenciaFilter !== undefined) {
        setSelectedGerenciaFilter(gerenciaFilter);
      }
    };

    window.addEventListener('matrixFiltersChanged', handleFiltersChanged);
    return () => window.removeEventListener('matrixFiltersChanged', handleFiltersChanged);
  }, []);


  const handleMatrixCellClick = (risks: RiskWithProcess[], probability: number, impact: number, matrixType: string) => {
    setSelectedRisks(risks);
    setMatrixInfo({ probability, impact, matrixType });
    setDialogOpen(true);
  };

  // Filtrado en cascada: Procesos filtrados según macroproceso seleccionado
  const filteredProcesses = heatmapFilters.macroproceso !== 'all'
    ? processes.filter((p: any) => p.macroprocesoId === heatmapFilters.macroproceso)
    : processes;

  // Filtrado en cascada: Subprocesos filtrados según proceso seleccionado
  const filteredSubprocesos = heatmapFilters.process !== 'all'
    ? subprocesos.filter((sp: any) => sp.procesoId === heatmapFilters.process)
    : heatmapFilters.macroproceso !== 'all'
    ? subprocesos.filter((sp: any) => 
        filteredProcesses.some((p: any) => p.id === sp.procesoId)
      )
    : subprocesos;

  // Funciones para Heatmap con filtrado jerárquico (optimizado con useMemo)
  const filteredHeatmapData = useMemo(() => {
    return heatmapData.filter((risk: any) => {
      // Filtrado jerárquico por macroproceso/proceso/subproceso
      if (heatmapFilters.macroproceso !== 'all') {
        // Si es macroproceso, incluir riesgos del macroproceso y de todos sus procesos y subprocesos hijos
        const childProcesses = processes.filter((p: any) => p.macroprocesoId === heatmapFilters.macroproceso);
        const childProcessIds = childProcesses.map((p: any) => p.id);
        const childSubprocesos = subprocesos.filter((sp: any) => 
          childProcesses.some((p: any) => p.id === sp.procesoId)
        );
        const childSubprocesoIds = childSubprocesos.map((sp: any) => sp.id);
        
        const belongsToMacroproceso = 
          risk.macroprocesoId === heatmapFilters.macroproceso || 
          childProcessIds.includes(risk.processId) || 
          childSubprocesoIds.includes(risk.subprocesoId);
        
        if (!belongsToMacroproceso) return false;
      }
      
      if (heatmapFilters.process !== 'all') {
        // Si es proceso, incluir riesgos del proceso y de todos sus subprocesos hijos
        const childSubprocesos = subprocesos.filter((sp: any) => sp.procesoId === heatmapFilters.process);
        const childSubprocesoIds = childSubprocesos.map((sp: any) => sp.id);
        
        const belongsToProcess = 
          risk.processId === heatmapFilters.process || 
          childSubprocesoIds.includes(risk.subprocesoId);
        
        if (!belongsToProcess) return false;
      }
      
      if (heatmapFilters.validationStatus !== 'all') {
        const status = risk.validationStatus || 'pending';
        
        switch (heatmapFilters.validationStatus) {
          case 'validated':
            if (status !== 'validated' && status !== 'approved') return false;
            break;
          case 'pending':
            if (status !== 'pending' && status !== 'pending_validation' && status !== 'notified') return false;
            break;
          case 'observed':
            if (status !== 'observed') return false;
            break;
          case 'rejected':
            if (status !== 'rejected') return false;
            break;
        }
      }
      if (heatmapFilters.category !== 'all') {
        const categories = risk.category || [];
        if (!categories.includes(heatmapFilters.category)) return false;
      }
      return true;
    });
  }, [heatmapData, heatmapFilters, processes, subprocesos]);

  const handleExportPNG = async () => {
    if (!heatmapRef.current) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(heatmapRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });

      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      const modeText = heatmapMode === 'inherent' ? 'Inherente' : 'Residual';
      link.download = `heatmap-riesgos-${modeText.toLowerCase()}-${timestamp}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast({
        title: "Exportación exitosa",
        description: `La visualización se ha exportado como PNG.`,
      });
      setExportDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error al exportar",
        description: "No se pudo exportar la visualización.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSVG = () => {
    if (!chartRef.current) return;

    try {
      const svgElement = chartRef.current.querySelector('svg.recharts-surface');
      if (!svgElement) {
        throw new Error('No se encontró el elemento SVG del gráfico');
      }

      const clonedSvg = svgElement.cloneNode(true) as SVGElement;
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
      
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      const modeText = heatmapMode === 'inherent' ? 'Inherente' : 'Residual';
      link.download = `heatmap-riesgos-${modeText.toLowerCase()}-${timestamp}.svg`;
      link.href = svgUrl;
      link.click();

      URL.revokeObjectURL(svgUrl);

      toast({
        title: "Exportación exitosa",
        description: `El heatmap se ha exportado como SVG.`,
      });
      setExportDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error al exportar",
        description: "No se pudo exportar el heatmap como SVG.",
        variant: "destructive",
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6" data-testid="matrix-content">
      {/* Tabs Compactos con Iconos */}
      <Tabs value={matrixType} onValueChange={(value) => setMatrixType(value as 'criticality-gap' | 'comparison' | 'visualization')} className="w-full">
        <TabsList className="inline-flex w-full md:grid md:grid-cols-3 mb-4 overflow-x-auto justify-start md:justify-center">
          <TabsTrigger value="visualization" data-testid="tab-visualization" className="gap-2 flex-shrink-0">
            <Sparkles className="h-4 w-4" />
            Visualización
          </TabsTrigger>
          <TabsTrigger value="comparison" data-testid="tab-comparison" className="gap-2 flex-shrink-0">
            <Clock className="h-4 w-4" />
            Temporal
          </TabsTrigger>
          <TabsTrigger value="criticality-gap" data-testid="tab-criticality-gap" className="gap-2 flex-shrink-0">
            <BarChart3 className="h-4 w-4" />
            Criticidad
          </TabsTrigger>
        </TabsList>


        <TabsContent value="criticality-gap">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Análisis de Criticidad y Brecha
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Matriz estratégica de impacto inherente vs riesgo residual
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <CriticalityGapMatrix />
              
              {/* Strategic Recommendations */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg bg-red-50 dark:bg-red-950/20">
                  <h5 className="font-medium text-red-800 dark:text-red-200 mb-1 text-sm">
                    🔴 Prioridad Inmediata
                  </h5>
                  <p className="text-xs text-red-700 dark:text-red-300">
                    Proyectos de control, rediseño de proceso, automatización.
                  </p>
                </div>
                <div className="p-3 border rounded-lg bg-amber-50 dark:bg-amber-950/20">
                  <h5 className="font-medium text-amber-800 dark:text-amber-200 mb-1 text-sm">
                    🟡 Crítico Bien Controlado
                  </h5>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Mantener evidencias, pruebas periódicas, indicadores.
                  </p>
                </div>
                <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <h5 className="font-medium text-blue-800 dark:text-blue-200 mb-1 text-sm">
                    🔵 Higiene de Control
                  </h5>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Estándares mínimos, segregación de funciones, accesos.
                  </p>
                </div>
                <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-950/20">
                  <h5 className="font-medium text-green-800 dark:text-green-200 mb-1 text-sm">
                    🟢 Monitoreo Liviano
                  </h5>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Mantener, simplificar reportes, evitar sobre-auditar.
                  </p>
                </div>
              </div>

              {/* Strategic Note */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <h5 className="font-medium mb-2 text-sm">💡 Estrategia de Priorización</h5>
                <p className="text-xs text-muted-foreground">
                  <strong>Impacto inherente</strong> = "qué importa" • <strong>Riesgo residual</strong> = "qué falta"
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison">
          <div className="space-y-6">
            {/* Configuración de fechas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Evolución Histórica de Riesgos
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Compara automáticamente el nivel de riesgo residual entre dos fechas basándose en el historial real del sistema
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Período de comparación:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-40"
                      placeholder="Fecha inicio"
                      data-testid="input-start-date"
                    />
                    <span className="text-muted-foreground">→</span>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-40"
                      placeholder="Fecha fin"
                      data-testid="input-end-date"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Loading state */}
            {comparisonLoading && (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-sm text-muted-foreground">Cargando comparación...</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results */}
            {!comparisonLoading && comparisonData && (
              <>
                {/* Company Level Summary */}
                <Card className="border-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Nivel Compañía
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-6">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Riesgo Inicial</div>
                        <div className="text-3xl font-bold">{comparisonData.company.initial.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(startDate)}</div>
                      </div>
                      <div className="flex items-center justify-center">
                        <ArrowRight className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Riesgo Final</div>
                        <div className="text-3xl font-bold">{comparisonData.company.final.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(endDate)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Cambio</div>
                        <div className={`text-3xl font-bold ${comparisonData.company.changePercent < 0 ? 'text-green-600' : comparisonData.company.changePercent > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {comparisonData.company.changePercent > 0 ? '+' : ''}{comparisonData.company.changePercent.toFixed(1)}%
                        </div>
                        <Badge variant={comparisonData.company.changePercent < 0 ? 'default' : comparisonData.company.changePercent > 0 ? 'destructive' : 'secondary'} className="mt-2">
                          {comparisonData.company.changePercent < 0 ? '✅ Mejoró' : comparisonData.company.changePercent > 0 ? '⚠️ Empeoró' : '➖ Sin cambios'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* By Gerencia */}
                {comparisonData.byGerencia && comparisonData.byGerencia.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Desglose por Gerencia
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="p-3 text-left text-sm font-medium">Gerencia</th>
                              <th className="p-3 text-center text-sm font-medium">Riesgo Inicial</th>
                              <th className="p-3 text-center text-sm font-medium">Riesgo Final</th>
                              <th className="p-3 text-center text-sm font-medium">Cambio</th>
                              <th className="p-3 text-center text-sm font-medium">Tendencia</th>
                            </tr>
                          </thead>
                          <tbody>
                            {comparisonData.byGerencia.map((item: any) => (
                              <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30">
                                <td className="p-3 font-medium">{item.name}</td>
                                <td className="p-3 text-center">{item.initial.toFixed(1)}</td>
                                <td className="p-3 text-center">{item.final.toFixed(1)}</td>
                                <td className={`p-3 text-center font-medium ${item.changePercent < 0 ? 'text-green-600' : item.changePercent > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                  {item.changePercent > 0 ? '+' : ''}{item.changePercent.toFixed(1)}%
                                </td>
                                <td className="p-3 text-center">
                                  <Badge variant={item.changePercent < 0 ? 'default' : item.changePercent > 0 ? 'destructive' : 'secondary'}>
                                    {item.changePercent < 0 ? '✅ Mejoró' : item.changePercent > 0 ? '⚠️ Empeoró' : '➖ Sin cambios'}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* By Macroproceso */}
                {comparisonData.byMacroproceso && comparisonData.byMacroproceso.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5" />
                        Desglose por Macroproceso
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="p-3 text-left text-sm font-medium">Macroproceso</th>
                              <th className="p-3 text-center text-sm font-medium">Riesgo Inicial</th>
                              <th className="p-3 text-center text-sm font-medium">Riesgo Final</th>
                              <th className="p-3 text-center text-sm font-medium">Cambio</th>
                              <th className="p-3 text-center text-sm font-medium">Tendencia</th>
                            </tr>
                          </thead>
                          <tbody>
                            {comparisonData.byMacroproceso.map((item: any) => (
                              <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30">
                                <td className="p-3 font-medium">{item.name}</td>
                                <td className="p-3 text-center">{item.initial.toFixed(1)}</td>
                                <td className="p-3 text-center">{item.final.toFixed(1)}</td>
                                <td className={`p-3 text-center font-medium ${item.changePercent < 0 ? 'text-green-600' : item.changePercent > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                  {item.changePercent > 0 ? '+' : ''}{item.changePercent.toFixed(1)}%
                                </td>
                                <td className="p-3 text-center">
                                  <Badge variant={item.changePercent < 0 ? 'default' : item.changePercent > 0 ? 'destructive' : 'secondary'}>
                                    {item.changePercent < 0 ? '✅ Mejoró' : item.changePercent > 0 ? '⚠️ Empeoró' : '➖ Sin cambios'}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* By Proceso */}
                {comparisonData.byProceso && comparisonData.byProceso.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Network className="h-5 w-5" />
                        Desglose por Proceso
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border max-h-96 overflow-y-auto">
                        <table className="w-full">
                          <thead className="sticky top-0 bg-muted/50">
                            <tr className="border-b">
                              <th className="p-3 text-left text-sm font-medium">Proceso</th>
                              <th className="p-3 text-center text-sm font-medium">Riesgo Inicial</th>
                              <th className="p-3 text-center text-sm font-medium">Riesgo Final</th>
                              <th className="p-3 text-center text-sm font-medium">Cambio</th>
                              <th className="p-3 text-center text-sm font-medium">Tendencia</th>
                            </tr>
                          </thead>
                          <tbody>
                            {comparisonData.byProceso.map((item: any) => (
                              <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30">
                                <td className="p-3 font-medium">{item.name}</td>
                                <td className="p-3 text-center">{item.initial.toFixed(1)}</td>
                                <td className="p-3 text-center">{item.final.toFixed(1)}</td>
                                <td className={`p-3 text-center font-medium ${item.changePercent < 0 ? 'text-green-600' : item.changePercent > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                  {item.changePercent > 0 ? '+' : ''}{item.changePercent.toFixed(1)}%
                                </td>
                                <td className="p-3 text-center">
                                  <Badge variant={item.changePercent < 0 ? 'default' : item.changePercent > 0 ? 'destructive' : 'secondary'}>
                                    {item.changePercent < 0 ? '✅' : item.changePercent > 0 ? '⚠️' : '➖'}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Empty state */}
            {!comparisonLoading && !comparisonData && startDate && endDate && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No hay datos disponibles para las fechas seleccionadas</p>
                  <p className="text-sm text-muted-foreground mt-2">Intenta seleccionar un rango de fechas más reciente donde existan riesgos registrados</p>
                </CardContent>
              </Card>
            )}

            {/* Instruction when no dates */}
            {!startDate || !endDate && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Selecciona una fecha inicial y una fecha final para ver la comparación</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Pestaña Visualización */}
        <TabsContent value="visualization">
          <style>{`
            @media print {
              @page {
                size: landscape;
                margin: 1cm;
              }
              
              .print-hidden {
                display: none !important;
              }
              
              .heatmap-container {
                page-break-inside: avoid;
                break-inside: avoid;
              }
              
              .recharts-wrapper {
                width: 100% !important;
                height: auto !important;
              }
            }
          `}</style>

          <div className="space-y-4">
            {/* Barra de acciones */}
            <div className="flex flex-wrap items-center gap-3 print-hidden justify-end">
              <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-print-visualization">
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              <Button variant="outline" size="sm" onClick={() => setExportDialogOpen(true)} data-testid="button-export-visualization">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>

            {/* Filtros */}
            <Card className="print-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sliders className="h-5 w-5" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  <SearchableCombobox
                    label="Macroproceso"
                    value={heatmapFilters.macroproceso}
                    onValueChange={(value) => setHeatmapFilters({ ...heatmapFilters, macroproceso: value, process: 'all' })}
                    options={[
                      { value: 'all', label: 'Todos los macroprocesos' },
                      ...macroprocesos.map((m: any) => ({ value: m.id, label: m.name }))
                    ]}
                    placeholder="Todos los macroprocesos"
                    searchPlaceholder="Buscar macroproceso..."
                    testId="heatmap-select-macroproceso"
                  />

                  <SearchableCombobox
                    label="Proceso"
                    value={heatmapFilters.process}
                    onValueChange={(value) => setHeatmapFilters({ ...heatmapFilters, process: value })}
                    options={[
                      { value: 'all', label: 'Todos los procesos' },
                      ...filteredProcesses.map((p: any) => ({ value: p.id, label: p.name }))
                    ]}
                    placeholder="Todos los procesos"
                    searchPlaceholder="Buscar proceso..."
                    testId="heatmap-select-process"
                  />

                  <SearchableCombobox
                    label="Estado de Validación"
                    value={heatmapFilters.validationStatus}
                    onValueChange={(value) => setHeatmapFilters({ ...heatmapFilters, validationStatus: value })}
                    options={[
                      { value: 'all', label: 'Todos' },
                      { value: 'validated', label: 'Validados' },
                      { value: 'pending', label: 'Pendientes' },
                      { value: 'observed', label: 'Observados' },
                      { value: 'rejected', label: 'Rechazados' }
                    ]}
                    placeholder="Todos"
                    searchPlaceholder="Buscar estado de validación..."
                    testId="heatmap-select-validation-status"
                  />

                  <SearchableCombobox
                    label="Categoría"
                    value={heatmapFilters.category}
                    onValueChange={(value) => setHeatmapFilters({ ...heatmapFilters, category: value })}
                    options={[
                      { value: 'all', label: 'Todas las categorías' },
                      ...riskCategories.map((category: any) => ({ value: category.name, label: category.name }))
                    ]}
                    placeholder="Todas las categorías"
                    searchPlaceholder="Buscar categoría..."
                    testId="heatmap-select-category"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Heatmap Interactivo */}
            <>
                <div className="flex justify-between items-center">
                  <Tabs value={heatmapMode} onValueChange={(v) => setHeatmapMode(v as 'inherent' | 'residual')}>
                    <TabsList data-testid="heatmap-mode-toggle" className="print-hidden">
                      <TabsTrigger value="inherent" data-testid="heatmap-tab-inherent">
                        Riesgo Inherente
                      </TabsTrigger>
                      <TabsTrigger value="residual" data-testid="heatmap-tab-residual">
                        Riesgo Residual
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  
                  <div className="text-sm text-muted-foreground">
                    {filteredHeatmapData.length} riesgos • Actualizado: {new Date().toLocaleDateString('es-ES', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                {heatmapLoading ? (
                  <Card className="p-8">
                    <div className="text-center text-muted-foreground">Cargando heatmap de riesgos...</div>
                  </Card>
                ) : (
                  <div ref={heatmapRef} className="grid grid-cols-1 lg:grid-cols-4 gap-6 heatmap-container">
                    <div ref={chartRef} className="lg:col-span-3">
                      <RiskHeatmapRecharts data={filteredHeatmapData} mode={heatmapMode} />
                    </div>
                    <div>
                      <RiskLegend />
                    </div>
                  </div>
                )}
              </>
          </div>
        </TabsContent>
      </Tabs>

      {/* Risk Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Riesgos en Cuadrante - {matrixInfo.matrixType === 'inherent' ? 'Riesgo Inherente' : 'Riesgo Residual'}
            </DialogTitle>
            <DialogDescription>
              Probabilidad: {matrixInfo.probability} | Impacto: {matrixInfo.impact} | Total: {selectedRisks.length} riesgos
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedRisks.length > 0 ? (
              selectedRisks.map((risk) => (
                <Card key={risk.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{risk.code}</h4>
                        <Badge variant="outline" className="text-xs">
                          {getRiskLevelText(risk.probability * risk.impact)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{risk.name}</p>
                      <p className="text-xs text-muted-foreground mb-2">{risk.description}</p>
                      
                      {/* Process Information */}
                      <div className="mb-2">
                        {risk.macroproceso && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Macroproceso:</span> {risk.macroproceso.name}
                          </div>
                        )}
                        {risk.process && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Proceso:</span> {risk.process.name}
                          </div>
                        )}
                        {risk.subproceso && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Subproceso:</span> {risk.subproceso.name}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-xs">
                        <span>Probabilidad: {risk.probability}</span>
                        <span>Impacto: {risk.impact}</span>
                        <span>Riesgo Inherente: <RiskValue value={risk.inherentRisk} /></span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
                <p>No hay riesgos en este cuadrante</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Heatmap Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent data-testid="export-dialog">
          <DialogHeader>
            <DialogTitle>Exportar Heatmap de Riesgos</DialogTitle>
            <DialogDescription>
              Selecciona el formato para exportar la visualización actual
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <Button
              variant="outline"
              className="justify-start h-auto p-4"
              onClick={handleExportPNG}
              disabled={isExporting}
              data-testid="export-png-button"
            >
              <FileImage className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">
                  {isExporting ? 'Exportando...' : 'Exportar como PNG'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Imagen de alta calidad para presentaciones
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto p-4"
              onClick={handleExportSVG}
              data-testid="export-svg-button"
            >
              <Download className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-semibold">Exportar como SVG</div>
                <div className="text-sm text-muted-foreground">
                  Formato vectorial escalable
                </div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
