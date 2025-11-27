import { useLocation } from "wouter";
import { Search, Plus, Download, SlidersHorizontal, X, Menu, Calendar, AlertTriangle, ChevronDown, MoreVertical, RefreshCw, Settings, Filter, Eye, Clock, Sun, Moon, BarChart3, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Combobox } from "@/components/ui/combobox";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "@/contexts/SearchContext";
import RiskForm from "@/components/forms/risk-form";
import ControlForm from "@/components/forms/control-form";
import MacroprocesoForm from "@/components/forms/macroproceso-form";
import RegulationForm from "@/components/forms/regulation-form";
import ActionPlanForm from "@/components/forms/action-plan-form";
import RiskEventForm from "@/components/forms/risk-event-form";
import { UserForm } from "@/components/forms/user-form";
import ComplianceDocumentForm from "@/components/forms/compliance-document-form";
import AIAssistantDialog from "@/components/ai-assistant-lazy";
import { CreateGuard } from "@/components/auth/permission-guard";
import { RiskSearchAndFilterDialog } from "@/components/RiskSearchAndFilterDialog";
import { ControlSearchAndFilterDialog } from "@/components/ControlSearchAndFilterDialog";
import { AuditPlanSearchAndFilterDialog } from "@/components/AuditPlanSearchAndFilterDialog";
import { AuditFindingsSearchAndFilterDialog } from "@/components/AuditFindingsSearchAndFilterDialog";
import { useTheme } from "@/hooks/use-theme";
import { useExcelExport } from "@/hooks/useExcelExport";
import ExcelJS from 'exceljs';
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { pageTitles, UserMenu, type HeaderProps } from "@/components/layout/header-parts";
import type { 
  Risk, 
  Process, 
  Macroproceso, 
  Subproceso, 
  User, 
  AuditPlan,
  Audit, 
  Regulation,
  Role,
  RiskProcessLink,
  Control
} from "@shared/schema";

