import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Plus, Palette } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRiskCategoryFormSchema, type RiskCategory } from "@shared/schema";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { z } from "zod";

type CategoryFormData = z.infer<typeof insertRiskCategoryFormSchema>;

const predefinedColors = [
  "#ef4444", // red
  "#f97316", // orange  
  "#f59e0b", // amber
  "#22c55e", // green
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#6b7280", // gray
];

interface CategoryFormProps {
  category?: RiskCategory;
  onSuccess?: () => void;
}

function CategoryForm({ category, onSuccess }: CategoryFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedColor, setSelectedColor] = useState(category?.color || "#6b7280");

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(insertRiskCategoryFormSchema),
    defaultValues: {
      name: category?.name || "",
      description: category?.description || "",
      color: category?.color || "#6b7280",
      isActive: category?.isActive ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: CategoryFormData) => {
      if (category) {
        return apiRequest(`/api/risk-categories/${category.id}`, "PUT", data);
      }
      return apiRequest("/api/risk-categories", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/risk-categories"], exact: true });
      toast({
        title: category ? "Categoría actualizada" : "Categoría creada",
        description: `La categoría ha sido ${category ? "actualizada" : "creada"} exitosamente.`,
      });
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: `No se pudo ${category ? "actualizar" : "crear"} la categoría.`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CategoryFormData) => {
    mutation.mutate({ ...data, color: selectedColor });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="category-form">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la Categoría</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Operacional, Financiero..." {...field} data-testid="input-category-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe el tipo de riesgos que incluye esta categoría..." 
                  {...field} 
                  value={field.value || ""}
                  data-testid="input-category-description"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium">Color de Identificación</label>
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
            {predefinedColors.map((color) => (
              <button
                key={color}
                type="button"
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  selectedColor === color ? "border-primary scale-110" : "border-muted"
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
                data-testid={`color-${color}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-muted-foreground">Vista previa:</span>
            <Badge style={{ backgroundColor: selectedColor, color: "white" }}>
              {form.watch("name") || "Categoría"}
            </Badge>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button 
            type="submit" 
            disabled={mutation.isPending}
            data-testid="button-submit-category"
            className="w-full sm:w-auto"
          >
            {mutation.isPending ? "Guardando..." : category ? "Actualizar" : "Crear"}
          </Button>
          <Button 
            type="button" 
            variant="outline"
            onClick={() => onSuccess?.()}
            data-testid="button-cancel-category"
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function RiskCategoriesPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<RiskCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<RiskCategory | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery<RiskCategory[]>({
    queryKey: ["/api/risk-categories"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/risk-categories/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/risk-categories"], exact: true });
      toast({ 
        title: "Categoría eliminada", 
        description: "La categoría ha sido eliminada exitosamente." 
      });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "No se pudo eliminar la categoría.", 
        variant: "destructive" 
      });
    },
  });

  const handleCreateSuccess = () => {
    setCreateDialogOpen(false);
  };

  const handleEditSuccess = () => {
    setEditingCategory(null);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  // Listen for header button clicks
  useEffect(() => {
    const handleOpenDialog = () => {
      setCreateDialogOpen(true);
    };

    window.addEventListener('openCategoryDialog', handleOpenDialog);
    return () => {
      window.removeEventListener('openCategoryDialog', handleOpenDialog);
    };
  }, []);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Cargando categorías...</div>;
  }

  return (
    <div className="space-y-6">
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md mx-4 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear Nueva Categoría</DialogTitle>
            <DialogDescription>
              Agregar una nueva categoría para clasificar riesgos en el sistema.
            </DialogDescription>
          </DialogHeader>
          <CategoryForm onSuccess={handleCreateSuccess} />
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <Card key={category.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <Badge 
                  style={{ backgroundColor: category.color || "#6b7280", color: "white" }}
                  className="text-sm"
                >
                  {category.name}
                </Badge>
                <div className="flex gap-1 self-end sm:self-auto">
                  <Dialog open={editingCategory?.id === category.id} onOpenChange={(open) => !open && setEditingCategory(null)}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setEditingCategory(category)}
                        data-testid={`button-edit-${category.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md mx-4 sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Editar Categoría</DialogTitle>
                        <DialogDescription>
                          Modificar los detalles de la categoría existente.
                        </DialogDescription>
                      </DialogHeader>
                      <CategoryForm 
                        category={editingCategory!} 
                        onSuccess={handleEditSuccess} 
                      />
                    </DialogContent>
                  </Dialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${category.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro de que quieres eliminar esta categoría?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. La categoría será eliminada permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDelete(category.id)}
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
              <p className="text-sm text-muted-foreground">
                {category.description || "Sin descripción"}
              </p>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Color personalizado</span>
                </div>
                <Badge variant={category.isActive ? "default" : "secondary"}>
                  {category.isActive ? "Activa" : "Inactiva"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}

        {categories.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">No hay categorías configuradas</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setCreateDialogOpen(true)}
            >
              Crear Primera Categoría
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}