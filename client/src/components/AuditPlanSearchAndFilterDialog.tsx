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
import type { AuditPlan } from "@shared/schema";

interface AuditPlanSearchAndFilterDialogProps {
  onSearch: (term: string) => void;
  onFilterChange: (filters: {
    statusFilter: string;
    yearFilter: string;
  }) => void;
  activeFiltersCount: number;
}

export function AuditPlanSearchAndFilterDialog({ 
  onSearch, 
  onFilterChange,
  activeFiltersCount 
}: AuditPlanSearchAndFilterDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  // Data queries
  const { data: plans = [] } = useQuery<AuditPlan[]>({
    queryKey: ["/api/audit-plans"],
  });

  // Get unique years for filter
  const uniqueYears = Array.from(new Set(plans.map(p => p.year))).sort((a, b) => b - a);

  // Apply filters
  const handleApplyFilters = () => {
    onFilterChange({
      statusFilter,
      yearFilter
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
    setYearFilter("all");
    
    onSearch("");
    onFilterChange({
      statusFilter: "all",
      yearFilter: "all"
    });
  };

  // Apply filters whenever they change
  useEffect(() => {
    handleApplyFilters();
  }, [statusFilter, yearFilter]);

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
          <DialogTitle>Buscar y Filtrar Planes de Auditoría</DialogTitle>
          <DialogDescription>
            Busca por código o nombre, y aplica filtros para refinar los resultados.
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
                  placeholder="Código o nombre del plan..."
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
                Busca en código y nombre del plan de auditoría
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
              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="select-status-filter">
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="draft">📝 Borrador</SelectItem>
                    <SelectItem value="in_review">🔍 En Revisión</SelectItem>
                    <SelectItem value="approved">✅ Aprobado</SelectItem>
                    <SelectItem value="active">▶️ Activo</SelectItem>
                    <SelectItem value="completed">🎉 Completado</SelectItem>
                    <SelectItem value="cancelled">❌ Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Year Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Año</label>
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger data-testid="select-year-filter">
                    <SelectValue placeholder="Seleccionar año" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los años</SelectItem>
                    {uniqueYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
