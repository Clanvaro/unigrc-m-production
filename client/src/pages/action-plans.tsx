import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Eye, Edit, CheckCircle, Calendar, User, Target, AlertCircle, Trash2, RefreshCw, Building, Mail, BarChart3, TrendingUp, Clock, FileCheck, ArrowUpDown, ArrowUp, ArrowDown, Filter, MoreVertical, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import ActionPlanForm from "@/components/forms/action-plan-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Action, Risk, ProcessOwner, User as UserType } from "@shared/schema";
import ExcelJS from 'exceljs';
import { AuditHistory } from "@/components/AuditHistory";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UploadEvidenceModal } from "@/components/action-plans/UploadEvidenceModal";
import { EvidenceGallery } from "@/components/action-plans/EvidenceGallery";
import { EvidenceReviewPanel } from "@/components/action-plans/EvidenceReviewPanel";

interface ReportButtonProps {
  title: string;
  description: string;
  icon: React.ElementType;
  endpoint: string;
  filename: string;
}

function ReportButton({ title, description, icon: Icon, endpoint, filename }: ReportButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(endpoint, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Reporte generado",
        description: "El reporte se ha descargado exitosamente.",
      });
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el reporte.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      className="h-auto flex-col items-start justify-start p-4 space-y-2 hover:bg-muted/50"
      onClick={handleDownload}
      disabled={isLoading}
      data-testid={`button-report-${filename}`}
    >
      <div className="flex items-center gap-2 w-full">
        <Icon className="h-5 w-5 text-primary" />
        <span className="font-semibold">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground text-left">{description}</p>
      {isLoading && (
        <div className="text-xs text-primary">Generando...</div>
      )}
    </Button>
  );
}

