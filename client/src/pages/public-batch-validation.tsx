import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, FileText, CheckSquare } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ActionPlanDetail {
  id: string;
  code: string;
  name: string;
  description: string | null;
  dueDate: string | null;
  responsible: string | null;
  validationStatus: string | null;
  risk: { id: string; code: string; name: string } | null;
}

interface ControlDetail {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: string;
  automationLevel: string | null;
  validationStatus: string | null;
}

interface RiskDetail {
  id: string;
  riskId: string;
  code: string;
  name: string;
  description: string | null;
  inherentRisk: number;
  processName: string | null;
  validationStatus: string | null;
}

interface BatchValidationResponse {
  success: boolean;
  type: string;
  responsibleEmail: string;
  expiresAt: string;
  plans?: ActionPlanDetail[];
  controls?: ControlDetail[];
  risks?: RiskDetail[];
  validationData: any;
  error?: string;
}

interface ValidationItem {
  entityId: string;
  action: 'validated' | 'observed' | 'rejected';
  comments?: string;
}

interface SubmitResponse {
  success: boolean;
  message?: string;
  results: Array<{
    entityId: string;
    success: boolean;
    action?: string;
    newStatus?: string;
    error?: string;
  }>;
  totalProcessed: number;
  totalRequested: number;
  error?: string;
}

