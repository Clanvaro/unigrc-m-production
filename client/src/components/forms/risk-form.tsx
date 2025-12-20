import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { baseInsertRiskSchema, insertRiskSchema, type Risk } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import ProcessMultiSelector, { type ProcessAssociation } from "./process-multi-selector";
import { useToast } from "@/hooks/use-toast";
import { calculateInherentRisk, getRiskLevelText } from "@/lib/risk-calculations";
import { calculateProbability, type ProbabilityFactors, calculateDynamicProbability, type DynamicProbabilityFactors, type DynamicCriterion } from "@shared/probability-calculation";
import { calculateImpact, type ImpactFactors } from "@shared/impact-calculation";
import { X, ChevronsUpDown, Sparkles, Loader2 } from "lucide-react";
import ProbabilityWheel from "@/components/probability/ProbabilityWheel";
import ProbabilityWheelNew from "@/components/probability/ProbabilityWheelNew";
import ImpactWheel from "@/components/probability/ImpactWheel";
import ProbabilityHeatMap from "@/components/probability/ProbabilityHeatMap";
import RiskHeatMap from "@/components/probability/RiskHeatMap";
import { z } from "zod";
import SpecializedAIButton from "@/components/SpecializedAIButton";

type RiskFormData = z.infer<typeof baseInsertRiskSchema> & {
  regulations?: string[];
  directProbability?: number;
  impactFactors?: ImpactFactors;
  processAssociations?: ProcessAssociation[];
};

type AISuggestion = {
  name: string;
  description: string;
  category: string[];
  frequencyOccurrence?: number;
  exposureVolume?: number;
  exposureMassivity?: number;
  exposureCriticalPath?: number;
  complexity?: number;
  changeVolatility?: number;
  vulnerabilities?: number;
  impact?: number;
};

type AISuggestionsResponse = {
  suggestions: AISuggestion[];
  processContext?: string;
  analysisMetadata?: any;
};

interface RiskFormProps {
  risk?: Risk;
  onSuccess?: () => void;
}

