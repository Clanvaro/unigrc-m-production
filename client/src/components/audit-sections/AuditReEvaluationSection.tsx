import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { AuditSectionProps } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  RefreshCw, 
  Shield, 
  CheckCircle2,
  AlertTriangle,
  Info,
  Save,
  Plus,
  Edit,
  Trash2
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAuditRiskSchema } from "@shared/schema";
import { z } from "zod";
import AuditRiskForm from "@/components/forms/audit-risk-form";

interface Risk {
  id: string;
  code: string;
  name: string;
  description: string | null;
  probability: number;
  impact: number;
  inherentRisk: number;
  validationStatus?: string | null;
  validationStatusLabel?: string;
  validationStatusIcon?: string;
}

interface Control {
  id: string;
  code: string;
  name: string;
  description: string | null;
  effectiveness: number;
  type: string;
}

interface AuditRisk {
  id: string;
  auditId: string;
  code: string;
  name: string;
  description: string | null;
  category: string[];
  evaluationMethod: string;
  frequencyOccurrence: number;
  exposureVolume: number;
  exposureMassivity: number;
  exposureCriticalPath: number;
  complexity: number;
  changeVolatility: number;
  vulnerabilities: number;
  probability: number;
  impact: number;
  inherentRisk: number;
  status: string;
  identifiedBy: string;
  identifiedDate: string;
  source: string;
  potentialImpact: string | null;
  recommendedControls: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface RiskEvaluation {
  id: string;
  riskId: string | null;
  auditRiskId: string | null;
  confirmed: boolean;
  previousProbability: number | null;
  previousImpact: number | null;
  previousInherentRisk: number | null;
  newProbability: number | null;
  newImpact: number | null;
  newInherentRisk: number | null;
  evaluationJustification: string;
}

interface ControlEvaluation {
  id: string;
  controlId: string;
  riskId: string | null;
  designEffectiveness: string;
  operatingEffectiveness: string;
  professionalJustification: string | null;
  newEffectivenessRating: number | null;
}

interface ReEvaluationData {
  audit: any;
  risks: Risk[];
  controls: Control[];
  riskEvaluations: RiskEvaluation[];
  controlEvaluations: ControlEvaluation[];
  riskControlsMap: Record<string, Array<{ control: Control; residualRisk: string }>>;
}


export function AuditReEvaluationSection({ audit }: AuditSectionProps) {
  const { toast } = useToast();
  const [riskEvaluationState, setRiskEvaluationState] = useState<Record<string, {
    action: 'confirm' | 're-evaluate';
    newProbability: number;
    newImpact: number;
    justification: string;
  }>>({});

  const [controlEvaluationState, setControlEvaluationState] = useState<Record<string, {
    designEffectiveness: string;
    justification: string;
  }>>({});

  // Fetch re-evaluation data
  const { data, isLoading, error } = useQuery<ReEvaluationData>({
    queryKey: ["/api/audits", audit.id, "re-evaluation"],
    enabled: !!audit.id,
  });

  // Mutations
  const createRiskEvaluation = useMutation({
    mutationFn: async (evaluationData: any) => {
      return await apiRequest(`/api/audits/${audit.id}/risk-evaluations`, "POST", evaluationData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits", audit.id, "re-evaluation"] });
      toast({
        title: "Evaluación guardada",
        description: "La evaluación de riesgo se ha guardado correctamente",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar la evaluación de riesgo",
      });
    },
  });

  const updateRiskEvaluation = useMutation({
    mutationFn: async ({ evalId, data }: { evalId: string; data: any }) => {
      return await apiRequest(`/api/audits/${audit.id}/risk-evaluations/${evalId}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits", audit.id, "re-evaluation"] });
      toast({
        title: "Evaluación actualizada",
        description: "La evaluación de riesgo se ha actualizado correctamente",
      });
    },
  });

  const updateControlEvaluation = useMutation({
    mutationFn: async ({ evalId, data }: { evalId: string; data: any }) => {
      return await apiRequest(`/api/audits/${audit.id}/control-evaluations/${evalId}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits", audit.id, "re-evaluation"] });
      toast({
        title: "Evaluación guardada",
        description: "La evaluación de control se ha guardado correctamente",
      });
    },
  });

  // Ad-hoc risks state and queries
  const [isAdHocDialogOpen, setIsAdHocDialogOpen] = useState(false);
  const [editingAdHocRisk, setEditingAdHocRisk] = useState<AuditRisk | null>(null);

  const { data: adHocRisks, isLoading: adHocLoading } = useQuery<AuditRisk[]>({
    queryKey: ["/api/audits", audit.id, "ad-hoc-risks"],
    enabled: !!audit.id,
  });

  const createAdHocRisk = useMutation({
    mutationFn: async (riskData: any) => {
      return await apiRequest(`/api/audits/${audit.id}/ad-hoc-risks`, "POST", riskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits", audit.id, "ad-hoc-risks"] });
      toast({
        title: "Riesgo ad-hoc creado",
        description: "El riesgo ad-hoc se ha creado correctamente",
      });
      setIsAdHocDialogOpen(false);
      setEditingAdHocRisk(null);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear el riesgo ad-hoc",
      });
    },
  });

  const updateAdHocRisk = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest(`/api/audit-risks/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits", audit.id, "ad-hoc-risks"] });
      toast({
        title: "Riesgo ad-hoc actualizado",
        description: "El riesgo ad-hoc se ha actualizado correctamente",
      });
      setIsAdHocDialogOpen(false);
      setEditingAdHocRisk(null);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el riesgo ad-hoc",
      });
    },
  });

  const deleteAdHocRisk = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/audit-risks/${id}`, "DELETE", undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits", audit.id, "ad-hoc-risks"] });
      toast({
        title: "Riesgo ad-hoc eliminado",
        description: "El riesgo ad-hoc se ha eliminado correctamente",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el riesgo ad-hoc",
      });
    },
  });

