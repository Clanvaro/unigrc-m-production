import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { ArrowLeft, ArrowRight, Save, Send, ChevronLeft, Cloud, ChevronUp, ChevronDown, RefreshCw, X, Eye } from "lucide-react";
import { useAutoSave } from "@/hooks/use-auto-save";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { TreeView, TreeNode } from "@/components/ui/tree-view";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Stepper, StepperContent, StepperActions } from "@/components/ui/stepper";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { 
  AuditUniverse, 
  AuditPlan, 
  AuditPrioritizationFactors, 
  AuditPlanItem,
  AuditPlanItemWithDetails,
  User
} from "@shared/schema";

interface UniverseSelection {
  universeId: string;
  selected: boolean;
}

interface PrioritizationData {
  universeId: string;
  riskScore: number;
  previousAuditResult: string;
  strategicPriority: number;
  hasFraudHistory: boolean;
  hasRegulatoryRequirement: boolean;
  hasManagementRequest: boolean;
  yearsSinceLastAudit: number;
  estimatedComplexity: number;
  totalScore: number;
}

interface SchedulingData {
  universeId: string;
  quarter: string;
  estimatedHours: number;
  tentativeResponsible: string;
}

interface PlanBasicInfo {
  name: string;
  year: number;
  description: string;
  periodType: 'calendar' | 'fiscal' | 'multi_year';
  startMonth?: number;
  endMonth?: number;
  endYear?: number;
}

const steps = [
  { id: "plan-setup", title: "Configuración del Plan", description: "Definir periodo y seleccionar áreas auditables" },
  { id: "prioritization", title: "Selección y Priorización", description: "Configurar factores de priorización" },
  { id: "scheduling", title: "Calendario y Recursos", description: "Asignar trimestre y recursos" },
  { id: "review", title: "Revisión y Aprobación", description: "Revisar y aprobar el plan" },
];

// Helper function to build tree structure from flat audit universe data
function buildAuditUniverseTree(items: any[]): TreeNode[] {
  // First, deduplicate items by unique combination of macroproceso/process/subproceso
  const uniqueItems = new Map<string, any>();
  items.forEach(item => {
    const key = `${item.macroprocesoId}-${item.processId || 'no-process'}-${item.subprocesoId || 'no-subproc'}`;
    // Keep the first occurrence of each unique combination
    if (!uniqueItems.has(key)) {
      uniqueItems.set(key, item);
    }
  });
  const deduplicatedItems = Array.from(uniqueItems.values());
  
  // Filter out items that are of entityType "macroproceso" - we only want process and subproceso items
  const processAndSubprocesoItems = deduplicatedItems.filter(
    item => item.entityType !== 'macroproceso'
  );
  
  // Group by macroproceso
  const macroGroups = new Map<string, any[]>();
  
  processAndSubprocesoItems.forEach(item => {
    const macroId = item.macroprocesoId;
    if (!macroGroups.has(macroId)) {
      macroGroups.set(macroId, []);
    }
    macroGroups.get(macroId)!.push(item);
  });
  
  // Build tree nodes
  const treeNodes: TreeNode[] = [];
  
  macroGroups.forEach((macroItems, macroId) => {
    const firstItem = macroItems[0];
    const macroName = (firstItem.macroproceso?.name || "Sin Macroproceso");
    
    // Group by proceso within this macroproceso
    const processGroups = new Map<string, any[]>();
    
    macroItems.forEach(item => {
      const processId = item.processId || "no-process";
      if (!processGroups.has(processId)) {
        processGroups.set(processId, []);
      }
      processGroups.get(processId)!.push(item);
    });
    
    // Build proceso nodes
    const processNodes: TreeNode[] = [];
    
    processGroups.forEach((processItems, processId) => {
      if (processId === "no-process") {
        // Items without a specific process - add as leaf nodes directly
        processItems.forEach(item => {
          processNodes.push({
            id: item.id,
            label: item.auditableEntity,
            level: 1,
            type: 'proceso',
            data: item,
          });
        });
      } else {
        // Check if these items have subprocesos or are just process-level items
        const hasSubprocesos = processItems.some(item => item.subprocesoId !== null);
        
        if (!hasSubprocesos) {
          // These are process-level items without subprocesos - add as leaf nodes
          processItems.forEach(item => {
            processNodes.push({
              id: item.id,
              label: item.auditableEntity,
              level: 1,
              type: 'proceso',
              data: item,
            });
          });
        } else {
          // These items have subprocesos - create hierarchy
          const firstProcessItem = processItems[0];
          const processName = firstProcessItem.process?.name || "Sin Proceso";
          
          // Build subproceso leaf nodes (only for items with subprocesoId)
          const subprocesoNodes: TreeNode[] = processItems
            .filter(item => item.subprocesoId !== null)
            .map(item => ({
              id: item.id,
              label: item.auditableEntity,
              level: 2,
              type: 'subproceso' as const,
              data: item,
            }));
          
          // Add process node with its subprocesses
          processNodes.push({
            id: `process-${processId}`,
            label: processName,
            level: 1,
            type: 'proceso',
            children: subprocesoNodes,
            data: { processId, processName },
          });
        }
      }
    });
    
    // Add macroproceso node with its processes
    treeNodes.push({
      id: `macro-${macroId}`,
      label: macroName,
      level: 0,
      type: 'macroproceso',
      children: processNodes,
      data: { macroId, macroName },
    });
  });
  
  return treeNodes;
}

// Helper function to get all node IDs in a subtree
function getAllNodeIds(node: TreeNode): string[] {
  const ids = [node.id];
  if (node.children) {
    node.children.forEach(child => {
      ids.push(...getAllNodeIds(child));
    });
  }
  return ids;
}

// Helper function to get all leaf node IDs (actual audit universe items)
function getLeafNodeIds(node: TreeNode): string[] {
  // If this is a leaf node (has data with real audit universe item), return its ID
  if (!node.children || node.children.length === 0) {
    // Only return ID if it's a real audit universe item (not a synthetic ID)
    if (node.data && !node.id.startsWith('macro-') && !node.id.startsWith('process-')) {
      return [node.id];
    }
    return [];
  }
  
  // For parent nodes, collect all leaf IDs from children
  const leafIds: string[] = [];
  node.children.forEach(child => {
    leafIds.push(...getLeafNodeIds(child));
  });
  return leafIds;
}

