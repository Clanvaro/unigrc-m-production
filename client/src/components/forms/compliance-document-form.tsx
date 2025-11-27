import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, X, Upload, FileCheck } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertComplianceDocumentSchema } from "@shared/schema";
import type { ComplianceDocument, InsertComplianceDocument, Macroproceso } from "@shared/schema";
import { z } from "zod";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ObjectUploader } from "@/components/ObjectUploader";
// Removed Uppy dependency - using simplified upload interface

interface ComplianceDocumentFormProps {
  initialData?: ComplianceDocument | null;
  onSuccess?: () => void;
}

// Opciones predefinidas para las clasificaciones
const classificationOptions = [
  "Ley",
  "Decreto",
  "Circular",
  "Política",
  "Procedimiento",
  "Código",
  "Resolución",
  "Norma Técnica",
  "Manual",
  "Instructivo",
  "Otro"
];

// Valor especial para "Todos los macroprocesos"
const ALL_MACROPROCESOS_VALUE = "ALL_MACROPROCESOS";

export default function ComplianceDocumentForm({ 
  initialData = null, 
  onSuccess 
}: ComplianceDocumentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Obtener macroprocesos para el selector
  const { data: macroprocesos = [] } = useQuery<Macroproceso[]>({
    queryKey: ["/api/macroprocesos"],
  });
  const [newTag, setNewTag] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: number;
    type: string;
    url: string;
  } | null>(initialData?.documentUrl ? {
    name: "Archivo existente",
    size: initialData.fileSize || 0,
    type: initialData.mimeType || "application/octet-stream", 
    url: initialData.documentUrl
  } : null);

  // Create a form schema that matches exactly what we want to submit
  const formSchema = insertComplianceDocumentSchema.extend({
    publicationDate: z.date(),
  }).omit({
    createdBy: true,
    updatedBy: true,
  });

  type FormData = z.infer<typeof formSchema>;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      internalCode: initialData?.internalCode || "",
      name: initialData?.name || "",
      macroprocesoId: initialData?.macroprocesoId || null,
      appliesToAllMacroprocesos: initialData?.appliesToAllMacroprocesos || false,
      issuingOrganization: initialData?.issuingOrganization || "",
      publicationDate: initialData?.publicationDate ? new Date(initialData.publicationDate) : new Date(),
      classification: initialData?.classification || "",
      description: initialData?.description || null,
      documentUrl: initialData?.documentUrl || null,
      fileName: initialData?.fileName || null,
      originalFileName: initialData?.originalFileName || null,
      fileSize: initialData?.fileSize || null,
      mimeType: initialData?.mimeType || null,
      objectPath: initialData?.objectPath || null,
      isActive: initialData?.isActive ?? true,
      tags: initialData?.tags || [],
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => 
      apiRequest("/api/compliance-documents", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance-documents"] });
      toast({ 
        title: "Documento creado", 
        description: "El documento ha sido creado exitosamente." 
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear documento",
        description: error.message || "Ocurrió un error inesperado.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<FormData>) => 
      apiRequest(`/api/compliance-documents/${initialData?.id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance-documents"] });
      toast({ 
        title: "Documento actualizado", 
        description: "El documento ha sido actualizado exitosamente." 
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar documento",
        description: error.message || "Ocurrió un error inesperado.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (initialData) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !form.getValues("tags")?.includes(newTag.trim())) {
      const currentTags = form.getValues("tags") || [];
      form.setValue("tags", [...currentTags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue("tags", currentTags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!initialData?.id) {
      toast({
        title: "Error",
        description: "Debes guardar el documento antes de adjuntar archivos.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    
    try {
      // Create FormData and send file directly to backend
      const formData = new FormData();
      formData.append('file', file);
      
      // Get CSRF token from cookie
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('psifi.x-csrf-token='))
        ?.split('=')[1];
      
      // Don't set Content-Type header - let the browser set it with the correct boundary
      const response = await fetch(`/api/compliance-documents/${initialData.id}/upload`, {
        method: "POST",
        body: formData,
        credentials: 'include', // Include cookies for authentication
        headers: csrfToken ? {
          'x-csrf-token': csrfToken
        } : undefined,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Upload failed');
      }
      
      const responseData = await response.json();
      
      // Store the uploaded file info with permanent URL
      const objectUrl = `/objects/${responseData.objectPath}`;
      
      const fileInfo = {
        name: file.name,
        size: file.size,
        type: file.type,
        url: objectUrl
      };
      
      setUploadedFile(fileInfo);
      
      // Update form with permanent object path
      form.setValue("documentUrl", objectUrl);
      form.setValue("objectPath", responseData.objectPath);
      form.setValue("fileSize", file.size);
      form.setValue("mimeType", file.type);
      form.setValue("fileName", file.name);
      form.setValue("originalFileName", file.name);
      
      toast({
        title: "Archivo procesado",
        description: `El archivo ${file.name} se ha cargado correctamente.`,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error al subir archivo",
        description: error instanceof Error ? error.message : "No se pudo subir el archivo. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    form.setValue("documentUrl", "");
    form.setValue("fileSize", undefined);
    form.setValue("mimeType", undefined);
    form.setValue("fileName", undefined);
    form.setValue("originalFileName", undefined);
    form.setValue("objectPath", undefined);
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Código Interno */}
          <FormField
            control={form.control}
            name="internalCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código Interno *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ej: LEY-001-2024" 
                    {...field} 
                    data-testid="input-internal-code"
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

          {/* Clasificación */}
          <FormField
            control={form.control}
            name="classification"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Clasificación *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-classification">
                      <SelectValue placeholder="Seleccionar clasificación" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {classificationOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Nombre */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Nombre del Documento *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Nombre completo del documento" 
                    {...field}
                    data-testid="input-name"
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

          {/* Macroproceso */}
          <FormField
            control={form.control}
            name="macroprocesoId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Macroproceso *</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    if (value === ALL_MACROPROCESOS_VALUE) {
                      form.setValue("macroprocesoId", null);
                      form.setValue("appliesToAllMacroprocesos", true);
                    } else {
                      form.setValue("macroprocesoId", value);
                      form.setValue("appliesToAllMacroprocesos", false);
                    }
                  }} 
                  defaultValue={
                    initialData?.appliesToAllMacroprocesos ? 
                    ALL_MACROPROCESOS_VALUE : 
                    initialData?.macroprocesoId || undefined
                  }
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-macroproceso">
                      <SelectValue placeholder="Seleccionar macroproceso" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={ALL_MACROPROCESOS_VALUE}>
                      🌐 Todos los Macroprocesos
                    </SelectItem>
                    {macroprocesos.map((macroproceso) => (
                      <SelectItem key={macroproceso.id} value={macroproceso.id}>
                        {macroproceso.code} - {macroproceso.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Organismo Emisor */}
          <FormField
            control={form.control}
            name="issuingOrganization"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organismo Emisor *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ej: Ministerio de Hacienda" 
                    {...field}
                    data-testid="input-issuing-organization"
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

          {/* Fecha de Publicación */}
          <FormField
            control={form.control}
            name="publicationDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Publicación *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className="w-full pl-3 text-left font-normal"
                        data-testid="button-publication-date"
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
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Archivo del Documento */}
          <FormItem className="md:col-span-2">
            <FormLabel>Archivo del Documento</FormLabel>
            <div className="space-y-3">
              {/* Upload Button */}
              <div>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file);
                    }
                  }}
                  disabled={isUploading || !initialData?.id}
                  data-testid="input-file-upload"
                />
                <label htmlFor="file-upload">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={isUploading || !initialData?.id}
                    asChild
                    data-testid="button-upload-file"
                  >
                    <span className="flex items-center justify-center gap-2 cursor-pointer">
                      <Upload className="h-4 w-4" />
                      <span>
                        {isUploading ? "Subiendo..." : uploadedFile ? "Cambiar Archivo" : "Adjuntar Archivo"}
                      </span>
                    </span>
                  </Button>
                </label>
                {!initialData?.id && (
                  <p className="text-xs text-gray-500 mt-1">
                    Debes guardar el documento antes de adjuntar archivos
                  </p>
                )}
              </div>
              
              {/* Uploaded File Display */}
              {uploadedFile && (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-md">
                  <FileCheck className="h-5 w-5 text-green-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-900 truncate">
                      {uploadedFile.name}
                    </p>
                    <p className="text-xs text-green-600">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB - {uploadedFile.type}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeUploadedFile}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    data-testid="button-remove-file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              {/* Alternative URL Input */}
              <div className="relative">
                <FormField
                  control={form.control}
                  name="documentUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-gray-600">O ingresar URL externa</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://ejemplo.com/documento.pdf" 
                          type="url"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-document-url"
                          disabled={!!uploadedFile && !uploadedFile.url.startsWith("http")}
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
            </div>
          </FormItem>

          {/* Descripción */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Descripción detallada del documento y su contenido" 
                    className="min-h-[100px]"
                    {...field}
                    value={field.value || ""}
                    data-testid="textarea-description"
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

          {/* Etiquetas */}
          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Etiquetas</FormLabel>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Agregar etiqueta"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={handleKeyPress}
                      data-testid="input-new-tag"
                      onKeyDown={(e) => {
                        if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") {
                          e.stopPropagation();
                        }
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={addTag}
                      data-testid="button-add-tag"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {field.value && field.value.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {field.value.map((tag, index) => (
                        <Badge 
                          key={index} 
                          variant="secondary" 
                          className="text-xs flex items-center gap-1"
                        >
                          {tag}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-3 w-3 p-0 hover:bg-transparent"
                            onClick={() => removeTag(tag)}
                            data-testid={`button-remove-tag-${index}`}
                          >
                            <X className="h-2 w-2" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button 
            type="submit" 
            disabled={isLoading || isUploading}
            data-testid="button-submit-document"
          >
            {isUploading ? "Subiendo archivo..." : isLoading ? "Guardando..." : initialData ? "Actualizar Documento" : "Crear Documento"}
          </Button>
        </div>
      </form>
    </Form>
  );
}