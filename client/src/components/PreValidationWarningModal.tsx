import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface PreValidationWarningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processName: string;
  totalRisks: number;
  validatedCount: number;
  pendingCount: number;
  alreadyValidatedRisks: Array<{
    riskProcessLinkId: string;
    riskCode: string;
    riskName: string;
    validationStatus: string;
    responsibleName: string | null;
    processName: string | null;
  }>;
  onConfirm: (revalidateAll: boolean) => void;
  isLoading?: boolean;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'validated':
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs">Aprobado</Badge>;
    case 'rejected':
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 text-xs">Rechazado</Badge>;
    case 'observed':
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 text-xs">Observado</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
};

export function PreValidationWarningModal({
  open,
  onOpenChange,
  processName,
  totalRisks,
  validatedCount,
  pendingCount,
  alreadyValidatedRisks,
  onConfirm,
  isLoading = false
}: PreValidationWarningModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]" data-testid="modal-prevalidation-warning">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Confirmación de Envío a Validación
          </DialogTitle>
          <DialogDescription>
            El proceso <strong>{processName}</strong> ya tiene algunos riesgos validados
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{totalRisks}</div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Total de Riesgos</div>
            </div>
            <div className="flex flex-col items-center p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-3xl font-bold text-green-700 dark:text-green-300 flex items-center gap-1">
                <CheckCircle className="h-6 w-6" />
                {validatedCount}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">Ya Validados</div>
            </div>
            <div className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="text-3xl font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Clock className="h-6 w-6" />
                {pendingCount}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Pendientes</div>
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-medium text-yellow-900 dark:text-yellow-100">
                  ¿Qué deseas hacer con los riesgos ya validados?
                </p>
                <p className="text-yellow-800 dark:text-yellow-200">
                  Algunos riesgos de este proceso ya han sido validados anteriormente. Puedes optar por:
                </p>
                <ul className="list-disc list-inside space-y-1 text-yellow-700 dark:text-yellow-300 ml-2">
                  <li><strong>Revalidar todo:</strong> Enviar a validación todos los riesgos ({totalRisks}), incluyendo los ya validados. Se creará un nuevo registro de validación.</li>
                  <li><strong>Solo pendientes:</strong> Enviar únicamente los {pendingCount} riesgos que aún no han sido validados.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* List of already validated risks */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">
              Riesgos Ya Validados ({validatedCount}):
            </h4>
            <ScrollArea className="h-[250px] border rounded-md p-3">
              <div className="space-y-2">
                {alreadyValidatedRisks.map((risk, index) => (
                  <div 
                    key={risk.riskProcessLinkId} 
                    className="flex items-start justify-between gap-3 p-3 bg-muted/50 rounded-md hover:bg-muted transition-colors"
                    data-testid={`validated-risk-${index}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-foreground">{risk.riskCode}</span>
                        {getStatusBadge(risk.validationStatus)}
                      </div>
                      <p className="text-sm text-foreground mt-1 line-clamp-1">{risk.riskName}</p>
                      {risk.responsibleName && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Responsable: {risk.responsibleName}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            data-testid="button-cancel-prevalidation"
          >
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={() => onConfirm(false)}
            disabled={isLoading}
            data-testid="button-send-pending-only"
          >
            <Clock className="h-4 w-4 mr-2" />
            Solo Pendientes ({pendingCount})
          </Button>
          <Button
            onClick={() => onConfirm(true)}
            disabled={isLoading}
            data-testid="button-revalidate-all"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {isLoading ? 'Enviando...' : `Revalidar Todo (${totalRisks})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
