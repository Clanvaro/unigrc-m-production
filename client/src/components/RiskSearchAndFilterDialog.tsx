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
import { Combobox } from "@/components/ui/combobox";

// OPTIMIZED: Catalogs are now passed as props from parent (which gets them from /api/pages/risks)
// This eliminates 5 redundant API calls per page load
interface CatalogData {
  macroprocesos?: Array<{ id: string; name: string; code: string }>;
  processes?: Array<{ id: string; name: string; code: string; macroprocesoId?: string }>;
  subprocesos?: Array<{ id: string; name: string; code: string; processId?: string }>;
  processOwners?: Array<{ id: string; name: string; position?: string }>;
  gerencias?: Array<{ id: string; name: string; code: string }>;
}

interface RiskSearchAndFilterDialogProps {
  onSearch: (term: string) => void;
  onFilterChange: (filters: {
    macroprocesoFilter: string;
    processFilter: string;
    subprocesoFilter: string;
    inherentRiskLevelFilter: string;
    residualRiskLevelFilter: string;
    validationFilter: string;
    ownerFilter: string;
  }) => void;
  activeFiltersCount: number;
  // OPTIMIZED: Receive catalogs from parent instead of fetching separately
  catalogs?: CatalogData;
}

export function RiskSearchAndFilterDialog({ 
  onSearch, 
  onFilterChange,
  activeFiltersCount,
  catalogs = {}
}: RiskSearchAndFilterDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filter states
  const [macroprocesoFilter, setMacroprocesoFilter] = useState("all");
  const [processFilter, setProcessFilter] = useState("all");
  const [subprocesoFilter, setSubprocesoFilter] = useState("all");
  const [inherentRiskLevelFilter, setInherentRiskLevelFilter] = useState("all");
  const [residualRiskLevelFilter, setResidualRiskLevelFilter] = useState("all");
  const [validationFilter, setValidationFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");

  // OPTIMIZED: Use catalogs from props (from /api/pages/risks) instead of separate API calls
  // This eliminates 5 redundant API calls per page load (~5-7 seconds saved)
  const processes = catalogs.processes || [];
  const macroprocesos = catalogs.macroprocesos || [];
  const subprocesos = catalogs.subprocesos || [];
  const processOwners = catalogs.processOwners || [];

  // Filtered data for cascading selects
  const filteredProcesses = macroprocesoFilter === "all" 
    ? (processes as any[])
    : (processes as any[]).filter((process: any) => process.macroprocesoId === macroprocesoFilter);

  const filteredSubprocesos = (() => {
    let filtered = subprocesos as any[];
    
    if (processFilter !== "all") {
      filtered = filtered.filter((subproceso: any) => subproceso.procesoId === processFilter);
    } else if (macroprocesoFilter !== "all") {
      const processIdsInMacroproceso = filteredProcesses.map((p: any) => p.id);
      filtered = filtered.filter((subproceso: any) => processIdsInMacroproceso.includes(subproceso.procesoId));
    }
    
    return filtered;
  })();

  // Apply filters
  const handleApplyFilters = () => {
    onFilterChange({
      macroprocesoFilter,
      processFilter,
      subprocesoFilter,
      inherentRiskLevelFilter,
      residualRiskLevelFilter,
      validationFilter,
      ownerFilter
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
    setMacroprocesoFilter("all");
    setProcessFilter("all");
    setSubprocesoFilter("all");
    setInherentRiskLevelFilter("all");
    setResidualRiskLevelFilter("all");
    setValidationFilter("all");
    setOwnerFilter("all");
    
    onSearch("");
    onFilterChange({
      macroprocesoFilter: "all",
      processFilter: "all",
      subprocesoFilter: "all",
      inherentRiskLevelFilter: "all",
      residualRiskLevelFilter: "all",
      validationFilter: "all",
      ownerFilter: "all"
    });
  };

  // Handle macroproceso change (reset dependent filters)
  const handleMacroprocesoChange = (value: string) => {
    setMacroprocesoFilter(value);
    setProcessFilter("all");
    setSubprocesoFilter("all");
  };

  // Handle process change (reset subproceso)
  const handleProcessChange = (value: string) => {
    setProcessFilter(value);
    setSubprocesoFilter("all");
  };

  // Apply filters whenever they change
  useEffect(() => {
    handleApplyFilters();
  }, [macroprocesoFilter, processFilter, subprocesoFilter, inherentRiskLevelFilter, residualRiskLevelFilter, validationFilter, ownerFilter]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1.5 relative"
                data-testid="button-search-and-filter"
              >
                <Filter className="h-4 w-4" />
                {activeFiltersCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="h-5 min-w-5 px-1 rounded-full text-xs font-medium"
                  >
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Buscar y Filtrar</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Buscar y Filtrar Riesgos</DialogTitle>
          <DialogDescription>
            Busca por código, nombre o descripción, y aplica filtros para refinar los resultados.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search" className="gap-2">
              <Search className="h-4 w-4" />
              Búsqueda
            </TabsTrigger>
            <TabsTrigger value="filters" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Término de búsqueda</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Código, nombre o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  autoFocus
                  className="flex-1"
                  data-testid="input-search-term"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchTerm("")}
                    data-testid="button-clear-search"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Busca en código, nombre, descripción y responsable del riesgo
              </p>
            </div>

            <Separator />

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                data-testid="button-cancel-search"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSearch}
                disabled={!searchTerm.trim()}
                data-testid="button-apply-search"
              >
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="filters" className="space-y-4 mt-4">
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {/* Macroproceso Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Macroproceso</label>
                <Combobox
                  options={[
                    { value: "all", label: "Todos los macroprocesos" },
                    ...(macroprocesos as any[]).map((macroproceso: any) => ({
                      value: macroproceso.id,
                      label: macroproceso.name,
                      description: macroproceso.code
                    }))
                  ]}
                  value={macroprocesoFilter}
                  onValueChange={handleMacroprocesoChange}
                  placeholder="Seleccionar macroproceso"
                  searchPlaceholder="Buscar macroproceso..."
                  emptyText="No se encontró macroproceso"
                />
              </div>

              {/* Process Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Proceso</label>
                <Combobox
                  options={[
                    { value: "all", label: "Todos los procesos" },
                    ...filteredProcesses.map((process: any) => ({
                      value: process.id,
                      label: process.name,
                      description: process.code
                    }))
                  ]}
                  value={processFilter}
                  onValueChange={handleProcessChange}
                  placeholder="Seleccionar proceso"
                  searchPlaceholder="Buscar proceso..."
                  emptyText="No se encontró proceso"
                />
              </div>

              {/* Subproceso Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Subproceso</label>
                <Combobox
                  options={[
                    { value: "all", label: "Todos los subprocesos" },
                    ...(filteredSubprocesos as any[]).map((subproceso: any) => ({
                      value: subproceso.id,
                      label: subproceso.name,
                      description: subproceso.code
                    }))
                  ]}
                  value={subprocesoFilter}
                  onValueChange={setSubprocesoFilter}
                  placeholder="Seleccionar subproceso"
                  searchPlaceholder="Buscar subproceso..."
                  emptyText="No se encontró subproceso"
                />
              </div>

              <Separator />

              {/* Inherent Risk Level Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Nivel de Riesgo Inherente</label>
                <Select value={inherentRiskLevelFilter} onValueChange={setInherentRiskLevelFilter}>
                  <SelectTrigger data-testid="select-inherent-risk-level-filter">
                    <SelectValue placeholder="Todos los niveles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los niveles</SelectItem>
                    <SelectItem value="crítico">Crítico</SelectItem>
                    <SelectItem value="alto">Alto</SelectItem>
                    <SelectItem value="medio">Medio</SelectItem>
                    <SelectItem value="bajo">Bajo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Residual Risk Level Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Nivel de Riesgo Residual</label>
                <Select value={residualRiskLevelFilter} onValueChange={setResidualRiskLevelFilter}>
                  <SelectTrigger data-testid="select-residual-risk-level-filter">
                    <SelectValue placeholder="Todos los niveles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los niveles</SelectItem>
                    <SelectItem value="crítico">Crítico</SelectItem>
                    <SelectItem value="alto">Alto</SelectItem>
                    <SelectItem value="medio">Medio</SelectItem>
                    <SelectItem value="bajo">Bajo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Validation Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado de Validación</label>
                <Select value={validationFilter} onValueChange={setValidationFilter}>
                  <SelectTrigger data-testid="select-validation-filter">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="validated">Validado</SelectItem>
                    <SelectItem value="pending_validation">Pendiente</SelectItem>
                    <SelectItem value="rejected">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Owner Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Responsable</label>
                <Combobox
                  options={[
                    { value: "all", label: "Todos los responsables" },
                    ...(processOwners as any[]).map((owner: any) => ({
                      value: owner.id,
                      label: owner.name,
                      description: owner.position
                    }))
                  ]}
                  value={ownerFilter}
                  onValueChange={setOwnerFilter}
                  placeholder="Seleccionar responsable"
                  searchPlaceholder="Buscar responsable..."
                  emptyText="No se encontró responsable"
                />
              </div>
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <Button
                variant="ghost"
                onClick={handleClearAll}
                disabled={activeFiltersCount === 0}
                data-testid="button-clear-all-filters"
              >
                <X className="mr-2 h-4 w-4" />
                Limpiar todo
              </Button>
              <Button
                onClick={() => setOpen(false)}
                data-testid="button-close-filters"
              >
                Aplicar
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
