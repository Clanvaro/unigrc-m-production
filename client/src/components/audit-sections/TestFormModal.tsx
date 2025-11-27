import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, User } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User as UserType } from "@shared/schema";

const testFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(200, "Máximo 200 caracteres"),
  description: z.string().min(1, "La descripción es requerida"),
  objective: z.string().optional(),
  testProcedures: z.string().optional(),
  evaluationCriteria: z.string().optional(),
  sampleSize: z.string().optional(),
  estimatedHours: z.number().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["proposed", "pending", "assigned", "in_progress", "under_review", "completed", "rejected", "cancelled"]),
  executorId: z.string().optional(),
  supervisorId: z.string().optional(),
  plannedStartDate: z.date().optional(),
  plannedEndDate: z.date().optional(),
  testingNature: z.enum(["inquiry", "observation", "inspection", "reperformance", "sustantivo", "cumplimiento"]).optional(),
});

type TestFormValues = z.infer<typeof testFormSchema>;

interface TestFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  testData?: any; // For edit mode
  auditId: string;
  riskId?: string;
  auditRiskId?: string;
  riskCode?: string;
  controlId?: string;
  controlCode?: string;
  onSuccess?: () => void;
  initialValues?: Partial<TestFormValues>; // For AI suggestions
}

export function TestFormModal({
  open,
  onOpenChange,
  mode,
  testData,
  auditId,
  riskId,
  auditRiskId,
  riskCode,
  controlId,
  controlCode,
  onSuccess,
  initialValues,
}: TestFormModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const { data: currentUser } = useQuery<UserType>({
    queryKey: ["/api/auth/user"],
  });

  const form = useForm<TestFormValues>({
    resolver: zodResolver(testFormSchema),
    defaultValues: {
      name: "",
      description: "",
      objective: "",
      testProcedures: "",
      evaluationCriteria: "",
      sampleSize: "",
      estimatedHours: undefined,
      priority: "medium",
      status: "proposed",
      executorId: currentUser?.id || "",
      supervisorId: "",
      plannedStartDate: undefined,
      plannedEndDate: undefined,
      testingNature: undefined,
    },
  });

  // Reset form when modal opens or data changes
  useEffect(() => {
    if (open) {
      if (mode === "edit" && testData) {
        // Load existing test data for editing
        form.reset({
          name: testData.name || "",
          description: testData.description || "",
          objective: Array.isArray(testData.objective) ? testData.objective.join("\n") : testData.objective || "",
          testProcedures: Array.isArray(testData.testProcedures) ? testData.testProcedures.join("\n") : testData.testProcedures || "",
          evaluationCriteria: Array.isArray(testData.evaluationCriteria) ? testData.evaluationCriteria.join("\n") : testData.evaluationCriteria || "",
          sampleSize: testData.sampleSize?.toString() || "",
          estimatedHours: testData.estimatedHours || undefined,
          priority: testData.priority || "medium",
          status: testData.status || "proposed",
          executorId: testData.executorId || currentUser?.id || "",
          supervisorId: testData.supervisorId || "",
          plannedStartDate: testData.plannedStartDate ? new Date(testData.plannedStartDate) : undefined,
          plannedEndDate: testData.plannedEndDate ? new Date(testData.plannedEndDate) : undefined,
          testingNature: testData.testingNature || undefined,
        });
      } else if (mode === "create") {
        // Use initial values if provided (from AI suggestions)
        if (initialValues) {
          form.reset({
            ...form.getValues(),
            ...initialValues,
            executorId: initialValues.executorId || currentUser?.id || "",
          });
        } else {
          // Default values for new test
          const defaultName = riskCode 
            ? `Prueba para ${riskCode}`
            : controlCode
            ? `Prueba para ${controlCode}`
            : "Nueva prueba de auditoría";
          
          const defaultDescription = riskCode
            ? `Prueba de auditoría para evaluar el riesgo ${riskCode}`
            : controlCode
            ? `Prueba de auditoría para evaluar el control ${controlCode}`
            : "Descripción de la prueba";

          form.reset({
            ...form.getValues(),
            name: defaultName,
            description: defaultDescription,
            executorId: currentUser?.id || "",
          });
        }
      }
    }
  }, [open, mode, testData, initialValues, riskCode, controlCode, currentUser]);

  const createTestMutation = useMutation({
    mutationFn: async (values: TestFormValues) => {
      const response = await fetch(`/api/audits/${auditId}/tests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testName: values.name, // Backend expects testName
          description: values.description,
          objective: values.objective,
          testProcedures: values.testProcedures,
          evaluationCriteria: values.evaluationCriteria,
          sampleSize: values.sampleSize ? parseInt(values.sampleSize) : undefined,
          estimatedHours: values.estimatedHours,
          priority: values.priority,
          status: values.status,
          executorId: values.executorId,
          supervisorId: values.supervisorId,
          plannedStartDate: values.plannedStartDate?.toISOString(),
          plannedEndDate: values.plannedEndDate?.toISOString(),
          testingNature: values.testingNature,
          riskId: riskId || undefined,
          auditRiskId: auditRiskId || undefined,
          controlId: controlId || undefined,
        }),
      });
      if (!response.ok) throw new Error("Failed to create test");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits", auditId, "work-program"] });
      queryClient.invalidateQueries({ queryKey: ["/api/audits", auditId, "tests"] });
      toast({
        title: "Prueba creada exitosamente",
        description: "La prueba de auditoría ha sido creada",
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Error al crear la prueba",
        description: "No se pudo crear la prueba. Por favor intente nuevamente.",
        variant: "destructive",
      });
    },
  });

  const updateTestMutation = useMutation({
    mutationFn: async (values: TestFormValues) => {
      const response = await fetch(`/api/audit-tests/${testData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          description: values.description,
          objective: values.objective,
          testProcedures: values.testProcedures,
          evaluationCriteria: values.evaluationCriteria,
          sampleSize: values.sampleSize ? parseInt(values.sampleSize) : undefined,
          estimatedHours: values.estimatedHours,
          priority: values.priority,
          status: values.status,
          executorId: values.executorId,
          supervisorId: values.supervisorId,
          plannedStartDate: values.plannedStartDate?.toISOString(),
          plannedEndDate: values.plannedEndDate?.toISOString(),
          testingNature: values.testingNature,
        }),
      });
      if (!response.ok) throw new Error("Failed to update test");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits", auditId, "work-program"] });
      queryClient.invalidateQueries({ queryKey: ["/api/audit-tests", testData.id] });
      toast({
        title: "Prueba actualizada exitosamente",
        description: "Los cambios han sido guardados",
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Error al actualizar la prueba",
        description: "No se pudieron guardar los cambios. Por favor intente nuevamente.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (values: TestFormValues) => {
    setIsSubmitting(true);
    try {
      if (mode === "create") {
        await createTestMutation.mutateAsync(values);
      } else {
        await updateTestMutation.mutateAsync(values);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const priorityOptions = [
    { value: "low", label: "Baja" },
    { value: "medium", label: "Media" },
    { value: "high", label: "Alta" },
    { value: "urgent", label: "Urgente" },
  ];

  const statusOptions = [
    { value: "proposed", label: "Propuesta" },
    { value: "pending", label: "Pendiente" },
    { value: "assigned", label: "Asignada" },
    { value: "in_progress", label: "En Progreso" },
    { value: "under_review", label: "En Revisión" },
    { value: "completed", label: "Completada" },
    { value: "rejected", label: "Rechazada" },
    { value: "cancelled", label: "Cancelada" },
  ];

  const testingNatureOptions = [
    { value: "inquiry", label: "Indagación" },
    { value: "observation", label: "Observación" },
    { value: "inspection", label: "Inspección" },
    { value: "reperformance", label: "Re-ejecución" },
    { value: "sustantivo", label: "Sustantivo" },
    { value: "cumplimiento", label: "Cumplimiento" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nueva Prueba de Auditoría" : "Editar Prueba de Auditoría"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Complete los detalles de la nueva prueba de auditoría"
              : "Modifique los detalles de la prueba de auditoría"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Información básica */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nombre de la prueba</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Revisión de controles de acceso" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describa el propósito y alcance de la prueba"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="objective"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Objetivo</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="¿Qué se busca verificar con esta prueba?"
                        rows={2}
                      />
                    </FormControl>
                    <FormDescription>
                      Defina claramente el objetivo de la prueba
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="testProcedures"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Procedimientos de prueba</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describa paso a paso cómo se realizará la prueba"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="evaluationCriteria"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Criterios de evaluación</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="¿Qué criterios se usarán para evaluar los resultados?"
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Configuración */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridad</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione prioridad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                name="testingNature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Naturaleza de la prueba</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {testingNatureOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                name="sampleSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tamaño de muestra</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: 20 transacciones" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimatedHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horas estimadas</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        placeholder="Ej: 8"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Asignación */}
              <FormField
                control={form.control}
                name="executorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ejecutor</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione ejecutor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3" />
                              {user.fullName || user.username}
                            </div>
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
                name="supervisorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supervisor (opcional)</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} 
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sin supervisor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sin supervisor</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3" />
                              {user.fullName || user.username}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Fechas */}
              <FormField
                control={form.control}
                name="plannedStartDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha inicio planificada</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
                            ) : (
                              <span>Seleccione fecha</span>
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
                            date < new Date(new Date().setHours(0, 0, 0, 0))
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
                name="plannedEndDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha fin planificada</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
                            ) : (
                              <span>Seleccione fecha</span>
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
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? mode === "create"
                    ? "Creando..."
                    : "Guardando..."
                  : mode === "create"
                  ? "Crear Prueba"
                  : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}