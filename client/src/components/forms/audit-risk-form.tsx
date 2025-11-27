import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { insertAuditRiskSchema, type AuditRisk } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { calculateInherentRisk } from "@/lib/risk-calculations";
import { calculateProbability, type ProbabilityFactors, calculateDynamicProbability, type DynamicProbabilityFactors, type DynamicCriterion } from "@shared/probability-calculation";
import { calculateImpact, type ImpactFactors } from "@shared/impact-calculation";
import ProbabilityWheel from "@/components/probability/ProbabilityWheel";
import ProbabilityWheelNew from "@/components/probability/ProbabilityWheelNew";
import ImpactWheel from "@/components/probability/ImpactWheel";
import RiskHeatMap from "@/components/probability/RiskHeatMap";
import type { z } from "zod";

type AuditRiskFormData = z.infer<typeof insertAuditRiskSchema> & {
  directProbability?: number;
};

interface AuditRiskFormProps {
  auditId: string;
  auditRisk?: AuditRisk;
  onSuccess?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AuditRiskForm({ auditId, auditRisk, onSuccess, open, onOpenChange }: AuditRiskFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [probabilityInputMode, setProbabilityInputMode] = useState<'factors' | 'direct'>('factors');

  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/auth/user'],
  });

  const { data: probabilityCriteria = [] } = useQuery<DynamicCriterion[]>({
    queryKey: ["/api/probability-criteria/active"],
  });

  const form = useForm<AuditRiskFormData>({
    resolver: zodResolver(insertAuditRiskSchema),
    defaultValues: {
      auditId,
      code: auditRisk?.code || "",
      name: auditRisk?.name || "",
      description: auditRisk?.description || "",
      category: auditRisk?.category || [],
      evaluationMethod: auditRisk?.evaluationMethod || "factors",
      frequencyOccurrence: auditRisk?.frequencyOccurrence || 1,
      exposureVolume: auditRisk?.exposureVolume || 1,
      exposureMassivity: auditRisk?.exposureMassivity || 1,
      exposureCriticalPath: auditRisk?.exposureCriticalPath || 1,
      complexity: auditRisk?.complexity || 1,
      changeVolatility: auditRisk?.changeVolatility || 1,
      vulnerabilities: auditRisk?.vulnerabilities || 1,
      impact: auditRisk?.impact || 1,
      probability: auditRisk?.probability || 3,
      inherentRisk: auditRisk?.inherentRisk || 3,
      status: auditRisk?.status || "identified",
      source: auditRisk?.source || "audit_fieldwork",
      potentialImpact: auditRisk?.potentialImpact || "",
      recommendedControls: auditRisk?.recommendedControls || "",
      identifiedBy: auditRisk?.identifiedBy || "",
      createdBy: auditRisk?.createdBy || "",
    },
  });

  const watchFieldNames = useMemo(() => {
    if (probabilityCriteria && probabilityCriteria.length > 0) {
      const sortedCriteria = [...probabilityCriteria].sort((a, b) => a.order - b.order);
      return sortedCriteria.map(criterion => {
        switch (criterion.fieldName) {
          case 'frequency_occurrence': return 'frequencyOccurrence';
          case 'exposure_volume': return 'exposureVolume';
          case 'exposure_massivity': return 'exposureMassivity';
          case 'exposure_critical_path': return 'exposureCriticalPath';
          case 'complexity': return 'complexity';
          case 'change_volatility': return 'changeVolatility';
          case 'vulnerabilities': return 'vulnerabilities';
          default: return criterion.fieldName;
        }
      });
    } else {
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
  const watchedDirectProbability = form.watch("probability");
  const watchedImpact = form.watch("impact");

  let finalProbability: number;

  if (probabilityInputMode === 'direct') {
    finalProbability = watchedDirectProbability || 1;
  } else {
    if (probabilityCriteria && probabilityCriteria.length > 0) {
      const dynamicFactors: DynamicProbabilityFactors = {};

      probabilityCriteria.forEach((criterion, index) => {
        const formValue = watchedFactors[index];
        const numericValue = typeof formValue === 'number' ? formValue : 1;
        dynamicFactors[criterion.fieldName] = numericValue;
      });

      finalProbability = calculateDynamicProbability(dynamicFactors, probabilityCriteria);
    } else {
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

  // Initial impact factors - default to 1 for audit risks
  const initialImpactFactors = useMemo<ImpactFactors>(() => ({
    infrastructure: 1,
    reputation: 1,
    economic: 1,
    permits: 1,
    knowhow: 1,
    people: 1,
    information: 1,
  }), []);

  // State to track current impact factors
  const [impactFactors, setImpactFactors] = useState<ImpactFactors>(initialImpactFactors);

  // Update state when audit risk changes
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
              case 'exposure_massivity': return 'exposureMassivity';
              case 'exposure_critical_path': return 'exposureCriticalPath';
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
      return renderLegacyProbabilityFields();
    }
  };

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
    mutationFn: async (data: AuditRiskFormData) => {
      const payload = {
        ...data,
        auditId,
        evaluationMethod: probabilityInputMode,
        probability: finalProbability,
        inherentRisk,
        identifiedBy: currentUser?.id || data.identifiedBy,
        createdBy: currentUser?.id || data.createdBy,
      };

      if (auditRisk) {
        return await apiRequest(`/api/audit-risks/${auditRisk.id}`, "PUT", payload);
      } else {
        return await apiRequest(`/api/audits/${auditId}/ad-hoc-risks`, "POST", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/audits', auditId, 'risks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/audits', auditId] });
      
      toast({
        title: auditRisk ? "Riesgo actualizado" : "Riesgo creado",
        description: `El riesgo ad-hoc ha sido ${auditRisk ? "actualizado" : "creado"} exitosamente.`,
      });
      
      onSuccess?.();
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: `No se pudo ${auditRisk ? "actualizar" : "crear"} el riesgo.`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AuditRiskFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{auditRisk ? "Editar" : "Agregar"} Riesgo Ad-hoc</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input placeholder="R-001" data-testid="input-code" {...field} />
                    </FormControl>
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
                          <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="identified">Identificado</SelectItem>
                        <SelectItem value="assessed">Evaluado</SelectItem>
                        <SelectItem value="mitigated">Mitigado</SelectItem>
                        <SelectItem value="closed">Cerrado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Riesgo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Falta de segregación de funciones" data-testid="input-name" {...field} />
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
                      placeholder="Descripción detallada del riesgo..." 
                      data-testid="textarea-description"
                      rows={3}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fuente</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-source">
                          <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="audit_fieldwork">Trabajo de campo</SelectItem>
                        <SelectItem value="stakeholder_interview">Entrevista con stakeholders</SelectItem>
                        <SelectItem value="document_review">Revisión de documentos</SelectItem>
                        <SelectItem value="process_observation">Observación de procesos</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-6">
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
                        form.setValue("probability", probability);
                        form.setValue("impact", impact);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              <div className="text-center flex flex-col items-center justify-center">
                <div className="text-4xl font-bold text-blue-600">{finalProbability.toFixed(1)}</div>
                <p className="mt-2 text-sm font-medium">Probabilidad</p>
                <p className="text-xs text-muted-foreground">{probabilityInputMode === 'factors' ? '(Calculado)' : '(Directo)'}</p>
              </div>
              <div className="text-center flex flex-col items-center justify-center">
                <div className="text-4xl font-bold text-orange-600">{watchedImpact.toFixed(1)}</div>
                <p className="mt-2 text-sm font-medium">Impacto</p>
              </div>
              <div className="text-center flex flex-col items-center justify-center">
                <div className="text-4xl font-bold text-red-600">{inherentRisk.toFixed(1)}</div>
                <p className="mt-2 text-sm font-medium">Riesgo Inherente</p>
                <p className="text-xs text-muted-foreground">(P × I)</p>
              </div>
            </div>

            <FormField
              control={form.control}
              name="potentialImpact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Impacto Potencial</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descripción del impacto potencial si se materializa el riesgo..." 
                      data-testid="textarea-potential-impact"
                      rows={3}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="recommendedControls"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Controles Recomendados</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Controles recomendados para mitigar este riesgo..." 
                      data-testid="textarea-recommended-controls"
                      rows={3}
                      {...field}
                      value={field.value || ""}
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
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                data-testid="button-submit"
              >
                {mutation.isPending ? "Guardando..." : (auditRisk ? "Actualizar" : "Crear")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
