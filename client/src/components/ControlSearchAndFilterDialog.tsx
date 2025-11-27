import { useState, useEffect } from "react";
import { Search, SlidersHorizontal, X, Filter, ChevronsUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useQuery } from "@tanstack/react-query";

interface ControlSearchAndFilterDialogProps {
  onSearch: (term: string) => void;
  onFilterChange?: (filters: {
    typeFilter: string;
    effectivenessFilter: string;
    statusFilter: string;
    validationStatusFilter: string;
    responsibleFilter: string;
  }) => void;
  activeFiltersCount: number;
}

export function ControlSearchAndFilterDialog({ 
  onSearch,
  onFilterChange,
  activeFiltersCount 
}: ControlSearchAndFilterDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filter states
  const [typeFilter, setTypeFilter] = useState("all");
  const [effectivenessFilter, setEffectivenessFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [validationStatusFilter, setValidationStatusFilter] = useState("all");
  const [responsibleFilter, setResponsibleFilter] = useState("all");
  const [openResponsibleCombobox, setOpenResponsibleCombobox] = useState(false);

  // Fetch process owners for responsible filter
  const { data: processOwners = [] } = useQuery<any[]>({
    queryKey: ["/api/process-owners"],
  });

  // Apply search
  const handleSearch = () => {
    onSearch(searchTerm);
    setOpen(false);
  };

  // Apply filters
  const handleApplyFilters = () => {
    if (onFilterChange) {
      onFilterChange({
        typeFilter,
        effectivenessFilter,
        statusFilter,
        validationStatusFilter,
        responsibleFilter
      });
    }
    setOpen(false);
  };

  // Clear all
  const handleClearAll = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setEffectivenessFilter("all");
    setStatusFilter("all");
    setValidationStatusFilter("all");
    setResponsibleFilter("all");
    onSearch("");
    if (onFilterChange) {
      onFilterChange({
        typeFilter: "all",
        effectivenessFilter: "all",
        statusFilter: "all",
        validationStatusFilter: "all",
        responsibleFilter: "all"
      });
    }
  };

  // Count active filters
  const activeFilterCount = [
    typeFilter !== "all",
    effectivenessFilter !== "all",
    statusFilter !== "all",
    validationStatusFilter !== "all",
    responsibleFilter !== "all"
  ].filter(Boolean).length;

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
          <DialogTitle>Buscar y Filtrar Controles</DialogTitle>
          <DialogDescription>
            Busca por código, nombre, descripción o responsable, y aplica filtros para refinar los resultados.
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
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {activeFilterCount}
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
                  placeholder="Código, nombre, descripción o responsable..."
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
                Busca en código, nombre, descripción y responsable del control
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
                data-testid="button-apply-search"
              >
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="filters" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type-filter">Tipo de Control</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger id="type-filter" data-testid="select-type-filter">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="preventive">🛡️ Preventivo</SelectItem>
                    <SelectItem value="detective">🔍 Detectivo</SelectItem>
                    <SelectItem value="corrective">🔧 Correctivo</SelectItem>
                    <SelectItem value="directive">📋 Directivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="effectiveness-filter">Efectividad</Label>
                <Select value={effectivenessFilter} onValueChange={setEffectivenessFilter}>
                  <SelectTrigger id="effectiveness-filter" data-testid="select-effectiveness-filter">
                    <SelectValue placeholder="Seleccionar efectividad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las efectividades</SelectItem>
                    <SelectItem value="high">🟢 Alta (80-100%)</SelectItem>
                    <SelectItem value="medium">🟡 Media (50-79%)</SelectItem>
                    <SelectItem value="low">🔴 Baja (0-49%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status-filter">Estado de Actividad</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status-filter" data-testid="select-status-filter">
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="active">✅ Activo</SelectItem>
                    <SelectItem value="inactive">❌ Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="validation-status-filter">Estado de Validación</Label>
                <Select value={validationStatusFilter} onValueChange={setValidationStatusFilter}>
                  <SelectTrigger id="validation-status-filter" data-testid="select-validation-status-filter">
                    <SelectValue placeholder="Seleccionar estado de validación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="pending_validation">⏳ Pendiente de Validación</SelectItem>
                    <SelectItem value="validated">✅ Validado</SelectItem>
                    <SelectItem value="observed">👁️ Observado</SelectItem>
                    <SelectItem value="rejected">❌ Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsible-filter">Responsable del Control</Label>
                <Popover open={openResponsibleCombobox} onOpenChange={setOpenResponsibleCombobox}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-between"
                      data-testid="button-responsible-filter"
                    >
                      {responsibleFilter !== "all"
                        ? processOwners.find((po: any) => po.id === responsibleFilter)?.name || "Seleccionar responsable"
                        : "Todos los responsables"
                      }
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar responsable..." />
                      <CommandList>
                        <CommandEmpty>No se encontraron responsables.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all"
                            onSelect={() => {
                              setResponsibleFilter("all");
                              setOpenResponsibleCombobox(false);
                            }}
                            data-testid="responsible-filter-all"
                          >
                            <Check className={`mr-2 h-4 w-4 ${responsibleFilter === "all" ? "opacity-100" : "opacity-0"}`} />
                            Todos los responsables
                          </CommandItem>
                          {processOwners.map((owner: any) => (
                            <CommandItem
                              key={owner.id}
                              value={owner.name}
                              onSelect={() => {
                                setResponsibleFilter(owner.id);
                                setOpenResponsibleCombobox(false);
                              }}
                              data-testid={`responsible-filter-${owner.id}`}
                            >
                              <Check className={`mr-2 h-4 w-4 ${responsibleFilter === owner.id ? "opacity-100" : "opacity-0"}`} />
                              <div className="flex flex-col">
                                <span className="font-medium">{owner.name}</span>
                                {owner.position && (
                                  <span className="text-xs text-muted-foreground">{owner.position}</span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between">
              <Button
                variant="ghost"
                onClick={handleClearAll}
                data-testid="button-clear-all"
              >
                Limpiar Todo
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  data-testid="button-cancel-filters"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleApplyFilters}
                  data-testid="button-apply-filters"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Aplicar Filtros
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
