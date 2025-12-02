
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ResponsiveTable, ResponsiveTableContent, ResponsiveTableBody, ResponsiveTableCell, ResponsiveTableHead, ResponsiveTableHeader, ResponsiveTableRow } from "@/components/ui/responsive-table";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Calendar, CalendarCheck, Users, Clock, FileText, AlertTriangle, Edit, Trash2, Play, CheckCircle, CheckCircle2, XCircle, Target, Paperclip, MessageCircle, Milestone, Shield, Save, X, Eye, ArrowRight, BarChart3, UserCheck, MoreVertical, Info, FileWarning, LayoutDashboard, ClipboardCheck, GitBranch, RefreshCw, FolderOpen, FileCheck2, MessageSquare, FileOutput, TrendingUp, ChevronUp, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import type { Audit, Process, Subproceso, User, AuditPlan, AuditPlanItemWithDetails, Macroproceso, AuditTest, Action, AuditFinding, AuditRisk } from "@shared/schema";
import { insertActionSchema } from "@shared/schema";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DateCell } from "@/components/DateCell";
import { ObjectivesEditor } from "@/components/objectives-editor";
import AuditRiskForm from "@/components/forms/audit-risk-form";
import { AuditSectionContainer } from "@/components/audit-sections";
import { getStatusColor, getStatusText, getTypeText } from "@/utils/audit-helpers";

