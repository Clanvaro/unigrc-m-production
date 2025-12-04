import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Eye, Edit, Trash2, ChevronDown, ChevronUp, ChevronRight, Building2, Workflow, GitBranch, AlertTriangle, Shield, Calculator, Hash, User, CheckCircle, Clock, XCircle, Play, Target, Network, List, MoreVertical } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ProcessForm from "@/components/forms/process-form";
import SubprocessForm from "@/components/forms/subprocess-form";
import MacroprocesoForm from "@/components/forms/macroproceso-form";
import GerenciaForm from "@/components/forms/gerencia-form";
import ProcessMultiSelector, { ProcessAssociation } from "@/components/forms/process-multi-selector";
import GerenciasOrganigrama from "@/components/GerenciasOrganigrama";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RiskValue } from "@/components/RiskValue";
import type { Macroproceso, Process, Subproceso, Risk, ProcessOwner, ProcessValidation, Gerencia } from "@shared/schema";
import { calculateProbability, type ProbabilityFactors } from "@shared/probability-calculation";
import { CreateGuard, EditGuard, DeleteGuard } from "@/components/auth/permission-guard";
import { ExplanationPopover } from "@/components/ExplanationPopover";
import {
  MacroprocesoWithRisks,
  ProcessWithRisks,
  SubprocesoWithRisks,
  getRiskColor,
  getRiskLevel,
  RiskIndicator,
  ResidualRiskIndicator,
  ValidationIndicator,
  ResponsableForm
} from "@/components/organization";

