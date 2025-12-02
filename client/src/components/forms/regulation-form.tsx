import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertRegulationSchema, type InsertRegulation, type Regulation } from "@shared/schema";
import { z } from "zod";
import { useEffect, useState } from "react";
import { CalendarIcon, X, Plus, Search, Check, ChevronsUpDown, ChevronRight, Building2, Folder, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = insertRegulationSchema.omit({
  updatedBy: true,
  promulgationDate: true,
  effectiveDate: true,
  lastUpdateDate: true,
}).extend({
  description: z.string().optional(),
  law: z.string().optional(),
  article: z.string().optional(),
  clause: z.string().optional(),
  applicability: z.string().optional(),
  crimeCategory: z.string().optional(),
  applicabilityEntities: z.array(z.object({
    type: z.enum(['all', 'macroproceso', 'proceso', 'subproceso']),
    id: z.string(),
    name: z.string()
  })).optional(),
  effectiveDate: z.string().optional(),
  risks: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface RegulationFormProps {
  regulation?: Regulation;
  onSuccess?: () => void;
}

export default function RegulationForm({ regulation, onSuccess }: RegulationFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openCombobox, setOpenCombobox] = useState(false);
  const [selectedApplicability, setSelectedApplicability] = useState<any[]>([]);
  const [applicabilityMode, setApplicabilityMode] = useState<'all' | 'specific'>('specific');

  // Load available risks
  const { data: risksResponse } = useQuery<{ data: any[], pagination: { limit: number, offset: number, total: number } }>({
    queryKey: ["/api/risks"],
    staleTime: 60000,
  });
  const risks = risksResponse?.data || [];

  // Load macroprocesos
  const { data: macroprocesos = [] } = useQuery<any[]>({
    queryKey: ["/api/macroprocesos"],
  });

  // Load processes
  const { data: processes = [] } = useQuery<any[]>({
    queryKey: ["/api/processes"],
  });

  // Load subprocesses
  const { data: subprocesos = [] } = useQuery<any[]>({
    queryKey: ["/api/subprocesos"],
  });

  // Load crime categories
  const { data: crimeCategories = [] } = useQuery<any[]>({
    queryKey: ["/api/crime-categories"],
  });

  // Load existing risk associations for editing
  const { data: existingAssociations = [] } = useQuery<any[]>({
    queryKey: ["/api/regulations", regulation?.id, "risks"],
    enabled: !!regulation?.id,
    staleTime: 60000,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: regulation?.code || "",
      name: regulation?.name || "",
      description: regulation?.description ?? "",
      issuingOrganization: regulation?.issuingOrganization || "",
      sourceType: regulation?.sourceType || "external",
      law: regulation?.law ?? "",
      article: regulation?.article ?? "",
      clause: regulation?.clause ?? "",
      effectiveDate: regulation?.effectiveDate ? format(new Date(regulation.effectiveDate), 'yyyy-MM-dd') : "",
      status: regulation?.status || "vigente",
      applicability: regulation?.applicability ?? "",
      crimeCategory: regulation?.agrupacion ?? "",
      applicabilityEntities: [],
      isActive: regulation?.isActive ?? true,
      createdBy: regulation?.createdBy || "user-1", // Default user
      risks: [], // Will be set via useEffect when existingAssociations loads
    },
  });

  // Update form with existing risk associations when editing
  useEffect(() => {
    if (regulation && Array.isArray(existingAssociations) && existingAssociations.length > 0) {
      const riskIds = existingAssociations.map((assoc: any) => assoc.riskId);
      form.setValue('risks', riskIds);
    }
  }, [regulation, existingAssociations, form]);

  const createMutation = useMutation({
    mutationFn: (data: InsertRegulation) => apiRequest("/api/regulations", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regulations"] });
      toast({ title: "Normativa creada", description: "La normativa ha sido creada exitosamente." });
      onSuccess?.();
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo crear la normativa.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: InsertRegulation) => apiRequest(`/api/regulations/${regulation!.id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regulations"] });
      toast({ title: "Normativa actualizada", description: "La normativa ha sido actualizada exitosamente." });
      onSuccess?.();
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo actualizar la normativa.", variant: "destructive" });
    },
  });

  const onSubmit = async (data: FormData) => {
    // Extract risks for separate handling and exclude from submission
    const { risks: selectedRisks, ...regulationData } = data;
    
    // Convert date strings to timestamps or undefined and ensure proper typing
    const baseData: Omit<InsertRegulation, 'updatedBy'> = {
      code: regulationData.code,
      name: regulationData.name,
      description: regulationData.description || undefined,
      issuingOrganization: regulationData.issuingOrganization,
      sourceType: regulationData.sourceType,
      law: regulationData.law || undefined,
      article: regulationData.article || undefined,
      clause: regulationData.clause || undefined,
      effectiveDate: regulationData.effectiveDate ? new Date(regulationData.effectiveDate) : undefined,
      status: regulationData.status,
      applicability: regulationData.applicability || undefined,
      agrupacion: regulationData.crimeCategory || undefined,
      isActive: regulationData.isActive,
      createdBy: regulationData.createdBy,
    };

    if (regulation) {
      // For updates, include updatedBy
      const submitData: InsertRegulation = {
        ...baseData,
        updatedBy: "user-1"
      };
      
      // Update regulation and then handle risk associations
      try {
        await apiRequest(`/api/regulations/${regulation.id}`, "PUT", submitData);
        
        // Remove existing associations first
        await clearExistingRiskAssociations(regulation.id);
        
        // Handle risk associations if any were selected
        if (selectedRisks && selectedRisks.length > 0) {
          await handleRiskAssociations(regulation.id, selectedRisks);
        }
        
        queryClient.invalidateQueries({ queryKey: ["/api/regulations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/risk-regulations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/regulations", regulation.id, "risks"] });
        toast({ title: "Normativa actualizada", description: "La normativa y sus asociaciones han sido actualizadas exitosamente." });
        onSuccess?.();
      } catch (error) {
        toast({ title: "Error", description: "No se pudo actualizar la normativa.", variant: "destructive" });
      }
    } else {
      // For creation, create regulation first then associations
      try {
        const response = await apiRequest("/api/regulations", "POST", baseData as InsertRegulation) as any;
        
        // Handle risk associations if any were selected
        if (selectedRisks && selectedRisks.length > 0) {
          await handleRiskAssociations(response.id, selectedRisks);
        }
        
        queryClient.invalidateQueries({ queryKey: ["/api/regulations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/risk-regulations"] });
        toast({ title: "Normativa creada", description: "La normativa y sus asociaciones han sido creadas exitosamente." });
        onSuccess?.();
      } catch (error) {
        toast({ title: "Error", description: "No se pudo crear la normativa.", variant: "destructive" });
      }
    }
  };

  const clearExistingRiskAssociations = async (regulationId: string) => {
    // Get existing associations and delete them
    try {
      const existingAssocs = await apiRequest(`/api/regulations/${regulationId}/risks`, "GET");
      if (Array.isArray(existingAssocs)) {
        for (const assoc of existingAssocs) {
          await apiRequest(`/api/risk-regulations/${assoc.id}`, "DELETE");
        }
      }
    } catch (error) {
      console.error("Error clearing existing associations:", error);
    }
  };

  const handleRiskAssociations = async (regulationId: string, riskIds: string[]) => {
    // Deduplicate risk IDs to prevent duplicates
    const uniqueRiskIds = [...new Set(riskIds)];
    
    // Create associations for each selected risk
    for (const riskId of uniqueRiskIds) {
      try {
        await apiRequest("/api/risk-regulations", "POST", {
          riskId,
          regulationId,
          complianceRequirement: "Cumplimiento requerido según normativa",
          criticality: "medium",
          status: "not_assessed"
        });
      } catch (error) {
        console.error(`Error creating association for risk ${riskId}:`, error);
      }
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Nombre de la Normativa *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ej: Ley Sarbanes-Oxley"
                    data-testid="input-regulation-name"
                    {...field}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") {
                        e.stopPropagation();
                      }
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ej: SOX-2002"
                    data-testid="input-regulation-code"
                    {...field}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") {
                        e.stopPropagation();
                      }
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="issuingOrganization"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organismo Emisor *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ej: SEC, Superintendencia Financiera"
                    data-testid="input-issuing-organization"
                    {...field}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") {
                        e.stopPropagation();
                      }
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sourceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Fuente *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-source-type">
                      <SelectValue placeholder="Seleccione el tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="external">Externa</SelectItem>
                    <SelectItem value="internal">Interna</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="crimeCategory"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría de Delito</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-crime-category">
                      <SelectValue placeholder="Seleccione una categoría" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Sin categoría</SelectItem>
                    {crimeCategories.map((category: any) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Categoría de delito a la que pertenece esta normativa
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
                <FormLabel>Estado *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-status">
                      <SelectValue placeholder="Seleccione el estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="vigente">Vigente</SelectItem>
                    <SelectItem value="derogada">Derogada</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Descripción detallada de la normativa"
                  className="min-h-[80px]"
                  data-testid="textarea-description"
                  {...field}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") {
                      e.stopPropagation();
                    }
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="law"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ley</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ej: Ley 1314 de 2009"
                    data-testid="input-law"
                    {...field}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") {
                        e.stopPropagation();
                      }
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="article"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Artículo</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ej: Artículo 15"
                    data-testid="input-article"
                    {...field}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") {
                        e.stopPropagation();
                      }
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clause"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numeral/Inciso</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ej: Numeral 3"
                    data-testid="input-clause"
                    {...field}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") {
                        e.stopPropagation();
                      }
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="effectiveDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha de Entrada en Vigor</FormLabel>
              <FormControl>
                <Input 
                  type="date"
                  data-testid="input-effective-date"
                  {...field}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") {
                      e.stopPropagation();
                    }
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Selector de Aplicabilidad Jerárquico */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Aplicabilidad</Label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="all"
                  checked={applicabilityMode === 'all'}
                  onChange={() => {
                    setApplicabilityMode('all');
                    setSelectedApplicability([{ type: 'all', id: 'all', name: 'Todos los Macroprocesos' }]);
                    form.setValue('applicabilityEntities', [{ type: 'all', id: 'all', name: 'Todos los Macroprocesos' }]);
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm">Todos los Macroprocesos</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="specific"
                  checked={applicabilityMode === 'specific'}
                  onChange={() => {
                    setApplicabilityMode('specific');
                    setSelectedApplicability([]);
                    form.setValue('applicabilityEntities', []);
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm">Selección Específica</span>
              </label>
            </div>
          </div>

          {applicabilityMode === 'specific' && (
            <div className="border rounded-lg p-4">
              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {/* Macroprocesos */}
                  <div>
                    <div className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Macroprocesos
                    </div>
                    <div className="space-y-1 pl-6">
                      {macroprocesos.map((macro: any) => {
                        const isSelected = selectedApplicability.some(item => item.id === macro.id && item.type === 'macroproceso');
                        const relatedProcesses = processes.filter((p: any) => p.macroprocesoId === macro.id);
                        
                        return (
                          <div key={macro.id} className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`macro-${macro.id}`}
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    const newSelection = [...selectedApplicability, { type: 'macroproceso', id: macro.id, name: macro.name }];
                                    setSelectedApplicability(newSelection);
                                    form.setValue('applicabilityEntities', newSelection);
                                  } else {
                                    const newSelection = selectedApplicability.filter(item => !(item.id === macro.id && item.type === 'macroproceso'));
                                    setSelectedApplicability(newSelection);
                                    form.setValue('applicabilityEntities', newSelection);
                                  }
                                }}
                              />
                              <label htmlFor={`macro-${macro.id}`} className="text-sm cursor-pointer">
                                {macro.name}
                              </label>
                            </div>
                            
                            {/* Procesos de este Macroproceso */}
                            {relatedProcesses.length > 0 && (
                              <div className="pl-6 space-y-1">
                                {relatedProcesses.map((process: any) => {
                                  const isProcessSelected = selectedApplicability.some(item => item.id === process.id && item.type === 'proceso');
                                  const relatedSubprocesses = subprocesos.filter((s: any) => s.processId === process.id);
                                  
                                  return (
                                    <div key={process.id} className="space-y-1">
                                      <div className="flex items-center space-x-2">
                                        <Checkbox
                                          id={`process-${process.id}`}
                                          checked={isProcessSelected}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              const newSelection = [...selectedApplicability, { type: 'proceso', id: process.id, name: process.name }];
                                              setSelectedApplicability(newSelection);
                                              form.setValue('applicabilityEntities', newSelection);
                                            } else {
                                              const newSelection = selectedApplicability.filter(item => !(item.id === process.id && item.type === 'proceso'));
                                              setSelectedApplicability(newSelection);
                                              form.setValue('applicabilityEntities', newSelection);
                                            }
                                          }}
                                        />
                                        <Folder className="h-3 w-3 text-muted-foreground" />
                                        <label htmlFor={`process-${process.id}`} className="text-sm cursor-pointer">
                                          {process.name}
                                        </label>
                                      </div>
                                      
                                      {/* Subprocesos de este Proceso */}
                                      {relatedSubprocesses.length > 0 && (
                                        <div className="pl-6 space-y-1">
                                          {relatedSubprocesses.map((subprocess: any) => {
                                            const isSubprocessSelected = selectedApplicability.some(item => item.id === subprocess.id && item.type === 'subproceso');
                                            
                                            return (
                                              <div key={subprocess.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                  id={`subprocess-${subprocess.id}`}
                                                  checked={isSubprocessSelected}
                                                  onCheckedChange={(checked) => {
                                                    if (checked) {
                                                      const newSelection = [...selectedApplicability, { type: 'subproceso', id: subprocess.id, name: subprocess.name }];
                                                      setSelectedApplicability(newSelection);
                                                      form.setValue('applicabilityEntities', newSelection);
                                                    } else {
                                                      const newSelection = selectedApplicability.filter(item => !(item.id === subprocess.id && item.type === 'subproceso'));
                                                      setSelectedApplicability(newSelection);
                                                      form.setValue('applicabilityEntities', newSelection);
                                                    }
                                                  }}
                                                />
                                                <FileText className="h-3 w-3 text-muted-foreground" />
                                                <label htmlFor={`subprocess-${subprocess.id}`} className="text-sm cursor-pointer">
                                                  {subprocess.name}
                                                </label>
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
                  </div>
                </div>
              </ScrollArea>
              
              {selectedApplicability.length > 0 && applicabilityMode === 'specific' && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Seleccionados ({selectedApplicability.length}):</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedApplicability.map((item) => (
                      <Badge key={`${item.type}-${item.id}`} variant="secondary" className="text-xs">
                        {item.type === 'macroproceso' && <Building2 className="h-3 w-3 mr-1" />}
                        {item.type === 'proceso' && <Folder className="h-3 w-3 mr-1" />}
                        {item.type === 'subproceso' && <FileText className="h-3 w-3 mr-1" />}
                        {item.name}
                        <button
                          type="button"
                          onClick={() => {
                            const newSelection = selectedApplicability.filter(i => !(i.id === item.id && i.type === item.type));
                            setSelectedApplicability(newSelection);
                            form.setValue('applicabilityEntities', newSelection);
                          }}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Riesgos Asociados */}
        <FormField
          control={form.control}
          name="risks"
          render={({ field }) => {
            const availableRisks = risks
              .filter((risk: any) => risk.status === "active")
              .map((risk: any) => ({ id: risk.id, name: risk.name, code: risk.code }));

            const addRisk = (riskId: string) => {
              const currentRisks = field.value || [];
              if (!currentRisks.includes(riskId)) {
                field.onChange([...currentRisks, riskId]);
              }
              setOpenCombobox(false);
            };

            const removeRisk = (riskId: string) => {
              const currentRisks = field.value || [];
              field.onChange(currentRisks.filter((id: string) => id !== riskId));
            };

            return (
              <FormItem>
                <FormLabel>Riesgos Asociados</FormLabel>
                <FormDescription>
                  Selecciona los riesgos que están sujetos a esta normativa
                </FormDescription>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCombobox}
                            className="flex-1 justify-between"
                            data-testid="select-risk-combobox"
                          >
                            Buscar y seleccionar riesgos...
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0">
                        <Command>
                          <CommandInput 
                            placeholder="Buscar riesgos por nombre o código..." 
                            data-testid="input-search-risks"
                          />
                          <CommandEmpty>No se encontraron riesgos.</CommandEmpty>
                          <CommandGroup>
                            <CommandList className="max-h-[200px] overflow-y-auto">
                              {availableRisks
                                .filter((risk: any) => !(field.value || []).includes(risk.id))
                                .map((risk: any) => (
                                  <CommandItem
                                    key={risk.id}
                                    value={`${risk.name} ${risk.code || ""}`}
                                    onSelect={() => addRisk(risk.id)}
                                    data-testid={`risk-option-${risk.id}`}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        (field.value || []).includes(risk.id)
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-medium">{risk.name}</span>
                                      {risk.code && (
                                        <span className="text-xs text-muted-foreground">{risk.code}</span>
                                      )}
                                    </div>
                                  </CommandItem>
                                ))}
                            </CommandList>
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="whitespace-nowrap"
                      data-testid="button-create-risk"
                      onClick={() => {
                        // TODO: Open risk creation modal or navigate to risk creation
                        toast({
                          title: "Crear nuevo riesgo",
                          description: "Funcionalidad en desarrollo. Ve a la página de Riesgos para crear uno nuevo.",
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Crear Riesgo
                    </Button>
                  </div>
                  
                  {/* Display selected risks */}
                  <div className="flex flex-wrap gap-2">
                    {(field.value || []).map((riskId: string) => {
                      const riskData = risks.find((risk: any) => risk.id === riskId);
                      return (
                        <Badge 
                          key={riskId} 
                          className="flex items-center gap-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          data-testid={`risk-badge-${riskId}`}
                        >
                          {riskData?.name || "Riesgo no encontrado"}
                          <X 
                            className="h-3 w-3 cursor-pointer hover:opacity-75" 
                            onClick={() => removeRisk(riskId)}
                            data-testid={`remove-risk-${riskId}`}
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

        <div className="flex justify-end gap-2 pt-4">
          <Button 
            type="submit" 
            disabled={isLoading}
            data-testid="button-submit-regulation"
          >
            {isLoading ? "Guardando..." : regulation ? "Actualizar" : "Crear"} Normativa
          </Button>
        </div>
      </form>
    </Form>
  );
}