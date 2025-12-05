import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { X, Plus, ChevronsUpDown, Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProcessAssociation {
  macroprocesoId?: string;
  processId?: string;
  subprocesoId?: string;
}

interface ProcessMultiSelectorProps {
  value: ProcessAssociation[];
  onChange: (associations: ProcessAssociation[]) => void;
  maxAssociations?: number;
}

export default function ProcessMultiSelector({
  value = [],
  onChange,
  maxAssociations = 10
}: ProcessMultiSelectorProps) {
  const [currentSelection, setCurrentSelection] = useState<ProcessAssociation>({});
  const [openMacroproceso, setOpenMacroproceso] = useState(false);
  const [openProceso, setOpenProceso] = useState(false);
  const [openSubproceso, setOpenSubproceso] = useState(false);

  const { data: macroprocesos = [] } = useQuery<any[]>({
    queryKey: ["/api/macroprocesos"],
    staleTime: 60000,
    refetchOnMount: "always",
  });

  const { data: processes = [] } = useQuery<any[]>({
    queryKey: ["/api/processes"],
    staleTime: 60000,
    refetchOnMount: "always",
  });

  const { data: subprocesos = [] } = useQuery<any[]>({
    queryKey: ["/api/subprocesos"],
    staleTime: 60000,
    refetchOnMount: "always",
  });

  // Filter processes based on selected macroproceso
  const availableProcesses = processes.filter(
    (p: any) => !currentSelection.macroprocesoId || p.macroprocesoId === currentSelection.macroprocesoId
  );

  // Filter subprocesos based on selected process
  const availableSubprocesos = subprocesos.filter(
    (s: any) => currentSelection.processId && s.procesoId === currentSelection.processId
  );

  const addAssociation = () => {
    // Check all constraints before adding
    if (!isValidSelection() || isAlreadySelected() || value.length >= maxAssociations) {
      return;
    }

    const newAssociation: ProcessAssociation = {
      macroprocesoId: currentSelection.macroprocesoId || undefined,
      processId: currentSelection.processId || undefined,
      subprocesoId: currentSelection.subprocesoId || undefined,
    };

    onChange([...value, newAssociation]);
    setCurrentSelection({});
  };

  const removeAssociation = (index: number) => {
    const newAssociations = value.filter((_, i) => i !== index);
    onChange(newAssociations);
  };

  const isValidSelection = () => {
    return currentSelection.macroprocesoId || currentSelection.processId || currentSelection.subprocesoId;
  };

  const isAlreadySelected = () => {
    return value.some(assoc =>
      assoc.macroprocesoId === currentSelection.macroprocesoId &&
      assoc.processId === currentSelection.processId &&
      assoc.subprocesoId === currentSelection.subprocesoId
    );
  };

  const getAssociationLabel = (assoc: ProcessAssociation) => {
    const parts = [];

    if (assoc.macroprocesoId) {
      const macro = macroprocesos.find((m: any) => m.id === assoc.macroprocesoId);
      parts.push(macro?.name || assoc.macroprocesoId);
    }

    if (assoc.processId) {
      const process = processes.find((p: any) => p.id === assoc.processId);
      parts.push(process?.name || assoc.processId);
    }

    if (assoc.subprocesoId) {
      const subproc = subprocesos.find((s: any) => s.id === assoc.subprocesoId);
      parts.push(subproc?.name || assoc.subprocesoId);
    }

    return parts.join(" → ");
  };

  const clearFilters = () => {
    setCurrentSelection({});
  };

  return (
    <Card className="w-full" data-testid="process-multi-selector">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Asociaciones de Proceso</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Associations */}
        {value.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Procesos Asociados:</h4>
            <div className="flex flex-wrap gap-2">
              {value.map((assoc, index) => {
                // Create unique key using composite of all IDs to prevent React from incorrectly reusing elements
                const uniqueKey = `${assoc.macroprocesoId || ''}:${assoc.processId || ''}:${assoc.subprocesoId || ''}`;
                return (
                  <Badge
                    key={uniqueKey}
                    variant="secondary"
                    className="px-3 py-1 gap-2"
                    data-testid={`association-badge-${index}`}
                  >
                    <span className="text-xs">{getAssociationLabel(assoc)}</span>
                    <button
                      type="button"
                      onClick={() => removeAssociation(index)}
                      className="hover:bg-muted rounded-full p-0.5"
                      data-testid={`remove-association-${index}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Add New Association */}
        {value.length < maxAssociations && (
          <div className="space-y-3 p-3 border rounded-lg bg-muted/20">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">Agregar Nueva Asociación:</h4>
              {(currentSelection.macroprocesoId || currentSelection.processId || currentSelection.subprocesoId) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-7 gap-1 text-xs"
                  data-testid="clear-filters-btn"
                >
                  <RotateCcw className="h-3 w-3" />
                  Limpiar
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Macroproceso Combobox */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Macroproceso
                </label>
                <Popover open={openMacroproceso} onOpenChange={setOpenMacroproceso}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openMacroproceso}
                      className="w-full h-8 justify-between text-xs"
                      data-testid="combobox-macroproceso"
                    >
                      {currentSelection.macroprocesoId
                        ? macroprocesos.find((m: any) => m.id === currentSelection.macroprocesoId)?.name
                        : "Buscar macroproceso..."}
                      <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar macroproceso..." className="h-8" />
                      <CommandList>
                        <CommandEmpty>No se encontró macroproceso.</CommandEmpty>
                        <CommandGroup>
                          {macroprocesos.map((macro: any) => (
                            <CommandItem
                              key={macro.id}
                              value={macro.name}
                              onSelect={() => {
                                setCurrentSelection({
                                  macroprocesoId: macro.id,
                                  processId: undefined,
                                  subprocesoId: undefined,
                                });
                                setOpenMacroproceso(false);
                              }}
                              data-testid={`macroproceso-option-${macro.id}`}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  currentSelection.macroprocesoId === macro.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {macro.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Proceso Combobox */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Proceso
                </label>
                <Popover open={openProceso} onOpenChange={setOpenProceso}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openProceso}
                      disabled={!currentSelection.macroprocesoId}
                      className="w-full h-8 justify-between text-xs"
                      data-testid="combobox-proceso"
                    >
                      {currentSelection.processId
                        ? processes.find((p: any) => p.id === currentSelection.processId)?.name
                        : "Buscar proceso..."}
                      <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar proceso..." className="h-8" />
                      <CommandList>
                        <CommandEmpty>No se encontró proceso.</CommandEmpty>
                        <CommandGroup>
                          {availableProcesses.map((process: any) => (
                            <CommandItem
                              key={process.id}
                              value={process.name}
                              onSelect={() => {
                                setCurrentSelection({
                                  ...currentSelection,
                                  processId: process.id,
                                  subprocesoId: undefined,
                                });
                                setOpenProceso(false);
                              }}
                              data-testid={`proceso-option-${process.id}`}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  currentSelection.processId === process.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {process.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Subproceso Combobox */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Subproceso
                </label>
                <Popover open={openSubproceso} onOpenChange={setOpenSubproceso}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openSubproceso}
                      disabled={!currentSelection.processId}
                      className="w-full h-8 justify-between text-xs"
                      data-testid="combobox-subproceso"
                    >
                      {currentSelection.subprocesoId
                        ? subprocesos.find((s: any) => s.id === currentSelection.subprocesoId)?.name
                        : "Buscar subproceso..."}
                      <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar subproceso..." className="h-8" />
                      <CommandList>
                        <CommandEmpty>No se encontró subproceso.</CommandEmpty>
                        <CommandGroup>
                          {availableSubprocesos.map((subproc: any) => (
                            <CommandItem
                              key={subproc.id}
                              value={subproc.name}
                              onSelect={() => {
                                setCurrentSelection({
                                  ...currentSelection,
                                  subprocesoId: subproc.id,
                                });
                                setOpenSubproceso(false);
                              }}
                              data-testid={`subproceso-option-${subproc.id}`}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  currentSelection.subprocesoId === subproc.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {subproc.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addAssociation}
              disabled={!isValidSelection() || isAlreadySelected()}
              className="w-full gap-2"
              data-testid="add-association-btn"
            >
              <Plus className="h-4 w-4" />
              Agregar Asociación
            </Button>

            {isAlreadySelected() && (
              <p className="text-xs text-amber-600">Esta asociación ya ha sido agregada</p>
            )}
          </div>
        )}

        {value.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Selecciona al menos un proceso para asociar con este riesgo.
          </p>
        )}

        {value.length >= maxAssociations && (
          <p className="text-xs text-muted-foreground">
            Máximo {maxAssociations} asociaciones permitidas.
          </p>
        )}
      </CardContent>
    </Card>
  );
}