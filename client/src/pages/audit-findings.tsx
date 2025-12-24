import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  ResponsiveTable, 
  ResponsiveTableContent,
  ResponsiveTableHeader, 
  ResponsiveTableBody, 
  ResponsiveTableRow, 
  ResponsiveTableHead, 
  ResponsiveTableCell 
} from "@/components/ui/responsive-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  Target,
  MessageSquare,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AuditFinding, AuditFindingWithDetails, InsertAuditFinding, Audit, User, Action } from "@shared/schema";
import { insertAuditFindingSchema } from "@shared/schema";
import { z } from "zod";
import { AuditFindingFormTabs } from "./audit-findings-form-tabs";
import { FindingActionPlans } from "@/components/FindingActionPlans";
import ActionPlanForm from "@/components/forms/action-plan-form";

// Professional audit finding form schema with all required fields
// Plus optional commitment fields for integrated creation
const auditFindingFormSchema = insertAuditFindingSchema.extend({
  dueDate: z.string().optional(),
  // Optional commitment fields
  createCommitment: z.boolean().optional(),
  commitmentTitle: z.string().optional(),
  commitmentDescription: z.string().optional(),
  commitmentResponsible: z.string().optional(),
  commitmentDueDate: z.string().optional(),
  commitmentPriority: z.enum(["low", "medium", "high", "critical"]).optional(),
  commitmentManagementResponse: z.string().optional(),
  commitmentAgreedAction: z.string().optional(),
}).refine((data) => {
  // Si se quiere crear un compromiso, validar campos requeridos
  if (data.createCommitment) {
    return data.commitmentTitle && data.commitmentResponsible && data.commitmentDueDate;
  }
  return true;
}, {
  message: "Cuando se crea un compromiso, el título, responsable y fecha límite son requeridos",
  path: ["createCommitment"]
});

type AuditFindingFormData = z.infer<typeof auditFindingFormSchema>;

