import { useState, useEffect } from "react";
import { Search, SlidersHorizontal, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";

interface AuditFindingsSearchAndFilterDialogProps {
  onSearch: (term: string) => void;
  onFilterChange: (filters: {
    statusFilter: string;
    severityFilter: string;
    typeFilter: string;
    auditFilter: string;
  }) => void;
  activeFiltersCount: number;
}

export function AuditFindingsSearchAndFilterDialog({ 
  onSearch, 
  onFilterChange,
  activeFiltersCount 
}: AuditFindingsSearchAndFilterDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [auditFilter, setAuditFilter] = useState("all");

  // Data queries
  const { data: audits = [] } = useQuery({
    queryKey: ["/api/audits"],
    select: (data: any) => data.data || []
  });

  // Apply filters
  const handleApplyFilters = () => {
    onFilterChange({
      statusFilter,
      severityFilter,
      typeFilter,
      auditFilter
    });
  };

  // Apply search
  const handleSearch = () => {
    onSearch(searchTerm);
    setOpen(false);
  };

  // Clear all filters
  const handleClearAll = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSeverityFilter("all");
    setTypeFilter("all");
    setAuditFilter("all");
    
    onSearch("");
    onFilterChange({
      statusFilter: "all",
      severityFilter: "all",
      typeFilter: "all",
      auditFilter: "all"
    });
  };

  // Apply filters whenever they change
  useEffect(() => {
    handleApplyFilters();
  }, [statusFilter, severityFilter, typeFilter, auditFilter]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 relative" data-testid="button-search-filter">
                <Search className="h-4 w-4" />
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Buscar y Filtrar</span>
                {activeFiltersCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="ml-1 h-5 min-w-[20px] rounded-full p-0 px-1.5 flex items-center justify-center text-xs"
                  >
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Buscar y filtrar hallazgos</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar y Filtrar Hallazgos
          </DialogTitle>
          <DialogDescription>
            Busca por título, descripción o condición y aplica filtros para refinar los resultados
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search" className="gap-2">
              <Search className="h-4 w-4" />
              Búsqueda
            </TabsTrigger>
            <TabsTrigger value="filters" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-[10px]">
                  {activeFiltersCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4 pt-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Término de búsqueda</label>
                <Input
                  placeholder="Buscar por título, descripción o condición..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  className="w-full"
                  data-testid="input-search-term"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSearch} className="flex-1" data-testid="button-apply-search">
                  <Search className="mr-2 h-4 w-4" />
                  Buscar
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("");
                    onSearch("");
                  }}
                  data-testid="button-clear-search"
                >
                  <X className="mr-2 h-4 w-4" />
                  Limpiar
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="filters" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Estado</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="select-status-filter">
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="open">Abierto</SelectItem>
                    <SelectItem value="in_progress">En Progreso</SelectItem>
                    <SelectItem value="implemented">Implementado</SelectItem>
                    <SelectItem value="overdue">Vencido</SelectItem>
                    <SelectItem value="closed">Cerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Severidad</label>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger data-testid="select-severity-filter">
                    <SelectValue placeholder="Seleccionar severidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las severidades</SelectItem>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Tipo</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger data-testid="select-type-filter">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="deficiency">Deficiencia</SelectItem>
                    <SelectItem value="weakness">Debilidad</SelectItem>
                    <SelectItem value="observation">Observación</SelectItem>
                    <SelectItem value="opportunity">Oportunidad</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Auditoría</label>
                <Select value={auditFilter} onValueChange={setAuditFilter}>
                  <SelectTrigger data-testid="select-audit-filter">
                    <SelectValue placeholder="Seleccionar auditoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las auditorías</SelectItem>
                    {(audits as any[]).map((audit: any) => (
                      <SelectItem key={audit.id} value={audit.id}>
                        {audit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex gap-2">
                <Button onClick={() => setOpen(false)} className="flex-1" data-testid="button-apply-filters">
                  Aplicar Filtros
                </Button>
                <Button variant="outline" onClick={handleClearAll} data-testid="button-clear-all">
                  <X className="mr-2 h-4 w-4" />
                  Limpiar Todo
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
