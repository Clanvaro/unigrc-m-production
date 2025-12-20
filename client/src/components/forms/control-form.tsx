import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { insertControlSchema, type Control, type ControlEvaluationCriteria, type ControlEvaluationOptions, type User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Trash2, Target, TrendingDown, Activity, Plus, Sparkles, Loader2 } from "lucide-react";
import { z } from "zod";
import React, { useState, useEffect, useMemo } from "react";
import { getCSRFTokenFromCookie } from "@/lib/csrf-cache";

// Custom schema for the simplified control form (only the fields we actually show)
const controlFormSchema = insertControlSchema.pick({
  name: true,
  description: true,
  effectiveness: true,
  effectTarget: true,
  lastReview: true,
  frequency: true,
}).extend({
  // Campo para el dueño del control
  ownerId: z.string().optional(),
});

type ControlFormData = z.infer<typeof controlFormSchema>;

interface ControlFormProps {
  control?: Control;
  onSuccess?: () => void;
}

interface ControlOwner {
  id: string;
  processOwnerId: string;
  assignedAt: string;
  processOwner?: {
    id: string;
    name: string;
    email: string;
    position: string;
  };
}

interface ProcessOwner {
  id: string;
  name: string;
  email: string;
  position: string;
  company: string;
  isActive: boolean;
}


interface ControlEvaluationData {
  [criteriaId: string]: string; // optionId
}

interface CriteriaWithOptions {
  criteria: ControlEvaluationCriteria;
  options: ControlEvaluationOptions[];
}

// Funciones de mapeo para el slider de effectTarget
const getSliderValue = (effectTarget: string): number => {
  switch (effectTarget) {
    case 'probability': return 0;
    case 'both': return 1;
    case 'impact': return 2;
    default: return 1;
  }
};

const getEffectTargetFromSlider = (value: number): string => {
  switch (value) {
    case 0: return 'probability';
    case 1: return 'both';
    case 2: return 'impact';
    default: return 'both';
  }
};

const getEffectTargetDescription = (effectTarget: string): string => {
  switch (effectTarget) {
    case 'probability': return 'Este control está diseñado para reducir la probabilidad de que ocurra el riesgo.';
    case 'impact': return 'Este control está diseñado para reducir el impacto cuando ocurre el riesgo.';
    case 'both': return 'Este control afecta tanto la probabilidad como el impacto del riesgo.';
    default: return 'Seleccione el objetivo del control.';
  }
};

