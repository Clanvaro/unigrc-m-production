import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOptimisticMutation } from "@/hooks/useOptimisticMutation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, Edit, Trash2, AlertTriangle, FileText, Building, MoreVertical, ChevronUp, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "@/contexts/SearchContext";
import type { RiskEvent, Risk, Process } from "@shared/schema";
import { VirtualizedTable, VirtualizedTableColumn, generateMockEvents } from "@/components/virtualized-table";
import RiskEventForm from "@/components/forms/risk-event-form";
import { EditGuard, DeleteGuard } from "@/components/auth/permission-guard";
import { AuditHistory } from "@/components/AuditHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSavedViews } from "@/hooks/useSavedViews";
import { Star } from "lucide-react";
import BowTieDiagram from "@/components/BowTieDiagram";
import type { Control } from "@shared/schema";

// Componente wrapper para cargar controles del riesgo
function BowTieDiagramWrapper({ eventId, event }: { eventId: string; event: RiskEvent }) {
  const { data: controlsData = [] } = useQuery<Control[]>({
    queryKey: [`/api/risks/${event.riskId}/controls`],
    enabled: !!event.riskId,
  });

  return <BowTieDiagram event={event} controls={controlsData} />;
}

// Componente wrapper para cargar evento completo al editar
function EditEventFormWrapper({ eventId, onSuccess }: { eventId: string; onSuccess: () => void }) {
  const { data: fullEvent } = useQuery({
    queryKey: [`/api/risk-events/${eventId}`],
    enabled: !!eventId,
  });

  if (!fullEvent) return <div>Cargando...</div>;
  
  return <RiskEventForm event={fullEvent} onSuccess={onSuccess} />;
}

// Hook para detectar tamaño de pantalla
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

