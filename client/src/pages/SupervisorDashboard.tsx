import { useQuery, useMutation } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/usePermissions";
import { 
  MetricsCard, 
  TeamPerformanceTable,
  WorkloadDistribution,
  ActivityTimeline,
  ProgressChart 
} from "@/components/dashboard-widgets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  UserPlus,
  FileCheck,
  MessageSquare,
  Filter,
  Download
} from "lucide-react";
import { useState } from "react";

// Type definitions for supervisor dashboard data
interface SupervisorDashboardMetrics {
  teamStats: {
    teamSize: number;
    totalAssignedTests: number;
    completedTests: number;
    pendingReviews: number;
    averageReviewTime: number;
    teamPerformanceScore: number;
    overdueReviews: number;
    activeExecutors: number;
  };
  teamMembers: Array<{
    executorId: string;
    executorName: string;
    assignedTests: number;
    completedTests: number;
    averageProgress: number;
    hoursWorked: number;
    onTimeRate: number;
    currentLoad: number;
    capacity: number;
  }>;
  workloadDistribution: Array<{
    executorId: string;
    executorName: string;
    currentLoad: number;
    capacity: number;
    utilizationRate: number;
    assignedTests?: Array<{
      testId: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      deadline: Date;
    }>;
  }>;
  reviewQueue: Array<{
    testId: string;
    testName: string;
    executorName: string;
    submittedDate: Date;
    deadline: Date;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: string;
    daysInReview: number;
  }>;
  teamActivity: Array<{
    id: string;
    type: 'work_log' | 'status_change' | 'comment' | 'upload' | 'review' | 'milestone';
    description: string;
    timestamp: Date;
    executorName: string;
    testId?: string;
    testName?: string;
  }>;
  performanceTrends: Array<{
    period: string;
    completionRate: number;
    onTimeRate: number;
    reviewTime: number;
  }>;
}

interface ReviewQueueItem {
  testId: string;
  testName: string;
  executorName: string;
  submittedDate: Date;
  deadline: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  daysInReview: number;
}

