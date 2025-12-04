import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit, FileText, Building, ExternalLink, Trash2, File } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ComplianceDocumentForm from "@/components/forms/compliance-document-form.tsx";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import type { ComplianceDocument, Macroproceso } from "@shared/schema";
import { EditGuard, DeleteGuard } from "@/components/auth/permission-guard";

function getClassificationColor(classification: string): string {
  switch (classification.toLowerCase()) {
    case 'ley':
      return "bg-red-100 text-red-700";
    case 'decreto':
      return "bg-orange-100 text-orange-700";
    case 'circular':
      return "bg-blue-100 text-blue-700";
    case 'política':
      return "bg-purple-100 text-purple-700";
    case 'procedimiento':
      return "bg-green-100 text-green-700";
    case 'código':
      return "bg-yellow-100 text-yellow-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getClassificationIcon(classification: string) {
  switch (classification.toLowerCase()) {
    case 'ley':
      return Building;
    case 'decreto':
    case 'circular':
      return FileText;
    case 'política':
    case 'procedimiento':
    case 'código':
    default:
      return File;
  }
}

export default function ComplianceDocuments() {
  const [editingDocument, setEditingDocument] = useState<ComplianceDocument | null>(null);
  const [viewingDocument, setViewingDocument] = useState<ComplianceDocument | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { hasPermission } = usePermissions();
  
  const { data: documents = [], isLoading } = useQuery<ComplianceDocument[]>({
    queryKey: ["/api/compliance-documents"],
    enabled: hasPermission("documents:read") || false,
  });

  const { data: macroprocesos = [] } = useQuery<Macroproceso[]>({
    queryKey: ["/api/macroprocesos"],
  });


  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/compliance-documents/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance-documents"] });
      toast({ title: "Documento eliminado", description: "El documento ha sido eliminado exitosamente." });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el documento. Puede tener dependencias.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (document: ComplianceDocument) => {
    if (confirm(`¿Estás seguro de que deseas eliminar el documento "${document.name}"?`)) {
      deleteMutation.mutate(document.id);
    }
  };

  const resetEditingDocument = () => setEditingDocument(null);
  const resetViewingDocument = () => setViewingDocument(null);

  const getMacroprocesoDisplay = (document: ComplianceDocument) => {
    if (document.appliesToAllMacroprocesos) {
      return "🌐 Todos los Macroprocesos";
    }
    if (document.macroprocesoId) {
      const macroproceso = macroprocesos.find(m => m.id === document.macroprocesoId);
      return macroproceso ? `${macroproceso.code} - ${macroproceso.name}` : "Macroproceso no encontrado";
    }
    return "Sin asignar";
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="compliance-documents-page">
      {/* Documents Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[calc(100vh-200px)]">
            <table className="w-full">
              <thead className="bg-gray-50 border-b sticky top-0 z-10">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-700 bg-gray-50">Código Interno</th>
                  <th className="text-left p-4 font-medium text-gray-700 bg-gray-50">Nombre</th>
                  <th className="text-left p-4 font-medium text-gray-700 bg-gray-50">Macroproceso</th>
                  <th className="text-left p-4 font-medium text-gray-700 bg-gray-50">Clasificación</th>
                  <th className="text-left p-4 font-medium text-gray-700 bg-gray-50">Organismo Emisor</th>
                  <th className="text-right p-4 font-medium text-gray-700 bg-gray-50">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {documents.map((document) => {
                  const ClassIcon = getClassificationIcon(document.classification);
                  return (
                    <tr key={document.id} className="hover:bg-gray-50" data-testid={`row-document-${document.id}`}>
                      <td className="p-4">
                        <span className="font-mono text-sm font-medium text-gray-900" data-testid={`text-code-${document.id}`}>
                          {document.internalCode}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-start gap-2">
                          <ClassIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-900" data-testid={`text-name-${document.id}`}>
                            {document.name}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-600" data-testid={`text-macroproceso-${document.id}`}>
                          {getMacroprocesoDisplay(document)}
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge 
                          className={getClassificationColor(document.classification)}
                          data-testid={`badge-classification-${document.id}`}
                        >
                          {document.classification}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-600" data-testid={`text-issuer-${document.id}`}>
                          {document.issuingOrganization}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingDocument(document)}
                            data-testid={`button-view-${document.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <EditGuard itemType="document">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingDocument(document)}
                              data-testid={`button-edit-${document.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </EditGuard>
                          <DeleteGuard itemType="document">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(document)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              data-testid={`button-delete-${document.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </DeleteGuard>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {documents.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No se encontraron documentos
              </h3>
              <p className="text-gray-600 mb-4">
                Comienza creando tu primer documento normativo usando el botón 'Nuevo Documento' en el header.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingDocument} onOpenChange={resetEditingDocument}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Documento</DialogTitle>
            <DialogDescription>
              Modificar la información del documento de cumplimiento existente.
            </DialogDescription>
          </DialogHeader>
          {editingDocument && (
            <ComplianceDocumentForm 
              initialData={editingDocument}
              onSuccess={() => {
                resetEditingDocument();
                queryClient.invalidateQueries({ queryKey: ["/api/compliance-documents"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewingDocument} onOpenChange={resetViewingDocument}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Documento</DialogTitle>
            <DialogDescription>
              Información completa del documento de cumplimiento.
            </DialogDescription>
          </DialogHeader>
          
          {viewingDocument && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Código Interno</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">{viewingDocument.internalCode}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Nombre</label>
                  <p className="mt-1 text-sm text-gray-900">{viewingDocument.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Clasificación</label>
                  <div className="mt-1">
                    <Badge className={getClassificationColor(viewingDocument.classification)}>
                      {viewingDocument.classification}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Macroproceso</label>
                  <p className="mt-1 text-sm text-gray-900">{getMacroprocesoDisplay(viewingDocument)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Organismo Emisor</label>
                  <p className="mt-1 text-sm text-gray-900">{viewingDocument.issuingOrganization}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Fecha de Publicación</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(viewingDocument.publicationDate).toLocaleDateString('es-ES')}
                  </p>
                </div>
                {viewingDocument.description && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-700">Descripción</label>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{viewingDocument.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
