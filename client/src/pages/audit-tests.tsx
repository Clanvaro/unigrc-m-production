import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ResponsiveTable, 
  ResponsiveTableContent,
  ResponsiveTableHeader, 
  ResponsiveTableBody, 
  ResponsiveTableRow, 
  ResponsiveTableHead, 
  ResponsiveTableCell 
} from "@/components/ui/responsive-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Search, 
  Calendar, 
  Eye, 
  CheckCircle, 
  Clock,
  AlertCircle,
  Target,
  Users,
  BarChart3,
  FileText,
  SlidersHorizontal,
  Edit,
  MoreHorizontal
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AuditTestWithDetails } from "@shared/schema";

export default function AuditTests() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<AuditTestWithDetails | null>(null);
  const [, setLocation] = useLocation();

  // Fetch user's assigned audit tests
  const { data: auditTests = [], isLoading, error } = useQuery<AuditTestWithDetails[]>({
    queryKey: ['/api/audit-tests/my-tests'],
    queryFn: async () => {
      const response = await fetch('/api/audit-tests/my-tests', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch audit tests');
      }
      return response.json();
    },
    staleTime: 0, // Always fetch fresh data
  });

  // Filter tests based on search term and filters
  const filteredTests = auditTests.filter(test => {
    const matchesSearch = searchTerm === "" || 
      test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.audit?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || test.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || test.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Get status badge with appropriate styling
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pendiente", className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100" },
      assigned: { label: "Asignado", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" },
      in_progress: { label: "En Progreso", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100" },
      under_review: { label: "En Revisión", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100" },
      completed: { label: "Completado", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
      rejected: { label: "Rechazado", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100" },
      cancelled: { label: "Cancelado", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { 
      label: status, 
      className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100" 
    };
    
    return <Badge className={config.className} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
  };

  // Get priority badge with appropriate styling
  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { label: "Baja", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100" },
      medium: { label: "Media", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-100" },
      high: { label: "Alta", className: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-100" },
      urgent: { label: "Urgente", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100" },
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig] || { 
      label: priority, 
      className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100" 
    };
    
    return <Badge className={config.className} data-testid={`badge-priority-${priority}`}>{config.label}</Badge>;
  };

  // Format date with fallback
  const formatDate = (dateString?: string | Date | null) => {
    if (!dateString) return "Sin fecha";
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return "Fecha inválida";
    }
  };

  // Navigate to test details in view mode (read-only)
  const handleViewDetails = (testId: string) => {
    setLocation(`/audit-test/${testId}?mode=view`);
  };

  // Navigate to test details in edit mode (can work on test)
  const handleEditTest = (testId: string) => {
    setLocation(`/audit-test/${testId}?mode=edit`);
  };

  // Show summary dialog
  const handleShowSummary = (test: AuditTestWithDetails) => {
    setSelectedTest(test);
    setSummaryDialogOpen(true);
  };

  // Statistics for dashboard summary
  const stats = {
    total: auditTests.length,
    planned: auditTests.filter(test => test.status === 'planned').length,
    inProgress: auditTests.filter(test => test.status === 'in_progress').length,
    completed: auditTests.filter(test => test.status === 'completed').length,
    avgProgress: auditTests.length > 0 
      ? Math.round(auditTests.reduce((sum, test) => sum + test.progress, 0) / auditTests.length)
      : 0
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6" data-testid="audit-tests-loading">
        <div className="flex items-center justify-between">
          <div>
              <p className="text-muted-foreground">
              Vista consolidada de todas las pruebas de auditoría asignadas
            </p>
          </div>
        </div>

        {/* Loading skeleton for stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-3 w-16 mt-1" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading skeleton for table */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6" data-testid="audit-tests-error">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Error al cargar las pruebas
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              No se pudieron cargar las pruebas de auditoría. Por favor, intenta de nuevo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6" data-testid="audit-tests-content">
      {/* Audit Tests Table */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Lista de Pruebas de Auditoría
            </CardTitle>
            <CardDescription className="mt-1.5">
              {filteredTests.length === 0 && searchTerm === "" && statusFilter === "all" && priorityFilter === "all"
                ? "No tienes pruebas de auditoría asignadas"
                : `Se encontraron ${filteredTests.length} prueba${filteredTests.length !== 1 ? 's' : ''}`
              }
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-filters-popover">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filtros
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" data-testid="popover-filters">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Filtros de Búsqueda</h4>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Buscar</label>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por código, nombre, descripción..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-8"
                          data-testid="input-search"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Estado</label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full" data-testid="select-status-filter">
                          <SelectValue placeholder="Filtrar por estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los estados</SelectItem>
                          <SelectItem value="planned">Planificado</SelectItem>
                          <SelectItem value="assigned">Asignado</SelectItem>
                          <SelectItem value="in_progress">En Progreso</SelectItem>
                          <SelectItem value="under_review">En Revisión</SelectItem>
                          <SelectItem value="completed">Completado</SelectItem>
                          <SelectItem value="rejected">Rechazado</SelectItem>
                          <SelectItem value="cancelled">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Prioridad</label>
                      <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                        <SelectTrigger className="w-full" data-testid="select-priority-filter">
                          <SelectValue placeholder="Filtrar por prioridad" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las prioridades</SelectItem>
                          <SelectItem value="low">Baja</SelectItem>
                          <SelectItem value="medium">Media</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                          <SelectItem value="urgent">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-tests-stats-popover">
                  <BarChart3 className="h-4 w-4" />
                  Estadísticas
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" data-testid="popover-tests-stats">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Estadísticas de Pruebas</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Total</span>
                      </div>
                      <span className="font-bold">{stats.total}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">En Progreso</span>
                      </div>
                      <span className="font-bold">{stats.inProgress}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Completadas</span>
                      </div>
                      <span className="font-bold">{stats.completed}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Progreso Promedio</span>
                      </div>
                      <span className="font-bold">{stats.avgProgress}%</span>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredTests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <Target className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
                  ? "No se encontraron pruebas"
                  : "No tienes pruebas asignadas"
                }
              </h3>
              <p className="text-muted-foreground text-center max-w-md">
                {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
                  ? "Ajusta los filtros para ver más resultados."
                  : "Las pruebas de auditoría aparecerán aquí cuando te sean asignadas."
                }
              </p>
            </div>
          ) : (
            <>
              {/* Desktop/Tablet Table View */}
              <div className="hidden md:block">
                <ResponsiveTable>
                  <ResponsiveTableContent>
                    <ResponsiveTableHeader>
                      <ResponsiveTableRow>
                        <ResponsiveTableHead>Código</ResponsiveTableHead>
                        <ResponsiveTableHead>Prueba</ResponsiveTableHead>
                        <ResponsiveTableHead>Auditoría</ResponsiveTableHead>
                        <ResponsiveTableHead>Estado</ResponsiveTableHead>
                        <ResponsiveTableHead>Prioridad</ResponsiveTableHead>
                        <ResponsiveTableHead>Progreso</ResponsiveTableHead>
                        <ResponsiveTableHead>Fecha Límite</ResponsiveTableHead>
                        <ResponsiveTableHead>Acciones</ResponsiveTableHead>
                      </ResponsiveTableRow>
                    </ResponsiveTableHeader>
                    <ResponsiveTableBody>
                      {filteredTests.map((test) => (
                        <ResponsiveTableRow key={test.id} data-testid={`row-test-${test.id}`}>
                          <ResponsiveTableCell>
                            <button
                              onClick={() => handleShowSummary(test)}
                              className="font-mono text-sm text-primary hover:underline cursor-pointer"
                              data-testid={`button-code-${test.id}`}
                            >
                              {test.code}
                            </button>
                          </ResponsiveTableCell>
                          <ResponsiveTableCell>
                            <div>
                              <button
                                onClick={() => handleEditTest(test.id)}
                                className="font-medium text-left hover:text-primary hover:underline cursor-pointer"
                                data-testid={`button-name-${test.id}`}
                              >
                                {test.name}
                              </button>
                              {test.description && (
                                <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {test.description}
                                </div>
                              )}
                            </div>
                          </ResponsiveTableCell>
                          <ResponsiveTableCell>
                            <div>
                              <div className="font-medium">{test.audit?.name || "Sin auditoría"}</div>
                              {test.audit?.code && (
                                <div className="text-sm text-muted-foreground font-mono">
                                  {test.audit.code}
                                </div>
                              )}
                            </div>
                          </ResponsiveTableCell>
                          <ResponsiveTableCell>
                            {getStatusBadge(test.status)}
                          </ResponsiveTableCell>
                          <ResponsiveTableCell>
                            {getPriorityBadge(test.priority)}
                          </ResponsiveTableCell>
                          <ResponsiveTableCell>
                            <div className="space-y-1">
                              <Progress value={test.progress} className="w-20" />
                              <div className="text-xs text-muted-foreground">
                                {test.progress}%
                              </div>
                            </div>
                          </ResponsiveTableCell>
                          <ResponsiveTableCell>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">
                                {formatDate(test.plannedEndDate)}
                              </span>
                            </div>
                          </ResponsiveTableCell>
                          <ResponsiveTableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  data-testid={`button-actions-${test.id}`}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Abrir menú</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleViewDetails(test.id)}
                                  data-testid={`action-view-${test.id}`}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleEditTest(test.id)}
                                  data-testid={`action-edit-${test.id}`}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </ResponsiveTableCell>
                        </ResponsiveTableRow>
                      ))}
                    </ResponsiveTableBody>
                  </ResponsiveTableContent>
                </ResponsiveTable>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4 p-4">
                {filteredTests.map((test) => (
                  <Card 
                    key={test.id} 
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleViewDetails(test.id)}
                    data-testid={`card-test-${test.id}`}
                  >
                    <CardContent className="p-4 space-y-3">
                      {/* Header with code and badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-mono text-xs text-muted-foreground">{test.code}</div>
                        <div className="flex gap-2 flex-wrap">
                          {getStatusBadge(test.status)}
                          {getPriorityBadge(test.priority)}
                        </div>
                      </div>

                      {/* Test name and description */}
                      <div>
                        <h3 className="font-semibold text-base mb-1">{test.name}</h3>
                        {test.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {test.description}
                          </p>
                        )}
                      </div>

                      {/* Audit info */}
                      {test.audit && (
                        <div className="pt-2 border-t">
                          <div className="flex items-center gap-2 text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="font-medium">{test.audit.name}</span>
                              {test.audit.code && (
                                <span className="text-muted-foreground ml-2 font-mono text-xs">
                                  {test.audit.code}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Progress bar */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progreso</span>
                          <span className="font-medium">{test.progress}%</span>
                        </div>
                        <Progress value={test.progress} className="h-2" />
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                        <Calendar className="h-4 w-4" />
                        <span>Fecha límite: {formatDate(test.plannedEndDate)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Summary Dialog */}
      <Dialog open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Resumen de Prueba
            </DialogTitle>
            <DialogDescription>
              Información detallada de la prueba de auditoría
            </DialogDescription>
          </DialogHeader>
          
          {selectedTest && (
            <div className="space-y-4 py-4">
              {/* Code and Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Código</label>
                  <p className="font-mono text-sm mt-1">{selectedTest.code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Estado</label>
                  <div className="mt-1">{getStatusBadge(selectedTest.status)}</div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nombre</label>
                <p className="text-sm mt-1">{selectedTest.name}</p>
              </div>

              {/* Description */}
              {selectedTest.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Descripción</label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{selectedTest.description}</p>
                </div>
              )}

              {/* Audit Info */}
              {selectedTest.audit && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-muted-foreground">Auditoría</label>
                  <div className="mt-2 space-y-1">
                    <p className="font-medium">{selectedTest.audit.name}</p>
                    {selectedTest.audit.code && (
                      <p className="text-sm text-muted-foreground font-mono">{selectedTest.audit.code}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Progress and Dates */}
              <div className="border-t pt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Progreso</label>
                  <div className="mt-2 space-y-1">
                    <Progress value={selectedTest.progress} className="h-2" />
                    <p className="text-sm font-medium">{selectedTest.progress}%</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Prioridad</label>
                  <div className="mt-1">{getPriorityBadge(selectedTest.priority)}</div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Fecha Límite</label>
                  <div className="flex items-center gap-2 mt-1 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {formatDate(selectedTest.plannedEndDate)}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t pt-4 flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setSummaryDialogOpen(false)}
                >
                  Cerrar
                </Button>
                <Button
                  onClick={() => {
                    setSummaryDialogOpen(false);
                    handleEditTest(selectedTest.id);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}