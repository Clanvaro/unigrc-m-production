import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AuditSectionProps } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { 
  TrendingUp,
  Calendar,
  User,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  ChevronDown,
  ChevronRight,
  Target,
  FileCheck
} from "lucide-react";
import type { AuditFinding, Action } from "@shared/schema";

type FindingWithActions = AuditFinding & {
  actions: Action[];
  actionProgress: number;
};

export function AuditFollowUpSection({ audit }: AuditSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());

  const { data: findings = [], isLoading: loadingFindings } = useQuery<AuditFinding[]>({
    queryKey: ["/api/audit-findings", { auditId: audit.id }],
  });

  const { data: allActions = [], isLoading: loadingActions } = useQuery<Action[]>({
    queryKey: ["/api/actions", { origin: "audit" }],
  });

  const toggleFindingExpansion = (findingId: string) => {
    setExpandedFindings(prev => {
      const next = new Set(prev);
      if (next.has(findingId)) {
        next.delete(findingId);
      } else {
        next.add(findingId);
      }
      return next;
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-red-100 text-red-800",
      in_progress: "bg-yellow-100 text-yellow-800",
      implemented: "bg-green-100 text-green-800",
      overdue: "bg-red-600 text-white",
      closed: "bg-gray-400 text-white",
      pending: "bg-blue-100 text-blue-800",
      completed: "bg-green-600 text-white",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      open: "Abierto",
      in_progress: "En Progreso",
      implemented: "Implementado",
      overdue: "Vencido",
      closed: "Cerrado",
      pending: "Pendiente",
      completed: "Completado",
    };
    return texts[status] || status;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "Sin fecha";
    return new Date(date).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isOverdue = (dueDate: Date | string | null, status: string) => {
    if (!dueDate || status === "closed" || status === "completed" || status === "implemented") {
      return false;
    }
    return new Date(dueDate) < new Date();
  };

  const findingsWithActions: FindingWithActions[] = findings.map(finding => {
    const findingActions = allActions.filter(action => action.auditFindingId === finding.id);
    const totalProgress = findingActions.length > 0
      ? findingActions.reduce((sum, action) => sum + action.progress, 0) / findingActions.length
      : 0;

    return {
      ...finding,
      actions: findingActions,
      actionProgress: Math.round(totalProgress),
    };
  });

  const filteredFindings = findingsWithActions.filter(finding => {
    const matchesSearch = finding.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         finding.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || finding.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: findings.length,
    open: findings.filter(f => f.status === "open").length,
    in_progress: findings.filter(f => f.status === "in_progress").length,
    implemented: findings.filter(f => f.status === "implemented").length,
    overdue: findings.filter(f => isOverdue(f.dueDate, f.status)).length,
    closed: findings.filter(f => f.status === "closed").length,
  };

  const totalActions = allActions.filter(a => findings.some(f => f.id === a.auditFindingId)).length;
  const completedActions = allActions.filter(a => 
    findings.some(f => f.id === a.auditFindingId) && (a.status === "completed" || a.progress === 100)
  ).length;
  const overallProgress = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

  if (loadingFindings || loadingActions) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (findings.length === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Seguimiento de Hallazgos y Compromisos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h3 className="font-medium mb-2">No hay hallazgos para dar seguimiento</h3>
              <p className="text-sm text-muted-foreground">
                La auditoría no identificó hallazgos que requieran seguimiento.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="audit-follow-up">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Seguimiento de Hallazgos y Compromisos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-accent/50 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Hallazgos</p>
                  <p className="text-3xl font-bold">{findings.length}</p>
                </div>
                <FileCheck className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <div className="p-4 bg-accent/50 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Acciones</p>
                  <p className="text-3xl font-bold">{totalActions}</p>
                </div>
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
            <div className="p-4 bg-accent/50 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completadas</p>
                  <p className="text-3xl font-bold text-green-600">{completedActions}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="p-4 bg-accent/50 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Vencidas</p>
                  <p className="text-3xl font-bold text-red-600">{statusCounts.overdue}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Progreso General de Implementación</p>
                <p className="text-lg font-bold">{overallProgress}%</p>
              </div>
              <Progress value={overallProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {completedActions} de {totalActions} acciones completadas
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`p-2 rounded-lg border-2 transition-colors ${
                statusFilter === "all"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              data-testid="filter-all"
            >
              <p className="text-xs text-muted-foreground">Todos</p>
              <p className="text-xl font-bold">{statusCounts.all}</p>
            </button>
            <button
              onClick={() => setStatusFilter("open")}
              className={`p-2 rounded-lg border-2 transition-colors ${
                statusFilter === "open"
                  ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              data-testid="filter-open"
            >
              <p className="text-xs text-muted-foreground">Abiertos</p>
              <p className="text-xl font-bold text-red-600">{statusCounts.open}</p>
            </button>
            <button
              onClick={() => setStatusFilter("in_progress")}
              className={`p-2 rounded-lg border-2 transition-colors ${
                statusFilter === "in_progress"
                  ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              data-testid="filter-in-progress"
            >
              <p className="text-xs text-muted-foreground">En Progreso</p>
              <p className="text-xl font-bold text-yellow-600">{statusCounts.in_progress}</p>
            </button>
            <button
              onClick={() => setStatusFilter("implemented")}
              className={`p-2 rounded-lg border-2 transition-colors ${
                statusFilter === "implemented"
                  ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              data-testid="filter-implemented"
            >
              <p className="text-xs text-muted-foreground">Implementados</p>
              <p className="text-xl font-bold text-green-600">{statusCounts.implemented}</p>
            </button>
            <button
              onClick={() => setStatusFilter("closed")}
              className={`p-2 rounded-lg border-2 transition-colors ${
                statusFilter === "closed"
                  ? "border-gray-500 bg-gray-50 dark:bg-gray-950/20"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              data-testid="filter-closed"
            >
              <p className="text-xs text-muted-foreground">Cerrados</p>
              <p className="text-xl font-bold">{statusCounts.closed}</p>
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código o título..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {filteredFindings.map((finding) => {
          const isExpanded = expandedFindings.has(finding.id);
          const hasActions = finding.actions.length > 0;
          const overdueStatus = isOverdue(finding.dueDate, finding.status);

          return (
            <Card key={finding.id} data-testid={`card-finding-${finding.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => toggleFindingExpansion(finding.id)}
                        data-testid={`button-toggle-${finding.id}`}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      <Badge variant="outline" className="font-mono text-xs">
                        {finding.code}
                      </Badge>
                      <Badge className={getStatusColor(overdueStatus ? "overdue" : finding.status)}>
                        {overdueStatus ? "Vencido" : getStatusText(finding.status)}
                      </Badge>
                      {hasActions && (
                        <Badge variant="outline" className="text-xs">
                          {finding.actions.length} acción(es)
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-medium text-sm" data-testid={`text-finding-title-${finding.id}`}>
                      {finding.title}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {finding.responsiblePerson && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>Responsable ID: {finding.responsiblePerson}</span>
                        </div>
                      )}
                      {finding.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Vence: {formatDate(finding.dueDate)}</span>
                        </div>
                      )}
                    </div>
                    {hasActions && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Progreso de Acciones</span>
                          <span className="font-medium">{finding.actionProgress}%</span>
                        </div>
                        <Progress value={finding.actionProgress} className="h-1.5" />
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0 space-y-4">
                  {finding.agreedAction && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                      <h4 className="text-sm font-medium mb-2">Acción Acordada</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {finding.agreedAction}
                      </p>
                    </div>
                  )}

                  {finding.managementResponse && (
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-md border border-purple-200 dark:border-purple-800">
                      <h4 className="text-sm font-medium mb-2">Respuesta de la Gerencia</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {finding.managementResponse}
                      </p>
                    </div>
                  )}

                  {hasActions && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Acciones de Seguimiento</h4>
                      {finding.actions.map((action) => (
                        <div
                          key={action.id}
                          className="p-3 border rounded-lg space-y-2"
                          data-testid={`action-${action.id}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {action.code}
                                </Badge>
                                <Badge className={getStatusColor(action.status)}>
                                  {getStatusText(action.status)}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {action.priority}
                                </Badge>
                              </div>
                              <p className="font-medium text-sm">{action.title}</p>
                              {action.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {action.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Progreso</span>
                              <span className="font-medium">{action.progress}%</span>
                            </div>
                            <Progress value={action.progress} className="h-1.5" />
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {action.dueDate && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatDate(action.dueDate)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!hasActions && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-md border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                            Sin Acciones de Seguimiento
                          </p>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                            No se han definido acciones específicas para este hallazgo.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {filteredFindings.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium mb-2">No se encontraron hallazgos</h3>
            <p className="text-sm text-muted-foreground">
              Intenta con otros términos de búsqueda o filtros
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
