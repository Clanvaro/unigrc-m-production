import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { History, User, Clock, Edit, Plus, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  userId: string;
  user?: { fullName: string; username: string };
  changes?: Record<string, { old: any; new: any }>;
  timestamp: string;
  ipAddress?: string;
}

interface AuditHistoryProps {
  entityType: string;
  entityId: string;
  maxHeight?: string;
}

export function AuditHistory({ entityType, entityId, maxHeight = "400px" }: AuditHistoryProps) {
  const { data: logsRaw, isLoading, error } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs", entityType, entityId],
  });

  // Filter out changes where old and new values are actually the same
  const logs = logsRaw?.map(log => {
    if (log.action === 'update' && log.changes) {
      const filteredChanges: Record<string, { old: any; new: any }> = {};
      
      for (const [field, change] of Object.entries(log.changes)) {
        // Compare serialized versions to handle arrays and objects
        const oldStr = JSON.stringify(change.old);
        const newStr = JSON.stringify(change.new);
        
        // Only include if values are actually different
        if (oldStr !== newStr) {
          filteredChanges[field] = change;
        }
      }
      
      // Return log with filtered changes, or null if no real changes
      if (Object.keys(filteredChanges).length > 0) {
        return { ...log, changes: filteredChanges };
      }
      return null;
    }
    return log;
  }).filter(Boolean) as AuditLog[];

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create': return <Plus className="h-4 w-4" />;
      case 'update': return <Edit className="h-4 w-4" />;
      case 'delete': return <Trash2 className="h-4 w-4" />;
      default: return <History className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'update': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'delete': return 'bg-red-500/10 text-red-700 dark:text-red-400';
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'create': return 'Creado';
      case 'update': return 'Modificado';
      case 'delete': return 'Eliminado';
      default: return action;
    }
  };

  const formatFieldName = (field: string) => {
    const fieldMap: Record<string, string> = {
      name: 'Nombre',
      description: 'Descripción',
      status: 'Estado',
      probability: 'Probabilidad',
      impact: 'Impacto',
      inherentRisk: 'Riesgo Inherente',
      residualRisk: 'Riesgo Residual',
      effectiveness: 'Efectividad',
      type: 'Tipo',
      frequency: 'Frecuencia',
      responsibleId: 'Responsable',
      processId: 'Proceso',
      categoryId: 'Categoría',
      isActive: 'Activo',
      validationStatus: 'Estado de Validación',
      lastReview: 'Última Revisión',
      nextReview: 'Próxima Revisión',
      dueDate: 'Fecha de Vencimiento',
      impactDimensions: 'Dimensiones de Impacto',
    };
    return fieldMap[field] || field;
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    
    // Try to format as date if it looks like an ISO date
    const stringValue = String(value);
    if (stringValue.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      try {
        return new Date(stringValue).toLocaleString('es-ES', {
          dateStyle: 'medium',
          timeStyle: 'short'
        });
      } catch {
        return stringValue;
      }
    }
    
    return stringValue;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Cambios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Cargando historial...</p>
        </CardContent>
      </Card>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Cambios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No hay historial disponible</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Historial de Cambios
          <Badge variant="secondary">{logs.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea style={{ maxHeight }} className="px-6">
          <div className="space-y-4 py-4">
            {logs.map((log, index) => (
              <div key={log.id}>
                <div className="flex items-start gap-3">
                  {/* Action Icon */}
                  <div className={`rounded-full p-2 ${getActionColor(log.action)}`}>
                    {getActionIcon(log.action)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getActionColor(log.action)}>
                        {getActionLabel(log.action)}
                      </Badge>
                      {log.timestamp && (
                        <span className="text-xs text-muted-foreground">
                          {(() => {
                            try {
                              const date = new Date(log.timestamp);
                              if (isNaN(date.getTime())) {
                                return 'Fecha inválida';
                              }
                              return formatDistanceToNow(date, { 
                                addSuffix: true, 
                                locale: es 
                              });
                            } catch (error) {
                              return 'Fecha inválida';
                            }
                          })()}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">
                        {log.user?.fullName || log.user?.username || 'Usuario desconocido'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {log.timestamp && (
                        <span>
                          {(() => {
                            try {
                              const date = new Date(log.timestamp);
                              if (isNaN(date.getTime())) {
                                return 'Fecha inválida';
                              }
                              return date.toLocaleString('es-ES', {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                              });
                            } catch (error) {
                              return 'Fecha inválida';
                            }
                          })()}
                        </span>
                      )}
                      {log.ipAddress && (
                        <>
                          <span>•</span>
                          <span>IP: {log.ipAddress}</span>
                        </>
                      )}
                    </div>

                    {/* Changes Details */}
                    {log.action === 'update' && log.changes && Object.keys(log.changes).length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Campos modificados:</p>
                        <div className="space-y-1">
                          {Object.entries(log.changes).map(([field, change]) => (
                            <div key={field} className="bg-muted/50 rounded p-2 text-xs space-y-2">
                              <p className="font-medium">{formatFieldName(field)}</p>
                              <div className="space-y-1.5">
                                <div className="flex flex-col gap-1">
                                  <span className="text-muted-foreground text-[10px] uppercase tracking-wide">Anterior:</span>
                                  <span className="line-through text-red-600 dark:text-red-400 break-all">
                                    {formatValue(change.old)}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className="text-muted-foreground text-[10px] uppercase tracking-wide">Nuevo:</span>
                                  <span className="font-medium text-green-600 dark:text-green-400 break-all">
                                    {formatValue(change.new)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {index < logs.length - 1 && <Separator className="my-4" />}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