export default function Header({ isMobile = false, onToggleMobileSidebar, onToggleDesktopSidebar, isDesktopSidebarCollapsed }: HeaderProps) {
  const [location, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  
  // Handle dynamic routes
  let currentPage = pageTitles[location as keyof typeof pageTitles];
  const isAuditDetailPage = location.startsWith('/audits/') && location !== '/audits';
  
  if (!currentPage) {
    if (location.includes('/create-test')) {
      currentPage = { title: "Crear Prueba de Auditoría", subtitle: "Define una nueva prueba para auditoría" };
    } else if (location.startsWith('/audit-test/')) {
      currentPage = { title: "Detalle de Prueba de Auditoría", subtitle: "Gestión y seguimiento de prueba" };
    } else if (isAuditDetailPage) {
      currentPage = { title: "", subtitle: "" }; // Empty for audit detail pages - tabs will be shown instead
    } else {
      currentPage = { title: "", subtitle: "" };
    }
  }
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isComplianceAuditDialogOpen, setIsComplianceAuditDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isComplianceDocumentDialogOpen, setIsComplianceDocumentDialogOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { exportToExcel: exportToExcelHook } = useExcelExport();
  const { triggerSearch } = useSearch();
  const queryClient = useQueryClient();

  // Risk filters state (only for risks page)
  const [macroprocesoFilter, setMacroprocesoFilter] = useState("all");
  const [processFilter, setProcessFilter] = useState("all");
  const [subprocesoFilter, setSubprocesoFilter] = useState("all");
  const [inherentRiskLevelFilter, setInherentRiskLevelFilter] = useState("all");
  const [residualRiskLevelFilter, setResidualRiskLevelFilter] = useState("all");
  const [validationFilter, setValidationFilter] = useState("all");
  const [riskOwnerFilter, setRiskOwnerFilter] = useState("all");

  // Risk Validation filters state (only for validation page)
  const [validationStatusFilter, setValidationStatusFilter] = useState("all");
  const [validationOwnerFilter, setValidationOwnerFilter] = useState("all");
  const [validationMacroprocesoFilter, setValidationMacroprocesoFilter] = useState("all");
  const [validationProcessFilter, setValidationProcessFilter] = useState("all");
  const [validationRiskLevelFilter, setValidationRiskLevelFilter] = useState("all");

  // Controls filters state (only for controls page)
  const [controlSearchTerm, setControlSearchTerm] = useState("");
  const [controlTypeFilter, setControlTypeFilter] = useState("all");
  const [controlEffectivenessFilter, setControlEffectivenessFilter] = useState("all");
  const [controlStatusFilter, setControlStatusFilter] = useState("all");
  const [controlValidationStatusFilter, setControlValidationStatusFilter] = useState("all");
  const [controlResponsibleFilter, setControlResponsibleFilter] = useState("all");

  // Action Plans filters state (only for actions page)
  const [actionStatusFilter, setActionStatusFilter] = useState("all");
  const [actionPriorityFilter, setActionPriorityFilter] = useState("all");
  const [actionTypeFilter, setActionTypeFilter] = useState("all");
  const [actionOriginFilter, setActionOriginFilter] = useState("all");

  // Audits filters state (only for audits page)
  const [auditStatusFilter, setAuditStatusFilter] = useState("all");
  const [auditTypeFilter, setAuditTypeFilter] = useState("all");
  const [auditPlanFilter, setAuditPlanFilter] = useState("all");

  // Regulations filters state (only for regulations page)
  const [regulationCriticalityFilter, setRegulationCriticalityFilter] = useState("all");
  const [regulationSourceFilter, setRegulationSourceFilter] = useState("all");
  const [regulationStatusFilter, setRegulationStatusFilter] = useState("all");
  const [regulationRiskLevelFilter, setRegulationRiskLevelFilter] = useState("all");
  const [regulationIssuingOrgFilter, setRegulationIssuingOrgFilter] = useState("all");

  // Risk Events filters state (only for risk-events page)
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [eventStatusFilter, setEventStatusFilter] = useState("all");
  const [eventSeverityFilter, setEventSeverityFilter] = useState("all");
  const [eventProcessFilter, setEventProcessFilter] = useState("all");

  // Risk Matrix filters state (only for matrix page)
  const [matrixProcessFilter, setMatrixProcessFilter] = useState("all");
  const [matrixGerenciaFilter, setMatrixGerenciaFilter] = useState("all");

  // Audit Plan filters state (only for audit-plan-list page)
  const [auditPlanStatusFilter, setAuditPlanStatusFilter] = useState("all");
  const [auditPlanYearFilter, setAuditPlanYearFilter] = useState("all");

  // Audit Findings filters state (only for audit-findings page)
  const [findingStatusFilter, setFindingStatusFilter] = useState("all");
  const [findingSeverityFilter, setFindingSeverityFilter] = useState("all");
  const [findingTypeFilter, setFindingTypeFilter] = useState("all");
  const [findingAuditFilter, setFindingAuditFilter] = useState("all");

  // Common data queries (used by multiple filter sections)
  const { data: processes = [] } = useQuery<Process[]>({
    queryKey: ["/api/processes"],
    enabled: location === "/risks" || location === "/validation"
  });

  const { data: macroprocesos = [] } = useQuery<Macroproceso[]>({
    queryKey: ["/api/macroprocesos"],
    enabled: location === "/risks" || location === "/validation"
  });

  const { data: subprocesos = [] } = useQuery<Subproceso[]>({
    queryKey: ["/api/subprocesos"],
    enabled: location === "/risks" || location === "/validation"
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: location === "/validation"
  });

  const { data: processOwners = [] } = useQuery<any[]>({
    queryKey: ["/api/process-owners"],
    enabled: location === "/validation" || location === "/risks"
  });

  const { data: gerencias = [] } = useQuery<any[]>({
    queryKey: ["/api/gerencias"],
    enabled: location === "/risks"
  });

  const { data: auditPlans = [] } = useQuery<AuditPlan[]>({
    queryKey: ["/api/audit-plans"],
    enabled: location === "/audits"
  });

  const { data: audits = [] } = useQuery<Audit[]>({
    queryKey: ["/api/audits"],
    enabled: location === "/audits",
    select: (data: any) => data.data || []
  });

  const { data: regulations = [] } = useQuery<Regulation[]>({
    queryKey: ["/api/regulations"],
    enabled: location === "/regulations"
  });

  const { data: riskEventProcesses = [] } = useQuery<Process[]>({
    queryKey: ["/api/processes"],
    enabled: location === "/risk-events"
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
    enabled: location === "/config/users"
  });

  // Risk Matrix data queries
  const { data: matrixGerencias = [] } = useQuery<any[]>({
    queryKey: ["/api/gerencias"],
    enabled: location === "/matrix"
  });

  const { data: matrixMacroprocesos = [] } = useQuery<any[]>({
    queryKey: ["/api/macroprocesos"],
    enabled: location === "/matrix"
  });

  const { data: matrixProcesses = [] } = useQuery<any[]>({
    queryKey: ["/api/processes"],
    enabled: location === "/matrix"
  });

  // Risks page data (for export functionality)
  const { data: risksResponse } = useQuery<{ data: Risk[], pagination: any }>({
    queryKey: ["/api/risks"],
    enabled: location === "/risks"
  });
  const allRisks = risksResponse?.data || [];

  const { data: riskProcessLinks = [] } = useQuery<RiskProcessLink[]>({
    queryKey: ["/api/risk-processes"],
    enabled: location === "/risks"
  });

  const { data: allRiskControls = [] } = useQuery<any[]>({
    queryKey: ["/api/risk-controls-with-details"],
    enabled: location === "/risks"
  });

  // Reset filters when changing pages
  useEffect(() => {
    if (location !== "/risks") {
      setMacroprocesoFilter("all");
      setProcessFilter("all");
      setSubprocesoFilter("all");
      setInherentRiskLevelFilter("all");
      setResidualRiskLevelFilter("all");
      setValidationFilter("all");
    }
    if (location !== "/validation") {
      setValidationStatusFilter("all");
      setValidationOwnerFilter("all");
      setValidationMacroprocesoFilter("all");
      setValidationProcessFilter("all");
      setValidationRiskLevelFilter("all");
    }
    if (location !== "/controls") {
      setControlSearchTerm("");
      setControlTypeFilter("all");
      setControlEffectivenessFilter("all");
      setControlStatusFilter("all");
    }
    if (location !== "/actions") {
      setActionStatusFilter("all");
      setActionPriorityFilter("all");
      setActionTypeFilter("all");
    }
    if (location !== "/audits") {
      setAuditStatusFilter("all");
      setAuditTypeFilter("all");
      setAuditPlanFilter("all");
    }
    if (location !== "/regulations") {
      setRegulationCriticalityFilter("all");
      setRegulationSourceFilter("all");
      setRegulationStatusFilter("all");
      setRegulationRiskLevelFilter("all");
      setRegulationIssuingOrgFilter("all");
    }
    if (location !== "/risk-events") {
      setEventTypeFilter("all");
      setEventStatusFilter("all");
      setEventSeverityFilter("all");
      setEventProcessFilter("all");
    }
    if (location !== "/audit-findings") {
      setFindingStatusFilter("all");
      setFindingSeverityFilter("all");
      setFindingTypeFilter("all");
      setFindingAuditFilter("all");
    }
  }, [location]);

  // Listen for validation filter changes from the page
  useEffect(() => {
    const handlePageStatusFilterChanged = (event: any) => {
      const { statusFilter } = event.detail;
      if (statusFilter !== undefined) {
        setValidationStatusFilter(statusFilter);
      }
    };

    const handlePageOwnerFilterChanged = (event: any) => {
      const { ownerFilter } = event.detail;
      if (ownerFilter !== undefined) {
        setValidationOwnerFilter(ownerFilter);
      }
    };

    window.addEventListener('pageStatusFilterChanged', handlePageStatusFilterChanged);
    window.addEventListener('pageOwnerFilterChanged', handlePageOwnerFilterChanged);
    return () => {
      window.removeEventListener('pageStatusFilterChanged', handlePageStatusFilterChanged);
      window.removeEventListener('pageOwnerFilterChanged', handlePageOwnerFilterChanged);
    };
  }, []);

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    // Invalidate queries to refresh data without full page reload
    queryClient.invalidateQueries({ queryKey: ["/api/risk-events"] });
    queryClient.invalidateQueries({ queryKey: ["/api/risks"] });
    queryClient.invalidateQueries({ queryKey: ["/api/controls"] });
    queryClient.invalidateQueries({ queryKey: ["/api/macroprocesos"] });
    queryClient.invalidateQueries({ queryKey: ["/api/processes"] });
    queryClient.invalidateQueries({ queryKey: ["/api/regulations"] });
    queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
  };

  // Risk filters logic
  const filteredProcesses = macroprocesoFilter === "all" 
    ? processes 
    : processes.filter((process: any) => process.macroprocesoId === macroprocesoFilter);

  const filteredSubprocesos = (() => {
    let filtered = subprocesos;
    
    if (processFilter !== "all") {
      filtered = filtered.filter((subproceso: any) => subproceso.procesoId === processFilter);
    } else if (macroprocesoFilter !== "all") {
      const processIdsInMacroproceso = filteredProcesses.map((p: any) => p.id);
      filtered = filtered.filter((subproceso: any) => processIdsInMacroproceso.includes(subproceso.procesoId));
    }
    
    return filtered;
  })();

  // Risk Validation filters logic
  const validationFilteredProcesses = validationMacroprocesoFilter === "all" 
    ? processes 
    : processes.filter((process: any) => process.macroprocesoId === validationMacroprocesoFilter);

  // Risk filter handlers
  const handleMacroprocesoFilterChange = (value: string) => {
    setMacroprocesoFilter(value);
    setProcessFilter("all");
    setSubprocesoFilter("all");
    // Trigger filter change event for risks page
    window.dispatchEvent(new CustomEvent('riskFiltersChanged', {
      detail: { macroprocesoFilter: value, processFilter: "all", subprocesoFilter: "all", inherentRiskLevelFilter, residualRiskLevelFilter, validationFilter, ownerFilter: riskOwnerFilter }
    }));
  };

  const handleProcessFilterChange = (value: string) => {
    setProcessFilter(value);
    setSubprocesoFilter("all");
    window.dispatchEvent(new CustomEvent('riskFiltersChanged', {
      detail: { macroprocesoFilter, processFilter: value, subprocesoFilter: "all", inherentRiskLevelFilter, residualRiskLevelFilter, validationFilter, ownerFilter: riskOwnerFilter }
    }));
  };

  const handleSubprocesoFilterChange = (value: string) => {
    setSubprocesoFilter(value);
    window.dispatchEvent(new CustomEvent('riskFiltersChanged', {
      detail: { macroprocesoFilter, processFilter, subprocesoFilter: value, inherentRiskLevelFilter, residualRiskLevelFilter, validationFilter, ownerFilter: riskOwnerFilter }
    }));
  };

  const handleInherentRiskLevelFilterChange = (value: string) => {
    setInherentRiskLevelFilter(value);
    window.dispatchEvent(new CustomEvent('riskFiltersChanged', {
      detail: { macroprocesoFilter, processFilter, subprocesoFilter, inherentRiskLevelFilter: value, residualRiskLevelFilter, validationFilter, ownerFilter: riskOwnerFilter }
    }));
  };

  const handleResidualRiskLevelFilterChange = (value: string) => {
    setResidualRiskLevelFilter(value);
    window.dispatchEvent(new CustomEvent('riskFiltersChanged', {
      detail: { macroprocesoFilter, processFilter, subprocesoFilter, inherentRiskLevelFilter, residualRiskLevelFilter: value, validationFilter, ownerFilter: riskOwnerFilter }
    }));
  };

  const handleValidationFilterChange = (value: string) => {
    setValidationFilter(value);
    window.dispatchEvent(new CustomEvent('riskFiltersChanged', {
      detail: { macroprocesoFilter, processFilter, subprocesoFilter, inherentRiskLevelFilter, residualRiskLevelFilter, validationFilter: value, ownerFilter: riskOwnerFilter }
    }));
  };

  const handleRiskOwnerFilterChange = (value: string) => {
    setRiskOwnerFilter(value);
    window.dispatchEvent(new CustomEvent('riskFiltersChanged', {
      detail: { macroprocesoFilter, processFilter, subprocesoFilter, inherentRiskLevelFilter, residualRiskLevelFilter, validationFilter, ownerFilter: value }
    }));
  };


  // Risk Validation filter handlers
  const handleValidationStatusFilterChange = (value: string) => {
    setValidationStatusFilter(value);
    window.dispatchEvent(new CustomEvent('validationFiltersChanged', {
      detail: { statusFilter: value, ownerFilter: validationOwnerFilter, macroprocesoFilter: validationMacroprocesoFilter, processFilter: validationProcessFilter, riskLevelFilter: validationRiskLevelFilter }
    }));
  };

  const handleValidationOwnerFilterChange = (value: string) => {
    setValidationOwnerFilter(value);
    window.dispatchEvent(new CustomEvent('validationFiltersChanged', {
      detail: { statusFilter: validationStatusFilter, ownerFilter: value, macroprocesoFilter: validationMacroprocesoFilter, processFilter: validationProcessFilter, riskLevelFilter: validationRiskLevelFilter }
    }));
  };

  const handleValidationMacroprocesoFilterChange = (value: string) => {
    setValidationMacroprocesoFilter(value);
    setValidationProcessFilter("all");
    window.dispatchEvent(new CustomEvent('validationFiltersChanged', {
      detail: { statusFilter: validationStatusFilter, ownerFilter: validationOwnerFilter, macroprocesoFilter: value, processFilter: "all", riskLevelFilter: validationRiskLevelFilter }
    }));
  };

  const handleValidationProcessFilterChange = (value: string) => {
    setValidationProcessFilter(value);
    window.dispatchEvent(new CustomEvent('validationFiltersChanged', {
      detail: { statusFilter: validationStatusFilter, ownerFilter: validationOwnerFilter, macroprocesoFilter: validationMacroprocesoFilter, processFilter: value, riskLevelFilter: validationRiskLevelFilter }
    }));
  };

  const handleValidationRiskLevelFilterChange = (value: string) => {
    setValidationRiskLevelFilter(value);
    window.dispatchEvent(new CustomEvent('validationFiltersChanged', {
      detail: { statusFilter: validationStatusFilter, ownerFilter: validationOwnerFilter, macroprocesoFilter: validationMacroprocesoFilter, processFilter: validationProcessFilter, riskLevelFilter: value }
    }));
  };

  // Controls filter handlers
  const handleControlTypeFilterChange = (value: string) => {
    setControlTypeFilter(value);
    window.dispatchEvent(new CustomEvent('controlsFiltersChanged', {
      detail: { typeFilter: value, effectivenessFilter: controlEffectivenessFilter, statusFilter: controlStatusFilter, validationStatusFilter: controlValidationStatusFilter }
    }));
  };

  const handleControlEffectivenessFilterChange = (value: string) => {
    setControlEffectivenessFilter(value);
    window.dispatchEvent(new CustomEvent('controlsFiltersChanged', {
      detail: { typeFilter: controlTypeFilter, effectivenessFilter: value, statusFilter: controlStatusFilter, validationStatusFilter: controlValidationStatusFilter }
    }));
  };

  const handleControlStatusFilterChange = (value: string) => {
    setControlStatusFilter(value);
    window.dispatchEvent(new CustomEvent('controlsFiltersChanged', {
      detail: { typeFilter: controlTypeFilter, effectivenessFilter: controlEffectivenessFilter, statusFilter: value, validationStatusFilter: controlValidationStatusFilter }
    }));
  };

  const handleControlValidationStatusFilterChange = (value: string) => {
    setControlValidationStatusFilter(value);
    window.dispatchEvent(new CustomEvent('controlsFiltersChanged', {
      detail: { typeFilter: controlTypeFilter, effectivenessFilter: controlEffectivenessFilter, statusFilter: controlStatusFilter, validationStatusFilter: value }
    }));
  };

  // Action Plans filter handlers
  const handleActionStatusFilterChange = (value: string) => {
    setActionStatusFilter(value);
    window.dispatchEvent(new CustomEvent('actionsFiltersChanged', {
      detail: { statusFilter: value, priorityFilter: actionPriorityFilter, typeFilter: actionTypeFilter, originFilter: actionOriginFilter }
    }));
  };

  const handleActionPriorityFilterChange = (value: string) => {
    setActionPriorityFilter(value);
    window.dispatchEvent(new CustomEvent('actionsFiltersChanged', {
      detail: { statusFilter: actionStatusFilter, priorityFilter: value, typeFilter: actionTypeFilter, originFilter: actionOriginFilter }
    }));
  };

  const handleActionTypeFilterChange = (value: string) => {
    setActionTypeFilter(value);
    window.dispatchEvent(new CustomEvent('actionsFiltersChanged', {
      detail: { statusFilter: actionStatusFilter, priorityFilter: actionPriorityFilter, typeFilter: value, originFilter: actionOriginFilter }
    }));
  };

  const handleActionOriginFilterChange = (value: string) => {
    setActionOriginFilter(value);
    window.dispatchEvent(new CustomEvent('actionsFiltersChanged', {
      detail: { statusFilter: actionStatusFilter, priorityFilter: actionPriorityFilter, typeFilter: actionTypeFilter, originFilter: value }
    }));
  };

  // Audit Findings filter handlers
  const handleFindingStatusFilterChange = (value: string) => {
    setFindingStatusFilter(value);
    window.dispatchEvent(new CustomEvent('auditFindingsFiltersChanged', {
      detail: { statusFilter: value, severityFilter: findingSeverityFilter, typeFilter: findingTypeFilter, auditFilter: findingAuditFilter }
    }));
  };

  const handleFindingSeverityFilterChange = (value: string) => {
    setFindingSeverityFilter(value);
    window.dispatchEvent(new CustomEvent('auditFindingsFiltersChanged', {
      detail: { statusFilter: findingStatusFilter, severityFilter: value, typeFilter: findingTypeFilter, auditFilter: findingAuditFilter }
    }));
  };

  const handleFindingTypeFilterChange = (value: string) => {
    setFindingTypeFilter(value);
    window.dispatchEvent(new CustomEvent('auditFindingsFiltersChanged', {
      detail: { statusFilter: findingStatusFilter, severityFilter: findingSeverityFilter, typeFilter: value, auditFilter: findingAuditFilter }
    }));
  };

  const handleFindingAuditFilterChange = (value: string) => {
    setFindingAuditFilter(value);
    window.dispatchEvent(new CustomEvent('auditFindingsFiltersChanged', {
      detail: { statusFilter: findingStatusFilter, severityFilter: findingSeverityFilter, typeFilter: findingTypeFilter, auditFilter: value }
    }));
  };

  // Audits filter handlers
  const handleAuditStatusFilterChange = (value: string) => {
    setAuditStatusFilter(value);
    window.dispatchEvent(new CustomEvent('auditsFiltersChanged', {
      detail: { statusFilter: value, typeFilter: auditTypeFilter, planFilter: auditPlanFilter }
    }));
  };

  const handleAuditTypeFilterChange = (value: string) => {
    setAuditTypeFilter(value);
    window.dispatchEvent(new CustomEvent('auditsFiltersChanged', {
      detail: { statusFilter: auditStatusFilter, typeFilter: value, planFilter: auditPlanFilter }
    }));
  };

  const handleAuditPlanFilterChange = (value: string) => {
    setAuditPlanFilter(value);
    window.dispatchEvent(new CustomEvent('auditsFiltersChanged', {
      detail: { statusFilter: auditStatusFilter, typeFilter: auditTypeFilter, planFilter: value }
    }));
  };

  // Regulation filter handlers
  const handleRegulationCriticalityFilterChange = (value: string) => {
    setRegulationCriticalityFilter(value);
    window.dispatchEvent(new CustomEvent('regulationFiltersChanged', {
      detail: { 
        criticalityFilter: value, 
        sourceFilter: regulationSourceFilter, 
        statusFilter: regulationStatusFilter, 
        riskLevelFilter: regulationRiskLevelFilter, 
        issuingOrgFilter: regulationIssuingOrgFilter 
      }
    }));
  };

  const handleRegulationSourceFilterChange = (value: string) => {
    setRegulationSourceFilter(value);
    window.dispatchEvent(new CustomEvent('regulationFiltersChanged', {
      detail: { 
        criticalityFilter: regulationCriticalityFilter, 
        sourceFilter: value, 
        statusFilter: regulationStatusFilter, 
        riskLevelFilter: regulationRiskLevelFilter, 
        issuingOrgFilter: regulationIssuingOrgFilter 
      }
    }));
  };

  const handleRegulationStatusFilterChange = (value: string) => {
    setRegulationStatusFilter(value);
    window.dispatchEvent(new CustomEvent('regulationFiltersChanged', {
      detail: { 
        criticalityFilter: regulationCriticalityFilter, 
        sourceFilter: regulationSourceFilter, 
        statusFilter: value, 
        riskLevelFilter: regulationRiskLevelFilter, 
        issuingOrgFilter: regulationIssuingOrgFilter 
      }
    }));
  };

  const handleRegulationRiskLevelFilterChange = (value: string) => {
    setRegulationRiskLevelFilter(value);
    window.dispatchEvent(new CustomEvent('regulationFiltersChanged', {
      detail: { 
        criticalityFilter: regulationCriticalityFilter, 
        sourceFilter: regulationSourceFilter, 
        statusFilter: regulationStatusFilter, 
        riskLevelFilter: value, 
        issuingOrgFilter: regulationIssuingOrgFilter 
      }
    }));
  };

  const handleRegulationIssuingOrgFilterChange = (value: string) => {
    setRegulationIssuingOrgFilter(value);
    window.dispatchEvent(new CustomEvent('regulationFiltersChanged', {
      detail: { 
        criticalityFilter: regulationCriticalityFilter, 
        sourceFilter: regulationSourceFilter, 
        statusFilter: regulationStatusFilter, 
        riskLevelFilter: regulationRiskLevelFilter, 
        issuingOrgFilter: value 
      }
    }));
  };

  // Risk Events filter handlers
  const handleEventTypeFilterChange = (value: string) => {
    setEventTypeFilter(value);
    window.dispatchEvent(new CustomEvent('riskEventsFiltersChanged', {
      detail: { eventTypeFilter: value, statusFilter: eventStatusFilter, severityFilter: eventSeverityFilter, processFilter: eventProcessFilter }
    }));
  };

  const handleEventStatusFilterChange = (value: string) => {
    setEventStatusFilter(value);
    window.dispatchEvent(new CustomEvent('riskEventsFiltersChanged', {
      detail: { eventTypeFilter: eventTypeFilter, statusFilter: value, severityFilter: eventSeverityFilter, processFilter: eventProcessFilter }
    }));
  };

  const handleEventSeverityFilterChange = (value: string) => {
    setEventSeverityFilter(value);
    window.dispatchEvent(new CustomEvent('riskEventsFiltersChanged', {
      detail: { eventTypeFilter: eventTypeFilter, statusFilter: eventStatusFilter, severityFilter: value, processFilter: eventProcessFilter }
    }));
  };

  const handleEventProcessFilterChange = (value: string) => {
    setEventProcessFilter(value);
    window.dispatchEvent(new CustomEvent('riskEventsFiltersChanged', {
      detail: { eventTypeFilter: eventTypeFilter, statusFilter: eventStatusFilter, severityFilter: eventSeverityFilter, processFilter: value }
    }));
  };

  // Risk Matrix filter handlers
  const handleMatrixProcessFilterChange = (value: string) => {
    setMatrixProcessFilter(value);
    window.dispatchEvent(new CustomEvent('matrixFiltersChanged', {
      detail: { processFilter: value, gerenciaFilter: matrixGerenciaFilter }
    }));
  };

  const handleMatrixGerenciaFilterChange = (value: string) => {
    setMatrixGerenciaFilter(value);
    window.dispatchEvent(new CustomEvent('matrixFiltersChanged', {
      detail: { processFilter: matrixProcessFilter, gerenciaFilter: value }
    }));
  };

  // Audit Plan filter handlers
  const handleAuditPlanStatusFilterChange = (value: string) => {
    setAuditPlanStatusFilter(value);
    window.dispatchEvent(new CustomEvent('auditPlanFiltersChanged', {
      detail: { statusFilter: value, yearFilter: auditPlanYearFilter }
    }));
  };

  const handleAuditPlanYearFilterChange = (value: string) => {
    setAuditPlanYearFilter(value);
    window.dispatchEvent(new CustomEvent('auditPlanFiltersChanged', {
      detail: { statusFilter: auditPlanStatusFilter, yearFilter: value }
    }));
  };

  // Helper functions for risks export
  const getRiskProcessLinks = (riskId: string) => {
    return riskProcessLinks.filter((link: any) => link.risk?.id === riskId);
  };

  const getRiskProcessResponsibles = (risk: Risk) => {
    const links = getRiskProcessLinks(risk.id);
    const responsibles: any[] = [];
    
    links.forEach((link: any) => {
      if (link.responsibleOverride) {
        responsibles.push(link.responsibleOverride);
      } else if (link.subproceso?.owner) {
        responsibles.push(link.subproceso.owner);
      } else if (link.process?.owner) {
        responsibles.push(link.process.owner);
      } else if (link.macroproceso?.owner) {
        responsibles.push(link.macroproceso.owner);
      }
    });
    
    const uniqueResponsibles = Array.from(new Map(responsibles.map(r => [r.id, r])).values());
    return uniqueResponsibles;
  };

  const getAggregatedValidationStatus = (risk: Risk): 'validated' | 'pending_validation' | 'rejected' => {
    const links = getRiskProcessLinks(risk.id);
    if (links.length === 0) return 'pending_validation';
    
    const hasRejected = links.some((link: any) => link.validationStatus === 'rejected');
    const allValidated = links.every((link: any) => link.validationStatus === 'validated');
    
    if (hasRejected) return 'rejected';
    if (allValidated) return 'validated';
    return 'pending_validation';
  };

  const getRiskControls = (riskId: string) => {
    return allRiskControls.filter((rc: any) => rc.riskId === riskId);
  };

  // Export Controls to Excel
  const exportControlsToExcel = async () => {
    if (location !== "/controls") return;

    // Fetch controls data
    const controlsResponse = await fetch('/api/controls');
    const controlsData = await controlsResponse.json();
    const controls = controlsData.data || [];

    // Fetch risk-control associations
    const riskControlsResponse = await fetch('/api/risk-controls');
    const riskControls = await riskControlsResponse.json();

    // Fetch all risks to get risk names
    const risksResponse = await fetch('/api/risks');
    const risksData = await risksResponse.json();
    const risks = risksData.data || risksData;

    // Type labels
    const typeLabels: Record<string, string> = {
      preventive: 'Preventivo',
      detective: 'Detectivo',
      corrective: 'Correctivo'
    };

    // Control objective labels
    const objectiveLabels: Record<string, string> = {
      probability: 'Probabilidad',
      impact: 'Impacto',
      both: 'Ambos'
    };

    // Validation status labels
    const validationLabels: Record<string, string> = {
      validated: 'Validado',
      pending_validation: 'Pendiente',
      rejected: 'Rechazado'
    };

    // Prepare data
    const exportData = controls.map((control: any) => {
      // Get associated risks for this control
      const controlRisks = riskControls.filter((rc: any) => rc.controlId === control.id);
      const riskNames = controlRisks.map((rc: any) => {
        const risk = risks.find((r: any) => r.id === rc.riskId);
        return risk ? `${risk.code} - ${risk.name}` : '';
      }).filter(Boolean).join('; ') || 'Sin riesgos asociados';

      return {
        code: control.code,
        name: control.name,
        description: control.description || '',
        responsible: control.controlOwner?.name || 'Sin asignar',
        type: typeLabels[control.type] || control.type,
        controlObjective: objectiveLabels[control.effectTarget] || 'No especificado',
        risks: riskNames,
        effectiveness: control.effectiveness || 0,
        execution: validationLabels[control.validationStatus] || 'Pendiente',
        validatedAt: control.validatedAt ? new Date(control.validatedAt).toLocaleDateString() : 'N/A',
        status: control.isActive ? 'Activo' : 'Inactivo',
      };
    });

    // Export using hook
    await exportToExcelHook({
      sheetName: 'Controles',
      fileName: 'controles',
      columns: [
        { header: 'Código', key: 'code', width: 15 },
        { header: 'Nombre', key: 'name', width: 40 },
        { header: 'Descripción', key: 'description', width: 50 },
        { header: 'Responsable', key: 'responsible', width: 30 },
        { header: 'Tipo', key: 'type', width: 15 },
        { header: 'Objetivo del Control', key: 'controlObjective', width: 20 },
        { header: 'Riesgos Asociados', key: 'risks', width: 60 },
        { header: 'Efectividad', key: 'effectiveness', width: 15 },
        { header: 'Ejecución', key: 'execution', width: 15 },
        { header: 'Fecha de Validación', key: 'validatedAt', width: 20 },
        { header: 'Estado', key: 'status', width: 15 },
      ],
      data: exportData,
      successMessage: `Se exportaron ${controls.length} controles a Excel.`
    });
  };

  // Export Risk Events to Excel
  const exportRiskEventsToExcel = async () => {
    if (location !== "/risk-events") return;

    // Fetch risk events data
    const eventsResponse = await fetch('/api/risk-events');
    const eventsData = await eventsResponse.json();
    const events = eventsData.data || [];

    // Labels
    const typeLabels: Record<string, string> = {
      materializado: 'Materializado',
      fraude: 'Fraude',
      delito: 'Delito'
    };

    const statusLabels: Record<string, string> = {
      open: 'Abierto',
      investigating: 'En investigación',
      resolved: 'Resuelto',
      closed: 'Cerrado'
    };

    // Prepare data
    const exportData = events.map((event: any) => {
      // Build process string from related entities
      const relatedProcesses = [];
      
      if (event.relatedMacroprocesos?.length > 0) {
        relatedProcesses.push(...event.relatedMacroprocesos.map((m: any) => `M: ${m.name}`));
      }
      
      if (event.relatedProcesses?.length > 0) {
        relatedProcesses.push(...event.relatedProcesses.map((p: any) => `P: ${p.name}`));
      }
      
      if (event.relatedSubprocesos?.length > 0) {
        relatedProcesses.push(...event.relatedSubprocesos.map((s: any) => `S: ${s.name}`));
      }
      
      return {
        code: event.code,
        description: event.description,
        type: typeLabels[event.eventType] || event.eventType,
        severity: event.severity || '',
        occurrenceDate: event.eventDate ? new Date(event.eventDate).toLocaleDateString() : 'N/A',
        lossAmount: event.actualLoss ? `$${Number(event.actualLoss).toLocaleString()}` : (event.estimatedLoss ? `$${Number(event.estimatedLoss).toLocaleString()}` : 'N/A'),
        status: statusLabels[event.status] || event.status,
        process: relatedProcesses.length > 0 ? relatedProcesses.join(', ') : 'N/A',
      };
    });

    // Export using hook
    await exportToExcelHook({
      sheetName: 'Eventos de Riesgo',
      fileName: 'eventos_riesgo',
      columns: [
        { header: 'Código', key: 'code', width: 15 },
        { header: 'Descripción', key: 'description', width: 40 },
        { header: 'Tipo de evento', key: 'type', width: 20 },
        { header: 'Severidad', key: 'severity', width: 15 },
        { header: 'Fecha Ocurrencia', key: 'occurrenceDate', width: 20 },
        { header: 'Monto Pérdida', key: 'lossAmount', width: 20 },
        { header: 'Estado', key: 'status', width: 15 },
        { header: 'Proceso', key: 'process', width: 40 },
      ],
      data: exportData,
      successMessage: `Se exportaron ${events.length} eventos de riesgo a Excel.`
    });
  };

  const exportToExcel = async () => {
    if (location !== "/risks") return;

    // Prepare data
    const risksToExport = allRisks;
    const exportData = risksToExport.map((risk: Risk) => {
      // Get process names from riskProcessLinks (same as table display)
      const riskLinks = riskProcessLinks.filter((link: any) => link.riskId === risk.id);
      const processNames: string[] = [];
      
      riskLinks.forEach((link: any) => {
        if (link.subprocesoId) {
          const sub = subprocesos.find((s: any) => s.id === link.subprocesoId);
          if (sub) processNames.push(`S: ${sub.name}`);
        } else if (link.processId) {
          const proc = processes.find((p: any) => p.id === link.processId);
          if (proc) processNames.push(`P: ${proc.name}`);
        } else if (link.macroprocesoId) {
          const macro = macroprocesos.find((m: any) => m.id === link.macroprocesoId);
          if (macro) processNames.push(`M: ${macro.name}`);
        }
      });
      
      const processName = processNames.length > 0 ? processNames.join(', ') : 'Sin asignar';

      const responsibles = getRiskProcessResponsibles(risk);
      const responsibleNames = responsibles.length > 0 
        ? responsibles.map(r => r.name).join(', ')
        : 'Sin asignar';

      const riskControls = getRiskControls(risk.id);
      const residualRisk = riskControls.length > 0 
        ? Math.min(...riskControls.map((rc: any) => rc.residualRisk || risk.inherentRisk))
        : risk.inherentRisk;

      const validationStatus = getAggregatedValidationStatus(risk) as string;
      const validationText = validationStatus === 'validated' ? 'Validado' :
                            validationStatus === 'rejected' ? 'Rechazado' : 
                            validationStatus === 'observed' ? 'Observado' : 'Pendiente';

      return {
        code: risk.code,
        name: risk.name,
        description: risk.description || '',
        category: Array.isArray(risk.category) ? risk.category.join(', ') : risk.category,
        probability: risk.probability,
        impact: risk.impact,
        inherentRisk: risk.inherentRisk,
        residualRisk: residualRisk,
        process: processName,
        responsible: responsibleNames,
        validation: validationText,
      };
    });

    // Export using hook
    await exportToExcelHook({
      sheetName: 'Riesgos',
      fileName: 'riesgos',
      columns: [
        { header: 'Código', key: 'code', width: 15 },
        { header: 'Nombre', key: 'name', width: 40 },
        { header: 'Descripción', key: 'description', width: 50 },
        { header: 'Categoría', key: 'category', width: 20 },
        { header: 'Probabilidad', key: 'probability', width: 12 },
        { header: 'Impacto', key: 'impact', width: 12 },
        { header: 'Riesgo Inherente', key: 'inherentRisk', width: 15 },
        { header: 'Riesgo Residual', key: 'residualRisk', width: 15 },
        { header: 'Proceso', key: 'process', width: 40 },
        { header: 'Responsable', key: 'responsible', width: 30 },
        { header: 'Estado Validación', key: 'validation', width: 20 },
      ],
      data: exportData,
      successMessage: `Se exportaron ${risksToExport.length} riesgos a Excel.`
    });
  };

  const getActiveFilters = () => {
    const filters = [];
    
    // Risk filters
    if (location === "/risks") {
      if (macroprocesoFilter !== "all") {
        const macroproceso = macroprocesos.find((m: any) => m.id === macroprocesoFilter);
        filters.push({ key: "macroproceso", label: "Macroproceso", value: macroproceso?.name || macroprocesoFilter });
      }
      
      if (processFilter !== "all") {
        const process = processes.find((p: any) => p.id === processFilter);
        filters.push({ key: "process", label: "Proceso", value: process?.name || processFilter });
      }
      
      if (subprocesoFilter !== "all") {
        const subproceso = subprocesos.find((s: any) => s.id === subprocesoFilter);
        filters.push({ key: "subproceso", label: "Subproceso", value: subproceso?.name || subprocesoFilter });
      }
      
      if (inherentRiskLevelFilter !== "all") {
        filters.push({ key: "inherentRiskLevel", label: "Nivel Inherente", value: inherentRiskLevelFilter.charAt(0).toUpperCase() + inherentRiskLevelFilter.slice(1) });
      }
      
      if (residualRiskLevelFilter !== "all") {
        filters.push({ key: "residualRiskLevel", label: "Nivel Residual", value: residualRiskLevelFilter.charAt(0).toUpperCase() + residualRiskLevelFilter.slice(1) });
      }
      
      if (validationFilter !== "all") {
        const validationLabels = {
          pending_validation: "Pendiente",
          validated: "Validado", 
          rejected: "Rechazado"
        };
        filters.push({ key: "validation", label: "Estado", value: validationLabels[validationFilter as keyof typeof validationLabels] });
      }
      
      if (riskOwnerFilter !== "all") {
        const owner = processOwners.find((o: any) => o.id === riskOwnerFilter);
        const ownerLabel = owner ? `${owner.name} - ${owner.position}` : riskOwnerFilter;
        filters.push({ key: "riskOwner", label: "Responsable", value: ownerLabel });
      }
    }

    // Risk Validation filters
    if (location === "/validation") {
      if (validationStatusFilter !== "all") {
        const statusLabels = {
          pending_validation: "Pendiente",
          validated: "Validado",
          observed: "Observado",
          rejected: "Rechazado"
        };
        filters.push({ key: "validationStatus", label: "Estado", value: statusLabels[validationStatusFilter as keyof typeof statusLabels] || validationStatusFilter });
      }

      if (validationOwnerFilter !== "all") {
        const owner = processOwners.find((o: any) => o.id === validationOwnerFilter);
        const ownerLabel = owner ? `${owner.name} - ${owner.position}` : validationOwnerFilter;
        filters.push({ key: "validationOwner", label: "Propietario", value: ownerLabel });
      }

      if (validationMacroprocesoFilter !== "all") {
        const macroproceso = macroprocesos.find((m: any) => m.id === validationMacroprocesoFilter);
        filters.push({ key: "validationMacroproceso", label: "Macroproceso", value: macroproceso?.name || validationMacroprocesoFilter });
      }

      if (validationProcessFilter !== "all") {
        const process = processes.find((p: any) => p.id === validationProcessFilter);
        filters.push({ key: "validationProcess", label: "Proceso", value: process?.name || validationProcessFilter });
      }

      if (validationRiskLevelFilter !== "all") {
        filters.push({ key: "validationRiskLevel", label: "Nivel de Riesgo", value: validationRiskLevelFilter.charAt(0).toUpperCase() + validationRiskLevelFilter.slice(1) });
      }
    }

    // Controls filters
    if (location === "/controls") {
      if (controlSearchTerm) {
        filters.push({ key: "controlSearch", label: "Búsqueda", value: controlSearchTerm });
      }
      
      if (controlTypeFilter !== "all") {
        const typeLabels = {
          preventive: "Preventivo",
          detective: "Detectivo", 
          corrective: "Correctivo",
          directive: "Directivo"
        };
        filters.push({ key: "controlType", label: "Tipo", value: typeLabels[controlTypeFilter as keyof typeof typeLabels] || controlTypeFilter });
      }

      if (controlEffectivenessFilter !== "all") {
        const effectivenessLabels = {
          high: "Alta",
          medium: "Media", 
          low: "Baja"
        };
        filters.push({ key: "controlEffectiveness", label: "Efectividad", value: effectivenessLabels[controlEffectivenessFilter as keyof typeof effectivenessLabels] || controlEffectivenessFilter });
      }

      if (controlStatusFilter !== "all") {
        const statusLabels = {
          active: "Activo",
          inactive: "Inactivo"
        };
        filters.push({ key: "controlStatus", label: "Estado de Actividad", value: statusLabels[controlStatusFilter as keyof typeof statusLabels] || controlStatusFilter });
      }

      if (controlValidationStatusFilter !== "all") {
        const validationLabels = {
          pending_validation: "Pendiente de Validación",
          validated: "Validado",
          observed: "Observado",
          rejected: "Rechazado"
        };
        filters.push({ key: "controlValidationStatus", label: "Estado de Validación", value: validationLabels[controlValidationStatusFilter as keyof typeof validationLabels] || controlValidationStatusFilter });
      }
    }

    // Action Plans filters
    if (location === "/actions") {
      if (actionStatusFilter !== "all") {
        const statusLabels = {
          draft: "Borrador",
          in_progress: "En Progreso",
          completed: "Completado",
          overdue: "Vencido"
        };
        filters.push({ key: "actionStatus", label: "Estado", value: statusLabels[actionStatusFilter as keyof typeof statusLabels] || actionStatusFilter });
      }

      if (actionPriorityFilter !== "all") {
        const priorityLabels = {
          high: "Alta",
          medium: "Media",
          low: "Baja"
        };
        filters.push({ key: "actionPriority", label: "Prioridad", value: priorityLabels[actionPriorityFilter as keyof typeof priorityLabels] || actionPriorityFilter });
      }

      if (actionTypeFilter !== "all") {
        const typeLabels = {
          mitigation: "Mitigación",
          remediation: "Remediación",
          improvement: "Mejora"
        };
        filters.push({ key: "actionType", label: "Tipo", value: typeLabels[actionTypeFilter as keyof typeof typeLabels] || actionTypeFilter });
      }

      if (actionOriginFilter !== "all") {
        const originLabels = {
          risk: "Gestión de Riesgos",
          audit: "Auditoría",
          compliance: "Cumplimiento"
        };
        filters.push({ key: "actionOrigin", label: "Origen", value: originLabels[actionOriginFilter as keyof typeof originLabels] || actionOriginFilter });
      }
    }

    // Audits filters
    if (location === "/audits") {
      if (auditStatusFilter !== "all") {
        const statusLabels = {
          planned: "Planificada",
          in_progress: "En Progreso",
          completed: "Completada",
          cancelled: "Cancelada"
        };
        filters.push({ key: "auditStatus", label: "Estado", value: statusLabels[auditStatusFilter as keyof typeof statusLabels] || auditStatusFilter });
      }

      if (auditTypeFilter !== "all") {
        const typeLabels = {
          risk_based: "Basada en Riesgos",
          compliance: "Cumplimiento",
          operational: "Operacional",
          financial: "Financiera"
        };
        filters.push({ key: "auditType", label: "Tipo", value: typeLabels[auditTypeFilter as keyof typeof typeLabels] || auditTypeFilter });
      }

      if (auditPlanFilter !== "all") {
        const plan = auditPlans.find((p: any) => p.id === auditPlanFilter);
        filters.push({ key: "auditPlan", label: "Plan", value: plan?.name || auditPlanFilter });
      }
    }

    // Regulations filters
    if (location === "/regulations") {
      if (regulationCriticalityFilter !== "all") {
        const criticalityLabels = {
          low: "Baja",
          medium: "Media",
          high: "Alta", 
          critical: "Crítica"
        };
        filters.push({ key: "regulationCriticality", label: "Criticidad", value: criticalityLabels[regulationCriticalityFilter as keyof typeof criticalityLabels] });
      }
      
      if (regulationSourceFilter !== "all") {
        const sourceLabels = {
          internal: "Interna",
          external: "Externa"
        };
        filters.push({ key: "regulationSource", label: "Fuente", value: sourceLabels[regulationSourceFilter as keyof typeof sourceLabels] });
      }
      
      if (regulationStatusFilter !== "all") {
        const statusLabels = {
          active: "Activa",
          superseded: "Reemplazada",
          revoked: "Revocada"
        };
        filters.push({ key: "regulationStatus", label: "Estado", value: statusLabels[regulationStatusFilter as keyof typeof statusLabels] });
      }
      
      if (regulationRiskLevelFilter !== "all") {
        filters.push({ key: "regulationRiskLevel", label: "Nivel de Riesgo", value: regulationRiskLevelFilter.charAt(0).toUpperCase() + regulationRiskLevelFilter.slice(1) });
      }
      
      if (regulationIssuingOrgFilter !== "all") {
        const regulation = regulations.find((r: any) => r.issuingOrganization === regulationIssuingOrgFilter);
        filters.push({ key: "regulationIssuingOrg", label: "Organismo", value: regulation?.issuingOrganization || regulationIssuingOrgFilter });
      }
    }

    // Risk Events filters
    if (location === "/risk-events") {
      if (eventTypeFilter !== "all") {
        const typeLabels = {
          materializado: "Materializado",
          fraude: "Fraude",
          delito: "Delito"
        };
        filters.push({ key: "eventType", label: "Tipo", value: typeLabels[eventTypeFilter as keyof typeof typeLabels] || eventTypeFilter });
      }

      if (eventStatusFilter !== "all") {
        const statusLabels = {
          abierto: "Abierto",
          en_investigacion: "En Investigación",
          cerrado: "Cerrado",
          escalado: "Escalado"
        };
        filters.push({ key: "eventStatus", label: "Estado", value: statusLabels[eventStatusFilter as keyof typeof statusLabels] || eventStatusFilter });
      }

      if (eventSeverityFilter !== "all") {
        const severityLabels = {
          baja: "Baja",
          media: "Media",
          alta: "Alta",
          critica: "Crítica"
        };
        filters.push({ key: "eventSeverity", label: "Severidad", value: severityLabels[eventSeverityFilter as keyof typeof severityLabels] || eventSeverityFilter });
      }

      if (eventProcessFilter !== "all") {
        const process = riskEventProcesses.find((p: any) => p.id === eventProcessFilter);
        filters.push({ key: "eventProcess", label: "Proceso", value: process?.name || eventProcessFilter });
      }
    }

    // Risk Matrix filters
    if (location === "/matrix") {
      if (matrixProcessFilter !== "all") {
        const macro = matrixMacroprocesos.find((m: any) => m.id === matrixProcessFilter);
        const process = matrixProcesses.find((p: any) => p.id === matrixProcessFilter);
        filters.push({ key: "matrixProcess", label: "Proceso", value: macro?.name || process?.name || matrixProcessFilter });
      }

      if (matrixGerenciaFilter !== "all") {
        const gerencia = matrixGerencias.find((g: any) => g.id === matrixGerenciaFilter);
        filters.push({ key: "matrixGerencia", label: "Gerencia", value: gerencia?.name || matrixGerenciaFilter });
      }

    }

    // Audit Plan filters
    if (location === "/audit-plan-list") {
      if (auditPlanStatusFilter !== "all") {
        const statusLabels = {
          draft: "Borrador",
          in_review: "En Revisión",
          approved: "Aprobado",
          active: "Activo",
          completed: "Completado",
          cancelled: "Cancelado"
        };
        filters.push({ key: "auditPlanStatus", label: "Estado", value: statusLabels[auditPlanStatusFilter as keyof typeof statusLabels] || auditPlanStatusFilter });
      }

      if (auditPlanYearFilter !== "all") {
        filters.push({ key: "auditPlanYear", label: "Año", value: auditPlanYearFilter });
      }
    }

    
    return filters;
  };

  const clearFilter = (filterKey: string) => {
    switch (filterKey) {
      // Risk filters
      case "macroproceso":
        handleMacroprocesoFilterChange("all");
        break;
      case "process":
        handleProcessFilterChange("all");
        break;
      case "subproceso":
        handleSubprocesoFilterChange("all");
        break;
      case "inherentRiskLevel":
        handleInherentRiskLevelFilterChange("all");
        break;
      case "residualRiskLevel":
        handleResidualRiskLevelFilterChange("all");
        break;
      case "validation":
        handleValidationFilterChange("all");
        break;
      case "riskOwner":
        handleRiskOwnerFilterChange("all");
        break;
      
      // Risk Validation filters
      case "validationStatus":
        handleValidationStatusFilterChange("all");
        break;
      case "validationOwner":
        handleValidationOwnerFilterChange("all");
        break;
      case "validationMacroproceso":
        handleValidationMacroprocesoFilterChange("all");
        break;
      case "validationProcess":
        handleValidationProcessFilterChange("all");
        break;
      case "validationRiskLevel":
        handleValidationRiskLevelFilterChange("all");
        break;
      
      // Controls filters
      case "controlType":
        handleControlTypeFilterChange("all");
        break;
      case "controlEffectiveness":
        handleControlEffectivenessFilterChange("all");
        break;
      case "controlStatus":
        handleControlStatusFilterChange("all");
        break;
      case "controlValidationStatus":
        handleControlValidationStatusFilterChange("all");
        break;
      
      // Action Plans filters
      case "actionStatus":
        handleActionStatusFilterChange("all");
        break;
      case "actionPriority":
        handleActionPriorityFilterChange("all");
        break;
      case "actionType":
        handleActionTypeFilterChange("all");
        break;
      case "actionOrigin":
        handleActionOriginFilterChange("all");
        break;
      
      // Audits filters
      case "auditStatus":
        handleAuditStatusFilterChange("all");
        break;
      case "auditType":
        handleAuditTypeFilterChange("all");
        break;
      case "auditPlan":
        handleAuditPlanFilterChange("all");
        break;
      
      // Regulations filters
      case "regulationCriticality":
        handleRegulationCriticalityFilterChange("all");
        break;
      case "regulationSource":
        handleRegulationSourceFilterChange("all");
        break;
      case "regulationStatus":
        handleRegulationStatusFilterChange("all");
        break;
      case "regulationRiskLevel":
        handleRegulationRiskLevelFilterChange("all");
        break;
      case "regulationIssuingOrg":
        handleRegulationIssuingOrgFilterChange("all");
        break;
      
      // Risk Events filters
      case "eventType":
        handleEventTypeFilterChange("all");
        break;
      case "eventStatus":
        handleEventStatusFilterChange("all");
        break;
      case "eventSeverity":
        handleEventSeverityFilterChange("all");
        break;
      case "eventProcess":
        handleEventProcessFilterChange("all");
        break;

      // Risk Matrix filters
      case "matrixProcess":
        handleMatrixProcessFilterChange("all");
        break;
      case "matrixGerencia":
        handleMatrixGerenciaFilterChange("all");
        break;
    }
  };

  const clearAllFilters = () => {
    if (location === "/risks") {
      setMacroprocesoFilter("all");
      setProcessFilter("all");
      setSubprocesoFilter("all");
      setInherentRiskLevelFilter("all");
      setResidualRiskLevelFilter("all");
      setValidationFilter("all");
      setRiskOwnerFilter("all");
      window.dispatchEvent(new CustomEvent('riskFiltersChanged', {
        detail: { macroprocesoFilter: "all", processFilter: "all", subprocesoFilter: "all", inherentRiskLevelFilter: "all", residualRiskLevelFilter: "all", validationFilter: "all", ownerFilter: "all" }
      }));
    } else if (location === "/validation") {
      setValidationStatusFilter("all");
      setValidationOwnerFilter("all");
      setValidationMacroprocesoFilter("all");
      setValidationProcessFilter("all");
      setValidationRiskLevelFilter("all");
      window.dispatchEvent(new CustomEvent('validationFiltersChanged', {
        detail: { statusFilter: "all", ownerFilter: "all", macroprocesoFilter: "all", processFilter: "all", riskLevelFilter: "all" }
      }));
    } else if (location === "/controls") {
      setControlTypeFilter("all");
      setControlEffectivenessFilter("all");
      setControlStatusFilter("all");
      setControlValidationStatusFilter("all");
      setControlResponsibleFilter("all");
      window.dispatchEvent(new CustomEvent('controlsFiltersChanged', {
        detail: { typeFilter: "all", effectivenessFilter: "all", statusFilter: "all", validationStatusFilter: "all", responsibleFilter: "all" }
      }));
    } else if (location === "/actions") {
      setActionStatusFilter("all");
      setActionPriorityFilter("all");
      setActionTypeFilter("all");
      setActionOriginFilter("all");
      window.dispatchEvent(new CustomEvent('actionsFiltersChanged', {
        detail: { statusFilter: "all", priorityFilter: "all", typeFilter: "all", originFilter: "all" }
      }));
    } else if (location === "/audits") {
      setAuditStatusFilter("all");
      setAuditTypeFilter("all");
      setAuditPlanFilter("all");
      window.dispatchEvent(new CustomEvent('auditsFiltersChanged', {
        detail: { statusFilter: "all", typeFilter: "all", planFilter: "all" }
      }));
    } else if (location === "/regulations") {
      setRegulationCriticalityFilter("all");
      setRegulationSourceFilter("all");
      setRegulationStatusFilter("all");
      setRegulationRiskLevelFilter("all");
      setRegulationIssuingOrgFilter("all");
      window.dispatchEvent(new CustomEvent('regulationFiltersChanged', {
        detail: { 
          criticalityFilter: "all", 
          sourceFilter: "all", 
          statusFilter: "all", 
          riskLevelFilter: "all", 
          issuingOrgFilter: "all" 
        }
      }));
    } else if (location === "/risk-events") {
      setEventTypeFilter("all");
      setEventStatusFilter("all");
      setEventSeverityFilter("all");
      setEventProcessFilter("all");
      window.dispatchEvent(new CustomEvent('riskEventsFiltersChanged', {
        detail: { eventTypeFilter: "all", statusFilter: "all", severityFilter: "all", processFilter: "all" }
      }));
    } else if (location === "/matrix") {
      setMatrixProcessFilter("all");
      setMatrixGerenciaFilter("all");
      window.dispatchEvent(new CustomEvent('matrixFiltersChanged', {
        detail: { processFilter: "all", gerenciaFilter: "all" }
      }));
    }
  };

  const activeFilters = getActiveFilters();

  const handleSearch = () => {
    if (searchTerm.trim()) {
      triggerSearch(searchTerm.trim());
      setSearchDialogOpen(false);
      setSearchTerm("");
      toast({
        title: "Búsqueda aplicada",
        description: `Filtrando por: "${searchTerm.trim()}"`,
      });
    }
  };

  return (
    <header className="bg-card border-b border-border px-6 py-4" data-testid="header">
      <div className="flex items-center justify-between">
        {/* Hamburger Menu - Works on both mobile and desktop */}
        <Button
          variant="ghost"
          size="icon"
          onClick={isMobile ? onToggleMobileSidebar : onToggleDesktopSidebar}
          className="mr-3"
          data-testid="button-hamburger"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          {currentPage.title && (
            <>
              <h2 className="text-xl font-semibold" data-testid="page-title">{currentPage.title}</h2>
              <Breadcrumbs />
            </>
          )}
          {currentPage.subtitle && (
            <p className="text-sm text-muted-foreground" data-testid="page-subtitle">{currentPage.subtitle}</p>
          )}
          
          {/* Portal target for audit section tabs */}
          <div id="audit-tabs-portal" />
          
          {/* Active Filters as Badges - Show on all pages with filters */}
          {activeFilters.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Filtros activos:</span>
              {activeFilters.map((filter) => (
                <Badge 
                  key={filter.key} 
                  variant="secondary" 
                  className="gap-2 pr-1"
                >
                  <span className="text-xs font-medium">{filter.label}:</span>
                  <span className="text-xs">{filter.value}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 w-4 h-4 hover:bg-transparent"
                    onClick={() => clearFilter(filter.key)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={clearAllFilters}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Limpiar todo
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {location === "/risks" && (
            <CreateGuard itemType="risk" showFallback={false}>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-risk">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Riesgo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Nuevo Riesgo</DialogTitle>
                    <DialogDescription>
                      Registrar un nuevo riesgo en el sistema con su evaluación correspondiente.
                    </DialogDescription>
                  </DialogHeader>
                  <RiskForm onSuccess={handleCreateSuccess} />
                </DialogContent>
              </Dialog>
            </CreateGuard>
          )}

          {location === "/compliance-audits" && (
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white" 
              data-testid="button-create-compliance-audit"
              onClick={() => setIsComplianceAuditDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nueva Auditoría de Cumplimiento
            </Button>
          )}

          {location === "/risk-events" && (
            <>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-risk-event">
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Evento
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Registrar Nuevo Evento de Riesgo</DialogTitle>
                    <DialogDescription>
                      Documenta un evento de riesgo materializado, fraude o delito que ha ocurrido.
                    </DialogDescription>
                  </DialogHeader>
                  <RiskEventForm onSuccess={handleCreateSuccess} />
                </DialogContent>
              </Dialog>
            </>
          )}

          {/* Risk Search and Filters Combined */}
          {location === "/risks" && (
            <RiskSearchAndFilterDialog
              onSearch={(term) => triggerSearch(term)}
              onFilterChange={(filters) => {
                setMacroprocesoFilter(filters.macroprocesoFilter);
                setProcessFilter(filters.processFilter);
                setSubprocesoFilter(filters.subprocesoFilter);
                setInherentRiskLevelFilter(filters.inherentRiskLevelFilter);
                setResidualRiskLevelFilter(filters.residualRiskLevelFilter);
                setValidationFilter(filters.validationFilter);
                setRiskOwnerFilter(filters.ownerFilter);
                
                // Dispatch filter change event for risks page
                window.dispatchEvent(new CustomEvent('riskFiltersChanged', {
                  detail: filters
                }));
              }}
              activeFiltersCount={activeFilters.length}
            />
          )}

          {/* Audit Plan Search and Filters Combined */}
          {location === "/audit-plan-list" && (
            <AuditPlanSearchAndFilterDialog
              onSearch={(term) => triggerSearch(term)}
              onFilterChange={(filters) => {
                setAuditPlanStatusFilter(filters.statusFilter);
                setAuditPlanYearFilter(filters.yearFilter);
                
                // Dispatch filter change event for audit plan page
                window.dispatchEvent(new CustomEvent('auditPlanFiltersChanged', {
                  detail: filters
                }));
              }}
              activeFiltersCount={activeFilters.length}
            />
          )}

          {/* Audit Findings Search and Filters Combined */}
          {location === "/audit-findings" && (
            <AuditFindingsSearchAndFilterDialog
              onSearch={(term) => triggerSearch(term)}
              onFilterChange={(filters) => {
                setFindingStatusFilter(filters.statusFilter);
                setFindingSeverityFilter(filters.severityFilter);
                setFindingTypeFilter(filters.typeFilter);
                setFindingAuditFilter(filters.auditFilter);
                
                // Dispatch filter change event for audit findings page
                window.dispatchEvent(new CustomEvent('auditFindingsFiltersChanged', {
                  detail: filters
                }));
              }}
              activeFiltersCount={(() => {
                let count = 0;
                if (findingStatusFilter !== "all") count++;
                if (findingSeverityFilter !== "all") count++;
                if (findingTypeFilter !== "all") count++;
                if (findingAuditFilter !== "all") count++;
                return count;
              })()}
            />
          )}

          {/* Control Search and Filters Combined */}
          {location === "/controls" && (
            <ControlSearchAndFilterDialog
              onSearch={(term) => {
                setControlSearchTerm(term);
                
                // Dispatch search event for controls page
                window.dispatchEvent(new CustomEvent('controlSearchChanged', {
                  detail: { searchTerm: term }
                }));
              }}
              onFilterChange={(filters) => {
                setControlTypeFilter(filters.typeFilter);
                setControlEffectivenessFilter(filters.effectivenessFilter);
                setControlStatusFilter(filters.statusFilter);
                setControlValidationStatusFilter(filters.validationStatusFilter);
                setControlResponsibleFilter(filters.responsibleFilter);
                
                // Dispatch filter change event for controls page
                window.dispatchEvent(new CustomEvent('controlsFiltersChanged', {
                  detail: filters
                }));
              }}
              activeFiltersCount={(() => {
                let count = 0;
                if (controlSearchTerm) count++;
                if (controlTypeFilter !== "all") count++;
                if (controlEffectivenessFilter !== "all") count++;
                if (controlStatusFilter !== "all") count++;
                if (controlValidationStatusFilter !== "all") count++;
                if (controlResponsibleFilter !== "all") count++;
                return count;
              })()}
            />
          )}

          {/* Risk Validation Filters */}
          {location === "/validation" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filtros
                  {activeFilters.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {activeFilters.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-0" align="end">
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filtrar Validación</h4>
                    {activeFilters.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs">
                        Limpiar Todo
                      </Button>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Estado de Validación</label>
                      <Select value={validationStatusFilter} onValueChange={handleValidationStatusFilterChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los estados</SelectItem>
                          <SelectItem value="pending_validation">⏳ Pendiente</SelectItem>
                          <SelectItem value="validated">✅ Validado</SelectItem>
                          <SelectItem value="observed">👁️ Observado</SelectItem>
                          <SelectItem value="rejected">❌ Rechazado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Propietario</label>
                      <Combobox
                        options={[
                          { value: "all", label: "Todos los propietarios" },
                          ...processOwners.map((owner: any) => ({
                            value: owner.id,
                            label: owner.name,
                            description: owner.position
                          }))
                        ]}
                        value={validationOwnerFilter}
                        onValueChange={handleValidationOwnerFilterChange}
                        placeholder="Seleccionar propietario"
                        searchPlaceholder="Buscar propietario..."
                        emptyText="No se encontró propietario"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Macroproceso</label>
                      <Select value={validationMacroprocesoFilter} onValueChange={handleValidationMacroprocesoFilterChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar macroproceso" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los macroprocesos</SelectItem>
                          {macroprocesos.map((macroproceso: any) => (
                            <SelectItem key={macroproceso.id} value={macroproceso.id}>
                              {macroproceso.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Proceso</label>
                      <Select value={validationProcessFilter} onValueChange={handleValidationProcessFilterChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar proceso" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los procesos</SelectItem>
                          {validationFilteredProcesses.map((process: any) => (
                            <SelectItem key={process.id} value={process.id}>
                              {process.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Nivel de Riesgo</label>
                      <Select value={validationRiskLevelFilter} onValueChange={handleValidationRiskLevelFilterChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar nivel" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los niveles</SelectItem>
                          <SelectItem value="bajo">🟢 Bajo</SelectItem>
                          <SelectItem value="medio">🟡 Medio</SelectItem>
                          <SelectItem value="alto">🟠 Alto</SelectItem>
                          <SelectItem value="crítico">🔴 Crítico</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Add Control Button - Moved before filters */}
          {location === "/controls" && (
            <Dialog 
              open={isCreateDialogOpen} 
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button data-testid="button-add-control">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Control
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nuevo Control</DialogTitle>
                  <DialogDescription>
                    Crear un nuevo control para mitigar riesgos en el sistema.
                  </DialogDescription>
                </DialogHeader>
                <ControlForm onSuccess={handleCreateSuccess} />
              </DialogContent>
            </Dialog>
          )}


          {/* Audits Filters */}
          {location === "/audits" && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filtros
                    {activeFilters.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                        {activeFilters.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-0" align="end">
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filtrar Auditorías</h4>
                    {activeFilters.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs">
                        Limpiar Todo
                      </Button>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Estado</label>
                      <Select value={auditStatusFilter} onValueChange={handleAuditStatusFilterChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los estados</SelectItem>
                          <SelectItem value="planned">📅 Planificada</SelectItem>
                          <SelectItem value="in_progress">🚧 En Progreso</SelectItem>
                          <SelectItem value="completed">✅ Completada</SelectItem>
                          <SelectItem value="cancelled">❌ Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Tipo</label>
                      <Select value={auditTypeFilter} onValueChange={handleAuditTypeFilterChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los tipos</SelectItem>
                          <SelectItem value="risk_based">⚠️ Basada en Riesgos</SelectItem>
                          <SelectItem value="compliance">📋 Cumplimiento</SelectItem>
                          <SelectItem value="operational">🔧 Operacional</SelectItem>
                          <SelectItem value="financial">💰 Financiera</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Plan de Auditoría</label>
                      <Select value={auditPlanFilter} onValueChange={handleAuditPlanFilterChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar plan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los planes</SelectItem>
                          {auditPlans.map((plan: any) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-stats-popover">
                  <BarChart3 className="h-4 w-4" />
                  Estadísticas
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" data-testid="popover-audit-stats">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Estadísticas de Auditorías</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Total</span>
                      </div>
                      <span className="font-bold">{audits.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">En Progreso</span>
                      </div>
                      <span className="font-bold">
                        {audits.filter((a: Audit) => a.status === "trabajo_campo").length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Completadas</span>
                      </div>
                      <span className="font-bold">
                        {audits.filter((a: Audit) => a.status === "completado").length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Planificadas</span>
                      </div>
                      <span className="font-bold">
                        {audits.filter((a: Audit) => a.status === "planificacion").length}
                      </span>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            </>
          )}

          {/* Regulations Filters */}
          {location === "/regulations" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filtros
                  {activeFilters.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {activeFilters.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-0" align="end">
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filtrar Normativas</h4>
                    {activeFilters.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs">
                        Limpiar Todo
                      </Button>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Criticidad</label>
                      <Select value={regulationCriticalityFilter} onValueChange={handleRegulationCriticalityFilterChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar criticidad" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las criticidades</SelectItem>
                          <SelectItem value="low">🟢 Baja</SelectItem>
                          <SelectItem value="medium">🟡 Media</SelectItem>
                          <SelectItem value="high">🟠 Alta</SelectItem>
                          <SelectItem value="critical">🔴 Crítica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Tipo de Fuente</label>
                      <Select value={regulationSourceFilter} onValueChange={handleRegulationSourceFilterChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar fuente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las fuentes</SelectItem>
                          <SelectItem value="internal">🏢 Interna</SelectItem>
                          <SelectItem value="external">🌐 Externa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Estado</label>
                      <Select value={regulationStatusFilter} onValueChange={handleRegulationStatusFilterChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los estados</SelectItem>
                          <SelectItem value="active">✅ Activa</SelectItem>
                          <SelectItem value="superseded">🔄 Reemplazada</SelectItem>
                          <SelectItem value="revoked">❌ Revocada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Nivel de Riesgo</label>
                      <Select value={regulationRiskLevelFilter} onValueChange={handleRegulationRiskLevelFilterChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar nivel de riesgo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los niveles</SelectItem>
                          <SelectItem value="sin riesgo">⚪ Sin riesgo</SelectItem>
                          <SelectItem value="bajo">🟢 Bajo</SelectItem>
                          <SelectItem value="medio">🟡 Medio</SelectItem>
                          <SelectItem value="alto">🟠 Alto</SelectItem>
                          <SelectItem value="crítico">🔴 Crítico</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Organismo Emisor</label>
                      <Select value={regulationIssuingOrgFilter} onValueChange={handleRegulationIssuingOrgFilterChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar organismo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los organismos</SelectItem>
                          {Array.from(new Set(regulations.map((r: any) => r.issuingOrganization))).map((org: any) => (
                            <SelectItem key={org} value={org}>
                              {org}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Risk Events Filters */}
          {location === "/risk-events" && (
            <Popover>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <Filter className="h-4 w-4" />
                        {activeFilters.length > 0 && (
                          <Badge variant="destructive" className="h-5 min-w-5 px-1 rounded-full text-xs font-medium">
                            {activeFilters.length}
                          </Badge>
                        )}
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Filtros</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <PopoverContent className="w-96 p-0" align="end">
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filtrar Eventos de Riesgo</h4>
                    {activeFilters.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs">
                        Limpiar Todo
                      </Button>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Tipo de Evento</label>
                      <Select value={eventTypeFilter} onValueChange={handleEventTypeFilterChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los tipos</SelectItem>
                          <SelectItem value="materializado">⚠️ Materializado</SelectItem>
                          <SelectItem value="fraude">🚨 Fraude</SelectItem>
                          <SelectItem value="delito">🔴 Delito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Estado</label>
                      <Select value={eventStatusFilter} onValueChange={handleEventStatusFilterChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los estados</SelectItem>
                          <SelectItem value="abierto">🟢 Abierto</SelectItem>
                          <SelectItem value="en_investigacion">🔍 En Investigación</SelectItem>
                          <SelectItem value="cerrado">✅ Cerrado</SelectItem>
                          <SelectItem value="escalado">🔺 Escalado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Severidad</label>
                      <Select value={eventSeverityFilter} onValueChange={handleEventSeverityFilterChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar severidad" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las severidades</SelectItem>
                          <SelectItem value="baja">🟢 Baja</SelectItem>
                          <SelectItem value="media">🟡 Media</SelectItem>
                          <SelectItem value="alta">🟠 Alta</SelectItem>
                          <SelectItem value="critica">🔴 Crítica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Proceso</label>
                      <Select value={eventProcessFilter} onValueChange={handleEventProcessFilterChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccionar proceso" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los procesos</SelectItem>
                          {riskEventProcesses.map((process: any) => (
                            <SelectItem key={process.id} value={process.id}>
                              {process.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Table Actions Menu for Risk Events */}
          {location === "/risk-events" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid="button-risk-events-table-actions">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Acciones de tabla</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => window.dispatchEvent(new CustomEvent('openRiskEventsSavedViewsMenu'))}
                  data-testid="menu-risk-events-saved-views"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Vistas Guardadas
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={exportRiskEventsToExcel} data-testid="menu-export-risk-events-excel">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar a Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/risk-events'] })} data-testid="menu-refresh-risk-events-data">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar datos
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  data-testid="menu-configure-risk-events-columns"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('configureRiskEventsColumns'));
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar columnas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Table Actions Menu for Controls */}
          {location === "/controls" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid="button-controls-table-actions">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Acciones de tabla</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => window.dispatchEvent(new CustomEvent('openControlsSavedViewsMenu'))}
                  data-testid="menu-controls-saved-views"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Vistas Guardadas
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={exportControlsToExcel} data-testid="menu-export-controls-excel">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar a Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/controls'] })} data-testid="menu-refresh-controls-data">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar datos
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  data-testid="menu-configure-controls-columns"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('configureControlsColumns'));
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar columnas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {location === "/regulations" && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-regulation">
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Normativa
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Nueva Normativa</DialogTitle>
                  <DialogDescription>
                    Agregar una nueva normativa regulatoria al sistema.
                  </DialogDescription>
                </DialogHeader>
                <RegulationForm onSuccess={handleCreateSuccess} />
              </DialogContent>
            </Dialog>
          )}
          
          {(location === "/config/categories" || location === "/config/risks") && (
            <Button data-testid="button-add-category" onClick={() => window.dispatchEvent(new CustomEvent('openCategoryDialog'))}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Categoría
            </Button>
          )}
          {location === "/matrix" && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filtros
                    {activeFilters.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                        {activeFilters.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-0" align="end">
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Filtrar Matriz de Riesgos</h4>
                      {activeFilters.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs">
                          Limpiar Todo
                        </Button>
                      )}
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Procesos</label>
                        <Select value={matrixProcessFilter} onValueChange={handleMatrixProcessFilterChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar proceso" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos los procesos</SelectItem>
                            {matrixMacroprocesos.map((macro: any) => (
                              <SelectItem key={`macro-${macro.id}`} value={macro.id} className="font-semibold">
                                📋 {macro.name}
                              </SelectItem>
                            ))}
                            {matrixProcesses.map((process: any) => (
                              <SelectItem key={`process-${process.id}`} value={process.id} className="pl-6">
                                ⚙️ {process.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Gerencia</label>
                        <Select value={matrixGerenciaFilter} onValueChange={handleMatrixGerenciaFilterChange}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Seleccionar gerencia" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todas las gerencias</SelectItem>
                            {matrixGerencias.map((gerencia: any) => (
                              <SelectItem key={gerencia.id} value={gerencia.id}>
                                🏢 {gerencia.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              <Button data-testid="button-export">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </>
          )}
          
          {/* Create Audit Button with Dropdown (only on /audits page) */}
          {location === "/audits" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button data-testid="button-create-audit-dropdown" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Crear nueva auditoría
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  data-testid="menu-item-create-from-plan"
                  onClick={() => window.dispatchEvent(new CustomEvent('openAuditFromPlanDialog'))}
                  className="gap-2 cursor-pointer"
                >
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <div className="flex flex-col">
                    <span className="font-medium">Desde plan</span>
                    <span className="text-xs text-muted-foreground">Auditoría planificada</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-testid="menu-item-create-emergent"
                  onClick={() => window.dispatchEvent(new CustomEvent('openAuditEmergentDialog'))}
                  className="gap-2 cursor-pointer"
                >
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <div className="flex flex-col">
                    <span className="font-medium">Emergente</span>
                    <span className="text-xs text-muted-foreground">Sin plan asociado</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Table Actions Menu (only on /risks page) */}
          {location === "/risks" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid="button-table-actions">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Acciones de tabla</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => window.dispatchEvent(new CustomEvent('openSavedViewsMenu'))}
                  data-testid="menu-saved-views"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Vistas Guardadas
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={exportToExcel} data-testid="menu-export-excel">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar a Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/risks'] })} data-testid="menu-refresh-data">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar datos
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  data-testid="menu-configure-columns"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('configureColumns'));
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar columnas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Table Actions Menu for Action Plans */}
          {(location === "/actions" || location === "/action-plans") && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid="button-action-plans-table-actions">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Acciones de tabla</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => window.dispatchEvent(new CustomEvent('exportActionPlansToExcel'))}
                  data-testid="menu-export-action-plans-excel"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar a Excel
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['/api/action-plans'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/actions'] });
                  }} 
                  data-testid="menu-refresh-action-plans-data"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar datos
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  data-testid="menu-configure-action-plans-columns"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('configureActionPlansColumns'));
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar columnas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          <AIAssistantDialog />
          
          {/* Create User Button (only on /config/users page) */}
          {location === "/config/users" && (
            <CreateGuard itemType="user">
              <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-user-header">
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Usuario
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                    <DialogDescription>
                      Completa la información para crear un nuevo usuario.
                    </DialogDescription>
                  </DialogHeader>
                  <UserForm
                    user={null}
                    roles={roles}
                    onSuccess={() => {
                      setIsUserDialogOpen(false);
                      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
                      toast({
                        title: "Usuario creado",
                        description: "El usuario ha sido creado exitosamente.",
                      });
                    }}
                  />
                </DialogContent>
              </Dialog>
            </CreateGuard>
          )}
          
          {/* Create Compliance Document Button (only on /compliance-documents page) */}
          {location === "/compliance-documents" && (
            <CreateGuard itemType="document">
              <Dialog open={isComplianceDocumentDialogOpen} onOpenChange={setIsComplianceDocumentDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-document-header">
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Documento
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Documento de Cumplimiento</DialogTitle>
                    <DialogDescription>
                      Registra un nuevo documento normativo, política o procedimiento.
                    </DialogDescription>
                  </DialogHeader>
                  <ComplianceDocumentForm
                    onSuccess={() => {
                      setIsComplianceDocumentDialogOpen(false);
                      queryClient.invalidateQueries({ queryKey: ["/api/compliance-documents"] });
                      toast({
                        title: "Documento creado",
                        description: "El documento ha sido creado exitosamente.",
                      });
                    }}
                  />
                </DialogContent>
              </Dialog>
            </CreateGuard>
          )}

          {/* Nuevo Plan de Auditoría Button - only on audit-plan-list page */}
          {location === "/audit-plan-list" && (
            <CreateGuard itemType="audit_plan">
              <Button 
                onClick={() => setLocation("/audit-plan-wizard")}
                className="gap-2"
                data-testid="button-new-audit-plan"
              >
                <Plus className="h-4 w-4" />
                Nuevo Plan de Auditoría
              </Button>
            </CreateGuard>
          )}
          
          {/* Audit Findings - New Finding Button */}
          {location === "/audit-findings" && (
            <Button 
              onClick={() => window.dispatchEvent(new CustomEvent('openAuditFindingDialog'))}
              className="flex items-center gap-2"
              data-testid="button-create-audit-finding"
            >
              <Plus className="h-4 w-4" />
              Nuevo Hallazgo
            </Button>
          )}
          
          {/* Nuevo Plan de Acción Button - Only on action plans page */}
          {(location === "/action-plans" || location === "/actions") && (
            <Button 
              size="sm"
              onClick={() => window.dispatchEvent(new CustomEvent('openActionPlanDialog'))}
              data-testid="button-new-action-plan-header"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nuevo Plan de Acción</span>
              <span className="sm:hidden">Plan</span>
            </Button>
          )}
          
          {/* User Menu - Active */}
          <UserMenu />
          
          {/* Theme Toggle - Active */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  data-testid="button-toggle-theme"
                  className="h-9 w-9"
                >
                  {theme === "light" ? (
                    <Moon className="h-4 w-4" />
                  ) : (
                    <Sun className="h-4 w-4" />
                  )}
                  <span className="sr-only">Cambiar tema</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{theme === "light" ? "Modo oscuro" : "Modo claro"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </header>
  );
}