export default function ActionPlans() {
  const [initialRiskId, setInitialRiskId] = useState<string | undefined>(undefined);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingActionPlan, setEditingActionPlan] = useState<Action | null>(null);
  const [viewingActionPlan, setViewingActionPlan] = useState<Action | null>(null);
  const [deletingActionPlanId, setDeletingActionPlanId] = useState<string | null>(null);
  const [deletionReason, setDeletionReason] = useState("");
  
  // Reschedule states
  const [reschedulingActionPlan, setReschedulingActionPlan] = useState<Action | null>(null);
  const [newDueDate, setNewDueDate] = useState<Date | undefined>(undefined);
  const [rescheduleReason, setRescheduleReason] = useState("");
  
  // Email functionality states
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  
  // Validation filter
  const [validationFilter, setValidationFilter] = useState<string>("all");
  
  // Origin filter
  const [originFilter, setOriginFilter] = useState<"all" | "audit" | "risk" | "compliance">("all");
  
  // Risk filter (for filtering plans by associated risk)
  const [riskFilterId, setRiskFilterId] = useState<string | null>(null);
  
  // Evidence upload state
  const [isUploadEvidenceOpen, setIsUploadEvidenceOpen] = useState(false);
  
  // Mark as implemented state
  const [isMarkImplementedOpen, setIsMarkImplementedOpen] = useState(false);
  const [implementationComments, setImplementationComments] = useState("");
  
  // Tabs state
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Sorting state
  const [sortField, setSortField] = useState<"code" | "origin" | "gerencia" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query unificado para todos los planes de acción
  const { data: allActions = [], isLoading } = useQuery<Action[]>({
    queryKey: ["/api/action-plans"],
  });

  // Check URL params to auto-open create dialog with pre-selected risk or view plan detail
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const riskId = params.get('riskId');
    const mode = params.get('mode');
    const planId = params.get('id');
    
    if (mode === 'create' && riskId) {
      setInitialRiskId(riskId);
      setIsCreateDialogOpen(true);
      // Clean up URL
      window.history.replaceState({}, '', '/action-plans');
    } else if (planId) {
      // Wait for data to load before processing plan ID
      if (allActions.length > 0) {
        const plan = allActions.find((p: Action) => p.id === planId);
        if (plan) {
          setViewingActionPlan(plan);
          setActiveTab('list');
          // Clean up URL only after finding the plan
          window.history.replaceState({}, '', '/action-plans');
        }
      }
      // Don't clean up URL if data hasn't loaded yet - effect will run again
    } else if (riskId && !mode && !planId) {
      // If only riskId is provided (from aggregated badge), filter by risk
      setRiskFilterId(riskId);
      setActiveTab('list');
      // Clean up URL
      window.history.replaceState({}, '', '/action-plans');
    }
  }, [allActions]);

  const { data: risksResponse } = useQuery<{ data: Risk[], pagination: { limit: number, offset: number, total: number } }>({
    queryKey: ["/api/risks"],
  });
  const risks = risksResponse?.data || [];

  const { data: processOwners = [] } = useQuery<ProcessOwner[]>({
    queryKey: ["/api/process-owners"],
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const { data: reschedulingMetrics } = useQuery<{
    summary: {
      totalPlans: number;
      rescheduledCount: number;
      reschedulingRate: number;
      avgExtensionDays: number;
      recentChanges: number;
    };
    byStatus: {
      pending: number;
      in_progress: number;
      completed: number;
      overdue: number;
    };
  }>({
    queryKey: ["/api/action-plans/metrics/rescheduling"],
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, deletionReason }: { id: string; deletionReason: string }) => 
      apiRequest(`/api/action-plans/${id}`, "DELETE", { deletionReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/action-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trash"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Plan de acción eliminado", description: "El plan de acción ha sido eliminado exitosamente." });
      setDeletionReason("");
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo eliminar el plan de acción.", variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/action-plans/${id}`, "PUT", { 
      status: "completed", 
      progress: 100 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/action-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      toast({ title: "Plan completado", description: "El plan de acción ha sido marcado como completado." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo completar el plan de acción.", variant: "destructive" });
    },
  });

  const reopenMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/action-plans/${id}/reopen`, "POST", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/action-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      toast({ 
        title: "Plan reabierto", 
        description: "El plan de acción ha sido reabierto para corrección." 
      });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "No se pudo reabrir el plan de acción.", 
        variant: "destructive" 
      });
    },
  });

  const resendValidationMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/action-plans/${id}/resend-validation`, "POST", {}),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/action-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      toast({ 
        title: "Email de revalidación enviado", 
        description: `Se envió el email de revalidación a ${data.email}` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error?.message || "No se pudo enviar el email de revalidación.", 
        variant: "destructive" 
      });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: ({ planIds, subject, message }: { planIds: string[], subject: string, message: string }) => 
      apiRequest("/api/action-plans/send-email", "POST", { planIds, subject, message }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/action-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      toast({ 
        title: "Emails enviados exitosamente", 
        description: `Se enviaron ${data.sentCount} de ${data.totalPlans} emails correctamente.` 
      });
      // Clear selection and close dialog
      setSelectedPlans([]);
      setEmailSubject("");
      setEmailMessage("");
      setIsEmailDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error?.message || "No se pudieron enviar los emails.", 
        variant: "destructive" 
      });
    },
  });

  const markAsImplementedMutation = useMutation({
    mutationFn: ({ id, comments }: { id: string; comments?: string }) => 
      apiRequest(`/api/actions/${id}/mark-implemented`, "PATCH", { comments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/action-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ 
        title: "Acción marcada como implementada", 
        description: "La acción ha sido marcada como implementada exitosamente." 
      });
      setImplementationComments("");
      setIsMarkImplementedOpen(false);
      setViewingActionPlan(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error?.message || "No se pudo marcar la acción como implementada.", 
        variant: "destructive" 
      });
    },
  });

  const handleDelete = (id: string) => {
    setDeletingActionPlanId(id);
    setDeletionReason("");
  };

  const confirmDelete = () => {
    if (deletingActionPlanId) {
      if (!deletionReason.trim()) {
        toast({ 
          title: "Motivo requerido", 
          description: "Por favor ingrese el motivo de la eliminación.", 
          variant: "destructive" 
        });
        return;
      }
      deleteMutation.mutate({ id: deletingActionPlanId, deletionReason });
      setDeletingActionPlanId(null);
    }
  };

  const cancelDelete = () => {
    setDeletingActionPlanId(null);
    setDeletionReason("");
  };

  const handleComplete = (id: string) => {
    completeMutation.mutate(id);
  };

  const handleResendValidation = (id: string) => {
    resendValidationMutation.mutate(id);
  };

  const handleEditSuccess = () => {
    setEditingActionPlan(null);
  };

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
  };

  // Reschedule mutation
  const rescheduleMutation = useMutation({
    mutationFn: async ({ id, dueDate, reason }: { id: string, dueDate: Date, reason: string }) => {
      return apiRequest(`/api/action-plans/${id}`, "PUT", {
        dueDate: dueDate.toISOString(),
        description: `${(reschedulingActionPlan as any)?.description || ''}\n\n[Reagendado: ${reason}]`.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/action-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/action-plans/metrics/rescheduling"] });
      toast({
        title: "Plan reagendado",
        description: "La fecha del plan de acción ha sido actualizada exitosamente.",
      });
      setReschedulingActionPlan(null);
      setNewDueDate(undefined);
      setRescheduleReason("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo reagendar el plan de acción.",
        variant: "destructive",
      });
    },
  });

  const handleReschedule = () => {
    if (!reschedulingActionPlan || !newDueDate) {
      toast({
        title: "Datos incompletos",
        description: "Por favor selecciona una nueva fecha.",
        variant: "destructive",
      });
      return;
    }

    if (!rescheduleReason.trim()) {
      toast({
        title: "Justificación requerida",
        description: "Por favor ingresa la razón del reagendamiento.",
        variant: "destructive",
      });
      return;
    }

    rescheduleMutation.mutate({
      id: reschedulingActionPlan.id,
      dueDate: newDueDate,
      reason: rescheduleReason,
    });
  };

  // Selection handlers
  const handleSelectPlan = (planId: string) => {
    setSelectedPlans(prev => 
      prev.includes(planId) 
        ? prev.filter(id => id !== planId)
        : [...prev, planId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPlans.length === allActions.length) {
      setSelectedPlans([]);
    } else {
      setSelectedPlans(allActions.map(plan => plan.id));
    }
  };

  const handleSendEmail = () => {
    if (selectedPlans.length === 0) {
      toast({
        title: "Sin selección",
        description: "Por favor seleccione al menos un plan de acción.",
        variant: "destructive"
      });
      return;
    }

    if (!emailSubject.trim()) {
      toast({
        title: "Asunto requerido",
        description: "Por favor ingrese el asunto del email.",
        variant: "destructive"
      });
      return;
    }

    if (!emailMessage.trim()) {
      toast({
        title: "Mensaje requerido",
        description: "Por favor ingrese el mensaje del email.",
        variant: "destructive"
      });
      return;
    }

    sendEmailMutation.mutate({
      planIds: selectedPlans,
      subject: emailSubject,
      message: emailMessage
    });
  };

  // Get unique recipients from selected plans
  const getSelectedPlanRecipients = () => {
    const recipients = new Map<string, string>();
    
    selectedPlans.forEach(planId => {
      const plan = allActions.find(p => p.id === planId);
      if (plan?.responsible) {
        const name = getResponsibleName(plan.responsible);
        recipients.set(plan.responsible, name);
      }
    });
    
    return Array.from(recipients.values());
  };

  // Helper function to get responsible name
  const getResponsibleName = (responsibleId: string | null) => {
    if (!responsibleId) return "No asignado";
    
    // Check if it looks like a UUID (contains hyphens in UUID pattern)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(responsibleId);
    
    if (isUUID) {
      const owner = processOwners.find((po: ProcessOwner) => po.id === responsibleId);
      return owner?.name || "No asignado";
    }
    
    // If it's not a UUID, treat it as a name directly
    return responsibleId;
  };

  // Listen for header button click
  useEffect(() => {
    const handleHeaderCreate = () => {
      setIsCreateDialogOpen(true);
    };

    window.addEventListener('openActionPlanDialog', handleHeaderCreate);
    return () => window.removeEventListener('openActionPlanDialog', handleHeaderCreate);
  }, []);

  // Listen for export to Excel event from header
  useEffect(() => {
    const handleExportToExcel = () => {
      exportToExcel();
    };

    window.addEventListener('exportActionPlansToExcel', handleExportToExcel);
    return () => window.removeEventListener('exportActionPlansToExcel', handleExportToExcel);
  }, [allActions]);

  // Listen for filters changed event from header
  useEffect(() => {
    const handleFiltersChanged = (event: any) => {
      const { originFilter } = event.detail;
      if (originFilter !== undefined) {
        setOriginFilter(originFilter);
      }
    };

    window.addEventListener('actionsFiltersChanged', handleFiltersChanged);
    return () => window.removeEventListener('actionsFiltersChanged', handleFiltersChanged);
  }, []);

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Planes de Acción');

    worksheet.columns = [
      { header: 'Código', key: 'code', width: 15 },
      { header: 'Nombre', key: 'name', width: 40 },
      { header: 'Descripción', key: 'description', width: 50 },
      { header: 'Riesgo', key: 'risk', width: 40 },
      { header: 'Gerencia', key: 'gerencias', width: 30 },
      { header: 'Responsable', key: 'responsible', width: 30 },
      { header: 'Prioridad', key: 'priority', width: 15 },
      { header: 'Estado', key: 'status', width: 20 },
      { header: 'Estado de Validación', key: 'validationStatus', width: 20 },
      { header: 'Progreso', key: 'progress', width: 15 },
      { header: 'Fecha Vencimiento', key: 'dueDate', width: 20 },
      { header: 'Fecha Creación', key: 'createdAt', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    allActions.forEach((plan: Action) => {
      const risk = risks.find((r: Risk) => r.id === plan.riskId);
      const priorityText = plan.priority === 'critical' ? 'Crítica' :
                           plan.priority === 'high' ? 'Alta' :
                           plan.priority === 'medium' ? 'Media' : 'Baja';
      
      const statusText = plan.status === 'completed' ? 'Completado' :
                        plan.status === 'in_progress' ? 'En progreso' :
                        plan.status === 'evidence_submitted' ? 'Evidencias Enviadas' :
                        plan.status === 'under_review' ? 'En Revisión' :
                        plan.status === 'audited' ? 'Auditado' :
                        plan.status === 'desistido' ? 'Desistido' : 'Pendiente';
      
      const validationStatusText = (plan as any).validationStatus === 'validated' ? 'Validado' :
                                   (plan as any).validationStatus === 'observed' ? 'Observado' :
                                   (plan as any).validationStatus === 'rejected' ? 'Rechazado' : 'Pendiente';
      
      const gerenciasText = (plan as any).gerencias && (plan as any).gerencias.length > 0
        ? (plan as any).gerencias.map((g: any) => g.code).join(', ')
        : '-';

      worksheet.addRow({
        code: plan.code,
        name: plan.title,
        description: plan.description || '',
        risk: risk?.name || 'N/A',
        gerencias: gerenciasText,
        responsible: getResponsibleName(plan.responsible),
        priority: priorityText,
        status: statusText,
        validationStatus: validationStatusText,
        progress: plan.progress || 0,
        dueDate: plan.dueDate ? new Date(plan.dueDate).toLocaleDateString('es-CL') : 'Sin fecha',
        createdAt: plan.createdAt ? new Date(plan.createdAt).toLocaleDateString('es-CL') : 'Sin fecha',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `planes_accion_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Exportación exitosa",
      description: `Se exportaron ${allActions.length} planes de acción a Excel.`,
    });
  };

  // FIXED: Add skeleton loading state
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Sort handler
  const handleSort = (field: "code" | "origin" | "gerencia") => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Sort function
  const sortActionPlans = (plans: Action[]) => {
    if (!sortField) return plans;
    
    return [...plans].sort((a, b) => {
      let aVal = "";
      let bVal = "";
      
      if (sortField === "code") {
        aVal = a.code || "";
        bVal = b.code || "";
      } else if (sortField === "origin") {
        const originMap: Record<string, string> = {
          'risk': 'Riesgo',
          'audit': 'Auditoría',
          'compliance': 'Cumplimiento'
        };
        aVal = originMap[a.origin || ''] || a.origin || '';
        bVal = originMap[b.origin || ''] || b.origin || '';
      } else if (sortField === "gerencia") {
        // Get gerencias from the plan - they come as an array of objects with name/code
        const aGerencias = (a as any).gerencias && Array.isArray((a as any).gerencias)
          ? (a as any).gerencias.map((g: any) => g.name || g.code || '').join(', ')
          : '';
        const bGerencias = (b as any).gerencias && Array.isArray((b as any).gerencias)
          ? (b as any).gerencias.map((g: any) => g.name || g.code || '').join(', ')
          : '';
        aVal = aGerencias;
        bVal = bGerencias;
      }
      
      // Convert to lowercase for case-insensitive sorting
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
      
      if (sortDirection === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  };

  // Filter action plans by origin and risk
  const filteredAndSortedActionPlans = sortActionPlans(allActions.filter((action: Action) => {
    // Filtro por origen
    if (originFilter !== "all" && action.origin !== originFilter) {
      return false;
    }
    
    // Filtro por riesgo (many-to-many relationship)
    if (riskFilterId) {
      const associatedRisks = (action as any).associatedRisks || [];
      const isAssociated = associatedRisks.some((risk: any) => risk.id === riskFilterId) || 
                          action.riskId === riskFilterId;
      if (!isAssociated) {
        return false;
      }
    }
    
    // Note: validationStatus filter removed since actions table doesn't have this field
    // Validation is handled separately in /api/action-plans/validation/* endpoints
    return true;
  }));
  
  // Keep old variable name for backward compatibility
  const filteredActionPlans = filteredAndSortedActionPlans;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "pending": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "in_progress": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "pending_review": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "approved": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "completed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "implemented": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "audited": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
      case "rejected": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusText = (plan: Action) => {
    if (plan.status === "draft") return "Borrador";
    if (plan.status === "pending") return "Pendiente";
    if (plan.status === "in_progress") return "En Progreso";
    if (plan.status === "pending_review") return "Pendiente Revisión";
    if (plan.status === "approved") return "Aprobado";
    if (plan.status === "rejected") return "Rechazado";
    if (plan.status === "completed") return "Completado";
    if (plan.status === "implemented") return "Implementado";
    if (plan.status === "audited") return "Auditado";
    return plan.status;
  };

  const getValidationStatusBadge = (status: string) => {
    switch (status) {
      case "validated":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" data-testid="badge-validated">Validado</Badge>;
      case "observed":
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" data-testid="badge-observed">Observado</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" data-testid="badge-rejected">Rechazado</Badge>;
      case "pending_validation":
      default:
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" data-testid="badge-pending">Pendiente</Badge>;
    }
  };

  // Dashboard metrics calculations with new status - usa allActions (tabla unificada)
  const totalPlans = allActions.length;
  const draftPlans = allActions.filter(p => p.status === 'draft' || p.status === 'pending').length;
  const inProgressPlans = allActions.filter(p => p.status === 'in_progress').length;
  const pendingReviewPlans = allActions.filter(p => p.status === 'pending_review' || p.status === 'under_review').length;
  const approvedPlans = allActions.filter(p => p.status === 'approved' || p.status === 'completed').length;
  const rejectedPlans = allActions.filter(p => p.status === 'rejected').length;
  
  const criticalPlans = allActions.filter(p => p.priority === 'critical').length;
  const highPlans = allActions.filter(p => p.priority === 'high').length;
  const mediumPlans = allActions.filter(p => p.priority === 'medium').length;
  const lowPlans = allActions.filter(p => p.priority === 'low').length;
  
  // Métricas por origen
  const riskOriginPlans = allActions.filter(p => p.origin === 'risk').length;
  const auditOriginPlans = allActions.filter(p => p.origin === 'audit').length;
  const complianceOriginPlans = allActions.filter(p => p.origin === 'compliance').length;
  
  const completionRate = totalPlans > 0 ? ((approvedPlans) / totalPlans * 100).toFixed(1) : '0';
  const averageProgress = totalPlans > 0 ? (allActions.reduce((sum, p) => sum + (p.progress || 0), 0) / totalPlans).toFixed(1) : '0';

  return (
    <div className="p-3 sm:p-6" data-testid="actions-content">
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingActionPlanId} onOpenChange={(open) => !open && cancelDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de que desea eliminar este plan de acción?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción moverá el plan de acción a la papelera. Podrá restaurarlo desde allí si es necesario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="deletion-reason" className="text-sm font-medium">
              Motivo de la eliminación <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="deletion-reason"
              data-testid="input-deletion-reason"
              placeholder="Ingrese el motivo por el cual está eliminando este plan de acción..."
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              rows={3}
              className="resize-none mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Este motivo quedará registrado en el historial de auditoría.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule Dialog */}
      <Dialog open={!!reschedulingActionPlan} onOpenChange={(open) => !open && setReschedulingActionPlan(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reagendar Plan de Acción</DialogTitle>
            <DialogDescription>
              Actualizar la fecha de vencimiento del plan de acción {reschedulingActionPlan?.code}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {reschedulingActionPlan?.originalDueDate && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Fecha Original</Label>
                <p className="mt-1 text-sm">
                  {new Date(reschedulingActionPlan.originalDueDate).toLocaleDateString()}
                </p>
              </div>
            )}
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Fecha Actual</Label>
              <p className="mt-1 text-sm">
                {reschedulingActionPlan?.dueDate ? new Date(reschedulingActionPlan.dueDate).toLocaleDateString() : 'Sin fecha'}
              </p>
              {(reschedulingActionPlan as any)?.rescheduleCount > 0 && (
                <Badge variant="outline" className="mt-1 text-xs bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800">
                  Reagendado {(reschedulingActionPlan as any).rescheduleCount}x
                </Badge>
              )}
            </div>
            <div>
              <Label htmlFor="new-due-date" className="text-sm font-medium">
                Nueva Fecha de Vencimiento <span className="text-destructive">*</span>
              </Label>
              <Input
                id="new-due-date"
                type="date"
                data-testid="input-new-due-date"
                value={newDueDate ? newDueDate.toISOString().split('T')[0] : ''}
                onChange={(e) => setNewDueDate(e.target.value ? new Date(e.target.value) : undefined)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="reschedule-reason" className="text-sm font-medium">
                Justificación <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reschedule-reason"
                data-testid="input-reschedule-reason"
                placeholder="Ingrese la razón del reagendamiento..."
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                rows={3}
                className="resize-none mt-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Esta justificación se agregará al historial del plan de acción.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setReschedulingActionPlan(null)}
              data-testid="button-cancel-reschedule"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleReschedule}
              disabled={rescheduleMutation.isPending}
              data-testid="button-confirm-reschedule"
            >
              {rescheduleMutation.isPending ? "Reagendando..." : "Reagendar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Enviar Email a Planes Seleccionados</DialogTitle>
            <DialogDescription>
              Envía un email a los responsables de los {selectedPlans.length} planes de acción seleccionados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Recipients List */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Destinatarios</Label>
              <div className="bg-muted p-3 rounded-md">
                {getSelectedPlanRecipients().length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {getSelectedPlanRecipients().map((recipient, index) => (
                      <Badge key={index} variant="secondary">
                        {recipient}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin responsables asignados</p>
                )}
              </div>
            </div>

            {/* Subject Field */}
            <div>
              <Label htmlFor="email-subject" className="text-sm font-medium">
                Asunto <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email-subject"
                data-testid="input-email-subject"
                placeholder="Ingrese el asunto del email..."
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="mt-2"
              />
            </div>

            {/* Message Field */}
            <div>
              <Label htmlFor="email-message" className="text-sm font-medium">
                Mensaje <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="email-message"
                data-testid="input-email-message"
                placeholder="Ingrese el mensaje del email..."
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={6}
                className="resize-none mt-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                El email incluirá los detalles de cada plan de acción (código, nombre, fecha límite).
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setIsEmailDialogOpen(false)}
                data-testid="button-cancel-email"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSendEmail}
                disabled={sendEmailMutation.isPending}
                data-testid="button-confirm-send-email"
              >
                {sendEmailMutation.isPending ? (
                  <>Enviando...</>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar Email
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Action Plan Dialog - Available globally */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(open);
        if (!open) {
          setInitialRiskId(undefined);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Nuevo Plan de Acción</DialogTitle>
            <DialogDescription>
              Crear un plan de acción para gestionar riesgos identificados.
            </DialogDescription>
          </DialogHeader>
          <ActionPlanForm 
            onSuccess={handleCreateSuccess} 
            defaultRiskId={initialRiskId}
          />
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3" data-testid="action-plans-tabs">
        <div className="w-full overflow-x-auto">
          <TabsList className="inline-flex w-auto md:grid md:w-full md:grid-cols-2 md:max-w-md">
            <TabsTrigger value="dashboard" data-testid="tab-dashboard" className="flex-shrink-0">
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="management" data-testid="tab-management" className="flex-shrink-0">
              <FileCheck className="h-4 w-4 mr-2" />
              Gestión
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-3">
          {/* Key Metrics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Planes</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalPlans}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {approvedPlans} aprobados
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">{inProgressPlans}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Progreso promedio: {averageProgress}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasa de Aprobación</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-500">{completionRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {approvedPlans} aprobados
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rechazados</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 dark:text-red-500">{rejectedPlans}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Requieren corrección
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Distribución por Estado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
                  <p className="text-3xl font-bold text-gray-700 dark:text-gray-400">{draftPlans}</p>
                  <p className="text-xs text-muted-foreground mt-2">Borrador</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">{inProgressPlans}</p>
                  <p className="text-xs text-muted-foreground mt-2">En Progreso</p>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">{pendingReviewPlans}</p>
                  <p className="text-xs text-muted-foreground mt-2">Pendiente Revisión</p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-3xl font-bold text-green-700 dark:text-green-400">{approvedPlans}</p>
                  <p className="text-xs text-muted-foreground mt-2">Aprobados</p>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-3xl font-bold text-red-700 dark:text-red-400">{rejectedPlans}</p>
                  <p className="text-xs text-muted-foreground mt-2">Rechazados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Priority Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Distribución por Prioridad
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-3xl font-bold text-red-700 dark:text-red-400">{criticalPlans}</p>
                  <p className="text-xs text-muted-foreground mt-2">Crítica</p>
                  <Progress value={totalPlans > 0 ? (criticalPlans / totalPlans) * 100 : 0} className="mt-2 h-2" />
                </div>
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                  <p className="text-3xl font-bold text-orange-700 dark:text-orange-400">{highPlans}</p>
                  <p className="text-xs text-muted-foreground mt-2">Alta</p>
                  <Progress value={totalPlans > 0 ? (highPlans / totalPlans) * 100 : 0} className="mt-2 h-2" />
                </div>
                <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">{mediumPlans}</p>
                  <p className="text-xs text-muted-foreground mt-2">Media</p>
                  <Progress value={totalPlans > 0 ? (mediumPlans / totalPlans) * 100 : 0} className="mt-2 h-2" />
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-3xl font-bold text-green-700 dark:text-green-400">{lowPlans}</p>
                  <p className="text-xs text-muted-foreground mt-2">Baja</p>
                  <Progress value={totalPlans > 0 ? (lowPlans / totalPlans) * 100 : 0} className="mt-2 h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rescheduling Metrics */}
          {reschedulingMetrics && reschedulingMetrics.summary.rescheduledCount > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Métricas de Reagendamiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-primary">{reschedulingMetrics.summary.rescheduledCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Planes Reagendados</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-orange-500">{reschedulingMetrics.summary.reschedulingRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">Tasa de Reagendamiento</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-blue-500">{reschedulingMetrics.summary.avgExtensionDays}</p>
                <p className="text-xs text-muted-foreground mt-1">Días Promedio de Extensión</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-green-500">{reschedulingMetrics.summary.recentChanges}</p>
                <p className="text-xs text-muted-foreground mt-1">Cambios Últimos 30 Días</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-red-500">{reschedulingMetrics.byStatus.overdue}</p>
                <p className="text-xs text-muted-foreground mt-1">Reagendados Vencidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
          )}

          {/* Reports Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Reportes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <ReportButton 
                  title="Reporte General"
                  description="Resumen ejecutivo y listado completo de planes de acción"
                  icon={FileCheck}
                  endpoint="/api/action-plans/reports/general"
                  filename="reporte-general-planes"
                />
                <ReportButton 
                  title="Seguimiento"
                  description="Historial de cambios y trazabilidad de planes de acción"
                  icon={Clock}
                  endpoint="/api/action-plans/reports/tracking"
                  filename="reporte-trazabilidad-planes"
                />
                <ReportButton 
                  title="Eficiencia"
                  description="KPIs y análisis de rendimiento por responsable"
                  icon={TrendingUp}
                  endpoint="/api/action-plans/reports/efficiency"
                  filename="reporte-eficiencia-planes"
                />
                <ReportButton 
                  title="Por Gerencia"
                  description="Planes de acción agrupados por gerencia y estado"
                  icon={Building}
                  endpoint="/api/action-plans/reports/by-gerencia"
                  filename="reporte-planes-por-gerencia"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Management Tab */}
        <TabsContent value="management" className="space-y-3">
          {allActions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No hay planes de acción creados aún</p>
            <Button 
              data-testid="button-create-first-action-plan"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Crear Primer Plan de Acción
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filters and Actions Bar */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-1">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filtrar por:</span>
                  </div>
                  <Select value={originFilter} onValueChange={(value: any) => setOriginFilter(value)}>
                    <SelectTrigger className="w-[200px]" data-testid="select-origin-filter">
                      <SelectValue placeholder="Seleccionar origen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los orígenes</SelectItem>
                      <SelectItem value="risk">Gestión de Riesgos</SelectItem>
                      <SelectItem value="audit">Auditoría</SelectItem>
                      <SelectItem value="compliance">Cumplimiento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {selectedPlans.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{selectedPlans.length} seleccionados</span>
                    <Button 
                      variant="outline"
                      onClick={() => setIsEmailDialogOpen(true)}
                      disabled={sendEmailMutation.isPending}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                      data-testid="button-send-email-selected"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {sendEmailMutation.isPending ? 'Enviando...' : 'Enviar por Email'}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Desktop Table View - Hidden on Mobile */}
          <div className="hidden lg:block">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-muted sticky top-0 z-10">
                      <tr>
                        <th className="text-left p-4 font-medium w-12">
                          <Checkbox 
                            checked={selectedPlans.length === filteredActionPlans.length && filteredActionPlans.length > 0}
                            onCheckedChange={handleSelectAll}
                            data-testid="checkbox-select-all"
                          />
                        </th>
                        <th className="text-left p-4 font-medium">
                          <button
                            onClick={() => handleSort("code")}
                            className="flex items-center space-x-1 hover:text-primary transition-colors"
                            data-testid="sort-code-button"
                          >
                            <span>Código</span>
                            {sortField === "code" ? (
                              sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                            ) : (
                              <ArrowUpDown className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                        </th>
                        <th className="text-left p-4 font-medium">Plan de Acción</th>
                        <th className="text-left p-4 font-medium">
                          <button
                            onClick={() => handleSort("origin")}
                            className="flex items-center space-x-1 hover:text-primary transition-colors"
                            data-testid="sort-origin-button"
                          >
                            <span>Origen</span>
                            {sortField === "origin" ? (
                              sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                            ) : (
                              <ArrowUpDown className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                        </th>
                        <th className="text-left p-4 font-medium">Riesgo Asociado</th>
                        <th className="text-left p-4 font-medium">
                          <button
                            onClick={() => handleSort("gerencia")}
                            className="flex items-center space-x-1 hover:text-primary transition-colors"
                            data-testid="sort-gerencia-button"
                          >
                            <span>Gerencia</span>
                            {sortField === "gerencia" ? (
                              sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                            ) : (
                              <ArrowUpDown className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                        </th>
                        <th className="text-left p-4 font-medium">Responsable</th>
                        <th className="text-center p-4 font-medium">Progreso</th>
                        <th className="text-center p-4 font-medium">Fecha Original</th>
                        <th className="text-center p-4 font-medium">Fecha Actual</th>
                        <th className="text-center p-4 font-medium">Estado</th>
                        <th className="text-center p-4 font-medium">Prioridad</th>
                        <th className="text-center p-4 font-medium">Estado de Validación</th>
                        <th className="text-center p-4 font-medium">Fecha de Validación</th>
                        <th className="text-center p-4 font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredActionPlans.map((plan: Action) => {
                        const isOverdue = plan.status !== "completed" && plan.status !== "desistido" && 
                          plan.dueDate && new Date(plan.dueDate) < new Date();
                        const actualStatus = isOverdue ? "overdue" : plan.status;
                        
                        // Get associated risks from the plan
                        // Risk-origin plans use associatedRisks (array), audit-origin plans use risk (object)
                        const associatedRisks = (plan as any).associatedRisks || [];
                        const singleRisk = (plan as any).risk;
                        
                        return (
                          <tr key={plan.id} className="border-b border-border hover:bg-muted/50" data-testid={`action-plan-row-${plan.id}`}>
                            <td className="p-4">
                              <Checkbox 
                                checked={selectedPlans.includes(plan.id)}
                                onCheckedChange={() => handleSelectPlan(plan.id)}
                                data-testid={`checkbox-plan-${plan.id}`}
                              />
                            </td>
                            <td className="p-4">
                              <Badge 
                                variant="outline" 
                                className="cursor-pointer hover:bg-accent transition-colors"
                                onClick={() => setViewingActionPlan(plan)}
                                data-testid={`badge-code-${plan.id}`}
                              >
                                {plan.code}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <div>
                                <p className="font-medium">{plan.title}</p>
                                <p className="text-sm text-muted-foreground">{plan.description}</p>
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge 
                                variant={
                                  plan.origin === 'audit' ? 'default' : 
                                  plan.origin === 'compliance' ? 'outline' : 
                                  'secondary'
                                }
                                className={
                                  plan.origin === 'compliance' 
                                    ? 'border-green-500 text-green-700 dark:text-green-400' 
                                    : ''
                                }
                                data-testid={`badge-origin-${plan.id}`}
                              >
                                {plan.origin === 'audit' ? 'Auditoría' : 
                                 plan.origin === 'compliance' ? 'Cumplimiento' : 
                                 plan.origin === 'risk' ? 'Gestión de Riesgos' : 
                                 'Sin origen'}
                              </Badge>
                            </td>
                            <td className="p-4">
                              {associatedRisks.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {associatedRisks.map((risk: any) => (
                                    <div key={risk.id} className="flex items-center gap-1">
                                      <Badge 
                                        variant={risk.isPrimary ? "default" : "outline"}
                                        className="text-xs"
                                      >
                                        {risk.riskCode}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                        {risk.riskName}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : singleRisk ? (
                                <div className="flex items-center gap-1">
                                  <Badge 
                                    variant="default"
                                    className="text-xs"
                                  >
                                    {singleRisk.code}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {singleRisk.name}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1">
                                {(plan as any).gerencias && (plan as any).gerencias.length > 0 ? (
                                  (plan as any).gerencias.map((gerencia: any) => (
                                    <Badge key={gerencia.id} variant="secondary" className="text-xs">
                                      {gerencia.code}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-sm text-muted-foreground">-</span>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-medium">
                                    {getResponsibleName(plan.responsible).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                  </span>
                                </div>
                                <span className="text-sm">{getResponsibleName(plan.responsible)}</span>
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-sm font-medium">{plan.progress}%</span>
                                <Progress value={plan.progress} className="w-16 h-2" />
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <span className="text-sm">
                                {plan.originalDueDate 
                                  ? new Date(plan.originalDueDate).toLocaleDateString()
                                  : "-"
                                }
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1">
                                  {(plan as any).rescheduleCount > 0 && (
                                    <RefreshCw className="h-3 w-3 text-orange-500" />
                                  )}
                                  <span className={`text-sm ${isOverdue ? 'text-destructive font-medium' : ''}`}>
                                    {plan.dueDate 
                                      ? new Date(plan.dueDate).toLocaleDateString()
                                      : "Sin fecha"
                                    }
                                  </span>
                                </div>
                                {(plan as any).rescheduleCount > 0 && (
                                  <Badge variant="outline" className="text-xs bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800">
                                    Reagendado {(plan as any).rescheduleCount}x
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <Badge className={getStatusColor(actualStatus)}>
                                  {getStatusText(plan)}
                                </Badge>
                                {(plan as any).rejectionCount > 0 && (
                                  <Badge variant="outline" className="text-xs bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800">
                                    Rechazado {(plan as any).rejectionCount}x
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <Badge className={getPriorityColor(plan.priority)}>
                                {plan.priority === "critical" ? "Crítica" :
                                 plan.priority === "high" ? "Alta" :
                                 plan.priority === "medium" ? "Media" : "Baja"}
                              </Badge>
                            </td>
                            <td className="p-4 text-center" data-testid={`validation-status-${plan.id}`}>
                              {getValidationStatusBadge((plan as any).validationStatus || "pending_validation")}
                            </td>
                            <td className="p-4 text-center" data-testid={`validation-date-${plan.id}`}>
                              <span className="text-sm">
                                {(plan as any).validatedAt 
                                  ? new Date((plan as any).validatedAt).toLocaleDateString()
                                  : "-"
                                }
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    data-testid={`button-actions-${plan.id}`}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    onClick={() => setViewingActionPlan(plan)}
                                    data-testid={`menu-view-${plan.id}`}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => setEditingActionPlan(plan)}
                                    data-testid={`menu-edit-${plan.id}`}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setReschedulingActionPlan(plan);
                                      setNewDueDate(plan.dueDate ? new Date(plan.dueDate) : undefined);
                                      setRescheduleReason("");
                                    }}
                                    data-testid={`menu-reschedule-${plan.id}`}
                                  >
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Reagendar
                                  </DropdownMenuItem>
                                  {(plan as any).validationStatus === "rejected" && (
                                    <DropdownMenuItem 
                                      onClick={() => handleResendValidation(plan.id)}
                                      className="text-blue-600 focus:text-blue-700"
                                      data-testid={`menu-resend-validation-${plan.id}`}
                                    >
                                      <Send className="h-4 w-4 mr-2" />
                                      Reenviar a Validación
                                    </DropdownMenuItem>
                                  )}
                                  {plan.status === "rejected" && (
                                    <DropdownMenuItem 
                                      onClick={() => reopenMutation.mutate(plan.id)}
                                      disabled={reopenMutation.isPending}
                                      className="text-orange-600 focus:text-orange-700"
                                      data-testid={`menu-reopen-${plan.id}`}
                                    >
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                      Reabrir
                                    </DropdownMenuItem>
                                  )}
                                  {plan.status !== "completed" && plan.status !== "rejected" && (
                                    <DropdownMenuItem 
                                      onClick={() => handleComplete(plan.id)}
                                      data-testid={`menu-complete-${plan.id}`}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Completar
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleDelete(plan.id)}
                                    className="text-destructive focus:text-destructive"
                                    data-testid={`menu-delete-${plan.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              
                              {/* Keep edit dialog outside dropdown for proper behavior */}
                              <Dialog open={editingActionPlan?.id === plan.id} onOpenChange={(open) => !open && setEditingActionPlan(null)}>
                                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
                                  <DialogHeader>
                                    <DialogTitle>Editar Plan de Acción</DialogTitle>
                                    <DialogDescription>
                                      Modificar los detalles del plan de acción existente.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <ActionPlanForm 
                                    actionPlan={editingActionPlan!} 
                                    onSuccess={handleEditSuccess} 
                                  />
                                </DialogContent>
                              </Dialog>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Card View - Shown on Mobile and Tablet */}
          <div className="lg:hidden space-y-4">
            {/* Email button - shown when plans are selected */}
            {selectedPlans.length > 0 && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button 
                  onClick={() => setIsEmailDialogOpen(true)}
                  variant="default"
                  className="flex-1"
                  data-testid="button-send-email-selected-mobile"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar email a {selectedPlans.length} seleccionado{selectedPlans.length > 1 ? 's' : ''}
                </Button>
                <Button 
                  onClick={() => setSelectedPlans([])}
                  variant="outline"
                  className="flex-1"
                  data-testid="button-clear-selection-mobile"
                >
                  Limpiar selección
                </Button>
              </div>
            )}
            
            {filteredActionPlans.map((plan: Action) => {
              const associatedRisk = risks.find((risk: Risk) => risk.id === plan.riskId);
              const isOverdue = plan.status !== "completed" && plan.status !== "desistido" && 
                plan.dueDate && new Date(plan.dueDate) < new Date();
              const actualStatus = isOverdue ? "overdue" : plan.status;
              
              return (
                <Card key={plan.id} className="relative" data-testid={`action-plan-card-${plan.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Checkbox 
                          checked={selectedPlans.includes(plan.id)}
                          onCheckedChange={() => handleSelectPlan(plan.id)}
                          data-testid={`checkbox-plan-mobile-${plan.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge 
                              variant="outline" 
                              className="text-xs cursor-pointer hover:bg-accent transition-colors"
                              onClick={() => setViewingActionPlan(plan)}
                              data-testid={`badge-code-mobile-${plan.id}`}
                            >
                              {plan.code}
                            </Badge>
                            <Badge className={getPriorityColor(plan.priority)}>
                              {plan.priority === "critical" ? "Crítica" :
                               plan.priority === "high" ? "Alta" :
                               plan.priority === "medium" ? "Media" : "Baja"}
                            </Badge>
                            <div data-testid={`validation-status-mobile-${plan.id}`}>
                              {getValidationStatusBadge((plan as any).validationStatus || "pending_validation")}
                            </div>
                          </div>
                          <CardTitle className="text-base leading-tight">{plan.title}</CardTitle>
                          {plan.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{plan.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={getStatusColor(actualStatus)}>
                          {getStatusText(plan)}
                        </Badge>
                        {(plan as any).rejectionCount > 0 && (
                          <Badge variant="outline" className="text-xs bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800">
                            Rechazado {(plan as any).rejectionCount}x
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progreso</span>
                        <span className="font-medium">{plan.progress}%</span>
                      </div>
                      <Progress value={plan.progress} className="h-2" />
                    </div>

                    {/* Risk, Gerencia and Responsible */}
                    <div className="grid grid-cols-1 gap-3 text-sm">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-muted-foreground text-xs">Riesgo Asociado</p>
                          <p className="font-medium">{associatedRisk?.name || "Riesgo no encontrado"}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <Building className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-muted-foreground text-xs mb-1">Gerencia</p>
                          <div className="flex flex-wrap gap-1">
                            {(plan as any).gerencias && (plan as any).gerencias.length > 0 ? (
                              (plan as any).gerencias.map((gerencia: any) => (
                                <Badge key={gerencia.id} variant="secondary" className="text-xs">
                                  {gerencia.code}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-muted-foreground text-xs">Responsable</p>
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium">
                                {getResponsibleName(plan.responsible).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </span>
                            </div>
                            <p className="font-medium">{getResponsibleName(plan.responsible)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Due Date */}
                    <div className="space-y-1.5">
                      {plan.originalDueDate && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Fecha original:</span>
                          <span className="font-medium">
                            {new Date(plan.originalDueDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {plan.dueDate && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Fecha actual:</span>
                            <div className="flex items-center gap-1">
                              {(plan as any).rescheduleCount > 0 && (
                                <RefreshCw className="h-3 w-3 text-orange-500" />
                              )}
                              <span className={`font-medium ${isOverdue ? 'text-destructive' : ''}`}>
                                {new Date(plan.dueDate).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          {(plan as any).rescheduleCount > 0 && (
                            <div className="flex items-center gap-2 ml-6">
                              <Badge variant="outline" className="text-xs bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800">
                                Reagendado {(plan as any).rescheduleCount}x
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action Button - Three-dot menu */}
                    <div className="pt-2 border-t">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="w-full"
                            data-testid={`button-actions-mobile-${plan.id}`}
                          >
                            <MoreVertical className="h-4 w-4 mr-2" />
                            Acciones
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem 
                            onClick={() => setViewingActionPlan(plan)}
                            data-testid={`menu-view-mobile-${plan.id}`}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setEditingActionPlan(plan)}
                            data-testid={`menu-edit-mobile-${plan.id}`}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setReschedulingActionPlan(plan);
                              setNewDueDate(plan.dueDate ? new Date(plan.dueDate) : undefined);
                              setRescheduleReason("");
                            }}
                            data-testid={`menu-reschedule-mobile-${plan.id}`}
                          >
                            <Calendar className="h-4 w-4 mr-2" />
                            Reagendar
                          </DropdownMenuItem>
                          {(plan as any).validationStatus === "rejected" && (
                            <DropdownMenuItem 
                              onClick={() => handleResendValidation(plan.id)}
                              className="text-blue-600 focus:text-blue-700"
                              data-testid={`menu-resend-validation-mobile-${plan.id}`}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Reenviar a Validación
                            </DropdownMenuItem>
                          )}
                          {plan.status === "rejected" && (
                            <DropdownMenuItem 
                              onClick={() => reopenMutation.mutate(plan.id)}
                              disabled={reopenMutation.isPending}
                              className="text-orange-600 focus:text-orange-700"
                              data-testid={`menu-reopen-mobile-${plan.id}`}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Reabrir
                            </DropdownMenuItem>
                          )}
                          {plan.status !== "completed" && plan.status !== "rejected" && (
                            <DropdownMenuItem 
                              onClick={() => handleComplete(plan.id)}
                              data-testid={`menu-complete-mobile-${plan.id}`}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Completar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDelete(plan.id)}
                            className="text-destructive focus:text-destructive"
                            data-testid={`menu-delete-mobile-${plan.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      {/* Keep edit dialog outside dropdown for proper behavior */}
                      <Dialog open={editingActionPlan?.id === plan.id} onOpenChange={(open) => !open && setEditingActionPlan(null)}>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
                          <DialogHeader>
                            <DialogTitle>Editar Plan de Acción</DialogTitle>
                            <DialogDescription>
                              Modificar los detalles del plan de acción existente.
                            </DialogDescription>
                          </DialogHeader>
                          <ActionPlanForm 
                            actionPlan={editingActionPlan!} 
                            onSuccess={handleEditSuccess} 
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )
    }

      {/* View Action Plan Dialog */}
      <Dialog open={!!viewingActionPlan} onOpenChange={(open) => !open && setViewingActionPlan(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Plan de Acción</DialogTitle>
            <DialogDescription>
              Información completa y historial de cambios del plan de acción
            </DialogDescription>
          </DialogHeader>
          {viewingActionPlan && (
            <div className="space-y-3">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Código</Label>
                  <p className="mt-1">{viewingActionPlan.code}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Estado</Label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(viewingActionPlan.status)}>
                      {getStatusText(viewingActionPlan)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Estado de Validación</Label>
                  <div className="mt-1">
                    {getValidationStatusBadge((viewingActionPlan as any).validationStatus || "pending_validation")}
                  </div>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-muted-foreground">Nombre del Plan</Label>
                  <p className="mt-1">{viewingActionPlan.title}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-muted-foreground">Descripción</Label>
                  <p className="mt-1 text-sm">{viewingActionPlan.description || "Sin descripción"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Riesgos Asociados</Label>
                  <div className="mt-1 flex flex-col gap-2">
                    {(viewingActionPlan as any).associatedRisks && (viewingActionPlan as any).associatedRisks.length > 0 ? (
                      (viewingActionPlan as any).associatedRisks.map((risk: any) => (
                        <div key={risk.riskId} className="flex items-center gap-2">
                          <Badge variant={risk.isPrimary ? "default" : "outline"} className="text-xs">
                            {risk.riskCode}
                          </Badge>
                          <span className="text-sm">{risk.riskName}</span>
                        </div>
                      ))
                    ) : viewingActionPlan.riskId ? (
                      <p className="text-sm">{risks.find(r => r.id === viewingActionPlan.riskId)?.name || "No encontrado"}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin riesgos asociados</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Responsable</Label>
                  <p className="mt-1">{getResponsibleName(viewingActionPlan.responsible)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Prioridad</Label>
                  <div className="mt-1">
                    <Badge className={getPriorityColor(viewingActionPlan.priority)}>
                      {viewingActionPlan.priority === "critical" ? "Crítica" :
                       viewingActionPlan.priority === "high" ? "Alta" :
                       viewingActionPlan.priority === "medium" ? "Media" : "Baja"}
                    </Badge>
                  </div>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-muted-foreground">Fechas Límite</Label>
                  <div className="mt-1 space-y-2">
                    {viewingActionPlan.originalDueDate && viewingActionPlan.dueDate && 
                     new Date(viewingActionPlan.originalDueDate).getTime() !== new Date(viewingActionPlan.dueDate).getTime() ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Original:</span>
                          <span className="text-sm line-through">{new Date(viewingActionPlan.originalDueDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Reagendada:</span>
                          <span className="text-sm font-medium">{new Date(viewingActionPlan.dueDate).toLocaleDateString()}</span>
                          <Badge variant="secondary" className="text-xs">🔄 Reagendado</Badge>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm">
                        {viewingActionPlan.dueDate 
                          ? new Date(viewingActionPlan.dueDate).toLocaleDateString()
                          : "Sin fecha"
                        }
                      </p>
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-muted-foreground">Progreso</Label>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={viewingActionPlan.progress} className="flex-1" />
                    <span className="text-sm font-medium">{viewingActionPlan.progress}%</span>
                  </div>
                </div>
              </div>

              {/* Validation Details Section */}
              {(viewingActionPlan as any).validatedAt && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium mb-3">Información de Validación</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {(viewingActionPlan as any).validatedAt && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Fecha de Validación</Label>
                        <p className="mt-1 text-sm">
                          {new Date((viewingActionPlan as any).validatedAt).toLocaleDateString('es-CL')}
                        </p>
                      </div>
                    )}
                    {(viewingActionPlan as any).validatedBy && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Validado por</Label>
                        <p className="mt-1 text-sm">{(viewingActionPlan as any).validatedBy}</p>
                      </div>
                    )}
                    {(viewingActionPlan as any).validationComments && (
                      <div className="col-span-2">
                        <Label className="text-sm font-medium text-muted-foreground">Comentarios de Validación</Label>
                        <p className="mt-1 text-sm">{(viewingActionPlan as any).validationComments}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Evidence Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Evidencias</h3>
                  {(viewingActionPlan.status === 'in_progress' || viewingActionPlan.status === 'pending') && (
                    <Button 
                      size="sm" 
                      onClick={() => setIsUploadEvidenceOpen(true)}
                      data-testid="button-upload-evidence"
                    >
                      Subir Evidencias
                    </Button>
                  )}
                </div>
                <EvidenceGallery 
                  actionPlanId={viewingActionPlan.id}
                  canDelete={viewingActionPlan.status === 'in_progress' || viewingActionPlan.status === 'pending'}
                />
              </div>

              {/* Mark as Implemented Section */}
              {(viewingActionPlan as any).validationStatus === 'validated' && 
               viewingActionPlan.status !== 'implemented' && 
               viewingActionPlan.status !== 'audited' && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium mb-1">Marcar como Implementado</h3>
                      <p className="text-xs text-muted-foreground">
                        Esta acción ha sido validada y puede ser marcada como implementada
                      </p>
                    </div>
                    <Button 
                      onClick={() => setIsMarkImplementedOpen(true)}
                      data-testid="button-mark-implemented"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Marcar como Implementado
                    </Button>
                  </div>
                </div>
              )}

              {/* Evidence Review Panel (for auditors when evidence is submitted) */}
              {viewingActionPlan.status === 'evidence_submitted' && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium mb-3">Revisión de Evidencias</h3>
                  <EvidenceReviewPanel 
                    actionPlan={viewingActionPlan}
                    onReviewComplete={() => {
                      queryClient.invalidateQueries({ queryKey: ['/api/action-plans'] });
                      queryClient.invalidateQueries({ queryKey: ['/api/actions'] });
                      setViewingActionPlan(null);
                    }}
                  />
                </div>
              )}

              {/* Audit History */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3">Historial de Cambios</h3>
                <AuditHistory 
                  entityType="action_plan" 
                  entityId={viewingActionPlan.id} 
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
        </TabsContent>
      </Tabs>

      {/* Upload Evidence Modal */}
      {viewingActionPlan && (
        <UploadEvidenceModal
          actionPlanId={viewingActionPlan.id}
          open={isUploadEvidenceOpen}
          onOpenChange={setIsUploadEvidenceOpen}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/actions', viewingActionPlan.id, 'evidence'] });
            toast({ title: "Evidencias subidas", description: "Las evidencias se subieron correctamente." });
          }}
        />
      )}

      {/* Mark as Implemented Dialog */}
      <Dialog open={isMarkImplementedOpen} onOpenChange={setIsMarkImplementedOpen}>
        <DialogContent data-testid="dialog-mark-implemented">
          <DialogHeader>
            <DialogTitle>Marcar como Implementado</DialogTitle>
            <DialogDescription>
              ¿Está seguro que desea marcar esta acción como implementada? Esta acción indica que las medidas han sido ejecutadas satisfactoriamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="implementation-comments">Comentarios (opcional)</Label>
              <Textarea
                id="implementation-comments"
                placeholder="Agregue comentarios sobre la implementación..."
                value={implementationComments}
                onChange={(e) => setImplementationComments(e.target.value)}
                rows={4}
                data-testid="textarea-implementation-comments"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsMarkImplementedOpen(false);
                setImplementationComments("");
              }}
              data-testid="button-cancel-mark-implemented"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (viewingActionPlan) {
                  markAsImplementedMutation.mutate({
                    id: viewingActionPlan.id,
                    comments: implementationComments || undefined
                  });
                }
              }}
              disabled={markAsImplementedMutation.isPending}
              data-testid="button-confirm-mark-implemented"
            >
              {markAsImplementedMutation.isPending ? "Marcando..." : "Marcar como Implementado"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
