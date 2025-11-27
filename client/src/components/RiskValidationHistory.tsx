import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ValidationHistoryModal } from "@/components/ValidationHistoryModal";
import { History, CheckCircle, XCircle, AlertCircle, Clock, FileText } from "lucide-react";

interface RiskValidationHistoryProps {
  riskId: string;
  riskCode: string;
  riskName: string;
}

interface RiskProcessLink {
  id: string;
  riskId: string;
  processId: string | null;
  macroprocesoId: string | null;
  subprocesoId: string | null;
  validationStatus: string;
  validatedAt: string | null;
  validationComments: string | null;
  responsibleUserId: string | null;
  macroproceso?: { id: string; name: string };
  process?: { id: string; name: string };
  subproceso?: { id: string; name: string };
  responsibleUser?: { id: string; fullName: string | null; email: string | null };
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'validated':
      return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
    case 'rejected':
      return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
    case 'observed':
      return <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
    case 'pending_validation':
      return <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    default:
      return <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'validated':
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Aprobado</Badge>;
    case 'rejected':
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Rechazado</Badge>;
    case 'observed':
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">Observado</Badge>;
    case 'pending_validation':
      return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">Pendiente</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export function RiskValidationHistory({ riskId, riskCode, riskName }: RiskValidationHistoryProps) {
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<RiskProcessLink | null>(null);

  const { data: riskProcessLinks, isLoading } = useQuery<RiskProcessLink[]>({
    queryKey: [`/api/risk-processes/risk/${riskId}`],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Clock className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Cargando historial...</span>
      </div>
    );
  }

  if (!riskProcessLinks || riskProcessLinks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Este riesgo no tiene enlaces de proceso-validación registrados</p>
        <p className="text-xs text-muted-foreground mt-1">Los enlaces se crean cuando el riesgo se asocia a procesos y se envían a validación</p>
      </div>
    );
  }

  const getProcessName = (link: RiskProcessLink) => {
    return link.subproceso?.name || link.process?.name || link.macroproceso?.name || "N/A";
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        <p>Historial de validaciones por proceso para el riesgo <strong>{riskCode}</strong></p>
        <p className="text-xs mt-1">Cada fila representa una validación independiente del riesgo en un proceso específico con un responsable asignado</p>
      </div>

      <div className="grid gap-4">
        {riskProcessLinks.map((link) => (
          <Card key={link.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {getProcessName(link)}
                  </CardTitle>
                  {link.responsibleUser && (
                    <CardDescription className="text-xs">
                      Responsable: {link.responsibleUser.fullName || link.responsibleUser.email}
                    </CardDescription>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(link.validationStatus)}
                  {getStatusBadge(link.validationStatus)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="space-y-1 text-xs text-muted-foreground">
                  {link.validatedAt && (
                    <p>Última validación: {new Date(link.validatedAt).toLocaleDateString('es-ES', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</p>
                  )}
                  {link.validationComments && (
                    <p className="italic line-clamp-1">"{link.validationComments}"</p>
                  )}
                  {!link.validatedAt && (
                    <p className="text-muted-foreground">Sin validación registrada</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedLink(link);
                    setHistoryModalOpen(true);
                  }}
                  data-testid={`button-view-validation-history-${link.id}`}
                >
                  <History className="h-4 w-4 mr-2" />
                  Ver Historial
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedLink && (
        <ValidationHistoryModal
          riskProcessLinkId={selectedLink.id}
          riskCode={riskCode}
          riskName={riskName}
          open={historyModalOpen}
          onOpenChange={setHistoryModalOpen}
        />
      )}
    </div>
  );
}
