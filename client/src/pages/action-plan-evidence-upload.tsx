import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Calendar,
  Target,
  FileText,
  Loader2
} from "lucide-react";
import { UploadEvidenceModal } from "@/components/action-plans/UploadEvidenceModal";
import { EvidenceGallery } from "@/components/action-plans/EvidenceGallery";
import type { ActionPlan } from "@shared/schema";

export default function ActionPlanEvidenceUpload() {
  const { token } = useParams<{ token: string }>();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const { data: actionPlan, isLoading, error } = useQuery<ActionPlan>({
    queryKey: ['/api/action-plans/by-token', token],
    retry: false,
  });

  const formatDate = (dateValue: string | Date | null) => {
    if (!dateValue) return 'No definida';
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    return date.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPriorityBadge = (priority: string) => {
    const badges = {
      critical: <Badge className="bg-red-500">Crítica</Badge>,
      high: <Badge className="bg-orange-500">Alta</Badge>,
      medium: <Badge className="bg-yellow-500">Media</Badge>,
      low: <Badge className="bg-green-500">Baja</Badge>,
    };
    return badges[priority as keyof typeof badges] || <Badge>{priority}</Badge>;
  };

  const handleUploadSuccess = () => {
    setUploadSuccess(true);
    setTimeout(() => {
      setUploadSuccess(false);
    }, 5000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center" data-testid="loading-state">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Cargando información del plan de acción...</p>
        </div>
      </div>
    );
  }

  if (error || !actionPlan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full" data-testid="error-state">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Acceso No Válido</h2>
              <p className="text-muted-foreground mb-4">
                El enlace no es válido o ha expirado. Por favor, contacta al administrador para obtener un nuevo enlace.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="evidence-upload-page">
      <div className="container max-w-5xl mx-auto py-8 px-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Portal de Evidencias</h1>
          <p className="text-muted-foreground">
            Sube evidencias para el plan de acción
          </p>
        </div>

        {/* Success Alert */}
        {uploadSuccess && (
          <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" data-testid="success-alert">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              ¡Evidencias subidas exitosamente! Puedes continuar subiendo más archivos o cerrar esta ventana.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Plan Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-2xl" data-testid="plan-title">{actionPlan.name}</CardTitle>
                <CardDescription data-testid="plan-code">Código: {actionPlan.code}</CardDescription>
              </div>
              {getPriorityBadge(actionPlan.priority)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {actionPlan.description && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Descripción
                </h3>
                <p className="text-muted-foreground" data-testid="plan-description">{actionPlan.description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Estado
                </h4>
                <p className="text-muted-foreground" data-testid="plan-status">
                  {actionPlan.status === 'completed' ? 'Completado' :
                   actionPlan.status === 'in_progress' ? 'En Progreso' :
                   actionPlan.status === 'audited' ? 'Auditado' : 'Pendiente'}
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fecha de Vencimiento
                </h4>
                <p className="text-muted-foreground" data-testid="plan-due-date">
                  {formatDate(actionPlan.dueDate)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Evidencias</CardTitle>
                <CardDescription>
                  Sube archivos que respalden la ejecución del plan de acción
                </CardDescription>
              </div>
              <Button 
                onClick={() => setIsUploadModalOpen(true)}
                data-testid="button-open-upload-modal"
              >
                <Upload className="h-4 w-4 mr-2" />
                Subir Evidencias
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <EvidenceGallery actionPlanId={actionPlan.id} canDelete={false} />
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">Instrucciones:</h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>Puedes subir hasta 5 archivos a la vez</li>
              <li>Tamaño máximo por archivo: 10 MB</li>
              <li>Formatos permitidos: PDF, Word, Excel, Imágenes (JPG, PNG, GIF, WebP)</li>
              <li>Las evidencias quedarán asociadas al plan de acción automáticamente</li>
              <li>Asegúrate de que los archivos contengan información relevante y verificable</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Upload Modal */}
      <UploadEvidenceModal
        actionPlanId={actionPlan.id}
        open={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
}
