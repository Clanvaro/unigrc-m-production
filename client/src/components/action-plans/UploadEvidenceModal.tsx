import { useState, useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  File, 
  Image as ImageIcon, 
  FileText, 
  FileSpreadsheet,
  X,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface FileWithPreview extends File {
  id: string;
  preview?: string;
}

interface UploadEvidenceModalProps {
  actionPlanId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
  'application/vnd.ms-excel',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
];

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function UploadEvidenceModal({
  actionPlanId,
  open,
  onOpenChange,
  onSuccess
}: UploadEvidenceModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return ImageIcon;
    if (mimeType === 'application/pdf') return FileText;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet;
    if (mimeType.includes('word') || mimeType.includes('document')) return FileText;
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
      return `Tipo de archivo no permitido: ${file.type}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `Archivo muy grande: ${formatFileSize(file.size)}. Límite: ${formatFileSize(MAX_FILE_SIZE)}`;
    }
    return null;
  };

  const processFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    if (selectedFiles.length + fileArray.length > MAX_FILES) {
      toast({
        title: "Demasiados archivos",
        description: `Máximo ${MAX_FILES} archivos permitidos. Ya tienes ${selectedFiles.length} seleccionados.`,
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
        const fileWithPreview: FileWithPreview = Object.assign(file, {
          id: Math.random().toString(36).substr(2, 9)
        });

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
        description: errors.join(', '),
        variant: "destructive"
      });
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  }, [selectedFiles, toast]);

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

  const uploadMutation = useMutation({
    mutationFn: async (files: FileWithPreview[]) => {
      const results = [];
      
      for (const file of files) {
        setUploadingFiles(prev => new Set([...Array.from(prev), file.id]));
        
        try {
          const formData = new FormData();
          formData.append('files', file);

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

            xhr.open('POST', `/api/actions/${actionPlanId}/evidence`);
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
          title: "Evidencias subidas exitosamente",
          description: `${successful.length} archivo(s) subido(s) correctamente.`
        });

        const successfulIds = successful.map(r => r.file.id);
        setSelectedFiles(prev => prev.filter(f => !successfulIds.includes(f.id)));
        
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          successfulIds.forEach(id => delete newProgress[id]);
          return newProgress;
        });

        queryClient.invalidateQueries({ queryKey: ['/api/actions', actionPlanId, 'evidence'] });
        onSuccess?.();
        
        if (failed.length === 0) {
          onOpenChange(false);
        }
      }

      if (failed.length > 0) {
        toast({
          title: "Algunos archivos fallaron",
          description: `${failed.length} archivo(s) no pudieron ser subidos.`,
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

    uploadMutation.mutate(selectedFiles);
  };

  const clearAll = () => {
    setSelectedFiles([]);
    setUploadProgress({});
    setUploadingFiles(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Subir Evidencias
          </DialogTitle>
          <DialogDescription>
            Sube evidencias para el plan de acción. Máximo {MAX_FILES} archivos de hasta {formatFileSize(MAX_FILE_SIZE)} cada uno.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
            data-testid="drop-zone-evidence"
          >
            <Upload className={`mx-auto h-12 w-12 mb-4 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {isDragOver ? '¡Suelta los archivos aquí!' : 'Arrastra archivos aquí o haz clic para seleccionar'}
              </p>
              <p className="text-sm text-muted-foreground">
                Máximo {MAX_FILES} archivos • Límite: {formatFileSize(MAX_FILE_SIZE)} por archivo
              </p>
              <p className="text-xs text-muted-foreground">
                Formatos: PDF, Word, Excel, Imágenes (JPG, PNG, GIF, WebP)
              </p>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ALLOWED_MIME_TYPES.join(',')}
              onChange={handleFileInputChange}
              className="hidden"
              data-testid="file-input-evidence"
            />
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">
                  Archivos Seleccionados ({selectedFiles.length}/{MAX_FILES})
                </h4>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearAll}
                  disabled={uploadingFiles.size > 0}
                  data-testid="button-clear-all-evidence"
                >
                  Limpiar Todo
                </Button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {selectedFiles.map((file) => {
                  const FileIcon = getFileIcon(file.type);
                  const isUploading = uploadingFiles.has(file.id);
                  const progress = uploadProgress[file.id] || 0;

                  return (
                    <Card key={file.id} className="p-3" data-testid={`file-card-${file.id}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          {file.preview ? (
                            <img 
                              src={file.preview} 
                              alt={file.name}
                              className="w-12 h-12 object-cover rounded"
                              data-testid={`file-preview-${file.id}`}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                              <FileIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate" title={file.name} data-testid={`file-name-${file.id}`}>
                                {file.name}
                              </p>
                              <p className="text-sm text-muted-foreground" data-testid={`file-size-${file.id}`}>
                                {formatFileSize(file.size)} • {file.type.split('/')[1].toUpperCase()}
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

                          {isUploading && (
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span>Subiendo...</span>
                                <span>{Math.round(progress)}%</span>
                              </div>
                              <Progress value={progress} className="h-2" data-testid={`progress-${file.id}`} />
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={uploadMutation.isPending}
                  data-testid="button-cancel-upload"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending || selectedFiles.length === 0}
                  data-testid="button-upload-evidence"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Subir Evidencias
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
