import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Save,
  X,
  Plus,
  Trash2,
  Tag,
  Shield,
  AlertCircle,
  FileText,
  Calendar,
  User
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { AuditTestAttachment } from "./AuditTestAttachmentsList";

interface AttachmentMetadataEditorProps {
  attachment: AuditTestAttachment | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (updatedAttachment: AuditTestAttachment) => void;
  allowChangeCategory?: boolean;
  allowEditTags?: boolean;
  allowChangeConfidentiality?: boolean;
}

const CATEGORY_OPTIONS = [
  { 
    value: 'evidence', 
    label: 'Evidencia', 
    description: 'Documentos que sirven como evidencia de cumplimiento',
    color: 'bg-green-100 text-green-800'
  },
  { 
    value: 'workpaper', 
    label: 'Papel de Trabajo', 
    description: 'Documentos de trabajo del auditor',
    color: 'bg-blue-100 text-blue-800'
  },
  { 
    value: 'reference', 
    label: 'Referencia', 
    description: 'Documentos de referencia y consulta',
    color: 'bg-purple-100 text-purple-800'
  },
  { 
    value: 'communication', 
    label: 'Comunicación', 
    description: 'Correos y comunicaciones relacionadas',
    color: 'bg-orange-100 text-orange-800'
  },
  { 
    value: 'regulation', 
    label: 'Normativa', 
    description: 'Documentos normativos y reglamentarios',
    color: 'bg-red-100 text-red-800'
  }
];

const metadataSchema = z.object({
  description: z.string().max(500, "La descripción no puede exceder 500 caracteres").optional(),
  category: z.enum(["evidence", "workpaper", "reference", "communication", "regulation"], {
    required_error: "La categoría es requerida"
  }),
  tags: z.array(z.string().min(1, "Las etiquetas no pueden estar vacías")).default([]),
  isConfidential: z.boolean().default(false)
});

type MetadataFormData = z.infer<typeof metadataSchema>;

export function AttachmentMetadataEditor({
  attachment,
  isOpen,
  onClose,
  onUpdate,
  allowChangeCategory = true,
  allowEditTags = true,
  allowChangeConfidentiality = true
}: AttachmentMetadataEditorProps) {
  const [newTag, setNewTag] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<MetadataFormData>({
    resolver: zodResolver(metadataSchema),
    defaultValues: {
      description: "",
      category: "evidence",
      tags: [],
      isConfidential: false
    }
  });

  // Update form when attachment changes
  useEffect(() => {
    if (attachment) {
      form.reset({
        description: attachment.description || "",
        category: attachment.category as any,
        tags: [...attachment.tags],
        isConfidential: attachment.isConfidential
      });
    }
  }, [attachment, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: MetadataFormData) => {
      if (!attachment) throw new Error("No attachment selected");
      
      return apiRequest(`/api/audit-test-attachments/${attachment.id}`, "PUT", {
        description: data.description || null,
        category: data.category,
        tags: data.tags,
        isConfidential: data.isConfidential
      });
    },
    onSuccess: (updatedAttachment) => {
      // Invalidate queries to refresh the attachments list
      queryClient.invalidateQueries({ 
        queryKey: ['/api/audit-tests', attachment?.auditTestId, 'attachments'] 
      });
      
      // Call the onUpdate callback with the updated attachment
      if (onUpdate && attachment) {
        const updated = {
          ...attachment,
          ...updatedAttachment,
          updatedAt: new Date().toISOString()
        };
        onUpdate(updated);
      }
      
      toast({
        title: "Metadatos actualizados",
        description: "Los metadatos del archivo han sido actualizados exitosamente."
      });
      
      onClose();
    },
    onError: (error: any) => {
      console.error('Metadata update error:', error);
      toast({
        title: "Error al actualizar",
        description: "No se pudieron actualizar los metadatos. Intenta nuevamente.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (data: MetadataFormData) => {
    updateMutation.mutate(data);
  };

  const addTag = () => {
    const trimmedTag = newTag.trim();
    if (!trimmedTag) return;

    const currentTags = form.getValues("tags");
    if (currentTags.includes(trimmedTag)) {
      toast({
        title: "Etiqueta duplicada",
        description: "Esta etiqueta ya existe.",
        variant: "destructive"
      });
      return;
    }

    if (currentTags.length >= 10) {
      toast({
        title: "Límite de etiquetas",
        description: "Máximo 10 etiquetas permitidas por archivo.",
        variant: "destructive"
      });
      return;
    }

    form.setValue("tags", [...currentTags, trimmedTag]);
    setNewTag("");
    setIsAddingTag(false);
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues("tags");
    form.setValue("tags", currentTags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Escape') {
      setNewTag("");
      setIsAddingTag(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
  };

  if (!attachment) return null;

  const selectedCategory = CATEGORY_OPTIONS.find(cat => cat.value === form.watch("category"));
  const tags = form.watch("tags");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="metadata-editor-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Editar Metadatos
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Modificar la información y categorización del archivo adjunto
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* File Information */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate" title={attachment.fileName}>
                    {attachment.fileName}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <Badge variant="outline">{attachment.attachmentCode}</Badge>
                    <span>{formatFileSize(attachment.fileSize)}</span>
                    <span>{attachment.mimeType}</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Subido: {formatDate(attachment.uploadedAt)}</span>
                </div>
                {attachment.uploadedByUser && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>Por: {attachment.uploadedByUser.fullName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Category Selection */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría *</FormLabel>
                  <Select 
                    value={field.value} 
                    onValueChange={field.onChange}
                    disabled={!allowChangeCategory}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-category">
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-3">
                            <Badge className={`text-xs ${option.color}`}>
                              {option.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {option.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripción detallada del archivo y su contenido..."
                      className="min-h-20"
                      {...field}
                      data-testid="textarea-description"
                    />
                  </FormControl>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Opcional - Ayuda a otros usuarios a entender el contenido</span>
                    <span>{field.value?.length || 0}/500</span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags */}
            {allowEditTags && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Etiquetas</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingTag(true)}
                    disabled={tags.length >= 10 || isAddingTag}
                    data-testid="button-add-tag"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar
                  </Button>
                </div>

                {/* Existing Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {tag}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-transparent"
                          onClick={() => removeTag(tag)}
                          data-testid={`button-remove-tag-${index}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Add Tag Input */}
                {isAddingTag && (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Nueva etiqueta..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={handleTagKeyPress}
                      className="flex-1"
                      maxLength={30}
                      autoFocus
                      data-testid="input-new-tag"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={addTag}
                      disabled={!newTag.trim()}
                      data-testid="button-confirm-tag"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNewTag("");
                        setIsAddingTag(false);
                      }}
                      data-testid="button-cancel-tag"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Las etiquetas ayudan a organizar y encontrar archivos. Máximo 10 etiquetas por archivo.
                </p>
              </div>
            )}

            {/* Confidentiality */}
            {allowChangeConfidentiality && (
              <FormField
                control={form.control}
                name="isConfidential"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-confidential"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Información confidencial
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Marca este archivo como confidencial si contiene información sensible.
                        Los archivos confidenciales requieren permisos especiales para ser accedidos.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            )}

            {/* Form Validation Errors */}
            {form.formState.errors.root && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive">
                  {form.formState.errors.root.message}
                </p>
              </div>
            )}

            <DialogFooter className="flex gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={updateMutation.isPending}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending || !form.formState.isDirty}
                data-testid="button-save"
              >
                {updateMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar cambios
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}