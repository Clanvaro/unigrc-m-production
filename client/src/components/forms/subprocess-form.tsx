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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FormDescription } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertSubprocesoSchema, type Subproceso, type InsertSubproceso, type ProcessOwner } from "@shared/schema";
import { useEffect, useState } from "react";

interface SubprocessFormProps {
  subproceso?: Subproceso;
  procesoId?: string;
  onSuccess?: () => void;
}

export default function SubprocessForm({ subproceso, procesoId, onSuccess }: SubprocessFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!subproceso;
  const [isCreateOwnerDialogOpen, setIsCreateOwnerDialogOpen] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [newOwnerPosition, setNewOwnerPosition] = useState("");

  // Fetch process owners
  const { data: processOwners = [] } = useQuery<ProcessOwner[]>({
    queryKey: ["/api/process-owners"],
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Transform process owners for combobox
  const processOwnerOptions: ComboboxOption[] = processOwners
    .filter(owner => owner.isActive)
    .map((owner) => ({
      value: owner.id,
      label: owner.name,
      description: owner.position || undefined,
    }));

  // Fetch proceso for inheriting owner when creating new subprocess
  const { data: proceso } = useQuery<any>({
    queryKey: ["/api/processes", procesoId],
    enabled: !!procesoId && !subproceso, // Only fetch when creating new subprocess
  });

  const form = useForm<InsertSubproceso>({
    resolver: zodResolver(insertSubprocesoSchema),
    defaultValues: {
      name: subproceso?.name || "",
      description: subproceso?.description ?? "",
      ownerId: subproceso?.ownerId || undefined, // Will be set via useEffect when proceso loads
      procesoId: subproceso?.procesoId || procesoId || "",
    },
  });

  // Mutation para crear nuevo responsable
  const createOwnerMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; position: string }) => {
      return await apiRequest("/api/process-owners", "POST", data);
    },
    onSuccess: async (newOwner) => {
      // Esperar a que termine el refetch antes de seleccionar
      await queryClient.refetchQueries({ queryKey: ["/api/process-owners"] });
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
    mutationFn: (data: InsertSubproceso) => {
      if (isEditing) {
        return apiRequest(`/api/subprocesos/${subproceso.id}`, "PUT", data);
      } else {
        return apiRequest("/api/subprocesos", "POST", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subprocesos"] });
      toast({
        title: isEditing ? "Subproceso actualizado" : "Subproceso creado",
        description: isEditing 
          ? "El subproceso ha sido actualizado exitosamente."
          : "El subproceso ha sido creado exitosamente.",
      });
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: isEditing 
          ? "No se pudo actualizar el subproceso."
          : "No se pudo crear el subproceso.",
        variant: "destructive",
      });
    },
  });

  // Set owner from proceso when creating new subprocess
  useEffect(() => {
    if (!subproceso && proceso?.ownerId && !form.getValues('ownerId')) {
      form.setValue('ownerId', proceso.ownerId);
    }
  }, [proceso, subproceso, form]);

  const onSubmit = (data: InsertSubproceso) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Subproceso</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ej: Monitoreo de amenazas" 
                  {...field} 
                  data-testid="input-subprocess-name"
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
                  placeholder="Describe el objetivo y alcance del subproceso"
                  {...field}
                  value={field.value || ""}
                  data-testid="textarea-subprocess-description"
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
                    data-testid="combobox-subprocess-owner"
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
                Selecciona la persona responsable de este subproceso
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button
            type="submit"
            disabled={mutation.isPending}
            data-testid="button-submit-subprocess"
          >
            {mutation.isPending ? "Guardando..." : isEditing ? "Actualizar" : "Crear"} Subproceso
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