  const handleOpenAdHocDialog = (risk?: AuditRisk) => {
    setEditingAdHocRisk(risk || null);
    setIsAdHocDialogOpen(true);
  };

  const handleCloseAdHocDialog = () => {
    setIsAdHocDialogOpen(false);
    setEditingAdHocRisk(null);
  };

  const handleDeleteAdHocRisk = async (id: string) => {
    if (window.confirm("¿Está seguro de eliminar este riesgo ad-hoc?")) {
      await deleteAdHocRisk.mutateAsync(id);
    }
  };

  const handleSaveRiskEvaluation = async (risk: Risk) => {
    const state = riskEvaluationState[risk.id];
    if (!state) return;

    if (!state.justification || state.justification.trim().length === 0) {
      toast({
        variant: "destructive",
        title: "Justificación requerida",
        description: "Debe proporcionar una justificación para la evaluación",
      });
      return;
    }

    const existingEval = data?.riskEvaluations.find(e => e.riskId === risk.id);

    const evaluationData: any = {
      riskId: risk.id,
      auditRiskId: null,
      confirmed: state.action === 'confirm',
      previousProbability: risk.probability,
      previousImpact: risk.impact,
      previousInherentRisk: risk.inherentRisk,
      evaluationJustification: state.justification,
    };

    if (state.action === 're-evaluate') {
      evaluationData.newProbability = state.newProbability;
      evaluationData.newImpact = state.newImpact;
      evaluationData.newInherentRisk = state.newProbability * state.newImpact;
    }

    if (existingEval) {
      await updateRiskEvaluation.mutateAsync({ evalId: existingEval.id, data: evaluationData });
    } else {
      await createRiskEvaluation.mutateAsync(evaluationData);
    }
  };