function ProcessMapContent() {
  const [viewMode, setViewMode] = useState<'value-chain' | 'table'>('value-chain');
  const [isCreateMacroprocesoDialogOpen, setIsCreateMacroprocesoDialogOpen] = useState(false);
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
  const [selectedEntityRisks, setSelectedEntityRisks] = useState<{ risks: Risk[], entityName: string, entityType: string }>({ risks: [], entityName: '', entityType: '' });
  const [selectedProcessForRisks, setSelectedProcessForRisks] = useState<{ type: 'macroproceso' | 'proceso' | 'subproceso', id: string, name: string } | null>(null);
  const [showExplanation, setShowExplanation] = useState<{ type: 'macroproceso' | 'proceso' | 'subproceso', name: string, risks: Risk[] } | null>(null);
  const [sortField, setSortField] = useState<'name' | 'code' | 'residualRisk' | 'order' | 'macroproceso' | 'proceso' | 'subproceso' | 'responsable' | 'riskCount'>('order');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [draggedMacroproceso, setDraggedMacroproceso] = useState<MacroprocesoWithRisks | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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
    staleTime: 60000,
  });

  const { data: basicProcesses = [] } = useQuery<ProcessWithRisks[]>({
    queryKey: ["/api/processes/basic"],
    staleTime: 60000,
  });

  const { data: processes = [] } = useQuery<ProcessWithRisks[]>({
    queryKey: ["/api/processes"],
    staleTime: 60000,
    enabled: false,
  });

  const { data: subprocesos = [] } = useQuery<SubprocesoWithRisks[]>({
    queryKey: ["/api/subprocesos"],
    staleTime: 60000,
  });

  const { data: risksResponse } = useQuery<{ data: Risk[], pagination: { limit: number, offset: number, total: number } }>({
    queryKey: ["/api/risks"],
    staleTime: 60000,
    enabled: false,
  });
  const risks = risksResponse?.data || [];

  const { data: processValidations = [] } = useQuery<ProcessValidation[]>({
    queryKey: ["/api/process-validations"],
    staleTime: 60000,
    enabled: false,
  });

  const { data: processOwners = [] } = useQuery<ProcessOwner[]>({
    queryKey: ["/api/process-owners"],
    staleTime: 120000,
  });

  const { data: gerencias = [] } = useQuery<Gerencia[]>({
    queryKey: ["/api/gerencias"],
    staleTime: 120000,
  });

  const { data: processMapValidatedRisks } = useQuery<{
    macroprocesos: Record<string, { validatedRiskCount: number, aggregatedInherentRisk: number, aggregatedResidualRisk: number, riskLevel: string }>,
    processes: Record<string, { validatedRiskCount: number, aggregatedInherentRisk: number, aggregatedResidualRisk: number, riskLevel: string }>,
    subprocesos: Record<string, { validatedRiskCount: number, aggregatedInherentRisk: number, aggregatedResidualRisk: number, riskLevel: string }>
  }>({
    queryKey: ["/api/organization/process-map-risks"],
    staleTime: 1000 * 60 * 5, // 5 minutes - aggregated calculations change infrequently
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const useProcessSummary = (processId: string, enabled: boolean = false) => {
    return useQuery({
      queryKey: ["/api/processes", processId, "summary"],
      queryFn: () => fetch(`/api/processes/${processId}/summary`).then(res => res.json()),
      staleTime: 60000, // 1 minute - summary data, moderate change frequency
      enabled: enabled && !!processId,
    });
  };

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
      await queryClient.cancelQueries({ queryKey: ["/api/macroprocesos"] });

      const previousData = queryClient.getQueryData(["/api/macroprocesos"]);

      queryClient.setQueryData(["/api/macroprocesos"], (old: MacroprocesoWithRisks[] | undefined) => {
        if (!old) return old;
        return old.map(macro => {
          const update = updates.find(u => u.id === macro.id);
          return update ? { ...macro, order: update.order } : macro;
        });
      });

      return { previousData };
    },
    onError: (err, updates, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["/api/macroprocesos"], context.previousData);
      }
    },
    onSettled: () => {
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

  useEffect(() => {
    if (selectedProcessForRisks) {
      openRiskModal(selectedProcessForRisks.id, selectedProcessForRisks.name, selectedProcessForRisks.type);
      setSelectedProcessForRisks(null);
    }
  }, [selectedProcessForRisks]);

  const handleDragStart = (e: React.DragEvent, macroproceso: MacroprocesoWithRisks) => {
    setDraggedMacroproceso(macroproceso);
    e.dataTransfer.effectAllowed = 'move';

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

    const newList = [...sortedMacroprocesos];
    const [draggedItem] = newList.splice(draggedIndex, 1);
    newList.splice(targetIndex, 0, draggedItem);

    const updates = newList.map((macroproceso, index) => ({
      id: macroproceso.id,
      order: index + 1
    }));

    try {
      await reorderMacroprocesosMutation.mutateAsync(updates);

      toast({
        title: "Orden actualizado",
        description: "El orden de los macroprocesos ha sido actualizado exitosamente.",
      });
    } catch (error) {
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
    setIsCreateProcessDialogOpen(false);
    setSelectedMacroprocesoId(null);
  };

  const handleCreateSubprocessSuccess = () => {
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
    const processData = basicProcesses.length > 0 ? basicProcesses : processes;
    return processData.filter((process) => process.macroprocesoId === macroprocesoId);
  };

  const getSubprocessesByProceso = (procesoId: string): SubprocesoWithRisks[] => {
    return subprocesos.filter((subproceso) => subproceso.procesoId === procesoId);
  };

  const getRisksBySubproceso = (subprocesoId: string): Risk[] => {
    return risks.filter((risk) => risk.subprocesoId === subprocesoId);
  };

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

  const openRiskModal = (entityId: string, entityName: string, entityType: 'macroproceso' | 'proceso' | 'subproceso') => {
    let entityRisks: Risk[] = [];

    switch (entityType) {
      case 'macroproceso':
        entityRisks = getRisksByMacroproceso(entityId);
        break;
      case 'proceso':
        entityRisks = getRisksByProcess(entityId);
        break;
      case 'subproceso':
        entityRisks = getRisksBySubproceso(entityId);
        break;
    }

    setSelectedEntityRisks({
      risks: entityRisks,
      entityName,
      entityType
    });
    setRiskModalOpen(true);
  };

  function getIndividualRiskColor(risk: number): string {
    if (risk === 0) return "bg-gray-100 text-gray-600";
    if (risk <= 6) return "bg-green-100 text-green-700";
    if (risk <= 12) return "bg-yellow-100 text-yellow-700";
    if (risk <= 16) return "bg-orange-100 text-orange-700";
    return "bg-red-100 text-red-700";
  }

  function getIndividualRiskLevel(risk: number): string {
    if (risk === 0) return "Sin riesgo";
    if (risk <= 6) return "Bajo";
    if (risk <= 12) return "Medio";
    if (risk <= 16) return "Alto";
    return "Crítico";
  }

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
    if (aggregatedStats.rejectedRisks > 0 || aggregatedStats.rejectedControls > 0) {
      return "requires_review";
    }

    if (aggregatedStats.completionPercentage === 100 ||
      aggregatedStats.validationStatus.every(s => s === "completed")) {
      return "completed";
    }

    if (aggregatedStats.validationStatus.some(s => s === "in_progress") ||
      aggregatedStats.completionPercentage > 0) {
      return "in_progress";
    }

    return "not_started";
  };

  const getResidualRiskForMacroproceso = (macroprocesoId: string) => {
    // Use validated risks data if available
    const validatedData = processMapValidatedRisks?.macroprocesos?.[macroprocesoId];

    if (validatedData && validatedData.validatedRiskCount > 0) {
      const riskLevel = validatedData.riskLevel;
      const riskValue = validatedData.aggregatedResidualRisk;

      let color = "bg-gray-100 text-gray-600";
      if (riskLevel === "Bajo") {
        color = "bg-green-100 text-green-700";
      } else if (riskLevel === "Medio") {
        color = "bg-yellow-100 text-yellow-700";
      } else if (riskLevel === "Alto") {
        color = "bg-orange-100 text-orange-700";
      } else if (riskLevel === "Crítico") {
        color = "bg-red-100 text-red-700";
      }

      return {
        level: parseFloat(riskValue.toFixed(1)),
        color,
        label: riskLevel,
        validatedRiskCount: validatedData.validatedRiskCount
      };
    }

    // Fallback to existing macroproceso data
    const macroproceso = macroprocesos.find(m => m.id === macroprocesoId);

    if (!macroproceso || !macroproceso.residualRisk || macroproceso.residualRisk === 0) {
      return {
        level: 0,
        color: "bg-gray-100 text-gray-600",
        label: "Sin riesgos",
        validatedRiskCount: 0
      };
    }

    const riskValue = macroproceso.residualRisk;

    if (riskValue <= 6) {
      return {
        level: parseFloat(riskValue.toFixed(1)),
        color: "bg-green-100 text-green-700",
        label: "Bajo",
        validatedRiskCount: 0
      };
    } else if (riskValue <= 12) {
      return {
        level: parseFloat(riskValue.toFixed(1)),
        color: "bg-yellow-100 text-yellow-700",
        label: "Medio",
        validatedRiskCount: 0
      };
    } else if (riskValue <= 16) {
      return {
        level: parseFloat(riskValue.toFixed(1)),
        color: "bg-orange-100 text-orange-700",
        label: "Alto",
        validatedRiskCount: 0
      };
    } else {
      return {
        level: parseFloat(riskValue.toFixed(1)),
        color: "bg-red-100 text-red-700",
        label: "Crítico",
        validatedRiskCount: 0
      };
    }
  };

  const getValidationStatusForMacroproceso = (macroprocesoId: string) => {
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

  const navigateToMacroprocesoDetail = (macroprocesoId: string) => {
    setExpandedMacroprocesos(prev => {
      const newExpanded = new Set(prev);
      newExpanded.add(macroprocesoId);
      return newExpanded;
    });

    setTimeout(() => {
      const element = document.querySelector(`[data-testid="macroproceso-card-${macroprocesoId}"]`);
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });

        element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
        }, 2000);
      }
    }, 100);
  };

  const [, navigate] = useLocation();

  const navigateToValidationDashboard = (macroprocesoId: string) => {
    navigate(`/validation?macroproceso=${macroprocesoId}`);
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedMacroprocesos = () => {
    return [...macroprocesos].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'name':
        case 'macroproceso':
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
        case 'riskCount':
          aValue = a.riskCount || getRisksByMacroproceso(a.id).length;
          bValue = b.riskCount || getRisksByMacroproceso(b.id).length;
          break;
        case 'responsable':
          const aOwner = processOwners.find(o => o.id === a.ownerId);
          const bOwner = processOwners.find(o => o.id === b.ownerId);
          aValue = aOwner?.name.toLowerCase() || '';
          bValue = bOwner?.name.toLowerCase() || '';
          break;
        case 'proceso':
        case 'subproceso':
          // For these, we'll sort by macroproceso name as they're hierarchical
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              Mapa de Procesos
            </div>
            <div className="flex gap-2">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'value-chain' | 'table')} className="w-auto">
                <TabsList>
                  <TabsTrigger value="value-chain" className="gap-2" data-testid="tab-value-chain">
                    <Workflow className="h-4 w-4" />
                    Cadena de Valor
                  </TabsTrigger>
                  <TabsTrigger value="table" className="gap-2" data-testid="tab-table">
                    <List className="h-4 w-4" />
                    Tabla
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Dialog open={isCreateMacroprocesoDialogOpen} onOpenChange={setIsCreateMacroprocesoDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-create-macroproceso">
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Macroproceso
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Macroproceso</DialogTitle>
                    <DialogDescription>
                      Crea un nuevo macroproceso en la cadena de valor
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4">
                    <MacroprocesoForm onSuccess={() => setIsCreateMacroprocesoDialogOpen(false)} />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {viewMode === 'value-chain' ? (
            <div className="relative bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20 p-6 rounded-lg">
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

                        {macroproceso.owner && (
                          <div className="text-xs text-white/80 mb-2">
                            <User className="h-3 w-3 inline mr-1" />
                            {macroproceso.owner.name}
                          </div>
                        )}

                        <div className="flex flex-col gap-1 items-center">
                          <ResidualRiskIndicator
                            level={residualRiskInfo.level}
                            color={residualRiskInfo.color}
                            label={residualRiskInfo.label}
                            size="xs"
                            onClick={() => navigateToMacroprocesoDetail(macroproceso.id)}
                          />
                          {residualRiskInfo.validatedRiskCount && residualRiskInfo.validatedRiskCount > 0 && (
                            <Badge className="text-xs bg-white/20 text-white border-white/20">
                              <AlertTriangle className="h-2 w-2 mr-1" />
                              {residualRiskInfo.validatedRiskCount} riesgo{residualRiskInfo.validatedRiskCount !== 1 ? 's' : ''} validado{residualRiskInfo.validatedRiskCount !== 1 ? 's' : ''}
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

              <div className="relative">
                <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-4 z-10">
                  <div className="bg-green-500 text-white px-2 py-6 rounded-r-lg text-sm font-medium transform rotate-90 origin-center">
                    MARGEN
                  </div>
                </div>

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

                          {macroproceso.owner && (
                            <div className="text-xs text-white/80 mb-2">
                              <User className="h-3 w-3 inline mr-1" />
                              {macroproceso.owner.name}
                            </div>
                          )}

                          <div className="flex flex-col gap-1 items-center">
                            <ResidualRiskIndicator
                              level={residualRiskInfo.level}
                              color={residualRiskInfo.color}
                              label={residualRiskInfo.label}
                              size="xs"
                              onClick={() => navigateToMacroprocesoDetail(macroproceso.id)}
                            />
                            {residualRiskInfo.validatedRiskCount && residualRiskInfo.validatedRiskCount > 0 && (
                              <Badge className="text-xs bg-white/20 text-white border-white/20">
                                <AlertTriangle className="h-2 w-2 mr-1" />
                                {residualRiskInfo.validatedRiskCount} riesgo{residualRiskInfo.validatedRiskCount !== 1 ? 's' : ''} validado{residualRiskInfo.validatedRiskCount !== 1 ? 's' : ''}
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

              <div className="flex justify-center mt-4">
                <div className="text-center">
                  <ChevronDown className="h-6 w-6 text-green-600 mx-auto animate-bounce" />
                  <div className="text-xs text-muted-foreground mt-1">Ver detalle de procesos</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg">
              <div className="max-h-[600px] overflow-auto relative">
                <Table>
                  <TableHeader>
                    <TableRow className="sticky top-0 bg-background z-10 border-b">
                      <TableHead className="bg-background">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('macroproceso')}
                          className="h-8 px-2 hover:bg-muted"
                        >
                          Macroproceso
                          {sortField === 'macroproceso' && (
                            sortDirection === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead className="bg-background">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('proceso')}
                          className="h-8 px-2 hover:bg-muted"
                        >
                          Proceso
                          {sortField === 'proceso' && (
                            sortDirection === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead className="bg-background">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('subproceso')}
                          className="h-8 px-2 hover:bg-muted"
                        >
                          Subproceso
                          {sortField === 'subproceso' && (
                            sortDirection === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead className="bg-background">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('responsable')}
                          className="h-8 px-2 hover:bg-muted"
                        >
                          Dueño Responsable
                          {sortField === 'responsable' && (
                            sortDirection === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead className="bg-background">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('riskCount')}
                          className="h-8 px-2 hover:bg-muted"
                        >
                          Cantidad de Riesgos
                          {sortField === 'riskCount' && (
                            sortDirection === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead className="bg-background">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('residualRisk')}
                          className="h-8 px-2 hover:bg-muted"
                        >
                          Riesgo Residual
                          {sortField === 'residualRisk' && (
                            sortDirection === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right bg-background">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getSortedMacroprocesos().map((macroproceso) => {
                      const macroprocesoProcesses = basicProcesses.filter(p => p.macroprocesoId === macroproceso.id);
                      const residualRiskInfo = getResidualRiskForMacroproceso(macroproceso.id);

                      if (macroprocesoProcesses.length === 0) {
                        const macroprocesoRiskCount = processMapValidatedRisks?.macroprocesos?.[macroproceso.id]?.validatedRiskCount ?? (macroproceso.riskCount || getRisksByMacroproceso(macroproceso.id).length);

                        return (
                          <TableRow
                            key={macroproceso.id}
                            data-testid={`macroproceso-table-row-${macroproceso.id}`}
                            className="hover:bg-muted/50"
                          >
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge variant="outline" className="w-fit">{macroproceso.code}</Badge>
                                <span className="font-medium">{macroproceso.name}</span>
                                <Badge variant={macroproceso.type === "clave" ? "default" : "secondary"} className="w-fit text-xs">
                                  {macroproceso.type === "clave" ? "Primaria" : "Apoyo"}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">—</TableCell>
                            <TableCell className="text-muted-foreground">—</TableCell>
                            <TableCell className="text-muted-foreground">—</TableCell>
                            <TableCell>
                              {macroprocesoRiskCount > 0 ? (
                                <Badge variant="secondary" className="gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {macroprocesoRiskCount} riesgo{macroprocesoRiskCount !== 1 ? 's' : ''}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">Sin riesgos</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <ResidualRiskIndicator
                                level={residualRiskInfo.level}
                                color={residualRiskInfo.color}
                                label={residualRiskInfo.label}
                                size="sm"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    data-testid={`button-actions-${macroproceso.id}`}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedProcessForRisks({
                                        type: 'macroproceso',
                                        id: macroproceso.id,
                                        name: macroproceso.name
                                      });
                                    }}
                                    data-testid={`action-view-risks-${macroproceso.id}`}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver riesgos asociados
                                  </DropdownMenuItem>
                                  <CreateGuard itemType="proceso">
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedMacroprocesoId(macroproceso.id);
                                        setIsCreateProcessDialogOpen(true);
                                      }}
                                      data-testid={`action-add-process-${macroproceso.id}`}
                                    >
                                      <Plus className="h-4 w-4 mr-2" />
                                      Agregar proceso
                                    </DropdownMenuItem>
                                  </CreateGuard>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const risks = getRisksByMacroproceso(macroproceso.id);
                                      setShowExplanation({
                                        type: 'macroproceso',
                                        name: macroproceso.name,
                                        risks: risks
                                      });
                                    }}
                                    data-testid={`action-view-calculation-${macroproceso.id}`}
                                  >
                                    <Calculator className="h-4 w-4 mr-2" />
                                    Ver cálculo residual
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <EditGuard itemType="macroproceso">
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setEditingMacroproceso(macroproceso);
                                      }}
                                      data-testid={`action-edit-${macroproceso.id}`}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                  </EditGuard>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return macroprocesoProcesses.map((proceso, processIndex) => {
                        const procesoSubprocesos = subprocesos.filter(s => s.procesoId === proceso.id);
                        const procesoOwner = processOwners.find(o => o.id === proceso.ownerId);

                        if (procesoSubprocesos.length === 0) {
                          const procesoRiskCount = processMapValidatedRisks?.processes?.[proceso.id]?.validatedRiskCount ?? (proceso.riskCount || getRisksByProcess(proceso.id).length);

                          return (
                            <TableRow
                              key={`${macroproceso.id}-${proceso.id}`}
                              data-testid={`process-table-row-${proceso.id}`}
                              className="hover:bg-muted/50"
                            >
                              <TableCell>
                                {processIndex === 0 && (
                                  <div className="flex flex-col gap-1">
                                    <Badge variant="outline" className="w-fit">{macroproceso.code}</Badge>
                                    <span className="font-medium">{macroproceso.name}</span>
                                    <Badge variant={macroproceso.type === "clave" ? "default" : "secondary"} className="w-fit text-xs">
                                      {macroproceso.type === "clave" ? "Primaria" : "Apoyo"}
                                    </Badge>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <Badge variant="outline" className="w-fit">{proceso.code}</Badge>
                                  <span className="font-medium text-sm">{proceso.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">—</TableCell>
                              <TableCell>
                                {procesoOwner && (
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback className="text-xs">
                                        {procesoOwner.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">{procesoOwner.name}</span>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {procesoRiskCount > 0 ? (
                                  <Badge variant="secondary" className="gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {procesoRiskCount} riesgo{procesoRiskCount !== 1 ? 's' : ''}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">Sin riesgos</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {proceso.residualRisk !== undefined && proceso.residualRisk > 0 ? (
                                  <Badge className={getRiskColor(proceso.residualRisk)}>
                                    {proceso.residualRisk.toFixed(1)}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">Sin riesgo</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      data-testid={`button-actions-${proceso.id}`}
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedProcessForRisks({
                                          type: 'proceso',
                                          id: proceso.id,
                                          name: proceso.name
                                        });
                                      }}
                                      data-testid={`action-view-risks-${proceso.id}`}
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      Ver riesgos asociados
                                    </DropdownMenuItem>
                                    <CreateGuard itemType="subproceso">
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedProcesoId(proceso.id);
                                          setIsCreateSubprocessDialogOpen(true);
                                        }}
                                        data-testid={`action-add-subprocess-${proceso.id}`}
                                      >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Agregar subproceso
                                      </DropdownMenuItem>
                                    </CreateGuard>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        const risks = getRisksByProcess(proceso.id);
                                        setShowExplanation({
                                          type: 'proceso',
                                          name: proceso.name,
                                          risks: risks
                                        });
                                      }}
                                      data-testid={`action-view-calculation-${proceso.id}`}
                                    >
                                      <Calculator className="h-4 w-4 mr-2" />
                                      Ver cálculo residual
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <EditGuard itemType="proceso">
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setEditingProcess(proceso);
                                        }}
                                        data-testid={`action-edit-${proceso.id}`}
                                      >
                                        <Edit className="h-4 w-4 mr-2" />
                                        Editar
                                      </DropdownMenuItem>
                                    </EditGuard>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        }

                        return procesoSubprocesos.map((subproceso, subIndex) => {
                          const subprocesoOwner = processOwners.find(o => o.id === subproceso.ownerId);
                          const subprocesoRiskCount = processMapValidatedRisks?.subprocesos?.[subproceso.id]?.validatedRiskCount ?? (subproceso.riskCount || getRisksBySubproceso(subproceso.id).length);

                          return (
                            <TableRow
                              key={`${macroproceso.id}-${proceso.id}-${subproceso.id}`}
                              data-testid={`subproceso-table-row-${subproceso.id}`}
                              className="hover:bg-muted/50"
                            >
                              <TableCell>
                                {processIndex === 0 && subIndex === 0 && (
                                  <div className="flex flex-col gap-1">
                                    <Badge variant="outline" className="w-fit">{macroproceso.code}</Badge>
                                    <span className="font-medium">{macroproceso.name}</span>
                                    <Badge variant={macroproceso.type === "clave" ? "default" : "secondary"} className="w-fit text-xs">
                                      {macroproceso.type === "clave" ? "Primaria" : "Apoyo"}
                                    </Badge>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {subIndex === 0 && (
                                  <div className="flex flex-col gap-1">
                                    <Badge variant="outline" className="w-fit">{proceso.code}</Badge>
                                    <span className="font-medium text-sm">{proceso.name}</span>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <Badge variant="outline" className="w-fit bg-purple-50 dark:bg-purple-950">{subproceso.code}</Badge>
                                  <span className="text-sm">{subproceso.name}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {subprocesoOwner && (
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback className="text-xs">
                                        {subprocesoOwner.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">{subprocesoOwner.name}</span>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {subprocesoRiskCount > 0 ? (
                                  <Badge variant="secondary" className="gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {subprocesoRiskCount} riesgo{subprocesoRiskCount !== 1 ? 's' : ''}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">Sin riesgos</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {subproceso.residualRisk !== undefined && subproceso.residualRisk > 0 ? (
                                  <Badge className={getRiskColor(subproceso.residualRisk)}>
                                    {subproceso.residualRisk.toFixed(1)}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">Sin riesgo</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      data-testid={`button-actions-${subproceso.id}`}
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedProcessForRisks({
                                          type: 'subproceso',
                                          id: subproceso.id,
                                          name: subproceso.name
                                        });
                                      }}
                                      data-testid={`action-view-risks-${subproceso.id}`}
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      Ver riesgos asociados
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        const risks = getRisksBySubproceso(subproceso.id);
                                        setShowExplanation({
                                          type: 'subproceso',
                                          name: subproceso.name,
                                          risks: risks
                                        });
                                      }}
                                      data-testid={`action-view-calculation-${subproceso.id}`}
                                    >
                                      <Calculator className="h-4 w-4 mr-2" />
                                      Ver cálculo residual
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <EditGuard itemType="subproceso">
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setEditingSubprocess(subproceso);
                                        }}
                                        data-testid={`action-edit-${subproceso.id}`}
                                      >
                                        <Edit className="h-4 w-4 mr-2" />
                                        Editar
                                      </DropdownMenuItem>
                                    </EditGuard>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        });
                      });
                    }).flat()}
                  </TableBody>
                </Table>
                {getSortedMacroprocesos().length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay macroprocesos configurados
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {viewMode === 'value-chain' && (
        <>
          <div className="flex items-center justify-end gap-2 mb-4 text-sm">
            <span className="text-muted-foreground">Ordenar:</span>
            <Select value={sortField} onValueChange={(value) => setSortField(value as 'name' | 'code' | 'residualRisk' | 'order')}>
              <SelectTrigger className="w-40 h-8" data-testid="select-sort-field">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="order">Orden</SelectItem>
                <SelectItem value="name">Nombre</SelectItem>
                <SelectItem value="code">Código</SelectItem>
                <SelectItem value="residualRisk">Riesgo</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortDirection} onValueChange={(value) => setSortDirection(value as 'asc' | 'desc')}>
              <SelectTrigger className="w-24 h-8" data-testid="select-sort-direction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">↑ Asc</SelectItem>
                <SelectItem value="desc">↓ Desc</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
                      <div className="space-y-3">
                        <CollapsibleTrigger
                          className="flex items-center gap-3 hover:no-underline p-0 w-full text-left"
                          onClick={() => toggleMacroproceso(macroproceso.id)}
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                          <Building2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg">{macroproceso.name}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">{macroproceso.description}</p>
                          </div>
                        </CollapsibleTrigger>

                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          <RiskIndicator
                            inherentRisk={processMapValidatedRisks?.macroprocesos?.[macroproceso.id]?.aggregatedInherentRisk ?? macroproceso.inherentRisk}
                            residualRisk={processMapValidatedRisks?.macroprocesos?.[macroproceso.id]?.aggregatedResidualRisk ?? macroproceso.residualRisk}
                            riskCount={processMapValidatedRisks?.macroprocesos?.[macroproceso.id]?.validatedRiskCount ?? macroproceso.riskCount}
                            size="sm"
                            onRiskCountClick={() => openRiskModal(macroproceso.id, macroproceso.name, 'macroproceso')}
                          />
                          {macroproceso.owner && (
                            <Badge variant="outline" className="gap-1">
                              <User className="h-3 w-3" />
                              {macroproceso.owner.name}
                            </Badge>
                          )}
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
                                          inherentRisk={processMapValidatedRisks?.processes?.[process.id]?.aggregatedInherentRisk ?? process.inherentRisk}
                                          residualRisk={processMapValidatedRisks?.processes?.[process.id]?.aggregatedResidualRisk ?? process.residualRisk}
                                          riskCount={processMapValidatedRisks?.processes?.[process.id]?.validatedRiskCount ?? process.riskCount}
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
                                        <div className="text-xs text-muted-foreground">
                                          <strong>Responsable:</strong> {process.owner?.name || "No asignado"}
                                        </div>

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
                                                        inherentRisk={processMapValidatedRisks?.subprocesos?.[subproceso.id]?.aggregatedInherentRisk ?? subproceso.inherentRisk}
                                                        residualRisk={processMapValidatedRisks?.subprocesos?.[subproceso.id]?.aggregatedResidualRisk ?? subproceso.residualRisk}
                                                        riskCount={processMapValidatedRisks?.subprocesos?.[subproceso.id]?.validatedRiskCount ?? subproceso.riskCount}
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
        </>
      )}

      <Dialog open={riskModalOpen} onOpenChange={setRiskModalOpen}>
        <DialogContent className="max-w-3xl">
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

                        {risk.processOwner && (
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs text-muted-foreground">Dueño del Proceso:</span>
                            <Badge variant="outline" className="text-xs text-blue-700 bg-blue-50 border-blue-200">
                              <User className="h-3 w-3 mr-1" />
                              {risk.processOwner}
                            </Badge>
                          </div>
                        )}

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

      <Dialog open={!!showExplanation} onOpenChange={(open) => !open && setShowExplanation(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Cálculo del Riesgo Residual - {showExplanation?.name}
            </DialogTitle>
            <DialogDescription>
              Detalle de cómo se calculó el riesgo residual agregado para este {showExplanation?.type}.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[70vh] space-y-4">
            {showExplanation && showExplanation.risks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No hay riesgos asociados para calcular el riesgo residual</p>
              </div>
            ) : showExplanation && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  El riesgo residual agregado se calcula sumando el riesgo residual de todos los riesgos asociados:
                </p>
                <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                  {showExplanation.risks.map((risk, index) => {
                    const riskValue = risk.inherentRisk || 0;
                    return (
                      <div key={risk.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-muted-foreground">#{index + 1}</span>
                          <Badge variant="outline" className="font-mono text-xs">{risk.code}</Badge>
                          <span className="truncate">{risk.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Riesgo Inherente:</span>
                          <Badge className={getRiskColor(riskValue)}>
                            {riskValue.toFixed(1)}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                  <div className="border-t pt-3 mt-3">
                    <div className="flex items-center justify-between font-medium">
                      <span>Total Riesgo Inherente Agregado:</span>
                      <Badge className={getRiskColor(
                        showExplanation.risks.reduce((sum, r) => sum + (r.inherentRisk || 0), 0)
                      )} data-testid="total-residual-risk">
                        {showExplanation.risks.reduce((sum, r) => sum + (r.inherentRisk || 0), 0).toFixed(1)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Fórmula: Suma de todos los riesgos inherentes = {showExplanation.risks.map((r, i) =>
                        `${(r.inherentRisk || 0).toFixed(1)}`
                      ).join(' + ')} = {showExplanation.risks.reduce((sum, r) => sum + (r.inherentRisk || 0), 0).toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      Nota: El riesgo residual se calcula aplicando la efectividad de los controles asociados a cada riesgo.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar macroproceso */}
      <Dialog open={!!editingMacroproceso} onOpenChange={(open) => !open && setEditingMacroproceso(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Macroproceso</DialogTitle>
          </DialogHeader>
          <MacroprocesoForm
            macroproceso={editingMacroproceso!}
            onSuccess={handleEditMacroprocesoSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog para crear proceso */}
      <Dialog open={isCreateProcessDialogOpen} onOpenChange={(open) => {
        setIsCreateProcessDialogOpen(open);
        if (!open) setSelectedMacroprocesoId(null);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agregar Proceso</DialogTitle>
          </DialogHeader>
          <ProcessForm
            macroprocesoId={selectedMacroprocesoId || undefined}
            onSuccess={handleCreateProcessSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog para editar proceso */}
      <Dialog open={!!editingProcess} onOpenChange={(open) => !open && setEditingProcess(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Proceso</DialogTitle>
          </DialogHeader>
          <ProcessForm
            process={editingProcess!}
            onSuccess={handleEditProcessSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog para crear subproceso */}
      <Dialog open={isCreateSubprocessDialogOpen} onOpenChange={(open) => {
        setIsCreateSubprocessDialogOpen(open);
        if (!open) setSelectedProcesoId(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Subproceso</DialogTitle>
          </DialogHeader>
          <SubprocessForm
            procesoId={selectedProcesoId || undefined}
            onSuccess={handleCreateSubprocessSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog para editar subproceso */}
      <Dialog open={!!editingSubprocess} onOpenChange={(open) => !open && setEditingSubprocess(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Subproceso</DialogTitle>
          </DialogHeader>
          <SubprocessForm
            subproceso={editingSubprocess!}
            onSuccess={handleEditSubprocessSuccess}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GerenciasContent() {
  const [viewMode, setViewMode] = useState<'organigrama' | 'lista'>('organigrama');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingGerencia, setEditingGerencia] = useState<Gerencia | null>(null);
  const [deleteConfirmGerencia, setDeleteConfirmGerencia] = useState<Gerencia | null>(null);
  const [deletionReason, setDeletionReason] = useState("");
  const [sortField, setSortField] = useState<'code' | 'name' | 'manager' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: gerencias = [], isLoading } = useQuery<Gerencia[]>({
    queryKey: ["/api/gerencias"],
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: processOwners = [] } = useQuery<ProcessOwner[]>({
    queryKey: ["/api/process-owners"],
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: macroprocesos = [] } = useQuery<MacroprocesoWithRisks[]>({
    queryKey: ["/api/macroprocesos"],
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: processes = [] } = useQuery<ProcessWithRisks[]>({
    queryKey: ["/api/processes/basic"],
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: subprocesos = [] } = useQuery<SubprocesoWithRisks[]>({
    queryKey: ["/api/subprocesos"],
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: processGerenciasRelations = [] } = useQuery<any[]>({
    queryKey: ["/api/process-gerencias-all"],
    staleTime: 1000 * 60 * 5, // 5 minutes - structural data changes infrequently (mutations invalidate cache)
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const createGerenciaMutation = useMutation({
    mutationFn: async (data: Partial<Gerencia> & { processAssociations: ProcessAssociation[] }) => {
      const { processAssociations, ...gerenciaData } = data;
      const createdGerencia = await apiRequest("/api/gerencias", "POST", gerenciaData);

      // Crear asociaciones de procesos con deduplicación
      if (processAssociations && processAssociations.length > 0) {
        const uniqueAssociations = processAssociations.filter((assoc, index, self) => {
          return index === self.findIndex(a =>
            a.macroprocesoId === assoc.macroprocesoId &&
            a.processId === assoc.processId &&
            a.subprocesoId === assoc.subprocesoId
          );
        });

        await Promise.all(
          uniqueAssociations.map((association) => {
            // Prioridad: subproceso > proceso > macroproceso (el más específico primero)
            if (association.subprocesoId) {
              return apiRequest(`/api/subprocesos/${association.subprocesoId}/gerencias`, "POST", { gerenciaId: createdGerencia.id });
            } else if (association.processId) {
              return apiRequest(`/api/processes/${association.processId}/gerencias`, "POST", { gerenciaId: createdGerencia.id });
            } else if (association.macroprocesoId) {
              return apiRequest(`/api/macroprocesos/${association.macroprocesoId}/gerencias`, "POST", { gerenciaId: createdGerencia.id });
            }
            return Promise.resolve();
          })
        );
      }

      return createdGerencia;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gerencias"] });
      queryClient.invalidateQueries({ queryKey: ["/api/process-gerencias-all"] });
      toast({ title: "Gerencia creada", description: "La gerencia ha sido creada exitosamente." });
      setIsCreateDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "No se pudo crear la gerencia.", variant: "destructive" });
    },
  });

  const updateGerenciaMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Gerencia> & { processAssociations: ProcessAssociation[] } }) => {
      try {
        const { processAssociations, ...gerenciaData } = data;
        console.log('Updating gerencia:', id, gerenciaData);
        const updatedGerencia = await apiRequest(`/api/gerencias/${id}`, "PATCH", gerenciaData);

        // Eliminar asociaciones existentes
        console.log('Fetching existing associations...');
        const [existingMacros, existingProcesses, existingSubprocesos] = await Promise.all([
          apiRequest(`/api/gerencias/${id}/macroprocesos`, "GET").catch(() => []),
          apiRequest(`/api/gerencias/${id}/processes`, "GET").catch(() => []),
          apiRequest(`/api/gerencias/${id}/subprocesos`, "GET").catch(() => []),
        ]);

        console.log('Existing associations:', {
          macros: existingMacros.length,
          processes: existingProcesses.length,
          subprocesos: existingSubprocesos.length
        });

        // Eliminar asociaciones existentes - must complete successfully before creating new ones
        const deletePromises = [
          ...existingMacros.map((macro: any) =>
            apiRequest(`/api/macroprocesos/${macro.id}/gerencias/${id}`, "DELETE")
          ),
          ...existingProcesses.map((process: any) =>
            apiRequest(`/api/processes/${process.id}/gerencias/${id}`, "DELETE")
          ),
          ...existingSubprocesos.map((subproceso: any) =>
            apiRequest(`/api/subprocesos/${subproceso.id}/gerencias/${id}`, "DELETE")
          ),
        ];

        // Wait for ALL deletions to complete successfully before creating new associations
        if (deletePromises.length > 0) {
          try {
            await Promise.all(deletePromises);
            // Small delay to ensure database consistency before creating new associations
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log('Existing associations removed');
          } catch (err) {
            console.error('Error removing existing associations:', err);
            throw new Error('No se pudieron eliminar las asociaciones existentes. Por favor, intente nuevamente.');
          }
        }

        // Crear nuevas asociaciones con deduplicación
        if (processAssociations && processAssociations.length > 0) {
          const uniqueAssociations = processAssociations.filter((assoc, index, self) => {
            return index === self.findIndex(a =>
              a.macroprocesoId === assoc.macroprocesoId &&
              a.processId === assoc.processId &&
              a.subprocesoId === assoc.subprocesoId
            );
          });

          console.log('Creating new associations:', uniqueAssociations.length);

          const createPromises = uniqueAssociations.map((association) => {
            // Prioridad: subproceso > proceso > macroproceso (el más específico primero)
            if (association.subprocesoId) {
              return apiRequest(`/api/subprocesos/${association.subprocesoId}/gerencias`, "POST", { gerenciaId: id })
                .catch((err) => {
                  console.error(`Error adding subproceso ${association.subprocesoId}:`, err);
                  if (!err?.message?.includes('ya está asignada')) {
                    throw err;
                  }
                });
            } else if (association.processId) {
              return apiRequest(`/api/processes/${association.processId}/gerencias`, "POST", { gerenciaId: id })
                .catch((err) => {
                  console.error(`Error adding process ${association.processId}:`, err);
                  if (!err?.message?.includes('ya está asignada')) {
                    throw err;
                  }
                });
            } else if (association.macroprocesoId) {
              return apiRequest(`/api/macroprocesos/${association.macroprocesoId}/gerencias`, "POST", { gerenciaId: id })
                .catch((err) => {
                  console.error(`Error adding macroproceso ${association.macroprocesoId}:`, err);
                  // Si el error es porque ya existe, no es crítico
                  if (!err?.message?.includes('ya está asignada')) {
                    throw err;
                  }
                });
            }
            return Promise.resolve();
          });

          const results = await Promise.allSettled(createPromises);
          const failures = results.filter(r => r.status === 'rejected');
          if (failures.length > 0) {
            console.warn('Some associations failed to create:', failures);
          }
          console.log('New associations created');
        }

        return updatedGerencia;
      } catch (error) {
        console.error('Error updating gerencia:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gerencias"] });
      queryClient.invalidateQueries({ queryKey: ["/api/process-gerencias-all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/macroprocesos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/processes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/processes/basic"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subprocesos"] });
      toast({ title: "Gerencia actualizada", description: "La gerencia ha sido actualizada exitosamente." });
      setEditingGerencia(null);
    },
    onError: (error: Error) => {
      console.error('Update gerencia mutation error:', error);
      toast({ title: "Error", description: error.message || "No se pudo actualizar la gerencia.", variant: "destructive" });
    },
  });

  const deleteGerenciaMutation = useMutation({
    mutationFn: ({ id, deletionReason }: { id: string; deletionReason: string }) =>
      apiRequest(`/api/gerencias/${id}`, "DELETE", { deletionReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gerencias"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trash"] });
      toast({ title: "Gerencia eliminada", description: "La gerencia ha sido eliminada exitosamente." });
      setDeletionReason("");
      setDeleteConfirmGerencia(null);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo eliminar la gerencia.", variant: "destructive" });
    },
  });

  const handleDelete = (gerencia: Gerencia) => {
    setDeleteConfirmGerencia(gerencia);
    setDeletionReason("");
  };

  const confirmDelete = () => {
    if (deleteConfirmGerencia) {
      if (!deletionReason.trim()) {
        toast({ title: "Motivo requerido", description: "Por favor ingrese el motivo de la eliminación.", variant: "destructive" });
        return;
      }
      deleteGerenciaMutation.mutate({ id: deleteConfirmGerencia.id, deletionReason });
    }
  };

  const getManagerName = (managerId?: string | null) => {
    if (!managerId) return "Sin asignar";
    const manager = processOwners.find(owner => owner.id === managerId);
    return manager ? manager.name : "Desconocido";
  };

  const getAssociatedProcesses = (gerenciaId: string) => {
    const associations = processGerenciasRelations.filter(
      (rel: any) => rel.gerenciaId === gerenciaId
    );

    const processNames: string[] = [];

    associations.forEach((rel: any) => {
      if (rel.macroprocesoId) {
        const macro = macroprocesos.find(m => m.id === rel.macroprocesoId);
        if (macro) processNames.push(`📋 ${macro.name}`);
      }
      if (rel.processId) {
        const process = processes.find(p => p.id === rel.processId);
        if (process) processNames.push(`⚙️ ${process.name}`);
      }
      if (rel.subprocesoId) {
        const subproceso = subprocesos.find(s => s.id === rel.subprocesoId);
        if (subproceso) processNames.push(`📌 ${subproceso.name}`);
      }
    });

    return processNames;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="border rounded-lg">
          <div className="h-12 bg-muted animate-pulse" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 border-t bg-muted/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const handleNodeClick = (gerencia: Gerencia) => {
    setEditingGerencia(gerencia);
  };

  const handleSort = (field: 'code' | 'name' | 'manager') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedGerencias = [...gerencias].sort((a, b) => {
    if (!sortField) return 0;

    let aValue: string;
    let bValue: string;

    switch (sortField) {
      case 'code':
        aValue = a.code?.toLowerCase() || '';
        bValue = b.code?.toLowerCase() || '';
        break;
      case 'name':
        aValue = a.name?.toLowerCase() || '';
        bValue = b.name?.toLowerCase() || '';
        break;
      case 'manager':
        aValue = getManagerName(a.managerId).toLowerCase();
        bValue = getManagerName(b.managerId).toLowerCase();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-4" data-testid="gerencias-content">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gerencias</h2>
        <div className="flex gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'organigrama' | 'lista')} className="w-auto">
            <TabsList>
              <TabsTrigger value="organigrama" className="gap-2">
                <Network className="h-4 w-4" />
                Organigrama
              </TabsTrigger>
              <TabsTrigger value="lista" className="gap-2">
                <List className="h-4 w-4" />
                Lista
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <EditGuard itemType="gerencia">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-gerencia">
                  <Building2 className="h-4 w-4 mr-2" />
                  Crear Gerencia
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl" data-testid="dialog-create-gerencia">
                <DialogHeader>
                  <DialogTitle>Crear Nueva Gerencia</DialogTitle>
                  <DialogDescription>
                    Complete el formulario para crear una nueva gerencia
                  </DialogDescription>
                </DialogHeader>
                <GerenciaForm
                  onSubmit={(data) => createGerenciaMutation.mutate(data)}
                  onCancel={() => setIsCreateDialogOpen(false)}
                  processOwners={processOwners}
                  gerencias={gerencias}
                  isPending={createGerenciaMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </EditGuard>
        </div>
      </div>

      {viewMode === 'organigrama' ? (
        <GerenciasOrganigrama
          gerencias={gerencias}
          processOwners={processOwners}
          onNodeClick={handleNodeClick}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('code')}
                  >
                    <div className="flex items-center gap-1">
                      Código
                      {sortField === 'code' && (
                        sortOrder === 'asc' ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3 rotate-180" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Nombre
                      {sortField === 'name' && (
                        sortOrder === 'asc' ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3 rotate-180" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 select-none"
                    onClick={() => handleSort('manager')}
                  >
                    <div className="flex items-center gap-1">
                      Gerente
                      {sortField === 'manager' && (
                        sortOrder === 'asc' ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3 rotate-180" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Procesos Asociados</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedGerencias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No hay gerencias registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedGerencias.map((gerencia) => (
                    <TableRow key={gerencia.id} data-testid={`row-gerencia-${gerencia.id}`}>
                      <TableCell className="font-mono text-sm" data-testid={`code-${gerencia.id}`}>
                        {gerencia.code}
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`name-${gerencia.id}`}>
                        {gerencia.name}
                      </TableCell>
                      <TableCell data-testid={`manager-${gerencia.id}`}>
                        <Badge variant="outline" className="text-xs">
                          <User className="h-3 w-3 mr-1" />
                          {getManagerName(gerencia.managerId)}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`processes-${gerencia.id}`}>
                        {(() => {
                          const associatedProcesses = getAssociatedProcesses(gerencia.id);
                          if (associatedProcesses.length === 0) {
                            return (
                              <span className="text-sm text-muted-foreground">Sin procesos</span>
                            );
                          }
                          return (
                            <div className="flex flex-wrap gap-1">
                              {associatedProcesses.slice(0, 3).map((processName, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {processName}
                                </Badge>
                              ))}
                              {associatedProcesses.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{associatedProcesses.length - 3} más
                                </Badge>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="max-w-md truncate text-sm text-muted-foreground" data-testid={`description-${gerencia.id}`}>
                        {gerencia.description || "Sin descripción"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <EditGuard itemType="gerencia">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingGerencia(gerencia)}
                              data-testid={`button-edit-${gerencia.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </EditGuard>
                          <DeleteGuard itemType="gerencia">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(gerencia)}
                              data-testid={`button-delete-${gerencia.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </DeleteGuard>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editingGerencia} onOpenChange={(open) => !open && setEditingGerencia(null)}>
        <DialogContent className="max-w-2xl" data-testid="dialog-edit-gerencia">
          <DialogHeader>
            <DialogTitle>Editar Gerencia</DialogTitle>
            <DialogDescription>
              Actualice la información de la gerencia
            </DialogDescription>
          </DialogHeader>
          {editingGerencia && (
            <GerenciaForm
              gerencia={editingGerencia}
              onSubmit={(data) => updateGerenciaMutation.mutate({ id: editingGerencia.id, data })}
              onCancel={() => setEditingGerencia(null)}
              processOwners={processOwners}
              gerencias={gerencias}
              isPending={updateGerenciaMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmGerencia} onOpenChange={(open) => !open && setDeleteConfirmGerencia(null)}>
        <AlertDialogContent data-testid="dialog-delete-gerencia">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de eliminar esta gerencia?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marcará la gerencia como eliminada. Puede restaurarla desde la papelera.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="deletion-reason">Motivo de eliminación *</Label>
            <Textarea
              id="deletion-reason"
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              placeholder="Ingrese el motivo de la eliminación..."
              className="mt-2"
              data-testid="input-deletion-reason"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
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
    </div>
  );
}

function ResponsablesContent() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingResponsable, setEditingResponsable] = useState<ProcessOwner | null>(null);
  const [viewingResponsable, setViewingResponsable] = useState<ProcessOwner | null>(null);
  const [deleteConfirmResponsable, setDeleteConfirmResponsable] = useState<ProcessOwner | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: responsables = [], isLoading } = useQuery<ProcessOwner[]>({
    queryKey: ["/api/process-owners"],
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: gerencias = [] } = useQuery<Gerencia[]>({
    queryKey: ["/api/gerencias"],
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: processes = [] } = useQuery<ProcessWithRisks[]>({
    queryKey: ["/api/processes/basic"],
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: subprocesos = [] } = useQuery<SubprocesoWithRisks[]>({
    queryKey: ["/api/subprocesos"],
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const createResponsableMutation = useMutation({
    mutationFn: (data: { name: string; email: string; position?: string; company?: string; isActive: boolean }) =>
      apiRequest("/api/process-owners", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/process-owners"] });
      toast({ title: "Responsable creado", description: "El responsable ha sido creado exitosamente." });
      setIsCreateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el responsable.",
        variant: "destructive"
      });
    },
  });

  const updateResponsableMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProcessOwner> }) =>
      apiRequest(`/api/process-owners/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/process-owners"] });
      toast({ title: "Responsable actualizado", description: "El responsable ha sido actualizado exitosamente." });
      setEditingResponsable(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el responsable.",
        variant: "destructive"
      });
    },
  });

  const deleteResponsableMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/process-owners/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/process-owners"] });
      toast({ title: "Responsable eliminado", description: "El responsable ha sido eliminado exitosamente." });
      setDeleteConfirmResponsable(null);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo eliminar el responsable.", variant: "destructive" });
    },
  });

  const handleEdit = (responsable: ProcessOwner) => {
    setEditingResponsable(responsable);
  };

  const handleDelete = (responsable: ProcessOwner) => {
    setDeleteConfirmResponsable(responsable);
  };

  const confirmDelete = () => {
    if (deleteConfirmResponsable) {
      deleteResponsableMutation.mutate(deleteConfirmResponsable.id);
    }
  };

  const getResponsableAssignments = (responsableId: string) => {
    const gerenciasAsignadas = gerencias.filter(g => g.managerId === responsableId);
    const procesosAsignados = processes.filter(p => p.ownerId === responsableId);
    const subprocesosAsignados = subprocesos.filter(s => s.ownerId === responsableId);

    return {
      gerencias: gerenciasAsignadas,
      procesos: procesosAsignados,
      subprocesos: subprocesosAsignados,
      total: gerenciasAsignadas.length + procesosAsignados.length + subprocesosAsignados.length
    };
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Cargando responsables...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Responsables</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Gestiona los responsables de gerencias, procesos y controles
              </p>
            </div>
            <CreateGuard itemType="process-owners">
              <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-responsable">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Responsable
              </Button>
            </CreateGuard>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">Responsable</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Asignaciones</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responsables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay responsables registrados
                  </TableCell>
                </TableRow>
              ) : (
                responsables.map((responsable) => {
                  const assignments = getResponsableAssignments(responsable.id);
                  return (
                    <TableRow key={responsable.id} data-testid={`row-responsable-${responsable.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs font-medium">
                              {getInitials(responsable.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="font-medium" data-testid={`text-responsable-name-${responsable.id}`}>
                            {responsable.name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm" data-testid={`text-responsable-position-${responsable.id}`}>
                        {responsable.position || "Sin especificar"}
                      </TableCell>
                      <TableCell className="text-sm" data-testid={`text-responsable-email-${responsable.id}`}>
                        {responsable.email}
                      </TableCell>
                      <TableCell className="text-sm" data-testid={`text-responsable-company-${responsable.id}`}>
                        {responsable.company || "Sin especificar"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingResponsable(responsable)}
                          className="h-auto py-1 px-2"
                          data-testid={`button-view-assignments-${responsable.id}`}
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {assignments.total} asignación{assignments.total !== 1 ? 'es' : ''}
                            </Badge>
                            {assignments.total > 0 && <Eye className="h-3 w-3" />}
                          </div>
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-xs ${responsable.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                          data-testid={`badge-status-${responsable.id}`}
                        >
                          {responsable.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <EditGuard itemType="process-owners">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(responsable)}
                              data-testid={`button-edit-${responsable.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </EditGuard>
                          <DeleteGuard itemType="process-owners">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(responsable)}
                              data-testid={`button-delete-${responsable.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </DeleteGuard>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent data-testid="dialog-create-responsable">
          <DialogHeader>
            <DialogTitle>Nuevo Responsable</DialogTitle>
            <DialogDescription>
              Registre un nuevo responsable para asignar a gerencias, procesos y controles
            </DialogDescription>
          </DialogHeader>
          <ResponsableForm
            onSubmit={(data) => createResponsableMutation.mutate(data)}
            onCancel={() => setIsCreateDialogOpen(false)}
            isPending={createResponsableMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingResponsable} onOpenChange={(open) => !open && setEditingResponsable(null)}>
        <DialogContent data-testid="dialog-edit-responsable">
          <DialogHeader>
            <DialogTitle>Editar Responsable</DialogTitle>
            <DialogDescription>
              Actualice la información del responsable
            </DialogDescription>
          </DialogHeader>
          {editingResponsable && (
            <ResponsableForm
              responsable={editingResponsable}
              onSubmit={(data) => updateResponsableMutation.mutate({ id: editingResponsable.id, data })}
              onCancel={() => setEditingResponsable(null)}
              isPending={updateResponsableMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingResponsable} onOpenChange={(open) => !open && setViewingResponsable(null)}>
        <DialogContent className="max-w-2xl" data-testid="dialog-view-assignments">
          <DialogHeader>
            <DialogTitle>Asignaciones de {viewingResponsable?.name}</DialogTitle>
            <DialogDescription>
              Vista detallada de todas las asignaciones del responsable
            </DialogDescription>
          </DialogHeader>
          {viewingResponsable && (
            <div className="space-y-4">
              {(() => {
                const assignments = getResponsableAssignments(viewingResponsable.id);
                return (
                  <>
                    {assignments.gerencias.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Gerencias ({assignments.gerencias.length})
                        </h4>
                        <div className="space-y-1">
                          {assignments.gerencias.map((g) => (
                            <div key={g.id} className="text-sm pl-6 py-1 border-l-2 border-blue-200">
                              <span className="font-mono text-xs text-muted-foreground">{g.code}</span> - {g.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {assignments.procesos.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Workflow className="h-4 w-4" />
                          Procesos ({assignments.procesos.length})
                        </h4>
                        <div className="space-y-1">
                          {assignments.procesos.map((p) => (
                            <div key={p.id} className="text-sm pl-6 py-1 border-l-2 border-green-200">
                              <span className="font-mono text-xs text-muted-foreground">{p.code}</span> - {p.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {assignments.subprocesos.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <GitBranch className="h-4 w-4" />
                          Subprocesos ({assignments.subprocesos.length})
                        </h4>
                        <div className="space-y-1">
                          {assignments.subprocesos.map((s) => (
                            <div key={s.id} className="text-sm pl-6 py-1 border-l-2 border-purple-200">
                              <span className="font-mono text-xs text-muted-foreground">{s.code}</span> - {s.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {assignments.total === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        Este responsable no tiene asignaciones actualmente
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirmResponsable} onOpenChange={(open) => !open && setDeleteConfirmResponsable(null)}>
        <AlertDialogContent data-testid="dialog-delete-responsable">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de eliminar este responsable?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el responsable. Si tiene asignaciones activas, primero deberá reasignarlas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
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
    </div>
  );
}

export default function Organization() {
  const [activeTab, setActiveTab] = useState("management-units");

  return (
    <div className="p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="inline-flex w-full md:grid md:grid-cols-3 overflow-x-auto justify-start md:justify-center">
          <TabsTrigger value="management-units" data-testid="tab-management-units" className="flex-shrink-0">
            Gerencias
          </TabsTrigger>
          <TabsTrigger value="process-map" data-testid="tab-process-map" className="flex-shrink-0">
            Mapa de Procesos
          </TabsTrigger>
          <TabsTrigger value="responsables" data-testid="tab-responsables" className="flex-shrink-0">
            Responsables
          </TabsTrigger>
        </TabsList>

        <TabsContent value="management-units" className="mt-6">
          {activeTab === "management-units" && <GerenciasContent />}
        </TabsContent>

        <TabsContent value="process-map" className="mt-6">
          {activeTab === "process-map" && <ProcessMapContent />}
        </TabsContent>

        <TabsContent value="responsables" className="mt-6">
          {activeTab === "responsables" && <ResponsablesContent />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
