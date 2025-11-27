import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Undo2, Trash2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TrashItem {
  id: string;
  code?: string;
  name?: string;
  title?: string;
  displayName: string;
  entityType: string;
  status: string;
  deletedAt: string | null;
  deletedBy: string | null;
  deletionReason: string | null;
  createdAt: string;
}

interface TrashData {
  items: {
    risks: TrashItem[];
    controls: TrashItem[];
    macroprocesos: TrashItem[];
    processes: TrashItem[];
    subprocesos: TrashItem[];
    gerencias: TrashItem[];
    riskEvents: TrashItem[];
    actions: TrashItem[];
    actionPlans: TrashItem[];
    auditPlans: TrashItem[];
    audits: TrashItem[];
  };
  totalDeleted: number;
}

const entityLabels: Record<string, string> = {
  risks: "Riesgos",
  controls: "Controles",
  macroprocesos: "Macroprocesos",
  processes: "Procesos",
  subprocesos: "Subprocesos",
  gerencias: "Gerencias",
  riskEvents: "Eventos de Riesgo",
  actions: "Acciones",  
  actionPlans: "Planes de Acción",
  auditPlans: "Planes de Auditoría",
  audits: "Auditorías"
};

// Map frontend entity keys (plural) to backend entity keys (singular)
const entityTypeMap: Record<string, string> = {
  risks: "risk",
  controls: "control",
  macroprocesos: "macroproceso",
  processes: "process",
  subprocesos: "subproceso",
  gerencias: "gerencia",
  riskEvents: "riskEvent",
  actions: "action",
  actionPlans: "actionPlan",
  auditPlans: "auditPlan",
  audits: "audit"
};

