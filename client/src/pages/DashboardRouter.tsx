import { usePermissions } from "@/hooks/usePermissions";
import ExecutorDashboard from "./ExecutorDashboard";
import SupervisorDashboard from "./SupervisorDashboard";
import AdminDashboard from "./AdminDashboard";
import Dashboard from "./dashboard"; // Original dashboard as fallback
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Users, Shield, BarChart3 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { UserPreferences } from "@shared/schema";
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";

/**
 * Smart Dashboard Router component that routes users to the appropriate
 * dashboard based on their roles and permissions
 */
export function DashboardRouter() {
  const { currentUser, hasPermission, isAdmin, isLoading } = usePermissions();
  const [selectedDashboard, setSelectedDashboard] = useState<string>("auto");
  const [, setLocation] = useLocation();

  // Load user preferences to check if setup wizard is completed
  const { data: userPreferences, isLoading: isLoadingPreferences } = useQuery<UserPreferences>({
    queryKey: ["/api/user-preferences"],
    staleTime: 0,
    retry: false,
  });

  // Redirect to setup wizard if it hasn't been completed
  useEffect(() => {
    if (!isLoadingPreferences && userPreferences && !userPreferences.setupWizardCompleted && isAdmin()) {
      setLocation("/setup-wizard");
    }
  }, [userPreferences, isLoadingPreferences, setLocation, isAdmin]);

  // Show loading state while permissions or preferences are being loaded
  if (isLoading || !currentUser || isLoadingPreferences) {
    return (
      <div className="p-6">
        <DashboardSkeleton />
      </div>
    );
  }

  // Determine user's primary role and appropriate dashboard
  const isExecutor = hasPermission("create_work_logs") || hasPermission("view_audit_assignments");
  const isSupervisor = hasPermission("review_audit_tests") || hasPermission("view_audit_teams");
  const isAdministrator = isAdmin() || currentUser?.isPlatformAdmin;

  // Function to get the primary dashboard for the user
  const getPrimaryDashboard = (): string => {
    // Admin has highest priority
    if (isAdministrator) return "admin";
    // Then supervisor
    if (isSupervisor) return "supervisor";
    // Then executor
    if (isExecutor) return "executor";
    // Fallback to original dashboard
    return "legacy";
  };

  // Get available dashboards for this user
  const getAvailableDashboards = () => {
    const dashboards = [];
    
    if (isExecutor) {
      dashboards.push({
        key: "executor",
        label: "Mi Dashboard",
        icon: BarChart3,
        description: "Tareas personales y desempeño"
      });
    }
    
    if (isSupervisor) {
      dashboards.push({
        key: "supervisor",
        label: "Dashboard del Equipo",
        icon: Users,
        description: "Supervisión y revisiones del equipo"
      });
    }
    
    if (isAdministrator) {
      dashboards.push({
        key: "admin",
        label: "Analítica del Sistema",
        icon: Shield,
        description: "Información general de la organización"
      });
    }
    
    // Always include legacy dashboard as fallback
    dashboards.push({
      key: "legacy",
      label: "Visión de Riesgos",
      icon: AlertTriangle,
      description: "Dashboard tradicional de riesgos"
    });
    
    return dashboards;
  };

  const primaryDashboard = getPrimaryDashboard();
  const currentDashboard = selectedDashboard === "auto" ? primaryDashboard : selectedDashboard;
  const availableDashboards = getAvailableDashboards();

  // If user has only one dashboard option, show it directly
  if (availableDashboards.length === 1) {
    const dashboard = availableDashboards[0];
    switch (dashboard.key) {
      case "executor":
        return <ExecutorDashboard />;
      case "supervisor":
        return <SupervisorDashboard />;
      case "admin":
        return <AdminDashboard />;
      default:
        return <Dashboard />;
    }
  }

  // Function to render the selected dashboard
  const renderDashboard = () => {
    switch (currentDashboard) {
      case "executor":
        return <ExecutorDashboard />;
      case "supervisor":
        return <SupervisorDashboard />;
      case "admin":
        return <AdminDashboard />;
      case "legacy":
        return <Dashboard />;
      default:
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-lg font-medium">Dashboard No Encontrado</p>
              <p className="text-muted-foreground mb-4">El dashboard solicitado no pudo ser cargado.</p>
              <Button onClick={() => setSelectedDashboard("auto")}>
                Volver al Predeterminado
              </Button>
            </div>
          </div>
        );
    }
  };

  // If user has multiple dashboard options, show tabs
  return (
    <div className="flex-1" data-testid="dashboard-router">
      {availableDashboards.length > 1 && (
        <div className="border-b bg-background">
          <div className="flex items-center px-6 py-3">
            <div className="flex-1">
              <p className="text-muted-foreground text-sm">
                Bienvenido, {currentUser.firstName || currentUser.email}
              </p>
            </div>
            
            <div className="max-w-full overflow-x-auto">
              <Tabs 
                value={selectedDashboard} 
                onValueChange={setSelectedDashboard}
                className="w-auto"
              >
                <TabsList className="w-auto">
                  <TabsTrigger value="auto" data-testid="tab-auto" className="flex-shrink-0">
                    Recomendado
                  </TabsTrigger>
                  {availableDashboards.map((dashboard) => {
                    const Icon = dashboard.icon;
                    return (
                      <TabsTrigger 
                        key={dashboard.key} 
                        value={dashboard.key}
                        className="flex items-center space-x-2 flex-shrink-0"
                        data-testid={`tab-${dashboard.key}`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{dashboard.label}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      <div className="flex-1">
        {renderDashboard()}
      </div>

      {/* Dashboard Info Card (only show when multiple options) */}
      {availableDashboards.length > 1 && selectedDashboard === "auto" && (
        <Card className="mx-6 mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-blue-900 dark:text-blue-100">
                  Selección Inteligente de Dashboard
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                  Tienes acceso a múltiples dashboards. Estamos mostrando tu dashboard principal basado en tu rol.
                  Usa las pestañas arriba para cambiar entre diferentes vistas.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {availableDashboards.map((dashboard) => {
                    const Icon = dashboard.icon;
                    return (
                      <Button
                        key={dashboard.key}
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDashboard(dashboard.key)}
                        className="bg-white dark:bg-gray-800 border-blue-300 dark:border-blue-700"
                        data-testid={`quick-access-${dashboard.key}`}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {dashboard.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default DashboardRouter;