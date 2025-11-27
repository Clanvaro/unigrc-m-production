import { useState, useEffect } from "react";
import { Calculator } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Types for probability weights
interface ProbabilityWeights {
  frequency: number;
  exposureAndScope: number;
  complexity: number;
  changeVolatility: number;
  vulnerabilities: number;
}

// Default values
const DEFAULT_PROBABILITY_WEIGHTS: ProbabilityWeights = {
  frequency: 25,
  exposureAndScope: 25,
  complexity: 20,
  changeVolatility: 15,
  vulnerabilities: 15
};

export default function WeightsConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Probability weights state
  const [probabilityWeights, setProbabilityWeights] = useState<ProbabilityWeights>(DEFAULT_PROBABILITY_WEIGHTS);
  const [originalProbabilityWeights, setOriginalProbabilityWeights] = useState<ProbabilityWeights>(DEFAULT_PROBABILITY_WEIGHTS);

  // Fetch probability weights
  const { data: probabilityWeightsData, isLoading: probabilityLoading } = useQuery<ProbabilityWeights>({
    queryKey: ["/api/system-config/probability-weights"]
  });

  // Update probability weights mutation
  const updateProbabilityMutation = useMutation({
    mutationFn: async (weights: ProbabilityWeights) => {
      await apiRequest("/api/system-config/probability-weights", "PUT", weights);
      return weights;
    },
    onSuccess: (data: ProbabilityWeights) => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-config/probability-weights"] });
      setOriginalProbabilityWeights(data);
      setProbabilityWeights(data);
      toast({
        title: "Pesos de probabilidad actualizados",
        description: "Los cambios se han aplicado exitosamente. Todos los riesgos han sido recalculados.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar pesos de probabilidad",
        description: error.message || "Ha ocurrido un error inesperado",
        variant: "destructive",
      });
    }
  });

  // Initialize weights when data loads
  useEffect(() => {
    if (probabilityWeightsData) {
      setProbabilityWeights(probabilityWeightsData);
      setOriginalProbabilityWeights(probabilityWeightsData);
    }
  }, [probabilityWeightsData]);

  // Calculate total
  const probabilityTotal = Object.values(probabilityWeights).reduce((sum, weight) => sum + (weight || 0), 0);

  // Handle save function
  const saveProbabilityWeights = () => {
    if (probabilityTotal !== 100) {
      toast({
        title: "Error de validación",
        description: "La suma de todos los pesos debe ser exactamente 100%",
        variant: "destructive",
      });
      return;
    }
    updateProbabilityMutation.mutate(probabilityWeights);
  };

  // Reset function
  const resetProbabilityWeights = () => {
    setProbabilityWeights(originalProbabilityWeights);
  };

  if (probabilityLoading) {
    return <div className="flex justify-center items-center h-64">Cargando configuración de pesos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <Calculator className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Configuración de Factores de Probabilidad</h1>
          <p className="text-muted-foreground">
            Configura los pesos porcentuales de cada factor utilizado para calcular la probabilidad de los riesgos.
            El impacto ahora se calcula usando el factor con el nivel más alto.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Pesos de Factores de Probabilidad</CardTitle>
              <CardDescription>
                Configura los pesos porcentuales de cada factor utilizado para calcular la probabilidad de los riesgos.
                La suma total debe ser 100%.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frecuencia de Ocurrencia (%)</Label>
                  <Input
                    id="frequency"
                    type="number"
                    min="1"
                    max="99"
                    value={probabilityWeights.frequency}
                    onChange={(e) => setProbabilityWeights(prev => ({
                      ...prev,
                      frequency: parseInt(e.target.value) || 0
                    }))}
                    data-testid="input-frequency"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exposureAndScope">Exposición y Alcance (%)</Label>
                  <Input
                    id="exposureAndScope"
                    type="number"
                    min="1"
                    max="99"
                    value={probabilityWeights.exposureAndScope}
                    onChange={(e) => setProbabilityWeights(prev => ({
                      ...prev,
                      exposureAndScope: parseInt(e.target.value) || 0
                    }))}
                    data-testid="input-exposure-scope"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complexity">Complejidad (%)</Label>
                  <Input
                    id="complexity"
                    type="number"
                    min="1"
                    max="99"
                    value={probabilityWeights.complexity}
                    onChange={(e) => setProbabilityWeights(prev => ({
                      ...prev,
                      complexity: parseInt(e.target.value) || 0
                    }))}
                    data-testid="input-complexity"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="changeVolatility">Cambio/Volatilidad (%)</Label>
                  <Input
                    id="changeVolatility"
                    type="number"
                    min="1"
                    max="99"
                    value={probabilityWeights.changeVolatility}
                    onChange={(e) => setProbabilityWeights(prev => ({
                      ...prev,
                      changeVolatility: parseInt(e.target.value) || 0
                    }))}
                    data-testid="input-change-volatility"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vulnerabilities">Vulnerabilidades (%)</Label>
                  <Input
                    id="vulnerabilities"
                    type="number"
                    min="1"
                    max="99"
                    value={probabilityWeights.vulnerabilities}
                    onChange={(e) => setProbabilityWeights(prev => ({
                      ...prev,
                      vulnerabilities: parseInt(e.target.value) || 0
                    }))}
                    data-testid="input-vulnerabilities"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={saveProbabilityWeights}
                  disabled={probabilityTotal !== 100 || updateProbabilityMutation.isPending}
                  data-testid="button-save-probability"
                >
                  {updateProbabilityMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={resetProbabilityWeights}
                  data-testid="button-reset-probability"
                >
                  Restaurar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Total:</span>
                <Badge variant={probabilityTotal === 100 ? "default" : "destructive"} data-testid="badge-probability-total">
                  {probabilityTotal}%
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Frecuencia:</span>
                  <span>{probabilityWeights.frequency}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Exposición:</span>
                  <span>{probabilityWeights.exposureAndScope}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Complejidad:</span>
                  <span>{probabilityWeights.complexity}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Cambio/Volatilidad:</span>
                  <span>{probabilityWeights.changeVolatility}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Vulnerabilidades:</span>
                  <span>{probabilityWeights.vulnerabilities}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Cálculo de Impacto</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                El impacto ahora se calcula automáticamente seleccionando el factor con el nivel más alto, 
                eliminando la necesidad de configurar pesos porcentuales para los factores de impacto.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}