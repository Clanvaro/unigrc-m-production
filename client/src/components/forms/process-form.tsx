import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { insertProcessSchema, type Process, type Macroproceso, type FiscalEntity, type ProcessOwner, type Gerencia } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { z } from "zod";
import { useState, useEffect } from "react";

type ProcessFormData = z.infer<typeof insertProcessSchema>;

interface ProcessFormProps {
  process?: Process;
  macroprocesoId?: string;
  onSuccess?: () => void;
}

export default function ProcessForm({ process, macroprocesoId, onSuccess }: ProcessFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch gerencias
  const { data: gerencias = [] } = useQuery<Gerencia[]>({
    queryKey: ["/api/gerencias"],
  });

  // Transform process owners for combobox
  const processOwnerOptions: ComboboxOption[] = processOwners
    .filter(owner => owner.isActive)
    .map((owner) => ({
      value: owner.id,
      label: owner.name,
      description: owner.position || undefined,
    }));

  // Transform gerencias for combobox (incluye opción "Sin gerencia")
  const gerenciaOptions: ComboboxOption[] = [
    { value: "", label: "Sin gerencia", description: "No asociar a ninguna gerencia" },
    ...gerencias
      .filter(g => g.status === 'active')
      .map((gerencia) => ({
        value: gerencia.id,
        label: gerencia.name,
        description: gerencia.code,
      }))
  ];

  // Fetch macroproceso for inheriting owner when creating new process
  const { data: macroproceso } = useQuery<any>({
    queryKey: ["/api/macroprocesos", macroprocesoId],
    enabled: !!macroprocesoId && !process, // Only fetch when creating new process
  });

  const form = useForm<ProcessFormData>({
    resolver: zodResolver(insertProcessSchema),
    defaultValues: {
      code: process?.code || "",
      name: process?.name || "",
      description: process?.description || "",
      ownerId: process?.ownerId || undefined, // Will be set via useEffect when macroproceso loads
      macroprocesoId: process?.macroprocesoId || macroprocesoId || "",
      gerenciaId: process?.gerenciaId || undefined,
      entityScope: process?.entityScope || "transversal",
      fiscalEntityId: process?.fiscalEntityId || undefined,
    },
  });

  // Load selected entities for selective scope when editing
  useEffect(() => {
    if (process && process.entityScope === "selective") {
      // Load the related entities for this process
      queryClient.fetchQuery({
        queryKey: ["/api/processes", process.id, "fiscal-entities"],
      }).then((data: unknown) => {
        const entities = data as { fiscalEntityId: string }[];
        setSelectedEntities(entities.map(e => e.fiscalEntityId));
      }).catch(() => {});
    }
  }, [process, queryClient]);

  // Set owner from macroproceso when creating new process
  useEffect(() => {
    if (!process && macroproceso?.ownerId && !form.getValues('ownerId')) {
      form.setValue('ownerId', macroproceso.ownerId);
    }
  }, [macroproceso, process, form]);

  // Mutation para crear nuevo responsable (con optimistic update)
  const createOwnerMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; position: string }) => {
      return await apiRequest("/api/process-owners", "POST", data);
    },
    onSuccess: (newOwner) => {
      // Optimistic update: agregar al cache inmediatamente
      queryClient.setQueryData<ProcessOwner[]>(["/api/process-owners"], (old = []) => [
        ...old,
        { ...newOwner, isActive: true }
      ]);
      // Seleccionar el nuevo responsable
      form.setValue("ownerId", newOwner.id);
      setIsCreateOwnerDialogOpen(false);
      setNewOwnerName("");
      setNewOwnerEmail("");
      setNewOwnerPosition("");
      toast({ title: "Responsable creado", description: "El responsable se ha creado exitosamente." });
      // Refetch en background para sincronizar
      queryClient.invalidateQueries({ queryKey: ["/api/process-owners"] });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo crear el responsable.", variant: "destructive" });
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ProcessFormData & { selectedEntities?: string[] }) => {
      const { selectedEntities: entities, ...processData } = data;
      
      if (process) {
        const result = await apiRequest(`/api/processes/${process.id}`, "PUT", processData);
        
        // Update selective entities if needed
        if (processData.entityScope === "selective" && entities) {
          await apiRequest(`/api/processes/${process.id}/fiscal-entities`, "PUT", { fiscalEntityIds: entities });
        }
        
        return result;
      } else {
        const result = await apiRequest("/api/processes", "POST", processData) as unknown as Process;
        
        // Add selective entities if needed
        if (processData.entityScope === "selective" && entities && result.id) {
          await apiRequest(`/api/processes/${result.id}/fiscal-entities`, "PUT", { fiscalEntityIds: entities });
        }
        
        return result;
      }
    },
    // Optimistic update for creating new processes
    onMutate: async (data) => {
      if (!process) {
        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey: ["/api/processes/basic"] });
        await queryClient.cancelQueries({ queryKey: ["/api/processes"] });
        await queryClient.cancelQueries({ queryKey: ["/api/macroprocesos"] });

        // Snapshot previous values
        const previousProcessesBasic = queryClient.getQueryData<Process[]>(["/api/processes/basic"]);
        const previousProcesses = queryClient.getQueryData<Process[]>(["/api/processes"]);
        const previousMacroprocesos = queryClient.getQueryData<Macroproceso[]>(["/api/macroprocesos"]);

        // Optimistically update processes list
        const optimisticProcess: Process = {
          id: `temp-${Date.now()}`,
          code: data.code || "",
          name: data.name,
          description: data.description || null,
          ownerId: data.ownerId || null,
          macroprocesoId: data.macroprocesoId || null,
          gerenciaId: data.gerenciaId || null,
          fiscalEntityId: data.fiscalEntityId || null,
          entityScope: data.entityScope || "transversal",
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: "current-user",
          deletedAt: null,
          deletedBy: null,
          deletionReason: null,
          updatedBy: null,
        };

        if (previousProcessesBasic) {
          queryClient.setQueryData<Process[]>(["/api/processes/basic"], [...previousProcessesBasic, optimisticProcess]);
        }
        if (previousProcesses) {
          queryClient.setQueryData<Process[]>(["/api/processes"], [...previousProcesses, optimisticProcess]);
        }

        return { previousProcessesBasic, previousProcesses, previousMacroprocesos };
      }
    },
    onSuccess: (result) => {
      // Invalidate and refetch to get the real data from server
      queryClient.invalidateQueries({ queryKey: ["/api/processes"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["/api/processes/basic"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["/api/macroprocesos"], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["/api/risks/page-data-lite"], refetchType: 'all' });
      
      toast({
        title: process ? "Proceso actualizado" : "Proceso creado",
        description: `El proceso ha sido ${process ? "actualizado" : "creado"} exitosamente.`,
      });
      onSuccess?.();
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousProcessesBasic) {
        queryClient.setQueryData(["/api/processes/basic"], context.previousProcessesBasic);
      }
      if (context?.previousProcesses) {
        queryClient.setQueryData(["/api/processes"], context.previousProcesses);
      }
      if (context?.previousMacroprocesos) {
        queryClient.setQueryData(["/api/macroprocesos"], context.previousMacroprocesos);
      }
      
      toast({
        title: "Error",
        description: `No se pudo ${process ? "actualizar" : "crear"} el proceso.`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProcessFormData) => {
    console.log("Form submitted with data:", data);
    console.log("Form errors:", form.formState.errors);
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
      <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
        console.log("Form validation failed with errors:", errors);
      })} className="space-y-4" data-testid="process-form">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código del Proceso</FormLabel>
              <FormControl>
                <Input placeholder="Ej: PROC-001" {...field} data-testid="input-process-code" onKeyDown={(e) => { if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") { e.stopPropagation(); } }} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Proceso</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Gestión de Ventas" {...field} data-testid="input-process-name" onKeyDown={(e) => { if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") { e.stopPropagation(); } }} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} />
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
                  placeholder="Describe el proceso de negocio..." 
                  {...field} 
                  value={field.value || ""}
                  data-testid="input-process-description"
                  onKeyDown={(e) => { if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") { e.stopPropagation(); } }} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                    value={field.value || ""}
                    placeholder="Seleccione el responsable"
                    searchPlaceholder="Buscar por nombre o cargo..."
                    emptyText="No se encontraron responsables"
                    onValueChange={(value) => field.onChange(value || undefined)}
                    data-testid="combobox-process-owner"
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
                Selecciona la persona responsable de este proceso
              </FormDescription>
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
                  value={field.value || ""}
                  placeholder="Seleccione la gerencia"
                  searchPlaceholder="Buscar por nombre o código..."
                  emptyText="No se encontraron gerencias"
                  onValueChange={(value) => field.onChange(value || undefined)}
                  data-testid="combobox-process-gerencia"
                />
              </FormControl>
              <FormDescription>
                Opcionalmente, asocia este proceso a una gerencia (haz clic en la opción seleccionada para deseleccionarla)
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-process-entity-scope">
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
                Define si el proceso aplica a todas las entidades, una específica o múltiples seleccionadas
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
                <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                  <FormControl>
                    <SelectTrigger data-testid="select-process-fiscal-entity">
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
                      id={`process-entity-${entity.id}`}
                      checked={selectedEntities.includes(entity.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedEntities(prev => [...prev, entity.id]);
                        } else {
                          setSelectedEntities(prev => prev.filter(id => id !== entity.id));
                        }
                      }}
                      data-testid={`checkbox-process-entity-${entity.id}`}
                    />
                    <label
                      htmlFor={`process-entity-${entity.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {entity.name} ({entity.code})
                    </label>
                  </div>
                ))
              }
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Selecciona las entidades fiscales donde aplica este proceso
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button 
            type="submit" 
            disabled={mutation.isPending}
            data-testid="button-submit-process"
          >
            {mutation.isPending ? "Guardando..." : (process ? "Actualizar" : "Crear")}
          </Button>
          <Button 
            type="button" 
            variant="outline"
            onClick={() => onSuccess?.()}
            data-testid="button-cancel-process"
          >
            Cancelar
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
