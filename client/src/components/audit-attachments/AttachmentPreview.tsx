import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  Edit,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  FileText,
  File,
  Image,
  FileSpreadsheet,
  Calendar,
  User,
  Tag,
  Shield,
  ExternalLink,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { AuditTestAttachment } from "./AuditTestAttachmentsList";

interface AttachmentPreviewProps {
  attachment: AuditTestAttachment | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (attachment: AuditTestAttachment) => void;
  onDelete?: (attachment: AuditTestAttachment) => void;
  onDownload?: (attachment: AuditTestAttachment) => void;
  allowEdit?: boolean;
  allowDelete?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  'evidence': 'Evidencia',
  'workpaper': 'Papel de Trabajo',
  'reference': 'Referencia',
  'communication': 'Comunicación',
  'regulation': 'Normativa'
};

const CATEGORY_COLORS: Record<string, string> = {
  'evidence': 'bg-green-100 text-green-800',
  'workpaper': 'bg-blue-100 text-blue-800',
  'reference': 'bg-purple-100 text-purple-800',
  'communication': 'bg-orange-100 text-orange-800',
  'regulation': 'bg-red-100 text-red-800'
};

export function AttachmentPreview({
  attachment,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onDownload,
  allowEdit = true,
  allowDelete = true
}: AttachmentPreviewProps) {
  const [imageScale, setImageScale] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const { toast } = useToast();

  // Reset state when attachment changes
  useEffect(() => {
    setImageScale(1);
    setImageRotation(0);
    setIsFullscreen(false);
    setPreviewUrl(null);
    setPreviewError(null);
    
    if (attachment && isOpen) {
      loadPreview();
    }
  }, [attachment, isOpen]);

  const loadPreview = async () => {
    if (!attachment) return;

    setIsLoadingPreview(true);
    setPreviewError(null);

    try {
      if (attachment.mimeType.startsWith('image/')) {
        // For images, we can create a preview URL
        const response = await fetch(`/api/audit-test-attachments/${attachment.id}/download`);
        if (!response.ok) throw new Error('Failed to load image');
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } else if (attachment.mimeType === 'application/pdf') {
        // For PDFs, we'll show the download URL or embed if browser supports
        setPreviewUrl(`/api/audit-test-attachments/${attachment.id}/download`);
      }
    } catch (error) {
      console.error('Preview loading error:', error);
      setPreviewError('No se pudo cargar la vista previa del archivo');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Cleanup blob URL when component unmounts or attachment changes
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType === 'application/pdf') return FileText;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet;
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return FileText;
    return File;
  };

  const handleDownload = async () => {
    if (!attachment) return;
    
    try {
      if (onDownload) {
        onDownload(attachment);
      } else {
        // Default download implementation
        const response = await fetch(`/api/audit-test-attachments/${attachment.id}/download`);
        if (!response.ok) throw new Error('Download failed');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Descarga iniciada",
          description: `Descargando ${attachment.fileName}`
        });
      }
    } catch (error) {
      toast({
        title: "Error de descarga",
        description: "No se pudo descargar el archivo.",
        variant: "destructive"
      });
    }
  };

  const handleEdit = () => {
    if (attachment && onEdit) {
      onEdit(attachment);
    }
  };

  const handleDelete = () => {
    if (attachment && onDelete) {
      onDelete(attachment);
    }
  };

  const zoomIn = () => setImageScale(prev => Math.min(prev + 0.25, 3));
  const zoomOut = () => setImageScale(prev => Math.max(prev - 0.25, 0.25));
  const rotateImage = () => setImageRotation(prev => (prev + 90) % 360);
  const toggleFullscreen = () => setIsFullscreen(prev => !prev);

  const canPreview = () => {
    if (!attachment) return false;
    return (
      attachment.mimeType.startsWith('image/') ||
      attachment.mimeType === 'application/pdf' ||
      attachment.mimeType === 'text/plain'
    );
  };

  const renderPreview = () => {
    if (!attachment) return null;

    if (isLoadingPreview) {
      return (
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground">Cargando vista previa...</p>
          </div>
        </div>
      );
    }

    if (previewError) {
      return (
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="text-center space-y-4 max-w-sm">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <h3 className="font-medium">No se puede mostrar vista previa</h3>
              <p className="text-sm text-muted-foreground">{previewError}</p>
            </div>
            <Button onClick={handleDownload} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Descargar archivo
            </Button>
          </div>
        </div>
      );
    }

    if (attachment.mimeType.startsWith('image/') && previewUrl) {
      return (
        <div className="flex-1 overflow-auto bg-checkered" style={{ backgroundImage: 'repeating-conic-gradient(#f8f9fa 0% 25%, transparent 0% 50%) 50% / 20px 20px' }}>
          <div className="p-4 flex items-center justify-center min-h-full">
            <img
              src={previewUrl}
              alt={attachment.fileName}
              className="max-w-none transition-transform origin-center"
              style={{
                transform: `scale(${imageScale}) rotate(${imageRotation}deg)`,
                maxWidth: isFullscreen ? '90vw' : '100%',
                maxHeight: isFullscreen ? '90vh' : '70vh',
                cursor: imageScale > 1 ? 'move' : 'default'
              }}
              onLoad={() => setIsLoadingPreview(false)}
              data-testid="preview-image"
            />
          </div>
        </div>
      );
    }

    if (attachment.mimeType === 'application/pdf' && previewUrl) {
      return (
        <div className="flex-1">
          <div className="w-full h-full min-h-96">
            <iframe
              src={`${previewUrl}#toolbar=1&navpanes=1&scrollbar=1`}
              className="w-full h-full border-0"
              title={`PDF Preview: ${attachment.fileName}`}
              data-testid="preview-pdf"
            />
          </div>
        </div>
      );
    }

    if (attachment.mimeType === 'text/plain') {
      return (
        <div className="flex-1 p-4">
          <div className="bg-muted/30 rounded-lg p-4 font-mono text-sm h-full overflow-auto">
            <div className="text-center text-muted-foreground">
              Vista previa de texto no disponible. 
              <Button 
                variant="link" 
                onClick={handleDownload}
                className="p-0 ml-1"
              >
                Descargar para ver contenido
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Fallback for unsupported types
    const FileIcon = getFileIcon(attachment.mimeType);
    return (
      <div className="flex-1 flex items-center justify-center py-12">
        <div className="text-center space-y-4 max-w-sm">
          <FileIcon className="h-16 w-16 text-muted-foreground mx-auto" />
          <div>
            <h3 className="font-medium">Vista previa no disponible</h3>
            <p className="text-sm text-muted-foreground">
              Este tipo de archivo no se puede previsualizar en el navegador.
            </p>
          </div>
          <Button onClick={handleDownload} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Descargar {attachment.fileName}
          </Button>
        </div>
      </div>
    );
  };

  if (!attachment) return null;

  const FileIcon = getFileIcon(attachment.mimeType);

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={onClose}
    >
      <DialogContent 
        className={`max-w-7xl ${isFullscreen ? 'w-screen h-screen max-w-none max-h-none m-0 rounded-none' : 'max-h-[90vh] w-[95vw]'}`}
        data-testid="attachment-preview-dialog"
      >
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <FileIcon className="h-6 w-6 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate" title={attachment.fileName}>
                  {attachment.fileName}
                </DialogTitle>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs" data-testid="badge-attachment-code">
                    {attachment.attachmentCode}
                  </Badge>
                  <Badge className={`text-xs ${CATEGORY_COLORS[attachment.category] || 'bg-gray-100 text-gray-800'}`} data-testid="badge-category">
                    {CATEGORY_LABELS[attachment.category] || attachment.category}
                  </Badge>
                  {attachment.isConfidential && (
                    <Badge variant="destructive" className="text-xs" data-testid="badge-confidential">
                      <Shield className="h-3 w-3 mr-1" />
                      Confidencial
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Image Controls */}
              {attachment.mimeType.startsWith('image/') && previewUrl && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={zoomOut}
                    disabled={imageScale <= 0.25}
                    data-testid="button-zoom-out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground min-w-12 text-center">
                    {Math.round(imageScale * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={zoomIn}
                    disabled={imageScale >= 3}
                    data-testid="button-zoom-in"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={rotateImage}
                    data-testid="button-rotate"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <Separator orientation="vertical" className="h-4" />
                </>
              )}

              {/* Fullscreen Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                data-testid="button-fullscreen"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>

              <Separator orientation="vertical" className="h-4" />

              {/* Action Buttons */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                data-testid="button-download"
              >
                <Download className="h-4 w-4" />
              </Button>

              {allowEdit && onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEdit}
                  data-testid="button-edit"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}

              {allowDelete && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  data-testid="button-delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                data-testid="button-close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-4 flex-1 overflow-hidden">
          {/* Preview Area */}
          <div className="flex-1 flex flex-col min-h-0">
            {renderPreview()}
          </div>

          {/* Metadata Panel */}
          {!isFullscreen && (
            <Card className="w-full md:w-80 flex-shrink-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Detalles del Archivo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Basic Info */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Tamaño</label>
                    <p className="text-sm" data-testid="metadata-file-size">
                      {formatFileSize(attachment.fileSize)}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                    <p className="text-sm" data-testid="metadata-mime-type">
                      {attachment.mimeType}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Subido</label>
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-1" data-testid="metadata-upload-date">
                        <Calendar className="h-3 w-3" />
                        {formatDate(attachment.uploadedAt)}
                      </div>
                      {attachment.uploadedByUser && (
                        <div className="flex items-center gap-1" data-testid="metadata-uploaded-by">
                          <User className="h-3 w-3" />
                          {attachment.uploadedByUser.fullName}
                        </div>
                      )}
                    </div>
                  </div>

                  {attachment.updatedAt !== attachment.uploadedAt && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Actualizado</label>
                      <div className="flex items-center gap-1 text-sm" data-testid="metadata-updated-date">
                        <Calendar className="h-3 w-3" />
                        {formatDate(attachment.updatedAt)}
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Description */}
                {attachment.description && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Descripción</label>
                    <p className="text-sm mt-1" data-testid="metadata-description">
                      {attachment.description}
                    </p>
                  </div>
                )}

                {/* Tags */}
                {attachment.tags.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Etiquetas</label>
                    <div className="flex flex-wrap gap-1 mt-1" data-testid="metadata-tags">
                      {attachment.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Quick Actions */}
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="w-full justify-start"
                    data-testid="metadata-download-button"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar archivo
                  </Button>

                  {attachment.mimeType === 'application/pdf' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/api/audit-test-attachments/${attachment.id}/download`, '_blank')}
                      className="w-full justify-start"
                      data-testid="metadata-external-view-button"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir en nueva pestaña
                    </Button>
                  )}

                  {allowEdit && onEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEdit}
                      className="w-full justify-start"
                      data-testid="metadata-edit-button"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar metadatos
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}