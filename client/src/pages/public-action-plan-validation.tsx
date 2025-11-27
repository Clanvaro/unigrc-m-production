import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, FileText } from "lucide-react";

interface ValidationResponse {
  success: boolean;
  actionPlan?: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    dueDate: string | null;
    responsible: string | null;
    process: { id: string; name: string; code: string } | null;
    risk: { id: string; name: string; code: string } | null;
  };
  action?: string;
  validationData?: any;
  error?: string;
}

interface SubmitResponse {
  success: boolean;
  message?: string;
  actionPlan?: {
    id: string;
    code: string;
    name: string;
    validationStatus: string;
  };
  error?: string;
}

export default function PublicActionPlanValidation() {
  const [, params] = useRoute("/public/validate-action-plan/:token");
  const token = params?.token || "";
  
  const [comments, setComments] = useState("");
  const [submitted, setSubmitted] = useState(false);
  
  // Fetch validation data
  const { data, isLoading, error } = useQuery<ValidationResponse>({
    queryKey: ["/api/public/validate-action-plan", token],
    enabled: !!token && !submitted,
    retry: false
  });
  
  // Submit validation
  const submitMutation = useMutation<SubmitResponse, Error, { comments: string }>({
    mutationFn: async ({ comments }) => {
      const response = await fetch(`/api/public/validate-action-plan/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ comments }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al procesar la validación");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    }
  });
  
  const handleSubmit = () => {
    submitMutation.mutate({ comments });
  };
  
  // Get action label and color
  const getActionLabel = (action?: string) => {
    switch (action) {
      case 'validated':
        return { label: 'Aprobar', color: 'text-green-600', icon: CheckCircle2 };
      case 'observed':
        return { label: 'Observar', color: 'text-orange-600', icon: AlertTriangle };
      case 'rejected':
        return { label: 'Rechazar', color: 'text-red-600', icon: XCircle };
      default:
        return { label: 'Validar', color: 'text-gray-600', icon: FileText };
    }
  };
  
  const actionInfo = getActionLabel(data?.action);
  const ActionIcon = actionInfo.icon;
  
  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Sin fecha límite';
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Cargando información...</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Error state
  if (error || (data && !data.success)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-red-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-8 w-8 text-red-600" />
              <CardTitle className="text-red-600">Error de Validación</CardTitle>
            </div>
            <CardDescription>No se pudo cargar la información del plan de acción</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                {data?.error || error?.message || 'Token inválido, expirado o ya utilizado. Por favor, contacte al administrador si necesita un nuevo enlace de validación.'}
              </AlertDescription>
            </Alert>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Posibles causas:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>El enlace ya fue utilizado anteriormente</li>
                <li>El enlace ha expirado (válido por 7 días)</li>
                <li>El enlace es inválido o fue modificado</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Success state (after submission)
  if (submitted && submitMutation.isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-green-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <CardTitle className="text-green-600">Validación Completada</CardTitle>
            </div>
            <CardDescription>El plan de acción ha sido procesado exitosamente</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {submitMutation.data?.message || 'La validación se ha registrado correctamente'}
              </AlertDescription>
            </Alert>
            
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold mb-2">Plan de Acción</h4>
                <p className="text-sm text-muted-foreground">
                  <strong>Código:</strong> {submitMutation.data?.actionPlan?.code}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Nombre:</strong> {submitMutation.data?.actionPlan?.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Estado:</strong> {submitMutation.data?.actionPlan?.validationStatus}
                </p>
              </div>
              
              {comments && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold mb-2 text-blue-900">Comentarios registrados</h4>
                  <p className="text-sm text-blue-800 whitespace-pre-wrap">{comments}</p>
                </div>
              )}
            </div>
            
            <p className="mt-6 text-sm text-muted-foreground text-center">
              Puede cerrar esta ventana. Se ha notificado al equipo sobre su decisión.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Main validation form
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ActionIcon className={`h-8 w-8 ${actionInfo.color}`} />
            <CardTitle>{actionInfo.label} Plan de Acción</CardTitle>
          </div>
          <CardDescription>
            Revise la información y confirme su decisión
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Action Plan Information */}
          <div className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Plan: {data?.actionPlan?.code}</h3>
            <p className="opacity-90">{data?.actionPlan?.name}</p>
          </div>
          
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-sm font-semibold">Código</Label>
                <p className="text-base mt-1">{data?.actionPlan?.code}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm font-semibold">Responsable</Label>
                <p className="text-base mt-1">{data?.actionPlan?.responsible || 'No asignado'}</p>
              </div>
            </div>
            
            <div>
              <Label className="text-muted-foreground text-sm font-semibold">Fecha Límite</Label>
              <p className="text-base mt-1">{formatDate(data?.actionPlan?.dueDate || null)}</p>
            </div>
            
            {data?.actionPlan?.description && (
              <div>
                <Label className="text-muted-foreground text-sm font-semibold">Descripción</Label>
                <p className="text-base mt-1 whitespace-pre-wrap">{data.actionPlan.description}</p>
              </div>
            )}
            
            {data?.actionPlan?.process && (
              <div>
                <Label className="text-muted-foreground text-sm font-semibold">Proceso</Label>
                <p className="text-base mt-1">{data.actionPlan.process.code} - {data.actionPlan.process.name}</p>
              </div>
            )}
            
            {data?.actionPlan?.risk && (
              <div>
                <Label className="text-muted-foreground text-sm font-semibold">Riesgo</Label>
                <p className="text-base mt-1">{data.actionPlan.risk.code} - {data.actionPlan.risk.name}</p>
              </div>
            )}
          </div>
          
          {/* Action Alert */}
          <Alert className={
            data?.action === 'validated' ? 'bg-green-50 border-green-200' :
            data?.action === 'observed' ? 'bg-orange-50 border-orange-200' :
            'bg-red-50 border-red-200'
          }>
            <ActionIcon className={`h-4 w-4 ${actionInfo.color}`} />
            <AlertDescription className={actionInfo.color}>
              Está a punto de <strong>{actionInfo.label.toLowerCase()}</strong> este plan de acción.
              {data?.action === 'observed' && ' Esto marcará el plan como pendiente de revisión.'}
              {data?.action === 'rejected' && ' Esta acción marcará el plan como rechazado.'}
              {data?.action === 'validated' && ' Esta acción marcará el plan como aprobado.'}
            </AlertDescription>
          </Alert>
          
          {/* Comments */}
          <div className="space-y-2">
            <Label htmlFor="comments">Comentarios (opcional)</Label>
            <Textarea
              id="comments"
              data-testid="textarea-comments"
              placeholder="Ingrese sus comentarios sobre esta decisión..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground">
              Sus comentarios serán registrados junto con la decisión
            </p>
          </div>
          
          {/* Error state for submission */}
          {submitMutation.isError && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {submitMutation.error?.message || 'Error al procesar la validación'}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              data-testid="button-submit"
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              className={
                data?.action === 'validated' ? 'bg-green-600 hover:bg-green-700' :
                data?.action === 'observed' ? 'bg-orange-600 hover:bg-orange-700' :
                'bg-red-600 hover:bg-red-700'
              }
              size="lg"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <ActionIcon className="mr-2 h-4 w-4" />
                  Confirmar {actionInfo.label}
                </>
              )}
            </Button>
          </div>
          
          {/* Footer note */}
          <div className="border-t pt-4 mt-6">
            <p className="text-xs text-muted-foreground text-center">
              Este enlace es válido por 7 días y solo puede ser usado una vez.<br />
              Sistema de Gestión de Riesgos
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
