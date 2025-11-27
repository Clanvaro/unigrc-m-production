import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AuditSectionProps } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Edit, 
  Save, 
  X, 
  Calendar,
  FolderOpen,
  FileText,
  CheckCircle2,
  Search
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Process, Subproceso, Macroproceso } from "@shared/schema";
import { expandScopeEntities, sanitizeSelections } from "@shared/scope-expansion";

export function AuditScopeSection({ audit, onUpdate }: AuditSectionProps) {
  const [editingDescription, setEditingDescription] = useState(false);
  const [tempDescription, setTempDescription] = useState("");
  const [editingReviewPeriod, setEditingReviewPeriod] = useState(false);
  const [reviewPeriodStart, setReviewPeriodStart] = useState("");
  const [reviewPeriodEnd, setReviewPeriodEnd] = useState("");
  const [editingScopeEntities, setEditingScopeEntities] = useState(false);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [entitySearchTerm, setEntitySearchTerm] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Función para parsear fecha en timezone local (evita el bug de UTC)
  const parseDateLocal = (dateString: string): Date => {
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  const hasEntities = expandedScope.expandedEntities.length > 0;

  return (
    <div className="space-y-6" data-testid="audit-scope-section">
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
                  <div data-testid="text-period-start">
                    <span className="text-muted-foreground">Desde: </span>
                    <span className="font-medium">
                      {format(parseDateLocal(audit.reviewPeriodStartDate), "dd MMM yyyy", { locale: es })}
                    </span>
                  </div>
                  <span className="text-muted-foreground">—</span>
                  <div data-testid="text-period-end">
                    <span className="text-muted-foreground">Hasta: </span>
                    <span className="font-medium">
                      {format(parseDateLocal(audit.reviewPeriodEndDate), "dd MMM yyyy", { locale: es })}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No se ha definido un período a revisar
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
