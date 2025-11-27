import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { BarChart3, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

interface WorkloadItem {
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
}

interface WorkloadDistributionProps {
  title: string;
  workloadData: WorkloadItem[];
  className?: string;
  loading?: boolean;
  showDetails?: boolean;
  onExecutorClick?: (executor: WorkloadItem) => void;
  "data-testid"?: string;
}

export function WorkloadDistribution({
  title,
  workloadData,
  className,
  loading = false,
  showDetails = true,
  onExecutorClick,
  "data-testid": testId
}: WorkloadDistributionProps) {
  if (loading) {
    return (
      <Card className={className} data-testid={testId}>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getUtilizationStatus = (utilizationRate: number) => {
    if (utilizationRate >= 100) return { 
      label: "Sobrecargado", 
      variant: "destructive" as const, 
      color: "bg-red-500",
      icon: AlertTriangle,
      iconColor: "text-red-600"
    };
    if (utilizationRate >= 90) return { 
      label: "Al Máximo", 
      variant: "secondary" as const, 
      color: "bg-orange-500",
      icon: AlertTriangle,
      iconColor: "text-orange-600"
    };
    if (utilizationRate >= 70) return { 
      label: "Carga Alta", 
      variant: "default" as const, 
      color: "bg-yellow-500",
      icon: Clock,
      iconColor: "text-yellow-600"
    };
    if (utilizationRate >= 40) return { 
      label: "Normal", 
      variant: "outline" as const, 
      color: "bg-blue-500",
      icon: CheckCircle2,
      iconColor: "text-blue-600"
    };
    return { 
      label: "Carga Ligera", 
      variant: "outline" as const, 
      color: "bg-green-500",
      icon: CheckCircle2,
      iconColor: "text-green-600"
    };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const sortedWorkload = workloadData.sort((a, b) => b.utilizationRate - a.utilizationRate);
  
  // Calculate team statistics
  const totalCapacity = workloadData.reduce((sum, item) => sum + item.capacity, 0);
  const totalLoad = workloadData.reduce((sum, item) => sum + item.currentLoad, 0);
  const averageUtilization = workloadData.length > 0 
    ? workloadData.reduce((sum, item) => sum + item.utilizationRate, 0) / workloadData.length
    : 0;
  const overloadedCount = workloadData.filter(item => item.utilizationRate >= 100).length;
  const underutilizedCount = workloadData.filter(item => item.utilizationRate < 40).length;

  return (
    <Card className={className} data-testid={testId}>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center">
          <BarChart3 className="h-4 w-4 mr-2" />
          {title}
        </CardTitle>
        
        {/* Team Summary */}
        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
          <span data-testid="team-capacity">
            Capacidad: {totalLoad}/{totalCapacity}
          </span>
          <span data-testid="team-utilization">
            Promedio: {Math.round(averageUtilization)}%
          </span>
          {overloadedCount > 0 && (
            <Badge variant="destructive" className="text-xs" data-testid="overloaded-count">
              {overloadedCount} sobrecargados
            </Badge>
          )}
          {underutilizedCount > 0 && (
            <Badge variant="outline" className="text-xs" data-testid="underutilized-count">
              {underutilizedCount} subutilizados
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sortedWorkload.length === 0 ? (
          <div className="text-center text-muted-foreground py-8" data-testid="no-workload-data">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay datos de carga de trabajo disponibles</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedWorkload.map((item) => {
              const status = getUtilizationStatus(item.utilizationRate);
              const StatusIcon = status.icon;

              return (
                <div 
                  key={item.executorId}
                  className={cn(
                    "space-y-3 p-3 border rounded-lg transition-colors",
                    onExecutorClick && "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800",
                    item.utilizationRate >= 100 && "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950"
                  )}
                  onClick={() => onExecutorClick?.(item)}
                  data-testid={`workload-item-${item.executorId}`}
                >
                  {/* Header with name and status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <StatusIcon className={cn("h-4 w-4", status.iconColor)} />
                      <span className="font-medium text-sm" data-testid={`executor-name-${item.executorId}`}>
                        {item.executorName}
                      </span>
                      <Badge variant={status.variant} className="text-xs" data-testid={`status-badge-${item.executorId}`}>
                        {status.label}
                      </Badge>
                    </div>
                    <span className="text-sm font-medium" data-testid={`utilization-rate-${item.executorId}`}>
                      {Math.round(item.utilizationRate)}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Carga de Trabajo</span>
                      <span data-testid={`load-fraction-${item.executorId}`}>
                        {item.currentLoad} / {item.capacity} pruebas
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(item.utilizationRate, 100)} 
                      className={cn(
                        "h-2",
                        item.utilizationRate >= 100 && "progress-destructive"
                      )}
                      data-testid={`progress-bar-${item.executorId}`}
                    />
                  </div>

                  {/* Test breakdown by priority */}
                  {showDetails && item.assignedTests && item.assignedTests.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs text-muted-foreground">Pruebas por Prioridad:</span>
                      <div className="flex items-center space-x-2">
                        {['critical', 'high', 'medium', 'low'].map(priority => {
                          const count = item.assignedTests?.filter(test => test.priority === priority).length || 0;
                          if (count === 0) return null;
                          
                          return (
                            <div 
                              key={priority}
                              className="flex items-center space-x-1"
                              data-testid={`priority-${priority}-${item.executorId}`}
                            >
                              <div className={cn("w-2 h-2 rounded-full", getPriorityColor(priority))} />
                              <span className="text-xs">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}