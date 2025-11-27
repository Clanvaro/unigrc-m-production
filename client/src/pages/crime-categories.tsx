import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Filter, FolderTree, Tag } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { insertCrimeCategorySchema } from "@shared/schema";

type CrimeCategory = {
  id: string;
  name: string;
  code: string;
  description?: string;
  parentCategoryId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const crimeCategoryFormSchema = insertCrimeCategorySchema.extend({
  parentCategoryId: z.string().optional(),
});

export default function CrimeCategories() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CrimeCategory | null>(null);
  const [filter, setFilter] = useState({
    search: "",
    parentId: "",
    activeOnly: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: categories = [], isLoading } = useQuery<CrimeCategory[]>({
    queryKey: ["/api/crime-categories"],
  });

  // Form
  const form = useForm<z.infer<typeof crimeCategoryFormSchema>>({
    resolver: zodResolver(crimeCategoryFormSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      parentCategoryId: "",
      isActive: true,
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof crimeCategoryFormSchema>) =>
      apiRequest("/api/crime-categories", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crime-categories"] });
      toast({
        title: "Categoría creada",
        description: "La categoría de delito ha sido creada exitosamente",
      });
      setShowDialog(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error al crear categoría",
        description: "No se pudo crear la categoría de delito",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string } & Partial<CrimeCategory>) =>
      apiRequest(`/api/crime-categories/${data.id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crime-categories"] });
      toast({
        title: "Categoría actualizada",
        description: "La categoría de delito ha sido actualizada exitosamente",
      });
      setShowDialog(false);
      setEditingCategory(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error al actualizar categoría",
        description: "No se pudo actualizar la categoría de delito",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/crime-categories/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crime-categories"] });
      toast({
        title: "Categoría eliminada",
        description: "La categoría de delito ha sido eliminada exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error al eliminar categoría",
        description: "No se pudo eliminar la categoría de delito",
        variant: "destructive",
      });
    },
  });

  // Helpers
  const getParentCategories = () => categories.filter(cat => !cat.parentCategoryId);
  const getSubcategories = (parentId: string) => categories.filter(cat => cat.parentCategoryId === parentId);
  
  const getFilteredCategories = () => {
    return categories.filter(category => {
      if (filter.activeOnly && !category.isActive) return false;
      if (filter.search && !category.name.toLowerCase().includes(filter.search.toLowerCase()) && 
          !category.code.toLowerCase().includes(filter.search.toLowerCase())) return false;
      if (filter.parentId && filter.parentId !== "all" && category.parentCategoryId !== filter.parentId) return false;
      return true;
    });
  };

  const handleEdit = (category: CrimeCategory) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      code: category.code,
      description: category.description || "",
      parentCategoryId: category.parentCategoryId || "",
      isActive: category.isActive,
    });
    setShowDialog(true);
  };

  const handleSubmit = (values: z.infer<typeof crimeCategoryFormSchema>) => {
    const data = {
      ...values,
      parentCategoryId: values.parentCategoryId === "none" ? null : values.parentCategoryId || null,
    };

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleNewCategory = () => {
    setEditingCategory(null);
    form.reset({
      name: "",
      code: "",
      description: "",
      parentCategoryId: "",
      isActive: true,
    });
    setShowDialog(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Categorías de Delitos</h1>
          <p className="text-muted-foreground">
            Gestión de categorías para especialización de encargados de prevención
          </p>
        </div>
        <Button onClick={handleNewCategory} data-testid="button-new-category">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Categoría
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Buscar</label>
              <Input
                placeholder="Nombre o código..."
                value={filter.search}
                onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                data-testid="input-search"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Categoría Padre</label>
              <Select
                value={filter.parentId}
                onValueChange={(value) => setFilter(prev => ({ ...prev, parentId: value === "all" ? "" : value }))}
              >
                <SelectTrigger data-testid="select-parent-filter">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {getParentCategories().map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant={filter.activeOnly ? "default" : "outline"}
                onClick={() => setFilter(prev => ({ ...prev, activeOnly: !prev.activeOnly }))}
                data-testid="button-active-filter"
              >
                {filter.activeOnly ? "Solo Activas" : "Todas"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories Tree View */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Categorías por Jerarquía
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {getParentCategories().map((parentCategory) => (
                <div key={parentCategory.id} className="space-y-2">
                  {/* Parent Category */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Tag className="h-5 w-5 text-primary" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold" data-testid={`text-category-name-${parentCategory.id}`}>
                            {parentCategory.name}
                          </h3>
                          <Badge variant="secondary" data-testid={`badge-category-code-${parentCategory.id}`}>
                            {parentCategory.code}
                          </Badge>
                          {!parentCategory.isActive && (
                            <Badge variant="destructive">Inactiva</Badge>
                          )}
                        </div>
                        {parentCategory.description && (
                          <p className="text-sm text-muted-foreground">
                            {parentCategory.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(parentCategory)}
                        data-testid={`button-edit-category-${parentCategory.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteMutation.mutate(parentCategory.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-category-${parentCategory.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Subcategories */}
                  {getSubcategories(parentCategory.id).map((subCategory) => (
                    <div key={subCategory.id} className="ml-8 flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="w-0.5 h-6 bg-border"></div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium" data-testid={`text-subcategory-name-${subCategory.id}`}>
                              {subCategory.name}
                            </h4>
                            <Badge variant="outline" data-testid={`badge-subcategory-code-${subCategory.id}`}>
                              {subCategory.code}
                            </Badge>
                            {!subCategory.isActive && (
                              <Badge variant="destructive">Inactiva</Badge>
                            )}
                          </div>
                          {subCategory.description && (
                            <p className="text-sm text-muted-foreground">
                              {subCategory.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(subCategory)}
                          data-testid={`button-edit-subcategory-${subCategory.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteMutation.mutate(subCategory.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-subcategory-${subCategory.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {/* Categories without parent */}
              {categories.filter(cat => !cat.parentCategoryId && !getParentCategories().includes(cat)).map((category) => (
                <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Tag className="h-5 w-5 text-primary" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold" data-testid={`text-category-name-${category.id}`}>
                          {category.name}
                        </h3>
                        <Badge variant="secondary" data-testid={`badge-category-code-${category.id}`}>
                          {category.code}
                        </Badge>
                        {!category.isActive && (
                          <Badge variant="destructive">Inactiva</Badge>
                        )}
                      </div>
                      {category.description && (
                        <p className="text-sm text-muted-foreground">
                          {category.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(category)}
                      data-testid={`button-edit-category-${category.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteMutation.mutate(category.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-category-${category.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent data-testid="dialog-category-form">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Editar Categoría" : "Nueva Categoría"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Lavado de Activos" {...field} data-testid="input-category-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input placeholder="LAV_ACT" {...field} data-testid="input-category-code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parentCategoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría Padre (Opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "none"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-parent-category">
                          <SelectValue placeholder="Seleccionar categoría padre" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sin categoría padre</SelectItem>
                        {getParentCategories()
                          .filter(cat => !editingCategory || cat.id !== editingCategory.id)
                          .map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descripción de la categoría..."
                        {...field}
                        data-testid="textarea-category-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-category"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Guardando..."
                    : editingCategory
                    ? "Actualizar"
                    : "Crear"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}