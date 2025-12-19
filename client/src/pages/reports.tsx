import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, BarChart3, PieChart } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from "recharts";
import { getRiskLevelText } from "@/lib/risk-calculations";
import { Top5Risks } from "@/components/Top5Risks";
import { useToast } from "@/hooks/use-toast";
import type { RiskWithProcess, Control, Action } from "@shared/schema";

export default function Reports() {
  const { toast } = useToast();
  
  // Use the with-details endpoint to get full risk information including process associations
  const { data: risksData, isLoading: risksLoading, isError: risksError } = useQuery<RiskWithProcess[]>({
    queryKey: ["/api/risks-with-details"],
    staleTime: 120000, // 2 minutos - reducir refetches durante navegación rápida
    refetchOnWindowFocus: false,
    retry: 1, // Solo reintentar una vez en caso de error
  });

  // Load catalogs to map IDs to names
  const { data: macroprocesosData } = useQuery<any[]>({
    queryKey: ["/api/macroprocesos"],
    staleTime: 300000, // Cache for 5 minutes (catalogs don't change often)
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: processesData } = useQuery<any[]>({
    queryKey: ["/api/processes"],
    staleTime: 300000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: subprocesosData } = useQuery<any[]>({
    queryKey: ["/api/subprocesos"],
    staleTime: 300000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: controlsResponse, isLoading: controlsLoading, isError: controlsError } = useQuery<{ data: Control[], pagination: { limit: number, offset: number, total: number } }>({
    queryKey: ["/api/controls"],
    staleTime: 120000, // 2 minutos - reducir refetches durante navegación rápida
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: actionPlansData, isLoading: actionPlansLoading, isError: actionPlansError } = useQuery<Action[]>({
    queryKey: ["/api/action-plans"],
    staleTime: 120000, // 2 minutos - reducir refetches durante navegación rápida
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: stats, isError: statsError } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    staleTime: 120000, // 2 minutos - reducir refetches durante navegación rápida
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Defensive array normalization - ensure we always have arrays even if queries fail
  const risks: RiskWithProcess[] = Array.isArray(risksData) ? risksData : [];
  const macroprocesos: any[] = Array.isArray(macroprocesosData) ? macroprocesosData : [];
  const processes: any[] = Array.isArray(processesData) ? processesData : [];
  const subprocesos: any[] = Array.isArray(subprocesosData) ? subprocesosData : [];
  const controls: Control[] = Array.isArray(controlsResponse?.data) ? controlsResponse.data : [];
  const actionPlans: Action[] = Array.isArray(actionPlansData) ? actionPlansData : [];

  // CRITICAL FIX: All hooks (useMemo) must be called BEFORE any conditional returns
  // This prevents React error #310 (Rendered more hooks than during the previous render)
  
  // Create lookup maps for process names - memoized to prevent React #310
  const macroprocesosMap = useMemo(() => {
    return new Map(
      Array.isArray(macroprocesos) 
        ? macroprocesos.map((m: any) => [m?.id, m?.name || m?.code || 'Sin nombre'])
        : []
    );
  }, [macroprocesos]);

  const processesMap = useMemo(() => {
    return new Map(
      Array.isArray(processes)
        ? processes.map((p: any) => [p?.id, p?.name || p?.code || 'Sin nombre'])
        : []
    );
  }, [processes]);

  const subprocesosMap = useMemo(() => {
    return new Map(
      Array.isArray(subprocesos)
        ? subprocesos.map((s: any) => [s?.id, s?.name || s?.code || 'Sin nombre'])
        : []
    );
  }, [subprocesos]);

  // FIXED: Risk distribution data for charts - memoized for performance
  // React error #310 fix: Create stable hash of risk values to track changes
  const riskValuesHash = useMemo(() => {
    if (!Array.isArray(risks) || risks.length === 0) return '';
    try {
      // Create a stable hash from risk values that matter for distribution
      return risks
        .map(r => r?.inherentRisk || 0)
        .sort((a, b) => a - b)
        .join(',');
    } catch {
      return '';
    }
  }, [risks]);

  const riskDistributionData = useMemo(() => {
    if (!Array.isArray(risks) || risks.length === 0) return [];
    try {
      return [
        { name: "Bajo", value: risks.filter((r) => (r?.inherentRisk || 0) <= 6).length, color: "#22c55e" },
        { name: "Medio", value: risks.filter((r) => {
          const risk = r?.inherentRisk || 0;
          return risk >= 7 && risk <= 12;
        }).length, color: "#eab308" },
        { name: "Alto", value: risks.filter((r) => {
          const risk = r?.inherentRisk || 0;
          return risk >= 13 && risk <= 19;
        }).length, color: "#f97316" },
        { name: "Crítico", value: risks.filter((r) => (r?.inherentRisk || 0) >= 20).length, color: "#ef4444" },
      ];
    } catch (error) {
      console.error("Error calculating risk distribution:", error);
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riskValuesHash]); // Use only stable hash - risks is accessed from closure

  // Use the dedicated endpoint that correctly queries risk_process_links
  const { data: risksGroupedByProcessData, isLoading: risksGroupedLoading } = useQuery<Array<{
    entityId: string;
    entityName: string;
    entityCode: string;
    entityType: 'macroproceso' | 'process' | 'subproceso';
    macroprocesoId: string | null;
    macroprocesoName: string | null;
    processId: string | null;
    processName: string | null;
    riskCount: number;
    riskIds: string[];
  }>>({
    queryKey: ["/api/risks/grouped-by-process"],
    staleTime: 120000, // 2 minutos
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Transform grouped data to chart format
  const risksByProcessData = useMemo(() => {
    if (!Array.isArray(risksGroupedByProcessData)) return [];
    
    try {
      return risksGroupedByProcessData
        .map((item) => ({
          name: item.entityName || item.entityCode || 'Sin nombre',
          risks: item.riskCount
        }))
        .filter((item) => item.risks > 0)
        .sort((a, b) => b.risks - a.risks); // Sort by risk count (highest first)
    } catch (error) {
      console.error("Error transforming risks by process data:", error);
      return [];
    }
  }, [risksGroupedByProcessData]);

  // FIXED: Control effectiveness data - memoized for performance
  // React error #310 fix: Create stable hash of effectiveness values
  const controlEffectivenessHash = useMemo(() => {
    if (!Array.isArray(controls) || controls.length === 0) return '';
    try {
      return controls
        .map(c => c?.effectiveness || 0)
        .sort((a, b) => a - b)
        .join(',');
    } catch {
      return '';
    }
  }, [controls]);

  const controlEffectivenessData = useMemo(() => {
    if (!Array.isArray(controls) || controls.length === 0) return [];
    try {
      return [
        { name: "Excelente (>80%)", value: controls.filter((c) => (c?.effectiveness || 0) > 80).length, color: "#22c55e" },
        { name: "Bueno (60-80%)", value: controls.filter((c) => {
          const eff = c?.effectiveness || 0;
          return eff >= 60 && eff <= 80;
        }).length, color: "#eab308" },
        { name: "Regular (<60%)", value: controls.filter((c) => (c?.effectiveness || 0) < 60).length, color: "#ef4444" },
      ];
    } catch (error) {
      console.error("Error calculating control effectiveness:", error);
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlEffectivenessHash]); // Use only stable hash - controls accessed from closure

  // FIXED: Action plan status data - memoized for performance
  // React error #310 fix: Create stable hash of status and due dates
  const actionPlanStatusHash = useMemo(() => {
    if (!Array.isArray(actionPlans) || actionPlans.length === 0) return '';
    try {
      return actionPlans
        .map(ap => `${ap?.status || 'unknown'}-${ap?.dueDate || 'no-date'}`)
        .sort()
        .join(',');
    } catch {
      return '';
    }
  }, [actionPlans]);

  const actionPlanStatusData = useMemo(() => {
    if (!Array.isArray(actionPlans) || actionPlans.length === 0) return [];
    try {
      return [
        { name: "Completados", value: actionPlans.filter((ap) => ap?.status === "completed").length, color: "#22c55e" },
        { name: "En Progreso", value: actionPlans.filter((ap) => ap?.status === "in_progress").length, color: "#eab308" },
        { name: "Pendientes", value: actionPlans.filter((ap) => ap?.status === "pending").length, color: "#6b7280" },
        { name: "Vencidos", value: actionPlans.filter((ap) => {
          if (!ap?.dueDate) return false;
          try {
            const dueDate = new Date(ap.dueDate);
            const now = new Date();
            return ap.status !== "completed" && dueDate < now;
          } catch {
            return false;
          }
        }).length, color: "#ef4444" },
      ];
    } catch (error) {
      console.error("Error calculating action plan status:", error);
      return [];
    }
  }, [actionPlans, actionPlanStatusHash]); // Use stable hash as dependency

  // Show loading state only if critical data is loading
  // MOVED AFTER ALL HOOKS to prevent React error #310
  if (risksLoading || controlsLoading || actionPlansLoading || risksGroupedLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-lg font-medium">Cargando reportes...</p>
            <p className="text-sm text-muted-foreground mt-2">Por favor espera mientras se cargan los datos</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state with retry option
  // MOVED AFTER ALL HOOKS to prevent React error #310
  if (risksError || controlsError || actionPlansError || statsError) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-destructive mb-2">Error al cargar datos</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Algunos datos no pudieron cargarse. Por favor intenta recargar la página.
            </p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="default"
            >
              Recargar página
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleExport = async (reportType: string) => {
    try {
      toast({
        title: "Generando reporte",
        description: "Se está preparando la exportación...",
      });

      // Determinar el endpoint y parámetros según el tipo de reporte
      let exportUrl = '';
      let requestBody = {};

      switch (reportType) {
        case 'risk-matrix':
          // Exportar matriz de riesgo como PDF
          exportUrl = '/api/reports/generate';
          requestBody = {
            reportType: 'risk_trending',
            format: 'pdf',
            title: 'Matriz de Riesgo',
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Último mes
            endDate: new Date().toISOString(),
          };
          break;
        case 'controls-report':
          exportUrl = '/api/reports/generate';
          requestBody = {
            reportType: 'compliance_report',
            format: 'excel',
            title: 'Reporte de Controles',
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString(),
          };
          break;
        case 'action-plans':
          exportUrl = '/api/reports/generate';
          requestBody = {
            reportType: 'workflow_efficiency',
            format: 'excel',
            title: 'Planes de Acción',
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString(),
          };
          break;
        case 'executive-summary':
          exportUrl = '/api/reports/generate';
          requestBody = {
            reportType: 'executive_summary',
            format: 'pdf',
            title: 'Resumen Ejecutivo',
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString(),
          };
          break;
        case 'comprehensive':
        default:
          exportUrl = '/api/reports/generate';
          requestBody = {
            reportType: 'executive_summary',
            format: 'pdf',
            title: 'Reporte Completo de Riesgos',
            startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // Últimos 3 meses
            endDate: new Date().toISOString(),
          };
          break;
      }

      // Realizar la petición de exportación
      const response = await fetch(exportUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Error al generar el reporte: ${response.statusText}`);
      }

      // Obtener el archivo como blob
      const blob = await response.blob();
      
      // Crear URL temporal para descarga
      const url = window.URL.createObjectURL(blob);
      
      // Extraer nombre del archivo del header Content-Disposition o crear uno por defecto
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `reporte_${reportType}_${new Date().toISOString().split('T')[0]}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      } else {
        // Asignar extensión basada en el tipo de contenido
        const contentType = response.headers.get('Content-Type');
        if (contentType?.includes('pdf')) {
          filename += '.pdf';
        } else if (contentType?.includes('excel') || contentType?.includes('spreadsheet')) {
          filename += '.xlsx';
        }
      }
      
      // Crear elemento de descarga temporal
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Reporte exportado",
        description: `El reporte "${reportType}" se ha descargado exitosamente.`,
      });

    } catch (error) {
      console.error('Error al exportar reporte:', error);
      toast({
        title: "Error en exportación",
        description: "No se pudo generar el reporte. Verifique la conexión e intente nuevamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6" data-testid="reports-content">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold">Reportes y Análisis</h3>
          <p className="text-sm text-muted-foreground">Genera informes y análisis de riesgos</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="all">
            <SelectTrigger className="w-48" data-testid="filter-report-period">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los períodos</SelectItem>
              <SelectItem value="current-month">Mes actual</SelectItem>
              <SelectItem value="current-quarter">Trimestre actual</SelectItem>
              <SelectItem value="current-year">Año actual</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => handleExport("comprehensive")} data-testid="button-export-comprehensive">
            <Download className="mr-2 h-4 w-4" />
            Exportar Reporte Completo
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card data-testid="card-summary-risks">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Riesgos</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{risks.length}</div>
            <p className="text-xs text-muted-foreground">
              {Array.isArray(risks) ? risks.filter((r) => r?.inherentRisk >= 20).length : 0} críticos
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-summary-processes">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Procesos Evaluados</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{risksByProcessData.length}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round(risks.length / Math.max(risksByProcessData.length, 1))} riesgos promedio por proceso
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-summary-controls">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Controles Activos</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Array.isArray(controls) ? controls.filter((c: Control) => c?.isActive).length : 0}</div>
            <p className="text-xs text-muted-foreground">
              {controls.length > 0 
                ? Math.round(controls.reduce((sum, c) => sum + (c?.effectiveness || 0), 0) / controls.length)
                : 0}% efectividad promedio
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-summary-action-plans">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planes de Acción</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actionPlans.length}</div>
            <p className="text-xs text-muted-foreground">
              {actionPlans.length > 0
                ? Math.round((actionPlans.filter((ap: Action) => ap?.status === "completed").length / actionPlans.length) * 100)
                : 0}% completados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Risk Distribution Chart */}
        <Card data-testid="card-chart-risk-distribution">
          <CardHeader>
            <CardTitle>Distribución de Riesgos por Nivel</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={riskDistributionData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`}
                >
                  {riskDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Risks by Process Chart */}
        <Card data-testid="card-chart-risks-by-process">
          <CardHeader>
            <CardTitle>Riesgos por Proceso</CardTitle>
          </CardHeader>
          <CardContent>
            {risksByProcessData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={risksByProcessData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                    interval={0}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="risks" fill="hsl(210, 85%, 40%)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                <div className="text-center">
                  <p className="text-sm">No hay datos de procesos asociados a riesgos</p>
                  <p className="text-xs mt-2">Los riesgos deben tener procesos, macroprocesos o subprocesos asociados para aparecer aquí</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Control Effectiveness Chart */}
        <Card data-testid="card-chart-control-effectiveness">
          <CardHeader>
            <CardTitle>Efectividad de Controles</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={controlEffectivenessData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }: { name: string; value: number }) => `${name}: ${value}`}
                >
                  {controlEffectivenessData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Action Plan Status Chart */}
        <Card data-testid="card-chart-action-plan-status">
          <CardHeader>
            <CardTitle>Estado de Planes de Acción</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={actionPlanStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(174, 70%, 41%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top 5 Risks Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Top5Risks />
        
        {/* Detailed Risk Analysis */}
        <Card data-testid="card-detailed-analysis">
          <CardHeader>
            <CardTitle>Análisis Adicional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">

            <div>
              <h4 className="font-semibold mb-2">Controles Menos Efectivos</h4>
              <div className="space-y-2">
                {Array.isArray(controls)
                  ? controls
                      .filter((control) => control?.effectiveness < 70)
                      .slice(0, 5)
                      .map((control) => (
                        <div key={control.id} className="text-sm p-2 bg-orange-50 rounded">
                          <p className="font-medium">{control.name}</p>
                          <p className="text-xs text-muted-foreground">Efectividad: {control.effectiveness}%</p>
                        </div>
                      ))
                  : null}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Planes de Acción Vencidos</h4>
              <div className="space-y-2">
                {Array.isArray(actionPlans)
                  ? actionPlans
                      .filter((plan) => {
                        if (!plan?.dueDate) return false;
                        try {
                          const dueDate = new Date(plan.dueDate);
                          const now = new Date();
                          return plan.status !== "completed" && dueDate < now;
                        } catch {
                          return false;
                        }
                      })
                      .slice(0, 5)
                      .map((plan) => (
                        <div key={plan.id} className="text-sm p-2 bg-red-50 rounded">
                          <p className="font-medium">{plan.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Vencido: {plan.dueDate ? new Date(plan.dueDate).toLocaleDateString() : "Sin fecha"}
                          </p>
                        </div>
                      ))
                  : null}
              </div>
            </div>
          </div>
        </CardContent>
        </Card>
      </div>

      {/* Export Options */}
      <Card data-testid="card-export-options">
        <CardHeader>
          <CardTitle>Opciones de Exportación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              onClick={() => handleExport("risk-matrix")}
              data-testid="button-export-risk-matrix"
            >
              <Download className="mr-2 h-4 w-4" />
              Matriz de Riesgo
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport("controls-report")}
              data-testid="button-export-controls"
            >
              <Download className="mr-2 h-4 w-4" />
              Reporte de Controles
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport("action-plans")}
              data-testid="button-export-action-plans"
            >
              <Download className="mr-2 h-4 w-4" />
              Planes de Acción
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport("executive-summary")}
              data-testid="button-export-executive"
            >
              <Download className="mr-2 h-4 w-4" />
              Resumen Ejecutivo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
