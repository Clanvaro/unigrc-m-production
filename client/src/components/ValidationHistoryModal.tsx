import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle, XCircle, AlertCircle, Clock, User, Calendar, MessageSquare, FileText } from "lucide-react";

interface ValidationHistoryModalProps {
  riskProcessLinkId: string;
  riskCode?: string;
  riskName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ValidationHistoryEntry {
  id: string;
  riskProcessLinkId: string;
  previousStatus: string | null;
  validationStatus: string;
  validatedBy: string;
  validatedAt: string;
  validationComments: string | null;
  processContext: string | null;
  processId: string | null;
  processName: string | null;
  validatedByUser: {
    id: string;
    fullName: string | null;
    email: string | null;
  };
  riskProcessLink?: {
    id: string;
    risk: {
      id: string;
      code: string;
      name: string;
    };
    macroproceso?: { id: string; name: string; };
    process?: { id: string; name: string; };
    subproceso?: { id: string; name: string; };
  };
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'validated':
      return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
    case 'rejected':
      return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
    case 'observed':
      return <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
    case 'pending_validation':
      return <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
    default:
      return <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
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

const getContextBadge = (context: string | null) => {
  if (!context) return null;
  
  switch (context) {
    case 'individual':
      return <Badge variant="outline" className="text-xs">Validación Individual</Badge>;
    case 'bulk_process':
      return <Badge variant="outline" className="text-xs">Validación por Proceso</Badge>;
    case 'bulk_multiple':
      return <Badge variant="outline" className="text-xs">Validación Masiva</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{context}</Badge>;
  }
};

export function ValidationHistoryModal({
  riskProcessLinkId,
  riskCode,
  riskName,
  open,
  onOpenChange
}: ValidationHistoryModalProps) {
  const { data: history, isLoading } = useQuery<ValidationHistoryEntry[]>({
    queryKey: ['/api/risk-process-links', riskProcessLinkId, 'validation-history'],
    enabled: open && !!riskProcessLinkId,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]" data-testid="modal-validation-history">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Historial de Validaciones
          </DialogTitle>
          <DialogDescription>
            {riskCode && riskName && (
              <span className="text-sm">
                <strong>{riskCode}</strong> - {riskName}
              </span>
            )}
            {!riskCode && !riskName && "Registro completo de validaciones para este riesgo-proceso"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8" data-testid="loading-history">
              <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Cargando historial...</span>
            </div>
          )}

          {!isLoading && (!history || history.length === 0) && (
            <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="empty-history">
              <Clock className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No hay historial de validaciones disponible</p>
              <p className="text-xs text-muted-foreground mt-1">Las validaciones futuras aparecerán aquí</p>
            </div>
          )}

          {!isLoading && history && history.length > 0 && (
            <div className="space-y-4">
              {history.map((entry, index) => (
                <div key={entry.id} className="relative" data-testid={`history-entry-${index}`}>
                  {/* Timeline line */}
                  {index < history.length - 1 && (
                    <div className="absolute left-[18px] top-12 bottom-0 w-0.5 bg-border" />
                  )}
                  
                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getStatusIcon(entry.validationStatus)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-2">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(entry.validationStatus)}
                          {entry.processContext && getContextBadge(entry.processContext)}
                          {entry.previousStatus && entry.previousStatus !== entry.validationStatus && (
                            <span className="text-xs text-muted-foreground">
                              (antes: {entry.previousStatus === 'pending_validation' ? 'Pendiente' : entry.previousStatus})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(entry.validatedAt), "PPp", { locale: es })}
                        </div>
                      </div>

                      {/* Validator */}
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {entry.validatedByUser.fullName || entry.validatedByUser.email || 'Usuario desconocido'}
                        </span>
                      </div>

                      {/* Comments */}
                      {entry.validationComments && (
                        <div className="flex gap-2 text-sm bg-muted/50 dark:bg-muted/20 p-3 rounded-md">
                          <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-foreground/80 whitespace-pre-wrap">{entry.validationComments}</p>
                        </div>
                      )}

                      {/* Process info */}
                      {entry.processName && (
                        <div className="text-xs text-muted-foreground">
                          Proceso: {entry.processName}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Separator */}
                  {index < history.length - 1 && <Separator className="my-4" />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
