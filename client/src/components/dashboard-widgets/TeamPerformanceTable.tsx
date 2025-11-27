import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Users, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TeamMember {
  executorId: string;
  executorName: string;
  assignedTests: number;
  completedTests: number;
  averageProgress: number;
  hoursWorked: number;
  onTimeRate: number;
  currentLoad: number;
  capacity: number;
}

interface TeamPerformanceTableProps {
  title: string;
  teamMembers: TeamMember[];
  className?: string;
  loading?: boolean;
  onMemberClick?: (member: TeamMember) => void;
  onAssignWork?: (member: TeamMember) => void;
  "data-testid"?: string;
}

export function TeamPerformanceTable({
  title,
  teamMembers,
  className,
  loading = false,
  onMemberClick,
  onAssignWork,
  "data-testid": testId
}: TeamPerformanceTableProps) {
  if (loading) {
    return (
      <Card className={className} data-testid={testId}>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center">
            <Users className="h-4 w-4 mr-2" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse" />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPerformanceIcon = (onTimeRate: number) => {
    if (onTimeRate >= 90) return { icon: TrendingUp, color: "text-green-600" };
    if (onTimeRate >= 70) return { icon: Minus, color: "text-yellow-600" };
    return { icon: TrendingDown, color: "text-red-600" };
  };

  const getWorkloadStatus = (currentLoad: number, capacity: number) => {
    const utilization = (currentLoad / capacity) * 100;
    if (utilization >= 90) return { label: "Sobrecargado", variant: "destructive" as const, color: "bg-red-500" };
    if (utilization >= 80) return { label: "Alta", variant: "secondary" as const, color: "bg-orange-500" };
    if (utilization >= 60) return { label: "Normal", variant: "default" as const, color: "bg-blue-500" };
    return { label: "Ligera", variant: "outline" as const, color: "bg-green-500" };
  };

  return (
    <Card className={className} data-testid={testId}>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center">
          <Users className="h-4 w-4 mr-2" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {teamMembers.length === 0 ? (
          <div className="text-center text-muted-foreground py-8" data-testid="no-team-members">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No se encontraron miembros del equipo</p>
          </div>
        ) : (
          <div className="space-y-3">
            {teamMembers.map((member) => {
              const performance = getPerformanceIcon(member.onTimeRate);
              const workloadStatus = getWorkloadStatus(member.currentLoad, member.capacity);
              const PerformanceIcon = performance.icon;
              const utilizationRate = Math.min((member.currentLoad / member.capacity) * 100, 100);

              return (
                <div 
                  key={member.executorId}
                  className={cn(
                    "flex items-center justify-between p-4 border rounded-lg transition-colors",
                    onMemberClick && "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  )}
                  onClick={() => onMemberClick?.(member)}
                  data-testid={`team-member-${member.executorId}`}
                >
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    {/* Avatar placeholder */}
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                      {member.executorName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    
                    {/* Member info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium text-sm truncate" data-testid={`member-name-${member.executorId}`}>
                          {member.executorName}
                        </h4>
                        <PerformanceIcon className={cn("h-4 w-4", performance.color)} />
                      </div>
                      
                      <div className="flex items-center space-x-4 mt-1">
                        <Badge variant={workloadStatus.variant} className="text-xs" data-testid={`member-workload-${member.executorId}`}>
                          {workloadStatus.label}
                        </Badge>
                        
                        <span className="text-xs text-muted-foreground" data-testid={`member-tests-${member.executorId}`}>
                          {member.completedTests}/{member.assignedTests} pruebas
                        </span>
                        
                        <span className="text-xs text-muted-foreground" data-testid={`member-hours-${member.executorId}`}>
                          {member.hoursWorked}h trabajadas
                        </span>
                      </div>
                      
                      {/* Progress bar for current workload */}
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Carga de Trabajo</span>
                          <span className="text-xs font-medium" data-testid={`member-utilization-${member.executorId}`}>
                            {member.currentLoad}/{member.capacity} ({Math.round(utilizationRate)}%)
                          </span>
                        </div>
                        <Progress 
                          value={utilizationRate} 
                          className="h-1" 
                          data-testid={`member-progress-${member.executorId}`}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions and metrics */}
                  <div className="flex items-center space-x-3 ml-4">
                    <div className="text-right space-y-1">
                      <div className="text-sm font-medium" data-testid={`member-progress-percent-${member.executorId}`}>
                        {member.averageProgress}%
                      </div>
                      <div className="text-xs text-muted-foreground">progreso prom.</div>
                    </div>
                    
                    <div className="text-right space-y-1">
                      <div className={cn("text-sm font-medium", performance.color)} data-testid={`member-ontime-rate-${member.executorId}`}>
                        {member.onTimeRate}%
                      </div>
                      <div className="text-xs text-muted-foreground">puntualidad</div>
                    </div>
                    
                    {onAssignWork && utilizationRate < 90 && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAssignWork(member);
                        }}
                        data-testid={`assign-work-${member.executorId}`}
                      >
                        Asignar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}