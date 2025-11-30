import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/useOptimisticMutation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { CalendarIcon, Check, ChevronsUpDown, Building2, FolderTree } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertRiskEventSchema } from "@shared/schema";
import type { RiskEvent, Risk, Process, Control, Macroproceso, Subproceso } from "@shared/schema";
import { expandScopeEntities } from "@shared/scope-expansion";
import { z } from "zod";

const formSchema = insertRiskEventSchema.extend({
  eventDate: z.date({ required_error: "La fecha del evento es requerida" }),
  riskId: z.string({ required_error: "El riesgo asociado es requerido" })
    .min(1, "Debe seleccionar un riesgo asociado"),
  involvedPersons: z.string({ required_error: "Las personas involucradas son requeridas" })
    .min(1, "Debe especificar las personas involucradas"),
  relatedEntities: z.array(z.string()).optional(),
  estimatedLoss: z.string().optional(),
  causas: z.array(z.string()).optional(),
  consecuencias: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface RiskEventFormProps {
  event?: RiskEvent;
  onSuccess: () => void;
}

export default function RiskEventForm({ event, onSuccess }: RiskEventFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [riskComboboxOpen, setRiskComboboxOpen] = useState(false);
  const [controlComboboxOpen, setControlComboboxOpen] = useState(false);
  const [entityDialogOpen, setEntityDialogOpen] = useState(false);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [entitySearchTerm, setEntitySearchTerm] = useState("");
  
  // Bow Tie Analysis - Estados para causas y consecuencias
  const [causas, setCausas] = useState<string[]>(event?.causas || []);
  const [consecuencias, setConsecuencias] = useState<string[]>(event?.consecuencias || []);
  const [nuevaCausa, setNuevaCausa] = useState("");
  const [nuevaConsecuencia, setNuevaConsecuencia] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: risksResponse } = useQuery<{ data: any[], pagination: { limit: number, offset: number, total: number } }>({
    queryKey: ["/api/risks"],
  });
  const risks = risksResponse?.data || [];

  const { data: processes = [] } = useQuery({
    queryKey: ["/api/processes"],
  });

  const { data: macroprocesos = [] } = useQuery({
    queryKey: ["/api/macroprocesos"],
  });

  const { data: subprocesos = [] } = useQuery({
    queryKey: ["/api/subprocesos"],
  });

  const { data: controlsResponse } = useQuery<{ data: any[], pagination: { limit: number, offset: number, total: number } }>({
    queryKey: ["/api/controls"],
  });
  const controls = controlsResponse?.data || [];

  // Initialize selected entities from event data
  useEffect(() => {
    if (event) {
      const entityIds: string[] = [];
      
      // Load macroprocesos with prefix
      if ((event as any).relatedMacroprocesos) {
        entityIds.push(...(event as any).relatedMacroprocesos.map((m: any) => `macro:${m.id}`));
      }
      
      // Load processes with prefix
      if ((event as any).relatedProcesses) {
        entityIds.push(...(event as any).relatedProcesses.map((p: any) => `process:${p.id}`));
      }
      
      // Load subprocesos with prefix
      if ((event as any).relatedSubprocesos) {
        entityIds.push(...(event as any).relatedSubprocesos.map((s: any) => `subproceso:${s.id}`));
      }
      
      setSelectedEntities(entityIds);
    }
  }, [event]);

  // Expanded entities calculation - convert from local prefix format to expandScopeEntities format
  const expandedScope = useMemo(() => {
    const convertedEntities = selectedEntities.map(entity => {
      if (entity.startsWith('macro:')) {
        return `macroproceso-${entity.substring(6)}`;
      }
      if (entity.startsWith('process:')) {
        return `process-${entity.substring(8)}`;
      }
      if (entity.startsWith('subproceso:')) {
        return `subproceso-${entity.substring(11)}`;
      }
      return entity;
    });
    return expandScopeEntities(
      convertedEntities,
      macroprocesos as Macroproceso[],
      processes as Process[],
      subprocesos as Subproceso[]
    );
  }, [selectedEntities, macroprocesos, processes, subprocesos]);

  // Helper function to safely parse event date
  const parseEventDate = (dateValue: any): Date => {
    if (!dateValue) return new Date();
    
    try {
      const parsedDate = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
      // Check if date is valid
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    } catch (error) {
      console.warn('Invalid date value, using current date:', dateValue);
    }
    
    return new Date();
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      eventDate: parseEventDate(event?.eventDate),
      eventType: event?.eventType || "materializado",
      description: event?.description || "",
      severity: event?.severity || "media",
      status: event?.status || "abierto",
      involvedPersons: event?.involvedPersons || "",
      controlId: event?.controlId ?? "none",
      processId: event?.processId || "none",
      riskId: event?.riskId || "",
      reportedBy: event?.reportedBy || "",
      relatedEntities: [],
      estimatedLoss: event?.estimatedLoss || "",
      causas: event?.causas || [],
      consecuencias: event?.consecuencias || [],
    },
  });

  const createMutation = useOptimisticMutation({
    queryKey: "/api/risk-events",
    mutationFn: async (data: FormData) => {
      const submitData = {
        ...data,
        eventDate: data.eventDate.toISOString(),
        controlId: data.controlId === "none" ? null : data.controlId,
        processId: data.processId === "none" ? null : data.processId,
        riskId: data.riskId,
        relatedEntities: selectedEntities,
        estimatedLoss: data.estimatedLoss || null,
        causas: causas,
        consecuencias: consecuencias,
      };
      return apiRequest("/api/risk-events", "POST", submitData);
    },
    onOptimisticUpdate: (oldData: any, newData: FormData) => {
      if (!Array.isArray(oldData)) return oldData;
      
      // Create optimistic event with temporary ID
      const optimisticEvent = {
        id: `temp-${Date.now()}`,
        eventDate: newData.eventDate.toISOString(),
        eventType: newData.eventType,
        description: newData.description,
        severity: newData.severity,
        status: newData.status,
        involvedPersons: newData.involvedPersons,
        controlId: newData.controlId === "none" ? null : newData.controlId,
        processId: newData.processId === "none" ? null : newData.processId,
        riskId: newData.riskId,
        reportedBy: newData.reportedBy,
        relatedEntities: selectedEntities,
        estimatedLoss: newData.estimatedLoss || null,
        causas: causas,
        consecuencias: consecuencias,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Add new event to the beginning of the array
      return [optimisticEvent, ...oldData];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/risk-events/page-data"], exact: false, refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-events"], exact: false, refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-events/fraud-history/check"] });
      onSuccess();
      toast({
        title: "Evento creado",
        description: "El evento de riesgo ha sido registrado exitosamente.",
      });
    },
    onError: (error: any) => {
      console.error("Error creating risk event:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el evento de riesgo.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useOptimisticMutation({
    queryKey: "/api/risk-events",
    mutationFn: async (data: FormData & { eventId: string }) => {
      const { eventId, ...formData } = data;
      const submitData = {
        ...formData,
        eventDate: formData.eventDate.toISOString(),
        controlId: formData.controlId === "none" ? null : formData.controlId,
        processId: formData.processId === "none" ? null : formData.processId,
        riskId: formData.riskId,
        relatedEntities: selectedEntities,
        estimatedLoss: formData.estimatedLoss || null,
        causas: causas,
        consecuencias: consecuencias,
      };
      return apiRequest(`/api/risk-events/${eventId}`, "PUT", submitData);
    },
    onOptimisticUpdate: (oldData: any, updatedData: FormData & { eventId: string }) => {
      if (!Array.isArray(oldData)) return oldData;
      
      // Update the event in the array immediately
      return oldData.map((e: any) => 
        e.id === updatedData.eventId 
          ? {
              ...e,
              eventDate: updatedData.eventDate.toISOString(),
              eventType: updatedData.eventType,
              description: updatedData.description,
              severity: updatedData.severity,
              status: updatedData.status,
              involvedPersons: updatedData.involvedPersons,
              controlId: updatedData.controlId === "none" ? null : updatedData.controlId,
              processId: updatedData.processId === "none" ? null : updatedData.processId,
              riskId: updatedData.riskId,
              reportedBy: updatedData.reportedBy,
              relatedEntities: selectedEntities,
              estimatedLoss: updatedData.estimatedLoss || null,
              causas: causas,
              consecuencias: consecuencias,
              updatedAt: new Date().toISOString(),
            }
          : e
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/risk-events/page-data"], exact: false, refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-events"], exact: false, refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-events/fraud-history/check"] });
      onSuccess();
      toast({
        title: "Evento actualizado",
        description: "El evento de riesgo ha sido actualizado exitosamente.",
      });
    },
    onError: (error: any) => {
      console.error("Error updating risk event:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el evento de riesgo.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      if (event) {
        await updateMutation.mutateAsync({ ...data, eventId: event.id });
      } else {
        await createMutation.mutateAsync(data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="eventDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha del Evento *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        data-testid="button-date-picker"
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: es })
                        ) : (
                          <span>Seleccionar fecha</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="eventType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Evento *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-event-type">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="materializado">Riesgo Materializado</SelectItem>
                    <SelectItem value="fraude">Fraude</SelectItem>
                    <SelectItem value="delito">Delito</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="severity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Severidad *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-severity">
                      <SelectValue placeholder="Seleccionar severidad" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="baja">Baja</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
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
                <FormLabel>Estado *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-status">
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="abierto">Abierto</SelectItem>
                    <SelectItem value="en_investigacion">En Investigación</SelectItem>
                    <SelectItem value="cerrado">Cerrado</SelectItem>
                    <SelectItem value="escalado">Escalado</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormItem>
            <FormLabel>Entidades Relacionadas</FormLabel>
            <div className="space-y-2">
              <Dialog open={entityDialogOpen} onOpenChange={setEntityDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                    data-testid="button-select-entities"
                  >
                    <span className="flex items-center gap-2">
                      <FolderTree className="h-4 w-4" />
                      {selectedEntities.length > 0 
                        ? (() => {
                            const counts = {
                              macros: expandedScope?.displayGroups?.macroprocesos?.length || 0,
                              processes: expandedScope?.displayGroups?.procesos?.length || 0,
                              subprocesos: expandedScope?.displayGroups?.subprocesos?.length || 0
                            };
                            const parts = [];
                            if (counts.macros > 0) parts.push(`${counts.macros} macroproceso${counts.macros > 1 ? 's' : ''}`);
                            if (counts.processes > 0) parts.push(`${counts.processes} proceso${counts.processes > 1 ? 's' : ''}`);
                            if (counts.subprocesos > 0) parts.push(`${counts.subprocesos} subproceso${counts.subprocesos > 1 ? 's' : ''}`);
                            return parts.join(', ') || `${selectedEntities.length} seleccionada(s)`;
                          })()
                        : "Seleccionar entidades"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Seleccionar Entidades Relacionadas</DialogTitle>
                    <DialogDescription>
                      Selecciona macroprocesos, procesos o subprocesos relacionados al evento.
                      Al seleccionar un macroproceso o proceso, se incluirán automáticamente todos sus hijos.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Buscar entidades..."
                      value={entitySearchTerm}
                      onChange={(e) => setEntitySearchTerm(e.target.value)}
                      data-testid="input-entity-search"
                    />
                    <div className="max-h-[400px] overflow-y-auto border rounded-md p-4 space-y-4">
                      {(macroprocesos as Macroproceso[])
                        .filter((macro: Macroproceso) => 
                          !entitySearchTerm || 
                          macro.name.toLowerCase().includes(entitySearchTerm.toLowerCase()) ||
                          macro.code.toLowerCase().includes(entitySearchTerm.toLowerCase())
                        )
                        .map((macro: Macroproceso) => {
                          const macroProcesses = (processes as Process[]).filter(p => p.macroprocesoId === macro.id);
                          const isSelected = selectedEntities.includes(`macro:${macro.id}`);
                          const isAutoIncluded = expandedScope?.displayGroups?.macroprocesos?.some(m => m.id === macro.id) && !isSelected;

                          return (
                            <div key={macro.id} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    setSelectedEntities(prev => 
                                      checked 
                                        ? [...prev, `macro:${macro.id}`]
                                        : prev.filter(e => e !== `macro:${macro.id}`)
                                    );
                                  }}
                                  data-testid={`checkbox-macro-${macro.id}`}
                                />
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className={cn("font-medium", isAutoIncluded && "text-muted-foreground")}>
                                  {macro.code} - {macro.name}
                                  {isAutoIncluded && <Badge variant="outline" className="ml-2 text-xs">Auto-incluido</Badge>}
                                </span>
                              </div>

                              {macroProcesses.length > 0 && (
                                <div className="ml-6 space-y-2">
                                  {macroProcesses.map((proceso: Process) => {
                                    const procesoSubs = (subprocesos as Subproceso[]).filter(s => s.procesoId === proceso.id);
                                    const isProcSelected = selectedEntities.includes(`process:${proceso.id}`);
                                    const isProcAutoIncluded = expandedScope?.displayGroups?.procesos?.some(p => p.id === proceso.id) && !isProcSelected;

                                    return (
                                      <div key={proceso.id} className="space-y-2">
                                        <div className="flex items-center gap-2">
                                          <Checkbox
                                            checked={isProcSelected}
                                            onCheckedChange={(checked) => {
                                              setSelectedEntities(prev => 
                                                checked 
                                                  ? [...prev, `process:${proceso.id}`]
                                                  : prev.filter(e => e !== `process:${proceso.id}`)
                                              );
                                            }}
                                            data-testid={`checkbox-process-${proceso.id}`}
                                          />
                                          <FolderTree className="h-4 w-4 text-muted-foreground" />
                                          <span className={cn(isProcAutoIncluded && "text-muted-foreground")}>
                                            {proceso.code} - {proceso.name}
                                            {isProcAutoIncluded && <Badge variant="outline" className="ml-2 text-xs">Auto-incluido</Badge>}
                                          </span>
                                        </div>

                                        {procesoSubs.length > 0 && (
                                          <div className="ml-6 space-y-1">
                                            {procesoSubs.map((sub: Subproceso) => {
                                              const isSubSelected = selectedEntities.includes(`subproceso:${sub.id}`);
                                              const isSubAutoIncluded = expandedScope?.displayGroups?.subprocesos?.some(s => s.id === sub.id) && !isSubSelected;

                                              return (
                                                <div key={sub.id} className="flex items-center gap-2">
                                                  <Checkbox
                                                    checked={isSubSelected}
                                                    onCheckedChange={(checked) => {
                                                      setSelectedEntities(prev => 
                                                        checked 
                                                          ? [...prev, `subproceso:${sub.id}`]
                                                          : prev.filter(e => e !== `subproceso:${sub.id}`)
                                                      );
                                                    }}
                                                    data-testid={`checkbox-subproceso-${sub.id}`}
                                                  />
                                                  <span className={cn("text-sm", isSubAutoIncluded && "text-muted-foreground")}>
                                                    {sub.code} - {sub.name}
                                                    {isSubAutoIncluded && <Badge variant="outline" className="ml-2 text-xs">Auto-incluido</Badge>}
                                                  </span>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEntityDialogOpen(false)}
                        data-testid="button-cancel-entities"
                      >
                        Cerrar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              {selectedEntities.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(expandedScope?.displayGroups?.macroprocesos || []).map((macro) => (
                    <Badge key={`display-macro-${macro.id}`} variant="secondary">
                      {macro.code}
                    </Badge>
                  ))}
                  {(expandedScope?.displayGroups?.procesos || []).map((proc) => (
                    <Badge key={`display-process-${proc.id}`} variant="secondary">
                      {proc.code}
                    </Badge>
                  ))}
                  {(expandedScope?.displayGroups?.subprocesos || []).map((sub) => (
                    <Badge key={`display-sub-${sub.id}`} variant="secondary">
                      {sub.code}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </FormItem>

          <FormField
            control={form.control}
            name="estimatedLoss"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monto de Pérdida (Estimado)</FormLabel>
                <FormControl>
                  <Input 
                    type="number"
                    step="0.01"
                    placeholder="0.00" 
                    {...field} 
                    data-testid="input-estimated-loss"
                    onKeyDown={(e) => {
                      // Prevenir que ciertos eventos de teclado se propaguen al Dialog
                      if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") {
                        e.stopPropagation();
                      }
                    }}
                    onPointerDown={(e) => {
                      // Prevenir que clics en el input (incluidos clics en sugerencias de autocorrección) cierren el Dialog
                      e.stopPropagation();
                    }}
                    onMouseDown={(e) => {
                      // Prevenir que eventos de mouse (incluidos clics en sugerencias) cierren el Dialog
                      e.stopPropagation();
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Monto estimado de la pérdida ocasionada por el evento
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="controlId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Control Relacionado</FormLabel>
                <Popover open={controlComboboxOpen} onOpenChange={setControlComboboxOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between",
                          !field.value && "text-muted-foreground"
                        )}
                        data-testid="button-control-combobox"
                      >
                        {field.value && field.value !== "none"
                          ? (() => {
                              const selectedControl = (controls as Control[]).find(
                                (control: Control) => control.id === field.value
                              );
                              return selectedControl
                                ? `${selectedControl.code} - ${selectedControl.name}`
                                : "Control no encontrado";
                            })()
                          : "Sin control específico"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Buscar control..." data-testid="input-search-controls" />
                      <CommandList>
                        <CommandEmpty>No se encontraron controles.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="none"
                            onSelect={() => {
                              form.setValue("controlId", "none");
                              setControlComboboxOpen(false);
                            }}
                            data-testid="command-item-control-none"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                field.value === "none" ? "opacity-100" : "opacity-0"
                              )}
                            />
                            Sin control específico
                          </CommandItem>
                          {(controls as Control[]).map((control: Control) => (
                            <CommandItem
                              key={control.id}
                              value={`${control.code} ${control.name}`}
                              onSelect={() => {
                                form.setValue("controlId", control.id);
                                setControlComboboxOpen(false);
                              }}
                              data-testid={`command-item-control-${control.id}`}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value === control.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {control.code} - {control.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="riskId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Riesgo Asociado *</FormLabel>
                <Popover open={riskComboboxOpen} onOpenChange={setRiskComboboxOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between",
                          !field.value && "text-muted-foreground"
                        )}
                        data-testid="button-risk-combobox"
                      >
                        {field.value
                          ? (() => {
                              const selectedRisk = (risks as Risk[]).find(
                                (risk: Risk) => risk.id === field.value
                              );
                              return selectedRisk
                                ? `${selectedRisk.code} - ${selectedRisk.name}`
                                : "Riesgo no encontrado";
                            })()
                          : "Seleccionar riesgo"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Buscar riesgo..." data-testid="input-search-risks" />
                      <CommandList>
                        <CommandEmpty>No se encontraron riesgos.</CommandEmpty>
                        <CommandGroup>
                          {(risks as Risk[]).map((risk: Risk) => (
                            <CommandItem
                              key={risk.id}
                              value={`${risk.code} ${risk.name} ${risk.description || ""}`}
                              onSelect={() => {
                                form.setValue("riskId", risk.id);
                                setRiskComboboxOpen(false);
                              }}
                              data-testid={`command-item-risk-${risk.id}`}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value === risk.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div>
                                <div className="font-medium">{risk.code} - {risk.name}</div>
                                {risk.description && (
                                  <div className="text-xs text-muted-foreground">
                                    {risk.description.length > 60 ? `${risk.description.substring(0, 60)}...` : risk.description}
                                  </div>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reportedBy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reportado Por</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Nombre de quien reporta el evento" 
                    {...field} 
                    data-testid="input-reported-by"
                    onKeyDown={(e) => {
                      // Prevenir que ciertos eventos de teclado se propaguen al Dialog
                      if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") {
                        e.stopPropagation();
                      }
                    }}
                    onPointerDown={(e) => {
                      // Prevenir que clics en el input (incluidos clics en sugerencias de autocorrección) cierren el Dialog
                      e.stopPropagation();
                    }}
                    onMouseDown={(e) => {
                      // Prevenir que eventos de mouse (incluidos clics en sugerencias) cierren el Dialog
                      e.stopPropagation();
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción del Evento *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe detalladamente el evento ocurrido..."
                    className="min-h-[120px]"
                    {...field}
                    data-testid="textarea-description"
                    onKeyDown={(e) => {
                      // Prevenir que ciertos eventos de teclado se propaguen al Dialog
                      if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") {
                        e.stopPropagation();
                      }
                    }}
                    onPointerDown={(e) => {
                      // Prevenir que clics en el textarea (incluidos clics en sugerencias de autocorrección) cierren el Dialog
                      e.stopPropagation();
                    }}
                    onMouseDown={(e) => {
                      // Prevenir que eventos de mouse (incluidos clics en sugerencias) cierren el Dialog
                      e.stopPropagation();
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="involvedPersons"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Personas Involucradas *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Lista las personas involucradas en el evento..."
                    className="min-h-[80px]"
                    {...field}
                    data-testid="textarea-involved-persons"
                    onKeyDown={(e) => {
                      // Prevenir que ciertos eventos de teclado se propaguen al Dialog
                      if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") {
                        e.stopPropagation();
                      }
                    }}
                    onPointerDown={(e) => {
                      // Prevenir que clics en el textarea (incluidos clics en sugerencias de autocorrección) cierren el Dialog
                      e.stopPropagation();
                    }}
                    onMouseDown={(e) => {
                      // Prevenir que eventos de mouse (incluidos clics en sugerencias) cierren el Dialog
                      e.stopPropagation();
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Bow Tie Analysis - Causas */}
          <div className="space-y-3">
            <FormLabel>Causas (Análisis Bow Tie)</FormLabel>
            <FormDescription>
              Identifica las amenazas o causas que pueden disparar este evento de riesgo
            </FormDescription>
            <div className="flex gap-2">
              <Input
                placeholder="Agregar nueva causa..."
                value={nuevaCausa}
                onChange={(e) => setNuevaCausa(e.target.value)}
                onKeyDown={(e) => {
                  // Prevenir que ciertos eventos de teclado se propaguen al Dialog
                  if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") {
                    e.stopPropagation();
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (nuevaCausa.trim()) {
                      setCausas([...causas, nuevaCausa.trim()]);
                      setNuevaCausa("");
                    }
                  }
                }}
                onPointerDown={(e) => {
                  // Prevenir que clics en el input (incluidos clics en sugerencias de autocorrección) cierren el Dialog
                  e.stopPropagation();
                }}
                onMouseDown={(e) => {
                  // Prevenir que eventos de mouse (incluidos clics en sugerencias) cierren el Dialog
                  e.stopPropagation();
                }}
                data-testid="input-nueva-causa"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (nuevaCausa.trim()) {
                    setCausas([...causas, nuevaCausa.trim()]);
                    setNuevaCausa("");
                  }
                }}
                data-testid="button-add-causa"
              >
                Agregar
              </Button>
            </div>
            {causas.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {causas.map((causa, index) => (
                  <Badge key={index} variant="secondary" className="pr-1">
                    {causa}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-2"
                      onClick={() => setCausas(causas.filter((_, i) => i !== index))}
                      data-testid={`button-remove-causa-${index}`}
                    >
                      ×
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Bow Tie Analysis - Consecuencias */}
          <div className="space-y-3">
            <FormLabel>Consecuencias (Análisis Bow Tie)</FormLabel>
            <FormDescription>
              Identifica los efectos e impactos que resultan de este evento de riesgo
            </FormDescription>
            <div className="flex gap-2">
              <Input
                placeholder="Agregar nueva consecuencia..."
                value={nuevaConsecuencia}
                onChange={(e) => setNuevaConsecuencia(e.target.value)}
                onKeyDown={(e) => {
                  // Prevenir que ciertos eventos de teclado se propaguen al Dialog
                  if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") {
                    e.stopPropagation();
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (nuevaConsecuencia.trim()) {
                      setConsecuencias([...consecuencias, nuevaConsecuencia.trim()]);
                      setNuevaConsecuencia("");
                    }
                  }
                }}
                onPointerDown={(e) => {
                  // Prevenir que clics en el input (incluidos clics en sugerencias de autocorrección) cierren el Dialog
                  e.stopPropagation();
                }}
                onMouseDown={(e) => {
                  // Prevenir que eventos de mouse (incluidos clics en sugerencias) cierren el Dialog
                  e.stopPropagation();
                }}
                data-testid="input-nueva-consecuencia"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (nuevaConsecuencia.trim()) {
                    setConsecuencias([...consecuencias, nuevaConsecuencia.trim()]);
                    setNuevaConsecuencia("");
                  }
                }}
                data-testid="button-add-consecuencia"
              >
                Agregar
              </Button>
            </div>
            {consecuencias.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {consecuencias.map((consecuencia, index) => (
                  <Badge key={index} variant="secondary" className="pr-1">
                    {consecuencia}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-2"
                      onClick={() => setConsecuencias(consecuencias.filter((_, i) => i !== index))}
                      data-testid={`button-remove-consecuencia-${index}`}
                    >
                      ×
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="submit"
            disabled={isSubmitting}
            data-testid="button-submit-form"
          >
            {isSubmitting ? "Guardando..." : event ? "Actualizar Evento" : "Crear Evento"}
          </Button>
        </div>
      </form>
    </Form>
  );
}