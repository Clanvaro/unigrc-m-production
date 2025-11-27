import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Eye, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { queryKeys } from "@/lib/queryKeys";

interface RiskValidationStatusProps {
  riskId: string;
}

export function RiskValidationStatus({ riskId }: RiskValidationStatusProps) {
  const { data: validationStatus, isLoading } = useQuery<{
    aggregatedStatus: string;
    statusLabel: string;
    statusIcon: string;
    totalLinks: number;
    validatedCount: number;
    observedCount: number;
    rejectedCount: number;
    pendingCount: number;
    processValidations: Array<{
      processId?: string;
      macroprocesoId?: string;
      subprocesoId?: string;
      processName?: string;
      macroprocesoName?: string;
      subprocesoName?: string;
      validationStatus: string;
      validatedBy?: string;
      validatedAt?: string;
      validationComments?: string;
      responsibleName?: string;
    }>;
  }>({
    queryKey: queryKeys.risks.validationStatus(riskId),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estado de Validación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!validationStatus) {
    return null;
  }

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "validated":
        return "default";
      case "rejected":
        return "destructive";
      case "observed":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "validated":
        return <CheckCircle2 className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      case "observed":
        return <Eye className="h-4 w-4" />;
      case "pending_validation":
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending_validation: "Pendiente",
      validated: "Validado",
      observed: "Observado",
      rejected: "Rechazado",
    };
    return labels[status] || status;
  };

  const getProcessName = (validation: typeof validationStatus.processValidations[0]): string => {
    if (validation.subprocesoName) return validation.subprocesoName;
    if (validation.processName) return validation.processName;
    if (validation.macroprocesoName) return validation.macroprocesoName;
    return "Proceso sin nombre";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Estado de Validación</CardTitle>
            <CardDescription>
              Validación por proceso - {validationStatus.totalLinks} proceso(s) asociado(s)
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end mb-1">
              <span className="text-2xl">{validationStatus.statusIcon}</span>
              <Badge variant={getStatusVariant(validationStatus.aggregatedStatus)} className="text-base">
                {validationStatus.statusLabel}
              </Badge>
            </div>
            {validationStatus.totalLinks > 0 && (
              <div className="text-sm text-muted-foreground">
                {validationStatus.validatedCount > 0 && (
                  <span className="mr-2">
                    ✅ {validationStatus.validatedCount}
                  </span>
                )}
                {validationStatus.observedCount > 0 && (
                  <span className="mr-2">
                    👁️ {validationStatus.observedCount}
                  </span>
                )}
                {validationStatus.rejectedCount > 0 && (
                  <span className="mr-2">
                    ❌ {validationStatus.rejectedCount}
                  </span>
                )}
                {validationStatus.pendingCount > 0 && (
                  <span>
                    ⏳ {validationStatus.pendingCount}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {validationStatus.processValidations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Este riesgo no está asociado a ningún proceso</p>
          </div>
        ) : (
          <div className="space-y-3">
            {validationStatus.processValidations.map((validation, index) => (
              <div
                key={index}
                className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                data-testid={`validation-process-${index}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(validation.validationStatus)}
                    <span className="font-medium">{getProcessName(validation)}</span>
                    <Badge variant={getStatusVariant(validation.validationStatus)} className="ml-auto">
                      {getStatusLabel(validation.validationStatus)}
                    </Badge>
                  </div>
                  
                  {validation.responsibleName && (
                    <p className="text-sm text-muted-foreground">
                      Responsable: {validation.responsibleName}
                    </p>
                  )}
                  
                  {validation.validatedAt && (
                    <p className="text-sm text-muted-foreground">
                      Validado el {format(new Date(validation.validatedAt), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                    </p>
                  )}
                  
                  {validation.validationComments && (
                    <p className="text-sm mt-2 p-2 bg-muted rounded">
                      {validation.validationComments}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
