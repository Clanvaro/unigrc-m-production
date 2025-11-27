import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { AuditSectionProps } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Target, 
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  User,
  Calendar,
  FileText,
  ChevronDown,
  ChevronRight,
  Shield,
  Paperclip,
  MessageSquare,
  Pencil,
  Trash2
} from "lucide-react";
import type { AuditTestWithDetails } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function AuditEvidenceSection({ audit }: AuditSectionProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [testToDelete, setTestToDelete] = useState<string | null>(null);

  const { data: tests = [], isLoading } = useQuery<AuditTestWithDetails[]>({
    queryKey: ["/api/audits", audit.id, "tests/details"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (testId: string) => {
      await apiRequest(`/api/audit-tests/${testId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits", audit.id, "tests/details"] });
      toast({
        title: "Prueba eliminada",
        description: "La prueba de auditoría ha sido eliminada correctamente",
      });
      setTestToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la prueba de auditoría",
        variant: "destructive",
      });
    },
  });

  const toggleTestExpansion = (testId: string) => {
    setExpandedTests(prev => {
      const next = new Set(prev);
      if (next.has(testId)) {
        next.delete(testId);
      } else {
        next.add(testId);
      }
      return next;
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-green-100 text-green-800",
      in_progress: "bg-blue-100 text-blue-800",
      under_review: "bg-purple-100 text-purple-800",
      pending: "bg-gray-100 text-gray-800",
      assigned: "bg-yellow-100 text-yellow-800",
      rejected: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-600",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      completed: "Completada",
      in_progress: "En Progreso",
      under_review: "En Revisión",
      planned: "Planificada",
      assigned: "Asignada",
      rejected: "Rechazada",
      cancelled: "Cancelada",
    };
    return texts[status] || status;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: "text-red-600 border-red-600",
      medium: "text-yellow-600 border-yellow-600",
      low: "text-gray-600 border-gray-600",
    };
    return colors[priority] || "text-gray-600 border-gray-600";
  };

  const getPriorityText = (priority: string) => {
    const texts: Record<string, string> = {
      high: "Alta",
      medium: "Media",
      low: "Baja",
    };
    return texts[priority] || priority;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "No definida";
    return new Date(date).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredTests = tests.filter(test => {
    const matchesSearch = test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (test.code && test.code.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || test.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: tests.length,
    completed: tests.filter(t => t.status === "completed").length,
    in_progress: tests.filter(t => t.status === "in_progress").length,
    under_review: tests.filter(t => t.status === "under_review").length,
    planned: tests.filter(t => t.status === "planned" || t.status === "assigned").length,
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (tests.length === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Pruebas de Auditoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium mb-2">No hay pruebas de auditoría definidas</h3>
              <p className="text-sm text-muted-foreground">
                Define pruebas en el programa de trabajo para comenzar la ejecución de la auditoría.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="audit-evidence">
      <Card data-testid="card-evidence-summary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Pruebas de Auditoría
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <button
              onClick={() => setStatusFilter("all")}
              className={`p-3 rounded-lg border-2 transition-colors ${
                statusFilter === "all" 
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" 
                  : "border-gray-200 hover:border-gray-300"
              }`}
              data-testid="filter-all"
            >
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{statusCounts.all}</p>
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`p-3 rounded-lg border-2 transition-colors ${
                statusFilter === "completed" 
                  ? "border-green-500 bg-green-50 dark:bg-green-950/20" 
                  : "border-gray-200 hover:border-gray-300"
              }`}
              data-testid="filter-completed"
            >
              <p className="text-sm text-muted-foreground">Completadas</p>
              <p className="text-2xl font-bold text-green-600">{statusCounts.completed}</p>
            </button>
            <button
              onClick={() => setStatusFilter("in_progress")}
              className={`p-3 rounded-lg border-2 transition-colors ${
                statusFilter === "in_progress" 
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" 
                  : "border-gray-200 hover:border-gray-300"
              }`}
              data-testid="filter-in-progress"
            >
              <p className="text-sm text-muted-foreground">En Progreso</p>
              <p className="text-2xl font-bold text-blue-600">{statusCounts.in_progress}</p>
            </button>
            <button
              onClick={() => setStatusFilter("under_review")}
              className={`p-3 rounded-lg border-2 transition-colors ${
                statusFilter === "under_review" 
                  ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20" 
                  : "border-gray-200 hover:border-gray-300"
              }`}
              data-testid="filter-under-review"
            >
              <p className="text-sm text-muted-foreground">En Revisión</p>
              <p className="text-2xl font-bold text-purple-600">{statusCounts.under_review}</p>
            </button>
            <button
              onClick={() => setStatusFilter("planned")}
              className={`p-3 rounded-lg border-2 transition-colors ${
                statusFilter === "planned" 
                  ? "border-gray-500 bg-gray-50 dark:bg-gray-950/20" 
                  : "border-gray-200 hover:border-gray-300"
              }`}
              data-testid="filter-planned"
            >
              <p className="text-sm text-muted-foreground">Planificadas</p>
              <p className="text-2xl font-bold text-gray-600">{statusCounts.planned}</p>
            </button>
          </div>

          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código o nombre de prueba..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filteredTests.length === 0 ? (
            <div className="py-8 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium mb-2">No se encontraron pruebas</h3>
              <p className="text-sm text-muted-foreground">
                Intenta con otros términos de búsqueda o filtros
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Progreso</TableHead>
                    <TableHead>Ejecutor</TableHead>
                    <TableHead>Fechas</TableHead>
                    <TableHead className="text-right w-[120px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTests.map((test) => (
                    <TableRow key={test.id} data-testid={`row-test-${test.id}`}>
                      <TableCell className="font-mono text-xs">
                        {test.code || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-sm" data-testid={`text-test-name-${test.id}`}>
                            {test.name}
                          </p>
                          {test.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {test.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(test.status)}>
                          {getStatusText(test.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {test.priority ? (
                          <Badge variant="outline" className={getPriorityColor(test.priority)}>
                            {getPriorityText(test.priority)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {test.progress > 0 ? (
                          <div className="w-24">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-medium">{test.progress}%</span>
                            </div>
                            <Progress value={test.progress} className="h-1.5" />
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">0%</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {test.assignedToUser ? (
                            <>
                              <p className="font-medium">{test.assignedToUser.fullName}</p>
                              {test.assignedToUser.email && (
                                <p className="text-xs text-muted-foreground">{test.assignedToUser.email}</p>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">No asignado</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1">
                          <p><span className="text-muted-foreground">Inicio:</span> {formatDate(test.plannedStartDate)}</p>
                          <p><span className="text-muted-foreground">Fin:</span> {formatDate(test.plannedEndDate)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/audit-test/${test.id}`)}
                            data-testid={`button-edit-${test.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTestToDelete(test.id)}
                            data-testid={`button-delete-${test.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!testToDelete} onOpenChange={() => setTestToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar prueba de auditoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La prueba de auditoría será eliminada permanentemente
              del sistema, incluyendo todos sus resultados y evidencias asociadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => testToDelete && deleteMutation.mutate(testToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