export default function SupervisorDashboard() {
  const { currentUser, hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedTimeRange, setSelectedTimeRange] = useState("30");
  const [activeTab, setActiveTab] = useState("overview");

  // Check supervisor permissions
  const canViewTeams = hasPermission("view_audit_teams") || hasPermission("view_all");
  const canReviewTests = hasPermission("review_audit_tests") || hasPermission("edit_all");

  // Fetch supervisor dashboard metrics
  const { data: dashboardData, isLoading, error, refetch } = useQuery<SupervisorDashboardMetrics>({
    queryKey: ['/api/dashboard/supervisor', currentUser?.id],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/supervisor/${currentUser?.id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch supervisor dashboard: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!currentUser?.id && !permissionsLoading && canViewTeams,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    staleTime: 60000, // 1 minute - dashboard data, moderate change frequency
  });

  // Fetch workload distribution
  const { data: workloadData, isLoading: workloadLoading } = useQuery({
    queryKey: ['/api/dashboard/workload-distribution', currentUser?.id],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/workload-distribution?supervisorId=${currentUser?.id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch workload distribution: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!currentUser?.id && canViewTeams,
    refetchInterval: 5 * 60 * 1000,
  });

  // Approve test review mutation
  const approveTestMutation = useMutation({
    mutationFn: async ({ testId, approved }: { testId: string; approved: boolean }) => {
      const response = await apiRequest(`/api/audit-tests/${testId}/review`, 'POST', {
        approved,
        reviewNotes: approved ? 'Approved by supervisor' : 'Requires revision'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/supervisor'] });
      toast({
        title: "Revisión Enviada",
        description: "La revisión de la prueba ha sido procesada exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Error al enviar la revisión",
        variant: "destructive",
      });
    },
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

  // Handle permission error
  if (!canViewTeams) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-lg font-medium">Acceso Denegado</p>
          <p className="text-muted-foreground mb-4">No tienes permisos para ver los dashboards de equipo.</p>
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
          <p className="text-muted-foreground mb-4">Error al cargar datos del dashboard de supervisor</p>
          <Button onClick={() => refetch()}>Reintentar</Button>
        </div>
      </div>
    );
  }

  const teamStats = dashboardData?.teamStats;
  const reviewQueue = dashboardData?.reviewQueue || [];
  
  // Calculate team performance trend
  const getTeamPerformanceTrend = (score: number) => {
    return {
      value: score - 75, // Baseline of 75%
      label: "vs mes anterior",
      isPositive: score > 75
    };
  };

  // Handle actions
  const handleAssignWork = (member: any) => {
    navigate(`/audits?assign-to=${member.executorId}`);
  };

  const handleMemberClick = (member: any) => {
    navigate(`/team-members/${member.executorId}`);
  };

  const handleReviewTest = (testId: string) => {
    navigate(`/audit-test-details/${testId}`);
  };

  const handleQuickApprove = async (testId: string) => {
    if (canReviewTests) {
      await approveTestMutation.mutateAsync({ testId, approved: true });
    }
  };

  const handleQuickReject = async (testId: string) => {
    if (canReviewTests) {
      await approveTestMutation.mutateAsync({ testId, approved: false });
    }
  };

  const handleExportReport = () => {
    toast({
      title: "Exportar Reporte",
      description: "La exportación del reporte de rendimiento del equipo comenzaría aquí",
    });
  };

  return (
    <div className="flex-1 space-y-6 p-6" data-testid="supervisor-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="dashboard-title">
            Dashboard del Equipo
          </h1>
          <p className="text-muted-foreground" data-testid="dashboard-subtitle">
            Administra y supervisa tu equipo de auditoría
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
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExportReport} data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button size="sm" onClick={() => navigate("/team")} data-testid="button-manage-team">
            <UserPlus className="h-4 w-4 mr-2" />
            Administrar Equipo
          </Button>
        </div>
      </div>

      {/* Team Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricsCard
          title="Tamaño del Equipo"
          value={teamStats?.teamSize || 0}
          subtitle={`${teamStats?.activeExecutors || 0} activos`}
          icon={Users}
          iconColor="text-blue-600"
          loading={isLoading}
          data-testid="card-team-size"
        />
        
        <MetricsCard
          title="Revisiones Pendientes"
          value={teamStats?.pendingReviews || 0}
          subtitle={`${teamStats?.overdueReviews || 0} vencidas`}
          icon={FileCheck}
          iconColor="text-yellow-600"
          badge={teamStats?.overdueReviews && teamStats.overdueReviews > 0 ? 
            { text: "Acción Requerida", variant: "destructive" } : undefined}
          loading={isLoading}
          data-testid="card-pending-reviews"
        />
        
        <MetricsCard
          title="Rendimiento del Equipo"
          value={`${teamStats?.teamPerformanceScore || 0}%`}
          subtitle="Puntuación general del equipo"
          icon={teamStats?.teamPerformanceScore && teamStats.teamPerformanceScore >= 80 ? TrendingUp : TrendingDown}
          iconColor={teamStats?.teamPerformanceScore && teamStats.teamPerformanceScore >= 80 ? "text-green-600" : "text-red-600"}
          trend={teamStats?.teamPerformanceScore ? getTeamPerformanceTrend(teamStats.teamPerformanceScore) : undefined}
          loading={isLoading}
          data-testid="card-team-performance"
        />
        
        <MetricsCard
          title="Tiempo Promedio de Revisión"
          value={`${teamStats?.averageReviewTime || 0}`}
          subtitle="promedio en días"
          icon={Clock}
          iconColor="text-purple-600"
          loading={isLoading}
          data-testid="card-avg-review-time"
        />
      </div>

      {/* Main Dashboard Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="w-full overflow-x-auto">
          <TabsList className="inline-flex w-auto lg:grid lg:w-96 lg:grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-overview" className="flex-shrink-0">Resumen</TabsTrigger>
            <TabsTrigger value="team" data-testid="tab-team" className="flex-shrink-0">Equipo</TabsTrigger>
            <TabsTrigger value="reviews" data-testid="tab-reviews" className="flex-shrink-0">Revisiones</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics" className="flex-shrink-0">Análisis</TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Team Performance and Workload */}
            <div className="lg:col-span-2 space-y-6">
              <TeamPerformanceTable
                title="Resumen de Rendimiento del Equipo"
                teamMembers={dashboardData?.teamMembers || []}
                onMemberClick={handleMemberClick}
                onAssignWork={handleAssignWork}
                loading={isLoading}
                data-testid="team-performance-table"
              />

              <WorkloadDistribution
                title="Distribución de Carga de Trabajo"
                workloadData={workloadData || dashboardData?.workloadDistribution || []}
                onExecutorClick={handleMemberClick}
                loading={workloadLoading || isLoading}
                data-testid="workload-distribution"
              />
            </div>

            {/* Recent Activity */}
            <div>
              <ActivityTimeline
                title="Actividad del Equipo"
                activities={(dashboardData?.teamActivity || []).map(activity => ({
                  ...activity,
                  timestamp: new Date(activity.timestamp)
                }))}
                loading={isLoading}
                data-testid="team-activity-timeline"
              />
            </div>
          </div>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <TeamPerformanceTable
              title="Detalle de Miembros del Equipo"
              teamMembers={dashboardData?.teamMembers || []}
              onMemberClick={handleMemberClick}
              onAssignWork={handleAssignWork}
              loading={isLoading}
              data-testid="detailed-team-table"
            />

            <Card data-testid="team-stats-breakdown">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Estadísticas del Equipo</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex justify-between">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12 animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Pruebas Asignadas</span>
                      <span className="font-medium" data-testid="total-assigned-tests">
                        {teamStats?.totalAssignedTests || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Pruebas Completadas</span>
                      <span className="font-medium" data-testid="total-completed-tests">
                        {teamStats?.completedTests || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Tasa de Finalización</span>
                      <span className="font-medium" data-testid="team-completion-rate">
                        {teamStats?.totalAssignedTests && teamStats?.completedTests
                          ? Math.round((teamStats.completedTests / teamStats.totalAssignedTests) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Ejecutores Activos</span>
                      <span className="font-medium" data-testid="active-executors">
                        {teamStats?.activeExecutors || 0}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-6">
          <Card data-testid="review-queue">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                Cola de Revisión ({reviewQueue.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse" />
                      </div>
                      <div className="flex space-x-2">
                        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : reviewQueue.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay pruebas pendientes de revisión</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviewQueue.map((item) => (
                    <div 
                      key={item.testId}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => handleReviewTest(item.testId)}
                      data-testid={`review-item-${item.testId}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-sm truncate" data-testid={`review-test-name-${item.testId}`}>
                            {item.testName}
                          </h4>
                          <Badge 
                            variant={item.priority === 'critical' ? 'destructive' : item.priority === 'high' ? 'secondary' : 'outline'}
                            data-testid={`review-priority-${item.testId}`}
                          >
                            {item.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span data-testid={`review-executor-${item.testId}`}>Por: {item.executorName}</span>
                          <span data-testid={`review-submitted-${item.testId}`}>
                            Enviado: {item.submittedDate.toLocaleDateString()}
                          </span>
                          <span data-testid={`review-days-${item.testId}`}>
                            {item.daysInReview} días en revisión
                          </span>
                        </div>
                      </div>
                      
                      {canReviewTests && (
                        <div className="flex space-x-2 ml-4">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickReject(item.testId);
                            }}
                            disabled={approveTestMutation.isPending}
                            data-testid={`button-reject-${item.testId}`}
                          >
                            Rechazar
                          </Button>
                          <Button 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickApprove(item.testId);
                            }}
                            disabled={approveTestMutation.isPending}
                            data-testid={`button-approve-${item.testId}`}
                          >
                            Aprobar
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card data-testid="performance-trends">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Tendencias de Rendimiento
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ) : (
                  <div className="text-center text-muted-foreground py-16">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aquí se mostraría el gráfico de tendencias de rendimiento</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <WorkloadDistribution
              title="Análisis de Carga de Trabajo Actual"
              workloadData={workloadData || dashboardData?.workloadDistribution || []}
              onExecutorClick={handleMemberClick}
              loading={workloadLoading || isLoading}
              showDetails={true}
              data-testid="workload-analysis"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}