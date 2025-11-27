import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Search, Calendar, Users, Clock, FileText, AlertTriangle, Edit, Trash2, Play, CheckCircle, Shield, Eye } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Audit, User } from "@shared/schema";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export default function ComplianceAudits() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAuditDialog, setShowAuditDialog] = useState(false);
  const [viewingAuditDetails, setViewingAuditDetails] = useState<Audit | null>(null);
  const [editingScopeDetails, setEditingScopeDetails] = useState(false);
  const [scopeEntity, setScopeEntity] = useState("");
  const [reviewPeriod, setReviewPeriod] = useState("");

  // Listen for header button clicks
  useEffect(() => {
    const handleHeaderButtonClick = () => {
      setShowAuditDialog(true);
    };

    const checkHeaderButton = () => {
      const headerButton = document.querySelector('[data-testid="button-create-compliance-audit"]');
      if (headerButton) {
        headerButton.addEventListener('click', handleHeaderButtonClick);
        return () => headerButton.removeEventListener('click', handleHeaderButtonClick);
      }
    };

    // Check immediately and set up an interval to check periodically
    const cleanup = checkHeaderButton();
    const interval = setInterval(() => {
      const existingCleanup = checkHeaderButton();
      if (existingCleanup) {
        clearInterval(interval);
      }
    }, 100);

    return () => {
      clearInterval(interval);
      if (cleanup) cleanup();
    };
  }, []);
  const [editingAudit, setEditingAudit] = useState<Audit | null>(null);
  const [riskSearchTerm, setRiskSearchTerm] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const auditFormSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    scope: z.string().min(1, "El alcance es requerido"),
    leadAuditor: z.string().optional(),
    regulationId: z.string().min(1, "La normativa es requerida"),
    selectedControls: z.array(z.string()).min(1, "Debe seleccionar al menos un control"),
    plannedStartDate: z.string().min(1, "La fecha de inicio es requerida"),
    plannedEndDate: z.string().min(1, "La fecha de fin es requerida"),
  }).refine((data) => {
    if (data.plannedStartDate && data.plannedEndDate) {
      return new Date(data.plannedStartDate) <= new Date(data.plannedEndDate);
    }
    return true;
  }, {
    message: "La fecha de inicio debe ser anterior a la fecha de fin",
    path: ["plannedEndDate"],
  });

  const form = useForm({
    resolver: zodResolver(auditFormSchema),
    defaultValues: {
      name: "",
      scope: "",
      leadAuditor: "",
      regulationId: "",
      selectedControls: [],
      plannedStartDate: "",
      plannedEndDate: "",
    }
  });

  // Reset form when editing audit changes
  useEffect(() => {
    if (editingAudit) {
      form.reset({
        name: editingAudit.name || "",
        scope: editingAudit.scope || "",
        leadAuditor: editingAudit.leadAuditor || "",
        regulationId: editingAudit.regulationId || "",
        selectedControls: [],
        plannedStartDate: editingAudit.plannedStartDate ? new Date(editingAudit.plannedStartDate).toISOString().split('T')[0] : "",
        plannedEndDate: editingAudit.plannedEndDate ? new Date(editingAudit.plannedEndDate).toISOString().split('T')[0] : "",
      });
    } else {
      form.reset({
        name: "",
        scope: "",
        leadAuditor: "",
        regulationId: "",
        selectedControls: [],
        plannedStartDate: "",
        plannedEndDate: "",
      });
    }
  }, [editingAudit, form]);

  // Data queries
  const { data: audits = [], isLoading } = useQuery<Audit[]>({
    queryKey: ["/api/audits"],
    staleTime: 0,
    select: (data: any) => data.data || []
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["/api/roles"],
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ["/api/user-roles"],
  });

  const { data: regulations = [] } = useQuery({
    queryKey: ["/api/regulations"],
  });

  const { data: macroprocesos = [] } = useQuery({
    queryKey: ["/api/macroprocesos"],
  });

  const { data: processes = [] } = useQuery({
    queryKey: ["/api/processes"],
  });

  const { data: subprocesos = [] } = useQuery({
    queryKey: ["/api/subprocesos"],
  });

  // Get selected regulation controls
  const selectedRegulationId = form.watch("regulationId");
  const { data: regulationControls = [] } = useQuery({
    queryKey: ["/api/regulations", selectedRegulationId, "controls"],
    enabled: !!selectedRegulationId,
  });

  // Filter audits to show only compliance audits
  const complianceAudits = audits.filter((audit: Audit) => audit.type === "compliance");

  // Apply search and filters
  const filteredAudits = complianceAudits.filter((audit: Audit) => {
    const matchesSearch = audit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         audit.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         audit.scope.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || audit.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Initialize scope values when viewing audit details
  useEffect(() => {
    if (viewingAuditDetails) {
      setScopeEntity(viewingAuditDetails.scopeEntity || "");
      setReviewPeriod(viewingAuditDetails.reviewPeriod || "");
    }
  }, [viewingAuditDetails]);

  // Mutation to update scope details
  const updateScopeMutation = useMutation({
    mutationFn: async ({ id, scopeData }: { id: string; scopeData: { scopeEntity: string; reviewPeriod: string } }) => {
      return await apiRequest(`/api/audits/${id}`, "PUT", scopeData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
      setEditingScopeDetails(false);
      toast({
        title: "Alcance actualizado",
        description: "Los detalles del alcance se han actualizado correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el alcance",
        variant: "destructive",
      });
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/audits", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
      setShowAuditDialog(false);
      setEditingAudit(null);
      form.reset();
      toast({
        title: "Auditoría de Cumplimiento Creada",
        description: "La auditoría de cumplimiento se ha creado exitosamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear la auditoría de cumplimiento.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest(`/api/audits/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
      setShowAuditDialog(false);
      setEditingAudit(null);
      form.reset();
      toast({
        title: "Auditoría Actualizada",
        description: "La auditoría se ha actualizado exitosamente.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/audits/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
      toast({
        title: "Auditoría Eliminada",
        description: "La auditoría se ha eliminado exitosamente.",
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      apiRequest(`/api/audits/${id}`, "PUT", { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
      toast({
        title: "Estado Actualizado",
        description: "El estado de la auditoría se ha actualizado.",
      });
    },
  });

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case "planificacion": return "bg-blue-100 text-blue-800";
      case "borrador": return "bg-gray-100 text-gray-800";
      case "trabajo_campo": return "bg-orange-100 text-orange-800";
      case "reporte": return "bg-purple-100 text-purple-800";
      case "completado": return "bg-green-100 text-green-800";
      case "cancelado": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "planificacion": return "Planificación";
      case "borrador": return "Borrador";
      case "trabajo_campo": return "Trabajo de Campo";
      case "reporte": return "Reporte";
      case "completado": return "Completada";
      case "cancelado": return "Cancelada";
      default: return status;
    }
  };

  const getAuditorName = (auditorId: string) => {
    const auditor = users.find((u: User) => u.id === auditorId);
    return auditor ? auditor.fullName : "No asignado";
  };

  const getRegulationName = (regulationId: string | null) => {
    if (!regulationId) return "—";
    const regulation = (regulations as any[]).find((r: any) => r.id === regulationId);
    return regulation ? regulation.name : "Normativa no encontrada";
  };

  // Filter users that have audit roles
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

  const handleStartAudit = (auditId: string) => {
    statusMutation.mutate({ id: auditId, status: "in_progress" });
  };

  const handleCompleteAudit = (auditId: string) => {
    statusMutation.mutate({ id: auditId, status: "completed" });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando auditorías de cumplimiento...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Dialog open={showAuditDialog} onOpenChange={(open) => {
          setShowAuditDialog(open);
          if (!open) {
            setEditingAudit(null);
            setRiskSearchTerm("");
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAudit ? 'Editar Auditoría' : 'Nueva Auditoría de Cumplimiento'}</DialogTitle>
              <DialogDescription>
                {editingAudit ? 'Modifica los detalles de la auditoría' : 'Crea una nueva auditoría para evaluar el cumplimiento normativo'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => {
                if (editingAudit) {
                  const updateData = {
                    ...data,
                    plannedStartDate: data.plannedStartDate ? new Date(data.plannedStartDate + "T00:00:00.000Z") : null,
                    plannedEndDate: data.plannedEndDate ? new Date(data.plannedEndDate + "T00:00:00.000Z") : null,
                  };
                  updateMutation.mutate({ id: editingAudit.id, data: updateData });
                } else {
                  const auditData = {
                    ...data,
                    type: "compliance", // Siempre tipo cumplimiento
                    status: "planned",
                    planId: null,
                    priority: "medium",
                    leadAuditor: data.leadAuditor || (auditTeamUsers.length > 0 ? auditTeamUsers[0].id : "user-1"),
                    auditTeam: auditTeamUsers.length > 0 ? [auditTeamUsers[0].id] : ["user-1"],
                    associatedRisks: [],
                    plannedStartDate: data.plannedStartDate ? new Date(data.plannedStartDate + "T00:00:00.000Z") : null,
                    plannedEndDate: data.plannedEndDate ? new Date(data.plannedEndDate + "T00:00:00.000Z") : null,
                    objectives: [
                      "Evaluar el cumplimiento de la normativa seleccionada",
                      "Verificar la efectividad de los controles implementados",
                      "Identificar brechas de cumplimiento y áreas de mejora"
                    ]
                  };
                  
                  createMutation.mutate(auditData, {
                    onSuccess: async (newAudit: any) => {
                      // Crear asociaciones de controles de auditoría
                      if (data.selectedControls?.length > 0) {
                        try {
                          for (const controlId of data.selectedControls) {
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
                            placeholder="Auditoría de Cumplimiento GDPR Q1 2024"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="scope"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alcance</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Sistemas de información y procesos de tratamiento de datos"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="regulationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Normativa</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue("selectedControls", []);
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona la normativa a auditar" />
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
                                    {item.control.evidence && (
                                      <span className="text-xs text-blue-600 block">
                                        📋 {item.control.evidence}
                                      </span>
                                    )}
                                  </label>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">No hay controles disponibles para esta normativa</p>
                            )}
                          </div>
                          
                          {/* Mostrar controles seleccionados */}
                          {field.value && field.value.length > 0 && (
                            <div className="mt-3">
                              <Label className="text-sm font-medium text-green-700">Controles Seleccionados ({field.value.length})</Label>
                              <div className="border border-green-200 rounded-md p-3 mt-2 bg-green-50 space-y-2">
                                {field.value.map((controlId: string) => {
                                  const selectedControl = (regulationControls as any[]).find((item: any) => item.control.id === controlId);
                                  if (!selectedControl) return null;
                                  
                                  return (
                                    <div key={controlId} className="flex items-center justify-between bg-white p-2 rounded border">
                                      <div className="flex-1">
                                        <span className="font-medium text-sm">{selectedControl.control.name}</span>
                                        {selectedControl.control.evidence && (
                                          <span className="text-xs text-blue-600 block">
                                            📋 {selectedControl.control.evidence}
                                          </span>
                                        )}
                                      </div>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          const currentValue: string[] = field.value || [];
                                          field.onChange(currentValue.filter((id: string) => id !== controlId));
                                        }}
                                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                        data-testid={`button-remove-control-${controlId}`}
                                      >
                                        ×
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

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
                       (editingAudit ? 'Guardar Cambios' : 'Crear Auditoría')}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar auditorías..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
            data-testid="input-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="planificacion">Planificación</SelectItem>
            <SelectItem value="borrador">Borrador</SelectItem>
            <SelectItem value="trabajo_campo">Trabajo de Campo</SelectItem>
            <SelectItem value="reporte">Reporte</SelectItem>
            <SelectItem value="completado">Completada</SelectItem>
            <SelectItem value="cancelado">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card data-testid="card-total-compliance-audits">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cumplimiento</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complianceAudits.length}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-active-compliance-audits">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {complianceAudits.filter((a: Audit) => a.status === "trabajo_campo").length}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-completed-compliance-audits">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {complianceAudits.filter((a: Audit) => a.status === "completado").length}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-planned-compliance-audits">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planificadas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {complianceAudits.filter((a: Audit) => a.status === "planificacion").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de auditorías */}
      <Card data-testid="card-compliance-audits-table">
        <CardHeader>
          <CardTitle>Lista de Auditorías de Cumplimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveTable variant="default" showScrollIndicator={true}>
            <ResponsiveTableContent variant="default">
              <ResponsiveTableHeader variant="default">
                <ResponsiveTableRow variant="default">
                  <ResponsiveTableHead variant="default" priority="high">Código</ResponsiveTableHead>
                  <ResponsiveTableHead variant="default" priority="high">Nombre</ResponsiveTableHead>
                  <ResponsiveTableHead variant="default" priority="medium">Normativa</ResponsiveTableHead>
                  <ResponsiveTableHead variant="default" priority="medium">Auditor Líder</ResponsiveTableHead>
                  <ResponsiveTableHead variant="default" priority="high">Estado</ResponsiveTableHead>
                  <ResponsiveTableHead variant="default" priority="medium">Fechas</ResponsiveTableHead>
                  <ResponsiveTableHead variant="default" priority="high">Acciones</ResponsiveTableHead>
                </ResponsiveTableRow>
              </ResponsiveTableHeader>
              <ResponsiveTableBody variant="default">
                {filteredAudits.map((audit: Audit) => (
                  <ResponsiveTableRow key={audit.id} data-testid={`row-compliance-audit-${audit.id}`} variant="default">
                    <ResponsiveTableCell variant="default" priority="high" label="Código">
                      <Badge variant="outline" className="font-mono">
                        {audit.code}
                      </Badge>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell variant="default" priority="high" label="Nombre">
                      <div className="min-w-0">
                        <p className="font-medium">{audit.name}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {audit.scope}
                        </p>
                      </div>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell variant="default" priority="medium" label="Normativa">
                      <div className="text-sm min-w-0">
                        <span className="font-medium text-blue-600 block truncate">
                          {getRegulationName(audit.regulationId)}
                        </span>
                      </div>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell variant="default" priority="medium" label="Auditor Líder">
                      <div className="flex items-center gap-2 min-w-0">
                        <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate">{getAuditorName(audit.leadAuditor)}</span>
                      </div>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell variant="default" priority="high" label="Estado">
                      <Badge className={getStatusColor(audit.status)}>
                        {getStatusText(audit.status)}
                      </Badge>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell variant="default" priority="medium" label="Fechas">
                      <div className="text-sm whitespace-nowrap">
                        <p>Inicio: {audit.plannedStartDate ? 
                          new Date(audit.plannedStartDate).toLocaleDateString() : "No definido"}</p>
                        <p>Fin: {audit.plannedEndDate ? 
                          new Date(audit.plannedEndDate).toLocaleDateString() : "No definido"}</p>
                      </div>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell variant="default" priority="high" label="Acciones">
                      <div className="flex items-center gap-1 min-w-0">
                        {audit.status === "planificacion" && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleStartAudit(audit.id)}
                            data-testid={`button-start-${audit.id}`}
                            className="min-w-[44px] min-h-[44px] sm:min-w-auto sm:min-h-auto"
                          >
                            <Play className="h-4 w-4" />
                            <span className="sr-only">Iniciar auditoría</span>
                          </Button>
                        )}
                        {audit.status === "trabajo_campo" && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleCompleteAudit(audit.id)}
                            data-testid={`button-complete-${audit.id}`}
                            className="min-w-[44px] min-h-[44px] sm:min-w-auto sm:min-h-auto"
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span className="sr-only">Completar auditoría</span>
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => setViewingAuditDetails(audit)}
                          data-testid={`button-view-${audit.id}`}
                          title="Ver Detalles"
                          className="min-w-[44px] min-h-[44px] sm:min-w-auto sm:min-h-auto"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Ver detalles</span>
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            setEditingAudit(audit);
                            setShowAuditDialog(true);
                          }}
                          data-testid={`button-edit-${audit.id}`}
                          className="min-w-[44px] min-h-[44px] sm:min-w-auto sm:min-h-auto"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Editar auditoría</span>
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(audit.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${audit.id}`}
                          className="min-w-[44px] min-h-[44px] sm:min-w-auto sm:min-h-auto"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Eliminar auditoría</span>
                        </Button>
                      </div>
                    </ResponsiveTableCell>
                  </ResponsiveTableRow>
                ))}
              </ResponsiveTableBody>
            </ResponsiveTableContent>
          </ResponsiveTable>
          
          {filteredAudits.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {complianceAudits.length === 0 ? 
                "No hay auditorías de cumplimiento creadas aún." :
                "No se encontraron auditorías que coincidan con los filtros aplicados."
              }
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalles de Auditoría */}
      <Dialog open={!!viewingAuditDetails} onOpenChange={(open) => !open && setViewingAuditDetails(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de Auditoría - {viewingAuditDetails?.name}</DialogTitle>
            <DialogDescription>
              Información completa de la auditoría de cumplimiento
            </DialogDescription>
          </DialogHeader>
          
          {viewingAuditDetails && (
            <div className="space-y-6">
              {/* Información General */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Información General</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Código</Label>
                      <p className="font-mono">{viewingAuditDetails.code}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Nombre</Label>
                      <p>{viewingAuditDetails.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Estado</Label>
                      <Badge className={getStatusColor(viewingAuditDetails.status)}>
                        {getStatusText(viewingAuditDetails.status)}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Normativa</Label>
                      <p className="text-blue-600 font-medium">{getRegulationName(viewingAuditDetails.regulationId)}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Fechas y Equipo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Fecha de Inicio</Label>
                      <p>{viewingAuditDetails.plannedStartDate ? 
                        new Date(viewingAuditDetails.plannedStartDate).toLocaleDateString() : "No definida"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Fecha de Fin</Label>
                      <p>{viewingAuditDetails.plannedEndDate ? 
                        new Date(viewingAuditDetails.plannedEndDate).toLocaleDateString() : "No definida"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Auditor Líder</Label>
                      <p>{getAuditorName(viewingAuditDetails.leadAuditor)}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sección de Alcance */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Alcance
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingScopeDetails(!editingScopeDetails)}
                      data-testid="button-edit-scope"
                    >
                      {editingScopeDetails ? "Cancelar" : "Editar"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Descripción General</Label>
                      <p className="mt-1">{viewingAuditDetails.scope}</p>
                    </div>
                    
                    {editingScopeDetails ? (
                      /* Modo Edición */
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium">Entidad a Auditar</Label>
                            <Select value={scopeEntity} onValueChange={setScopeEntity}>
                              <SelectTrigger className="mt-2">
                                <SelectValue placeholder="Seleccione entidad a auditar" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">Sin especificar</SelectItem>
                                {macroprocesos.map((macro: any) => (
                                  <SelectItem key={`macro-${macro.id}`} value={`Macroproceso: ${macro.name}`}>
                                    📋 Macroproceso: {macro.name}
                                  </SelectItem>
                                ))}
                                {processes.map((process: any) => (
                                  <SelectItem key={`process-${process.id}`} value={`Proceso: ${process.name}`}>
                                    ⚙️ Proceso: {process.name}
                                  </SelectItem>
                                ))}
                                {subprocesos.map((subproceso: any) => (
                                  <SelectItem key={`sub-${subproceso.id}`} value={`Subproceso: ${subproceso.name}`}>
                                    🔧 Subproceso: {subproceso.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label className="text-sm font-medium">Período a Revisar</Label>
                            <Input
                              value={reviewPeriod}
                              onChange={(e) => setReviewPeriod(e.target.value)}
                              placeholder="Ej: Q1 2024, Enero-Marzo 2024"
                              className="mt-2"
                              data-testid="input-review-period"
                            />
                          </div>
                        </div>
                        
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditingScopeDetails(false);
                              setScopeEntity(viewingAuditDetails.scopeEntity || "");
                              setReviewPeriod(viewingAuditDetails.reviewPeriod || "");
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={() => {
                              updateScopeMutation.mutate({
                                id: viewingAuditDetails.id,
                                scopeData: { scopeEntity, reviewPeriod }
                              });
                            }}
                            disabled={updateScopeMutation.isPending}
                            data-testid="button-save-scope"
                          >
                            {updateScopeMutation.isPending ? "Guardando..." : "Guardar"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* Modo Visualización */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <Label className="text-sm font-medium text-blue-800 dark:text-blue-200">
                              Entidad a Auditar
                            </Label>
                          </div>
                          <p className="text-blue-700 dark:text-blue-300">
                            {viewingAuditDetails.scopeEntity || "No especificada"}
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Subproceso, proceso o macroproceso específico
                          </p>
                        </div>
                        
                        <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <Label className="text-sm font-medium text-green-800 dark:text-green-200">
                              Período a Revisar
                            </Label>
                          </div>
                          <p className="text-green-700 dark:text-green-300">
                            {viewingAuditDetails.reviewPeriod || "No especificado"}
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            Rango temporal de la revisión
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Objetivos */}
              {viewingAuditDetails.objectives && viewingAuditDetails.objectives.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Objetivos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {viewingAuditDetails.objectives.map((objective, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-sm">{objective}</p>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}