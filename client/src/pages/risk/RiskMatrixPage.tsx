import { useState, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RiskHeatmapRecharts } from "@/components/risk/RiskHeatmapRecharts";
import { RiskLegend } from "@/components/risk/RiskLegend";
import { Download, Printer, Filter, FileImage } from "lucide-react";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";

interface HeatmapDataPoint {
  id: string;
  code: string;
  name: string;
  probability: number;
  impact: number;
  inherentRisk: number;
  controlEffectiveness: number[];
  status: string;
  category: string[];
  macroprocesoId: string | null;
  processId: string | null;
  subprocesoId: string | null;
}

interface RiskMatrixBootstrapData {
  macroprocesos: Array<{ id: string; code: string; name: string; type: string }>;
  processes: Array<{ id: string; code: string; name: string; macroprocesoId: string }>;
  heatmapData: HeatmapDataPoint[];
}

export default function RiskMatrixPage() {
  const [mode, setMode] = useState<'inherent' | 'residual'>('inherent');
  const [filters, setFilters] = useState({
    macroproceso: 'all',
    process: 'all',
    status: 'all',
  });
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const heatmapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // SPRINT 1 OPTIMIZATION: Use optimized matrix endpoint with server-side aggregation
  // Reduces data transfer by ~90% and enables 5-minute aggressive caching
  const { data: bootstrapData, isLoading } = useQuery<RiskMatrixBootstrapData>({
    queryKey: ["/api/risks/matrix-data"],
    staleTime: 5 * 60 * 1000, // 5 minutes (matches backend cache)
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Extract data from bootstrap response
  const heatmapData = bootstrapData?.heatmapData || [];
  const macroprocesos = bootstrapData?.macroprocesos || [];
  const processes = bootstrapData?.processes || [];

  // SPRINT 1 OPTIMIZATION: Memoize filtered data to prevent recalculation on every render
  const filteredData = useMemo(() => {
    return heatmapData.filter((risk) => {
      if (filters.macroproceso !== 'all' && risk.macroprocesoId !== filters.macroproceso) {
        return false;
      }
      if (filters.process !== 'all' && risk.processId !== filters.process) {
        return false;
      }
      if (filters.status !== 'all' && risk.status !== filters.status) {
        return false;
      }
      return true;
    });
  }, [heatmapData, filters.macroproceso, filters.process, filters.status]);

  const handleExportPNG = async () => {
    if (!heatmapRef.current) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(heatmapRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });

      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      const modeText = mode === 'inherent' ? 'Inherente' : 'Residual';
      link.download = `heatmap-riesgos-${modeText.toLowerCase()}-${timestamp}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast({
        title: "Exportación exitosa",
        description: `El heatmap se ha exportado como PNG.`,
      });
      setExportDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error al exportar",
        description: "No se pudo exportar el heatmap.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSVG = () => {
    if (!chartRef.current) return;

    try {
      // Buscar el elemento SVG específicamente en el contenedor del chart (no en la leyenda)
      const svgElement = chartRef.current.querySelector('svg.recharts-surface');
      if (!svgElement) {
        throw new Error('No se encontró el elemento SVG del gráfico');
      }

      // Clonar el SVG para no modificar el original
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;

      // Agregar estilos inline necesarios
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

      // Serializar el SVG
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      // Descargar
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      const modeText = mode === 'inherent' ? 'Inherente' : 'Residual';
      link.download = `heatmap-riesgos-${modeText.toLowerCase()}-${timestamp}.svg`;
      link.href = svgUrl;
      link.click();

      // Limpiar
      URL.revokeObjectURL(svgUrl);

      toast({
        title: "Exportación exitosa",
        description: `El heatmap se ha exportado como SVG.`,
      });
      setExportDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error al exportar",
        description: "No se pudo exportar el heatmap como SVG.",
        variant: "destructive",
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 1cm;
          }
          
          .print-hidden {
            display: none !important;
          }
          
          .heatmap-container {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          /* Ocultar navegación y controles en impresión */
          nav, header, .sidebar {
            display: none !important;
          }
          
          /* Ajustar tamaño del heatmap para impresión */
          .recharts-wrapper {
            width: 100% !important;
            height: auto !important;
          }
        }
      `}</style>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="page-title">Heatmap de Riesgos</h1>
            <p className="text-muted-foreground mt-1">
              Visualización interactiva de riesgos por probabilidad e impacto
            </p>
          </div>
          <div className="flex gap-2 print-hidden">
            <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-print">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button variant="outline" size="sm" onClick={() => setExportDialogOpen(true)} data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card className="print-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Macroproceso</label>
                <Select
                  value={filters.macroproceso}
                  onValueChange={(value) => setFilters({ ...filters, macroproceso: value })}
                >
                  <SelectTrigger data-testid="select-macroproceso">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los macroprocesos</SelectItem>
                    {macroprocesos.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Proceso</label>
                <Select
                  value={filters.process}
                  onValueChange={(value) => setFilters({ ...filters, process: value })}
                >
                  <SelectTrigger data-testid="select-process">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los procesos</SelectItem>
                    {processes.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Estado</label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value })}
                >
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="active">Activos</SelectItem>
                    <SelectItem value="inactive">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Toggle Inherente/Residual */}
        <div className="flex justify-between items-center">
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'inherent' | 'residual')}>
            <TabsList data-testid="mode-toggle" className="print-hidden">
              <TabsTrigger value="inherent" data-testid="tab-inherent">
                Riesgo Inherente
              </TabsTrigger>
              <TabsTrigger value="residual" data-testid="tab-residual">
                Riesgo Residual
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="text-sm text-muted-foreground">
            {filteredData.length} riesgos • Actualizado: {new Date().toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>

        {/* Heatmap */}
        {isLoading ? (
          <Card className="p-8">
            <div className="text-center text-muted-foreground">Cargando matriz de riesgos...</div>
          </Card>
        ) : (
          <div ref={heatmapRef} className="grid grid-cols-1 lg:grid-cols-4 gap-6 heatmap-container">
            <div ref={chartRef} className="lg:col-span-3">
              <RiskHeatmapRecharts data={filteredData} mode={mode} />
            </div>
            <div>
              <RiskLegend />
            </div>
          </div>
        )}

        {/* Export Dialog */}
        <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
          <DialogContent data-testid="export-dialog">
            <DialogHeader>
              <DialogTitle>Exportar Heatmap de Riesgos</DialogTitle>
              <DialogDescription>
                Selecciona el formato para exportar la visualización actual
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <Button
                variant="outline"
                className="justify-start h-auto p-4"
                onClick={handleExportPNG}
                disabled={isExporting}
                data-testid="export-png-button"
              >
                <FileImage className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">
                    {isExporting ? 'Exportando...' : 'Exportar como PNG'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Imagen de alta calidad para presentaciones
                  </div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="justify-start h-auto p-4"
                onClick={handleExportSVG}
                data-testid="export-svg-button"
              >
                <Download className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-semibold">Exportar como SVG</div>
                  <div className="text-sm text-muted-foreground">
                    Formato vectorial escalable
                  </div>
                </div>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
