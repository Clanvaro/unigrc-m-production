import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Save, RotateCcw, Plus, Trash2, ChevronDown, ChevronRight, Edit2, GripVertical } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ControlEvaluationCriteria {
  id: string;
  name: string;
  description: string;
  weight: number;
  order: number;
  isActive: boolean;
}

interface ControlEvaluationOptions {
  id: string;
  criteriaId: string;
  name: string;
  weight: number;
  order: number;
  isActive: boolean;
}

interface CriteriaWithOptions {
  criteria: ControlEvaluationCriteria;
  options: ControlEvaluationOptions[];
}

interface SystemConfig {
  id: string;
  configKey: string;
  configValue: string;
  description: string;
  dataType: string;
  isActive: boolean;
}

interface SortableOptionProps {
  option: ControlEvaluationOptions;
  criteriaWeight: number;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableOption({ option, criteriaWeight, onEdit, onDelete }: SortableOptionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between bg-white p-3 rounded border ${isDragging ? 'shadow-lg' : ''}`}
    >
      <div className="flex items-center gap-2 flex-1">
        <button
          className="cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </button>
        <div className="flex-1">
          <p className="text-sm font-medium">{option.name}</p>
          <p className="text-xs text-muted-foreground">
            Peso: {option.weight}% (Contribución: {((criteriaWeight || 0) * option.weight / 100).toFixed(1)}%)
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="text-blue-600 hover:text-blue-700"
        >
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function ControlEffectivenessConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [criteriaWeights, setCriteriaWeights] = useState<{[key: string]: number}>({});
  const [originalWeights, setOriginalWeights] = useState<{[key: string]: number}>({});
  const [maxEffectivenessLimit, setMaxEffectivenessLimit] = useState<number>(100);
  const [originalMaxLimit, setOriginalMaxLimit] = useState<number>(100);
  
  // Estado para filas expandibles
  const [expandedCriteria, setExpandedCriteria] = useState<Set<string>>(new Set());
  
  // Estado para modal de nuevo criterio
  const [showNewCriteriaModal, setShowNewCriteriaModal] = useState(false);
  const [newCriteriaName, setNewCriteriaName] = useState("");
  const [newCriteriaDescription, setNewCriteriaDescription] = useState("");
  const [newCriteriaWeight, setNewCriteriaWeight] = useState(0);
  
  // Estado para modal de nueva opción
  const [showNewOptionModal, setShowNewOptionModal] = useState<{show: boolean, criteriaId: string}>({show: false, criteriaId: ""});
  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionWeight, setNewOptionWeight] = useState(0);
  
  // Estado para modal de editar opción
  const [editOptionModal, setEditOptionModal] = useState<{show: boolean, optionId: string, name: string, weight: number}>({show: false, optionId: "", name: "", weight: 0});
  
  // Estado para modal de confirmación de eliminación
  const [deleteCriteriaModal, setDeleteCriteriaModal] = useState<{show: boolean, criteriaId: string, criteriaName: string}>({show: false, criteriaId: "", criteriaName: ""});
  const [deleteOptionModal, setDeleteOptionModal] = useState<{show: boolean, optionId: string, optionName: string}>({show: false, optionId: "", optionName: ""});

  // Obtener criterios de evaluación
  const { data: criteria = [], isLoading: isLoadingCriteria } = useQuery<ControlEvaluationCriteria[]>({
    queryKey: ["/api/control-evaluation-criteria"],
  });

  // Obtener criterios con opciones
  const { data: criteriaWithOptions = [] } = useQuery<CriteriaWithOptions[]>({
    queryKey: ["/api/control-evaluation-criteria-with-options"],
  });

  // Obtener límite máximo de efectividad
  const { data: maxLimitData, isLoading: isLoadingMaxLimit } = useQuery<{maxEffectivenessLimit: number}>({
    queryKey: ["/api/system-config/max-effectiveness-limit/value"],
  });


  // Calcular peso total
  const totalWeight = Object.values(criteriaWeights).reduce((sum, weight) => sum + (weight || 0), 0);

  // Inicializar pesos cuando se cargan los criterios
  useEffect(() => {
    if (criteria.length > 0) {
      const initialWeights: {[key: string]: number} = {};
      criteria.forEach(criterion => {
        initialWeights[criterion.id] = criterion.weight;
      });
      setCriteriaWeights(initialWeights);
      setOriginalWeights(initialWeights);
    }
  }, [criteria]);

  // Inicializar límite máximo cuando se carga
  useEffect(() => {
    if (maxLimitData) {
      setMaxEffectivenessLimit(maxLimitData.maxEffectivenessLimit);
      setOriginalMaxLimit(maxLimitData.maxEffectivenessLimit);
    }
  }, [maxLimitData]);


  // Mutación para actualizar pesos
  const updateMutation = useMutation({
    mutationFn: async (updates: {criteriaId: string, weight: number}[]) => {
      const promises = updates.map(update => 
        apiRequest(`/api/control-evaluation-criteria/${update.criteriaId}`, "PUT", { weight: update.weight })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/control-evaluation-criteria"] });
      // También invalidar el cache de controles ya que cambiar los pesos afecta la efectividad
      queryClient.invalidateQueries({ queryKey: ["/api/controls"] });
      toast({
        title: "Configuración guardada",
        description: "Los pesos de los criterios han sido actualizados exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración. Intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  // Mutación para actualizar límite máximo de efectividad
  const updateMaxLimitMutation = useMutation({
    mutationFn: async (limit: number) => {
      // Intentar crear/actualizar la configuración
      try {
        return await apiRequest("/api/system-config/max_effectiveness_limit", "PUT", { configValue: limit.toString() });
      } catch (error: any) {
        if (error.status === 404) {
          // Si no existe, crear la configuración
          return await apiRequest("/api/system-config", "POST", {
            configKey: "max_effectiveness_limit",
            configValue: limit.toString(),
            description: "Límite máximo de efectividad para controles (porcentaje)",
            dataType: "number",
            updatedBy: "user-1"
          });
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-config/max-effectiveness-limit/value"] });
      // También invalidar el cache de controles para que se actualice la tabla automáticamente
      queryClient.invalidateQueries({ queryKey: ["/api/controls"] });
    },
  });


  // Mutación para crear criterio
  const createCriteriaMutation = useMutation({
    mutationFn: async (criteriaData: {name: string, description: string, weight: number, order: number}) => {
      return await apiRequest("/api/control-evaluation-criteria", "POST", {
        ...criteriaData,
        isActive: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/control-evaluation-criteria"] });
      queryClient.invalidateQueries({ queryKey: ["/api/controls"] });
      setShowNewCriteriaModal(false);
      setNewCriteriaName("");
      setNewCriteriaDescription("");
      setNewCriteriaWeight(0);
      toast({
        title: "Criterio creado",
        description: "El criterio de evaluación ha sido agregado exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el criterio. Intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  // Mutación para eliminar criterio
  const deleteCriteriaMutation = useMutation({
    mutationFn: async (criteriaId: string) => {
      return await apiRequest(`/api/control-evaluation-criteria/${criteriaId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/control-evaluation-criteria"] });
      queryClient.invalidateQueries({ queryKey: ["/api/control-evaluation-criteria-with-options"] });
      queryClient.invalidateQueries({ queryKey: ["/api/controls"] });
      toast({
        title: "Criterio eliminado",
        description: "El criterio de evaluación ha sido eliminado exitosamente.",
      });
    },
    onError: (error: any) => {
      // Delete error handled in UI feedback
      let message = "No se pudo eliminar el criterio. Intenta nuevamente.";
      
      // Verificar si es un error 400 que indica evaluaciones existentes
      if (error.status === 400) {
        message = "No se puede eliminar este criterio porque tiene evaluaciones asociadas. Primero debes eliminar todas las evaluaciones de controles que usan este criterio.";
      } else if (error.message?.includes("Cannot delete criteria that has existing evaluations")) {
        message = "No se puede eliminar este criterio porque tiene evaluaciones asociadas.";
      }
      
      toast({
        title: "No se puede eliminar",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Mutación para crear opción
  const createOptionMutation = useMutation({
    mutationFn: async (optionData: {criteriaId: string, name: string, weight: number, order: number}) => {
      return await apiRequest("/api/control-evaluation-options", "POST", {
        ...optionData,
        isActive: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/control-evaluation-criteria-with-options"] });
      queryClient.invalidateQueries({ queryKey: ["/api/controls"] });
      setShowNewOptionModal({show: false, criteriaId: ""});
      setNewOptionName("");
      setNewOptionWeight(0);
      toast({
        title: "Opción creada",
        description: "La opción de evaluación ha sido agregada exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear la opción. Intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  // Mutación para editar opción
  const updateOptionMutation = useMutation({
    mutationFn: async (data: {optionId: string, name: string, weight: number}) => {
      return await apiRequest(`/api/control-evaluation-options/${data.optionId}`, "PUT", {
        name: data.name,
        weight: data.weight
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/control-evaluation-criteria-with-options"] });
      queryClient.invalidateQueries({ queryKey: ["/api/controls"] });
      setEditOptionModal({show: false, optionId: "", name: "", weight: 0});
      toast({
        title: "Opción actualizada",
        description: "La opción de evaluación ha sido actualizada exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la opción. Intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  // Mutación para eliminar opción
  const deleteOptionMutation = useMutation({
    mutationFn: async (optionId: string) => {
      return await apiRequest(`/api/control-evaluation-options/${optionId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/control-evaluation-criteria-with-options"] });
      queryClient.invalidateQueries({ queryKey: ["/api/controls"] });
      toast({
        title: "Opción eliminada",
        description: "La opción de evaluación ha sido eliminada exitosamente.",
      });
    },
    onError: (error: any) => {
      let message = "No se pudo eliminar la opción. Intenta nuevamente.";
      
      if (error.status === 400 || error.message?.includes("Cannot delete option with existing evaluations")) {
        message = "No se puede eliminar esta opción porque tiene evaluaciones asociadas.";
      }
      
      toast({
        title: "No se puede eliminar",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Mutación para reordenar opciones
  const reorderOptionsMutation = useMutation({
    mutationFn: async (options: { id: string; order: number }[]) => {
      return await apiRequest("/api/control-evaluation-options/reorder", "PATCH", { options });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/control-evaluation-criteria-with-options"] });
      queryClient.invalidateQueries({ queryKey: ["/api/controls"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo reordenar las opciones. Intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  const handleCreateCriteria = () => {
    if (!newCriteriaName.trim()) {
      toast({
        title: "Error de validación",
        description: "El nombre del criterio es requerido.",
        variant: "destructive",
      });
      return;
    }

    const nextOrder = Math.max(...criteria.map(c => c.order), 0) + 1;
    createCriteriaMutation.mutate({
      name: newCriteriaName.trim(),
      description: newCriteriaDescription.trim(),
      weight: newCriteriaWeight,
      order: nextOrder
    });
  };

  const handleDeleteCriteria = (criteriaId: string, criteriaName: string) => {
    setDeleteCriteriaModal({show: true, criteriaId, criteriaName});
  };
  
  const confirmDeleteCriteria = () => {
    deleteCriteriaMutation.mutate(deleteCriteriaModal.criteriaId);
    setDeleteCriteriaModal({show: false, criteriaId: "", criteriaName: ""});
  };

  const toggleCriteriaExpand = (criteriaId: string) => {
    setExpandedCriteria(prev => {
      const newSet = new Set(prev);
      if (newSet.has(criteriaId)) {
        newSet.delete(criteriaId);
      } else {
        newSet.add(criteriaId);
      }
      return newSet;
    });
  };

  const handleCreateOption = (criteriaId: string) => {
    if (!newOptionName.trim()) {
      toast({
        title: "Error de validación",
        description: "El nombre de la opción es requerido.",
        variant: "destructive",
      });
      return;
    }

    const criteriaData = criteriaWithOptions.find(c => c.criteria.id === criteriaId);
    const nextOrder = criteriaData ? Math.max(...criteriaData.options.map(o => o.order), 0) + 1 : 1;
    
    createOptionMutation.mutate({
      criteriaId,
      name: newOptionName.trim(),
      weight: newOptionWeight,
      order: nextOrder
    });
  };

  const handleEditOption = () => {
    if (!editOptionModal.name.trim()) {
      toast({
        title: "Error de validación",
        description: "El nombre de la opción es requerido.",
        variant: "destructive",
      });
      return;
    }

    updateOptionMutation.mutate({
      optionId: editOptionModal.optionId,
      name: editOptionModal.name.trim(),
      weight: editOptionModal.weight
    });
  };

  const handleDeleteOption = (optionId: string, optionName: string) => {
    setDeleteOptionModal({show: true, optionId, optionName});
  };

  const confirmDeleteOption = () => {
    deleteOptionMutation.mutate(deleteOptionModal.optionId);
    setDeleteOptionModal({show: false, optionId: "", optionName: ""});
  };

  const handleDragEnd = (event: DragEndEvent, criteriaId: string) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const criteriaData = criteriaWithOptions.find(c => c.criteria.id === criteriaId);
    if (!criteriaData) return;

    const oldIndex = criteriaData.options.findIndex(o => o.id === active.id);
    const newIndex = criteriaData.options.findIndex(o => o.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedOptions = arrayMove(criteriaData.options, oldIndex, newIndex);
    const updatedOptions = reorderedOptions.map((option, index) => ({
      id: option.id,
      order: index
    }));

    reorderOptionsMutation.mutate(updatedOptions);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleSave = async () => {
    if (totalWeight !== 100) {
      toast({
        title: "Error de validación",
        description: "La suma de todos los pesos debe ser igual a 100%",
        variant: "destructive",
      });
      return;
    }

    if (maxEffectivenessLimit < 1 || maxEffectivenessLimit > 100) {
      toast({
        title: "Error de validación",
        description: "El límite máximo de efectividad debe estar entre 1% y 100%",
        variant: "destructive",
      });
      return;
    }


    try {
      // Actualizar criterios de evaluación
      const updates = Object.entries(criteriaWeights).map(([criteriaId, weight]) => ({
        criteriaId,
        weight,
      }));

      await updateMutation.mutateAsync(updates);
      
      // Actualizar límite máximo si cambió
      if (maxEffectivenessLimit !== originalMaxLimit) {
        await updateMaxLimitMutation.mutateAsync(maxEffectivenessLimit);
      }


      toast({
        title: "Configuración guardada",
        description: "Todos los parámetros han sido actualizados exitosamente.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración completa. Intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

  const resetToDefaults = () => {
    setCriteriaWeights(originalWeights);
    setMaxEffectivenessLimit(originalMaxLimit);
    toast({
      title: "Valores restaurados",
      description: "Se han restaurado los valores originales.",
    });
  };

  const updateWeight = (criteriaId: string, newWeight: number) => {
    setCriteriaWeights(prev => ({
      ...prev,
      [criteriaId]: newWeight
    }));
  };

  if (isLoadingCriteria) {
    return <div className="flex justify-center items-center h-64">Cargando criterios de evaluación...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Criterios de Evaluación de Controles</CardTitle>
                  <CardDescription>
                    Configura los pesos porcentuales de cada criterio utilizado para evaluar la efectividad de los controles.
                    La suma total debe ser 100%.
                  </CardDescription>
                </div>
                <Dialog open={showNewCriteriaModal} onOpenChange={setShowNewCriteriaModal}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" data-testid="button-add-criteria">
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Criterio
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Agregar Nuevo Criterio de Evaluación</DialogTitle>
                      <DialogDescription>
                        Crea un nuevo criterio para evaluar la efectividad de los controles.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="criteria-name">Nombre del Criterio</Label>
                        <Input
                          id="criteria-name"
                          value={newCriteriaName}
                          onChange={(e) => setNewCriteriaName(e.target.value)}
                          placeholder="Ej: Frecuencia de Revisión"
                          data-testid="input-new-criteria-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="criteria-description">Descripción</Label>
                        <Textarea
                          id="criteria-description"
                          value={newCriteriaDescription}
                          onChange={(e) => setNewCriteriaDescription(e.target.value)}
                          placeholder="Describe qué evalúa este criterio..."
                          data-testid="input-new-criteria-description"
                        />
                      </div>
                      <div>
                        <Label htmlFor="criteria-weight">Peso Inicial (%)</Label>
                        <Input
                          id="criteria-weight"
                          type="number"
                          min={0}
                          max={100}
                          value={newCriteriaWeight}
                          onChange={(e) => setNewCriteriaWeight(parseInt(e.target.value) || 0)}
                          data-testid="input-new-criteria-weight"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button 
                          variant="outline" 
                          onClick={() => setShowNewCriteriaModal(false)}
                          data-testid="button-cancel-new-criteria"
                        >
                          Cancelar
                        </Button>
                        <Button 
                          onClick={handleCreateCriteria}
                          disabled={createCriteriaMutation.isPending}
                          data-testid="button-save-new-criteria"
                        >
                          {createCriteriaMutation.isPending ? "Guardando..." : "Agregar Criterio"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {criteria.sort((a, b) => a.order - b.order).map((criterion) => {
                  const criteriaData = criteriaWithOptions.find(c => c.criteria.id === criterion.id);
                  const isExpanded = expandedCriteria.has(criterion.id);
                  const hasOptions = criteriaData && criteriaData.options.length > 0;
                  
                  return (
                    <div key={criterion.id} className="space-y-3 border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCriteriaExpand(criterion.id)}
                            className="p-0 h-auto hover:bg-transparent"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </Button>
                          <div className="flex-1">
                            <label className="text-sm font-medium">{criterion.name} ({criteriaWeights[criterion.id] || 0}%)</label>
                            <p className="text-xs text-muted-foreground">{criterion.description}</p>
                            {hasOptions && (
                              <p className="text-xs text-blue-600 mt-1">{criteriaData.options.length} opciones configuradas</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCriteria(criterion.id, criterion.name)}
                          disabled={deleteCriteriaMutation.isPending}
                          data-testid={`button-delete-criteria-${criterion.id}`}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <Slider
                            value={[criteriaWeights[criterion.id] || 0]}
                            onValueChange={(value) => updateWeight(criterion.id, value[0])}
                            max={100}
                            step={1}
                            data-testid={`slider-${criterion.id}`}
                          />
                        </div>
                        <div className="w-20">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={criteriaWeights[criterion.id] || 0}
                            onChange={(e) => updateWeight(criterion.id, parseInt(e.target.value) || 0)}
                            data-testid={`input-${criterion.id}`}
                          />
                        </div>
                      </div>
                      
                      {/* Sección expandible con opciones */}
                      {isExpanded && (
                        <div className="mt-4 pl-6 border-l-2 border-blue-300 space-y-3">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-gray-700">Opciones de Evaluación</h4>
                            <Dialog open={showNewOptionModal.show && showNewOptionModal.criteriaId === criterion.id} onOpenChange={(open) => setShowNewOptionModal(open ? {show: true, criteriaId: criterion.id} : {show: false, criteriaId: ""})}>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Plus className="w-3 h-3 mr-1" />
                                  Agregar Opción
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Agregar Opción de Evaluación</DialogTitle>
                                  <DialogDescription>
                                    Crea una nueva opción para el criterio "{criterion.name}"
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="option-name">Nombre de la Opción</Label>
                                    <Input
                                      id="option-name"
                                      value={newOptionName}
                                      onChange={(e) => setNewOptionName(e.target.value)}
                                      placeholder="Ej: Preventivo"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="option-weight">Peso (%)</Label>
                                    <Input
                                      id="option-weight"
                                      type="number"
                                      min={0}
                                      max={100}
                                      value={newOptionWeight}
                                      onChange={(e) => setNewOptionWeight(parseInt(e.target.value) || 0)}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Este peso se multiplica por el peso del criterio ({criteriaWeights[criterion.id]}%)
                                    </p>
                                  </div>
                                  <div className="flex gap-2 justify-end">
                                    <Button 
                                      variant="outline" 
                                      onClick={() => setShowNewOptionModal({show: false, criteriaId: ""})}
                                    >
                                      Cancelar
                                    </Button>
                                    <Button 
                                      onClick={() => handleCreateOption(criterion.id)}
                                      disabled={createOptionMutation.isPending}
                                    >
                                      {createOptionMutation.isPending ? "Guardando..." : "Agregar Opción"}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                          
                          {hasOptions ? (
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={(event) => handleDragEnd(event, criterion.id)}
                            >
                              <SortableContext
                                items={criteriaData.options.map(o => o.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="space-y-2">
                                  {criteriaData.options.sort((a, b) => a.order - b.order).map((option) => (
                                    <SortableOption
                                      key={option.id}
                                      option={option}
                                      criteriaWeight={criteriaWeights[criterion.id] || 0}
                                      onEdit={() => setEditOptionModal({show: true, optionId: option.id, name: option.name, weight: option.weight})}
                                      onDelete={() => handleDeleteOption(option.id, option.name)}
                                    />
                                  ))}
                                </div>
                              </SortableContext>
                            </DndContext>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">No hay opciones configuradas para este criterio.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                <Card className={`${totalWeight === 100 ? 'border-green-200 bg-green-50' : totalWeight > 100 ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Total de Pesos:</span>
                      <span className={`text-lg font-bold ${totalWeight === 100 ? 'text-green-600' : totalWeight > 100 ? 'text-red-600' : 'text-yellow-600'}`}>
                        {totalWeight}%
                      </span>
                    </div>
                    {totalWeight !== 100 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {totalWeight > 100 ? 'La suma supera el 100%. ' : 'La suma es menor al 100%. '}
                        Ajusta los valores para que sumen exactamente 100%.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Límite Máximo de Efectividad */}
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <label className="text-sm font-medium">Límite Máximo de Efectividad ({maxEffectivenessLimit}%)</label>
                          <p className="text-xs text-muted-foreground">
                            Porcentaje máximo que puede alcanzar un control, independientemente de la evaluación de criterios
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <Slider
                            value={[maxEffectivenessLimit]}
                            onValueChange={(value) => setMaxEffectivenessLimit(value[0])}
                            min={1}
                            max={100}
                            step={1}
                            data-testid="slider-max-effectiveness-limit"
                          />
                        </div>
                        <div className="w-20">
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            value={maxEffectivenessLimit}
                            onChange={(e) => setMaxEffectivenessLimit(parseInt(e.target.value) || 100)}
                            data-testid="input-max-effectiveness-limit"
                          />
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <strong>Ejemplo:</strong> Si estableces 90%, ningún control podrá tener más del 90% de efectividad, 
                        incluso si la evaluación de criterios resulta en 100%.
                      </div>
                    </div>
                  </CardContent>
                </Card>


                <div className="flex gap-2">
                  <Button 
                    onClick={handleSave}
                    disabled={updateMutation.isPending || totalWeight !== 100}
                    data-testid="button-save-config"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateMutation.isPending ? "Guardando..." : "Guardar Configuración"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={resetToDefaults}
                    data-testid="button-reset-config"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restaurar Valores Originales
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-2">¿Cómo se calcula la efectividad?</h4>
                <p className="text-sm text-muted-foreground">
                  La efectividad total de un control se calcula multiplicando cada criterio por su peso porcentual correspondiente, 
                  pero está limitada por el límite máximo configurado.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Límite Máximo de Efectividad</h4>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${maxEffectivenessLimit < 100 ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                  <span className="text-sm font-medium">{maxEffectivenessLimit}%</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {maxEffectivenessLimit < 100 
                    ? `Los controles no podrán superar el ${maxEffectivenessLimit}% de efectividad.`
                    : 'Sin límite aplicado - los controles pueden alcanzar 100% de efectividad.'
                  }
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-sm mb-2">Criterios Actuales</h4>
                <div className="space-y-2">
                  {criteria.sort((a, b) => a.order - b.order).map((criterion) => (
                    <div key={criterion.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{criterion.name}:</span>
                      <span className="font-medium">{criteriaWeights[criterion.id] || 0}%</span>
                    </div>
                  ))}
                </div>
              </div>


              <div>
                <h4 className="font-medium text-sm mb-2">Estado de la Configuración</h4>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${totalWeight === 100 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <span className="text-sm text-muted-foreground">
                    {totalWeight === 100 ? 'Configuración válida' : 'Ajustes requeridos'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Modal de confirmación para eliminar criterio */}
      <AlertDialog open={deleteCriteriaModal.show} onOpenChange={(open) => !open && setDeleteCriteriaModal({show: false, criteriaId: "", criteriaName: ""})}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Criterio de Evaluación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar el criterio "{deleteCriteriaModal.criteriaName}"? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-criteria">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteCriteria}
              disabled={deleteCriteriaMutation.isPending}
              data-testid="button-confirm-delete-criteria"
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteCriteriaMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de edición de opción */}
      <Dialog open={editOptionModal.show} onOpenChange={(open) => !open && setEditOptionModal({show: false, optionId: "", name: "", weight: 0})}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Opción de Evaluación</DialogTitle>
            <DialogDescription>
              Modifica el nombre y peso de la opción
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-option-name">Nombre de la Opción</Label>
              <Input
                id="edit-option-name"
                value={editOptionModal.name}
                onChange={(e) => setEditOptionModal({...editOptionModal, name: e.target.value})}
                placeholder="Ej: Preventivo"
              />
            </div>
            <div>
              <Label htmlFor="edit-option-weight">Peso (%)</Label>
              <Input
                id="edit-option-weight"
                type="number"
                min={0}
                max={100}
                value={editOptionModal.weight}
                onChange={(e) => setEditOptionModal({...editOptionModal, weight: parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setEditOptionModal({show: false, optionId: "", name: "", weight: 0})}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleEditOption}
                disabled={updateOptionMutation.isPending}
              >
                {updateOptionMutation.isPending ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación para eliminar opción */}
      <AlertDialog open={deleteOptionModal.show} onOpenChange={(open) => !open && setDeleteOptionModal({show: false, optionId: "", optionName: ""})}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Opción de Evaluación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar la opción "{deleteOptionModal.optionName}"? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteOption}
              disabled={deleteOptionMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteOptionMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}