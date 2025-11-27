import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Calendar, 
  Edit, 
  Save, 
  X,
  FileText,
  FolderOpen,
  CheckCircle2,
  Search
} from "lucide-react";
import { DateCell } from "@/components/DateCell";
import { ObjectivesEditor } from "@/components/objectives-editor";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getStatusColor, getStatusText } from "@/utils/audit-helpers";
import type { AuditSectionProps } from "./types";
import type { User, Process, Subproceso, Macroproceso } from "@shared/schema";
import { expandScopeEntities, sanitizeSelections } from "@shared/scope-expansion";

export function AuditPlanGeneralSection({ audit, onUpdate }: AuditSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Estado para Objetivos
  const [editingObjectives, setEditingObjectives] = useState(false);
  const [tempObjectives, setTempObjectives] = useState<string[]>([]);
  
  // Estado para Descripción de Alcance
  const [editingDescription, setEditingDescription] = useState(false);
  const [tempDescription, setTempDescription] = useState("");
  
  // Estado para Entidades de Alcance
  const [editingScopeEntities, setEditingScopeEntities] = useState(false);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [entitySearchTerm, setEntitySearchTerm] = useState("");
  
  // Estado para Período a Revisar
  const [editingReviewPeriod, setEditingReviewPeriod] = useState(false);
  const [reviewPeriodStart, setReviewPeriodStart] = useState("");
  const [reviewPeriodEnd, setReviewPeriodEnd] = useState("");

  // Estado para Hitos de Auditoría
  const [editingReunionInicio, setEditingReunionInicio] = useState(false);
  const [reunionInicioDate, setReunionInicioDate] = useState("");
  const [editingCierreAuditoria, setEditingCierreAuditoria] = useState(false);
  const [cierreAuditoriaDate, setCierreAuditoriaDate] = useState("");

  // Queries
  const { data: auditMilestones = [], isLoading: milestonesLoading } = useQuery<any[]>({
    queryKey: ["/api/audits", audit.id, "milestones"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: processes = [], isLoading: processesLoading } = useQuery<Process[]>({
    queryKey: ["/api/processes"],
  });

  const { data: subprocesos = [], isLoading: subprocesosLoading } = useQuery<Subproceso[]>({
    queryKey: ["/api/subprocesos"],
  });

  const { data: macroprocesos = [], isLoading: macroprocesosLoading } = useQuery<Macroproceso[]>({
    queryKey: ["/api/macroprocesos"],
  });

  const isLoading = processesLoading || subprocesosLoading || macroprocesosLoading;

  const getAuditorName = (auditorId: string) => {
    const auditor = users.find((u: User) => u.id === auditorId);
    return auditor ? auditor.fullName : "No asignado";
  };

  const handleDateChange = async (auditId: string, field: string, value: string) => {
    try {
      const updatedAudit = await apiRequest(`/api/audits/${auditId}`, "PUT", { [field]: value });
      if (updatedAudit) {
        onUpdate(updatedAudit);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
      toast({
        title: "Fecha actualizada",
        description: "La fecha ha sido actualizada correctamente"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la fecha",
        variant: "destructive"
      });
    }
  };

  // Mutations
  const updateObjectivesMutation = useMutation({
    mutationFn: async (objectives: string[]) => {
      return apiRequest(`/api/audits/${audit.id}`, "PUT", { objectives });
    },
    onSuccess: (updatedAudit) => {
      if (updatedAudit) {
        onUpdate(updatedAudit);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
      setEditingObjectives(false);
      toast({
        title: "Objetivos actualizados",
        description: "Los objetivos han sido actualizados correctamente"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudieron actualizar los objetivos",
        variant: "destructive"
      });
    }
  });

  const updateScopeDescriptionMutation = useMutation({
    mutationFn: async (description: string) => {
      return apiRequest(`/api/audits/${audit.id}`, "PUT", { scope: description });
    },
    onSuccess: (updatedAudit) => {
      if (updatedAudit) {
        onUpdate(updatedAudit);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
      setEditingDescription(false);
      toast({ title: "Descripción del alcance actualizada" });
    },
    onError: () => {
      toast({ title: "Error al actualizar descripción", variant: "destructive" });
    },
  });

  const updateScopeEntitiesMutation = useMutation({
    mutationFn: async (entities: string[]) => {
      if (!audit?.id) {
        throw new Error("Audit ID is required");
      }
      return apiRequest(`/api/audits/${audit.id}`, "PUT", { scopeEntities: entities });
    },
    onSuccess: (updatedAudit) => {
      if (updatedAudit) {
        onUpdate(updatedAudit);
      }
      setEditingScopeEntities(false);
      setEntitySearchTerm("");
      toast({ 
        title: "Alcance actualizado", 
        description: `${selectedEntities.length} entidades seleccionadas` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error al actualizar alcance", 
        description: error?.message || "Ocurrió un error",
        variant: "destructive" 
      });
    },
  });

  const updateReviewPeriodMutation = useMutation({
    mutationFn: async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
      return apiRequest(`/api/audits/${audit.id}`, "PUT", {
        reviewPeriodStartDate: startDate,
        reviewPeriodEndDate: endDate
      });
    },
    onSuccess: (updatedAudit) => {
      if (updatedAudit) {
        onUpdate(updatedAudit);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
      setEditingReviewPeriod(false);
      toast({ title: "Período a revisar actualizado" });
    },
    onError: () => {
      toast({ title: "Error al actualizar período", variant: "destructive" });
    },
  });

  // Función para formatear fecha de manera confiable (para mostrar)
  const formatDateForDisplay = (dateString: string): string => {
    // Extraer solo la parte de fecha (YYYY-MM-DD) del ISO string
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-');
    return `${day}/${month}/${year}`;
  };

  // Función para formatear fecha para el input (YYYY-MM-DD)
  const formatDateForInput = (dateString: string): string => {
    // Extraer solo la parte de fecha (YYYY-MM-DD) del ISO string
    return dateString.split('T')[0];
  };

  // Función para parsear fecha en timezone local (evita el bug de UTC)
  const parseDateLocal = (dateString: string): Date => {
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  const createMilestoneMutation = useMutation({
    mutationFn: async ({ type, plannedDate }: { type: string; plannedDate: string }) => {
      return apiRequest(`/api/audits/${audit.id}/milestones`, "POST", {
        name: type === 'reunion_inicio' ? 'Reunión de Inicio' : 'Cierre de Auditoría',
        type,
        plannedDate,
        meetingDate: plannedDate,
        status: 'pending',
        order: type === 'reunion_inicio' ? 1 : 2
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits", audit.id, "milestones"] });
      setEditingReunionInicio(false);
      setEditingCierreAuditoria(false);
      toast({ title: "Hito creado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al crear hito", variant: "destructive" });
    },
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ milestoneId, meetingDate }: { milestoneId: string; meetingDate: string }) => {
      return apiRequest(`/api/audit-milestones/${milestoneId}`, "PUT", { meetingDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits", audit.id, "milestones"] });
      setEditingReunionInicio(false);
      setEditingCierreAuditoria(false);
      toast({ title: "Fecha del hito actualizada" });
    },
    onError: () => {
      toast({ title: "Error al actualizar fecha del hito", variant: "destructive" });
    },
  });

  // Effects
  useEffect(() => {
    if (audit) {
      if (!editingDescription) {
        setTempDescription(audit.scope || "");
      }
      if (!editingReviewPeriod) {
        setReviewPeriodStart(
          audit.reviewPeriodStartDate 
            ? new Date(audit.reviewPeriodStartDate).toISOString().split('T')[0] 
            : ""
        );
        setReviewPeriodEnd(
          audit.reviewPeriodEndDate 
            ? new Date(audit.reviewPeriodEndDate).toISOString().split('T')[0] 
            : ""
        );
      }
      if (!editingScopeEntities) {
        setSelectedEntities(audit.scopeEntities || []);
      }
    }
  }, [audit, editingDescription, editingReviewPeriod, editingScopeEntities]);

  useEffect(() => {
    if (auditMilestones.length > 0) {
      const reunionInicio = auditMilestones.find((m: any) => m.type === 'reunion_inicio');
      const cierreAuditoria = auditMilestones.find((m: any) => m.type === 'cierre_auditoria');
      
      if (reunionInicio?.meetingDate && !editingReunionInicio) {
        setReunionInicioDate(formatDateForInput(reunionInicio.meetingDate));
      }
      if (cierreAuditoria?.meetingDate && !editingCierreAuditoria) {
        setCierreAuditoriaDate(formatDateForInput(cierreAuditoria.meetingDate));
      }
    }
  }, [auditMilestones, editingReunionInicio, editingCierreAuditoria]);

  // Handlers
  const handleStartEditDescription = () => {
    setTempDescription(audit.scope || "");
    setEditingDescription(true);
  };

  const handleSaveDescription = () => {
    if (tempDescription.trim() && tempDescription !== audit.scope) {
      updateScopeDescriptionMutation.mutate(tempDescription);
    } else if (tempDescription.trim() === audit.scope) {
      setEditingDescription(false);
    }
  };

  const handleStartEditReviewPeriod = () => {
    setReviewPeriodStart(
      audit.reviewPeriodStartDate 
        ? new Date(audit.reviewPeriodStartDate).toISOString().split('T')[0] 
        : ""
    );
    setReviewPeriodEnd(
      audit.reviewPeriodEndDate 
        ? new Date(audit.reviewPeriodEndDate).toISOString().split('T')[0] 
        : ""
    );
    setEditingReviewPeriod(true);
  };

  const handleSaveReviewPeriod = () => {
    if (reviewPeriodStart && reviewPeriodEnd) {
      if (new Date(reviewPeriodStart) > new Date(reviewPeriodEnd)) {
        toast({ 
          title: "Fecha inválida", 
          description: "La fecha de inicio debe ser anterior a la fecha de fin",
          variant: "destructive"
        });
        return;
      }
      const currentStart = audit.reviewPeriodStartDate 
        ? new Date(audit.reviewPeriodStartDate).toISOString().split('T')[0]
        : "";
      const currentEnd = audit.reviewPeriodEndDate 
        ? new Date(audit.reviewPeriodEndDate).toISOString().split('T')[0]
        : "";
      
      if (reviewPeriodStart !== currentStart || reviewPeriodEnd !== currentEnd) {
        updateReviewPeriodMutation.mutate({ 
          startDate: reviewPeriodStart, 
          endDate: reviewPeriodEnd 
        });
      } else {
        setEditingReviewPeriod(false);
      }
    }
  };

  const handleStartEditEntities = () => {
    setSelectedEntities(audit.scopeEntities || []);
    setEditingScopeEntities(true);
  };

  const handleSaveEntities = () => {
    if (!audit?.id) {
      toast({
        title: "Error",
        description: "No se pudo identificar la auditoría. Por favor, recarga la página.",
        variant: "destructive"
      });
      return;
    }
    
    const currentEntities = audit.scopeEntities || [];
    const hasChanged = selectedEntities.length !== currentEntities.length || 
      selectedEntities.some(e => !currentEntities.includes(e));
    
    if (hasChanged) {
      updateScopeEntitiesMutation.mutate(selectedEntities);
    } else {
      setEditingScopeEntities(false);
      setEntitySearchTerm("");
    }
  };

  const toggleEntity = (entityId: string) => {
    setSelectedEntities(prev => {
      const isCurrentlySelected = prev.includes(entityId);
      const newSelections = sanitizeSelections(
        prev,
        entityId,
        !isCurrentlySelected,
        macroprocesos,
        processes,
        subprocesos
      );
      return newSelections;
    });
  };

  const handleSaveMilestoneDate = (milestoneId: string | undefined, newDate: string, milestoneType: string) => {
    if (!newDate) {
      toast({ 
        title: "Fecha requerida", 
        description: "Por favor seleccione una fecha",
        variant: "destructive"
      });
      return;
    }
    
    // Si no existe el milestone, crearlo; de lo contrario, actualizarlo
    if (!milestoneId) {
      createMilestoneMutation.mutate({ type: milestoneType, plannedDate: newDate });
    } else {
      updateMilestoneMutation.mutate({ milestoneId, meetingDate: newDate });
    }
  };

  const getEntityOptions = () => {
    const options: Array<{ id: string; label: string; type: string; macroprocesoName?: string }> = [];
    
    macroprocesos.forEach((macro: Macroproceso) => {
      options.push({
        id: `macroproceso-${macro.id}`,
        label: `${macro.code} - ${macro.name}`,
        type: "Macroproceso",
      });
    });

    processes.forEach((proc: Process) => {
      const macro = macroprocesos.find((m: Macroproceso) => m.id === proc.macroprocesoId);
      options.push({
        id: `process-${proc.id}`,
        label: `${proc.code} - ${proc.name}`,
        type: "Proceso",
        macroprocesoName: macro?.name,
      });
    });

    subprocesos.forEach((sub: Subproceso) => {
      const proc = processes.find((p: Process) => p.id === sub.procesoId);
      options.push({
        id: `subproceso-${sub.id}`,
        label: `${sub.code} - ${sub.name}`,
        type: "Subproceso",
        macroprocesoName: proc?.name,
      });
    });

    return options;
  };

  const getFilteredEntityOptions = () => {
    const options = getEntityOptions();
    if (!entitySearchTerm.trim()) return options;
    
    return options.filter(option =>
      option.label.toLowerCase().includes(entitySearchTerm.toLowerCase()) ||
      option.type.toLowerCase().includes(entitySearchTerm.toLowerCase()) ||
      option.macroprocesoName?.toLowerCase().includes(entitySearchTerm.toLowerCase())
    );
  };

  const expandedScope = useMemo(() => {
    if (!audit.scopeEntities || audit.scopeEntities.length === 0) {
      return { expandedEntities: [], displayGroups: { macroprocesos: [], procesos: [], subprocesos: [] } };
    }
    
    return expandScopeEntities(
      audit.scopeEntities,
      macroprocesos,
      processes,
      subprocesos
    );
  }, [audit.scopeEntities, macroprocesos, processes, subprocesos]);

  if (isLoading || milestonesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const hasEntities = expandedScope.expandedEntities.length > 0;

  return (
    <div className="space-y-6">
      {/* Información General y Cronograma */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Estado</Label>
              <div className="mt-1">
                <Badge className={getStatusColor(audit.status)}>
                  {getStatusText(audit.status)}
                </Badge>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Auditor Líder</Label>
              <p className="text-sm text-muted-foreground mt-1">{getAuditorName(audit.leadAuditor)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Tipo de Auditoría</Label>
              <p className="text-sm text-muted-foreground mt-1 capitalize">
                {audit.type === 'risk_based' ? 'Basada en Riesgos' : 
                 audit.type === 'compliance' ? 'Cumplimiento' : 
                 audit.type === 'operational' ? 'Operacional' : 
                 audit.type === 'financial' ? 'Financiera' : 
                 audit.type === 'it' ? 'Tecnología de la Información' : 
                 audit.type}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Prioridad</Label>
              <div className="mt-1">
                <Badge variant={audit.priority === 'high' ? 'destructive' : 
                              audit.priority === 'medium' ? 'default' : 'secondary'}>
                  {audit.priority === 'high' ? 'Alta' : 
                   audit.priority === 'medium' ? 'Media' : 'Baja'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cronograma</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Fecha de Inicio</Label>
              <div className="mt-1">
                <DateCell
                  auditId={audit.id}
                  field="plannedStartDate"
                  value={audit.plannedStartDate ? new Date(audit.plannedStartDate) : null}
                  onCommit={handleDateChange}
                  className="text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Fecha de Fin</Label>
              <div className="mt-1">
                <DateCell
                  auditId={audit.id}
                  field="plannedEndDate"
                  value={audit.plannedEndDate ? new Date(audit.plannedEndDate) : null}
                  onCommit={handleDateChange}
                  className="text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Duración Estimada</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {audit.plannedStartDate && audit.plannedEndDate ? 
                  `${Math.ceil((new Date(audit.plannedEndDate).getTime() - new Date(audit.plannedStartDate).getTime()) / (1000 * 60 * 60 * 24))} días` : 
                  "No calculado"}
              </p>
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-3">
              <Label className="text-sm font-medium">Hitos de Auditoría</Label>
              <div className="space-y-2">
                {/* Reunión de Inicio */}
                {(() => {
                  const reunionInicio = auditMilestones.find((m: any) => m.type === 'reunion_inicio');
                  return (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg" data-testid={`milestone-reunion-inicio-${audit.id}`}>
                      <div className="flex items-center gap-3 flex-1">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-1">Reunión de Inicio</p>
                          {editingReunionInicio ? (
                            <div className="flex items-center gap-2 mt-1">
                              <Input
                                type="date"
                                value={reunionInicioDate}
                                onChange={(e) => setReunionInicioDate(e.target.value)}
                                className="text-xs h-8"
                                data-testid="input-reunion-inicio-date"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSaveMilestoneDate(reunionInicio?.id, reunionInicioDate, 'reunion_inicio')}
                                disabled={updateMilestoneMutation.isPending || createMilestoneMutation.isPending}
                                className="h-8 w-8 p-0"
                                data-testid="button-save-reunion-inicio"
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingReunionInicio(false)}
                                className="h-8 w-8 p-0"
                                data-testid="button-cancel-reunion-inicio"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {reunionInicio?.meetingDate 
                                ? formatDateForDisplay(reunionInicio.meetingDate)
                                : "No programada"}
                            </p>
                          )}
                        </div>
                      </div>
                      {!editingReunionInicio && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingReunionInicio(true)}
                          className="h-8 w-8 p-0"
                          data-testid="button-edit-reunion-inicio"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  );
                })()}
                
                {/* Cierre de Auditoría */}
                {(() => {
                  const cierreAuditoria = auditMilestones.find((m: any) => m.type === 'cierre_auditoria');
                  return (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg" data-testid={`milestone-cierre-auditoria-${audit.id}`}>
                      <div className="flex items-center gap-3 flex-1">
                        <Calendar className="h-4 w-4 text-green-500" />
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-1">Cierre de Auditoría</p>
                          {editingCierreAuditoria ? (
                            <div className="flex items-center gap-2 mt-1">
                              <Input
                                type="date"
                                value={cierreAuditoriaDate}
                                onChange={(e) => setCierreAuditoriaDate(e.target.value)}
                                className="text-xs h-8"
                                data-testid="input-cierre-auditoria-date"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSaveMilestoneDate(cierreAuditoria?.id, cierreAuditoriaDate, 'cierre_auditoria')}
                                disabled={updateMilestoneMutation.isPending || createMilestoneMutation.isPending}
                                className="h-8 w-8 p-0"
                                data-testid="button-save-cierre-auditoria"
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingCierreAuditoria(false)}
                                className="h-8 w-8 p-0"
                                data-testid="button-cancel-cierre-auditoria"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {cierreAuditoria?.meetingDate 
                                ? formatDateForDisplay(cierreAuditoria.meetingDate)
                                : "No programada"}
                            </p>
                          )}
                        </div>
                      </div>
                      {!editingCierreAuditoria && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingCierreAuditoria(true)}
                          className="h-8 w-8 p-0"
                          data-testid="button-edit-cierre-auditoria"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Objetivos de la Auditoría */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Objetivos de la Auditoría</CardTitle>
          {!editingObjectives && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTempObjectives(Array.isArray(audit.objectives) ? audit.objectives as string[] : []);
                setEditingObjectives(true);
              }}
              data-testid="button-edit-objectives"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingObjectives ? (
            <div className="space-y-4">
              <ObjectivesEditor 
                objectives={tempObjectives}
                onChange={setTempObjectives}
                disabled={updateObjectivesMutation.isPending}
              />
              
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingObjectives(false)}
                  disabled={updateObjectivesMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button 
                  onClick={() => updateObjectivesMutation.mutate(tempObjectives)}
                  disabled={updateObjectivesMutation.isPending}
                  data-testid="button-save-objectives"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {Array.isArray(audit.objectives) && audit.objectives.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1">
                  {(audit.objectives as string[]).map((objective, index) => (
                    <li key={index} className="text-sm">{objective}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No se han definido objetivos específicos</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Descripción del Alcance */}
      <Card data-testid="card-scope-description">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Descripción del Alcance
          </CardTitle>
          {!editingDescription && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStartEditDescription}
              data-testid="button-edit-description"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingDescription ? (
            <div className="space-y-3">
              <Textarea
                value={tempDescription}
                onChange={(e) => setTempDescription(e.target.value)}
                placeholder="Describa el alcance de la auditoría..."
                rows={4}
                data-testid="textarea-scope-description"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveDescription}
                  disabled={updateScopeDescriptionMutation.isPending}
                  data-testid="button-save-description"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingDescription(false)}
                  data-testid="button-cancel-description"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm" data-testid="text-scope-description">
              {audit.scope || "No se ha definido una descripción del alcance"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Entidades en Alcance */}
      <Card data-testid="card-scope-entities">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Entidades en Alcance
          </CardTitle>
          {!editingScopeEntities && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStartEditEntities}
              data-testid="button-edit-entities"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingScopeEntities ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Buscar entidades</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, código o tipo..."
                    value={entitySearchTerm}
                    onChange={(e) => setEntitySearchTerm(e.target.value)}
                    className="pl-8"
                    data-testid="input-entity-search"
                  />
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2 border rounded-md p-3">
                {getFilteredEntityOptions().map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center gap-2 p-2 hover:bg-accent rounded-sm"
                    data-testid={`entity-option-${option.id}`}
                  >
                    <Checkbox
                      checked={selectedEntities.includes(option.id)}
                      onCheckedChange={() => toggleEntity(option.id)}
                      data-testid={`checkbox-entity-${option.id}`}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{option.label}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {option.type}
                        </Badge>
                        {option.macroprocesoName && (
                          <span>{option.macroprocesoName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {getFilteredEntityOptions().length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No se encontraron entidades
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveEntities}
                  disabled={updateScopeEntitiesMutation.isPending}
                  data-testid="button-save-entities"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar ({selectedEntities.length})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingScopeEntities(false);
                    setEntitySearchTerm("");
                  }}
                  data-testid="button-cancel-entities"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {hasEntities ? (
                <>
                  {/* Macroprocesos */}
                  {expandedScope.displayGroups.macroprocesos.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Macroprocesos</p>
                      {expandedScope.displayGroups.macroprocesos.map((macro, index: number) => (
                        <div
                          key={`macro-${macro.id}`}
                          className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-sm border border-blue-200 dark:border-blue-800"
                          data-testid={`selected-entity-macro-${index}`}
                        >
                          <CheckCircle2 className="h-4 w-4 text-blue-600" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{macro.code} - {macro.name}</p>
                            <Badge variant="outline" className="text-xs mt-1">Macroproceso</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Procesos */}
                  {expandedScope.displayGroups.procesos.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Procesos</p>
                      {expandedScope.displayGroups.procesos.map((proc, index: number) => (
                        <div
                          key={`proc-${proc.id}`}
                          className={`flex items-center gap-2 p-2 rounded-sm border ${
                            proc.isChild 
                              ? 'bg-accent/30 border-accent/50' 
                              : 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                          }`}
                          data-testid={`selected-entity-proc-${index}`}
                        >
                          <CheckCircle2 className={`h-4 w-4 ${proc.isChild ? 'text-muted-foreground' : 'text-green-600'}`} />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{proc.code} - {proc.name}</p>
                            <div className="flex gap-2 items-center mt-1">
                              <Badge variant="outline" className="text-xs">Proceso</Badge>
                              {proc.isChild && (
                                <Badge variant="secondary" className="text-xs">Auto-incluido</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Subprocesos */}
                  {expandedScope.displayGroups.subprocesos.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Subprocesos</p>
                      {expandedScope.displayGroups.subprocesos.map((sub, index: number) => (
                        <div
                          key={`sub-${sub.id}`}
                          className={`flex items-center gap-2 p-2 rounded-sm border ${
                            sub.isChild 
                              ? 'bg-accent/30 border-accent/50' 
                              : 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800'
                          }`}
                          data-testid={`selected-entity-sub-${index}`}
                        >
                          <CheckCircle2 className={`h-4 w-4 ${sub.isChild ? 'text-muted-foreground' : 'text-purple-600'}`} />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{sub.code} - {sub.name}</p>
                            <div className="flex gap-2 items-center mt-1">
                              <Badge variant="outline" className="text-xs">Subproceso</Badge>
                              {sub.isChild && (
                                <Badge variant="secondary" className="text-xs">Auto-incluido</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No se han seleccionado entidades en alcance
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Período a Revisar */}
      <Card data-testid="card-review-period">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Período a Revisar
          </CardTitle>
          {!editingReviewPeriod && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStartEditReviewPeriod}
              data-testid="button-edit-period"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingReviewPeriod ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha de Inicio</Label>
                  <Input
                    type="date"
                    value={reviewPeriodStart}
                    onChange={(e) => setReviewPeriodStart(e.target.value)}
                    data-testid="input-period-start"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de Fin</Label>
                  <Input
                    type="date"
                    value={reviewPeriodEnd}
                    onChange={(e) => setReviewPeriodEnd(e.target.value)}
                    data-testid="input-period-end"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveReviewPeriod}
                  disabled={updateReviewPeriodMutation.isPending}
                  data-testid="button-save-period"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingReviewPeriod(false)}
                  data-testid="button-cancel-period"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {audit.reviewPeriodStartDate && audit.reviewPeriodEndDate ? (
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Desde</Label>
                    <p className="font-medium">
                      {parseDateLocal(audit.reviewPeriodStartDate).toLocaleDateString('es-MX', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Hasta</Label>
                    <p className="font-medium">
                      {parseDateLocal(audit.reviewPeriodEndDate).toLocaleDateString('es-MX', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No se ha definido el período a revisar
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
