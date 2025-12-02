import { useQuery } from "@tanstack/react-query";
import type { AuditSectionProps } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Target,
  Calendar,
  Users,
  TrendingUp,
  Shield
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { getStatusColor, getStatusText, getTypeText } from "@/utils/audit-helpers";
import type { AuditTest, AuditFinding, AuditRisk, User } from "@shared/schema";

export function AuditDashboardSection({ audit }: AuditSectionProps) {
  const { data: auditTests = [], isLoading: testsLoading } = useQuery<AuditTest[]>({
    queryKey: ["/api/audits", audit.id, "tests"],
    staleTime: 60000,
  });

  const { data: auditMilestones = [], isLoading: milestonesLoading } = useQuery<any[]>({
    queryKey: ["/api/audits", audit.id, "milestones"],
    staleTime: 60000,
  });

  const { data: auditFindings = [], isLoading: findingsLoading } = useQuery<AuditFinding[]>({
    queryKey: ["/api/audits", audit.id, "findings"],
    staleTime: 60000,
  });

  const { data: auditRisks = [], isLoading: risksLoading } = useQuery<AuditRisk[]>({
    queryKey: ["/api/audits", audit.id, "ad-hoc-risks"],
    staleTime: 60000,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const getAuditorName = (auditorId: string | null | undefined) => {
    if (!auditorId) return "No asignado";
    const auditor = users.find((u: User) => u.id === auditorId);
    return auditor ? auditor.fullName : "No asignado";
  };

  const isLoading = testsLoading || milestonesLoading || findingsLoading || risksLoading;

  const calculateTestsProgress = () => {
    if (auditTests.length === 0) return { completed: 0, inProgress: 0, pending: 0, total: 0, percentage: 0 };
    
    const completed = auditTests.filter((t: AuditTest) => t.status === "completed").length;
    const inProgress = auditTests.filter((t: AuditTest) => 
      t.status === "in_progress" || t.status === "under_review"
    ).length;
    const pending = auditTests.filter((t: AuditTest) => 
      t.status === "planned" || t.status === "assigned"
    ).length;
    const percentage = Math.round((completed / auditTests.length) * 100);
    
    return { completed, inProgress, pending, total: auditTests.length, percentage };
  };

  const calculateMilestonesProgress = () => {
    if (auditMilestones.length === 0) return { completed: 0, pending: 0, overdue: 0, total: 0 };
    
    const completed = auditMilestones.filter((m: any) => m.status === "completed").length;
    const now = new Date();
    const overdue = auditMilestones.filter((m: any) => {
      if (m.status === "completed") return false;
      if (!m.plannedDate) return false;
      return new Date(m.plannedDate) < now;
    }).length;
    const pending = auditMilestones.length - completed;
    
    return { completed, pending, overdue, total: auditMilestones.length };
  };

  const calculateFindingsStats = () => {
    if (auditFindings.length === 0) return { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
    
    return {
      total: auditFindings.length,
      critical: auditFindings.filter((f: AuditFinding) => f.severity === "critical").length,
      high: auditFindings.filter((f: AuditFinding) => f.severity === "high").length,
      medium: auditFindings.filter((f: AuditFinding) => f.severity === "medium").length,
      low: auditFindings.filter((f: AuditFinding) => f.severity === "low").length,
    };
  };

  const calculateProjectProgress = () => {
    if (!audit.plannedStartDate || !audit.plannedEndDate) return { percentage: 0, daysRemaining: 0, isOverdue: false };
    
    const start = new Date(audit.plannedStartDate);
    const end = new Date(audit.plannedEndDate);
    const now = new Date();
    
    const totalDays = differenceInDays(end, start);
    const daysPassed = differenceInDays(now, start);
    const daysRemaining = differenceInDays(end, now);
    const isOverdue = now > end;
    
    if (totalDays <= 0) {
      return { 
        percentage: isOverdue ? 100 : 0, 
        daysRemaining: Math.max(daysRemaining, 0), 
        isOverdue 
      };
    }
    
    const percentage = Math.min(Math.max(Math.round((daysPassed / totalDays) * 100), 0), 100);
    
    return { percentage, daysRemaining, isOverdue };
  };

  const testsProgress = calculateTestsProgress();
  const milestonesProgress = calculateMilestonesProgress();
  const findingsStats = calculateFindingsStats();
  const projectProgress = calculateProjectProgress();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="audit-dashboard">
      <Card data-testid="card-project-overview">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Vista General del Proyecto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Tipo de Auditoría</p>
              <p className="font-medium" data-testid="text-audit-type">{getTypeText(audit.type)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Estado</p>
              <Badge className={getStatusColor(audit.status)} data-testid="badge-audit-status">
                {getStatusText(audit.status)}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Auditor Líder</p>
              <p className="font-medium flex items-center gap-2" data-testid="text-lead-auditor">
                <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{getAuditorName(audit.leadAuditor)}</span>
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Prioridad</p>
              <Badge variant={audit.priority === "high" ? "destructive" : audit.priority === "medium" ? "default" : "secondary"} data-testid="badge-audit-priority">
                {audit.priority === "high" ? "Alta" : audit.priority === "medium" ? "Media" : "Baja"}
              </Badge>
            </div>
          </div>

          {audit.plannedStartDate && audit.plannedEndDate && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progreso del Proyecto</span>
                <span className="font-medium" data-testid="text-project-progress">{projectProgress.percentage}%</span>
              </div>
              <Progress value={projectProgress.percentage} className="h-2" data-testid="progress-project" />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 flex-shrink-0" />
                  <span>Inicio: {format(new Date(audit.plannedStartDate), "dd MMM yyyy", { locale: es })}</span>
                </span>
                <span className="font-medium text-center">
                  {projectProgress.isOverdue ? (
                    <span className="text-destructive font-medium">
                      Vencido hace {Math.abs(projectProgress.daysRemaining)} días
                    </span>
                  ) : (
                    <span>
                      {projectProgress.daysRemaining} días restantes
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-1 sm:justify-end">
                  <Calendar className="h-3 w-3 flex-shrink-0" />
                  <span>Fin: {format(new Date(audit.plannedEndDate), "dd MMM yyyy", { locale: es })}</span>
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card data-testid="card-tests-progress">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pruebas de Auditoría</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-tests-total">{testsProgress.total}</div>
            <div className="space-y-1 mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Completadas</span>
                <span className="font-medium text-green-600" data-testid="text-tests-completed">{testsProgress.completed}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">En Progreso</span>
                <span className="font-medium text-blue-600" data-testid="text-tests-inprogress">{testsProgress.inProgress}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Pendientes</span>
                <span className="font-medium text-gray-600" data-testid="text-tests-pending">{testsProgress.pending}</span>
              </div>
            </div>
            {testsProgress.total > 0 && (
              <div className="mt-3">
                <Progress value={testsProgress.percentage} className="h-1" data-testid="progress-tests" />
                <p className="text-xs text-muted-foreground mt-1">{testsProgress.percentage}% completado</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-milestones-progress">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hitos</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-milestones-total">{milestonesProgress.total}</div>
            <div className="space-y-1 mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Completados</span>
                <span className="font-medium text-green-600" data-testid="text-milestones-completed">{milestonesProgress.completed}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Pendientes</span>
                <span className="font-medium text-blue-600" data-testid="text-milestones-pending">{milestonesProgress.pending}</span>
              </div>
              {milestonesProgress.overdue > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Vencidos</span>
                  <span className="font-medium text-destructive" data-testid="text-milestones-overdue">{milestonesProgress.overdue}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-findings-stats">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hallazgos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-findings-total">{findingsStats.total}</div>
            <div className="space-y-1 mt-2">
              {findingsStats.critical > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Críticos</span>
                  <span className="font-medium text-red-600" data-testid="text-findings-critical">{findingsStats.critical}</span>
                </div>
              )}
              {findingsStats.high > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Altos</span>
                  <span className="font-medium text-orange-600" data-testid="text-findings-high">{findingsStats.high}</span>
                </div>
              )}
              {findingsStats.medium > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Medios</span>
                  <span className="font-medium text-yellow-600" data-testid="text-findings-medium">{findingsStats.medium}</span>
                </div>
              )}
              {findingsStats.low > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Bajos</span>
                  <span className="font-medium text-blue-600" data-testid="text-findings-low">{findingsStats.low}</span>
                </div>
              )}
              {findingsStats.total === 0 && (
                <p className="text-xs text-muted-foreground">Sin hallazgos registrados</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-adhoc-risks">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Riesgos Ad-hoc</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-adhoc-risks-total">{auditRisks.length}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Riesgos identificados durante la auditoría
            </p>
            {auditRisks.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center gap-2 text-xs">
                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {auditRisks.filter((r: AuditRisk) => r.status === "identified" || r.status === "assessed").length} activos
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {audit.objectives && Array.isArray(audit.objectives) && audit.objectives.length > 0 && (
        <Card data-testid="card-objectives-summary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span>Objetivos de Auditoría</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {(audit.objectives as string[]).map((objective, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="flex-1">{objective}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {testsProgress.total === 0 && milestonesProgress.total === 0 && findingsStats.total === 0 && (
        <Card data-testid="card-empty-state">
          <CardContent className="py-8">
            <div className="text-center space-y-2">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="font-medium">Proyecto en Etapa Inicial</h3>
              <p className="text-sm text-muted-foreground">
                Esta auditoría aún no tiene pruebas, hitos o hallazgos registrados.
                Comienza agregando elementos en las secciones correspondientes.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
