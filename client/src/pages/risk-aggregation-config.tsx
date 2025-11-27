import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Save, RotateCcw, Calculator, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type AggregationMethod = 'average' | 'weighted' | 'worst_case';

interface RiskWeights {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface RiskAggregationConfig {
  method: AggregationMethod;
  weights: RiskWeights;
}

export default function RiskAggregationConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [method, setMethod] = useState<AggregationMethod>('average');
  const [weights, setWeights] = useState<RiskWeights>({
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
  });
  
  const [originalMethod, setOriginalMethod] = useState<AggregationMethod>('average');
  const [originalWeights, setOriginalWeights] = useState<RiskWeights>({
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
  });

  const { data: configData, isLoading } = useQuery<RiskAggregationConfig>({
    queryKey: ["/api/system-config/risk-aggregation"],
  });

  useEffect(() => {
    if (configData) {
      setMethod(configData.method);
      setWeights(configData.weights);
      setOriginalMethod(configData.method);
      setOriginalWeights(configData.weights);
    }
  }, [configData]);

  const updateConfigMutation = useMutation({
    mutationFn: async (config: RiskAggregationConfig) => {
      return await apiRequest("/api/system-config/risk-aggregation", "POST", config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-config/risk-aggregation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/processes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/macroprocesos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subprocesos"] });
      toast({
        title: "Configuración actualizada",
        description: "El método de agregación de riesgos ha sido actualizado exitosamente.",
      });
      setOriginalMethod(method);
      setOriginalWeights(weights);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración. Intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateConfigMutation.mutate({ method, weights });
  };

  const handleReset = () => {
    setMethod(originalMethod);
    setWeights(originalWeights);
    toast({
      title: "Valores restaurados",
      description: "Se han restaurado los valores originales.",
    });
  };

  const hasChanges = method !== originalMethod || 
    weights.critical !== originalWeights.critical ||
    weights.high !== originalWeights.high ||
    weights.medium !== originalWeights.medium ||
    weights.low !== originalWeights.low;

  // Ejemplo de cálculo para vista previa
  const exampleRisks = [
    { level: 'critical', value: 20, count: 2 },
    { level: 'high', value: 15, count: 3 },
    { level: 'medium', value: 8, count: 5 },
    { level: 'low', value: 3, count: 2 },
  ];

  const calculateExample = () => {
    const totalRisks = exampleRisks.reduce((sum, r) => sum + r.count, 0);
    const totalRiskValue = exampleRisks.reduce((sum, r) => sum + r.value * r.count, 0);

    if (method === 'average') {
      return (totalRiskValue / totalRisks).toFixed(1);
    }

    if (method === 'worst_case') {
      return Math.max(...exampleRisks.map(r => r.value)).toFixed(1);
    }

    if (method === 'weighted') {
      const weightMap = weights as Record<string, number>;
      let weightedSum = 0;
      let totalWeight = 0;

      exampleRisks.forEach(risk => {
        const weight = weightMap[risk.level] || 1;
        weightedSum += risk.value * risk.count * weight;
        totalWeight += risk.count * weight;
      });

      return totalWeight > 0 ? (weightedSum / totalWeight).toFixed(1) : '0.0';
    }

    return '0.0';
  };

  const methodDescriptions = {
    average: "Calcula el promedio aritmético simple de todos los riesgos del proceso. Todos los riesgos tienen el mismo peso independientemente de su nivel.",
    weighted: "Pondera cada riesgo según su nivel de criticidad. Los riesgos críticos tienen mayor peso en el cálculo final.",
    worst_case: "Toma el valor del riesgo más alto del proceso como riesgo agregado. Enfoque conservador que prioriza el peor escenario."
  };

  if (isLoading) {
    return <div className="p-6">Cargando configuración...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Cálculo de Riesgos Acumulados por Proceso</h1>
        <p className="text-muted-foreground">
          Configura cómo se calculan los riesgos agregados cuando un proceso tiene múltiples riesgos asociados
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Método de Agregación</CardTitle>
          <CardDescription>
            Selecciona el método para calcular el riesgo total de un proceso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="method">Método de Cálculo</Label>
            <Select value={method} onValueChange={(value) => setMethod(value as AggregationMethod)}>
              <SelectTrigger id="method" data-testid="select-aggregation-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="average" data-testid="option-average">Promedio Simple</SelectItem>
                <SelectItem value="weighted" data-testid="option-weighted">Ponderado por Nivel</SelectItem>
                <SelectItem value="worst_case" data-testid="option-worst-case">Peor Caso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Método seleccionado:</strong> {methodDescriptions[method]}
            </AlertDescription>
          </Alert>

          {method === 'weighted' && (
            <div className="space-y-6 border-t pt-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Pesos por Nivel de Riesgo</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Ajusta el peso que tendrá cada nivel de riesgo en el cálculo. Mayor peso significa mayor influencia.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="weight-critical">Crítico</Label>
                    <span className="text-sm text-muted-foreground" data-testid="text-weight-critical">{weights.critical}</span>
                  </div>
                  <Slider
                    id="weight-critical"
                    data-testid="slider-weight-critical"
                    min={1}
                    max={10}
                    step={1}
                    value={[weights.critical]}
                    onValueChange={(value) => setWeights({ ...weights, critical: value[0] })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="weight-high">Alto</Label>
                    <span className="text-sm text-muted-foreground" data-testid="text-weight-high">{weights.high}</span>
                  </div>
                  <Slider
                    id="weight-high"
                    data-testid="slider-weight-high"
                    min={1}
                    max={10}
                    step={1}
                    value={[weights.high]}
                    onValueChange={(value) => setWeights({ ...weights, high: value[0] })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="weight-medium">Medio</Label>
                    <span className="text-sm text-muted-foreground" data-testid="text-weight-medium">{weights.medium}</span>
                  </div>
                  <Slider
                    id="weight-medium"
                    data-testid="slider-weight-medium"
                    min={1}
                    max={10}
                    step={1}
                    value={[weights.medium]}
                    onValueChange={(value) => setWeights({ ...weights, medium: value[0] })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="weight-low">Bajo</Label>
                    <span className="text-sm text-muted-foreground" data-testid="text-weight-low">{weights.low}</span>
                  </div>
                  <Slider
                    id="weight-low"
                    data-testid="slider-weight-low"
                    min={1}
                    max={10}
                    step={1}
                    value={[weights.low]}
                    onValueChange={(value) => setWeights({ ...weights, low: value[0] })}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Vista Previa del Cálculo</h3>
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <p className="text-sm font-medium">Ejemplo con los siguientes riesgos:</p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• 2 riesgos críticos (valor: 20)</li>
                <li>• 3 riesgos altos (valor: 15)</li>
                <li>• 5 riesgos medios (valor: 8)</li>
                <li>• 2 riesgos bajos (valor: 3)</li>
              </ul>
              <div className="pt-3 border-t border-border">
                <p className="text-sm font-semibold">
                  Riesgo Agregado del Proceso: <span className="text-lg text-primary" data-testid="text-preview-result">{calculateExample()}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges || updateConfigMutation.isPending}
              data-testid="button-save"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateConfigMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
            <Button 
              onClick={handleReset} 
              variant="outline"
              disabled={!hasChanges}
              data-testid="button-reset"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Restaurar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
