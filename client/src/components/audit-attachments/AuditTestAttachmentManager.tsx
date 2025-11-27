import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  AuditTestAttachmentUploader,
  AuditTestAttachmentsList,
  AttachmentPreview,
  AttachmentMetadataEditor,
  type AuditTestAttachment
} from "./index";
import { 
  Upload, 
  FileText, 
  Settings,
  Eye,
  Edit,
  Trash2
} from "lucide-react";

interface AuditTestAttachmentManagerProps {
  auditTestId: string;
  auditTestName?: string;
  allowUpload?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  showUploader?: boolean;
  compact?: boolean;
}

export function AuditTestAttachmentManager({
  auditTestId,
  auditTestName,
  allowUpload = true,
  allowEdit = true,
  allowDelete = true,
  showUploader = true,
  compact = false
}: AuditTestAttachmentManagerProps) {
  const [activeTab, setActiveTab] = useState(showUploader ? "upload" : "list");
  const [previewingAttachment, setPreviewingAttachment] = useState<AuditTestAttachment | null>(null);
  const [editingAttachment, setEditingAttachment] = useState<AuditTestAttachment | null>(null);
  const [deletingAttachment, setDeletingAttachment] = useState<AuditTestAttachment | null>(null);
  const { toast } = useToast();

  const handleUploadComplete = () => {
    // Switch to list view after successful upload
    setActiveTab("list");
    toast({
      title: "Upload completado",
      description: "Los archivos han sido subidos exitosamente."
    });
  };

  const handlePreviewFile = (attachment: AuditTestAttachment) => {
    setPreviewingAttachment(attachment);
  };

  const handleEditMetadata = (attachment: AuditTestAttachment) => {
    setEditingAttachment(attachment);
  };

  const handleDeleteAttachment = (attachment: AuditTestAttachment) => {
    setDeletingAttachment(attachment);
  };

  const handleMetadataUpdate = (updatedAttachment: AuditTestAttachment) => {
    // Automatically close the preview if it was the same attachment
    if (previewingAttachment?.id === updatedAttachment.id) {
      setPreviewingAttachment(updatedAttachment);
    }
    
    toast({
      title: "Metadatos actualizados",
      description: "La información del archivo ha sido actualizada."
    });
  };

  const confirmDelete = async () => {
    if (!deletingAttachment) return;

    try {
      const response = await fetch(`/api/audit-test-attachments/${deletingAttachment.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Delete failed');

      toast({
        title: "Archivo eliminado",
        description: "El archivo ha sido eliminado exitosamente."
      });

      // Close preview if it's the same attachment
      if (previewingAttachment?.id === deletingAttachment.id) {
        setPreviewingAttachment(null);
      }

    } catch (error) {
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el archivo. Intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setDeletingAttachment(null);
    }
  };

  if (compact) {
    // Compact view for inline usage in other pages
    return (
      <div className="space-y-4" data-testid="attachment-manager-compact">
        <AuditTestAttachmentsList
          auditTestId={auditTestId}
          onPreviewFile={allowEdit ? handlePreviewFile : undefined}
          onEditMetadata={allowEdit ? handleEditMetadata : undefined}
          allowBulkActions={allowDelete}
          allowDelete={allowDelete}
          showStats={false}
        />

        {/* Preview Modal */}
        <AttachmentPreview
          attachment={previewingAttachment}
          isOpen={!!previewingAttachment}
          onClose={() => setPreviewingAttachment(null)}
          onEdit={allowEdit ? handleEditMetadata : undefined}
          onDelete={allowDelete ? handleDeleteAttachment : undefined}
          allowEdit={allowEdit}
          allowDelete={allowDelete}
        />

        {/* Metadata Editor Modal */}
        <AttachmentMetadataEditor
          attachment={editingAttachment}
          isOpen={!!editingAttachment}
          onClose={() => setEditingAttachment(null)}
          onUpdate={handleMetadataUpdate}
          allowChangeCategory={allowEdit}
          allowEditTags={allowEdit}
          allowChangeConfidentiality={allowEdit}
        />
      </div>
    );
  }

  // Full tabbed interface for dedicated attachment management
  return (
    <div className="w-full" data-testid="attachment-manager-full">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Gestión de Adjuntos
              {auditTestName && (
                <Badge variant="outline" className="ml-2">
                  {auditTestName}
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              {showUploader && allowUpload && (
                <TabsTrigger value="upload" className="flex items-center gap-2" data-testid="tab-upload">
                  <Upload className="h-4 w-4" />
                  Subir Archivos
                </TabsTrigger>
              )}
              <TabsTrigger value="list" className="flex items-center gap-2" data-testid="tab-list">
                <FileText className="h-4 w-4" />
                Archivos Adjuntos
              </TabsTrigger>
            </TabsList>

            {/* Upload Tab */}
            {showUploader && allowUpload && (
              <TabsContent value="upload" className="space-y-4">
                <AuditTestAttachmentUploader
                  auditTestId={auditTestId}
                  onUploadComplete={handleUploadComplete}
                  maxFiles={10}
                  maxFileSize={50 * 1024 * 1024} // 50MB
                />
              </TabsContent>
            )}

            {/* List Tab */}
            <TabsContent value="list" className="space-y-4">
              <AuditTestAttachmentsList
                auditTestId={auditTestId}
                onPreviewFile={handlePreviewFile}
                onEditMetadata={allowEdit ? handleEditMetadata : undefined}
                allowBulkActions={allowDelete}
                allowDelete={allowDelete}
                showStats={true}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <AttachmentPreview
        attachment={previewingAttachment}
        isOpen={!!previewingAttachment}
        onClose={() => setPreviewingAttachment(null)}
        onEdit={allowEdit ? handleEditMetadata : undefined}
        onDelete={allowDelete ? handleDeleteAttachment : undefined}
        allowEdit={allowEdit}
        allowDelete={allowDelete}
      />

      {/* Metadata Editor Modal */}
      <AttachmentMetadataEditor
        attachment={editingAttachment}
        isOpen={!!editingAttachment}
        onClose={() => setEditingAttachment(null)}
        onUpdate={handleMetadataUpdate}
        allowChangeCategory={allowEdit}
        allowEditTags={allowEdit}
        allowChangeConfidentiality={allowEdit}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingAttachment} onOpenChange={() => setDeletingAttachment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar "{deletingAttachment?.fileName}"? 
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}