export default function RiskEvents() {
  const [editingEvent, setEditingEvent] = useState<RiskEvent | null>(null);
  const [viewingEvent, setViewingEvent] = useState<RiskEvent | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [testMode50k, setTestMode50k] = useState(false);
  const [savedViewsDialogOpen, setSavedViewsDialogOpen] = useState(false);
  const [columnConfigOpen, setColumnConfigOpen] = useState(false);
  
  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('riskEventsColumnVisibility');
    return saved ? JSON.parse(saved) : {
      code: true,
      description: true,
      severity: true,
      status: true,
      process: true,
      lossAmount: true,
      actions: true,
    };
  });
  
  // Consolidated filter state
  const [filters, setFilters] = useState<Record<string, any>>({});
  
  // Legacy individual filters for backward compatibility with event listeners
  const eventTypeFilter = filters.eventType || "all";
  const statusFilter = filters.status || "all";
  const severityFilter = filters.severity || "all";
  const processFilter = filters.process || "all";
  const searchTerm = filters.search || "";

  // Sorting state
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | "none">("none");
  const [sortColumn, setSortColumn] = useState<"code" | "lossAmount" | "status">("code");

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setSearchHandler } = useSearch();
  const isMobile = useIsMobile();

  // Saved Views functionality
  const {
    savedViews,
    isLoading: isSavedViewsLoading,
    defaultView,
    deleteView,
    setDefaultView,
  } = useSavedViews("events");

  // Load a saved view
  const loadView = (viewFilters: Record<string, any>) => {
    setFilters(viewFilters);
  };

  // Register search handler
  useEffect(() => {
    setSearchHandler((term: string) => {
      setFilters(prev => ({ ...prev, search: term }));
    });
  }, [setSearchHandler]);

  // Listen to filter events from header
  useEffect(() => {
    const handleFiltersChanged = (event: any) => {
      const { eventTypeFilter, statusFilter, severityFilter, processFilter } = event.detail;
      setFilters({
        ...filters,
        eventType: eventTypeFilter,
        status: statusFilter,
        severity: severityFilter,
        process: processFilter,
      });
    };

    window.addEventListener('riskEventsFiltersChanged', handleFiltersChanged);
    
    return () => {
      window.removeEventListener('riskEventsFiltersChanged', handleFiltersChanged);
    };
  }, [filters]);

  // Listen to saved views menu from header
  useEffect(() => {
    const handleOpenSavedViewsMenu = () => {
      setSavedViewsDialogOpen(true);
    };

    window.addEventListener('openRiskEventsSavedViewsMenu', handleOpenSavedViewsMenu);
    return () => window.removeEventListener('openRiskEventsSavedViewsMenu', handleOpenSavedViewsMenu);
  }, []);

  // Listen to toggle test mode 50k from header
  useEffect(() => {
    const handleToggleTestMode = () => {
      setTestMode50k(prev => !prev);
    };

    window.addEventListener('toggleRiskEventsTestMode50k', handleToggleTestMode);
    return () => window.removeEventListener('toggleRiskEventsTestMode50k', handleToggleTestMode);
  }, []);

  // Listen to configure columns event from header
  useEffect(() => {
    const handleConfigureColumns = () => {
      setColumnConfigOpen(true);
    };

    window.addEventListener('configureRiskEventsColumns', handleConfigureColumns);
    return () => window.removeEventListener('configureRiskEventsColumns', handleConfigureColumns);
  }, []);

  // Save column visibility to localStorage
  useEffect(() => {
    localStorage.setItem('riskEventsColumnVisibility', JSON.stringify(columnVisibility));
  }, [columnVisibility]);

  // Consolidated endpoint - fetches events, risks, and processes in one call
  interface RiskEventsPageData {
    riskEvents: {
      data: RiskEvent[];
      pagination: { limit: number; offset: number; total: number };
    };
    risks: Risk[];
    processes: Process[];
  }
  
  const { data: pageData, isLoading: isPageDataLoading } = useQuery<RiskEventsPageData>({
    queryKey: ["/api/risk-events/page-data"],
    staleTime: 30000, // Cache for 30 seconds
  });
  
  // Derive individual arrays from consolidated response
  const riskEvents = pageData?.riskEvents?.data || [];
  const risks = pageData?.risks || [];
  const processes = pageData?.processes || [];
  const isLoading = isPageDataLoading;

  const deleteMutation = useOptimisticMutation({
    queryKey: "/api/risk-events",
    mutationFn: async (id: string) => {
      return apiRequest(`/api/risk-events/${id}`, "DELETE");
    },
    onOptimisticUpdate: (oldData: RiskEvent[], eventId: string) => {
      if (!Array.isArray(oldData)) return oldData;
      return oldData.filter((e) => e.id !== eventId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/risk-events/page-data"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-events/fraud-history/check"] });
      toast({ title: "Evento eliminado", description: "El evento de riesgo ha sido eliminado exitosamente." });
      setDeletingEventId(null);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo eliminar el evento de riesgo.", variant: "destructive" });
    },
  });


  const handleEditSuccess = () => {
    setEditingEvent(null);
    queryClient.invalidateQueries({ queryKey: ["/api/risk-events/page-data"], exact: false });
    queryClient.invalidateQueries({ queryKey: ["/api/risk-events"], exact: false });
    queryClient.invalidateQueries({ queryKey: ["/api/risk-events/fraud-history/check"] });
    toast({ title: "Evento actualizado", description: "El evento de riesgo ha sido actualizado exitosamente." });
  };

  const handleDelete = (id: string) => {
    setDeletingEventId(id);
  };

  const confirmDelete = () => {
    if (deletingEventId) {
      deleteMutation.mutate(deletingEventId);
      setDeletingEventId(null);
    }
  };

  // Handle sorting
  const handleSort = (column: "code" | "lossAmount" | "status") => {
    if (sortColumn === column) {
      // Si es la misma columna, alternar el orden
      if (sortOrder === "none" || sortOrder === "desc") {
        setSortOrder("asc");
      } else {
        setSortOrder("desc");
      }
    } else {
      // Si es una columna diferente, establecer a ascendente
      setSortColumn(column);
      setSortOrder("asc");
    }
  };

  // Filter and sort events
  const filteredEvents = riskEvents.filter((event: RiskEvent) => {
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        event.description.toLowerCase().includes(searchLower) ||
        (event.involvedPersons && event.involvedPersons.toLowerCase().includes(searchLower)) ||
        (event.reportedBy && event.reportedBy.toLowerCase().includes(searchLower));
      
      if (!matchesSearch) return false;
    }

    // Filter by event type
    if (eventTypeFilter !== "all" && event.eventType !== eventTypeFilter) {
      return false;
    }

    // Filter by status
    if (statusFilter !== "all" && event.status !== statusFilter) {
      return false;
    }

    // Filter by severity
    if (severityFilter !== "all" && event.severity !== severityFilter) {
      return false;
    }

    // Filter by process
    if (processFilter !== "all" && event.processId !== processFilter) {
      return false;
    }

    return true;
  }).sort((a: RiskEvent, b: RiskEvent) => {
    if (sortOrder === "none") return 0;
    
    let aValue: number | string, bValue: number | string;
    
    switch (sortColumn) {
      case "code":
        // Extract numeric part from code (e.g., "E-0004" -> 4)
        const aNum = parseInt(a.code.split('-')[1] || '0');
        const bNum = parseInt(b.code.split('-')[1] || '0');
        aValue = aNum;
        bValue = bNum;
        break;
        
      case "lossAmount":
        // Parse estimated loss as number, treat null/empty as 0
        aValue = a.estimatedLoss ? parseFloat(a.estimatedLoss) : 0;
        bValue = b.estimatedLoss ? parseFloat(b.estimatedLoss) : 0;
        break;
        
      case "status":
        // Define order for status values
        const statusOrder: Record<string, number> = {
          'abierto': 1,
          'en_investigacion': 2,
          'escalado': 3,
          'cerrado': 4
        };
        aValue = statusOrder[a.status] || 999;
        bValue = statusOrder[b.status] || 999;
        break;
        
      default:
        return 0;
    }
    
    if (sortOrder === "asc") {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    } else {
      return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
    }
  });

  // Display data - switch between mock and real data
  const displayData = testMode50k ? (generateMockEvents(50000) as any[]) : filteredEvents;

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case "materializado":
        return <AlertTriangle className="h-4 w-4" />;
      case "fraude":
        return <FileText className="h-4 w-4" />;
      case "delito":
        return <Building className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "materializado":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "fraude":
        return "bg-red-100 text-red-800 border-red-200";
      case "delito":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "abierto":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "en_investigacion":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "cerrado":
        return "bg-green-100 text-green-800 border-green-200";
      case "escalado":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "baja":
        return "bg-green-100 text-green-800 border-green-200";
      case "media":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "alta":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "critica":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return 'Fecha no disponible';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return 'Fecha inválida';
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Define columns for VirtualizedTable
  const columns: VirtualizedTableColumn<RiskEvent>[] = [
    {
      id: 'code',
      header: (
        <div 
          className="flex items-center gap-1 cursor-pointer hover:bg-muted/80 select-none"
          onClick={() => handleSort("code")}
        >
          Código
          {sortColumn === "code" && sortOrder === "asc" && <ChevronUp className="h-3 w-3" />}
          {sortColumn === "code" && sortOrder === "desc" && <ChevronDown className="h-3 w-3" />}
        </div>
      ),
      width: '100px',
      minWidth: '100px',
      cell: (event) => (
        <Badge 
          variant="outline" 
          className="cursor-pointer hover:bg-accent transition-colors font-mono text-xs"
          onClick={() => setViewingEvent(event)}
          data-testid={`badge-code-${event.id}`}
        >
          {event.code}
        </Badge>
      ),
      cellClassName: 'items-center',
    },
    {
      id: 'description',
      header: 'Descripción',
      width: '320px',
      minWidth: '320px',
      cell: (event) => {
        const associatedRisk = risks.find((r: Risk) => r.id === event.riskId);
        return (
          <div className="min-w-0 w-full overflow-hidden py-1" data-testid={`cell-description-${event.id}`}>
            <div className="text-sm font-medium line-clamp-2 mb-1 break-words">
              {event.description}
            </div>
            {associatedRisk && (
              <div className="text-xs text-muted-foreground line-clamp-1 break-words" title={`${associatedRisk.code} - ${associatedRisk.name}`}>
                {associatedRisk.code} - {associatedRisk.name}
              </div>
            )}
          </div>
        );
      },
      cellClassName: 'items-center',
    },
    {
      id: 'severity',
      header: 'Severidad',
      width: '110px',
      minWidth: '110px',
      cell: (event) => (
        <Badge className={`${getSeverityColor(event.severity)} text-xs whitespace-nowrap`}>
          <span className="capitalize hidden @md:inline">
            {event.severity}
          </span>
          <span className="capitalize @md:hidden">
            {event.severity.charAt(0).toUpperCase()}
          </span>
        </Badge>
      ),
      cellClassName: 'items-center',
    },
    {
      id: 'status',
      header: (
        <div 
          className="flex items-center gap-1 cursor-pointer hover:bg-muted/80 select-none"
          onClick={() => handleSort("status")}
        >
          Estado
          {sortColumn === "status" && sortOrder === "asc" && <ChevronUp className="h-3 w-3" />}
          {sortColumn === "status" && sortOrder === "desc" && <ChevronDown className="h-3 w-3" />}
        </div>
      ),
      width: '120px',
      minWidth: '120px',
      cell: (event) => (
        <Badge className={`${getStatusColor(event.status)} text-xs whitespace-nowrap`}>
          <span className="capitalize">
            {event.status === "en_investigacion" ? "En Inv." : 
             event.status.charAt(0).toUpperCase() + event.status.slice(1)}
          </span>
        </Badge>
      ),
      cellClassName: 'items-center',
    },
    {
      id: 'process',
      header: 'Proceso',
      width: '200px',
      minWidth: '200px',
      hideOnMobile: true,
      cell: (event) => {
        const relatedProcesses = [];
        
        if ((event as any).relatedMacroprocesos?.length > 0) {
          relatedProcesses.push(...(event as any).relatedMacroprocesos.map((m: any) => `M: ${m.name}`));
        }
        
        if ((event as any).relatedProcesses?.length > 0) {
          relatedProcesses.push(...(event as any).relatedProcesses.map((p: any) => `P: ${p.name}`));
        }
        
        if ((event as any).relatedSubprocesos?.length > 0) {
          relatedProcesses.push(...(event as any).relatedSubprocesos.map((s: any) => `S: ${s.name}`));
        }
        
        if (relatedProcesses.length === 0 && event.processId) {
          const singleProcess = processes.find((p: Process) => p.id === event.processId)?.name;
          if (singleProcess) {
            relatedProcesses.push(singleProcess);
          }
        }
        
        if (relatedProcesses.length === 0) {
          return <span className="text-muted-foreground text-sm">N/A</span>;
        }
        
        return (
          <div className="space-y-1 min-w-0" data-testid={`cell-process-${event.id}`}>
            {relatedProcesses.slice(0, 2).map((processName, index) => (
              <div key={index} className="text-xs line-clamp-1" title={processName}>
                {processName}
              </div>
            ))}
            {relatedProcesses.length > 2 && (
              <div className="text-xs text-muted-foreground">
                +{relatedProcesses.length - 2} más
              </div>
            )}
          </div>
        );
      },
      cellClassName: 'items-center',
    },
    {
      id: 'lossAmount',
      header: (
        <div 
          className="flex items-center gap-1 cursor-pointer hover:bg-muted/80 select-none"
          onClick={() => handleSort("lossAmount")}
        >
          Monto de Pérdida
          {sortColumn === "lossAmount" && sortOrder === "asc" && <ChevronUp className="h-3 w-3" />}
          {sortColumn === "lossAmount" && sortOrder === "desc" && <ChevronDown className="h-3 w-3" />}
        </div>
      ),
      width: '150px',
      minWidth: '150px',
      hideOnMobile: true,
      cell: (event) => (
        <span data-testid={`cell-loss-amount-${event.id}`}>
          {event.estimatedLoss ? (
            <span className="font-medium">
              ${parseFloat(event.estimatedLoss).toLocaleString('es-CO', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              })}
            </span>
          ) : (
            <span className="text-muted-foreground">N/A</span>
          )}
        </span>
      ),
      cellClassName: 'items-center',
    },
    {
      id: 'actions',
      header: 'Acciones',
      width: '80px',
      minWidth: '80px',
      cell: (event) => (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                data-testid={`button-actions-${event.id}`}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setViewingEvent(event)} data-testid={`menu-view-${event.id}`}>
                <Eye className="h-4 w-4 mr-2" />
                Ver detalles
              </DropdownMenuItem>
              <EditGuard itemType="risk_event">
                <DropdownMenuItem onClick={() => setEditingEvent(event)} data-testid={`menu-edit-${event.id}`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              </EditGuard>
              <DeleteGuard itemType="risk_event">
                <DropdownMenuItem 
                  onClick={() => handleDelete(event.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`menu-delete-${event.id}`}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              </DeleteGuard>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dialogs moved outside dropdown */}
          <Dialog open={viewingEvent?.id === event.id} onOpenChange={(open) => !open && setViewingEvent(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" aria-describedby="event-detail-description">
              <DialogHeader>
                <DialogTitle>Detalle del Evento de Riesgo</DialogTitle>
                <DialogDescription id="event-detail-description">
                  Información detallada del evento de riesgo, incluyendo análisis Bow Tie y historial de cambios.
                </DialogDescription>
              </DialogHeader>
              {viewingEvent && (
                <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
                  <TabsList>
                    <TabsTrigger value="details">Detalles</TabsTrigger>
                    <TabsTrigger value="bowtie">Diagrama Bow Tie</TabsTrigger>
                    <TabsTrigger value="history">Historial</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="details" className="flex-1 overflow-y-auto mt-4">
                    <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Fecha del Evento</label>
                      <p className="text-sm mt-1">{formatDate(viewingEvent.eventDate)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                      <div className="text-sm mt-1">
                        <Badge className={getEventTypeColor(viewingEvent.eventType)}>
                          {viewingEvent.eventType === "materializado" ? "Riesgo Materializado" :
                           viewingEvent.eventType === "fraude" ? "Fraude" : "Delito"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Severidad</label>
                      <div className="text-sm mt-1">
                        <Badge className={getSeverityColor(viewingEvent.severity)}>
                          {viewingEvent.severity.charAt(0).toUpperCase() + viewingEvent.severity.slice(1)}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Estado</label>
                      <div className="text-sm mt-1">
                        <Badge className={getStatusColor(viewingEvent.status)}>
                          {viewingEvent.status === "en_investigacion" ? "En Investigación" : 
                           viewingEvent.status.charAt(0).toUpperCase() + viewingEvent.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Descripción</label>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{viewingEvent.description}</p>
                  </div>
                  {viewingEvent.involvedPersons && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Personas Involucradas</label>
                      <p className="text-sm mt-1">{viewingEvent.involvedPersons}</p>
                    </div>
                  )}
                  
                  {/* Bow Tie Analysis - Causas */}
                  {viewingEvent.causas && viewingEvent.causas.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Causas (Análisis Bow Tie)</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {viewingEvent.causas.map((causa: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {causa}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Bow Tie Analysis - Consecuencias */}
                  {viewingEvent.consecuencias && viewingEvent.consecuencias.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Consecuencias (Análisis Bow Tie)</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {viewingEvent.consecuencias.map((consecuencia: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {consecuencia}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Proceso</label>
                      <p className="text-sm mt-1">
                        {processes.find((p: Process) => p.id === viewingEvent.processId)?.name || "No asignado"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Riesgo Asociado</label>
                      <p className="text-sm mt-1">
                        {risks.find((r: Risk) => r.id === viewingEvent.riskId)?.name || "No asignado"}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
                  
                  <TabsContent value="bowtie" className="flex-1 overflow-y-auto mt-4">
                    <BowTieDiagramWrapper eventId={viewingEvent.id} event={viewingEvent} />
                  </TabsContent>
                  
                  <TabsContent value="history" className="flex-1 overflow-y-auto mt-4">
                    <AuditHistory 
                      entityType="risk_event" 
                      entityId={viewingEvent.id} 
                      maxHeight="500px"
                    />
                  </TabsContent>
                </Tabs>
              )}
            </DialogContent>
          </Dialog>

          <Dialog open={editingEvent?.id === event.id} onOpenChange={(open) => !open && setEditingEvent(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar Evento de Riesgo</DialogTitle>
                <DialogDescription>
                  Actualizar la información del evento de riesgo.
                </DialogDescription>
              </DialogHeader>
              {editingEvent && <EditEventFormWrapper eventId={editingEvent.id} onSuccess={handleEditSuccess} />}
            </DialogContent>
          </Dialog>
        </>
      ),
      cellClassName: 'items-center',
    },
  ];

  if (isLoading) {
    return <div className="p-6">Cargando eventos de riesgo...</div>;
  }

  return (
    <div className="@container h-full flex flex-col p-4 @md:p-8 pt-6 gap-2" role="region" aria-label="Gestión de Eventos de Riesgo">
      <h1 id="events-page-title" className="sr-only">Eventos de Riesgo</h1>

      {/* Events Table */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="p-0 h-full">
          <VirtualizedTable
            data={displayData}
            columns={columns.filter(col => {
              if (isMobile && col.hideOnMobile) return false;
              return columnVisibility[col.id] !== false;
            })}
            estimatedRowHeight={70}
            overscan={5}
            getRowKey={(event) => event.id}
            isLoading={isLoading}
            ariaLabel="Tabla de eventos de riesgo"
            ariaDescribedBy="events-table-description"
          />
          <div id="events-table-description" className="sr-only">
            Tabla con {displayData.length} eventos de riesgo. Use las flechas del teclado para navegar entre filas, Enter o Espacio para seleccionar.
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingEventId !== null} onOpenChange={(open) => !open && setDeletingEventId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar este evento de riesgo? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} data-testid="button-confirm-delete">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Configure Columns Dialog */}
      <Dialog open={columnConfigOpen} onOpenChange={setColumnConfigOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Configurar Columnas</DialogTitle>
            <DialogDescription>
              Selecciona qué columnas deseas ver en la tabla
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            {[
              { id: 'code', label: 'Código' },
              { id: 'description', label: 'Descripción' },
              { id: 'severity', label: 'Severidad' },
              { id: 'status', label: 'Estado' },
              { id: 'process', label: 'Proceso' },
              { id: 'lossAmount', label: 'Monto de Pérdida' },
              { id: 'actions', label: 'Acciones' },
            ].map(col => (
              <div key={col.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`col-${col.id}`}
                  checked={columnVisibility[col.id] !== false}
                  onCheckedChange={(checked) => {
                    setColumnVisibility(prev => ({
                      ...prev,
                      [col.id]: checked === true
                    }));
                  }}
                />
                <label htmlFor={`col-${col.id}`} className="text-sm font-medium cursor-pointer">
                  {col.label}
                </label>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setColumnVisibility({
                  code: true,
                  description: true,
                  severity: true,
                  status: true,
                  process: true,
                  lossAmount: true,
                  actions: true,
                });
              }}
            >
              Restaurar Defaults
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Saved Views Dialog */}
      <Dialog open={savedViewsDialogOpen} onOpenChange={setSavedViewsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vistas Guardadas</DialogTitle>
            <DialogDescription>
              Selecciona una vista guardada para aplicar sus filtros
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {savedViews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay vistas guardadas</p>
                <p className="text-sm mt-1">Aplica filtros y guárdalos como vista para verlos aquí</p>
              </div>
            ) : (
              savedViews.map((view) => (
                <div
                  key={view.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors group"
                  data-testid={`saved-view-item-${view.id}`}
                >
                  <button
                    onClick={() => {
                      loadView(view.filters as Record<string, any>);
                      setSavedViewsDialogOpen(false);
                      toast({
                        title: "Vista cargada",
                        description: `Se aplicaron los filtros de "${view.name}"`,
                      });
                    }}
                    className="flex items-center gap-2 flex-1 text-left"
                    data-testid={`load-saved-view-${view.id}`}
                  >
                    {view.isDefault && (
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{view.name}</p>
                      {view.isDefault && (
                        <p className="text-xs text-muted-foreground">Vista predeterminada</p>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!view.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDefaultView(view.id);
                          toast({
                            title: "Vista predeterminada",
                            description: `"${view.name}" es ahora tu vista predeterminada`,
                          });
                        }}
                        data-testid={`set-default-saved-view-${view.id}`}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteView(view.id);
                        toast({
                          title: "Vista eliminada",
                          description: `Se eliminó la vista "${view.name}"`,
                        });
                      }}
                      data-testid={`delete-saved-view-${view.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}