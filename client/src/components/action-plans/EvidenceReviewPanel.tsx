import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, XCircle, FileCheck } from "lucide-react";
import { EvidenceGallery } from "./EvidenceGallery";
import type { Action } from "@shared/schema";

interface EvidenceReviewPanelProps {
  actionPlan: Action;
  onReviewComplete?: () => void;
}

export function EvidenceReviewPanel({ actionPlan, onReviewComplete }: EvidenceReviewPanelProps) {
  const [reviewComments, setReviewComments] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reviewMutation = useMutation({
    mutationFn: ({ status, comments }: { status: 'approved' | 'rejected', comments: string }) =>
      apiRequest(`/api/action-plans/${actionPlan.id}/review`, "POST", {
        status,
        reviewComments: comments
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/action-plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/actions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/action-plans', actionPlan.id] });
      
      const isApproved = variables.status === 'approved';
      toast({
        title: isApproved ? "Plan aprobado" : "Plan rechazado",
        description: isApproved 
          ? "El plan de acción ha sido aprobado exitosamente."
          : "El plan de acción ha sido rechazado y requiere corrección."
      });
      
      setReviewComments("");
      onReviewComplete?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo completar la revisión. Intenta nuevamente.",
        variant: "destructive"
      });
    },
  });

  const handleApprove = () => {
    if (!reviewComments.trim()) {
      toast({
        title: "Comentarios requeridos",
        description: "Por favor ingresa comentarios de revisión antes de aprobar.",
        variant: "destructive"
      });
      return;
    }

    reviewMutation.mutate({
      status: 'approved',
      comments: reviewComments
    });
  };

  const handleReject = () => {
    if (!reviewComments.trim()) {
      toast({
        title: "Motivo de rechazo requerido",
        description: "Por favor ingresa el motivo del rechazo para trazabilidad.",
        variant: "destructive"
      });
      return;
    }

    reviewMutation.mutate({
      status: 'rejected',
      comments: reviewComments
    });
  };

  return (
    <div className="space-y-6" data-testid="evidence-review-panel">
      {/* Action Plan Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Información del Plan de Acción
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Código</Label>
            <p className="text-base" data-testid="review-plan-code">{actionPlan.code}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Nombre</Label>
            <p className="text-base" data-testid="review-plan-name">{actionPlan.title}</p>
          </div>
          {actionPlan.description && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Descripción</Label>
              <p className="text-base" data-testid="review-plan-description">{actionPlan.description}</p>
            </div>
          )}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Estado Actual</Label>
            <p className="text-base" data-testid="review-plan-status">
              {actionPlan.status === 'draft' ? 'Borrador' :
               actionPlan.status === 'in_progress' ? 'En Progreso' :
               actionPlan.status === 'pending_review' ? 'Pendiente Revisión' :
               actionPlan.status === 'approved' ? 'Aprobado' :
               actionPlan.status === 'rejected' ? 'Rechazado' : actionPlan.status}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Evidence Gallery */}
      <Card>
        <CardHeader>
          <CardTitle>Evidencias</CardTitle>
        </CardHeader>
        <CardContent>
          <EvidenceGallery actionPlanId={actionPlan.id} canDelete={false} />
        </CardContent>
      </Card>

      {/* Review Section */}
      <Card>
        <CardHeader>
          <CardTitle>Revisión de Auditoría</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="review-comments" className="text-sm font-medium">
              Comentarios de Revisión <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="review-comments"
              data-testid="textarea-review-comments"
              placeholder="Ingresa tus comentarios sobre la revisión de evidencias..."
              value={reviewComments}
              onChange={(e) => setReviewComments(e.target.value)}
              rows={6}
              className="resize-none mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Los comentarios quedarán registrados en el historial del plan de acción.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={handleReject}
              disabled={reviewMutation.isPending}
              data-testid="button-reject-review"
            >
              {reviewMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                  Procesando...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Rechazar y Solicitar Corrección
                </>
              )}
            </Button>
            
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleApprove}
              disabled={reviewMutation.isPending}
              data-testid="button-approve-review"
            >
              {reviewMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aprobar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
