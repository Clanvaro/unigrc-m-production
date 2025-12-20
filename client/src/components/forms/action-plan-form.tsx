import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Plus, ChevronsUpDown, Check, X, Star } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { insertActionSchema, type Action, type ProcessOwner } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { z } from "zod";

// Form schema for action plans (maps 'name' to 'title' field in actions table)
const actionPlanFormSchema = z.object({
  riskId: z.string().optional(),
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  responsible: z.string().optional(),
  dueDate: z.date().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status: z.enum(["pending", "in_progress", "evidence_submitted", "under_review", "completed", "audited", "overdue", "closed", "deleted"]).default("pending"),
  progress: z.number().int().min(0).max(100).default(0),
});

type ActionPlanFormData = z.infer<typeof actionPlanFormSchema>;

interface ActionPlanFormProps {
  actionPlan?: Action;
  defaultRiskId?: string;
  auditFindingId?: string;
  onSuccess?: () => void;
}

export default function ActionPlanForm({ actionPlan, defaultRiskId, auditFindingId, onSuccess }: ActionPlanFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openRiskCombobox, setOpenRiskCombobox] = useState(false);
  const [selectedRiskIds, setSelectedRiskIds] = useState<string[]>(
    actionPlan?.riskId ? [actionPlan.riskId] : defaultRiskId ? [defaultRiskId] : []
  );
  const [isCreateOwnerDialogOpen, setIsCreateOwnerDialogOpen] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [newOwnerPosition, setNewOwnerPosition] = useState("");

  const { data: risksResponse } = useQuery<{ data: any[], pagination: { limit: number, offset: number, total: number } }>({
    queryKey: ["/api/risks"],
  });
  const risks = risksResponse?.data || [];

  const { data: processOwners = [] } = useQuery<ProcessOwner[]>({
    queryKey: ["/api/process-owners"],
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Transform process owners for combobox
  const processOwnerOptions: ComboboxOption[] = processOwners
    .filter(owner => owner.isActive)
    .map((owner) => ({
      value: owner.name, // Action plan saves name, not ID
      label: owner.name,
      description: owner.position || undefined,
    }));

  const form = useForm<ActionPlanFormData>({
    resolver: zodResolver(actionPlanFormSchema),
    defaultValues: {
      riskId: actionPlan?.riskId || defaultRiskId || undefined,
      name: (actionPlan as any)?.title || (actionPlan as any)?.name || "",
      description: actionPlan?.description || "",
      responsible: actionPlan?.responsible || "",
      dueDate: actionPlan?.dueDate ? new Date(actionPlan.dueDate) : undefined,
      priority: (actionPlan?.priority as "low" | "medium" | "high" | "critical") || "medium",
      status: (actionPlan?.status as "pending" | "in_progress" | "evidence_submitted" | "under_review" | "completed" | "audited" | "overdue" | "closed" | "deleted") || "pending",
      progress: actionPlan?.progress || 0,
    },
  });

  const watchedProgress = form.watch("progress");

  // Load associated risks when editing an existing action plan
  useEffect(() => {
    const loadAssociatedRisks = async () => {
      if (actionPlan?.id) {
        try {
          const associations = await apiRequest(`/api/action-plans/${actionPlan.id}/risks`, "GET");
          if (associations && associations.length > 0) {
            // Load all associated risk IDs
            const riskIds = associations.map((assoc: any) => assoc.riskId);
            setSelectedRiskIds(riskIds);
          } else if (actionPlan.riskId) {
            // Fallback to single riskId if no associations found
            setSelectedRiskIds([actionPlan.riskId]);
          }
        } catch (error) {
          // If endpoint fails, fallback to single riskId
          if (actionPlan.riskId) {
            setSelectedRiskIds([actionPlan.riskId]);
          }
        }
      }
    };
    
    loadAssociatedRisks();
  }, [actionPlan?.id, actionPlan?.riskId]);

  // Mutation para crear nuevo responsable
  const createOwnerMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; position: string }) => {
      return await apiRequest("/api/process-owners", "POST", data);
    },
    onSuccess: async (newOwner) => {
      // Esperar a que termine el refetch antes de seleccionar
      await queryClient.refetchQueries({ queryKey: ["/api/process-owners"] });
      form.setValue("responsible", newOwner.name);
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
    mutationFn: async (data: ActionPlanFormData) => {
      if (actionPlan) {
        // Update existing action plan
        const updatedPlan = await apiRequest(`/api/action-plans/${actionPlan.id}`, "PUT", data);
        
        // Get current risk associations
        const currentAssociations = await apiRequest(`/api/action-plans/${actionPlan.id}/risks`, "GET");
        
        // Delete all current associations
        for (const association of currentAssociations) {
          await apiRequest(`/api/action-plans/${actionPlan.id}/risks/${association.riskId}`, "DELETE");
        }
        
        // Add all selected risks as new associations
        for (let i = 0; i < selectedRiskIds.length; i++) {
          await apiRequest(`/api/action-plans/${actionPlan.id}/risks`, "POST", {
            riskId: selectedRiskIds[i],
            isPrimary: i === 0, // First risk is primary
            mitigationStatus: "pending",
            notes: i === 0 ? "Riesgo principal" : null
          });
        }
        
        return updatedPlan;
      } else {
        // Create new action plan with first risk as primary (for backward compatibility)
        const newPlan = await apiRequest("/api/action-plans", "POST", data);
        
        // Add ALL selected risks to the intermediate table (action_plan_risks)
        // First risk is marked as primary, others as secondary
        for (let i = 0; i < selectedRiskIds.length; i++) {
          await apiRequest(`/api/action-plans/${newPlan.id}/risks`, "POST", {
            riskId: selectedRiskIds[i],
            isPrimary: i === 0, // First risk is primary
            mitigationStatus: "pending",
            notes: i === 0 ? "Riesgo principal" : null
          });
        }
        
        return newPlan;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/action-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      // Force refetch dashboard stats immediately
      queryClient.refetchQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: actionPlan ? "Plan de acción actualizado" : "Plan de acción creado",
        description: `El plan de acción ha sido ${actionPlan ? "actualizado" : "creado"} exitosamente.${selectedRiskIds.length > 1 ? ` (${selectedRiskIds.length} riesgos asociados)` : ''}`,
      });
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: `No se pudo ${actionPlan ? "actualizar" : "crear"} el plan de acción.`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ActionPlanFormData) => {
    // Validate required fields first
    if (selectedRiskIds.length === 0) {
      toast({
        title: "Error de validación",
        description: "Debes seleccionar al menos un riesgo asociado.",
        variant: "destructive",
      });
      return;
    }
    
    if (!data.name || data.name.trim() === "") {
      toast({
        title: "Error de validación", 
        description: "El nombre del plan de acción es requerido.",
        variant: "destructive",
      });
      return;
    }
    
    // Ensure all required fields have valid values
    // Use first selected risk as primary for backward compatibility
    const cleanedData: any = {
      riskId: selectedRiskIds[0],
      name: data.name.trim(),
      priority: data.priority || "medium",
      status: data.status || "pending", 
      progress: data.progress || 0,
      description: data.description?.trim() || null,
      responsible: data.responsible?.trim() || null,
      dueDate: data.dueDate || null
    };
    
    // If creating a new action plan, set originalDueDate to dueDate
    if (!actionPlan) {
      cleanedData.originalDueDate = data.dueDate || null;
      // Include auditFindingId if provided (for actions created from audit findings)
      if (auditFindingId) {
        cleanedData.auditFindingId = auditFindingId;
      }
    }
    
    mutation.mutate(cleanedData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="action-plan-form">
        {actionPlan && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium text-muted-foreground">Código del Plan de Acción</p>
            <p className="text-lg font-bold text-primary">{actionPlan.code}</p>
          </div>
        )}

        <FormField
          control={form.control}
          name="riskId"
          render={() => (
            <FormItem className="flex flex-col">
              <FormLabel>Riesgos Asociados {selectedRiskIds.length > 0 && `(${selectedRiskIds.length})`}</FormLabel>
              
              {/* Selected Risks Display */}
              {selectedRiskIds.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[60px] bg-muted/30">
                  {selectedRiskIds.map((riskId, index) => {
                    const risk = risks.find((r: any) => r.id === riskId);
                    if (!risk) return null;
                    const isPrimary = index === 0;
                    
                    return (
                      <Badge 
                        key={riskId} 
                        variant={isPrimary ? "default" : "secondary"}
                        className="flex items-center gap-1 px-2 py-1"
                      >
                        {isPrimary && <Star className="h-3 w-3 fill-current" />}
                        <span className="font-mono text-xs">{risk.code}</span>
                        <span className="text-xs">-</span>
                        <span className="text-xs">{risk.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newSelectedRisks = selectedRiskIds.filter(id => id !== riskId);
                            setSelectedRiskIds(newSelectedRisks);
                            // Update form value to the new first risk, or empty if none selected
                            if (newSelectedRisks.length > 0) {
                              form.setValue("riskId", newSelectedRisks[0]);
                            } else {
                              form.setValue("riskId", "");
                            }
                          }}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
              
              {/* Risk Selector */}
              <Popover open={openRiskCombobox} onOpenChange={setOpenRiskCombobox}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={openRiskCombobox}
                      className="w-full justify-between"
                      data-testid="select-risk"
                    >
                      <span className="text-muted-foreground">
                        {selectedRiskIds.length === 0 
                          ? "Selecciona riesgo(s)..." 
                          : "Agregar otro riesgo..."
                        }
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Buscar riesgo por código o nombre..." />
                    <CommandList>
                      <CommandEmpty>No se encontró ningún riesgo.</CommandEmpty>
                      <CommandGroup>
                        {risks
                          .filter((risk: any) => !selectedRiskIds.includes(risk.id))
                          .map((risk: any) => (
                            <CommandItem
                              key={risk.id}
                              value={`${risk.code} ${risk.name}`}
                              onSelect={() => {
                                const newSelectedRisks = [...selectedRiskIds, risk.id];
                                setSelectedRiskIds(newSelectedRisks);
                                // Always set the first risk as the primary risk in the form
                                form.setValue("riskId", newSelectedRisks[0]);
                                setOpenRiskCombobox(false);
                              }}
                            >
                              <span className="font-medium text-primary">{risk.code}</span>
                              <span className="mx-2">-</span>
                              <span>{risk.name}</span>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              
              {selectedRiskIds.length > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  El primer riesgo seleccionado se marca como principal
                </p>
              )}
              
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Plan de Acción</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Implementar sistema de respaldo" {...field} data-testid="input-action-plan-name" onKeyDown={(e) => { if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") { e.stopPropagation(); } }} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} />
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
                  placeholder="Describe las acciones a realizar..." 
                  {...field} 
                  value={field.value || ""}
                  data-testid="input-action-plan-description"
                  onKeyDown={(e) => { if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") { e.stopPropagation(); } }} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="responsible"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Responsable</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <Combobox
                    options={processOwnerOptions}
                    value={field.value || ""}
                    placeholder="Seleccione el responsable"
                    searchPlaceholder="Buscar por nombre o cargo..."
                    emptyText="No se encontraron responsables"
                    onValueChange={(value) => field.onChange(value || undefined)}
                    data-testid="combobox-action-plan-responsible"
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
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha Límite</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                      data-testid="button-select-date"
                    >
                      {field.value ? (
                        format(field.value, "dd/MM/yyyy")
                      ) : (
                        <span>Selecciona una fecha</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value || undefined}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date < new Date()
                    }
                    initialFocus
                    locale={es}
                    data-testid="calendar-due-date"
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridad</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-priority">
                      <SelectValue placeholder="Selecciona prioridad" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                  </SelectContent>
                </Select>
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-status">
                      <SelectValue placeholder="Selecciona estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="in_progress">En progreso</SelectItem>
                    <SelectItem value="completed">Completado</SelectItem>
                    <SelectItem value="desistido">Desistido</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="progress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Progreso: {watchedProgress || 0}%</FormLabel>
              <FormControl>
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[field.value || 0]}
                  onValueChange={(value) => field.onChange(value[0])}
                  data-testid="slider-progress"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button 
            type="submit" 
            disabled={mutation.isPending}
            data-testid="button-submit-action-plan"
          >
            {mutation.isPending ? "Guardando..." : actionPlan ? "Actualizar" : "Crear"}
          </Button>
          <Button 
            type="button" 
            variant="outline"
            onClick={() => onSuccess?.()}
            data-testid="button-cancel-action-plan"
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