export default function AuditPlanWizard() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const { toast } = useToast();
  const { isAdmin } = usePermissions();
  const planId = new URLSearchParams(searchParams).get("planId");
  const mode = new URLSearchParams(searchParams).get("mode") || "edit"; // "view" or "edit"
  const isViewMode = mode === "view";
  
  const [currentStep, setCurrentStep] = useState(0);
  const [planInfo, setPlanInfo] = useState<PlanBasicInfo>({
    name: "",
    year: new Date().getFullYear(),
    description: "",
    periodType: "calendar",
    startMonth: 1,
    endMonth: 12,
  });
  const [universeSelections, setUniverseSelections] = useState<UniverseSelection[]>([]);
  const [includedEntities, setIncludedEntities] = useState<string[]>([]); // IDs of entities to include in plan
  const [prioritizations, setPrioritizations] = useState<PrioritizationData[]>([]);
  const [schedulings, setSchedulings] = useState<SchedulingData[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Track if includedEntities has been initialized
  const includedEntitiesInitialized = useRef(false);
  
  // Sorting states for each step
  const [sortColumnStep2, setSortColumnStep2] = useState<"macroproceso" | "proceso" | "subproceso" | "riskScore" | "totalScore">("macroproceso");
  const [sortOrderStep2, setSortOrderStep2] = useState<"asc" | "desc" | "none">("none");
  const [sortColumnStep3, setSortColumnStep3] = useState<"macroproceso" | "proceso" | "subproceso" | "totalScore">("macroproceso");
  const [sortOrderStep3, setSortOrderStep3] = useState<"asc" | "desc" | "none">("none");
  const [sortColumnStep4, setSortColumnStep4] = useState<"macroproceso" | "proceso" | "subproceso" | "totalScore">("macroproceso");
  const [sortOrderStep4, setSortOrderStep4] = useState<"asc" | "desc" | "none">("none");

  // Queries - must come before useAutoSave
  const { data: universeItems = [], isLoading: loadingUniverse } = useQuery<AuditUniverse[]>({
    queryKey: ["/api/audit-universe"],
  });

  const { data: existingPlan, isLoading: loadingPlan } = useQuery<AuditPlan>({
    queryKey: ["/api/audit-plans", planId],
    enabled: !!planId,
  });

  const { data: existingPlanItems = [], isLoading: loadingPlanItems } = useQuery<AuditPlanItemWithDetails[]>({
    queryKey: ["/api/audit-plans", planId, "items"],
    enabled: !!planId,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Get accumulated residual risks for audit universe entities
  const { data: residualRisks = [] } = useQuery<Array<{
    processId: string | null;
    subprocesoId: string | null;
    accumulatedResidualRisk: number;
  }>>({
    queryKey: ["/api/audit-universe/residual-risks"],
  });

  // Get fraud history (risk events in last 3 years)
  const { data: fraudHistoryMap = {} } = useQuery<Record<string, boolean>>({
    queryKey: ["/api/risk-events/fraud-history/check", { year: planInfo.year, startMonth: planInfo.startMonth }],
    enabled: !!planInfo.year,
  });

  // Auto-save progress to localStorage
  const wizardProgress = useMemo(() => ({
    currentStep,
    planInfo,
    universeSelections,
    includedEntities,
    prioritizations,
    schedulings,
  }), [currentStep, planInfo, universeSelections, includedEntities, prioritizations, schedulings]);

  const autoSaveKey = planId ? `audit-plan-draft-${planId}` : "audit-plan-draft-new";
  
  const { clearSaved, loadSaved } = useAutoSave({
    data: wizardProgress,
    key: autoSaveKey,
    enabled: !loadingPlan && !loadingUniverse && !loadingPlanItems, // Only save after initial load
    debounceMs: 2000, // Save 2 seconds after last change
    onSave: () => setLastSaved(new Date()),
  });

  // Sync selections with universe items (handles initial load, regeneration, and changes)
  useEffect(() => {
    if (universeItems.length > 0) {
      setUniverseSelections(prev => {
        // Check if the universe items have actually changed (different IDs or count)
        const currentIds = new Set(prev.map(s => s.universeId));
        const newIds = new Set(universeItems.map(item => item.id));
        
        // Only update if there are different IDs (new items, removed items, or initial load)
        const hasChanges = prev.length !== universeItems.length ||
          universeItems.some(item => !currentIds.has(item.id)) ||
          prev.some(s => !newIds.has(s.universeId));
        
        if (!hasChanges) {
          return prev; // No changes, keep existing state
        }
        
        // Create a map of existing selections for quick lookup
        const existingMap = new Map(prev.map(s => [s.universeId, s.selected]));
        
        // Create new selections array based on current universe items
        const newSelections = universeItems.map(item => ({
          universeId: item.id,
          // Preserve existing selection state, or default to item.isActive for new items
          selected: existingMap.has(item.id) ? existingMap.get(item.id)! : item.isActive,
        }));
        
        return newSelections;
      });
    }
  }, [universeItems]);

  // Load existing plan data if editing
  useEffect(() => {
    if (existingPlan) {
      setPlanInfo({
        name: existingPlan.name,
        year: existingPlan.year,
        description: existingPlan.description || "",
        periodType: (existingPlan.periodType as 'calendar' | 'fiscal' | 'multi_year') || "calendar",
        startMonth: existingPlan.startMonth || undefined,
        endMonth: existingPlan.endMonth || undefined,
        endYear: existingPlan.endYear || undefined,
      });

      // Restore wizard progress from database if plan is still in draft or in_progress status
      if ((existingPlan.status === 'draft' || existingPlan.status === 'in_progress') && existingPlan.wizardData) {
        const wizardData = existingPlan.wizardData as any;
        
        // Restore step
        if (typeof existingPlan.wizardStep === 'number') {
          setCurrentStep(existingPlan.wizardStep);
        }
        
        // Restore wizard state
        if (wizardData.prioritizations) setPrioritizations(wizardData.prioritizations);
        if (wizardData.schedulings) setSchedulings(wizardData.schedulings);
        if (wizardData.includedEntities) {
          setIncludedEntities(wizardData.includedEntities);
          includedEntitiesInitialized.current = true;
        }
        if (wizardData.universeSelections) setUniverseSelections(wizardData.universeSelections);
        
        toast({
          title: "Progreso restaurado",
          description: `Continuando desde el paso ${(existingPlan.wizardStep || 0) + 1}`,
        });
      }
    }
  }, [existingPlan, toast]);

  // Load existing plan items (schedulings and prioritizations) if editing
  useEffect(() => {
    if (existingPlanItems && existingPlanItems.length > 0) {
      // Populate schedulings from plan items
      const loadedSchedulings: SchedulingData[] = existingPlanItems.map(item => ({
        universeId: item.universeId,
        quarter: item.plannedQuarter ? `Q${item.plannedQuarter}` : "",
        estimatedHours: item.estimatedDuration || 0,
        tentativeResponsible: item.proposedLeadAuditor || "",
      }));
      setSchedulings(loadedSchedulings);

      // Populate prioritizations from plan items (if they have prioritization data)
      const loadedPrioritizations: PrioritizationData[] = existingPlanItems
        .filter(item => item.prioritization)
        .map(item => {
          const p = item.prioritization!;
          return {
            universeId: item.universeId,
            riskScore: p.riskScore || 0,
            previousAuditResult: p.previousAuditResult || "none",
            strategicPriority: p.strategicPriority || 1,
            hasFraudHistory: p.fraudHistory || false,
            hasRegulatoryRequirement: p.regulatoryRequirement || false,
            hasManagementRequest: p.managementRequest || false,
            yearsSinceLastAudit: p.timesSinceLastAudit || 0,
            estimatedComplexity: p.complexity || 50,
            totalScore: p.priorityScore || 0,
          };
        });
      setPrioritizations(loadedPrioritizations);

      // Populate universeSelections and includedEntities
      const selectedIds = existingPlanItems.map(item => item.universeId);
      setIncludedEntities(selectedIds);
      
      setUniverseSelections(prev => 
        prev.map(sel => ({
          ...sel,
          selected: selectedIds.includes(sel.universeId)
        }))
      );
    }
  }, [existingPlanItems]);

  // Load saved progress from localStorage on mount
  useEffect(() => {
    if (!loadingPlan && !loadingUniverse && !existingPlan) {
      const saved = loadSaved();
      if (saved) {
        setCurrentStep(saved.currentStep || 0);
        if (saved.planInfo) {
          // Merge with default values to ensure startMonth/endMonth are always set
          setPlanInfo(prev => ({
            ...prev,
            ...saved.planInfo,
            startMonth: saved.planInfo.startMonth ?? prev.startMonth,
            endMonth: saved.planInfo.endMonth ?? prev.endMonth,
          }));
        }
        if (saved.universeSelections) setUniverseSelections(saved.universeSelections);
        if (saved.includedEntities) {
          setIncludedEntities(saved.includedEntities);
          includedEntitiesInitialized.current = true; // Mark as initialized when loading saved data
        }
        if (saved.prioritizations) setPrioritizations(saved.prioritizations);
        if (saved.schedulings) setSchedulings(saved.schedulings);
        
        toast({
          title: "Progreso recuperado",
          description: "Se ha cargado tu progreso guardado anteriormente.",
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingPlan, loadingUniverse, existingPlan]);

  // Initialize includedEntities when universeSelections change (default: all selected items are included)
  // Only runs once on initial load to prevent re-initializing when user deselects all
  useEffect(() => {
    if (universeSelections.length > 0 && !includedEntitiesInitialized.current) {
      const selectedIds = universeSelections
        .filter(s => s.selected)
        .map(s => s.universeId);
      setIncludedEntities(selectedIds);
      includedEntitiesInitialized.current = true;
    }
  }, [universeSelections]);

  // Debounced auto-save to database (5 seconds after last change)
  useEffect(() => {
    if (!planId || !includedEntitiesInitialized.current || loadingPlan || loadingUniverse) {
      return; // Don't autosave until we have a planId and initial data is loaded
    }

    const timeoutId = setTimeout(() => {
      persistWizardProgress(planId, currentStep).catch(err => {
        console.error("Debounced autosave failed:", err);
        // Silently fail - localStorage backup exists
      });
    }, 5000); // 5 second debounce

    return () => clearTimeout(timeoutId);
  }, [planId, currentStep, prioritizations, schedulings, includedEntities, universeSelections, planInfo, loadingPlan, loadingUniverse]);

  // Auto-populate plan name when reaching Step 4 if empty
  useEffect(() => {
    if (currentStep === 3 && !planInfo.name) {
      setPlanInfo(prev => ({
        ...prev,
        name: `Plan Anual de Auditoría ${prev.year}`,
      }));
    }
  }, [currentStep, planInfo.name, planInfo.year]);

  // Calculate prioritization score
  const calculatePriorityScore = (data: Omit<PrioritizationData, "totalScore" | "universeId">): number => {
    let score = 0;
    
    score += data.riskScore * 0.3;
    
    const auditResultScores: Record<string, number> = {
      ninguna: 30,
      mala: 25,
      regular: 15,
      buena: 5,
    };
    score += auditResultScores[data.previousAuditResult] || 0;
    
    score += data.strategicPriority * 10;
    score += data.hasFraudHistory ? 15 : 0;
    score += data.hasRegulatoryRequirement ? 15 : 0;
    score += data.hasManagementRequest ? 10 : 0;
    score += Math.min(data.yearsSinceLastAudit * 3, 15);
    score += data.estimatedComplexity * 0.1;
    
    return Math.round(score);
  };

  // Mutations
  const saveWizardProgressMutation = useMutation({
    mutationFn: async ({ planIdToSave, step, data }: { planIdToSave: string; step: number; data: any }) => {
      return await apiRequest(`/api/audit-plans/${planIdToSave}/wizard-progress`, "PATCH", {
        wizardStep: step,
        wizardData: data,
      });
    },
    onError: (error) => {
      console.error("Error saving wizard progress:", error);
      // Silently fail - the user can continue working and localStorage backup exists
    },
  });

  const savePlanMutation = useMutation({
    mutationFn: async (status: string) => {
      const planData = {
        ...planInfo,
        status,
      };

      let savedPlan: AuditPlan;
      
      if (planId) {
        savedPlan = await apiRequest(`/api/audit-plans/${planId}`, "PUT", planData);
      } else {
        savedPlan = await apiRequest("/api/audit-plans", "POST", planData);
      }

      // Get existing prioritization factors and items if editing
      let existingFactors: AuditPrioritizationFactors[] = [];
      let existingItems: AuditPlanItemWithDetails[] = [];
      
      if (planId) {
        try {
          existingFactors = await apiRequest(`/api/audit-plans/${planId}/prioritization`, "GET");
          existingItems = await apiRequest(`/api/audit-plans/${planId}/items`, "GET");
        } catch (error) {
          console.log("No existing factors/items found, will create new ones");
        }
      }

      const selectedItems = universeSelections.filter(s => s.selected);
      
      for (const selection of selectedItems) {
        const prioritization = prioritizations.find(p => p.universeId === selection.universeId);
        const scheduling = schedulings.find(s => s.universeId === selection.universeId);
        
        if (prioritization && scheduling) {
          // Check if factor already exists
          const existingFactor = existingFactors.find(f => f.universeId === selection.universeId);
          
          let factors;
          if (existingFactor) {
            // Update existing factor
            factors = await apiRequest(`/api/audit-prioritization/${existingFactor.id}`, "PUT", {
              riskScore: prioritization.riskScore,
              previousAuditResult: prioritization.previousAuditResult,
              strategicPriority: prioritization.strategicPriority,
              fraudHistory: prioritization.hasFraudHistory,
              regulatoryRequirement: prioritization.hasRegulatoryRequirement,
              managementRequest: prioritization.hasManagementRequest,
              timesSinceLastAudit: prioritization.yearsSinceLastAudit,
              auditComplexity: prioritization.estimatedComplexity,
              totalPriorityScore: prioritization.totalScore,
            });
          } else {
            // Create new factor
            factors = await apiRequest(`/api/audit-plans/${savedPlan.id}/prioritization`, "POST", {
              universeId: selection.universeId,
              riskScore: prioritization.riskScore,
              previousAuditResult: prioritization.previousAuditResult,
              strategicPriority: prioritization.strategicPriority,
              fraudHistory: prioritization.hasFraudHistory,
              regulatoryRequirement: prioritization.hasRegulatoryRequirement,
              managementRequest: prioritization.hasManagementRequest,
              timesSinceLastAudit: prioritization.yearsSinceLastAudit,
              auditComplexity: prioritization.estimatedComplexity,
              totalPriorityScore: prioritization.totalScore,
              estimatedAuditHours: scheduling.estimatedHours,
            });
          }
          
          // Extract quarter number from "Q1", "Q2", etc.
          const quarterNumber = scheduling.quarter ? parseInt(scheduling.quarter.replace('Q', '')) : null;
          
          // Check if item already exists
          const existingItem = existingItems.find(item => item.universeId === selection.universeId);
          
          if (existingItem) {
            // Update existing item
            await apiRequest(`/api/audit-plan-items/${existingItem.id}`, "PUT", {
              status: "selected",
              plannedQuarter: quarterNumber,
              estimatedDuration: scheduling.estimatedHours,
              proposedLeadAuditor: scheduling.tentativeResponsible || null,
            });
          } else {
            // Create new item
            await apiRequest(`/api/audit-plans/${savedPlan.id}/items`, "POST", {
              universeId: selection.universeId,
              prioritizationId: factors.id,
              status: "selected",
              plannedQuarter: quarterNumber,
              estimatedDuration: scheduling.estimatedHours,
              proposedLeadAuditor: scheduling.tentativeResponsible || null,
            });
          }
        }
      }

      return savedPlan;
    },
    onSuccess: async (savedPlan, status) => {
      queryClient.invalidateQueries({ queryKey: ["/api/audit-plans"] });
      clearSaved(); // Clear auto-saved progress after successful save
      
      // Clear wizard progress from database when plan is finalized (not draft)
      if (status !== "draft" && savedPlan?.id) {
        try {
          await apiRequest(`/api/audit-plans/${savedPlan.id}/wizard-progress`, "PATCH", {
            wizardStep: null,
            wizardData: null,
          });
        } catch (error) {
          console.error("Failed to clear wizard progress:", error);
          // Non-critical, continue
        }
      }
      
      toast({
        title: status === "draft" ? "Plan guardado como borrador" : "Plan enviado a revisión",
        description: "El plan de auditoría se guardó exitosamente",
      });
      setLocation("/audit-plan-list");
    },
    onError: () => {
      toast({
        title: "Error al guardar el plan",
        variant: "destructive",
      });
    },
  });

  // Selected universe items (deduplicated)
  const selectedUniverseItems = useMemo(() => {
    const selected = universeItems.filter(item => 
      universeSelections.find(s => s.universeId === item.id && s.selected)
    );
    
    // Deduplicate based on macroproceso + process + subproceso combination
    const uniqueItems = new Map<string, typeof selected[0]>();
    selected.forEach(item => {
      const key = `${item.macroprocesoId}-${item.processId || 'none'}-${item.subprocesoId || 'none'}`;
      if (!uniqueItems.has(key)) {
        uniqueItems.set(key, item);
      }
    });
    
    return Array.from(uniqueItems.values());
  }, [universeItems, universeSelections]);

  // Helper function to get accumulated residual risk for an entity
  const getResidualRiskForEntity = (item: AuditUniverse): number => {
    const match = residualRisks.find(r =>
      r.processId === item.processId &&
      r.subprocesoId === item.subprocesoId
    );
    return match ? Math.round(match.accumulatedResidualRisk) : 0;
  };

  // Helper function to check if entity has fraud history
  const hasFraudHistoryForEntity = (item: AuditUniverse): boolean => {
    // Check subproceso level
    if (item.subprocesoId && fraudHistoryMap[`subproceso:${item.subprocesoId}`]) {
      return true;
    }
    
    // Check process level (important for processes acting as subprocesses)
    if (item.processId && fraudHistoryMap[`process:${item.processId}`]) {
      return true;
    }
    
    // Check macroproceso level
    if (item.macroprocesoId && fraudHistoryMap[`macro:${item.macroprocesoId}`]) {
      return true;
    }
    
    return false;
  };

  // Auto-initialize prioritization data for selected items that don't have it yet
  useEffect(() => {
    if (selectedUniverseItems.length > 0 && residualRisks.length > 0) {
      setPrioritizations(prev => {
        const itemsNeedingPrioritization = selectedUniverseItems.filter(
          item => !prev.some(p => p.universeId === item.id)
        );
        
        if (itemsNeedingPrioritization.length > 0) {
          const newPrioritizations = itemsNeedingPrioritization.map(item => {
            const match = residualRisks.find(r =>
              r.processId === item.processId &&
              r.subprocesoId === item.subprocesoId
            );
            const riskScore = match ? Math.round(match.accumulatedResidualRisk) : 0;
            
            return {
              universeId: item.id,
              riskScore,
              previousAuditResult: "ninguna" as const,
              strategicPriority: 1,
              hasFraudHistory: hasFraudHistoryForEntity(item),
              hasRegulatoryRequirement: false,
              hasManagementRequest: false,
              yearsSinceLastAudit: 0,
              estimatedComplexity: 50,
              totalScore: riskScore + 1, // Initial score
            };
          });
          
          return [...prev, ...newPrioritizations];
        }
        
        return prev;
      });
    }
  }, [selectedUniverseItems, residualRisks, fraudHistoryMap]);

  // Update hasFraudHistory when fraudHistoryMap changes
  useEffect(() => {
    if (Object.keys(fraudHistoryMap).length > 0 && selectedUniverseItems.length > 0) {
      setPrioritizations(prev => {
        let hasChanges = false;
        const updated = prev.map(p => {
          const item = selectedUniverseItems.find(i => i.id === p.universeId);
          if (item) {
            const shouldHaveFraud = hasFraudHistoryForEntity(item);
            if (p.hasFraudHistory !== shouldHaveFraud) {
              hasChanges = true;
              const updatedP = { ...p, hasFraudHistory: shouldHaveFraud };
              return { ...updatedP, totalScore: calculatePriorityScore(updatedP) };
            }
          }
          return p;
        });
        
        return hasChanges ? updated : prev;
      });
    }
  }, [fraudHistoryMap, selectedUniverseItems]);

  // Prioritized items sorted (filtered by included entities for Step 3)
  const prioritizedItems = useMemo(() => {
    return selectedUniverseItems
      .filter(item => includedEntities.includes(item.id)) // Only show entities included in plan
      .map(item => ({
        ...item,
        prioritization: prioritizations.find(p => p.universeId === item.id),
      }))
      .filter(item => item.prioritization)
      .sort((a, b) => (b.prioritization?.totalScore || 0) - (a.prioritization?.totalScore || 0));
  }, [selectedUniverseItems, prioritizations, includedEntities]);

  // Quarter distribution
  const quarterDistribution = useMemo(() => {
    const dist = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    schedulings.forEach(s => {
      if (s.quarter && dist.hasOwnProperty(s.quarter)) {
        dist[s.quarter as keyof typeof dist]++;
      }
    });
    return dist;
  }, [schedulings]);

  const totalEstimatedHours = useMemo(() => {
    return schedulings.reduce((sum, s) => sum + (s.estimatedHours || 0), 0);
  }, [schedulings]);

  // Build tree structure from audit universe data
  const treeNodes = useMemo(() => {
    if (universeItems.length === 0) return [];
    return buildAuditUniverseTree(universeItems);
  }, [universeItems]);
  
  // Get set of selected IDs for tree view
  const selectedIds = useMemo(() => {
    return new Set(universeSelections.filter(s => s.selected).map(s => s.universeId));
  }, [universeSelections]);
  
  // Find tree node by ID
  const findNodeById = (nodes: TreeNode[], id: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Sorting handlers
  const handleSortStep2 = (column: "macroproceso" | "proceso" | "subproceso" | "riskScore" | "totalScore") => {
    if (sortColumnStep2 === column) {
      if (sortOrderStep2 === "none" || sortOrderStep2 === "desc") {
        setSortOrderStep2("asc");
      } else {
        setSortOrderStep2("desc");
      }
    } else {
      setSortColumnStep2(column);
      setSortOrderStep2("asc");
    }
  };

  const handleSortStep3 = (column: "macroproceso" | "proceso" | "subproceso" | "totalScore") => {
    if (sortColumnStep3 === column) {
      if (sortOrderStep3 === "none" || sortOrderStep3 === "desc") {
        setSortOrderStep3("asc");
      } else {
        setSortOrderStep3("desc");
      }
    } else {
      setSortColumnStep3(column);
      setSortOrderStep3("asc");
    }
  };

  const handleSortStep4 = (column: "macroproceso" | "proceso" | "subproceso" | "totalScore") => {
    if (sortColumnStep4 === column) {
      if (sortOrderStep4 === "none" || sortOrderStep4 === "desc") {
        setSortOrderStep4("asc");
      } else {
        setSortOrderStep4("desc");
      }
    } else {
      setSortColumnStep4(column);
      setSortOrderStep4("asc");
    }
  };

  // Handlers
  const handleUniverseToggle = (nodeId: string, selected: boolean) => {
    const node = findNodeById(treeNodes, nodeId);
    if (!node) return;
    
    // Get all leaf IDs (actual audit universe items) affected by this toggle
    const leafIds = getLeafNodeIds(node);
    
    // Update selections for all affected leaf nodes
    setUniverseSelections(prev =>
      prev.map(s => 
        leafIds.includes(s.universeId) 
          ? { ...s, selected } 
          : s
      )
    );
  };

  const handlePrioritizationChange = (universeId: string, field: string, value: any) => {
    setPrioritizations(prev => {
      const existing = prev.find(p => p.universeId === universeId);
      const updated = existing
        ? { ...existing, [field]: value }
        : {
            universeId,
            riskScore: 50,
            previousAuditResult: "ninguna",
            strategicPriority: 1,
            hasFraudHistory: false,
            hasRegulatoryRequirement: false,
            hasManagementRequest: false,
            yearsSinceLastAudit: 0,
            estimatedComplexity: 50,
            totalScore: 0,
            [field]: value,
          };
      
      const totalScore = calculatePriorityScore(updated);
      const withScore = { ...updated, totalScore };
      
      return prev.some(p => p.universeId === universeId)
        ? prev.map(p => p.universeId === universeId ? withScore : p)
        : [...prev, withScore];
    });
  };

  const handleSchedulingChange = (universeId: string, field: string, value: any) => {
    setSchedulings(prev => {
      const existing = prev.find(s => s.universeId === universeId);
      const updated = existing
        ? { ...existing, [field]: value }
        : { universeId, quarter: "", estimatedHours: 0, tentativeResponsible: "", [field]: value };
      
      return prev.some(s => s.universeId === universeId)
        ? prev.map(s => s.universeId === universeId ? updated : s)
        : [...prev, updated];
    });
  };

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return universeSelections.some(s => s.selected);
      case 1:
        return selectedUniverseItems.every(item =>
          prioritizations.some(p => p.universeId === item.id)
        );
      case 2:
        // Only validate included entities (those marked as "Incluir" in Step 2)
        const includedItems = selectedUniverseItems.filter(item => includedEntities.includes(item.id));
        return includedItems.every(item =>
          schedulings.some(s => s.universeId === item.id && s.quarter && s.estimatedHours > 0)
        );
      case 3:
        return !!planInfo.name && !!planInfo.year;
      default:
        return true;
    }
  };

  // Helper to persist wizard progress to database
  const persistWizardProgress = async (planIdToSave: string, step: number) => {
    const payload = {
      prioritizations,
      schedulings,
      includedEntities,
      universeSelections,
      planInfo,
      timestamp: new Date().toISOString(),
    };

    await saveWizardProgressMutation.mutateAsync({
      planIdToSave,
      step,
      data: payload,
    });
    
    setLastSaved(new Date());
  };

  const handleNext = () => {
    if (canProceedFromStep(currentStep)) {
      const nextStep = Math.min(currentStep + 1, steps.length - 1);
      
      // When moving to Step 4 (Review), auto-populate plan name if empty
      if (nextStep === 3 && !planInfo.name) {
        setPlanInfo(prev => ({
          ...prev,
          name: `Plan Anual de Auditoría ${prev.year}`,
        }));
      }
      
      setCurrentStep(nextStep);
      
      // Save wizard progress to database when changing steps
      if (planId) {
        persistWizardProgress(planId, nextStep).catch(err => {
          console.error("Failed to save wizard progress:", err);
          toast({
            title: "Error al guardar progreso",
            description: "No se pudo guardar el progreso. Los cambios se guardarán localmente.",
            variant: "destructive",
          });
        });
      }
    } else {
      toast({
        title: "Complete los campos requeridos",
        description: "Por favor complete toda la información antes de continuar",
        variant: "destructive",
      });
    }
  };

  const handlePrevious = () => {
    const prevStep = Math.max(currentStep - 1, 0);
    setCurrentStep(prevStep);
    
    // Save wizard progress to database when changing steps
    if (planId) {
      persistWizardProgress(planId, prevStep).catch(err => {
        console.error("Failed to save wizard progress:", err);
      });
    }
  };

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
    
    // Save wizard progress to database when changing steps
    if (planId) {
      persistWizardProgress(planId, stepIndex).catch(err => {
        console.error("Failed to save wizard progress:", err);
      });
    }
  };

  if (loadingUniverse || (planId && (loadingPlan || loadingPlanItems))) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Cargando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/audit-plan-list")}
            data-testid="button-back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isViewMode ? "Ver" : (planId ? "Editar" : "Nuevo")} Plan de Auditoría
            </h1>
            <p className="text-muted-foreground mt-1">
              Wizard de planificación anual basada en riesgos
            </p>
          </div>
        </div>
        {/* Auto-save indicator */}
        {lastSaved && !isViewMode && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Cloud className="h-4 w-4" />
            <span>
              Guardado automáticamente hace{" "}
              {Math.floor((new Date().getTime() - lastSaved.getTime()) / 1000)}s
            </span>
          </div>
        )}
      </div>

      {/* View-only mode banner */}
      {isViewMode && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <Eye className="h-5 w-5" />
              <p className="font-medium">Modo solo lectura</p>
              <span className="text-sm text-blue-600 dark:text-blue-300">
                Este plan se muestra en modo consulta. Use el botón "Editar" para modificar.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stepper */}
      <Stepper
        steps={steps}
        currentStep={currentStep}
        onStepClick={handleStepClick}
        allowAllClickable={true}
        data-testid="audit-plan-stepper"
      />

      {/* Step Content */}
      <StepperContent>
        {/* Step 1: Plan Setup & Universe Selection */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Información Básica del Plan</CardTitle>
                <CardDescription>
                  Configure el nombre, periodo y alcance temporal del plan de auditoría
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="plan-name">Nombre del Plan *</Label>
                  <Input
                    id="plan-name"
                    value={planInfo.name}
                    onChange={(e) => setPlanInfo(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Plan Anual de Auditoría 2025"
                    data-testid="input-plan-name"
                    disabled={isViewMode}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-month">Fecha de Inicio *</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={planInfo.startMonth?.toString() || "1"}
                        onValueChange={(value) =>
                          setPlanInfo(prev => ({ ...prev, startMonth: parseInt(value) }))
                        }
                        disabled={isViewMode}
                      >
                        <SelectTrigger id="start-month" data-testid="select-start-month">
                          <SelectValue placeholder="Mes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Enero</SelectItem>
                          <SelectItem value="2">Febrero</SelectItem>
                          <SelectItem value="3">Marzo</SelectItem>
                          <SelectItem value="4">Abril</SelectItem>
                          <SelectItem value="5">Mayo</SelectItem>
                          <SelectItem value="6">Junio</SelectItem>
                          <SelectItem value="7">Julio</SelectItem>
                          <SelectItem value="8">Agosto</SelectItem>
                          <SelectItem value="9">Septiembre</SelectItem>
                          <SelectItem value="10">Octubre</SelectItem>
                          <SelectItem value="11">Noviembre</SelectItem>
                          <SelectItem value="12">Diciembre</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={planInfo.year}
                        onChange={(e) =>
                          setPlanInfo(prev => ({ ...prev, year: parseInt(e.target.value) || 2025 }))
                        }
                        placeholder="Año"
                        data-testid="input-start-year"
                        disabled={isViewMode}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="end-month">Fecha Final *</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={planInfo.endMonth?.toString() || "12"}
                        onValueChange={(value) =>
                          setPlanInfo(prev => ({ ...prev, endMonth: parseInt(value) }))
                        }
                        disabled={isViewMode}
                      >
                        <SelectTrigger id="end-month" data-testid="select-end-month">
                          <SelectValue placeholder="Mes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Enero</SelectItem>
                          <SelectItem value="2">Febrero</SelectItem>
                          <SelectItem value="3">Marzo</SelectItem>
                          <SelectItem value="4">Abril</SelectItem>
                          <SelectItem value="5">Mayo</SelectItem>
                          <SelectItem value="6">Junio</SelectItem>
                          <SelectItem value="7">Julio</SelectItem>
                          <SelectItem value="8">Agosto</SelectItem>
                          <SelectItem value="9">Septiembre</SelectItem>
                          <SelectItem value="10">Octubre</SelectItem>
                          <SelectItem value="11">Noviembre</SelectItem>
                          <SelectItem value="12">Diciembre</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        value={planInfo.endYear || planInfo.year}
                        onChange={(e) =>
                          setPlanInfo(prev => ({ ...prev, endYear: parseInt(e.target.value) || undefined }))
                        }
                        placeholder="Año"
                        data-testid="input-end-year"
                        disabled={isViewMode}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Universo de Auditoría</CardTitle>
                <CardDescription>
                  Seleccione las áreas auditables a incluir en el plan
                </CardDescription>
              </CardHeader>
              <CardContent>
              <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={universeSelections.filter(s => s.selected).length === universeSelections.length ? "default" : "outline"} 
                    data-testid="text-selected-count"
                  >
                    {universeSelections.filter(s => s.selected).length} de {universeSelections.length} items seleccionados
                  </Badge>
                  {universeSelections.filter(s => s.selected).length === universeSelections.length && (
                    <span className="text-sm text-muted-foreground">(Todos)</span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setUniverseSelections(prev =>
                        prev.map(s => ({ ...s, selected: true }))
                      );
                    }}
                    className="w-full sm:w-auto"
                    data-testid="button-select-all"
                    disabled={isViewMode}
                  >
                    Seleccionar Todo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setUniverseSelections(prev =>
                        prev.map(s => ({ ...s, selected: false }))
                      );
                    }}
                    className="w-full sm:w-auto"
                    data-testid="button-clear-selection"
                    disabled={isViewMode}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Limpiar Selección
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        console.log('Regenerating audit universe...');
                        await apiRequest('/api/audit-universe/generate', 'POST');
                        console.log('Generation complete, invalidating cache...');
                        await queryClient.invalidateQueries({ queryKey: ['/api/audit-universe'] });
                        await queryClient.refetchQueries({ queryKey: ['/api/audit-universe'] });
                        console.log('Cache invalidated and refetched');
                        toast({
                          title: "Universo regenerado",
                          description: "El universo de auditoría se ha regenerado correctamente desde los procesos existentes.",
                        });
                      } catch (error) {
                        console.error('Error regenerating universe:', error);
                        toast({
                          title: "Error",
                          description: "No se pudo regenerar el universo de auditoría.",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="w-full sm:w-auto"
                    data-testid="button-regenerate-universe"
                    disabled={isViewMode}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerar Universo
                  </Button>
                </div>
              </div>
              <div className="border rounded-lg p-4">
                <TreeView
                  nodes={treeNodes}
                  selectedIds={selectedIds}
                  onToggle={isViewMode ? () => {} : handleUniverseToggle}
                  renderNodeInfo={(node) => {
                    // Only show additional info for leaf nodes with real data
                    if (node.data && !node.id.startsWith('macro-') && !node.id.startsWith('process-')) {
                      const item = node.data;
                      return (
                        <>
                          {item.mandatoryAudit && (
                            <Badge className="bg-orange-100 text-orange-800 text-xs">
                              Obligatorio
                            </Badge>
                          )}
                          {item.lastAuditDate && (
                            <span className="text-xs text-muted-foreground">
                              Última: {new Date(item.lastAuditDate).toLocaleDateString()}
                            </span>
                          )}
                        </>
                      );
                    }
                    return null;
                  }}
                />
              </div>
            </CardContent>
          </Card>
          </div>
        )}

        {/* Step 2: Prioritization */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Selección y Priorización de Entidades</CardTitle>
              <CardDescription>
                Configure los factores de priorización para cada entidad auditable seleccionada
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allSelectedIds = selectedUniverseItems.map(item => item.id);
                      setIncludedEntities(allSelectedIds);
                    }}
                    data-testid="button-select-all-entities"
                    disabled={isViewMode}
                  >
                    Seleccionar todas
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIncludedEntities([])}
                    data-testid="button-deselect-all-entities"
                    disabled={isViewMode}
                  >
                    Deseleccionar todas
                  </Button>
                </div>
                <Badge variant="secondary" className="text-sm" data-testid="badge-included-count">
                  {includedEntities.length} de {selectedUniverseItems.length} incluidas en el plan
                </Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th 
                        className="p-3 text-left font-medium text-sm cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSortStep2("macroproceso")}
                      >
                        <div className="flex items-center gap-1">
                          Macroproceso
                          {sortColumnStep2 === "macroproceso" && sortOrderStep2 === "asc" && <ChevronUp className="h-3 w-3" />}
                          {sortColumnStep2 === "macroproceso" && sortOrderStep2 === "desc" && <ChevronDown className="h-3 w-3" />}
                        </div>
                      </th>
                      <th 
                        className="p-3 text-left font-medium text-sm cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSortStep2("proceso")}
                      >
                        <div className="flex items-center gap-1">
                          Proceso
                          {sortColumnStep2 === "proceso" && sortOrderStep2 === "asc" && <ChevronUp className="h-3 w-3" />}
                          {sortColumnStep2 === "proceso" && sortOrderStep2 === "desc" && <ChevronDown className="h-3 w-3" />}
                        </div>
                      </th>
                      <th 
                        className="p-3 text-left font-medium text-sm cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSortStep2("subproceso")}
                      >
                        <div className="flex items-center gap-1">
                          Subproceso
                          {sortColumnStep2 === "subproceso" && sortOrderStep2 === "asc" && <ChevronUp className="h-3 w-3" />}
                          {sortColumnStep2 === "subproceso" && sortOrderStep2 === "desc" && <ChevronDown className="h-3 w-3" />}
                        </div>
                      </th>
                      <th 
                        className="p-3 text-center font-medium text-sm cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSortStep2("riskScore")}
                      >
                        <div className="flex items-center gap-1 justify-center">
                          Risk Score
                          {sortColumnStep2 === "riskScore" && sortOrderStep2 === "asc" && <ChevronUp className="h-3 w-3" />}
                          {sortColumnStep2 === "riskScore" && sortOrderStep2 === "desc" && <ChevronDown className="h-3 w-3" />}
                        </div>
                      </th>
                      <th className="p-3 text-center font-medium text-sm">Aud. Previa</th>
                      <th className="p-3 text-center font-medium text-sm">Prioridad Estratégica</th>
                      <th className="p-3 text-center font-medium text-sm">Complejidad</th>
                      <th className="p-3 text-center font-medium text-sm">Años</th>
                      <th className="p-3 text-center font-medium text-sm">Fraude</th>
                      <th className="p-3 text-center font-medium text-sm">Regulatorio</th>
                      <th className="p-3 text-center font-medium text-sm">Gerencial</th>
                      <th 
                        className="p-3 text-center font-medium text-sm cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSortStep2("totalScore")}
                      >
                        <div className="flex items-center gap-1 justify-center">
                          Puntaje Total
                          {sortColumnStep2 === "totalScore" && sortOrderStep2 === "asc" && <ChevronUp className="h-3 w-3" />}
                          {sortColumnStep2 === "totalScore" && sortOrderStep2 === "desc" && <ChevronDown className="h-3 w-3" />}
                        </div>
                      </th>
                      <th className="p-3 text-center font-medium text-sm w-24">
                        <div className="flex items-center justify-center">
                          Incluir
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedUniverseItems
                      .map((item) => ({
                        ...item,
                        prioritization: prioritizations.find(p => p.universeId === item.id) || {
                          universeId: item.id,
                          riskScore: getResidualRiskForEntity(item),
                          previousAuditResult: "ninguna",
                          strategicPriority: 1,
                          hasFraudHistory: false,
                          hasRegulatoryRequirement: false,
                          hasManagementRequest: false,
                          yearsSinceLastAudit: 0,
                          estimatedComplexity: 50,
                          totalScore: 0,
                        },
                      }))
                      .sort((a, b) => {
                        if (sortOrderStep2 === "none") return 0;
                        
                        let aValue: number | string, bValue: number | string;
                        
                        switch (sortColumnStep2) {
                          case "macroproceso":
                            aValue = (a.macroproceso?.name || '').toLowerCase();
                            bValue = (b.macroproceso?.name || '').toLowerCase();
                            if (sortOrderStep2 === "asc") {
                              return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                            } else {
                              return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
                            }
                          case "proceso":
                            aValue = (a.process?.name || '').toLowerCase();
                            bValue = (b.process?.name || '').toLowerCase();
                            if (sortOrderStep2 === "asc") {
                              return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                            } else {
                              return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
                            }
                          case "subproceso":
                            aValue = (a.subproceso?.name || '').toLowerCase();
                            bValue = (b.subproceso?.name || '').toLowerCase();
                            if (sortOrderStep2 === "asc") {
                              return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                            } else {
                              return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
                            }
                          case "riskScore":
                            aValue = a.prioritization.riskScore;
                            bValue = b.prioritization.riskScore;
                            break;
                          case "totalScore":
                            aValue = a.prioritization.totalScore;
                            bValue = b.prioritization.totalScore;
                            break;
                          default:
                            return 0;
                        }
                        
                        if (sortOrderStep2 === "asc") {
                          return (aValue as number) - (bValue as number);
                        } else {
                          return (bValue as number) - (aValue as number);
                        }
                      })
                      .map((item) => {
              const prioritization = item.prioritization;

              return (
                        <tr key={item.id} className="border-b hover:bg-muted/30" data-testid={`row-prioritization-${item.id}`}>
                          <td className="p-3 font-medium">{item.macroproceso?.name || '-'}</td>
                          <td className="p-3 font-medium">{item.process?.name || '-'}</td>
                          <td className="p-3 font-medium">{item.subproceso?.name || '-'}</td>
                          <td className="p-3">
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex items-center gap-2">
                                <Slider
                                  value={[prioritization.riskScore]}
                                  onValueChange={([value]) =>
                                    handlePrioritizationChange(item.id, "riskScore", value)
                                  }
                                  min={0}
                                  max={100}
                                  step={1}
                                  className="w-20 opacity-50 cursor-not-allowed"
                                  disabled
                                  data-testid={`slider-risk-${item.id}`}
                                />
                                <span className="text-xs w-8 text-center font-medium">{prioritization.riskScore}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">Auto-calculado</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <Select
                              value={prioritization.previousAuditResult}
                              onValueChange={(value) =>
                                handlePrioritizationChange(item.id, "previousAuditResult", value)
                              }
                              disabled={isViewMode}
                            >
                              <SelectTrigger className="h-8 text-xs w-28" data-testid={`select-previous-audit-${item.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ninguna">Ninguna</SelectItem>
                                <SelectItem value="buena">Buena</SelectItem>
                                <SelectItem value="regular">Regular</SelectItem>
                                <SelectItem value="mala">Mala</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3">
                            <Select
                              value={prioritization.strategicPriority.toString()}
                              onValueChange={(value) =>
                                handlePrioritizationChange(item.id, "strategicPriority", parseInt(value))
                              }
                              disabled={isViewMode}
                            >
                              <SelectTrigger className="h-8 text-xs w-24" data-testid={`select-strategic-${item.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">Baja</SelectItem>
                                <SelectItem value="2">Media</SelectItem>
                                <SelectItem value="3">Alta</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2 justify-center">
                              <Slider
                                value={[prioritization.estimatedComplexity]}
                                onValueChange={([value]) =>
                                  handlePrioritizationChange(item.id, "estimatedComplexity", value)
                                }
                                min={0}
                                max={100}
                                step={1}
                                className="w-20"
                                data-testid={`slider-complexity-${item.id}`}
                                disabled={isViewMode}
                              />
                              <span className="text-xs w-8 text-center">{prioritization.estimatedComplexity}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <Input
                              type="number"
                              min={0}
                              className="h-8 w-16 text-xs text-center"
                              value={prioritization.yearsSinceLastAudit}
                              onChange={(e) =>
                                handlePrioritizationChange(
                                  item.id,
                                  "yearsSinceLastAudit",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              data-testid={`input-years-${item.id}`}
                              disabled={isViewMode}
                            />
                          </td>
                          <td className="p-3 text-center">
                            <span 
                              className={`text-sm font-medium ${
                                prioritization.hasFraudHistory ? 'text-red-600' : 'text-gray-500'
                              }`}
                              data-testid={`text-fraud-${item.id}`}
                            >
                              {prioritization.hasFraudHistory ? 'Sí' : 'No'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <Checkbox
                              checked={prioritization.hasRegulatoryRequirement}
                              onCheckedChange={(checked) =>
                                handlePrioritizationChange(
                                  item.id,
                                  "hasRegulatoryRequirement",
                                  !!checked
                                )
                              }
                              data-testid={`checkbox-regulatory-${item.id}`}
                              disabled={isViewMode}
                            />
                          </td>
                          <td className="p-3 text-center">
                            <Checkbox
                              checked={prioritization.hasManagementRequest}
                              onCheckedChange={(checked) =>
                                handlePrioritizationChange(
                                  item.id,
                                  "hasManagementRequest",
                                  !!checked
                                )
                              }
                              data-testid={`checkbox-management-${item.id}`}
                              disabled={isViewMode}
                            />
                          </td>
                          <td className="p-3 text-center">
                            <Badge className="text-base px-3" data-testid={`badge-score-${item.id}`}>
                              {prioritization.totalScore}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center">
                              <Checkbox
                                checked={includedEntities.includes(item.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setIncludedEntities([...includedEntities, item.id]);
                                  } else {
                                    setIncludedEntities(includedEntities.filter(id => id !== item.id));
                                  }
                                }}
                                data-testid={`checkbox-include-${item.id}`}
                                disabled={isViewMode}
                              />
                            </div>
                          </td>
                        </tr>
              );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Scheduling */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Asignación de Recursos y Calendario</CardTitle>
                <CardDescription>
                  Configure el trimestre, horas estimadas y responsable para cada auditoría
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSortStep3("macroproceso")}
                      >
                        <div className="flex items-center gap-1">
                          Macroproceso
                          {sortColumnStep3 === "macroproceso" && sortOrderStep3 === "asc" && <ChevronUp className="h-3 w-3" />}
                          {sortColumnStep3 === "macroproceso" && sortOrderStep3 === "desc" && <ChevronDown className="h-3 w-3" />}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSortStep3("proceso")}
                      >
                        <div className="flex items-center gap-1">
                          Proceso
                          {sortColumnStep3 === "proceso" && sortOrderStep3 === "asc" && <ChevronUp className="h-3 w-3" />}
                          {sortColumnStep3 === "proceso" && sortOrderStep3 === "desc" && <ChevronDown className="h-3 w-3" />}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSortStep3("subproceso")}
                      >
                        <div className="flex items-center gap-1">
                          Subproceso
                          {sortColumnStep3 === "subproceso" && sortOrderStep3 === "asc" && <ChevronUp className="h-3 w-3" />}
                          {sortColumnStep3 === "subproceso" && sortOrderStep3 === "desc" && <ChevronDown className="h-3 w-3" />}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSortStep3("totalScore")}
                      >
                        <div className="flex items-center gap-1">
                          Prioridad
                          {sortColumnStep3 === "totalScore" && sortOrderStep3 === "asc" && <ChevronUp className="h-3 w-3" />}
                          {sortColumnStep3 === "totalScore" && sortOrderStep3 === "desc" && <ChevronDown className="h-3 w-3" />}
                        </div>
                      </TableHead>
                      <TableHead>Trimestre</TableHead>
                      <TableHead>Horas Est.</TableHead>
                      <TableHead>Responsable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prioritizedItems
                      .slice()
                      .sort((a, b) => {
                        if (sortOrderStep3 === "none") return 0;
                        
                        let aValue: number | string, bValue: number | string;
                        
                        switch (sortColumnStep3) {
                          case "macroproceso":
                            aValue = (a.macroproceso?.name || '').toLowerCase();
                            bValue = (b.macroproceso?.name || '').toLowerCase();
                            if (sortOrderStep3 === "asc") {
                              return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                            } else {
                              return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
                            }
                          case "proceso":
                            aValue = (a.process?.name || '').toLowerCase();
                            bValue = (b.process?.name || '').toLowerCase();
                            if (sortOrderStep3 === "asc") {
                              return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                            } else {
                              return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
                            }
                          case "subproceso":
                            aValue = (a.subproceso?.name || '').toLowerCase();
                            bValue = (b.subproceso?.name || '').toLowerCase();
                            if (sortOrderStep3 === "asc") {
                              return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                            } else {
                              return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
                            }
                          case "totalScore":
                            aValue = a.prioritization?.totalScore || 0;
                            bValue = b.prioritization?.totalScore || 0;
                            break;
                          default:
                            return 0;
                        }
                        
                        if (sortOrderStep3 === "asc") {
                          return (aValue as number) - (bValue as number);
                        } else {
                          return (bValue as number) - (aValue as number);
                        }
                      })
                      .map((item) => {
                      const scheduling = schedulings.find(s => s.universeId === item.id) || {
                        universeId: item.id,
                        quarter: "",
                        estimatedHours: 0,
                        tentativeResponsible: "",
                      };

                      return (
                        <TableRow key={item.id} data-testid={`row-scheduling-${item.id}`}>
                          <TableCell className="font-medium">{item.macroproceso?.name || '-'}</TableCell>
                          <TableCell className="font-medium">{item.process?.name || '-'}</TableCell>
                          <TableCell className="font-medium">{item.subproceso?.name || '-'}</TableCell>
                          <TableCell>
                            <Badge>{item.prioritization?.totalScore}</Badge>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={scheduling.quarter}
                              onValueChange={(value) =>
                                handleSchedulingChange(item.id, "quarter", value)
                              }
                              disabled={isViewMode}
                            >
                              <SelectTrigger 
                                className="w-32"
                                data-testid={`select-quarter-${item.id}`}
                              >
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Q1">Q1</SelectItem>
                                <SelectItem value="Q2">Q2</SelectItem>
                                <SelectItem value="Q3">Q3</SelectItem>
                                <SelectItem value="Q4">Q4</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              placeholder="Horas"
                              className="w-24"
                              value={scheduling.estimatedHours || ""}
                              onChange={(e) =>
                                handleSchedulingChange(
                                  item.id,
                                  "estimatedHours",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              data-testid={`input-hours-${item.id}`}
                              disabled={isViewMode}
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={scheduling.tentativeResponsible}
                              onValueChange={(value) =>
                                handleSchedulingChange(item.id, "tentativeResponsible", value)
                              }
                              disabled={isViewMode}
                            >
                              <SelectTrigger 
                                className="w-48"
                                data-testid={`select-responsible-${item.id}`}
                              >
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent>
                                {users.map((user) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.fullName || user.username}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Calendar Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Trimestre</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  {(["Q1", "Q2", "Q3", "Q4"] as const).map((q) => (
                    <div
                      key={q}
                      className="p-4 border rounded-lg text-center"
                      data-testid={`quarter-${q}`}
                    >
                      <div className="text-2xl font-bold">{q}</div>
                      <div className="text-muted-foreground mt-1">
                        {quarterDistribution[q]} auditorías
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-4 bg-muted rounded-lg" data-testid="total-hours">
                  <div className="text-lg font-semibold">
                    Total de horas estimadas: {totalEstimatedHours}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 3 && (
          <div className="space-y-6">
            {/* Plan Basic Info - Editable */}
            <Card>
              <CardHeader>
                <CardTitle>Información del Plan</CardTitle>
                <CardDescription>
                  Revise y edite la información básica del plan antes de enviar a aprobación
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="review-plan-name">Nombre del Plan *</Label>
                  <Input
                    id="review-plan-name"
                    value={planInfo.name}
                    onChange={(e) => setPlanInfo(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Plan Anual de Auditoría 2025"
                    data-testid="input-review-plan-name"
                    disabled={isViewMode}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Año del Plan</Label>
                    <Input
                      type="number"
                      value={planInfo.year}
                      onChange={(e) =>
                        setPlanInfo(prev => ({ ...prev, year: parseInt(e.target.value) || 2025 }))
                      }
                      data-testid="input-review-year"
                      disabled={isViewMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Periodo</Label>
                    <div className="text-sm text-muted-foreground p-2 border rounded-md">
                      {planInfo.startMonth !== undefined && planInfo.endMonth !== undefined
                        ? `${["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][planInfo.startMonth - 1]} ${planInfo.year} - ${["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][planInfo.endMonth - 1]} ${planInfo.endYear || planInfo.year}`
                        : "No definido"
                      }
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="review-description">Descripción</Label>
                  <Textarea
                    id="review-description"
                    value={planInfo.description}
                    onChange={(e) => setPlanInfo(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descripción opcional del plan..."
                    rows={3}
                    data-testid="textarea-review-description"
                    disabled={isViewMode}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumen del Plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Total Auditorías</div>
                    <div className="text-2xl font-bold" data-testid="text-total-audits">
                      {selectedUniverseItems.length}
                    </div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Q1</div>
                    <div className="text-2xl font-bold">{quarterDistribution.Q1}</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Q2</div>
                    <div className="text-2xl font-bold">{quarterDistribution.Q2}</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Q3</div>
                    <div className="text-2xl font-bold">{quarterDistribution.Q3}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Q4</div>
                    <div className="text-2xl font-bold">{quarterDistribution.Q4}</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Total Horas</div>
                    <div className="text-2xl font-bold" data-testid="text-summary-hours">
                      {totalEstimatedHours}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lista de Auditorías Planificadas</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSortStep4("macroproceso")}
                      >
                        <div className="flex items-center gap-1">
                          Macroproceso
                          {sortColumnStep4 === "macroproceso" && sortOrderStep4 === "asc" && <ChevronUp className="h-3 w-3" />}
                          {sortColumnStep4 === "macroproceso" && sortOrderStep4 === "desc" && <ChevronDown className="h-3 w-3" />}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSortStep4("proceso")}
                      >
                        <div className="flex items-center gap-1">
                          Proceso
                          {sortColumnStep4 === "proceso" && sortOrderStep4 === "asc" && <ChevronUp className="h-3 w-3" />}
                          {sortColumnStep4 === "proceso" && sortOrderStep4 === "desc" && <ChevronDown className="h-3 w-3" />}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSortStep4("subproceso")}
                      >
                        <div className="flex items-center gap-1">
                          Subproceso
                          {sortColumnStep4 === "subproceso" && sortOrderStep4 === "asc" && <ChevronUp className="h-3 w-3" />}
                          {sortColumnStep4 === "subproceso" && sortOrderStep4 === "desc" && <ChevronDown className="h-3 w-3" />}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSortStep4("totalScore")}
                      >
                        <div className="flex items-center gap-1">
                          Prioridad
                          {sortColumnStep4 === "totalScore" && sortOrderStep4 === "asc" && <ChevronUp className="h-3 w-3" />}
                          {sortColumnStep4 === "totalScore" && sortOrderStep4 === "desc" && <ChevronDown className="h-3 w-3" />}
                        </div>
                      </TableHead>
                      <TableHead>Trimestre</TableHead>
                      <TableHead>Horas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prioritizedItems
                      .slice()
                      .sort((a, b) => {
                        if (sortOrderStep4 === "none") return 0;
                        
                        let aValue: number | string, bValue: number | string;
                        
                        switch (sortColumnStep4) {
                          case "macroproceso":
                            aValue = (a.macroproceso?.name || '').toLowerCase();
                            bValue = (b.macroproceso?.name || '').toLowerCase();
                            if (sortOrderStep4 === "asc") {
                              return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                            } else {
                              return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
                            }
                          case "proceso":
                            aValue = (a.process?.name || '').toLowerCase();
                            bValue = (b.process?.name || '').toLowerCase();
                            if (sortOrderStep4 === "asc") {
                              return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                            } else {
                              return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
                            }
                          case "subproceso":
                            aValue = (a.subproceso?.name || '').toLowerCase();
                            bValue = (b.subproceso?.name || '').toLowerCase();
                            if (sortOrderStep4 === "asc") {
                              return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                            } else {
                              return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
                            }
                          case "totalScore":
                            aValue = a.prioritization?.totalScore || 0;
                            bValue = b.prioritization?.totalScore || 0;
                            break;
                          default:
                            return 0;
                        }
                        
                        if (sortOrderStep4 === "asc") {
                          return (aValue as number) - (bValue as number);
                        } else {
                          return (bValue as number) - (aValue as number);
                        }
                      })
                      .map((item, index) => {
                      const scheduling = schedulings.find(s => s.universeId === item.id);
                      return (
                        <TableRow key={item.id} data-testid={`row-summary-${index + 1}`}>
                          <TableCell>
                            <Badge variant={index < 3 ? "default" : "outline"}>
                              #{index + 1}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.macroproceso?.name || '-'}</TableCell>
                          <TableCell>{item.process?.name || '-'}</TableCell>
                          <TableCell>{item.subproceso?.name || '-'}</TableCell>
                          <TableCell>
                            <Badge>{item.prioritization?.totalScore}</Badge>
                          </TableCell>
                          <TableCell>{scheduling?.quarter || "-"}</TableCell>
                          <TableCell>{scheduling?.estimatedHours || 0} hrs</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </StepperContent>

      {/* Actions */}
      <StepperActions>
        <div className="flex items-center gap-2">
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={handlePrevious}
              data-testid="button-previous"
              disabled={isViewMode}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {currentStep === steps.length - 1 && !isViewMode ? (
            <>
              <Button
                variant="outline"
                onClick={() => savePlanMutation.mutate("draft")}
                disabled={savePlanMutation.isPending || !canProceedFromStep(currentStep)}
                data-testid="button-save-draft"
              >
                <Save className="h-4 w-4 mr-2" />
                Guardar como Borrador
              </Button>
              {isAdmin() ? (
                <Button
                  onClick={() => savePlanMutation.mutate("approved")}
                  disabled={savePlanMutation.isPending || !canProceedFromStep(currentStep)}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-approve-plan"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Aprobar Plan
                </Button>
              ) : (
                <Button
                  onClick={() => savePlanMutation.mutate("in_review")}
                  disabled={savePlanMutation.isPending || !canProceedFromStep(currentStep)}
                  data-testid="button-send-review"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar a Revisión
                </Button>
              )}
            </>
          ) : currentStep < steps.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceedFromStep(currentStep) && !isViewMode}
              data-testid="button-next"
            >
              Siguiente
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : null}
        </div>
      </StepperActions>
    </div>
  );
}