export default function Audits() {
  const { hasPermission } = usePermissions();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showAuditDialog, setShowAuditDialog] = useState(false);
  const [editingAudit, setEditingAudit] = useState<Audit | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("all");
  const [editingAuditorLeader, setEditingAuditorLeader] = useState<string | null>(null);
  const [editingProcess, setEditingProcess] = useState<string | null>(null);
  const [riskSearchTerm, setRiskSearchTerm] = useState<string>("");
  const [processSearchTerm, setProcessSearchTerm] = useState<string>("");
  const [subprocessSearchTerm, setSubprocessSearchTerm] = useState<string>("");
  const [scopeEntitySearchTerm, setScopeEntitySearchTerm] = useState<string>("");
  const [editingScopeEntity, setEditingScopeEntity] = useState(false);
  const [editingScopeDescription, setEditingScopeDescription] = useState(false);
  const [tempScopeDescription, setTempScopeDescription] = useState("");
  const [editingReviewPeriod, setEditingReviewPeriod] = useState(false);
  const [reviewPeriodStartDate, setReviewPeriodStartDate] = useState("");
  const [reviewPeriodEndDate, setReviewPeriodEndDate] = useState("");
  const [selectedScopeEntities, setSelectedScopeEntities] = useState<string[]>([]);
  const [showMilestoneDialog, setShowMilestoneDialog] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<any | null>(null);
  const [milestoneFormData, setMilestoneFormData] = useState({
    name: "",
    description: "",
    type: "reunion_inicio",
    plannedDate: "",
    meetingDate: "",
    participants: [] as string[],
    meetingMinutesUrl: "",
    status: "pending"
  });
  const [showWorkplanDialog, setShowWorkplanDialog] = useState(false);
  const [workplanFormData, setWorkplanFormData] = useState({
    name: "",
    description: "",
    estimatedHours: "",
    assignedTo: "",
    priority: "medium",
    plannedStartDate: "",
    plannedEndDate: ""
  });
  const [showCommitmentDialog, setShowCommitmentDialog] = useState(false);
  const [editingCommitment, setEditingCommitment] = useState<Action | null>(null);
  const [showAuditRiskDialog, setShowAuditRiskDialog] = useState(false);
  const [editingAuditRisk, setEditingAuditRisk] = useState<AuditRisk | null>(null);
  const [showDeleteTestDialog, setShowDeleteTestDialog] = useState(false);
  const [deletingTest, setDeletingTest] = useState<AuditTest | null>(null);
  const [deleteTestWarnings, setDeleteTestWarnings] = useState<string[]>([]);
  const [workProgramSortColumn, setWorkProgramSortColumn] = useState<string>("riskCode");
  const [workProgramSortDirection, setWorkProgramSortDirection] = useState<"asc" | "desc">("asc");
  const [deleteConfirmAudit, setDeleteConfirmAudit] = useState<Audit | null>(null);
  const [auditDelReason, setAuditDelReason] = useState("");

  // Table sorting state
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | "none">("none");
  const [sortColumn, setSortColumn] = useState<"code" | "name" | "type" | "process" | "leadAuditor" | "status">("code");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const auditFormSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    type: z.string(),
    status: z.string(),
    scope: z.string().optional(), // Opcional - se genera automáticamente si está vacío
    leadAuditor: z.string().optional(),
    selectedRisks: z.array(z.string()).default([]),
    selectedProcesses: z.array(z.string()).default([]),
    selectedSubprocesses: z.array(z.string()).default([]),
    regulationId: z.string().optional(),
    selectedControls: z.array(z.string()).default([]),
    plannedStartDate: z.string().min(1, "La fecha de inicio es requerida"),
    plannedEndDate: z.string().min(1, "La fecha de fin es requerida"),
    objectives: z.array(z.string()).optional().default([]),
  }).refine((data) => {
    if (data.plannedStartDate && data.plannedEndDate) {
      return new Date(data.plannedStartDate) <= new Date(data.plannedEndDate);
    }
    return true;
  }, {
    message: "La fecha de inicio debe ser anterior a la fecha de fin",
    path: ["plannedEndDate"],
  });

  // Función para crear hitos predeterminados
  const createAuditTestMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/audits/${data.auditId}/tests`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
      toast({
        title: "Actividad creada",
        description: "La actividad ha sido agregada al programa de trabajo",
      });
      setShowWorkplanDialog(false);
      setWorkplanFormData({
        name: "",
        description: "",
        estimatedHours: "",
        assignedTo: "",
        priority: "medium",
        plannedStartDate: "",
        plannedEndDate: ""
      });
    },
    onError: () => {
      toast({
        title: "Error al crear actividad",
        description: "No se pudo agregar la actividad al programa de trabajo",
        variant: "destructive"
      });
    }
  });

  const createDefaultMilestones = async (auditId: string) => {
    const defaultMilestones = [
      {
        name: "Reunión de inicio",
        description: "Reunión inicial con el equipo para establecer objetivos y alcance",
        targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 semana
        type: "meeting",
        priority: "high"
      },
      {
        name: "Reunión de cierre",
        description: "Reunión de cierre con presentación de resultados",
        targetDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 días
        type: "meeting",
        priority: "medium"
      }
    ];

    try {
      // First, check if milestones already exist for this audit
      const existingMilestones = await apiRequest(`/api/audits/${auditId}/milestones`, "GET");

      if (existingMilestones && Array.isArray(existingMilestones) && existingMilestones.length > 0) {
        toast({
          title: "Hitos ya existen",
          description: "Esta auditoría ya tiene hitos creados",
          variant: "default"
        });
        return;
      }

      for (const milestone of defaultMilestones) {
        // Map frontend data structure to backend schema
        const milestoneData = {
          name: milestone.name,
          description: milestone.description,
          type: milestone.type, // Include the type field
          plannedDate: milestone.targetDate, // Map targetDate to plannedDate
          status: "pending", // Default status
          isDeliverable: milestone.type === "deliverable",
          order: defaultMilestones.indexOf(milestone) + 1
        };
        await apiRequest(`/api/audits/${auditId}/milestones`, "POST", milestoneData);
      }

      toast({
        title: "Hitos creados",
        description: "Se han creado los hitos predeterminados para la auditoría"
      });

      // Refresh milestones data if needed
      queryClient.invalidateQueries({ queryKey: [`/api/audits/${auditId}/milestones`] });

    } catch (error) {
      console.error("Error creating milestones:", error);
      toast({
        title: "Error al crear hitos",
        description: "Hubo un problema al crear los hitos predeterminados",
        variant: "destructive"
      });
    }
  };

  const form = useForm({
    resolver: zodResolver(auditFormSchema),
    defaultValues: {
      name: "",
      type: "risk_based",
      status: "borrador",
      scope: "",
      leadAuditor: "",
      selectedRisks: [],
      selectedProcesses: [],
      selectedSubprocesses: [],
      regulationId: "",
      selectedControls: [],
      plannedStartDate: "",
      plannedEndDate: "",
      objectives: [],
    }
  });

  // Reset form when editing audit changes
  useEffect(() => {
    if (editingAudit) {
      form.reset({
        name: editingAudit.name || "",
        type: editingAudit.type || "risk_based",
        status: editingAudit.status || "borrador",
        scope: editingAudit.scope || "",
        leadAuditor: editingAudit.leadAuditor || "",
        selectedRisks: [],
        selectedProcesses: [],
        selectedSubprocesses: [],
        regulationId: editingAudit.regulationId || "",
        selectedControls: [],
        plannedStartDate: editingAudit.plannedStartDate ? new Date(editingAudit.plannedStartDate).toISOString().split('T')[0] : "",
        plannedEndDate: editingAudit.plannedEndDate ? new Date(editingAudit.plannedEndDate).toISOString().split('T')[0] : "",
        objectives: (editingAudit.objectives && Array.isArray(editingAudit.objectives) ? editingAudit.objectives : []) as any,
      });
    } else {
      form.reset({
        name: "",
        type: "risk_based",
        status: "borrador",
        scope: "",
        leadAuditor: "",
        selectedRisks: [],
        selectedProcesses: [],
        selectedSubprocesses: [],
        regulationId: "",
        selectedControls: [],
        plannedStartDate: "",
        plannedEndDate: "",
        objectives: [],
      });
    }
  }, [editingAudit, form]);


  const { data: audits = [], isLoading } = useQuery<Audit[]>({
    queryKey: ["/api/audits"],
    staleTime: 0, // Asegurar que siempre se refresquen los datos
    refetchOnMount: "always", // Siempre refetch al montar el componente
    refetchOnWindowFocus: true, // Refetch cuando la ventana recupera el foco
    select: (data: any) => data.data || []
  });

  const { data: processes = [] } = useQuery<Process[]>({
    queryKey: ["/api/processes"],
  });

  const { data: subprocesos = [] } = useQuery<Subproceso[]>({
    queryKey: ["/api/subprocesos"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: roles = [] } = useQuery<any[]>({
    queryKey: ["/api/roles"],
  });

  const { data: userRoles = [] } = useQuery<any[]>({
    queryKey: ["/api/user-roles"],
  });

  // Regulations for compliance audits
  const { data: regulations = [] } = useQuery<any[]>({
    queryKey: ["/api/regulations"],
  });

  // Query para obtener compromisos de auditoría (actions con origin: 'audit')
  const { data: auditCommitments = [] } = useQuery<Action[]>({
    queryKey: ["/api/actions", { origin: "audit" }],
  });

  // Query para obtener hallazgos de auditoría para crear compromisos
  const { data: auditFindings = [] } = useQuery<AuditFinding[]>({
    queryKey: ["/api/audit-findings"],
  });

  // Watch for regulation selection to load controls
  const selectedRegulationId = form.watch("regulationId");
  const { data: regulationControls = [] } = useQuery<any[]>({
    queryKey: ["/api/regulations", selectedRegulationId, "controls"],
    enabled: !!selectedRegulationId && selectedRegulationId !== "",
  });

  const { data: auditPlans = [] } = useQuery<AuditPlan[]>({
    queryKey: ["/api/audit-plans"],
  });

  const { data: planItems = [] } = useQuery<AuditPlanItemWithDetails[]>({
    queryKey: ["/api/audit-plans", selectedPlan, "items"],
    enabled: selectedPlan !== "all"
  });

  // Listen for header events to open dialogs
  useEffect(() => {
    const handleOpenFromPlan = () => {
      // Don't set a plan initially, just open the dialog with "all" selected
      // This will show the plan selector dialog
      if (auditPlans.length > 0) {
        // Trigger the plan selector by programmatically selecting first plan, 
        // which will open the dialog
        setSelectedPlan(auditPlans[0].id);
      }
    };

    const handleOpenEmergent = () => {
      setShowAuditDialog(true);
      setEditingAudit(null);
    };

    window.addEventListener('openAuditFromPlanDialog', handleOpenFromPlan);
    window.addEventListener('openAuditEmergentDialog', handleOpenEmergent);

    return () => {
      window.removeEventListener('openAuditFromPlanDialog', handleOpenFromPlan);
      window.removeEventListener('openAuditEmergentDialog', handleOpenEmergent);
    };
  }, [auditPlans]);

  const { data: risksResponse } = useQuery<{ data: any[], pagination: { limit: number, offset: number, total: number } }>({
    queryKey: ["/api/risks"],
  });
  const risks = risksResponse?.data || [];

  const { data: macroprocesos = [] } = useQuery<Macroproceso[]>({
    queryKey: ["/api/macroprocesos"],
  });

  const { data: processOwners = [] } = useQuery<any[]>({
    queryKey: ["/api/process-owners"],
  });


  // Filter functions for processes and subprocesses
  const getFilteredProcesses = () => {
    if (!processSearchTerm.trim()) return processes;
    return processes.filter((process: Process) =>
      process.name.toLowerCase().includes(processSearchTerm.toLowerCase()) ||
      process.description?.toLowerCase().includes(processSearchTerm.toLowerCase()) ||
      process.ownerId?.toLowerCase().includes(processSearchTerm.toLowerCase())
    );
  };

  const getFilteredSubprocesses = () => {
    if (!subprocessSearchTerm.trim()) return subprocesos;
    return subprocesos.filter((subproceso: Subproceso) => {
      const parentProcess = processes.find((p: Process) => p.id === subproceso.procesoId);
      return (
        subproceso.name.toLowerCase().includes(subprocessSearchTerm.toLowerCase()) ||
        subproceso.description?.toLowerCase().includes(subprocessSearchTerm.toLowerCase()) ||
        parentProcess?.name.toLowerCase().includes(subprocessSearchTerm.toLowerCase())
      );
    });
  };


  const updateReviewPeriodMutation = useMutation({
    mutationFn: async ({ auditId, startDate, endDate }: { auditId: string; startDate: string; endDate: string }) => {
      return apiRequest(`/api/audits/${auditId}`, "PUT", {
        reviewPeriodStartDate: startDate,
        reviewPeriodEndDate: endDate
      });
    },
    onSuccess: (updatedAudit, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
      setEditingReviewPeriod(false);
      toast({ title: "Período a revisar actualizado" });
    },
    onError: () => {
      toast({ title: "Error al actualizar período", variant: "destructive" });
    },
  });

  const updateMultipleScopeEntitiesMutation = useMutation({
    mutationFn: async ({ auditId, entities }: { auditId: string; entities: string[] }) => {
      return apiRequest(`/api/audits/${auditId}`, "PUT", { scopeEntities: entities });
    },
    onSuccess: (updatedAudit, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
      setEditingScopeEntity(false);
      setScopeEntitySearchTerm("");
      setSelectedScopeEntities([]);
      toast({ title: "Alcance de auditoría actualizado", description: `${variables.entities.length} entidades seleccionadas` });
    },
    onError: () => {
      toast({ title: "Error al actualizar alcance", variant: "destructive" });
    },
  });

  // Mutations para gestión de compromisos
  const createCommitmentMutation = useMutation({
    mutationFn: (data: z.infer<typeof insertActionSchema>) => {
      const validatedData = insertActionSchema.parse({
        ...data,
        origin: "audit"
      });
      return apiRequest("/api/actions", "POST", validatedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/actions", { origin: "audit" }] });
      toast({
        title: "Compromiso creado",
        description: "El compromiso de auditoría ha sido creado exitosamente"
      });
      setShowCommitmentDialog(false);
    },
    onError: () => {
      toast({
        title: "Error al crear compromiso",
        description: "No se pudo crear el compromiso de auditoría",
        variant: "destructive"
      });
    }
  });

  const updateCommitmentMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Action>) => {
      // Temporary guard to catch object ID issue
      if (typeof id !== 'string' || !id.trim() || id === '[object Object]') {
        console.error('[DEBUG] updateCommitmentMutation received invalid ID:', id, typeof id);
        throw new Error(`updateCommitmentMutation expects valid string ID but received ${typeof id}: ${id}`);
      }
      return apiRequest(`/api/actions/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/actions", { origin: "audit" }] });
      toast({
        title: "Compromiso actualizado",
        description: "Los cambios han sido guardados exitosamente"
      });
      setShowCommitmentDialog(false);
      setEditingCommitment(null);
    },
    onError: () => {
      toast({
        title: "Error al actualizar",
        description: "No se pudieron guardar los cambios",
        variant: "destructive"
      });
    }
  });

  const deleteCommitmentMutation = useMutation({
    mutationFn: (id: string) => {
      // Temporary guard to catch object ID issue
      if (typeof id !== 'string' || !id.trim() || id === '[object Object]') {
        console.error('[DEBUG] deleteCommitmentMutation received invalid ID:', id, typeof id);
        throw new Error(`deleteCommitmentMutation expects valid string ID but received ${typeof id}: ${id}`);
      }
      return apiRequest(`/api/actions/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/actions", { origin: "audit" }] });
      toast({
        title: "Compromiso eliminado",
        description: "El compromiso ha sido eliminado exitosamente"
      });
    },
    onError: () => {
      toast({
        title: "Error al eliminar compromiso",
        description: "No se pudo eliminar el compromiso",
        variant: "destructive"
      });
    },
  });

  // Delete audit test mutation
  const deleteAuditTestMutation = useMutation({
    mutationFn: (testId: string) => {
      return apiRequest(`/api/audit-tests/${testId}`, "DELETE");
    },
    onSuccess: () => {
      // Invalidate all relevant caches
      queryClient.invalidateQueries({ queryKey: ['/api/audit-tests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/audits'] });

      toast({
        title: "Prueba eliminada",
        description: "La prueba de auditoría ha sido eliminada exitosamente."
      });
      setShowDeleteTestDialog(false);
      setDeletingTest(null);
      setDeleteTestWarnings([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error al eliminar",
        description: error.message || "No se pudo eliminar la prueba",
        variant: "destructive"
      });
      setShowDeleteTestDialog(false);
    }
  });

  // Handle delete test button click
  const handleDeleteTest = async (test: AuditTest) => {
    try {
      // Check dependencies before showing dialog
      const response = await fetch(`/api/audit-tests/${test.id}/dependencies`);
      if (!response.ok) throw new Error("Failed to check dependencies");
      const dependencies = await response.json();
      setDeleteTestWarnings(dependencies.warnings || []);
      setDeletingTest(test);
      setShowDeleteTestDialog(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se puede verificar las dependencias",
        variant: "destructive"
      });
    }
  };

  // Confirm delete test
  const handleConfirmDeleteTest = () => {
    if (deletingTest) {
      deleteAuditTestMutation.mutate(deletingTest.id);
    }
  };

  // Mutación para completar hitos
  const completeMilestoneMutation = useMutation({
    mutationFn: async (milestoneId: string) => {
      return apiRequest(`/api/audit-milestones/${milestoneId}/complete`, "PUT");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
      toast({
        title: "Hito completado",
        description: "El hito ha sido marcado como completado exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error al completar hito",
        description: "No se pudo completar el hito",
        variant: "destructive",
      });
    }
  });

  // Mutación para actualizar hitos
  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest(`/api/audit-milestones/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
      setShowMilestoneDialog(false);
      setEditingMilestone(null);
      toast({
        title: "Hito actualizado",
        description: "El hito ha sido actualizado exitosamente"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el hito",
        variant: "destructive",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, deletionReason }: { id: string; deletionReason: string }) =>
      apiRequest(`/api/audits/${id}`, "DELETE", { deletionReason }),
    onMutate: async ({ id: deletedId }) => {
      // Cancelar cualquier refetch en progreso
      await queryClient.cancelQueries({ queryKey: ["/api/audits"] });

      // Guardar el estado previo
      const previousAudits = queryClient.getQueryData(["/api/audits"]);

      // Actualización optimista: remover la auditoría inmediatamente
      queryClient.setQueryData(["/api/audits"], (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        return old.filter((audit: any) => audit.id !== deletedId);
      });

      return { previousAudits };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trash"] });
      toast({ title: "Auditoría eliminada", description: "La auditoría ha sido eliminada exitosamente" });
      setAuditDelReason("");
    },
    onError: (error, { id: deletedId }, context) => {
      // Revertir cambios en caso de error
      if (context?.previousAudits) {
        queryClient.setQueryData(["/api/audits"], context.previousAudits);
      }
      console.error("Error al eliminar auditoría:", error);
      toast({
        title: "Error al eliminar auditoría",
        variant: "destructive",
        description: "Hubo un problema al eliminar la auditoría. Inténtalo de nuevo."
      });
    },
    onSettled: () => {
      // Invalidar para sincronizar con el servidor
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest(`/api/audits/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
      toast({
        title: "Auditoría actualizada",
        description: "Los cambios han sido guardados exitosamente"
      });
      setShowAuditDialog(false);
      setEditingAudit(null);
    },
    onError: () => {
      toast({
        title: "Error al actualizar",
        description: "No se pudieron guardar los cambios",
        variant: "destructive"
      });
    }
  });


  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/audits", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
      toast({
        title: "Auditoría creada",
        description: "La auditoría emergente ha sido creada exitosamente"
      });
      setShowAuditDialog(false);
      setEditingAudit(null);
    },
    onError: () => {
      toast({
        title: "Error al crear",
        description: "No se pudo crear la auditoría",
        variant: "destructive"
      });
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest(`/api/audits/${id}`, "PUT", { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
      toast({ title: "Estado actualizado", description: "El estado de la auditoría ha sido actualizado" });
    },
  });


  const createAuditFromPlanItem = useMutation({
    mutationFn: async (planItem: AuditPlanItemWithDetails) => {
      const entityType = planItem.universe.entityType;
      const auditData = {
        name: `Auditoría - ${planItem.universe.auditableEntity}`,
        type: "risk_based" as const,
        scope: `Auditoría del ${entityType === 'macroproceso' ? 'macroproceso' : entityType === 'process' ? 'proceso' : 'subproceso'}: ${planItem.universe.auditableEntity}`,
        objectives: [
          "Evaluar la efectividad de los controles implementados",
          "Verificar el cumplimiento de políticas y procedimientos",
          "Identificar oportunidades de mejora en la gestión de riesgos"
        ],
        planId: planItem.planId,
        processId: entityType === 'process' ? planItem.universe.processId : null,
        subprocesoId: entityType === 'subproceso' ? planItem.universe.subprocesoId : null,
        status: "planned" as const,
        priority: (planItem.prioritization?.calculatedRanking || 10) <= 5 ? "high" :
          (planItem.prioritization?.calculatedRanking || 10) <= 10 ? "medium" : "low",
        leadAuditor: planItem.proposedLeadAuditor || (auditTeamUsers.length > 0 ? auditTeamUsers[0].id : "user-1"),
        auditTeam: planItem.proposedTeamMembers || (auditTeamUsers.length > 0 ? [auditTeamUsers[0].id] : ["user-1"]),
      };

      const response = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(auditData),
      });
      if (!response.ok) throw new Error("Failed to create audit");
      const createdAudit = await response.json();

      // Update plan item status to "scheduled" to prevent creating it again
      await apiRequest(`/api/audit-plan-items/${planItem.id}`, "PUT", {
        status: "scheduled"
      });

      return createdAudit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/audit-plans"] });
      toast({
        title: "Auditoría creada exitosamente",
        description: "La auditoría ha sido creada desde el elemento del plan."
      });
    },
    onError: () => {
      toast({
        title: "Error al crear auditoría",
        variant: "destructive",
        description: "Hubo un problema al crear la auditoría. Inténtalo de nuevo."
      });
    },
  });


  const filteredAudits = audits.filter((audit: Audit) => {
    const matchesSearch = !searchTerm ||
      audit.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audit.code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || audit.status === statusFilter;
    const matchesType = typeFilter === "all" || audit.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Handle sorting
  const handleSort = (column: "code" | "name" | "type" | "process" | "leadAuditor" | "status") => {
    if (sortColumn === column) {
      // Si es la misma columna, alternar el orden
      if (sortOrder === "none" || sortOrder === "desc") {
        setSortOrder("asc");
      } else {
        setSortOrder("desc");
      }
    } else {
      // Nueva columna, empezar con orden ascendente
      setSortColumn(column);
      setSortOrder("asc");
    }
  };

  // Sort audits
  const sortedAudits = [...filteredAudits].sort((a, b) => {
    if (sortOrder === "none") return 0;

    let aValue: any, bValue: any;

    switch (sortColumn) {
      case "code":
        aValue = a.code || "";
        bValue = b.code || "";
        break;
      case "name":
        aValue = a.name?.toLowerCase() || "";
        bValue = b.name?.toLowerCase() || "";
        break;
      case "type":
        aValue = a.type || "";
        bValue = b.type || "";
        break;
      case "process":
        aValue = getProcessName(a.processId, a.subprocesoId);
        bValue = getProcessName(b.processId, b.subprocesoId);
        break;
      case "leadAuditor":
        aValue = getAuditorName(a.leadAuditor);
        bValue = getAuditorName(b.leadAuditor);
        break;
      case "status":
        aValue = a.status || "";
        bValue = b.status || "";
        break;
      default:
        return 0;
    }

    if (sortOrder === "asc") {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    }
  });


  const getProcessName = (processId: string | null, subprocesoId: string | null) => {
    if (subprocesoId) {
      const subproceso = subprocesos.find((s: Subproceso) => s.id === subprocesoId);
      return subproceso ? `Sub: ${subproceso.name}` : "Subproceso no encontrado";
    }
    if (processId) {
      const process = processes.find((p: Process) => p.id === processId);
      return process ? process.name : "Proceso no encontrado";
    }
    return "Sin asignar";
  };

  const getAuditorName = (auditorId: string) => {
    const auditor = auditTeamUsers.find((u: User) => u.id === auditorId);
    return auditor ? auditor.fullName : "No asignado";
  };

  // Filtrar usuarios que tengan roles de auditoría (del equipo auditor)
  const getAuditUsers = () => {
    const auditRoleNames = ["Supervisor de Auditoría", "Auditor", "Auditor Junior"];
    const auditRoleIds = roles
      .filter((role: any) => auditRoleNames.includes(role.name))
      .map((role: any) => role.id);

    const usersWithAuditRoles = userRoles
      .filter((ur: any) => auditRoleIds.includes(ur.roleId))
      .map((ur: any) => ur.userId);

    return users.filter((user: User) =>
      user.isActive && usersWithAuditRoles.includes(user.id)
    );
  };

  const auditTeamUsers = getAuditUsers();

  // Combine audit team and process owners for meeting participants
  const getMeetingParticipants = () => {
    const auditUsers = getAuditUsers();
    const owners = processOwners
      .filter((owner: any) => owner.isActive)
      .map((owner: any) => ({
        id: owner.id,
        fullName: owner.name,
        username: owner.email,
        email: owner.email,
        type: 'process_owner',
        isActive: owner.isActive
      }));

    // Combine both arrays and remove duplicates by id
    const combined = [...auditUsers.map((u: User) => ({ ...u, type: 'audit_user' })), ...owners];
    const uniqueById = combined.reduce((acc: any[], current: any) => {
      const existing = acc.find(item => item.id === current.id);
      if (!existing) {
        acc.push(current);
      }
      return acc;
    }, []);

    return uniqueById;
  };

  const meetingParticipants = getMeetingParticipants();

  const handleStartAudit = (auditId: string) => {
    statusMutation.mutate({ id: auditId, status: "in_progress" });
  };

  const handleCompleteAudit = (auditId: string) => {
    statusMutation.mutate({ id: auditId, status: "completed" });
  };

  const handleDeleteAudit = (audit: Audit) => {
    setDeleteConfirmAudit(audit);
    setAuditDelReason("");
  };

  const confirmDeleteAudit = () => {
    if (deleteConfirmAudit) {
      if (!auditDelReason.trim()) {
        toast({ title: "Motivo requerido", description: "Por favor ingrese el motivo de la eliminación.", variant: "destructive" });
        return;
      }
      deleteMutation.mutate({ id: deleteConfirmAudit.id, deletionReason: auditDelReason });
      setDeleteConfirmAudit(null);
    }
  };

  const handleAuditorLeaderChange = (auditId: string, newLeadAuditor: string) => {
    updateMutation.mutate({
      id: auditId,
      data: { leadAuditor: newLeadAuditor }
    });
    setEditingAuditorLeader(null);
  };

  const handleProcessChange = (auditId: string, processValue: string) => {
    if (processValue === "none") {
      updateMutation.mutate({
        id: auditId,
        data: { processId: null, subprocesoId: null }
      });
    } else {
      const [type, id] = processValue.split(':');
      const updateData = type === 'process'
        ? { processId: id, subprocesoId: null }
        : { processId: null, subprocesoId: id };

      updateMutation.mutate({
        id: auditId,
        data: updateData
      });
    }
    setEditingProcess(null);
  };

  const handleDateChange = (auditId: string, field: 'plannedStartDate' | 'plannedEndDate', value: string) => {
    const updateData = {
      [field]: value ? new Date(value + "T00:00:00.000Z") : null
    };

    updateMutation.mutate({
      id: auditId,
      data: updateData
    });
  };

  // Crear opciones combinadas para el selector de entidades
  const getScopeEntityOptions = () => {
    const options: Array<{ value: string; label: string; type: string }> = [];

    // Agregar macroprocesos
    macroprocesos.forEach((macro) => {
      options.push({
        value: `macro-${macro.id}`,
        label: `Macroproceso: ${macro.name}`,
        type: 'macroproceso'
      });
    });

    // Agregar procesos
    processes.forEach((process: Process) => {
      options.push({
        value: `process-${process.id}`,
        label: `Proceso: ${process.name}`,
        type: 'proceso'
      });
    });

    // Agregar subprocesos
    subprocesos.forEach((subproceso: Subproceso) => {
      options.push({
        value: `subproceso-${subproceso.id}`,
        label: `Subproceso: ${subproceso.name}`,
        type: 'subproceso'
      });
    });

    return options;
  };

  const scopeEntityOptions = getScopeEntityOptions();

  // Filter function for scope entity options
  const getFilteredScopeEntityOptions = () => {
    if (!scopeEntitySearchTerm.trim()) return scopeEntityOptions;
    return scopeEntityOptions.filter((option) =>
      option.label.toLowerCase().includes(scopeEntitySearchTerm.toLowerCase()) ||
      option.type.toLowerCase().includes(scopeEntitySearchTerm.toLowerCase())
    );
  };


  const handleReviewPeriodEdit = (audit: Audit) => {
    // Convertir fechas para el input date (formato YYYY-MM-DD)
    const startDate = audit.reviewPeriodStartDate ? new Date(audit.reviewPeriodStartDate).toISOString().split('T')[0] : "";
    const endDate = audit.reviewPeriodEndDate ? new Date(audit.reviewPeriodEndDate).toISOString().split('T')[0] : "";
    setReviewPeriodStartDate(startDate);
    setReviewPeriodEndDate(endDate);
    setEditingReviewPeriod(true);
  };

  const handleReviewPeriodSubmit = (auditId: string) => {
    if (!reviewPeriodStartDate || !reviewPeriodEndDate) {
      toast({ title: "Error", description: "Ambas fechas son requeridas", variant: "destructive" });
      return;
    }
    if (new Date(reviewPeriodStartDate) > new Date(reviewPeriodEndDate)) {
      toast({ title: "Error", description: "La fecha de inicio debe ser anterior a la fecha de fin", variant: "destructive" });
      return;
    }
    updateReviewPeriodMutation.mutate({ auditId, startDate: reviewPeriodStartDate, endDate: reviewPeriodEndDate });
  };

  // Funciones de manejo para selección múltiple de alcance
  const handleMultipleScopeEntityEdit = (audit: Audit) => {
    // Cargar las entidades seleccionadas actualmente (con validación temporal)
    const currentEntities = (audit as any).scopeEntities || [];
    setSelectedScopeEntities(currentEntities);
    setScopeEntitySearchTerm("");
    setEditingScopeEntity(true);
  };

  const handleMultipleScopeEntitySubmit = (auditId: string) => {
    if (selectedScopeEntities.length === 0) {
      toast({ title: "Error", description: "Debe seleccionar al menos una entidad", variant: "destructive" });
      return;
    }
    updateMultipleScopeEntitiesMutation.mutate({ auditId, entities: selectedScopeEntities });
  };

  if (isLoading) {
    return <div className="p-6">Cargando auditorías...</div>;
  }

  return (
    <div className="p-6" data-testid="audits-content">
      {/* Delete Confirmation Dialog - Audit */}
      <AlertDialog open={!!deleteConfirmAudit} onOpenChange={(open) => !open && setDeleteConfirmAudit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de que desea eliminar esta auditoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción moverá la auditoría "{deleteConfirmAudit?.name}" a la papelera. Podrá restaurarla desde allí si es necesario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="audit-deletion-reason" className="text-sm font-medium">
              Motivo de la eliminación <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="audit-deletion-reason"
              data-testid="input-deletion-reason"
              placeholder="Ingrese el motivo por el cual está eliminando esta auditoría..."
              value={auditDelReason}
              onChange={(e) => setAuditDelReason(e.target.value)}
              rows={3}
              className="resize-none mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Este motivo quedará registrado en el historial de auditoría.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmAudit(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAudit}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para crear desde plan */}
      <Dialog open={selectedPlan !== "all"} onOpenChange={(open) => {
        if (!open) {
          setSelectedPlan("all");
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear desde Plan de Auditoría</DialogTitle>
            <DialogDescription>
              Selecciona un elemento del plan anual para crear una auditoría planificada
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Plan de Auditoría:</label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger className="w-full" data-testid="select-audit-plan">
                  <SelectValue placeholder="Seleccionar plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Seleccionar...</SelectItem>
                  {auditPlans.map((plan: AuditPlan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - {plan.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPlan !== "all" && planItems.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Elementos Disponibles:</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {planItems
                    .filter((item: AuditPlanItemWithDetails) => item.status === "selected")
                    .map((item: AuditPlanItemWithDetails) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-accent">
                        <div>
                          <span className="font-medium">{item.universe.auditableEntity}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            #{item.prioritization.calculatedRanking}
                          </Badge>
                          <span className="text-xs text-muted-foreground block mt-1">
                            Score: {item.prioritization.riskScore}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => createAuditFromPlanItem.mutate(item)}
                          disabled={createAuditFromPlanItem.isPending}
                          data-testid={`button-create-audit-${item.id}`}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Crear
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {selectedPlan !== "all" && planItems.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay elementos disponibles en este plan
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para auditoría emergente */}
      <Dialog open={showAuditDialog} onOpenChange={(open) => {
        setShowAuditDialog(open);
        if (!open) {
          setEditingAudit(null);
          setRiskSearchTerm("");
          setProcessSearchTerm("");
          setSubprocessSearchTerm("");
          setScopeEntitySearchTerm("");
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAudit ? 'Editar Auditoría' : 'Crear Auditoría Emergente'}</DialogTitle>
            <DialogDescription>
              {editingAudit ? 'Modifica los detalles de la auditoría' : 'Crea una auditoría no planificada para situaciones imprevistas'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(async (data) => {
              if (editingAudit) {
                const updateData = {
                  ...data,
                  objectives: data.objectives || [],
                  plannedStartDate: data.plannedStartDate ? new Date(data.plannedStartDate + "T00:00:00.000Z") : null,
                  plannedEndDate: data.plannedEndDate ? new Date(data.plannedEndDate + "T00:00:00.000Z") : null,
                };

                // Actualizar auditoría
                updateMutation.mutate({ id: editingAudit.id, data: updateData }, {
                  onSuccess: async (updatedAudit: any) => {
                    // Actualizar el alcance (procesos y subprocesos)
                    if (data.selectedProcesses?.length > 0 || data.selectedSubprocesses?.length > 0) {
                      try {
                        await apiRequest(`/api/audits/${updatedAudit.id}/scope`, "PUT", {
                          processes: data.selectedProcesses || [],
                          subprocesses: data.selectedSubprocesses || []
                        });
                      } catch (error) {
                        console.error("Error updating audit scope:", error);
                      }
                    }
                  }
                });
              } else {
                // Crear auditoría emergente/no planificada
                // Generar scope automático si está vacío
                let generatedScope = data.scope;
                if (!generatedScope || generatedScope.trim() === "") {
                  if (data.selectedRisks && data.selectedRisks.length > 0) {
                    const selectedRiskNames = risks
                      .filter((r: any) => data.selectedRisks.includes(r.id))
                      .map((r: any) => r.name)
                      .join(", ");
                    generatedScope = `Auditoría emergente sobre riesgos: ${selectedRiskNames}`;
                  } else if (data.selectedProcesses && data.selectedProcesses.length > 0) {
                    const selectedProcessNames = processes
                      .filter((p: any) => data.selectedProcesses.includes(p.id))
                      .map((p: any) => p.name)
                      .join(", ");
                    generatedScope = `Auditoría emergente de procesos: ${selectedProcessNames}`;
                  } else {
                    generatedScope = `Auditoría emergente - ${data.name}`;
                  }
                }

                const auditData = {
                  ...data,
                  scope: generatedScope, // Usar scope generado o el proporcionado
                  type: data.type || "risk_based",
                  planId: null, // Auditoría emergente no tiene plan asociado
                  priority: "medium", // Prioridad por defecto
                  leadAuditor: data.leadAuditor || (auditTeamUsers.length > 0 ? auditTeamUsers[0].id : "user-1"), // Usar el seleccionado o primer disponible
                  auditTeam: auditTeamUsers.length > 0 ? [auditTeamUsers[0].id] : ["user-1"], // Primer auditor como equipo
                  associatedRisks: data.selectedRisks || [], // Agregar riesgos seleccionados
                  regulationId: data.type === "compliance" ? (data.regulationId || null) : null,
                  plannedStartDate: data.plannedStartDate ? new Date(data.plannedStartDate + "T00:00:00.000Z") : null,
                  plannedEndDate: data.plannedEndDate ? new Date(data.plannedEndDate + "T00:00:00.000Z") : null,
                  objectives: data.objectives && data.objectives.length > 0 ? data.objectives : [
                    "Auditoría emergente - Objetivos a definir durante la planificación"
                  ]
                };

                createMutation.mutate(auditData, {
                  onSuccess: async (newAudit: any) => {
                    // Guardar el alcance (procesos y subprocesos)
                    if (data.selectedProcesses?.length > 0 || data.selectedSubprocesses?.length > 0) {
                      try {
                        await apiRequest(`/api/audits/${newAudit.id}/scope`, "PUT", {
                          processes: data.selectedProcesses || [],
                          subprocesses: data.selectedSubprocesses || []
                        });
                      } catch (error) {
                        console.error("Error setting audit scope:", error);
                      }
                    }

                    // If it's a compliance audit with selected controls, create audit-control associations
                    if (data.type === "compliance" && data.selectedControls?.length > 0) {
                      try {
                        for (const controlId of data.selectedControls) {
                          // Find the corresponding risk for this control from the regulation controls
                          const controlItem = (regulationControls as any[]).find((item: any) => item.control.id === controlId);
                          const auditControlData = {
                            auditId: newAudit.id,
                            controlId: controlId,
                            riskId: controlItem?.risk?.id || null,
                            status: "pending",
                            testingApproach: "",
                            expectedResult: "",
                            actualResult: "",
                            complianceStatus: "pending",
                          };

                          await apiRequest("/api/audit-controls", "POST", auditControlData);
                        }
                      } catch (error) {
                        console.error("Error creating audit controls:", error);
                      }
                    }
                  }
                });
              }
            })}>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la Auditoría</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ingresa el nombre de la auditoría"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona el tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="risk_based">Basada en Riesgos</SelectItem>
                          <SelectItem value="compliance">Cumplimiento</SelectItem>
                          <SelectItem value="operational">Operacional</SelectItem>
                          <SelectItem value="financial">Financiera</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona el estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="borrador">Borrador</SelectItem>
                          <SelectItem value="en_revision">En Revisión</SelectItem>
                          <SelectItem value="alcance_aprobado">Alcance Aprobado</SelectItem>
                          <SelectItem value="en_ejecucion">En Ejecución</SelectItem>
                          <SelectItem value="cierre_tecnico">Cierre Técnico</SelectItem>
                          <SelectItem value="informe_preliminar">Informe Preliminar</SelectItem>
                          <SelectItem value="informe_final">Informe Final</SelectItem>
                          <SelectItem value="seguimiento">Seguimiento</SelectItem>
                          <SelectItem value="cancelado">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Compliance Audit Fields */}
                {form.watch("type") === "compliance" && (
                  <>
                    <FormField
                      control={form.control}
                      name="regulationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Normativa</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              // Reset selected controls when regulation changes
                              form.setValue("selectedControls", []);
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona la normativa" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(regulations as any[]).map((regulation: any) => (
                                <SelectItem key={regulation.id} value={regulation.id}>
                                  {regulation.name} ({regulation.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {selectedRegulationId && (
                      <FormField
                        control={form.control}
                        name="selectedControls"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Controles a Auditar</FormLabel>
                            <div className="border rounded-md p-3 max-h-32 overflow-y-auto space-y-2">
                              {(regulationControls as any[]).length > 0 ? (
                                (regulationControls as any[]).map((item: any) => (
                                  <div key={item.control.id} className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      id={`control-${item.control.id}`}
                                      checked={(field.value as string[])?.includes(item.control.id) || false}
                                      onChange={(e) => {
                                        const currentValue: string[] = field.value || [];
                                        if (e.target.checked) {
                                          field.onChange([...currentValue, item.control.id]);
                                        } else {
                                          field.onChange(currentValue.filter((id: string) => id !== item.control.id));
                                        }
                                      }}
                                      className="rounded border-gray-300"
                                    />
                                    <label htmlFor={`control-${item.control.id}`} className="text-sm cursor-pointer flex-1">
                                      <span className="font-medium">{item.control.name}</span>
                                      <span className="text-xs text-muted-foreground block">
                                        {item.control.type === 'preventive' ? 'Preventivo' :
                                          item.control.type === 'detective' ? 'Detective' : 'Correctivo'} -
                                        Riesgo: {item.risk.name}
                                      </span>
                                      {item.control.evidence && (
                                        <span className="text-blue-600 block text-xs mt-1">
                                          📋 Evidencia: {item.control.evidence}
                                        </span>
                                      )}
                                    </label>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-muted-foreground">No hay controles disponibles para esta normativa</p>
                              )}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </>
                )}

                <FormField
                  control={form.control}
                  name="scope"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alcance</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Describe el alcance de la auditoría"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Selección de Procesos para el Alcance */}
                <FormField
                  control={form.control}
                  name="selectedProcesses"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between mb-3">
                        <FormLabel>Procesos en el Alcance</FormLabel>
                        {getFilteredProcesses().length > 0 && (
                          <span className="text-sm text-muted-foreground">
                            {getFilteredProcesses().length} {getFilteredProcesses().length === 1 ? 'proceso' : 'procesos'} encontrado{getFilteredProcesses().length === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>

                      {/* Search input for processes */}
                      <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          type="text"
                          placeholder="Buscar por nombre, descripción o responsable..."
                          value={processSearchTerm}
                          onChange={(e) => setProcessSearchTerm(e.target.value)}
                          className="pl-10"
                          data-testid="input-search-processes"
                        />
                      </div>

                      <div className="border rounded-md p-3 max-h-32 overflow-y-auto space-y-2">
                        {getFilteredProcesses().length > 0 ? (
                          getFilteredProcesses().map((process: Process) => (
                            <div key={process.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`process-${process.id}`}
                                checked={(field.value as string[])?.includes(process.id) || false}
                                onChange={(e) => {
                                  const currentValue: string[] = field.value || [];
                                  if (e.target.checked) {
                                    field.onChange([...currentValue, process.id]);
                                  } else {
                                    field.onChange(currentValue.filter((id: string) => id !== process.id));
                                  }
                                }}
                                className="rounded border-gray-300"
                                data-testid={`checkbox-process-${process.id}`}
                              />
                              <label htmlFor={`process-${process.id}`} className="text-sm cursor-pointer flex-1">
                                <span className="font-medium">{process.name}</span>
                                <span className="text-xs text-muted-foreground block">
                                  {process.description}
                                </span>
                              </label>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {processSearchTerm ? 'No se encontraron procesos con ese criterio de búsqueda' : 'No hay procesos disponibles'}
                          </p>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Selección de Subprocesos para el Alcance */}
                <FormField
                  control={form.control}
                  name="selectedSubprocesses"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between mb-3">
                        <FormLabel>Subprocesos en el Alcance</FormLabel>
                        {getFilteredSubprocesses().length > 0 && (
                          <span className="text-sm text-muted-foreground">
                            {getFilteredSubprocesses().length} {getFilteredSubprocesses().length === 1 ? 'subproceso' : 'subprocesos'} encontrado{getFilteredSubprocesses().length === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>

                      {/* Search input for subprocesses */}
                      <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          type="text"
                          placeholder="Buscar por nombre, descripción o proceso padre..."
                          value={subprocessSearchTerm}
                          onChange={(e) => setSubprocessSearchTerm(e.target.value)}
                          className="pl-10"
                          data-testid="input-search-subprocesses"
                        />
                      </div>

                      <div className="border rounded-md p-3 max-h-32 overflow-y-auto space-y-2">
                        {getFilteredSubprocesses().length > 0 ? (
                          getFilteredSubprocesses().map((subproceso: Subproceso) => {
                            const parentProcess = processes.find((p: Process) => p.id === subproceso.procesoId);
                            return (
                              <div key={subproceso.id} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`subproceso-${subproceso.id}`}
                                  checked={(field.value as string[])?.includes(subproceso.id) || false}
                                  onChange={(e) => {
                                    const currentValue: string[] = field.value || [];
                                    if (e.target.checked) {
                                      field.onChange([...currentValue, subproceso.id]);
                                    } else {
                                      field.onChange(currentValue.filter((id: string) => id !== subproceso.id));
                                    }
                                  }}
                                  className="rounded border-gray-300"
                                  data-testid={`checkbox-subproceso-${subproceso.id}`}
                                />
                                <label htmlFor={`subproceso-${subproceso.id}`} className="text-sm cursor-pointer flex-1">
                                  <span className="font-medium">{subproceso.name}</span>
                                  <span className="text-xs text-muted-foreground block">
                                    Proceso padre: {parentProcess?.name || 'N/A'}
                                  </span>
                                </label>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {subprocessSearchTerm ? 'No se encontraron subprocesos con ese criterio de búsqueda' : 'No hay subprocesos disponibles'}
                          </p>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="leadAuditor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Auditor Líder</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona el auditor líder" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {auditTeamUsers.map((user: User) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.fullName} - {roles.find(r => userRoles.find(ur => ur.userId === user.id && ur.roleId === r.id))?.name || 'Sin rol'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="selectedRisks"
                  render={({ field }) => {
                    // Filtrar riesgos basado en el término de búsqueda
                    const filteredRisks = (risks as any[]).filter((risk: any) =>
                      risk.name.toLowerCase().includes(riskSearchTerm.toLowerCase()) ||
                      risk.code.toLowerCase().includes(riskSearchTerm.toLowerCase())
                    );

                    return (
                      <FormItem>
                        <FormLabel>Riesgos a Auditar</FormLabel>
                        {/* Campo de búsqueda */}
                        <div className="space-y-2">
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Buscar riesgo por nombre o código..."
                              value={riskSearchTerm}
                              onChange={(e) => setRiskSearchTerm(e.target.value)}
                              className="pl-8"
                              data-testid="input-risk-search"
                            />
                          </div>
                          {/* Lista de riesgos filtrados */}
                          <div className="border rounded-md p-3 max-h-32 overflow-y-auto space-y-2">
                            {filteredRisks.length > 0 ? (
                              filteredRisks.map((risk: any) => (
                                <div key={risk.id} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`risk-${risk.id}`}
                                    checked={(field.value as string[])?.includes(risk.id) || false}
                                    onChange={(e) => {
                                      const currentValue: string[] = field.value || [];
                                      if (e.target.checked) {
                                        field.onChange([...currentValue, risk.id]);
                                      } else {
                                        field.onChange(currentValue.filter((id: string) => id !== risk.id));
                                      }
                                    }}
                                    className="rounded border-gray-300"
                                  />
                                  <label htmlFor={`risk-${risk.id}`} className="text-sm cursor-pointer flex-1">
                                    <span className="font-medium">{risk.name}</span>
                                    <span className="text-xs text-muted-foreground ml-2">
                                      ({risk.code}) - Riesgo {risk.inherentRisk <= 5 ? 'Bajo' : risk.inherentRisk <= 15 ? 'Medio' : 'Alto'}
                                    </span>
                                  </label>
                                </div>
                              ))
                            ) : riskSearchTerm ? (
                              <p className="text-sm text-muted-foreground">No se encontraron riesgos que coincidan con "{riskSearchTerm}"</p>
                            ) : (
                              <p className="text-sm text-muted-foreground">No hay riesgos disponibles</p>
                            )}
                          </div>

                          {/* Mostrar riesgos seleccionados */}
                          {field.value && field.value.length > 0 && (
                            <div className="mt-3">
                              <Label className="text-sm font-medium text-green-700">Riesgos Seleccionados ({field.value.length})</Label>
                              <div className="border border-green-200 rounded-md p-3 mt-2 bg-green-50 space-y-2">
                                {field.value.map((riskId: string) => {
                                  const selectedRisk = (risks as any[]).find((risk: any) => risk.id === riskId);
                                  if (!selectedRisk) return null;

                                  return (
                                    <div key={riskId} className="flex items-center justify-between bg-white p-2 rounded border">
                                      <div className="flex-1">
                                        <span className="font-medium text-sm">{selectedRisk.name}</span>
                                        <span className="text-xs text-muted-foreground ml-2">
                                          ({selectedRisk.code}) - Riesgo {selectedRisk.inherentRisk <= 5 ? 'Bajo' : selectedRisk.inherentRisk <= 15 ? 'Medio' : 'Alto'}
                                        </span>
                                      </div>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          const currentValue: string[] = field.value || [];
                                          field.onChange(currentValue.filter((id: string) => id !== riskId));
                                        }}
                                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                        data-testid={`button-remove-risk-${riskId}`}
                                      >
                                        ×
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="plannedStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de Inicio Planificada *</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="plannedEndDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de Fin Planificada *</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Objetivos Específicos Editor */}
                <FormField
                  control={form.control}
                  name="objectives"
                  render={({ field }) => (
                    <FormItem>
                      <ObjectivesEditor
                        objectives={field.value || []}
                        onChange={field.onChange}
                        disabled={form.formState.isSubmitting}
                        className="mt-6"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAuditDialog(false);
                      setEditingAudit(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending || createMutation.isPending}
                  >
                    {updateMutation.isPending ? 'Guardando...' :
                      createMutation.isPending ? 'Creando...' :
                        (editingAudit ? 'Guardar Cambios' : 'Crear Auditoría Emergente')}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Tabla de auditorías */}
      <Card data-testid="card-audits-table" className="flex-1 flex flex-col">
        <CardContent className="p-0 flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="max-w-full min-w-0 overflow-x-auto">
            <ResponsiveTable variant="default" showScrollIndicator={true}>
              <ResponsiveTableContent variant="compact">
                <ResponsiveTableHeader variant="default">
                  <ResponsiveTableRow variant="default">
                    <ResponsiveTableHead variant="default" priority="high">
                      <div
                        className="flex items-center gap-1 cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("code")}
                        data-testid="sort-code"
                      >
                        Código
                        {sortColumn === "code" && sortOrder === "asc" && <ChevronUp className="h-3 w-3" />}
                        {sortColumn === "code" && sortOrder === "desc" && <ChevronDown className="h-3 w-3" />}
                      </div>
                    </ResponsiveTableHead>
                    <ResponsiveTableHead variant="default" priority="high">
                      <div
                        className="flex items-center gap-1 cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("name")}
                        data-testid="sort-name"
                      >
                        Nombre
                        {sortColumn === "name" && sortOrder === "asc" && <ChevronUp className="h-3 w-3" />}
                        {sortColumn === "name" && sortOrder === "desc" && <ChevronDown className="h-3 w-3" />}
                      </div>
                    </ResponsiveTableHead>
                    <ResponsiveTableHead variant="default" priority="medium">
                      <div
                        className="flex items-center gap-1 cursor-pointer hover:text-foreground"
                        onClick={() => handleSort("type")}
                        data-testid="sort-type"
                      >
                        Tipo
                        {sortColumn === "type" && sortOrder === "asc" && <ChevronUp className="h-3 w-3" />}
                        {sortColumn === "type" && sortOrder === "desc" && <ChevronDown className="h-3 w-3" />}
                      </div>
                    </ResponsiveTableHead>
                    <ResponsiveTableHead variant="default" priority="medium" className="min-w-[120px]">
                      <div
                        className="flex items-center gap-1 cursor-pointer hover:text-foreground whitespace-nowrap"
                        onClick={() => handleSort("process")}
                        data-testid="sort-process"
                      >
                        Proceso
                        {sortColumn === "process" && sortOrder === "asc" && <ChevronUp className="h-3 w-3" />}
                        {sortColumn === "process" && sortOrder === "desc" && <ChevronDown className="h-3 w-3" />}
                      </div>
                    </ResponsiveTableHead>
                    <ResponsiveTableHead variant="default" priority="low" className="min-w-[120px]">
                      <div
                        className="flex items-center gap-1 cursor-pointer hover:text-foreground whitespace-nowrap"
                        onClick={() => handleSort("leadAuditor")}
                        data-testid="sort-lead-auditor"
                      >
                        Auditor Líder
                        {sortColumn === "leadAuditor" && sortOrder === "asc" && <ChevronUp className="h-3 w-3" />}
                        {sortColumn === "leadAuditor" && sortOrder === "desc" && <ChevronDown className="h-3 w-3" />}
                      </div>
                    </ResponsiveTableHead>
                    <ResponsiveTableHead variant="default" priority="high" className="min-w-[110px]">
                      <div
                        className="flex items-center gap-1 cursor-pointer hover:text-foreground whitespace-nowrap"
                        onClick={() => handleSort("status")}
                        data-testid="sort-status"
                      >
                        Estado
                        {sortColumn === "status" && sortOrder === "asc" && <ChevronUp className="h-3 w-3" />}
                        {sortColumn === "status" && sortOrder === "desc" && <ChevronDown className="h-3 w-3" />}
                      </div>
                    </ResponsiveTableHead>
                    <ResponsiveTableHead variant="default" priority="medium">Fechas</ResponsiveTableHead>
                    <ResponsiveTableHead variant="default" priority="low">Acciones</ResponsiveTableHead>
                  </ResponsiveTableRow>
                </ResponsiveTableHeader>
                <ResponsiveTableBody variant="default">
                  {sortedAudits.map((audit: Audit) => (
                    <ResponsiveTableRow key={audit.id} data-testid={`row-audit-${audit.id}`} variant="default">
                      <ResponsiveTableCell variant="default" priority="high" label="Código">
                        <Badge variant="outline" className="font-mono">
                          {audit.code}
                        </Badge>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell variant="default" priority="high" label="Nombre">
                        <p
                          className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer hover:underline transition-colors truncate max-w-[200px]"
                          onClick={() => setLocation(`/audits/${audit.id}`)}
                          data-testid={`text-audit-name-${audit.id}`}
                        >
                          {audit.name}
                        </p>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell variant="default" priority="medium" label="Tipo">
                        <Badge variant="secondary">
                          {getTypeText(audit.type)}
                        </Badge>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell variant="default" priority="medium" label="Proceso/Subproceso">
                        {editingProcess === audit.id ? (
                          <Select
                            value={audit.subprocesoId ? `subproceso:${audit.subprocesoId}` : audit.processId ? `process:${audit.processId}` : 'none'}
                            onValueChange={(value) => handleProcessChange(audit.id, value)}
                            onOpenChange={(open) => {
                              if (!open) setEditingProcess(null);
                            }}
                          >
                            <SelectTrigger className="w-48 h-8">
                              <SelectValue placeholder="Seleccionar proceso" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sin asignar</SelectItem>
                              {processes.map((process: Process) => (
                                <SelectItem key={process.id} value={`process:${process.id}`}>
                                  📋 {process.name}
                                </SelectItem>
                              ))}
                              {subprocesos.map((subproceso: Subproceso) => (
                                <SelectItem key={subproceso.id} value={`subproceso:${subproceso.id}`}>
                                  📄 Sub: {subproceso.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span
                            className="cursor-pointer hover:text-blue-600 hover:underline"
                            onClick={() => setEditingProcess(audit.id)}
                            data-testid={`process-${audit.id}`}
                          >
                            {getProcessName(audit.processId, audit.subprocesoId)}
                          </span>
                        )}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell variant="default" priority="low" label="Auditor Líder">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {editingAuditorLeader === audit.id ? (
                            <Select
                              value={audit.leadAuditor}
                              onValueChange={(value) => handleAuditorLeaderChange(audit.id, value)}
                              onOpenChange={(open) => {
                                if (!open) setEditingAuditorLeader(null);
                              }}
                            >
                              <SelectTrigger className="w-40 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {auditTeamUsers.map((user: User) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.fullName} - {roles.find(r => userRoles.find(ur => ur.userId === user.id && ur.roleId === r.id))?.name || 'Sin rol'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span
                              className="cursor-pointer hover:text-blue-600 hover:underline"
                              onClick={() => setEditingAuditorLeader(audit.id)}
                              data-testid={`auditor-leader-${audit.id}`}
                            >
                              {getAuditorName(audit.leadAuditor)}
                            </span>
                          )}
                        </div>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell variant="default" priority="high" label="Estado">
                        <Badge className={getStatusColor(audit.status)}>
                          {getStatusText(audit.status)}
                        </Badge>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell variant="default" priority="medium" label="Fechas">
                        <div className="space-y-1.5">
                          <DateCell
                            auditId={audit.id}
                            field="plannedStartDate"
                            value={audit.plannedStartDate ? new Date(audit.plannedStartDate) : null}
                            onCommit={handleDateChange}
                            size="sm"
                            renderTrigger={(date) => (
                              <Badge variant="outline" className="flex items-center bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800 gap-1.5 px-2.5 py-1 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900 transition-colors w-full justify-start">
                                <Calendar className="h-3.5 w-3.5" />
                                <span className="text-xs font-medium">Inicio:</span>
                                <span className="text-xs">{date ? format(date, "dd/MM/yyyy", { locale: es }) : "No definido"}</span>
                              </Badge>
                            )}
                          />
                          <DateCell
                            auditId={audit.id}
                            field="plannedEndDate"
                            value={audit.plannedEndDate ? new Date(audit.plannedEndDate) : null}
                            onCommit={handleDateChange}
                            size="sm"
                            renderTrigger={(date) => (
                              <Badge variant="outline" className="flex items-center bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 gap-1.5 px-2.5 py-1 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors w-full justify-start">
                                <CalendarCheck className="h-3.5 w-3.5" />
                                <span className="text-xs font-medium">Fin:</span>
                                <span className="text-xs">{date ? format(date, "dd/MM/yyyy", { locale: es }) : "No definido"}</span>
                              </Badge>
                            )}
                          />
                        </div>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell variant="default" priority="low" label="Acciones">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`button-actions-${audit.id}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {audit.status === "planned" && (
                              <DropdownMenuItem
                                onClick={() => handleStartAudit(audit.id)}
                                data-testid={`menu-start-${audit.id}`}
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Iniciar Auditoría
                              </DropdownMenuItem>
                            )}
                            {(audit.status === "in_progress" || audit.status === "fieldwork") && (
                              <DropdownMenuItem
                                onClick={() => handleCompleteAudit(audit.id)}
                                data-testid={`menu-complete-${audit.id}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Completar Auditoría
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => setLocation(`/audits/${audit.id}`)}
                              data-testid={`menu-details-${audit.id}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingAudit(audit);
                                setShowAuditDialog(true);
                              }}
                              data-testid={`menu-edit-${audit.id}`}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteAudit(audit)}
                              disabled={deleteMutation.isPending}
                              className="text-destructive focus:text-destructive"
                              data-testid={`menu-delete-${audit.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </ResponsiveTableCell>
                    </ResponsiveTableRow>
                  ))}
                </ResponsiveTableBody>
              </ResponsiveTableContent>
            </ResponsiveTable>
          </div>

          {sortedAudits.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron auditorías que coincidan con los filtros aplicados.
            </div>
          )}
        </CardContent>
      </Card>


      {/* Diálogo para agregar actividad al programa de trabajo */}
      <Dialog open={showWorkplanDialog} onOpenChange={setShowWorkplanDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agregar Actividad al Programa de Trabajo</DialogTitle>
            <DialogDescription>
              Agrega una nueva actividad o prueba de auditoría al programa de trabajo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workplan-name">Nombre de la Actividad *</Label>
              <Input
                id="workplan-name"
                data-testid="input-workplan-name"
                value={workplanFormData.name}
                onChange={(e) => setWorkplanFormData({ ...workplanFormData, name: e.target.value })}
                placeholder="Ej: Revisión de controles de inventario"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workplan-description">Descripción</Label>
              <Textarea
                id="workplan-description"
                data-testid="textarea-workplan-description"
                value={workplanFormData.description}
                onChange={(e) => setWorkplanFormData({ ...workplanFormData, description: e.target.value })}
                placeholder="Describe los objetivos y procedimientos de esta actividad"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="workplan-hours">Horas Estimadas</Label>
                <Input
                  id="workplan-hours"
                  type="number"
                  data-testid="input-workplan-hours"
                  value={workplanFormData.estimatedHours}
                  onChange={(e) => setWorkplanFormData({ ...workplanFormData, estimatedHours: e.target.value })}
                  placeholder="16"
                  min="0"
                  step="0.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workplan-priority">Prioridad</Label>
                <Select
                  value={workplanFormData.priority}
                  onValueChange={(value) => setWorkplanFormData({ ...workplanFormData, priority: value })}
                >
                  <SelectTrigger data-testid="select-workplan-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workplan-assigned">Auditor Asignado</Label>
              <Select
                value={workplanFormData.assignedTo}
                onValueChange={(value) => setWorkplanFormData({ ...workplanFormData, assignedTo: value })}
              >
                <SelectTrigger data-testid="select-workplan-assigned">
                  <SelectValue placeholder="Seleccionar auditor" />
                </SelectTrigger>
                <SelectContent>
                  {auditTeamUsers.map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.fullName || user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="workplan-start">Fecha de Inicio</Label>
                <Input
                  id="workplan-start"
                  type="date"
                  data-testid="input-workplan-start"
                  value={workplanFormData.plannedStartDate}
                  onChange={(e) => setWorkplanFormData({ ...workplanFormData, plannedStartDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="workplan-end">Fecha de Fin</Label>
                <Input
                  id="workplan-end"
                  type="date"
                  data-testid="input-workplan-end"
                  value={workplanFormData.plannedEndDate}
                  onChange={(e) => setWorkplanFormData({ ...workplanFormData, plannedEndDate: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowWorkplanDialog(false);
                  setWorkplanFormData({
                    name: "",
                    description: "",
                    estimatedHours: "",
                    assignedTo: "",
                    priority: "medium",
                    plannedStartDate: "",
                    plannedEndDate: ""
                  });
                }}
                disabled={createAuditTestMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!workplanFormData.name) {
                    toast({
                      title: "Campo requerido",
                      description: "El nombre de la actividad es requerido",
                      variant: "destructive"
                    });
                    return;
                  }

                  const testData = {
                    testName: workplanFormData.name,
                    description: workplanFormData.description,
                    estimatedHours: workplanFormData.estimatedHours ? parseFloat(workplanFormData.estimatedHours) : 0,
                    executorId: workplanFormData.assignedTo || null,
                    priority: workplanFormData.priority,
                    plannedStartDate: workplanFormData.plannedStartDate ? workplanFormData.plannedStartDate : null,
                    plannedEndDate: workplanFormData.plannedEndDate ? workplanFormData.plannedEndDate : null,
                    status: "pending",
                    progress: 0
                  };

                  createAuditTestMutation.mutate(testData);
                }}
                disabled={createAuditTestMutation.isPending}
                data-testid="button-save-workplan-activity"
              >
                {createAuditTestMutation.isPending ? "Creando..." : "Crear Actividad"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Milestone Edit Dialog */}
      <Dialog open={showMilestoneDialog} onOpenChange={setShowMilestoneDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Hito</DialogTitle>
            <DialogDescription>
              Actualiza la información del hito del proyecto de auditoría
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="milestone-name">Nombre del Hito *</Label>
              <Input
                id="milestone-name"
                value={milestoneFormData.name}
                onChange={(e) => setMilestoneFormData({ ...milestoneFormData, name: e.target.value })}
                placeholder="Ej: Reunión de inicio"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="milestone-description">Descripción</Label>
              <Textarea
                id="milestone-description"
                value={milestoneFormData.description}
                onChange={(e) => setMilestoneFormData({ ...milestoneFormData, description: e.target.value })}
                placeholder="Describe los objetivos de este hito"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <div className="space-y-2">
                <Label htmlFor="milestone-type">Tipo de Reunión</Label>
                <Select
                  value={milestoneFormData.type}
                  onValueChange={(value) => setMilestoneFormData({ ...milestoneFormData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reunion_inicio">Reunión de Inicio</SelectItem>
                    <SelectItem value="reunion_cierre">Reunión de Cierre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(milestoneFormData.type === "reunion_inicio" || milestoneFormData.type === "reunion_cierre") && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="milestone-meeting-date">Fecha de Reunión *</Label>
                  <Input
                    id="milestone-meeting-date"
                    type="date"
                    value={milestoneFormData.meetingDate}
                    onChange={(e) => setMilestoneFormData({ ...milestoneFormData, meetingDate: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="milestone-participants">Participantes</Label>
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (!milestoneFormData.participants.includes(value)) {
                        setMilestoneFormData({
                          ...milestoneFormData,
                          participants: [...milestoneFormData.participants, value]
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Agregar participante..." />
                    </SelectTrigger>
                    <SelectContent>
                      {meetingParticipants
                        .filter((p: any) => !milestoneFormData.participants.includes(p.id))
                        .map((participant: any) => (
                          <SelectItem key={participant.id} value={participant.id}>
                            {participant.fullName || participant.username}
                            {participant.type === 'process_owner' && ' (Dueño de Proceso)'}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {milestoneFormData.participants.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {milestoneFormData.participants.map(participantId => {
                        const participant = meetingParticipants.find((p: any) => p.id === participantId);
                        return (
                          <Badge
                            key={participantId}
                            variant="secondary"
                            className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => {
                              setMilestoneFormData({
                                ...milestoneFormData,
                                participants: milestoneFormData.participants.filter(p => p !== participantId)
                              });
                            }}
                          >
                            {participant?.fullName || participant?.username}
                            {participant?.type === 'process_owner' && ' (DP)'}
                            <span className="ml-1">×</span>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Selecciona del equipo de auditoría o dueños de proceso. Haz clic en un badge para remover.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="milestone-minutes-url">URL de Minuta de Reunión</Label>
                  <Input
                    id="milestone-minutes-url"
                    type="url"
                    value={milestoneFormData.meetingMinutesUrl}
                    onChange={(e) => setMilestoneFormData({ ...milestoneFormData, meetingMinutesUrl: e.target.value })}
                    placeholder="https://..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Enlace al documento de minuta de la reunión (ej: Google Docs, OneDrive)
                  </p>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowMilestoneDialog(false);
                  setEditingMilestone(null);
                }}
                disabled={updateMilestoneMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  // Validación: nombre es requerido
                  if (!milestoneFormData.name) {
                    toast({
                      title: "Campos requeridos",
                      description: "El nombre es requerido",
                      variant: "destructive"
                    });
                    return;
                  }

                  // Para tipo reunión, validar que tenga fecha de reunión
                  const isMeetingType = milestoneFormData.type === "meeting" ||
                    milestoneFormData.type === "reunion_inicio" ||
                    milestoneFormData.type === "reunion_cierre";

                  if (isMeetingType && !milestoneFormData.meetingDate) {
                    toast({
                      title: "Campos requeridos",
                      description: "La fecha de reunión es requerida",
                      variant: "destructive"
                    });
                    return;
                  }

                  // Para otros tipos, validar que tenga fecha planificada
                  if (!isMeetingType && !milestoneFormData.plannedDate) {
                    toast({
                      title: "Campos requeridos",
                      description: "La fecha planificada es requerida",
                      variant: "destructive"
                    });
                    return;
                  }

                  const updateData: any = {
                    name: milestoneFormData.name,
                    description: milestoneFormData.description,
                    type: milestoneFormData.type,
                    // Para tipo reunión, usar fecha de reunión como fecha planificada
                    plannedDate: isMeetingType
                      ? milestoneFormData.meetingDate
                      : milestoneFormData.plannedDate
                  };

                  if (isMeetingType) {
                    if (milestoneFormData.meetingDate) {
                      updateData.meetingDate = milestoneFormData.meetingDate;
                    }
                    updateData.participants = milestoneFormData.participants;
                    if (milestoneFormData.meetingMinutesUrl) {
                      updateData.meetingMinutesUrl = milestoneFormData.meetingMinutesUrl;
                    }
                  }

                  updateMilestoneMutation.mutate({
                    id: editingMilestone.id,
                    data: updateData
                  });
                }}
                disabled={updateMilestoneMutation.isPending}
              >
                {updateMilestoneMutation.isPending ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Delete Test Confirmation Dialog */}
      <AlertDialog
        open={showDeleteTestDialog}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingTest(null);
            setDeleteTestWarnings([]);
          }
          setShowDeleteTestDialog(open);
        }}
      >
        <AlertDialogContent data-testid="dialog-delete-test">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar prueba de auditoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la prueba "{deletingTest?.name}" y todos sus datos asociados.

              {deleteTestWarnings.length > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="font-semibold text-yellow-900 mb-2">Advertencias:</p>
                  <ul className="list-disc list-inside space-y-1 text-yellow-800">
                    {deleteTestWarnings.map((warning, index) => (
                      <li key={index} className="text-sm">{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-test">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteTest}
              disabled={deleteAuditTestMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-test"
            >
              {deleteAuditTestMutation.isPending ? "Eliminando..." : "Eliminar Prueba"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
