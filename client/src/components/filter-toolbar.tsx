import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Save, Eye, Star, Trash2, Filter } from "lucide-react";
import { useSavedViews } from "@/hooks/useSavedViews";

type EntityType = "risks" | "controls" | "events" | "audits";

interface FilterToolbarProps {
  filters: Record<string, any>;
  onFiltersChange: (filters: Record<string, any>) => void;
  entityType: EntityType;
  hideSavedViews?: boolean;
}

export function FilterToolbar({ filters, onFiltersChange, entityType, hideSavedViews = false }: FilterToolbarProps) {
  const {
    savedViews,
    isLoading,
    defaultView,
    createView,
    deleteView,
    setDefaultView,
    isCreating,
  } = useSavedViews(entityType);

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [markAsDefault, setMarkAsDefault] = useState(false);

  // Get active filter entries (excluding empty values)
  const activeFilters = Object.entries(filters).filter(([_, value]) => {
    if (value === null || value === undefined || value === "") return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  });

  // Format filter label for display
  const formatFilterLabel = (key: string, value: any): string => {
    const labels: Record<string, string> = {
      search: "Búsqueda",
      status: "Estado",
      category: "Categoría",
      owner: "Responsable",
      priority: "Prioridad",
      type: "Tipo",
      effectiveness: "Efectividad",
      frequency: "Frecuencia",
      dateFrom: "Desde",
      dateTo: "Hasta",
      level: "Nivel",
    };

    const label = labels[key] || key;
    const displayValue = Array.isArray(value) ? value.join(", ") : String(value);
    
    return `${label}: ${displayValue}`;
  };

  // Remove a specific filter
  const removeFilter = (key: string) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  // Clear all filters
  const clearAllFilters = () => {
    onFiltersChange({});
  };

  // Save current filters as a view
  const handleSaveView = () => {
    if (!viewName.trim()) return;

    createView({
      name: viewName.trim(),
      filters,
      isDefault: markAsDefault,
    });

    setViewName("");
    setMarkAsDefault(false);
    setSaveDialogOpen(false);
  };

  // Load a saved view
  const loadView = (viewFilters: Record<string, any>) => {
    onFiltersChange(viewFilters);
  };

  // Get entity type display name
  const getEntityTypeName = () => {
    const names: Record<EntityType, string> = {
      risks: "Riesgos",
      controls: "Controles",
      events: "Eventos",
      audits: "Auditorías",
    };
    return names[entityType] || entityType;
  };

  return (
    <div className="space-y-3 mb-4" data-testid="filter-toolbar">
      <div className="flex flex-wrap items-center gap-2">
        {/* Active Filter Chips */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 flex-1" data-testid="active-filters">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {activeFilters.map(([key, value]) => (
              <Badge
                key={key}
                variant="outline"
                className="bg-primary/10 border-primary text-primary hover:bg-primary/20 gap-1"
                data-testid={`filter-chip-${key}`}
              >
                {formatFilterLabel(key, value)}
                <button
                  onClick={() => removeFilter(key)}
                  className="ml-1 hover:text-primary/80"
                  aria-label={`Eliminar filtro ${key}`}
                  data-testid={`remove-filter-${key}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Clear All Button */}
          {activeFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              data-testid="button-clear-filters"
            >
              <X className="h-4 w-4 mr-2" />
              Limpiar todo
            </Button>
          )}

          {/* Save View Button */}
          {activeFilters.length > 0 && (
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="button-save-view"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Vista
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-save-view">
                <DialogHeader>
                  <DialogTitle>Guardar Vista de Filtros</DialogTitle>
                  <DialogDescription>
                    Guarda la configuración actual de filtros para {getEntityTypeName().toLowerCase()} para reutilizarla más tarde.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="view-name">Nombre de la vista</Label>
                    <Input
                      id="view-name"
                      placeholder="Ej: Riesgos Críticos Pendientes"
                      value={viewName}
                      onChange={(e) => setViewName(e.target.value)}
                      data-testid="input-view-name"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="default-view"
                      checked={markAsDefault}
                      onCheckedChange={(checked) => setMarkAsDefault(checked as boolean)}
                      data-testid="checkbox-default-view"
                    />
                    <Label
                      htmlFor="default-view"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Marcar como vista predeterminada
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setSaveDialogOpen(false)}
                    data-testid="button-cancel-save"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveView}
                    disabled={!viewName.trim() || isCreating}
                    data-testid="button-confirm-save"
                  >
                    {isCreating ? "Guardando..." : "Guardar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Saved Views Dropdown */}
          {!hideSavedViews && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  data-testid="button-saved-views"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Vistas Guardadas
                  {savedViews.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {savedViews.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64" data-testid="dropdown-saved-views">
              {savedViews.length === 0 ? (
                <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                  No hay vistas guardadas
                </div>
              ) : (
                <>
                  {savedViews.map((view) => (
                    <DropdownMenuItem
                      key={view.id}
                      className="flex items-center justify-between group"
                      data-testid={`saved-view-${view.id}`}
                    >
                      <button
                        onClick={() => loadView(view.filters as Record<string, any>)}
                        className="flex items-center gap-2 flex-1"
                        data-testid={`load-view-${view.id}`}
                      >
                        {view.isDefault && (
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        )}
                        <span className="flex-1 text-left">{view.name}</span>
                      </button>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!view.isDefault && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDefaultView(view.id);
                            }}
                            className="p-1 hover:bg-accent rounded"
                            aria-label="Marcar como predeterminada"
                            data-testid={`set-default-${view.id}`}
                          >
                            <Star className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteView(view.id);
                          }}
                          className="p-1 hover:bg-destructive/10 hover:text-destructive rounded"
                          aria-label="Eliminar vista"
                          data-testid={`delete-view-${view.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  {defaultView && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        Vista predeterminada: {defaultView.name}
                      </div>
                    </>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}
