import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Eye, Edit, FileText, Building, ExternalLink, Trash2, Settings, AlertTriangle, Shield, ChevronsUpDown, Check, Wrench, ChevronUp, ChevronDown, Filter, FolderTree, Tag, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import RegulationForm from "@/components/forms/regulation-form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Regulation, RegulationWithDetails } from "@shared/schema";
import { insertCrimeCategorySchema } from "@shared/schema";
import { EditGuard, DeleteGuard } from "@/components/auth/permission-guard";

interface RegulationWithRisks extends Regulation {
  inherentRisk?: number;
  residualRisk?: number;
  riskCount?: number;
}

type SortField = 'code' | 'name' | 'effectiveDate' | 'criticality' | 'residualRisk';
type SortDirection = 'asc' | 'desc';

type CrimeCategory = {
  id: string;
  name: string;
  code: string;
  description?: string;
  parentCategoryId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const crimeCategoryFormSchema = insertCrimeCategorySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  parentCategoryId: z.string().optional(),
});

// Función para determinar el color del riesgo
function getRiskColor(risk: number): string {
  if (risk === 0) return "bg-gray-100 text-gray-600";
  if (risk <= 6) return "bg-green-100 text-green-700";
  if (risk <= 12) return "bg-yellow-100 text-yellow-700";
  if (risk <= 16) return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

// Función para obtener la etiqueta del nivel de riesgo
function getRiskLevel(risk: number): string {
  if (risk === 0) return "Sin riesgo";
  if (risk <= 6) return "Bajo";
  if (risk <= 12) return "Medio";
  if (risk <= 16) return "Alto";
  return "Crítico";
}

// Componente para mostrar indicadores de riesgo
function RiskIndicator({ 
  inherentRisk = 0, 
  residualRisk = 0, 
  riskCount = 0,
  size = "sm"
}: { 
  inherentRisk?: number; 
  residualRisk?: number; 
  riskCount?: number;
  size?: "xs" | "sm" | "md";
}) {
  if (riskCount === 0) {
    return (
      <div className="flex items-center gap-1">
        <Badge variant="outline" className={`text-xs ${size === "xs" ? "px-1 py-0" : ""}`}>
          <Shield className={`h-3 w-3 mr-1 ${size === "xs" ? "h-2 w-2" : ""}`} />
          Sin riesgos
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Badge className={`text-xs ${getRiskColor(inherentRisk)} ${size === "xs" ? "px-1 py-0" : ""}`}>
        <AlertTriangle className={`h-3 w-3 mr-1 ${size === "xs" ? "h-2 w-2" : ""}`} />
        I: {inherentRisk}
      </Badge>
      <Badge className={`text-xs ${getRiskColor(residualRisk)} ${size === "xs" ? "px-1 py-0" : ""}`}>
        <Shield className={`h-3 w-3 mr-1 ${size === "xs" ? "h-2 w-2" : ""}`} />
        R: {residualRisk}
      </Badge>
      <Badge 
        variant="secondary" 
        className={`text-xs ${size === "xs" ? "px-1 py-0" : ""}`}
        data-testid="badge-risk-count"
      >
        {riskCount} riesgo{riskCount !== 1 ? "s" : ""}
      </Badge>
    </div>
  );
}

export default function Regulations() {
  // Function to get crime category name from ID
  const getCrimeCategoryName = (categoryId: string | null | undefined, categories: any[] = []): string => {
    if (!categoryId || categoryId === 'none') return 'Sin categoría';
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Categoría no encontrada';
  };

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRegulation, setEditingRegulation] = useState<Regulation | null>(null);
  const [viewingRegulation, setViewingRegulation] = useState<RegulationWithDetails | null>(null);
  const [deletingRegulationId, setDeletingRegulationId] = useState<string | null>(null);
  // Clickable sorting state (like risks page)
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  
  // New filter states for header filters
  const [criticalityFilter, setCriticalityFilter] = useState<string>('all');
  const [riskLevelFilter, setRiskLevelFilter] = useState<string>('all');
  const [issuingOrgFilter, setIssuingOrgFilter] = useState<string>('all');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Listen to filter changes from header
  useEffect(() => {
    const handleRegulationFiltersChanged = (event: any) => {
      const { criticalityFilter, sourceFilter, statusFilter, riskLevelFilter, issuingOrgFilter } = event.detail;
      setCriticalityFilter(criticalityFilter);
      setSourceFilter(sourceFilter);
      setStatusFilter(statusFilter);
      setRiskLevelFilter(riskLevelFilter);
      setIssuingOrgFilter(issuingOrgFilter);
    };

    window.addEventListener('regulationFiltersChanged', handleRegulationFiltersChanged);
    return () => window.removeEventListener('regulationFiltersChanged', handleRegulationFiltersChanged);
  }, []);

  const { data: regulations = [], isLoading } = useQuery<RegulationWithRisks[]>({
    queryKey: ["/api/regulations"],
  });

  // Load crime categories for lookup
  const { data: crimeCategories = [] } = useQuery<any[]>({
    queryKey: ["/api/crime-categories"],
  });

  const { data: viewingRegulationDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ["/api/regulations", viewingRegulation?.id, "details"],
    queryFn: async () => {
      if (!viewingRegulation) return null;
      return await fetch(`/api/regulations/${viewingRegulation.id}/details`).then(r => r.json());
    },
    enabled: !!viewingRegulation?.id,
  });

  // Query for regulation controls
  const { data: regulationControls = [], isLoading: isLoadingControls } = useQuery<any[]>({
    queryKey: ["/api/regulations", viewingRegulation?.id, "controls"],
    enabled: !!viewingRegulation?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/regulations/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/regulations"] });
      toast({ title: "Normativa eliminada", description: "La normativa ha sido eliminada exitosamente." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo eliminar la normativa.", variant: "destructive" });
    },
  });

  // Handle sorting (like risks page)
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortOrder("asc");
    }
  };

  // Get sort icon for column
  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortOrder === "asc" 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const handleDelete = (id: string) => {
    setDeletingRegulationId(id);
  };

  const confirmDelete = () => {
    if (deletingRegulationId) {
      deleteMutation.mutate(deletingRegulationId);
      setDeletingRegulationId(null);
    }
  };

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getCriticalityText = (criticality: string) => {
    switch (criticality) {
      case 'critical': return 'Crítica';
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return 'No definida';
    }
  };

  const getSourceTypeColor = (sourceType: string) => {
    return sourceType === 'external' ? 'bg-blue-500' : 'bg-purple-500';
  };

  const getSourceTypeText = (sourceType: string) => {
    return sourceType === 'external' ? 'Externa' : 'Interna';
  };

  // Helper function to get risk level based on residual risk
  const getRiskLevel = (residualRisk: number): string => {
    if (residualRisk === 0) return "sin riesgo";
    if (residualRisk <= 6) return "bajo";
    if (residualRisk <= 12) return "medio";
    if (residualRisk <= 16) return "alto";
    return "crítico";
  };

  const filteredAndSortedRegulations = regulations
    .filter(regulation => {
      // Original filters
      const statusMatch = statusFilter === 'all' || regulation.status === statusFilter;
      const sourceMatch = sourceFilter === 'all' || regulation.sourceType === sourceFilter;
      
      // New header filters
      const criticalityMatch = criticalityFilter === 'all' || regulation.criticality === criticalityFilter;
      const issuingOrgMatch = issuingOrgFilter === 'all' || regulation.issuingOrganization === issuingOrgFilter;
      
      // Risk level filter
      let riskLevelMatch = true;
      if (riskLevelFilter !== 'all') {
        const currentRiskLevel = getRiskLevel(regulation.residualRisk || 0);
        riskLevelMatch = currentRiskLevel === riskLevelFilter;
      }
      
      return statusMatch && sourceMatch && criticalityMatch && issuingOrgMatch && riskLevelMatch;
    })
    .sort((a, b) => {
      if (!sortColumn) return 0;
      
      const direction = sortOrder === "asc" ? 1 : -1;

      switch (sortColumn) {
        case "code": {
          // Extract numeric part from code (e.g., "REG-001" -> 1, "REG-012" -> 12)
          const getCodeNumber = (code: string) => {
            const match = code.match(/\d+/);
            return match ? parseInt(match[0], 10) : 0;
          };
          return direction * (getCodeNumber(a.code) - getCodeNumber(b.code));
        }
        
        case "name":
          return direction * a.name.toLowerCase().localeCompare(b.name.toLowerCase());
          
        case "sourceType": {
          const typeOrder = { external: 1, internal: 2 };
          return direction * ((typeOrder[a.sourceType as keyof typeof typeOrder] || 3) - (typeOrder[b.sourceType as keyof typeof typeOrder] || 3));
        }
          
        case "crimeCategory": {
          const aName = getCrimeCategoryName(a.agrupacion, crimeCategories).toLowerCase();
          const bName = getCrimeCategoryName(b.agrupacion, crimeCategories).toLowerCase();
          return direction * aName.localeCompare(bName);
        }
        
        case "residualRisk":
          return direction * ((a.residualRisk || 0) - (b.residualRisk || 0));
          
        case "issuingOrganization":
          return direction * (a.issuingOrganization || "").localeCompare(b.issuingOrganization || "");
          
        case "law": {
          const aLaw = a.law || "";
          const bLaw = b.law || "";
          return direction * aLaw.localeCompare(bLaw);
        }
          
        default:
          return 0;
      }
    });


  if (isLoading) {
    return <div data-testid="loading">Cargando normativas...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Tabs for Regulations and Crime Categories */}
      <Tabs defaultValue="regulations" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="regulations">Normativas</TabsTrigger>
          <TabsTrigger value="crime-categories">Categorías de Delito</TabsTrigger>
        </TabsList>
        
        <TabsContent value="regulations" className="space-y-6">
          {/* Regulations Table */}
      <Card className="flex-1 flex flex-col">
        <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto min-h-0">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-muted sticky top-0 z-10">
                <tr>
                  <th 
                    className="text-left p-3 font-medium w-24 cursor-pointer hover:bg-muted/50 select-none transition-colors"
                    onClick={() => handleSort("code")}
                    data-testid="header-code"
                  >
                    <div className="flex items-center">
                      Código
                      {getSortIcon("code")}
                    </div>
                  </th>
                  <th 
                    className="text-left p-3 font-medium min-w-[200px] cursor-pointer hover:bg-muted/50 select-none transition-colors"
                    onClick={() => handleSort("name")}
                    data-testid="header-name"
                  >
                    <div className="flex items-center">
                      Normativa
                      {getSortIcon("name")}
                    </div>
                  </th>
                  <th 
                    className="text-center p-3 font-medium w-24 cursor-pointer hover:bg-muted/50 select-none transition-colors"
                    onClick={() => handleSort("sourceType")}
                    data-testid="header-sourceType"
                  >
                    <div className="flex items-center justify-center">
                      Tipo
                      {getSortIcon("sourceType")}
                    </div>
                  </th>
                  <th 
                    className="text-left p-3 font-medium min-w-[120px] cursor-pointer hover:bg-muted/50 select-none transition-colors"
                    onClick={() => handleSort("crimeCategory")}
                    data-testid="header-crimeCategory"
                  >
                    <div className="flex items-center">
                      Categoría de Delito
                      {getSortIcon("crimeCategory")}
                    </div>
                  </th>
                  <th 
                    className="text-center p-3 font-medium w-32 cursor-pointer hover:bg-muted/50 select-none transition-colors"
                    onClick={() => handleSort("residualRisk")}
                    data-testid="header-residualRisk"
                  >
                    <div className="flex items-center justify-center">
                      Riesgos
                      {getSortIcon("residualRisk")}
                    </div>
                  </th>
                  <th 
                    className="text-left p-3 font-medium min-w-[150px] cursor-pointer hover:bg-muted/50 select-none transition-colors"
                    onClick={() => handleSort("issuingOrganization")}
                    data-testid="header-issuingOrganization"
                  >
                    <div className="flex items-center">
                      Organismo
                      {getSortIcon("issuingOrganization")}
                    </div>
                  </th>
                  <th 
                    className="text-left p-3 font-medium min-w-[120px] cursor-pointer hover:bg-muted/50 select-none transition-colors"
                    onClick={() => handleSort("law")}
                    data-testid="header-law"
                  >
                    <div className="flex items-center">
                      Marco Legal
                      {getSortIcon("law")}
                    </div>
                  </th>
                  <th className="text-center p-3 font-medium w-32">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedRegulations.map((regulation) => (
                  <tr key={regulation.id} className="border-b border-border hover:bg-muted/50" data-testid={`regulation-row-${regulation.id}`}>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs" data-testid={`badge-regulation-code-${regulation.id}`}>
                        {regulation.code}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div>
                        <p className="font-medium text-sm" data-testid={`text-regulation-name-${regulation.id}`}>
                          {regulation.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]" data-testid={`text-regulation-description-${regulation.id}`}>
                          {regulation.description}
                        </p>
                        {regulation.effectiveDate && (
                          <p className="text-xs text-muted-foreground mt-1" data-testid={`text-effective-date-${regulation.id}`}>
                            Vigente desde: {new Date(regulation.effectiveDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <Badge 
                        className={`text-white text-xs ${getSourceTypeColor(regulation.sourceType)}`}
                        data-testid={`badge-source-type-${regulation.id}`}
                      >
                        {getSourceTypeText(regulation.sourceType)}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <span className="text-xs text-muted-foreground" data-testid={`text-crime-category-${regulation.id}`}>
                        {getCrimeCategoryName(regulation.agrupacion, crimeCategories)}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <RiskIndicator 
                        inherentRisk={regulation.inherentRisk}
                        residualRisk={regulation.residualRisk}
                        riskCount={regulation.riskCount}
                        size="xs"
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs truncate max-w-[120px]" data-testid={`text-issuing-org-${regulation.id}`}>
                          {regulation.issuingOrganization}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      {regulation.law && (
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs truncate max-w-[100px]" data-testid={`text-law-${regulation.id}`}>
                            {regulation.law}
                            {regulation.article && ` - Art. ${regulation.article}`}
                            {regulation.clause && ` - ${regulation.clause}`}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingRegulation(regulation as RegulationWithDetails)}
                          data-testid={`button-view-${regulation.id}`}
                          className="h-7 w-7 p-0"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <EditGuard itemType="regulation">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingRegulation(regulation)}
                            data-testid={`button-edit-${regulation.id}`}
                            className="h-7 w-7 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </EditGuard>
                        <DeleteGuard itemType="regulation">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(regulation.id)}
                            data-testid={`button-delete-${regulation.id}`}
                            className="h-7 w-7 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </DeleteGuard>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {filteredAndSortedRegulations.length === 0 && (
        <Card className="p-8 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No hay normativas</h3>
          <p className="text-muted-foreground mb-4">
            Comience creando su primera normativa de cumplimiento.
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Normativa
          </Button>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || !!editingRegulation} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setEditingRegulation(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRegulation ? 'Editar Normativa' : 'Nueva Normativa'}
            </DialogTitle>
            <DialogDescription>
              {editingRegulation ? 'Modificar los detalles de la normativa existente.' : 'Crear una nueva normativa regulatoria en el sistema.'}
            </DialogDescription>
          </DialogHeader>
          <RegulationForm 
            regulation={editingRegulation || undefined}
            onSuccess={() => {
              setIsCreateDialogOpen(false);
              setEditingRegulation(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={!!viewingRegulation} onOpenChange={(open) => {
        if (!open) setViewingRegulation(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de Normativa</DialogTitle>
            <DialogDescription>
              Información completa y características de la normativa regulatoria.
            </DialogDescription>
          </DialogHeader>
          {viewingRegulation && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Código</label>
                  <p className="text-sm text-muted-foreground">{viewingRegulation.code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Estado</label>
                  <p className="text-sm text-muted-foreground">{viewingRegulation.status}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Organismo Emisor</label>
                  <p className="text-sm text-muted-foreground">{viewingRegulation.issuingOrganization}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Tipo de Fuente</label>
                  <p className="text-sm text-muted-foreground">{getSourceTypeText(viewingRegulation.sourceType)}</p>
                </div>
                {viewingRegulation.law && (
                  <div>
                    <label className="text-sm font-medium">Ley</label>
                    <p className="text-sm text-muted-foreground">{viewingRegulation.law}</p>
                  </div>
                )}
                {viewingRegulation.article && (
                  <div>
                    <label className="text-sm font-medium">Artículo</label>
                    <p className="text-sm text-muted-foreground">{viewingRegulation.article}</p>
                  </div>
                )}
                {viewingRegulation.clause && (
                  <div>
                    <label className="text-sm font-medium">Numeral/Inciso</label>
                    <p className="text-sm text-muted-foreground">{viewingRegulation.clause}</p>
                  </div>
                )}
              </div>
              
              {viewingRegulation.description && (
                <div>
                  <label className="text-sm font-medium">Descripción</label>
                  <p className="text-sm text-muted-foreground">{viewingRegulation.description}</p>
                </div>
              )}

              {viewingRegulation.applicability && (
                <div>
                  <label className="text-sm font-medium">Aplicabilidad</label>
                  <p className="text-sm text-muted-foreground">{viewingRegulation.applicability}</p>
                </div>
              )}

              {viewingRegulationDetails && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Riesgos Asociados ({viewingRegulationDetails.associatedRisks?.length || 0})</h4>
                    {viewingRegulationDetails.associatedRisks?.length > 0 ? (
                      <div className="space-y-2">
                        {viewingRegulationDetails.associatedRisks.map((riskReg: any) => (
                          <Card key={riskReg.id} className="p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{riskReg.risk.name}</p>
                                <p className="text-sm text-muted-foreground">{riskReg.complianceRequirement}</p>
                              </div>
                              <Badge className={`text-white ${getCriticalityColor(riskReg.criticality)}`}>
                                {getCriticalityText(riskReg.criticality)}
                              </Badge>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No hay riesgos asociados</p>
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Pruebas de Cumplimiento ({viewingRegulationDetails.complianceTests?.length || 0})</h4>
                    {viewingRegulationDetails.complianceTests?.length > 0 ? (
                      <div className="space-y-2">
                        {viewingRegulationDetails.complianceTests.map((test: any) => (
                          <Card key={test.id} className="p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{test.name}</p>
                                <p className="text-sm text-muted-foreground">{test.description}</p>
                              </div>
                              <Badge variant="outline">{test.status}</Badge>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No hay pruebas de cumplimiento</p>
                    )}
                  </div>

                  {/* Controls Section */}
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Controles Asociados ({regulationControls?.length || 0})
                    </h4>
                    {isLoadingControls ? (
                      <p className="text-sm text-muted-foreground">Cargando controles...</p>
                    ) : regulationControls?.length > 0 ? (
                      <div className="space-y-2">
                        {regulationControls.map((item: any) => (
                          <Card key={`${item.control.id}-${item.risk.id}`} className="p-3">
                            <div className="space-y-2">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="font-medium">{item.control.name}</p>
                                  <p className="text-sm text-muted-foreground">{item.control.description}</p>
                                </div>
                                <div className="flex gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {item.control.type === 'preventive' ? 'Preventivo' : 
                                     item.control.type === 'detective' ? 'Detective' : 'Correctivo'}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {item.control.effectiveness || 0}% efectivo
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground border-t pt-2">
                                <strong>Asociado a riesgo:</strong> {item.risk.name}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No hay controles asociados a través de riesgos</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingRegulationId} onOpenChange={(open) => !open && setDeletingRegulationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de que desea eliminar esta normativa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La normativa será eliminada permanentemente del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Aceptar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </TabsContent>

        <TabsContent value="crime-categories" className="space-y-6">
          <CrimeCategoriesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Crime Categories Tab Component
function CrimeCategoriesTab() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CrimeCategory | null>(null);
  const [filter, setFilter] = useState({
    search: "",
    parentId: "",
    activeOnly: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: categories = [], isLoading } = useQuery<CrimeCategory[]>({
    queryKey: ["/api/crime-categories"],
  });

  // Form
  const form = useForm<z.infer<typeof crimeCategoryFormSchema>>({
    resolver: zodResolver(crimeCategoryFormSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      parentCategoryId: "",
      isActive: true,
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof crimeCategoryFormSchema>) =>
      apiRequest("/api/crime-categories", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crime-categories"] });
      toast({
        title: "Categoría creada",
        description: "La categoría de delito ha sido creada exitosamente",
      });
      setShowDialog(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error al crear categoría",
        description: "No se pudo crear la categoría de delito",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string } & Partial<CrimeCategory>) =>
      apiRequest(`/api/crime-categories/${data.id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crime-categories"] });
      toast({
        title: "Categoría actualizada",
        description: "La categoría de delito ha sido actualizada exitosamente",
      });
      setShowDialog(false);
      setEditingCategory(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error al actualizar categoría",
        description: "No se pudo actualizar la categoría de delito",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/crime-categories/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crime-categories"] });
      toast({
        title: "Categoría eliminada",
        description: "La categoría de delito ha sido eliminada exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error al eliminar categoría",
        description: "No se pudo eliminar la categoría de delito",
        variant: "destructive",
      });
    },
  });

  // Helpers
  const getParentCategories = () => categories.filter(cat => !cat.parentCategoryId);
  const getSubcategories = (parentId: string) => categories.filter(cat => cat.parentCategoryId === parentId);
  
  const getFilteredCategories = () => {
    return categories.filter(category => {
      if (filter.activeOnly && !category.isActive) return false;
      if (filter.search && !category.name.toLowerCase().includes(filter.search.toLowerCase()) && 
          !category.code.toLowerCase().includes(filter.search.toLowerCase())) return false;
      if (filter.parentId && filter.parentId !== "all" && category.parentCategoryId !== filter.parentId) return false;
      return true;
    });
  };

  const handleEdit = (category: CrimeCategory) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      code: category.code,
      description: category.description || "",
      parentCategoryId: category.parentCategoryId || "",
      isActive: category.isActive,
    });
    setShowDialog(true);
  };

  const handleSubmit = (values: z.infer<typeof crimeCategoryFormSchema>) => {
    const data = {
      ...values,
      parentCategoryId: values.parentCategoryId === "none" ? null : values.parentCategoryId || null,
    };

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleNewCategory = () => {
    setEditingCategory(null);
    form.reset({
      name: "",
      code: "",
      description: "",
      parentCategoryId: "",
      isActive: true,
    });
    setShowDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold" data-testid="text-page-title">Categorías de Delitos</h2>
          <p className="text-muted-foreground">
            Gestión de categorías para especialización de encargados de prevención
          </p>
        </div>
        <Button onClick={handleNewCategory} data-testid="button-new-category">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Categoría
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Buscar</label>
              <Input
                placeholder="Nombre o código..."
                value={filter.search}
                onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                data-testid="input-search"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Categoría Padre</label>
              <Select
                value={filter.parentId}
                onValueChange={(value) => setFilter(prev => ({ ...prev, parentId: value === "all" ? "" : value }))}
              >
                <SelectTrigger data-testid="select-parent-filter">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {getParentCategories().map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant={filter.activeOnly ? "default" : "outline"}
                onClick={() => setFilter(prev => ({ ...prev, activeOnly: !prev.activeOnly }))}
                data-testid="button-active-filter"
              >
                {filter.activeOnly ? "Solo Activas" : "Todas"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories Tree View */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Categorías por Jerarquía
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {getParentCategories().map((parentCategory) => (
                <div key={parentCategory.id} className="space-y-2">
                  {/* Parent Category */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Tag className="h-5 w-5 text-primary" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold" data-testid={`text-category-name-${parentCategory.id}`}>
                            {parentCategory.name}
                          </h3>
                          <Badge variant="secondary" data-testid={`badge-category-code-${parentCategory.id}`}>
                            {parentCategory.code}
                          </Badge>
                          {!parentCategory.isActive && (
                            <Badge variant="destructive">Inactiva</Badge>
                          )}
                        </div>
                        {parentCategory.description && (
                          <p className="text-sm text-muted-foreground">
                            {parentCategory.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(parentCategory)}
                        data-testid={`button-edit-category-${parentCategory.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteMutation.mutate(parentCategory.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-category-${parentCategory.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Subcategories */}
                  {getSubcategories(parentCategory.id).map((subCategory) => (
                    <div key={subCategory.id} className="ml-8 flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="w-0.5 h-6 bg-border"></div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium" data-testid={`text-subcategory-name-${subCategory.id}`}>
                              {subCategory.name}
                            </h4>
                            <Badge variant="outline" data-testid={`badge-subcategory-code-${subCategory.id}`}>
                              {subCategory.code}
                            </Badge>
                            {!subCategory.isActive && (
                              <Badge variant="destructive">Inactiva</Badge>
                            )}
                          </div>
                          {subCategory.description && (
                            <p className="text-sm text-muted-foreground">
                              {subCategory.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(subCategory)}
                          data-testid={`button-edit-subcategory-${subCategory.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteMutation.mutate(subCategory.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-subcategory-${subCategory.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {/* Categories without parent */}
              {categories.filter(cat => !cat.parentCategoryId && !getParentCategories().includes(cat)).map((category) => (
                <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Tag className="h-5 w-5 text-primary" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold" data-testid={`text-category-name-${category.id}`}>
                          {category.name}
                        </h3>
                        <Badge variant="secondary" data-testid={`badge-category-code-${category.id}`}>
                          {category.code}
                        </Badge>
                        {!category.isActive && (
                          <Badge variant="destructive">Inactiva</Badge>
                        )}
                      </div>
                      {category.description && (
                        <p className="text-sm text-muted-foreground">
                          {category.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(category)}
                      data-testid={`button-edit-category-${category.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteMutation.mutate(category.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-category-${category.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent data-testid="dialog-category-form">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Editar Categoría" : "Nueva Categoría"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Lavado de Activos" {...field} data-testid="input-category-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input placeholder="LAV_ACT" {...field} data-testid="input-category-code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parentCategoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría Padre (Opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "none"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-parent-category">
                          <SelectValue placeholder="Seleccionar categoría padre" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Sin categoría padre</SelectItem>
                        {getParentCategories()
                          .filter(cat => !editingCategory || cat.id !== editingCategory.id)
                          .map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descripción de la categoría..."
                        {...field}
                        data-testid="textarea-category-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-category"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Guardando..."
                    : editingCategory
                    ? "Actualizar"
                    : "Crear"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}