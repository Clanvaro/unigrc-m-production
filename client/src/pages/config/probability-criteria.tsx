import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Save, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Settings2,
  AlertTriangle,
  CheckCircle,
  X
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ProbabilityCriterion {
  id: string;
  name: string;
  fieldName: string;
  description: string;
  weight: number;
  order: number;
  isActive: boolean;
  level1Description?: string;
  level2Description?: string;
  level3Description?: string;
  level4Description?: string;
  level5Description?: string;
  createdAt: string;
  updatedAt: string;
}

type CreateCriterionData = {
  name: string;
  fieldName: string;
  description: string;
  weight: number;
  isActive: boolean;
  level1Description?: string;
  level2Description?: string;
  level3Description?: string;
  level4Description?: string;
  level5Description?: string;
};

export default function ProbabilityCriteriaConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<ProbabilityCriterion | null>(null);
  const [formData, setFormData] = useState<CreateCriterionData>({
    name: "",
    fieldName: "",
    description: "",
    weight: 0,
    isActive: true,
    level1Description: "",
    level2Description: "",
    level3Description: "",
    level4Description: "",
    level5Description: "",
  });

  // Cargar criterios de probabilidad
  const { data: criteria, isLoading } = useQuery<ProbabilityCriterion[]>({
    queryKey: ["/api/probability-criteria"],
  });

  // Calcular peso total de criterios activos
  const totalActiveWeight = criteria
    ?.filter(c => c.isActive)
    ?.reduce((sum, criterion) => sum + criterion.weight, 0) || 0;

  const isWeightValid = totalActiveWeight === 100;

  // Mutación para crear criterio
  const createMutation = useMutation({
    mutationFn: async (data: CreateCriterionData) => {
      return await apiRequest("/api/probability-criteria", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/probability-criteria"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risks"] }); // Invalidar riesgos para recálculo
      toast({
        title: "Criterio creado",
        description: "El nuevo criterio se ha agregado exitosamente",
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear criterio",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive",
      });
    },
  });

  // Mutación para actualizar criterio
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProbabilityCriterion> }) => {
      return await apiRequest(`/api/probability-criteria/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/probability-criteria"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risks"] }); // Invalidar riesgos para recálculo
      toast({
        title: "Criterio actualizado",
        description: "Los cambios se han guardado exitosamente",
      });
      setEditingCriterion(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar criterio",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive",
      });
    },
  });

  // Mutación para eliminar criterio
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/probability-criteria/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/probability-criteria"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risks"] }); // Invalidar riesgos para recálculo
      toast({
        title: "Criterio eliminado",
        description: "El criterio se ha eliminado exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al eliminar criterio",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive",
      });
    },
  });

  // Mutación para reordenar criterios
  const reorderMutation = useMutation({
    mutationFn: async (reorderedCriteria: { id: string; order: number }[]) => {
      return await apiRequest("/api/probability-criteria/reorder", "PUT", { 
        criteria: reorderedCriteria 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/probability-criteria"] });
      toast({
        title: "Orden actualizado",
        description: "El orden de los criterios se ha actualizado exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al reordenar criterios",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      fieldName: "",
      description: "",
      weight: 0,
      isActive: true,
      level1Description: "",
      level2Description: "",
      level3Description: "",
      level4Description: "",
      level5Description: "",
    });
  };

  const handleCreateCriterion = () => {
    if (!formData.name.trim() || !formData.fieldName.trim()) {
      toast({
        title: "Campos requeridos",
        description: "Nombre y nombre técnico son obligatorios",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate(formData);
  };

  const handleUpdateCriterion = (id: string, updates: Partial<ProbabilityCriterion>) => {
    updateMutation.mutate({ id, data: updates });
  };

  const handleDeleteCriterion = (id: string) => {
    deleteMutation.mutate(id);
  };

  const moveUp = (index: number) => {
    if (index === 0 || !criteria) return;
    
    const reordered = [...criteria];
    const current = reordered[index];
    const previous = reordered[index - 1];
    
    // Intercambiar órdenes
    const tempOrder = current.order;
    current.order = previous.order;
    previous.order = tempOrder;
    
    reordered[index] = previous;
    reordered[index - 1] = current;
    
    reorderMutation.mutate([
      { id: current.id, order: current.order },
      { id: previous.id, order: previous.order }
    ]);
  };

  const moveDown = (index: number) => {
    if (!criteria || index === criteria.length - 1) return;
    
    const reordered = [...criteria];
    const current = reordered[index];
    const next = reordered[index + 1];
    
    // Intercambiar órdenes
    const tempOrder = current.order;
    current.order = next.order;
    next.order = tempOrder;
    
    reordered[index] = next;
    reordered[index + 1] = current;
    
    reorderMutation.mutate([
      { id: current.id, order: current.order },
      { id: next.id, order: next.order }
    ]);
  };

  const startEdit = (criterion: ProbabilityCriterion) => {
    setEditingCriterion({ ...criterion });
  };

  const cancelEdit = () => {
    setEditingCriterion(null);
  };

  const saveEdit = () => {
    if (!editingCriterion) return;
    
    handleUpdateCriterion(editingCriterion.id, {
      name: editingCriterion.name,
      description: editingCriterion.description,
      weight: editingCriterion.weight,
      isActive: editingCriterion.isActive,
      level1Description: editingCriterion.level1Description,
      level2Description: editingCriterion.level2Description,
      level3Description: editingCriterion.level3Description,
      level4Description: editingCriterion.level4Description,
      level5Description: editingCriterion.level5Description,
    });
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-probability-criteria">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Criterios de Probabilidad
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Configura los criterios dinámicos para evaluar la probabilidad de los riesgos
        </p>
      </div>

      {/* Estado de validación de pesos */}
      <Card className={`${isWeightValid ? 'border-green-200 bg-green-50 dark:bg-green-950' : 'border-red-200 bg-red-50 dark:bg-red-950'}`}>
        <CardContent className="pt-4">
          <div className="flex items-center space-x-2">
            {isWeightValid ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
            <span className={`font-medium ${isWeightValid ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
              Peso total de criterios activos: {totalActiveWeight}%
            </span>
            {!isWeightValid && (
              <Badge variant="destructive">Los pesos deben sumar exactamente 100%</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Botón para agregar criterio */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Lista de Criterios</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-criterion">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Criterio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Criterio</DialogTitle>
              <DialogDescription>
                Crea un nuevo criterio para evaluar la probabilidad de los riesgos
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre del Criterio</Label>
                <Input
                  id="name"
                  data-testid="input-criterion-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ej: Frecuencia de Ocurrencia"
                />
              </div>
              <div>
                <Label htmlFor="fieldName">Nombre Técnico</Label>
                <Input
                  id="fieldName"
                  data-testid="input-criterion-fieldname"
                  value={formData.fieldName}
                  onChange={(e) => setFormData({ ...formData, fieldName: e.target.value })}
                  placeholder="ej: frequency_occurrence"
                />
              </div>
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  data-testid="input-criterion-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe qué evalúa este criterio..."
                />
              </div>
              
              {/* Descripciones de niveles */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Descripciones de Niveles de Evaluación</Label>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label htmlFor="level1Description" className="text-xs font-normal text-gray-600">Nivel 1 (Muy Bajo)</Label>
                    <Textarea
                      id="level1Description"
                      data-testid="input-level1-description"
                      value={formData.level1Description}
                      onChange={(e) => setFormData({ ...formData, level1Description: e.target.value })}
                      placeholder="Describe el nivel 1 (muy bajo)..."
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="level2Description" className="text-xs font-normal text-gray-600">Nivel 2 (Bajo)</Label>
                    <Textarea
                      id="level2Description"
                      data-testid="input-level2-description"
                      value={formData.level2Description}
                      onChange={(e) => setFormData({ ...formData, level2Description: e.target.value })}
                      placeholder="Describe el nivel 2 (bajo)..."
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="level3Description" className="text-xs font-normal text-gray-600">Nivel 3 (Moderado)</Label>
                    <Textarea
                      id="level3Description"
                      data-testid="input-level3-description"
                      value={formData.level3Description}
                      onChange={(e) => setFormData({ ...formData, level3Description: e.target.value })}
                      placeholder="Describe el nivel 3 (moderado)..."
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="level4Description" className="text-xs font-normal text-gray-600">Nivel 4 (Alto)</Label>
                    <Textarea
                      id="level4Description"
                      data-testid="input-level4-description"
                      value={formData.level4Description}
                      onChange={(e) => setFormData({ ...formData, level4Description: e.target.value })}
                      placeholder="Describe el nivel 4 (alto)..."
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="level5Description" className="text-xs font-normal text-gray-600">Nivel 5 (Muy Alto)</Label>
                    <Textarea
                      id="level5Description"
                      data-testid="input-level5-description"
                      value={formData.level5Description}
                      onChange={(e) => setFormData({ ...formData, level5Description: e.target.value })}
                      placeholder="Describe el nivel 5 (muy alto)..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="weight">Peso (%)</Label>
                <Input
                  id="weight"
                  type="number"
                  min="0"
                  max="100"
                  data-testid="input-criterion-weight"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  data-testid="switch-criterion-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Criterio activo</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel-create"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateCriterion}
                  disabled={createMutation.isPending}
                  data-testid="button-save-criterion"
                >
                  {createMutation.isPending ? "Creando..." : "Crear Criterio"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de criterios */}
      <div className="space-y-4">
        {criteria?.slice().sort((a, b) => a.order - b.order).map((criterion, index) => (
          <Card key={criterion.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Badge variant={criterion.isActive ? "default" : "secondary"}>
                    {criterion.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                  <div>
                    <CardTitle className="text-lg" data-testid={`text-criterion-name-${criterion.id}`}>
                      {editingCriterion?.id === criterion.id ? (
                        <Input
                          value={editingCriterion.name}
                          onChange={(e) => setEditingCriterion({ ...editingCriterion, name: e.target.value })}
                          className="mb-1"
                        />
                      ) : (
                        criterion.name
                      )}
                    </CardTitle>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>Campo: <code>{criterion.fieldName}</code></span>
                      <span data-testid={`text-criterion-weight-${criterion.id}`}>
                        Peso: {criterion.weight}%
                      </span>
                      <span>Orden: {criterion.order}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {/* Botones de reordenar */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveUp(index)}
                    disabled={index === 0 || reorderMutation.isPending}
                    data-testid={`button-move-up-${criterion.id}`}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveDown(index)}
                    disabled={index === (criteria?.length || 0) - 1 || reorderMutation.isPending}
                    data-testid={`button-move-down-${criterion.id}`}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  
                  {/* Botones de editar/cancelar/guardar */}
                  {editingCriterion?.id === criterion.id ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelEdit}
                        data-testid={`button-cancel-edit-${criterion.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={saveEdit}
                        disabled={updateMutation.isPending}
                        data-testid={`button-save-edit-${criterion.id}`}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(criterion)}
                      data-testid={`button-edit-${criterion.id}`}
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {/* Botón de eliminar */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        data-testid={`button-delete-${criterion.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar criterio?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción eliminará permanentemente el criterio "{criterion.name}". 
                          Los riesgos existentes mantendrán sus valores actuales pero no podrán 
                          editarse usando este criterio.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteCriterion(criterion.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {editingCriterion?.id === criterion.id ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Descripción</Label>
                      <Textarea
                        value={editingCriterion.description}
                        onChange={(e) => setEditingCriterion({ ...editingCriterion, description: e.target.value })}
                      />
                    </div>
                    
                    {/* Descripciones de niveles en edición */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Descripciones de Niveles</Label>
                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <Label className="text-xs text-gray-600">Nivel 1 (Muy Bajo)</Label>
                          <Textarea
                            value={editingCriterion.level1Description || ""}
                            onChange={(e) => setEditingCriterion({ ...editingCriterion, level1Description: e.target.value })}
                            placeholder="Descripción del nivel 1..."
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Nivel 2 (Bajo)</Label>
                          <Textarea
                            value={editingCriterion.level2Description || ""}
                            onChange={(e) => setEditingCriterion({ ...editingCriterion, level2Description: e.target.value })}
                            placeholder="Descripción del nivel 2..."
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Nivel 3 (Moderado)</Label>
                          <Textarea
                            value={editingCriterion.level3Description || ""}
                            onChange={(e) => setEditingCriterion({ ...editingCriterion, level3Description: e.target.value })}
                            placeholder="Descripción del nivel 3..."
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Nivel 4 (Alto)</Label>
                          <Textarea
                            value={editingCriterion.level4Description || ""}
                            onChange={(e) => setEditingCriterion({ ...editingCriterion, level4Description: e.target.value })}
                            placeholder="Descripción del nivel 4..."
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">Nivel 5 (Muy Alto)</Label>
                          <Textarea
                            value={editingCriterion.level5Description || ""}
                            onChange={(e) => setEditingCriterion({ ...editingCriterion, level5Description: e.target.value })}
                            placeholder="Descripción del nivel 5..."
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Peso (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={editingCriterion.weight}
                          onChange={(e) => setEditingCriterion({ ...editingCriterion, weight: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="flex items-end">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={editingCriterion.isActive}
                            onCheckedChange={(checked) => setEditingCriterion({ ...editingCriterion, isActive: checked })}
                          />
                          <Label>Activo</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400" data-testid={`text-criterion-description-${criterion.id}`}>
                    {criterion.description || "Sin descripción"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        
        {!criteria || criteria.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              <Settings2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No hay criterios configurados</p>
              <p className="text-sm">Agrega tu primer criterio para comenzar</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}