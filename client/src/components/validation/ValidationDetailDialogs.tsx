import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Clock, User, AlertTriangle, FileText, AlertCircle } from "lucide-react";

interface DetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatDate = (date: string | null | undefined): string => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString();
};

const getValidationStatusBadge = (status: string) => {
  const statusMap: Record<string, { label: string; variant: "outline" | "default" | "secondary" | "destructive"; icon: ReactNode }> = {
    'pending_validation': { label: 'Pendiente', variant: 'outline', icon: <Clock className="h-3 w-3" /> },
    'validated': { label: 'Aprobado', variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
    'observed': { label: 'Observado', variant: 'outline', icon: <AlertCircle className="h-3 w-3" /> },
    'rejected': { label: 'Rechazado', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
  };
  const statusInfo = statusMap[status] || { label: status, variant: 'secondary' as const, icon: null };
  return (
    <Badge variant={statusInfo.variant} className="flex items-center gap-1 w-fit">
      {statusInfo.icon}
      {statusInfo.label}
    </Badge>
  );
};

export interface RiskDetailDialogProps extends DetailDialogProps {
  risk: any;
}

export function RiskDetailDialog({ risk, open, onOpenChange }: RiskDetailDialogProps) {
  if (!risk) return null;

  const getRiskLevelColor = (level: number) => {
    if (level >= 20) return "bg-red-100 text-red-800 border-red-200";
    if (level >= 10) return "bg-orange-100 text-orange-800 border-orange-200";
    if (level >= 5) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-green-100 text-green-800 border-green-200";
  };

  const getRiskLevelText = (level: number) => {
    if (level >= 20) return "Crítico";
    if (level >= 10) return "Alto";
    if (level >= 5) return "Medio";
    return "Bajo";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Detalle del Riesgo - {risk.code}
          </DialogTitle>
          <DialogDescription>
            Información completa del riesgo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Resumen
            </h3>
            <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Nombre</Label>
                <p className="font-medium">{risk.name || "N/A"}</p>
              </div>
              
              {risk.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Descripción</Label>
                  <p className="text-sm">{risk.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Probabilidad</Label>
                  <p className="text-sm mt-1">{risk.probability || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Impacto</Label>
                  <p className="text-sm mt-1">{risk.impact || "N/A"}</p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Nivel de Riesgo Inherente</Label>
                <div className="mt-2">
                  <Badge className={getRiskLevelColor(risk.inherentRisk || 0)}>
                    {getRiskLevelText(risk.inherentRisk || 0)} ({risk.inherentRisk || 0})
                  </Badge>
                </div>
              </div>

              {risk.processOwner && (
                <div>
                  <Label className="text-xs text-muted-foreground">Responsable del Proceso</Label>
                  <p className="text-sm mt-1">{risk.processOwner}</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Estado de Validación
            </h3>
            <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Estado</Label>
                <div className="mt-2">
                  {getValidationStatusBadge(risk.validationStatus || 'pending_validation')}
                </div>
              </div>

              {risk.validatedBy && (
                <div>
                  <Label className="text-xs text-muted-foreground">Validado Por</Label>
                  <p className="text-sm mt-1">{risk.validatedBy}</p>
                </div>
              )}

              {risk.validatedAt && (
                <div>
                  <Label className="text-xs text-muted-foreground">Fecha de Validación</Label>
                  <p className="text-sm mt-1">{formatDate(risk.validatedAt)}</p>
                </div>
              )}

              {risk.validationComments && (
                <div>
                  <Label className="text-xs text-muted-foreground">Comentarios de Validación</Label>
                  <p className="text-sm mt-1 bg-white dark:bg-gray-800 p-3 rounded border">
                    {risk.validationComments}
                  </p>
                </div>
              )}

              {(!risk.validationComments && !risk.validatedBy) && (
                <p className="text-sm text-muted-foreground italic">
                  Sin validación registrada
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export interface ControlDetailDialogProps extends DetailDialogProps {
  control: any;
}

export function ControlDetailDialog({ control, open, onOpenChange }: ControlDetailDialogProps) {
  if (!control) return null;

  const getControlTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      'preventive': 'Preventivo',
      'detective': 'Detectivo',
      'corrective': 'Correctivo',
    };
    return typeMap[type] || type;
  };

  const getAutomationLevelText = (level: string) => {
    const levelMap: Record<string, string> = {
      'manual': 'Manual',
      'semi_automated': 'Semi-automatizado',
      'automated': 'Automatizado',
    };
    return levelMap[level] || level;
  };

  const getFrequencyText = (frequency: string) => {
    const frequencyMap: Record<string, string> = {
      'continuous': 'Continuo',
      'daily': 'Diario',
      'weekly': 'Semanal',
      'monthly': 'Mensual',
      'quarterly': 'Trimestral',
      'annual': 'Anual',
      'on_demand': 'Bajo Demanda',
    };
    return frequencyMap[frequency] || frequency;
  };

  const getEffectivenessText = (effectiveness: string) => {
    const effectivenessMap: Record<string, string> = {
      'effective': 'Efectivo',
      'partially_effective': 'Parcialmente Efectivo',
      'not_effective': 'No Efectivo',
      'not_tested': 'No Probado',
    };
    return effectivenessMap[effectiveness] || effectiveness;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalle del Control - {control.code}
          </DialogTitle>
          <DialogDescription>
            Información resumida y estado de validación
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="h-4 w-4" />
              Resumen
            </h3>
            <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Nombre</Label>
                <p className="font-medium">{control.name || "N/A"}</p>
              </div>
              
              {control.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Descripción</Label>
                  <p className="text-sm">{control.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <p className="text-sm mt-1">{getControlTypeText(control.type)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Nivel de Automatización</Label>
                  <p className="text-sm mt-1">{getAutomationLevelText(control.automationLevel)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Frecuencia</Label>
                  <p className="text-sm mt-1">{getFrequencyText(control.frequency)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Efectividad</Label>
                  <p className="text-sm mt-1">{getEffectivenessText(control.effectiveness)}</p>
                </div>
              </div>

              {control.owner && (
                <div>
                  <Label className="text-xs text-muted-foreground">Responsable del Control</Label>
                  <p className="text-sm mt-1">{control.owner.name} ({control.owner.email})</p>
                </div>
              )}

              {control.evidence && (
                <div>
                  <Label className="text-xs text-muted-foreground">Evidencia</Label>
                  <p className="text-sm mt-1">{control.evidence}</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Validación
            </h3>
            <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Estado de Validación</Label>
                <div className="mt-1">{getValidationStatusBadge(control.validationStatus || 'pending_validation')}</div>
              </div>

              {control.notifiedAt && (
                <div>
                  <Label className="text-xs text-muted-foreground">Fecha de Notificación</Label>
                  <p className="text-sm mt-1">{formatDate(control.notifiedAt)}</p>
                </div>
              )}

              {control.validatedBy && (
                <div>
                  <Label className="text-xs text-muted-foreground">Validado Por</Label>
                  <p className="text-sm mt-1">{control.validatedBy}</p>
                </div>
              )}

              {control.validatedAt && (
                <div>
                  <Label className="text-xs text-muted-foreground">Fecha de Validación</Label>
                  <p className="text-sm mt-1">{formatDate(control.validatedAt)}</p>
                </div>
              )}

              {control.validationComments && (
                <div>
                  <Label className="text-xs text-muted-foreground">Comentarios de Validación</Label>
                  <p className="text-sm mt-1 bg-white dark:bg-gray-800 p-3 rounded border">
                    {control.validationComments}
                  </p>
                </div>
              )}

              {(!control.validationComments && !control.validatedBy) && (
                <p className="text-sm text-muted-foreground italic">
                  Sin validación registrada
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export interface ActionPlanDetailDialogProps extends DetailDialogProps {
  plan: any;
}

export function ActionPlanDetailDialog({ plan, open, onOpenChange }: ActionPlanDetailDialogProps) {
  if (!plan) return null;

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "outline" | "default" | "secondary" | "destructive" }> = {
      'draft': { label: 'Borrador', variant: 'secondary' },
      'in_progress': { label: 'En Progreso', variant: 'default' },
      'pending_review': { label: 'Pendiente Revisión', variant: 'outline' },
      'approved': { label: 'Aprobado', variant: 'default' },
      'rejected': { label: 'Rechazado', variant: 'destructive' },
    };
    const statusInfo = statusMap[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalle del Plan de Acción - {plan.code}
          </DialogTitle>
          <DialogDescription>
            Información resumida y estado de validación
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="h-4 w-4" />
              Resumen
            </h3>
            <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Título</Label>
                <p className="font-medium">{plan.title || "N/A"}</p>
              </div>
              
              {plan.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Descripción</Label>
                  <p className="text-sm">{plan.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Estado</Label>
                  <div className="mt-1">{getStatusBadge(plan.status)}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Responsable</Label>
                  <p className="text-sm mt-1">{plan.responsible || "N/A"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Fecha Creación</Label>
                  <p className="text-sm mt-1">{formatDate(plan.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fecha Límite</Label>
                  <p className="text-sm mt-1">{formatDate(plan.deadline)}</p>
                </div>
              </div>

              {plan.associatedRisks && plan.associatedRisks.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Riesgos Asociados</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {plan.associatedRisks.map((risk: any) => (
                      <Badge 
                        key={risk.riskId} 
                        variant={risk.isPrimary ? "default" : "outline"}
                        className="text-xs"
                      >
                        {risk.riskCode} - {risk.riskName}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Validación
            </h3>
            <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Estado de Validación</Label>
                <div className="mt-1">{getValidationStatusBadge(plan.validationStatus || 'pending_validation')}</div>
              </div>

              {plan.validatedBy && (
                <div>
                  <Label className="text-xs text-muted-foreground">Validado Por</Label>
                  <p className="text-sm mt-1">{plan.validatedBy}</p>
                </div>
              )}

              {plan.validatedAt && (
                <div>
                  <Label className="text-xs text-muted-foreground">Fecha de Validación</Label>
                  <p className="text-sm mt-1">{formatDate(plan.validatedAt)}</p>
                </div>
              )}

              {plan.validationComments && (
                <div>
                  <Label className="text-xs text-muted-foreground">Comentarios de Validación</Label>
                  <p className="text-sm mt-1 bg-white dark:bg-gray-800 p-3 rounded border">
                    {plan.validationComments}
                  </p>
                </div>
              )}

              {(!plan.validationComments && !plan.validatedBy) && (
                <p className="text-sm text-muted-foreground italic">
                  Sin validación registrada
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
