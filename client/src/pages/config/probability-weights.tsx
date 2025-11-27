import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Save, RotateCcw, Calculator } from "lucide-react";

interface ProbabilityWeights {
  frequency: number;           // 25%
  exposureAndScope: number;    // 25%
  complexity: number;          // 20%
  changeVolatility: number;    // 15%
  vulnerabilities: number;     // 15%
}

const DEFAULT_WEIGHTS: ProbabilityWeights = {
  frequency: 25,
  exposureAndScope: 25,
  complexity: 20,
  changeVolatility: 15,
  vulnerabilities: 15,
};

const FACTOR_DESCRIPTIONS = {
  frequency: "Frecuencia de Ocurrencia - Qué tan frecuente es que ocurra el riesgo",
  exposureAndScope: "Exposición y Alcance - Volumen/valor afectado, masividad y ruta crítica",
  complexity: "Complejidad e Interdependencias - Sistemas, integraciones y automatización",
  changeVolatility: "Cambio/Volatilidad - Estabilidad del entorno y proximidad temporal",
  vulnerabilities: "Vulnerabilidades/Predisposiciones - Tecnología, controles y rotación",
};

const FACTOR_LABELS = {
  frequency: "Frecuencia de Ocurrencia",
  exposureAndScope: "Exposición y Alcance",
  complexity: "Complejidad",
  changeVolatility: "Cambio/Volatilidad",
  vulnerabilities: "Vulnerabilidades",
};

export default function ProbabilityWeightsConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [weights, setWeights] = useState<ProbabilityWeights>(DEFAULT_WEIGHTS);
  const [originalWeights, setOriginalWeights] = useState<ProbabilityWeights>(DEFAULT_WEIGHTS);

  // Obtener pesos de probabilidad desde la configuración del sistema
  const { data: weightsData, isLoading } = useQuery<ProbabilityWeights>({
    queryKey: ["/api/system-config/probability-weights"],
  });

  // Calcular peso total
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + (weight || 0), 0);

  // Inicializar pesos cuando se cargan desde el backend
  useEffect(() => {
    if (weightsData) {
      setWeights(weightsData);
      setOriginalWeights(weightsData);
    }
  }, [weightsData]);

  // Mutación para actualizar pesos
  const updateMutation = useMutation({
    mutationFn: async (newWeights: ProbabilityWeights) => {
      return await apiRequest("/api/system-config/probability-weights", "PUT", newWeights);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-config/probability-weights"] });
      // También invalidar el cache de riesgos para que se recalculen
      queryClient.invalidateQueries({ queryKey: ["/api/risks"] });
      toast({
        title: "Configuración guardada",
        description: "Los pesos de probabilidad han sido actualizados exitosamente.",
      });
      // Actualizar los valores originales
      setOriginalWeights(weights);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración. Intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  const handleSave = async () => {
    if (totalWeight !== 100) {
      toast({
        title: "Error de validación",
        description: "La suma de todos los pesos debe ser igual a 100%",
        variant: "destructive",
      });
      return;
    }

    // Validar que todos los pesos sean mayores a 0
    const invalidWeights = Object.entries(weights).filter(([_, weight]) => weight <= 0);
    if (invalidWeights.length > 0) {
      toast({
        title: "Error de validación",
        description: "Todos los pesos deben ser mayores a 0%",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate(weights);
  };

  const resetToDefaults = () => {
    setWeights(originalWeights);
    toast({
      title: "Valores restaurados",
      description: "Se han restaurado los valores originales.",
    });
  };

  const resetToSystemDefaults = () => {
    setWeights(DEFAULT_WEIGHTS);
    toast({
      title: "Valores por defecto restaurados",
      description: "Se han restaurado los valores por defecto del sistema.",
    });
  };

  const updateWeight = (factor: keyof ProbabilityWeights, newWeight: number) => {
    setWeights(prev => ({
      ...prev,
      [factor]: newWeight
    }));
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Cargando configuración de pesos de probabilidad...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Calculator className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Pesos de Factores de Probabilidad</CardTitle>
                  <CardDescription>
                    Configura los pesos porcentuales de cada factor utilizado para calcular la probabilidad de los riesgos.
                    La suma total debe ser 100%.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {(Object.keys(FACTOR_LABELS) as Array<keyof ProbabilityWeights>).map((factor) => (
                  <div key={factor} className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <label className="text-sm font-medium">
                          {FACTOR_LABELS[factor]} ({weights[factor]}%)
                        </label>
                        <p className="text-xs text-muted-foreground">
                          {FACTOR_DESCRIPTIONS[factor]}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <Slider
                          value={[weights[factor]]}
                          onValueChange={(value) => updateWeight(factor, value[0])}
                          max={100}
                          step={1}
                          data-testid={`slider-${factor}`}
                        />
                      </div>
                      <div className="w-20">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={weights[factor]}
                          onChange={(e) => updateWeight(factor, parseInt(e.target.value) || 0)}
                          data-testid={`input-${factor}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <Card className={`${totalWeight === 100 ? 'border-green-200 bg-green-50' : totalWeight > 100 ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Total de Pesos:</span>
                      <span className={`text-lg font-bold ${totalWeight === 100 ? 'text-green-600' : totalWeight > 100 ? 'text-red-600' : 'text-yellow-600'}`}>
                        {totalWeight}%
                      </span>
                    </div>
                    {totalWeight !== 100 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {totalWeight > 100 ? 'La suma supera el 100%. ' : 'La suma es menor al 100%. '}
                        Ajusta los valores para que sumen exactamente 100%.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleSave}
                    disabled={updateMutation.isPending || totalWeight !== 100}
                    data-testid="button-save-config"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateMutation.isPending ? "Guardando..." : "Guardar Configuración"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={resetToDefaults}
                    data-testid="button-reset-config"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restaurar Valores Originales
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={resetToSystemDefaults}
                    data-testid="button-reset-system-defaults"
                  >
                    Restaurar Por Defecto
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-2">¿Cómo se calcula la probabilidad?</h4>
                <p className="text-sm text-muted-foreground">
                  La probabilidad final se calcula aplicando estos pesos a cada factor evaluado (1-5), 
                  donde "Exposición y Alcance" es el promedio de volumen, masividad y ruta crítica.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-sm mb-2">Factores Actuales</h4>
                <div className="space-y-2">
                  {(Object.keys(FACTOR_LABELS) as Array<keyof ProbabilityWeights>).map((factor) => (
                    <div key={factor} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{FACTOR_LABELS[factor]}:</span>
                      <span className="font-medium">{weights[factor]}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Estado de la Configuración</h4>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${totalWeight === 100 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <span className="text-sm text-muted-foreground">
                    {totalWeight === 100 ? 'Configuración válida' : 'Requiere ajustes'}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Impacto de los Cambios</h4>
                <p className="text-sm text-muted-foreground">
                  Al guardar esta configuración, se recalcularán automáticamente las probabilidades 
                  de todos los riesgos que usen el método de evaluación por factores.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}