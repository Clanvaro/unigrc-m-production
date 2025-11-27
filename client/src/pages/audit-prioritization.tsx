import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { ArrowUpDown, Calculator, BarChart3, Target, Filter, Download, Settings, Edit, Check, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { queryClient } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { useToast } from "@/hooks/use-toast";
import type { 
  AuditPlan, 
  AuditPrioritizationFactors, 
  AuditUniverseWithDetails
} from "@shared/schema";

interface PrioritizationWithDetails extends AuditPrioritizationFactors {
  universe: AuditUniverseWithDetails;
}

function EditableStrategicPriority({ 
  item, 
  onUpdate 
}: { 
  item: PrioritizationWithDetails;
  onUpdate: (value: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.strategicPriority.toString());
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async (newValue: number) => {
      const response = await fetch(`/api/audit-prioritization/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategicPriority: newValue })
      });
      if (!response.ok) throw new Error('Failed to update');
      return response.json();
    },
    onSuccess: (data) => {
      onUpdate(data.strategicPriority);
      setIsEditing(false);
      toast({ title: "Prioridad estratégica actualizada" });
    },
    onError: () => {
      toast({ title: "Error al actualizar", variant: "destructive" });
      setEditValue(item.strategicPriority.toString());
    }
  });

  const handleSave = () => {
    const newValue = parseInt(editValue);
    if (newValue >= 1 && newValue <= 3) {
      updateMutation.mutate(newValue);
    } else {
      toast({ title: "Valor debe estar entre 1 y 3", variant: "destructive" });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(item.strategicPriority.toString());
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min="1"
            max="3"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-16 h-6 text-center text-xs"
            disabled={updateMutation.isPending}
            autoFocus
          />
          <span className="text-xs text-muted-foreground">/3</span>
        </div>
        <div className="flex gap-1 justify-center">
          <Button
            size="sm"
            variant="ghost"
            className="h-4 w-4 p-0"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            <Check className="h-3 w-3 text-green-600" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-4 w-4 p-0"
            onClick={() => {
              setEditValue(item.strategicPriority.toString());
              setIsEditing(false);
            }}
            disabled={updateMutation.isPending}
          >
            <X className="h-3 w-3 text-red-600" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div 
        className="font-medium cursor-pointer hover:bg-muted rounded p-1 flex items-center justify-center gap-1"
        onClick={() => setIsEditing(true)}
        title="Clic para editar"
      >
        <span>{item.strategicPriority}/3</span>
        <Edit className="h-3 w-3 opacity-50" />
      </div>
      <Progress value={(item.strategicPriority / 3) * 100} className="w-16 h-2" />
    </div>
  );
}

function EditablePreviousAuditResult({ 
  item, 
  onUpdate 
}: { 
  item: PrioritizationWithDetails;
  onUpdate: (value: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.previousAuditResult || "ninguna");
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async (newValue: string) => {
      const response = await fetch(`/api/audit-prioritization/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previousAuditResult: newValue })
      });
      if (!response.ok) throw new Error('Failed to update');
      return response.json();
    },
    onSuccess: (data) => {
      onUpdate(data.previousAuditResult);
      setIsEditing(false);
      toast({ title: "Resultado de auditoría anterior actualizado" });
    },
    onError: () => {
      toast({ title: "Error al actualizar", variant: "destructive" });
      setEditValue(item.previousAuditResult || "ninguna");
    }
  });

  const handleSave = () => {
    updateMutation.mutate(editValue);
  };

  const handleCancel = () => {
    setEditValue(item.previousAuditResult || "ninguna");
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Select value={editValue} onValueChange={setEditValue}>
          <SelectTrigger className="w-24 h-6 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ninguna">Ninguna</SelectItem>
            <SelectItem value="buena">Buena</SelectItem>
            <SelectItem value="regular">Regular</SelectItem>
            <SelectItem value="mala">Mala</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="ghost"
          className="h-4 w-4 p-0"
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          <Check className="h-3 w-3 text-green-600" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-4 w-4 p-0"
          onClick={handleCancel}
          disabled={updateMutation.isPending}
        >
          <X className="h-3 w-3 text-red-600" />
        </Button>
      </div>
    );
  }

  return (
    <div 
      className="cursor-pointer flex items-center gap-1 group"
      onClick={() => setIsEditing(true)}
    >
      <Badge 
        className={
          item.previousAuditResult === "mala" ? "bg-red-100 text-red-800" :
          item.previousAuditResult === "regular" ? "bg-yellow-100 text-yellow-800" :
          item.previousAuditResult === "buena" ? "bg-green-100 text-green-800" :
          "bg-gray-100 text-gray-800"
        }
      >
        {item.previousAuditResult === "buena" ? "Buena" :
         item.previousAuditResult === "regular" ? "Regular" :
         item.previousAuditResult === "mala" ? "Mala" : "Ninguna"}
      </Badge>
      <Edit className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

function EditableBooleanField({ 
  item, 
  fieldName,
  onUpdate 
}: { 
  item: PrioritizationWithDetails;
  fieldName: 'fraudHistory' | 'regulatoryRequirement' | 'managementRequest';
  onUpdate: (value: boolean) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  
  const currentValue = item[fieldName];
  
  const getVariant = () => {
    if (fieldName === 'fraudHistory') return currentValue ? "destructive" : "secondary";
    if (fieldName === 'regulatoryRequirement') return currentValue ? "secondary" : "outline";
    return currentValue ? "default" : "outline";
  };

  const updateMutation = useMutation({
    mutationFn: async (newValue: boolean) => {
      const response = await fetch(`/api/audit-prioritization/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [fieldName]: newValue })
      });
      if (!response.ok) throw new Error('Failed to update');
      return response.json();
    },
    onSuccess: (data) => {
      onUpdate(data[fieldName]);
      setIsEditing(false);
      toast({ title: "Campo actualizado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al actualizar", variant: "destructive" });
    }
  });

  const handleToggle = () => {
    const newValue = !currentValue;
    updateMutation.mutate(newValue);
  };

  if (isEditing) {
    return (
      <div className="flex gap-1 justify-center">
        <Button
          size="sm"
          variant={currentValue ? "default" : "outline"}
          className="h-6 px-2 text-xs"
          onClick={() => !currentValue && handleToggle()}
          disabled={updateMutation.isPending || currentValue}
        >
          Sí
        </Button>
        <Button
          size="sm"
          variant={!currentValue ? "default" : "outline"}
          className="h-6 px-2 text-xs"
          onClick={() => currentValue && handleToggle()}
          disabled={updateMutation.isPending || !currentValue}
        >
          No
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={() => setIsEditing(false)}
          disabled={updateMutation.isPending}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <Badge 
      variant={getVariant()}
      className="cursor-pointer hover:opacity-80 select-none"
      onClick={() => setIsEditing(true)}
      title="Clic para editar"
    >
      <span className="flex items-center gap-1">
        {currentValue ? "Sí" : "No"}
        <Edit className="h-2 w-2 opacity-50" />
      </span>
    </Badge>
  );
}

function PriorityScoreCard({ item }: { item: PrioritizationWithDetails }) {
  const scoreColor = item.totalPriorityScore >= 80 ? "text-red-600" :  // Crítico
                    item.totalPriorityScore >= 60 ? "text-orange-500" : // Alto
                    item.totalPriorityScore >= 40 ? "text-yellow-600" : // Medio
                    "text-green-600"; // Bajo

  const riskLevel = item.riskScore >= 80 ? "Alto" :
                   item.riskScore >= 60 ? "Medio-Alto" :
                   item.riskScore >= 40 ? "Medio" :
                   "Bajo";

  const riskColor = item.riskScore >= 80 ? "bg-red-100 text-red-800" :
                   item.riskScore >= 60 ? "bg-orange-100 text-orange-800" :
                   item.riskScore >= 40 ? "bg-yellow-100 text-yellow-800" :
                   "bg-green-100 text-green-800";

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{item.universe.auditableEntity}</CardTitle>
            <CardDescription>
              {item.universe.macroproceso.name} 
              {item.universe.process && ` > ${item.universe.process.name}`}
            </CardDescription>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {item.universe.entityType === 'subproceso' ? 'Subproceso' : 'Proceso'}
              </Badge>
              <Badge className={riskColor}>
                Riesgo: {riskLevel}
              </Badge>
              {item.universe.mandatoryAudit && (
                <Badge variant="secondary">Obligatorio</Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${scoreColor}`}>
              {item.totalPriorityScore}
            </div>
            <div className="text-sm text-muted-foreground">
              Ranking: #{item.calculatedRanking}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="flex justify-between">
              <span>Riesgo Residual:</span>
              <span className="font-medium">{item.riskScore}/100</span>
            </div>
            <Progress value={item.riskScore} className="h-2 mt-1" />
          </div>
          <div>
            <div className="flex justify-between">
              <span>Auditoría Anterior:</span>
              <span className="font-medium">
                {item.previousAuditResult === "buena" ? "Buena" :
                 item.previousAuditResult === "regular" ? "Regular" :
                 item.previousAuditResult === "mala" ? "Mala" : "Ninguna"}
              </span>
            </div>
          </div>
          <div>
            <div className="flex justify-between">
              <span>Prioridad Estratégica:</span>
              <span className="font-medium">{item.strategicPriority}/3</span>
            </div>
            <Progress value={(item.strategicPriority / 3) * 100} className="h-2 mt-1" />
          </div>
          <div>
            <div className="flex justify-between">
              <span>Indicadores:</span>
              <div className="flex gap-1">
                {item.fraudHistory && <Badge variant="destructive" className="text-xs">Fraude</Badge>}
                {item.regulatoryRequirement && <Badge variant="secondary" className="text-xs">Legal</Badge>}
                {item.managementRequest && <Badge variant="default" className="text-xs">Directorio</Badge>}
              </div>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            <span>Tiempo desde última auditoría: </span>
            <span className="font-medium">{item.timesSinceLastAudit} años</span>
          </div>
          <div>
            <span>Duración estimada: </span>
            <span className="font-medium">{item.estimatedAuditHours}h</span>
          </div>
        </div>
        
        {item.previousAuditRating && (
          <div className="text-sm">
            <span className="text-muted-foreground">Calificación auditoría anterior: </span>
            <span className="font-medium">{item.previousAuditRating}/100</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


export default function AuditPrioritizationPage() {
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [sortBy, setSortBy] = useState<"score" | "ranking" | "risk">("ranking");
  const [selectedProcesses, setSelectedProcesses] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const search = useSearch();

  // Leer planId de los parámetros de URL
  useEffect(() => {
    const urlParams = new URLSearchParams(search);
    const planId = urlParams.get('planId');
    if (planId && planId !== selectedPlan) {
      setSelectedPlan(planId);
    }
  }, [search, selectedPlan]);

  const { data: plans = [] } = useQuery<AuditPlan[]>({
    queryKey: ["/api/audit-plans"],
  });

  const { data: allPrioritization = [], isLoading } = useQuery<PrioritizationWithDetails[]>({
    queryKey: queryKeys.auditPlans.prioritization(selectedPlan),
    enabled: !!selectedPlan,
  });

  // Filtrar solo procesos y subprocesos para priorización (no macroprocesos solos)
  const prioritization = allPrioritization.filter(item => 
    item.universe.entityType === 'process' || item.universe.entityType === 'subproceso'
  );

  const calculateAllMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await fetch(`/api/audit-plans/${planId}/calculate-all-priorities`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to calculate priorities");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auditPlans.prioritization(selectedPlan) });
      toast({ title: "Prioridades recalculadas exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al recalcular prioridades", variant: "destructive" });
    },
  });

  // Funciones para manejar selección
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = prioritization.map(item => item.id);
      setSelectedProcesses(new Set(allIds));
    } else {
      setSelectedProcesses(new Set());
    }
  };

  const handleSelectProcess = (processId: string, checked: boolean) => {
    const newSelected = new Set(selectedProcesses);
    if (checked) {
      newSelected.add(processId);
    } else {
      newSelected.delete(processId);
    }
    setSelectedProcesses(newSelected);
  };

  const isAllSelected = prioritization.length > 0 && selectedProcesses.size === prioritization.length;
  const isPartiallySelected = selectedProcesses.size > 0 && selectedProcesses.size < prioritization.length;

  // Mutación para crear elementos del plan de auditoría
  const createPlanItemsMutation = useMutation({
    mutationFn: async (selectedIds: string[]) => {
      const planItemsToCreate = [];
      
      for (const id of selectedIds) {
        const prioritizationItem = prioritization.find(item => item.id === id);
        if (!prioritizationItem) continue;

        const planItemData = {
          universeId: prioritizationItem.universeId,
          prioritizationId: prioritizationItem.id,
          status: "selected" as const,
          selectionReason: "Seleccionado por priorización de riesgos",
          estimatedDuration: prioritizationItem.estimatedAuditHours || 40,
          inclusionJustification: `Incluido en el plan anual por ranking de priorización #${prioritizationItem.calculatedRanking}`,
          proposedLeadAuditor: "user-1", // Usuario por defecto
          proposedTeamMembers: ["user-1"],
          createdBy: "user-1"
        };

        planItemsToCreate.push(planItemData);
      }

      // Crear todos los elementos del plan
      const createdPlanItems = [];
      for (const planItemData of planItemsToCreate) {
        const response = await fetch(`/api/audit-plans/${selectedPlan}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(planItemData),
        });
        if (!response.ok) throw new Error("Failed to create plan item");
        const planItem = await response.json();
        createdPlanItems.push(planItem);
      }

      return createdPlanItems;
    },
    onSuccess: (createdPlanItems) => {
      queryClient.invalidateQueries({ queryKey: ["/api/audit-plans", selectedPlan, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/audit-plans"] });
      setSelectedProcesses(new Set()); // Limpiar selección
      toast({ 
        title: `${createdPlanItems.length} elemento(s) agregado(s) al plan`,
        description: "Los elementos han sido incluidos en el plan anual de auditoría."
      });
    },
    onError: () => {
      toast({ 
        title: "Error al agregar elementos al plan", 
        variant: "destructive",
        description: "Hubo un problema al agregar los elementos al plan. Inténtalo de nuevo."
      });
    },
  });

  const sortedPrioritization = [...prioritization].sort((a, b) => {
    switch (sortBy) {
      case "score":
        return b.totalPriorityScore - a.totalPriorityScore;
      case "ranking":
        return a.calculatedRanking - b.calculatedRanking;
      case "risk":
        return b.riskScore - a.riskScore;
      default:
        return 0;
    }
  });

  if (!selectedPlan) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Priorización de Auditorías</h1>
          <p className="text-muted-foreground">
            Analiza y prioriza procesos auditables basado en factores de riesgo
          </p>
        </div>

        <Card>
          <CardContent className="p-8 text-center">
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-medium">Selecciona un Plan de Auditoría</h3>
                <p className="text-sm text-muted-foreground">
                  Elige un plan para ver y gestionar la priorización de entidades
                </p>
              </div>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger className="w-64 mx-auto" data-testid="select-audit-plan">
                  <SelectValue placeholder="Seleccionar plan..." />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} ({plan.year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activePlan = plans.find(p => p.id === selectedPlan);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Priorización de Auditorías</h1>
          <p className="text-muted-foreground">
            {activePlan?.name} - Año {activePlan?.year}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPlan} onValueChange={setSelectedPlan}>
            <SelectTrigger className="w-48" data-testid="select-audit-plan-header">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name} ({plan.year})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label>Ordenar por:</Label>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
            <SelectTrigger className="w-32" data-testid="select-sort-by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ranking">Ranking</SelectItem>
              <SelectItem value="score">Puntuación</SelectItem>
              <SelectItem value="risk">Riesgo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          onClick={() => calculateAllMutation.mutate(selectedPlan)}
          disabled={calculateAllMutation.isPending}
          data-testid="button-recalculate"
        >
          <Calculator className="h-4 w-4 mr-2" />
          {calculateAllMutation.isPending ? "Recalculando..." : "Recalcular Prioridades"}
        </Button>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
        {selectedProcesses.size > 0 && (
          <Button 
            variant="default"
            onClick={() => createPlanItemsMutation.mutate(Array.from(selectedProcesses))}
            disabled={createPlanItemsMutation.isPending}
            data-testid="button-add-to-plan"
          >
            <Plus className="h-4 w-4 mr-2" />
            {createPlanItemsMutation.isPending 
              ? `Agregando ${selectedProcesses.size} elemento(s)...` 
              : `Agregar ${selectedProcesses.size} al Plan`
            }
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center p-8">Cargando priorización...</div>
      ) : prioritization.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <Target className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-medium">No hay entidades priorizadas</h3>
                <p className="text-sm text-muted-foreground">
                  Agrega entidades auditables para comenzar la priorización
                </p>
              </div>
    
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="table" className="space-y-4">
          <TabsList>
            <TabsTrigger value="table">Tabla de Priorización</TabsTrigger>
            <TabsTrigger value="cards">Vista de Tarjetas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="table" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Mostrando {sortedPrioritization.length} procesos priorizados
            </div>
            
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted">
                        <TableHead className="w-12">
                          <Checkbox
                            checked={isAllSelected}
                            onCheckedChange={handleSelectAll}
                            aria-label="Seleccionar todos los procesos"
                            data-testid="checkbox-select-all"
                          />
                        </TableHead>
                        <TableHead className="text-left font-medium">Macro Proceso</TableHead>
                        <TableHead className="text-left font-medium">Proceso</TableHead>
                        <TableHead className="text-center font-medium">Riesgo Residual</TableHead>
                        <TableHead className="text-center font-medium">Resultado Auditoría Anterior</TableHead>
                        <TableHead className="text-center font-medium">Prioridad Estratégica</TableHead>
                        <TableHead className="text-center font-medium">Fraude</TableHead>
                        <TableHead className="text-center font-medium">Requerimiento Legal</TableHead>
                        <TableHead className="text-center font-medium">Solicitud Directorio</TableHead>
                        <TableHead className="text-center font-medium">Scoring Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedPrioritization.map((item) => (
                        <TableRow key={item.id} className="hover:bg-muted/50">
                          <TableCell className="w-12">
                            <Checkbox
                              checked={selectedProcesses.has(item.id)}
                              onCheckedChange={(checked) => handleSelectProcess(item.id, checked as boolean)}
                              aria-label={`Seleccionar ${item.universe.entityType === 'process' ? item.universe.process?.name : item.universe.subproceso?.name}`}
                              data-testid={`checkbox-process-${item.id}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="space-y-1">
                              <div className="font-medium">{item.universe.macroproceso.name}</div>
                              <Badge variant="outline" className="text-xs">
                                Macroproceso
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="space-y-1">
                              <div className="font-medium">
                                {item.universe.entityType === 'process' || item.universe.entityType === 'subproceso' 
                                  ? (item.universe.process?.name || item.universe.auditableEntity)
                                  : '-'
                                }
                              </div>
                              {(item.universe.entityType === 'process' || item.universe.entityType === 'subproceso') && (
                                <Badge variant="outline" className="text-xs">
                                  {item.universe.entityType === 'subproceso' ? 'Subproceso' : 'Proceso'}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="space-y-1">
                              <div className="font-medium">{item.riskScore}</div>
                              <Progress value={item.riskScore} className="w-16 h-2" />
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <EditablePreviousAuditResult 
                              item={item}
                              onUpdate={(newValue) => {
                                queryClient.setQueryData(
                                  [`/api/audit-plans/${selectedPlan}/prioritization`],
                                  (old: any) => old?.map((i: any) => 
                                    i.id === item.id ? { ...i, previousAuditResult: newValue } : i
                                  )
                                );
                                calculateAllMutation.mutate(selectedPlan);
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <EditableStrategicPriority 
                              item={item}
                              onUpdate={(newValue) => {
                                // Update the item optimistically
                                queryClient.setQueryData(
                                  [`/api/audit-plans/${selectedPlan}/prioritization`],
                                  (old: any) => old?.map((i: any) => 
                                    i.id === item.id ? { ...i, strategicPriority: newValue } : i
                                  )
                                );
                                // Trigger recalculation
                                calculateAllMutation.mutate(selectedPlan);
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <EditableBooleanField 
                              item={item}
                              fieldName="fraudHistory"
                              onUpdate={(newValue) => {
                                queryClient.setQueryData(
                                  [`/api/audit-plans/${selectedPlan}/prioritization`],
                                  (old: any) => old?.map((i: any) => 
                                    i.id === item.id ? { ...i, fraudHistory: newValue } : i
                                  )
                                );
                                calculateAllMutation.mutate(selectedPlan);
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <EditableBooleanField 
                              item={item}
                              fieldName="regulatoryRequirement"
                              onUpdate={(newValue) => {
                                queryClient.setQueryData(
                                  [`/api/audit-plans/${selectedPlan}/prioritization`],
                                  (old: any) => old?.map((i: any) => 
                                    i.id === item.id ? { ...i, regulatoryRequirement: newValue } : i
                                  )
                                );
                                calculateAllMutation.mutate(selectedPlan);
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <EditableBooleanField 
                              item={item}
                              fieldName="managementRequest"
                              onUpdate={(newValue) => {
                                queryClient.setQueryData(
                                  [`/api/audit-plans/${selectedPlan}/prioritization`],
                                  (old: any) => old?.map((i: any) => 
                                    i.id === item.id ? { ...i, managementRequest: newValue } : i
                                  )
                                );
                                calculateAllMutation.mutate(selectedPlan);
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="space-y-1">
                              <div className={`text-xl font-bold ${
                                item.totalPriorityScore >= 80 ? "text-red-600" :    // Crítico
                                item.totalPriorityScore >= 60 ? "text-orange-500" : // Alto  
                                item.totalPriorityScore >= 40 ? "text-yellow-600" : // Medio
                                "text-green-600"                                     // Bajo
                              }`}>
                                {item.totalPriorityScore}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Ranking #{item.calculatedRanking}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="cards" className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Mostrando {sortedPrioritization.length} procesos priorizados
            </div>
            <div className="grid gap-4">
              {sortedPrioritization.map((item) => (
                <PriorityScoreCard key={item.id} item={item} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}