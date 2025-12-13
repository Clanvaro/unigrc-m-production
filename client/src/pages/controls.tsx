import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../lib/queryKeys";
import { useOptimisticMutation } from "@/hooks/useOptimisticMutation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Eye, Edit, TrendingUp, TrendingDown, Activity, Target, Shield, X, ChevronUp, ChevronDown, Search, Trash2, Download, RefreshCw, MoreVertical, History, Filter } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { VirtualizedTable, type VirtualizedTableColumn } from "@/components/virtualized-table";
import { ControlsPageSkeleton } from "@/components/skeletons/controls-page-skeleton";

type SortField = 'code' | 'effectiveness' | 'control' | 'responsible' | 'validatedAt';
type SortDirection = 'asc' | 'desc';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import ControlForm from "@/components/forms/control-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getRiskColor, getRiskLevelText, calculateResidualRisk } from "@/lib/risk-calculations";
import type { Control, Risk, RiskControl } from "@shared/schema";
import ExcelJS from 'exceljs';
import { EditGuard, DeleteGuard } from "@/components/auth/permission-guard";
import { FilterToolbar } from "@/components/filter-toolbar";
import { ExplanationPopover } from "@/components/ExplanationPopover";
import { AuditHistory } from "@/components/AuditHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useSavedViews } from "@/hooks/useSavedViews";
import { Star } from "lucide-react";

// Helper function to translate control types to Spanish
const translateControlType = (type: any) => {
  if (!type || typeof type !== 'string') return '';
  const translations: Record<string, string> = {
    'preventive': 'Preventivo',
    'detective': 'Detectivo',
    'corrective': 'Correctivo',
    'directive': 'Directivo'
  };
  return translations[type.toLowerCase()] || type;
};

// Helper function to translate frequency to Spanish
const translateFrequency = (frequency: any) => {
  if (!frequency || typeof frequency !== 'string') return '';
  const translations: Record<string, string> = {
    'daily': 'Diaria',
    'weekly': 'Semanal',
    'monthly': 'Mensual',
    'quarterly': 'Trimestral',
    'annual': 'Anual',
    'continuous': 'Continua'
  };
  return translations[frequency.toLowerCase()] || frequency;
};

// Helper function to translate effectiveness to Spanish
const translateEffectiveness = (effectiveness: any) => {
  if (!effectiveness || typeof effectiveness !== 'string') return '';
  const translations: Record<string, string> = {
    'high': 'Alta',
    'medium': 'Media',
    'low': 'Baja'
  };
  return translations[effectiveness.toLowerCase()] || effectiveness;
};

// Helper function to translate automation level to Spanish
const translateAutomationLevel = (automationLevel: any) => {
  if (!automationLevel || typeof automationLevel !== 'string') return '';
  const translations: Record<string, string> = {
    'automatic': 'Automático',
    'manual': 'Manual',
    'semi_automatic': 'Semiautomático'
  };
  return translations[automationLevel.toLowerCase()] || automationLevel;
};

// Helper function to translate self-assessment to Spanish
const translateSelfAssessment = (assessment: any) => {
  if (!assessment || typeof assessment !== 'string') return '';
  const translations: Record<string, string> = {
    'efectivo': 'Efectivo',
    'parcialmente_efectivo': 'Parcialmente Efectivo',
    'no_efectivo': 'No Efectivo',
    'no_aplica': 'No Aplica'
  };
  return translations[assessment.toLowerCase()] || assessment;
};

// Mock data generation function for 50k rows testing
const generateMockControls = (count: number): Control[] => {
  const types: Control['type'][] = ['preventive', 'detective', 'corrective'];
  const validationStatuses: Control['validationStatus'][] = ['validated', 'rejected', 'pending_validation'];

  return Array.from({ length: count }, (_, i) => ({
    id: `mock-control-${i}`,
    code: `CTL-${String(i + 1).padStart(6, '0')}`,
    name: `Control de Prueba ${i + 1}`,
    description: `Descripción del control de prueba ${i + 1} para testing de rendimiento`,
    type: types[i % types.length],
    frequency: 'monthly',
    effectiveness: Math.floor(Math.random() * 40) + 60,
    responsibleId: null,
    processId: null,
    isActive: true,
    lastReview: i % 3 === 0 ? new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString() : null,
    validationStatus: validationStatuses[i % validationStatuses.length],
    validatedAt: i % 2 === 0 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : null,
    validatedBy: i % 2 === 0 ? 'user-1' : null,
    notes: null,
  }));
};