export default function PublicBatchValidation() {
  const [, params] = useRoute("/public/batch-validation/:token");
  const token = params?.token || "";
  
  const [generalComments, setGeneralComments] = useState("");
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(new Set());
  const [planActions, setPlanActions] = useState<Map<string, 'validated' | 'observed' | 'rejected'>>(new Map());
  const [planComments, setPlanComments] = useState<Map<string, string>>(new Map());
  const [submitted, setSubmitted] = useState(false);
  
  // Fetch batch validation data
  const { data, isLoading, error } = useQuery<BatchValidationResponse>({
    queryKey: ["/api/public/batch-validation", token],
    enabled: !!token && !submitted,
    retry: false
  });
  
  // Submit batch validation
  const submitMutation = useMutation<SubmitResponse, Error, { validations: ValidationItem[]; generalComments: string }>({
    mutationFn: async ({ validations, generalComments }) => {
      const response = await fetch(`/api/public/batch-validation/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ validations, generalComments }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al procesar las validaciones");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    }
  });
  
  const handleSelectPlan = (planId: string, checked: boolean) => {
    const newSet = new Set(selectedPlanIds);
    if (checked) {
      newSet.add(planId);
    } else {
      newSet.delete(planId);
    }
    setSelectedPlanIds(newSet);
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const entities = data?.type === 'control' 
        ? (data.controls || []) 
        : data?.type === 'risk' 
          ? (data.risks || [])
          : (data?.plans || []);
      setSelectedPlanIds(new Set(entities.map(e => e.id)));
    } else {
      setSelectedPlanIds(new Set());
    }
  };
  
  const handleActionChange = (planId: string, action: 'validated' | 'observed' | 'rejected') => {
    const newMap = new Map(planActions);
    newMap.set(planId, action);
    setPlanActions(newMap);
  };
  
  const handleCommentChange = (planId: string, comment: string) => {
    const newMap = new Map(planComments);
    newMap.set(planId, comment);
    setPlanComments(newMap);
  };
  
  const handleBulkAction = (action: 'validated' | 'observed' | 'rejected') => {
    const newMap = new Map(planActions);
    selectedPlanIds.forEach(id => {
      newMap.set(id, action);
    });
    setPlanActions(newMap);
  };
  
  const handleSubmit = () => {
    const entities = data?.type === 'control' 
      ? (data.controls || []) 
      : data?.type === 'risk' 
        ? (data.risks || [])
        : (data?.plans || []);
    
    if (entities.length === 0) return;
    
    const validations: ValidationItem[] = [];
    
    // Only submit entities that have an action selected
    entities.forEach((entity: any) => {
      const action = planActions.get(entity.id);
      if (action) {
        validations.push({
          entityId: entity.id,
          action,
          comments: planComments.get(entity.id) || undefined
        });
      }
    });
    
    if (validations.length === 0) {
      const entityName = data?.type === 'control' ? 'control' : data?.type === 'risk' ? 'riesgo' : 'plan';
      alert(`Por favor seleccione una acción para al menos un ${entityName}`);
      return;
    }
    
    submitMutation.mutate({ validations, generalComments });
  };
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Sin fecha límite';
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const getActionColor = (action: string) => {
    switch (action) {
      case 'validated':
        return 'text-green-600 bg-green-50';
      case 'observed':
        return 'text-orange-600 bg-orange-50';
      case 'rejected':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };
  
  const getActionLabel = (action: string) => {
    switch (action) {
      case 'validated':
        return 'Aprobar';
      case 'observed':
        return 'Observar';
      case 'rejected':
        return 'Rechazar';
      default:
        return action;
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-6xl">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Cargando información...</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Error state
  if (error || (data && !data.success)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-6xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-6 w-6" />
              Error de Validación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                {data?.error || error?.message || "No se pudo cargar la información de validación"}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Success state (after submission)
  if (submitted && submitMutation.data) {
    const results = submitMutation.data.results;
    const successCount = results.filter(r => r.success).length;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-6xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
              Validación Completada
            </CardTitle>
            <CardDescription>
              Se procesaron exitosamente {successCount} de {results.length} validaciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {submitMutation.data.message}
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              {results.map((result) => {
                const entityList = data?.type === 'control' 
                  ? (data.controls || []) 
                  : data?.type === 'risk'
                    ? (data.risks || [])
                    : (data?.plans || []);
                const entity = entityList.find((e: any) => e.id === result.entityId);
                return (
                  <div 
                    key={result.entityId} 
                    className={`p-3 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{entity?.code} - {entity?.name}</span>
                      {result.success ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getActionColor(result.action || '')}`}>
                          {getActionLabel(result.action || '')}
                        </span>
                      ) : (
                        <span className="text-red-600 text-sm">{result.error}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-6 text-center text-muted-foreground text-sm">
              Puede cerrar esta ventana de forma segura.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Main validation form
  const entities = data?.type === 'control' 
    ? (data.controls || []) 
    : data?.type === 'risk' 
      ? (data.risks || [])
      : (data?.plans || []);
  const entityType = data?.type === 'control' ? 'control' : data?.type === 'risk' ? 'risk' : 'action_plan';
  
  if (entities.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-6xl">
          <CardHeader>
            <CardTitle>No hay {entityType === 'control' ? 'controles' : entityType === 'risk' ? 'riesgos' : 'planes'} para validar</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                No se encontraron {entityType === 'control' ? 'controles' : entityType === 'risk' ? 'riesgos' : 'planes de acción'} para validar en este lote.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const allSelected = entities.length > 0 && selectedPlanIds.size === entities.length;
  const someSelected = selectedPlanIds.size > 0;
  const plansWithActions = Array.from(planActions.keys()).length;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 py-8">
      <Card className="w-full max-w-7xl mx-auto">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <CheckSquare className="h-7 w-7 text-primary" />
            {entityType === 'control' ? 'Validación de Controles' : entityType === 'risk' ? 'Validación de Riesgos' : 'Validación de Planes de Acción'}
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Se requiere su validación para <strong>{entities.length}</strong> {
              entityType === 'control' 
                ? `control${entities.length > 1 ? 'es' : ''}` 
                : entityType === 'risk'
                  ? `riesgo${entities.length > 1 ? 's' : ''}`
                  : `plan${entities.length > 1 ? 'es' : ''} de acción`
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          {/* Bulk Actions */}
          <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/50 rounded-lg border">
            <Checkbox
              checked={allSelected}
              onCheckedChange={handleSelectAll}
              data-testid="checkbox-select-all"
            />
            <span className="text-sm font-medium">
              {allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </span>
            <div className="flex-1" />
            {someSelected && (
              <>
                <span className="text-sm text-muted-foreground">
                  {selectedPlanIds.size} seleccionado{selectedPlanIds.size > 1 ? 's' : ''}:
                </span>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleBulkAction('validated')}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-bulk-approve"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Aprobar
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleBulkAction('observed')}
                  className="bg-orange-600 hover:bg-orange-700"
                  data-testid="button-bulk-observe"
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Observar
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleBulkAction('rejected')}
                  className="bg-red-600 hover:bg-red-700"
                  data-testid="button-bulk-reject"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Rechazar
                </Button>
              </>
            )}
          </div>
          
          {/* Entities Table */}
          <div className="border rounded-lg overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="min-w-[100px]">Código</TableHead>
                  <TableHead className="min-w-[200px]">
                    {entityType === 'control' ? 'Control' : entityType === 'risk' ? 'Riesgo' : 'Plan'}
                  </TableHead>
                  {entityType === 'control' ? (
                    <TableHead className="min-w-[120px]">Tipo</TableHead>
                  ) : entityType === 'risk' ? (
                    <>
                      <TableHead className="min-w-[150px]">Proceso</TableHead>
                      <TableHead className="min-w-[100px]">Nivel</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="min-w-[150px]">Riesgo Asociado</TableHead>
                      <TableHead className="min-w-[120px]">Fecha Límite</TableHead>
                    </>
                  )}
                  <TableHead className="min-w-[180px]">Acción</TableHead>
                  <TableHead className="min-w-[200px]">Comentarios</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entities.map((entity: any) => {
                  const isSelected = selectedPlanIds.has(entity.id);
                  const currentAction = planActions.get(entity.id);
                  
                  const getControlTypeText = (type: string) => {
                    const typeMap: Record<string, string> = {
                      'preventive': 'Preventivo',
                      'detective': 'Detectivo',
                      'corrective': 'Correctivo',
                    };
                    return typeMap[type] || type;
                  };
                  
                  const getRiskLevelText = (inherentRisk: number) => {
                    if (inherentRisk >= 15) return { text: 'Crítico', color: '#dc2626' };
                    if (inherentRisk >= 10) return { text: 'Alto', color: '#ea580c' };
                    if (inherentRisk >= 6) return { text: 'Medio', color: '#f59e0b' };
                    return { text: 'Bajo', color: '#10b981' };
                  };
                  
                  return (
                    <TableRow 
                      key={entity.id}
                      className={isSelected ? 'bg-blue-50/50' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectPlan(entity.id, checked as boolean)}
                          data-testid={`checkbox-${entityType}-${entity.code}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {entity.code}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900">
                            {entity.name}
                          </div>
                          {entity.description && (
                            <div className="text-sm text-muted-foreground">
                              {entity.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      {entityType === 'control' ? (
                        <TableCell className="text-sm">
                          {getControlTypeText(entity.type)}
                        </TableCell>
                      ) : entityType === 'risk' ? (
                        <>
                          <TableCell className="text-sm">
                            {entity.processName || '-'}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const riskLevel = getRiskLevelText(entity.inherentRisk);
                              return (
                                <span 
                                  style={{ 
                                    backgroundColor: `${riskLevel.color}20`, 
                                    color: riskLevel.color 
                                  }}
                                  className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                                >
                                  {riskLevel.text}
                                </span>
                              );
                            })()}
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>
                            {entity.risk ? (
                              <span className="text-sm">
                                {entity.risk.code} - {entity.risk.name}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(entity.dueDate)}
                          </TableCell>
                        </>
                      )}
                      <TableCell>
                        <RadioGroup
                          value={currentAction}
                          onValueChange={(value) => handleActionChange(entity.id, value as 'validated' | 'observed' | 'rejected')}
                          className="flex gap-2"
                        >
                          <div className="flex items-center space-x-1">
                            <RadioGroupItem value="validated" id={`${entity.id}-validated`} data-testid={`radio-${entity.code}-approve`} />
                            <Label htmlFor={`${entity.id}-validated`} className="text-xs cursor-pointer text-green-600">
                              Aprobar
                            </Label>
                          </div>
                          <div className="flex items-center space-x-1">
                            <RadioGroupItem value="observed" id={`${entity.id}-observed`} data-testid={`radio-${entity.code}-observe`} />
                            <Label htmlFor={`${entity.id}-observed`} className="text-xs cursor-pointer text-orange-600">
                              Observar
                            </Label>
                          </div>
                          <div className="flex items-center space-x-1">
                            <RadioGroupItem value="rejected" id={`${entity.id}-rejected`} data-testid={`radio-${entity.code}-reject`} />
                            <Label htmlFor={`${entity.id}-rejected`} className="text-xs cursor-pointer text-red-600">
                              Rechazar
                            </Label>
                          </div>
                        </RadioGroup>
                      </TableCell>
                      <TableCell>
                        <Textarea
                          value={planComments.get(entity.id) || ''}
                          onChange={(e) => handleCommentChange(entity.id, e.target.value)}
                          placeholder="Comentarios específicos..."
                          className="min-h-[60px] text-sm"
                          data-testid={`textarea-${entity.code}-comments`}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          
          {/* General Comments */}
          <div className="space-y-2">
            <Label htmlFor="general-comments" className="text-base font-semibold">
              Comentarios Generales (Opcional)
            </Label>
            <Textarea
              id="general-comments"
              value={generalComments}
              onChange={(e) => setGeneralComments(e.target.value)}
              placeholder={`Ingrese comentarios generales que apliquen a ${entityType === 'control' ? 'todos los controles' : entityType === 'risk' ? 'todos los riesgos' : 'todos los planes'}...`}
              className="min-h-[100px]"
              data-testid="textarea-general-comments"
            />
            <p className="text-xs text-muted-foreground">
              Los comentarios generales se aplicarán a {entityType === 'control' ? 'todos los controles' : entityType === 'risk' ? 'todos los riesgos' : 'todos los planes'} que no tengan comentarios específicos.
            </p>
          </div>
          
          {/* Summary */}
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-1">Resumen de Validación:</div>
              <ul className="text-sm space-y-1">
                <li>• Total de {entityType === 'control' ? 'controles' : entityType === 'risk' ? 'riesgos' : 'planes'}: <strong>{entities.length}</strong></li>
                <li>• {entityType === 'control' ? 'Controles' : entityType === 'risk' ? 'Riesgos' : 'Planes'} con acción asignada: <strong>{plansWithActions}</strong></li>
                <li>• {entityType === 'control' ? 'Controles' : entityType === 'risk' ? 'Riesgos' : 'Planes'} sin validar: <strong>{entities.length - plansWithActions}</strong></li>
              </ul>
              {plansWithActions < entities.length && (
                <p className="text-xs text-orange-600 mt-2">
                  ⚠ Solo se enviarán {entityType === 'control' ? 'los controles' : entityType === 'risk' ? 'los riesgos' : 'los planes'} que tengan una acción asignada (Aprobar/Observar/Rechazar)
                </p>
              )}
            </AlertDescription>
          </Alert>
          
          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              onClick={handleSubmit}
              disabled={submitMutation.isPending || plansWithActions === 0}
              size="lg"
              className="min-w-[200px]"
              data-testid="button-submit-validations"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Enviar Validaciones ({plansWithActions})
                </>
              )}
            </Button>
          </div>
          
          {submitMutation.isError && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {submitMutation.error.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