export default function TrashPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch trash items
  const { data: trashData, isLoading } = useQuery<TrashData>({
    queryKey: ["/api/trash"],
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: async ({ entity, id }: { entity: string; id: string }) => {
      return apiRequest(`/api/trash/${entity}/${id}/restore`, "POST");
    },
    onSuccess: () => {
      // Invalidate trash cache
      queryClient.invalidateQueries({ queryKey: ["/api/trash"] });
      
      // Invalidate entity-specific caches so restored items appear immediately
      queryClient.invalidateQueries({ queryKey: ["/api/risks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/controls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/macroprocesos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/processes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subprocesos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gerencias"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-events/fraud-history/check"] });
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/action-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/audit-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/audits"] });
      
      toast({
        title: "Elemento restaurado",
        description: "El elemento ha sido restaurado exitosamente",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo restaurar el elemento",
      });
    },
  });

  const handleRestore = (entityType: string, itemId: string) => {
    // Map the plural frontend entity type to singular backend entity type
    const backendEntityType = entityTypeMap[entityType] || entityType;
    restoreMutation.mutate({ entity: backendEntityType, id: itemId });
  };

  const renderItemTable = (items: TrashItem[], entityType: string) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-12 text-foreground/60 rounded-2xl bg-background/50 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.08),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3),inset_-4px_-4px_8px_rgba(255,255,255,0.05)]">
          No hay elementos eliminados en esta categoría
        </div>
      );
    }

    return (
      <div className="rounded-2xl overflow-hidden shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.9)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.4),-6px_-6px_12px_rgba(255,255,255,0.05)]">
        <Table>
          <TableHeader>
            <TableRow className="bg-background/60 backdrop-blur-sm border-none">
              <TableHead className="font-semibold">Código</TableHead>
              <TableHead className="font-semibold">Nombre</TableHead>
              <TableHead className="font-semibold">Eliminado el</TableHead>
              <TableHead className="font-semibold">Eliminado por</TableHead>
              <TableHead className="font-semibold">Motivo</TableHead>
              <TableHead className="font-semibold">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="border-none hover:bg-background/40 transition-all duration-200">
                <TableCell>
                  <span className="inline-block px-3 py-1 rounded-xl text-xs font-semibold text-foreground bg-background shadow-[2px_2px_4px_rgba(0,0,0,0.1),-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[2px_2px_4px_rgba(0,0,0,0.3),-2px_-2px_4px_rgba(255,255,255,0.05)]">
                    {item.code || "N/A"}
                  </span>
                </TableCell>
                <TableCell className="font-semibold text-foreground">{item.displayName}</TableCell>
                <TableCell className="text-foreground/70">
                  {item.deletedAt
                    ? format(new Date(item.deletedAt), "dd/MM/yyyy HH:mm")
                    : "N/A"}
                </TableCell>
                <TableCell className="text-foreground/70">
                  {item.deletedBy || "Desconocido"}
                </TableCell>
                <TableCell className="max-w-xs truncate text-foreground/70 text-sm">
                  {item.deletionReason || "Sin motivo especificado"}
                </TableCell>
                <TableCell>
                  <button
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-background shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.4),-4px_-4px_8px_rgba(255,255,255,0.05)] hover:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:hover:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.15),inset_-4px_-4px_8px_rgba(255,255,255,0.7)] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    onClick={() => handleRestore(entityType, item.id)}
                    disabled={restoreMutation.isPending}
                    data-testid={`button-restore-${entityType}-${item.id}`}
                  >
                    <Undo2 className="h-4 w-4" />
                    Restaurar
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="container mx-auto">
          <div className="rounded-3xl bg-background p-8 shadow-[12px_12px_24px_rgba(0,0,0,0.1),-12px_-12px_24px_rgba(255,255,255,0.9)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.4),-12px_-12px_24px_rgba(255,255,255,0.05)]">
            <div className="text-center text-foreground/70">Cargando papelera...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 p-6" data-testid="page-trash">
      <div className="container mx-auto">
        <div className="rounded-3xl bg-background p-8 shadow-[12px_12px_24px_rgba(0,0,0,0.1),-12px_-12px_24px_rgba(255,255,255,0.9)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.4),-12px_-12px_24px_rgba(255,255,255,0.05)]">
          {/* Header with neomorphic design */}
          {trashData && trashData.totalDeleted > 0 && (
            <div className="mb-8 p-6 rounded-2xl shadow-[inset_4px_4px_8px_rgba(0,0,0,0.08),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3),inset_-4px_-4px_8px_rgba(255,255,255,0.05)] bg-background/50">
              <div className="flex items-center justify-center">
                <div className="px-6 py-3 rounded-2xl text-lg font-semibold shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.9)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.4),-6px_-6px_12px_rgba(255,255,255,0.05)] bg-background">
                  <span className="text-primary">
                    {trashData.totalDeleted}
                  </span>
                  <span className="text-foreground/60 text-base ml-2">elementos eliminados</span>
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          <div>
            {trashData?.totalDeleted === 0 ? (
              <div className="p-6 rounded-2xl shadow-[inset_4px_4px_8px_rgba(0,0,0,0.08),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3),inset_-4px_-4px_8px_rgba(255,255,255,0.05)] bg-background/50">
                <div className="flex items-center gap-3 text-foreground/70">
                  <AlertCircle className="h-5 w-5" />
                  <p>La papelera está vacía. Los elementos eliminados aparecerán aquí.</p>
                </div>
              </div>
            ) : (
              <Tabs defaultValue="risks" className="w-full">
                {/* Neomorphic tabs */}
                <div className="w-full overflow-x-auto pb-3 mb-6">
                  <TabsList className="inline-flex gap-2 p-2 rounded-2xl bg-background/50 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.08),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3),inset_-4px_-4px_8px_rgba(255,255,255,0.05)] min-w-full w-auto">
                    {Object.entries(entityLabels).map(([key, label]) => {
                      const count = trashData?.items[key as keyof typeof trashData.items]?.length || 0;
                      return (
                        <TabsTrigger 
                          key={key} 
                          value={key} 
                          data-testid={`tab-${key}`}
                          className="whitespace-nowrap flex-shrink-0 px-5 py-2.5 rounded-xl data-[state=active]:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.12),inset_-3px_-3px_6px_rgba(255,255,255,0.7)] data-[state=active]:dark:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.4),inset_-3px_-3px_6px_rgba(255,255,255,0.05)] data-[state=inactive]:shadow-[3px_3px_6px_rgba(0,0,0,0.1),-3px_-3px_6px_rgba(255,255,255,0.9)] data-[state=inactive]:dark:shadow-[3px_3px_6px_rgba(0,0,0,0.4),-3px_-3px_6px_rgba(255,255,255,0.05)] transition-all duration-200 hover:scale-[1.02] font-medium"
                        >
                          {label} <span className="ml-1.5 opacity-70">({count})</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>

                {/* Tab content with neomorphic cards */}
                {Object.entries(entityLabels).map(([key, label]) => (
                  <TabsContent key={key} value={key}>
                    <div className="p-6 rounded-2xl bg-background/30 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.05),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] dark:shadow-[inset_2px_2px_4px_rgba(0,0,0,0.2),inset_-2px_-2px_4px_rgba(255,255,255,0.03)]">
                      <h3 className="text-xl font-bold mb-6 text-foreground">
                        {label} Eliminados
                      </h3>
                      {renderItemTable(
                        trashData?.items[key as keyof typeof trashData.items] || [],
                        key
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
