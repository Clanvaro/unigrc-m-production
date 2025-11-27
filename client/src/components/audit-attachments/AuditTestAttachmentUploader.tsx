import { useState, useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Upload, 
  File, 
  Image, 
  FileText, 
  FileSpreadsheet,
  X,
  Plus,
  AlertCircle,
  CheckCircle
} from "lucide-react";

interface FileWithPreview extends File {
  id: string;
  preview?: string;
  category?: string;
  description?: string;
  isConfidential?: boolean;
}

interface AuditTestAttachmentUploaderProps {
  auditTestId: string;
  onUploadComplete?: () => void;
  maxFiles?: number;
  maxFileSize?: number;
}

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'image/jpeg',
  'image/png',
  'image/gif',
  'text/plain',
  'text/csv'
];

const CATEGORY_OPTIONS = [
  { value: 'evidence', label: 'Evidencia', description: 'Documentos que sirven como evidencia de cumplimiento' },
  { value: 'workpaper', label: 'Papel de Trabajo', description: 'Documentos de trabajo del auditor' },
  { value: 'reference', label: 'Referencia', description: 'Documentos de referencia y consulta' },
  { value: 'communication', label: 'Comunicación', description: 'Correos y comunicaciones relacionadas' },
  { value: 'regulation', label: 'Normativa', description: 'Documentos normativos y reglamentarios' }
];

