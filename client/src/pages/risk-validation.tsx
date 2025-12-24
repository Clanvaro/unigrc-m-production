import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, XCircle, Clock, User, AlertTriangle, FileText, Mail, Send, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, MoreVertical, Eye, Info, Bell, History } from "lucide-react";
import { getRiskLevel, getRiskLevelText } from "@/lib/risk-calculations";
import type { Risk, Control } from "@shared/schema";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ValidationHistoryModal } from "@/components/ValidationHistoryModal";
import { PreValidationWarningModal } from "@/components/PreValidationWarningModal";
import { usePagination } from "@/hooks/use-pagination";
import { GmailStylePagination, SelectAllBanner, PaginationControls } from "@/components/GmailStylePagination";
import {
  RiskDetailDialog,
  ControlDetailDialog,
  ActionPlanDetailDialog
} from "@/components/validation/ValidationDetailDialogs";
import { isUUID, displayResponsible } from "@/components/validation/ValidationUtils";
import { usePermissions } from "@/hooks/usePermissions";

export default function RiskValidationPage() {
  const { currentUser } = usePermissions();
  // Refs para scroll automático a secciones
  const validatedRisksSectionRef = useRef<HTMLDivElement>(null);
  // Get tenant/user identifier for cache key (single-tenant mode uses fixed value)
  const tenantId = currentUser?.id || 'single-tenant';

  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [selectedRiskProcessLink, setSelectedRiskProcessLink] = useState<any | null>(null);
  const [selectedControl, setSelectedControl] = useState<Control | null>(null);
  const [selectedActionPlan, setSelectedActionPlan] = useState<any | null>(null);
  const [viewingActionPlan, setViewingActionPlan] = useState<any | null>(null);
  const [viewingControl, setViewingControl] = useState<any | null>(null);
  const [viewingRisk, setViewingRisk] = useState<any | null>(null);
  const [validationComments, setValidationComments] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [validationAction, setValidationAction] = useState<"validated" | "observed" | "rejected" | null>(null);
  const [validationType, setValidationType] = useState<"risk" | "control" | "action-plan" | "risk-process-link">("risk");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [riskLevelFilter, setRiskLevelFilter] = useState("all");
  const [selectedRiskProcessLinks, setSelectedRiskProcessLinks] = useState<string[]>([]);
  const [selectedControls, setSelectedControls] = useState<string[]>([]);
  const [selectedActionPlans, setSelectedActionPlans] = useState<string[]>([]);
  const [sendNotification, setSendNotification] = useState(true);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedHistoryRiskProcessLink, setSelectedHistoryRiskProcessLink] = useState<{ id: string, riskCode?: string, riskName?: string } | null>(null);
  // Pre-validation warning modal state
  const [preValidationWarningOpen, setPreValidationWarningOpen] = useState(false);
  const [preValidationData, setPreValidationData] = useState<any | null>(null);
  const [pendingProcessIds, setPendingProcessIds] = useState<string[]>([]);
  // Process map state
  const [activeTab, setActiveTab] = useState("risks");
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>([]);
  const [expandedMacroprocesos, setExpandedMacroprocesos] = useState<string[]>([]);
  const [sortField, setSortField] = useState<"code" | "process" | "responsible" | "control" | "validatedAt" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [controlToResend, setControlToResend] = useState<any | null>(null);
  // Bulk action confirmation dialog state
  const [bulkActionConfirmOpen, setBulkActionConfirmOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<"validated" | "observed" | "rejected" | null>(null);
  const [bulkActionTarget, setBulkActionTarget] = useState<"risks" | "controls" | "action-plans" | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Pagination instances for notified and not-notified risks
  const notifiedRisksPagination = usePagination({ pageSize: 50 });
  const notNotifiedRisksPagination = usePagination({ pageSize: 50 });

  // Pagination instances for notified and not-notified controls
  const notifiedControlsPagination = usePagination({ pageSize: 50 });
  const notNotifiedControlsPagination = usePagination({ pageSize: 50 });

  // Pagination instances for notified and not-notified action plans
  const notifiedActionPlansPagination = usePagination({ pageSize: 50 });
  const notNotifiedActionPlansPagination = usePagination({ pageSize: 50 });

  // New queries for risk-process links instead of whole risks
  // OPTIMIZED: Increased staleTime to match server cache (5 min for pending)
  const { data: pendingRiskProcessLinks = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/risk-processes/validation/pending"],
    enabled: activeTab === "risks",
    staleTime: 1000 * 60 * 4, // 4 minutes - slightly less than server cache (5 min)
    refetchOnMount: false, // NO refetch al montar componente
    refetchOnWindowFocus: true, // Refetch al volver a la ventana (usuario puede haber validado desde otra pestaña)
    gcTime: 1000 * 60 * 15, // Mantener cache 15 minutos
  });

  // OPTIMIZED: Removed refetchOnMount - server cache (10 min) handles freshness
  // Only refetch on window focus if user might have validated from another tab
  const { data: validatedRiskProcessLinks = [], refetch: refetchValidated, isLoading: isValidatedLoading, error: validatedError } = useQuery<any[]>({
    queryKey: ["/api/risk-processes/validation/validated"],
    enabled: activeTab === "risks",
    staleTime: 1000 * 60 * 9, // 9 minutes - slightly less than server cache (10 min)
    refetchOnMount: false, // OPTIMIZED: Server cache handles freshness, no need to refetch on mount
    refetchOnWindowFocus: true, // Refetch al volver a la ventana (usuario puede haber validado desde otra pestaña)
    gcTime: 1000 * 60 * 15, // Mantener cache 15 minutos
    retry: 2, // Reintentar 2 veces si falla
  });

  // CRITICAL: Refetch validated risks when statusFilter changes to "validated"
  useEffect(() => {
    if (statusFilter === "validated" && activeTab === "risks") {
      // Invalidar caché y refetch para asegurar datos frescos
      queryClient.invalidateQueries({ queryKey: ["/api/risk-processes/validation/validated"] });
      refetchValidated();
      // Scroll a la sección de riesgos aprobados después de que los datos se carguen
      setTimeout(() => {
        validatedRisksSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 500);
    }
  }, [statusFilter, activeTab, refetchValidated, queryClient]);

  // OPTIMIZED: Increased staleTime to match server cache (10 min for rejected/observed)
  const { data: rejectedRiskProcessLinks = [] } = useQuery<any[]>({
    queryKey: ["/api/risk-processes/validation/rejected"],
    enabled: activeTab === "risks",
    staleTime: 1000 * 60 * 9, // 9 minutes - slightly less than server cache (10 min)
    refetchOnMount: false, // NO refetch al montar componente
    refetchOnWindowFocus: true, // Refetch al volver a la ventana
    gcTime: 1000 * 60 * 15, // Mantener cache 15 minutos
  });

  const { data: observedRiskProcessLinks = [] } = useQuery<any[]>({
    queryKey: ["/api/risk-processes/validation/observed"],
    enabled: activeTab === "risks",
    staleTime: 1000 * 60 * 9, // 9 minutes - slightly less than server cache (10 min)
    refetchOnMount: false, // NO refetch al montar componente
    refetchOnWindowFocus: true, // Refetch al volver a la ventana
    gcTime: 1000 * 60 * 15, // Mantener cache 15 minutos
  });

  // Shared catalog queries (always enabled) with 2-minute staleTime
  const { data: processes = [] } = useQuery<any[]>({
    queryKey: ["/api/processes"],
    staleTime: 120000,
  });

  const { data: macroprocesos = [] } = useQuery<any[]>({
    queryKey: ["/api/macroprocesos"],
    staleTime: 120000,
  });

  const { data: subprocesos = [] } = useQuery<any[]>({
    queryKey: ["/api/subprocesos"],
    staleTime: 120000,
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    staleTime: 120000,
  });

  const { data: processOwners = [] } = useQuery<any[]>({
    queryKey: ["/api/process-owners"],
    staleTime: 120000,
  });

  // Listen for filter changes from header
  useEffect(() => {
    const handleFiltersChanged = (event: CustomEvent) => {
      const {
        statusFilter: newStatusFilter,
        ownerFilter: newOwnerFilter,
        processFilter: newProcessFilter,
        macroprocesoFilter: newMacroprocesoFilter,
        riskLevelFilter: newRiskLevelFilter
      } = event.detail;

      if (newStatusFilter !== undefined) {
        setStatusFilter(newStatusFilter);
      }
      if (newOwnerFilter !== undefined) {
        console.log("📡 Received ownerFilter change event from header:", newOwnerFilter);
        setOwnerFilter(newOwnerFilter);
      }
      if (newRiskLevelFilter !== undefined) {
        setRiskLevelFilter(newRiskLevelFilter);
      }

      // Handle process filter changes
      if (newProcessFilter !== undefined) {
        setSelectedProcessId(newProcessFilter !== "all" ? newProcessFilter : null);
      }
      if (newMacroprocesoFilter !== undefined) {
        // Only set if process filter is not set
        if (newProcessFilter === undefined || newProcessFilter === "all") {
          setSelectedProcessId(newMacroprocesoFilter !== "all" ? newMacroprocesoFilter : null);
        }
      }
    };

    window.addEventListener('validationFiltersChanged', handleFiltersChanged as EventListener);
    return () => {
      window.removeEventListener('validationFiltersChanged', handleFiltersChanged as EventListener);
    };
  }, []);

  // Listen for process filter changes from header (from risks page)
  useEffect(() => {
    const handleProcessFilterChanged = (event: CustomEvent) => {
      const { processFilter, macroprocesoFilter, subprocesoFilter } = event.detail;

      // Determine which process level was selected and set selectedProcessId
      if (subprocesoFilter && subprocesoFilter !== "all") {
        setSelectedProcessId(subprocesoFilter);
      } else if (processFilter && processFilter !== "all") {
        setSelectedProcessId(processFilter);
      } else if (macroprocesoFilter && macroprocesoFilter !== "all") {
        setSelectedProcessId(macroprocesoFilter);
      } else {
        setSelectedProcessId(null);
      }
    };

    window.addEventListener('riskFiltersChanged', handleProcessFilterChanged as EventListener);
    return () => {
      window.removeEventListener('riskFiltersChanged', handleProcessFilterChanged as EventListener);
    };
  }, []);

  // Handler to update status filter and sync with header
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    // Notify header about the change so it can update the filter chip
    window.dispatchEvent(new CustomEvent('pageStatusFilterChanged', {
      detail: { statusFilter: value }
    }));
  };

  // Handler to update owner filter and sync with header
  const handleOwnerFilterChange = (value: string) => {
    setOwnerFilter(value);
    // Notify header about the change so it can update the filter chip
    window.dispatchEvent(new CustomEvent('pageOwnerFilterChanged', {
      detail: { ownerFilter: value }
    }));
  };

  // OPTIMIZED: Always fetch validation counts for summary cards (not tab-dependent)
  // Server has 5 min cache, so we can use longer staleTime to avoid unnecessary refetches
  const { data: validationCounts } = useQuery<{
    risks: { notified: number; notNotified: number; validated?: number; observed?: number; rejected?: number; total?: number };
    controls: { notified: number; notNotified: number };
    actionPlans: { notified: number; notNotified: number };
  }>({
    queryKey: ["/api/validation/counts"],
    staleTime: 1000 * 60 * 4, // 4 minutes - slightly less than server cache (5 min) to ensure freshness
    refetchOnMount: false, // OPTIMIZED: Server cache handles freshness, no need to refetch on mount
    refetchOnWindowFocus: true, // Refetch al volver a la ventana (usuario puede haber validado desde otra pestaña)
    gcTime: 1000 * 60 * 10, // Keep cache 10 minutes
  });

  // Risk-process-links notification status queries with pagination
  // OPTIMIZATION: Only fetch when risks tab is active + cache optimization
  const { data: notifiedRiskProcessLinksResponse } = useQuery<{ data: any[], pagination: { total: number, limit: number, offset: number } }>({
    queryKey: ["/api/risk-processes/validation/notified/list", { limit: notifiedRisksPagination.limit, offset: notifiedRisksPagination.offset }],
    enabled: activeTab === "risks",
    staleTime: 60000,
    refetchOnMount: false, // NO refetch al montar componente
    refetchOnWindowFocus: true, // Refetch al volver a la ventana
    gcTime: 1000 * 60 * 10, // Mantener cache 10 minutos
  });

  const notifiedRiskProcessLinks = notifiedRiskProcessLinksResponse?.data || [];
  const notifiedRisksPaginationInfo = notifiedRiskProcessLinksResponse?.pagination;

  const { data: notNotifiedRiskProcessLinksResponse } = useQuery<{ data: any[], pagination: { total: number, limit: number, offset: number } }>({
    queryKey: ["/api/risk-processes/validation/not-notified/list", { limit: notNotifiedRisksPagination.limit, offset: notNotifiedRisksPagination.offset }],
    enabled: activeTab === "risks",
    staleTime: 60000,
    refetchOnMount: false, // NO refetch al montar componente
    refetchOnWindowFocus: true, // Refetch al volver a la ventana
    gcTime: 1000 * 60 * 10, // Mantener cache 10 minutos
  });

  const notNotifiedRiskProcessLinks = notNotifiedRiskProcessLinksResponse?.data || [];
  // Use counts from dedicated endpoint if available, fallback to pagination info
  const notNotifiedRisksPaginationInfo = notNotifiedRiskProcessLinksResponse?.pagination || {
    total: validationCounts?.risks.notNotified || 0,
    limit: notNotifiedRisksPagination.limit,
    offset: notNotifiedRisksPagination.offset
  };

  // Control validation queries with pagination
  // OPTIMIZATION: Only fetch when controls tab is active + cache optimization
  const { data: notifiedControlsResponse } = useQuery<{ data: Control[], pagination: { total: number, limit: number, offset: number } }>({
    queryKey: ["/api/controls/validation/notified", { limit: notifiedControlsPagination.limit, offset: notifiedControlsPagination.offset }],
    enabled: activeTab === "controls",
    staleTime: 120000, // 2 minutos - reducir refetches durante navegación rápida
    refetchOnMount: false, // NO refetch al montar componente
    refetchOnWindowFocus: false, // NO refetch al cambiar de ventana
    gcTime: 1000 * 60 * 10, // Mantener cache 10 minutos
  });

  const notifiedControls = notifiedControlsResponse?.data || [];
  const notifiedControlsPaginationInfo = notifiedControlsResponse?.pagination;

  const { data: notNotifiedControlsResponse } = useQuery<{ data: Control[], pagination: { total: number, limit: number, offset: number } }>({
    queryKey: ["/api/controls/validation/not-notified", { limit: notNotifiedControlsPagination.limit, offset: notNotifiedControlsPagination.offset }],
    enabled: activeTab === "controls",
    staleTime: 120000, // 2 minutos - reducir refetches durante navegación rápida
    refetchOnMount: false, // NO refetch al montar componente
    refetchOnWindowFocus: false, // NO refetch al cambiar de ventana
    gcTime: 1000 * 60 * 10, // Mantener cache 10 minutos
  });

  const notNotifiedControls = notNotifiedControlsResponse?.data || [];
  const notNotifiedControlsPaginationInfo = notNotifiedControlsResponse?.pagination;

  const isLoadingControls = !notifiedControlsResponse || !notNotifiedControlsResponse;

  const { data: validatedControls = [] } = useQuery<Control[]>({
    queryKey: ["/api/controls/validation/validated"],
    enabled: activeTab === "controls",
    staleTime: 120000, // 2 minutos - reducir refetches durante navegación rápida
    refetchOnMount: false, // NO refetch al montar componente
    refetchOnWindowFocus: false, // NO refetch al cambiar de ventana
    gcTime: 1000 * 60 * 10, // Mantener cache 10 minutos
  });

  const { data: observedControls = [] } = useQuery<Control[]>({
    queryKey: ["/api/controls/validation/observed"],
    enabled: activeTab === "controls",
    staleTime: 60000,
    refetchOnMount: false, // NO refetch al montar componente
    refetchOnWindowFocus: false, // NO refetch al cambiar de ventana
    gcTime: 1000 * 60 * 10, // Mantener cache 10 minutos
  });

  const { data: rejectedControls = [] } = useQuery<Control[]>({
    queryKey: ["/api/controls/validation/rejected"],
    enabled: activeTab === "controls",
    staleTime: 60000,
    refetchOnMount: false, // NO refetch al montar componente
    refetchOnWindowFocus: false, // NO refetch al cambiar de ventana
    gcTime: 1000 * 60 * 10, // Mantener cache 10 minutos
  });

  // Action Plans validation queries
  // OPTIMIZATION: Only fetch when action-plans tab is active + cache optimization
  const { data: pendingActionPlans = [], isLoading: isLoadingActionPlans } = useQuery<any[]>({
    queryKey: ["/api/action-plans/validation/pending"],
    enabled: activeTab === "action-plans",
    staleTime: 60000,
    refetchOnMount: false, // NO refetch al montar componente
    refetchOnWindowFocus: false, // NO refetch al cambiar de ventana
    gcTime: 1000 * 60 * 10, // Mantener cache 10 minutos
  });

  const { data: notifiedActionPlansResponse } = useQuery<{ data: any[], pagination: { total: number, limit: number, offset: number } }>({
    queryKey: ["/api/action-plans/validation/notified", { limit: notifiedActionPlansPagination.limit, offset: notifiedActionPlansPagination.offset }],
    enabled: activeTab === "action-plans",
    staleTime: 60000,
    refetchOnMount: false, // NO refetch al montar componente
    refetchOnWindowFocus: false, // NO refetch al cambiar de ventana
    gcTime: 1000 * 60 * 10, // Mantener cache 10 minutos
  });

  const notifiedActionPlans = notifiedActionPlansResponse?.data || [];
  const notifiedActionPlansPaginationInfo = notifiedActionPlansResponse?.pagination;

  const { data: notNotifiedActionPlansResponse } = useQuery<{ data: any[], pagination: { total: number, limit: number, offset: number } }>({
    queryKey: ["/api/action-plans/validation/not-notified", { limit: notNotifiedActionPlansPagination.limit, offset: notNotifiedActionPlansPagination.offset }],
    enabled: activeTab === "action-plans",
    staleTime: 60000,
    refetchOnMount: false, // NO refetch al montar componente
    refetchOnWindowFocus: false, // NO refetch al cambiar de ventana
    gcTime: 1000 * 60 * 10, // Mantener cache 10 minutos
  });

  const notNotifiedActionPlans = notNotifiedActionPlansResponse?.data || [];
  const notNotifiedActionPlansPaginationInfo = notNotifiedActionPlansResponse?.pagination;

  const { data: validatedActionPlans = [] } = useQuery<any[]>({
    queryKey: ["/api/action-plans/validation/validated"],
    enabled: activeTab === "action-plans",
    staleTime: 60000,
    refetchOnMount: false, // NO refetch al montar componente
    refetchOnWindowFocus: false, // NO refetch al cambiar de ventana
    gcTime: 1000 * 60 * 10, // Mantener cache 10 minutos
  });

  const { data: rejectedActionPlans = [] } = useQuery<any[]>({
    queryKey: ["/api/action-plans/validation/rejected"],
    enabled: activeTab === "action-plans",
    staleTime: 60000,
    refetchOnMount: false, // NO refetch al montar componente
    refetchOnWindowFocus: false, // NO refetch al cambiar de ventana
    gcTime: 1000 * 60 * 10, // Mantener cache 10 minutos
  });

  const { data: observedActionPlans = [] } = useQuery<any[]>({
    queryKey: ["/api/action-plans/validation/observed"],
    enabled: activeTab === "action-plans",
    staleTime: 60000,
    refetchOnMount: false, // NO refetch al montar componente
    refetchOnWindowFocus: false, // NO refetch al cambiar de ventana
    gcTime: 1000 * 60 * 10, // Mantener cache 10 minutos
  });

  // Query for action plan details
  const { data: actionPlanDetails } = useQuery<any>({
    queryKey: ["/api/action-plans", viewingActionPlan?.id],
    enabled: !!viewingActionPlan,
  });

  // Process validation dashboard data
  interface ProcessValidationDashboard {
    macroprocesoId: string;
    processName: string;
    processOwner: string;
    validationStatus: 'pending' | 'in_progress' | 'completed';
    totalRisks: number;
    validatedRisks: number;
    pendingRisks: number;
    totalControls: number;
    validatedControls: number;
    pendingControls: number;
    completionPercentage: number;
    lastValidatedAt?: string;
  }

  const { data: processValidationDashboard = [], isLoading: isLoadingProcessDashboard } = useQuery<ProcessValidationDashboard[]>({
    queryKey: ["/api/process-validations/dashboard"],
    staleTime: 120000, // 2 minutos - datos del dashboard cambian menos frecuentemente
    refetchOnMount: false, // NO refetch al montar componente
    refetchOnWindowFocus: false, // NO refetch al cambiar de ventana
    gcTime: 1000 * 60 * 10, // Mantener cache 10 minutos
  });

  // Reset pagination when filters change
  useEffect(() => {
    notifiedRisksPagination.resetPagination();
    notNotifiedRisksPagination.resetPagination();
    notifiedControlsPagination.resetPagination();
    notNotifiedControlsPagination.resetPagination();
    notifiedActionPlansPagination.resetPagination();
    notNotifiedActionPlansPagination.resetPagination();
  }, [statusFilter, ownerFilter, riskLevelFilter, selectedProcessId]);

  // New validation mutation for risk-process links
  const validateRiskProcessLinkMutation = useMutation({
    mutationFn: async ({ riskProcessLinkId, status, comments }: { riskProcessLinkId: string; status: "validated" | "observed" | "rejected"; comments?: string }) => {
      await apiRequest(`/api/risk-processes/${riskProcessLinkId}/validate`, 'POST', {
        validationStatus: status,
        validationComments: comments,
      });
    },
    onSuccess: () => {
      // Optimistic UI: mover el enlace fuera de pendientes inmediatamente
      queryClient.setQueryData<any[]>(["/api/risk-processes/validation/pending"], (old) => {
        if (!Array.isArray(old)) return old;
        return old.filter((item) => item.id !== (selectedRiskProcessLink as any)?.id);
      });
      // Opcional: podríamos añadirlo a la lista de validados si la tenemos en cache
      queryClient.setQueryData<any[]>(["/api/risk-processes/validation/validated"], (old) => {
        if (!Array.isArray(old) || !selectedRiskProcessLink) return old;
        const updated = { ...(selectedRiskProcessLink as any), validationStatus: validationAction };
        return [updated, ...old];
      });

      // Invalidate all validation queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/risk-processes/validation/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-processes/validation/validated"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-processes/validation/rejected"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-processes/validation/observed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-processes/validation/notified/list"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-processes/validation/not-notified/list"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-processes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risks"] });
      // CRITICAL: Invalidate batch-relations cache so risk list shows updated validation status
      queryClient.invalidateQueries({ queryKey: ["/api/risks/batch-relations"], exact: false });
      toast({
        title: "Enlace proceso-riesgo validado",
        description: `El enlace ha sido ${validationAction === "validated" ? "aprobado" : validationAction === "observed" ? "observado" : "rechazado"} exitosamente.`,
      });
      setDialogOpen(false);
      setValidationComments("");
      setSelectedRiskProcessLink(null);
      setValidationAction(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo validar el enlace proceso-riesgo.",
        variant: "destructive",
      });
    },
  });

  // Legacy validation mutation (can be removed later)
  const validateMutation = useMutation({
    mutationFn: async ({ riskId, status, comments }: { riskId: string; status: "validated" | "observed" | "rejected"; comments?: string }) => {
      try {
        const result = await apiRequest(`/api/risks/${riskId}/validate`, 'POST', {
          validationStatus: status,
          validationComments: comments,
        });
        return result;
      } catch (error: any) {
        console.error('[validateMutation] Error validating risk:', error);
        // Re-throw with more context
        throw new Error(error?.message || `Error al validar riesgo: ${error?.status || 'Unknown error'}`);
      }
    },
    onSuccess: (data) => {
      console.log('[validateMutation] Risk validated successfully:', data);
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["/api/risks/validation/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risks/validation/validated"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risks/validation/rejected"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risks/validation/observed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risks"] });
      // FIXED: Also invalidate bootstrap cache to ensure risk list shows updated validation status
      queryClient.invalidateQueries({ queryKey: ["/api/risks/bootstrap"], exact: false });
      queryClient.invalidateQueries({ queryKey: ['risks-page-data-lite', tenantId] });
      // Also invalidate risk-process-links queries since validating a risk updates both tables
      queryClient.invalidateQueries({ queryKey: ["/api/risk-processes/validation/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-processes/validation/validated"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-processes/validation/rejected"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-processes/validation/observed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-processes"] });
      // CRITICAL: Invalidate batch-relations cache so risk list shows updated validation status
      queryClient.invalidateQueries({ queryKey: ["/api/risks/batch-relations"], exact: false });
      // Invalidate validation counts
      queryClient.invalidateQueries({ queryKey: ["/api/validation/counts"] });

      toast({
        title: "Riesgo validado",
        description: `El riesgo ha sido ${validationAction === "validated" ? "aprobado" : "rechazado"} exitosamente.`,
      });
      setDialogOpen(false);
      setValidationComments("");
      setSelectedRisk(null);
      setValidationAction(null);
    },
    onError: (error: Error) => {
      console.error('[validateMutation] Error in onError:', error);
      const errorMessage = error?.message || "No se pudo validar el riesgo.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      // Even on error, try to refresh the data in case the validation partially succeeded
      queryClient.invalidateQueries({ queryKey: ["/api/risks/validation/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risks/validation/validated"] });
      queryClient.invalidateQueries({ queryKey: ["/api/validation/counts"] });
    },
  });

  const validateControlMutation = useMutation({
    mutationFn: async ({ controlId, status, comments }: { controlId: string; status: "validated" | "observed" | "rejected"; comments?: string }) => {
      await apiRequest(`/api/controls/${controlId}/validate`, 'POST', {
        validationStatus: status,
        validationComments: comments,
      });
    },
    onSuccess: () => {
      // Invalidate all control validation queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/controls/validation/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/controls/validation/validated"] });
      queryClient.invalidateQueries({ queryKey: ["/api/controls/validation/rejected"] });
      queryClient.invalidateQueries({ queryKey: ["/api/controls/validation/observed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/controls/validation/notified"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/controls/validation/not-notified"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/controls"] });
      toast({
        title: "Control validado",
        description: `El control ha sido ${validationAction === "validated" ? "aprobado" : validationAction === "observed" ? "observado" : "rechazado"} exitosamente.`,
      });
      setDialogOpen(false);
      setValidationComments("");
      setSelectedControl(null);
      setValidationAction(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo validar el control.",
        variant: "destructive",
      });
    },
  });

  const validateActionPlanMutation = useMutation({
    mutationFn: async ({ actionPlanId, status, comments, sendNotification }: { actionPlanId: string; status: "validated" | "observed" | "rejected"; comments?: string; sendNotification?: boolean }) => {
      await apiRequest(`/api/action-plans/${actionPlanId}/validate`, 'POST', {
        status,
        comments,
        sendNotification,
      });
    },
    onSuccess: () => {
      // Invalidate all action plan validation queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/action-plans/validation/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/action-plans/validation/validated"] });
      queryClient.invalidateQueries({ queryKey: ["/api/action-plans/validation/rejected"] });
      queryClient.invalidateQueries({ queryKey: ["/api/action-plans/validation/observed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/action-plans/validation/notified"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/action-plans/validation/not-notified"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/action-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      toast({
        title: "Plan de acción validado",
        description: `El plan de acción ha sido ${validationAction === "validated" ? "aprobado" : validationAction === "observed" ? "observado" : "rechazado"} exitosamente.`,
      });
      setDialogOpen(false);
      setValidationComments("");
      setSelectedActionPlan(null);
      setValidationAction(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo validar el plan de acción.",
        variant: "destructive",
      });
    },
  });

  const sendNotificationMutation = useMutation({
    mutationFn: async ({ riskId }: { riskId: string }) => {
      await apiRequest(`/api/risks/${riskId}/send-notification`, 'POST');
    },
    onSuccess: () => {
      toast({
        title: "Notificación enviada",
        description: "Se ha enviado la notificación al dueño del proceso.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo enviar la notificación.",
        variant: "destructive",
      });
    },
  });


  const resendValidationMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/action-plans/${id}/resend-validation`, "POST", {}),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/action-plans/validation/notified"] });
      queryClient.invalidateQueries({ queryKey: ["/api/action-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      toast({
        title: "Email reenviado",
        description: `Se reenvió el email de validación al responsable del plan de acción.`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "No se pudo reenviar el email de validación.",
        variant: "destructive"
      });
    },
  });

  const handleResendValidation = (id: string) => {
    resendValidationMutation.mutate(id);
  };

  // Resend email for risk-process-link
  const resendRiskProcessLinkEmailMutation = useMutation({
    mutationFn: async (riskProcessLinkId: string) => {
      return await apiRequest(`/api/risk-processes/${riskProcessLinkId}/resend-notification`, 'POST', {});
    },
    onSuccess: (result: any) => {
      // Invalidate all validation queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/risk-processes/validation/notified/list"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-processes/validation/not-notified/list"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-processes/validation/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-processes/validation/validated"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-processes/validation/rejected"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-processes/validation/observed"] });
      const message = result?.message || "Se reenvió el email de validación al responsable del proceso";
      const description = result?.email ? `${message} (${result.email})` : message;
      toast({
        title: "Email reenviado",
        description: description
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al reenviar",
        description: error?.message || "No se pudo reenviar el email de validación.",
        variant: "destructive"
      });
    },
  });

  // Email validation mutations
  const sendEmailValidationMutation = useMutation({
    mutationFn: async ({ entityId, entityType, processOwnerEmail }: {
      entityId: string;
      entityType: 'risk' | 'control';
      processOwnerEmail: string;
    }) => {
      // Create validation token and send email (backend sends email automatically)
      const tokenData = await apiRequest('/api/validation-tokens', 'POST', {
        entityType,
        entityId,
        processOwnerEmail
      });

      return tokenData;
    },
    onSuccess: (result: any) => {
      if (result.emailSent) {
        toast({
          title: "Email enviado",
          description: "Se ha enviado el email de validación al dueño del proceso.",
        });
      } else {
        toast({
          title: "Token creado",
          description: "El token fue creado pero no se pudo enviar el email.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el email de validación.",
        variant: "destructive",
      });
    },
  });

  const sendBulkEmailValidationMutation = useMutation({
    mutationFn: async ({ entities }: {
      entities: Array<{
        entityId: string;
        entityType: 'risk' | 'control';
        processOwnerEmail: string;
      }>;
    }) => {
      const results = await Promise.allSettled(
        entities.map(async (entity) => {
          // Create validation token and send email (backend sends email automatically)
          const tokenData = await apiRequest('/api/validation-tokens', 'POST', {
            entityType: entity.entityType,
            entityId: entity.entityId,
            processOwnerEmail: entity.processOwnerEmail
          });

          return tokenData;
        })
      );

      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;

      return { successful, failed, total: entities.length };
    },
    onSuccess: (result) => {
      toast({
        title: "Emails enviados",
        description: `Se enviaron ${result.successful} emails exitosamente${result.failed > 0 ? `, ${result.failed} fallaron` : ''}.`,
      });
      setSelectedRiskProcessLinks([]);
      setSelectedControls([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudieron enviar los emails de validación.",
        variant: "destructive",
      });
    },
  });

  const sendProcessToValidationMutation = useMutation({
    mutationFn: async ({ processIds, revalidateAll = true }: { processIds: string[], revalidateAll?: boolean }) => {
      const results = await Promise.allSettled(
        processIds.map(processId =>
          apiRequest(`/api/processes/${processId}/send-to-validation`, 'POST', { revalidateAll })
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      return {
        successful: successful.length,
        failed: failed.length,
        total: processIds.length,
        results
      };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/process-validations/dashboard"] });

      if (data.failed > 0) {
        toast({
          title: "Envío parcial",
          description: `${data.successful} de ${data.total} procesos enviados. ${data.failed} procesos no tienen riesgos ni controles asociados.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Procesos enviados a validación",
          description: `Se enviaron ${data.successful} procesos a validación exitosamente.`,
        });
      }

      setSelectedProcesses([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "No se pudieron enviar los procesos a validación.",
        variant: "destructive",
      });
    },
  });

  const handleValidate = (risk: Risk, action: "validated" | "observed" | "rejected") => {
    setSelectedRisk(risk);
    setValidationType("risk");
    setValidationAction(action);
    setDialogOpen(true);
  };

  const handleValidateControl = (control: Control, action: "validated" | "observed" | "rejected") => {
    setSelectedControl(control);
    setValidationType("control");
    setValidationAction(action);
    setDialogOpen(true);
  };

  const handleValidateActionPlan = (actionPlan: any, action: "validated" | "observed" | "rejected") => {
    setSelectedActionPlan(actionPlan);
    setValidationType("action-plan");
    setValidationAction(action);
    setDialogOpen(true);
  };

  const handleSelectActionPlan = (actionPlanId: string, checked: boolean) => {
    if (checked) {
      setSelectedActionPlans(prev => [...prev, actionPlanId]);
    } else {
      setSelectedActionPlans(prev => prev.filter(id => id !== actionPlanId));
    }
  };

  const handleSelectAllActionPlans = (actionPlans: any[], checked: boolean) => {
    if (checked) {
      const actionPlanIds = actionPlans.map(ap => ap.id);
      setSelectedActionPlans(prev => Array.from(new Set([...prev, ...actionPlanIds])));
    } else {
      const actionPlanIds = actionPlans.map(ap => ap.id);
      setSelectedActionPlans(prev => prev.filter(id => !actionPlanIds.includes(id)));
    }
  };

  const handleSelectControl = (controlId: string, checked: boolean) => {
    if (checked) {
      setSelectedControls(prev => [...prev, controlId]);
    } else {
      setSelectedControls(prev => prev.filter(id => id !== controlId));
    }
  };

  const handleSelectAllControls = (controls: any[], checked: boolean) => {
    if (checked) {
      const controlIds = controls.map(c => c.id);
      setSelectedControls(prev => Array.from(new Set([...prev, ...controlIds])));
    } else {
      const controlIds = controls.map(c => c.id);
      setSelectedControls(prev => prev.filter(id => !controlIds.includes(id)));
    }
  };

  const confirmValidation = () => {
    if (validationType === "risk" && selectedRisk && validationAction) {
      validateMutation.mutate({
        riskId: selectedRisk.id,
        status: validationAction,
        comments: validationComments,
      });
    } else if (validationType === "control" && selectedControl && validationAction) {
      validateControlMutation.mutate({
        controlId: selectedControl.id,
        status: validationAction,
        comments: validationComments,
      });
    } else if (validationType === "action-plan" && selectedActionPlan && validationAction) {
      validateActionPlanMutation.mutate({
        actionPlanId: selectedActionPlan.id,
        status: validationAction,
        comments: validationComments,
        sendNotification: sendNotification,
      });
    }
  };

  const handleSendNotification = (riskId: string) => {
    sendNotificationMutation.mutate({ riskId });
  };


  // Email validation handlers
  const handleSendEmailValidation = (entityId: string, entityType: 'risk' | 'control', processOwnerEmail: string) => {
    if (!processOwnerEmail) {
      toast({
        title: "Error",
        description: "No hay email del dueño del proceso configurado.",
        variant: "destructive",
      });
      return;
    }

    sendEmailValidationMutation.mutate({
      entityId,
      entityType,
      processOwnerEmail
    });
  };

  const handleSendBulkEmailValidation = async () => {
    // Use grouped email endpoints for each entity type

    // Handle risks with new grouped endpoint
    if (selectedRiskProcessLinks.length > 0) {
      handleSendBulkRiskEmailValidation();
      return;
    }

    // Handle controls with grouped endpoint
    if (selectedControls.length > 0) {
      handleSendBulkControlEmailValidation();
      return;
    }

    // Handle action plans - send emails to responsible owners
    // Use pagination selectedIds
    const notifiedActionPlanIds = Array.from(notifiedActionPlansPagination.selectedIds);
    const notNotifiedActionPlanIds = Array.from(notNotifiedActionPlansPagination.selectedIds);
    const allSelectedActionPlanIds = [...notifiedActionPlanIds, ...notNotifiedActionPlanIds];

    if (allSelectedActionPlanIds.length > 0) {
      try {
        const planIds = allSelectedActionPlanIds;
        const result: any = await apiRequest('/api/action-plans/send-email', 'POST', {
          planIds,
          subject: 'Validación de Plan de Acción',
          message: 'Se requiere su atención para validar el plan de acción asignado.'
        });

        if (result.sentCount > 0) {
          toast({
            title: "Emails enviados",
            description: `Se enviaron ${result.sentCount} email(s) a los responsables de los planes de acción.`,
          });
          // Clear pagination selections
          notifiedActionPlansPagination.handleClearAll();
          notNotifiedActionPlansPagination.handleClearAll();
          return;
        } else {
          toast({
            title: "Error",
            description: result.message || "No se pudieron enviar emails. Verifica que los responsables tengan email configurado.",
            variant: "destructive",
          });
          return;
        }
      } catch (error) {
        console.error('Error sending action plan emails:', error);
        toast({
          title: "Error",
          description: "Error al enviar emails de planes de acción.",
          variant: "destructive",
        });
        return;
      }
    }

    toast({
      title: "Error",
      description: "No hay elementos seleccionados.",
      variant: "destructive",
    });
  };

  // Bulk control email validation handler (uses new grouped email endpoint)
  const sendBulkControlEmailsMutation = useMutation({
    mutationFn: async (controlIds: string[]) => {
      return await apiRequest('/api/controls/send-bulk-validation-email', 'POST', { controlIds });
    },
    onSuccess: (result) => {
      toast({
        title: "Emails enviados",
        description: `${result.emailsSent} email(s) enviado(s) para ${result.controlsNotified} control(es)`,
      });
      // Clear pagination selections
      notNotifiedControlsPagination.handleClearAll();
      queryClient.invalidateQueries({ queryKey: ['/api/controls/validation/not-notified'] });
      queryClient.invalidateQueries({ queryKey: ['/api/controls/validation/notified'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al enviar emails de controles",
        variant: "destructive",
      });
    },
  });

  // Bulk action handlers
  const executeBulkAction = () => {
    if (!bulkActionType || !bulkActionTarget) return;

    if (bulkActionTarget === "risks") {
      selectedRiskProcessLinks.forEach(linkId => {
        const rpl = filteredPendingRiskProcessLinks.find(r => r.id === linkId);
        if (rpl?.risk) handleValidate(rpl.risk, bulkActionType);
      });
    } else if (bulkActionTarget === "controls") {
      // Use pagination selectedIds for controls
      const controlIds = Array.from(notifiedControlsPagination.selectedIds.size > 0
        ? notifiedControlsPagination.selectedIds
        : notNotifiedControlsPagination.selectedIds);

      controlIds.forEach(controlId => {
        const control = notifiedControls.find(c => c.id === controlId) ||
          notNotifiedControls.find(c => c.id === controlId);
        if (control) handleValidateControl(control, bulkActionType);
      });
    } else if (bulkActionTarget === "action-plans") {
      // Use pagination selectedIds for action plans + old array for fallback section
      const notifiedActionPlanIds = Array.from(notifiedActionPlansPagination.selectedIds);
      const notNotifiedActionPlanIds = Array.from(notNotifiedActionPlansPagination.selectedIds);
      const allSelectedActionPlanIds = [...notifiedActionPlanIds, ...notNotifiedActionPlanIds, ...selectedActionPlans];

      allSelectedActionPlanIds.forEach(planId => {
        // Try to find in notifiedActionPlans or notNotifiedActionPlans or fallback pending
        const plan = notifiedActionPlans.find(p => p.id === planId) ||
          notNotifiedActionPlans.find(p => p.id === planId) ||
          filteredPendingActionPlans.find(p => p.id === planId);
        if (plan) handleValidateActionPlan(plan, bulkActionType);
      });
    }

    setBulkActionConfirmOpen(false);
    setBulkActionType(null);
    setBulkActionTarget(null);
  };

  const openBulkActionConfirm = (action: "validated" | "observed" | "rejected", target: "risks" | "controls" | "action-plans") => {
    setBulkActionType(action);
    setBulkActionTarget(target);
    setBulkActionConfirmOpen(true);
  };

  const getBulkActionMessage = () => {
    const count = bulkActionTarget === "risks" ? selectedRiskProcessLinks.length :
      bulkActionTarget === "controls" ? (notifiedControlsPagination.selectedIds.size + notNotifiedControlsPagination.selectedIds.size) :
        (notifiedActionPlansPagination.selectedIds.size + notNotifiedActionPlansPagination.selectedIds.size + selectedActionPlans.length);

    const entityName = bulkActionTarget === "risks" ? "riesgo(s)" :
      bulkActionTarget === "controls" ? "control(es)" :
        "plan(es) de acción";

    const actionText = bulkActionType === "validated" ? "aprobar" :
      bulkActionType === "observed" ? "observar" :
        "rechazar";

    return `¿Está seguro que desea ${actionText} ${count} ${entityName} seleccionado(s)?`;
  };

  const handleSendBulkControlEmailValidation = async () => {
    const controlIds = Array.from(notNotifiedControlsPagination.selectedIds);
    if (controlIds.length === 0) return;
    sendBulkControlEmailsMutation.mutate(controlIds);
  };

  // Bulk risk-process-link email validation handler (uses new grouped email endpoint)
  const sendBulkRiskEmailsMutation = useMutation({
    mutationFn: async (riskProcessLinkIds: string[]) => {
      return await apiRequest('/api/risk-processes/send-bulk-validation-email', 'POST', { riskProcessLinkIds });
    },
    onSuccess: (result) => {
      toast({
        title: "Emails enviados",
        description: `${result.emailsSent} email(s) enviado(s) para ${result.linksNotified} riesgo(s)`,
      });
      // Clear both selection states
      setSelectedRiskProcessLinks([]);
      notNotifiedRisksPagination.handleClearAll();
      // Invalidate all validation queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/risk-processes/validation/not-notified/list'] });
      queryClient.invalidateQueries({ queryKey: ['/api/risk-processes/validation/notified/list'] });
      queryClient.invalidateQueries({ queryKey: ['/api/risk-processes/validation/pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/risk-processes/validation/validated'] });
      queryClient.invalidateQueries({ queryKey: ['/api/risk-processes/validation/rejected'] });
      queryClient.invalidateQueries({ queryKey: ['/api/risk-processes/validation/observed'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al enviar emails de riesgos",
        variant: "destructive",
      });
    },
  });

  const handleSendBulkRiskEmailValidation = async () => {
    // Check both selection states: old array (pending) and new pagination Set (not-notified)
    const selectedFromArray = selectedRiskProcessLinks;
    const selectedFromPagination = Array.from(notNotifiedRisksPagination.selectedIds);

    // Use whichever has selections
    const riskProcessLinkIds = selectedFromPagination.length > 0 ? selectedFromPagination : selectedFromArray;

    if (riskProcessLinkIds.length === 0) return;
    sendBulkRiskEmailsMutation.mutate(riskProcessLinkIds);
  };

  // Resend individual control validation mutation
  const resendControlMutation = useMutation({
    mutationFn: async (controlId: string) => {
      return await apiRequest(`/api/controls/${controlId}/resend-validation`, 'POST', {});
    },
    onSuccess: () => {
      toast({
        title: "Email reenviado",
        description: "Se ha generado un nuevo token y enviado el email de validación",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/controls/validation/notified'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al reenviar email de validación",
        variant: "destructive",
      });
    },
  });

  const handleResendControl = (control: any) => {
    setControlToResend(control);
  };

  const confirmResendControl = () => {
    if (controlToResend) {
      resendControlMutation.mutate(controlToResend.id);
      setControlToResend(null);
    }
  };

  // Control email validation handler
  const handleSendControlEmailValidation = async (controlId: string) => {
    try {
      // Get the control owner information from the API
      const controlOwner = await apiRequest(`/api/control-owners/by-control/${controlId}`, 'GET');

      if (!controlOwner || !controlOwner.user?.email) {
        toast({
          title: "Error",
          description: "No hay email del dueño del control configurado.",
          variant: "destructive",
        });
        return;
      }

      sendEmailValidationMutation.mutate({
        entityId: controlId,
        entityType: 'control',
        processOwnerEmail: controlOwner.user.email
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al obtener información del dueño del control.",
        variant: "destructive",
      });
    }
  };


  const handleSelectRiskProcessLink = (linkId: string, checked: boolean) => {
    if (checked) {
      setSelectedRiskProcessLinks(prev => [...prev, linkId]);
    } else {
      setSelectedRiskProcessLinks(prev => prev.filter(id => id !== linkId));
    }
  };

  const handleSelectAll = (riskProcessLinks: any[], checked: boolean) => {
    if (checked) {
      const linkIds = riskProcessLinks.map(link => link.id);
      setSelectedRiskProcessLinks(prev => Array.from(new Set([...prev, ...linkIds])));
    } else {
      const linkIds = riskProcessLinks.map(link => link.id);
      setSelectedRiskProcessLinks(prev => prev.filter(id => !linkIds.includes(id)));
    }
  };

  const handleSelectProcess = (processId: string, checked: boolean) => {
    if (checked) {
      setSelectedProcesses(prev => [...prev, processId]);
    } else {
      setSelectedProcesses(prev => prev.filter(id => id !== processId));
    }
  };

  const handleSendProcessesToValidation = async () => {
    if (selectedProcesses.length === 0) return;

    // For single process selection, check if there are already validated risks
    if (selectedProcesses.length === 1) {
      try {
        const processId = selectedProcesses[0];
        const checkData = await apiRequest(`/api/processes/${processId}/check-validation-status`, 'POST');

        if (checkData.hasValidatedRisks) {
          // Show warning modal
          setPreValidationData(checkData);
          setPendingProcessIds(selectedProcesses);
          setPreValidationWarningOpen(true);
          return;
        }
      } catch (error) {
        console.error('Error checking validation status:', error);
        // Continue with normal flow if check fails
      }
    }

    // If no validated risks or multiple processes, proceed normally
    sendProcessToValidationMutation.mutate({ processIds: selectedProcesses });
  };

  const handleConfirmPreValidation = (revalidateAll: boolean) => {
    if (pendingProcessIds.length === 0) return;

    setPreValidationWarningOpen(false);

    // Send processes with revalidateAll parameter
    sendProcessToValidationMutation.mutate({
      processIds: pendingProcessIds,
      revalidateAll
    });

    setPendingProcessIds([]);
    setPreValidationData(null);
  };

  const toggleMacroprocesoExpanded = (macroprocesoId: string) => {
    setExpandedMacroprocesos(prev =>
      prev.includes(macroprocesoId)
        ? prev.filter(id => id !== macroprocesoId)
        : [...prev, macroprocesoId]
    );
  };

  // Sort handler
  const handleSort = (field: "code" | "process" | "responsible" | "control" | "validatedAt") => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Sort function for risk-process-links
  const sortRiskProcessLinks = (links: any[]) => {
    if (!sortField) return links;

    return [...links].sort((a, b) => {
      let aVal = "";
      let bVal = "";

      if (sortField === "code") {
        aVal = a.risk?.code || "";
        bVal = b.risk?.code || "";
      } else if (sortField === "process") {
        aVal = a.macroproceso?.name || a.process?.name || a.subproceso?.name || "";
        bVal = b.macroproceso?.name || b.process?.name || b.subproceso?.name || "";
      } else if (sortField === "responsible") {
        aVal = a.responsibleUser?.fullName || a.risk?.processOwner || "";
        bVal = b.responsibleUser?.fullName || b.risk?.processOwner || "";
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

  // Helper function to check if a risk-process link belongs to the filtered owner
  const matchesOwnerFilter = useCallback((rpl: any): boolean => {
    if (ownerFilter === "all") return true;

    // Check if the responsible user directly matches
    if (rpl.responsibleUser?.id === ownerFilter) return true;

    // Check if macroproceso owner matches
    if (rpl.macroprocesoId) {
      const macroproceso = macroprocesos.find((m: any) => m.id === rpl.macroprocesoId);
      if (macroproceso?.ownerId === ownerFilter) return true;
    }

    // Check if proceso owner matches
    if (rpl.processId) {
      const process = processes.find((p: any) => p.id === rpl.processId);
      if (process?.ownerId === ownerFilter) return true;
    }

    // Check if subproceso owner matches
    if (rpl.subprocesoId) {
      const subproceso = subprocesos.find((s: any) => s.id === rpl.subprocesoId);
      if (subproceso?.ownerId === ownerFilter) return true;
    }

    return false;
  }, [ownerFilter, macroprocesos, processes, subprocesos]);

  // Risk level filter for risks
  const matchesRiskLevelFilterForRisk = useCallback((rpl: any): boolean => {
    if (riskLevelFilter === "all") return true;

    // CRITICAL: If risk object is missing, try to use riskId to get risk data
    // or allow through to prevent filtering out valid risk-process links
    if (!rpl.risk) {
      // If we have riskId but no risk object, allow through (will be handled in render)
      return !!rpl.riskId;
    }

    // Get residual risk or fallback to inherent risk
    const riskValue = rpl.risk.residualRisk ?? rpl.risk.inherentRisk;
    // FIXED: If risk value is null/undefined, allow it to pass through (don't filter out)
    // This prevents approved risks from being hidden when they don't have risk level data
    if (riskValue === null || riskValue === undefined) {
      // If filter is set but risk has no level, include it anyway to prevent hiding valid data
      return true;
    }

    const riskLevelText = getRiskLevelText(riskValue);
    // Case-insensitive comparison (header sends "bajo", "medio", "alto", "crítico")
    return riskLevelText.toLowerCase() === riskLevelFilter.toLowerCase();
  }, [riskLevelFilter, getRiskLevelText]);

  // Filter functions for RiskProcessLinks
  const filteredPendingRiskProcessLinks = sortRiskProcessLinks(pendingRiskProcessLinks.filter(rpl => {
    // Filter by selected process (check macroproceso, proceso, or subproceso)
    if (selectedProcessId) {
      const matchesProcess =
        rpl.macroprocesoId === selectedProcessId ||
        rpl.processId === selectedProcessId ||
        rpl.subprocesoId === selectedProcessId;
      if (!matchesProcess) return false;
    }
    // Owner filter: check entire process hierarchy
    if (!matchesOwnerFilter(rpl)) return false;
    // Risk level filter
    if (!matchesRiskLevelFilterForRisk(rpl)) return false;
    return true;
  }));

  const filteredValidatedRiskProcessLinks = useMemo(() => {
    if (!Array.isArray(validatedRiskProcessLinks)) return [];

    return validatedRiskProcessLinks.filter((rpl: any) => {
      // Skip if no risk data at all
      if (!rpl || (!rpl.risk && !rpl.riskId)) return false;

      // Apply process filter if selected
      if (selectedProcessId) {
        const matchesProcess =
          rpl.macroprocesoId === selectedProcessId ||
          rpl.processId === selectedProcessId ||
          rpl.subprocesoId === selectedProcessId;
        if (!matchesProcess) return false;
      }

      // Apply owner filter
      if (!matchesOwnerFilter(rpl)) return false;

      // Apply risk level filter
      if (!matchesRiskLevelFilterForRisk(rpl)) return false;

      return true;
    });
  }, [validatedRiskProcessLinks, selectedProcessId, ownerFilter, riskLevelFilter, statusFilter, matchesOwnerFilter, matchesRiskLevelFilterForRisk, macroprocesos, processes, subprocesos]);

  const filteredRejectedRiskProcessLinks = rejectedRiskProcessLinks.filter(rpl => {
    if (selectedProcessId) {
      const matchesProcess =
        rpl.macroprocesoId === selectedProcessId ||
        rpl.processId === selectedProcessId ||
        rpl.subprocesoId === selectedProcessId;
      if (!matchesProcess) return false;
    }
    if (!matchesOwnerFilter(rpl)) return false;
    if (!matchesRiskLevelFilterForRisk(rpl)) return false;
    return true;
  });

  const filteredObservedRiskProcessLinks = observedRiskProcessLinks.filter(rpl => {
    if (selectedProcessId) {
      const matchesProcess =
        rpl.macroprocesoId === selectedProcessId ||
        rpl.processId === selectedProcessId ||
        rpl.subprocesoId === selectedProcessId;
      if (!matchesProcess) return false;
    }
    if (!matchesOwnerFilter(rpl)) return false;
    if (!matchesRiskLevelFilterForRisk(rpl)) return false;
    return true;
  });

  const filteredNotifiedRiskProcessLinks = notifiedRiskProcessLinks.filter(rpl => {
    if (selectedProcessId) {
      const matchesProcess =
        rpl.macroprocesoId === selectedProcessId ||
        rpl.processId === selectedProcessId ||
        rpl.subprocesoId === selectedProcessId;
      if (!matchesProcess) return false;
    }
    if (!matchesOwnerFilter(rpl)) return false;
    if (!matchesRiskLevelFilterForRisk(rpl)) return false;
    return true;
  });

  const filteredNotNotifiedRiskProcessLinks = notNotifiedRiskProcessLinks.filter(rpl => {
    if (selectedProcessId) {
      const matchesProcess =
        rpl.macroprocesoId === selectedProcessId ||
        rpl.processId === selectedProcessId ||
        rpl.subprocesoId === selectedProcessId;
      if (!matchesProcess) return false;
    }
    if (!matchesOwnerFilter(rpl)) return false;
    if (!matchesRiskLevelFilterForRisk(rpl)) return false;
    return true;
  });

  // Helper function to get unique process ID from riskProcessLink
  const getProcessIdFromLink = (rpl: any): string | null => {
    return rpl.subprocesoId || rpl.processId || rpl.macroprocesoId || null;
  };

  // Calculate unique process counts for Process Map tab cards
  const uniqueNotifiedProcesses = new Set(
    filteredNotifiedRiskProcessLinks.map(getProcessIdFromLink).filter(Boolean)
  ).size;

  const uniqueNotNotifiedProcesses = new Set(
    filteredNotNotifiedRiskProcessLinks.map(getProcessIdFromLink).filter(Boolean)
  ).size;

  const uniqueValidatedProcesses = new Set(
    filteredValidatedRiskProcessLinks.map(getProcessIdFromLink).filter(Boolean)
  ).size;

  const uniqueObservedProcesses = new Set(
    filteredObservedRiskProcessLinks.map(getProcessIdFromLink).filter(Boolean)
  ).size;

  const uniqueRejectedProcesses = new Set(
    filteredRejectedRiskProcessLinks.map(getProcessIdFromLink).filter(Boolean)
  ).size;

  // Calculate total unique processes (count only proceso level, not macroprocesos or subprocesos)
  const uniqueTotalProcesses = processes.filter(p => ownerFilter === "all" || p.ownerId === ownerFilter).length;

  // Get owner name for action plan filtering
  const selectedOwner = processOwners.find(owner => owner.id === ownerFilter);
  const ownerName = selectedOwner?.name;

  // Get process IDs for status filter in Process Map tab
  const getProcessIdsForStatusFilter = (): Set<string> => {
    if (statusFilter === "all") {
      // Return ALL process IDs (level 2 only - procesos, not macroprocesos or subprocesos)
      return new Set(processes.map(p => p.id));
    } else if (statusFilter === "notified") {
      return new Set(filteredNotifiedRiskProcessLinks.map(getProcessIdFromLink).filter(Boolean) as string[]);
    } else if (statusFilter === "not_notified") {
      return new Set(filteredNotNotifiedRiskProcessLinks.map(getProcessIdFromLink).filter(Boolean) as string[]);
    } else if (statusFilter === "validated") {
      return new Set(filteredValidatedRiskProcessLinks.map(getProcessIdFromLink).filter(Boolean) as string[]);
    } else if (statusFilter === "observed") {
      return new Set(filteredObservedRiskProcessLinks.map(getProcessIdFromLink).filter(Boolean) as string[]);
    } else if (statusFilter === "rejected") {
      return new Set(filteredRejectedRiskProcessLinks.map(getProcessIdFromLink).filter(Boolean) as string[]);
    }
    return new Set();
  };

  const allowedProcessIds = getProcessIdsForStatusFilter();

  // Filter functions (macroprocesos, procesos, subprocesos)
  const filteredProcesses = processes.filter(process => {
    if (ownerFilter !== "all" && process.ownerId !== ownerFilter) {
      return false;
    }
    return true;
  });

  const filteredSubprocesos = subprocesos.filter(subproc => {
    if (ownerFilter !== "all" && subproc.ownerId !== ownerFilter) {
      return false;
    }
    return true;
  });

  const filteredMacroprocesos = macroprocesos.filter(macro => {
    if (ownerFilter !== "all" && macro.ownerId !== ownerFilter) {
      return false;
    }
    return true;
  });

  const filteredProcessValidationDashboard = processValidationDashboard.filter(item => {
    // Get the macroproceso to check its owner
    const macroproceso = macroprocesos.find(m => m.id === item.macroprocesoId);
    if (!macroproceso) return false;

    if (ownerFilter !== "all" && macroproceso.ownerId !== ownerFilter) {
      return false;
    }
    return true;
  });

  // Sort function for controls
  const sortControls = (controls: any[]) => {
    if (!sortField || !['code', 'control', 'responsible', 'validatedAt'].includes(sortField)) return controls;

    return [...controls].sort((a, b) => {
      let aVal: any = "";
      let bVal: any = "";

      if (sortField === "code") {
        aVal = a.code || "";
        bVal = b.code || "";
      } else if (sortField === "control") {
        aVal = a.name || "";
        bVal = b.name || "";
      } else if (sortField === "responsible") {
        aVal = a.owner?.name || "";
        bVal = b.owner?.name || "";
      } else if (sortField === "validatedAt") {
        aVal = a.validatedAt ? new Date(a.validatedAt).getTime() : 0;
        bVal = b.validatedAt ? new Date(b.validatedAt).getTime() : 0;
      }

      // For dates, use numeric comparison; for strings, use lowercase comparison
      if (sortField === "validatedAt") {
        if (sortDirection === "asc") {
          return aVal - bVal;
        } else {
          return bVal - aVal;
        }
      } else {
        // Convert to lowercase for case-insensitive sorting
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();

        if (sortDirection === "asc") {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      }
    });
  };

  // Helper function to check if a control matches the risk level filter
  const matchesRiskLevelFilter = (control: any) => {
    if (riskLevelFilter === "all") return true;
    if (!control.associatedRisks || control.associatedRisks.length === 0) return false;

    // A control matches if at least one of its associated risks matches the selected level
    return control.associatedRisks.some((risk: any) => {
      const riskValue = risk.residualRisk ?? risk.inherentRisk;
      if (riskValue === null || riskValue === undefined) return false;

      const riskLevelText = getRiskLevelText(riskValue);
      // Case-insensitive comparison (header sends "bajo", "medio", "alto", "crítico")
      return riskLevelText.toLowerCase() === riskLevelFilter.toLowerCase();
    });
  };

  // Filter functions for controls
  // Controls have processOwner relationship through controlOwners table (backend includes this via JOIN)
  const filteredNotifiedControls = sortControls(notifiedControls.filter((control: any) => {
    if (ownerFilter !== "all" && control.owner?.id !== ownerFilter) {
      return false;
    }
    if (!matchesRiskLevelFilter(control)) {
      return false;
    }
    return true;
  }));

  const filteredNotNotifiedControls = sortControls(notNotifiedControls.filter((control: any) => {
    if (ownerFilter !== "all" && control.owner?.id !== ownerFilter) {
      return false;
    }
    if (!matchesRiskLevelFilter(control)) {
      return false;
    }
    return true;
  }));

  const filteredValidatedControls = sortControls(validatedControls.filter((control: any) => {
    if (ownerFilter !== "all" && control.owner?.id !== ownerFilter) {
      return false;
    }
    if (!matchesRiskLevelFilter(control)) {
      return false;
    }
    return true;
  }));

  const filteredObservedControls = sortControls(observedControls.filter((control: any) => {
    if (ownerFilter !== "all" && control.owner?.id !== ownerFilter) {
      return false;
    }
    if (!matchesRiskLevelFilter(control)) {
      return false;
    }
    return true;
  }));

  const filteredRejectedControls = sortControls(rejectedControls.filter((control: any) => {
    if (ownerFilter !== "all" && control.owner?.id !== ownerFilter) {
      return false;
    }
    if (!matchesRiskLevelFilter(control)) {
      return false;
    }
    return true;
  }));

  // Sort function for action plans
  const sortActionPlans = (plans: any[]) => {
    if (!sortField) return plans;

    return [...plans].sort((a, b) => {
      let aVal = sortField === "code" ? (a.code || "") : (a.responsible || "");
      let bVal = sortField === "code" ? (b.code || "") : (b.responsible || "");

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

  // Filter functions for action plans
  const filteredPendingActionPlans = sortActionPlans(pendingActionPlans.filter(plan => {
    if (ownerFilter !== "all" && ownerName && plan.responsible !== ownerName) {
      return false;
    }
    return true;
  }));

  const filteredNotifiedActionPlans = notifiedActionPlans.filter(plan => {
    if (ownerFilter !== "all" && ownerName && plan.responsible !== ownerName) {
      return false;
    }
    return true;
  });

  const filteredNotNotifiedActionPlans = notNotifiedActionPlans.filter(plan => {
    if (ownerFilter !== "all" && ownerName && plan.responsible !== ownerName) {
      return false;
    }
    return true;
  });

  const filteredValidatedActionPlans = validatedActionPlans.filter(plan => {
    if (ownerFilter !== "all" && ownerName && plan.responsible !== ownerName) {
      return false;
    }
    return true;
  });

  const filteredRejectedActionPlans = rejectedActionPlans.filter(plan => {
    if (ownerFilter !== "all" && ownerName && plan.responsible !== ownerName) {
      return false;
    }
    return true;
  });

  const filteredObservedActionPlans = observedActionPlans.filter(plan => {
    if (ownerFilter !== "all" && ownerName && plan.responsible !== ownerName) {
      return false;
    }
    return true;
  });

  const getRiskLevelColor = (inherentRisk: number) => {
    const level = getRiskLevel(inherentRisk);
    switch (level) {
      case 1: return "bg-green-100 text-green-800";
      case 2: return "bg-yellow-100 text-yellow-800";
      case 3: return "bg-orange-100 text-orange-800";
      case 4: return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getValidationStatusIcon = (status: string) => {
    switch (status) {
      case "pending_validation":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "validated":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "observed":
        return <Eye className="h-4 w-4 text-blue-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getControlTypeColor = (type: string) => {
    switch (type) {
      case "preventive": return "bg-blue-100 text-blue-800";
      case "detective": return "bg-yellow-100 text-yellow-800";
      case "corrective": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getControlTypeText = (type: string) => {
    switch (type) {
      case "preventive": return "PREVENTIVO";
      case "detective": return "DETECTIVO";
      case "corrective": return "CORRECTIVO";
      default: return type.toUpperCase();
    }
  };

  const getActionPlanStatusText = (status: string) => {
    switch (status) {
      case "pending": return "Pendiente";
      case "in_progress": return "En Progreso";
      case "evidence_submitted": return "Evidencia Enviada";
      case "under_review": return "En Revisión";
      case "completed": return "Completado";
      case "audited": return "Auditado";
      case "overdue": return "Vencido";
      case "closed": return "Cerrado";
      case "deleted": return "Eliminado";
      case "active": return "Activo";
      case "approved": return "Aprobado";
      default: return status;
    }
  };

  const ControlCard = ({ control, showCheckbox = false }: { control: Control, showCheckbox?: boolean }) => (
    <Card key={control.id} className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          {showCheckbox && (
            <Checkbox
              checked={selectedControls.includes(control.id)}
              onCheckedChange={(checked) => handleSelectControl(control.id, checked as boolean)}
              data-testid={`checkbox-control-${control.id}`}
            />
          )}
          <Badge variant="outline" className="font-mono">
            {control.code}
          </Badge>
          <Badge className={getControlTypeColor(control.type)}>
            {getControlTypeText(control.type)}
          </Badge>
          <Badge variant="secondary">
            {control.effectiveness}% Efectivo
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          {getValidationStatusIcon(control.validationStatus)}
          {control.validationStatus === "pending_validation" && (
            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={() => handleValidateControl(control, "validated")}
                className="bg-green-600 hover:bg-green-700"
                data-testid={`button-approve-control-${control.id}`}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Aprobar
              </Button>
              <Button
                size="sm"
                onClick={() => handleValidateControl(control, "observed")}
                className="bg-orange-600 hover:bg-orange-700"
                data-testid={`button-observe-control-${control.id}`}
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                Observar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleValidateControl(control, "rejected")}
                data-testid={`button-reject-control-${control.id}`}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Rechazar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSendControlEmailValidation(control.id)}
                disabled={sendEmailValidationMutation.isPending}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                data-testid={`button-email-control-${control.id}`}
              >
                <Send className="h-4 w-4 mr-1" />
                Enviar por Email
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg" data-testid={`text-control-name-${control.id}`}>
              {control.name}
            </h3>
            <p className="text-sm text-muted-foreground" data-testid={`text-control-description-${control.id}`}>
              {control.description}
            </p>
          </div>

          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-muted-foreground">Frecuencia:</span>
              <span data-testid={`text-control-frequency-${control.id}`}>
                {control.frequency}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <User className="h-4 w-4" />
              <span className="text-muted-foreground">Activo:</span>
              <span className={control.isActive ? "text-green-600" : "text-red-600"}>
                {control.isActive ? "Sí" : "No"}
              </span>
            </div>
          </div>

          {control.evidence && (
            <div className="text-sm">
              <span className="text-muted-foreground">Evidencia:</span>
              <p className="text-gray-700 mt-1">{control.evidence}</p>
            </div>
          )}

          {control.validationStatus !== "pending_validation" && (
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-muted-foreground">Estado:</span>
                  <Badge className={
                    control.validationStatus === "validated"
                      ? "bg-green-100 text-green-800"
                      : control.validationStatus === "observed"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-red-100 text-red-800"
                  }>
                    {control.validationStatus === "validated" ? "Aprobado" : control.validationStatus === "observed" ? "Observado" : "Rechazado"}
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground" data-testid={`text-control-validated-date-${control.id}`}>
                  {control.validatedAt ? new Date(control.validatedAt).toLocaleDateString() : "N/A"}
                </span>
              </div>
              {control.validationComments && (
                <div className="mt-2">
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground mb-1">
                    <FileText className="h-3 w-3" />
                    <span>Comentarios:</span>
                  </div>
                  <p className="text-sm bg-gray-50 p-2 rounded" data-testid={`text-control-validation-comments-${control.id}`}>
                    {control.validationComments}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // FIXED: Add skeleton loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
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

  return (
    <div className="container mx-auto p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="inline-flex w-full md:grid md:grid-cols-3 overflow-x-auto justify-start md:justify-center">
          <TabsTrigger value="risks" data-testid="tab-risk-validation" className="flex-shrink-0">
            Riesgos
          </TabsTrigger>
          <TabsTrigger value="controls" data-testid="tab-control-validation" className="flex-shrink-0">
            Controles
          </TabsTrigger>
          <TabsTrigger value="action-plans" data-testid="tab-action-plans" className="flex-shrink-0">
            Planes de Acción
          </TabsTrigger>
        </TabsList>

        <TabsContent value="risks">
          {/* Process Filter Indicator */}
          {selectedProcessId && (
            <div className="mb-4">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <FileText className="h-3 w-3 mr-1" />
                Filtrando por proceso
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 h-4 w-4 p-0 hover:bg-blue-100"
                  onClick={() => {
                    setSelectedProcessId(null);
                    toast({
                      title: "Filtro removido",
                      description: "Mostrando todos los riesgos",
                    });
                  }}
                  data-testid="button-clear-process-filter"
                >
                  <XCircle className="h-3 w-3" />
                </Button>
              </Badge>
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-6 gap-4 mb-8">
            <Card
              className={`cursor-pointer hover:shadow-md transition-all ${statusFilter === "notified" ? "border-2 border-blue-500 bg-blue-50 dark:bg-blue-950 shadow-lg" : ""}`}
              onClick={() => setStatusFilter("notified")}
              data-testid="card-filter-notified"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Notificados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-1" data-testid="stat-notified-risks">
                  {validationCounts?.risks.notified ?? notifiedRisksPaginationInfo?.total ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">Pendiente Respuesta</p>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer hover:shadow-md transition-all ${statusFilter === "not_notified" ? "border-2 border-blue-500 bg-blue-50 dark:bg-blue-950 shadow-lg" : ""}`}
              onClick={() => setStatusFilter("not_notified")}
              data-testid="card-filter-not-notified"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sin Notificar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-1" data-testid="stat-not-notified-risks">
                  {notNotifiedRisksPaginationInfo?.total ?? validationCounts?.risks.notNotified ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">Por Enviar</p>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer hover:shadow-md transition-all ${statusFilter === "validated" ? "border-2 border-green-500 bg-green-50 dark:bg-green-950 shadow-lg" : ""}`}
              onClick={() => {
                handleStatusFilterChange("validated");
                // Scroll automático a la sección de riesgos aprobados después de que se renderice
                setTimeout(() => {
                  validatedRisksSectionRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                  });
                }, 200);
              }}
              data-testid="card-filter-validated"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aprobados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="stat-approved-risks">
                  {Math.max(validationCounts?.risks.validated ?? 0, Array.isArray(validatedRiskProcessLinks) ? validatedRiskProcessLinks.length : 0)}
                </div>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer hover:shadow-md transition-all ${statusFilter === "observed" ? "border-2 border-orange-500 bg-orange-50 dark:bg-orange-950 shadow-lg" : ""}`}
              onClick={() => setStatusFilter("observed")}
              data-testid="card-filter-observed"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Observados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="stat-observed-risks">
                  {validationCounts?.risks.observed ?? filteredObservedRiskProcessLinks.length}
                </div>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer hover:shadow-md transition-all ${statusFilter === "rejected" ? "border-2 border-red-500 bg-red-50 dark:bg-red-950 shadow-lg" : ""}`}
              onClick={() => setStatusFilter("rejected")}
              data-testid="card-filter-rejected"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rechazados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="stat-rejected-risks">
                  {validationCounts?.risks.rejected ?? filteredRejectedRiskProcessLinks.length}
                </div>
              </CardContent>
            </Card>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card
                    className={`cursor-pointer hover:shadow-md transition-all ${statusFilter === "all" ? "border-2 border-gray-500 bg-gray-50 dark:bg-gray-900 shadow-lg" : ""}`}
                    onClick={() => setStatusFilter("all")}
                    data-testid="card-filter-total"
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total</CardTitle>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold" data-testid="stat-total-risks">
                        {/* Use total from backend API - it's calculated as COUNT(*) to ensure accuracy */}
                        {validationCounts?.risks.total ?? 0}
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    Un mismo riesgo puede aparecer en múltiples filas si está asociado a diferentes procesos o tiene distintos responsables asignados. Cada fila representa una validación independiente por responsable y proceso.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Bulk Actions for Risks */}
          {selectedRiskProcessLinks.length > 0 && (
            <div className="flex items-center space-x-2 mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-sm font-medium text-blue-900">
                {selectedRiskProcessLinks.length} riesgo(s) seleccionado(s)
              </span>
              <div className="flex-1" />
              <Button
                size="sm"
                onClick={() => openBulkActionConfirm("validated", "risks")}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-bulk-approve-risks"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Aprobar Seleccionados
              </Button>
              <Button
                size="sm"
                onClick={() => openBulkActionConfirm("observed", "risks")}
                className="bg-orange-600 hover:bg-orange-700"
                data-testid="button-bulk-observe-risks"
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                Observar Seleccionados
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => openBulkActionConfirm("rejected", "risks")}
                data-testid="button-bulk-reject-risks"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Rechazar Seleccionados
              </Button>
            </div>
          )}

          {/* Pending Risks */}
          <div className="space-y-8">
            {(statusFilter === "all" || statusFilter === "pending_validation") && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    <span>Riesgos Pendientes de Validación ({filteredPendingRiskProcessLinks.length})</span>
                  </h2>
                  {filteredPendingRiskProcessLinks.length > 0 && (
                    <div className="flex items-center space-x-4">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Checkbox
                                checked={filteredPendingRiskProcessLinks.every(rpl => selectedRiskProcessLinks.includes(rpl.id))}
                                onCheckedChange={(checked) => handleSelectAll(filteredPendingRiskProcessLinks, checked as boolean)}
                                data-testid="checkbox-select-all-pending"
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Seleccionar todos</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {(selectedRiskProcessLinks.length > 0 || selectedControls.length > 0) && (
                        <Button
                          variant="outline"
                          onClick={handleSendBulkEmailValidation}
                          disabled={sendBulkRiskEmailsMutation.isPending || sendBulkControlEmailsMutation.isPending}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                          data-testid="button-bulk-email"
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          {(sendBulkRiskEmailsMutation.isPending || sendBulkControlEmailsMutation.isPending) ? 'Enviando...' : `Enviar por Email Seleccionados (${selectedRiskProcessLinks.length + selectedControls.length})`}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {filteredPendingRiskProcessLinks.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="w-12 px-2 py-3 text-left">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <Checkbox
                                        checked={filteredPendingRiskProcessLinks.every(rpl => selectedRiskProcessLinks.includes(rpl.id))}
                                        onCheckedChange={(checked) => handleSelectAll(filteredPendingRiskProcessLinks, checked as boolean)}
                                        data-testid="checkbox-select-all-pending-table"
                                      />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>Seleccionar todos</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                              <button
                                onClick={() => handleSort("code")}
                                className="flex items-center space-x-1 hover:text-primary transition-colors"
                                data-testid="sort-code-button"
                              >
                                <span>Código</span>
                                {sortField === "code" && (
                                  sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                )}
                              </button>
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Nombre</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                              <button
                                onClick={() => handleSort("process")}
                                className="flex items-center space-x-1 hover:text-primary transition-colors"
                                data-testid="sort-process-button"
                              >
                                <span>Proceso</span>
                                {sortField === "process" && (
                                  sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                )}
                              </button>
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                              <button
                                onClick={() => handleSort("responsible")}
                                className="flex items-center space-x-1 hover:text-primary transition-colors"
                                data-testid="sort-responsible-button"
                              >
                                <span>Responsable</span>
                                {sortField === "responsible" && (
                                  sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                )}
                              </button>
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Nivel Residual</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPendingRiskProcessLinks.map((rpl) => (
                            rpl.risk && (
                              <tr key={rpl.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`row-pending-risk-${rpl.risk.id}`}>
                                <td className="w-12 px-2 py-3">
                                  <Checkbox
                                    checked={selectedRiskProcessLinks.includes(rpl.id)}
                                    onCheckedChange={(checked) => handleSelectRiskProcessLink(rpl.id, checked as boolean)}
                                    data-testid={`checkbox-pending-risk-${rpl.risk.id}`}
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => setViewingRisk(rpl.risk)}
                                    className="font-medium text-sm text-primary hover:underline cursor-pointer"
                                    data-testid={`button-view-risk-${rpl.risk.id}`}
                                  >
                                    {rpl.risk.code || "N/A"}
                                  </button>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-sm">{rpl.risk.name}</div>
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {rpl.macroproceso?.name || rpl.process?.name || rpl.subproceso?.name || "N/A"}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {rpl.responsibleUser?.fullName || rpl.risk.processOwner || "N/A"}
                                </td>
                                <td className="px-4 py-3">
                                  <Badge className={getRiskLevelColor(rpl.risk.residualRisk || rpl.risk.inherentRisk)}>
                                    {getRiskLevelText(rpl.risk.residualRisk || rpl.risk.inherentRisk)}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-end space-x-1">
                                    <Button
                                      size="sm"
                                      onClick={() => handleValidate(rpl.risk, "validated")}
                                      className="bg-green-600 hover:bg-green-700"
                                      data-testid={`button-approve-risk-${rpl.risk.id}`}
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleValidate(rpl.risk, "observed")}
                                      className="bg-orange-600 hover:bg-orange-700"
                                      data-testid={`button-observe-risk-${rpl.risk.id}`}
                                    >
                                      <AlertCircle className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleValidate(rpl.risk, "rejected")}
                                      data-testid={`button-reject-risk-${rpl.risk.id}`}
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedHistoryRiskProcessLink({
                                          id: rpl.id,
                                          riskCode: rpl.risk.code,
                                          riskName: rpl.risk.name
                                        });
                                        setHistoryModalOpen(true);
                                      }}
                                      data-testid={`button-history-risk-${rpl.risk.id}`}
                                      title="Ver historial de validaciones"
                                    >
                                      <History className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            )
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="mx-auto h-12 w-12 mb-4" />
                    <p>No hay riesgos pendientes de validación</p>
                    {selectedProcessId && (
                      <p className="text-sm mt-2">Mostrando riesgos para: {processes.find(p => p.id === selectedProcessId)?.name || subprocesos.find(s => s.id === selectedProcessId)?.name || macroprocesos.find(m => m.id === selectedProcessId)?.name}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Validated Risks */}
            {/* CRITICAL: Always show validated risks section when statusFilter is "all" or "validated" */}
            {(statusFilter === "all" || statusFilter === "validated") && (
                <div ref={validatedRisksSectionRef} id="validated-risks-section" data-testid="validated-risks-section">
                  <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Riesgos Aprobados ({filteredValidatedRiskProcessLinks.length} de {Array.isArray(validatedRiskProcessLinks) ? validatedRiskProcessLinks.length : 0})</span>
                  </h2>
                  {/* CRITICAL: Show table even if filtered list is empty, but show message if no data matches filters */}
                  {filteredValidatedRiskProcessLinks.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Código</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Nombre</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Proceso</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Responsable</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Nivel Residual</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Fecha Validación</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Comentarios</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredValidatedRiskProcessLinks.map((rpl) => {
                              // Skip invalid entries
                              if (!rpl || (!rpl.risk && !rpl.riskId)) return null;

                              // Create minimal risk object if missing
                              const risk = rpl.risk || {
                                id: rpl.riskId,
                                code: (rpl as any).riskCode || 'N/A',
                                name: (rpl as any).riskName || 'Sin nombre',
                                status: (rpl as any).riskStatus || 'active',
                                inherentRisk: (rpl as any).riskInherentRisk ?? null,
                                residualRisk: (rpl as any).riskResidualRisk ?? null,
                                processOwner: (rpl as any).riskProcessOwner ?? null
                              };

                              return (
                                <tr key={rpl.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`row-validated-risk-${risk.id}`}>
                                  <td className="px-4 py-3">
                                    <button
                                      onClick={() => setViewingRisk(risk)}
                                      className="font-medium text-sm text-primary hover:underline cursor-pointer"
                                      data-testid={`button-view-validated-risk-${risk.id}`}
                                    >
                                      {risk.code || "N/A"}
                                    </button>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="font-medium text-sm">{risk.name}</div>
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    {rpl.macroproceso?.name || rpl.process?.name || rpl.subproceso?.name || "N/A"}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    {rpl.responsibleUser?.fullName || risk.processOwner || "N/A"}
                                  </td>
                                  <td className="px-4 py-3">
                                    <Badge className={getRiskLevelColor(risk.residualRisk || risk.inherentRisk)}>
                                      {getRiskLevelText(risk.residualRisk || risk.inherentRisk)}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    {rpl.validatedAt ? new Date(rpl.validatedAt).toLocaleDateString() : "N/A"}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    {rpl.validationComments || "-"}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center justify-end">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedHistoryRiskProcessLink({
                                            id: rpl.id,
                                            riskCode: risk.code,
                                            riskName: risk.name
                                          });
                                          setHistoryModalOpen(true);
                                        }}
                                        data-testid={`button-history-validated-risk-${risk.id}`}
                                        title="Ver historial de validaciones"
                                      >
                                        <History className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-8 text-center text-gray-500 dark:text-gray-400">
                      {(() => {
                        const validatedArray = Array.isArray(validatedRiskProcessLinks) ? validatedRiskProcessLinks : [];
                        const validationCount = validationCounts?.risks.validated ?? 0;
                        
                        // Si hay un error en la query, mostrar mensaje de error
                        if (validatedError) {
                          return (
                            <div>
                              <AlertCircle className="mx-auto h-12 w-12 mb-4 text-red-400" />
                              <p className="text-lg font-medium mb-2">Error al cargar riesgos aprobados</p>
                              <p className="text-sm text-muted-foreground">
                                Intenta recargar la página o contacta al administrador.
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-4"
                                onClick={() => refetchValidated()}
                              >
                                Reintentar
                              </Button>
                            </div>
                          );
                        }
                        
                        // Si está cargando, mostrar skeleton
                        if (isValidatedLoading) {
                          return (
                            <div>
                              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto mb-4"></div>
                              <p className="text-lg font-medium mb-2">Cargando riesgos aprobados...</p>
                            </div>
                          );
                        }
                        
                        // Si no hay datos pero el contador muestra que debería haber, mostrar advertencia
                        if (validatedArray.length === 0 && validationCount > 0) {
                          return (
                            <>
                              <AlertTriangle className="mx-auto h-12 w-12 mb-4 text-yellow-400" />
                              <p className="text-lg font-medium mb-2">No se pudieron cargar los riesgos aprobados</p>
                              <p className="text-sm mt-2">
                                El sistema indica que hay <span className="font-semibold">{validationCount}</span> riesgos aprobados, 
                                pero no se pudieron cargar en el listado.
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-4"
                                onClick={() => {
                                  queryClient.invalidateQueries({ queryKey: ["/api/risk-processes/validation/validated"] });
                                  queryClient.invalidateQueries({ queryKey: ["/api/validation/counts"] });
                                  refetchValidated();
                                }}
                              >
                                Recargar datos
                              </Button>
                            </>
                          );
                        }
                        
                        // Si no hay datos y el contador también es 0, mostrar mensaje normal
                        if (validatedArray.length === 0) {
                          return (
                            <div>
                              <CheckCircle className="mx-auto h-12 w-12 mb-4 text-gray-400" />
                              <p className="text-lg font-medium mb-2">No hay riesgos aprobados en el sistema.</p>
                            </div>
                          );
                        }
                        
                        // Si hay datos pero el filtro los eliminó todos
                        return (
                          <>
                            <CheckCircle className="mx-auto h-12 w-12 mb-4 text-gray-400" />
                            <p className="text-lg font-medium mb-2">No hay riesgos aprobados que coincidan con los filtros seleccionados.</p>
                            <p className="text-sm mt-2">
                              Total de riesgos aprobados: <span className="font-semibold">{validatedArray.length}</span>
                            </p>
                            {(ownerFilter !== "all" || riskLevelFilter !== "all" || selectedProcessId) && (
                              <div className="mt-4">
                                <p className="text-sm text-muted-foreground mb-2">Filtros activos:</p>
                                <div className="flex flex-wrap gap-2 justify-center">
                                  {ownerFilter !== "all" && (
                                    <Badge variant="secondary">Responsable: {processOwners.find(o => o.id === ownerFilter)?.name || ownerFilter}</Badge>
                                  )}
                                  {riskLevelFilter !== "all" && (
                                    <Badge variant="secondary">Nivel: {riskLevelFilter}</Badge>
                                  )}
                                  {selectedProcessId && (
                                    <Badge variant="secondary">
                                      Proceso: {processes.find(p => p.id === selectedProcessId)?.name || 
                                               subprocesos.find(s => s.id === selectedProcessId)?.name || 
                                               macroprocesos.find(m => m.id === selectedProcessId)?.name || 
                                               selectedProcessId}
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mt-4"
                                  onClick={() => {
                                    setOwnerFilter("all");
                                    setRiskLevelFilter("all");
                                    setSelectedProcessId(null);
                                  }}
                                >
                                  Limpiar Filtros
                                </Button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

            {/* Observed Risks */}
            {(statusFilter === "all" || statusFilter === "observed") && filteredObservedRiskProcessLinks.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  <span>Riesgos Observados ({filteredObservedRiskProcessLinks.length})</span>
                </h2>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Código</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Nombre</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Proceso</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Responsable</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Nivel Residual</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Fecha Observación</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Comentarios</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredObservedRiskProcessLinks.map((rpl) => (
                          rpl.risk && (
                            <tr key={rpl.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`row-observed-risk-${rpl.risk.id}`}>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => setViewingRisk(rpl.risk)}
                                  className="font-medium text-sm text-primary hover:underline cursor-pointer"
                                  data-testid={`button-view-observed-risk-${rpl.risk.id}`}
                                >
                                  {rpl.risk.code || "N/A"}
                                </button>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-sm">{rpl.risk.name}</div>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {rpl.macroproceso?.name || rpl.process?.name || rpl.subproceso?.name || "N/A"}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {rpl.responsibleUser?.fullName || rpl.risk.processOwner || "N/A"}
                              </td>
                              <td className="px-4 py-3">
                                <Badge className={getRiskLevelColor(rpl.risk.residualRisk || rpl.risk.inherentRisk)}>
                                  {getRiskLevelText(rpl.risk.residualRisk || rpl.risk.inherentRisk)}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {rpl.validatedAt ? new Date(rpl.validatedAt).toLocaleDateString() : "N/A"}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {rpl.validationComments || "-"}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end space-x-1">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => resendRiskProcessLinkEmailMutation.mutate(rpl.id)}
                                          disabled={resendRiskProcessLinkEmailMutation.isPending}
                                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                                          data-testid={`button-resend-observed-risk-${rpl.risk.id}`}
                                        >
                                          <Mail className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Reenviar email de validación</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedHistoryRiskProcessLink({
                                        id: rpl.id,
                                        riskCode: rpl.risk.code,
                                        riskName: rpl.risk.name
                                      });
                                      setHistoryModalOpen(true);
                                    }}
                                    data-testid={`button-history-observed-risk-${rpl.risk.id}`}
                                    title="Ver historial de validaciones"
                                  >
                                    <History className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Rejected Risks */}
            {(statusFilter === "all" || statusFilter === "rejected") && filteredRejectedRiskProcessLinks.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span>Riesgos Rechazados ({filteredRejectedRiskProcessLinks.length})</span>
                </h2>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Código</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Nombre</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Proceso</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Responsable</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Nivel Residual</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Fecha Rechazo</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Comentarios</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRejectedRiskProcessLinks.map((rpl) => (
                          rpl.risk && (
                            <tr key={rpl.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`row-rejected-risk-${rpl.risk.id}`}>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => setViewingRisk(rpl.risk)}
                                  className="font-medium text-sm text-primary hover:underline cursor-pointer"
                                  data-testid={`button-view-rejected-risk-${rpl.risk.id}`}
                                >
                                  {rpl.risk.code || "N/A"}
                                </button>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-sm">{rpl.risk.name}</div>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {rpl.macroproceso?.name || rpl.process?.name || rpl.subproceso?.name || "N/A"}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {rpl.responsibleUser?.fullName || rpl.risk.processOwner || "N/A"}
                              </td>
                              <td className="px-4 py-3">
                                <Badge className={getRiskLevelColor(rpl.risk.residualRisk || rpl.risk.inherentRisk)}>
                                  {getRiskLevelText(rpl.risk.residualRisk || rpl.risk.inherentRisk)}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {rpl.validatedAt ? new Date(rpl.validatedAt).toLocaleDateString() : "N/A"}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {rpl.validationComments || "-"}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end space-x-1">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => resendRiskProcessLinkEmailMutation.mutate(rpl.id)}
                                          disabled={resendRiskProcessLinkEmailMutation.isPending}
                                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                                          data-testid={`button-resend-rejected-risk-${rpl.risk.id}`}
                                        >
                                          <Mail className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Reenviar email de validación</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedHistoryRiskProcessLink({
                                        id: rpl.id,
                                        riskCode: rpl.risk.code,
                                        riskName: rpl.risk.name
                                      });
                                      setHistoryModalOpen(true);
                                    }}
                                    data-testid={`button-history-rejected-risk-${rpl.risk.id}`}
                                    title="Ver historial de validaciones"
                                  >
                                    <History className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Notified Risks */}
            {(statusFilter === "all" || statusFilter === "notified") && filteredNotifiedRiskProcessLinks.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                  <Mail className="h-5 w-5 text-blue-500" />
                  <span>Riesgos Notificados - Pendiente Validación ({notifiedRisksPaginationInfo?.total || filteredNotifiedRiskProcessLinks.length})</span>
                </h2>
                <SelectAllBanner
                  selectedCount={notifiedRisksPagination.selectedIds.size}
                  totalCount={notifiedRisksPaginationInfo?.total || 0}
                  pageSize={notifiedRisksPagination.pageSize}
                  totalItems={notifiedRisksPaginationInfo?.total || filteredNotifiedRiskProcessLinks.length}
                  currentPage={notifiedRisksPagination.currentPage}
                  onSelectAll={() => {
                    if (notifiedRisksPaginationInfo?.total) {
                      notifiedRisksPagination.handleSelectAll(
                        Array.from({ length: notifiedRisksPaginationInfo.total }, (_, i) => ({ id: String(i) })) as any[],
                        () => String(Math.random())
                      );
                    }
                  }}
                  onClearAll={notifiedRisksPagination.handleClearAll}
                  itemName="riesgos notificados"
                />
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="w-12 px-2 py-3">
                            <Checkbox
                              checked={filteredNotifiedRiskProcessLinks.length > 0 && filteredNotifiedRiskProcessLinks.every((rpl: any) => notifiedRisksPagination.selectedIds.has(rpl.id))}
                              onCheckedChange={(checked) => notifiedRisksPagination.handleSelectPage(filteredNotifiedRiskProcessLinks, (rpl: any) => rpl.id, checked as boolean)}
                              data-testid="checkbox-select-all-notified-risks"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Código</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Nombre</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Proceso</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Responsable</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Nivel Residual</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredNotifiedRiskProcessLinks.map((rpl) => (
                          rpl.risk && (
                            <tr key={rpl.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`row-notified-risk-${rpl.risk.id}`}>
                              <td className="w-12 px-2 py-3">
                                <Checkbox
                                  checked={notifiedRisksPagination.selectedIds.has(rpl.id)}
                                  onCheckedChange={() => notifiedRisksPagination.handleSelectItem(rpl.id)}
                                  data-testid={`checkbox-notified-risk-${rpl.risk.id}`}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => setViewingRisk(rpl.risk)}
                                  className="font-medium text-sm text-primary hover:underline cursor-pointer"
                                  data-testid={`button-view-notified-risk-${rpl.risk.id}`}
                                >
                                  {rpl.risk.code || "N/A"}
                                </button>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-sm">{rpl.risk.name}</div>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {rpl.macroproceso?.name || rpl.process?.name || rpl.subproceso?.name || "N/A"}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {rpl.responsibleUser?.fullName || rpl.risk.processOwner || "N/A"}
                              </td>
                              <td className="px-4 py-3">
                                <Badge className={getRiskLevelColor(rpl.risk.residualRisk || rpl.risk.inherentRisk)}>
                                  {getRiskLevelText(rpl.risk.residualRisk || rpl.risk.inherentRisk)}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end space-x-1">
                                  <Button
                                    size="sm"
                                    onClick={() => handleValidate(rpl.risk, "validated")}
                                    className="bg-green-600 hover:bg-green-700"
                                    data-testid={`button-approve-notified-risk-${rpl.risk.id}`}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleValidate(rpl.risk, "observed")}
                                    className="bg-orange-600 hover:bg-orange-700"
                                    data-testid={`button-observe-notified-risk-${rpl.risk.id}`}
                                  >
                                    <AlertCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleValidate(rpl.risk, "rejected")}
                                    data-testid={`button-reject-notified-risk-${rpl.risk.id}`}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => resendRiskProcessLinkEmailMutation.mutate(rpl.id)}
                                          disabled={resendRiskProcessLinkEmailMutation.isPending}
                                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                                          data-testid={`button-resend-notified-risk-${rpl.risk.id}`}
                                        >
                                          <Mail className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Reenviar email de validación</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedHistoryRiskProcessLink({
                                        id: rpl.id,
                                        riskCode: rpl.risk.code,
                                        riskName: rpl.risk.name
                                      });
                                      setHistoryModalOpen(true);
                                    }}
                                    data-testid={`button-history-notified-risk-${rpl.risk.id}`}
                                    title="Ver historial de validaciones"
                                  >
                                    <History className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-4">
                    <PaginationControls
                      currentPage={notifiedRisksPagination.currentPage}
                      totalItems={notifiedRisksPaginationInfo?.total || filteredNotifiedRiskProcessLinks.length}
                      pageSize={notifiedRisksPagination.pageSize}
                      onPageChange={notifiedRisksPagination.handlePageChange}
                      itemName="riesgos notificados"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Not Notified Risks */}
            {(statusFilter === "all" || statusFilter === "not_notified") && filteredNotNotifiedRiskProcessLinks.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                  <Bell className="h-5 w-5 text-blue-500" />
                  <span>Riesgos Sin Notificar ({notNotifiedRisksPaginationInfo?.total || filteredNotNotifiedRiskProcessLinks.length})</span>
                </h2>
                {notNotifiedRisksPagination.selectedIds.size > 0 && (
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={handleSendBulkRiskEmailValidation}
                      disabled={sendBulkRiskEmailsMutation.isPending}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                      data-testid="button-bulk-email-not-notified-risks"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {sendBulkRiskEmailsMutation.isPending ? 'Enviando...' : `Enviar por Email Seleccionados (${notNotifiedRisksPagination.selectedIds.size})`}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => openBulkActionConfirm("validated", "risks")}
                      className="bg-green-600 hover:bg-green-700"
                      data-testid="button-bulk-approve-not-notified-risks"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Aprobar Seleccionados ({notNotifiedRisksPagination.selectedIds.size})
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => openBulkActionConfirm("observed", "risks")}
                      className="bg-orange-600 hover:bg-orange-700"
                      data-testid="button-bulk-observe-not-notified-risks"
                    >
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Observar Seleccionados
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => openBulkActionConfirm("rejected", "risks")}
                      data-testid="button-bulk-reject-not-notified-risks"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Rechazar Seleccionados
                    </Button>
                  </div>
                )}
                <SelectAllBanner
                  selectedCount={notNotifiedRisksPagination.selectedIds.size}
                  totalCount={notNotifiedRisksPaginationInfo?.total || 0}
                  pageSize={notNotifiedRisksPagination.pageSize}
                  totalItems={notNotifiedRisksPaginationInfo?.total || filteredNotNotifiedRiskProcessLinks.length}
                  currentPage={notNotifiedRisksPagination.currentPage}
                  onSelectAll={() => {
                    if (notNotifiedRisksPaginationInfo?.total) {
                      notNotifiedRisksPagination.handleSelectAll(
                        Array.from({ length: notNotifiedRisksPaginationInfo.total }, (_, i) => ({ id: String(i) })) as any[],
                        () => String(Math.random())
                      );
                    }
                  }}
                  onClearAll={notNotifiedRisksPagination.handleClearAll}
                  itemName="riesgos sin notificar"
                />
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="w-12 px-2 py-3">
                            <Checkbox
                              checked={filteredNotNotifiedRiskProcessLinks.length > 0 && filteredNotNotifiedRiskProcessLinks.every((rpl: any) => notNotifiedRisksPagination.selectedIds.has(rpl.id))}
                              onCheckedChange={(checked) => notNotifiedRisksPagination.handleSelectPage(filteredNotNotifiedRiskProcessLinks, (rpl: any) => rpl.id, checked as boolean)}
                              data-testid="checkbox-select-all-not-notified-risks"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Código</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Nombre</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Proceso</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Responsable</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Nivel Residual</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredNotNotifiedRiskProcessLinks.map((rpl) => (
                          rpl.risk && (
                            <tr key={rpl.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`row-not-notified-risk-${rpl.risk.id}`}>
                              <td className="w-12 px-2 py-3">
                                <Checkbox
                                  checked={notNotifiedRisksPagination.selectedIds.has(rpl.id)}
                                  onCheckedChange={() => notNotifiedRisksPagination.handleSelectItem(rpl.id)}
                                  data-testid={`checkbox-not-notified-risk-${rpl.risk.id}`}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => setViewingRisk(rpl.risk)}
                                  className="font-medium text-sm text-primary hover:underline cursor-pointer"
                                  data-testid={`button-view-not-notified-risk-${rpl.risk.id}`}
                                >
                                  {rpl.risk.code || "N/A"}
                                </button>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-sm">{rpl.risk.name}</div>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {rpl.macroproceso?.name || rpl.process?.name || rpl.subproceso?.name || "N/A"}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {rpl.responsibleUser?.fullName || rpl.risk.processOwner || "N/A"}
                              </td>
                              <td className="px-4 py-3">
                                <Badge className={getRiskLevelColor(rpl.risk.residualRisk || rpl.risk.inherentRisk)}>
                                  {getRiskLevelText(rpl.risk.residualRisk || rpl.risk.inherentRisk)}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end space-x-1">
                                  <Button
                                    size="sm"
                                    onClick={() => handleValidate(rpl.risk, "validated")}
                                    className="bg-green-600 hover:bg-green-700"
                                    data-testid={`button-approve-not-notified-risk-${rpl.risk.id}`}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleValidate(rpl.risk, "observed")}
                                    className="bg-orange-600 hover:bg-orange-700"
                                    data-testid={`button-observe-not-notified-risk-${rpl.risk.id}`}
                                  >
                                    <AlertCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleValidate(rpl.risk, "rejected")}
                                    data-testid={`button-reject-not-notified-risk-${rpl.risk.id}`}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedHistoryRiskProcessLink({
                                        id: rpl.id,
                                        riskCode: rpl.risk.code,
                                        riskName: rpl.risk.name
                                      });
                                      setHistoryModalOpen(true);
                                    }}
                                    data-testid={`button-history-not-notified-risk-${rpl.risk.id}`}
                                    title="Ver historial de validaciones"
                                  >
                                    <History className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-4">
                    <PaginationControls
                      currentPage={notNotifiedRisksPagination.currentPage}
                      totalItems={notNotifiedRisksPaginationInfo?.total || filteredNotNotifiedRiskProcessLinks.length}
                      pageSize={notNotifiedRisksPagination.pageSize}
                      onPageChange={notNotifiedRisksPagination.handlePageChange}
                      itemName="riesgos sin notificar"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

        </TabsContent>

        <TabsContent value="controls">
          {/* Note: Controls don't currently support process filtering */}

          {isLoadingControls ? (
            <div className="space-y-8">
              {/* Stats Skeleton */}
              <div className="grid grid-cols-6 gap-4 mb-8">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-16 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Table Skeleton */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-8 w-64" />
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <div className="p-4 space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-24 ml-auto" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Control Statistics */}
              <div className="grid grid-cols-6 gap-4 mb-8">
                <Card
                  className={`cursor-pointer hover:shadow-md transition-all ${statusFilter === "notified" ? "border-2 border-blue-500 bg-blue-50 dark:bg-blue-950 shadow-lg" : ""}`}
                  onClick={() => setStatusFilter("notified")}
                  data-testid="card-filter-control-notified"
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Notificados</CardTitle>
                    <Mail className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-control-notified">
                      {validationCounts?.controls.notified ?? notifiedControlsPaginationInfo?.total ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pendiente Respuesta
                    </p>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer hover:shadow-md transition-all ${statusFilter === "not_notified" ? "border-2 border-blue-500 bg-blue-50 dark:bg-blue-950 shadow-lg" : ""}`}
                  onClick={() => setStatusFilter("not_notified")}
                  data-testid="card-filter-control-not-notified"
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Sin Notificar</CardTitle>
                    <Clock className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-control-not-notified">
                      {validationCounts?.controls.notNotified ?? notNotifiedControlsPaginationInfo?.total ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Por Enviar
                    </p>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer hover:shadow-md transition-all ${statusFilter === "validated" ? "border-2 border-green-500 bg-green-50 dark:bg-green-950 shadow-lg" : ""}`}
                  onClick={() => setStatusFilter("validated")}
                  data-testid="card-filter-control-validated"
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Aprobados</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-control-approved">
                      {filteredValidatedControls.length}
                    </div>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer hover:shadow-md transition-all ${statusFilter === "observed" ? "border-2 border-orange-500 bg-orange-50 dark:bg-orange-950 shadow-lg" : ""}`}
                  onClick={() => setStatusFilter("observed")}
                  data-testid="card-filter-control-observed"
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Observados</CardTitle>
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-control-observed">
                      {filteredObservedControls.length}
                    </div>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer hover:shadow-md transition-all ${statusFilter === "rejected" ? "border-2 border-red-500 bg-red-50 dark:bg-red-950 shadow-lg" : ""}`}
                  onClick={() => setStatusFilter("rejected")}
                  data-testid="card-filter-control-rejected"
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Rechazados</CardTitle>
                    <XCircle className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-control-rejected">
                      {filteredRejectedControls.length}
                    </div>
                  </CardContent>
                </Card>
                <Card
                  className={`cursor-pointer hover:shadow-md transition-all ${statusFilter === "all" ? "border-2 border-gray-500 bg-gray-50 dark:bg-gray-900 shadow-lg" : ""}`}
                  onClick={() => setStatusFilter("all")}
                  data-testid="card-filter-control-total"
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total</CardTitle>
                    <FileText className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="stat-control-total">
                      {(notifiedControlsPaginationInfo?.total || 0) + (notNotifiedControlsPaginationInfo?.total || 0) + filteredValidatedControls.length + filteredObservedControls.length + filteredRejectedControls.length}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Controls Sections */}
              <div className="space-y-8">
                {/* Notified Controls */}
                {(statusFilter === "all" || statusFilter === "notified") && filteredNotifiedControls.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold flex items-center space-x-2">
                        <Mail className="h-5 w-5 text-blue-500" />
                        <span>Controles Notificados ({notifiedControlsPaginationInfo?.total || filteredNotifiedControls.length})</span>
                      </h2>
                    </div>
                    {notifiedControlsPagination.selectedIds.size > 0 && (
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => openBulkActionConfirm("validated", "controls")}
                          className="bg-green-600 hover:bg-green-700"
                          data-testid="button-bulk-approve-notified-controls"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Aprobar Seleccionados ({notifiedControlsPagination.selectedIds.size})
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openBulkActionConfirm("observed", "controls")}
                          className="bg-orange-600 hover:bg-orange-700"
                          data-testid="button-bulk-observe-notified-controls"
                        >
                          <AlertCircle className="h-4 w-4 mr-1" />
                          Observar Seleccionados
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openBulkActionConfirm("rejected", "controls")}
                          data-testid="button-bulk-reject-notified-controls"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Rechazar Seleccionados
                        </Button>
                      </div>
                    )}
                    <SelectAllBanner
                      selectedCount={notifiedControlsPagination.selectedIds.size}
                      totalCount={notifiedControlsPaginationInfo?.total || 0}
                      pageSize={notifiedControlsPagination.pageSize}
                      totalItems={notifiedControlsPaginationInfo?.total || filteredNotifiedControls.length}
                      currentPage={notifiedControlsPagination.currentPage}
                      onSelectAll={() => {
                        if (notifiedControlsPaginationInfo?.total) {
                          notifiedControlsPagination.handleSelectAll(
                            Array.from({ length: notifiedControlsPaginationInfo.total }, (_, i) => ({ id: String(i) })) as any[],
                            () => String(Math.random())
                          );
                        }
                      }}
                      onClearAll={notifiedControlsPagination.handleClearAll}
                      itemName="controles notificados"
                    />
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="w-12 px-2 py-3 text-left">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div>
                                        <Checkbox
                                          checked={filteredNotifiedControls.every(control => notifiedControlsPagination.selectedIds.has(control.id))}
                                          onCheckedChange={(checked) => notifiedControlsPagination.handleSelectPage(filteredNotifiedControls, (c: any) => c.id, checked as boolean)}
                                          data-testid="checkbox-select-all-notified-controls"
                                        />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>Seleccionar todos en esta página</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                                <button
                                  onClick={() => handleSort("code")}
                                  className="flex items-center space-x-1 hover:text-primary"
                                  data-testid="button-sort-code-control"
                                >
                                  <span>Código</span>
                                  {sortField === "code" && (
                                    sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                  )}
                                </button>
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                                <button
                                  onClick={() => handleSort("control")}
                                  className="flex items-center space-x-1 hover:text-primary"
                                  data-testid="button-sort-control"
                                >
                                  <span>Nombre</span>
                                  {sortField === "control" && (
                                    sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                  )}
                                </button>
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Tipo</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                                <button
                                  onClick={() => handleSort("responsible")}
                                  className="flex items-center space-x-1 hover:text-primary"
                                  data-testid="button-sort-responsible-control"
                                >
                                  <span>Responsable</span>
                                  {sortField === "responsible" && (
                                    sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                  )}
                                </button>
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Fecha Notificación</th>
                              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredNotifiedControls.map((control: any) => (
                              <tr key={control.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`row-notified-control-${control.id}`}>
                                <td className="w-12 px-2 py-3">
                                  <Checkbox
                                    checked={notifiedControlsPagination.selectedIds.has(control.id)}
                                    onCheckedChange={() => notifiedControlsPagination.handleSelectItem(control.id)}
                                    data-testid={`checkbox-notified-control-${control.id}`}
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => setViewingControl(control)}
                                    className="font-medium text-sm text-primary hover:underline cursor-pointer"
                                    data-testid={`button-view-control-${control.id}`}
                                  >
                                    {control.code || "N/A"}
                                  </button>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-sm">{control.name}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <Badge className={getControlTypeColor(control.type)}>
                                    {getControlTypeText(control.type)}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-sm">{control.owner?.name || "N/A"}</td>
                                <td className="px-4 py-3 text-sm">
                                  {control.notifiedAt ? new Date(control.notifiedAt).toLocaleDateString() : "N/A"}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex justify-center">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0"
                                          data-testid={`button-actions-control-${control.id}`}
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={() => handleResendControl(control)}
                                          data-testid={`button-resend-control-${control.id}`}
                                        >
                                          <Mail className="h-4 w-4 mr-2" />
                                          Reenviar a validación
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="p-4">
                        <PaginationControls
                          currentPage={notifiedControlsPagination.currentPage}
                          totalItems={notifiedControlsPaginationInfo?.total || filteredNotifiedControls.length}
                          pageSize={notifiedControlsPagination.pageSize}
                          onPageChange={notifiedControlsPagination.handlePageChange}
                          itemName="controles notificados"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Not Notified Controls */}
                {(statusFilter === "all" || statusFilter === "not_notified") && filteredNotNotifiedControls.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold flex items-center space-x-2">
                        <Clock className="h-5 w-5 text-yellow-500" />
                        <span>Controles Sin Notificar ({notNotifiedControlsPaginationInfo?.total || filteredNotNotifiedControls.length})</span>
                      </h2>
                    </div>
                    {notNotifiedControlsPagination.selectedIds.size > 0 && (
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={handleSendBulkControlEmailValidation}
                          disabled={sendBulkControlEmailsMutation.isPending}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                          data-testid="button-bulk-email-not-notified-controls"
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          {sendBulkControlEmailsMutation.isPending ? 'Enviando...' : `Enviar por Email Seleccionados (${notNotifiedControlsPagination.selectedIds.size})`}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openBulkActionConfirm("validated", "controls")}
                          className="bg-green-600 hover:bg-green-700"
                          data-testid="button-bulk-approve-controls"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Aprobar Seleccionados ({notNotifiedControlsPagination.selectedIds.size})
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openBulkActionConfirm("observed", "controls")}
                          className="bg-orange-600 hover:bg-orange-700"
                          data-testid="button-bulk-observe-controls"
                        >
                          <AlertCircle className="h-4 w-4 mr-1" />
                          Observar Seleccionados
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openBulkActionConfirm("rejected", "controls")}
                          data-testid="button-bulk-reject-controls"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Rechazar Seleccionados
                        </Button>
                      </div>
                    )}
                    <SelectAllBanner
                      selectedCount={notNotifiedControlsPagination.selectedIds.size}
                      totalCount={notNotifiedControlsPaginationInfo?.total || 0}
                      pageSize={notNotifiedControlsPagination.pageSize}
                      totalItems={notNotifiedControlsPaginationInfo?.total || filteredNotNotifiedControls.length}
                      currentPage={notNotifiedControlsPagination.currentPage}
                      onSelectAll={() => {
                        if (notNotifiedControlsPaginationInfo?.total) {
                          notNotifiedControlsPagination.handleSelectAll(
                            Array.from({ length: notNotifiedControlsPaginationInfo.total }, (_, i) => ({ id: String(i) })) as any[],
                            () => String(Math.random())
                          );
                        }
                      }}
                      onClearAll={notNotifiedControlsPagination.handleClearAll}
                      itemName="controles sin notificar"
                    />
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="w-12 px-2 py-3 text-left">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div>
                                        <Checkbox
                                          checked={filteredNotNotifiedControls.every(control => notNotifiedControlsPagination.selectedIds.has(control.id))}
                                          onCheckedChange={(checked) => notNotifiedControlsPagination.handleSelectPage(filteredNotNotifiedControls, (c: any) => c.id, checked as boolean)}
                                          data-testid="checkbox-select-all-not-notified-controls"
                                        />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>Seleccionar todos en esta página</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                                <button
                                  onClick={() => handleSort("code")}
                                  className="flex items-center space-x-1 hover:text-primary"
                                  data-testid="button-sort-code-control-not-notified"
                                >
                                  <span>Código</span>
                                  {sortField === "code" && (
                                    sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                  )}
                                </button>
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Nombre</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Tipo</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                                <button
                                  onClick={() => handleSort("responsible")}
                                  className="flex items-center space-x-1 hover:text-primary"
                                  data-testid="button-sort-responsible-control-not-notified"
                                >
                                  <span>Responsable</span>
                                  {sortField === "responsible" && (
                                    sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                  )}
                                </button>
                              </th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredNotNotifiedControls.map((control: any) => (
                              <tr key={control.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`row-not-notified-control-${control.id}`}>
                                <td className="w-12 px-2 py-3">
                                  <Checkbox
                                    checked={notNotifiedControlsPagination.selectedIds.has(control.id)}
                                    onCheckedChange={() => notNotifiedControlsPagination.handleSelectItem(control.id)}
                                    data-testid={`checkbox-not-notified-control-${control.id}`}
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => setViewingControl(control)}
                                    className="font-medium text-sm text-primary hover:underline cursor-pointer"
                                    data-testid={`button-view-control-${control.id}`}
                                  >
                                    {control.code || "N/A"}
                                  </button>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-sm">{control.name}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <Badge className={getControlTypeColor(control.type)}>
                                    {getControlTypeText(control.type)}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-sm">{control.owner?.name || "N/A"}</td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-end space-x-1">
                                    <Button
                                      size="sm"
                                      onClick={() => handleValidateControl(control, "validated")}
                                      className="bg-green-600 hover:bg-green-700"
                                      data-testid={`button-approve-not-notified-control-${control.id}`}
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleValidateControl(control, "observed")}
                                      className="bg-orange-600 hover:bg-orange-700"
                                      data-testid={`button-observe-not-notified-control-${control.id}`}
                                    >
                                      <AlertCircle className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleValidateControl(control, "rejected")}
                                      data-testid={`button-reject-not-notified-control-${control.id}`}
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="p-4">
                        <PaginationControls
                          currentPage={notNotifiedControlsPagination.currentPage}
                          totalItems={notNotifiedControlsPaginationInfo?.total || filteredNotNotifiedControls.length}
                          pageSize={notNotifiedControlsPagination.pageSize}
                          onPageChange={notNotifiedControlsPagination.handlePageChange}
                          itemName="controles sin notificar"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Validated Controls */}
                {(statusFilter === "all" || statusFilter === "validated") && filteredValidatedControls.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>Controles Aprobados ({filteredValidatedControls.length})</span>
                    </h2>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                                <button
                                  onClick={() => handleSort("code")}
                                  className="flex items-center space-x-1 hover:text-primary"
                                  data-testid="button-sort-code-control-validated"
                                >
                                  <span>Código</span>
                                  {sortField === "code" && (
                                    sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                  )}
                                </button>
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                                <button
                                  onClick={() => handleSort("control")}
                                  className="flex items-center space-x-1 hover:text-primary"
                                  data-testid="button-sort-control-validated"
                                >
                                  <span>Nombre</span>
                                  {sortField === "control" && (
                                    sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                  )}
                                </button>
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Tipo</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                                <button
                                  onClick={() => handleSort("responsible")}
                                  className="flex items-center space-x-1 hover:text-primary"
                                  data-testid="button-sort-responsible-validated"
                                >
                                  <span>Responsable</span>
                                  {sortField === "responsible" && (
                                    sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                  )}
                                </button>
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                                <button
                                  onClick={() => handleSort("validatedAt")}
                                  className="flex items-center space-x-1 hover:text-primary"
                                  data-testid="button-sort-validated-at"
                                >
                                  <span>Fecha Validación</span>
                                  {sortField === "validatedAt" && (
                                    sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                  )}
                                </button>
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Comentarios</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredValidatedControls.map((control: any) => (
                              <tr key={control.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`row-validated-control-${control.id}`}>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => setViewingControl(control)}
                                    className="font-medium text-sm text-primary hover:underline cursor-pointer"
                                    data-testid={`button-view-control-${control.id}`}
                                  >
                                    {control.code || "N/A"}
                                  </button>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-sm">{control.name}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <Badge className={getControlTypeColor(control.type)}>
                                    {getControlTypeText(control.type)}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-sm">{control.owner?.name || "N/A"}</td>
                                <td className="px-4 py-3 text-sm">
                                  {control.validatedAt ? new Date(control.validatedAt).toLocaleDateString() : "N/A"}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="space-y-1">
                                    <Badge className="bg-green-100 text-green-800">Aprobado</Badge>
                                    {control.validationComments && (
                                      <div className="text-xs text-gray-600 mt-1" data-testid={`text-control-validation-comments-${control.id}`}>
                                        {control.validationComments}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Observed Controls */}
                {(statusFilter === "all" || statusFilter === "observed") && filteredObservedControls.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                      <span>Controles Observados ({filteredObservedControls.length})</span>
                    </h2>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                                <button
                                  onClick={() => handleSort("code")}
                                  className="flex items-center space-x-1 hover:text-primary"
                                  data-testid="button-sort-code-control-observed"
                                >
                                  <span>Código</span>
                                  {sortField === "code" && (
                                    sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                  )}
                                </button>
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                                <button
                                  onClick={() => handleSort("control")}
                                  className="flex items-center space-x-1 hover:text-primary"
                                  data-testid="button-sort-control-observed"
                                >
                                  <span>Nombre</span>
                                  {sortField === "control" && (
                                    sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                  )}
                                </button>
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Tipo</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                                <button
                                  onClick={() => handleSort("responsible")}
                                  className="flex items-center space-x-1 hover:text-primary"
                                  data-testid="button-sort-responsible-observed"
                                >
                                  <span>Responsable</span>
                                  {sortField === "responsible" && (
                                    sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                  )}
                                </button>
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                                <button
                                  onClick={() => handleSort("validatedAt")}
                                  className="flex items-center space-x-1 hover:text-primary"
                                  data-testid="button-sort-validated-at-observed"
                                >
                                  <span>Fecha Validación</span>
                                  {sortField === "validatedAt" && (
                                    sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                  )}
                                </button>
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Observaciones</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredObservedControls.map((control: any) => (
                              <tr key={control.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`row-observed-control-${control.id}`}>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => setViewingControl(control)}
                                    className="font-medium text-sm text-primary hover:underline cursor-pointer"
                                    data-testid={`button-view-control-${control.id}`}
                                  >
                                    {control.code || "N/A"}
                                  </button>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-sm">{control.name}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <Badge className={getControlTypeColor(control.type)}>
                                    {getControlTypeText(control.type)}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-sm">{control.owner?.name || "N/A"}</td>
                                <td className="px-4 py-3 text-sm">
                                  {control.validatedAt ? new Date(control.validatedAt).toLocaleDateString() : "N/A"}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="space-y-1">
                                    <Badge className="bg-orange-100 text-orange-800">Observado</Badge>
                                    {control.validationComments && (
                                      <div className="text-xs text-gray-600 mt-1" data-testid={`text-control-validation-comments-${control.id}`}>
                                        {control.validationComments}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
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
                                      <DropdownMenuItem
                                        onClick={() => handleResendControl(control)}
                                        className="text-blue-600 focus:text-blue-700"
                                        data-testid={`menu-resend-validation-${control.id}`}
                                      >
                                        <Send className="h-4 w-4 mr-2" />
                                        Reenviar a Validación
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rejected Controls */}
                {(statusFilter === "all" || statusFilter === "rejected") && filteredRejectedControls.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span>Controles Rechazados ({filteredRejectedControls.length})</span>
                    </h2>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                                <button
                                  onClick={() => handleSort("code")}
                                  className="flex items-center space-x-1 hover:text-primary"
                                  data-testid="button-sort-code-control-rejected"
                                >
                                  <span>Código</span>
                                  {sortField === "code" && (
                                    sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                  )}
                                </button>
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                                <button
                                  onClick={() => handleSort("control")}
                                  className="flex items-center space-x-1 hover:text-primary"
                                  data-testid="button-sort-control-rejected"
                                >
                                  <span>Nombre</span>
                                  {sortField === "control" && (
                                    sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                  )}
                                </button>
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Tipo</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                                <button
                                  onClick={() => handleSort("responsible")}
                                  className="flex items-center space-x-1 hover:text-primary"
                                  data-testid="button-sort-responsible-rejected"
                                >
                                  <span>Responsable</span>
                                  {sortField === "responsible" && (
                                    sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                  )}
                                </button>
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                                <button
                                  onClick={() => handleSort("validatedAt")}
                                  className="flex items-center space-x-1 hover:text-primary"
                                  data-testid="button-sort-validated-at-rejected"
                                >
                                  <span>Fecha Validación</span>
                                  {sortField === "validatedAt" && (
                                    sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                  )}
                                </button>
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Observaciones</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredRejectedControls.map((control: any) => (
                              <tr key={control.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`row-rejected-control-${control.id}`}>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => setViewingControl(control)}
                                    className="font-medium text-sm text-primary hover:underline cursor-pointer"
                                    data-testid={`button-view-control-${control.id}`}
                                  >
                                    {control.code || "N/A"}
                                  </button>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-sm">{control.name}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <Badge className={getControlTypeColor(control.type)}>
                                    {getControlTypeText(control.type)}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-sm">{control.owner?.name || "N/A"}</td>
                                <td className="px-4 py-3 text-sm">
                                  {control.validatedAt ? new Date(control.validatedAt).toLocaleDateString() : "N/A"}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="space-y-1">
                                    <Badge className="bg-red-100 text-red-800">Rechazado</Badge>
                                    {control.validationComments && (
                                      <div className="text-xs text-gray-600 mt-1" data-testid={`text-control-validation-comments-${control.id}`}>
                                        {control.validationComments}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
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
                                      <DropdownMenuItem
                                        onClick={() => handleResendControl(control)}
                                        className="text-blue-600 focus:text-blue-700"
                                        data-testid={`menu-resend-validation-${control.id}`}
                                      >
                                        <Send className="h-4 w-4 mr-2" />
                                        Reenviar a Validación
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="action-plans">
          {/* Action Plans Statistics */}
          <div className="grid grid-cols-6 gap-4 mb-8">
            <Card
              className={`cursor-pointer hover:shadow-md transition-all ${statusFilter === "notified" ? "border-2 border-blue-500 bg-blue-50 dark:bg-blue-950 shadow-lg" : ""}`}
              onClick={() => setStatusFilter("notified")}
              data-testid="card-filter-action-plan-notified"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Notificados</CardTitle>
                <Mail className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-action-plan-notified">
                  {validationCounts?.actionPlans.notified ?? notifiedActionPlansPaginationInfo?.total ?? 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Pendiente Respuesta
                </p>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer hover:shadow-md transition-all ${statusFilter === "not_notified" ? "border-2 border-blue-500 bg-blue-50 dark:bg-blue-950 shadow-lg" : ""}`}
              onClick={() => setStatusFilter("not_notified")}
              data-testid="card-filter-action-plan-not-notified"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sin Notificar</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-action-plan-not-notified">
                  {validationCounts?.actionPlans.notNotified ?? notNotifiedActionPlansPaginationInfo?.total ?? 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Por Enviar
                </p>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer hover:shadow-md transition-all ${statusFilter === "validated" ? "border-2 border-green-500 bg-green-50 dark:bg-green-950 shadow-lg" : ""}`}
              onClick={() => setStatusFilter("validated")}
              data-testid="card-filter-action-plan-validated"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aprobados</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-action-plan-approved">
                  {filteredValidatedActionPlans.length}
                </div>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer hover:shadow-md transition-all ${statusFilter === "observed" ? "border-2 border-orange-500 bg-orange-50 dark:bg-orange-950 shadow-lg" : ""}`}
              onClick={() => setStatusFilter("observed")}
              data-testid="card-filter-action-plan-observed"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Observados</CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-action-plan-observed">
                  {filteredObservedActionPlans.length}
                </div>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer hover:shadow-md transition-all ${statusFilter === "rejected" ? "border-2 border-red-500 bg-red-50 dark:bg-red-950 shadow-lg" : ""}`}
              onClick={() => setStatusFilter("rejected")}
              data-testid="card-filter-action-plan-rejected"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rechazados</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-action-plan-rejected">
                  {filteredRejectedActionPlans.length}
                </div>
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer hover:shadow-md transition-all ${statusFilter === "all" ? "border-2 border-gray-500 bg-gray-50 dark:bg-gray-900 shadow-lg" : ""}`}
              onClick={() => setStatusFilter("all")}
              data-testid="card-filter-action-plan-total"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <FileText className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-action-plan-total">
                  {(notifiedActionPlansPaginationInfo?.total || 0) + (notNotifiedActionPlansPaginationInfo?.total || 0) + filteredValidatedActionPlans.length + filteredObservedActionPlans.length + filteredRejectedActionPlans.length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bulk Actions */}
          {(notifiedActionPlansPagination.selectedIds.size > 0 || notNotifiedActionPlansPagination.selectedIds.size > 0) && (
            <div className="flex items-center space-x-2 mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-sm font-medium text-blue-900">
                {notifiedActionPlansPagination.selectedIds.size + notNotifiedActionPlansPagination.selectedIds.size} plan(es) seleccionado(s)
              </span>
              <div className="flex-1" />
              <Button
                size="sm"
                onClick={() => openBulkActionConfirm("validated", "action-plans")}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-bulk-approve-action-plans"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Aprobar Seleccionados
              </Button>
              <Button
                size="sm"
                onClick={() => openBulkActionConfirm("observed", "action-plans")}
                className="bg-orange-600 hover:bg-orange-700"
                data-testid="button-bulk-observe-action-plans"
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                Observar Seleccionados
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => openBulkActionConfirm("rejected", "action-plans")}
                data-testid="button-bulk-reject-action-plans"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Rechazar Seleccionados
              </Button>
            </div>
          )}

          {/* Action Plans Table */}
          <div className="space-y-8">
            {/* Notified Action Plans */}
            {(statusFilter === "all" || statusFilter === "notified") && filteredNotifiedActionPlans.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                  <Mail className="h-5 w-5 text-blue-500" />
                  <span>Planes de Acción Notificados - Pendiente Respuesta ({notifiedActionPlansPaginationInfo?.total || 0})</span>
                </h2>
                {notifiedActionPlansPagination.selectedIds.size > 0 && (
                  <div className="mb-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const selectedPlans = filteredNotifiedActionPlans.filter(plan =>
                          notifiedActionPlansPagination.selectedIds.has(plan.id)
                        );
                        handleSendBulkEmailValidation();
                      }}
                      disabled={sendBulkEmailValidationMutation.isPending}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                      data-testid="button-bulk-email-notified-action-plans"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {sendBulkEmailValidationMutation.isPending ? 'Enviando...' : `Enviar por Email Seleccionados (${notifiedActionPlansPagination.selectedIds.size})`}
                    </Button>
                  </div>
                )}
                <SelectAllBanner
                  selectedCount={notifiedActionPlansPagination.selectedIds.size}
                  totalCount={notifiedActionPlansPaginationInfo?.total || 0}
                  pageSize={notifiedActionPlansPagination.pageSize}
                  totalItems={notifiedActionPlansPaginationInfo?.total || filteredNotifiedActionPlans.length}
                  currentPage={notifiedActionPlansPagination.currentPage}
                  onSelectAll={() => {
                    if (notifiedActionPlansResponse?.data) {
                      notifiedActionPlansPagination.handleSelectAll(notifiedActionPlansResponse.data, (plan: any) => plan.id);
                    }
                  }}
                  onClearAll={notifiedActionPlansPagination.handleClearAll}
                  itemName="planes de acción notificados"
                />
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="w-12 px-2 py-3 text-left">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <Checkbox
                                      checked={filteredNotifiedActionPlans.length > 0 && filteredNotifiedActionPlans.every((plan: any) => notifiedActionPlansPagination.selectedIds.has(plan.id))}
                                      onCheckedChange={(checked) => notifiedActionPlansPagination.handleSelectPage(filteredNotifiedActionPlans, (plan: any) => plan.id, checked as boolean)}
                                      data-testid="checkbox-select-all-notified-action-plans"
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>Seleccionar todos en esta página</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Código</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Plan</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Origen</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Riesgo</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Proceso</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Responsable</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Fecha Límite</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Notificado</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredNotifiedActionPlans.map((plan: any) => (
                          <tr key={plan.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`row-notified-action-plan-${plan.id}`}>
                            <td className="w-12 px-2 py-3">
                              <Checkbox
                                checked={notifiedActionPlansPagination.selectedIds.has(plan.id)}
                                onCheckedChange={() => notifiedActionPlansPagination.handleSelectItem(plan.id)}
                                data-testid={`checkbox-notified-action-plan-${plan.id}`}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => setViewingActionPlan(plan)}
                                className="font-medium text-sm text-primary hover:underline cursor-pointer"
                              >
                                {plan.code || "N/A"}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-sm">{plan.title}</div>
                            </td>
                            <td className="px-4 py-3">
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
                              >
                                {plan.origin === 'audit' ? 'Auditoría' :
                                  plan.origin === 'compliance' ? 'Cumplimiento' :
                                    plan.origin === 'risk' ? 'Gestión de Riesgos' :
                                      'Sin origen'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {plan.associatedRisks && plan.associatedRisks.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {plan.associatedRisks.map((risk: any) => (
                                    <div key={risk.riskId} className="flex items-center gap-1">
                                      <Badge variant={risk.isPrimary ? "default" : "outline"} className="text-xs">
                                        {risk.riskCode}
                                      </Badge>
                                      <span className="text-xs">{risk.riskName}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                plan.risk?.name || "N/A"
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">{plan.process?.name || "N/A"}</td>
                            <td className="px-4 py-3 text-sm">{displayResponsible(plan.responsible)}</td>
                            <td className="px-4 py-3 text-sm">
                              {plan.dueDate ? new Date(plan.dueDate).toLocaleDateString() : "N/A"}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <Badge className="bg-blue-100 text-blue-800">
                                {plan.notifiedAt ? new Date(plan.notifiedAt).toLocaleDateString() : "N/A"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end space-x-1">
                                <Button
                                  size="sm"
                                  onClick={() => handleValidateActionPlan(plan, "validated")}
                                  className="bg-green-600 hover:bg-green-700"
                                  data-testid={`button-approve-action-plan-${plan.id}`}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleValidateActionPlan(plan, "observed")}
                                  className="bg-orange-600 hover:bg-orange-700"
                                  data-testid={`button-observe-action-plan-${plan.id}`}
                                >
                                  <AlertCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleValidateActionPlan(plan, "rejected")}
                                  data-testid={`button-reject-action-plan-${plan.id}`}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleResendValidation(plan.id)}
                                        disabled={resendValidationMutation.isPending}
                                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                                        data-testid={`button-resend-action-plan-${plan.id}`}
                                      >
                                        <Mail className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Reenviar email de validación</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-4">
                    <PaginationControls
                      currentPage={notifiedActionPlansPagination.currentPage}
                      totalItems={notifiedActionPlansPaginationInfo?.total || 0}
                      pageSize={notifiedActionPlansPagination.pageSize}
                      onPageChange={notifiedActionPlansPagination.handlePageChange}
                      itemName="planes de acción"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Not Notified Action Plans */}
            {(statusFilter === "all" || statusFilter === "not_notified") && filteredNotNotifiedActionPlans.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <span>Planes de Acción Sin Notificar ({notNotifiedActionPlansPaginationInfo?.total || 0})</span>
                </h2>
                {notNotifiedActionPlansPagination.selectedIds.size > 0 && (
                  <div className="mb-3">
                    <Button
                      variant="outline"
                      onClick={handleSendBulkEmailValidation}
                      disabled={sendBulkEmailValidationMutation.isPending}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                      data-testid="button-bulk-email-not-notified-action-plans"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {sendBulkEmailValidationMutation.isPending ? 'Enviando...' : `Enviar por Email Seleccionados (${notNotifiedActionPlansPagination.selectedIds.size})`}
                    </Button>
                  </div>
                )}
                <SelectAllBanner
                  selectedCount={notNotifiedActionPlansPagination.selectedIds.size}
                  totalCount={notNotifiedActionPlansPaginationInfo?.total || 0}
                  pageSize={notNotifiedActionPlansPagination.pageSize}
                  totalItems={notNotifiedActionPlansPaginationInfo?.total || filteredNotNotifiedActionPlans.length}
                  currentPage={notNotifiedActionPlansPagination.currentPage}
                  onSelectAll={() => {
                    if (notNotifiedActionPlansResponse?.data) {
                      notNotifiedActionPlansPagination.handleSelectAll(notNotifiedActionPlansResponse.data, (plan: any) => plan.id);
                    }
                  }}
                  onClearAll={notNotifiedActionPlansPagination.handleClearAll}
                  itemName="planes de acción sin notificar"
                />
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="w-12 px-2 py-3 text-left">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <Checkbox
                                      checked={filteredNotNotifiedActionPlans.length > 0 && filteredNotNotifiedActionPlans.every((plan: any) => notNotifiedActionPlansPagination.selectedIds.has(plan.id))}
                                      onCheckedChange={(checked) => notNotifiedActionPlansPagination.handleSelectPage(filteredNotNotifiedActionPlans, (plan: any) => plan.id, checked as boolean)}
                                      data-testid="checkbox-select-all-not-notified-action-plans"
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>Seleccionar todos en esta página</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Código</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Plan</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Riesgo</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Proceso</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Responsable</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Fecha Límite</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredNotNotifiedActionPlans.map((plan: any) => (
                          <tr key={plan.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`row-not-notified-action-plan-${plan.id}`}>
                            <td className="w-12 px-2 py-3">
                              <Checkbox
                                checked={notNotifiedActionPlansPagination.selectedIds.has(plan.id)}
                                onCheckedChange={() => notNotifiedActionPlansPagination.handleSelectItem(plan.id)}
                                data-testid={`checkbox-not-notified-action-plan-${plan.id}`}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => setViewingActionPlan(plan)}
                                className="font-medium text-sm text-primary hover:underline cursor-pointer"
                              >
                                {plan.code || "N/A"}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-sm">{plan.title}</div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {plan.associatedRisks && plan.associatedRisks.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {plan.associatedRisks.map((risk: any) => (
                                    <div key={risk.riskId} className="flex items-center gap-1">
                                      <Badge variant={risk.isPrimary ? "default" : "outline"} className="text-xs">
                                        {risk.riskCode}
                                      </Badge>
                                      <span className="text-xs">{risk.riskName}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                plan.risk?.name || "N/A"
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">{plan.process?.name || "N/A"}</td>
                            <td className="px-4 py-3 text-sm">{displayResponsible(plan.responsible)}</td>
                            <td className="px-4 py-3 text-sm">
                              {plan.dueDate ? new Date(plan.dueDate).toLocaleDateString() : "N/A"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end space-x-1">
                                <Button
                                  size="sm"
                                  onClick={() => handleValidateActionPlan(plan, "validated")}
                                  className="bg-green-600 hover:bg-green-700"
                                  data-testid={`button-approve-action-plan-${plan.id}`}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleValidateActionPlan(plan, "observed")}
                                  className="bg-orange-600 hover:bg-orange-700"
                                  data-testid={`button-observe-action-plan-${plan.id}`}
                                >
                                  <AlertCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleValidateActionPlan(plan, "rejected")}
                                  data-testid={`button-reject-action-plan-${plan.id}`}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-4">
                    <PaginationControls
                      currentPage={notNotifiedActionPlansPagination.currentPage}
                      totalItems={notNotifiedActionPlansPaginationInfo?.total || 0}
                      pageSize={notNotifiedActionPlansPagination.pageSize}
                      onPageChange={notNotifiedActionPlansPagination.handlePageChange}
                      itemName="planes de acción"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* All Pending Action Plans - shown when filter is "all" and no specific categories, or when filter is "pending_validation" */}
            {((statusFilter === "all" && filteredNotifiedActionPlans.length === 0 && filteredNotNotifiedActionPlans.length === 0 && filteredPendingActionPlans.length > 0) || statusFilter === "pending_validation") && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <span>Planes de Acción Pendientes ({filteredPendingActionPlans.length})</span>
                </h2>
                {selectedActionPlans.length > 0 && (
                  <div className="mb-3">
                    <Button
                      variant="outline"
                      onClick={handleSendBulkEmailValidation}
                      disabled={sendBulkEmailValidationMutation.isPending}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                      data-testid="button-bulk-email-action-plans"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {sendBulkEmailValidationMutation.isPending ? 'Enviando...' : `Enviar por Email Seleccionados (${selectedActionPlans.length})`}
                    </Button>
                  </div>
                )}
                {filteredPendingActionPlans.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="w-12 px-2 py-3 text-left">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <Checkbox
                                        checked={filteredPendingActionPlans.every(plan => selectedActionPlans.includes(plan.id))}
                                        onCheckedChange={(checked) => handleSelectAllActionPlans(filteredPendingActionPlans, checked as boolean)}
                                        data-testid="checkbox-select-all-action-plans"
                                      />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>Seleccionar todos</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
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
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Plan</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Origen</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Riesgo</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Proceso</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                              <button
                                onClick={() => handleSort("responsible")}
                                className="flex items-center space-x-1 hover:text-primary transition-colors"
                                data-testid="sort-responsible-button"
                              >
                                <span>Responsable</span>
                                {sortField === "responsible" ? (
                                  sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                ) : (
                                  <ArrowUpDown className="h-4 w-4 text-gray-400" />
                                )}
                              </button>
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Fecha Límite</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Estado</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPendingActionPlans.map((plan: any) => (
                            <tr key={plan.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`row-action-plan-${plan.id}`}>
                              <td className="w-12 px-2 py-3">
                                <Checkbox
                                  checked={selectedActionPlans.includes(plan.id)}
                                  onCheckedChange={(checked) => handleSelectActionPlan(plan.id, checked as boolean)}
                                  data-testid={`checkbox-action-plan-${plan.id}`}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-sm text-primary" data-testid={`text-action-plan-code-${plan.id}`}>
                                  {plan.code || "N/A"}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-sm" data-testid={`text-action-plan-title-${plan.id}`}>
                                  {plan.title}
                                </div>
                              </td>
                              <td className="px-4 py-3">
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
                                >
                                  {plan.origin === 'audit' ? 'Auditoría' :
                                    plan.origin === 'compliance' ? 'Cumplimiento' :
                                      plan.origin === 'risk' ? 'Gestión de Riesgos' :
                                        'Sin origen'}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm" data-testid={`text-action-plan-risk-${plan.id}`}>
                                  {plan.associatedRisks && plan.associatedRisks.length > 0 ? (
                                    <div className="flex flex-col gap-1">
                                      {plan.associatedRisks.map((risk: any) => (
                                        <div key={risk.riskId} className="flex items-center gap-1">
                                          <Badge variant={risk.isPrimary ? "default" : "outline"} className="text-xs">
                                            {risk.riskCode}
                                          </Badge>
                                          <span className="text-xs">{risk.riskName}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    plan.risk?.name || "N/A"
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm" data-testid={`text-action-plan-process-${plan.id}`}>
                                  {plan.process?.name || "N/A"}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm" data-testid={`text-action-plan-responsible-${plan.id}`}>
                                  {displayResponsible(plan.responsible)}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm" data-testid={`text-action-plan-due-date-${plan.id}`}>
                                  {plan.dueDate ? new Date(plan.dueDate).toLocaleDateString() : "N/A"}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Badge className="bg-gray-100 text-gray-800" data-testid={`badge-action-plan-status-${plan.id}`}>
                                  {getActionPlanStatusText(plan.status)}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end space-x-1">
                                  <Button
                                    size="sm"
                                    onClick={() => handleValidateActionPlan(plan, "validated")}
                                    className="bg-green-600 hover:bg-green-700"
                                    data-testid={`button-approve-action-plan-${plan.id}`}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleValidateActionPlan(plan, "observed")}
                                    className="bg-orange-600 hover:bg-orange-700"
                                    data-testid={`button-observe-action-plan-${plan.id}`}
                                  >
                                    <AlertCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleValidateActionPlan(plan, "rejected")}
                                    data-testid={`button-reject-action-plan-${plan.id}`}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="mx-auto h-12 w-12 mb-4" />
                    <p>No hay planes de acción pendientes de validación</p>
                  </div>
                )}
              </div>
            )}

            {/* Validated Action Plans */}
            {(statusFilter === "all" || statusFilter === "validated") && filteredValidatedActionPlans.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Planes de Acción Aprobados ({filteredValidatedActionPlans.length})</span>
                </h2>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Código</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Plan</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Riesgo</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Proceso</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Responsable</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Fecha Límite</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Estado</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Validación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredValidatedActionPlans.map((plan: any) => (
                          <tr key={plan.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`row-validated-action-plan-${plan.id}`}>
                            <td className="px-4 py-3">
                              <div className="font-medium text-sm text-primary">{plan.code || "N/A"}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-sm">{plan.title}</div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {plan.associatedRisks && plan.associatedRisks.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {plan.associatedRisks.map((risk: any) => (
                                    <div key={risk.riskId} className="flex items-center gap-1">
                                      <Badge variant={risk.isPrimary ? "default" : "outline"} className="text-xs">
                                        {risk.riskCode}
                                      </Badge>
                                      <span className="text-xs">{risk.riskName}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                plan.risk?.name || "N/A"
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">{plan.process?.name || "N/A"}</td>
                            <td className="px-4 py-3 text-sm">{displayResponsible(plan.responsible)}</td>
                            <td className="px-4 py-3 text-sm">
                              {plan.dueDate ? new Date(plan.dueDate).toLocaleDateString() : "N/A"}
                            </td>
                            <td className="px-4 py-3">
                              <Badge className="bg-gray-100 text-gray-800">{getActionPlanStatusText(plan.status)}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <Badge className="bg-green-100 text-green-800">Aprobado</Badge>
                                {plan.validationComments && (
                                  <div className="text-xs text-gray-600 mt-1" data-testid={`text-action-plan-validation-comments-${plan.id}`}>
                                    {plan.validationComments}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Observed Action Plans */}
            {(statusFilter === "all" || statusFilter === "observed") && filteredObservedActionPlans.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  <span>Planes de Acción Observados ({filteredObservedActionPlans.length})</span>
                </h2>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Código</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Plan</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Riesgo</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Proceso</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Responsable</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Fecha Límite</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Estado</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Observaciones</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredObservedActionPlans.map((plan: any) => (
                          <tr key={plan.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`row-observed-action-plan-${plan.id}`}>
                            <td className="px-4 py-3">
                              <div className="font-medium text-sm text-primary">{plan.code || "N/A"}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-sm">{plan.title}</div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {plan.associatedRisks && plan.associatedRisks.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {plan.associatedRisks.map((risk: any) => (
                                    <div key={risk.riskId} className="flex items-center gap-1">
                                      <Badge variant={risk.isPrimary ? "default" : "outline"} className="text-xs">
                                        {risk.riskCode}
                                      </Badge>
                                      <span className="text-xs">{risk.riskName}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                plan.risk?.name || "N/A"
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">{plan.process?.name || "N/A"}</td>
                            <td className="px-4 py-3 text-sm">{displayResponsible(plan.responsible)}</td>
                            <td className="px-4 py-3 text-sm">
                              {plan.dueDate ? new Date(plan.dueDate).toLocaleDateString() : "N/A"}
                            </td>
                            <td className="px-4 py-3">
                              <Badge className="bg-gray-100 text-gray-800">{getActionPlanStatusText(plan.status)}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <Badge className="bg-orange-100 text-orange-800">Observado</Badge>
                                {plan.validationComments && (
                                  <div className="text-xs text-gray-600 mt-1" data-testid={`text-action-plan-validation-comments-${plan.id}`}>
                                    {plan.validationComments}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
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
                                    onClick={() => handleResendValidation(plan.id)}
                                    className="text-blue-600 focus:text-blue-700"
                                    data-testid={`menu-resend-validation-${plan.id}`}
                                  >
                                    <Send className="h-4 w-4 mr-2" />
                                    Reenviar a Validación
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Rejected Action Plans */}
            {(statusFilter === "all" || statusFilter === "rejected") && filteredRejectedActionPlans.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span>Planes de Acción Rechazados ({filteredRejectedActionPlans.length})</span>
                </h2>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Código</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Plan</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Riesgo</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Proceso</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Responsable</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Fecha Límite</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Estado</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Rechazo</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRejectedActionPlans.map((plan: any) => (
                          <tr key={plan.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`row-rejected-action-plan-${plan.id}`}>
                            <td className="px-4 py-3">
                              <div className="font-medium text-sm text-primary">{plan.code || "N/A"}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-sm">{plan.title}</div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {plan.associatedRisks && plan.associatedRisks.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {plan.associatedRisks.map((risk: any) => (
                                    <div key={risk.riskId} className="flex items-center gap-1">
                                      <Badge variant={risk.isPrimary ? "default" : "outline"} className="text-xs">
                                        {risk.riskCode}
                                      </Badge>
                                      <span className="text-xs">{risk.riskName}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                plan.risk?.name || "N/A"
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">{plan.process?.name || "N/A"}</td>
                            <td className="px-4 py-3 text-sm">{displayResponsible(plan.responsible)}</td>
                            <td className="px-4 py-3 text-sm">
                              {plan.dueDate ? new Date(plan.dueDate).toLocaleDateString() : "N/A"}
                            </td>
                            <td className="px-4 py-3">
                              <Badge className="bg-gray-100 text-gray-800">{getActionPlanStatusText(plan.status)}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <Badge className="bg-red-100 text-red-800">Rechazado</Badge>
                                {plan.validationComments && (
                                  <div className="text-xs text-gray-600 mt-1" data-testid={`text-action-plan-validation-comments-${plan.id}`}>
                                    {plan.validationComments}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
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
                                    onClick={() => handleResendValidation(plan.id)}
                                    className="text-blue-600 focus:text-blue-700"
                                    data-testid={`menu-resend-validation-${plan.id}`}
                                  >
                                    <Send className="h-4 w-4 mr-2" />
                                    Reenviar a Validación
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Shared Validation Dialog for Risks, Controls, and Action Plans */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {validationAction === "validated" ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : validationAction === "observed" ? (
                <AlertCircle className="h-5 w-5 text-orange-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span>
                {validationAction === "validated" ? "Aprobar" : validationAction === "observed" ? "Observar" : "Rechazar"}{" "}
                {validationType === "risk" ? "Riesgo" : validationType === "control" ? "Control" : "Plan de Acción"}
              </span>
            </DialogTitle>
            <DialogDescription>
              {validationType === "risk" && selectedRisk && (
                <>
                  <span className="font-medium">{selectedRisk.code}:</span> {selectedRisk.name}
                </>
              )}
              {validationType === "control" && selectedControl && (
                <>
                  <span className="font-medium">{selectedControl.code}:</span> {selectedControl.name}
                </>
              )}
              {validationType === "action-plan" && selectedActionPlan && (
                <>
                  <span className="font-medium">{selectedActionPlan.title}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                Comentarios {(validationAction === "rejected" || validationAction === "observed") ? "(Requerido)" : "(Opcional)"}
              </label>
              <Textarea
                placeholder={
                  validationAction === "validated"
                    ? "Comentarios sobre la aprobación..."
                    : validationAction === "observed"
                      ? "Explica las observaciones..."
                      : "Explica las razones del rechazo..."
                }
                value={validationComments}
                onChange={(e) => setValidationComments(e.target.value)}
                className="mt-2"
                data-testid="textarea-validation-comments"
              />
            </div>

            {validationType === "action-plan" && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={sendNotification}
                  onCheckedChange={(checked) => setSendNotification(checked as boolean)}
                  data-testid="checkbox-send-notification"
                />
                <label className="text-sm font-medium">
                  Enviar notificación al responsable
                </label>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setValidationComments("");
                  setSelectedRisk(null);
                  setSelectedControl(null);
                  setSelectedActionPlan(null);
                  setValidationAction(null);
                  setSendNotification(true);
                }}
                data-testid="button-cancel-validation"
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmValidation}
                disabled={
                  (validateMutation.isPending || validateControlMutation.isPending || validateActionPlanMutation.isPending) ||
                  ((validationAction === "rejected" || validationAction === "observed") && !validationComments.trim())
                }
                className={
                  validationAction === "validated"
                    ? "bg-green-600 hover:bg-green-700"
                    : validationAction === "observed"
                      ? "bg-orange-600 hover:bg-orange-700"
                      : ""
                }
                variant={validationAction === "rejected" ? "destructive" : "default"}
                data-testid="button-confirm-validation"
              >
                {(validateMutation.isPending || validateControlMutation.isPending || validateActionPlanMutation.isPending) ? "Procesando..." :
                  validationAction === "validated" ? "Aprobar" : validationAction === "observed" ? "Observar" : "Rechazar"
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Risk Detail Dialog */}
      {viewingRisk && (
        <RiskDetailDialog
          risk={viewingRisk}
          open={!!viewingRisk}
          onOpenChange={(open) => !open && setViewingRisk(null)}
        />
      )}

      {/* Action Plan Detail Dialog */}
      {viewingActionPlan && (
        <ActionPlanDetailDialog
          plan={viewingActionPlan}
          open={!!viewingActionPlan}
          onOpenChange={(open) => !open && setViewingActionPlan(null)}
        />
      )}

      {/* Control Detail Dialog */}
      {viewingControl && (
        <ControlDetailDialog
          control={viewingControl}
          open={!!viewingControl}
          onOpenChange={(open) => !open && setViewingControl(null)}
        />
      )}

      {/* Resend Control Confirmation Dialog */}
      <AlertDialog open={!!controlToResend} onOpenChange={(open) => !open && setControlToResend(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reenviar Email de Validación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres reenviar el email de validación para el control{" "}
              <strong>{controlToResend?.code}</strong>?
              <br /><br />
              Se generará un nuevo token de validación con 7 días de vigencia y se enviará un email al responsable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmResendControl}>
              Reenviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Validation History Modal */}
      {selectedHistoryRiskProcessLink && (
        <ValidationHistoryModal
          riskProcessLinkId={selectedHistoryRiskProcessLink.id}
          riskCode={selectedHistoryRiskProcessLink.riskCode}
          riskName={selectedHistoryRiskProcessLink.riskName}
          open={historyModalOpen}
          onOpenChange={setHistoryModalOpen}
        />
      )}

      {/* Pre-Validation Warning Modal */}
      {preValidationData && (
        <PreValidationWarningModal
          open={preValidationWarningOpen}
          onOpenChange={setPreValidationWarningOpen}
          processName={preValidationData.processName}
          totalRisks={preValidationData.totalRisks}
          validatedCount={preValidationData.validatedCount}
          pendingCount={preValidationData.pendingCount}
          alreadyValidatedRisks={preValidationData.alreadyValidatedRisks}
          onConfirm={handleConfirmPreValidation}
          isLoading={sendProcessToValidationMutation.isPending}
        />
      )}

      {/* Bulk Action Confirmation Dialog */}
      <AlertDialog open={bulkActionConfirmOpen} onOpenChange={setBulkActionConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Acción</AlertDialogTitle>
            <AlertDialogDescription>
              {getBulkActionMessage()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setBulkActionConfirmOpen(false);
              setBulkActionType(null);
              setBulkActionTarget(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={executeBulkAction}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Process Validation Card Component
interface ProcessValidationCardProps {
  process: {
    macroprocesoId: string;
    processName: string;
    processOwner: string;
    validationStatus: 'pending' | 'in_progress' | 'completed';
    totalRisks: number;
    validatedRisks: number;
    pendingRisks: number;
    totalControls: number;
    validatedControls: number;
    pendingControls: number;
    completionPercentage: number;
    lastValidatedAt?: string;
  };
  onDrillDown: (macroprocesoId: string) => void;
}

function ProcessValidationCard({ process, onDrillDown }: ProcessValidationCardProps) {
  const getStatusIcon = () => {
    switch (process.validationStatus) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    }
  };

  const getStatusText = () => {
    switch (process.validationStatus) {
      case 'completed':
        return 'Completado';
      case 'in_progress':
        return 'En Progreso';
      default:
        return 'Pendiente';
    }
  };

  const getStatusColor = () => {
    switch (process.validationStatus) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'in_progress':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-orange-600 bg-orange-50 border-orange-200';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">{process.processName}</CardTitle>
            <CardDescription className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>{process.processOwner}</span>
            </CardDescription>
          </div>
          <Badge className={`${getStatusColor()} border`}>
            <div className="flex items-center space-x-1">
              {getStatusIcon()}
              <span>{getStatusText()}</span>
            </div>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progreso de Validación</span>
            <span className="font-medium">{process.completionPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${process.completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="font-medium text-gray-700">Riesgos</div>
            <div className="text-xs text-gray-500">
              {process.validatedRisks}/{process.totalRisks} validados
            </div>
            <div className="text-xs text-orange-600">
              {process.pendingRisks} pendientes
            </div>
          </div>
          <div className="space-y-1">
            <div className="font-medium text-gray-700">Controles</div>
            <div className="text-xs text-gray-500">
              {process.validatedControls}/{process.totalControls} validados
            </div>
            <div className="text-xs text-orange-600">
              {process.pendingControls} pendientes
            </div>
          </div>
        </div>

        {/* Last Validation */}
        {process.lastValidatedAt && (
          <div className="text-xs text-gray-500 border-t pt-2">
            Última validación: {new Date(process.lastValidatedAt).toLocaleDateString()}
          </div>
        )}

        {/* Drill Down Button */}
        <Button
          onClick={() => onDrillDown(process.macroprocesoId)}
          className="w-full"
          variant="outline"
          size="sm"
          data-testid={`button-drill-down-${process.macroprocesoId}`}
        >
          <FileText className="h-4 w-4 mr-2" />
          Ver Detalles
        </Button>
      </CardContent>
    </Card>
  );
}
