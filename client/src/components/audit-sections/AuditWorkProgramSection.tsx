import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { AuditSectionProps } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  ClipboardCheck, 
  Shield, 
  Target,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  Plus,
  Pencil,
  Trash2,
  X,
  Info,
  XCircle,
  Sparkles
} from "lucide-react";
import type { WorkProgramItem, User } from "@shared/schema";
import { usePermissions } from "@/hooks/usePermissions";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AITestSuggestionDialog } from "./AITestSuggestionDialog";
import { TestFormModal } from "./TestFormModal";

export function AuditWorkProgramSection({ audit, onUpdate }: AuditSectionProps) {
  const [viewingRisk, setViewingRisk] = useState<any>(null);
  const [viewingControl, setViewingControl] = useState<any>(null);
  const [viewingTest, setViewingTest] = useState<any>(null);
  const [testFormModal, setTestFormModal] = useState<{
    open: boolean;
    mode: "create" | "edit";
    testData?: any;
    riskId?: string;
    auditRiskId?: string;
    riskCode?: string;
    controlId?: string;
    controlCode?: string;
    riskType?: 'official' | 'adhoc';
  }>({ open: false, mode: "create" });
  const [aiSuggestionDialog, setAiSuggestionDialog] = useState<{ open: boolean; riskId?: string; controlId?: string; riskCode?: string; controlCode?: string }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; testId?: string; testName?: string }>({ open: false });
  const { hasPermission } = usePermissions();
  const { toast } = useToast();

  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: workProgramData = [], isLoading } = useQuery<WorkProgramItem[]>({
    queryKey: ["/api/audits", audit.id, "work-program"],
  });

  const approveProgramMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' | 'reopen' }) => {
      const response = await fetch(`/api/audits/${id}/approve-program`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) throw new Error('Failed to update program');
      return response.json();
    },
    onSuccess: (updatedAudit, variables) => {
      if (updatedAudit) {
        onUpdate(updatedAudit);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/audits", audit.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
      const messages = {
        approve: "Programa de trabajo aprobado exitosamente",
        reject: "Programa de trabajo rechazado",
        reopen: "Programa de trabajo reabierto para edición"
      };
      toast({ title: messages[variables.action] });
    },
    onError: () => {
      toast({ 
        title: "Error al actualizar el programa", 
        variant: "destructive" 
      });
    },
  });

  // Mutation for deleting tests
  const deleteTestMutation = useMutation({
    mutationFn: async (testId: string) => {
      const response = await fetch(`/api/audit-tests/${testId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete test');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits", audit.id, "work-program"] });
      queryClient.invalidateQueries({ queryKey: ["/api/audits", audit.id, "tests"] });
      setDeleteDialog({ open: false });
      toast({ title: "Prueba eliminada exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al eliminar la prueba", variant: "destructive" });
    },
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-green-100 text-green-800",
      in_progress: "bg-blue-100 text-blue-800",
      under_review: "bg-purple-100 text-purple-800",
      pending: "bg-gray-100 text-gray-800",
      assigned: "bg-yellow-100 text-yellow-800",
      rejected: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-600",
      proposed: "bg-purple-100 text-purple-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      completed: "Completada",
      in_progress: "En Progreso",
      under_review: "En Revisión",
      pending: "Pendiente",
      assigned: "Asignada",
      rejected: "Rechazada",
      cancelled: "Cancelada",
      proposed: "Propuesta",
    };
    return texts[status] || status;
  };

  const getRiskLevel = (inherentRisk: number | null) => {
    if (!inherentRisk) return { label: "Sin evaluar", color: "bg-gray-100 text-gray-800" };
    if (inherentRisk >= 15) return { label: "Crítico", color: "bg-red-100 text-red-800" };
    if (inherentRisk >= 10) return { label: "Alto", color: "bg-orange-100 text-orange-800" };
    if (inherentRisk >= 5) return { label: "Medio", color: "bg-yellow-100 text-yellow-800" };
    return { label: "Bajo", color: "bg-green-100 text-green-800" };
  };

  const getResidualRiskLevel = (residualRisk: number) => {
    if (residualRisk >= 15) return { label: "Crítico", color: "bg-red-100 text-red-800" };
    if (residualRisk >= 10) return { label: "Alto", color: "bg-orange-100 text-orange-800" };
    if (residualRisk >= 5) return { label: "Medio", color: "bg-yellow-100 text-yellow-800" };
    return { label: "Bajo", color: "bg-green-100 text-green-800" };
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (workProgramData.length === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Programa de Trabajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium mb-2">No hay programa de trabajo definido</h3>
              <p className="text-sm text-muted-foreground">
                Define el alcance de la auditoría para generar el programa de trabajo con riesgos, controles y pruebas.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalTests = workProgramData.reduce((sum, item) => sum + item.coverage.total, 0);
  const completedTests = workProgramData.reduce((sum, item) => sum + item.coverage.completed, 0);
  const inProgressTests = workProgramData.reduce((sum, item) => sum + item.coverage.inProgress, 0);
  const pendingTests = workProgramData.reduce((sum, item) => sum + item.coverage.pending, 0);
  const overallProgress = totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0;

  return (
    <div className="space-y-6" data-testid="audit-work-program">
      {/* Sección de Aprobación del Programa de Trabajo */}
      {audit.programApprovalStatus === 'approved' ? (
        <div className="bg-green-50 dark:bg-green-950 border-2 border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-green-900 dark:text-green-100">Programa de Trabajo Aprobado</h4>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  El programa de trabajo ha sido aprobado y está listo para ejecución.
                </p>
              </div>
            </div>
            {hasPermission('edit_all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => approveProgramMutation.mutate({ id: audit.id, action: 'reopen' })}
                disabled={approveProgramMutation.isPending}
                data-testid="button-reopen-program"
              >
                Reabrir Programa
              </Button>
            )}
          </div>
        </div>
      ) : audit.programApprovalStatus === 'rejected' ? (
        <div className="bg-red-50 dark:bg-red-950 border-2 border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <XCircle className="h-6 w-6 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-900 dark:text-red-100">Programa de Trabajo Rechazado</h4>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  El programa de trabajo ha sido rechazado y requiere revisión.
                </p>
              </div>
            </div>
            {hasPermission('edit_all') && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => approveProgramMutation.mutate({ id: audit.id, action: 'reopen' })}
                  disabled={approveProgramMutation.isPending}
                  data-testid="button-reopen-program"
                >
                  Reabrir Programa
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : hasPermission('edit_all') && audit.programApprovalStatus !== 'approved' ? (
        <div className="bg-amber-50 dark:bg-amber-950 border-2 border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Info className="h-6 w-6 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-900 dark:text-amber-100">Programa de Trabajo Pendiente de Aprobación</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  El programa de trabajo está pendiente de aprobación por el Director de Auditoría Interna.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => approveProgramMutation.mutate({ id: audit.id, action: 'reject' })}
                disabled={approveProgramMutation.isPending}
                data-testid="button-reject-program"
                className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950"
              >
                Rechazar
              </Button>
              <Button
                size="sm"
                onClick={() => approveProgramMutation.mutate({ id: audit.id, action: 'approve' })}
                disabled={approveProgramMutation.isPending}
                data-testid="button-approve-program"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Aprobar Programa
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Diálogo de detalle de Riesgo */}
      <Dialog open={!!viewingRisk} onOpenChange={(open) => !open && setViewingRisk(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Detalle del Riesgo
            </DialogTitle>
          </DialogHeader>
          {viewingRisk && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Código</Label>
                  <p className="font-mono font-medium">{viewingRisk.code}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <p><Badge variant="secondary">{viewingRisk.riskType === 'official' ? 'Oficial' : 'Ad-hoc'}</Badge></p>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Nombre</Label>
                <p className="font-medium">{viewingRisk.name}</p>
              </div>
              {viewingRisk.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Descripción</Label>
                  <p className="text-sm">{viewingRisk.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Probabilidad</Label>
                  <p>{viewingRisk.probability}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Impacto</Label>
                  <p>{viewingRisk.impact}</p>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Riesgo Inherente</Label>
                <p><Badge className={getRiskLevel(viewingRisk.inherentRisk).color}>{viewingRisk.inherentRisk} - {getRiskLevel(viewingRisk.inherentRisk).label}</Badge></p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de detalle de Control */}
      <Dialog open={!!viewingControl} onOpenChange={(open) => !open && setViewingControl(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Detalle del Control
            </DialogTitle>
          </DialogHeader>
          {viewingControl && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Código</Label>
                  <p className="font-mono font-medium">{viewingControl.code}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <p><Badge variant="secondary">
                    {viewingControl.type === 'preventive' ? 'Preventivo' : 
                     viewingControl.type === 'detective' ? 'Detectivo' : 'Correctivo'}
                  </Badge></p>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Nombre</Label>
                <p className="font-medium">{viewingControl.name}</p>
              </div>
              {viewingControl.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Descripción</Label>
                  <p className="text-sm">{viewingControl.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Frecuencia</Label>
                  <p className="capitalize">{viewingControl.frequency || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Riesgo Residual</Label>
                  <div><Badge className={getResidualRiskLevel(viewingControl.residualRisk).color}>
                    {viewingControl.residualRisk} - {getResidualRiskLevel(viewingControl.residualRisk).label}
                  </Badge></div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de detalle de Prueba */}
      <Dialog open={!!viewingTest} onOpenChange={(open) => !open && setViewingTest(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Detalle de la Prueba de Auditoría
            </DialogTitle>
          </DialogHeader>
          {viewingTest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Código</Label>
                  <p className="font-mono font-medium">{viewingTest.code || 'Sin código'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Estado</Label>
                  <div><Badge className={getStatusColor(viewingTest.status)}>{getStatusText(viewingTest.status)}</Badge></div>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Nombre</Label>
                <p className="font-medium">{viewingTest.name}</p>
              </div>
              {viewingTest.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Descripción</Label>
                  <p className="text-sm">{viewingTest.description}</p>
                </div>
              )}
              {viewingTest.objective && (
                <div>
                  <Label className="text-xs text-muted-foreground">Objetivo</Label>
                  <p className="text-sm">{viewingTest.objective}</p>
                </div>
              )}
              {viewingTest.testProcedures && (
                <div>
                  <Label className="text-xs text-muted-foreground">Procedimientos</Label>
                  <p className="text-sm">{viewingTest.testProcedures}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                {viewingTest.priority && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Prioridad</Label>
                    <p><Badge variant="secondary">{viewingTest.priority === 'high' ? 'Alta' : viewingTest.priority === 'medium' ? 'Media' : 'Baja'}</Badge></p>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground">Progreso</Label>
                  <div className="flex items-center gap-2">
                    <Progress value={viewingTest.progress || 0} className="h-2 flex-1" />
                    <span className="text-sm font-medium">{viewingTest.progress || 0}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de formulario para crear/editar pruebas */}
      <TestFormModal
        open={testFormModal.open}
        onOpenChange={(open) => {
          if (!open) {
            setTestFormModal({ open: false, mode: "create" });
          }
        }}
        mode={testFormModal.mode}
        testData={testFormModal.testData}
        auditId={audit.id}
        riskId={testFormModal.riskId}
        auditRiskId={testFormModal.auditRiskId}
        riskCode={testFormModal.riskCode}
        controlId={testFormModal.controlId}
        controlCode={testFormModal.controlCode}
      />

      <Card data-testid="card-program-summary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Resumen del Programa de Trabajo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total de Riesgos</p>
              <p className="text-2xl font-bold" data-testid="text-total-risks">{workProgramData.length}</p>
              <p className="text-xs text-muted-foreground">
                {workProgramData.filter(i => i.riskType === 'official').length} oficiales, 
                {workProgramData.filter(i => i.riskType === 'adhoc').length} ad-hoc
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total de Pruebas</p>
              <p className="text-2xl font-bold" data-testid="text-total-tests">{totalTests}</p>
              <div className="flex gap-2 text-xs">
                <span className="text-green-600">{completedTests} ✓</span>
                <span className="text-blue-600">{inProgressTests} →</span>
                <span className="text-gray-600">{pendingTests} ○</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Progreso General</p>
              <p className="text-2xl font-bold" data-testid="text-overall-progress">{overallProgress}%</p>
              <Progress value={overallProgress} className="h-2" data-testid="progress-overall" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Controles Evaluados</p>
              <p className="text-2xl font-bold" data-testid="text-total-controls">
                {workProgramData.reduce((sum, item) => sum + item.controls.length, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Vinculados a riesgos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Riesgos y Controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Riesgos del Programa de Trabajo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Código</TableHead>
                  <TableHead className="w-[250px]">Riesgo</TableHead>
                  <TableHead className="w-[100px] text-center">Tipo</TableHead>
                  <TableHead className="w-[120px] text-center">Nivel</TableHead>
                  <TableHead>Controles</TableHead>
                  <TableHead className="w-[80px] text-center">Pruebas</TableHead>
                  <TableHead className="w-[140px]">Progreso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {workProgramData.map((item) => {
                const risk = item.risk;
                const riskLevel = getRiskLevel(risk.inherentRisk);
                const progressPercent = item.coverage.total > 0 
                  ? Math.round((item.coverage.completed / item.coverage.total) * 100) 
                  : 0;

                return (
                  <TableRow key={risk.id} data-testid={`row-risk-${risk.id}`} className="hover:bg-muted/50">
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className="text-xs font-mono cursor-pointer hover:bg-accent"
                        onClick={() => setViewingRisk({ ...risk, riskType: item.riskType })}
                      >
                        {risk.code}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-sm">{risk.name}</div>
                        {risk.description && (
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {risk.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-xs">
                        {item.riskType === 'official' ? 'Oficial' : 'Ad-hoc'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Badge className={riskLevel.color + ' text-xs'}>
                          {risk.inherentRisk}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{riskLevel.label}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.controls.length > 0 ? (
                        <div className="space-y-2">
                          {item.controls.map((control) => {
                            const residualLevel = getResidualRiskLevel(control.residualRisk);
                            return (
                              <div key={control.id} className="flex items-start gap-2 p-2 bg-accent/30 rounded text-xs">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1 mb-1">
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs font-mono cursor-pointer hover:bg-accent"
                                      onClick={() => setViewingControl(control)}
                                    >
                                      {control.code}
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs">
                                      {control.type === 'preventive' ? 'P' : 
                                       control.type === 'detective' ? 'D' : 'C'}
                                    </Badge>
                                  </div>
                                  <div className="font-medium truncate">{control.name}</div>
                                </div>
                                <Badge className={residualLevel.color + ' text-xs whitespace-nowrap'}>
                                  {control.residualRisk}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin controles</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        {item.tests.length > 0 && item.tests.map((test) => {
                          const isProposed = (test as any).isProposed || test.status === 'proposed';
                          return (
                            <div 
                              key={test.id} 
                              className={`flex items-start gap-2 p-2 rounded text-xs ${
                                isProposed 
                                  ? 'bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800' 
                                  : 'bg-blue-50 dark:bg-blue-950/30'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 mb-1 flex-wrap">
                                  {test.code && (
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs font-mono cursor-pointer hover:bg-accent"
                                      onClick={() => setViewingTest(test)}
                                    >
                                      {test.code}
                                    </Badge>
                                  )}
                                  {isProposed && (
                                    <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-xs">
                                      Propuesta
                                    </Badge>
                                  )}
                                  {!isProposed && (
                                    <Badge className={getStatusColor(test.status) + ' text-xs'}>
                                      {getStatusText(test.status)}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <div className="font-medium truncate">{test.name}</div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2"
                                      onClick={() => setTestFormModal({
                                        open: true,
                                        mode: "edit",
                                        testData: test,
                                        riskId: risk.id,
                                        riskCode: risk.code,
                                      })}
                                      disabled={!hasPermission('manage_audits')}
                                      title="Editar prueba"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                      onClick={() => setDeleteDialog({
                                        open: true,
                                        testId: test.id,
                                        testName: test.name,
                                      })}
                                      disabled={!hasPermission('manage_audits')}
                                      title="Eliminar prueba"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                {!isProposed && test.progress > 0 && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <Progress value={test.progress} className="h-1 flex-1" />
                                    <span className="text-xs">{test.progress}%</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-8 text-xs"
                            onClick={() => setTestFormModal({ 
                              open: true,
                              mode: "create",
                              riskId: item.riskType === 'official' ? risk.id : undefined,
                              auditRiskId: item.riskType === 'adhoc' ? risk.id : undefined,
                              riskCode: risk.code,
                              riskType: item.riskType,
                            } as any)}
                            data-testid={`button-create-test-${risk.id}`}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Nueva Prueba
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => setAiSuggestionDialog({ 
                              open: true, 
                              riskId: item.riskType === 'official' ? risk.id : undefined,
                              auditRiskId: item.riskType === 'adhoc' ? risk.id : undefined,
                              riskCode: risk.code
                            } as any)}
                            title="Sugerir pruebas con IA"
                            data-testid={`button-ai-suggest-${risk.id}`}
                          >
                            <Sparkles className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={progressPercent} className="h-2 flex-1" />
                        <span className="text-xs font-medium">{progressPercent}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de sugerencias de IA */}
      <AITestSuggestionDialog
        open={aiSuggestionDialog.open}
        onOpenChange={(open) => setAiSuggestionDialog({ ...aiSuggestionDialog, open })}
        auditId={audit.id}
        riskId={aiSuggestionDialog.riskId}
        controlId={aiSuggestionDialog.controlId}
        riskCode={aiSuggestionDialog.riskCode}
        controlCode={aiSuggestionDialog.controlCode}
        onTestsCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/audits", audit.id, "work-program"] });
        }}
      />

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la prueba:
              <div className="mt-2 font-medium text-foreground">
                {deleteDialog.testName}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteDialog.testId) {
                  deleteTestMutation.mutate(deleteDialog.testId);
                }
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
