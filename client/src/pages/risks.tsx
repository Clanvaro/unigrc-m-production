import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../lib/queryKeys";
import { usePermissions } from "@/hooks/usePermissions";
import { useOptimisticMutation } from "@/hooks/useOptimisticMutation";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Edit, Shield, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X, Search, User, MoreVertical, RefreshCw, Settings, Eye, Star, Trash2, ClipboardList, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

// OPTIMIZED: Lazy load RiskForm - only loads when create/edit dialog opens
// This reduces initial page load by ~150KB (includes ProbabilityWheel, HeatMaps, AI components)
const RiskForm = lazy(() => import("@/components/forms/risk-form"));
import { getRiskColor, getRiskLevelText, calculateResidualRisk, calculateResidualRiskFromControls, getResidualRiskColor, getInherentRiskColor } from "@/lib/risk-calculations";
import { apiRequest } from "@/lib/queryClient";
import { getCSRFTokenFromCookie } from "@/lib/csrf-cache";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "@/contexts/SearchContext";
import { RiskValue } from "@/components/RiskValue";
import type { Risk, Control, RiskControl } from "@shared/schema";
import { EditGuard, DeleteGuard, CreateGuard } from "@/components/auth/permission-guard";
// OPTIMIZED: Lazy load - only used in risk detail modal
const RiskRelationshipMap = lazy(() => import("@/components/RiskRelationshipMap").then(m => ({ default: m.RiskRelationshipMap })));
import { FilterToolbar } from "@/components/filter-toolbar";
import { VirtualizedTable, VirtualizedTableColumn, generateMockRisks } from "@/components/virtualized-table";
import SpecializedAIButton from "@/components/SpecializedAIButton";
import { ExplanationPopover } from "@/components/ExplanationPopover";
// OPTIMIZED: Lazy load - only used in risk detail modal
const AuditHistory = lazy(() => import("@/components/AuditHistory").then(m => ({ default: m.AuditHistory })));
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSavedViews } from "@/hooks/useSavedViews";
import { RiskValidationStatus } from "@/components/RiskValidationStatus";
import { ValidationHistoryModal } from "@/components/ValidationHistoryModal";
import { RiskValidationHistory } from "@/components/RiskValidationHistory";
import { RisksPageSkeleton } from "@/components/skeletons/risks-page-skeleton";

// Type for responsible with validation status
interface ResponsibleWithValidation {
  name: string;
  position: string;
  validationStatus: string;
  processes?: string[];
}

// Helper function to translate control types
const translateControlType = (type: string | undefined) => {
  if (!type) return 'N/A';
  const translations: Record<string, string> = {
    'preventive': 'Preventivo',
    'detective': 'Detectivo',
    'corrective': 'Correctivo',
    'directive': 'Directivo',
  };
  return translations[type.toLowerCase()] || type;
};

// Colores por defecto para categorías de riesgo conocidas (fallback)
const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  'Operacional': '#3b82f6',    // Azul
  'Cumplimiento': '#8b5cf6',   // Púrpura
  'Fraude': '#ef4444',         // Rojo
  'Tecnología': '#10b981',     // Verde
  'Tecnológico': '#10b981',    // Verde (variante)
  'Financiero': '#f59e0b',     // Naranja
  'Reputacional': '#ec4899',   // Rosa
  'Estratégico': '#6366f1',    // Índigo
  'Ciberseguridad': '#14b8a6', // Teal
  'Legal': '#8b5cf6',          // Púrpura
};

// Helper para construir mapa de colores O(1) lookup - se llama una vez con useMemo
const buildCategoryColorMap = (riskCategories: any[]): Record<string, string> => {
  const colorMap = { ...DEFAULT_CATEGORY_COLORS };
  // Sobrescribir con colores del catálogo si existen y no son gris default
  riskCategories?.forEach((cat: any) => {
    if (cat?.name && cat?.color && cat.color !== '#6b7280') {
      colorMap[cat.name] = cat.color;
    }
  });
  return colorMap;
};

