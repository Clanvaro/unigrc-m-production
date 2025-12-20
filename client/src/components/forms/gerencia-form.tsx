import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Plus } from "lucide-react";
import { insertGerenciaSchema, type ProcessOwner, type Gerencia } from "@shared/schema";
import type { z } from "zod";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ProcessMultiSelector, { ProcessAssociation } from "@/components/forms/process-multi-selector";

type GerenciaFormData = z.infer<typeof insertGerenciaSchema>;

interface GerenciaFormProps {
  gerencia?: Gerencia;
  onSubmit: (data: GerenciaFormData & { processAssociations: ProcessAssociation[] }) => void;
  onCancel: () => void;
  processOwners: ProcessOwner[];
  gerencias: Gerencia[]; // Lista de gerencias para seleccionar padre
  isPending?: boolean;
}

export default function GerenciaForm({ gerencia, onSubmit, onCancel, processOwners, gerencias, isPending }: GerenciaFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedManagerId, setSelectedManagerId] = useState<string>(gerencia?.managerId || "");
  const [isCreateManagerDialogOpen, setIsCreateManagerDialogOpen] = useState(false);
  const [newManagerName, setNewManagerName] = useState("");
  const [newManagerEmail, setNewManagerEmail] = useState("");
  const [newManagerPosition, setNewManagerPosition] = useState("");
  const [processAssociations, setProcessAssociations] = useState<ProcessAssociation[]>([]);
  const [loadingAssociations, setLoadingAssociations] = useState(false);

  const form = useForm<GerenciaFormData>({
    resolver: zodResolver(insertGerenciaSchema),
    defaultValues: {
      name: gerencia?.name || "",
      description: gerencia?.description || "",
      managerId: gerencia?.managerId || undefined,
      parentId: gerencia?.parentId || undefined,
      level: (gerencia?.level || "gerencia") as "gerencia" | "subgerencia" | "jefatura",
      status: gerencia?.status || "active",
    },
  });

  // Cargar asociaciones existentes cuando se edita una gerencia
  useEffect(() => {
    if (gerencia?.id) {
      setLoadingAssociations(true);
      Promise.all([
        apiRequest(`/api/gerencias/${gerencia.id}/macroprocesos`, "GET"),
        apiRequest(`/api/gerencias/${gerencia.id}/processes`, "GET"),
        apiRequest(`/api/gerencias/${gerencia.id}/subprocesos`, "GET"),
      ])
        .then(([macros, processes, subprocesos]) => {
          const associations: ProcessAssociation[] = [];

          // Agregar asociaciones de macroprocesos
          macros.forEach((macro: any) => {
            associations.push({ macroprocesoId: macro.id });
          });

          // Agregar asociaciones de procesos
          processes.forEach((process: any) => {
            associations.push({ processId: process.id });
          });

          // Agregar asociaciones de subprocesos
          subprocesos.forEach((subproceso: any) => {
            associations.push({ subprocesoId: subproceso.id });
          });

          setProcessAssociations(associations);
        })
        .catch((error) => {
          console.error("Error loading process associations:", error);
        })
        .finally(() => {
          setLoadingAssociations(false);
        });
    }
  }, [gerencia?.id]);

  // Filtrar gerencias disponibles según el nivel seleccionado
  const selectedLevel = form.watch("level");
  const availableParents = (gerencias || []).filter(g => {
    // Excluir la gerencia que se está editando para evitar referencias circulares
    if (gerencia && g.id === gerencia.id) return false;

    if (selectedLevel === "gerencia") return g.level === "gerencia"; // Gerencias pueden depender de otras gerencias
    if (selectedLevel === "subgerencia") return g.level === "gerencia"; // Subgerencias dependen de gerencias
    if (selectedLevel === "jefatura") return g.level === "gerencia" || g.level === "subgerencia"; // Jefaturas dependen de gerencias o subgerencias
    return true;
  });

  // Transform process owners for combobox
  const managerOptions: ComboboxOption[] = processOwners.map((owner) => ({
    value: owner.id,
    label: owner.name,
    description: owner.position || undefined,
  }));

  // Mutation para crear nuevo responsable
  const createManagerMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; position: string }) => {
      return await apiRequest("/api/process-owners", "POST", data);
    },
    onSuccess: async (newManager) => {
      // Esperar a que termine el refetch antes de seleccionar
      await queryClient.refetchQueries({ queryKey: ["/api/process-owners"] });
      form.setValue("managerId", newManager.id);
      setSelectedManagerId(newManager.id);
      setIsCreateManagerDialogOpen(false);
      setNewManagerName("");
      setNewManagerEmail("");
      setNewManagerPosition("");
      toast({ title: "Responsable creado", description: "El responsable se ha creado exitosamente." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo crear el responsable.", variant: "destructive" });
    },
  });

  const handleFormSubmit = (data: GerenciaFormData) => {
    onSubmit({
      ...data,
      processAssociations,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4" data-testid="gerencia-form">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la Gerencia</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Gerencia de Operaciones" {...field} data-testid="input-gerencia-name" onKeyDown={(e) => { if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") { e.stopPropagation(); } }} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => {
            const { value, ...restField } = field;
            return (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe el propósito y alcance de la gerencia..."
                    {...restField}
                    value={value || ""}
                    data-testid="input-gerencia-description"
                    onKeyDown={(e) => { if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") { e.stopPropagation(); } }} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <ProcessMultiSelector
          value={processAssociations}
          onChange={setProcessAssociations}
          maxAssociations={10}
        />

        <FormField
          control={form.control}
          name="level"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Unidad</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-gerencia-level">
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="gerencia">Gerencia</SelectItem>
                  <SelectItem value="subgerencia">Subgerencia</SelectItem>
                  <SelectItem value="jefatura">Jefatura</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Define el nivel jerárquico de esta unidad
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="parentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Depende de (Opcional)</FormLabel>
              <Select
                onValueChange={(value) => {
                  // Si selecciona "none", establecer parentId como undefined/null
                  field.onChange(value === "none" ? undefined : value);
                }}
                value={field.value || "none"}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-gerencia-parent">
                    <SelectValue placeholder={
                      selectedLevel === "gerencia"
                        ? "Selecciona la gerencia superior (opcional)"
                        : selectedLevel === "subgerencia"
                          ? "Selecciona la gerencia superior"
                          : "Selecciona la gerencia o subgerencia superior"
                    } />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Sin gerencia superior (nivel raíz)</SelectItem>
                  {availableParents.map((parent) => (
                    <SelectItem key={parent.id} value={parent.id}>
                      {parent.code} - {parent.name} ({parent.level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {selectedLevel === "gerencia"
                  ? "Define si esta gerencia depende de otra gerencia superior. Déjalo vacío si es de nivel raíz."
                  : selectedLevel === "subgerencia"
                    ? "Selecciona la gerencia de la cual depende esta subgerencia"
                    : "Selecciona la gerencia o subgerencia de la cual depende esta jefatura"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="managerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gerente/Jefe Responsable (Opcional)</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <Combobox
                    options={managerOptions}
                    value={field.value || ""}
                    placeholder="Seleccione el responsable"
                    searchPlaceholder="Buscar por nombre o cargo..."
                    emptyText="No se encontraron responsables"
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Clear local state when form updates to keep them in sync
                      if (selectedManagerId !== value) {
                        setSelectedManagerId(value);
                      }
                    }}
                    data-testid="combobox-gerencia-manager"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreateManagerDialogOpen(true)}
                    className="w-full"
                    data-testid="button-create-manager"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crear nuevo responsable
                  </Button>
                </div>
              </FormControl>
              <FormDescription>
                Responsable de la gestión de esta unidad
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estado</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-gerencia-status">
                    <SelectValue placeholder="Selecciona el estado" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Activa</SelectItem>
                  <SelectItem value="inactive">Inactiva</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
            data-testid="button-cancel-gerencia"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            data-testid="button-submit-gerencia"
          >
            {isPending ? "Guardando..." : gerencia ? "Actualizar" : "Crear"}
          </Button>
        </div>
      </form>

      {/* Diálogo para crear nuevo responsable */}
      <Dialog open={isCreateManagerDialogOpen} onOpenChange={setIsCreateManagerDialogOpen}>
        <DialogContent data-testid="dialog-create-manager">
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
                value={newManagerName}
                onChange={(e) => setNewManagerName(e.target.value)}
                placeholder="Ej: Juan Pérez"
                data-testid="input-manager-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email *</label>
              <Input
                type="email"
                value={newManagerEmail}
                onChange={(e) => setNewManagerEmail(e.target.value)}
                placeholder="Ej: juan.perez@empresa.com"
                data-testid="input-manager-email"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Cargo *</label>
              <Input
                value={newManagerPosition}
                onChange={(e) => setNewManagerPosition(e.target.value)}
                placeholder="Ej: Gerente de Operaciones"
                data-testid="input-manager-position"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateManagerDialogOpen(false)}
                disabled={createManagerMutation.isPending}
                data-testid="button-cancel-create-manager"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!newManagerName || !newManagerEmail || !newManagerPosition) {
                    toast({
                      title: "Campos requeridos",
                      description: "Por favor complete todos los campos",
                      variant: "destructive"
                    });
                    return;
                  }
                  createManagerMutation.mutate({
                    name: newManagerName,
                    email: newManagerEmail,
                    position: newManagerPosition,
                  });
                }}
                disabled={createManagerMutation.isPending}
                data-testid="button-submit-create-manager"
              >
                {createManagerMutation.isPending ? "Creando..." : "Crear Responsable"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
