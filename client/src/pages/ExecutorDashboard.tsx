import { useQuery } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/usePermissions";
import {
  MetricsCard,
  ProgressChart,
  ActivityTimeline,
  DeadlineCalendar
} from "@/components/dashboard-widgets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Activity,
  Calendar,
  TrendingUp,
  Plus,
  Upload,
  Search,
  Filter
} from "lucide-react";

// Type definitions for executor dashboard data
interface ExecutorDashboardMetrics {
  personalStats: {
    assignedTests: number;
    inProgressTests: number;
    completedTests: number;
    overdueTests: number;
    hoursWorkedThisWeek: number;
    hoursWorkedThisMonth: number;
    averageCompletionTime: number;
    onTimeRate: number;
  };
  progressData: Array<{
    id: string;
    label: string;
    value: number;
    total: number;
    color?: string;
    subtitle?: string;
  }>;
  upcomingDeadlines: Array<{
    testId: string;
    testName: string;
    deadline: Date;
    daysLeft: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status?: string;
  }>;
  recentActivity: Array<{
    id: string;
    type: 'work_log' | 'status_change' | 'comment' | 'upload' | 'review' | 'milestone';
    description: string;
    timestamp: Date;
    testId?: string;
    testName?: string;
    metadata?: any;
  }>;
}

