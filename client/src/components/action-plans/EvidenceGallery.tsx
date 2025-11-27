import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Download, 
  Trash2, 
  FileText, 
  Image as ImageIcon,
  FileSpreadsheet,
  File,
  Loader2
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Attachment {
  id: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  storageUrl: string;
  objectPath: string;
  description: string | null;
  category: string | null;
  uploadedBy: string;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface EvidenceGalleryProps {
  actionPlanId: string;
  canDelete?: boolean;
}

export function EvidenceGallery({ actionPlanId, canDelete = false }: EvidenceGalleryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: attachments = [], isLoading } = useQuery<Attachment[]>({
    queryKey: ['/api/actions', actionPlanId, 'evidence'],
  });

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: string) => 
      apiRequest(`/api/actions/${actionPlanId}/evidence/${attachmentId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/actions', actionPlanId, 'evidence'] });
      toast({
        title: "Evidencia eliminada",
        description: "La evidencia ha sido eliminada exitosamente."
      });
      setDeletingId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la evidencia.",
        variant: "destructive"
      });
      setDeletingId(null);
    },
  });

  const getFileIcon = (mimeType: string) => {
    if (!mimeType) return File;
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      const response = await fetch(`/api/actions/${actionPlanId}/evidence/${attachment.id}/download`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Descarga iniciada",
        description: `Descargando ${attachment.fileName}...`
      });
    } catch (error) {
      toast({
        title: "Error al descargar",
        description: "No se pudo descargar el archivo.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12" data-testid="evidence-loading">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div className="text-center py-12" data-testid="evidence-empty">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No hay evidencias subidas aún</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="evidence-gallery">
        {attachments.map((attachment) => {
          const FileIcon = getFileIcon(attachment.mimeType);
          const isImage = attachment.mimeType?.startsWith('image/') || false;

          return (
            <Card key={attachment.id} className="overflow-hidden" data-testid={`evidence-card-${attachment.id}`}>
              <CardContent className="p-0">
                {/* Icon Area (no preview since Object Storage requires auth) */}
                <div className="relative bg-muted h-48 flex items-center justify-center">
                  <FileIcon className="h-16 w-16 text-muted-foreground" data-testid={`evidence-icon-${attachment.id}`} />
                  
                  {/* File Type Badge */}
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="text-xs" data-testid={`evidence-badge-${attachment.id}`}>
                      {attachment.mimeType?.split('/')[1]?.toUpperCase() || 'FILE'}
                    </Badge>
                  </div>
                </div>

                {/* File Info */}
                <div className="p-4 space-y-3">
                  <div>
                    <p className="font-medium truncate" title={attachment.fileName} data-testid={`evidence-name-${attachment.id}`}>
                      {attachment.fileName}
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid={`evidence-size-${attachment.id}`}>
                      {formatFileSize(attachment.fileSize)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1" data-testid={`evidence-date-${attachment.id}`}>
                      Subido: {formatDate(attachment.uploadedAt)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDownload(attachment)}
                      data-testid={`button-download-${attachment.id}`}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar
                    </Button>
                    
                    {canDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingId(attachment.id)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-delete-${attachment.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar evidencia?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La evidencia será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-evidence">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-evidence"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
