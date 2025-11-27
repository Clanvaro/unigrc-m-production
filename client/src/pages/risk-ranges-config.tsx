import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Save, RotateCcw, Hash, Sliders, Calculator } from "lucide-react";
import { useRiskFormatting } from "@/contexts/RiskFormattingContext";

export default function RiskRangesConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { refreshConfig } = useRiskFormatting();
  
  // Risk level ranges states
  const [riskRanges, setRiskRanges] = useState<{lowMax: number, mediumMax: number, highMax: number}>({
    lowMax: 6, mediumMax: 12, highMax: 19
  });
  const [originalRiskRanges, setOriginalRiskRanges] = useState<{lowMax: number, mediumMax: number, highMax: number}>({
    lowMax: 6, mediumMax: 12, highMax: 19
  });

  // Risk decimals states
  const [decimalsEnabled, setDecimalsEnabled] = useState<boolean>(false);
  const [decimalsPrecision, setDecimalsPrecision] = useState<number>(0);
  const [originalDecimalsEnabled, setOriginalDecimalsEnabled] = useState<boolean>(false);
  const [originalDecimalsPrecision, setOriginalDecimalsPrecision] = useState<number>(0);

  // Obtener rangos de niveles de riesgo
  const { data: riskRangesData, isLoading: isLoadingRiskRanges } = useQuery<{lowMax: number, mediumMax: number, highMax: number}>({
    queryKey: ["/api/system-config/risk-level-ranges"],
  });

  // Obtener configuración de decimales
  const { data: decimalsData, isLoading: isLoadingDecimals } = useQuery<{enabled: boolean, precision: number}>({
    queryKey: ["/api/system-config/risk-decimals"],
  });

  // Inicializar rangos de riesgo cuando se cargan
  useEffect(() => {
    if (riskRangesData) {
      setRiskRanges(riskRangesData);
      setOriginalRiskRanges(riskRangesData);
    }
  }, [riskRangesData]);

  // Inicializar configuración de decimales cuando se cargan
  useEffect(() => {
    if (decimalsData) {
      setDecimalsEnabled(decimalsData.enabled);
      setDecimalsPrecision(decimalsData.precision);
      setOriginalDecimalsEnabled(decimalsData.enabled);
      setOriginalDecimalsPrecision(decimalsData.precision);
    }
  }, [decimalsData]);

  // Mutación para actualizar rangos de riesgo
  const updateRiskRangesMutation = useMutation({
    mutationFn: async (ranges: {lowMax: number, mediumMax: number, highMax: number}) => {
      return await apiRequest("/api/system-config/risk-level-ranges", "PUT", { 
        ...ranges,
        updatedBy: "user-1"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-config/risk-level-ranges"] });
      // Invalidar caches que dependen de los niveles de riesgo
      queryClient.invalidateQueries({ queryKey: ["/api/risks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/processes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-controls-with-details"] });
      toast({
        title: "Rangos de riesgo actualizados",
        description: "Los rangos de niveles de riesgo han sido actualizados exitosamente.",
      });
      // Actualizar los valores originales después de guardado exitoso
      setOriginalRiskRanges(riskRanges);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudieron actualizar los rangos de riesgo. Intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  // Mutación para actualizar configuración de decimales
  const updateDecimalsMutation = useMutation({
    mutationFn: async (config: {enabled: boolean, precision: number}) => {
      return await apiRequest("/api/system-config/risk-decimals", "PUT", config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-config/risk-decimals"] });
      // Refrescar el contexto global para que todos los componentes usen la nueva configuración
      refreshConfig();
      // Invalidar caches que muestran valores de riesgo para forzar re-renderizado
      queryClient.invalidateQueries({ queryKey: ["/api/risks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/processes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-controls-with-details"] });
      toast({
        title: "Configuración de decimales actualizada",
        description: "Los valores de riesgo ahora se mostrarán con la nueva configuración.",
      });
      // Actualizar los valores originales después de guardado exitoso
      setOriginalDecimalsEnabled(decimalsEnabled);
      setOriginalDecimalsPrecision(decimalsPrecision);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración de decimales. Intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  const handleSaveRiskRanges = async () => {
    // Validar rangos de riesgo
    if (riskRanges.lowMax >= riskRanges.mediumMax || riskRanges.mediumMax >= riskRanges.highMax) {
      toast({
        title: "Error de validación",
        description: "Los rangos de riesgo deben estar en orden ascendente: Bajo < Medio < Alto",
        variant: "destructive",
      });
      return;
    }

    if (riskRanges.lowMax < 1 || riskRanges.highMax > 25) {
      toast({
        title: "Error de validación",
        description: "Los rangos de riesgo deben estar entre 1 y 25 (máximo valor posible: 5 × 5)",
        variant: "destructive",
      });
      return;
    }

    updateRiskRangesMutation.mutate(riskRanges);
  };

  const handleSaveDecimals = async () => {
    updateDecimalsMutation.mutate({
      enabled: decimalsEnabled,
      precision: decimalsPrecision
    });
  };

  const resetRiskRangesToDefaults = () => {
    setRiskRanges(originalRiskRanges);
    toast({
      title: "Valores restaurados",
      description: "Se han restaurado los valores originales de rangos.",
    });
  };

  const resetDecimalsToDefaults = () => {
    setDecimalsEnabled(originalDecimalsEnabled);
    setDecimalsPrecision(originalDecimalsPrecision);
    toast({
      title: "Valores restaurados",
      description: "Se han restaurado los valores originales de decimales.",
    });
  };

  const hasRiskRangeChanges = riskRanges.lowMax !== originalRiskRanges.lowMax || 
                             riskRanges.mediumMax !== originalRiskRanges.mediumMax || 
                             riskRanges.highMax !== originalRiskRanges.highMax;

  const hasDecimalChanges = decimalsEnabled !== originalDecimalsEnabled ||
                           decimalsPrecision !== originalDecimalsPrecision;

  if (isLoadingRiskRanges || isLoadingDecimals) {
    return <div className="flex justify-center items-center h-64">Cargando configuración...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-muted-foreground mb-2">Configuración de Riesgo</h1>
        <p className="text-muted-foreground">
          Configura cómo se clasifican y muestran los valores de riesgo en toda la aplicación.
        </p>
      </div>

      <Tabs defaultValue="ranges" className="w-full max-w-4xl">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ranges" className="flex items-center gap-2">
            <Sliders className="h-4 w-4" />
            Rangos de Riesgo
          </TabsTrigger>
          <TabsTrigger value="decimals" className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Formato de Decimales
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ranges">
          <Card>
            <CardHeader>
              <CardTitle>Rangos de Niveles de Riesgo</CardTitle>
              <CardDescription>
                Configura los rangos para clasificar los riesgos según su puntuación calculada.
                Los rangos deben estar en orden ascendente y dentro del rango 1-25.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Riesgo Bajo */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <label className="text-sm font-medium">
                  Riesgo Bajo (1 - {riskRanges.lowMax})
                </label>
              </div>
              <div className="space-y-2">
                <Slider
                  value={[riskRanges.lowMax]}
                  onValueChange={(value) => setRiskRanges(prev => ({...prev, lowMax: value[0]}))}
                  min={1}
                  max={24}
                  step={1}
                  className="w-full"
                  data-testid="slider-risk-low-max"
                />
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={riskRanges.lowMax}
                  onChange={(e) => setRiskRanges(prev => ({...prev, lowMax: parseInt(e.target.value) || 1}))}
                  className="text-center"
                  data-testid="input-risk-low-max"
                />
              </div>
            </div>

            {/* Riesgo Medio */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <label className="text-sm font-medium">
                  Riesgo Medio ({riskRanges.lowMax + 1} - {riskRanges.mediumMax})
                </label>
              </div>
              <div className="space-y-2">
                <Slider
                  value={[riskRanges.mediumMax]}
                  onValueChange={(value) => setRiskRanges(prev => ({...prev, mediumMax: value[0]}))}
                  min={riskRanges.lowMax + 1}
                  max={24}
                  step={1}
                  className="w-full"
                  data-testid="slider-risk-medium-max"
                />
                <Input
                  type="number"
                  min={riskRanges.lowMax + 1}
                  max={24}
                  value={riskRanges.mediumMax}
                  onChange={(e) => setRiskRanges(prev => ({...prev, mediumMax: parseInt(e.target.value) || riskRanges.lowMax + 1}))}
                  className="text-center"
                  data-testid="input-risk-medium-max"
                />
              </div>
            </div>

            {/* Riesgo Alto */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <label className="text-sm font-medium">
                  Riesgo Alto ({riskRanges.mediumMax + 1} - {riskRanges.highMax})
                </label>
              </div>
              <div className="space-y-2">
                <Slider
                  value={[riskRanges.highMax]}
                  onValueChange={(value) => setRiskRanges(prev => ({...prev, highMax: value[0]}))}
                  min={riskRanges.mediumMax + 1}
                  max={25}
                  step={1}
                  className="w-full"
                  data-testid="slider-risk-high-max"
                />
                <Input
                  type="number"
                  min={riskRanges.mediumMax + 1}
                  max={25}
                  value={riskRanges.highMax}
                  onChange={(e) => setRiskRanges(prev => ({...prev, highMax: parseInt(e.target.value) || riskRanges.mediumMax + 1}))}
                  className="text-center"
                  data-testid="input-risk-high-max"
                />
              </div>
            </div>
          </div>

          {/* Riesgo Crítico (automático) */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <label className="text-sm font-medium">
                Riesgo Crítico ({riskRanges.highMax + 1} - 25)
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Los riesgos críticos incluyen automáticamente todos los valores desde {riskRanges.highMax + 1} hasta 25 (máximo posible).
            </p>
          </div>

          {/* Vista previa de rangos */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <h4 className="text-sm font-medium mb-3">Vista previa de clasificación:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span><strong>Bajo:</strong> 1-{riskRanges.lowMax}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span><strong>Medio:</strong> {riskRanges.lowMax + 1}-{riskRanges.mediumMax}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded"></div>
                  <span><strong>Alto:</strong> {riskRanges.mediumMax + 1}-{riskRanges.highMax}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span><strong>Crítico:</strong> {riskRanges.highMax + 1}-25</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Aviso sobre impacto en cálculos ponderados */}
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <Calculator className="h-5 w-5 text-amber-600" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-amber-900">Impacto en cálculos de agregación</h4>
                  <p className="text-sm text-amber-800">
                    Al cambiar estos rangos, la clasificación de riesgos (bajo/medio/alto/crítico) cambiará automáticamente. 
                    Si tienes configurado el <strong>método de agregación ponderado</strong> en "Agregación de Riesgos por Proceso", 
                    los pesos se aplicarán según la nueva clasificación, lo que puede afectar los valores acumulados de los procesos.
                  </p>
                  <p className="text-xs text-amber-700 mt-2">
                    💡 Tip: Revisa la configuración de ponderación después de cambiar estos rangos para asegurar que los pesos sigan siendo apropiados.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

              {/* Botones de acción */}
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleSaveRiskRanges} 
                  disabled={!hasRiskRangeChanges || updateRiskRangesMutation.isPending}
                  data-testid="button-save-risk-ranges"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateRiskRangesMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={resetRiskRangesToDefaults}
                  disabled={!hasRiskRangeChanges}
                  data-testid="button-reset-risk-ranges"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restaurar Valores
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decimals">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Decimales</CardTitle>
              <CardDescription>
                Controla cómo se muestran los valores de riesgo (inherente y residual) en toda la aplicación.
                Estos cambios se aplicarán inmediatamente en matrices, reportes y dashboards.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="decimals-enabled" className="text-base font-medium">
                      Mostrar decimales
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Cuando está desactivado, todos los valores de riesgo se redondean a números enteros
                    </p>
                  </div>
                  <Switch
                    id="decimals-enabled"
                    checked={decimalsEnabled}
                    onCheckedChange={setDecimalsEnabled}
                    data-testid="switch-decimals-enabled"
                  />
                </div>

                {decimalsEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="precision-select" className="text-base font-medium">
                      Precisión decimal
                    </Label>
                    <Select value={decimalsPrecision.toString()} onValueChange={(value) => setDecimalsPrecision(parseInt(value))}>
                      <SelectTrigger id="precision-select" className="w-48" data-testid="select-precision">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0 decimales (ej: 12)</SelectItem>
                        <SelectItem value="1">1 decimal (ej: 12.3)</SelectItem>
                        <SelectItem value="2">2 decimales (ej: 12.34)</SelectItem>
                        <SelectItem value="3">3 decimales (ej: 12.345)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Define cuántos dígitos decimales mostrar cuando los decimales están habilitados
                    </p>
                  </div>
                )}

                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <h4 className="text-sm font-medium">Vista previa:</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Valor ejemplo: <span className="font-mono bg-background px-2 py-1 rounded">
                      {decimalsEnabled ? (12.456789).toFixed(decimalsPrecision) : Math.round(12.456789).toString()}
                    </span></p>
                    <p>Este formato se aplicará a todos los valores de riesgo inherente y residual en la aplicación.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSaveDecimals}
                  disabled={updateDecimalsMutation.isPending || !hasDecimalChanges}
                  data-testid="button-save-decimals"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateDecimalsMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetDecimalsToDefaults}
                  disabled={!hasDecimalChanges}
                  data-testid="button-reset-decimals"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restaurar Valores
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}