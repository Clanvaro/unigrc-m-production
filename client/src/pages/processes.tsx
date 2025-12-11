import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Eye, Edit, Trash2, ChevronDown, ChevronRight, Building2, Workflow, GitBranch, AlertTriangle, Shield, Calculator, Hash, User, CheckCircle, Clock, XCircle, Play } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ProcessForm from "@/components/forms/process-form";
import SubprocessForm from "@/components/forms/subprocess-form";
import MacroprocesoForm from "@/components/forms/macroproceso-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RiskValue } from "@/components/RiskValue";
import type { Macroproceso, Process, Subproceso, Risk, ProcessOwner, ProcessValidation } from "@shared/schema";
import { calculateProbability, type ProbabilityFactors } from "@shared/probability-calculation";
import { EditGuard, DeleteGuard } from "@/components/auth/permission-guard";

interface MacroprocesoWithRisks extends Macroproceso {
  inherentRisk?: number;
  residualRisk?: number;
  riskCount?: number;
}

interface ProcessWithRisks extends Process {
  inherentRisk?: number;
  residualRisk?: number;
  riskCount?: number;
  owner?: ProcessOwner | null;
}

interface SubprocesoWithRisks extends Subproceso {
  inherentRisk?: number;
  residualRisk?: number;
  riskCount?: number;
  owner?: ProcessOwner | null;
}

// Función para determinar el color del riesgo
function getRiskColor(risk: number): string {
  if (risk === 0) return "bg-gray-100 text-gray-600";
  if (risk <= 6) return "bg-green-100 text-green-700";
  if (risk <= 12) return "bg-yellow-100 text-yellow-700";
  if (risk <= 16) return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

// Función para obtener la etiqueta del nivel de riesgo
function getRiskLevel(risk: number): string {
  if (risk === 0) return "Sin riesgo";
  if (risk <= 6) return "Bajo";
  if (risk <= 12) return "Medio";
  if (risk <= 16) return "Alto";
  return "Crítico";
}

// Componente para mostrar indicadores de riesgo
function RiskIndicator({ 
  inherentRisk = 0, 
  residualRisk = 0, 
  riskCount = 0,
  size = "sm",
  onRiskCountClick 
}: { 
  inherentRisk?: number; 
  residualRisk?: number; 
  riskCount?: number;
  size?: "xs" | "sm" | "md";
  onRiskCountClick?: () => void;
}) {
  if (riskCount === 0) {
    return (
      <div className="flex items-center gap-1">
        <Badge variant="outline" className={`text-xs ${size === "xs" ? "px-1 py-0" : ""}`}>
          <Shield className={`h-3 w-3 mr-1 ${size === "xs" ? "h-2 w-2" : ""}`} />
          Sin riesgos
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Badge className={`text-xs ${getRiskColor(inherentRisk)} ${size === "xs" ? "px-1 py-0" : ""}`}>
        <AlertTriangle className={`h-3 w-3 mr-1 ${size === "xs" ? "h-2 w-2" : ""}`} />
        I: <RiskValue value={inherentRisk} />
      </Badge>
      <Badge className={`text-xs ${getRiskColor(residualRisk)} ${size === "xs" ? "px-1 py-0" : ""}`}>
        <Shield className={`h-3 w-3 mr-1 ${size === "xs" ? "h-2 w-2" : ""}`} />
        R: <RiskValue value={residualRisk} />
      </Badge>
      <Badge 
        variant="secondary" 
        className={`text-xs ${size === "xs" ? "px-1 py-0" : ""} ${riskCount > 0 ? "cursor-pointer hover:bg-secondary/80" : ""}`}
        onClick={riskCount > 0 ? onRiskCountClick : undefined}
        data-testid="badge-risk-count"
      >
        {riskCount} riesgo{riskCount !== 1 ? "s" : ""}
      </Badge>
    </div>
  );
}

// Componente para mostrar indicadores de riesgo residual
function ResidualRiskIndicator({ 
  level,
  color,
  label,
  size = "sm",
  onClick 
}: { 
  level: number;
  color: string;
  label: string;
  size?: "xs" | "sm" | "md";
  onClick?: () => void;
}) {
  return (
    <Badge 
      className={`text-xs ${color} ${size === "xs" ? "px-1 py-0" : ""} ${onClick ? "cursor-pointer hover:opacity-80" : ""}`}
      onClick={onClick}
      data-testid={`residual-risk-${label.toLowerCase()}`}
    >
      <Calculator className={`h-3 w-3 mr-1 ${size === "xs" ? "h-2 w-2" : ""}`} />
      R: {label} {level > 0 && level}
    </Badge>
  );
}

// Componente para mostrar indicadores de estado de validación
function ValidationIndicator({ 
  status,
  completionPercentage = 0,
  size = "sm",
  onClick 
}: { 
  status: string;
  completionPercentage?: number;
  size?: "xs" | "sm" | "md";
  onClick?: () => void;
}) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
        return { 
          icon: CheckCircle, 
          color: "bg-green-100 text-green-700", 
          label: "Validado" 
        };
      case "in_progress":
        return { 
          icon: Clock, 
          color: "bg-yellow-100 text-yellow-700", 
          label: "En Progreso" 
        };
      case "requires_review":
        return { 
          icon: AlertTriangle, 
          color: "bg-orange-100 text-orange-700", 
          label: "Requiere Revisión" 
        };
      case "not_started":
      default:
        return { 
          icon: XCircle, 
          color: "bg-gray-100 text-gray-600", 
          label: "Sin Validar" 
        };
    }
  };

  const { icon: Icon, color, label } = getStatusConfig(status);

  return (
    <Badge 
      className={`text-xs ${color} ${size === "xs" ? "px-1 py-0" : ""} ${onClick ? "cursor-pointer hover:opacity-80" : ""}`}
      onClick={onClick}
      data-testid={`validation-status-${status}`}
    >
      <Icon className={`h-3 w-3 mr-1 ${size === "xs" ? "h-2 w-2" : ""}`} />
      {label} {completionPercentage > 0 && `(${Math.round(completionPercentage)}%)`}
    </Badge>
  );
}