export default function RiskForm({ risk, onSuccess }: RiskFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [openRegulationCombobox, setOpenRegulationCombobox] = useState(false);
  const [openCategoryCombobox, setOpenCategoryCombobox] = useState(false);
  const [probabilityInputMode, setProbabilityInputMode] = useState<'factors' | 'direct'>('factors');
  const [processAssociations, setProcessAssociations] = useState<ProcessAssociation[]>([]);

  // AI Suggestions state
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<AISuggestion | null>(null);
  const [useGlobalDocumentation, setUseGlobalDocumentation] = useState<boolean>(false);
  const lastToastTimeRef = useRef<number>(0);

  const { data: macroprocesos = [] } = useQuery<any[]>({
    queryKey: ["/api/macroprocesos"],
  });

  const { data: processes = [] } = useQuery<any[]>({
    queryKey: ["/api/processes"],
  });

  const { data: subprocesos = [] } = useQuery<any[]>({
    queryKey: ["/api/subprocesos"],
  });

  // Cargar criterios dinámicos de probabilidad
  const { data: probabilityCriteria = [] } = useQuery<DynamicCriterion[]>({
    queryKey: ["/api/probability-criteria/active"],
  });

  // Cargar asociaciones existentes si estamos editando un riesgo
  const { 
    data: existingRiskProcesses = [], 
    isSuccess: riskProcessesLoaded,
    isLoading: isLoadingProcesses,
    isFetching: isFetchingProcesses
  } = useQuery<any[]>({
    queryKey: queryKeys.risks.processes(risk?.id),
    enabled: !!risk?.id,
    staleTime: 30000, // 30 segundos - reutilizar datos recientes
    refetchOnWindowFocus: false, // No refetch al cambiar de ventana
  });


  const form = useForm<RiskFormData>({
    resolver: zodResolver(baseInsertRiskSchema.extend({
      processAssociations: z.array(z.any()).min(1, {
        message: "Debe seleccionar al menos un Macroproceso, Proceso o Subproceso para asociar este riesgo. Use el selector de procesos para agregar asociaciones.",
      }),
    })),
    defaultValues: {
      name: risk?.name || "",
      description: risk?.description || "",
      category: risk?.category || [],
      regulations: [] as string[], // We'll load this separately via API
      frequencyOccurrence: risk?.frequencyOccurrence || 1,
      exposureVolume: risk?.exposureVolume || 1,
      exposureMassivity: risk?.exposureMassivity || 1,
      exposureCriticalPath: risk?.exposureCriticalPath || 1,
      complexity: risk?.complexity || 1,
      changeVolatility: risk?.changeVolatility || 1,
      vulnerabilities: risk?.vulnerabilities || 1,
      impact: risk?.impact || 1,
      directProbability: risk?.probability || 3,
      status: risk?.status || "active",
      processAssociations: [],
    },
  });

  // Watch all probability factors, direct probability, and impact
  // Create dynamic watch list based on active criteria, fallback to legacy fields
  const watchFieldNames = useMemo(() => {
    if (probabilityCriteria && probabilityCriteria.length > 0) {
      // Sort criteria by order for consistency, then map to form field names
      const sortedCriteria = [...probabilityCriteria].sort((a, b) => a.order - b.order);
      return sortedCriteria.map(criterion => {
        switch (criterion.fieldName) {
          case 'frequency_occurrence': return 'frequencyOccurrence';
          case 'exposure_volume': return 'exposureVolume';
          case 'complexity': return 'complexity';
          case 'change_volatility': return 'changeVolatility';
          case 'vulnerabilities': return 'vulnerabilities';
          default: return criterion.fieldName; // For new dynamic criteria
        }
      });
    } else {
      // Fallback to legacy field names
      return [
        "frequencyOccurrence",
        "exposureVolume", 
        "exposureMassivity",
        "exposureCriticalPath",
        "complexity",
        "changeVolatility",
        "vulnerabilities"
      ];
    }
  }, [probabilityCriteria]);

  const watchedFactors = form.watch(watchFieldNames as any);
  const watchedDirectProbability = form.watch("directProbability");
  const watchedImpact = form.watch("impact");

  // Calculate probability based on mode
  let finalProbability: number;

  if (probabilityInputMode === 'direct') {
    finalProbability = watchedDirectProbability || 1;
  } else {
    // Try dynamic criteria system first, fallback to legacy system
    if (probabilityCriteria && probabilityCriteria.length > 0) {
      // Use dynamic criteria system
      const dynamicFactors: DynamicProbabilityFactors = {};

      // Map form values to dynamic criteria using array indices
      probabilityCriteria.forEach((criterion, index) => {
        const formValue = watchedFactors[index];
        // Ensure we get a number value
        const numericValue = typeof formValue === 'number' ? formValue : 1;
        dynamicFactors[criterion.fieldName] = numericValue;
      });

      finalProbability = calculateDynamicProbability(dynamicFactors, probabilityCriteria);
    } else {
      // Fallback to legacy calculation system
      const probabilityFactors: ProbabilityFactors = {
        frequencyOccurrence: watchedFactors[0] || 1,
        exposureVolume: watchedFactors[1] || 1,
        exposureMassivity: watchedFactors[2] || 1,
        exposureCriticalPath: watchedFactors[3] || 1,
        complexity: watchedFactors[4] || 1,
        changeVolatility: watchedFactors[5] || 1,
        vulnerabilities: watchedFactors[6] || 1,
      };
      finalProbability = calculateProbability(probabilityFactors);
    }
  }

  const inherentRisk = calculateInherentRisk(finalProbability, watchedImpact);

  // Helper function to render dynamic probability criteria fields
  const renderDynamicProbabilityFields = () => {
    if (probabilityCriteria && probabilityCriteria.length > 0) {
      return probabilityCriteria
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((criterion) => {
          const formFieldName = (() => {
            switch (criterion.fieldName) {
              case 'frequency_occurrence': return 'frequencyOccurrence';
              case 'exposure_volume': return 'exposureVolume';
              case 'complexity': return 'complexity';
              case 'change_volatility': return 'changeVolatility';
              case 'vulnerabilities': return 'vulnerabilities';
              default: return criterion.fieldName;
            }
          })();

          return (
            <FormField
              key={criterion.id}
              control={form.control}
              name={formFieldName as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{criterion.name} (1-5)</FormLabel>
                  <FormDescription>
                    {criterion.description}
                  </FormDescription>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger data-testid={`select-${criterion.fieldName}`}>
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">1 - Muy Bajo</SelectItem>
                      <SelectItem value="2" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">2 - Bajo</SelectItem>
                      <SelectItem value="3" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">3 - Medio</SelectItem>
                      <SelectItem value="4" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">4 - Alto</SelectItem>
                      <SelectItem value="5" className="bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100">5 - Muy Alto</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          );
        });
    } else {
      // Fallback to legacy fields if no dynamic criteria
      return renderLegacyProbabilityFields();
    }
  };

  // Legacy probability fields for fallback compatibility  
  const renderLegacyProbabilityFields = () => {
    return (
      <>
        <FormField
          control={form.control}
          name="frequencyOccurrence"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Frecuencia de Ocurrencia (1-5)</FormLabel>
              <FormDescription>
                Frecuencia con la que se espera que ocurra el riesgo
              </FormDescription>
              <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                <FormControl>
                  <SelectTrigger data-testid="select-frequency-occurrence">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="1" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">1 - Muy Raro (Una vez cada varios años)</SelectItem>
                  <SelectItem value="2" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">2 - Raro (Una vez al año)</SelectItem>
                  <SelectItem value="3" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">3 - Ocasional (Varias veces al año)</SelectItem>
                  <SelectItem value="4" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">4 - Probable (Mensualmente)</SelectItem>
                  <SelectItem value="5" className="bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100">5 - Muy Probable (Semanalmente o más)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="exposureVolume"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Exposición por Volumen (1-5)</FormLabel>
              <FormDescription>
                Volumen de transacciones, operaciones o valor afectado
              </FormDescription>
              <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                <FormControl>
                  <SelectTrigger data-testid="select-exposure-volume">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="1" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">1 - Volumen Muy Bajo</SelectItem>
                  <SelectItem value="2" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">2 - Volumen Bajo</SelectItem>
                  <SelectItem value="3" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">3 - Volumen Moderado</SelectItem>
                  <SelectItem value="4" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">4 - Volumen Alto</SelectItem>
                  <SelectItem value="5" className="bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100">5 - Volumen Muy Alto</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="exposureMassivity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Exposición por Masividad (1-5)</FormLabel>
              <FormDescription>
                Cantidad de usuarios, procesos o sistemas afectados
              </FormDescription>
              <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                <FormControl>
                  <SelectTrigger data-testid="select-exposure-massivity">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="1" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">1 - Individual</SelectItem>
                  <SelectItem value="2" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">2 - Departamental</SelectItem>
                  <SelectItem value="3" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">3 - Divisional</SelectItem>
                  <SelectItem value="4" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">4 - Corporativo</SelectItem>
                  <SelectItem value="5" className="bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100">5 - Masivo</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="exposureCriticalPath"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Exposición por Ruta Crítica (1-5)</FormLabel>
              <FormDescription>
                Criticidad de los procesos o activos expuestos al riesgo
              </FormDescription>
              <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                <FormControl>
                  <SelectTrigger data-testid="select-exposure-critical-path">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="1" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">1 - Soporte no crítico</SelectItem>
                  <SelectItem value="2" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">2 - Soporte relevante</SelectItem>
                  <SelectItem value="3" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">3 - Mixto (Soporte/Core)</SelectItem>
                  <SelectItem value="4" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">4 - Core relevante</SelectItem>
                  <SelectItem value="5" className="bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100">5 - Core crítico</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="complexity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Complejidad (1-5)</FormLabel>
              <FormDescription>
                Complejidad e interdependencias del proceso o sistema afectado
              </FormDescription>
              <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                <FormControl>
                  <SelectTrigger data-testid="select-complexity">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="1" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">1 - 1 sistema, 0 integraciones, sin terceros, ≥80% automatizado</SelectItem>
                  <SelectItem value="2" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">2 - 2 sistemas, 1 integración, 1 tercero no crítico</SelectItem>
                  <SelectItem value="3" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">3 - 3-4 sistemas, 2-3 integraciones, 1-2 terceros, 40-60% manual</SelectItem>
                  <SelectItem value="4" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">4 - ≥5 sistemas, ≥4 integraciones, ≥2 terceros críticos, 60-80% manual</SelectItem>
                  <SelectItem value="5" className="bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100">5 - ≥7 sistemas, múltiples terceros críticos, alta manualidad</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="changeVolatility"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cambio/Volatilidad (1-5)</FormLabel>
              <FormDescription>
                Nivel de cambios o volatilidad en el entorno del riesgo
              </FormDescription>
              <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                <FormControl>
                  <SelectTrigger data-testid="select-change-volatility">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="1" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">1 - Entorno estable; ≤1 cambio/año; ocurrencia &gt;24 meses</SelectItem>
                  <SelectItem value="2" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">2 - 2-3 cambios/año; 12-24 meses</SelectItem>
                  <SelectItem value="3" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">3 - Cambios trimestrales; 3-12 meses</SelectItem>
                  <SelectItem value="4" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">4 - Cambios mensuales; 1-3 meses</SelectItem>
                  <SelectItem value="5" className="bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100">5 - Cambios semanales; &lt;1 mes</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="vulnerabilities"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vulnerabilidades (1-5)</FormLabel>
              <FormDescription>
                Nivel de vulnerabilidades presentes en el entorno del riesgo
              </FormDescription>
              <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                <FormControl>
                  <SelectTrigger data-testid="select-vulnerabilities">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="1" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">1 - Sin vulnerabilidades; tecnología al día; Segregación de Funciones completa; rotación &lt;5%</SelectItem>
                  <SelectItem value="2" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">2 - 1 vulnerabilidad menor; rotación 5-10%</SelectItem>
                  <SelectItem value="3" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">3 - 2-3 vulnerabilidades moderadas; rotación 10-15%</SelectItem>
                  <SelectItem value="4" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">4 - Vulnerabilidades graves; rotación 15-25%</SelectItem>
                  <SelectItem value="5" className="bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100">5 - Críticas (obsolescencia severa, sin Segregación de Funciones, dependencia total)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </>
    );
  };

  const mutation = useMutation({
    mutationFn: async (data: RiskFormData) => {
      // Step 1: Create or update the risk (without direct process fields if using associations)
      const riskData = { ...data };

      // Always clear legacy process fields - we use only the new multiple associations system
      delete riskData.macroprocesoId;
      delete riskData.processId;
      delete riskData.subprocesoId;

      let createdOrUpdatedRisk;
      if (risk) {
        createdOrUpdatedRisk = await apiRequest(`/api/risks/${risk.id}`, "PUT", riskData);
      } else {
        createdOrUpdatedRisk = await apiRequest("/api/risks", "POST", riskData);
      }

      // Step 2: Create process associations if using new system
      if (processAssociations.length > 0) {
        const riskId = risk?.id || createdOrUpdatedRisk.id;

        // Delete existing associations when updating
        if (risk && existingRiskProcesses.length > 0) {
          await Promise.all(
            existingRiskProcesses.map((rp: any) => 
              apiRequest(`/api/risk-processes/${rp.id}`, "DELETE")
            )
          );
        }

        // Create new associations
        await Promise.all(
          processAssociations.map(async (assoc) => {
            // Only include non-undefined fields to satisfy Zod validation
            const associationData: any = {
              riskId,
              validationStatus: "pending_validation",
            };

            // Add exactly one hierarchy field based on what's defined
            if (assoc.subprocesoId) {
              associationData.subprocesoId = assoc.subprocesoId;
            } else if (assoc.processId) {
              associationData.processId = assoc.processId;
            } else if (assoc.macroprocesoId) {
              associationData.macroprocesoId = assoc.macroprocesoId;
            }

            return apiRequest("/api/risk-processes", "POST", associationData);
          })
        );
      }

      return createdOrUpdatedRisk;
    },
    onMutate: async (data: RiskFormData) => {
      // Cancel outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: ["/api/risks"] });
      await queryClient.cancelQueries({ queryKey: ["/api/risks-with-details"] });
      await queryClient.cancelQueries({ queryKey: ["/api/risks/bootstrap"] });

      // Snapshot previous values for rollback
      const previousRisks = queryClient.getQueryData(["/api/risks"]);
      const previousRisksWithDetails = queryClient.getQueryData(["/api/risks-with-details"]);
      const previousBootstrap = queryClient.getQueryData(["/api/risks/bootstrap"]);

      // Optimistically update cache for immediate UI feedback
      if (risk) {
        // Update existing risk
        queryClient.setQueryData(["/api/risks"], (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((r: any) => 
              r.id === risk.id ? { ...r, ...data, id: risk.id } : r
            )
          };
        });

        queryClient.setQueryData(["/api/risks-with-details"], (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((r: any) => 
              r.id === risk.id ? { ...r, ...data, id: risk.id } : r
            )
          };
        });
      } else {
        // Add new risk with temporary ID
        const tempId = `temp-${Date.now()}`;
        const newRisk = { ...data, id: tempId };

        queryClient.setQueryData(["/api/risks"], (old: any) => {
          if (!old?.data) return { data: [newRisk] };
          return {
            ...old,
            data: [...old.data, newRisk]
          };
        });

        queryClient.setQueryData(["/api/risks-with-details"], (old: any) => {
          if (!old?.data) return { data: [newRisk] };
          return {
            ...old,
            data: [...old.data, newRisk]
          };
        });

        // OPTIMIZED: Update ALL bootstrap queries optimistically (regardless of params) for immediate table update
        // Note: Risks are ordered by createdAt DESC, so new risk should be at the beginning
        queryClient.setQueriesData(
          { queryKey: ["/api/risks/bootstrap"], exact: false },
          (old: any) => {
            if (!old?.risks?.data) return old;
            // Add new risk at the beginning (since risks are ordered by createdAt DESC)
            return {
              ...old,
              risks: {
                ...old.risks,
                data: [newRisk, ...old.risks.data],
                pagination: {
                  ...old.risks.pagination,
                  total: (old.risks.pagination?.total || 0) + 1
                }
              }
            };
          }
        );

        // Return tempId in context for onSuccess to use
        return { previousRisks, previousRisksWithDetails, previousBootstrap, tempId };
      }

      return { previousRisks, previousRisksWithDetails, previousBootstrap, tempId: null };
    },
    onError: (err: any, variables, context: any) => {
      // Rollback on error
      if (context?.previousRisks) {
        queryClient.setQueryData(["/api/risks"], context.previousRisks);
      }
      if (context?.previousRisksWithDetails) {
        queryClient.setQueryData(["/api/risks-with-details"], context.previousRisksWithDetails);
      }
      if (context?.previousBootstrap) {
        queryClient.setQueryData(["/api/risks/bootstrap"], context.previousBootstrap);
      }

      // Extract specific error message from server response
      let errorMessage = `No se pudo ${risk ? "actualizar" : "crear"} el riesgo.`;
      
      if (err?.message) {
        // Check for specific validation errors
        if (err.message.includes("proceso") || err.message.includes("macroproceso") || err.message.includes("subproceso")) {
          errorMessage = "Debe seleccionar al menos un proceso (Macroproceso, Proceso o Subproceso) antes de guardar.";
        } else if (err.message.includes("nombre") || err.message.includes("name")) {
          errorMessage = "El nombre del riesgo es requerido.";
        } else if (err.message.includes("categoría") || err.message.includes("category")) {
          errorMessage = "Debe seleccionar al menos una categoría de riesgo.";
        } else {
          errorMessage = err.message;
        }
      }

      toast({
        title: "Error al guardar",
        description: errorMessage,
        variant: "destructive",
      });
    },
    onSuccess: (createdOrUpdatedRisk, variables, context: any) => {
      // Update cache immediately with server response (faster than refetch)
      const riskId = risk?.id || createdOrUpdatedRisk.id;
      const tempId = context?.tempId;
      
      // Helper to filter out temporary risks - uses context.tempId if available,
      // otherwise falls back to prefix-based removal for retries/lost context
      const filterTempRisks = (r: any) => {
        if (tempId) {
          // Specific tempId available - remove only that one
          return r.id !== tempId;
        }
        // Fallback: remove any temp-prefixed entries to prevent duplicates on retry
        return typeof r.id !== 'string' || !r.id.startsWith('temp-');
      };
      
      // Update /api/risks cache
      queryClient.setQueryData(["/api/risks"], (old: any) => {
        if (!old?.data) return old;
        if (risk) {
          // Update existing risk
          return {
            ...old,
            data: old.data.map((r: any) => r.id === riskId ? createdOrUpdatedRisk : r)
          };
        } else {
          // Replace temporary risk with real one from server
          return {
            ...old,
            data: old.data.filter(filterTempRisks).concat(createdOrUpdatedRisk)
          };
        }
      });

      // Update /api/risks-with-details cache
      queryClient.setQueryData(["/api/risks-with-details"], (old: any) => {
        if (!old?.data) return old;
        if (risk) {
          // Update existing risk
          return {
            ...old,
            data: old.data.map((r: any) => r.id === riskId ? createdOrUpdatedRisk : r)
          };
        } else {
          // Replace temporary risk with real one from server
          return {
            ...old,
            data: old.data.filter(filterTempRisks).concat(createdOrUpdatedRisk)
          };
        }
      });

      // OPTIMIZED: Update ALL bootstrap queries directly (regardless of params) for immediate table update
      queryClient.setQueriesData(
        { queryKey: ["/api/risks/bootstrap"], exact: false },
        (old: any) => {
          if (!old?.risks?.data) return old;
          if (risk) {
            // Update existing risk
            return {
              ...old,
              risks: {
                ...old.risks,
                data: old.risks.data.map((r: any) => r.id === riskId ? createdOrUpdatedRisk : r)
              }
            };
          } else {
            // Replace temporary risk with real one from server
            // Since risks are ordered by createdAt DESC, new risk should be at the beginning
            const hadTempRisk = old.risks.data.some((r: any) => r.id === tempId);
            const filteredData = old.risks.data.filter(filterTempRisks);
            return {
              ...old,
              risks: {
                ...old.risks,
                data: [createdOrUpdatedRisk, ...filteredData], // Add at beginning (createdAt DESC order)
                pagination: {
                  ...old.risks.pagination,
                  total: hadTempRisk ? old.risks.pagination?.total : (old.risks.pagination?.total || 0) + 1
                }
              }
            };
          }
        }
      );

      // Force immediate refetch of active bootstrap query to ensure data is fresh
      queryClient.refetchQueries({ queryKey: ["/api/risks/bootstrap"], exact: false, type: 'active' });

      // Invalidate related queries for background refresh (non-blocking, doesn't delay UI)
      queryClient.invalidateQueries({ queryKey: ["/api/risk-processes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/process-owners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risks-with-details"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-controls-with-details"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risks/heatmap-data"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-snapshots/dates"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.risks.processes(riskId) });
      queryClient.invalidateQueries({ queryKey: ["/api/risks-with-associations"] });
      
      // CRITICAL: Invalidate bootstrap endpoint used by risks page (matches any params)
      // This ensures the risks list updates immediately after creating/updating a risk
      queryClient.invalidateQueries({ 
        queryKey: ["/api/risks/bootstrap"],
        exact: false,
        refetchType: 'active' // Force immediate refetch of active queries only
      });
      
      // CRITICAL: Invalidate page-data endpoint used by risks page
      queryClient.invalidateQueries({ 
        queryKey: ["/api/risks/page-data"],
        exact: false,
        refetchType: 'active'
      });
      
      // CRITICAL: Invalidate ALL paginated risks queries (matches any params) to update main risks table immediately
      // Using exact:false ensures we match all queries starting with ["/api/risks", "paginated", ...]
      queryClient.invalidateQueries({ 
        queryKey: ["/api/risks", "paginated"],
        exact: false
      });
      
      // CRITICAL: Invalidate risks list query (used by risks page)
      queryClient.invalidateQueries({ 
        queryKey: ["/api/risks"],
        exact: false,
        refetchType: 'active'
      });
      
      // CRITICAL: Invalidate individual risk detail query to update detail view immediately (only if riskId exists)
      if (riskId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.risks.detail(riskId) });
      }

      // Prevent duplicate toasts (debounce 500ms)
      const now = Date.now();
      if (now - lastToastTimeRef.current > 500) {
        lastToastTimeRef.current = now;
        toast({
          title: risk ? "Riesgo actualizado" : "Riesgo creado",
          description: `El riesgo ha sido ${risk ? "actualizado" : "creado"} exitosamente.`,
        });
      }
      onSuccess?.();
    },
  });

  // AI Suggestions mutation
  const aiSuggestionsMutation = useMutation({
    mutationFn: async () => {
      const currentFormData = form.getValues();

      // Build context object based on current form state
      const context: any = {
        excludeExistingRisks: true,
        useGlobalDocumentation: useGlobalDocumentation
      };

      // Use process associations instead of legacy fields
      if (processAssociations.length > 0) {
        context.processAssociations = processAssociations;
      }
      if (currentFormData.description) context.userContext = currentFormData.description;

      return await apiRequest("/api/risks/ai-suggestions", "POST", context);
    },
    onSuccess: (data: AISuggestionsResponse) => {
      setAiSuggestions(data.suggestions || []);
      setShowSuggestionsModal(true);
      toast({
        title: "Sugerencias generadas",
        description: `Se generaron ${data.suggestions?.length || 0} sugerencias de riesgos.`,
      });
    },
    onError: (error: any) => {
      console.error('AI suggestions error:', error);

      // Handle specific error cases
      if (error.message?.includes('503')) {
        toast({
          title: "Servicio no disponible",
          description: "El servicio de sugerencias de IA no está disponible en este momento. Intenta nuevamente más tarde.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error al generar sugerencias",
          description: "No se pudieron generar las sugerencias de riesgos. Intenta nuevamente.",
          variant: "destructive",
        });
      }
    },
  });

  // Handle suggestion selection
  const handleUseSuggestion = () => {
    if (!selectedSuggestion) return;

    // Auto-populate form fields with selected suggestion
    form.setValue('name', selectedSuggestion.name);
    form.setValue('description', selectedSuggestion.description);

    // Set categories
    if (selectedSuggestion.category && selectedSuggestion.category.length > 0) {
      form.setValue('category', selectedSuggestion.category);
    }

    // Set risk factors if provided
    if (selectedSuggestion.frequencyOccurrence) {
      form.setValue('frequencyOccurrence', selectedSuggestion.frequencyOccurrence);
    }
    if (selectedSuggestion.exposureVolume) {
      form.setValue('exposureVolume', selectedSuggestion.exposureVolume);
    }
    if (selectedSuggestion.exposureMassivity) {
      form.setValue('exposureMassivity', selectedSuggestion.exposureMassivity);
    }
    if (selectedSuggestion.exposureCriticalPath) {
      form.setValue('exposureCriticalPath', selectedSuggestion.exposureCriticalPath);
    }
    if (selectedSuggestion.complexity) {
      form.setValue('complexity', selectedSuggestion.complexity);
    }
    if (selectedSuggestion.changeVolatility) {
      form.setValue('changeVolatility', selectedSuggestion.changeVolatility);
    }
    if (selectedSuggestion.vulnerabilities) {
      form.setValue('vulnerabilities', selectedSuggestion.vulnerabilities);
    }
    if (selectedSuggestion.impact) {
      form.setValue('impact', selectedSuggestion.impact);
    }

    // Close modal and reset selection
    setShowSuggestionsModal(false);
    setSelectedSuggestion(null);

    toast({
      title: "Sugerencia aplicada",
      description: "Los campos del formulario han sido completados con la sugerencia seleccionada.",
    });
  };

  // Memorizar los factores iniciales para evitar bucles de renderizado
  const initialFactors = useMemo<ProbabilityFactors>(() => ({
    frequencyOccurrence: form.getValues("frequencyOccurrence") || 1,
    exposureVolume: form.getValues("exposureVolume") || 1,
    exposureMassivity: form.getValues("exposureMassivity") || 1,
    exposureCriticalPath: form.getValues("exposureCriticalPath") || 1,
    complexity: form.getValues("complexity") || 1,
    changeVolatility: form.getValues("changeVolatility") || 1,
    vulnerabilities: form.getValues("vulnerabilities") || 1,
  }), [
    form.watch("frequencyOccurrence"),
    form.watch("exposureVolume"),
    form.watch("exposureMassivity"),
    form.watch("exposureCriticalPath"),
    form.watch("complexity"),
    form.watch("changeVolatility"),
    form.watch("vulnerabilities")
  ]);

  // Initial impact factors - load from risk if editing, otherwise default to 1
  const initialImpactFactors = useMemo<ImpactFactors>(() => {
    if (risk && risk.impactDimensions) {
      // Load from the impactDimensions JSON field
      const dims = risk.impactDimensions as any;
      return {
        infrastructure: dims.infrastructure || 1,
        reputation: dims.reputation || 1,
        economic: dims.economic || 1,
        permits: dims.permits || 1,
        knowhow: dims.knowhow || 1,
        people: dims.people || 1,
        information: dims.information || 1,
      };
    }
    return {
      infrastructure: 1,
      reputation: 1,
      economic: 1,
      permits: 1,
      knowhow: 1,
      people: 1,
      information: 1,
    };
  }, [risk]);

  // State to track current impact factors
  const [impactFactors, setImpactFactors] = useState<ImpactFactors>(initialImpactFactors);

  // Update state when risk changes
  useEffect(() => {
    setImpactFactors(initialImpactFactors);
  }, [initialImpactFactors]);

  // Callback optimizado para el componente ProbabilityWheel
  const handleWheelFactorsChange = useMemo(() => (factors: ProbabilityFactors) => {
    // Solo actualizar campos si el valor realmente cambió
    const currentValues = form.getValues();

    if (currentValues.frequencyOccurrence !== factors.frequencyOccurrence) {
      form.setValue("frequencyOccurrence", factors.frequencyOccurrence);
    }
    if (currentValues.exposureVolume !== factors.exposureVolume) {
      form.setValue("exposureVolume", factors.exposureVolume);
    }
    if (currentValues.exposureMassivity !== factors.exposureMassivity) {
      form.setValue("exposureMassivity", factors.exposureMassivity);
    }
    if (currentValues.exposureCriticalPath !== factors.exposureCriticalPath) {
      form.setValue("exposureCriticalPath", factors.exposureCriticalPath);
    }
    if (currentValues.complexity !== factors.complexity) {
      form.setValue("complexity", factors.complexity);
    }
    if (currentValues.changeVolatility !== factors.changeVolatility) {
      form.setValue("changeVolatility", factors.changeVolatility);
    }
    if (currentValues.vulnerabilities !== factors.vulnerabilities) {
      form.setValue("vulnerabilities", factors.vulnerabilities);
    }
  }, [form]);

  // Handler for impact wheel changes
  const handleImpactFactorsChange = useMemo(() => (factors: ImpactFactors) => {
    // Update state with new factors
    setImpactFactors(factors);

    // Calculate the impact score and update the form
    const impactScore = calculateImpact(factors);
    const currentImpact = form.getValues("impact");

    if (currentImpact !== impactScore) {
      form.setValue("impact", impactScore);
    }
  }, [form, setImpactFactors]);


  const onSubmit = async (data: RiskFormData) => {
    // Extract regulations and processAssociations for separate handling (not sent with main risk data)
    const { regulations, processAssociations: dataAssociations, ...riskData } = data;

    // Whitelist of allowed fields based on baseInsertRiskSchema to prevent payload contamination
    const allowedFields = [
      'code', 'name', 'description', 'category', 
      'macroprocesoId', 'processId', 'subprocesoId',
      'frequencyOccurrence', 'exposureVolume', 'exposureMassivity', 
      'exposureCriticalPath', 'complexity', 'changeVolatility', 
      'vulnerabilities', 'probability', 'impact', 'inherentRisk',
      'directProbability', 'status', 'processOwner'
    ];

    // Sanitize payload to only include allowed fields
    const sanitizedData: any = {};
    for (const field of allowedFields) {
      if (field in riskData) {
        sanitizedData[field] = riskData[field as keyof typeof riskData];
      }
    }

    // Add calculated probability, impact, and inherent risk
    sanitizedData.probability = finalProbability;
    sanitizedData.impact = watchedImpact;
    sanitizedData.inherentRisk = inherentRisk;

    // Clean the data object to ensure proper null values instead of undefined or empty strings
    const cleanedData = {
      ...sanitizedData,
      subprocesoId: sanitizedData.subprocesoId || null,
      processId: sanitizedData.processId || null,
      macroprocesoId: sanitizedData.macroprocesoId || null,
      description: sanitizedData.description || null,
      // Add impact dimensions from current state as a JSON object
      impactDimensions: impactFactors,
    };

    // Map fields correctly for backend schema
    // The backend schema expects directProbability (not probability) for direct evaluation
    const backendPayload: any = {
      ...cleanedData,
      // Save the evaluation method
      evaluationMethod: probabilityInputMode,
    };

    // Only send directProbability and remove factors if in DIRECT mode
    if (probabilityInputMode === 'direct') {
      // In direct mode, send directProbability and remove factor fields
      backendPayload.directProbability = cleanedData.probability;
      delete backendPayload.probability;

      // CRITICAL: When using direct probability, do NOT send factor fields to backend
      // Otherwise backend will recalculate based on factors instead of using directProbability
      delete backendPayload.frequencyOccurrence;
      delete backendPayload.exposureVolume;
      delete backendPayload.exposureMassivity;
      delete backendPayload.exposureCriticalPath;
      delete backendPayload.complexity;
      delete backendPayload.changeVolatility;
      delete backendPayload.vulnerabilities;
    } else {
      // In factors mode, keep the factor fields and remove directProbability
      // The backend will calculate probability from factors
      delete backendPayload.probability;
      delete backendPayload.directProbability;
    }

    // Remove inherentRisk as it's calculated automatically on backend
    delete backendPayload.inherentRisk;

    mutation.mutate(backendPayload);
  };



  // Load existing process associations when data arrives
  useEffect(() => {
    if (riskProcessesLoaded && existingRiskProcesses && existingRiskProcesses.length > 0) {
      const associations: ProcessAssociation[] = existingRiskProcesses.map((rp: any) => ({
        macroprocesoId: rp.macroprocesoId,
        processId: rp.processId,
        subprocesoId: rp.subprocesoId,
      }));
      
      setProcessAssociations(associations);
      form.setValue('processAssociations', associations, { shouldDirty: false });
    }
  }, [riskProcessesLoaded, existingRiskProcesses, form]);

  // Ensure reactive validation when process associations change
  useEffect(() => {
    form.trigger();
  }, [processAssociations, form]);

  // Initialize form data when editing
  useEffect(() => {
    if (risk) {
      // Detectar modo de probabilidad automáticamente
      let calculatedProbability: number;

      // Try dynamic criteria first, then fallback to legacy
      if (probabilityCriteria && probabilityCriteria.length > 0) {
        const dynamicFactors: DynamicProbabilityFactors = {};

        // Map risk values to dynamic criteria
        for (const criterion of probabilityCriteria) {
          switch (criterion.fieldName) {
            case 'frequency_occurrence':
              dynamicFactors[criterion.fieldName] = risk.frequencyOccurrence;
              break;
            case 'exposure_volume':
              dynamicFactors[criterion.fieldName] = risk.exposureVolume;
              break;
            case 'complexity':
              dynamicFactors[criterion.fieldName] = risk.complexity;
              break;
            case 'change_volatility':
              dynamicFactors[criterion.fieldName] = risk.changeVolatility;
              break;
            case 'vulnerabilities':
              dynamicFactors[criterion.fieldName] = risk.vulnerabilities;
              break;
            default:
              dynamicFactors[criterion.fieldName] = 3; // Default for new dynamic fields
          }
        }

        calculatedProbability = calculateDynamicProbability(dynamicFactors, probabilityCriteria);
      } else {
        // Fallback to legacy calculation
        const factors: ProbabilityFactors = {
          frequencyOccurrence: risk.frequencyOccurrence,
          exposureVolume: risk.exposureVolume,
          exposureMassivity: risk.exposureMassivity,
          exposureCriticalPath: risk.exposureCriticalPath,
          complexity: risk.complexity,
          changeVolatility: risk.changeVolatility,
          vulnerabilities: risk.vulnerabilities,
        };
        calculatedProbability = calculateProbability(factors);
      }

      if (risk.probability === calculatedProbability) {
        // El riesgo fue creado usando factores
        setProbabilityInputMode('factors');
      } else {
        // El riesgo fue creado usando evaluación directa
        setProbabilityInputMode('direct');
        form.setValue('directProbability', risk.probability);
      }
      
      // Always set impact value when editing
      form.setValue('impact', risk.impact);
    }
  }, [risk, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="risk-form">
        {risk && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium text-muted-foreground">Código del Riesgo</p>
            <p className="text-lg font-bold text-primary">{risk.code}</p>
          </div>
        )}

        {/* Multiple Process Associations - New System */}
        <FormField
          control={form.control}
          name="processAssociations"
          render={({ field }) => (
            <FormItem>
              <div className="border rounded-lg p-4 bg-muted/20">
                <div className="mb-3">
                  <FormLabel>Asociaciones de Procesos</FormLabel>
                  <FormDescription>
                    Selecciona múltiples procesos que se asocien con este riesgo
                  </FormDescription>
                </div>

                {(isLoadingProcesses || isFetchingProcesses) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Cargando procesos asociados...</span>
                  </div>
                )}

                <FormControl>
                  <ProcessMultiSelector
                    value={field.value || []}
                    onChange={(newAssociations) => {
                      field.onChange(newAssociations);
                      setProcessAssociations(newAssociations);
                    }}
                    maxAssociations={5}
                  />
                </FormControl>

                {(field.value && field.value.length > 0) && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-2">
                      Asociaciones seleccionadas: {field.value.length}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {field.value.map((assoc: ProcessAssociation, index: number) => {
                        // Find names for display
                        let displayText = "";
                        if (assoc.subprocesoId) {
                          const subproceso = subprocesos.find((s: any) => s.id === assoc.subprocesoId);
                          displayText = subproceso?.name || "Subproceso";
                        } else if (assoc.processId) {
                          const process = processes.find((p: any) => p.id === assoc.processId);
                          displayText = process?.name || "Proceso";
                        } else if (assoc.macroprocesoId) {
                          const macroproceso = macroprocesos.find((m: any) => m.id === assoc.macroprocesoId);
                          displayText = macroproceso?.name || "Macroproceso";
                        }

                        return (
                          <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs">
                            {displayText}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                <FormMessage />
              </div>
            </FormItem>
          )}
        />




        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Riesgo</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ej: Falla del sistema de pagos" 
                  {...field} 
                  data-testid="input-risk-name"
                  onKeyDown={(e) => { if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") { e.stopPropagation(); } }}
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
                  placeholder="Describe el riesgo en detalle..." 
                  {...field} 
                  value={field.value || ""}
                  data-testid="input-risk-description"
                  onKeyDown={(e) => { if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") { e.stopPropagation(); } }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* AI Suggestions Configuration */}
        <div className="space-y-3">
          {/* Global Documentation Analysis Checkbox */}
          <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg border">
            <Checkbox 
              id="global-documentation"
              checked={useGlobalDocumentation}
              onCheckedChange={(checked) => setUseGlobalDocumentation(checked === true)}
              data-testid="checkbox-global-documentation"
            />
            <div className="grid gap-1.5 leading-none">
              <label 
                htmlFor="global-documentation" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Análisis Global de Documentación
              </label>
              <p className="text-xs text-muted-foreground">
                Incluir toda la documentación del sistema en el análisis de IA para sugerencias más amplias
              </p>
            </div>
          </div>

          {/* AI Suggestions Button */}
          <div className="flex justify-center py-2">
            <Button 
              type="button"
              variant="outline"
              onClick={() => aiSuggestionsMutation.mutate()}
              disabled={aiSuggestionsMutation.isPending || (!useGlobalDocumentation && processAssociations.length === 0)}
              className="bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 border-purple-200 text-purple-700 hover:text-purple-800"
              data-testid="button-suggest-risks"
            >
              {aiSuggestionsMutation.isPending ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                  Generando sugerencias...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  🤖 Sugerir Riesgos
                  {useGlobalDocumentation && (
                    <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-700">
                      Global
                    </Badge>
                  )}
                </>
              )}
            </Button>
          </div>
        </div>


        <FormField
          control={form.control}
          name="category"
          render={({ field }) => {
            const { data: riskCategories = [], isLoading: isLoadingCategories, isFetching: isFetchingCategories } = useQuery<any[]>({
              queryKey: ["/api/risk-categories"],
              staleTime: 1000 * 60 * 5, // Cache for 5 minutes (catalog data changes infrequently)
              refetchOnWindowFocus: false, // Don't refetch on window focus to improve performance
            });
            const availableCategories = riskCategories
              .filter((cat: any) => cat.isActive !== false)
              .map((cat: any) => cat.name);

            const addCategory = (category: string) => {
              const currentCategories = field.value || [];
              if (!currentCategories.includes(category)) {
                field.onChange([...currentCategories, category]);
              }
            };

            const removeCategory = (category: string) => {
              const currentCategories = field.value || [];
              field.onChange(currentCategories.filter((c: string) => c !== category));
            };

            const isCategoriesLoading = isLoadingCategories || isFetchingCategories;

            return (
              <FormItem>
                <FormLabel>Categorías</FormLabel>
                <div className="space-y-3">
                  <Popover open={openCategoryCombobox} onOpenChange={setOpenCategoryCombobox}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openCategoryCombobox}
                          className="w-full justify-between"
                          data-testid="select-category-combobox"
                          disabled={isCategoriesLoading}
                        >
                          {isCategoriesLoading ? "Cargando categorías..." : "Buscar y seleccionar categorías..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput 
                          placeholder="Buscar categorías..." 
                          data-testid="input-search-categories"
                          disabled={isCategoriesLoading}
                        />
                        {isCategoriesLoading ? (
                          <CommandEmpty>Cargando categorías...</CommandEmpty>
                        ) : availableCategories.length === 0 ? (
                          <CommandEmpty>No hay categorías disponibles. Crea una categoría primero.</CommandEmpty>
                        ) : (
                          <CommandEmpty>No se encontraron categorías con ese nombre.</CommandEmpty>
                        )}
                        <CommandGroup>
                          <CommandList className="max-h-[200px] overflow-y-auto">
                            {isCategoriesLoading ? (
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                Cargando categorías...
                              </div>
                            ) : (
                              availableCategories
                              .filter((cat: string) => !(field.value || []).includes(cat))
                              .map((category: string) => {
                                const categoryData = riskCategories.find((c: any) => c.name === category);
                                return (
                                  <CommandItem
                                    key={category}
                                    value={category}
                                    onSelect={() => {
                                      addCategory(category);
                                      setOpenCategoryCombobox(false);
                                    }}
                                    data-testid={`option-category-${category}`}
                                  >
                                    <div className="flex items-center gap-2 w-full">
                                      {categoryData?.color && (
                                        <div 
                                          className="w-3 h-3 rounded-full" 
                                          style={{ backgroundColor: categoryData.color }}
                                        />
                                      )}
                                      <span>{category}</span>
                                    </div>
                                  </CommandItem>
                                );
                                })
                            )}
                          </CommandList>
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {/* Display selected categories */}
                  <div className="flex flex-wrap gap-2">
                    {(field.value || []).map((categoryName: string) => {
                      const categoryData = riskCategories.find((cat: any) => cat.name === categoryName);
                      return (
                        <Badge 
                          key={categoryName} 
                          className="flex items-center gap-1"
                          style={{ 
                            backgroundColor: categoryData?.color || "#6b7280", 
                            color: "white" 
                          }}
                          data-testid={`category-badge-${categoryName}`}
                        >
                          {categoryName}
                          <X 
                            className="h-3 w-3 cursor-pointer hover:opacity-75" 
                            onClick={() => removeCategory(categoryName)}
                            data-testid={`remove-category-${categoryName}`}
                          />
                        </Badge>
                      );
                    })}
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        {/* Normativas Asociadas */}
        <FormField
          control={form.control}
          name="regulations"
          render={({ field }) => {
            const { data: regulations = [], isLoading: isLoadingRegulations } = useQuery<any[]>({
              queryKey: ["/api/regulations"],
              staleTime: 1000 * 60 * 5, // Cache for 5 minutes (catalog data changes infrequently)
              refetchOnWindowFocus: false, // Don't refetch on window focus to improve performance
            });
            const availableRegulations = regulations
              .filter((reg: any) => reg.isActive !== false)
              .map((reg: any) => ({ id: reg.id, name: reg.name }));

            const addRegulation = (regulationId: string) => {
              const currentRegulations = field.value || [];
              if (!currentRegulations.includes(regulationId)) {
                field.onChange([...currentRegulations, regulationId]);
              }
              setOpenRegulationCombobox(false);
            };

            const removeRegulation = (regulationId: string) => {
              const currentRegulations = field.value || [];
              field.onChange(currentRegulations.filter((id: string) => id !== regulationId));
            };

            return (
              <FormItem>
                <FormLabel>Normativas Aplicables</FormLabel>
                <FormDescription>
                  Selecciona las normativas que aplican a este riesgo
                </FormDescription>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Popover open={openRegulationCombobox} onOpenChange={setOpenRegulationCombobox}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openRegulationCombobox}
                            className="flex-1 justify-between"
                            data-testid="select-regulation-combobox"
                          >
                            Buscar y seleccionar normativas...
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0">
                        <Command>
                          <CommandInput 
                            placeholder="Buscar normativas por nombre..." 
                            data-testid="input-search-regulations"
                          />
                          <CommandEmpty>No se encontraron normativas.</CommandEmpty>
                          <CommandGroup>
                            <CommandList className="max-h-[200px] overflow-y-auto">
                              {availableRegulations
                                .filter((reg: any) => !(field.value || []).includes(reg.id))
                                .map((regulation: any) => (
                                  <CommandItem
                                    key={regulation.id}
                                    value={`${regulation.name}`}
                                    onSelect={() => addRegulation(regulation.id)}
                                    data-testid={`option-regulation-${regulation.id}`}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">{regulation.name}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                            </CommandList>
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Display selected regulations */}
                  <div className="flex flex-wrap gap-2">
                    {(field.value || []).map((regulationId: string) => {
                      const regulationData = regulations.find((reg: any) => reg.id === regulationId);
                      return (
                        <Badge 
                          key={regulationId} 
                          className="flex items-center gap-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                          data-testid={`regulation-badge-${regulationId}`}
                        >
                          {regulationData?.name || "Normativa no encontrada"}
                          <X 
                            className="h-3 w-3 cursor-pointer hover:opacity-75" 
                            onClick={() => removeRegulation(regulationId)}
                            data-testid={`remove-regulation-${regulationId}`}
                          />
                        </Badge>
                      );
                    })}
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        {/* Modo de Evaluación de Probabilidad */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Evaluación de Probabilidad</h3>
            <div className="text-sm text-muted-foreground">
              Probabilidad: <span className="font-bold text-blue-600" data-testid="calculated-probability">
                {finalProbability.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Selector de Modo */}
          <div className="space-y-3">
            <FormLabel>Método de Evaluación</FormLabel>
            <RadioGroup 
              value={probabilityInputMode} 
              onValueChange={(value: 'factors' | 'direct') => setProbabilityInputMode(value)}
              className="flex gap-6"
              data-testid="probability-mode-selector"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="factors" id="factors" data-testid="radio-factors" />
                <label htmlFor="factors" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Por Factores
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="direct" id="direct" data-testid="radio-direct" />
                <label htmlFor="direct" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Evaluación Directa
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* Campos de Probabilidad e Impacto por Factores - Ruedas Interactivas */}
          {probabilityInputMode === 'factors' && (
            <div className="space-y-6">
              <div className="bg-muted/30 p-6 rounded-lg border-2 border-dashed border-muted-foreground/20">
                <h4 className="text-lg font-medium mb-3 text-center">Evaluación por Factores</h4>
                <p className="text-sm text-muted-foreground mb-6 text-center">
                  Usa las ruedas interactivas para evaluar tanto la probabilidad como el impacto de cada factor de riesgo
                </p>

                {/* Layout vertical para ambas ruedas - Una arriba de la otra */}
                <div className="grid grid-cols-1 gap-8 max-w-4xl mx-auto">
                  {/* Rueda de Probabilidad */}
                  <div className="flex flex-col items-center space-y-4">
                    <ProbabilityWheelNew
                      initialFactors={initialFactors}
                      onChange={handleWheelFactorsChange}
                      size="large"
                      className="w-full"
                    />
                  </div>

                  {/* Rueda de Impacto */}
                  <div className="flex flex-col items-center space-y-4">
                    <ImpactWheel
                      initialFactors={initialImpactFactors}
                      onChange={handleImpactFactorsChange}
                      size="large"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Campo de Evaluación Directa - Matriz Heat Map Interactiva */}
          {probabilityInputMode === 'direct' && (
            <div className="space-y-6">
              <div className="bg-muted/30 p-6 rounded-lg border-2 border-dashed border-muted-foreground/20">
                <h4 className="text-md font-medium mb-4 text-center">Evaluación Directa</h4>
                <p className="text-sm text-muted-foreground mb-6 text-center">
                  Usa la matriz interactiva para seleccionar probabilidad e impacto
                </p>

                <RiskHeatMap
                  initialProbability={watchedDirectProbability || 1}
                  initialImpact={watchedImpact || 1}
                  onValueChange={(probability, impact) => {
                    form.setValue("directProbability", probability);
                    form.setValue("impact", impact);
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* El campo de impacto ahora es manejado por la ImpactWheel en modo 'factors' */}

        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm font-medium">Riesgo Inherente Calculado:</p>
          <p className="text-lg font-bold" data-testid="calculated-inherent-risk">
            {inherentRisk} - {getRiskLevelText(inherentRisk)}
          </p>
        </div>


        <div className="flex gap-2">
          <Button 
            type="submit" 
            disabled={mutation.isPending}
            data-testid="button-submit-risk"
          >
            {mutation.isPending ? "Guardando..." : risk ? "Actualizar" : "Crear"}
          </Button>
          <Button 
            type="button" 
            variant="outline"
            onClick={() => onSuccess?.()}
            data-testid="button-cancel-risk"
          >
            Cancelar
          </Button>
        </div>
      </form>

      {/* AI Suggestions Modal */}
      <Dialog open={showSuggestionsModal} onOpenChange={setShowSuggestionsModal} modal={false}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Sugerencias de Riesgos
              </DialogTitle>
              <DialogDescription>
                Selecciona una de las siguientes sugerencias para usar como base en tu formulario de riesgo.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {aiSuggestions.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">No se encontraron sugerencias disponibles.</p>
              </div>
            ) : (
              aiSuggestions.map((suggestion, index) => (
                <div 
                  key={index}
                  className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                    selectedSuggestion === suggestion 
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20' 
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                  onClick={() => setSelectedSuggestion(suggestion)}
                  data-testid={`suggestion-item-${index}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-lg text-purple-900 dark:text-purple-100">
                        {suggestion.name}
                      </h3>
                      {selectedSuggestion === suggestion && (
                        <Badge className="bg-purple-600 text-white">
                          Seleccionado
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {suggestion.description}
                    </p>

                    {suggestion.category && suggestion.category.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {suggestion.category.map((cat, catIndex) => (
                          <Badge key={catIndex} variant="secondary" className="text-xs">
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Risk Factors Preview */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground border-t pt-2">
                      {suggestion.impact && (
                        <span>Impacto: {suggestion.impact}/5</span>
                      )}
                      {suggestion.frequencyOccurrence && (
                        <span>Frecuencia: {suggestion.frequencyOccurrence}/5</span>
                      )}
                      {suggestion.complexity && (
                        <span>Complejidad: {suggestion.complexity}/5</span>
                      )}
                      {suggestion.vulnerabilities && (
                        <span>Vulnerabilidades: {suggestion.vulnerabilities}/5</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {aiSuggestions.length > 0 && (
            <div className="flex justify-between items-center mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {selectedSuggestion ? 'Haz clic en "Usar Sugerencia" para completar el formulario.' : 'Selecciona una sugerencia para continuar.'}
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowSuggestionsModal(false);
                    setSelectedSuggestion(null);
                  }}
                  data-testid="button-cancel-suggestions"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleUseSuggestion}
                  disabled={!selectedSuggestion}
                  className="bg-purple-600 hover:bg-purple-700"
                  data-testid="button-use-suggestion"
                >
                  Usar Sugerencia
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Form>
  );
}