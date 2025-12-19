import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AuditSectionProps } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Plus, 
  Edit, 
  Trash2,
  FileText,
  AlertCircle,
  Check,
  ChevronsUpDown,
  Building,
  BookOpen
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AuditCriterion } from "@shared/schema";
import { cn } from "@/lib/utils";

type CriterionFormData = {
  title: string;
  description: string;
  criterionType: "interno" | "externo";
  sourceType: "manual" | "regulation" | "document";
  regulationId: string | null;
  documentId: string | null;
  normativeReference: string;
  evidenceExpectations: string;
  ownerArea: string;
  applicabilityNotes: string;
};

type RegulationOption = {
  id: string;
  code: string;
  name: string;
};

type DocumentOption = {
  id: string;
  internalCode: string;
  name: string;
};

export function AuditCriteriaSection({ audit }: AuditSectionProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<AuditCriterion | null>(null);
  const [formData, setFormData] = useState<CriterionFormData>({
    title: "",
    description: "",
    criterionType: "interno",
    sourceType: "manual",
    regulationId: null,
    documentId: null,
    normativeReference: "",
    evidenceExpectations: "",
    ownerArea: "",
    applicabilityNotes: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: criteria = [], isLoading } = useQuery<(AuditCriterion & { sourceCode?: string; sourceName?: string; sourceOrigin?: string })[]>({
    queryKey: ["/api/audits", audit.id, "criteria"],
    queryFn: async () => {
      const response = await fetch(`/api/audits/${audit.id}/criteria`);
      if (!response.ok) throw new Error("Failed to fetch criteria");
      return response.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: CriterionFormData) => {
      return apiRequest(`/api/audits/${audit.id}/criteria`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits", audit.id, "criteria"] });
      setIsCreating(false);
      resetForm();
      toast({ title: "Criterio creado exitosamente" });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "Error al crear criterio";
      const fieldError = error?.response?.data?.field;
      const description = fieldError 
        ? `Error en ${fieldError}: ${errorMessage}`
        : errorMessage;
      
      toast({ 
        title: "Error al crear criterio", 
        description,
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CriterionFormData> }) => {
      return apiRequest(`/api/audits/${audit.id}/criteria/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits", audit.id, "criteria"] });
      setEditingCriterion(null);
      resetForm();
      toast({ title: "Criterio actualizado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al actualizar criterio", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/audits/${audit.id}/criteria/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audits", audit.id, "criteria"] });
      toast({ title: "Criterio eliminado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al eliminar criterio", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      criterionType: "interno",
      sourceType: "manual",
      regulationId: null,
      documentId: null,
      normativeReference: "",
      evidenceExpectations: "",
      ownerArea: "",
      applicabilityNotes: ""
    });
  };

  const handleEdit = (criterion: AuditCriterion & { sourceCode?: string; sourceName?: string }) => {
    setEditingCriterion(criterion);
    setFormData({
      title: criterion.title || "",
      description: criterion.description || "",
      criterionType: (criterion.criterionType as "interno" | "externo") || "interno",
      sourceType: (criterion.sourceType as "manual" | "regulation" | "document") || "manual",
      regulationId: criterion.regulationId || null,
      documentId: criterion.documentId || null,
      normativeReference: criterion.normativeReference || "",
      evidenceExpectations: criterion.evidenceExpectations || "",
      ownerArea: criterion.ownerArea || "",
      applicabilityNotes: criterion.applicabilityNotes || ""
    });
  };

  const handleSubmit = () => {
    // Validar que el título no esté vacío
    if (!formData.title || !formData.title.trim()) {
      toast({ 
        title: "Error de validación", 
        description: "El título del criterio es requerido",
        variant: "destructive" 
      });
      return;
    }

    // Validar que si sourceType es "regulation", regulationId debe estar presente
    if (formData.sourceType === "regulation" && !formData.regulationId) {
      toast({ 
        title: "Error de validación", 
        description: "Debe seleccionar una normativa cuando el tipo de origen es 'Normativa'",
        variant: "destructive" 
      });
      return;
    }

    // Validar que si sourceType es "document", documentId debe estar presente
    if (formData.sourceType === "document" && !formData.documentId) {
      toast({ 
        title: "Error de validación", 
        description: "Debe seleccionar un documento cuando el tipo de origen es 'Gestión Documental'",
        variant: "destructive" 
      });
      return;
    }

    // Preparar datos para enviar (limpiar campos null/undefined)
    const dataToSend: CriterionFormData = {
      ...formData,
      regulationId: formData.sourceType === "regulation" ? formData.regulationId : null,
      documentId: formData.sourceType === "document" ? formData.documentId : null,
      // Asegurar que los campos opcionales sean strings vacíos en lugar de null
      description: formData.description || "",
      normativeReference: formData.normativeReference || "",
      evidenceExpectations: formData.evidenceExpectations || "",
      ownerArea: formData.ownerArea || "",
      applicabilityNotes: formData.applicabilityNotes || ""
    };

    if (editingCriterion) {
      updateMutation.mutate({ id: editingCriterion.id, data: dataToSend });
    } else {
      createMutation.mutate(dataToSend);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Criterios de Auditoría
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Elementos internos o externos para evaluar los aspectos bajo revisión
            </p>
          </div>
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => resetForm()}
                data-testid="button-create-criterion"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Criterio
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nuevo Criterio de Auditoría</DialogTitle>
                <DialogDescription>
                  Define un criterio interno o externo para evaluar los aspectos bajo revisión
                </DialogDescription>
              </DialogHeader>
              <CriterionForm 
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleSubmit}
                onCancel={() => setIsCreating(false)}
                isSubmitting={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {criteria.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No se han definido criterios de auditoría.</p>
              <p className="text-sm mt-2">Los criterios son fundamentales para evaluar los aspectos bajo revisión.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {criteria.map((criterion) => (
                <Card key={criterion.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg mb-1" data-testid={`text-criterion-title-${criterion.id}`}>
                          {criterion.title}
                        </h4>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge variant={criterion.criterionType === "externo" ? "default" : "secondary"}>
                            {criterion.criterionType === "externo" ? "Externo" : "Interno"}
                          </Badge>
                          {criterion.status === "approved" && (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              Aprobado
                            </Badge>
                          )}
                          {criterion.sourceOrigin && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700">
                              {criterion.sourceOrigin}
                            </Badge>
                          )}
                          {criterion.sourceCode && criterion.sourceName && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              {criterion.sourceCode} - {criterion.sourceName}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Dialog 
                          open={editingCriterion?.id === criterion.id} 
                          onOpenChange={(open) => {
                            if (!open) {
                              setEditingCriterion(null);
                              resetForm();
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEdit(criterion)}
                              data-testid={`button-edit-criterion-${criterion.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Editar Criterio</DialogTitle>
                              <DialogDescription>
                                Modifica la información del criterio de auditoría
                              </DialogDescription>
                            </DialogHeader>
                            <CriterionForm 
                              formData={formData}
                              setFormData={setFormData}
                              onSubmit={handleSubmit}
                              onCancel={() => {
                                setEditingCriterion(null);
                                resetForm();
                              }}
                              isSubmitting={updateMutation.isPending}
                            />
                          </DialogContent>
                        </Dialog>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            if (confirm("¿Está seguro de eliminar este criterio?")) {
                              deleteMutation.mutate(criterion.id);
                            }
                          }}
                          data-testid={`button-delete-criterion-${criterion.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>

                    {criterion.description && (
                      <p className="text-sm text-muted-foreground mb-3">{criterion.description}</p>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {criterion.normativeReference && (
                        <div>
                          <span className="font-medium">Referencia normativa:</span>
                          <p className="text-muted-foreground">{criterion.normativeReference}</p>
                        </div>
                      )}
                      {criterion.ownerArea && (
                        <div>
                          <span className="font-medium">Área responsable:</span>
                          <p className="text-muted-foreground">{criterion.ownerArea}</p>
                        </div>
                      )}
                      {criterion.evidenceExpectations && (
                        <div className="col-span-2">
                          <span className="font-medium">Evidencia esperada:</span>
                          <p className="text-muted-foreground">{criterion.evidenceExpectations}</p>
                        </div>
                      )}
                      {criterion.applicabilityNotes && (
                        <div className="col-span-2">
                          <span className="font-medium">Notas de aplicabilidad:</span>
                          <p className="text-muted-foreground">{criterion.applicabilityNotes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CriterionForm({ 
  formData, 
  setFormData, 
  onSubmit, 
  onCancel,
  isSubmitting 
}: {
  formData: CriterionFormData;
  setFormData: (data: CriterionFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [openRegulations, setOpenRegulations] = useState(false);
  const [openDocuments, setOpenDocuments] = useState(false);

  const { data: regulations = [] } = useQuery<RegulationOption[]>({
    queryKey: ["/api/regulations"],
    queryFn: async () => {
      const response = await fetch("/api/regulations");
      if (!response.ok) throw new Error("Failed to fetch regulations");
      const data = await response.json();
      return data.map((reg: any) => ({ id: reg.id, code: reg.code, name: reg.name }));
    }
  });

  const { data: documents = [] } = useQuery<DocumentOption[]>({
    queryKey: ["/api/compliance-documents"],
    queryFn: async () => {
      const response = await fetch("/api/compliance-documents");
      if (!response.ok) throw new Error("Failed to fetch documents");
      const data = await response.json();
      return data.map((doc: any) => ({ id: doc.id, internalCode: doc.internalCode, name: doc.name }));
    }
  });

  const selectedRegulation = regulations.find(r => r.id === formData.regulationId);
  const selectedDocument = documents.find(d => d.id === formData.documentId);

  const handleSourceTypeChange = (value: string) => {
    const newSourceType = value as "manual" | "regulation" | "document";
    setFormData({
      ...formData,
      sourceType: newSourceType,
      regulationId: null,
      documentId: null,
      // Limpiar título si se cambia a manual (para que el usuario lo llene manualmente)
      title: newSourceType === "manual" ? "" : formData.title
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="sourceType">Tipo de Origen *</Label>
        <Select
          value={formData.sourceType}
          onValueChange={handleSourceTypeChange}
        >
          <SelectTrigger data-testid="select-source-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="regulation">Normativa</SelectItem>
            <SelectItem value="document">Gestión Documental</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Seleccione si el criterio se basa en una normativa, documento de gestión o es manual
        </p>
      </div>

      {formData.sourceType === "regulation" && (
        <div>
          <Label>Normativa *</Label>
          <Popover open={openRegulations} onOpenChange={setOpenRegulations}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openRegulations}
                className="w-full justify-between"
                data-testid="button-select-regulation"
              >
                {selectedRegulation ? (
                  <span className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    {selectedRegulation.code} - {selectedRegulation.name}
                  </span>
                ) : (
                  "Seleccionar normativa..."
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0">
              <Command>
                <CommandInput placeholder="Buscar normativa..." />
                <CommandEmpty>No se encontró la normativa.</CommandEmpty>
                <CommandList>
                  <CommandGroup>
                    {regulations.map((regulation) => (
                      <CommandItem
                        key={regulation.id}
                        value={`${regulation.code} ${regulation.name}`}
                        onSelect={() => {
                          setFormData({ 
                            ...formData, 
                            regulationId: regulation.id, 
                            title: regulation.name || `${regulation.code} - ${regulation.name}`,
                            normativeReference: regulation.code || formData.normativeReference
                          });
                          setOpenRegulations(false);
                        }}
                        data-testid={`option-regulation-${regulation.id}`}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formData.regulationId === regulation.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{regulation.code}</span>
                          <span className="text-sm text-muted-foreground">{regulation.name}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {formData.sourceType === "document" && (
        <div>
          <Label>Documento de Gestión *</Label>
          <Popover open={openDocuments} onOpenChange={setOpenDocuments}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openDocuments}
                className="w-full justify-between"
                data-testid="button-select-document"
              >
                {selectedDocument ? (
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    {selectedDocument.internalCode} - {selectedDocument.name}
                  </span>
                ) : (
                  "Seleccionar documento..."
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0">
              <Command>
                <CommandInput placeholder="Buscar documento..." />
                <CommandEmpty>No se encontró el documento.</CommandEmpty>
                <CommandList>
                  <CommandGroup>
                    {documents.map((document) => (
                      <CommandItem
                        key={document.id}
                        value={`${document.internalCode} ${document.name}`}
                        onSelect={() => {
                          setFormData({ 
                            ...formData, 
                            documentId: document.id, 
                            title: document.name || `${document.internalCode} - ${document.name}`
                          });
                          setOpenDocuments(false);
                        }}
                        data-testid={`option-document-${document.id}`}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formData.documentId === document.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{document.internalCode}</span>
                          <span className="text-sm text-muted-foreground">{document.name}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}

      <div>
        <Label htmlFor="title">Título del Criterio *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Ej: Cumplimiento normativo ISO 27001"
          data-testid="input-criterion-title"
          disabled={formData.sourceType !== "manual"}
          required
          className={!formData.title.trim() ? "border-red-500" : ""}
        />
        {formData.sourceType !== "manual" && (
          <p className="text-xs text-muted-foreground mt-1">
            El título se completa automáticamente al seleccionar una normativa o documento
          </p>
        )}
        {formData.sourceType === "manual" && !formData.title.trim() && (
          <p className="text-xs text-red-500 mt-1">
            El título es requerido
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descripción detallada del criterio"
          rows={3}
          data-testid="input-criterion-description"
        />
      </div>

      <div>
        <Label htmlFor="criterionType">Tipo de Criterio</Label>
        <Select
          value={formData.criterionType}
          onValueChange={(value) => setFormData({ ...formData, criterionType: value as "interno" | "externo" })}
        >
          <SelectTrigger data-testid="select-criterion-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="interno">Interno</SelectItem>
            <SelectItem value="externo">Externo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="normativeReference">Referencia Normativa (Opcional)</Label>
        <Input
          id="normativeReference"
          value={formData.normativeReference}
          onChange={(e) => setFormData({ ...formData, normativeReference: e.target.value })}
          placeholder="Ej: ISO 9001, Política Interna XYZ, Normativa Sectorial"
          data-testid="input-normative-reference"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Campo adicional para referencias textuales
        </p>
      </div>

      <div>
        <Label htmlFor="ownerArea">Área Responsable</Label>
        <Input
          id="ownerArea"
          value={formData.ownerArea}
          onChange={(e) => setFormData({ ...formData, ownerArea: e.target.value })}
          placeholder="Ej: Auditoría Interna, Cumplimiento"
          data-testid="input-owner-area"
        />
      </div>

      <div>
        <Label htmlFor="evidenceExpectations">Evidencia Esperada</Label>
        <Textarea
          id="evidenceExpectations"
          value={formData.evidenceExpectations}
          onChange={(e) => setFormData({ ...formData, evidenceExpectations: e.target.value })}
          placeholder="Qué evidencia se espera para este criterio"
          rows={2}
          data-testid="input-evidence-expectations"
        />
      </div>

      <div>
        <Label htmlFor="applicabilityNotes">Notas de Aplicabilidad</Label>
        <Textarea
          id="applicabilityNotes"
          value={formData.applicabilityNotes}
          onChange={(e) => setFormData({ ...formData, applicabilityNotes: e.target.value })}
          placeholder="Notas sobre la aplicabilidad del criterio"
          rows={2}
          data-testid="input-applicability-notes"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button 
          variant="outline" 
          onClick={onCancel}
          disabled={isSubmitting}
          data-testid="button-cancel-criterion"
        >
          Cancelar
        </Button>
        <Button 
          onClick={onSubmit}
          disabled={isSubmitting}
          data-testid="button-save-criterion"
        >
          {isSubmitting ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
