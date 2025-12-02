import { useQuery } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/usePermissions";
import {
  MetricsCard,
  ProgressChart,
  ActivityTimeline,
  WorkloadDistribution
} from "@/components/dashboard-widgets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import {
  Building2,
  Users,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  Clock,
  BarChart3,
  Database,
  Activity,
  Download,
  Settings,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Zap
} from "lucide-react";
import { useState, useMemo } from "react";

// Type definitions for admin dashboard data
interface AdminDashboardMetrics {
  systemOverview: {
    totalTests: number;
    totalUsers: number;
    totalAudits: number;
    organizationalCompletionRate: number;
  };
  departmentMetrics: Array<{
    department: string;
    testsCount: number;
    completionRate: number;
    averageRiskLevel: number;
  }>;
  resourceUtilization: {
    totalExecutors: number;
    totalSupervisors: number;
    averageWorkload: number;
    capacityUtilization: number;
    bottlenecks: Array<{ area: string; severity: string; description: string }>;
  };
  complianceStatus: {
    overallCompliance: number;
    criticalFindings: number;
    openActions: number;
    riskCoverage: number;
  };
  systemHealth: {
    attachmentStorageUsed: number;
    averageResponseTime: number;
    activeUsers: number;
    systemAlerts: Array<{
      id: string;
      type: string;
      message: string;
      severity: string;
      timestamp: Date;
      resolved?: boolean;
    }>;
  };
  trends: {
    completionTrend: Array<{ period: string; completed: number; assigned: number }>;
    performanceTrend: Array<{ period: string; avgCompletionTime: number; avgProgress: number }>;
    riskTrend: Array<{ period: string; avgRiskLevel: number; mitigationRate: number }>;
  };
}