export default function AuditFindings() {
  // Consolidated filter state
  const [filters, setFilters] = useState<Record<string, any>>({});
  
  // Legacy individual filters for backward compatibility with event listeners
  const searchTerm = filters.search || "";
  const statusFilter = filters.status || "all";
  const severityFilter = filters.severity || "all";
  const typeFilter = filters.type || "all";
  const auditFilter = filters.audit || "all";
  
  const [showFindingDialog, setShowFindingDialog] = useState(false);
  const [editingFinding, setEditingFinding] = useState<AuditFindingWithDetails | null>(null);
  const [viewingDetails, setViewingDetails] = useState<AuditFindingWithDetails | null>(null);
  
  // State for creating action plan from audit finding
  const [createActionPlanDialogOpen, setCreateActionPlanDialogOpen] = useState(false);
  const [currentFindingForActionPlan, setCurrentFindingForActionPlan] = useState<AuditFindingWithDetails | null>(null);
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  const { toast } = useToast();

  // Handler for creating new findings
  const handleNewFinding = () => {
    setShowFindingDialog(true);
    setEditingFinding(null);
    form.reset({
      auditId: "",
      title: "",
      description: "",
      type: "deficiency",
      severity: "medium",
      condition: "",
      criteria: "",
      cause: "",
      effect: "",
      recommendation: "",
      managementResponse: "",
      agreedAction: "",
      responsiblePerson: "",
      dueDate: "",
      status: "open",
      identifiedBy: "user-1",
    });
  };

  // Listen for header button click event
  useEffect(() => {
    const handleOpenDialog = () => {
      handleNewFinding();
    };
    
    window.addEventListener('openAuditFindingDialog', handleOpenDialog);
    
    return () => {
      window.removeEventListener('openAuditFindingDialog', handleOpenDialog);
    };
  }, []);

  // Listen to filter changes from header
  useEffect(() => {
    const handleFiltersChanged = (event: any) => {
      const { statusFilter, severityFilter, typeFilter, auditFilter } = event.detail;
      setFilters({
        ...filters,
        status: statusFilter,
        severity: severityFilter,
        type: typeFilter,
        audit: auditFilter,
      });
    };

    window.addEventListener('auditFindingsFiltersChanged', handleFiltersChanged);
    return () => window.removeEventListener('auditFindingsFiltersChanged', handleFiltersChanged);
  }, [filters]);

  // Register search handler
  useEffect(() => {
    const handleSearch = (event: any) => {
      setFilters(prev => ({ ...prev, search: event.detail || "" }));
    };

    window.addEventListener('globalSearch', handleSearch);
    return () => window.removeEventListener('globalSearch', handleSearch);
  }, []);

  // OPTIMIZED: Increased staleTime to match server cache (3 min)
  const { data: auditFindings = [], isLoading } = useQuery<AuditFindingWithDetails[]>({
    queryKey: ['/api/audit-findings'],
    queryFn: async () => {
      const response = await fetch('/api/audit-findings?withDetails=true', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch audit findings');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 2, // 2 minutes - slightly less than server cache (3 min)
    refetchOnMount: false, // Server cache handles freshness
    gcTime: 1000 * 60 * 5, // Keep cache 5 minutes
  });

  // OPTIMIZED: Increased staleTime to match server cache (5 min for audits)
  const { data: auditsData = [] } = useQuery<Audit[]>({
    queryKey: ['/api/audits'],
    queryFn: async () => {
      const response = await fetch('/api/audits', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch audits');
      }
      const result = await response.json();
      // Handle both array and object with data property
      if (Array.isArray(result)) {
        return result;
      }
      if (result && Array.isArray(result.data)) {
        return result.data;
      }
      return [];
    },
    staleTime: 1000 * 60 * 4, // 4 minutes - slightly less than server cache (5 min)
    refetchOnMount: false, // Server cache handles freshness
    gcTime: 1000 * 60 * 10, // Keep cache 10 minutes
  });
  
  // Ensure audits is always an array
  const audits = Array.isArray(auditsData) ? auditsData : [];

  // Fetch users for assignment
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json();
    },
  });

  // Fetch action plans associated with the current finding being edited
  const { data: associatedActionPlans = [] } = useQuery<Action[]>({
    queryKey: ['/api/audit-findings', editingFinding?.id, 'actions'],
    enabled: !!editingFinding?.id,
    queryFn: async () => {
      const response = await fetch(`/api/audit-findings/${editingFinding?.id}/actions`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch action plans');
      return response.json();
    },
  });

  // Form setup with professional audit finding fields
  const form = useForm<AuditFindingFormData>({
    resolver: zodResolver(auditFindingFormSchema),
    defaultValues: {
      auditId: "",
      title: "",
      description: "",
      type: "deficiency",
      severity: "medium",
      condition: "",
      criteria: "",
      cause: "",
      effect: "",
      recommendation: "",
      managementResponse: "",
      agreedAction: "",
      responsiblePerson: "",
      dueDate: "",
      status: "open",
      identifiedBy: "user-1",
      // Commitment defaults
      createCommitment: false,
      commitmentTitle: "",
      commitmentDescription: "",
      commitmentResponsible: "",
      commitmentDueDate: "",
      commitmentPriority: "medium",
      commitmentManagementResponse: "",
      commitmentAgreedAction: "",
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: AuditFindingFormData) => {
      return apiRequest('/api/audit-findings/with-commitment', 'POST', {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
        commitmentDueDate: data.commitmentDueDate ? new Date(data.commitmentDueDate).toISOString() : undefined,
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/audit-findings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/actions'] });
      
      const message = (response as any).commitment 
        ? "Hallazgo de auditoría y compromiso creados exitosamente"
        : "Hallazgo de auditoría creado exitosamente";
      
      toast({ title: message });
      setShowFindingDialog(false);
      form.reset();
    },
    onError: (error) => {
      toast({ 
        title: "Error al crear el hallazgo", 
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive" 
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AuditFindingFormData> }) => {
      // Verificar si hay datos de compromiso
      const hasCommitmentData = data.createCommitment && data.commitmentTitle;
      
      if (hasCommitmentData) {
        // Usar endpoint con compromiso
        return apiRequest(`/api/audit-findings/${id}/with-commitment`, 'PUT', {
          ...data,
          dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
          commitmentDueDate: data.commitmentDueDate ? new Date(data.commitmentDueDate).toISOString() : undefined,
        });
      } else {
        // Usar endpoint regular
        return apiRequest(`/api/audit-findings/${id}`, 'PUT', {
          ...data,
          dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
        });
      }
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/audit-findings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/actions'] });
      
      const message = (response as any).commitment 
        ? "Hallazgo de auditoría y compromiso actualizados exitosamente"
        : "Hallazgo actualizado exitosamente";
      
      toast({ title: message });
      setShowFindingDialog(false);
      setEditingFinding(null);
      form.reset();
    },
    onError: (error) => {
      toast({ 
        title: "Error al actualizar el hallazgo", 
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive" 
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/audit-findings/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/audit-findings'] });
      toast({ title: "Hallazgo eliminado exitosamente" });
    },
    onError: (error) => {
      toast({ 
        title: "Error al eliminar el hallazgo", 
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: AuditFindingFormData) => {
    if (editingFinding) {
      updateMutation.mutate({ id: editingFinding.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (finding: AuditFindingWithDetails) => {
    setEditingFinding(finding);
    form.reset({
      auditId: finding.auditId || "",
      title: finding.title,
      description: finding.description,
      type: finding.type as "deficiency" | "weakness" | "observation" | "opportunity",
      severity: finding.severity as "low" | "medium" | "high" | "critical",
      condition: finding.condition,
      criteria: finding.criteria,
      cause: finding.cause,
      effect: finding.effect,
      recommendation: finding.recommendation,
      managementResponse: finding.managementResponse || "",
      agreedAction: finding.agreedAction || "",
      responsiblePerson: finding.responsiblePerson || "",
      dueDate: finding.dueDate ? new Date(finding.dueDate).toISOString().split('T')[0] : "",
      status: finding.status as "open" | "in_progress" | "implemented" | "overdue" | "closed",
      identifiedBy: finding.identifiedBy,
    });
    setShowFindingDialog(true);
  };

  // Filter and sort findings
  const filteredAndSortedFindings = auditFindings
    .filter(finding => {
      const matchesSearch = searchTerm === "" || 
                           finding.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           finding.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           finding.condition?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || finding.status === statusFilter;
      const matchesSeverity = severityFilter === "all" || finding.severity === severityFilter;
      const matchesType = typeFilter === "all" || finding.type === typeFilter;
      const matchesAudit = auditFilter === "all" || finding.auditId === auditFilter;
      
      return matchesSearch && matchesStatus && matchesSeverity && matchesType && matchesAudit;
    })
    .sort((a, b) => {
      if (!sortColumn) return 0;
      
      const direction = sortOrder === "asc" ? 1 : -1;
      
      switch (sortColumn) {
        case "code":
          return direction * a.code.localeCompare(b.code);
        case "title":
          return direction * a.title.localeCompare(b.title);
        case "type": {
          const typeOrder = { deficiency: 1, weakness: 2, observation: 3, opportunity: 4 };
          return direction * ((typeOrder[a.type as keyof typeof typeOrder] || 5) - (typeOrder[b.type as keyof typeof typeOrder] || 5));
        }
        case "severity": {
          const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
          return direction * ((severityOrder[a.severity as keyof typeof severityOrder] || 0) - (severityOrder[b.severity as keyof typeof severityOrder] || 0));
        }
        case "status": {
          const statusOrder = { open: 1, in_progress: 2, implemented: 3, overdue: 4, closed: 5 };
          return direction * ((statusOrder[a.status as keyof typeof statusOrder] || 0) - (statusOrder[b.status as keyof typeof statusOrder] || 0));
        }
        case "responsible": {
          const aName = users.find(u => u.id === a.responsiblePerson)?.fullName || "";
          const bName = users.find(u => u.id === b.responsiblePerson)?.fullName || "";
          return direction * aName.localeCompare(bName);
        }
        case "dueDate": {
          const aDate = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          const bDate = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          return direction * (aDate - bDate);
        }
        default:
          return 0;
      }
    });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { label: "Abierto", className: "bg-yellow-100 text-yellow-800" },
      in_progress: { label: "En Progreso", className: "bg-blue-100 text-blue-800" },
      implemented: { label: "Implementado", className: "bg-green-100 text-green-800" },
      overdue: { label: "Vencido", className: "bg-red-100 text-red-800" },
      closed: { label: "Cerrado", className: "bg-gray-100 text-gray-800" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, className: "bg-gray-100 text-gray-800" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getSeverityBadge = (severity: string) => {
    const severityConfig = {
      low: { label: "Baja", className: "bg-gray-100 text-gray-800" },
      medium: { label: "Media", className: "bg-orange-100 text-orange-800" },
      high: { label: "Alta", className: "bg-red-100 text-red-800" },
      critical: { label: "Crítica", className: "bg-purple-100 text-purple-800" },
    };
    const config = severityConfig[severity as keyof typeof severityConfig] || { label: severity, className: "bg-gray-100 text-gray-800" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      deficiency: { label: "Deficiencia", className: "bg-red-100 text-red-800" },
      weakness: { label: "Debilidad", className: "bg-orange-100 text-orange-800" },
      observation: { label: "Observación", className: "bg-blue-100 text-blue-800" },
      opportunity: { label: "Oportunidad", className: "bg-green-100 text-green-800" },
    };
    const config = typeConfig[type as keyof typeof typeConfig] || { label: type, className: "bg-gray-100 text-gray-800" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  // Handle column sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortOrder("asc");
    }
  };

  // Get sort icon for column
  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortOrder === "asc" 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  return (
    <div className="space-y-6 p-6">

      {/* Findings Table */}
      <Card>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Cargando hallazgos...</div>
          ) : filteredAndSortedFindings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {auditFindings.length === 0 ? 
                "No hay hallazgos de auditoría creados aún." :
                "No se encontraron hallazgos que coincidan con los filtros aplicados."
              }
            </div>
          ) : (
            <ResponsiveTable variant="default" showScrollIndicator={true}>
              <ResponsiveTableContent variant="default">
                <ResponsiveTableHeader variant="default">
                  <ResponsiveTableRow variant="default">
                    <ResponsiveTableHead 
                      variant="default" 
                      priority="high" 
                      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort("code")}
                      data-testid="header-code"
                    >
                      <div className="flex items-center">
                        Código
                        {getSortIcon("code")}
                      </div>
                    </ResponsiveTableHead>
                    <ResponsiveTableHead 
                      variant="default" 
                      priority="high"
                      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort("title")}
                      data-testid="header-title"
                    >
                      <div className="flex items-center">
                        Título
                        {getSortIcon("title")}
                      </div>
                    </ResponsiveTableHead>
                    <ResponsiveTableHead 
                      variant="default" 
                      priority="medium"
                      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort("type")}
                      data-testid="header-type"
                    >
                      <div className="flex items-center">
                        Tipo
                        {getSortIcon("type")}
                      </div>
                    </ResponsiveTableHead>
                    <ResponsiveTableHead 
                      variant="default" 
                      priority="high"
                      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort("severity")}
                      data-testid="header-severity"
                    >
                      <div className="flex items-center">
                        Severidad
                        {getSortIcon("severity")}
                      </div>
                    </ResponsiveTableHead>
                    <ResponsiveTableHead 
                      variant="default" 
                      priority="high"
                      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort("status")}
                      data-testid="header-status"
                    >
                      <div className="flex items-center">
                        Estado
                        {getSortIcon("status")}
                      </div>
                    </ResponsiveTableHead>
                    <ResponsiveTableHead 
                      variant="default" 
                      priority="medium"
                      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort("responsible")}
                      data-testid="header-responsible"
                    >
                      <div className="flex items-center">
                        Responsable
                        {getSortIcon("responsible")}
                      </div>
                    </ResponsiveTableHead>
                    <ResponsiveTableHead 
                      variant="default" 
                      priority="medium"
                      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort("dueDate")}
                      data-testid="header-dueDate"
                    >
                      <div className="flex items-center">
                        Fecha Límite
                        {getSortIcon("dueDate")}
                      </div>
                    </ResponsiveTableHead>
                    <ResponsiveTableHead variant="default" priority="high">Acciones</ResponsiveTableHead>
                  </ResponsiveTableRow>
                </ResponsiveTableHeader>
                <ResponsiveTableBody variant="default">
                  {filteredAndSortedFindings.map((finding) => (
                    <ResponsiveTableRow key={finding.id} data-testid={`row-finding-${finding.id}`} variant="default">
                      <ResponsiveTableCell variant="default" priority="high" label="Código">
                        <span className="font-mono text-sm" data-testid={`text-code-${finding.id}`}>
                          {finding.code}
                        </span>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell variant="default" priority="high" label="Título">
                        <div className="font-medium" data-testid={`text-title-${finding.id}`}>
                          {finding.title}
                        </div>
                        {finding.description && (
                          <div className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {finding.description}
                          </div>
                        )}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell variant="default" priority="medium" label="Tipo" data-testid={`text-type-${finding.id}`}>
                        {getTypeBadge(finding.type)}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell variant="default" priority="high" label="Severidad" data-testid={`text-severity-${finding.id}`}>
                        {getSeverityBadge(finding.severity)}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell variant="default" priority="high" label="Estado" data-testid={`text-status-${finding.id}`}>
                        {getStatusBadge(finding.status)}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell variant="default" priority="medium" label="Responsable" data-testid={`text-responsible-${finding.id}`}>
                        <div className="min-w-0">
                          {finding.responsiblePerson ? users.find(u => u.id === finding.responsiblePerson)?.fullName || "Usuario no encontrado" : "Sin asignar"}
                        </div>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell variant="default" priority="medium" label="Fecha Límite" data-testid={`text-dueDate-${finding.id}`}>
                        <div className="whitespace-nowrap">
                          {finding.dueDate ? new Date(finding.dueDate).toLocaleDateString() : "Sin fecha"}
                        </div>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell variant="default" priority="high" label="Acciones">
                        <div className="flex items-center gap-1 min-w-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setViewingDetails(finding)}
                            data-testid={`button-view-${finding.id}`}
                            className="min-w-[44px] min-h-[44px] sm:min-w-auto sm:min-h-auto"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Ver detalles</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(finding)}
                            data-testid={`button-edit-${finding.id}`}
                            className="min-w-[44px] min-h-[44px] sm:min-w-auto sm:min-h-auto"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteMutation.mutate(finding.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-${finding.id}`}
                            className="min-w-[44px] min-h-[44px] sm:min-w-auto sm:min-h-auto"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Eliminar</span>
                          </Button>
                        </div>
                      </ResponsiveTableCell>
                    </ResponsiveTableRow>
                  ))}
                </ResponsiveTableBody>
              </ResponsiveTableContent>
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Finding Dialog */}
      <Dialog open={showFindingDialog} onOpenChange={setShowFindingDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-finding-form">
          <DialogHeader>
            <DialogTitle>
              {editingFinding ? "Editar Hallazgo" : "Nuevo Hallazgo de Auditoría"}
            </DialogTitle>
            <DialogDescription>
              {editingFinding ? 
                "Modifica los detalles del hallazgo de auditoría" : 
                "Registra un nuevo hallazgo identificado durante la auditoría"
              }
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Tabs defaultValue="identification" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="identification">Identificación</TabsTrigger>
                  <TabsTrigger value="analysis">Análisis</TabsTrigger>
                  <TabsTrigger value="recommendation">Recomendación</TabsTrigger>
                  <TabsTrigger value="commitment">Compromiso</TabsTrigger>
                </TabsList>

                <TabsContent value="identification" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="auditId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Auditoría</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-audit">
                              <SelectValue placeholder="Selecciona la auditoría" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {audits.map((audit) => (
                              <SelectItem key={audit.id} value={audit.id}>
                                {audit.code} - {audit.name}
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
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título del Hallazgo</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción Detallada</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            rows={4}
                            placeholder="Describe el hallazgo identificado durante la auditoría..."
                            data-testid="textarea-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Hallazgo *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-type">
                                <SelectValue placeholder="Selecciona el tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="deficiency">Deficiencia</SelectItem>
                              <SelectItem value="weakness">Debilidad</SelectItem>
                              <SelectItem value="observation">Observación</SelectItem>
                              <SelectItem value="opportunity">Oportunidad</SelectItem>
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-status">
                                <SelectValue placeholder="Selecciona el estado" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pending">Pendiente</SelectItem>
                              <SelectItem value="in_progress">En Progreso</SelectItem>
                              <SelectItem value="completed">Completado</SelectItem>
                              <SelectItem value="cancelled">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="analysis" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="criteria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Criterio (Lo que debería ser) *</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            rows={3}
                            placeholder="Norma, política, procedimiento o estándar de referencia..."
                            data-testid="textarea-criteria"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="condition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condición (Lo que se encontró) *</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            rows={3}
                            placeholder="Lo que efectivamente se observó durante la auditoría..."
                            data-testid="textarea-condition"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cause"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Causa Raíz (Por qué ocurrió) *</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            rows={3}
                            placeholder="Motivo fundamental que originó la desviación..."
                            data-testid="textarea-cause"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="effect"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Efecto/Riesgo (Consecuencias) *</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            rows={3}
                            placeholder="Impacto o consecuencias potenciales de no corregir..."
                            data-testid="textarea-effect"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="recommendation" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="recommendation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recomendación *</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            rows={4}
                            placeholder="Acción correctiva o preventiva sugerida para resolver el hallazgo..."
                            data-testid="textarea-recommendation"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="managementResponse"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Respuesta de la Administración</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            value={field.value || ""}
                            rows={3}
                            placeholder="Respuesta oficial de la administración al hallazgo..."
                            data-testid="textarea-management-response"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Planes de Acción Asociados - Using FindingActionPlans Component */}
                  {editingFinding && (
                    <FindingActionPlans 
                      findingId={editingFinding.id}
                      findingTitle={editingFinding.title}
                    />
                  )}
                </TabsContent>

                <TabsContent value="commitment" className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Crear Compromiso Asociado</h4>
                    <p className="text-sm text-blue-700 mb-4">
                      Opcionalmente, puedes crear un compromiso de acción directamente al registrar este hallazgo.
                    </p>
                    
                    <FormField
                      control={form.control}
                      name="createCommitment"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value || false}
                              onChange={field.onChange}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                              data-testid="checkbox-create-commitment"
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-medium">
                            Crear compromiso asociado a este hallazgo
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  {form.watch("createCommitment") && (
                    <div className="space-y-4 border-t pt-4">
                      <h5 className="font-medium text-gray-900">Detalles del Compromiso</h5>
                      
                      <FormField
                        control={form.control}
                        name="commitmentTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Título del Compromiso *</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="Título descriptivo del compromiso..."
                                data-testid="input-commitment-title"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="commitmentDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descripción del Compromiso</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                rows={3}
                                placeholder="Descripción detallada de la acción comprometida..."
                                data-testid="textarea-commitment-description"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="commitmentResponsible"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Responsable *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-commitment-responsible">
                                    <SelectValue placeholder="Selecciona el responsable" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {users.map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                      {user.fullName}
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
                          name="commitmentDueDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fecha Límite *</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="date"
                                  value={field.value || ""}
                                  data-testid="input-commitment-due-date"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="commitmentPriority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prioridad</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || "medium"}>
                              <FormControl>
                                <SelectTrigger data-testid="select-commitment-priority">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">Baja</SelectItem>
                                <SelectItem value="medium">Media</SelectItem>
                                <SelectItem value="high">Alta</SelectItem>
                                <SelectItem value="critical">Crítica</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="commitmentManagementResponse"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Respuesta de la Administración</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                rows={2}
                                placeholder="Respuesta oficial sobre el compromiso..."
                                data-testid="textarea-commitment-management-response"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="commitmentAgreedAction"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Acción Acordada</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                rows={2}
                                placeholder="Acción específica acordada para resolver el hallazgo..."
                                data-testid="textarea-commitment-agreed-action"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </TabsContent>

              </Tabs>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowFindingDialog(false);
                    setEditingFinding(null);
                    form.reset();
                  }}
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save"
                >
                  {editingFinding ? "Actualizar" : "Crear"} Hallazgo
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      {viewingDetails && (
        <Dialog open={!!viewingDetails} onOpenChange={() => setViewingDetails(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-finding-details">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                {viewingDetails.code} - {viewingDetails.title}
              </DialogTitle>
              <DialogDescription>
                Detalles completos del hallazgo de auditoría
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Severidad</label>
                  <div className="mt-1">{getSeverityBadge(viewingDetails.severity)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Estado</label>
                  <div className="mt-1">{getStatusBadge(viewingDetails.status)}</div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Descripción</label>
                <p className="mt-1 text-sm">{viewingDetails.description || "Sin descripción"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Responsable</label>
                  <p className="mt-1 text-sm">
                    {viewingDetails.responsiblePerson ? users.find(u => u.id === viewingDetails.responsiblePerson)?.fullName || "Usuario no encontrado" : "Sin asignar"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Fecha Límite</label>
                  <p className="mt-1 text-sm">
                    {viewingDetails.dueDate ? new Date(viewingDetails.dueDate).toLocaleDateString() : "Sin fecha"}
                  </p>
                </div>
              </div>


              {viewingDetails.managementResponse && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Respuesta de la Gerencia</label>
                  <p className="mt-1 text-sm">{viewingDetails.managementResponse}</p>
                </div>
              )}

              {viewingDetails.agreedAction && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Acción Acordada/Compromiso</label>
                  <p className="mt-1 text-sm">{viewingDetails.agreedAction}</p>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">Creado:</span> {viewingDetails.createdAt ? new Date(viewingDetails.createdAt).toLocaleString() : "Sin fecha"}
                </div>
              </div>

              {/* Planes de Acción asociados al hallazgo */}
              <div className="pt-4">
                <FindingActionPlans 
                  findingId={viewingDetails.id} 
                  findingTitle={viewingDetails.title}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => setViewingDetails(null)}
                data-testid="button-close-details"
              >
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog para crear Plan de Acción desde hallazgo de auditoría */}
      <Dialog open={createActionPlanDialogOpen} onOpenChange={setCreateActionPlanDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Plan de Acción desde Hallazgo</DialogTitle>
            <DialogDescription>
              Crea un nuevo plan de acción basado en este hallazgo de auditoría
            </DialogDescription>
          </DialogHeader>
          {currentFindingForActionPlan && (
            <ActionPlanForm
              auditFindingId={currentFindingForActionPlan.id}
              onSuccess={() => {
                setCreateActionPlanDialogOpen(false);
                setCurrentFindingForActionPlan(null);
                // Invalidate all related queries to refresh data
                queryClient.invalidateQueries({ queryKey: ["/api/action-plans"] });
                queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
                // Specifically invalidate the associated action plans for this finding
                queryClient.invalidateQueries({ queryKey: ['/api/audit-findings', currentFindingForActionPlan.id, 'actions'] });
                toast({
                  title: "Plan de acción creado",
                  description: "El plan de acción ha sido creado exitosamente con fuente auditoría.",
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}