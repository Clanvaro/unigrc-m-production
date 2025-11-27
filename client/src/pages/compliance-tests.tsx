import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Eye, Edit, FileCheck, Users, Calendar, CheckCircle, XCircle, Clock, Settings, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ComplianceTest, ComplianceTestWithDetails, Regulation } from "@shared/schema";

type SortField = 'code' | 'name' | 'status' | 'priority' | 'plannedStartDate';
type SortDirection = 'asc' | 'desc';

export default function ComplianceTests() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<ComplianceTest | null>(null);
  const [viewingTest, setViewingTest] = useState<ComplianceTestWithDetails | null>(null);
  const [sortField, setSortField] = useState<SortField>('code');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: complianceTests = [], isLoading } = useQuery({
    queryKey: ["/api/compliance-tests"],
  });

  const { data: regulations = [] } = useQuery({
    queryKey: ["/api/regulations"],
  });

  const { data: viewingTestDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["/api/compliance-tests", viewingTest?.id, "details"],
    queryFn: async () => {
      if (!viewingTest) return null;
      return await fetch(`/api/compliance-tests/${viewingTest.id}/details`).then(r => r.json());
    },
    enabled: !!viewingTest?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/compliance-tests/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance-tests"] });
      toast({ title: "Prueba de cumplimiento eliminada", description: "La prueba ha sido eliminada exitosamente." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo eliminar la prueba de cumplimiento.", variant: "destructive" });
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("¿Está seguro de que desea eliminar esta prueba de cumplimiento?")) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'planned': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completada';
      case 'in_progress': return 'En Progreso';
      case 'planned': return 'Planificada';
      case 'cancelled': return 'Cancelada';
      default: return 'No definido';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'critical': return 'Crítica';
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return 'No definida';
    }
  };

  const getComplianceResultColor = (result: string | null) => {
    switch (result) {
      case 'compliant': return 'bg-green-500';
      case 'non_compliant': return 'bg-red-500';
      case 'partially_compliant': return 'bg-yellow-500';
      case 'not_assessed': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const getComplianceResultText = (result: string | null) => {
    switch (result) {
      case 'compliant': return 'Cumple';
      case 'non_compliant': return 'No Cumple';
      case 'partially_compliant': return 'Cumple Parcialmente';
      case 'not_assessed': return 'No Evaluado';
      default: return 'Sin Resultado';
    }
  };

  const filteredAndSortedTests = complianceTests
    .filter(test => {
      const statusMatch = statusFilter === 'all' || test.status === statusFilter;
      const priorityMatch = priorityFilter === 'all' || test.priority === priorityFilter;
      return statusMatch && priorityMatch;
    })
    .sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const getRegulationName = (regulationId: string) => {
    const regulation = regulations.find(r => r.id === regulationId);
    return regulation ? regulation.name : 'Normativa no encontrada';
  };

  if (isLoading) {
    return <div data-testid="loading">Cargando pruebas de cumplimiento...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pruebas de Cumplimiento</h1>
          <p className="text-muted-foreground">
            Gestione las auditorías y pruebas de cumplimiento de normativas
          </p>
        </div>
        <Button 
          data-testid="button-create-test"
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Prueba
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="planned">Planificada</SelectItem>
            <SelectItem value="in_progress">En Progreso</SelectItem>
            <SelectItem value="completed">Completada</SelectItem>
            <SelectItem value="cancelled">Cancelada</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-48" data-testid="select-priority-filter">
            <SelectValue placeholder="Filtrar por prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las prioridades</SelectItem>
            <SelectItem value="critical">Crítica</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Media</SelectItem>
            <SelectItem value="low">Baja</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tests Grid */}
      <div className="grid gap-4">
        {filteredAndSortedTests.map((test) => (
          <Card key={test.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg" data-testid={`text-test-name-${test.id}`}>
                    {test.name}
                  </h3>
                  <Badge variant="outline" data-testid={`badge-test-code-${test.id}`}>
                    {test.code}
                  </Badge>
                  <Badge 
                    className={`text-white ${getStatusColor(test.status)}`}
                    data-testid={`badge-status-${test.id}`}
                  >
                    {getStatusText(test.status)}
                  </Badge>
                  <Badge 
                    className={`text-white ${getPriorityColor(test.priority)}`}
                    data-testid={`badge-priority-${test.id}`}
                  >
                    {getPriorityText(test.priority)}
                  </Badge>
                  {test.complianceResult && (
                    <Badge 
                      className={`text-white ${getComplianceResultColor(test.complianceResult)}`}
                      data-testid={`badge-compliance-result-${test.id}`}
                    >
                      {getComplianceResultText(test.complianceResult)}
                    </Badge>
                  )}
                </div>
                
                <p className="text-muted-foreground" data-testid={`text-test-description-${test.id}`}>
                  {test.description}
                </p>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <FileCheck className="h-4 w-4" />
                    <span data-testid={`text-regulation-${test.id}`}>
                      {getRegulationName(test.regulationId)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span data-testid={`text-team-size-${test.id}`}>
                      Equipo: {test.auditTeam.length + 1} personas
                    </span>
                  </div>
                  {test.plannedStartDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span data-testid={`text-planned-date-${test.id}`}>
                        Inicio: {new Date(test.plannedStartDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {test.overallRating && (
                    <div className="flex items-center gap-1">
                      <span data-testid={`text-rating-${test.id}`}>
                        Calificación: {test.overallRating}%
                      </span>
                    </div>
                  )}
                </div>

                {test.scope && (
                  <div>
                    <span className="text-sm font-medium">Alcance: </span>
                    <span className="text-sm text-muted-foreground" data-testid={`text-scope-${test.id}`}>
                      {test.scope}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewingTest(test)}
                  data-testid={`button-view-${test.id}`}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingTest(test)}
                  data-testid={`button-edit-${test.id}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(test.id)}
                  data-testid={`button-delete-${test.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredAndSortedTests.length === 0 && (
        <Card className="p-8 text-center">
          <FileCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No hay pruebas de cumplimiento</h3>
          <p className="text-muted-foreground mb-4">
            Comience creando su primera prueba de cumplimiento.
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Prueba
          </Button>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || !!editingTest} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setEditingTest(null);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTest ? 'Editar Prueba de Cumplimiento' : 'Nueva Prueba de Cumplimiento'}
            </DialogTitle>
            <DialogDescription>
              {editingTest ? 'Modificar los detalles de la prueba de cumplimiento existente.' : 'Crear una nueva prueba de cumplimiento normativo en el sistema.'}
            </DialogDescription>
          </DialogHeader>
          {/* ComplianceTestForm component will be created next */}
          <div className="p-4 text-center text-muted-foreground">
            Formulario de prueba de cumplimiento en desarrollo...
          </div>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={!!viewingTest} onOpenChange={(open) => {
        if (!open) setViewingTest(null);
      }}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de Prueba de Cumplimiento</DialogTitle>
            <DialogDescription>
              Información completa y resultados de la prueba de cumplimiento.
            </DialogDescription>
          </DialogHeader>
          {viewingTest && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Código</label>
                  <p className="text-sm text-muted-foreground">{viewingTest.code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Estado</label>
                  <p className="text-sm text-muted-foreground">{getStatusText(viewingTest.status)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Prioridad</label>
                  <p className="text-sm text-muted-foreground">{getPriorityText(viewingTest.priority)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Tipo de Prueba</label>
                  <p className="text-sm text-muted-foreground">{viewingTest.testType}</p>
                </div>
                {viewingTest.complianceResult && (
                  <div>
                    <label className="text-sm font-medium">Resultado</label>
                    <p className="text-sm text-muted-foreground">{getComplianceResultText(viewingTest.complianceResult)}</p>
                  </div>
                )}
                {viewingTest.overallRating && (
                  <div>
                    <label className="text-sm font-medium">Calificación General</label>
                    <p className="text-sm text-muted-foreground">{viewingTest.overallRating}%</p>
                  </div>
                )}
              </div>
              
              {viewingTest.description && (
                <div>
                  <label className="text-sm font-medium">Descripción</label>
                  <p className="text-sm text-muted-foreground">{viewingTest.description}</p>
                </div>
              )}

              {viewingTest.scope && (
                <div>
                  <label className="text-sm font-medium">Alcance</label>
                  <p className="text-sm text-muted-foreground">{viewingTest.scope}</p>
                </div>
              )}

              {viewingTest.objectives.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Objetivos</label>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    {viewingTest.objectives.map((objective, index) => (
                      <li key={index}>{objective}</li>
                    ))}
                  </ul>
                </div>
              )}

              {viewingTest.testProcedures.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Procedimientos de Prueba</label>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    {viewingTest.testProcedures.map((procedure, index) => (
                      <li key={index}>{procedure}</li>
                    ))}
                  </ul>
                </div>
              )}

              {viewingTest.keyFindings.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Hallazgos Principales</label>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    {viewingTest.keyFindings.map((finding, index) => (
                      <li key={index}>{finding}</li>
                    ))}
                  </ul>
                </div>
              )}

              {viewingTest.recommendations.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Recomendaciones</label>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    {viewingTest.recommendations.map((recommendation, index) => (
                      <li key={index}>{recommendation}</li>
                    ))}
                  </ul>
                </div>
              )}

              {viewingTest.conclusions && (
                <div>
                  <label className="text-sm font-medium">Conclusiones</label>
                  <p className="text-sm text-muted-foreground">{viewingTest.conclusions}</p>
                </div>
              )}

              {viewingTestDetails && viewingTestDetails.testedControls && (
                <div>
                  <h4 className="font-medium mb-2">Controles Probados ({viewingTestDetails.testedControls.length})</h4>
                  {viewingTestDetails.testedControls.length > 0 ? (
                    <div className="space-y-2">
                      {viewingTestDetails.testedControls.map((testControl: any) => (
                        <Card key={testControl.id} className="p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{testControl.control.name}</p>
                              <p className="text-sm text-muted-foreground">{testControl.testingDetails}</p>
                              {testControl.effectivenessRating && (
                                <p className="text-sm">Efectividad: {testControl.effectivenessRating}%</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Badge className={`text-white ${getComplianceResultColor(testControl.complianceLevel)}`}>
                                {getComplianceResultText(testControl.complianceLevel)}
                              </Badge>
                              <Badge variant="outline">{testControl.testResult}</Badge>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay controles probados</p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}