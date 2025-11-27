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
  X,
  MoreVertical
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ImpactCriterion {
  id: string;
  name: string;
  fieldName: string;
  description: string;
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
  isActive: boolean;
  level1Description?: string;
  level2Description?: string;
  level3Description?: string;
  level4Description?: string;
  level5Description?: string;
};

export default function ImpactCriteriaConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Estado para diálogos y edición
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<ImpactCriterion | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateCriterionData>({
    name: "",
    fieldName: "",
    description: "",
    isActive: true,
    level1Description: "",
    level2Description: "",
    level3Description: "",
    level4Description: "",
    level5Description: "",
  });

  // Query para obtener criterios de impacto
  const { data: criteria = [], isLoading } = useQuery<ImpactCriterion[]>({
    queryKey: ["/api/impact-criteria"],
  });

  // Mutación para crear criterio
  const createMutation = useMutation({
    mutationFn: async (data: CreateCriterionData) => {
      return await apiRequest("/api/impact-criteria", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/impact-criteria"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Criterio creado",
        description: "El criterio de impacto ha sido creado exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el criterio de impacto.",
        variant: "destructive",
      });
    },
  });

  // Mutación para actualizar criterio
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateCriterionData> }) => {
      return await apiRequest(`/api/impact-criteria/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/impact-criteria"] });
      setEditingCriterion(null);
      toast({
        title: "Criterio actualizado",
        description: "El criterio de impacto ha sido actualizado exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el criterio de impacto.",
        variant: "destructive",
      });
    },
  });

  // Mutación para eliminar criterio
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/impact-criteria/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/impact-criteria"] });
      toast({
        title: "Criterio eliminado",
        description: "El criterio de impacto ha sido eliminado exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el criterio de impacto.",
        variant: "destructive",
      });
    },
  });

  // Mutación para reordenar criterios
  const reorderMutation = useMutation({
    mutationFn: async (criteriaIds: string[]) => {
      return await apiRequest("/api/impact-criteria/reorder", "POST", { criteriaIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/impact-criteria"] });
      toast({
        title: "Orden actualizado",
        description: "El orden de los criterios ha sido actualizado.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el orden de los criterios.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      fieldName: "",
      description: "",
      isActive: true,
      level1Description: "",
      level2Description: "",
      level3Description: "",
      level4Description: "",
      level5Description: "",
    });
  };

  const handleCreate = () => {
    if (!formData.name.trim() || !formData.fieldName.trim()) {
      toast({
        title: "Error",
        description: "El nombre y el nombre técnico son obligatorios.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = (criterion: ImpactCriterion) => {
    const updateData = {
      name: criterion.name,
      fieldName: criterion.fieldName,
      description: criterion.description,
      isActive: criterion.isActive,
      level1Description: criterion.level1Description || "",
      level2Description: criterion.level2Description || "",
      level3Description: criterion.level3Description || "",
      level4Description: criterion.level4Description || "",
      level5Description: criterion.level5Description || "",
    };
    updateMutation.mutate({ id: criterion.id, data: updateData });
  };

  const handleMove = (criterion: ImpactCriterion, direction: "up" | "down") => {
    const currentIndex = criteria.findIndex((c) => c.id === criterion.id);
    if (
      (direction === "up" && currentIndex === 0) ||
      (direction === "down" && currentIndex === criteria.length - 1)
    ) {
      return;
    }

    const newOrder = [...criteria];
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    [newOrder[currentIndex], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[currentIndex]];
    
    const reorderedIds = newOrder.map((c) => c.id);
    reorderMutation.mutate(reorderedIds);
  };

  const startEditing = (criterion: ImpactCriterion) => {
    setEditingCriterion({ ...criterion });
  };

  const cancelEditing = () => {
    setEditingCriterion(null);
  };

  const updateEditingField = (field: keyof ImpactCriterion, value: any) => {
    if (editingCriterion) {
      setEditingCriterion({
        ...editingCriterion,
        [field]: value,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Cargando criterios de impacto...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Criterios de Impacto</h1>
          <p className="text-muted-foreground">
            Configura los criterios utilizados para evaluar el impacto de los riesgos
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-impact-criterion">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Criterio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Criterio de Impacto</DialogTitle>
              <DialogDescription>
                Define un nuevo criterio para evaluar el impacto de los riesgos.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-name">Nombre *</Label>
                  <Input
                    id="create-name"
                    data-testid="input-create-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Infraestructura"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-fieldName">Nombre Técnico *</Label>
                  <Input
                    id="create-fieldName"
                    data-testid="input-create-fieldname"
                    value={formData.fieldName}
                    onChange={(e) => setFormData({ ...formData, fieldName: e.target.value })}
                    placeholder="Ej: infrastructure"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="create-description">Descripción</Label>
                <Textarea
                  id="create-description"
                  data-testid="textarea-create-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe el criterio de impacto..."
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="create-isActive"
                  data-testid="switch-create-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="create-isActive">Activo</Label>
              </div>

              <div className="space-y-4">
                <Label className="text-sm font-medium">Descripciones de Niveles de Evaluación</Label>
                <div className="grid gap-3">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div key={level} className="space-y-2">
                      <Label htmlFor={`create-level${level}`} className="text-xs text-muted-foreground">
                        Nivel {level} ({level === 1 ? "Muy Bajo" : level === 2 ? "Bajo" : level === 3 ? "Moderado" : level === 4 ? "Alto" : "Muy Alto"})
                      </Label>
                      <Input
                        id={`create-level${level}`}
                        data-testid={`input-create-level${level}`}
                        value={formData[`level${level}Description` as keyof CreateCriterionData] as string || ""}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          [`level${level}Description` as keyof CreateCriterionData]: e.target.value 
                        })}
                        placeholder={`Descripción del nivel ${level}...`}
                      />
                    </div>
                  ))}
                </div>
              </div>
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
                onClick={handleCreate}
                disabled={createMutation.isPending}
                data-testid="button-submit-create"
              >
                {createMutation.isPending ? "Creando..." : "Crear Criterio"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {criteria.map((criterion) => (
          <Card key={criterion.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div>
                    <CardTitle className="text-lg">
                      {editingCriterion?.id === criterion.id ? (
                        <Input
                          value={editingCriterion.name}
                          onChange={(e) => updateEditingField("name", e.target.value)}
                          className="h-8 w-64"
                          data-testid={`input-edit-name-${criterion.id}`}
                        />
                      ) : (
                        <span data-testid={`text-name-${criterion.id}`}>{criterion.name}</span>
                      )}
                    </CardTitle>
                    <CardDescription className="flex items-center space-x-2 mt-1">
                      {editingCriterion?.id === criterion.id ? (
                        <Input
                          value={editingCriterion.fieldName}
                          onChange={(e) => updateEditingField("fieldName", e.target.value)}
                          className="h-6 w-40 text-xs"
                          data-testid={`input-edit-fieldname-${criterion.id}`}
                        />
                      ) : (
                        <code className="text-xs bg-muted px-1 py-0.5 rounded" data-testid={`text-fieldname-${criterion.id}`}>
                          {criterion.fieldName}
                        </code>
                      )}
                      <Badge variant={criterion.isActive ? "default" : "secondary"} data-testid={`badge-status-${criterion.id}`}>
                        {criterion.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </CardDescription>
                  </div>
                </div>
                
                {/* Mobile: Dropdown Menu */}
                <div className="md:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`button-actions-menu-${criterion.id}`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {editingCriterion?.id === criterion.id ? (
                        <>
                          <DropdownMenuItem
                            onClick={() => handleUpdate(editingCriterion)}
                            disabled={updateMutation.isPending}
                            data-testid={`menu-save-${criterion.id}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Guardar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={cancelEditing}
                            data-testid={`menu-cancel-${criterion.id}`}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancelar
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => startEditing(criterion)}
                          data-testid={`menu-edit-${criterion.id}`}
                        >
                          <Settings2 className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleMove(criterion, "up")}
                        disabled={criteria.findIndex((c) => c.id === criterion.id) === 0}
                        data-testid={`menu-move-up-${criterion.id}`}
                      >
                        <ArrowUp className="h-4 w-4 mr-2" />
                        Mover Arriba
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleMove(criterion, "down")}
                        disabled={criteria.findIndex((c) => c.id === criterion.id) === criteria.length - 1}
                        data-testid={`menu-move-down-${criterion.id}`}
                      >
                        <ArrowDown className="h-4 w-4 mr-2" />
                        Mover Abajo
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteDialogOpen(criterion.id)}
                        className="text-destructive focus:text-destructive"
                        data-testid={`menu-delete-${criterion.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Desktop: All Buttons */}
                <div className="hidden md:flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMove(criterion, "up")}
                    disabled={criteria.findIndex((c) => c.id === criterion.id) === 0}
                    data-testid={`button-move-up-${criterion.id}`}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMove(criterion, "down")}
                    disabled={criteria.findIndex((c) => c.id === criterion.id) === criteria.length - 1}
                    data-testid={`button-move-down-${criterion.id}`}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  
                  {editingCriterion?.id === criterion.id ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdate(editingCriterion)}
                        disabled={updateMutation.isPending}
                        data-testid={`button-save-${criterion.id}`}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelEditing}
                        data-testid={`button-cancel-edit-${criterion.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(criterion)}
                      data-testid={`button-edit-${criterion.id}`}
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(criterion.id)}
                    data-testid={`button-delete-${criterion.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Delete Confirmation Dialog */}
                <AlertDialog 
                  open={deleteDialogOpen === criterion.id} 
                  onOpenChange={(open) => !open && setDeleteDialogOpen(null)}
                >
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar criterio?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Se eliminará permanentemente el criterio
                        "{criterion.name}" del sistema.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel 
                        onClick={() => setDeleteDialogOpen(null)}
                        data-testid={`button-cancel-delete-${criterion.id}`}
                      >
                        Cancelar
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          deleteMutation.mutate(criterion.id);
                          setDeleteDialogOpen(null);
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        data-testid={`button-confirm-delete-${criterion.id}`}
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Descripción</Label>
                  {editingCriterion?.id === criterion.id ? (
                    <Textarea
                      value={editingCriterion.description || ""}
                      onChange={(e) => updateEditingField("description", e.target.value)}
                      className="mt-1"
                      data-testid={`textarea-edit-description-${criterion.id}`}
                    />
                  ) : (
                    <p className="text-sm mt-1" data-testid={`text-description-${criterion.id}`}>
                      {criterion.description || "Sin descripción"}
                    </p>
                  )}
                </div>

                {editingCriterion?.id === criterion.id && (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`edit-isActive-${criterion.id}`}
                      checked={editingCriterion.isActive}
                      onCheckedChange={(checked) => updateEditingField("isActive", checked)}
                      data-testid={`switch-edit-active-${criterion.id}`}
                    />
                    <Label htmlFor={`edit-isActive-${criterion.id}`}>Activo</Label>
                  </div>
                )}

                {editingCriterion?.id === criterion.id && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Descripciones de Niveles</Label>
                    <div className="grid gap-2">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div key={level} className="space-y-1">
                          <Label className="text-xs text-muted-foreground">
                            Nivel {level} ({level === 1 ? "Muy Bajo" : level === 2 ? "Bajo" : level === 3 ? "Moderado" : level === 4 ? "Alto" : "Muy Alto"})
                          </Label>
                          <Input
                            value={editingCriterion[`level${level}Description` as keyof ImpactCriterion] as string || ""}
                            onChange={(e) => updateEditingField(`level${level}Description` as keyof ImpactCriterion, e.target.value)}
                            placeholder={`Descripción del nivel ${level}...`}
                            data-testid={`input-edit-level${level}-${criterion.id}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {criteria.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay criterios de impacto</h3>
            <p className="text-muted-foreground text-center mb-4">
              Comienza creando tu primer criterio de impacto para evaluar los riesgos.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-criterion">
              <Plus className="h-4 w-4 mr-2" />
              Crear Primer Criterio
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}