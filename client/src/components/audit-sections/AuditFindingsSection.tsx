import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { AuditSectionProps } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { 
  FileWarning, 
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Search,
  ChevronDown,
  ChevronRight,
  User,
  Calendar,
  Target,
  Shield,
  Plus
} from "lucide-react";
import type { AuditFinding, InsertAuditFinding } from "@shared/schema";
import { insertAuditFindingSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const auditFindingFormSchema = insertAuditFindingSchema.extend({
  dueDate: z.string().optional(),
});

type AuditFindingFormData = z.infer<typeof auditFindingFormSchema>;

export function AuditFindingsSection({ audit }: AuditSectionProps) {
  const [, setLocation] = useLocation();
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [showFindingDialog, setShowFindingDialog] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<AuditFindingFormData>({
    resolver: zodResolver(auditFindingFormSchema),
    defaultValues: {
      auditId: audit.id,
      title: "",
      description: "",
      type: "deficiency",
      severity: "medium",
      condition: "",
      criteria: "",
      cause: "",
      effect: "",
      recommendation: "",
      managementResponse: "",
      agreedAction: "",
      responsiblePerson: "",
      dueDate: "",
      status: "open",
      identifiedBy: user?.id || "",
    },
  });

  // Update identifiedBy when user changes
  useEffect(() => {
    if (user?.id && form.getValues("identifiedBy") === "") {
      form.setValue("identifiedBy", user.id);
    }
  }, [user, form]);

  const { data: findings = [], isLoading } = useQuery<AuditFinding[]>({
    queryKey: ["/api/audit-findings", { auditId: audit.id }],
  });

  const createFindingMutation = useMutation({
    mutationFn: async (data: AuditFindingFormData) => {
      return apiRequest("/api/audit-findings", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audit-findings"] });
      toast({
        title: "Hallazgo creado",
        description: "El hallazgo se ha registrado exitosamente.",
      });
      setShowFindingDialog(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear hallazgo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateFinding = (data: AuditFindingFormData) => {
    createFindingMutation.mutate({
      ...data,
      auditId: audit.id,
    });
  };

  const toggleFindingExpansion = (findingId: string) => {
    setExpandedFindings(prev => {
      const next = new Set(prev);
      if (next.has(findingId)) {
        next.delete(findingId);
      } else {
        next.add(findingId);
      }
      return next;
    });
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: "bg-red-600 text-white",
      high: "bg-orange-500 text-white",
      medium: "bg-yellow-500 text-white",
      low: "bg-blue-500 text-white",
    };
    return colors[severity] || "bg-gray-500 text-white";
  };

  const getSeverityText = (severity: string) => {
    const texts: Record<string, string> = {
      critical: "Crítica",
      high: "Alta",
      medium: "Media",
      low: "Baja",
    };
    return texts[severity] || severity;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      deficiency: "bg-red-100 text-red-800",
      weakness: "bg-orange-100 text-orange-800",
      observation: "bg-blue-100 text-blue-800",
      opportunity: "bg-green-100 text-green-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const getTypeText = (type: string) => {
    const texts: Record<string, string> = {
      deficiency: "Deficiencia",
      weakness: "Debilidad",
      observation: "Observación",
      opportunity: "Oportunidad",
    };
    return texts[type] || type;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-red-100 text-red-800",
      in_progress: "bg-yellow-100 text-yellow-800",
      implemented: "bg-green-100 text-green-800",
      overdue: "bg-red-600 text-white",
      closed: "bg-gray-400 text-white",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      open: "Abierto",
      in_progress: "En Progreso",
      implemented: "Implementado",
      overdue: "Vencido",
      closed: "Cerrado",
    };
    return texts[status] || status;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "Sin fecha";
    return new Date(date).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredFindings = findings.filter(finding => {
    const matchesSearch = finding.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         finding.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === "all" || finding.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const severityCounts = {
    all: findings.length,
    critical: findings.filter(f => f.severity === "critical").length,
    high: findings.filter(f => f.severity === "high").length,
    medium: findings.filter(f => f.severity === "medium").length,
    low: findings.filter(f => f.severity === "low").length,
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (findings.length === 0) {
    return (
      <div className="space-y-4">
        {/* Header Principal */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileWarning className="h-6 w-6" />
            Hallazgos de Auditoría
          </h2>
          <Button
            onClick={() => setShowFindingDialog(true)}
            data-testid="button-create-finding"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Hallazgo
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h3 className="font-medium mb-2">No se han registrado hallazgos</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Excelente trabajo. No se han identificado desviaciones o deficiencias durante la auditoría.
              </p>
              <Button
                onClick={() => setShowFindingDialog(true)}
                variant="outline"
                data-testid="button-create-first-finding"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Primer Hallazgo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="audit-findings">
      {/* Header Principal */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileWarning className="h-6 w-6" />
          Hallazgos de Auditoría
        </h2>
        <Button
          onClick={() => setShowFindingDialog(true)}
          data-testid="button-create-finding-main"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Hallazgo
        </Button>
      </div>

      <Card data-testid="card-findings-summary">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <button
              onClick={() => setSeverityFilter("all")}
              className={`p-3 rounded-lg border-2 transition-colors ${
                severityFilter === "all" 
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" 
                  : "border-gray-200 hover:border-gray-300"
              }`}
              data-testid="filter-all"
            >
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{severityCounts.all}</p>
            </button>
            <button
              onClick={() => setSeverityFilter("critical")}
              className={`p-3 rounded-lg border-2 transition-colors ${
                severityFilter === "critical" 
                  ? "border-red-600 bg-red-50 dark:bg-red-950/20" 
                  : "border-gray-200 hover:border-gray-300"
              }`}
              data-testid="filter-critical"
            >
              <p className="text-sm text-muted-foreground">Críticos</p>
              <p className="text-2xl font-bold text-red-600">{severityCounts.critical}</p>
            </button>
            <button
              onClick={() => setSeverityFilter("high")}
              className={`p-3 rounded-lg border-2 transition-colors ${
                severityFilter === "high" 
                  ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20" 
                  : "border-gray-200 hover:border-gray-300"
              }`}
              data-testid="filter-high"
            >
              <p className="text-sm text-muted-foreground">Altos</p>
              <p className="text-2xl font-bold text-orange-600">{severityCounts.high}</p>
            </button>
            <button
              onClick={() => setSeverityFilter("medium")}
              className={`p-3 rounded-lg border-2 transition-colors ${
                severityFilter === "medium" 
                  ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" 
                  : "border-gray-200 hover:border-gray-300"
              }`}
              data-testid="filter-medium"
            >
              <p className="text-sm text-muted-foreground">Medios</p>
              <p className="text-2xl font-bold text-yellow-600">{severityCounts.medium}</p>
            </button>
            <button
              onClick={() => setSeverityFilter("low")}
              className={`p-3 rounded-lg border-2 transition-colors ${
                severityFilter === "low" 
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" 
                  : "border-gray-200 hover:border-gray-300"
              }`}
              data-testid="filter-low"
            >
              <p className="text-sm text-muted-foreground">Bajos</p>
              <p className="text-2xl font-bold text-blue-600">{severityCounts.low}</p>
            </button>
          </div>

          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código o título..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {filteredFindings.map((finding) => {
          const isExpanded = expandedFindings.has(finding.id);

          return (
            <Card key={finding.id} data-testid={`card-finding-${finding.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => toggleFindingExpansion(finding.id)}
                        data-testid={`button-toggle-${finding.id}`}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      <Badge variant="outline" className="font-mono text-xs">
                        {finding.code}
                      </Badge>
                      <Badge className={getSeverityColor(finding.severity)}>
                        {getSeverityText(finding.severity)}
                      </Badge>
                      <Badge className={getTypeColor(finding.type)}>
                        {getTypeText(finding.type)}
                      </Badge>
                      <Badge className={getStatusColor(finding.status)}>
                        {getStatusText(finding.status)}
                      </Badge>
                    </div>
                    <h3 className="font-medium text-sm" data-testid={`text-finding-title-${finding.id}`}>
                      {finding.title}
                    </h3>
                    {finding.description && !isExpanded && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {finding.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {finding.severity === "critical" && (
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    )}
                    {finding.severity === "high" && (
                      <AlertCircle className="h-6 w-6 text-orange-600" />
                    )}
                    {finding.dueDate && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Vence</p>
                        <p className="text-xs font-medium">{formatDate(finding.dueDate)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0 space-y-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-800">
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Condición (Lo que encontramos)
                          </h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {finding.condition}
                          </p>
                        </div>

                        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Criterio (Lo que debería ser)
                          </h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {finding.criteria}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-md border border-yellow-200 dark:border-yellow-800">
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <Info className="h-4 w-4" />
                            Causa (Por qué ocurrió)
                          </h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {finding.cause}
                          </p>
                        </div>

                        <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-md border border-orange-200 dark:border-orange-800">
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Efecto (Impacto o consecuencias)
                          </h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {finding.effect}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Recomendación
                      </h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {finding.recommendation}
                      </p>
                    </div>

                    {finding.managementResponse && (
                      <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-md border border-purple-200 dark:border-purple-800">
                        <h4 className="text-sm font-medium mb-2">Respuesta de la Gerencia</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {finding.managementResponse}
                        </p>
                      </div>
                    )}

                    {finding.agreedAction && (
                      <div className="p-3 bg-teal-50 dark:bg-teal-950/20 rounded-md border border-teal-200 dark:border-teal-800">
                        <h4 className="text-sm font-medium mb-2">Acción Acordada</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {finding.agreedAction}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-accent/50 rounded-lg">
                      {finding.responsiblePerson && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Responsable
                          </p>
                          <p className="text-sm font-medium">
                            {finding.responsiblePerson}
                          </p>
                        </div>
                      )}
                      {finding.dueDate && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Fecha de Vencimiento
                          </p>
                          <p className="text-sm font-medium">{formatDate(finding.dueDate)}</p>
                        </div>
                      )}
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Identificado Por
                        </p>
                        <p className="text-sm font-medium">{finding.identifiedBy}</p>
                      </div>
                    </div>

                    {finding.description && (
                      <div className="p-3 bg-accent/30 rounded-md">
                        <h4 className="text-sm font-medium mb-2">Descripción Detallada</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {finding.description}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {filteredFindings.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium mb-2">No se encontraron hallazgos</h3>
            <p className="text-sm text-muted-foreground">
              Intenta con otros términos de búsqueda o filtros
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={showFindingDialog} onOpenChange={setShowFindingDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Hallazgo de Auditoría</DialogTitle>
            <DialogDescription>
              Registra un nuevo hallazgo identificado durante la auditoría {audit.code}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateFinding)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título del Hallazgo *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Breve descripción del hallazgo" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="deficiency">Deficiencia</SelectItem>
                          <SelectItem value="weakness">Debilidad</SelectItem>
                          <SelectItem value="observation">Observación</SelectItem>
                          <SelectItem value="opportunity">Oportunidad</SelectItem>
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
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="critical">Crítica</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                          <SelectItem value="medium">Media</SelectItem>
                          <SelectItem value="low">Baja</SelectItem>
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
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="open">Abierto</SelectItem>
                          <SelectItem value="in_progress">En Progreso</SelectItem>
                          <SelectItem value="implemented">Implementado</SelectItem>
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
                name="condition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condición (Lo que encontramos) *</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} placeholder="Describe la situación observada" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="criteria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Criterio (Lo que debería ser) *</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} placeholder="Describe el estándar o normativa aplicable" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cause"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Causa (Por qué ocurrió) *</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} placeholder="Explica la razón de la desviación" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="effect"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Efecto (Impacto o consecuencias) *</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} placeholder="Describe el impacto de este hallazgo" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recommendation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recomendación *</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} placeholder="Sugiere acciones correctivas" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="responsiblePerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Responsable</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} placeholder="Persona responsable de la acción" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Vencimiento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFindingDialog(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createFindingMutation.isPending}
                >
                  {createFindingMutation.isPending ? "Creando..." : "Crear Hallazgo"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
