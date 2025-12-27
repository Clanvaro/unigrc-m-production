import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryKeys } from "@/lib/queryKeys";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type GroupByOption = 'macroproceso' | 'process' | 'subproceso' | 'gerencia' | 'category';

interface DynamicRiskReportProps {
  className?: string;
}

export function DynamicRiskReport({ className }: DynamicRiskReportProps) {
  const { toast } = useToast();
  const [groupBy, setGroupBy] = useState<GroupByOption>('macroproceso');
  const [includeControls, setIncludeControls] = useState(true);
  const [includeActionPlans, setIncludeActionPlans] = useState(true);
  const [includeEvents, setIncludeEvents] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState({
    riskCode: true,
    riskName: true,
    riskLevel: true,
    controls: true,
    actionPlans: true,
    events: true,
    processInfo: true,
  });

  const { data: reportData, isLoading, error } = useQuery({
    queryKey: queryKeys.reports.risksGrouped({
      groupBy,
      includeControls,
      includeActionPlans,
      includeEvents,
    }),
    queryFn: async () => {
      const response = await fetch('/api/reports/risks-grouped', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupBy,
          includeControls,
          includeActionPlans,
          includeEvents,
        }),
      });
      if (!response.ok) throw new Error('Failed to fetch grouped risks');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      toast({
        title: "Generando reporte",
        description: `Generando informe en formato ${format.toUpperCase()}...`,
      });

      const response = await fetch('/api/reports/risks-grouped/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupBy,
          includeControls,
          includeActionPlans,
          includeEvents,
          format,
        }),
      });

      if (!response.ok) throw new Error('Failed to export report');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `informe-riesgos-${groupBy}-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Reporte exportado",
        description: "El informe se ha descargado exitosamente.",
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el reporte.",
        variant: "destructive",
      });
    }
  };

  const groups = reportData?.groups || [];
  const totals = reportData?.totals || {
    totalRisks: 0,
    totalControls: 0,
    totalActionPlans: 0,
    totalEvents: 0,
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle>Informe Dinámico de Riesgos</CardTitle>
          <CardDescription>
            Agrupa riesgos por diferentes dimensiones y muestra información relacionada
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Agrupar por</Label>
              <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupByOption)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="macroproceso">Macroproceso</SelectItem>
                  <SelectItem value="process">Proceso</SelectItem>
                  <SelectItem value="subproceso">Subproceso</SelectItem>
                  <SelectItem value="gerencia">Gerencia</SelectItem>
                  <SelectItem value="category">Categoría</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Incluir en el informe</Label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-controls"
                    checked={includeControls}
                    onCheckedChange={(checked) => setIncludeControls(checked as boolean)}
                  />
                  <Label htmlFor="include-controls" className="cursor-pointer">
                    Controles
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-action-plans"
                    checked={includeActionPlans}
                    onCheckedChange={(checked) => setIncludeActionPlans(checked as boolean)}
                  />
                  <Label htmlFor="include-action-plans" className="cursor-pointer">
                    Planes de Acción
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-events"
                    checked={includeEvents}
                    onCheckedChange={(checked) => setIncludeEvents(checked as boolean)}
                  />
                  <Label htmlFor="include-events" className="cursor-pointer">
                    Eventos
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Column Visibility */}
          <div className="space-y-2">
            <Label>Columnas visibles</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(visibleColumns).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`col-${key}`}
                    checked={value}
                    onCheckedChange={(checked) =>
                      setVisibleColumns(prev => ({ ...prev, [key]: checked as boolean }))
                    }
                  />
                  <Label htmlFor={`col-${key}`} className="cursor-pointer text-sm">
                    {key === 'riskCode' ? 'Código' :
                     key === 'riskName' ? 'Nombre' :
                     key === 'riskLevel' ? 'Nivel' :
                     key === 'controls' ? 'Controles' :
                     key === 'actionPlans' ? 'Planes' :
                     key === 'events' ? 'Eventos' :
                     key === 'processInfo' ? 'Proceso' : key}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2">
            <Button onClick={() => handleExport('excel')} disabled={isLoading}>
              <Download className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
            <Button onClick={() => handleExport('pdf')} disabled={isLoading} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
          </div>

          {/* Totals Summary */}
          {reportData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{totals.totalRisks}</div>
                  <p className="text-xs text-muted-foreground">Riesgos</p>
                </CardContent>
              </Card>
              {includeControls && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{totals.totalControls}</div>
                    <p className="text-xs text-muted-foreground">Controles</p>
                  </CardContent>
                </Card>
              )}
              {includeActionPlans && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{totals.totalActionPlans}</div>
                    <p className="text-xs text-muted-foreground">Planes de Acción</p>
                  </CardContent>
                </Card>
              )}
              {includeEvents && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-2xl font-bold">{totals.totalEvents}</div>
                    <p className="text-xs text-muted-foreground">Eventos</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Report Table */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Cargando informe...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-12 text-destructive">
              Error al cargar el informe. Por favor, intente nuevamente.
            </div>
          )}

          {!isLoading && !error && groups.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No hay datos para mostrar con los filtros seleccionados.
            </div>
          )}

          {!isLoading && !error && groups.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Grupo</TableHead>
                    {visibleColumns.riskCode && <TableHead>Código</TableHead>}
                    {visibleColumns.riskName && <TableHead>Riesgo</TableHead>}
                    {visibleColumns.riskLevel && <TableHead>Nivel</TableHead>}
                    {visibleColumns.controls && includeControls && <TableHead>Controles</TableHead>}
                    {visibleColumns.actionPlans && includeActionPlans && <TableHead>Planes</TableHead>}
                    {visibleColumns.events && includeEvents && <TableHead>Eventos</TableHead>}
                    {visibleColumns.processInfo && <TableHead>Proceso</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group: any) => {
                    const isExpanded = expandedGroups.has(group.groupKey);
                    return (
                      <Collapsible key={group.groupKey} open={isExpanded} onOpenChange={() => toggleGroup(group.groupKey)}>
                        <CollapsibleTrigger asChild>
                          <TableRow className="cursor-pointer hover:bg-muted/50">
                            <TableCell>
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {group.groupName} ({group.risks.length})
                            </TableCell>
                            <TableCell colSpan={Object.values(visibleColumns).filter(Boolean).length + (includeControls ? 1 : 0) + (includeActionPlans ? 1 : 0) + (includeEvents ? 1 : 0)}></TableCell>
                          </TableRow>
                        </CollapsibleTrigger>
                        <CollapsibleContent asChild>
                          <>
                            {group.risks.map((riskData: any) => (
                              <TableRow key={riskData.risk.id}>
                                <TableCell></TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {group.groupName}
                                </TableCell>
                                {visibleColumns.riskCode && (
                                  <TableCell>
                                    <Badge variant="outline">{riskData.risk.code}</Badge>
                                  </TableCell>
                                )}
                                {visibleColumns.riskName && (
                                  <TableCell className="max-w-md">
                                    <div className="font-medium">{riskData.risk.name}</div>
                                    {riskData.risk.description && (
                                      <div className="text-xs text-muted-foreground line-clamp-2">
                                        {riskData.risk.description}
                                      </div>
                                    )}
                                  </TableCell>
                                )}
                                {visibleColumns.riskLevel && (
                                  <TableCell>
                                    <Badge>
                                      Inh: {riskData.risk.inherentRisk} / Res: {riskData.risk.residualRisk || riskData.risk.inherentRisk}
                                    </Badge>
                                  </TableCell>
                                )}
                                {visibleColumns.controls && includeControls && (
                                  <TableCell>
                                    {riskData.controls && riskData.controls.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {riskData.controls.slice(0, 3).map((control: any) => (
                                          <Badge key={control.id} variant="secondary" className="text-xs">
                                            {control.code}
                                          </Badge>
                                        ))}
                                        {riskData.controls.length > 3 && (
                                          <Badge variant="outline" className="text-xs">
                                            +{riskData.controls.length - 3}
                                          </Badge>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">Sin controles</span>
                                    )}
                                  </TableCell>
                                )}
                                {visibleColumns.actionPlans && includeActionPlans && (
                                  <TableCell>
                                    {riskData.actionPlans && riskData.actionPlans.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {riskData.actionPlans.slice(0, 3).map((plan: any) => (
                                          <Badge key={plan.id} variant="secondary" className="text-xs">
                                            {plan.code}
                                          </Badge>
                                        ))}
                                        {riskData.actionPlans.length > 3 && (
                                          <Badge variant="outline" className="text-xs">
                                            +{riskData.actionPlans.length - 3}
                                          </Badge>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">Sin planes</span>
                                    )}
                                  </TableCell>
                                )}
                                {visibleColumns.events && includeEvents && (
                                  <TableCell>
                                    {riskData.events && riskData.events.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {riskData.events.slice(0, 2).map((event: any) => (
                                          <Badge key={event.id} variant="destructive" className="text-xs">
                                            {event.code}
                                          </Badge>
                                        ))}
                                        {riskData.events.length > 2 && (
                                          <Badge variant="outline" className="text-xs">
                                            +{riskData.events.length - 2}
                                          </Badge>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">Sin eventos</span>
                                    )}
                                  </TableCell>
                                )}
                                {visibleColumns.processInfo && (
                                  <TableCell className="text-xs text-muted-foreground">
                                    {riskData.processInfo?.macroproceso && `M: ${riskData.processInfo.macroproceso}`}
                                    {riskData.processInfo?.process && ` P: ${riskData.processInfo.process}`}
                                    {riskData.processInfo?.subproceso && ` S: ${riskData.processInfo.subproceso}`}
                                    {!riskData.processInfo && 'N/A'}
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