export function AuditTestAttachmentUploader({
  auditTestId,
  onUploadComplete,
  maxFiles = 5,
  maxFileSize = 50 * 1024 * 1024 // 50MB
}: AuditTestAttachmentUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType === 'application/pdf') return FileText;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet;
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return `Tipo de archivo no permitido: ${file.type}. Tipos permitidos: PDF, Word, Excel, PowerPoint, Imágenes, Text, CSV`;
    }
    if (file.size > maxFileSize) {
      return `Archivo muy grande: ${formatFileSize(file.size)}. Límite: ${formatFileSize(maxFileSize)}`;
    }
    return null;
  };

  const processFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    if (selectedFiles.length + fileArray.length > maxFiles) {
      toast({
        title: "Demasiados archivos",
        description: `Máximo ${maxFiles} archivos permitidos. Ya tienes ${selectedFiles.length} seleccionados.`,
        variant: "destructive"
      });
      return;
    }

    const validFiles: FileWithPreview[] = [];
    const errors: string[] = [];

    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        const fileWithPreview: FileWithPreview = {
          ...file,
          id: Math.random().toString(36).substr(2, 9),
          category: 'evidence' // default category
        };

        // Generate preview for images
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            fileWithPreview.preview = e.target?.result as string;
            setSelectedFiles(prev => 
              prev.map(f => f.id === fileWithPreview.id ? fileWithPreview : f)
            );
          };
          reader.readAsDataURL(file);
        }

        validFiles.push(fileWithPreview);
      }
    });

    if (errors.length > 0) {
      toast({
        title: "Algunos archivos no pudieron ser añadidos",
        description: errors.join('\n'),
        variant: "destructive"
      });
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  }, [selectedFiles, maxFiles, maxFileSize, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      // Clear the input so same files can be selected again
      e.target.value = '';
    }
  };

  const removeFile = (fileId: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });
  };

  const updateFileMetadata = (fileId: string, field: keyof FileWithPreview, value: any) => {
    setSelectedFiles(prev =>
      prev.map(file => 
        file.id === fileId ? { ...file, [field]: value } : file
      )
    );
  };

  const uploadMutation = useMutation({
    mutationFn: async (files: FileWithPreview[]) => {
      const results = [];
      
      for (const file of files) {
        setUploadingFiles(prev => new Set([...prev, file.id]));
        
        try {
          const formData = new FormData();
          formData.append('files', file);
          formData.append('category', file.category || 'evidence');
          formData.append('description', file.description || '');
          formData.append('isConfidential', String(file.isConfidential || false));

          // Simulate progress for better UX
          const xhr = new XMLHttpRequest();
          const uploadPromise = new Promise((resolve, reject) => {
            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                setUploadProgress(prev => ({ ...prev, [file.id]: percentComplete }));
              }
            });

            xhr.addEventListener('load', () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve(JSON.parse(xhr.responseText));
              } else {
                reject(new Error(`Upload failed: ${xhr.status}`));
              }
            });

            xhr.addEventListener('error', () => {
              reject(new Error('Network error during upload'));
            });

            xhr.open('POST', `/api/audit-tests/${auditTestId}/attachments`);
            xhr.send(formData);
          });

          const result = await uploadPromise;
          results.push({ file, result, success: true });
        } catch (error) {
          console.error(`Upload failed for ${file.name}:`, error);
          results.push({ file, error, success: false });
        }

        setUploadingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(file.id);
          return newSet;
        });
      }

      return results;
    },
    onSuccess: (results) => {
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      if (successful.length > 0) {
        toast({
          title: "Archivos subidos exitosamente",
          description: `${successful.length} archivo(s) subido(s) correctamente.`
        });

        // Remove successfully uploaded files from the selection
        const successfulIds = successful.map(r => r.file.id);
        setSelectedFiles(prev => prev.filter(f => !successfulIds.includes(f.id)));
        
        // Clear progress for successful uploads
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          successfulIds.forEach(id => delete newProgress[id]);
          return newProgress;
        });

        // Invalidate queries to refresh the attachments list
        queryClient.invalidateQueries({ queryKey: ['/api/audit-tests', auditTestId, 'attachments'] });
        onUploadComplete?.();
      }

      if (failed.length > 0) {
        toast({
          title: "Algunos archivos fallaron",
          description: `${failed.length} archivo(s) no pudieron ser subidos. Verifica e intenta nuevamente.`,
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      console.error('Upload mutation error:', error);
      toast({
        title: "Error al subir archivos",
        description: "Ocurrió un error durante la subida. Intenta nuevamente.",
        variant: "destructive"
      });
      
      // Clear uploading states
      setUploadingFiles(new Set());
      setUploadProgress({});
    }
  });

  const handleUpload = () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No hay archivos para subir",
        description: "Selecciona al menos un archivo antes de subir.",
        variant: "destructive"
      });
      return;
    }

    // Validate that all files have required metadata
    const invalidFiles = selectedFiles.filter(file => !file.category);
    if (invalidFiles.length > 0) {
      toast({
        title: "Información incompleta",
        description: "Todos los archivos deben tener una categoría asignada.",
        variant: "destructive"
      });
      return;
    }

    uploadMutation.mutate(selectedFiles);
  };

  const clearAll = () => {
    setSelectedFiles([]);
    setUploadProgress({});
    setUploadingFiles(new Set());
  };

  return (
    <Card className="w-full" data-testid="attachment-uploader">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Subir Adjuntos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drag & Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
            ${isDragOver 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50'
            }
          `}
          onClick={() => fileInputRef.current?.click()}
          data-testid="drop-zone"
        >
          <Upload className={`mx-auto h-12 w-12 mb-4 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
          <div className="space-y-2">
            <p className="text-lg font-medium">
              {isDragOver ? '¡Suelta los archivos aquí!' : 'Arrastra archivos aquí o haz clic para seleccionar'}
            </p>
            <p className="text-sm text-muted-foreground">
              Máximo {maxFiles} archivos • Límite: {formatFileSize(maxFileSize)} por archivo
            </p>
            <p className="text-xs text-muted-foreground">
              Formatos: PDF, Word, Excel, PowerPoint, Imágenes, Text, CSV
            </p>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_MIME_TYPES.join(',')}
            onChange={handleFileInputChange}
            className="hidden"
            data-testid="file-input"
          />
        </div>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">
                Archivos Seleccionados ({selectedFiles.length}/{maxFiles})
              </h4>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearAll}
                disabled={uploadingFiles.size > 0}
                data-testid="button-clear-all"
              >
                Limpiar Todo
              </Button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {selectedFiles.map((file) => {
                const FileIcon = getFileIcon(file.type);
                const isUploading = uploadingFiles.has(file.id);
                const progress = uploadProgress[file.id] || 0;

                return (
                  <Card key={file.id} className="p-3">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        {/* File Preview/Icon */}
                        <div className="flex-shrink-0">
                          {file.preview ? (
                            <img 
                              src={file.preview} 
                              alt={file.name}
                              className="w-10 h-10 object-cover rounded"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                              <FileIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium truncate" title={file.name}>
                                {file.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatFileSize(file.size)} • {file.type}
                              </p>
                            </div>
                            
                            {!isUploading && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => removeFile(file.id)}
                                data-testid={`button-remove-${file.id}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          {/* Progress Bar */}
                          {isUploading && (
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span>Subiendo...</span>
                                <span>{Math.round(progress)}%</span>
                              </div>
                              <Progress value={progress} className="h-2" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Metadata Fields */}
                      {!isUploading && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
                          <div className="space-y-2">
                            <Label htmlFor={`category-${file.id}`}>Categoría *</Label>
                            <Select 
                              value={file.category} 
                              onValueChange={(value) => updateFileMetadata(file.id, 'category', value)}
                            >
                              <SelectTrigger data-testid={`select-category-${file.id}`}>
                                <SelectValue placeholder="Seleccionar categoría" />
                              </SelectTrigger>
                              <SelectContent>
                                {CATEGORY_OPTIONS.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    <div>
                                      <div className="font-medium">{option.label}</div>
                                      <div className="text-xs text-muted-foreground">{option.description}</div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`description-${file.id}`}>Descripción</Label>
                            <Textarea
                              id={`description-${file.id}`}
                              placeholder="Descripción del archivo (opcional)"
                              value={file.description || ''}
                              onChange={(e) => updateFileMetadata(file.id, 'description', e.target.value)}
                              rows={2}
                              data-testid={`textarea-description-${file.id}`}
                            />
                          </div>

                          <div className="flex items-center gap-2 col-span-1 md:col-span-2">
                            <input
                              type="checkbox"
                              id={`confidential-${file.id}`}
                              checked={file.isConfidential || false}
                              onChange={(e) => updateFileMetadata(file.id, 'isConfidential', e.target.checked)}
                              className="rounded"
                              data-testid={`checkbox-confidential-${file.id}`}
                            />
                            <Label htmlFor={`confidential-${file.id}`} className="text-sm">
                              Información confidencial
                            </Label>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Upload Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button 
                onClick={handleUpload}
                disabled={uploadMutation.isPending || selectedFiles.length === 0}
                className="min-w-32"
                data-testid="button-upload"
              >
                {uploadMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Subir {selectedFiles.length} Archivo{selectedFiles.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}