export default function Controls() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingControl, setEditingControl] = useState<Control | null>(null);
  const [riskDialogControl, setRiskDialogControl] = useState<Control | null>(null);
  const [viewingControl, setViewingControl] = useState<Control | null>(null);
  const [metricsDialogControl, setMetricsDialogControl] = useState<Control | null>(null);
  const [controlToDelete, setControlToDelete] = useState<Control | null>(null);
  const [deleteConfirmControl, setDeleteConfirmControl] = useState<Control | null>(null);
  const [deletionReason, setDeletionReason] = useState("");
  const [associatedRisksControl, setAssociatedRisksControl] = useState<Control | null>(null);
  const [sortField, setSortField] = useState<SortField>('code');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [riskSearchTerm, setRiskSearchTerm] = useState("");
  const [openRiskCombobox, setOpenRiskCombobox] = useState(false);
  const [testMode50k, setTestMode50k] = useState(false);
  const [savedViewsDialogOpen, setSavedViewsDialogOpen] = useState(false);
  const [columnConfigDialogOpen, setColumnConfigDialogOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    code: true,
    control: true,
    responsible: true,
    type: true,
    controlObjective: true,
    risks: true,
    effectiveness: true,
    validatedAt: true,
    actions: true,
  });

  // Filter and Search state
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [responsibleFilter, setResponsibleFilter] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Saved Views functionality
  const {
    savedViews,
    isLoading: isSavedViewsLoading,
    defaultView,
    deleteView,
    setDefaultView,
  } = useSavedViews("controls");

  // Load a saved view
  const loadView = (viewFilters: Record<string, any>) => {
    setFilters(viewFilters);
  };

  // Listen to saved views menu from header
  useEffect(() => {
    const handleOpenSavedViewsMenu = () => {
      setSavedViewsDialogOpen(true);
    };

    window.addEventListener('openControlsSavedViewsMenu', handleOpenSavedViewsMenu);
    return () => window.removeEventListener('openControlsSavedViewsMenu', handleOpenSavedViewsMenu);
  }, []);

  // Listen to toggle test mode 50k from header
  useEffect(() => {
    const handleToggleTestMode = () => {
      setTestMode50k(prev => !prev);
    };

    window.addEventListener('toggleControlsTestMode50k', handleToggleTestMode);
    return () => window.removeEventListener('toggleControlsTestMode50k', handleToggleTestMode);
  }, []);

  // Listen to configure columns event from header
  useEffect(() => {
    const handleConfigureColumns = () => {
      setColumnConfigDialogOpen(true);
    };

    window.addEventListener('configureControlsColumns', handleConfigureColumns);
    return () => window.removeEventListener('configureControlsColumns', handleConfigureColumns);
  }, []);

  // Listen to search changes from header
  useEffect(() => {
    const handleSearchChanged = (event: any) => {
      const { searchTerm } = event.detail;
      setSearchTerm(searchTerm);
    };

    window.addEventListener('controlSearchChanged', handleSearchChanged);
    return () => window.removeEventListener('controlSearchChanged', handleSearchChanged);
  }, []);

  // Listen to filter changes from header
  useEffect(() => {
    const handleFiltersChanged = (event: any) => {
      const { typeFilter, effectivenessFilter, statusFilter, validationStatusFilter, responsibleFilter } = event.detail;
      setFilters({
        typeFilter: typeFilter || "all",
        effectivenessFilter: effectivenessFilter || "all",
        statusFilter: statusFilter || "all",
        validationStatusFilter: validationStatusFilter || "all"
      });
      setResponsibleFilter(responsibleFilter === "all" ? null : responsibleFilter);
    };

    window.addEventListener('controlsFiltersChanged', handleFiltersChanged);
    return () => window.removeEventListener('controlsFiltersChanged', handleFiltersChanged);
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchTerm, responsibleFilter]);

  const { data: controlsResponse, isLoading, refetch: refetchControls } = useQuery<{ data: Control[], pagination: { limit: number, offset: number, total: number } }>({
    queryKey: queryKeys.controls.withDetails({
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      search: searchTerm,
      type: filters.typeFilter,
      effectiveness: filters.effectivenessFilter,
      status: filters.statusFilter,
      validationStatus: filters.validationStatusFilter,
      ownerId: responsibleFilter || undefined
    }),
    queryFn: async () => {
      // Map frontend filter values to backend expected values
      const effectivenessMap: Record<string, { min?: string, max?: string }> = {
        'high': { min: '80' },
        'medium': { min: '50', max: '79' },
        'low': { max: '49' }
      };

      const effRange = filters.effectivenessFilter ? effectivenessMap[filters.effectivenessFilter] : {};

      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: ((currentPage - 1) * pageSize).toString(),
        search: searchTerm || "",
        type: filters.typeFilter !== "all" ? filters.typeFilter : "",
        status: filters.statusFilter !== "all" ? filters.statusFilter : "",
        validationStatus: filters.validationStatusFilter !== "all" ? filters.validationStatusFilter : "",
        ...(effRange?.min ? { minEffectiveness: effRange.min } : {}),
        ...(effRange?.max ? { maxEffectiveness: effRange.max } : {}),
        ...(responsibleFilter ? { ownerId: responsibleFilter } : {})
      });

      const response = await fetch(`/api/controls/with-details?${params}`);
      if (!response.ok) throw new Error("Failed to fetch controls");
      return response.json();
    },
    staleTime: 120000, // 2 minutos - reducir refetches durante navegación rápida
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    gcTime: 5 * 60 * 1000,
  });
  const controls = controlsResponse?.data || [];
  const totalPages = controlsResponse?.pagination ? Math.ceil(controlsResponse.pagination.total / pageSize) : 0;

  const { data: risksResponse } = useQuery<{ data: Risk[], pagination: { limit: number, offset: number, total: number } }>({
    queryKey: queryKeys.risks.all(),
    queryFn: async () => {
      const response = await fetch("/api/risks");
      if (!response.ok) throw new Error("Failed to fetch risks");
      return response.json();
    },
    staleTime: 120000, // 2 minutos - reducir refetches durante navegación rápida
    gcTime: 5 * 60 * 1000,
  });
  const risks = risksResponse?.data || [];

  const { data: processes = [] } = useQuery<any[]>({
    queryKey: queryKeys.processes(),
    staleTime: 120000, // 2 minutos - reducir refetches durante navegación rápida
  });

  const { data: processOwners = [] } = useQuery<any[]>({
    queryKey: queryKeys.processOwners(),
    staleTime: 120000, // 2 minutos - reducir refetches durante navegación rápida
  });

  // Get control's associated risks (for both risk dialog and view dialog)
  const { data: controlRiskAssociations = [], refetch: refetchControlRisks, isLoading: isLoadingRisks } = useQuery({
    queryKey: queryKeys.controls.risks(riskDialogControl?.id || viewingControl?.id),
    queryFn: async () => {
      const currentControl = riskDialogControl || viewingControl;
      if (!currentControl) return [];

      // Use dedicated endpoint that returns risks with all details
      const response = await fetch(`/api/controls/${currentControl.id}/risks`);
      if (!response.ok) {
        throw new Error('Failed to fetch control risks');
      }
      return response.json();
    },
    enabled: !!(riskDialogControl || viewingControl),
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache
  });

  // Get associated risks for the associated risks modal
  const { data: associatedRisksData = [] } = useQuery<any[]>({
    queryKey: queryKeys.controls.risks(associatedRisksControl?.id),
    queryFn: async () => {
      if (!associatedRisksControl) return [];
      const response = await fetch(`/api/controls/${associatedRisksControl.id}/risks`);
      if (!response.ok) throw new Error('Failed to fetch control risks');
      return response.json();
    },
    enabled: !!associatedRisksControl,
  });

  const deleteMutation = useOptimisticMutation({
    queryKey: queryKeys.controls.all()[0], // Use first element of the array as base key
    mutationFn: async ({ id, deletionReason }: { id: string; deletionReason: string }) => {
      return apiRequest(`/api/controls/${id}`, "DELETE", { deletionReason });
    },
    onOptimisticUpdate: (oldData: any, variables: { id: string; deletionReason: string }) => {
      if (!oldData?.data) return oldData;
      return {
        ...oldData,
        data: oldData.data.filter((c: any) => c.id !== variables.id)
      };
    },
    onSuccess: () => {
      // Invalidate all control queries
      queryClient.invalidateQueries({ queryKey: queryKeys.controls.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.trash() });
      setDeleteConfirmControl(null);
      setDeletionReason("");
      toast({ title: "Control eliminado", description: "El control ha sido movido a la papelera." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo eliminar el control.", variant: "destructive" });
    },
  });

  const handleDelete = (control: Control) => {
    setDeleteConfirmControl(control);
    setDeletionReason("");
  };

  const confirmDelete = () => {
    if (!deleteConfirmControl) return;

    if (!deletionReason.trim()) {
      toast({
        title: "Motivo requerido",
        description: "Debe proporcionar un motivo para la eliminación",
        variant: "destructive"
      });
      return;
    }

    deleteMutation.mutate({
      id: deleteConfirmControl.id,
      deletionReason: deletionReason.trim()
    });
  };

  const handleEditSuccess = () => {
    setEditingControl(null);
  };

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
  };

  const addRiskMutation = useMutation({
    mutationFn: ({ controlId, riskId }: { controlId: string; riskId: string }) => {
      const control = controls.find((c: Control) => c.id === controlId);
      const risk = risks.find((r: Risk) => r.id === riskId);
      if (!control || !risk) throw new Error("Control o riesgo no encontrado");

      const residualRisk = calculateResidualRisk(risk.inherentRisk, control.effectiveness);
      return apiRequest(`/api/risks/${riskId}/controls`, "POST", {
        controlId,
        residualRisk
      });
    },
    onMutate: async ({ controlId, riskId }) => {
      // OPTIMISTIC UPDATE: Add to cache immediately
      const control = controls.find((c: Control) => c.id === controlId);
      const risk = risks.find((r: Risk) => r.id === riskId);
      if (!control || !risk) return;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.controls.risks(controlId)
      });

      // Snapshot the previous value
      const previousRisks = queryClient.getQueryData(queryKeys.controls.risks(controlId));

      // Optimistically add the new risk association
      const residualRisk = calculateResidualRisk(risk.inherentRisk, control.effectiveness);
      const tempId = `temp-${Date.now()}`;
      queryClient.setQueryData(
        queryKeys.controls.risks(controlId),
        (old: any[] = []) => [...old, {
          id: tempId,
          riskId: risk.id,
          controlId: control.id,
          residualRisk,
          riskCode: risk.code,
          riskName: risk.name,
          inherentRisk: risk.inherentRisk
        }]
      );

      return { previousRisks, controlId };
    },
    onSuccess: async (_data, variables, context) => {
      // Invalidate all control queries (list and paginated)
      await queryClient.invalidateQueries({
        queryKey: queryKeys.controls.all(),
        exact: false // This will match all queries starting with ["/api/controls"]
      });

      // Also invalidate the specific control's risks
      if (context?.controlId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.controls.risks(context.controlId)
        });
      }

      toast({ title: "Riesgo asociado", description: "El riesgo ha sido asociado al control exitosamente." });
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousRisks && context?.controlId) {
        queryClient.setQueryData(
          queryKeys.controls.risks(context.controlId),
          context.previousRisks
        );
      }
      toast({ title: "Error", description: "No se pudo asociar el riesgo.", variant: "destructive" });
    },
  });

  const removeRiskMutation = useMutation({
    mutationFn: (riskControlId: string) => apiRequest(`/api/risk-controls/${riskControlId}`, "DELETE"),
    onMutate: async (riskControlId) => {
      // OPTIMISTIC UPDATE: Remove from cache immediately
      const currentControl = riskDialogControl || viewingControl;
      if (!currentControl) return;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.controls.risks(currentControl.id)
      });

      // Snapshot the previous value
      const previousRisks = queryClient.getQueryData(queryKeys.controls.risks(currentControl.id));

      // Optimistically update to the new value
      queryClient.setQueryData(
        queryKeys.controls.risks(currentControl.id),
        (old: any[] = []) => old.filter((assoc: any) => assoc.id !== riskControlId)
      );

      return { previousRisks, currentControl };
    },
    onSuccess: async (_data, _variables, context) => {
      // Invalidate all control queries (list and paginated)
      await queryClient.invalidateQueries({
        queryKey: queryKeys.controls.all(),
        exact: false // This will match all queries starting with ["/api/controls"]
      });

      // Also invalidate the specific control's risks
      if (context?.currentControl) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.controls.risks(context.currentControl.id)
        });
      }

      toast({ title: "Riesgo removido", description: "El riesgo ha sido removido del control." });
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousRisks && context?.currentControl) {
        queryClient.setQueryData(
          queryKeys.controls.risks(context.currentControl.id),
          context.previousRisks
        );
      }
      toast({ title: "Error", description: "No se pudo remover el riesgo.", variant: "destructive" });
    },
  });

  const handleAddRisk = (riskId: string) => {
    if (riskDialogControl) {
      addRiskMutation.mutate({ controlId: riskDialogControl.id, riskId });
    }
  };

  const handleRemoveRisk = (riskControlId: string) => {
    removeRiskMutation.mutate(riskControlId);
  };

  // Sorting functionality
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedControls = useMemo(() => {
    if (!controls || controls.length === 0) {
      return [];
    }
    
    return [...(controls as Control[])].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    // Handle string comparison for code
    if (sortField === 'code') {
        aValue = (aValue || '').toString().toLowerCase();
        bValue = (bValue || '').toString().toLowerCase();
    }

    // Handle string comparison for control name
    if (sortField === 'control') {
        aValue = (a.name || '').toString().toLowerCase();
        bValue = (b.name || '').toString().toLowerCase();
    }

    // Handle string comparison for responsible (controlOwner.fullName)
    if (sortField === 'responsible') {
        aValue = ((a as any).controlOwner?.fullName || '').toString().toLowerCase();
        bValue = ((b as any).controlOwner?.fullName || '').toString().toLowerCase();
    }

    // Handle date comparison for validatedAt
    if (sortField === 'validatedAt') {
      aValue = a.validatedAt ? new Date(a.validatedAt).getTime() : 0;
      bValue = b.validatedAt ? new Date(b.validatedAt).getTime() : 0;
    }

    // Handle number comparison for effectiveness
    if (sortField === 'effectiveness') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    }
  });
  }, [controls, sortField, sortDirection]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const getValidationStatusBadge = (status: string) => {
    switch (status) {
      case "validated":
        return <Badge className="bg-green-100 text-green-800">✅ Validado</Badge>;
      case "observed":
        return <Badge className="bg-blue-100 text-blue-800">👁️ Observado</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">❌ Rechazado</Badge>;
      case "pending_validation":
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">⏳ Pendiente</Badge>;
    }
  };

  const getAvailableRisks = () => {
    const associatedRiskIds = controlRiskAssociations.map((cra: any) => cra.riskId);
    const availableRisks = risks.filter((risk: Risk) => !associatedRiskIds.includes(risk.id));

    if (riskSearchTerm.trim()) {
      return availableRisks.filter((risk: Risk) =>
        risk.name.toLowerCase().includes(riskSearchTerm.toLowerCase()) ||
        risk.description?.toLowerCase().includes(riskSearchTerm.toLowerCase())
      );
    }

    return availableRisks;
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Controles');

    worksheet.columns = [
      { header: 'Código', key: 'code', width: 15 },
      { header: 'Nombre', key: 'name', width: 40 },
      { header: 'Descripción', key: 'description', width: 50 },
      { header: 'Tipo', key: 'type', width: 20 },
      { header: 'Frecuencia', key: 'frequency', width: 20 },
      { header: 'Efectividad', key: 'effectiveness', width: 15 },
      { header: 'Estado Validación', key: 'validation', width: 20 },
      { header: 'Riesgos Asociados', key: 'associatedRisks', width: 15 },
      { header: 'Activo', key: 'active', width: 10 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    const riskCountsMap = new Map<string, number>();
    const response = await fetch("/api/risk-controls-with-details");
    if (response.ok) {
      const riskControls = await response.json();
      riskControls.forEach((rc: any) => {
        const count = riskCountsMap.get(rc.controlId) || 0;
        riskCountsMap.set(rc.controlId, count + 1);
      });
    }

    sortedControls.forEach((control: Control) => {
      const typeText = control.type === 'preventive' ? 'Preventivo' :
        control.type === 'detective' ? 'Detectivo' : 'Correctivo';
      const validationText = control.validationStatus === 'validated' ? 'Validado' :
        control.validationStatus === 'rejected' ? 'Rechazado' : 'Pendiente';

      worksheet.addRow({
        code: control.code,
        name: control.name,
        description: control.description || '',
        type: typeText,
        frequency: control.frequency || '',
        effectiveness: control.effectiveness,
        validation: validationText,
        associatedRisks: riskCountsMap.get(control.id) || 0,
        active: control.isActive ? 'Sí' : 'No',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `controles_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Exportación exitosa",
      description: `Se exportaron ${sortedControls.length} controles a Excel.`,
    });
  };

  // Display data with test mode support
  // SPRINT 3: Removed client-side filtering for production mode (handled by backend now)
  const displayData = useMemo(() => {
    // If in test mode, generate mock data and apply client-side filtering
    if (testMode50k) {
      let data = generateMockControls(50000) as any[];

      // Apply search filter
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        data = data.filter((control: Control) => {
          return (
            control.code?.toLowerCase().includes(lowerSearch) ||
            control.name?.toLowerCase().includes(lowerSearch) ||
            control.description?.toLowerCase().includes(lowerSearch)
          );
        });
      }

      // Apply type filter
      if (filters.typeFilter && filters.typeFilter !== "all") {
        data = data.filter((control: Control) => control.type === filters.typeFilter);
      }

      // Apply effectiveness filter
      if (filters.effectivenessFilter && filters.effectivenessFilter !== "all") {
        data = data.filter((control: Control) => {
          const effectiveness = control.effectiveness;
          if (filters.effectivenessFilter === "high") {
            return effectiveness >= 80;
          } else if (filters.effectivenessFilter === "medium") {
            return effectiveness >= 50 && effectiveness < 80;
          } else if (filters.effectivenessFilter === "low") {
            return effectiveness < 50;
          }
          return true;
        });
      }

      // Apply status filter (active/inactive)
      if (filters.statusFilter && filters.statusFilter !== "all") {
        data = data.filter((control: Control) => {
          if (filters.statusFilter === "active") {
            return control.isActive === true;
          } else if (filters.statusFilter === "inactive") {
            return control.isActive === false;
          }
          return true;
        });
      }

      // Apply validation status filter
      if (filters.validationStatusFilter && filters.validationStatusFilter !== "all") {
        data = data.filter((control: Control) => control.validationStatus === filters.validationStatusFilter);
      }

      // Apply sorting for test mode
      return data.sort((a, b) => {
        const aValue: any = a[sortField];
        const bValue: any = b[sortField];
        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });
    }

    // In production mode, data is already filtered and paginated by the server
    // We only need to apply client-side sorting for the current page if needed
    // (Ideally sorting should also be server-side, but for now we sort the current page)
    return [...sortedControls];
  }, [testMode50k, sortedControls, sortField, sortDirection, searchTerm, filters]);

  const activeControls = controls.filter((control: Control) => control.isActive);
  const avgEffectiveness = controls.length > 0
    ? Math.round(controls.reduce((sum: number, control: Control) => sum + control.effectiveness, 0) / controls.length)
    : 0;
  const criticalControls = controls.filter((control: Control) => control.effectiveness < 70).length;

  // Columns definition for VirtualizedTable
  const columns: VirtualizedTableColumn<any>[] = useMemo(() => [
    {
      id: 'code',
      header: (
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('code')}>
          Código
          {getSortIcon('code')}
        </div>
      ),
      cell: (control: any) => (
        <Badge
          variant="outline"
          className="cursor-pointer hover:bg-accent transition-colors"
          onClick={() => setViewingControl(control)}
          data-testid={`badge-code-${control.id}`}
        >
          {control.code}
        </Badge>
      ),
      width: "150px",
    },
    {
      id: 'control',
      header: (
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('control')}>
          Control
          {getSortIcon('control')}
        </div>
      ),
      cell: (control: Control) => (
        <div className="min-w-0">
          <p className="text-sm font-medium line-clamp-1" title={control.name}>
            {control.name}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-1" title={control.description || ''}>
            {control.description || 'Sin descripción'}
          </p>
        </div>
      ),
      width: "minmax(250px, 350px)",
    },
    {
      id: 'responsible',
      header: (
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('responsible')}>
          Responsable
          {getSortIcon('responsible')}
        </div>
      ),
      cell: (control: Control) => (
        (control as any).controlOwner ? (
          <div className="min-w-0">
            <p className="text-sm font-medium line-clamp-1" title={(control as any).controlOwner.fullName}>
              {(control as any).controlOwner.fullName}
            </p>
            <p className="text-xs text-muted-foreground line-clamp-1" title={(control as any).controlOwner.cargo}>
              {(control as any).controlOwner.cargo}
            </p>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Sin asignar</span>
        )
      ),
      width: "minmax(180px, 220px)",
    },
    {
      id: 'type',
      header: 'Tipo',
      cell: (control: Control) => (
        <div className="min-w-0">
          <Badge variant="outline" className="mb-1">
            {control.type === "preventive" ? "Preventivo" :
              control.type === "detective" ? "Detectivo" : "Correctivo"}
          </Badge>
          {(control as any).automationLevel && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {translateAutomationLevel((control as any).automationLevel)}
            </p>
          )}
        </div>
      ),
      width: "150px",
    },
    {
      id: 'controlObjective',
      header: 'Objetivo del Control',
      cell: (control: Control) => {
        const effectTarget = (control as any).effectTarget || 'both';
        const getObjectiveDisplay = (target: string) => {
          switch (target) {
            case 'probability':
              return {
                icon: <TrendingDown className="h-4 w-4" />,
                label: 'Probabilidad',
                color: 'text-blue-600',
                bgColor: 'bg-blue-50'
              };
            case 'impact':
              return {
                icon: <Activity className="h-4 w-4" />,
                label: 'Impacto',
                color: 'text-teal-600',
                bgColor: 'bg-teal-50'
              };
            case 'both':
            default:
              return {
                icon: <Target className="h-4 w-4" />,
                label: 'Ambos',
                color: 'text-purple-600',
                bgColor: 'bg-purple-50'
              };
          }
        };
        const objective = getObjectiveDisplay(effectTarget);

        return (
          <div className="min-w-0">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md ${objective.bgColor}`}>
              <span className={objective.color}>{objective.icon}</span>
              <span className={`text-sm font-medium ${objective.color}`}>{objective.label}</span>
            </div>
          </div>
        );
      },
      width: "170px",
    },
    {
      id: 'risks',
      header: 'Riesgos Asociados',
      cell: (control: Control) => {
        const associatedRisks = (control as any).associatedRisks || [];
        const count = (control as any).associatedRisksCount || 0;

        if (count === 0) {
          return (
            <div className="flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Sin riesgos</span>
            </div>
          );
        }

        return (
          <div className="flex flex-wrap items-center gap-1 justify-center">
            {associatedRisks.slice(0, 3).map((risk: { id: string; code: string }) => (
              <Badge
                key={risk.id}
                variant="outline"
                className="text-xs cursor-pointer hover:bg-accent transition-colors"
                onClick={() => setAssociatedRisksControl(control)}
              >
                {risk.code}
              </Badge>
            ))}
            {count > 3 && (
              <Badge
                variant="secondary"
                className="text-xs cursor-pointer hover:bg-accent transition-colors"
                onClick={() => setAssociatedRisksControl(control)}
              >
                +{count - 3}
              </Badge>
            )}
          </div>
        );
      },
      width: "220px",
      align: 'center',
    },
    {
      id: 'effectiveness',
      header: (
        <div className="flex items-center justify-center gap-2 cursor-pointer" onClick={() => handleSort('effectiveness')}>
          Efectividad
          {getSortIcon('effectiveness')}
        </div>
      ),
      cell: (control: any) => {
        const controlRisks = controlRiskAssociations.filter((rc: any) => rc.controlId === control.id);
        const avgInherentRisk = controlRisks.length > 0
          ? controlRisks.reduce((sum: number, rc: any) => sum + (rc.risk?.inherentRisk || 0), 0) / controlRisks.length
          : 0;
        const avgResidualRisk = controlRisks.length > 0
          ? controlRisks.reduce((sum: number, rc: any) => sum + (rc.residualRisk || 0), 0) / controlRisks.length
          : 0;
        const riskReduction = avgInherentRisk - avgResidualRisk;
        const effectivenessCalc = avgInherentRisk > 0 ? (riskReduction / avgInherentRisk * 100) : 0;

        return (
          <div className="flex items-center justify-center gap-2">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-sm font-medium">{control.effectiveness}%</span>
              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden flex-shrink-0">
                <div
                  className={`h-full rounded-full ${control.effectiveness >= 80 ? 'bg-chart-1' :
                    control.effectiveness >= 60 ? 'bg-chart-2' : 'bg-destructive'
                    }`}
                  style={{ width: `${control.effectiveness}%` }}
                ></div>
              </div>
            </div>
            <ExplanationPopover
              title="Efectividad del Control"
              description="La efectividad mide qué tan bien el control mitiga el riesgo"
              formula="Efectividad = (Riesgo Inherente - Riesgo Residual) / Riesgo Inherente × 100"
              calculationSteps={controlRisks.length > 0 ? [
                {
                  label: 'Riesgo Inherente Promedio',
                  value: avgInherentRisk.toFixed(2)
                },
                {
                  label: 'Riesgo Residual Promedio',
                  value: avgResidualRisk.toFixed(2)
                },
                {
                  label: 'Reducción de Riesgo',
                  formula: `${avgInherentRisk.toFixed(2)} - ${avgResidualRisk.toFixed(2)}`,
                  value: riskReduction.toFixed(2)
                },
                {
                  label: 'Efectividad Calculada (%)',
                  formula: `(${riskReduction.toFixed(2)} / ${avgInherentRisk.toFixed(2)}) × 100`,
                  value: `${effectivenessCalc.toFixed(1)}%`
                },
                {
                  label: 'Efectividad Configurada',
                  value: `${control.effectiveness}%`
                }
              ] : [
                {
                  label: 'Efectividad Configurada',
                  value: `${control.effectiveness}%`
                },
                {
                  label: 'Sin riesgos asociados',
                  value: 'No hay cálculo dinámico disponible'
                }
              ]}
              dataSource={{
                table: controlRisks.length > 0 ? 'controls, risk_controls, risks' : 'controls',
                query: controlRisks.length > 0
                  ? `SELECT AVG(r.inherent_risk), AVG(rc.residual_risk) FROM risks r JOIN risk_controls rc WHERE rc.control_id = '${control.id}'`
                  : `SELECT effectiveness FROM controls WHERE id = '${control.id}'`,
                timestamp: control.updatedAt ? new Date(control.updatedAt).toLocaleString() : 'N/A'
              }}
              relatedEntities={controlRisks.map((rc: any) => ({
                type: 'Riesgo',
                id: rc.risk?.id || '',
                name: rc.risk?.code || 'N/A'
              }))}
            />
          </div>
        );
      },
      width: "220px",
      align: 'center',
    },
    {
      id: 'validationStatus',
      header: 'Estado de Validación',
      cell: (control: Control) => (
        <div data-testid={`validation-status-${control.id}`}>
          {getValidationStatusBadge(control.validationStatus)}
        </div>
      ),
      width: "180px",
      align: 'center',
    },
    {
      id: 'validatedAt',
      header: 'Fecha de Validación',
      cell: (control: Control) => (
        <span className="text-sm" data-testid={`validation-date-${control.id}`}>
          {control.validatedAt
            ? new Date(control.validatedAt).toLocaleDateString()
            : "No validado"
          }
        </span>
      ),
      width: "170px",
      align: 'center',
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: (control: Control) => (
        <div className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                data-testid={`button-actions-${control.id}`}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <EditGuard itemType="control">
                <DropdownMenuItem
                  onClick={() => setEditingControl(control)}
                  data-testid={`menu-edit-${control.id}`}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              </EditGuard>

              <DropdownMenuItem
                onClick={() => setRiskDialogControl(control)}
                data-testid={`menu-risks-${control.id}`}
              >
                <Shield className="h-4 w-4 mr-2" />
                Asociar Riesgos
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DeleteGuard itemType="control">
                <DropdownMenuItem
                  onClick={() => setControlToDelete(control)}
                  className="text-destructive focus:text-destructive"
                  data-testid={`menu-delete-${control.id}`}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DeleteGuard>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dialogs remain open based on state */}
          <Dialog open={editingControl?.id === control.id} onOpenChange={(open) => !open && setEditingControl(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar Control</DialogTitle>
                <DialogDescription>
                  Actualizar la información y configuración de este control.
                </DialogDescription>
              </DialogHeader>
              <ControlForm
                control={editingControl!}
                onSuccess={handleEditSuccess}
              />
            </DialogContent>
          </Dialog>

          <Dialog
            open={riskDialogControl?.id === control.id}
            onOpenChange={(open) => {
              if (!open) {
                setRiskDialogControl(null);
                setRiskSearchTerm("");
              }
            }}
          >
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Asociar Riesgos al Control - {riskDialogControl?.code}</DialogTitle>
                <DialogDescription>
                  Agregar y gestionar riesgos asociados a este control
                </DialogDescription>
              </DialogHeader>

              {riskDialogControl && (
                <div className="flex-1 overflow-hidden flex flex-col">
                  {/* Add Risk Section */}
                  <div className="mb-4">
                    <Label>Agregar Riesgo</Label>
                    <div className="flex gap-2 mt-2">
                      <Popover open={openRiskCombobox} onOpenChange={setOpenRiskCombobox} modal={true}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="flex-1 justify-between">
                            Seleccionar riesgo
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[400px] p-0"
                          align="start"
                          onWheel={(e) => e.stopPropagation()}
                        >
                          <Command className="max-h-[500px]">
                            <CommandInput
                              placeholder="Buscar riesgo..."
                              value={riskSearchTerm}
                              onValueChange={setRiskSearchTerm}
                            />
                            <CommandList className="!max-h-[400px]">
                              <CommandEmpty>No se encontraron riesgos.</CommandEmpty>
                              <CommandGroup>
                                {risks
                                  .filter(risk =>
                                    !controlRiskAssociations.some((assoc: any) => assoc.riskId === risk.id)
                                  )
                                  .map((risk) => (
                                    <CommandItem
                                      key={risk.id}
                                      value={`${risk.code} ${risk.name}`}
                                      onSelect={() => {
                                        handleAddRisk(risk.id);
                                        setOpenRiskCombobox(false);
                                        setRiskSearchTerm("");
                                      }}
                                    >
                                      <Check className={`mr-2 h-4 w-4 ${false ? "opacity-100" : "opacity-0"}`} />
                                      <div className="flex flex-col">
                                        <span className="font-medium">{risk.code} - {risk.name}</span>
                                        <span className="text-xs text-muted-foreground">{risk.description?.substring(0, 60)}...</span>
                                      </div>
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Associated Risks List */}
                  <div className="flex-1 overflow-y-auto">
                    <Label className="mb-3 block">Riesgos Asociados ({controlRiskAssociations.length})</Label>
                    {controlRiskAssociations.length > 0 ? (
                      <div className="space-y-3">
                        {controlRiskAssociations.map((association: any) => (
                          <div key={association.id} className="p-3 border rounded-lg bg-muted/30 relative group">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleRemoveRisk(association.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            <div className="flex justify-between items-start pr-8">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">{association.risk?.name || 'Sin nombre'}</h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {association.risk?.description || 'Sin descripción'}
                                </p>
                                <Badge variant="outline" className="mt-2 text-xs">
                                  {association.risk?.code}
                                </Badge>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">Riesgo Residual:</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {association.residualRisk}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No hay riesgos asociados. Selecciona un riesgo arriba para agregarlo.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <DialogFooter className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRiskDialogControl(null);
                    setRiskSearchTerm("");
                  }}
                  data-testid="button-close-risk-dialog"
                >
                  Cerrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ),
      width: "100px",
      align: 'center',
    },
  ].filter(col => visibleColumns[col.id]), [sortField, sortDirection, editingControl, riskDialogControl, displayData, visibleColumns]);

  if (isLoading) {
    return <ControlsPageSkeleton />;
  }

  return (
    <div className="@container h-full flex flex-col p-4 @md:p-8 pt-6 gap-2" data-testid="controls-content" role="region" aria-label="Gestión de Controles">
      <h1 id="controls-page-title" className="sr-only">Controles</h1>

      {/* Active Filters Display */}
      {(searchTerm || responsibleFilter) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          {searchTerm && (
            <Badge variant="secondary" className="gap-1">
              Búsqueda: "{searchTerm}"
              <button
                onClick={() => setSearchTerm("")}
                className="ml-1 hover:text-foreground"
                data-testid="clear-search"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {responsibleFilter && (
            <Badge variant="secondary" className="gap-1">
              Responsable: {processOwners.find((po: any) => po.id === responsibleFilter)?.name || 'Desconocido'}
              <button
                onClick={() => setResponsibleFilter(null)}
                className="ml-1 hover:text-foreground"
                data-testid="clear-responsible-filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <span>({displayData.length} resultados)</span>
        </div>
      )}

      {/* Controls Table - Virtualized */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="p-0 h-full flex flex-col">
          <div className="flex-1 overflow-hidden">
            <VirtualizedTable
              data={displayData}
              columns={columns}
              estimatedRowHeight={70}
              overscan={5}
              getRowKey={(control) => control.id}
              isLoading={isLoading}
              ariaLabel="Tabla de controles"
              ariaDescribedBy="controls-table-description"
            />
            <div id="controls-table-description" className="sr-only">
              Tabla con {displayData.length} controles. Use las flechas del teclado para navegar entre filas, Enter o Espacio para seleccionar.
            </div>
          </div>

          {/* Pagination controls */}
          {!testMode50k && controlsResponse && controlsResponse.pagination && controlsResponse.pagination.total > 0 && (
            <div className="border-t px-4 py-3 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, controlsResponse.pagination.total)} de {controlsResponse.pagination.total} controles
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <span className="text-sm">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </Button>
              </div>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 por página</SelectItem>
                  <SelectItem value="25">25 por página</SelectItem>
                  <SelectItem value="50">50 por página</SelectItem>
                  <SelectItem value="100">100 por página</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {displayData.length === 0 && !testMode50k && controls.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No se encontraron controles</p>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-first-control">
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Primer Control
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Nuevo Control</DialogTitle>
                    <DialogDescription>
                      Registrar un nuevo control en el sistema de gestión de riesgos.
                    </DialogDescription>
                  </DialogHeader>
                  <ControlForm onSuccess={handleCreateSuccess} />
                </DialogContent>
              </Dialog>
            </div>
          )}
          {displayData.length === 0 && !testMode50k && controls.length > 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No se encontraron controles con los filtros aplicados</p>
              <p className="text-sm text-muted-foreground mt-2">Intenta ajustar o limpiar los filtros</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog with Reason */}
      <AlertDialog open={!!deleteConfirmControl} onOpenChange={(open) => !open && setDeleteConfirmControl(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Eliminación</AlertDialogTitle>
            <AlertDialogDescription>
              Está a punto de eliminar el control <strong>{deleteConfirmControl?.code} - {deleteConfirmControl?.name}</strong>.
              Esta acción moverá el control a la papelera de reciclaje.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deletion-reason">
                Motivo de eliminación <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="deletion-reason"
                placeholder="Por favor, indique el motivo de la eliminación..."
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                rows={3}
                data-testid="input-deletion-reason"
              />
              <p className="text-sm text-muted-foreground">
                El motivo de eliminación quedará registrado en el historial
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteConfirmControl(null);
              setDeletionReason("");
            }} data-testid="button-cancel-delete">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending || !deletionReason.trim()}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar Control"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Control Details Dialog */}
      <Dialog open={!!viewingControl} onOpenChange={(open) => !open && setViewingControl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Detalles del Control - {viewingControl?.code}</DialogTitle>
            <DialogDescription>
              Información completa del control y riesgos asociados
            </DialogDescription>
          </DialogHeader>

          {viewingControl && (
            <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
              <TabsList>
                <TabsTrigger value="details">Detalles</TabsTrigger>
                <TabsTrigger value="history">Historial</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="flex-1 overflow-y-auto mt-4">
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Código</Label>
                      <p className="font-medium">{viewingControl.code}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Tipo</Label>
                      <p className="font-medium">{translateControlType(viewingControl.type)}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground">Nombre</Label>
                      <p className="font-medium">{viewingControl.name}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground">Descripción</Label>
                      <p className="text-sm">{viewingControl.description || 'Sin descripción'}</p>
                    </div>
                  </div>

                  {/* Control Details - Factores de Efectividad */}
                  <div className="pt-4 border-t">
                    <h3 className="font-semibold mb-3 text-sm">Factores de Efectividad del Control</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {viewingControl.automationLevel && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Nivel de Automatización</Label>
                          <p className="font-medium">{translateAutomationLevel(viewingControl.automationLevel)}</p>
                        </div>
                      )}

                      {viewingControl.effectTarget && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Objetivo del Efecto</Label>
                          <p className="font-medium">
                            {viewingControl.effectTarget === 'both' ? 'Probabilidad e Impacto' :
                              viewingControl.effectTarget === 'probability' ? 'Probabilidad' : 'Impacto'}
                          </p>
                        </div>
                      )}

                      <div>
                        <Label className="text-xs text-muted-foreground">Efectividad</Label>
                        <p className="font-medium">{viewingControl.effectiveness}%</p>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Estado</Label>
                        <Badge variant={viewingControl.isActive ? "default" : "secondary"}>
                          {viewingControl.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>

                      {viewingControl.selfAssessment && (
                        <div className="col-span-2">
                          <Label className="text-xs text-muted-foreground">Autoevaluación</Label>
                          <p className="font-medium">
                            {translateSelfAssessment(viewingControl.selfAssessment)}
                          </p>
                          {viewingControl.selfAssessmentComments && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {viewingControl.selfAssessmentComments}
                            </p>
                          )}
                          {viewingControl.selfAssessmentDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Evaluado el: {new Date(viewingControl.selfAssessmentDate).toLocaleDateString('es-ES')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Evidence */}
                  {viewingControl.evidence && (
                    <div className="pt-4 border-t">
                      <Label className="text-xs text-muted-foreground">Evidencia</Label>
                      <p className="text-sm mt-1">{viewingControl.evidence}</p>
                    </div>
                  )}

                  {/* Associated Risks */}
                  <div className="pt-4 border-t">
                    <Label className="text-sm font-semibold mb-3 block">Riesgos Asociados</Label>
                    {controlRiskAssociations.length > 0 ? (
                      <div className="space-y-3">
                        {controlRiskAssociations.map((association: any) => (
                          <div key={association.id} className="p-3 border rounded-lg bg-muted/30">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-medium">{association.risk?.name || 'Sin nombre'}</h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {association.risk?.description || 'Sin descripción'}
                                </p>
                                <Badge variant="outline" className="mt-2 text-xs">
                                  {association.risk?.code}
                                </Badge>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">Riesgo Residual:</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {association.residualRisk}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No hay riesgos asociados a este control
                      </p>
                    )}
                  </div>

                  {/* Validation Status */}
                  {viewingControl.validationStatus && (
                    <div className="pt-4 border-t">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Estado de Validación</Label>
                          <Badge variant={viewingControl.validationStatus === 'validated' ? 'default' : 'secondary'} className="mt-1">
                            {viewingControl.validationStatus === 'validated' ? 'Validado' :
                              viewingControl.validationStatus === 'pending' ? 'Pendiente' : 'Rechazado'}
                          </Badge>
                        </div>
                        {viewingControl.validatedAt && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Fecha de Validación</Label>
                            <p className="text-sm">{new Date(viewingControl.validatedAt).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>
                      {viewingControl.validationComments && (
                        <div className="mt-3">
                          <Label className="text-xs text-muted-foreground">Comentarios de Validación</Label>
                          <p className="text-sm mt-1">{viewingControl.validationComments}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="history" className="flex-1 overflow-y-auto mt-4">
                <AuditHistory
                  entityType="control"
                  entityId={viewingControl.id}
                  maxHeight="500px"
                />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Associated Risks Modal */}
      <Dialog open={!!associatedRisksControl} onOpenChange={(open) => !open && setAssociatedRisksControl(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Riesgos Asociados - {associatedRisksControl?.name}</DialogTitle>
            <DialogDescription>
              Lista de riesgos que están mitigados por este control y el nivel de riesgo residual.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {associatedRisksData.length > 0 ? (
              <div className="space-y-3">
                {associatedRisksData.map((association: any) => (
                  <div key={association.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-lg">{association.risk.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{association.risk.description}</p>
                        <Badge variant="outline" className="mt-2">{association.risk.code}</Badge>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Riesgo Residual:</span>
                          <Badge variant="secondary" className="text-sm">
                            {association.residualRisk}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Riesgo Inherente:</span>
                        <span className="ml-2 font-medium">{association.risk.inherentRisk}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Reducción:</span>
                        <span className="ml-2 font-medium text-green-600">
                          -{Math.round(((association.risk.inherentRisk - association.residualRisk) / association.risk.inherentRisk) * 100)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Probabilidad:</span>
                        <span className="ml-2">{association.risk.probability}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Impacto:</span>
                        <span className="ml-2">{association.risk.impact}</span>
                      </div>
                    </div>

                    {/* Process Information */}
                    {association.risk.processId && (
                      <div className="mt-3 pt-3 border-t">
                        <span className="text-xs text-muted-foreground">Proceso: </span>
                        <span className="text-xs">{
                          processes.find(p => p.id === association.risk.processId)?.name || 'No definido'
                        }</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No hay riesgos asociados a este control</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Saved Views Dialog */}
      <Dialog open={savedViewsDialogOpen} onOpenChange={setSavedViewsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vistas Guardadas</DialogTitle>
            <DialogDescription>
              Selecciona una vista guardada para aplicar sus filtros
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {savedViews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay vistas guardadas</p>
                <p className="text-sm mt-1">Aplica filtros y guárdalos como vista para verlos aquí</p>
              </div>
            ) : (
              savedViews.map((view) => (
                <div
                  key={view.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors group"
                  data-testid={`saved-view-item-${view.id}`}
                >
                  <button
                    onClick={() => {
                      loadView(view.filters as Record<string, any>);
                      setSavedViewsDialogOpen(false);
                      toast({
                        title: "Vista cargada",
                        description: `Se aplicaron los filtros de "${view.name}"`,
                      });
                    }}
                    className="flex items-center gap-2 flex-1 text-left"
                    data-testid={`load-saved-view-${view.id}`}
                  >
                    {view.isDefault && (
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{view.name}</p>
                      {view.isDefault && (
                        <p className="text-xs text-muted-foreground">Vista predeterminada</p>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!view.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDefaultView(view.id);
                          toast({
                            title: "Vista predeterminada",
                            description: `"${view.name}" es ahora tu vista predeterminada`,
                          });
                        }}
                        data-testid={`set-default-saved-view-${view.id}`}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteView(view.id);
                        toast({
                          title: "Vista eliminada",
                          description: `Se eliminó la vista "${view.name}"`,
                        });
                      }}
                      data-testid={`delete-saved-view-${view.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Column Configuration Dialog */}
      <Dialog open={columnConfigDialogOpen} onOpenChange={setColumnConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Columnas</DialogTitle>
            <DialogDescription>
              Selecciona qué columnas deseas mostrar en la tabla de controles
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="col-code"
                  checked={visibleColumns.code}
                  onChange={(e) => setVisibleColumns({ ...visibleColumns, code: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="col-code" className="text-sm font-normal cursor-pointer">
                  Código
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="col-control"
                  checked={visibleColumns.control}
                  onChange={(e) => setVisibleColumns({ ...visibleColumns, control: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="col-control" className="text-sm font-normal cursor-pointer">
                  Control (Nombre y Descripción)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="col-responsible"
                  checked={visibleColumns.responsible}
                  onChange={(e) => setVisibleColumns({ ...visibleColumns, responsible: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="col-responsible" className="text-sm font-normal cursor-pointer">
                  Responsable
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="col-type"
                  checked={visibleColumns.type}
                  onChange={(e) => setVisibleColumns({ ...visibleColumns, type: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="col-type" className="text-sm font-normal cursor-pointer">
                  Tipo
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="col-controlObjective"
                  checked={visibleColumns.controlObjective}
                  onChange={(e) => setVisibleColumns({ ...visibleColumns, controlObjective: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="col-controlObjective" className="text-sm font-normal cursor-pointer">
                  Objetivo del Control
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="col-risks"
                  checked={visibleColumns.risks}
                  onChange={(e) => setVisibleColumns({ ...visibleColumns, risks: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="col-risks" className="text-sm font-normal cursor-pointer">
                  Riesgos Asociados
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="col-effectiveness"
                  checked={visibleColumns.effectiveness}
                  onChange={(e) => setVisibleColumns({ ...visibleColumns, effectiveness: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="col-effectiveness" className="text-sm font-normal cursor-pointer">
                  Efectividad
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="col-validatedAt"
                  checked={visibleColumns.validatedAt}
                  onChange={(e) => setVisibleColumns({ ...visibleColumns, validatedAt: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="col-validatedAt" className="text-sm font-normal cursor-pointer">
                  Fecha de Validación
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="col-actions"
                  checked={visibleColumns.actions}
                  onChange={(e) => setVisibleColumns({ ...visibleColumns, actions: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="col-actions" className="text-sm font-normal cursor-pointer">
                  Acciones
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setColumnConfigDialogOpen(false)}
            >
              Cerrar
            </Button>
            <Button
              onClick={() => {
                // Reset to all visible
                setVisibleColumns({
                  code: true,
                  control: true,
                  responsible: true,
                  type: true,
                  controlObjective: true,
                  risks: true,
                  effectiveness: true,
                  validatedAt: true,
                  actions: true,
                });
                toast({
                  title: "Columnas restauradas",
                  description: "Se mostraron todas las columnas",
                });
              }}
            >
              Restaurar Todo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
