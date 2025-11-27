import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertMacroprocesoSchema, updateMacroprocesoSchema, type Macroproceso, type InsertMacroproceso, type UpdateMacroproceso, type FiscalEntity, type ProcessOwner } from "@shared/schema";
import React, { useState, useEffect } from "react";

interface MacroprocesoFormProps {
  macroproceso?: Macroproceso;
  onSuccess?: () => void;
}

export default function MacroprocesoForm({ macroproceso, onSuccess }: MacroprocesoFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!macroproceso;
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [isCreateOwnerDialogOpen, setIsCreateOwnerDialogOpen] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [newOwnerPosition, setNewOwnerPosition] = useState("");

  // Fetch fiscal entities
  const { data: fiscalEntities = [] } = useQuery<FiscalEntity[]>({
    queryKey: ["/api/fiscal-entities"],
  });

  // Fetch process owners
  const { data: processOwners = [] } = useQuery<ProcessOwner[]>({
    queryKey: ["/api/process-owners"],
  });

  // Fetch gerencias
  const { data: gerencias = [] } = useQuery<{ id: string; code: string; name: string }[]>({
    queryKey: ["/api/gerencias"],
  });

  // Transform process owners for combobox
  const processOwnerOptions: ComboboxOption[] = processOwners
    .filter(owner => owner.isActive)
    .map((owner) => ({
      value: owner.id,
      label: owner.name,
      description: `${owner.position || 'Sin cargo'} (${owner.email})`,
    }));

  // Transform gerencias for combobox
  const gerenciaOptions: ComboboxOption[] = gerencias.map((gerencia) => ({
    value: gerencia.id,
    label: gerencia.name,
    description: gerencia.code,
  }));

  const form = useForm<UpdateMacroproceso>({
    resolver: zodResolver(isEditing ? updateMacroprocesoSchema : insertMacroprocesoSchema),
    defaultValues: {
      name: macroproceso?.name || "",
      description: macroproceso?.description || "",
      type: macroproceso?.type || "clave",
      entityScope: macroproceso?.entityScope || "transversal",
      fiscalEntityId: macroproceso?.fiscalEntityId || undefined,
      ownerId: macroproceso?.ownerId || undefined,
      gerenciaId: macroproceso?.gerenciaId || undefined,
    },
  });

  // Load selected entities for selective scope when editing
  useEffect(() => {
    if (macroproceso && macroproceso.entityScope === "selective") {
      // Load the related entities for this macroproceso
      queryClient.fetchQuery({
        queryKey: ["/api/macroprocesos", macroproceso.id, "fiscal-entities"],
      }).then((data: unknown) => {
        const entities = data as { fiscalEntityId: string }[];
        setSelectedEntities(entities.map(e => e.fiscalEntityId));
      }).catch(() => {});
    }
  }, [macroproceso, queryClient]);

  // Mutation para crear nuevo responsable
  const createOwnerMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; position: string }) => {
      return await apiRequest("/api/process-owners", "POST", data);
    },
    onSuccess: (newOwner) => {
      queryClient.invalidateQueries({ queryKey: ["/api/process-owners"] });
      form.setValue("ownerId", newOwner.id);
      setIsCreateOwnerDialogOpen(false);
      setNewOwnerName("");
      setNewOwnerEmail("");
      setNewOwnerPosition("");
      toast({ title: "Responsable creado", description: "El responsable se ha creado exitosamente." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo crear el responsable.", variant: "destructive" });
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertMacroproceso & { selectedEntities?: string[] }) => {
      const { selectedEntities: entities, ...macroprocesoData } = data;
      
      if (isEditing) {
        const result = await apiRequest(`/api/macroprocesos/${macroproceso.id}`, "PUT", macroprocesoData);
        
        // Update selective entities if needed
        if (macroprocesoData.entityScope === "selective" && entities) {
          await apiRequest(`/api/macroprocesos/${macroproceso.id}/fiscal-entities`, "PUT", { fiscalEntityIds: entities });
        }
        
        return result;
      } else {
        const result = await apiRequest("/api/macroprocesos", "POST", macroprocesoData) as unknown as { id: string };
        
        // Add selective entities if needed
        if (macroprocesoData.entityScope === "selective" && entities && result.id) {
          await apiRequest(`/api/macroprocesos/${result.id}/fiscal-entities`, "PUT", { fiscalEntityIds: entities });
        }
        
        return result;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/macroprocesos"] });
      toast({
        title: isEditing ? "Macroproceso actualizado" : "Macroproceso creado",
        description: isEditing 
          ? "El macroproceso ha sido actualizado exitosamente."
          : "El macroproceso ha sido creado exitosamente.",
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error("Error creating/updating macroproceso:", error);
      const errorMessage = error?.message || (isEditing 
        ? "No se pudo actualizar el macroproceso."
        : "No se pudo crear el macroproceso.");
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UpdateMacroproceso) => {
    // Include selected entities for selective scope
    const submitData = {
      ...data,
      selectedEntities: data.entityScope === "selective" ? selectedEntities : undefined,
    };
    mutation.mutate(submitData);
  };

  const entityScope = form.watch("entityScope");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Macroproceso</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ej: Gestión Comercial y Marketing" 
                  {...field} 
                  data-testid="input-macroproceso-name"
                  onKeyDown={(e) => { if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") { e.stopPropagation(); } }} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                />
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
                  placeholder="Describe el objetivo y alcance del macroproceso"
                  {...field}
                  value={field.value || ""}
                  data-testid="textarea-macroproceso-description"
                  onKeyDown={(e) => { if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") { e.stopPropagation(); } }} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Macroproceso</FormLabel>
              <Select 
                value={field.value ?? ""} 
                onValueChange={(value) => field.onChange(value || undefined)}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-macroproceso-type">
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="clave">Primaria/Core (Clave)</SelectItem>
                  <SelectItem value="apoyo">Apoyo</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="gerenciaId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gerencia (Opcional)</FormLabel>
              <FormControl>
                <Combobox
                  options={gerenciaOptions}
                  value={field.value ?? ""}
                  placeholder="Seleccione la gerencia (opcional)"
                  searchPlaceholder="Buscar gerencia..."
                  emptyText="No se encontraron gerencias"
                  onValueChange={(value) => field.onChange(value || undefined)}
                  data-testid="combobox-macroproceso-gerencia"
                />
              </FormControl>
              <FormDescription>
                Vincula este macroproceso con una gerencia específica si corresponde
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="entityScope"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Alcance de Entidades</FormLabel>
              <Select 
                value={field.value ?? ""} 
                onValueChange={(value) => {
                  field.onChange(value || undefined);
                  // Clear incompatible fields when scope changes
                  if (value !== "specific") {
                    form.setValue("fiscalEntityId", undefined);
                  }
                  if (value !== "selective") {
                    setSelectedEntities([]);
                  }
                }}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-macroproceso-entity-scope">
                    <SelectValue placeholder="Selecciona el alcance" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="transversal">Transversal (Todas las entidades)</SelectItem>
                  <SelectItem value="specific">Específica (Una entidad)</SelectItem>
                  <SelectItem value="selective">Selectiva (Múltiples entidades)</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Define si el macroproceso aplica a todas las entidades, una específica o múltiples seleccionadas
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {entityScope === "specific" && (
          <FormField
            control={form.control}
            name="fiscalEntityId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Entidad Fiscal</FormLabel>
                <Select 
                  value={field.value ?? ""} 
                  onValueChange={(value) => field.onChange(value || undefined)}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-macroproceso-fiscal-entity">
                      <SelectValue placeholder="Selecciona la entidad" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {fiscalEntities
                      .filter(entity => entity.isActive)
                      .map((entity) => (
                        <SelectItem key={entity.id} value={entity.id}>
                          {entity.name} ({entity.code})
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {entityScope === "selective" && (
          <div>
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Entidades Fiscales Seleccionadas
            </label>
            <div className="grid grid-cols-2 gap-2 mt-2 p-4 border rounded-lg">
              {fiscalEntities
                .filter(entity => entity.isActive)
                .map((entity) => (
                  <div key={entity.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`entity-${entity.id}`}
                      checked={selectedEntities.includes(entity.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedEntities(prev => [...prev, entity.id]);
                        } else {
                          setSelectedEntities(prev => prev.filter(id => id !== entity.id));
                        }
                      }}
                      data-testid={`checkbox-entity-${entity.id}`}
                    />
                    <label
                      htmlFor={`entity-${entity.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {entity.name} ({entity.code})
                    </label>
                  </div>
                ))
              }
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Selecciona las entidades fiscales donde aplica este macroproceso
            </p>
          </div>
        )}

        <FormField
          control={form.control}
          name="ownerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dueño Responsable</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <Combobox
                    options={processOwnerOptions}
                    value={field.value ?? ""}
                    placeholder="Seleccione el responsable"
                    searchPlaceholder="Buscar por nombre o cargo..."
                    emptyText="No se encontraron responsables"
                    onValueChange={(value) => field.onChange(value || undefined)}
                    data-testid="combobox-macroproceso-owner"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreateOwnerDialogOpen(true)}
                    className="w-full"
                    data-testid="button-create-owner"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crear nuevo responsable
                  </Button>
                </div>
              </FormControl>
              <FormDescription>
                Selecciona la persona responsable de este macroproceso
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="submit"
            disabled={mutation.isPending}
            data-testid="button-submit-macroproceso"
          >
            {mutation.isPending ? "Guardando..." : (isEditing ? "Actualizar" : "Crear")} Macroproceso
          </Button>
        </div>
      </form>

      {/* Diálogo para crear nuevo responsable */}
      <Dialog open={isCreateOwnerDialogOpen} onOpenChange={setIsCreateOwnerDialogOpen}>
        <DialogContent data-testid="dialog-create-owner">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Responsable</DialogTitle>
            <DialogDescription>
              Agregue un nuevo responsable de proceso al sistema
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre Completo *</label>
              <Input
                value={newOwnerName}
                onChange={(e) => setNewOwnerName(e.target.value)}
                placeholder="Ej: Juan Pérez"
                data-testid="input-owner-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email *</label>
              <Input
                type="email"
                value={newOwnerEmail}
                onChange={(e) => setNewOwnerEmail(e.target.value)}
                placeholder="Ej: juan.perez@empresa.com"
                data-testid="input-owner-email"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Cargo *</label>
              <Input
                value={newOwnerPosition}
                onChange={(e) => setNewOwnerPosition(e.target.value)}
                placeholder="Ej: Gerente de Operaciones"
                data-testid="input-owner-position"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOwnerDialogOpen(false)}
                disabled={createOwnerMutation.isPending}
                data-testid="button-cancel-create-owner"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!newOwnerName || !newOwnerEmail || !newOwnerPosition) {
                    toast({
                      title: "Campos requeridos",
                      description: "Por favor complete todos los campos",
                      variant: "destructive"
                    });
                    return;
                  }
                  createOwnerMutation.mutate({
                    name: newOwnerName,
                    email: newOwnerEmail,
                    position: newOwnerPosition,
                  });
                }}
                disabled={createOwnerMutation.isPending}
                data-testid="button-submit-create-owner"
              >
                {createOwnerMutation.isPending ? "Creando..." : "Crear Responsable"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Form>
  );
}