export default function ExecutorDashboard() {
  const { currentUser, hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Fetch executor dashboard metrics
  const { data: dashboardData, isLoading, error, refetch } = useQuery<ExecutorDashboardMetrics>({
    queryKey: ['/api/dashboard/executor', currentUser?.id],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/executor/${currentUser?.id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch executor dashboard: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!currentUser?.id && !permissionsLoading,
    refetchInterval: 15 * 60 * 1000, // Optimized: 15 minutes (was 5min) - reduces server load
    staleTime: 60000, // 1 minute - dashboard data, moderate change frequency
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });

  // Fetch recent activity separately for real-time updates
  const { data: activityData, isLoading: activityLoading } = useQuery<any[]>({
    queryKey: ['/api/dashboard/activity', currentUser?.id],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/activity/${currentUser?.id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch activity data: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!currentUser?.id,
    refetchInterval: 5 * 60 * 1000, // Optimized: 5 minutes (was 2min) - activity updates less frequently
    refetchOnWindowFocus: true,
  });

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

  // Handle authentication error
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-lg font-medium">Autenticación Requerida</p>
          <p className="text-muted-foreground mb-4">Por favor inicia sesión para acceder a tu dashboard.</p>
          <Button asChild>
            <Link href="/login">Iniciar Sesión</Link>
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
          <p className="text-muted-foreground mb-4">Error al cargar datos del dashboard</p>
          <Button onClick={() => refetch()}>Reintentar</Button>
        </div>
      </div>
    );
  }

  const metrics = dashboardData?.personalStats;
  const activities = activityData || dashboardData?.recentActivity || [];

  // Calculate performance trends
  const getPerformanceTrend = (onTimeRate: number) => {
    return {
      value: onTimeRate - 75, // Assume baseline of 75%
      label: "vs mes anterior",
      isPositive: onTimeRate > 75
    };
  };

  // Handle quick actions
  const handleStartNewTest = () => {
    navigate("/audits");
  };

  const handleUploadDocument = () => {
    // Navigate to upload or open upload modal
    toast({
      title: "Subir Documento",
      description: "La funcionalidad de carga de documentos se abriría aquí",
    });
  };

  const handleViewAllTests = () => {
    navigate("/audits?filter=assigned-to-me");
  };

  const handleDeadlineClick = (deadline: any) => {
    navigate(`/audit-test-details/${deadline.testId}`);
  };

  const handleActivityClick = (activity: any) => {
    if (activity.testId) {
      navigate(`/audit-test-details/${activity.testId}`);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="executor-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="dashboard-title">
            Mi Dashboard
          </h1>
          <p className="text-muted-foreground" data-testid="dashboard-subtitle">
            Bienvenido de nuevo, {currentUser.firstName || currentUser.email}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={handleUploadDocument} data-testid="button-upload">
            <Upload className="h-4 w-4 mr-2" />
            Subir
          </Button>
          <Button size="sm" onClick={handleStartNewTest} data-testid="button-start-test">
            <Plus className="h-4 w-4 mr-2" />
            Iniciar Prueba
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricsCard
          title="Pruebas Asignadas"
          value={metrics?.assignedTests || 0}
          subtitle="Total asignadas a mí"
          icon={FileText}
          iconColor="text-blue-600"
          onClick={handleViewAllTests}
          loading={isLoading}
          data-testid="card-assigned-tests"
        />

        <MetricsCard
          title="En Progreso"
          value={metrics?.inProgressTests || 0}
          subtitle="Actualmente trabajando en"
          icon={Clock}
          iconColor="text-yellow-600"
          badge={{ text: "Activo", variant: "default" }}
          loading={isLoading}
          data-testid="card-in-progress"
        />

        <MetricsCard
          title="Completadas"
          value={metrics?.completedTests || 0}
          subtitle="Pruebas completadas"
          icon={CheckCircle2}
          iconColor="text-green-600"
          trend={metrics?.onTimeRate ? getPerformanceTrend(metrics.onTimeRate) : undefined}
          loading={isLoading}
          data-testid="card-completed"
        />

        <MetricsCard
          title="Vencidas"
          value={metrics?.overdueTests || 0}
          subtitle="Necesitan atención"
          icon={AlertTriangle}
          iconColor="text-red-600"
          badge={metrics?.overdueTests && metrics.overdueTests > 0 ?
            { text: "Urgente", variant: "destructive" } : undefined
          }
          loading={isLoading}
          data-testid="card-overdue"
        />
      </div>

      {/* Main Dashboard Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Progress and Performance */}
        <div className="lg:col-span-2 space-y-6">
          {/* Test Progress */}
          <ProgressChart
            title="Resumen de Progreso de Pruebas"
            items={dashboardData?.progressData || []}
            loading={isLoading}
            data-testid="progress-chart"
          />

          {/* Performance Metrics */}
          <Card data-testid="performance-metrics">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Mis Métricas de Rendimiento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Horas Esta Semana</p>
                    <p className="text-2xl font-bold" data-testid="hours-this-week">
                      {metrics?.hoursWorkedThisWeek || 0}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Horas Este Mes</p>
                    <p className="text-2xl font-bold" data-testid="hours-this-month">
                      {metrics?.hoursWorkedThisMonth || 0}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Tiempo Promedio de Finalización</p>
                    <p className="text-2xl font-bold" data-testid="avg-completion-time">
                      {metrics?.averageCompletionTime || 0}
                      <span className="text-sm text-muted-foreground ml-1">días</span>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Tasa de Puntualidad</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-2xl font-bold" data-testid="on-time-rate">
                        {metrics?.onTimeRate || 0}%
                      </p>
                      {metrics?.onTimeRate && metrics.onTimeRate >= 80 && (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card data-testid="quick-actions">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="sm" onClick={handleViewAllTests} data-testid="action-view-tests">
                  <Search className="h-4 w-4 mr-2" />
                  Ver Todas las Pruebas
                </Button>
                <Button variant="outline" size="sm" onClick={handleUploadDocument} data-testid="action-upload-docs">
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Documentos
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate("/audits?filter=pending-review")} data-testid="action-pending-review">
                  <Filter className="h-4 w-4 mr-2" />
                  Pendientes de Revisión
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Activity and Deadlines */}
        <div className="space-y-6">
          {/* Upcoming Deadlines */}
          <DeadlineCalendar
            title="Próximas Fechas Límite"
            deadlines={(dashboardData?.upcomingDeadlines || []).map(deadline => ({
              ...deadline,
              deadline: new Date(deadline.deadline)
            }))}
            onDeadlineClick={handleDeadlineClick}
            loading={isLoading}
            data-testid="deadline-calendar"
          />

          {/* Recent Activity */}
          <ActivityTimeline
            title="Actividad Reciente"
            activities={(activities || []).map((activity: any) => ({
              ...activity,
              timestamp: new Date(activity.timestamp)
            }))}
            onActivityClick={handleActivityClick}
            loading={activityLoading}
            data-testid="activity-timeline"
          />
        </div>
      </div>
    </div>
  );
}