  const handleSaveControlEvaluation = async (control: Control, riskId: string) => {
    const state = controlEvaluationState[control.id];
    if (!state) return;

    if (!state.justification || state.justification.trim().length === 0) {
      toast({
        variant: "destructive",
        title: "Justificación requerida",
        description: "Debe proporcionar una justificación para la evaluación",
      });
      return;
    }

    const existingEval = data?.controlEvaluations.find(e => e.controlId === control.id);

    const evaluationData: any = {
      controlId: control.id,
      riskId: riskId,
      controlStatus: "existing",
      controlSufficiency: "sufficient",
      designEffectiveness: state.designEffectiveness,
      operatingEffectiveness: state.designEffectiveness,
      professionalJustification: state.justification,
      newEffectivenessRating: state.designEffectiveness === "ineffective" ? 0 : control.effectiveness,
    };

    if (existingEval) {
      await updateControlEvaluation.mutateAsync({ evalId: existingEval.id, data: evaluationData });
    } else {
      // For new evaluations, we need to create them first - which requires POST
      // But the API only has PATCH, so we'll skip creation for now
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se puede crear una nueva evaluación. Solo se pueden actualizar evaluaciones existentes.",
      });
    }
  };

  const getRiskEvaluationAction = (riskId: string) => {
    if (riskEvaluationState[riskId]) {
      return riskEvaluationState[riskId].action;
    }
    const existingEval = data?.riskEvaluations.find(e => e.riskId === riskId);
    return existingEval?.confirmed ? 'confirm' : 're-evaluate';
  };

  const getRiskEvaluationState = (riskId: string, risk: Risk) => {
    if (riskEvaluationState[riskId]) {
      return riskEvaluationState[riskId];
    }
    const existingEval = data?.riskEvaluations.find(e => e.riskId === riskId);
    return {
      action: existingEval?.confirmed ? 'confirm' as const : 're-evaluate' as const,
      newProbability: existingEval?.newProbability || risk.probability,
      newImpact: existingEval?.newImpact || risk.impact,
      justification: existingEval?.evaluationJustification || '',
    };
  };

  const getControlEvaluationState = (controlId: string) => {
    if (controlEvaluationState[controlId]) {
      return controlEvaluationState[controlId];
    }
    const existingEval = data?.controlEvaluations.find(e => e.controlId === controlId);
    return {
      designEffectiveness: existingEval?.designEffectiveness || 'effective',
      justification: existingEval?.professionalJustification || '',
    };
  };

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="audit-reevaluation">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="alert-error">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error al cargar los datos de re-evaluación. Por favor, intente de nuevo.
        </AlertDescription>
      </Alert>
    );
  }

  const risks = data?.risks || [];
  const completedEvaluations = data?.riskEvaluations.filter(e => e.evaluationJustification).length || 0;
  const totalControls = Object.values(data?.riskControlsMap || {}).reduce((acc, controls) => acc + controls.length, 0);
  const effectiveControls = data?.controlEvaluations.filter(e => e.designEffectiveness === 'effective').length || 0;

  return (
    <div className="space-y-6" data-testid="audit-reevaluation">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Re-evaluación de Riesgos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Durante la ejecución de la auditoría se debe re-evaluar el riesgo inherente y la efectividad de los controles, además de incorporar nuevos riesgos identificados.
          </p>

          <Tabs defaultValue="universe" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="universe" data-testid="tab-universe">Riesgos del Universo</TabsTrigger>
              <TabsTrigger value="adhoc" data-testid="tab-adhoc">Riesgos Ad-hoc</TabsTrigger>
            </TabsList>

            <TabsContent value="universe" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-accent/50 rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Riesgos en Alcance</p>
                  <p className="text-2xl font-bold" data-testid="text-total-risks">{risks.length}</p>
                  <p className="text-xs text-muted-foreground">Por evaluar</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Evaluaciones Completadas</p>
                  <p className="text-2xl font-bold" data-testid="text-completed-evaluations">{completedEvaluations}</p>
                  <p className="text-xs text-muted-foreground">
                    {risks.length > 0 ? Math.round((completedEvaluations / risks.length) * 100) : 0}% de progreso
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Controles en Alcance</p>
                  <p className="text-2xl font-bold" data-testid="text-total-controls">{totalControls}</p>
                  <p className="text-xs text-muted-foreground">Asociados a riesgos</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Controles Efectivos</p>
                  <p className="text-2xl font-bold text-green-600" data-testid="text-effective-controls">{effectiveControls}</p>
                  <p className="text-xs text-muted-foreground">Según evaluación</p>
                </div>
              </div>

              {risks.length === 0 ? (
        <Alert data-testid="alert-no-risks">
          <Info className="h-4 w-4" />
          <AlertDescription>
            No hay riesgos en el alcance de esta auditoría. Por favor, defina el alcance primero.
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Matriz de Re-evaluación</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              {risks.map((risk) => {
                const riskState = getRiskEvaluationState(risk.id, risk);
                const action = getRiskEvaluationAction(risk.id);
                const riskControls = data?.riskControlsMap[risk.id] || [];
                const hasEvaluation = data?.riskEvaluations.find(e => e.riskId === risk.id);

                return (
                  <AccordionItem key={risk.id} value={risk.id} data-testid={`accordion-risk-${risk.id}`}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 w-full">
                        <Shield className="h-4 w-4 text-blue-600" />
                        <div className="flex-1 text-left">
                          <p className="font-medium">{risk.code}: {risk.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Probabilidad: {risk.probability} | Impacto: {risk.impact} | Inherente: {risk.inherentRisk}
                            {risk.validationStatusLabel && (
                              <span className="ml-2">
                                | {risk.validationStatusIcon} {risk.validationStatusLabel}
                              </span>
                            )}
                          </p>
                        </div>
                        {hasEvaluation && (
                          <Badge variant="outline" className="bg-green-50">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Evaluado
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-6 pt-4">
                      {/* Risk Re-evaluation Section */}
                      <div className="border rounded-lg p-4 space-y-4 bg-blue-50/50 dark:bg-blue-950/20">
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          <RefreshCw className="h-4 w-4" />
                          Re-evaluación del Riesgo Inherente
                        </h4>

                        <div className="flex gap-4">
                          <Button
                            variant={action === 'confirm' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setRiskEvaluationState(prev => ({
                              ...prev,
                              [risk.id]: {
                                ...getRiskEvaluationState(risk.id, risk),
                                action: 'confirm',
                              }
                            }))}
                            data-testid={`button-confirm-risk-${risk.id}`}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Confirmar Valores Actuales
                          </Button>
                          <Button
                            variant={action === 're-evaluate' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setRiskEvaluationState(prev => ({
                              ...prev,
                              [risk.id]: {
                                ...getRiskEvaluationState(risk.id, risk),
                                action: 're-evaluate',
                              }
                            }))}
                            data-testid={`button-reevaluate-risk-${risk.id}`}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Re-evaluar
                          </Button>
                        </div>

                        {action === 're-evaluate' && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Nueva Probabilidad: {riskState.newProbability}</Label>
                                <Slider
                                  value={[riskState.newProbability]}
                                  onValueChange={([value]) => setRiskEvaluationState(prev => ({
                                    ...prev,
                                    [risk.id]: {
                                      ...getRiskEvaluationState(risk.id, risk),
                                      newProbability: value,
                                    }
                                  }))}
                                  min={1}
                                  max={5}
                                  step={1}
                                  data-testid={`slider-probability-${risk.id}`}
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>1 - Muy Baja</span>
                                  <span>5 - Muy Alta</span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>Nuevo Impacto: {riskState.newImpact}</Label>
                                <Slider
                                  value={[riskState.newImpact]}
                                  onValueChange={([value]) => setRiskEvaluationState(prev => ({
                                    ...prev,
                                    [risk.id]: {
                                      ...getRiskEvaluationState(risk.id, risk),
                                      newImpact: value,
                                    }
                                  }))}
                                  min={1}
                                  max={5}
                                  step={1}
                                  data-testid={`slider-impact-${risk.id}`}
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>1 - Muy Bajo</span>
                                  <span>5 - Muy Alto</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Antes:</span>{' '}
                                <Badge variant="outline">
                                  P:{risk.probability} × I:{risk.impact} = {risk.inherentRisk}
                                </Badge>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Después:</span>{' '}
                                <Badge variant="default">
                                  P:{riskState.newProbability} × I:{riskState.newImpact} = {riskState.newProbability * riskState.newImpact}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor={`justification-${risk.id}`}>
                            Justificación Profesional <span className="text-red-500">*</span>
                          </Label>
                          <Textarea
                            id={`justification-${risk.id}`}
                            placeholder="Explique el razonamiento detrás de su evaluación..."
                            value={riskState.justification}
                            onChange={(e) => setRiskEvaluationState(prev => ({
                              ...prev,
                              [risk.id]: {
                                ...getRiskEvaluationState(risk.id, risk),
                                justification: e.target.value,
                              }
                            }))}
                            rows={3}
                            data-testid={`textarea-justification-${risk.id}`}
                          />
                        </div>

                        <Button
                          onClick={() => handleSaveRiskEvaluation(risk)}
                          disabled={createRiskEvaluation.isPending || updateRiskEvaluation.isPending}
                          data-testid={`button-save-risk-${risk.id}`}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Guardar Evaluación de Riesgo
                        </Button>
                      </div>

                      {/* Controls Re-evaluation Section */}
                      {riskControls.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="font-medium text-sm flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Controles Asociados ({riskControls.length})
                          </h4>

                          {riskControls.map(({ control }) => {
                            const controlState = getControlEvaluationState(control.id);
                            const hasControlEval = data?.controlEvaluations.find(e => e.controlId === control.id);

                            return (
                              <div key={control.id} className="border rounded-lg p-4 space-y-4 bg-green-50/50 dark:bg-green-950/20">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-medium">{control.code}: {control.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      Efectividad Actual: {control.effectiveness}% | Tipo: {control.type}
                                    </p>
                                  </div>
                                  {hasControlEval && (
                                    <Badge variant="outline" className="bg-green-50">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Evaluado
                                    </Badge>
                                  )}
                                </div>

                                <div className="space-y-2">
                                  <Label>Efectividad de Diseño</Label>
                                  <RadioGroup
                                    value={controlState.designEffectiveness}
                                    onValueChange={(value) => setControlEvaluationState(prev => ({
                                      ...prev,
                                      [control.id]: {
                                        ...getControlEvaluationState(control.id),
                                        designEffectiveness: value,
                                      }
                                    }))}
                                    data-testid={`radio-effectiveness-${control.id}`}
                                  >
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="effective" id={`effective-${control.id}`} />
                                      <Label htmlFor={`effective-${control.id}`} className="font-normal cursor-pointer">
                                        Efectivo (Mantener efectividad actual: {control.effectiveness}%)
                                      </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="partially_effective" id={`partial-${control.id}`} />
                                      <Label htmlFor={`partial-${control.id}`} className="font-normal cursor-pointer">
                                        Parcialmente Efectivo
                                      </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="ineffective" id={`ineffective-${control.id}`} />
                                      <Label htmlFor={`ineffective-${control.id}`} className="font-normal cursor-pointer">
                                        No Efectivo (Efectividad = 0%)
                                      </Label>
                                    </div>
                                  </RadioGroup>
                                </div>

                                {controlState.designEffectiveness === 'ineffective' && (
                                  <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription>
                                      Este control será marcado con efectividad de 0%, lo que aumentará significativamente el riesgo residual.
                                    </AlertDescription>
                                  </Alert>
                                )}

                                <div className="space-y-2">
                                  <Label htmlFor={`control-justification-${control.id}`}>
                                    Justificación Profesional <span className="text-red-500">*</span>
                                  </Label>
                                  <Textarea
                                    id={`control-justification-${control.id}`}
                                    placeholder="Explique la evaluación del control..."
                                    value={controlState.justification}
                                    onChange={(e) => setControlEvaluationState(prev => ({
                                      ...prev,
                                      [control.id]: {
                                        ...getControlEvaluationState(control.id),
                                        justification: e.target.value,
                                      }
                                    }))}
                                    rows={2}
                                    data-testid={`textarea-control-justification-${control.id}`}
                                  />
                                </div>

                                <Button
                                  onClick={() => handleSaveControlEvaluation(control, risk.id)}
                                  disabled={updateControlEvaluation.isPending}
                                  size="sm"
                                  data-testid={`button-save-control-${control.id}`}
                                >
                                  <Save className="h-4 w-4 mr-2" />
                                  Guardar Evaluación de Control
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      )}
            </TabsContent>

            <TabsContent value="adhoc" className="space-y-4 mt-4">
              <Alert data-testid="alert-adhoc-info">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Los riesgos ad-hoc son riesgos identificados específicamente durante esta auditoría que no forman parte del universo de riesgos de la organización.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-accent/50 rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Riesgos Ad-hoc</p>
                  <p className="text-2xl font-bold" data-testid="text-adhoc-count">{adHocRisks?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Identificados</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Evaluados</p>
                  <p className="text-2xl font-bold" data-testid="text-adhoc-assessed">
                    {adHocRisks?.filter(r => r.status === 'assessed').length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Con evaluación completa</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Mitigados</p>
                  <p className="text-2xl font-bold text-green-600" data-testid="text-adhoc-mitigated">
                    {adHocRisks?.filter(r => r.status === 'mitigated' || r.status === 'closed').length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Gestionados</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleOpenAdHocDialog()} data-testid="button-add-adhoc-risk">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Riesgo Ad-hoc
                </Button>
                <AuditRiskForm
                  auditId={audit.id}
                  auditRisk={editingAdHocRisk || undefined}
                  open={isAdHocDialogOpen}
                  onOpenChange={setIsAdHocDialogOpen}
                  onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/audits", audit.id, "ad-hoc-risks"] });
                    setIsAdHocDialogOpen(false);
                    setEditingAdHocRisk(null);
                  }}
                />
              </div>

              {adHocLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : adHocRisks && adHocRisks.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Riesgos Ad-hoc de esta Auditoría</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="multiple" className="w-full">
                      {adHocRisks.map((risk) => (
                        <AccordionItem key={risk.id} value={risk.id} data-testid={`accordion-adhoc-risk-${risk.id}`}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3 w-full">
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                              <div className="flex-1 text-left">
                                <p className="font-medium">{risk.code}: {risk.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  Probabilidad: {risk.probability} | Impacto: {risk.impact} | Inherente: {risk.inherentRisk}
                                </p>
                              </div>
                              <Badge variant={
                                risk.status === 'closed' ? 'default' :
                                risk.status === 'mitigated' ? 'outline' :
                                risk.status === 'assessed' ? 'secondary' : 'destructive'
                              }>
                                {risk.status === 'identified' ? 'Identificado' :
                                 risk.status === 'assessed' ? 'Evaluado' :
                                 risk.status === 'mitigated' ? 'Mitigado' : 'Cerrado'}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4 pt-4">
                            <div className="border rounded-lg p-4 space-y-4 bg-orange-50/50 dark:bg-orange-950/20">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium">Descripción</Label>
                                  <p className="text-sm text-muted-foreground mt-1">{risk.description || 'Sin descripción'}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">Fuente</Label>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {risk.source === 'audit_fieldwork' ? 'Trabajo de campo' :
                                     risk.source === 'stakeholder_interview' ? 'Entrevista' :
                                     risk.source === 'document_review' ? 'Revisión de documentos' : 'Observación de proceso'}
                                  </p>
                                </div>
                              </div>

                              {risk.potentialImpact && (
                                <div>
                                  <Label className="text-sm font-medium">Impacto Potencial</Label>
                                  <p className="text-sm text-muted-foreground mt-1">{risk.potentialImpact}</p>
                                </div>
                              )}

                              {risk.recommendedControls && (
                                <div>
                                  <Label className="text-sm font-medium">Controles Recomendados</Label>
                                  <p className="text-sm text-muted-foreground mt-1">{risk.recommendedControls}</p>
                                </div>
                              )}

                              <div className="flex gap-2 pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenAdHocDialog(risk)}
                                  data-testid={`button-edit-adhoc-${risk.id}`}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteAdHocRisk(risk.id)}
                                  data-testid={`button-delete-adhoc-${risk.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </Button>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              ) : (
                <Alert data-testid="alert-no-adhoc">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    No hay riesgos ad-hoc identificados en esta auditoría. Use el botón "Agregar Riesgo Ad-hoc" para comenzar.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