export default function ControlForm({ control, onSuccess }: ControlFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [evaluationData, setEvaluationData] = useState<ControlEvaluationData>({});
  const [calculatedEffectiveness, setCalculatedEffectiveness] = useState<number>(control?.effectiveness || 0);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");
  const [isCreateOwnerDialogOpen, setIsCreateOwnerDialogOpen] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [newOwnerPosition, setNewOwnerPosition] = useState("");
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  const form = useForm<ControlFormData>({
    resolver: zodResolver(controlFormSchema),
    defaultValues: {
      name: control?.name || "",
      description: control?.description || "",
      effectiveness: control?.effectiveness || 0,
      effectTarget: control?.effectTarget || "both",
      frequency: control?.frequency || "monthly",
      lastReview: control?.lastReview ? new Date(control.lastReview) : undefined,
      ownerId: "",
    },
  });

  // Fetch evaluation criteria and options
  const { data: criteriaWithOptions = [], isLoading: criteriaLoading } = useQuery<CriteriaWithOptions[]>({
    queryKey: ["/api/control-evaluation-criteria-with-options"],
  });

  // Fetch existing evaluations if editing a control
  const { data: existingEvaluations = [] } = useQuery<any[]>({
    queryKey: ["/api/controls", control?.id, "evaluations"],
    enabled: !!control,
  });

  // Fetch process owners directly (much more efficient and correct)
  // refetchOnMount: 'always' ensures fresh data when opening the form (e.g., after creating a new owner)
  const { data: processOwners = [] } = useQuery({
    queryKey: ["/api/process-owners"],
    select: (data: any[]) => data.filter(owner => owner.isActive), // Only active owners
    staleTime: 0, // Always consider data stale to ensure fresh owners list
    refetchOnMount: 'always', // Refetch when form opens
  });

  // Transform process owners for combobox
  const processOwnerOptions: ComboboxOption[] = processOwners.map((owner) => ({
    value: owner.id,
    label: owner.name,
    description: owner.position || undefined,
  }));

  // Fetch current control owner if editing
  const { data: currentOwners = [] } = useQuery<ControlOwner[]>({
    queryKey: ["/api/control-owners/control", control?.id],
    enabled: !!control,
  });

  const currentOwner = currentOwners?.[0]; // Get the first active owner

  // Set initial evaluation data from existing evaluations
  useEffect(() => {
    if (Array.isArray(existingEvaluations) && existingEvaluations.length > 0) {
      const initialData: ControlEvaluationData = {};
      existingEvaluations.forEach((evaluation: any) => {
        initialData[evaluation.criteriaId] = evaluation.optionId;
      });
      setEvaluationData(initialData);
    }
  }, [existingEvaluations]);

  // Set current owner when editing
  useEffect(() => {
    if (currentOwner) {
      setSelectedOwnerId(currentOwner.processOwnerId);
      form.setValue("ownerId", currentOwner.processOwnerId);
    }
  }, [currentOwner, form]);

  // Calculate effectiveness when evaluation data changes
  useEffect(() => {
    if (criteriaWithOptions.length > 0 && Object.keys(evaluationData).length > 0) {
      calculateEffectiveness();
    }
  }, [evaluationData, criteriaWithOptions]);

  const calculateEffectiveness = async () => {
    if (criteriaWithOptions.length === 0) return;

    let totalWeightedScore = 0;
    let totalWeight = 0;

    criteriaWithOptions.forEach(({ criteria, options }) => {
      const selectedOptionId = evaluationData[criteria.id];
      if (selectedOptionId) {
        const selectedOption = (options as any[]).find(opt => opt.id === selectedOptionId);
        if (selectedOption) {
          totalWeightedScore += ((selectedOption as any).score * criteria.weight) / 100;
          totalWeight += criteria.weight;
        }
      }
    });

    // Calculate base effectiveness
    const baseEffectiveness = totalWeight > 0 ? Math.round((totalWeightedScore / totalWeight) * 100) : 0;

    // Get maximum effectiveness limit and apply it
    try {
      const response = await fetch("/api/system-config/max-effectiveness-limit/value");
      const data = await response.json();
      const maxEffectivenessLimit = data.maxEffectivenessLimit || 100;

      const finalEffectiveness = Math.min(baseEffectiveness, maxEffectivenessLimit);
      setCalculatedEffectiveness(finalEffectiveness);
      form.setValue("effectiveness", finalEffectiveness);
    } catch (error) {
      // Fallback to base effectiveness if config fetch fails
      setCalculatedEffectiveness(baseEffectiveness);
      form.setValue("effectiveness", baseEffectiveness);
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: ControlFormData) => {
      let controlResult: any;

      // Add required fields with defaults - only for creation
      // For updates, preserve original values and send only changed fields
      const controlData = control ? {
        // For updates: send only the fields that were edited
        ...data,
      } : {
        // For creation: add defaults for required fields
        ...data,
        type: "preventive",
        frequency: data.frequency || "daily",
        isActive: true,
      };

      if (control) {
        controlResult = await apiRequest(`/api/controls/${control.id}`, "PUT", controlData);
      } else {
        controlResult = await apiRequest("/api/controls", "POST", controlData);
      }

      // Handle control owner assignment
      const controlId = control?.id || controlResult.id;
      if (controlId && data.ownerId) {
        try {
          if (currentOwner) {
            // Update existing owner
            await apiRequest(`/api/control-owners/${currentOwner.id}`, "PUT", {
              processOwnerId: data.ownerId,
            });
          } else {
            // Create new owner assignment
            await apiRequest("/api/control-owners", "POST", {
              controlId: controlId,
              processOwnerId: data.ownerId,
              assignedBy: "user-1", // Default for demo - should be current user
            });
          }
        } catch (error) {
          // Silently handle owner assignment errors - control was created successfully
          // Owner can be assigned later if needed
          if (process.env.NODE_ENV === 'development') {
            console.debug("Error managing control owner (non-critical):", error);
          }
        }
      }

      // Save evaluations only if we have evaluation data
      const hasEvaluationData = Object.keys(evaluationData).length > 0;

      if (hasEvaluationData && controlResult) {
        if (controlId) {
          await saveEvaluations(controlId);
        }
      }

      return controlResult;
    },
    onMutate: async (data: ControlFormData) => {
      // Cancel outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: ["/api/controls"] });

      // Snapshot previous values for rollback
      const previousControls = queryClient.getQueryData(["/api/controls"]);

      // Optimistically update cache for immediate UI feedback
      if (control) {
        // Update existing control
        queryClient.setQueryData(["/api/controls"], (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((c: any) =>
              c.id === control.id ? { ...c, ...data, id: control.id } : c
            )
          };
        });
      } else {
        // Add new control with temporary ID
        const tempId = `temp-${Date.now()}`;
        const newControl = {
          ...data,
          id: tempId,
          type: "preventive",
          frequency: data.frequency || "daily",
          isActive: true,
          associatedRisksCount: 0
        };

        queryClient.setQueryData(["/api/controls"], (old: any) => {
          if (!old?.data) return { data: [newControl] };
          return {
            ...old,
            data: [...old.data, newControl]
          };
        });

        // Return tempId in context for onSuccess to use
        return { previousControls, tempId };
      }

      return { previousControls, tempId: null };
    },
    onError: (err, variables, context: any) => {
      // Rollback on error
      if (context?.previousControls) {
        queryClient.setQueryData(["/api/controls"], context.previousControls);
      }

      toast({
        title: "Error",
        description: `No se pudo ${control ? "actualizar" : "crear"} el control.`,
        variant: "destructive",
      });
    },
    onSuccess: async (controlResult, variables, context: any) => {
      // Update cache immediately with server response (faster than refetch)
      const controlId = control?.id || controlResult.id;
      const tempId = context?.tempId;

      // Helper to filter out temporary controls - uses context.tempId if available,
      // otherwise falls back to prefix-based removal for retries/lost context
      const filterTempControls = (c: any) => {
        if (tempId) {
          // Specific tempId available - remove only that one
          return c.id !== tempId;
        }
        // Fallback: remove any temp-prefixed entries to prevent duplicates on retry
        return typeof c.id !== 'string' || !c.id.startsWith('temp-');
      };

      // Update /api/controls cache
      queryClient.setQueryData(["/api/controls"], (old: any) => {
        if (!old?.data) return old;
        if (control) {
          return {
            ...old,
            data: old.data.map((c: any) => c.id === controlId ? controlResult : c)
          };
        } else {
          return {
            ...old,
            data: old.data.filter(filterTempControls).concat(controlResult)
          };
        }
      });

      // Invalidate related queries for background refresh (non-blocking)
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-controls-with-details"] });
      queryClient.invalidateQueries({ queryKey: ["/api/control-owners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/controls", controlId, "evaluations"] });

      // CRITICAL: Force immediate refetch of controls list to show updated owner/responsible
      // The controlResult from API doesn't include the newly assigned owner (assigned in separate call)
      // So we must invalidate and refetch to get the complete data with owner info
      await queryClient.invalidateQueries({
        queryKey: ["/api/controls"],
        exact: false,
        refetchType: 'active'
      });

      // CRITICAL: Invalidate ALL paginated controls queries (matches any params) to update main controls table immediately
      // Using exact:false ensures we match all queries starting with ["/api/controls", "paginated", ...]
      await queryClient.invalidateQueries({
        queryKey: ["/api/controls", "paginated"],
        exact: false,
        refetchType: 'active'
      });

      // CRITICAL: Invalidate the optimized with-details endpoint used by the main controls table
      // This is crucial because it uses a different prefix than /api/controls
      await queryClient.invalidateQueries({
        queryKey: ["/api/controls/with-details"],
        exact: false,
        refetchType: 'active'
      });

      toast({
        title: control ? "Control actualizado" : "Control creado",
        description: `El control ha sido ${control ? "actualizado" : "creado"} exitosamente.`,
      });
      onSuccess?.();
    },
  });

  // Mutation to clear evaluations
  const clearEvaluationsMutation = useMutation({
    mutationFn: async () => {
      if (!control?.id) throw new Error("No hay control para limpiar evaluaciones");
      await apiRequest(`/api/controls/${control.id}/evaluations`, "DELETE");
    },
    onSuccess: () => {
      // Clear local evaluation data
      setEvaluationData({});

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/controls", control?.id, "evaluations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/controls"] });

      toast({
        title: "Evaluaciones eliminadas",
        description: "Se han eliminado todas las evaluaciones del control exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudieron eliminar las evaluaciones.",
        variant: "destructive",
      });
    },
  });

  const handleClearEvaluations = () => {
    clearEvaluationsMutation.mutate();
  };

  // Mutation to create a new process owner
  const createOwnerMutation = useMutation({
    mutationFn: async (data: { name: string; email: string; position: string }) => {
      const newOwner = await apiRequest("/api/process-owners", "POST", {
        ...data,
        company: "Default Company", // Default company for now
        isActive: true,
      });
      return newOwner;
    },
    onSuccess: async (newOwner) => {
      // Forzar refetch inmediato para que el nuevo dueño aparezca en el dropdown
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/process-owners"],
        refetchType: 'active'
      });
      setSelectedOwnerId(newOwner.id);
      form.setValue("ownerId", newOwner.id);
      setIsCreateOwnerDialogOpen(false);
      setNewOwnerName("");
      setNewOwnerEmail("");
      setNewOwnerPosition("");
      toast({
        title: "Dueño de proceso creado",
        description: "El nuevo dueño de proceso ha sido creado exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el dueño de proceso.",
        variant: "destructive",
      });
    },
  });

  const handleCreateOwner = () => {
    if (!newOwnerName || !newOwnerEmail || !newOwnerPosition) {
      toast({
        title: "Campos requeridos",
        description: "Por favor complete todos los campos.",
        variant: "destructive",
      });
      return;
    }
    createOwnerMutation.mutate({
      name: newOwnerName,
      email: newOwnerEmail,
      position: newOwnerPosition,
    });
  };

  const saveEvaluations = async (controlId: string) => {
    // Save individual evaluations
    for (const [criteriaId, optionId] of Object.entries(evaluationData)) {
      if (optionId) {
        try {
          await apiRequest(`/api/controls/${controlId}/evaluations`, "POST", {
            criteriaId,
            optionId,
            evaluatedBy: "user-1" // Default user for demo
          });
        } catch (error) {
          // Continue with other evaluations even if one fails
          console.error(`Failed to save evaluation for criteria ${criteriaId}:`, error);
        }
      }
    }

    // Complete the evaluation to calculate final effectiveness
    try {
      await apiRequest(`/api/controls/${controlId}/complete-evaluation`, "POST", {
        evaluatedBy: "user-1"
      });
    } catch (error) {
      console.error("Failed to complete evaluation:", error);
    }
  };

  const onSubmit = (data: ControlFormData) => {
    mutation.mutate(data);
  };

  const handleGenerateDescription = async () => {
    const controlName = form.getValues("name");

    if (!controlName?.trim()) {
      toast({
        title: "Campo requerido",
        description: "Por favor ingresa el nombre del control primero.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingDescription(true);

    try {
      // Build headers with CSRF token for production
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      const isProduction = import.meta.env.MODE === 'production';
      if (isProduction) {
        const csrfToken = getCSRFTokenFromCookie();
        if (csrfToken) {
          headers['x-csrf-token'] = csrfToken;
        }
      }

      const response = await fetch(`${window.location.origin}/api/ai/assistant-stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          question: `Genera una descripción concisa y profesional para un control llamado "${controlName}". Explica brevemente qué hace el control, cómo funciona y qué objetivo cumple. Solo 1 párrafo corto (máximo 4 oraciones). No incluyas beneficios ni importancia. No uses formato markdown ni asteriscos. Texto plano solamente.`
        }),
        credentials: 'include'
      });

      if (!response.ok) throw new Error(`Error ${response.status}`);
      if (!response.body) throw new Error('Response body is null');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));

        for (const line of lines) {
          try {
            const jsonStr = line.replace('data: ', '');
            const data = JSON.parse(jsonStr);

            if (data.chunk) {
              accumulatedContent += data.chunk;
              form.setValue("description", accumulatedContent);
            }

            if (data.done) break;
            if (data.error) throw new Error(data.error);
          } catch (parseError) {
            console.warn('Failed to parse SSE chunk:', parseError);
          }
        }
      }

      toast({
        title: "Descripción generada",
        description: "La IA ha generado una descripción para el control.",
      });

    } catch (error) {
      console.error('Error generating description:', error);
      toast({
        title: "Error",
        description: "No se pudo generar la descripción. Intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="control-form">
        {control && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium text-muted-foreground">Código del Control</p>
            <p className="text-lg font-bold text-primary">{control.code}</p>
          </div>
        )}

        {/* 1. Nombre del Control (PRIMERO) */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Control</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ej: Monitoreo de transacciones"
                  {...field}
                  value={field.value || ""}
                  data-testid="input-control-name"
                  rows={2}
                  className="resize-none"
                  onKeyDown={(e) => { if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") { e.stopPropagation(); } }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 2. Descripción (SEGUNDO) */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between mb-2">
                <FormLabel>Descripción</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateDescription}
                  disabled={isGeneratingDescription}
                  data-testid="button-generate-description"
                  className="h-8"
                >
                  {isGeneratingDescription ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generar con IA
                    </>
                  )}
                </Button>
              </div>
              <FormControl>
                <Textarea
                  placeholder="Describe el control en detalle..."
                  {...field}
                  value={field.value || ""}
                  data-testid="input-control-description"
                  onKeyDown={(e) => { if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") { e.stopPropagation(); } }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 3. Dueño del control (TERCERO) */}
        <FormField
          control={form.control}
          name="ownerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dueño del Control</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <Combobox
                    options={processOwnerOptions}
                    value={field.value || selectedOwnerId}
                    placeholder="Seleccione el responsable del control"
                    searchPlaceholder="Buscar por nombre o cargo..."
                    emptyText="No se encontraron responsables"
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedOwnerId(value);
                    }}
                    data-testid="combobox-control-owner"
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
                    Crear nuevo dueño de proceso
                  </Button>
                </div>
              </FormControl>
              <FormDescription>
                Dueño responsable de la revalidación periódica de este control
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 3.5. Frecuencia del Control */}
        <FormField
          control={form.control}
          name="frequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Frecuencia de Ejecución</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || "monthly"}>
                <FormControl>
                  <SelectTrigger data-testid="select-control-frequency">
                    <SelectValue placeholder="Seleccione la frecuencia" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="continuous">Continua</SelectItem>
                  <SelectItem value="daily">Diaria</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="annual">Anual</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Con qué frecuencia se ejecuta este control
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 4. Sección de fechas (CUARTO) - Solo visible al editar controles existentes */}
        {control && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Fecha de creación (solo lectura) */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Fecha de Creación</label>
              <div className="p-2 bg-muted rounded-md text-sm">
                {control.createdAt ? new Date(control.createdAt).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'No disponible'}
              </div>
            </div>

            {/* Fecha de validación */}
            <FormField
              control={form.control}
              name="lastReview"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Validación</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value ? new Date(value) : undefined);
                      }}
                      data-testid="input-control-last-review"
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
                    Fecha de la última validación o revisión del control
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}


        <FormField
          control={form.control}
          name="effectTarget"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Objetivo del Control</FormLabel>
              <FormControl>
                <div className="space-y-4" data-testid="effect-target-slider">
                  <div className="px-4">
                    {/* Etiquetas de las posiciones */}
                    <div className="flex justify-between text-sm text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <TrendingDown className="w-4 h-4" />
                        Probabilidad
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        Ambos
                      </span>
                      <span className="flex items-center gap-1">
                        <Activity className="w-4 h-4" />
                        Impacto
                      </span>
                    </div>

                    {/* Slider */}
                    <Slider
                      value={[getSliderValue(field.value || 'both')]}
                      onValueChange={([value]) => field.onChange(getEffectTargetFromSlider(value))}
                      max={2}
                      min={0}
                      step={1}
                      className="w-full"
                      data-testid="slider-effect-target"
                    />

                    {/* Descripción dinámica */}
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <p className="text-sm">
                        {getEffectTargetDescription(field.value || 'both')}
                      </p>
                    </div>
                  </div>
                </div>
              </FormControl>
              <FormDescription>
                Define si este control está diseñado para reducir la probabilidad de que ocurra el riesgo, el impacto cuando ocurre, o ambos.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Effectiveness Evaluation Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Evaluación de Efectividad</h3>
            <Badge variant="outline" className="text-lg font-bold">
              {calculatedEffectiveness}%
            </Badge>
          </div>

          <div className="space-y-4">
            {criteriaLoading ? (
              <div className="text-center py-8">
                <div className="text-sm text-muted-foreground">Cargando criterios de evaluación...</div>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Evalúe cada criterio según las opciones disponibles. La efectividad se calculará automáticamente.
                </p>

                {criteriaWithOptions.map(({ criteria, options }) => (
                  <Card key={criteria.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{criteria.name}</h4>
                        <Badge variant="secondary">{criteria.weight}%</Badge>
                      </div>

                      {criteria.description && (
                        <p className="text-sm text-muted-foreground">{criteria.description}</p>
                      )}

                      <ToggleGroup
                        type="single"
                        value={evaluationData[criteria.id] || ""}
                        onValueChange={(value) => {
                          if (value) {
                            setEvaluationData(prev => ({
                              ...prev,
                              [criteria.id]: value
                            }));
                          }
                        }}
                        className={`grid gap-2 w-full ${options.length === 2 ? 'grid-cols-2' :
                            options.length === 3 ? 'grid-cols-3' :
                              options.length === 4 ? 'grid-cols-4' :
                                options.length === 5 ? 'grid-cols-5' :
                                  'grid-cols-3'
                          }`}
                        data-testid={`toggle-group-criteria-${criteria.id}`}
                      >
                        {options.map((option: any) => (
                          <ToggleGroupItem
                            key={option.id}
                            value={option.id}
                            className="h-12 flex-col gap-1 border border-input data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary"
                            data-testid={`toggle-option-${option.id}`}
                          >
                            <span className="font-medium">{option.label}</span>
                            <Badge
                              variant={evaluationData[criteria.id] === option.id ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              {option.score}%
                            </Badge>
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>

                      {evaluationData[criteria.id] && (
                        <div className="p-2 bg-muted rounded text-sm">
                          {(options as any[]).find(opt => opt.id === evaluationData[criteria.id])?.description}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}

                {Object.keys(evaluationData).length === criteriaWithOptions.length &&
                  criteriaWithOptions.length > 0 && (
                    <Card className="border-green-200 bg-green-50">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-medium">
                            Evaluación completa - Efectividad calculada: {calculatedEffectiveness}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )}
              </>
            )}
          </div>

          {/* Hidden form field for effectiveness */}
          <FormField
            control={form.control}
            name="effectiveness"
            render={({ field }) => (
              <input type="hidden" {...field} />
            )}
          />
        </div>

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={mutation.isPending}
            data-testid="button-submit-control"
          >
            {mutation.isPending ? "Guardando..." : control ? "Actualizar" : "Crear"}
          </Button>

          {/* Clear Evaluations Button - Only show when editing existing control with evaluations */}
          {control && Object.keys(evaluationData).length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={clearEvaluationsMutation.isPending}
                  data-testid="button-clear-evaluations"
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {clearEvaluationsMutation.isPending ? "Eliminando..." : "Limpiar Evaluaciones"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Eliminar evaluaciones</AlertDialogTitle>
                  <AlertDialogDescription>
                    ¿Está seguro de que desea eliminar todas las evaluaciones de este control? Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearEvaluations}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => onSuccess?.()}
            data-testid="button-cancel-control"
          >
            Cancelar
          </Button>
        </div>
      </form>

      {/* Dialog para crear nuevo dueño de proceso */}
      <Dialog open={isCreateOwnerDialogOpen} onOpenChange={setIsCreateOwnerDialogOpen}>
        <DialogContent data-testid="dialog-create-owner">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Dueño de Proceso</DialogTitle>
            <DialogDescription>
              Complete los siguientes campos para crear un nuevo dueño de proceso
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre completo</label>
              <Input
                placeholder="Ej: Juan Pérez"
                value={newOwnerName}
                onChange={(e) => setNewOwnerName(e.target.value)}
                data-testid="input-new-owner-name"
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
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="Ej: juan.perez@empresa.com"
                value={newOwnerEmail}
                onChange={(e) => setNewOwnerEmail(e.target.value)}
                data-testid="input-new-owner-email"
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
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cargo</label>
              <Input
                placeholder="Ej: Gerente de Operaciones"
                value={newOwnerPosition}
                onChange={(e) => setNewOwnerPosition(e.target.value)}
                data-testid="input-new-owner-position"
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
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateOwnerDialogOpen(false);
                setNewOwnerName("");
                setNewOwnerEmail("");
                setNewOwnerPosition("");
              }}
              data-testid="button-cancel-create-owner"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreateOwner}
              disabled={createOwnerMutation.isPending}
              data-testid="button-submit-create-owner"
            >
              {createOwnerMutation.isPending ? "Creando..." : "Crear"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
