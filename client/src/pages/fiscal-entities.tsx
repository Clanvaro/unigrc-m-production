import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Building2, Edit, Trash2 } from "lucide-react";
import { FiscalEntityForm } from "@/components/forms/fiscal-entity-form";
import type { FiscalEntity } from "@shared/schema";

export default function FiscalEntitiesPage() {
  const [selectedEntity, setSelectedEntity] = useState<FiscalEntity | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteEntityId, setDeleteEntityId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: entities = [], isLoading } = useQuery<FiscalEntity[]>({
    queryKey: ["/api/fiscal-entities"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (entityId: string) => {
      await apiRequest(`/api/fiscal-entities/${entityId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fiscal-entities"] });
      toast({
        title: "Entidad eliminada",
        description: "La entidad fiscal ha sido eliminada exitosamente.",
      });
      setDeleteEntityId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la entidad fiscal.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (entity: FiscalEntity) => {
    setSelectedEntity(entity);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedEntity(null);
    setDialogOpen(true);
  };

  const handleDelete = (entityId: string) => {
    setDeleteEntityId(entityId);
  };

  const confirmDelete = () => {
    if (deleteEntityId) {
      deleteMutation.mutate(deleteEntityId);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "matriz":
        return "destructive";
      case "filial":
        return "secondary";
      case "otra":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type.toLowerCase()) {
      case "matriz":
        return "Matriz";
      case "filial":
        return "Filial";
      case "otra":
        return "Otra";
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2" data-testid="page-title">Entidades Fiscales</h1>
          <p className="text-muted-foreground">
            Administra las entidades fiscales que conforman tu grupo empresarial
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreate} data-testid="button-create-entity">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Entidad
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedEntity ? "Editar Entidad Fiscal" : "Nueva Entidad Fiscal"}
              </DialogTitle>
              <DialogDescription>
                {selectedEntity 
                  ? "Modifica la información de la entidad fiscal."
                  : "Crea una nueva entidad fiscal para tu grupo empresarial."
                }
              </DialogDescription>
            </DialogHeader>
            <FiscalEntityForm 
              entity={selectedEntity} 
              onClose={() => setDialogOpen(false)} 
            />
          </DialogContent>
        </Dialog>
      </div>

      {entities.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="text-lg mb-2">No hay entidades fiscales</CardTitle>
            <CardDescription>
              Comienza creando tu primera entidad fiscal del grupo empresarial.
            </CardDescription>
            <Button className="mt-4" onClick={handleCreate} data-testid="button-create-first-entity">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Entidad
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entities.map((entity) => (
            <Card key={entity.id} className={`${!entity.isActive ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium">{entity.code}</CardTitle>
                      <Badge variant={getTypeColor(entity.type)} className="text-xs mt-1">
                        {getTypeLabel(entity.type)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(entity)}
                      data-testid={`button-edit-${entity.id}`}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(entity.id)}
                      data-testid={`button-delete-${entity.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <h3 className="font-medium text-sm" data-testid={`entity-name-${entity.id}`}>
                    {entity.name}
                  </h3>
                  {entity.taxId && (
                    <p className="text-xs text-muted-foreground">
                      RUT: {entity.taxId}
                    </p>
                  )}
                  {entity.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {entity.description}
                    </p>
                  )}
                  {!entity.isActive && (
                    <Badge variant="outline" className="text-xs">
                      Inactiva
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteEntityId} onOpenChange={() => setDeleteEntityId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente la entidad fiscal y todas sus relaciones
              con macroprocesos y procesos. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}