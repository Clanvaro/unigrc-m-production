import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Calendar, BarChart3, Target, Settings, FileText, Users, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AuditPlan, AuditUniverseWithDetails, InsertAuditPlan } from "@shared/schema";

function AuditPlanCard({ plan }: { plan: AuditPlan }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/audit-plans/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete audit plan");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audit-plans"] });
      toast({ title: "Plan de auditoría eliminado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al eliminar el plan", variant: "destructive" });
    },
  });

  const statusColor = {
    draft: "bg-gray-100 text-gray-800",
    active: "bg-green-100 text-green-800",
    completed: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800"
  }[plan.status];

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{plan.name}</CardTitle>
            <CardDescription className="mt-1">
              Año fiscal: {plan.year} • Creado: {plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : 'N/A'}
            </CardDescription>
          </div>
          <Badge className={statusColor}>
            {plan.status === 'draft' && 'Borrador'}
            {plan.status === 'active' && 'Activo'}
            {plan.status === 'completed' && 'Completado'}
            {plan.status === 'cancelled' && 'Cancelado'}
          </Badge>
        </div>
        {plan.description && (
          <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Año {plan.year}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>Aprobado por: {plan.approvedBy || 'Pendiente'}</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1"
            onClick={() => setLocation(`/audit-prioritization?planId=${plan.id}`)}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Ver Priorización
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1"
            onClick={() => {
              // Simular clic en la pestaña "Plan Definitivo"
              const tabButton = document.querySelector('[data-testid="tab-items"]') as HTMLButtonElement;
              if (tabButton) {
                tabButton.click();
                // Configurar el plan seleccionado después de un breve delay
                setTimeout(() => {
                  const selectTrigger = document.querySelector('[data-value]') as HTMLElement;
                  // Esto se manejará automáticamente cuando el usuario seleccione el plan en la pestaña
                }, 100);
              }
            }}
          >
            <Target className="h-4 w-4 mr-2" />
            Ver Plan Definitivo
          </Button>
          <Button 
            size="sm" 
            variant="destructive" 
            onClick={() => deleteMutation.mutate(plan.id)}
            disabled={deleteMutation.isPending}
          >
            Eliminar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateAuditPlanDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<InsertAuditPlan>>({
    name: "",
    year: new Date().getFullYear(),
    description: "",
    status: "draft"
  });
  const { toast } = useToast();

  // Listen for header button clicks
  useEffect(() => {
    const handleOpenDialog = () => setOpen(true);
    window.addEventListener('openAuditPlanDialog', handleOpenDialog);
    return () => window.removeEventListener('openAuditPlanDialog', handleOpenDialog);
  }, []);

  const createMutation = useMutation({
    mutationFn: async (data: InsertAuditPlan) => {
      const response = await fetch("/api/audit-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create audit plan");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audit-plans"] });
      toast({ title: "Plan de auditoría creado exitosamente" });
      setOpen(false);
      setFormData({
        name: "",
        year: new Date().getFullYear(),
        description: "",
        status: "draft"
      });
    },
    onError: () => {
      toast({ title: "Error al crear el plan", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast({ title: "El nombre del plan es requerido", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData as InsertAuditPlan);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear Plan de Auditoría</DialogTitle>
          <DialogDescription>
            Crea un nuevo plan de auditoría para el año fiscal
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Plan *</Label>
            <Input
              id="name"
              data-testid="input-plan-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Plan de Auditoría 2025"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Año Fiscal</Label>
              <Input
                id="year"
                type="number"
                data-testid="input-fiscal-year"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                min="2020"
                max="2030"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as any })}
              >
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>


          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              data-testid="textarea-description"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción del plan de auditoría..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creando..." : "Crear Plan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AuditPlanItemsTab() {
  const [selectedPlan, setSelectedPlan] = useState("");
  const { toast } = useToast();
  
  const { data: plans = [] } = useQuery({
    queryKey: ["/api/audit-plans"],
  });

  const { data: planItems = [] } = useQuery({
    queryKey: ["/api/audit-plans", selectedPlan, "items"],
    enabled: !!selectedPlan
  });

  const removeFromPlanMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/api/audit-plan-items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: "excluded", 
          selectionReason: "Excluido del plan definitivo por decisión manual" 
        }),
      });
      if (!response.ok) throw new Error("Failed to remove item from plan");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audit-plans", selectedPlan, "items"] });
      toast({ 
        title: "Elemento excluido del plan",
        description: "El elemento ha sido removido del plan definitivo."
      });
    },
    onError: () => {
      toast({ 
        title: "Error al excluir elemento", 
        variant: "destructive",
        description: "Hubo un problema al excluir el elemento del plan."
      });
    },
  });

  const restoreToPlanMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/api/audit-plan-items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: "selected", 
          selectionReason: "Reincluido en el plan definitivo" 
        }),
      });
      if (!response.ok) throw new Error("Failed to restore item to plan");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audit-plans", selectedPlan, "items"] });
      toast({ 
        title: "Elemento restaurado al plan",
        description: "El elemento ha sido incluido nuevamente en el plan definitivo."
      });
    },
    onError: () => {
      toast({ 
        title: "Error al restaurar elemento", 
        variant: "destructive",
        description: "Hubo un problema al restaurar el elemento al plan."
      });
    },
  });

  const selectedItems = (planItems as any[]).filter((item: any) => item.status === "selected");
  const excludedItems = (planItems as any[]).filter((item: any) => item.status === "excluded");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Plan Definitivo de Auditorías</h3>
          <p className="text-sm text-muted-foreground">
            Elementos del plan seleccionados desde la priorización de auditorías
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Seleccionar Plan:</label>
        <Select value={selectedPlan} onValueChange={setSelectedPlan}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Seleccionar plan de auditoría" />
          </SelectTrigger>
          <SelectContent>
            {(plans as any[]).map((plan: any) => (
              <SelectItem key={plan.id} value={plan.id}>
                {plan.name} - {plan.year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedPlan && (
        <div className="space-y-6">
          {/* Elementos Seleccionados */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold">Elementos Incluidos en el Plan</h4>
              <Badge variant="secondary">{selectedItems.length} elemento(s)</Badge>
            </div>
            
            {selectedItems.length > 0 ? (
              <div className="grid gap-4">
                {selectedItems.map((item: any) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">
                              Ranking #{item.prioritization?.calculatedRanking || 'N/A'}
                            </Badge>
                            <h4 className="font-medium">
                              {item.universe?.auditableEntity || 'Entidad no especificada'}
                            </h4>
                            <Badge variant="secondary">
                              {item.universe?.entityType === 'process' ? 'Proceso' : 'Subproceso'}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p>Duración estimada: {item.estimatedDuration}h</p>
                            <p>Justificación: {item.inclusionJustification}</p>
                            <p>Prioridad: {item.prioritization?.totalPriorityScore || 0} puntos</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="default">Seleccionado</Badge>
                          <Button size="sm" variant="outline">
                            <FileText className="h-4 w-4 mr-1" />
                            Ver Detalles
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => removeFromPlanMutation.mutate(item.id)}
                            disabled={removeFromPlanMutation.isPending}
                            data-testid={`button-remove-${item.id}`}
                          >
                            {removeFromPlanMutation.isPending ? "Excluyendo..." : "Excluir"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="space-y-4">
                    <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                      <Target className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium">No hay elementos en el plan definitivo</h3>
                      <p className="text-sm text-muted-foreground">
                        Usa la Priorización de Auditorías para agregar elementos al plan
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Elementos Excluidos */}
          {excludedItems.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-muted-foreground">Elementos Excluidos</h4>
                <Badge variant="outline">{excludedItems.length} elemento(s)</Badge>
              </div>
              
              <div className="grid gap-4">
                {excludedItems.map((item: any) => (
                  <Card key={item.id} className="opacity-60 border-dashed">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">
                              Ranking #{item.prioritization?.calculatedRanking || 'N/A'}
                            </Badge>
                            <h4 className="font-medium text-muted-foreground">
                              {item.universe?.auditableEntity || 'Entidad no especificada'}
                            </h4>
                            <Badge variant="secondary">
                              {item.universe?.entityType === 'process' ? 'Proceso' : 'Subproceso'}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p>Duración estimada: {item.estimatedDuration}h</p>
                            <p>Razón de exclusión: {item.selectionReason}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive">Excluido</Badge>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => restoreToPlanMutation.mutate(item.id)}
                            disabled={restoreToPlanMutation.isPending}
                            data-testid={`button-restore-${item.id}`}
                          >
                            {restoreToPlanMutation.isPending ? "Restaurando..." : "Restaurar"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!selectedPlan && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <Calendar className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-medium">Selecciona un plan de auditoría</h3>
                <p className="text-sm text-muted-foreground">
                  Elige un plan para ver sus elementos definitivos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AuditUniverseTab() {
  const { toast } = useToast();
  const [expandedMacroprocesos, setExpandedMacroprocesos] = useState<Set<string>>(new Set());
  
  const { data: universe = [], isLoading } = useQuery<AuditUniverseWithDetails[]>({
    queryKey: ["/api/audit-universe"],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/audit-universe/generate", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to generate universe");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audit-universe"] });
      toast({ title: "Universo de auditoría generado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al generar el universo", variant: "destructive" });
    },
  });

  // Group universe items by macroproceso
  const groupedByMacroproceso = universe.reduce((acc, item) => {
    const macroId = item.macroproceso.id;
    if (!acc[macroId]) {
      acc[macroId] = {
        macroproceso: item.macroproceso,
        processes: new Map(),
        macroItem: undefined
      };
    }
    
    if (item.entityType === 'macroproceso') {
      // This is a macroproceso-level entry
      acc[macroId].macroItem = item;
    } else if (item.process) {
      const processId = item.process.id;
      if (!acc[macroId].processes.has(processId)) {
        acc[macroId].processes.set(processId, {
          process: item.process,
          items: [],
          processItem: undefined
        });
      }
      
      const processGroup = acc[macroId].processes.get(processId)!;
      
      if (item.entityType === 'process') {
        // This is a process-level entry
        processGroup.processItem = item;
      } else {
        // This is a subprocess-level entry
        processGroup.items.push(item);
      }
    }
    
    return acc;
  }, {} as Record<string, { 
    macroproceso: any; 
    processes: Map<string, { 
      process: any; 
      items: AuditUniverseWithDetails[];
      processItem?: AuditUniverseWithDetails;
    }>; 
    macroItem?: AuditUniverseWithDetails;
  }>);

  const toggleMacroproceso = (macroId: string) => {
    const newExpanded = new Set(expandedMacroprocesos);
    if (newExpanded.has(macroId)) {
      newExpanded.delete(macroId);
    } else {
      newExpanded.add(macroId);
    }
    setExpandedMacroprocesos(newExpanded);
  };

  const updateUniverseMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await fetch(`/api/audit-universe/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) throw new Error("Failed to update universe item");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audit-universe"] });
      toast({ title: "Estado de auditoría actualizado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al actualizar el estado", variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="text-center p-8">Cargando universo de auditoría...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Universo de Auditoría</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona el universo completo de entidades auditables
          </p>
        </div>
        <Button 
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          data-testid="button-generate-universe"
        >
          <Settings className="h-4 w-4 mr-2" />
          {generateMutation.isPending ? "Generando..." : "Generar desde Procesos"}
        </Button>
      </div>

      <div className="grid gap-2">
        {Object.entries(groupedByMacroproceso).map(([macroId, group]) => {
          const isExpanded = expandedMacroprocesos.has(macroId);
          const processCount = group.processes.size;
          const totalItems = Array.from(group.processes.values()).reduce((sum, p) => sum + p.items.length, 0);
          
          return (
            <div key={macroId} className="space-y-2">
              {/* Macroproceso Header */}
              <Card className="transition-all hover:shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex items-center gap-3 cursor-pointer flex-1"
                      onClick={() => toggleMacroproceso(macroId)}
                    >
                      {isExpanded ? 
                        <ChevronDown className="h-5 w-5 text-muted-foreground" /> : 
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      }
                      <div className={`space-y-1 ${group.macroItem && !group.macroItem.isActive ? 'opacity-50' : ''}`}>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{group.macroproceso.name}</h4>
                          <Badge variant="outline">Macroproceso</Badge>
                          {group.macroItem?.mandatoryAudit && (
                            <Badge variant="secondary">Auditoría Obligatoria</Badge>
                          )}
                          {group.macroItem && !group.macroItem.isActive && (
                            <Badge variant="secondary" className="bg-gray-200 text-gray-600">Desactivado</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {processCount} proceso{processCount !== 1 ? 's' : ''} • 
                          {totalItems} entidad{totalItems !== 1 ? 'es' : ''} auditable{totalItems !== 1 ? 's' : ''}
                          {group.macroItem && (
                            <span className="ml-2">• Frecuencia: Cada {group.macroItem.auditFrequency} años</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {group.macroItem && (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <span className="text-sm text-muted-foreground">Incluir:</span>
                          <Switch
                            checked={group.macroItem.isActive}
                            onCheckedChange={(checked) => 
                              updateUniverseMutation.mutate({ id: group.macroItem!.id, isActive: checked })
                            }
                            disabled={updateUniverseMutation.isPending}
                          />
                        </div>
                      )}
                      <Button size="sm" variant="outline" onClick={(e) => e.stopPropagation()}>
                        <FileText className="h-4 w-4 mr-2" />
                        Ver Detalles
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Expanded Processes */}
              {isExpanded && (
                <div className="ml-8 space-y-2">
                  {Array.from(group.processes.entries()).map(([processId, processGroup]) => (
                    <div key={processId} className="space-y-1">
                      {/* Process Header */}
                      <Card className={`bg-muted/20 border-l-4 border-l-blue-200 ${processGroup.processItem && !processGroup.processItem.isActive ? 'opacity-50' : ''}`}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <h5 className="font-medium text-sm">{processGroup.process.name}</h5>
                                <Badge variant="outline" className="text-xs">Proceso</Badge>
                                {processGroup.processItem?.mandatoryAudit && (
                                  <Badge variant="secondary" className="text-xs">Obligatorio</Badge>
                                )}
                                {processGroup.processItem && !processGroup.processItem.isActive && (
                                  <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-600">Desactivado</Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {processGroup.items.length} subproceso{processGroup.items.length !== 1 ? 's' : ''} 
                                {processGroup.processItem && (
                                  <span className="ml-2">• Frecuencia: Cada {processGroup.processItem.auditFrequency} años</span>
                                )}
                                {processGroup.process.description && ` • ${processGroup.process.description}`}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {processGroup.processItem && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground">Incluir:</span>
                                  <Switch
                                    checked={processGroup.processItem.isActive}
                                    onCheckedChange={(checked) => 
                                      updateUniverseMutation.mutate({ id: processGroup.processItem!.id, isActive: checked })
                                    }
                                    disabled={updateUniverseMutation.isPending}
                                    className="scale-75"
                                  />
                                </div>
                              )}
                              <Button size="sm" variant="ghost" className="h-7 text-xs">
                                <FileText className="h-3 w-3 mr-1" />
                                Detalles
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Process Items (Subprocesos) */}
                      <div className="ml-6 space-y-1">
                        {processGroup.items.map((item) => (
                          <Card key={item.id} className={`bg-background border-l-4 border-l-green-200 ${!item.isActive ? 'opacity-50' : ''}`}>
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{item.auditableEntity}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {item.entityType === 'subproceso' ? 'Subproceso' : 'Proceso'}
                                    </Badge>
                                    {item.mandatoryAudit && (
                                      <Badge variant="secondary" className="text-xs">Obligatorio</Badge>
                                    )}
                                    {!item.isActive && (
                                      <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-600">Desactivado</Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Frecuencia: Cada {item.auditFrequency} años
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-muted-foreground">Incluir:</span>
                                    <Switch
                                      checked={item.isActive}
                                      onCheckedChange={(checked) => 
                                        updateUniverseMutation.mutate({ id: item.id, isActive: checked })
                                      }
                                      disabled={updateUniverseMutation.isPending}
                                      className="scale-75"
                                    />
                                  </div>
                                  <Button size="sm" variant="ghost" className="h-7 text-xs">
                                    <FileText className="h-3 w-3 mr-1" />
                                    Ver
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        
        {universe.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-medium">No hay elementos en el universo</h3>
                  <p className="text-sm text-muted-foreground">
                    Usa el botón "Generar desde Procesos" en la parte superior para comenzar
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function AuditPlanningPage() {
  const { data: plans = [], isLoading } = useQuery<AuditPlan[]>({
    queryKey: ["/api/audit-plans"],
  });

  if (isLoading) {
    return <div className="text-center p-8">Cargando planes de auditoría...</div>;
  }

  return (
    <>
      <CreateAuditPlanDialog />
      <div className="space-y-6">

      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList>
          <TabsTrigger value="plans" data-testid="tab-plans">Planes de Auditoría</TabsTrigger>
          <TabsTrigger value="items" data-testid="tab-items">Plan Definitivo</TabsTrigger>
          <TabsTrigger value="universe" data-testid="tab-universe">Universo de Auditoría</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-6">
          <div className="grid gap-4">
            {plans.map((plan) => (
              <AuditPlanCard key={plan.id} plan={plan} />
            ))}
            
            {plans.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="space-y-4">
                    <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium">No hay planes de auditoría</h3>
                      <p className="text-sm text-muted-foreground">
                        Crea tu primer plan de auditoría para comenzar la planificación
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="items" className="space-y-6">
          <AuditPlanItemsTab />
        </TabsContent>

        <TabsContent value="universe">
          <AuditUniverseTab />
        </TabsContent>
      </Tabs>
      </div>
    </>
  );
}