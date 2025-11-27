import { useQuery } from "@tanstack/react-query";
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
  const { data: risks = [], isLoading: risksLoading, isError: risksError } = useQuery<RiskWithProcess[]>({
    queryKey: ["/api/risks-with-details"],
  });

  const { data: controlsResponse, isLoading: controlsLoading } = useQuery<{ data: Control[], pagination: { limit: number, offset: number, total: number } }>({
    queryKey: ["/api/controls"],
  });
  const controls = controlsResponse?.data || [];

  const { data: actionPlans = [], isLoading: actionPlansLoading } = useQuery<Action[]>({
    queryKey: ["/api/action-plans"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  if (risksLoading || controlsLoading || actionPlansLoading) {
    return <div className="p-6">Cargando reportes...</div>;
  }

  if (risksError) {
    return <div className="p-6">Error al cargar riesgos. Por favor intenta de nuevo.</div>;
  }

  // Risk distribution data for charts
  const riskDistributionData = [
    { name: "Bajo", value: risks.filter((r) => r.inherentRisk <= 6).length, color: "#22c55e" },
    { name: "Medio", value: risks.filter((r) => r.inherentRisk >= 7 && r.inherentRisk <= 12).length, color: "#eab308" },
    { name: "Alto", value: risks.filter((r) => r.inherentRisk >= 13 && r.inherentRisk <= 19).length, color: "#f97316" },
    { name: "Crítico", value: risks.filter((r) => r.inherentRisk >= 20).length, color: "#ef4444" },
  ];

  // Risks by process data - Group by macroproceso, process, or subproceso
  // RiskWithProcess already includes resolved macroproceso, process, and subproceso objects
  const processCounts = new Map<string, { name: string; count: number }>();
  
  risks.forEach((risk) => {
    // Check macroproceso level (already resolved in RiskWithProcess)
    if (risk.macroproceso) {
      const existing = processCounts.get(risk.macroproceso.id) || { name: risk.macroproceso.name, count: 0 };
      processCounts.set(risk.macroproceso.id, { ...existing, count: existing.count + 1 });
    }
    // Check process level (already resolved in RiskWithProcess)
    if (risk.process) {
      const existing = processCounts.get(risk.process.id) || { name: risk.process.name, count: 0 };
      processCounts.set(risk.process.id, { ...existing, count: existing.count + 1 });
    }
    // Check subproceso level (already resolved in RiskWithProcess)
    if (risk.subproceso) {
      const existing = processCounts.get(risk.subproceso.id) || { name: risk.subproceso.name, count: 0 };
      processCounts.set(risk.subproceso.id, { ...existing, count: existing.count + 1 });
    }
  });
  
  const risksByProcessData = Array.from(processCounts.values())
    .map(({ name, count }) => ({ name, risks: count }))
    .filter((item) => item.risks > 0)
    .sort((a, b) => b.risks - a.risks); // Sort by risk count (highest first)

  // Control effectiveness data
  const controlEffectivenessData = [
    { name: "Excelente (>80%)", value: controls.filter((c) => c.effectiveness > 80).length, color: "#22c55e" },
    { name: "Bueno (60-80%)", value: controls.filter((c) => c.effectiveness >= 60 && c.effectiveness <= 80).length, color: "#eab308" },
    { name: "Regular (<60%)", value: controls.filter((c) => c.effectiveness < 60).length, color: "#ef4444" },
  ];

  // Action plan status data
  const actionPlanStatusData = [
    { name: "Completados", value: actionPlans.filter((ap) => ap.status === "completed").length, color: "#22c55e" },
    { name: "En Progreso", value: actionPlans.filter((ap) => ap.status === "in_progress").length, color: "#eab308" },
    { name: "Pendientes", value: actionPlans.filter((ap) => ap.status === "pending").length, color: "#6b7280" },
    { name: "Vencidos", value: actionPlans.filter((ap) => {
      const dueDate = new Date(ap.dueDate || "");
      const now = new Date();
      return ap.status !== "completed" && dueDate < now;
    }).length, color: "#ef4444" },
  ];

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
              {risks.filter((r) => r.inherentRisk >= 20).length} críticos
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
            <div className="text-2xl font-bold">{controls.filter((c: Control) => c.isActive).length}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round(controls.reduce((sum, c) => sum + c.effectiveness, 0) / Math.max(controls.length, 1))}% efectividad promedio
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
              {Math.round((actionPlans.filter((ap: ActionPlan) => ap.status === "completed").length / Math.max(actionPlans.length, 1)) * 100)}% completados
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
                {controls
                  .filter((control) => control.effectiveness < 70)
                  .slice(0, 5)
                  .map((control) => (
                    <div key={control.id} className="text-sm p-2 bg-orange-50 rounded">
                      <p className="font-medium">{control.name}</p>
                      <p className="text-xs text-muted-foreground">Efectividad: {control.effectiveness}%</p>
                    </div>
                  ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Planes de Acción Vencidos</h4>
              <div className="space-y-2">
                {actionPlans
                  .filter((plan) => {
                    const dueDate = new Date(plan.dueDate || "");
                    const now = new Date();
                    return plan.status !== "completed" && dueDate < now;
                  })
                  .slice(0, 5)
                  .map((plan) => (
                    <div key={plan.id} className="text-sm p-2 bg-red-50 rounded">
                      <p className="font-medium">{plan.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Vencido: {plan.dueDate ? new Date(plan.dueDate).toLocaleDateString() : "Sin fecha"}
                      </p>
                    </div>
                  ))}
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