export default function AdminDashboard() {
  const { currentUser, hasPermission, isAdmin, isLoading: permissionsLoading } = usePermissions();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedTimeRange, setSelectedTimeRange] = useState("30");
  const [activeTab, setActiveTab] = useState("overview");

  // Check admin permissions
  const canViewSystemData = hasPermission("view_all") || isAdmin();
  const canManageSystem = hasPermission("manage_users") || hasPermission("edit_all") || isAdmin();

  // Fetch admin dashboard metrics
  const { data: dashboardData, isLoading, error, refetch } = useQuery<AdminDashboardMetrics>({
    queryKey: ['/api/dashboard/admin'],
    enabled: !!currentUser?.id,
    refetchInterval: 30 * 60 * 1000, // Optimized: 30 minutes (was 10min) - admin metrics change infrequently
    staleTime: 1000 * 60 * 5, // 5 minutes - dashboard data changes infrequently
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // All data extractions - must be before any conditional returns
  const overview = dashboardData?.systemOverview;
  const systemHealth = dashboardData?.systemHealth;
  const compliance = dashboardData?.complianceStatus;
  const resourceUtil = dashboardData?.resourceUtilization;
  const alerts = systemHealth?.systemAlerts || [];

  // All hooks must be called unconditionally
  const systemHealthPercentage = useMemo(() => {
    if (!compliance || !systemHealth) return 0;
    // Calculate overall health based on compliance and system metrics
    const metrics = [
      compliance.overallCompliance,
      Math.max(0, 100 - systemHealth.attachmentStorageUsed), // Invert storage usage
      Math.min(100, systemHealth.averageResponseTime > 0 ? (1 / systemHealth.averageResponseTime) * 100 : 100), // Lower is better
    ];
    return Math.round(metrics.reduce((sum, val) => sum + val, 0) / metrics.length);
  }, [systemHealth, compliance]);

  const criticalAlertsCount = useMemo(() => alerts.filter(alert => alert.severity === 'critical').length, [alerts]);
  const warningAlertsCount = useMemo(() => alerts.filter(alert => alert.severity === 'warning').length, [alerts]);

  // Calculate health trends
  const getHealthTrend = (score: number) => {
    return {
      value: score - 85, // Baseline of 85%
      label: "vs semana anterior",
      isPositive: score > 85
    };
  };

  // Handle actions
  const handleRefreshData = async () => {
    await refetch();
    toast({
      title: "Datos Actualizados",
      description: "Los datos del dashboard han sido actualizados",
    });
  };

  const handleExportReport = () => {
    toast({
      title: "Exportar Reporte del Sistema",
      description: "La exportación del reporte de analíticas del sistema comenzaría aquí",
    });
  };

  const handleSystemSettings = () => {
    navigate("/config");
  };

  const handleUserManagement = () => {
    navigate("/users");
  };

  const handleViewAlert = (alertId: string) => {
    toast({
      title: "Detalles de Alerta",
      description: `Los detalles de la alerta ${alertId} se mostrarían aquí`,
    });
  };

  // Handle loading state
  if (permissionsLoading || (!currentUser && !isLoading)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  // Handle permission error
  if (!canViewSystemData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-lg font-medium">Acceso de Administrador Requerido</p>
          <p className="text-muted-foreground mb-4">No tienes permisos para ver las analíticas del sistema.</p>
          <Button asChild>
            <Link href="/dashboard">Volver al Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-medium">Error Cargando Dashboard</p>
          <p className="text-muted-foreground mb-4">Error al cargar las analíticas del sistema</p>
          <Button onClick={() => refetch()}>Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="admin-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="dashboard-title">
            Analíticas del Sistema
          </h1>
          <p className="text-muted-foreground" data-testid="dashboard-subtitle">
            Resumen y analíticas del sistema de auditoría organizacional
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-32" data-testid="time-range-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 días</SelectItem>
              <SelectItem value="30">Últimos 30 días</SelectItem>
              <SelectItem value="90">Últimos 3 meses</SelectItem>
              <SelectItem value="365">Último año</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handleRefreshData} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>

          <Button variant="outline" size="sm" onClick={handleExportReport} data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>

          {canManageSystem && (
            <Button size="sm" onClick={handleSystemSettings} data-testid="button-settings">
              <Settings className="h-4 w-4 mr-2" />
              Configuración
            </Button>
          )}
        </div>
      </div>

      {/* System Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricsCard
          title="Total de Pruebas"
          value={overview?.totalTests || 0}
          subtitle="En toda la organización"
          icon={FileText}
          iconColor="text-blue-600"
          trend={{ value: 12, label: "vs mes anterior", isPositive: true }}
          loading={isLoading}
          data-testid="card-total-tests"
        />

        <MetricsCard
          title="Usuarios Activos"
          value={overview?.totalUsers || 0}
          subtitle={`${resourceUtil?.totalExecutors || 0} ejecutores, ${resourceUtil?.totalSupervisors || 0} supervisores`}
          icon={Users}
          iconColor="text-green-600"
          onClick={handleUserManagement}
          loading={isLoading}
          data-testid="card-active-users"
        />

        <MetricsCard
          title="Salud del Sistema"
          value={`${systemHealthPercentage}%`}
          subtitle="Rendimiento general del sistema"
          icon={systemHealthPercentage >= 90 ? CheckCircle2 : systemHealthPercentage >= 70 ? Clock : XCircle}
          iconColor={systemHealthPercentage >= 90 ? "text-green-600" : systemHealthPercentage >= 70 ? "text-yellow-600" : "text-red-600"}
          trend={getHealthTrend(systemHealthPercentage)}
          loading={isLoading}
          data-testid="card-system-health"
        />

        <MetricsCard
          title="Hallazgos Críticos"
          value={compliance?.criticalFindings || 0}
          subtitle="Requieren atención inmediata"
          icon={AlertTriangle}
          iconColor="text-red-600"
          badge={compliance?.criticalFindings && compliance.criticalFindings > 0 ?
            { text: "Urgente", variant: "destructive" } :
            { text: "Bueno", variant: "outline" }
          }
          loading={isLoading}
          data-testid="card-critical-findings"
        />
      </div>

      {/* Alert Banner */}
      {(criticalAlertsCount > 0 || warningAlertsCount > 0) && (
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
              <div className="flex-1">
                <h4 className="font-medium" data-testid="alert-banner-title">
                  Alertas del Sistema ({criticalAlertsCount + warningAlertsCount} activas)
                </h4>
                <p className="text-sm text-muted-foreground" data-testid="alert-banner-description">
                  {criticalAlertsCount > 0 && `${criticalAlertsCount} alertas críticas`}
                  {criticalAlertsCount > 0 && warningAlertsCount > 0 && ", "}
                  {warningAlertsCount > 0 && `${warningAlertsCount} advertencias`}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveTab("alerts")}>
                Ver Todas
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Dashboard Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="w-full overflow-x-auto">
          <TabsList className="inline-flex w-auto lg:grid lg:w-[500px] lg:grid-cols-5">
            <TabsTrigger value="overview" data-testid="tab-overview" className="flex-shrink-0">Resumen</TabsTrigger>
            <TabsTrigger value="departments" data-testid="tab-departments" className="flex-shrink-0">Departamentos</TabsTrigger>
            <TabsTrigger value="resources" data-testid="tab-resources" className="flex-shrink-0">Recursos</TabsTrigger>
            <TabsTrigger value="compliance" data-testid="tab-compliance" className="flex-shrink-0">Cumplimiento</TabsTrigger>
            <TabsTrigger value="alerts" data-testid="tab-alerts" className="flex-shrink-0">Alertas</TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* System Performance */}
            <div className="lg:col-span-2 space-y-6">
              <Card data-testid="system-performance">
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Activity className="h-4 w-4 mr-2" />
                    Métricas de Rendimiento del Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="grid grid-cols-2 gap-6">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="space-y-2">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Rendimiento de Base de Datos</span>
                          <span className="text-sm font-medium" data-testid="db-performance">
                            {systemHealth?.averageResponseTime ? `${systemHealth.averageResponseTime}s` : 'N/A'}
                          </span>
                        </div>
                        <Progress
                          value={systemHealth?.averageResponseTime ? Math.min(100, (1 / systemHealth.averageResponseTime) * 100) : 0}
                          className="h-2"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Uso de Almacenamiento</span>
                          <span className="text-sm font-medium" data-testid="storage-usage">
                            {systemHealth?.attachmentStorageUsed || 0}%
                          </span>
                        </div>
                        <Progress
                          value={systemHealth?.attachmentStorageUsed || 0}
                          className="h-2"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Tiempo Promedio de Revisión</span>
                          <span className="text-sm font-medium" data-testid="system-uptime">
                            {resourceUtil?.averageWorkload || 0} días
                          </span>
                        </div>
                        <Progress
                          value={Math.min(100, (resourceUtil?.averageWorkload || 0) * 10)}
                          className="h-2"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Actividad de Usuarios</span>
                          <span className="text-sm font-medium" data-testid="user-activity">
                            {systemHealth?.activeUsers || 0}
                          </span>
                        </div>
                        <Progress
                          value={Math.min(100, (systemHealth?.activeUsers || 0) * 10)}
                          className="h-2"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Cobertura de Riesgos</span>
                          <span className="text-sm font-medium" data-testid="error-rate">
                            {compliance?.riskCoverage ? `${Math.round(compliance.riskCoverage * 100)}%` : '0%'}
                          </span>
                        </div>
                        <Progress
                          value={compliance?.riskCoverage ? compliance.riskCoverage * 100 : 0}
                          className="h-2"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Acciones Abiertas</span>
                          <span className="text-sm font-medium" data-testid="pending-maintenance">
                            {compliance?.openActions || 0} elementos
                          </span>
                        </div>
                        <Progress
                          value={Math.min(100, (compliance?.openActions || 0) * 10)}
                          className="h-2"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="organizational-metrics">
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Building2 className="h-4 w-4 mr-2" />
                    Métricas Organizacionales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="grid grid-cols-3 gap-6">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="text-center space-y-2">
                          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mx-auto" />
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-6 text-center">
                      <div className="space-y-2">
                        <div className="text-2xl font-bold" data-testid="completion-rate">
                          {overview?.organizationalCompletionRate || 0}%
                        </div>
                        <div className="text-sm text-muted-foreground">Tasa de Finalización</div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-2xl font-bold" data-testid="avg-review-time">
                          {resourceUtil?.averageWorkload || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Tiempo Promedio de Revisión (días)</div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-2xl font-bold" data-testid="system-health-score">
                          {systemHealthPercentage}%
                        </div>
                        <div className="text-sm text-muted-foreground">Puntuación de Salud</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity and Quick Stats */}
            <div className="space-y-6">
              <Card data-testid="quick-stats">
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Zap className="h-4 w-4 mr-2" />
                    Estadísticas Rápidas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8 animate-pulse" />
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Ejecutores Activos</span>
                        <Badge variant="outline" data-testid="active-executors-badge">
                          {resourceUtil?.totalExecutors || 0}
                        </Badge>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm">Supervisores Activos</span>
                        <Badge variant="outline" data-testid="active-supervisors-badge">
                          {resourceUtil?.totalSupervisors || 0}
                        </Badge>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm">Hallazgos Críticos</span>
                        <Badge
                          variant={compliance?.criticalFindings && compliance.criticalFindings > 0 ? "destructive" : "outline"}
                          data-testid="critical-findings-badge"
                        >
                          {compliance?.criticalFindings || 0}
                        </Badge>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm">Alertas del Sistema</span>
                        <Badge
                          variant={(criticalAlertsCount + warningAlertsCount) > 0 ? "secondary" : "outline"}
                          data-testid="system-alerts-badge"
                        >
                          {criticalAlertsCount + warningAlertsCount}
                        </Badge>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-6">
          <Card data-testid="department-metrics">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center">
                <Building2 className="h-4 w-4 mr-2" />
                Resumen de Rendimiento de Departamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse" />
                      </div>
                      <div className="flex space-x-4">
                        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-16">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Las métricas de departamentos se mostrarían aquí</p>
                  <p className="text-sm">Conectar con la estructura existente de departamentos/procesos</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-6">
          <Card data-testid="resources-overview">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Utilización de Recursos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  ))}
                </div>
              ) : resourceUtil ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Ejecutores Totales</p>
                      <p className="text-2xl font-bold">{resourceUtil.totalExecutors}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Supervisores Totales</p>
                      <p className="text-2xl font-bold">{resourceUtil.totalSupervisors}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Carga Promedio</p>
                      <p className="text-2xl font-bold">{resourceUtil.averageWorkload.toFixed(1)}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Utilización de Capacidad</p>
                      <p className="text-2xl font-bold">{resourceUtil.capacityUtilization.toFixed(1)}%</p>
                    </div>
                  </div>
                  {resourceUtil.bottlenecks && resourceUtil.bottlenecks.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Cuellos de Botella</h4>
                      {resourceUtil.bottlenecks.map((bottleneck, idx) => (
                        <div key={idx} className="p-3 border rounded-lg mb-2">
                          <p className="font-medium">{bottleneck.area}</p>
                          <p className="text-sm text-muted-foreground">{bottleneck.description}</p>
                          <Badge variant={bottleneck.severity === 'high' ? 'destructive' : 'secondary'} className="mt-1">
                            {bottleneck.severity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-16">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Las métricas de recursos se mostrarían aquí</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <Card data-testid="compliance-overview">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                Resumen de Estado de Cumplimiento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg space-y-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-16">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Las métricas de estado de cumplimiento se mostrarían aquí</p>
                  <p className="text-sm">Integración con el marco de riesgos y controles</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-6">
          <Card data-testid="system-alerts">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Alertas del Sistema ({alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p>No hay alertas activas del sistema</p>
                  <p className="text-sm">Todos los sistemas están funcionando normalmente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => handleViewAlert(alert.id)}
                      data-testid={`alert-${alert.id}`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${alert.type === 'critical' ? 'bg-red-100 text-red-600 dark:bg-red-900' :
                          alert.type === 'warning' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900' :
                            'bg-blue-100 text-blue-600 dark:bg-blue-900'
                        }`}>
                        {alert.type === 'critical' ? <XCircle className="h-4 w-4" /> :
                          alert.type === 'warning' ? <AlertTriangle className="h-4 w-4" /> :
                            <Eye className="h-4 w-4" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" data-testid={`alert-message-${alert.id}`}>
                          {alert.message}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-muted-foreground" data-testid={`alert-timestamp-${alert.id}`}>
                            {alert.timestamp.toLocaleString()}
                          </span>
                          {alert.resolved && (
                            <Badge variant="outline" className="text-xs">Resolved</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}