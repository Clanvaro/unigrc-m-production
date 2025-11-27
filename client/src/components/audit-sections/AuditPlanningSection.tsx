import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Edit, Save, X } from "lucide-react";
import { DateCell } from "@/components/DateCell";
import { ObjectivesEditor } from "@/components/objectives-editor";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getStatusColor, getStatusText } from "@/utils/audit-helpers";
import type { AuditSectionProps } from "./types";
import type { User } from "@shared/schema";

export function AuditPlanningSection({ audit, onUpdate }: AuditSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingObjectives, setEditingObjectives] = useState(false);
  const [tempObjectives, setTempObjectives] = useState<string[]>([]);

  const { data: auditMilestones = [], isLoading: milestonesLoading } = useQuery<any[]>({
    queryKey: ["/api/audits", audit.id, "milestones"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Estado</Label>
              <Badge className={getStatusColor(audit.status)}>
                {getStatusText(audit.status)}
              </Badge>
            </div>
            <div>
              <Label className="text-sm font-medium">Auditor Líder</Label>
              <p className="text-sm text-muted-foreground mt-1">{getAuditorName(audit.leadAuditor)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Tipo de Auditoría</Label>
              <p className="text-sm text-muted-foreground mt-1 capitalize">{audit.type}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Prioridad</Label>
              <Badge variant={audit.priority === 'high' ? 'destructive' : 
                            audit.priority === 'medium' ? 'default' : 'secondary'}>
                {audit.priority === 'high' ? 'Alta' : 
                 audit.priority === 'medium' ? 'Media' : 'Baja'}
              </Badge>
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
              {milestonesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
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
                            <p className="text-xs text-muted-foreground">
                              {reunionInicio?.meetingDate 
                                ? new Date(reunionInicio.meetingDate).toLocaleDateString('es-MX')
                                : "No programada"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Cierre de Auditoría */}
                  {(() => {
                    const cierreAuditoria = auditMilestones.find((m: any) => m.type === 'reunion_cierre');
                    return (
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg" data-testid={`milestone-cierre-auditoria-${audit.id}`}>
                        <div className="flex items-center gap-3 flex-1">
                          <Calendar className="h-4 w-4 text-green-500" />
                          <div className="flex-1">
                            <p className="text-sm font-medium mb-1">Cierre de Auditoría</p>
                            <p className="text-xs text-muted-foreground">
                              {cierreAuditoria?.meetingDate 
                                ? new Date(cierreAuditoria.meetingDate).toLocaleDateString('es-MX')
                                : "No programada"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle>Alcance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Descripción del Alcance</Label>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {audit.scope || "No definido"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