export default function Risks() {
  const [, setLocation] = useLocation();
  const { currentUser } = usePermissions();
  const tenantId = currentUser?.id || 'single-tenant';
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [viewingRisk, setViewingRisk] = useState<Risk | null>(null);
  const [controlsDialogRisk, setControlsDialogRisk] = useState<Risk | null>(null);

  // Consolidated filter state
  const [filters, setFilters] = useState<Record<string, any>>({});

  // Legacy individual filters for backward compatibility with event listeners
  const macroprocesoFilter = filters.macroproceso || "all";
  const processFilter = filters.process || "all";
  const subprocesoFilter = filters.subproceso || "all";
  const inherentRiskLevelFilter = filters.inherentRiskLevel || "all";
  const residualRiskLevelFilter = filters.residualRiskLevel || "all";
  const validationFilter = filters.validation || "all";
  const ownerFilter = filters.owner || "all";
  const gerenciaFilter = filters.gerencia || "all";
  const searchTerm = filters.search || "";
  const [controlSearchTerm, setControlSearchTerm] = useState("");
  const [controlsPage, setControlsPage] = useState(1);
  const [deleteConfirmRisk, setDeleteConfirmRisk] = useState<Risk | null>(null);
  const [deletionReason, setDeletionReason] = useState("");
  const [configureColumnsOpen, setConfigureColumnsOpen] = useState(false);
  const [testMode50k, setTestMode50k] = useState(false);
  const [savedViewsDialogOpen, setSavedViewsDialogOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Column visibility configuration
  // Heavy columns (process, validation) are disabled by default for faster loading
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('risksTableColumns');
    return saved ? JSON.parse(saved) : {
      code: true,
      name: true,
      evaluationMethod: true,
      probability: true,
      impact: true,
      inherent: true,
      residual: true,
      process: false, // Disabled by default - requires batch-relations
      validation: false, // Disabled by default - requires batch-relations
      status: true,
      actionPlans: true,
      actions: true
    };
  });

  // Listen to filter changes from header
  useEffect(() => {
    const handleRiskFiltersChanged = (event: any) => {
      const { macroprocesoFilter, processFilter, subprocesoFilter, inherentRiskLevelFilter, residualRiskLevelFilter, validationFilter, ownerFilter } = event.detail;
      setFilters({
        ...filters,
        macroproceso: macroprocesoFilter,
        process: processFilter,
        subproceso: subprocesoFilter,
        inherentRiskLevel: inherentRiskLevelFilter,
        residualRiskLevel: residualRiskLevelFilter,
        validation: validationFilter,
        owner: ownerFilter,
      });
    };

    window.addEventListener('riskFiltersChanged', handleRiskFiltersChanged);
    return () => window.removeEventListener('riskFiltersChanged', handleRiskFiltersChanged);
  }, [filters]);

  // Listen to column configuration changes from header
  useEffect(() => {
    const handleConfigureColumns = () => {
      setConfigureColumnsOpen(true);
    };

    window.addEventListener('configureColumns', handleConfigureColumns);
    return () => window.removeEventListener('configureColumns', handleConfigureColumns);
  }, []);

  // Listen to saved views menu from header
  useEffect(() => {
    const handleOpenSavedViewsMenu = () => {
      setSavedViewsDialogOpen(true);
    };

    window.addEventListener('openSavedViewsMenu', handleOpenSavedViewsMenu);
    return () => window.removeEventListener('openSavedViewsMenu', handleOpenSavedViewsMenu);
  }, []);

  // Listen to toggle test mode 50k from header
  useEffect(() => {
    const handleToggleTestMode = () => {
      setTestMode50k(prev => !prev);
    };

    window.addEventListener('toggleTestMode50k', handleToggleTestMode);
    return () => window.removeEventListener('toggleTestMode50k', handleToggleTestMode);
  }, []);

  // Save column visibility to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('risksTableColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | "none">("none");
  const [sortColumn, setSortColumn] = useState<"code" | "probability" | "impact" | "inherent" | "residual">("code");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setSearchHandler } = useSearch();

  // Saved Views functionality
  const {
    savedViews,
    isLoading: isSavedViewsLoading,
    defaultView,
    deleteView,
    setDefaultView,
  } = useSavedViews("risks");

  // Load a saved view
  const loadView = (viewFilters: Record<string, any>) => {
    setFilters(viewFilters);
  };

  // Debounced search state - prevents excessive API calls while typing
  const [searchInput, setSearchInput] = useState("");

  // Debounce search term (300ms delay) to reduce API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput }));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Register search handler with debouncing
  useEffect(() => {
    setSearchHandler((term: string) => {
      setSearchInput(term);
    });
  }, [setSearchHandler]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // ============== BFF ENDPOINT (Backend For Frontend) ==============
  // Nuevo endpoint optimizado usando read-model (vista materializada)
  // 1 endpoint por pantalla - reemplaza múltiples llamadas paralelas
  // Usa risk_list_view para consultas rápidas y predecibles
  interface PagesRisksResponse {
    risks: {
      data: any[];
      pagination: { limit: number; offset: number; total: number; hasMore: boolean };
    };
    counts: {
      total: number;
      byStatus: Record<string, number>;
      byLevel: {
        low: number;
        medium: number;
        high: number;
        critical: number;
      };
    };
    catalogs: {
      gerencias: any[];
      macroprocesos: any[];
      processes: any[];
      subprocesos: any[];
      riskCategories: any[];
      processOwners: any[];
    };
    relations: {
      controlsByRisk: Record<string, { count: number; avgEffectiveness: number }>;
      processesByRisk: Record<string, string[]>;
      actionPlansByRisk: Record<string, number>;
    };
    _meta: {
      fetchedAt: string;
      duration: number;
    };
  }

  const { data: pageData, isLoading: isBootstrapLoading, isFetching, refetch: refetchRisks } = useQuery<PagesRisksResponse>({
    queryKey: ["/api/pages/risks", {
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      ...filters
    }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: ((currentPage - 1) * pageSize).toString(),
      });
      // Add filters to query params
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.gerencia && filters.gerencia !== 'all') params.append('gerenciaId', filters.gerencia);
      if (filters.macroproceso && filters.macroproceso !== 'all') params.append('macroprocesoId', filters.macroproceso);
      if (filters.process && filters.process !== 'all') params.append('processId', filters.process);
      if (filters.subproceso && filters.subproceso !== 'all') params.append('subprocesoId', filters.subproceso);
      if (filters.search) params.append('search', filters.search);
      if (filters.inherentRiskLevel && filters.inherentRiskLevel !== 'all') params.append('inherentRiskLevel', filters.inherentRiskLevel);
      if (filters.residualRiskLevel && filters.residualRiskLevel !== 'all') params.append('residualRiskLevel', filters.residualRiskLevel);
      if (filters.owner && filters.owner !== 'all') params.append('ownerId', filters.owner);

      const response = await fetch(`/api/pages/risks?${params}`);
      if (!response.ok) throw new Error("Failed to fetch risks page data");
      return response.json();
    },
    staleTime: 1000 * 60 * 2, // 2 minutes - invalidated on mutations
    gcTime: 1000 * 60 * 10, // 10 minutes cache retention
    refetchOnWindowFocus: false,
    refetchOnMount: false, // OPTIMIZED: No refetch on mount if data is fresh (within staleTime) - prevents slow reloads
    refetchOnReconnect: false, // OPTIMIZED: No refetch on reconnect - data is cached
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new page for smooth transitions
  });

  // Alias para compatibilidad con código existente
  const bootstrapData = pageData ? {
    risks: pageData.risks,
    catalogs: {
      ...pageData.catalogs,
      processGerencias: pageData.catalogs.processGerencias || [],
    },
    _meta: pageData._meta
  } : null;

  // Extract data from bootstrap response
  const risks = bootstrapData?.risks?.data || [];
  const totalPages = bootstrapData?.risks?.pagination ? Math.ceil(bootstrapData.risks.pagination.total / pageSize) : 0;
  
  // Determine if this is the initial load (no previous data)
  const isInitialLoad = !bootstrapData || bootstrapData.risks.data.length === 0;

  // Catalogs from bootstrap (server sanitizes all data)
  const gerencias = bootstrapData?.catalogs?.gerencias || [];
  const macroprocesos = bootstrapData?.catalogs?.macroprocesos || [];
  const subprocesos = bootstrapData?.catalogs?.subprocesos || [];
  const processes = bootstrapData?.catalogs?.processes || [];
  const processGerencias = bootstrapData?.catalogs?.processGerencias || [];
  const riskCategories = bootstrapData?.catalogs?.riskCategories || [];
  const macroprocesoGerencias: any[] = []; // Placeholder - loaded on demand if needed

  // Mapa de colores de categorías - O(1) lookup
  const categoryColorMap = useMemo(() => buildCategoryColorMap(riskCategories), [riskCategories]);

  // Process owners from bootstrap
  const bootstrapProcessOwners = bootstrapData?.catalogs?.processOwners || [];

  // Legacy compatibility - these were separate queries before
  const isPageDataLoading = isBootstrapLoading;
  const isRisksLoading = isBootstrapLoading;

  // ============== BATCH LOAD RELATIONS (LAZY - only for detail views) ==============
  // Load processLinks and controls only when user accesses detail dialogs
  const riskIds = risks.map((r: any) => r.id);

  // State to track if we need detailed data (for viewing risk details, validation, etc.)
  const [needsDetailedData, setNeedsDetailedData] = useState(false);

  interface BatchRelationsData {
    riskProcessLinks: any[];
    riskControls: any[];
    metadata?: {
      totalRisks: number;
      linksPerRiskLimit?: number;
      controlsPerRiskLimit?: number;
      linksTruncated?: boolean;
      controlsTruncated?: boolean;
      totalLinksAvailable?: number;
      totalControlsAvailable?: number;
    };
  }

  // Only load batch relations when needed (viewing details, editing, etc.)
  // Note: Summary data (processesSummary, controlsSummary, actionPlansSummary) comes from bootstrap
  // so we only need detailed relations when opening detail dialogs
  // OPTIMIZED: Use limitPerRisk to reduce payload size (50 per risk is usually enough for display)
  const needsFullRelations = !!viewingRisk || !!editingRisk || !!controlsDialogRisk;
  const limitPerRisk = needsFullRelations ? undefined : 50; // Limit to 50 per risk when just displaying, unlimited when editing
  
  const { data: batchRelations, isLoading: isRelationsLoading } = useQuery<BatchRelationsData>({
    queryKey: ["/api/risks/batch-relations", riskIds, limitPerRisk],
    queryFn: async () => {
      if (riskIds.length === 0) return { riskProcessLinks: [], riskControls: [] };
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const csrfToken = getCSRFTokenFromCookie();
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken;
      }
      const requestBody: { riskIds: string[]; limitPerRisk?: number } = { riskIds };
      if (limitPerRisk !== undefined) {
        requestBody.limitPerRisk = limitPerRisk;
      }
      const response = await fetch("/api/risks/batch-relations", {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch risk relations");
      return response.json();
    },
    // FIXED: Always fetch risk-process links to calculate validation status correctly
    // This is needed even when validation column is not visible, as validation status affects filtering
    // Summary columns (process, controls, actionPlans) use bootstrap data, so they don't need this
    // CRITICAL: Always enabled when there are risks to ensure validation status is always calculated correctly
    enabled: riskIds.length > 0,
    staleTime: 1000 * 30, // 30 seconds - reduced to ensure validation status updates appear faster
    refetchOnMount: true, // Refetch on mount to ensure fresh validation status after returning from validation center
    refetchOnWindowFocus: true, // FIXED: Refetch on window focus to ensure validation status is up-to-date
  });

  // Extract relations from batch response (empty when not loaded)
  const allRiskProcessLinks = batchRelations?.riskProcessLinks || [];
  const allRiskControls = batchRelations?.riskControls || [];

  // Process owners - use bootstrap data first, lazy load full data only when viewing details
  const { data: processOwnersData, isLoading: isProcessOwnersLoading } = useQuery<any[]>({
    queryKey: ["/api/process-owners"],
    enabled: needsDetailedData && bootstrapProcessOwners.length === 0, // Only load if bootstrap didn't provide
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });
  // Use bootstrap processOwners first, fallback to full API data when loaded
  const processOwners = bootstrapProcessOwners.length > 0 ? bootstrapProcessOwners : (processOwnersData || []);

  // Main loading state - no longer waits for batch relations
  const isLoading = isPageDataLoading || isRisksLoading;

  // Detailed loading state - only when user requests details
  const isDetailedLoading = needsDetailedData && (isRelationsLoading || isProcessOwnersLoading);

  // Activate detailed data loading when dialogs are opened
  useEffect(() => {
    if (viewingRisk || editingRisk || controlsDialogRisk) {
      setNeedsDetailedData(true);
    }
  }, [viewingRisk, editingRisk, controlsDialogRisk]);

  // Activate detailed data loading when heavy columns are enabled
  useEffect(() => {
    if (visibleColumns.process || visibleColumns.responsible || visibleColumns.validation) {
      setNeedsDetailedData(true);
    }
  }, [visibleColumns.process, visibleColumns.responsible, visibleColumns.validation]);

  // ============== LAZY-LOADED DATA (only when needed) ==============

  // Debounced search term for controls to avoid excessive API calls
  const [debouncedControlSearch, setDebouncedControlSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedControlSearch(controlSearchTerm);
      setControlsPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [controlSearchTerm]);

  // Optimized controls summary - paginated with pre-calculated residual projections
  const { data: controlsSummary, isLoading: isControlsSummaryLoading, refetch: refetchControlsSummary } = useQuery<{
    data: Array<{ id: string, code: string, name: string, description: string, type: string, effectiveness: number, projectedResidualRisk: number }>,
    associated: Array<{ id: string, controlId: string, residualRisk: number, control: any }>,
    pagination: { page: number, limit: number, total: number, totalPages: number },
    inherentRisk: number
  }>({
    queryKey: ['/api/risks', controlsDialogRisk?.id, 'controls/summary', controlsPage, debouncedControlSearch],
    queryFn: async () => {
      if (!controlsDialogRisk) throw new Error('No risk selected');
      const params = new URLSearchParams({
        page: controlsPage.toString(),
        limit: '25',
        ...(debouncedControlSearch && { search: debouncedControlSearch })
      });
      const response = await fetch(`/api/risks/${controlsDialogRisk.id}/controls/summary?${params}`);
      if (!response.ok) throw new Error('Failed to fetch controls summary');
      return response.json();
    },
    enabled: !!controlsDialogRisk?.id,
    staleTime: 0,
    gcTime: 0,
  });

  // Extract data from the optimized endpoint
  const dialogRiskControls = controlsSummary?.associated || [];
  const availableControlsData = controlsSummary?.data || [];
  const controlsPagination = controlsSummary?.pagination;

  // Legacy refetch function for mutations
  const refetchRiskControls = refetchControlsSummary;

  // Action plans - lazy loaded
  const { data: allActionPlans = [] } = useQuery<any[]>({
    queryKey: ["/api/action-plans"],
    enabled: !!viewingRisk, // Only fetch when viewing a risk
  });

  // Get risk events for the viewing risk
  const { data: viewingRiskEvents = [] } = useQuery({
    queryKey: [`/api/risk-events/risk/${viewingRisk?.id}`],
    enabled: !!viewingRisk?.id,
  });

  // Memoize legacy helper function for backward compatibility
  // This must be defined before getRiskProcessResponsibles since it's used there
  const getProcessOwnerDetailsLegacy = useCallback((risk: Risk): ResponsibleWithValidation | null => {
    // First, try to use direct processOwner if exists
    if (risk.processOwner && risk.processOwner.trim() !== '') {
      // Extract just the name (before " - " if it exists)
      const cleanName = risk.processOwner.split(' - ')[0].trim();

      // Find process owner by name
      const owner = processOwners.find((po: any) => po.name === cleanName);
      if (owner) {
        return {
          name: owner.name,
          position: owner.position || 'Sin cargo definido',
          validationStatus: 'pending_validation'
        };
      }

      // If not found in process owners table, use the clean name
      return {
        name: cleanName,
        position: 'Cargo no definido',
        validationStatus: 'pending_validation'
      };
    }

    // If no direct processOwner, inherit from process hierarchy
    let ownerId: string | null = null;

    // Try to get owner from subproceso first
    if (risk.subprocesoId) {
      const subproceso = subprocesos.find((s: any) => s.id === risk.subprocesoId);
      if (subproceso?.ownerId) {
        ownerId = subproceso.ownerId;
      } else if (subproceso?.procesoId) {
        // If subproceso has no owner, try its parent process
        const process = processes.find((p: any) => p.id === subproceso.procesoId);
        if (process?.ownerId) {
          ownerId = process.ownerId;
        } else if (process?.macroprocesoId) {
          // If process has no owner, try its parent macroproceso
          const macroproceso = macroprocesos.find((m: any) => m.id === process.macroprocesoId);
          if (macroproceso?.ownerId) {
            ownerId = macroproceso.ownerId;
          }
        }
      }
    }
    // Try to get owner from process if not found in subproceso
    else if (risk.processId) {
      const process = processes.find((p: any) => p.id === risk.processId);
      if (process?.ownerId) {
        ownerId = process.ownerId;
      } else if (process?.macroprocesoId) {
        // If process has no owner, try its parent macroproceso
        const macroproceso = macroprocesos.find((m: any) => m.id === process.macroprocesoId);
        if (macroproceso?.ownerId) {
          ownerId = macroproceso.ownerId;
        }
      }
    }
    // Try to get owner from macroproceso if not found in process
    else if (risk.macroprocesoId) {
      const macroproceso = macroprocesos.find((m: any) => m.id === risk.macroprocesoId);
      if (macroproceso?.ownerId) {
        ownerId = macroproceso.ownerId;
      }
    }

    // If we found an ownerId, get the process owner details
    if (ownerId) {
      const owner = processOwners.find((po: any) => po.id === ownerId);
      if (owner) {
        return {
          name: owner.name,
          position: owner.position || 'Sin cargo definido',
          validationStatus: 'pending_validation'
        };
      }
    }

    return null;
  }, [processOwners, subprocesos, processes, macroprocesos]);

  // Memoize helper function to get all responsible owners for a risk from riskProcessLinks
  // This function is called frequently in filters and columns, so memoization prevents recalculation
  const getRiskProcessResponsibles = useCallback((risk: Risk): ResponsibleWithValidation[] => {
    const riskLinks = allRiskProcessLinks.filter((link: any) => link.riskId === risk.id);

    if (riskLinks.length === 0) {
      // Fallback to legacy method if no riskProcessLinks exist
      const legacyResponsible = getProcessOwnerDetailsLegacy(risk);
      return legacyResponsible ? [legacyResponsible] : [];
    }

    const responsiblesMap = new Map<string, ResponsibleWithValidation>();

    riskLinks.forEach((link: any) => {
      let responsibleId = 'unassigned';
      let responsibleName = 'Sin asignar';
      let responsiblePosition = 'Sin cargo definido';
      let processName = '';

      // Try responsible override first
      if (link.responsibleOverrideId) {
        const owner = processOwners.find((po: any) => po.id === link.responsibleOverrideId);
        if (owner) {
          responsibleId = owner.id;
          responsibleName = owner.name;
          responsiblePosition = owner.position || 'Sin cargo definido';
        }
      } else {
        // Inherit from process hierarchy
        let ownerId: string | null = null;

        if (link.subprocesoId) {
          const subproceso = subprocesos.find((s: any) => s.id === link.subprocesoId);
          processName = subproceso ? `S: ${subproceso.name}` : '';
          if (subproceso?.ownerId) {
            ownerId = subproceso.ownerId;
          } else if (subproceso?.procesoId) {
            const process = processes.find((p: any) => p.id === subproceso.procesoId);
            if (process?.ownerId) {
              ownerId = process.ownerId;
            } else if (process?.macroprocesoId) {
              const macroproceso = macroprocesos.find((m: any) => m.id === process.macroprocesoId);
              if (macroproceso?.ownerId) {
                ownerId = macroproceso.ownerId;
              }
            }
          }
        } else if (link.processId) {
          const process = processes.find((p: any) => p.id === link.processId);
          processName = process ? `P: ${process.name}` : '';
          if (process?.ownerId) {
            ownerId = process.ownerId;
          } else if (process?.macroprocesoId) {
            const macroproceso = macroprocesos.find((m: any) => m.id === process.macroprocesoId);
            if (macroproceso?.ownerId) {
              ownerId = macroproceso.ownerId;
            }
          }
        } else if (link.macroprocesoId) {
          const macroproceso = macroprocesos.find((m: any) => m.id === link.macroprocesoId);
          processName = macroproceso ? `M: ${macroproceso.name}` : '';
          if (macroproceso?.ownerId) {
            ownerId = macroproceso.ownerId;
          }
        }

        if (ownerId) {
          const owner = processOwners.find((po: any) => po.id === ownerId);
          if (owner) {
            responsibleId = owner.id;
            responsibleName = owner.name;
            responsiblePosition = owner.position || 'Sin cargo definido';
          }
        }
      }

      const currentValidationStatus = link.validationStatus || 'pending_validation';

      // Check if this responsible already exists
      if (responsiblesMap.has(responsibleId)) {
        const existing = responsiblesMap.get(responsibleId)!;
        // Add process to the list if not already included
        if (processName && existing.processes && !existing.processes.includes(processName)) {
          existing.processes.push(processName);
        }
        // Aggregate validation status (rejected > pending > validated)
        if (existing.validationStatus === 'validated' && currentValidationStatus !== 'validated') {
          existing.validationStatus = currentValidationStatus;
        } else if (existing.validationStatus === 'pending_validation' && currentValidationStatus === 'rejected') {
          existing.validationStatus = 'rejected';
        }
      } else {
        responsiblesMap.set(responsibleId, {
          name: responsibleName,
          position: responsiblePosition,
          validationStatus: currentValidationStatus,
          processes: processName ? [processName] : []
        });
      }
    });

    // Convert map to array
    return Array.from(responsiblesMap.values());
  }, [allRiskProcessLinks, processOwners, subprocesos, processes, macroprocesos, getProcessOwnerDetailsLegacy]);

  // Memoize helper function to get aggregated validation status for a risk
  // CRITICAL: Calculate directly from riskProcessLinks, not from responsibles
  // This ensures we get the correct validation status for all links
  const getAggregatedValidationStatus = useCallback((risk: Risk) => {
    // Get all riskProcessLinks for this risk
    const riskLinks = allRiskProcessLinks.filter((link: any) => link.riskId === risk.id);

    if (riskLinks.length === 0) {
      // Fallback to legacy validation status if no links exist
      return risk.validationStatus || 'pending_validation';
    }

    // Extract validation statuses from all links
    const statuses = riskLinks
      .filter((link: any) => link && link.validationStatus !== undefined && link.validationStatus !== null)
      .map((link: any) => link.validationStatus);

    if (statuses.length === 0) {
      return 'pending_validation';
    }

    // Lógica de agregación (siguiendo calculateAggregatedValidationStatus):
    // 1. Si hay al menos un rechazo -> "rejected"
    // 2. Si hay al menos una observación (sin rechazos) -> "observed"
    // 3. Si todos están validados -> "validated"
    // 4. Si algunos validados y otros pendientes -> "partially_validated"
    // 5. Si todos pendientes -> "pending_validation"

    if (statuses.includes('rejected')) {
      return 'rejected';
    }

    if (statuses.includes('observed')) {
      return 'observed';
    }

    if (statuses.every(status => status === 'validated')) {
      return 'validated';
    }

    if (statuses.some(status => status === 'validated')) {
      return 'partially_validated';
    }

    // Otherwise, pending validation
    return 'pending_validation';
  }, [allRiskProcessLinks]);

  const deleteMutation = useOptimisticMutation({
    queryKey: "/api/risks",
    mutationFn: async ({ id, deletionReason }: { id: string; deletionReason: string }) => {
      return apiRequest(`/api/risks/${id}`, "DELETE", { deletionReason });
    },
    onOptimisticUpdate: (oldData: any, variables: { id: string; deletionReason: string }) => {
      if (!oldData?.data) return oldData;
      return {
        ...oldData,
        data: oldData.data.filter((r: any) => r.id !== variables.id)
      };
    },
    onSuccess: () => {
      // CRITICAL: Invalidate BFF endpoint first for immediate update
      queryClient.invalidateQueries({ 
        queryKey: ["/api/pages/risks"], 
        exact: false,
        refetchType: 'active' 
      });
      // Force immediate refetch to remove deleted risk instantly
      queryClient.refetchQueries({ 
        queryKey: ["/api/pages/risks"],
        exact: false,
        type: 'active'
      });
      
      // Also invalidate legacy endpoints
      queryClient.invalidateQueries({ queryKey: ["/api/risks/bootstrap"], exact: false, refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['risks-page-data-lite', tenantId], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/risks-with-details"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/processes"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/macroprocesos"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/subprocesos"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-controls-with-details"], refetchType: 'active' });
      toast({ title: "Riesgo eliminado", description: "El riesgo ha sido movido a la papelera." });
      setDeletionReason("");
      setDeleteConfirmRisk(null);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo eliminar el riesgo.", variant: "destructive" });
    },
  });

  const addControlMutation = useMutation({
    mutationFn: ({ riskId, controlId, effectiveness }: { riskId: string; controlId: string; effectiveness: number }) => {
      const risk = risks.find((r: Risk) => r.id === riskId);
      if (!risk) throw new Error("Riesgo no encontrado");

      const residualRisk = calculateResidualRisk(risk.inherentRisk, effectiveness);
      return apiRequest(`/api/risks/${riskId}/controls`, "POST", {
        controlId,
        residualRisk
      });
    },
    onMutate: async ({ riskId, controlId, effectiveness }) => {
      // OPTIMISTIC UPDATE: Add to cache immediately
      const control = availableControlsData.find((c: any) => c.id === controlId);
      const risk = risks.find((r: Risk) => r.id === riskId);
      if (!risk) return;
      const controlEffectiveness = control?.effectiveness ?? effectiveness;

      // Cancel any outgoing refetches - MUST match query key format
      await queryClient.cancelQueries({
        queryKey: ["/api/risks", riskId, "controls"]
      });
      // Also cancel bootstrap queries to prevent race conditions
      await queryClient.cancelQueries({
        queryKey: ["/api/risks/bootstrap"],
        exact: false
      });

      // Snapshot the previous value
      const previousControls = queryClient.getQueryData(["/api/risks", riskId, "controls"]);

      // Optimistically add the new control association
      const residualRisk = calculateResidualRisk(risk.inherentRisk, controlEffectiveness);
      const tempId = `temp-${Date.now()}`;
      queryClient.setQueryData(
        ["/api/risks", riskId, "controls"],
        (old: any[] = []) => [...old, {
          id: tempId,
          riskId: risk.id,
          controlId: controlId,
          residualRisk,
          controlCode: control?.code || '',
          controlName: control?.name || '',
          effectiveness: controlEffectiveness
        }]
      );

      // OPTIMISTIC UPDATE: Also update control count in bootstrap cache
      // This ensures the table shows the updated count immediately
      const bootstrapCaches = queryClient.getQueriesData({
        queryKey: ["/api/risks/bootstrap"],
        exact: false
      });

      // Store previous bootstrap data for rollback
      const previousBootstrapData: Array<[readonly unknown[], unknown]> = [];

      bootstrapCaches.forEach(([queryKey, data]: [readonly unknown[], unknown]) => {
        if (data && typeof data === 'object') {
          previousBootstrapData.push([queryKey, data]);
          queryClient.setQueryData(queryKey, (oldData: any) => {
            if (!oldData?.risks?.data) return oldData;
            return {
              ...oldData,
              risks: {
                ...oldData.risks,
                data: oldData.risks.data.map((r: any) =>
                  r.id === riskId
                    ? { ...r, controlCount: (r.controlCount || 0) + 1 }
                    : r
                )
              }
            };
          });
        }
      });

      return { previousControls, riskId, previousBootstrapData };
    },
    onSuccess: async (_data, _variables, context) => {
      // CRITICAL: Invalidate BFF endpoint first for immediate update
      queryClient.invalidateQueries({ 
        queryKey: ["/api/pages/risks"], 
        exact: false,
        refetchType: 'active' 
      });
      // Force immediate refetch
      queryClient.refetchQueries({ 
        queryKey: ["/api/pages/risks"],
        exact: false,
        type: 'active'
      });
      
      // Also invalidate specific risk queries
      if (context?.riskId) {
        queryClient.invalidateQueries({
          queryKey: ["/api/risks", context.riskId, "controls/summary"],
          exact: false,
          refetchType: 'active'
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/risks", context.riskId, "controls"],
          exact: false,
          refetchType: 'active'
        });
      }
      
      // Invalidate other endpoints
      queryClient.invalidateQueries({ queryKey: ["/api/risk-controls-with-details"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/risks/bootstrap"], exact: false, refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['risks-page-data-lite', tenantId], refetchType: 'active' });

      toast({ title: "Control asociado", description: "El control ha sido asociado al riesgo exitosamente." });
    },
    onError: (_error, _variables, context) => {
      // Rollback controls on error
      if (context?.previousControls && context?.riskId) {
        queryClient.setQueryData(
          ["/api/risks", context.riskId, "controls"],
          context.previousControls
        );
      }
      // Rollback bootstrap data on error
      if (context?.previousBootstrapData) {
        context.previousBootstrapData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({ title: "Error", description: "No se pudo asociar el control.", variant: "destructive" });
    },
  });

  const removeControlMutation = useMutation({
    mutationFn: (riskControlId: string) => apiRequest(`/api/risk-controls/${riskControlId}`, "DELETE"),
    onMutate: async (riskControlId) => {
      // OPTIMISTIC UPDATE: Remove from cache immediately
      const currentRisk = controlsDialogRisk;
      if (!currentRisk) return;

      // Cancel any outgoing refetches - MUST match query key format
      await queryClient.cancelQueries({
        queryKey: ["/api/risks", currentRisk.id, "controls"]
      });
      // Also cancel bootstrap queries to prevent race conditions
      await queryClient.cancelQueries({
        queryKey: ["/api/risks/bootstrap"],
        exact: false
      });

      // Snapshot the previous value
      const previousControls = queryClient.getQueryData(["/api/risks", currentRisk.id, "controls"]);

      // Optimistically update to the new value
      queryClient.setQueryData(
        ["/api/risks", currentRisk.id, "controls"],
        (old: any[] = []) => old.filter((assoc: any) => assoc.id !== riskControlId)
      );

      // OPTIMISTIC UPDATE: Also update control count in bootstrap cache
      // This ensures the table shows the updated count immediately
      const bootstrapCaches = queryClient.getQueriesData({
        queryKey: ["/api/risks/bootstrap"],
        exact: false
      });

      // Store previous bootstrap data for rollback
      const previousBootstrapData: Array<[readonly unknown[], unknown]> = [];

      bootstrapCaches.forEach(([queryKey, data]: [readonly unknown[], unknown]) => {
        if (data && typeof data === 'object') {
          previousBootstrapData.push([queryKey, data]);
          queryClient.setQueryData(queryKey, (oldData: any) => {
            if (!oldData?.risks?.data) return oldData;
            return {
              ...oldData,
              risks: {
                ...oldData.risks,
                data: oldData.risks.data.map((r: any) =>
                  r.id === currentRisk.id
                    ? { ...r, controlCount: Math.max(0, (r.controlCount || 0) - 1) }
                    : r
                )
              }
            };
          });
        }
      });

      return { previousControls, currentRisk, previousBootstrapData };
    },
    onSuccess: async (_data, _variables, context) => {
      // CRITICAL: Invalidate BFF endpoint first for immediate update
      queryClient.invalidateQueries({ 
        queryKey: ["/api/pages/risks"], 
        exact: false,
        refetchType: 'active' 
      });
      // Force immediate refetch
      queryClient.refetchQueries({ 
        queryKey: ["/api/pages/risks"],
        exact: false,
        type: 'active'
      });
      
      // Also invalidate specific risk queries
      if (context?.currentRisk) {
        queryClient.invalidateQueries({
          queryKey: ["/api/risks", context.currentRisk.id, "controls/summary"],
          exact: false,
          refetchType: 'active'
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/risks", context.currentRisk.id, "controls"],
          exact: false,
          refetchType: 'active'
        });
      }
      
      // Invalidate other endpoints
      queryClient.invalidateQueries({ queryKey: ["/api/risk-controls-with-details"], refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ["/api/risks/bootstrap"], exact: false, refetchType: 'active' });
      queryClient.invalidateQueries({ queryKey: ['risks-page-data-lite', tenantId], refetchType: 'active' });

      toast({ title: "Control removido", description: "El control ha sido removido del riesgo." });
    },
    onError: (_error, _variables, context) => {
      // Rollback controls on error
      if (context?.previousControls && context?.currentRisk) {
        queryClient.setQueryData(
          ["/api/risks", context.currentRisk.id, "controls"],
          context.previousControls
        );
      }
      // Rollback bootstrap data on error
      if (context?.previousBootstrapData) {
        context.previousBootstrapData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({ title: "Error", description: "No se pudo remover el control.", variant: "destructive" });
    },
  });


  // Handle sorting - memoized to prevent re-renders
  const handleSort = useCallback((column: "code" | "probability" | "impact" | "inherent" | "residual") => {
    if (sortColumn === column) {
      // Si es la misma columna, alternar el orden
      if (sortOrder === "none" || sortOrder === "desc") {
        setSortOrder("asc");
      } else {
        setSortOrder("desc");
      }
    } else {
      // Si es una columna diferente, cambiar a esa columna y empezar con ascendente
      setSortColumn(column);
      setSortOrder("asc");
    }
  }, [sortColumn, sortOrder]);

  // Note: With pagination, complex filtering is limited to current page only
  // FIXED: Backend now handles process/macroproceso/subproceso filtering correctly via risk_process_links
  // When these filters are active, trust backend filtering and only apply client-side filters for other criteria
  const hasBackendProcessFilters = macroprocesoFilter !== "all" || processFilter !== "all" || subprocesoFilter !== "all";
  
  // Memoize filtered and sorted risks to prevent recalculation on every render
  const filteredRisks = useMemo(() => {
    // Define the sort function
    const sortRisks = (risksToSort: Risk[]) => {
      return risksToSort.sort((a: Risk, b: Risk) => {
        if (sortOrder === "none") return 0;

        let aValue: number, bValue: number;

        switch (sortColumn) {
          case "code":
            const getCodeNumber = (code: string) => {
              const match = code.match(/\d+/);
              return match ? parseInt(match[0], 10) : 0;
            };
            aValue = getCodeNumber(a.code);
            bValue = getCodeNumber(b.code);
            break;

          case "probability":
            aValue = a.probability || 0;
            bValue = b.probability || 0;
            break;

          case "impact":
            aValue = a.impact || 0;
            bValue = b.impact || 0;
            break;

          case "inherent":
            aValue = a.inherentRisk || 0;
            bValue = b.inherentRisk || 0;
            break;

          case "residual":
            const aRiskControls = allRiskControls.filter((rc: any) => rc.riskId === a.id);
            const bRiskControls = allRiskControls.filter((rc: any) => rc.riskId === b.id);
            const aVals = aRiskControls.map((rc: any) => Number(rc.residualRisk)).filter((n: number) => Number.isFinite(n));
            const bVals = bRiskControls.map((rc: any) => Number(rc.residualRisk)).filter((n: number) => Number.isFinite(n));
            aValue = aVals.length > 0 ? Math.min(...aVals) : a.inherentRisk || 0;
            bValue = bVals.length > 0 ? Math.min(...bVals) : b.inherentRisk || 0;
            break;

          default:
            return 0;
        }

        if (sortOrder === "asc") {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      });
    };

    // If backend already filtered by process/macroproceso/subproceso, trust it and only apply other filters
    if (hasBackendProcessFilters) {
      const filtered = risks.filter((risk: Risk) => {
        // Only apply client-side filters that backend doesn't handle
        // Filter by search term
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const matchesSearch =
            risk.name.toLowerCase().includes(searchLower) ||
            risk.code.toLowerCase().includes(searchLower) ||
            (risk.description && risk.description.toLowerCase().includes(searchLower)) ||
            (risk.processOwner && risk.processOwner.toLowerCase().includes(searchLower));

          if (!matchesSearch) return false;
        }

        // Filter by validation status - use aggregated status instead of legacy
        if (validationFilter !== "all") {
          const aggregatedStatus = getAggregatedValidationStatus(risk);
          // Strict comparison: only show risks that match exactly (validated = only fully validated, not partially)
          if (aggregatedStatus !== validationFilter) return false;
        }

        // Filter by inherent risk level
        if (inherentRiskLevelFilter !== "all") {
          const level = getRiskLevelText(risk.inherentRisk).toLowerCase();
          if (level !== inherentRiskLevelFilter) return false;
        }

        // Filter by residual risk level
        if (residualRiskLevelFilter !== "all") {
          const riskControls = allRiskControls.filter((rc: any) => rc.riskId === risk.id);
          const controls = riskControls.map((rc: any) => ({
            effectiveness: rc.control?.effectiveness || 0,
            effectTarget: rc.control?.effectTarget || 'both'
          }));
          const residualRisk = calculateResidualRiskFromControls(risk.probability, risk.impact, controls);
          const level = getRiskLevelText(residualRisk).toLowerCase();
          if (level !== residualRiskLevelFilter) return false;
        }

        // Filter by owner
        if (ownerFilter !== "all") {
          const riskLinks = allRiskProcessLinks.filter((link: any) => link.riskId === risk.id);
          const hasOwner = riskLinks.some((link: any) => {
            if (link.responsibleOverrideId === ownerFilter) return true;
            if (link.subprocesoId) {
              const subproceso = subprocesos.find((s: any) => s.id === link.subprocesoId);
              if (subproceso?.ownerId === ownerFilter) return true;
              const process = processes.find((p: any) => p.id === subproceso?.procesoId);
              if (process?.ownerId === ownerFilter) return true;
              const macroproceso = macroprocesos.find((m: any) => m.id === process?.macroprocesoId);
              if (macroproceso?.ownerId === ownerFilter) return true;
            } else if (link.processId) {
              const process = processes.find((p: any) => p.id === link.processId);
              if (process?.ownerId === ownerFilter) return true;
              const macroproceso = macroprocesos.find((m: any) => m.id === process?.macroprocesoId);
              if (macroproceso?.ownerId === ownerFilter) return true;
            } else if (link.macroprocesoId) {
              const macroproceso = macroprocesos.find((m: any) => m.id === link.macroprocesoId);
              if (macroproceso?.ownerId === ownerFilter) return true;
            }
            return false;
          });
          if (!hasOwner) return false;
        }

        // Filter by gerencia
        if (gerenciaFilter !== "all") {
          // Gerencia filtering is handled by backend
          return true;
        }

        return true;
      });
      return sortRisks(filtered);
    }

    // Original client-side filtering when backend filters are not active
    const filtered = risks.filter((risk: Risk) => {
      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          risk.name.toLowerCase().includes(searchLower) ||
          risk.code.toLowerCase().includes(searchLower) ||
          (risk.description && risk.description.toLowerCase().includes(searchLower)) ||
          (risk.processOwner && risk.processOwner.toLowerCase().includes(searchLower));

        if (!matchesSearch) return false;
      }

      // Filter by macroproceso
      if (macroprocesoFilter !== "all") {
      let matchesMacroproceso = false;

      // First, check riskProcessLinks for associations
      const riskLinks = allRiskProcessLinks.filter((link: any) => link.riskId === risk.id);

      if (riskLinks.length > 0) {
        // Check if any link is associated with the selected macroproceso
        matchesMacroproceso = riskLinks.some((link: any) => {
          // Direct macroproceso link
          if (link.macroprocesoId === macroprocesoFilter) {
            return true;
          }

          // Process link - check if process belongs to macroproceso
          if (link.processId) {
            const process = processes.find((p: any) => p.id === link.processId);
            if (process && process.macroprocesoId === macroprocesoFilter) {
              return true;
            }
          }

          // Subproceso link - check if subproceso's process belongs to macroproceso
          if (link.subprocesoId) {
            const subproceso = subprocesos.find((s: any) => s.id === link.subprocesoId);
            if (subproceso) {
              const process = processes.find((p: any) => p.id === subproceso.procesoId);
              if (process && process.macroprocesoId === macroprocesoFilter) {
                return true;
              }
            }
          }

          return false;
        });
      } else {
        // Fallback to legacy fields if no riskProcessLinks exist
        if (risk.macroprocesoId === macroprocesoFilter) {
          matchesMacroproceso = true;
        }

        if (risk.processId && !matchesMacroproceso) {
          const process = processes.find((p: any) => p.id === risk.processId);
          if (process && process.macroprocesoId === macroprocesoFilter) {
            matchesMacroproceso = true;
          }
        }

        if (risk.subprocesoId && !matchesMacroproceso) {
          const subproceso = subprocesos.find((s: any) => s.id === risk.subprocesoId);
          if (subproceso) {
            const process = processes.find((p: any) => p.id === subproceso.procesoId);
            if (process && process.macroprocesoId === macroprocesoFilter) {
              matchesMacroproceso = true;
            }
          }
        }
      }

      if (!matchesMacroproceso) return false;
    }

    // Filter by process
    if (processFilter !== "all") {
      let matchesProcess = false;

      // First, check riskProcessLinks for associations
      const riskLinks = allRiskProcessLinks.filter((link: any) => link.riskId === risk.id);

      if (riskLinks.length > 0) {
        // Check if any link is associated with the selected process
        matchesProcess = riskLinks.some((link: any) => {
          // Direct process link
          if (link.processId === processFilter) {
            return true;
          }

          // Subproceso link - check if subproceso belongs to process
          if (link.subprocesoId) {
            const subproceso = subprocesos.find((s: any) => s.id === link.subprocesoId);
            if (subproceso && subproceso.procesoId === processFilter) {
              return true;
            }
          }

          return false;
        });
      } else {
        // Fallback to legacy fields if no riskProcessLinks exist
        if (risk.processId === processFilter) {
          matchesProcess = true;
        }

        if (risk.subprocesoId && !matchesProcess) {
          const subproceso = subprocesos.find((s: any) => s.id === risk.subprocesoId);
          if (subproceso && subproceso.procesoId === processFilter) {
            matchesProcess = true;
          }
        }
      }

      if (!matchesProcess) return false;
    }

    // Filter by subproceso
    if (subprocesoFilter !== "all") {
      let matchesSubproceso = false;

      // First, check riskProcessLinks for associations
      const riskLinks = allRiskProcessLinks.filter((link: any) => link.riskId === risk.id);

      if (riskLinks.length > 0) {
        // Check if any link is associated with the selected subproceso
        matchesSubproceso = riskLinks.some((link: any) => link.subprocesoId === subprocesoFilter);
      } else {
        // Fallback to legacy field if no riskProcessLinks exist
        matchesSubproceso = risk.subprocesoId === subprocesoFilter;
      }

      if (!matchesSubproceso) return false;
    }

    // Filter by validation status - use aggregated status instead of legacy
    if (validationFilter !== "all") {
      const aggregatedStatus = getAggregatedValidationStatus(risk);
      // Strict comparison: only show risks that match exactly (validated = only fully validated, not partially)
      if (aggregatedStatus !== validationFilter) return false;
    }

    // Filter by inherent risk level
    if (inherentRiskLevelFilter !== "all") {
      const level = getRiskLevelText(risk.inherentRisk).toLowerCase();
      if (level !== inherentRiskLevelFilter) return false;
    }

    // Filter by residual risk level
    if (residualRiskLevelFilter !== "all") {
      const riskControls = allRiskControls.filter((rc: any) => rc.riskId === risk.id);
      const controls = riskControls.map((rc: any) => ({
        effectiveness: rc.control?.effectiveness || 0,
        effectTarget: rc.control?.effectTarget || 'both'
      }));
      const residualRisk = calculateResidualRiskFromControls(risk.probability, risk.impact, controls);
      const level = getRiskLevelText(residualRisk).toLowerCase();
      if (level !== residualRiskLevelFilter) return false;
    }

    // Filter by responsible owner
    if (ownerFilter !== "all") {
      const riskLinks = allRiskProcessLinks.filter((link: any) => link.riskId === risk.id);

      // Check if any of the risk's process links has this owner as responsible
      const hasOwner = riskLinks.some((link: any) => {
        // Check responsible override first
        if (link.responsibleOverrideId === ownerFilter) {
          return true;
        }

        // Check inherited ownership from process hierarchy
        if (link.subprocesoId) {
          const subproceso = subprocesos.find((s: any) => s.id === link.subprocesoId);
          if (subproceso?.ownerId === ownerFilter) return true;
          const process = processes.find((p: any) => p.id === subproceso?.procesoId);
          if (process?.ownerId === ownerFilter) return true;
          const macroproceso = macroprocesos.find((m: any) => m.id === process?.macroprocesoId);
          if (macroproceso?.ownerId === ownerFilter) return true;
        } else if (link.processId) {
          const process = processes.find((p: any) => p.id === link.processId);
          if (process?.ownerId === ownerFilter) return true;
          const macroproceso = macroprocesos.find((m: any) => m.id === process?.macroprocesoId);
          if (macroproceso?.ownerId === ownerFilter) return true;
        } else if (link.macroprocesoId) {
          const macroproceso = macroprocesos.find((m: any) => m.id === link.macroprocesoId);
          if (macroproceso?.ownerId === ownerFilter) return true;
        }

        return false;
      });

      if (!hasOwner) return false;
    }

    // Filter by gerencia
    if (gerenciaFilter !== "all") {
      const riskLinks = allRiskProcessLinks.filter((link: any) => link.riskId === risk.id);

      // Check if any of the risk's process links is associated with this gerencia
      const hasGerencia = riskLinks.some((link: any) => {
        // Check macroproceso-gerencia relationship
        if (link.macroprocesoId) {
          const macroprocesoGerenciaLink = macroprocesoGerencias.find(
            (mg: any) => mg.macroprocesoId === link.macroprocesoId && mg.gerenciaId === gerenciaFilter
          );
          if (macroprocesoGerenciaLink) return true;

          // Also check if the macroproceso itself has a gerenciaId field
          const macroproceso = macroprocesos.find((m: any) => m.id === link.macroprocesoId);
          if (macroproceso?.gerenciaId === gerenciaFilter) return true;
        }

        // Check process-gerencia relationship
        if (link.processId) {
          const processGerenciaLink = processGerencias.find(
            (pg: any) => pg.processId === link.processId && pg.gerenciaId === gerenciaFilter
          );
          if (processGerenciaLink) return true;
        }

        // Check through subproceso -> process chain
        if (link.subprocesoId) {
          const subproceso = subprocesos.find((s: any) => s.id === link.subprocesoId);
          if (subproceso) {
            const process = processes.find((p: any) => p.id === subproceso.procesoId);
            if (process) {
              // Check process-gerencia relationship
              const processGerenciaLink = processGerencias.find(
                (pg: any) => pg.processId === process.id && pg.gerenciaId === gerenciaFilter
              );
              if (processGerenciaLink) return true;

              // Check macroproceso-gerencia relationship
              const macroproceso = macroprocesos.find((m: any) => m.id === process.macroprocesoId);
              if (macroproceso) {
                const macroprocesoGerenciaLink = macroprocesoGerencias.find(
                  (mg: any) => mg.macroprocesoId === macroproceso.id && mg.gerenciaId === gerenciaFilter
                );
                if (macroprocesoGerenciaLink) return true;

                // Also check if the macroproceso itself has a gerenciaId field
                if (macroproceso.gerenciaId === gerenciaFilter) return true;
              }
            }
          }
        }

        return false;
      });

      if (!hasGerencia) return false;
    }

    return true;
    });
    return sortRisks(filtered);
  }, [
    risks,
    searchTerm,
    macroprocesoFilter,
    processFilter,
    subprocesoFilter,
    validationFilter,
    inherentRiskLevelFilter,
    residualRiskLevelFilter,
    ownerFilter,
    gerenciaFilter,
    sortColumn,
    sortOrder,
    allRiskProcessLinks,
    allRiskControls,
    processes,
    subprocesos,
    macroprocesos,
    processGerencias,
    macroprocesoGerencias,
    hasBackendProcessFilters,
    getAggregatedValidationStatus,
    getRiskLevelText,
    calculateResidualRiskFromControls,
  ]);

  // Memoize delete handler
  const handleDelete = useCallback((risk: Risk) => {
    setDeleteConfirmRisk(risk);
    setDeletionReason("");
  }, []);

  const confirmDelete = () => {
    if (deleteConfirmRisk) {
      if (!deletionReason.trim()) {
        toast({
          title: "Motivo requerido",
          description: "Por favor ingrese el motivo de la eliminación.",
          variant: "destructive"
        });
        return;
      }
      deleteMutation.mutate({ id: deleteConfirmRisk.id, deletionReason });
      setDeleteConfirmRisk(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmRisk(null);
    setDeletionReason("");
  };

  const handleEditSuccess = () => {
    setEditingRisk(null);
    // CRITICAL: Invalidate BFF endpoint first for immediate update
    queryClient.invalidateQueries({ 
      queryKey: ["/api/pages/risks"], 
      exact: false,
      refetchType: 'active' 
    });
    // Force immediate refetch
    queryClient.refetchQueries({ 
      queryKey: ["/api/pages/risks"],
      exact: false,
      type: 'active'
    });
    
    // Also invalidate legacy endpoints
    queryClient.invalidateQueries({ queryKey: ["/api/risks/bootstrap"], exact: false, refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ["/api/risks/page-data-lite"], refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ["/api/risks"], exact: false, refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ["/api/risks-with-details"], refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ["/api/risks/heatmap-data"], refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ["/api/risk-snapshots/dates"], refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ["/api/processes"], refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ["/api/macroprocesos"], refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ["/api/subprocesos"], refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"], refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ["/api/risk-controls-with-details"], refetchType: 'active' });
  };


  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    // CRITICAL: Invalidate BFF endpoint first for immediate update
    queryClient.invalidateQueries({ 
      queryKey: ["/api/pages/risks"], 
      exact: false,
      refetchType: 'active' 
    });
    // Force immediate refetch to show new risk instantly
    queryClient.refetchQueries({ 
      queryKey: ["/api/pages/risks"],
      exact: false,
      type: 'active'
    });
    
    // Also invalidate legacy endpoints
    queryClient.invalidateQueries({ queryKey: ["/api/risks/bootstrap"], exact: false, refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ["/api/risks/page-data-lite"], refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ["/api/risks"], exact: false, refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ["/api/risks-with-details"], refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ["/api/processes"], refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ["/api/macroprocesos"], refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ["/api/subprocesos"], refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"], refetchType: 'active' });
    queryClient.invalidateQueries({ queryKey: ["/api/risk-controls-with-details"], refetchType: 'active' });
  };

  const handleCreateDialogOpen = (open: boolean) => {
    setIsCreateDialogOpen(open);
    // Force refresh of categories when opening the dialog
    if (open) {
      queryClient.invalidateQueries({ queryKey: ["/api/risk-categories"] });
    }
  };

  const handleAddControl = (controlId: string, effectiveness: number) => {
    if (controlsDialogRisk) {
      addControlMutation.mutate({ riskId: controlsDialogRisk.id, controlId, effectiveness });
    }
  };

  const handleRemoveControl = (riskControlId: string) => {
    removeControlMutation.mutate(riskControlId);
  };


  // Memoize helper functions to prevent recalculation
  const getResidualRisk = useCallback((risk: Risk) => {
    // Use pre-calculated residual from optimized endpoint if available
    if ((risk as any).calculatedResidual !== undefined) {
      return (risk as any).calculatedResidual;
    }
    // Fallback to detailed calculation when batch-relations are loaded
    const riskControlsForThisRisk = allRiskControls.filter((rc: any) => rc.riskId === risk.id);
    const controls = riskControlsForThisRisk.map((rc: any) => ({
      effectiveness: rc.control?.effectiveness || 0,
      effectTarget: rc.control?.effectTarget || 'both'
    }));
    return calculateResidualRiskFromControls(risk.probability, risk.impact, controls);
  }, [allRiskControls]);

  // Get control count - uses pre-calculated from endpoint or from batch-relations
  const getControlCount = useCallback((risk: Risk) => {
    if ((risk as any).controlCount !== undefined) {
      return (risk as any).controlCount;
    }
    return allRiskControls.filter((rc: any) => rc.riskId === risk.id).length;
  }, [allRiskControls]);

  // getAvailableControls now returns pre-filtered, pre-calculated data from the optimized endpoint
  const getAvailableControls = () => {
    return availableControlsData;
  };

  // Helper function to get action plan status badge variant
  const getActionPlanStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status?.toLowerCase()) {
      case 'in_progress':
      case 'pending':
        return 'default'; // Green/primary for active
      case 'completed':
      case 'implemented':
      case 'closed':
        return 'secondary'; // Gray for completed
      case 'overdue':
        return 'destructive'; // Red for overdue
      default:
        return 'outline';
    }
  };

  // Helper function to get action plan status color class
  const getActionPlanStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'in_progress':
      case 'pending':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
      case 'implemented':
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return '';
    }
  };

  const getValidationBadge = (validationStatus: string) => {
    switch (validationStatus) {
      case "pending_validation":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">⏳ Pendiente</Badge>;
      case "validated":
        return <Badge variant="outline" className="text-green-600 border-green-600">✅ Validado</Badge>;
      case "partially_validated":
        return <Badge variant="outline" className="text-green-600 border-green-600">⚠️ Parcial</Badge>;
      case "observed":
        return <Badge variant="outline" className="text-blue-600 border-blue-600">👁️ Observado</Badge>;
      case "rejected":
        return <Badge variant="outline" className="text-red-600 border-red-600">❌ Rechazado</Badge>;
      default:
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">⏳ Pendiente</Badge>;
    }
  };

  const getRiskControls = (riskId: string) => {
    return allRiskControls.filter((rc: any) => rc.riskId === riskId);
  };

  const getRiskActionPlans = (riskId: string) => {
    return allActionPlans.filter((ap: any) => ap.riskId === riskId);
  };

  // Loading state - skeleton shown during initial load

  // Normalize risk data for display (server already sanitizes, this just normalizes field names)
  const normalizeRisk = (risk: any) => ({
    ...risk,
    // Normalize snake_case to camelCase for frontend compatibility
    inherentRisk: risk.inherent_risk ?? risk.inherentRisk ?? 0,
    residualRisk: risk.residual_risk ?? risk.residualRisk ?? 0,
    // Ensure category is always an array
    category: Array.isArray(risk.category) ? risk.category : [],
  });

  // Data selection: use mock data for testing or filtered paginated data
  const displayDataRaw = testMode50k ? generateMockRisks(50000) as any[] : filteredRisks;
  const displayData = useMemo(() => displayDataRaw.map(normalizeRisk), [displayDataRaw]);

  // Memoize columns to prevent recreation on every render
  const columns: VirtualizedTableColumn<Risk>[] = useMemo(() => [
    {
      id: 'code',
      header: (
        <div
          className="flex items-center gap-1 cursor-pointer hover:bg-muted/80 select-none"
          onClick={() => handleSort("code")}
        >
          Código
          {sortColumn === "code" && sortOrder === "asc" && <ChevronUp className="h-3 w-3" />}
          {sortColumn === "code" && sortOrder === "desc" && <ChevronDown className="h-3 w-3" />}
        </div>
      ),
      width: '120px',
      cell: (risk) => (
        <Badge
          variant="outline"
          className="cursor-pointer hover:bg-accent transition-colors text-xs"
          onClick={() => {
            setNeedsDetailedData(true);
            setViewingRisk(risk);
          }}
        >
          {risk.code}
        </Badge>
      ),
      cellClassName: 'items-center justify-center',
      visible: visibleColumns.code,
    },
    {
      id: 'name',
      header: 'Riesgo',
      width: 'minmax(280px, 350px)',
      cell: (risk) => (
        <div className="min-w-0 max-w-full overflow-hidden">
          <p className="font-medium text-sm truncate" title={risk.name}>{risk.name}</p>
          {risk.description && (
            <p className="text-xs text-muted-foreground truncate" title={risk.description}>{risk.description}</p>
          )}
        </div>
      ),
      cellClassName: 'items-center',
      visible: visibleColumns.name,
    },
    {
      id: 'category',
      header: 'Categoría',
      width: '180px',
      cell: (risk) => {
        // Normalize category to always be a string array (handles PostgreSQL format variations)
        const categories: string[] = Array.isArray(risk.category) 
          ? risk.category.filter((c: any) => typeof c === 'string' && c.trim())
          : (typeof risk.category === 'string' && risk.category.trim()) 
            ? [risk.category.trim()] 
            : [];
        
        if (categories.length === 0) {
          return <Badge variant="outline" className="text-xs">Sin categoría</Badge>;
        }
        
        return (
          <div className="flex flex-wrap gap-1">
            {categories.slice(0, 2).map((categoryName: string) => (
              <Badge
                key={categoryName}
                className="text-xs whitespace-nowrap"
                style={{
                  backgroundColor: categoryColorMap[categoryName] || '#6b7280',
                  color: "white"
                }}
              >
                {categoryName}
              </Badge>
            ))}
            {categories.length > 2 && (
              <Badge variant="outline" className="text-xs whitespace-nowrap">+{categories.length - 2}</Badge>
            )}
          </div>
        );
      },
      cellClassName: 'items-center',
      visible: visibleColumns.name,
    },
    {
      id: 'evaluationMethod',
      header: 'Método de Evaluación',
      width: '150px',
      cell: (risk) => {
        const method = (risk as any).evaluationMethod || 'factors';
        return (
          <Badge
            variant={method === 'direct' ? 'default' : 'secondary'}
            className="text-xs whitespace-nowrap"
          >
            {method === 'direct' ? '📊 Directa' : '🔢 Por Factores'}
          </Badge>
        );
      },
      cellClassName: 'items-center justify-center',
      visible: visibleColumns.evaluationMethod,
    },
    {
      id: 'probability',
      header: (
        <div
          className="flex items-center gap-1 justify-center cursor-pointer hover:bg-muted/80 select-none"
          onClick={() => handleSort("probability")}
        >
          Prob
          {sortColumn === "probability" && sortOrder === "asc" && <ChevronUp className="h-3 w-3" />}
          {sortColumn === "probability" && sortOrder === "desc" && <ChevronDown className="h-3 w-3" />}
        </div>
      ),
      width: '80px',
      cell: (risk) => (
        <div className="flex items-center justify-center">
          <Badge variant="outline" className="text-xs whitespace-nowrap" data-testid={`probability-${risk.id}`}>
            {risk.probability}
          </Badge>
        </div>
      ),
      cellClassName: 'items-center justify-center',
      visible: visibleColumns.probability,
    },
    {
      id: 'impact',
      header: (
        <div
          className="flex items-center gap-1 justify-center cursor-pointer hover:bg-muted/80 select-none"
          onClick={() => handleSort("impact")}
        >
          Imp
          {sortColumn === "impact" && sortOrder === "asc" && <ChevronUp className="h-3 w-3" />}
          {sortColumn === "impact" && sortOrder === "desc" && <ChevronDown className="h-3 w-3" />}
        </div>
      ),
      width: '80px',
      cell: (risk) => (
        <div className="flex items-center justify-center">
          <Badge variant="outline" className="text-xs whitespace-nowrap" data-testid={`impact-${risk.id}`}>
            {risk.impact}
          </Badge>
        </div>
      ),
      cellClassName: 'items-center justify-center',
      visible: visibleColumns.impact,
    },
    {
      id: 'inherent',
      header: (
        <div
          className="flex items-center gap-1 justify-center cursor-pointer hover:bg-muted/80 select-none"
          onClick={() => handleSort("inherent")}
        >
          Inherente
          {sortColumn === "inherent" && sortOrder === "asc" && <ChevronUp className="h-3 w-3" />}
          {sortColumn === "inherent" && sortOrder === "desc" && <ChevronDown className="h-3 w-3" />}
        </div>
      ),
      width: '160px',
      cell: (risk) => {
        const probabilityValue = risk.probability || 0;
        const impactValue = risk.impact || 0;

        return (
          <div className="flex items-center justify-center gap-1">
            <div className="text-center">
              <Badge className={getInherentRiskColor(risk.inherentRisk) + ' text-xs'}>
                <RiskValue value={risk.inherentRisk} />
              </Badge>
              <div className="text-xs text-muted-foreground mt-1">
                {getRiskLevelText(risk.inherentRisk)}
              </div>
            </div>
            <ExplanationPopover
              title="Cálculo de Riesgo Inherente"
              description="El riesgo inherente se calcula multiplicando la probabilidad por el impacto"
              formula="Riesgo Inherente = Probabilidad × Impacto"
              calculationSteps={[
                {
                  label: 'Probabilidad',
                  value: probabilityValue.toFixed(1),
                },
                {
                  label: 'Impacto',
                  value: impactValue.toFixed(1),
                },
                {
                  label: 'Riesgo Inherente',
                  formula: `${probabilityValue.toFixed(1)} × ${impactValue.toFixed(1)}`,
                  value: typeof risk.inherentRisk === 'number' ? risk.inherentRisk.toFixed(1) : 'N/A',
                }
              ]}
              dataSource={{
                table: 'risks',
                query: `SELECT probability, impact FROM risks WHERE id = '${risk.id}'`,
                timestamp: risk.updatedAt ? new Date(risk.updatedAt).toLocaleString() : 'N/A'
              }}
              relatedEntities={
                risk.processId || risk.macroprocesoId || risk.subprocesoId
                  ? [
                    {
                      type: 'Proceso',
                      id: risk.processId || risk.macroprocesoId || risk.subprocesoId || '',
                      name: processes.find((p: any) => p.id === risk.processId)?.name ||
                        macroprocesos.find((m: any) => m.id === risk.macroprocesoId)?.name ||
                        subprocesos.find((s: any) => s.id === risk.subprocesoId)?.name || 'N/A'
                    }
                  ]
                  : undefined
              }
            />
          </div>
        );
      },
      cellClassName: 'items-center justify-center',
      visible: visibleColumns.inherent,
    },
    {
      id: 'residual',
      header: (
        <div
          className="flex items-center gap-1 justify-center cursor-pointer hover:bg-muted/80 select-none"
          onClick={() => handleSort("residual")}
        >
          Residual
          {sortColumn === "residual" && sortOrder === "asc" && <ChevronUp className="h-3 w-3" />}
          {sortColumn === "residual" && sortOrder === "desc" && <ChevronDown className="h-3 w-3" />}
        </div>
      ),
      width: '160px',
      cell: (risk) => {
        const residualRisk = getResidualRisk(risk);
        const controlCount = getControlCount(risk);
        const hasControls = controlCount > 0;
        // Only use detailed controls if batch-relations are loaded
        const riskControls = needsDetailedData ? allRiskControls.filter((rc: any) => rc.riskId === risk.id) : [];

        const controlsSteps = riskControls.map((rc: any) => ({
          label: `Control: ${rc.control?.code || 'N/A'}`,
          formula: `Efectividad ${rc.control?.effectiveness || 0}%`,
          value: `Residual: ${typeof rc.residualRisk === 'number' ? rc.residualRisk.toFixed(1) : 'N/A'}`
        }));

        return (
          <div className="flex items-center justify-center gap-1">
            <div className="text-center">
              <Badge className={getResidualRiskColor(residualRisk) + ' text-xs'}>
                <RiskValue value={residualRisk} />
              </Badge>
              <div className="text-xs text-muted-foreground mt-1">
                {getRiskLevelText(residualRisk)}
              </div>
            </div>
            <ExplanationPopover
              title="Cálculo de Riesgo Residual"
              description={hasControls
                ? "El riesgo residual es el menor valor después de aplicar los controles"
                : "Sin controles, el riesgo residual es igual al inherente"}
              formula={hasControls
                ? "Riesgo Residual = MIN(Riesgos Residuales de todos los controles)"
                : "Riesgo Residual = Riesgo Inherente"}
              calculationSteps={hasControls ? [
                {
                  label: 'Riesgo Inherente',
                  value: typeof risk.inherentRisk === 'number' ? risk.inherentRisk.toFixed(1) : 'N/A',
                },
                ...controlsSteps,
                {
                  label: 'Riesgo Residual Final',
                  formula: `MIN(${riskControls.map((rc: any) => typeof rc.residualRisk === 'number' ? rc.residualRisk.toFixed(1) : 'N/A').join(', ')})`,
                  value: typeof residualRisk === 'number' ? residualRisk.toFixed(1) : 'N/A',
                }
              ] : [
                {
                  label: 'Riesgo Inherente',
                  value: typeof risk.inherentRisk === 'number' ? risk.inherentRisk.toFixed(1) : 'N/A',
                },
                {
                  label: 'Riesgo Residual (sin controles)',
                  value: typeof residualRisk === 'number' ? residualRisk.toFixed(1) : 'N/A',
                }
              ]}
              dataSource={{
                table: hasControls ? 'risk_controls, controls' : 'risks',
                query: hasControls
                  ? `SELECT MIN(residual_risk) FROM risk_controls WHERE risk_id = '${risk.id}'`
                  : `SELECT inherent_risk FROM risks WHERE id = '${risk.id}'`,
                timestamp: risk.updatedAt ? new Date(risk.updatedAt).toLocaleString() : 'N/A'
              }}
              relatedEntities={riskControls.filter((rc: any) => rc && rc.control).map((rc: any) => ({
                type: 'Control',
                id: rc.control?.id || '',
                name: rc.control?.code || 'N/A'
              }))}
            />
          </div>
        );
      },
      cellClassName: 'items-center justify-center',
      visible: visibleColumns.residual,
    },
    {
      id: 'process',
      header: 'Proceso',
      width: '200px',
      cell: (risk) => {
        // Use processesSummary from bootstrap if available (optimized)
        const processesSummary = (risk as any).processesSummary;
        
        if (processesSummary && Array.isArray(processesSummary) && processesSummary.length > 0) {
          // Filter and normalize - ensure we only render strings
          const validProcesses = processesSummary
            .filter((proc: any) => proc && typeof proc === 'object' && typeof proc.name === 'string' && proc.name.trim())
            .slice(0, 2);
          
          if (validProcesses.length > 0) {
            const remaining = processesSummary.length - validProcesses.length;
            
            return (
              <div className="space-y-0.5 min-w-0">
                {validProcesses.map((proc: any, idx: number) => {
                  const processName = String(proc.name || '').trim();
                  return processName ? (
                    <div key={idx} className="text-xs line-clamp-1" title={processName}>
                      {processName}
                    </div>
                  ) : null;
                })}
                {remaining > 0 && (
                  <Badge variant="outline" className="text-xs">+{remaining} más</Badge>
                )}
              </div>
            );
          }
        }

        // Fallback to legacy logic if summary not available
        const riskLinks = allRiskProcessLinks.filter((link: any) => link.riskId === risk.id);
        let process: any = null;
        let subproceso: any = null;
        let macroproceso: any = null;

        if (risk.subprocesoId) {
          subproceso = subprocesos.find((s: any) => s.id === risk.subprocesoId);
          if (subproceso) {
            process = processes.find((p: any) => p.id === subproceso.procesoId);
            if (process) {
              macroproceso = macroprocesos.find((m: any) => m.id === process.macroprocesoId);
            }
          }
        } else if (risk.processId) {
          process = processes.find((p: any) => p.id === risk.processId);
          if (process) {
            macroproceso = macroprocesos.find((m: any) => m.id === process.macroprocesoId);
          }
        } else if (risk.macroprocesoId) {
          macroproceso = macroprocesos.find((m: any) => m.id === risk.macroprocesoId);
        }

              if (riskLinks.length === 0) {
                if (macroproceso || process || subproceso) {
                  return (
                    <>
                      {macroproceso && (
                        <div className="text-xs text-muted-foreground line-clamp-2" title={`M: ${macroproceso.name}`}>
                          <span className="font-medium">M:</span> {macroproceso.name}
                        </div>
                      )}
                      {process && (
                        <div className="text-xs line-clamp-2" title={`P: ${process.name}`}>
                          <span className="font-medium">P:</span> {process.name}
                        </div>
                      )}
                      {subproceso && (
                        <div className="text-xs text-blue-600 line-clamp-2" title={`S: ${subproceso.name}`}>
                          <span className="font-medium">S:</span> {subproceso.name}
                        </div>
                      )}
                    </>
                  );
                }
                return <Badge variant="secondary" className="text-xs">Sin asignar</Badge>;
              }

              const processHierarchies: { macro?: string; proc?: string; sub?: string }[] = [];
              riskLinks.forEach((link: any) => {
                const hierarchy: { macro?: string; proc?: string; sub?: string } = {};

                if (link.macroprocesoId) {
                  const macro = macroprocesos.find((m: any) => m.id === link.macroprocesoId);
                  if (macro) hierarchy.macro = macro.name;
                }

                if (link.processId) {
                  const proc = processes.find((p: any) => p.id === link.processId);
                  if (proc) hierarchy.proc = proc.name;
                }

                if (link.subprocesoId) {
                  const sub = subprocesos.find((s: any) => s.id === link.subprocesoId);
                  if (sub) hierarchy.sub = sub.name;
                }

                if (hierarchy.macro || hierarchy.proc || hierarchy.sub) {
                  processHierarchies.push(hierarchy);
                }
              });

              if (processHierarchies.length === 0) {
                return <Badge variant="secondary" className="text-xs">Sin asignar</Badge>;
              }

              return (
                <div className="space-y-0.5">
                  {processHierarchies.filter(h => h && (h.macro || h.proc || h.sub)).slice(0, 2).map((hierarchy, idx) => {
                    const parts: string[] = [];
                    if (hierarchy.macro) parts.push(`M: ${hierarchy.macro}`);
                    if (hierarchy.proc) parts.push(`P: ${hierarchy.proc}`);
                    if (hierarchy.sub) parts.push(`S: ${hierarchy.sub}`);
                    const fullPath = parts.join(' → ');

                    return (
                      <div key={idx} className="text-xs line-clamp-2" title={fullPath}>
                        {parts.filter(p => p).map((part, i) => (
                          <div key={i} className={i === 0 ? 'text-muted-foreground' : ''}>
                            {part}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  {processHierarchies.length > 2 && (
                    <Badge variant="outline" className="text-xs">+{processHierarchies.length - 2} más</Badge>
                  )}
          </div>
        );
      },
      cellClassName: 'items-center',
      visible: visibleColumns.process,
    },
    {
      id: 'validation',
      header: <div className="text-center">Validación</div>,
      width: '140px',
      cell: (risk) => {
        // Usar función memoizada que ya tiene la lógica de agregación y fallback
        const aggregatedStatus = getAggregatedValidationStatus(risk);
        
        // Para mostrar múltiples estados cuando hay varios responsibles, obtener responsibles solo una vez
        const responsibles = getRiskProcessResponsibles(risk);
        
        // Si hay múltiples responsibles con estados diferentes, mostrar los primeros 2
        if (responsibles.length > 1) {
          const statuses = responsibles
            .filter(r => r && r.validationStatus !== undefined)
            .map(r => r.validationStatus)
            .slice(0, 2);
          
          if (statuses.length > 1 && new Set(statuses).size > 1) {
            // Hay estados diferentes, mostrar múltiples badges
            return (
              <div className="flex flex-col gap-1 items-center">
                {statuses.map((status, idx) => (
                  <div key={idx}>
                    {getValidationBadge(status)}
                  </div>
                ))}
                {responsibles.length > 2 && (
                  <Badge variant="outline" className="text-xs">+{responsibles.length - 2}</Badge>
                )}
              </div>
            );
          }
        }
        
        // Caso simple: un solo estado (agregado o único responsable)
        return (
          <div className="flex justify-center">
            {getValidationBadge(aggregatedStatus)}
          </div>
        );
      },
      cellClassName: 'items-center',
      visible: visibleColumns.validation,
    },
    {
      id: 'status',
      header: <div className="text-center">Controles</div>,
      width: '250px',
      minWidth: '250px',
      cell: (risk) => {
        const controlCount = getControlCount(risk);
        // Use controlsSummary from bootstrap if available (optimized)
        const controlsSummary = (risk as any).controlsSummary;

        if (controlCount === 0) {
          return (
            <div className="flex justify-center">
              <span className="text-xs text-muted-foreground italic">Sin controles</span>
            </div>
          );
        }

        // Use summary if available
        if (controlsSummary && Array.isArray(controlsSummary) && controlsSummary.length > 0) {
          // Filter and normalize - ensure we only render strings
          const validControls = controlsSummary
            .filter((control: any) => control && typeof control === 'object' && typeof control.code === 'string' && control.code.trim())
            .slice(0, 2);
          
          if (validControls.length > 0) {
            const remaining = controlCount - validControls.length;

            return (
              <div className="flex flex-wrap gap-1 justify-center items-center">
                {validControls.map((control: any, idx: number) => {
                  const controlCode = String(control.code || '').trim();
                  return controlCode ? (
                    <Badge 
                      key={idx}
                      variant="secondary" 
                      className="text-xs cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => setControlsDialogRisk(risk)}
                      title={`Control ${controlCode}`}
                    >
                      {controlCode}
                    </Badge>
                  ) : null;
                })}
                {remaining > 0 && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-accent transition-colors text-xs"
                    onClick={() => setControlsDialogRisk(risk)}
                  >
                    +{remaining}
                  </Badge>
                )}
              </div>
            );
          }
        }

        // Fallback to detailed data if available
        const riskControls = getRiskControls(risk.id).filter((rc: any) => rc && rc.control);
        const hasDetailedData = riskControls.length > 0;

        if (hasDetailedData && riskControls.length <= 2) {
          return (
            <div className="flex flex-wrap gap-1 justify-center items-center">
              {(riskControls as any[]).filter(rc => rc && rc.control && rc.control.code).map((rc: any) => (
                <div key={rc.id} className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => setControlsDialogRisk(risk)}
                    title={rc.control?.name}>
                    {rc.control?.code}
                  </Badge>
                  {rc.control?.effectiveness !== undefined && rc.control?.effectiveness !== null && (
                    <span className="text-xs font-medium text-foreground">
                      {rc.control.effectiveness}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          );
        }

        return (
          <div className="flex justify-center">
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-accent transition-colors text-xs"
              onClick={() => setControlsDialogRisk(risk)}
            >
              {controlCount} {controlCount === 1 ? 'control' : 'controles'}
            </Badge>
          </div>
        );
      },
      cellClassName: 'items-center',
      visible: visibleColumns.status,
    },
    {
      id: 'actionPlans',
      header: <div className="text-center">Planes de Acción</div>,
      width: '200px',
      minWidth: '150px',
      cell: (risk) => {
        // Use actionPlansSummary from bootstrap if available (optimized)
        const actionPlansSummary = (risk as any).actionPlansSummary;
        
        if (actionPlansSummary && Array.isArray(actionPlansSummary) && actionPlansSummary.length > 0) {
          // Filter and normalize - ensure we only render strings
          const validPlans = actionPlansSummary
            .filter((plan: any) => plan && typeof plan === 'object' && typeof plan.code === 'string' && plan.code.trim())
            .slice(0, 2);
          
          if (validPlans.length > 0) {
            const totalCount = actionPlansSummary.length;
            const remaining = totalCount - validPlans.length;

            return (
              <div className="flex flex-wrap gap-1 justify-center">
                {validPlans.map((plan: any, idx: number) => {
                  const planCode = String(plan.code || '').trim();
                  const planStatus = String(plan.status || '').trim();
                  const statusColor = getActionPlanStatusColor(planStatus);
                  
                  return planCode ? (
                    <Badge
                      key={idx}
                      variant={getActionPlanStatusVariant(planStatus)}
                      className={`cursor-pointer hover:opacity-80 transition-colors text-xs ${statusColor}`}
                      onClick={() => setLocation(`/action-plans?riskId=${risk.id}`)}
                      title={`${planCode} - ${planStatus}`}
                    >
                      {planCode}
                    </Badge>
                  ) : null;
                })}
                {remaining > 0 && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-accent transition-colors text-xs"
                    onClick={() => setLocation(`/action-plans?riskId=${risk.id}`)}
                  >
                    +{remaining}
                  </Badge>
                )}
              </div>
            );
          }
        }

        // Fallback to detailed data if available
        const actionPlans = getRiskActionPlans(risk.id);

        if (actionPlans.length === 0) {
          return (
            <div className="flex justify-center">
              <span className="text-xs text-muted-foreground italic">Sin planes</span>
            </div>
          );
        }

        if (actionPlans.length <= 2) {
          return (
            <div className="flex flex-wrap gap-1 justify-center">
              {(actionPlans as any[]).filter(ap => ap && ap.code).map((ap: any) => {
                const statusColor = getActionPlanStatusColor(ap.status);
                return (
                <Badge
                  key={ap.id}
                    variant={getActionPlanStatusVariant(ap.status)}
                    className={`cursor-pointer hover:opacity-80 transition-colors text-xs ${statusColor}`}
                  onClick={() => setLocation(`/action-plans?id=${ap.id}`)}
                    title={`${ap.code} - ${ap.status}`}
                >
                  {ap.code}
                </Badge>
                );
              })}
            </div>
          );
        }

        return (
          <div className="flex justify-center">
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-accent transition-colors text-xs"
              onClick={() => setLocation(`/action-plans?riskId=${risk.id}`)}
            >
              +{actionPlans.length} planes
            </Badge>
          </div>
        );
      },
      cellClassName: 'items-center',
      visible: visibleColumns.actionPlans,
    },
    {
      id: 'actions',
      header: <div className="text-center">Acciones</div>,
      width: '80px',
      minWidth: '80px',
      cell: (risk) => (
        <div className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                data-testid={`button-actions-${risk.id}`}
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Abrir menú de acciones</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setNeedsDetailedData(true); setViewingRisk(risk); }}>
                <Eye className="h-4 w-4 mr-2" />
                Ver Detalles
              </DropdownMenuItem>
              <EditGuard itemType="risk">
                <DropdownMenuItem onClick={() => { setNeedsDetailedData(true); setEditingRisk(risk); }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              </EditGuard>
              <DropdownMenuItem onClick={() => { setNeedsDetailedData(true); setControlsDialogRisk(risk); }}>
                <Shield className="h-4 w-4 mr-2" />
                Gestionar Controles
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation(`/action-plans?riskId=${risk.id}&mode=create`)}>
                <ClipboardList className="h-4 w-4 mr-2" />
                Crear Plan de Acción
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DeleteGuard itemType="risk">
                <DropdownMenuItem
                  onClick={() => handleDelete(risk)}
                  className="text-destructive"
                >
                  <X className="h-4 w-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DeleteGuard>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dialogs remain outside the dropdown */}
          <Dialog open={editingRisk?.id === risk.id} onOpenChange={(open) => {
            if (!open) {
              setEditingRisk(null);
            }
          }}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar Riesgo</DialogTitle>
                <DialogDescription>
                  Actualizar la información y evaluación de este riesgo.
                </DialogDescription>
              </DialogHeader>

              {editingRisk && (
                <Tabs defaultValue="edit" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="edit">Editar Información</TabsTrigger>
                    <TabsTrigger value="validation">Estado de Validación</TabsTrigger>
                  </TabsList>

                  <TabsContent value="edit">
                    <Suspense fallback={
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    }>
                      <RiskForm
                        risk={editingRisk}
                        onSuccess={handleEditSuccess}
                      />
                    </Suspense>
                  </TabsContent>

                  <TabsContent value="validation">
                    <RiskValidationStatus riskId={editingRisk.id} />
                  </TabsContent>
                </Tabs>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={controlsDialogRisk?.id === risk.id} onOpenChange={(open) => {
            if (!open) {
              setControlsDialogRisk(null);
              setControlSearchTerm("");
              setControlsPage(1);
            }
          }}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Gestionar Controles - {risk.name}</DialogTitle>
                <DialogDescription>
                  Asociar y gestionar controles para mitigar este riesgo.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Current Controls */}
                <div>
                  <h4 className="text-lg font-medium mb-3">Controles Asociados</h4>
                  {dialogRiskControls.length > 0 ? (
                    <div className="space-y-2">
                      {dialogRiskControls.filter(rc => rc && rc.control && rc.control.name).map((riskControl: any) => (
                        <div key={riskControl.id} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex-1">
                            <p className="font-medium">{riskControl.control.name}</p>
                            <p className="text-sm text-muted-foreground">{riskControl.control.description}</p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline">
                                Efectividad: {riskControl.control.effectiveness}%
                              </Badge>
                              <Badge className={getRiskColor(riskControl.residualRisk)}>
                                Riesgo Residual: <RiskValue value={riskControl.residualRisk} />
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveControl(riskControl.id)}
                            disabled={removeControlMutation.isPending}
                          >
                            {removeControlMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No hay controles asociados a este riesgo</p>
                  )}
                </div>

                {/* Available Controls */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-medium">Controles Disponibles</h4>
                    {controlsPagination && controlsPagination.total > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {controlsPagination.total} {controlsPagination.total === 1 ? 'control' : 'controles'} encontrado{controlsPagination.total === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>

                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Buscar por nombre o código del control..."
                      value={controlSearchTerm}
                      onChange={(e) => setControlSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {isControlsSummaryLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground">Cargando controles...</span>
                    </div>
                  ) : getAvailableControls().length > 0 ? (
                    <div className="space-y-2">
                      {getAvailableControls().map((control: any) => (
                        <div key={control.id} className="flex items-center justify-between p-3 border rounded">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-xs font-mono">
                                {control.code}
                              </Badge>
                              <p className="font-medium">{control.name}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">{control.description}</p>
                            <div className="flex gap-2 mt-1 flex-wrap">
                              <Badge variant="outline">
                                {translateControlType(control.type)}
                              </Badge>
                              <Badge variant="outline">
                                Efectividad: {control.effectiveness}%
                              </Badge>
                              <Badge className={getRiskColor(control.projectedResidualRisk)}>
                                Riesgo Residual Proyectado: {control.projectedResidualRisk.toFixed(1).replace('.', ',')}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleAddControl(control.id, control.effectiveness)}
                            disabled={addControlMutation.isPending}
                            size="sm"
                          >
                            {addControlMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Asociando...
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-2" />
                                Asociar
                              </>
                            )}
                          </Button>
                        </div>
                      ))}

                      {/* Pagination controls */}
                      {controlsPagination && controlsPagination.totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4 border-t mt-4">
                          <span className="text-sm text-muted-foreground">
                            Página {controlsPagination.page} de {controlsPagination.totalPages}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setControlsPage(p => Math.max(1, p - 1))}
                              disabled={controlsPagination.page <= 1 || isControlsSummaryLoading}
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Anterior
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setControlsPage(p => Math.min(controlsPagination.totalPages, p + 1))}
                              disabled={controlsPagination.page >= controlsPagination.totalPages || isControlsSummaryLoading}
                            >
                              Siguiente
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      {controlSearchTerm
                        ? "No se encontraron controles que coincidan con la búsqueda"
                        : "Todos los controles disponibles ya están asociados"}
                    </p>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ),
      cellClassName: 'items-center justify-center',
      visible: visibleColumns.actions,
    },
  ], [
    sortColumn,
    sortOrder,
    handleSort,
    setViewingRisk,
    setEditingRisk,
    handleDelete,
    deleteMutation,
    getResidualRisk,
    getControlCount,
    getValidationBadge,
    getRiskControls,
    getRiskActionPlans,
    riskCategories,
    allRiskProcessLinks,
    allRiskControls,
    allActionPlans,
    processes,
    subprocesos,
    macroprocesos,
    processOwners,
    visibleColumns,
  ]);

  // Columnas para vista básica - excluye proceso, responsable y validación
  // (esos datos requieren APIs adicionales que no se cargan en vista básica)
  // Filter columns based on visibility - heavy columns only shown if explicitly enabled
  const visibleColumnsList = columns.filter(col => col.visible !== false);

  return (
    <div className="@container h-full flex flex-col p-4 @md:p-8 pt-6 gap-2" data-testid="risks-content" role="region" aria-label="Gestión de Riesgos">
      <h1 id="risks-page-title" className="sr-only">Riesgos</h1>

      {/* Search term display */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div className="flex-1 flex justify-end">
          {searchTerm && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary" className="gap-1">
                Búsqueda: "{searchTerm}"
                <button
                  onClick={() => setFilters(prev => ({ ...prev, search: "" }))}
                  className="ml-1 hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
              <span>({filteredRisks.length} resultados)</span>
            </div>
          )}
        </div>
      </div>

      {/* Optimized risk table - fast loading */}
      {(isInitialLoad && isBootstrapLoading) ? (
        <Card className="flex-1 flex flex-col">
          <CardContent className="p-4">
            <RisksPageSkeleton />
          </CardContent>
        </Card>
      ) : (
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardContent className="p-0 h-full flex flex-col">
            <div className="flex-1 overflow-hidden h-full">
              <VirtualizedTable
                data={displayData}
                columns={visibleColumnsList}
                estimatedRowHeight={65}
                overscan={5}
                getRowKey={(risk) => risk.id}
                isLoading={isLoading}
                ariaLabel="Tabla de riesgos"
                ariaDescribedBy="risks-table-description"
              />
              <div id="risks-table-description" className="sr-only">
                Tabla con {displayData.length} riesgos. Use las flechas del teclado para navegar entre filas, Enter o Espacio para seleccionar.
              </div>
            </div>

            {/* Pagination controls */}
            {!testMode50k && bootstrapData?.risks?.pagination && bootstrapData.risks.pagination.total > 0 && (
              <div className="border-t px-4 py-2 flex items-center justify-between text-[15px] shrink-0">
                <div className="text-sm text-muted-foreground">
                  Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, bootstrapData.risks.pagination.total)} de {bootstrapData.risks.pagination.total} riesgos
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

            {displayData.length === 0 && !testMode50k && (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No se encontraron riesgos</p>
                <CreateGuard itemType="risk" showFallback={false}>
                  <Dialog open={isCreateDialogOpen} onOpenChange={handleCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-create-first-risk">
                        <Plus className="mr-2 h-4 w-4" />
                        Crear Primer Riesgo
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <DialogTitle>Nuevo Riesgo</DialogTitle>
                            <DialogDescription>
                              Registrar un nuevo riesgo en el sistema con su evaluación correspondiente.
                            </DialogDescription>
                          </div>
                          <SpecializedAIButton
                            area="risk"
                            buttonText="Ayuda IA"
                            buttonVariant="ghost"
                            buttonSize="sm"
                          />
                        </div>
                      </DialogHeader>
                      <Suspense fallback={
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                      }>
                        <RiskForm onSuccess={handleCreateSuccess} />
                      </Suspense>
                    </DialogContent>
                  </Dialog>
                </CreateGuard>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Diálogo de detalles del riesgo */}
      <Dialog open={!!viewingRisk} onOpenChange={(open) => !open && setViewingRisk(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Detalles del Riesgo - {viewingRisk?.code}</DialogTitle>
            <DialogDescription>
              Información completa del riesgo {viewingRisk?.code}
            </DialogDescription>
          </DialogHeader>
          {viewingRisk && (() => {
            // Calculate risk values outside of JSX
            const inherentRisk = viewingRisk.inherentRisk || (viewingRisk.probability * viewingRisk.impact);
            const riskControls = getRiskControls(viewingRisk.id);
            const residualRisk = riskControls.length > 0
              ? Math.min(...riskControls.map((rc: any) => rc.residualRisk || inherentRisk))
              : inherentRisk;

            return (
              <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
                <TabsList>
                  <TabsTrigger value="details">Detalles</TabsTrigger>
                  <TabsTrigger value="validations">Historial de Validaciones</TabsTrigger>
                  <TabsTrigger value="history">Historial de Cambios</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="flex-1 overflow-y-auto mt-4">
                  <div className="space-y-6">
                    {/* Información básica */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Código</Label>
                        <p className="text-sm mt-1">{viewingRisk.code}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Categoría</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Array.isArray(viewingRisk.category) ? viewingRisk.category.map((categoryName: string) => (
                            <Badge
                              key={categoryName}
                              className="text-xs"
                              style={{
                                backgroundColor: categoryColorMap[categoryName] || '#6b7280',
                                color: "white"
                              }}
                            >
                              {categoryName}
                            </Badge>
                          )) : (
                            <Badge 
                              className="text-xs"
                              style={{
                                backgroundColor: categoryColorMap[viewingRisk.category as string] || '#6b7280',
                                color: "white"
                              }}
                            >
                              {viewingRisk.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-sm font-medium text-muted-foreground">Nombre del Riesgo</Label>
                        <p className="text-sm mt-1">{viewingRisk.name}</p>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-sm font-medium text-muted-foreground">Descripción</Label>
                        <p className="text-sm mt-1">{viewingRisk.description}</p>
                      </div>
                    </div>

                    <Separator />

                    {/* Evaluación del riesgo - 3 bloques horizontales */}
                    <div>
                      <h3 className="text-sm font-semibold mb-4">Evaluación del Riesgo</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Bloque 1: Riesgo Inherente */}
                        <Card className="border-blue-200 dark:border-blue-800">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Riesgo Inherente</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Método de evaluación */}
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">Método de Evaluación</Label>
                              <div className="mt-1">
                                {(() => {
                                  const hasFactors = viewingRisk.frequencyOccurrence !== undefined ||
                                    viewingRisk.exposureVolume !== undefined ||
                                    viewingRisk.exposureMassivity !== undefined ||
                                    viewingRisk.exposureCriticalPath !== undefined ||
                                    viewingRisk.complexity !== undefined ||
                                    viewingRisk.changeVolatility !== undefined ||
                                    viewingRisk.vulnerabilities !== undefined;

                                  const evaluatedByFactors = hasFactors && (
                                    (viewingRisk.frequencyOccurrence && viewingRisk.frequencyOccurrence !== 3) ||
                                    (viewingRisk.exposureVolume && viewingRisk.exposureVolume !== 3) ||
                                    (viewingRisk.exposureMassivity && viewingRisk.exposureMassivity !== 3) ||
                                    (viewingRisk.exposureCriticalPath && viewingRisk.exposureCriticalPath !== 3) ||
                                    (viewingRisk.complexity && viewingRisk.complexity !== 3) ||
                                    (viewingRisk.changeVolatility && viewingRisk.changeVolatility !== 3) ||
                                    (viewingRisk.vulnerabilities && viewingRisk.vulnerabilities !== 3)
                                  );

                                  return (
                                    <Badge variant={evaluatedByFactors ? "default" : "secondary"} className="text-xs">
                                      {evaluatedByFactors ? "📊 Evaluación por Factores" : "✏️ Evaluación Directa"}
                                    </Badge>
                                  );
                                })()}
                              </div>
                            </div>

                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">Probabilidad</Label>
                              <p className="text-2xl font-bold mt-1">{viewingRisk.probability}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">Impacto</Label>
                              <p className="text-2xl font-bold mt-1">{viewingRisk.impact}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">Riesgo Inherente</Label>
                              <div className="mt-1">
                                <Badge className={`${getRiskColor(inherentRisk)} text-lg px-4 py-2`}>
                                  {inherentRisk}
                                </Badge>
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">Nivel</Label>
                              <div className="mt-1">
                                <Badge className={`${getRiskColor(inherentRisk)} text-xs`}>
                                  {getRiskLevelText(inherentRisk)}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Bloque 2: Riesgo Residual */}
                        <Card className="border-green-200 dark:border-green-800">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Riesgo Residual</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">Riesgo Residual</Label>
                              <div className="mt-1">
                                <Badge className={`${getRiskColor(residualRisk)} text-lg px-4 py-2`}>
                                  {residualRisk.toFixed(1)}
                                </Badge>
                              </div>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">Reducción del Riesgo</Label>
                              <p className="text-xl font-semibold text-green-600 mt-1">
                                {((inherentRisk - residualRisk) / inherentRisk * 100).toFixed(0)}%
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">Controles Activos</Label>
                              <p className="text-xl font-semibold mt-1">
                                {riskControls.length}
                              </p>
                            </div>
                            <div className="pt-2 border-t">
                              <Label className="text-xs font-medium text-muted-foreground block mb-1">Cálculo:</Label>
                              <p className="text-xs text-muted-foreground">
                                Residual = Inherente × (1 - Efectividad/100)
                              </p>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Bloque 3: Matriz Visual */}
                        <Card className="border-purple-200 dark:border-purple-800">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Matriz de Riesgo</CardTitle>
                          </CardHeader>
                          <CardContent className="flex flex-col items-center">
                            <div className="inline-block border rounded-lg overflow-hidden">
                              <div className="grid grid-cols-5 gap-0">
                                {(() => {
                                  // Encontrar la celda más cercana al riesgo residual
                                  let closestCell = { prob: 1, imp: 1, diff: Infinity };
                                  for (let p = 1; p <= 5; p++) {
                                    for (let i = 1; i <= 5; i++) {
                                      const diff = Math.abs(p * i - residualRisk);
                                      if (diff < closestCell.diff) {
                                        closestCell = { prob: p, imp: i, diff };
                                      }
                                    }
                                  }

                                  return [5, 4, 3, 2, 1].flatMap((prob) => (
                                    [1, 2, 3, 4, 5].map((imp) => {
                                      const cellValue = prob * imp;
                                      const isInherent = viewingRisk.probability === prob && viewingRisk.impact === imp;
                                      const isResidual = closestCell.prob === prob && closestCell.imp === imp;

                                      return (
                                        <div
                                          key={`${prob}-${imp}`}
                                          className={`
                                      w-10 h-10 flex items-center justify-center text-xs font-medium border-r border-b border-muted-foreground/20
                                      ${cellValue <= 6 ? 'bg-green-500/30' :
                                              cellValue <= 12 ? 'bg-yellow-500/30' :
                                                cellValue <= 16 ? 'bg-orange-500/30' :
                                                  'bg-red-500/30'}
                                    `}
                                          title={`P${prob} × I${imp} = ${cellValue}`}
                                        >
                                          <div className="flex gap-0.5">
                                            {isInherent && <span className="text-blue-600 font-bold text-base leading-none">●</span>}
                                            {isResidual && <span className="text-green-600 font-bold text-base leading-none">●</span>}
                                          </div>
                                        </div>
                                      );
                                    })
                                  ));
                                })()}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-xs">
                              <div className="flex items-center gap-1">
                                <span className="text-blue-600 font-bold text-sm">●</span>
                                <span className="text-muted-foreground">Inherente</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-green-600 font-bold text-sm">●</span>
                                <span className="text-muted-foreground">Residual</span>
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground flex gap-2 flex-wrap justify-center">
                              <div className="flex items-center gap-1">
                                <div className="w-2.5 h-2.5 rounded bg-green-500/30"></div>
                                <span>Bajo</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-2.5 h-2.5 rounded bg-yellow-500/30"></div>
                                <span>Medio</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-2.5 h-2.5 rounded bg-orange-500/30"></div>
                                <span>Alto</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-2.5 h-2.5 rounded bg-red-500/30"></div>
                                <span>Crítico</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    <Separator />

                    {/* Factores de Evaluación - Solo si fue evaluado por factores */}
                    {(() => {
                      const hasFactors = viewingRisk.frequencyOccurrence !== undefined ||
                        viewingRisk.exposureVolume !== undefined ||
                        viewingRisk.exposureMassivity !== undefined ||
                        viewingRisk.exposureCriticalPath !== undefined ||
                        viewingRisk.complexity !== undefined ||
                        viewingRisk.changeVolatility !== undefined ||
                        viewingRisk.vulnerabilities !== undefined;

                      const evaluatedByFactors = hasFactors && (
                        (viewingRisk.frequencyOccurrence && viewingRisk.frequencyOccurrence !== 3) ||
                        (viewingRisk.exposureVolume && viewingRisk.exposureVolume !== 3) ||
                        (viewingRisk.exposureMassivity && viewingRisk.exposureMassivity !== 3) ||
                        (viewingRisk.exposureCriticalPath && viewingRisk.exposureCriticalPath !== 3) ||
                        (viewingRisk.complexity && viewingRisk.complexity !== 3) ||
                        (viewingRisk.changeVolatility && viewingRisk.changeVolatility !== 3) ||
                        (viewingRisk.vulnerabilities && viewingRisk.vulnerabilities !== 3)
                      );

                      if (!evaluatedByFactors) return null;

                      return (
                        <>
                          <div>
                            <h3 className="text-sm font-semibold mb-3">Factores de Evaluación</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <Card>
                                <CardContent className="pt-4">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-muted-foreground">Frecuencia de Ocurrencia</Label>
                                    <Badge variant="outline" className="text-sm">
                                      {viewingRisk.frequencyOccurrence || 3}
                                    </Badge>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card>
                                <CardContent className="pt-4">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-muted-foreground">Volumen de Exposición</Label>
                                    <Badge variant="outline" className="text-sm">
                                      {viewingRisk.exposureVolume || 3}
                                    </Badge>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card>
                                <CardContent className="pt-4">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-muted-foreground">Masividad de Exposición</Label>
                                    <Badge variant="outline" className="text-sm">
                                      {viewingRisk.exposureMassivity || 3}
                                    </Badge>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card>
                                <CardContent className="pt-4">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-muted-foreground">Ruta Crítica de Exposición</Label>
                                    <Badge variant="outline" className="text-sm">
                                      {viewingRisk.exposureCriticalPath || 3}
                                    </Badge>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card>
                                <CardContent className="pt-4">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-muted-foreground">Complejidad</Label>
                                    <Badge variant="outline" className="text-sm">
                                      {viewingRisk.complexity || 3}
                                    </Badge>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card>
                                <CardContent className="pt-4">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-muted-foreground">Volatilidad del Cambio</Label>
                                    <Badge variant="outline" className="text-sm">
                                      {viewingRisk.changeVolatility || 3}
                                    </Badge>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card>
                                <CardContent className="pt-4">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-muted-foreground">Vulnerabilidades</Label>
                                    <Badge variant="outline" className="text-sm">
                                      {viewingRisk.vulnerabilities || 3}
                                    </Badge>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </div>

                          <Separator />
                        </>
                      );
                    })()}

                    {/* Mapa de relaciones */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3">Mapa de Relaciones</h3>
                      <div className="h-[600px] border rounded-lg">
                        <Suspense fallback={
                          <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                          </div>
                        }>
                          <RiskRelationshipMap
                            risk={viewingRisk}
                            macroprocesos={macroprocesos}
                            processes={processes}
                            subprocesos={subprocesos}
                            riskControls={allRiskControls.filter((rc: any) => rc.riskId === viewingRisk.id)}
                            riskEvents={Array.isArray(viewingRiskEvents) ? viewingRiskEvents : []}
                            riskProcessLinks={allRiskProcessLinks.filter((link: any) => link.riskId === viewingRisk.id)}
                          />
                        </Suspense>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setViewingRisk(null)}>
                        Cerrar
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="validations" className="flex-1 overflow-y-auto mt-4">
                  <RiskValidationHistory riskId={viewingRisk.id} riskCode={viewingRisk.code} riskName={viewingRisk.name} />
                </TabsContent>

                <TabsContent value="history" className="flex-1 overflow-y-auto mt-4">
                  <Suspense fallback={
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  }>
                    <AuditHistory
                      entityType="risk"
                      entityId={viewingRisk.id}
                      maxHeight="500px"
                    />
                  </Suspense>
                </TabsContent>
              </Tabs>
            );
          })()}
        </DialogContent>
      </Dialog>
      {/* Dialog de configuración de columnas */}
      <Dialog open={configureColumnsOpen} onOpenChange={setConfigureColumnsOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Configurar Columnas</DialogTitle>
            <DialogDescription>
              Selecciona las columnas que deseas mostrar en la tabla de riesgos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto max-h-[60vh]">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="col-code"
                checked={visibleColumns.code}
                onCheckedChange={(checked) =>
                  setVisibleColumns({ ...visibleColumns, code: checked as boolean })
                }
              />
              <label
                htmlFor="col-code"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Código
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="col-name"
                checked={visibleColumns.name}
                onCheckedChange={(checked) =>
                  setVisibleColumns({ ...visibleColumns, name: checked as boolean })
                }
              />
              <label
                htmlFor="col-name"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Riesgo (Nombre y descripción)
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="col-evaluationMethod"
                checked={visibleColumns.evaluationMethod}
                onCheckedChange={(checked) =>
                  setVisibleColumns({ ...visibleColumns, evaluationMethod: checked as boolean })
                }
              />
              <label
                htmlFor="col-evaluationMethod"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Método de Evaluación
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="col-probability"
                checked={visibleColumns.probability}
                onCheckedChange={(checked) =>
                  setVisibleColumns({ ...visibleColumns, probability: checked as boolean })
                }
              />
              <label
                htmlFor="col-probability"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Probabilidad
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="col-impact"
                checked={visibleColumns.impact}
                onCheckedChange={(checked) =>
                  setVisibleColumns({ ...visibleColumns, impact: checked as boolean })
                }
              />
              <label
                htmlFor="col-impact"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Impacto
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="col-inherent"
                checked={visibleColumns.inherent}
                onCheckedChange={(checked) =>
                  setVisibleColumns({ ...visibleColumns, inherent: checked as boolean })
                }
              />
              <label
                htmlFor="col-inherent"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Riesgo Inherente
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="col-residual"
                checked={visibleColumns.residual}
                onCheckedChange={(checked) =>
                  setVisibleColumns({ ...visibleColumns, residual: checked as boolean })
                }
              />
              <label
                htmlFor="col-residual"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Riesgo Residual
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="col-process"
                checked={visibleColumns.process}
                onCheckedChange={(checked) =>
                  setVisibleColumns({ ...visibleColumns, process: checked as boolean })
                }
              />
              <label
                htmlFor="col-process"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Proceso
              </label>
            </div>



            <div className="flex items-center space-x-2">
              <Checkbox
                id="col-validation"
                checked={visibleColumns.validation}
                onCheckedChange={(checked) =>
                  setVisibleColumns({ ...visibleColumns, validation: checked as boolean })
                }
              />
              <label
                htmlFor="col-validation"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Validación
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="col-status"
                checked={visibleColumns.status}
                onCheckedChange={(checked) =>
                  setVisibleColumns({ ...visibleColumns, status: checked as boolean })
                }
              />
              <label
                htmlFor="col-status"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Controles
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="col-actions"
                checked={visibleColumns.actions}
                onCheckedChange={(checked) =>
                  setVisibleColumns({ ...visibleColumns, actions: checked as boolean })
                }
              />
              <label
                htmlFor="col-actions"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Acciones
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setVisibleColumns({
                  code: true,
                  name: true,
                  probabilityImpact: true,
                  inherent: true,
                  residual: true,
                  process: true,
                  validation: true,
                  status: true,
                  actions: true
                });
              }}
            >
              Mostrar todas
            </Button>
            <Button onClick={() => setConfigureColumnsOpen(false)}>
              Aplicar
            </Button>
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
              savedViews.filter(view => view && view.id && view.name).map((view) => (
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
      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={!!deleteConfirmRisk} onOpenChange={(open) => !open && cancelDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar riesgo?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmRisk && (
                <>
                  El riesgo <strong>{deleteConfirmRisk.code}: {deleteConfirmRisk.name}</strong> será movido a la papelera.
                  Podrá restaurarlo desde la sección de Papelera si lo necesita más adelante.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="deletion-reason" className="text-sm font-medium">
              Motivo de eliminación <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="deletion-reason"
              data-testid="input-deletion-reason"
              placeholder="Ingrese el motivo por el cual está eliminando este riesgo..."
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Este motivo será registrado en el historial de auditoría.
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