export default function Processes() {
  const [isCreateProcessDialogOpen, setIsCreateProcessDialogOpen] = useState(false);
  const [isCreateSubprocessDialogOpen, setIsCreateSubprocessDialogOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState<Process | null>(null);
  const [editingSubprocess, setEditingSubprocess] = useState<Subproceso | null>(null);
  const [editingMacroproceso, setEditingMacroproceso] = useState<Macroproceso | null>(null);
  const [selectedMacroprocesoId, setSelectedMacroprocesoId] = useState<string | null>(null);
  const [selectedProcesoId, setSelectedProcesoId] = useState<string | null>(null);
  const [expandedMacroprocesos, setExpandedMacroprocesos] = useState<Set<string>>(new Set());
  const [expandedProcesos, setExpandedProcesos] = useState<Set<string>>(new Set());
  const [expandedSubprocesos, setExpandedSubprocesos] = useState<Set<string>>(new Set());
  const [riskModalOpen, setRiskModalOpen] = useState(false);
  const [selectedEntityRisks, setSelectedEntityRisks] = useState<{risks: Risk[], entityName: string, entityType: string}>({ risks: [], entityName: '', entityType: '' });
  const [selectedEntityForRisks, setSelectedEntityForRisks] = useState<{id: string, type: 'macroproceso' | 'proceso' | 'subproceso'} | null>(null);
  const [sortField, setSortField] = useState<'name' | 'code' | 'residualRisk' | 'order'>('order');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [draggedMacroproceso, setDraggedMacroproceso] = useState<MacroprocesoWithRisks | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Delete confirmation states
  const [deleteConfirmMacroproceso, setDeleteConfirmMacroproceso] = useState<Macroproceso | null>(null);
  const [macroprocesoDelReason, setMacroprocesoDelReason] = useState("");
  const [deleteConfirmProcess, setDeleteConfirmProcess] = useState<Process | null>(null);
  const [processDelReason, setProcessDelReason] = useState("");
  const [deleteConfirmSubprocess, setDeleteConfirmSubprocess] = useState<Subproceso | null>(null);
  const [subprocessDelReason, setSubprocessDelReason] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: macroprocesos = [], isLoading: isLoadingMacroprocesos } = useQuery<MacroprocesoWithRisks[]>({
    queryKey: ["/api/macroprocesos"],
    staleTime: 60000, // 1 minute - list data, moderate change frequency
  });

  // Load basic processes without heavy risk calculations for fast initial load
  const { data: basicProcesses = [] } = useQuery<ProcessWithRisks[]>({
    queryKey: ["/api/processes/basic"],
    staleTime: 120000, // 2 minutos - reducir refetches durante navegación rápida
  });

  // Legacy full processes query (kept for compatibility with other components)
  const { data: processes = [] } = useQuery<ProcessWithRisks[]>({
    queryKey: ["/api/processes"],
    staleTime: 120000, // 2 minutos - reducir refetches durante navegación rápida
    enabled: false, // Disabled by default, enable only when needed
  });

  const { data: subprocesos = [] } = useQuery<SubprocesoWithRisks[]>({
    queryKey: ["/api/subprocesos"],
    staleTime: 120000, // 2 minutos - reducir refetches durante navegación rápida
  });

  const { data: risksResponse } = useQuery<{ data: Risk[], pagination: { limit: number, offset: number, total: number } }>({
    queryKey: ["/api/risks"],
    staleTime: 120000, // 2 minutos - reducir refetches durante navegación rápida
    enabled: riskModalOpen || macroprocesos.some(m => (m.riskCount ?? 0) > 0), // Load when modal is open or when there are risks
  });
  const risks = risksResponse?.data || [];

  // Load process validations only when needed to reduce initial load
  const { data: processValidations = [] } = useQuery<ProcessValidation[]>({
    queryKey: ["/api/process-validations"],
    staleTime: 30000, // 30 seconds - validation states change frequently
    enabled: false, // Load only when validation data is needed
  });

  // Effect to update selectedEntityRisks when risks are loaded
  useEffect(() => {
    if (risks.length > 0 && selectedEntityForRisks && riskModalOpen) {
      let entityRisks: Risk[] = [];
      
      switch (selectedEntityForRisks.type) {
        case 'macroproceso':
          entityRisks = getRisksByMacroproceso(selectedEntityForRisks.id);
          break;
        case 'proceso':
          entityRisks = getRisksByProcess(selectedEntityForRisks.id);
          break;
        case 'subproceso':
          entityRisks = getRisksBySubproceso(selectedEntityForRisks.id);
          break;
      }
      
      setSelectedEntityRisks(prev => ({
        ...prev,
        risks: entityRisks
      }));
    }
  }, [risks, selectedEntityForRisks, riskModalOpen]);

  // Hook to load process summary on demand
  const useProcessSummary = (processId: string, enabled: boolean = false) => {
    return useQuery({
      queryKey: ["/api/processes", processId, "summary"],
      queryFn: () => fetch(`/api/processes/${processId}/summary`).then(res => res.json()),
      staleTime: 60000, // 1 minute - summary data, moderate change frequency
      enabled: enabled && !!processId,
    });
  };

  // Enable full data queries when needed for operations like editing, risk viewing, etc.
  const enableFullQueries = () => {
    queryClient.refetchQueries({ queryKey: ["/api/processes"] });
    queryClient.refetchQueries({ queryKey: ["/api/risks"] }); 
    queryClient.refetchQueries({ queryKey: ["/api/process-validations"] });
  };

  const deleteProcessMutation = useMutation({
    mutationFn: ({ id, deletionReason }: { id: string; deletionReason: string }) => 
      apiRequest(`/api/processes/${id}`, "DELETE", { deletionReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/processes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/processes/basic"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trash"] });
      toast({ title: "Proceso eliminado", description: "El proceso ha sido eliminado exitosamente." });
      setProcessDelReason("");
    },
    onError: (error: any) => {
      let errorMessage = "No se pudo eliminar el proceso.";
      
      if (error?.message?.includes("Cannot delete process with linked risks or subprocesses")) {
        errorMessage = "No se puede eliminar el proceso porque tiene riesgos o subprocesos asociados. Elimine primero todos los elementos vinculados.";
      } else if (error?.message?.includes("Cannot delete the last process of a macroproceso")) {
        errorMessage = "No se puede eliminar el último proceso de un macroproceso. Todo macroproceso debe tener al menos un proceso.";
      }
      
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    },
  });

  const deleteSubprocessMutation = useMutation({
    mutationFn: ({ id, deletionReason }: { id: string; deletionReason: string }) => 
      apiRequest(`/api/subprocesos/${id}`, "DELETE", { deletionReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subprocesos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trash"] });
      toast({ title: "Subproceso eliminado", description: "El subproceso ha sido eliminado exitosamente." });
      setSubprocessDelReason("");
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo eliminar el subproceso.", variant: "destructive" });
    },
  });

  const deleteMacroprocesoMutation = useMutation({
    mutationFn: ({ id, deletionReason }: { id: string; deletionReason: string }) => 
      apiRequest(`/api/macroprocesos/${id}`, "DELETE", { deletionReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/macroprocesos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trash"] });
      toast({ title: "Macroproceso eliminado", description: "El macroproceso ha sido eliminado exitosamente." });
      setMacroprocesoDelReason("");
    },
    onError: (error: any) => {
      const errorMessage = error?.message?.includes("Cannot delete macroproceso with linked processes")
        ? "No se puede eliminar el macroproceso porque tiene procesos asociados. Elimine primero todos los procesos vinculados."
        : "No se pudo eliminar el macroproceso.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    },
  });

  const reorderMacroprocesosMutation = useMutation({
    mutationFn: (updates: { id: string; order: number }[]) => 
      apiRequest("/api/macroprocesos/reorder", "PUT", { updates }),
    onMutate: async (updates) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/macroprocesos"] });
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData(["/api/macroprocesos"]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(["/api/macroprocesos"], (old: MacroprocesoWithRisks[] | undefined) => {
        if (!old) return old;
        return old.map(macro => {
          const update = updates.find(u => u.id === macro.id);
          return update ? { ...macro, order: update.order } : macro;
        });
      });
      
      // Return a context object with the snapshotted value
      return { previousData };
    },
    onError: (err, updates, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        queryClient.setQueryData(["/api/macroprocesos"], context.previousData);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ["/api/macroprocesos"] });
    },
  });

  const handleDeleteProcess = (process: Process) => {
    setDeleteConfirmProcess(process);
    setProcessDelReason("");
  };

  const confirmDeleteProcess = () => {
    if (deleteConfirmProcess) {
      if (!processDelReason.trim()) {
        toast({ title: "Motivo requerido", description: "Por favor ingrese el motivo de la eliminación.", variant: "destructive" });
        return;
      }
      deleteProcessMutation.mutate({ id: deleteConfirmProcess.id, deletionReason: processDelReason });
      setDeleteConfirmProcess(null);
    }
  };

  const handleDeleteSubprocess = (subprocess: Subproceso) => {
    setDeleteConfirmSubprocess(subprocess);
    setSubprocessDelReason("");
  };

  const confirmDeleteSubprocess = () => {
    if (deleteConfirmSubprocess) {
      if (!subprocessDelReason.trim()) {
        toast({ title: "Motivo requerido", description: "Por favor ingrese el motivo de la eliminación.", variant: "destructive" });
        return;
      }
      deleteSubprocessMutation.mutate({ id: deleteConfirmSubprocess.id, deletionReason: subprocessDelReason });
      setDeleteConfirmSubprocess(null);
    }
  };

  const handleDeleteMacroproceso = (macroproceso: Macroproceso) => {
    setDeleteConfirmMacroproceso(macroproceso);
    setMacroprocesoDelReason("");
  };

  const confirmDeleteMacroproceso = () => {
    if (deleteConfirmMacroproceso) {
      if (!macroprocesoDelReason.trim()) {
        toast({ title: "Motivo requerido", description: "Por favor ingrese el motivo de la eliminación.", variant: "destructive" });
        return;
      }
      deleteMacroprocesoMutation.mutate({ id: deleteConfirmMacroproceso.id, deletionReason: macroprocesoDelReason });
      setDeleteConfirmMacroproceso(null);
    }
  };

  const handleEditProcessSuccess = () => {
    setEditingProcess(null);
  };

  const handleEditSubprocessSuccess = () => {
    setEditingSubprocess(null);
  };

  const handleEditMacroprocesoSuccess = () => {
    setEditingMacroproceso(null);
  };

  // Funciones de drag and drop
  const handleDragStart = (e: React.DragEvent, macroproceso: MacroprocesoWithRisks) => {
    setDraggedMacroproceso(macroproceso);
    e.dataTransfer.effectAllowed = 'move';
    
    // Agregar una imagen de arrastre personalizada
    const dragElement = e.target as HTMLElement;
    dragElement.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const dragElement = e.target as HTMLElement;
    dragElement.style.opacity = '1';
    setDraggedMacroproceso(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    
    if (!draggedMacroproceso || sortField !== 'order') return;
    
    const sortedMacroprocesos = getSortedMacroprocesos();
    const draggedIndex = sortedMacroprocesos.findIndex(m => m.id === draggedMacroproceso.id);
    
    if (draggedIndex === targetIndex) return;
    
    // Crear nueva lista reordenada
    const newList = [...sortedMacroprocesos];
    const [draggedItem] = newList.splice(draggedIndex, 1);
    newList.splice(targetIndex, 0, draggedItem);
    
    // Preparar actualizaciones solo para elementos que cambiaron de orden
    const updates = newList.map((macroproceso, index) => ({
      id: macroproceso.id,
      order: index + 1
    }));
    
    // Actualizar en el backend con optimistic update en la mutación
    try {
      await reorderMacroprocesosMutation.mutateAsync(updates);
      
      toast({
        title: "Orden actualizado",
        description: "El orden de los macroprocesos ha sido actualizado exitosamente.",
      });
    } catch (error) {
      // El rollback se maneja automáticamente en la mutación
      toast({
        title: "Error",
        description: "No se pudo actualizar el orden de los macroprocesos.",
        variant: "destructive",
      });
    }
    
    setDragOverIndex(null);
    setDraggedMacroproceso(null);
  };

  const handleCreateProcessSuccess = () => {
    // Force immediate refetch to show new process immediately
    queryClient.invalidateQueries({ queryKey: ["/api/processes/basic"] });
    queryClient.invalidateQueries({ queryKey: ["/api/processes"] });
    queryClient.invalidateQueries({ queryKey: ["/api/macroprocesos"] });
    // Refetch immediately to update UI
    queryClient.refetchQueries({ queryKey: ["/api/processes/basic"] });
    queryClient.refetchQueries({ queryKey: ["/api/macroprocesos"] });
    setIsCreateProcessDialogOpen(false);
    setSelectedMacroprocesoId(null);
  };

  const handleCreateSubprocessSuccess = () => {
    // Force immediate refetch to show new subprocess immediately
    queryClient.refetchQueries({ queryKey: ["/api/subprocesos"] });
    queryClient.refetchQueries({ queryKey: ["/api/processes/basic"] });
    setIsCreateSubprocessDialogOpen(false);
    setSelectedProcesoId(null);
  };

  const toggleMacroproceso = (id: string) => {
    const newExpanded = new Set(expandedMacroprocesos);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedMacroprocesos(newExpanded);
  };

  const toggleProceso = (id: string) => {
    const newExpanded = new Set(expandedProcesos);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedProcesos(newExpanded);
  };

  const toggleSubproceso = (id: string) => {
    const newExpanded = new Set(expandedSubprocesos);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSubprocesos(newExpanded);
  };

  const getProcessesByMacroproceso = (macroprocesoId: string): ProcessWithRisks[] => {
    // Use basic processes for initial load, fall back to full processes if available
    const processData = basicProcesses.length > 0 ? basicProcesses : processes;
    return processData.filter((process) => process.macroprocesoId === macroprocesoId);
  };

  const getSubprocessesByProceso = (procesoId: string): SubprocesoWithRisks[] => {
    return subprocesos.filter((subproceso) => subproceso.procesoId === procesoId);
  };

  const getRisksBySubproceso = (subprocesoId: string): Risk[] => {
    return risks.filter((risk) => risk.subprocesoId === subprocesoId);
  };

  // Funciones para obtener riesgos agregados por entidad para el modal
  const getRisksByMacroproceso = (macroprocesoId: string): Risk[] => {
    const directRisks = risks.filter((risk) => risk.macroprocesoId === macroprocesoId);
    const processRisks = processes
      .filter((process) => process.macroprocesoId === macroprocesoId)
      .flatMap((process) => risks.filter((risk) => risk.processId === process.id));
    const subprocessRisks = processes
      .filter((process) => process.macroprocesoId === macroprocesoId)
      .flatMap((process) => 
        subprocesos
          .filter((sub) => sub.procesoId === process.id)
          .flatMap((sub) => risks.filter((risk) => risk.subprocesoId === sub.id))
      );
    
    // Eliminar duplicados por ID
    const allRisks = [...directRisks, ...processRisks, ...subprocessRisks];
    return allRisks.filter((risk, index, self) => 
      index === self.findIndex(r => r.id === risk.id)
    );
  };

  const getRisksByProcess = (processId: string): Risk[] => {
    const directRisks = risks.filter((risk) => risk.processId === processId);
    const subprocessRisks = subprocesos
      .filter((sub) => sub.procesoId === processId)
      .flatMap((sub) => risks.filter((risk) => risk.subprocesoId === sub.id));
    
    return [...directRisks, ...subprocessRisks];
  };

  // Función para abrir modal con riesgos de una entidad
  const openRiskModal = (entityId: string, entityName: string, entityType: 'macroproceso' | 'proceso' | 'subproceso') => {
    // Store entity info for when the risks are loaded
    setSelectedEntityRisks({
      risks: [], // Will be populated by useEffect
      entityName,
      entityType
    });
    
    // Store the entity ID for filtering when risks load
    setSelectedEntityForRisks({
      id: entityId,
      type: entityType
    });
    
    // Set modal to open, which will trigger the risks query to load
    setRiskModalOpen(true);
  };

  // Función para determinar el color del riesgo individual
  function getIndividualRiskColor(risk: number): string {
    if (risk === 0) return "bg-gray-100 text-gray-600";
    if (risk <= 6) return "bg-green-100 text-green-700";
    if (risk <= 12) return "bg-yellow-100 text-yellow-700";
    if (risk <= 16) return "bg-orange-100 text-orange-700";
    return "bg-red-100 text-red-700";
  }

  // Función para obtener la etiqueta del nivel de riesgo individual
  function getIndividualRiskLevel(risk: number): string {
    if (risk === 0) return "Sin riesgo";
    if (risk <= 6) return "Bajo";
    if (risk <= 12) return "Medio";
    if (risk <= 16) return "Alto";
    return "Crítico";
  }

  // Función para detectar si un riesgo fue evaluado por factores o directamente
  function getEvaluationMethod(risk: Risk): 'factors' | 'direct' {
    const factors: ProbabilityFactors = {
      frequencyOccurrence: risk.frequencyOccurrence,
      exposureVolume: risk.exposureVolume,
      exposureMassivity: risk.exposureMassivity,
      exposureCriticalPath: risk.exposureCriticalPath,
      complexity: risk.complexity,
      changeVolatility: risk.changeVolatility,
      vulnerabilities: risk.vulnerabilities
    };
    
    const calculatedProbability = calculateProbability(factors);
    return risk.probability === calculatedProbability ? 'factors' : 'direct';
  }

  // Función para mapear estados del schema a estados de UI
  const mapValidationStatusToUI = (aggregatedStats: {
    totalRisks: number;
    validatedRisks: number;
    rejectedRisks: number;
    totalControls: number;
    validatedControls: number;
    rejectedControls: number;
    completionPercentage: number;
    validationStatus: string[];
  }) => {
    // Si hay riesgos o controles rechazados, requiere revisión
    if (aggregatedStats.rejectedRisks > 0 || aggregatedStats.rejectedControls > 0) {
      return "requires_review";
    }
    
    // Si está 100% completo o todas las validaciones están completed
    if (aggregatedStats.completionPercentage === 100 || 
        aggregatedStats.validationStatus.every(s => s === "completed")) {
      return "completed";
    }
    
    // Si está en progreso o tiene algo validado
    if (aggregatedStats.validationStatus.some(s => s === "in_progress") || 
        aggregatedStats.completionPercentage > 0) {
      return "in_progress";
    }
    
    // Si no hay validaciones o están pending
    return "not_started";
  };

  // Funciones para obtener riesgo residual del macroproceso
  const getResidualRiskForMacroproceso = (macroprocesoId: string) => {
    const macroprocesoRisks = getRisksByMacroproceso(macroprocesoId);
    
    if (macroprocesoRisks.length === 0) {
      return {
        level: 0,
        color: "bg-gray-100 text-gray-600",
        label: "Sin riesgos"
      };
    }
    
    // Calcular el promedio de riesgo residual (si no hay controles, usar riesgo inherente)
    const totalRisk = macroprocesoRisks.reduce((sum, risk) => {
      // Para simplicidad, usamos el riesgo inherente como residual si no hay controles específicos
      // En una implementación más completa, se calcularía basado en los controles reales
      return sum + risk.inherentRisk;
    }, 0);
    
    const averageRisk = totalRisk / macroprocesoRisks.length;
    
    // Determinar color y etiqueta basado en el nivel de riesgo
    if (averageRisk === 0) {
      return {
        level: 0,
        color: "bg-gray-100 text-gray-600",
        label: "Sin riesgo"
      };
    } else if (averageRisk <= 6) {
      return {
        level: parseFloat(averageRisk.toFixed(1)),
        color: "bg-green-100 text-green-700",
        label: "Bajo"
      };
    } else if (averageRisk <= 12) {
      return {
        level: parseFloat(averageRisk.toFixed(1)),
        color: "bg-yellow-100 text-yellow-700",
        label: "Medio"
      };
    } else if (averageRisk <= 16) {
      return {
        level: parseFloat(averageRisk.toFixed(1)),
        color: "bg-orange-100 text-orange-700",
        label: "Alto"
      };
    } else {
      return {
        level: parseFloat(averageRisk.toFixed(1)),
        color: "bg-red-100 text-red-700",
        label: "Crítico"
      };
    }
  };

  // Funciones para obtener estado de validación
  const getValidationStatusForMacroproceso = (macroprocesoId: string) => {
    // Encontrar procesos del macroproceso y buscar sus validaciones
    const processData = basicProcesses.length > 0 ? basicProcesses : processes;
    const macroprocesoProcesses = processData.filter(p => p.macroprocesoId === macroprocesoId);
    const validations = processValidations.filter(v => 
      macroprocesoProcesses.some(p => p.id === v.processId)
    );
    
    if (validations.length === 0) return "not_started";
    
    const aggregatedStats = getValidationStats(macroprocesoId);
    const statusArray = validations.map(v => v.validationStatus);
    
    return mapValidationStatusToUI({
      totalRisks: aggregatedStats.totalRisks,
      validatedRisks: aggregatedStats.risksValidated,
      rejectedRisks: aggregatedStats.rejectedRisks,
      totalControls: aggregatedStats.totalControls,
      validatedControls: aggregatedStats.controlsValidated,
      rejectedControls: aggregatedStats.rejectedControls,
      completionPercentage: aggregatedStats.completionPercentage,
      validationStatus: statusArray
    });
  };

  const getValidationStats = (macroprocesoId: string) => {
    // Encontrar procesos del macroproceso y agregar sus estadísticas
    const macroprocesoProcesses = processes.filter(p => p.macroprocesoId === macroprocesoId);
    const validations = processValidations.filter(v => 
      macroprocesoProcesses.some(p => p.id === v.processId)
    );
    
    const totalRisks = validations.reduce((sum, v) => sum + v.totalRisks, 0);
    const validatedRisks = validations.reduce((sum, v) => sum + v.validatedRisks, 0);
    const rejectedRisks = validations.reduce((sum, v) => sum + v.rejectedRisks, 0);
    const totalControls = validations.reduce((sum, v) => sum + v.totalControls, 0);
    const validatedControls = validations.reduce((sum, v) => sum + v.validatedControls, 0);
    const rejectedControls = validations.reduce((sum, v) => sum + v.rejectedControls, 0);
    
    const completionPercentage = totalRisks + totalControls > 0 
      ? Math.round(((validatedRisks + validatedControls) / (totalRisks + totalControls)) * 100)
      : 0;
    
    return {
      risksValidated: validatedRisks,
      totalRisks,
      rejectedRisks,
      controlsValidated: validatedControls,
      totalControls,
      rejectedControls,
      completionPercentage
    };
  };

  // Funciones para el mapa de cadena de valor dinámico
  const getSupportActivities = (): MacroprocesoWithRisks[] => {
    return macroprocesos
      .filter((macro) => macro.type === "apoyo")
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  const getPrimaryActivities = (): MacroprocesoWithRisks[] => {
    return macroprocesos
      .filter((macro) => macro.type === "clave")
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  };

  // Función para navegar al detalle del macroproceso desde el mapa
  const navigateToMacroprocesoDetail = (macroprocesoId: string) => {
    // Expandir el macroproceso si no está expandido
    setExpandedMacroprocesos(prev => {
      const newExpanded = new Set(prev);
      newExpanded.add(macroprocesoId);
      return newExpanded;
    });

    // Hacer scroll hacia el macroproceso
    setTimeout(() => {
      const element = document.querySelector(`[data-testid="macroproceso-card-${macroprocesoId}"]`);
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
        
        // Resaltar temporalmente el elemento
        element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
        }, 2000);
      }
    }, 100);
  };

  // Función para navegar al dashboard de validación específico
  const [, navigate] = useLocation();
  
  const navigateToValidationDashboard = (macroprocesoId: string) => {
    // Redirigir al dashboard de validación con el macroproceso específico seleccionado
    navigate(`/validation?macroproceso=${macroprocesoId}`);
  };

  // Función para ordenar macroprocesos
  const getSortedMacroprocesos = () => {
    return [...macroprocesos].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      
      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'code':
          aValue = a.code.toLowerCase();
          bValue = b.code.toLowerCase();
          break;
        case 'residualRisk':
          aValue = a.residualRisk || 0;
          bValue = b.residualRisk || 0;
          break;
        case 'order':
          aValue = a.order || 0;
          bValue = b.order || 0;
          break;
        default:
          aValue = a.order || 0;
          bValue = b.order || 0;
      }
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  };

  if (isLoadingMacroprocesos) {
    return <div className="p-6">Cargando estructura de procesos...</div>;
  }

  return (
    <div className="p-6" data-testid="processes-content">
      {/* Delete Confirmation Dialog - Macroproceso */}
      <AlertDialog open={!!deleteConfirmMacroproceso} onOpenChange={(open) => !open && setDeleteConfirmMacroproceso(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de que desea eliminar este macroproceso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción moverá el macroproceso "{deleteConfirmMacroproceso?.name}" a la papelera. Podrá restaurarlo desde allí si es necesario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="macroproceso-deletion-reason" className="text-sm font-medium">
              Motivo de la eliminación <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="macroproceso-deletion-reason"
              data-testid="input-deletion-reason"
              placeholder="Ingrese el motivo por el cual está eliminando este macroproceso..."
              value={macroprocesoDelReason}
              onChange={(e) => setMacroprocesoDelReason(e.target.value)}
              rows={3}
              className="resize-none mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Este motivo quedará registrado en el historial de auditoría.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmMacroproceso(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteMacroproceso} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog - Process */}
      <AlertDialog open={!!deleteConfirmProcess} onOpenChange={(open) => !open && setDeleteConfirmProcess(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de que desea eliminar este proceso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción moverá el proceso "{deleteConfirmProcess?.name}" a la papelera. Podrá restaurarlo desde allí si es necesario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="process-deletion-reason" className="text-sm font-medium">
              Motivo de la eliminación <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="process-deletion-reason"
              data-testid="input-deletion-reason"
              placeholder="Ingrese el motivo por el cual está eliminando este proceso..."
              value={processDelReason}
              onChange={(e) => setProcessDelReason(e.target.value)}
              rows={3}
              className="resize-none mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Este motivo quedará registrado en el historial de auditoría.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmProcess(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteProcess} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog - Subprocess */}
      <AlertDialog open={!!deleteConfirmSubprocess} onOpenChange={(open) => !open && setDeleteConfirmSubprocess(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de que desea eliminar este subproceso?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción moverá el subproceso "{deleteConfirmSubprocess?.name}" a la papelera. Podrá restaurarlo desde allí si es necesario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="subprocess-deletion-reason" className="text-sm font-medium">
              Motivo de la eliminación <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="subprocess-deletion-reason"
              data-testid="input-deletion-reason"
              placeholder="Ingrese el motivo por el cual está eliminando este subproceso..."
              value={subprocessDelReason}
              onChange={(e) => setSubprocessDelReason(e.target.value)}
              rows={3}
              className="resize-none mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Este motivo quedará registrado en el historial de auditoría.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmSubprocess(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteSubprocess} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-end mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Ordenar por:</label>
            <Select value={sortField} onValueChange={(value) => setSortField(value as 'name' | 'code' | 'residualRisk' | 'order')}>
              <SelectTrigger className="w-48" data-testid="select-sort-field">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="order">Orden personalizado</SelectItem>
                <SelectItem value="name">Nombre</SelectItem>
                <SelectItem value="code">Código</SelectItem>
                <SelectItem value="residualRisk">Riesgo Residual</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortDirection} onValueChange={(value) => setSortDirection(value as 'asc' | 'desc')}>
              <SelectTrigger className="w-32" data-testid="select-sort-direction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">↑ Asc</SelectItem>
                <SelectItem value="desc">↓ Desc</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Mapa de Procesos - Cadena de Valor */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            Mapa de Procesos - Cadena de Valor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20 p-6 rounded-lg">
            {/* Actividades de Soporte */}
            <div className="mb-4">
              <div className="text-sm font-medium text-muted-foreground mb-2 text-center">ACTIVIDADES DE SOPORTE</div>
              <div className={`grid gap-2 ${getSupportActivities().length <= 4 ? 'grid-cols-1 md:grid-cols-4' : `grid-cols-1 md:grid-cols-${Math.min(getSupportActivities().length, 6)}`}`}>
                {getSupportActivities().map((macroproceso) => {
                  const residualRiskInfo = getResidualRiskForMacroproceso(macroproceso.id);
                  
                  return (
                    <div 
                      key={macroproceso.id}
                      className="bg-red-600 text-white p-3 text-center font-medium rounded text-sm hover:bg-red-700 transition-colors cursor-pointer relative"
                      onClick={() => navigateToMacroprocesoDetail(macroproceso.id)}
                      data-testid={`value-chain-support-${macroproceso.id}`}
                    >
                      <div className="mb-2">{macroproceso.name.toUpperCase()}</div>
                      
                      {/* Indicadores de riesgo residual */}
                      <div className="flex flex-col gap-1 items-center">
                        <ResidualRiskIndicator
                          level={residualRiskInfo.level}
                          color={residualRiskInfo.color}
                          label={residualRiskInfo.label}
                          size="xs"
                          onClick={() => navigateToMacroprocesoDetail(macroproceso.id)}
                        />
                        {macroproceso.riskCount && macroproceso.riskCount > 0 && (
                          <Badge className="text-xs bg-white/20 text-white border-white/20">
                            <AlertTriangle className="h-2 w-2 mr-1" />
                            {macroproceso.riskCount} riesgo{macroproceso.riskCount !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
                {getSupportActivities().length === 0 && (
                  <div className="col-span-full text-center text-muted-foreground text-sm p-4 border-2 border-dashed border-muted rounded">
                    No hay macroprocesos de apoyo configurados
                  </div>
                )}
              </div>
            </div>

            {/* Contenedor principal con flecha de margen */}
            <div className="relative">
              {/* Flecha derecha - Margen */}
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-4 z-10">
                <div className="bg-green-500 text-white px-2 py-6 rounded-r-lg text-sm font-medium transform rotate-90 origin-center">
                  MARGEN
                </div>
              </div>

              {/* Actividades Primarias */}
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2 text-center">ACTIVIDADES PRIMARIAS</div>
                <div className={`gap-2 mx-8 ${getPrimaryActivities().length <= 5 ? 'grid grid-cols-1 md:grid-cols-5' : `grid grid-cols-1 md:grid-cols-${Math.min(getPrimaryActivities().length, 6)}`}`}>
                  {getPrimaryActivities().map((macroproceso) => {
                    const residualRiskInfo = getResidualRiskForMacroproceso(macroproceso.id);
                    
                    return (
                      <div 
                        key={macroproceso.id}
                        className="bg-blue-600 text-white p-4 text-center font-medium rounded text-sm hover:bg-blue-700 transition-colors cursor-pointer min-h-[80px] flex flex-col items-center justify-center"
                        onClick={() => navigateToMacroprocesoDetail(macroproceso.id)}
                        data-testid={`value-chain-primary-${macroproceso.id}`}
                      >
                        <div className="mb-2">{macroproceso.name.toUpperCase()}</div>
                        
                        {/* Indicadores de riesgo residual */}
                        <div className="flex flex-col gap-1 items-center">
                          <ResidualRiskIndicator
                            level={residualRiskInfo.level}
                            color={residualRiskInfo.color}
                            label={residualRiskInfo.label}
                            size="xs"
                            onClick={() => navigateToMacroprocesoDetail(macroproceso.id)}
                          />
                          {macroproceso.riskCount && macroproceso.riskCount > 0 && (
                            <Badge className="text-xs bg-white/20 text-white border-white/20">
                              <AlertTriangle className="h-2 w-2 mr-1" />
                              {macroproceso.riskCount} riesgo{macroproceso.riskCount !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {getPrimaryActivities().length === 0 && (
                    <div className="col-span-full text-center text-muted-foreground text-sm p-4 border-2 border-dashed border-muted rounded">
                      No hay macroprocesos primarios configurados
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Flecha hacia abajo */}
            <div className="flex justify-center mt-4">
              <div className="text-center">
                <ChevronDown className="h-6 w-6 text-green-600 mx-auto animate-bounce" />
                <div className="text-xs text-muted-foreground mt-1">Ver detalle de procesos</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {getSortedMacroprocesos().map((macroproceso, index) => {
          const macroprocesoProcesses = getProcessesByMacroproceso(macroproceso.id);
          const isExpanded = expandedMacroprocesos.has(macroproceso.id);
          const isDragOver = dragOverIndex === index;
          const isBeingDragged = draggedMacroproceso?.id === macroproceso.id;
          
          return (
            <Card 
              key={macroproceso.id} 
              data-testid={`macroproceso-card-${macroproceso.id}`}
              draggable={sortField === 'order'}
              onDragStart={(e) => sortField === 'order' && handleDragStart(e, macroproceso)}
              onDragEnd={(e) => sortField === 'order' && handleDragEnd(e)}
              onDragOver={(e) => sortField === 'order' && handleDragOver(e, index)}
              onDragLeave={() => sortField === 'order' && handleDragLeave()}
              onDrop={(e) => sortField === 'order' && handleDrop(e, index)}
              className={`
                ${sortField === 'order' ? 'cursor-move' : 'cursor-default'}
                ${isDragOver ? 'border-blue-500 border-2 bg-blue-50' : 'border-border'}
                ${isBeingDragged ? 'opacity-50' : 'opacity-100'}
                transition-all duration-200
              `}
            >
              <CardHeader>
                <Collapsible>
                  <div className="flex items-center justify-between w-full">
                    <CollapsibleTrigger 
                      className="flex items-center gap-3 hover:no-underline p-0 flex-1"
                      onClick={() => toggleMacroproceso(macroproceso.id)}
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <Building2 className="h-5 w-5 text-blue-600" />
                      <div className="text-left">
                        <CardTitle className="text-lg">{macroproceso.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{macroproceso.description}</p>
                      </div>
                    </CollapsibleTrigger>
                    
                    <div className="flex items-center gap-2">
                      <RiskIndicator 
                        inherentRisk={macroproceso.inherentRisk}
                        residualRisk={macroproceso.residualRisk}
                        riskCount={macroproceso.riskCount}
                        size="sm"
                        onRiskCountClick={() => openRiskModal(macroproceso.id, macroproceso.name, 'macroproceso')}
                      />
                      <Badge variant={macroproceso.type === "clave" ? "default" : "secondary"}>
                        {macroproceso.type === "clave" ? "Primaria/Core" : "Apoyo"}
                      </Badge>
                      <Badge variant="outline">{macroproceso.code}</Badge>
                      <EditGuard itemType="process">
                        <Dialog open={editingMacroproceso?.id === macroproceso.id} onOpenChange={(open) => !open && setEditingMacroproceso(null)}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setEditingMacroproceso(macroproceso)}
                              data-testid={`button-edit-macroproceso-${macroproceso.id}`}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Editar Macroproceso</DialogTitle>
                              <DialogDescription>
                                Actualizar la información de este macroproceso.
                              </DialogDescription>
                            </DialogHeader>
                            <MacroprocesoForm 
                              macroproceso={editingMacroproceso!} 
                              onSuccess={handleEditMacroprocesoSuccess} 
                            />
                          </DialogContent>
                        </Dialog>
                      </EditGuard>
                      <DeleteGuard itemType="process">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteMacroproceso(macroproceso)}
                          data-testid={`button-delete-macroproceso-${macroproceso.id}`}
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </DeleteGuard>
                    </div>
                  </div>
                  
                  <CollapsibleContent className="mt-4">
                    <div className="space-y-3">
                      {/* Botón para agregar proceso */}
                      <div className="flex justify-end">
                        <Dialog open={isCreateProcessDialogOpen && selectedMacroprocesoId === macroproceso.id} 
                                onOpenChange={(open) => {
                                  setIsCreateProcessDialogOpen(open);
                                  if (!open) setSelectedMacroprocesoId(null);
                                }}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedMacroprocesoId(macroproceso.id)}
                              data-testid={`button-add-process-${macroproceso.id}`}
                            >
                              <Plus className="mr-2 h-3 w-3" />
                              Agregar Proceso
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Nuevo Proceso en {macroproceso.name}</DialogTitle>
                              <DialogDescription>
                                Crear un nuevo proceso dentro de este macroproceso.
                              </DialogDescription>
                            </DialogHeader>
                            <ProcessForm 
                              macroprocesoId={macroproceso.id}
                              onSuccess={handleCreateProcessSuccess} 
                            />
                          </DialogContent>
                        </Dialog>
                      </div>

                      {/* Lista de procesos */}
                      {macroprocesoProcesses.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Workflow className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No hay procesos en este macroproceso</p>
                        </div>
                      )}

                      {macroprocesoProcesses.map((process) => {
                        const procesoSubprocesses = getSubprocessesByProceso(process.id);
                        const isProcesoExpanded = expandedProcesos.has(process.id);
                        
                        return (
                          <Card key={process.id} className="ml-6 bg-muted/30" data-testid={`process-card-${process.id}`}>
                            <CardHeader className="pb-3">
                              <Collapsible>
                                <div className="flex items-center justify-between">
                                  <CollapsibleTrigger 
                                    className="flex items-center gap-3 hover:no-underline p-0"
                                    onClick={() => toggleProceso(process.id)}
                                  >
                                    {procesoSubprocesses.length > 0 && (
                                      isProcesoExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
                                    )}
                                    <Workflow className="h-4 w-4 text-green-600" />
                                    <div className="text-left">
                                      <h4 className="font-medium">{process.name}</h4>
                                      <p className="text-xs text-muted-foreground">{process.description}</p>
                                    </div>
                                  </CollapsibleTrigger>
                                  
                                  <div className="flex items-center gap-2">
                                    <RiskIndicator 
                                      inherentRisk={process.inherentRisk}
                                      residualRisk={process.residualRisk}
                                      riskCount={process.riskCount}
                                      size="xs"
                                      onRiskCountClick={() => openRiskModal(process.id, process.name, 'proceso')}
                                    />
                                    <Badge variant="outline" className="text-xs">{process.code}</Badge>
                                    <div className="flex gap-1">
                                      <EditGuard itemType="process">
                                        <Dialog open={editingProcess?.id === process.id} onOpenChange={(open) => !open && setEditingProcess(null)}>
                                          <DialogTrigger asChild>
                                            <Button 
                                              variant="ghost" 
                                              size="sm" 
                                              onClick={() => setEditingProcess(process)}
                                              data-testid={`button-edit-process-${process.id}`}
                                            >
                                              <Edit className="h-3 w-3" />
                                            </Button>
                                          </DialogTrigger>
                                          <DialogContent className="max-w-2xl">
                                            <DialogHeader>
                                              <DialogTitle>Editar Proceso</DialogTitle>
                                              <DialogDescription>
                                                Actualizar la información de este proceso.
                                              </DialogDescription>
                                            </DialogHeader>
                                            <ProcessForm 
                                              process={editingProcess!} 
                                              onSuccess={handleEditProcessSuccess} 
                                            />
                                          </DialogContent>
                                        </Dialog>
                                      </EditGuard>
                                      <DeleteGuard itemType="process">
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => handleDeleteProcess(process)}
                                          data-testid={`button-delete-process-${process.id}`}
                                        >
                                          <Trash2 className="h-3 w-3 text-red-500" />
                                        </Button>
                                      </DeleteGuard>
                                    </div>
                                  </div>
                                </div>

                                <CollapsibleContent className="mt-3">
                                  <div className="space-y-2">
                                    {/* Información adicional del proceso */}
                                    <div className="text-xs text-muted-foreground">
                                      <strong>Responsable:</strong> {process.owner?.name || "No asignado"}
                                    </div>

                                    {/* Botón para agregar subproceso */}
                                    <div className="flex justify-end">
                                      <Dialog open={isCreateSubprocessDialogOpen && selectedProcesoId === process.id} 
                                              onOpenChange={(open) => {
                                                setIsCreateSubprocessDialogOpen(open);
                                                if (!open) setSelectedProcesoId(null);
                                              }}>
                                        <DialogTrigger asChild>
                                          <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => setSelectedProcesoId(process.id)}
                                            data-testid={`button-add-subprocess-${process.id}`}
                                          >
                                            <Plus className="mr-2 h-3 w-3" />
                                            Agregar Subproceso
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl">
                                          <DialogHeader>
                                            <DialogTitle>Nuevo Subproceso en {process.name}</DialogTitle>
                                            <DialogDescription>
                                              Crear un nuevo subproceso dentro de este proceso.
                                            </DialogDescription>
                                          </DialogHeader>
                                          <SubprocessForm 
                                            procesoId={process.id}
                                            onSuccess={handleCreateSubprocessSuccess} 
                                          />
                                        </DialogContent>
                                      </Dialog>
                                    </div>

                                    {/* Lista de subprocesos */}
                                    {procesoSubprocesses.length === 0 && (
                                      <div className="text-center py-4 text-muted-foreground">
                                        <GitBranch className="h-6 w-6 mx-auto mb-1 opacity-50" />
                                        <p className="text-xs">No hay subprocesos en este proceso</p>
                                      </div>
                                    )}

                                    {procesoSubprocesses.map((subproceso) => {
                                      const subprocesoRisks = getRisksBySubproceso(subproceso.id);
                                      const isSubprocesoExpanded = expandedSubprocesos.has(subproceso.id);
                                      
                                      return (
                                        <Card key={subproceso.id} className="ml-6 bg-background" data-testid={`subprocess-card-${subproceso.id}`}>
                                          <CardContent className="p-3">
                                            <Collapsible>
                                              <div className="flex items-center justify-between">
                                                <CollapsibleTrigger 
                                                  className="flex items-center gap-2 hover:no-underline p-0 flex-1"
                                                  onClick={() => toggleSubproceso(subproceso.id)}
                                                >
                                                  <div className="flex items-center gap-2">
                                                    {subprocesoRisks.length > 0 && (
                                                      isSubprocesoExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
                                                    )}
                                                    <GitBranch className="h-3 w-3 text-orange-600" />
                                                    <div className="text-left">
                                                      <h5 className="text-sm font-medium">{subproceso.name}</h5>
                                                      <p className="text-xs text-muted-foreground">{subproceso.description}</p>
                                                      <p className="text-xs text-muted-foreground">
                                                        <strong>Responsable:</strong> {subproceso.owner?.name || "No asignado"}
                                                      </p>
                                                    </div>
                                                  </div>
                                                </CollapsibleTrigger>
                                                
                                                <div className="flex items-center gap-2">
                                                  <RiskIndicator 
                                                    inherentRisk={subproceso.inherentRisk}
                                                    residualRisk={subproceso.residualRisk}
                                                    riskCount={subproceso.riskCount}
                                                    size="xs"
                                                    onRiskCountClick={() => openRiskModal(subproceso.id, subproceso.name, 'subproceso')}
                                                  />
                                                  <Badge variant="outline" className="text-xs">{subproceso.code}</Badge>
                                                  <div className="flex gap-1">
                                                    <EditGuard itemType="process">
                                                      <Dialog open={editingSubprocess?.id === subproceso.id} onOpenChange={(open) => !open && setEditingSubprocess(null)}>
                                                        <DialogTrigger asChild>
                                                          <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            onClick={() => setEditingSubprocess(subproceso)}
                                                            data-testid={`button-edit-subprocess-${subproceso.id}`}
                                                          >
                                                            <Edit className="h-3 w-3" />
                                                          </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-2xl">
                                                          <DialogHeader>
                                                            <DialogTitle>Editar Subproceso</DialogTitle>
                                                            <DialogDescription>
                                                              Actualizar la información de este subproceso.
                                                            </DialogDescription>
                                                          </DialogHeader>
                                                          <SubprocessForm 
                                                            subproceso={editingSubprocess!} 
                                                            onSuccess={handleEditSubprocessSuccess} 
                                                          />
                                                        </DialogContent>
                                                      </Dialog>
                                                    </EditGuard>
                                                    <DeleteGuard itemType="process">
                                                      <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        onClick={() => handleDeleteSubprocess(subproceso)}
                                                        data-testid={`button-delete-subprocess-${subproceso.id}`}
                                                      >
                                                        <Trash2 className="h-3 w-3 text-red-500" />
                                                      </Button>
                                                    </DeleteGuard>
                                                  </div>
                                                </div>
                                              </div>

                                              {/* Riesgos del subproceso */}
                                              <CollapsibleContent className="mt-3">
                                                {subprocesoRisks.length === 0 ? (
                                                  <div className="text-center py-4 text-muted-foreground">
                                                    <AlertTriangle className="h-6 w-6 mx-auto mb-1 opacity-50" />
                                                    <p className="text-xs">No hay riesgos asociados a este subproceso</p>
                                                  </div>
                                                ) : (
                                                  <div className="space-y-2 pl-6">
                                                    <h6 className="text-xs font-medium text-muted-foreground mb-2">
                                                      Riesgos asociados ({subprocesoRisks.length})
                                                    </h6>
                                                    {subprocesoRisks.map((risk) => (
                                                      <div key={risk.id} className="border border-border rounded-md p-2 bg-muted/20" data-testid={`risk-summary-${risk.id}`}>
                                                        <div className="flex items-center justify-between">
                                                          <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                              <Badge variant="outline" className="text-xs font-mono">{risk.code}</Badge>
                                                              <h6 className="text-sm font-medium truncate">{risk.name}</h6>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{risk.description}</p>
                                                            {Array.isArray(risk.category) && risk.category.length > 0 && (
                                                              <div className="flex gap-1 mt-1">
                                                                {risk.category.slice(0, 2).map((cat: string) => (
                                                                  <Badge key={cat} variant="secondary" className="text-xs">
                                                                    {cat}
                                                                  </Badge>
                                                                ))}
                                                                {risk.category.length > 2 && (
                                                                  <Badge variant="secondary" className="text-xs">
                                                                    +{risk.category.length - 2} más
                                                                  </Badge>
                                                                )}
                                                              </div>
                                                            )}
                                                          </div>
                                                          <div className="flex flex-col items-end gap-1 ml-2">
                                                            <div className="flex items-center gap-1">
                                                              <Badge className={`text-xs ${getIndividualRiskColor(risk.inherentRisk)}`}>
                                                                I: {risk.inherentRisk}
                                                              </Badge>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                              <span className="text-xs text-muted-foreground">P:{risk.probability}</span>
                                                              <span className="text-xs text-muted-foreground">×</span>
                                                              <span className="text-xs text-muted-foreground">I:{risk.impact}</span>
                                                            </div>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                              </CollapsibleContent>
                                            </Collapsible>
                                          </CardContent>
                                        </Card>
                                      );
                                    })}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </CardHeader>
                          </Card>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Modal para mostrar lista de riesgos */}
      <Dialog open={riskModalOpen} onOpenChange={setRiskModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              Riesgos del {selectedEntityRisks.entityType}: {selectedEntityRisks.entityName}
            </DialogTitle>
            <DialogDescription>
              Lista completa de riesgos asociados a este {selectedEntityRisks.entityType.toLowerCase()} con sus respectivas evaluaciones y categorías.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[70vh]">
            {selectedEntityRisks.risks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No hay riesgos asociados a esta entidad</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Se encontraron {selectedEntityRisks.risks.length} riesgo{selectedEntityRisks.risks.length !== 1 ? "s" : ""} asociado{selectedEntityRisks.risks.length !== 1 ? "s" : ""}:
                </p>
                {selectedEntityRisks.risks.map((risk) => (
                  <Card key={risk.id} className="p-4" data-testid={`modal-risk-${risk.id}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="font-mono text-xs">{risk.code}</Badge>
                          <h4 className="font-medium text-sm">{risk.name}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{risk.description}</p>
                        
                        {Array.isArray(risk.category) && risk.category.length > 0 && (
                          <div className="flex gap-1 mb-3">
                            <span className="text-xs text-muted-foreground mr-2">Categorías:</span>
                            {risk.category.map((cat: string) => (
                              <Badge key={cat} variant="secondary" className="text-xs">
                                {cat}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Dueño del proceso */}
                        {risk.processOwner && (
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs text-muted-foreground">Dueño del Proceso:</span>
                            <Badge variant="outline" className="text-xs text-blue-700 bg-blue-50 border-blue-200">
                              <User className="h-3 w-3 mr-1" />
                              {risk.processOwner}
                            </Badge>
                          </div>
                        )}

                        {/* Método de evaluación de probabilidad */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs text-muted-foreground">Evaluación probabilidad:</span>
                          {getEvaluationMethod(risk) === 'factors' ? (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200" data-testid={`evaluation-method-factors-${risk.id}`}>
                              <Calculator className="h-3 w-3 mr-1" />
                              Por Factores
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200" data-testid={`evaluation-method-direct-${risk.id}`}>
                              <Hash className="h-3 w-3 mr-1" />
                              Evaluación Directa
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-xs">
                          <div>
                            <span className="text-muted-foreground">Probabilidad:</span>
                            <div className="font-medium">{risk.probability}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Impacto:</span>
                            <div className="font-medium">{risk.impact}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Nivel de Riesgo:</span>
                            <div className="font-medium">{getIndividualRiskLevel(risk.inherentRisk)}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 ml-4">
                        <Badge className={`text-xs ${getIndividualRiskColor(risk.inherentRisk)}`}>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Inherente: {risk.inherentRisk}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          {risk.probability} × {risk.impact} = {risk.inherentRisk}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
