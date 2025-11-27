import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Save, RotateCcw, Calculator } from "lucide-react";

interface ImpactWeights {
  infrastructure: number;   // 15%
  reputation: number;       // 15%
  economic: number;         // 25%
  permits: number;          // 20%
  knowhow: number;          // 10%
  people: number;           // 10%
  information: number;      // 5%
}

const DEFAULT_WEIGHTS: ImpactWeights = {
  infrastructure: 15,
  reputation: 15,
  economic: 25,
  permits: 20,
  knowhow: 10,
  people: 10,
  information: 5,
};

const FACTOR_DESCRIPTIONS = {
  infrastructure: "Infraestructura - Interrupción de operaciones y funcionamiento",
  reputation: "Reputación - Cobertura mediática y percepción pública", 
  economic: "Económico - Pérdidas financieras directas e indirectas",
  permits: "Permisos - Impacto regulatorio y legal",
  knowhow: "Knowhow - Transferencia no autorizada de conocimiento",
  people: "Personas - Impacto en salud, seguridad y bienestar",
  information: "Información - Filtración y pérdida de datos",
};

const FACTOR_LABELS = {
  infrastructure: "Infraestructura",
  reputation: "Reputación",
  economic: "Económico", 
  permits: "Permisos",
  knowhow: "Knowhow",
  people: "Personas",
  information: "Información",
};

export default function ImpactWeightsConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [weights, setWeights] = useState<ImpactWeights>(DEFAULT_WEIGHTS);
  const [originalWeights, setOriginalWeights] = useState<ImpactWeights>(DEFAULT_WEIGHTS);

  // Obtener pesos de impacto desde la configuración del sistema
  const { data: weightsData, isLoading } = useQuery<ImpactWeights>({
    queryKey: ["/api/system-config/impact-weights"],
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
    mutationFn: async (newWeights: ImpactWeights) => {
      return await apiRequest("/api/system-config/impact-weights", "PUT", newWeights);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-config/impact-weights"] });
      // También invalidar el cache de riesgos para que se recalculen
      queryClient.invalidateQueries({ queryKey: ["/api/risks"] });
      toast({
        title: "Configuración guardada",
        description: "Los pesos de impacto han sido actualizados exitosamente.",
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

  // Función para actualizar peso individual
  const updateWeight = (factor: keyof ImpactWeights, value: number) => {
    setWeights(prev => ({
      ...prev,
      [factor]: Math.max(0, Math.min(100, value))
    }));
  };

  // Función para distribución automática de pesos restantes
  const distributeRemaining = (changedFactor: keyof ImpactWeights, newValue: number) => {
    const remaining = 100 - newValue;
    const otherFactors = Object.keys(weights).filter(key => key !== changedFactor) as (keyof ImpactWeights)[];
    const currentOtherTotal = otherFactors.reduce((sum, factor) => sum + weights[factor], 0);
    
    if (currentOtherTotal > 0 && remaining >= 0) {
      const ratio = remaining / currentOtherTotal;
      const newWeights = { ...weights, [changedFactor]: newValue };
      
      otherFactors.forEach(factor => {
        newWeights[factor] = Math.round(weights[factor] * ratio);
      });
      
      setWeights(newWeights);
    } else {
      updateWeight(changedFactor, newValue);
    }
  };

  const hasChanges = JSON.stringify(weights) !== JSON.stringify(originalWeights);

  if (isLoading) {
    return <div className="text-center">Cargando configuración...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-muted-foreground mb-2">
          Configuración de Pesos - Factores de Impacto
        </h1>
        <p className="text-muted-foreground">
          Configura el peso porcentual que cada factor tiene en el cálculo final del impacto de los riesgos.
          La suma total debe ser igual a 100%.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Pesos de Factores de Impacto
          </CardTitle>
          <CardDescription>
            Ajusta la importancia relativa de cada factor en el cálculo de impacto.
            Total actual: <span className={`font-medium ${totalWeight === 100 ? 'text-green-600' : 'text-red-600'}`}>
              {totalWeight}%
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {(Object.keys(FACTOR_LABELS) as Array<keyof ImpactWeights>).map((factor) => (
            <div key={factor} className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-sm">
                    {FACTOR_LABELS[factor]}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {FACTOR_DESCRIPTIONS[factor]}
                  </p>
                </div>
                <div className="flex items-center gap-2 min-w-[120px]">
                  <Input
                    type="number"
                    value={weights[factor]}
                    onChange={(e) => updateWeight(factor, parseInt(e.target.value) || 0)}
                    className="w-16 h-8 text-center"
                    min="0"
                    max="100"
                    data-testid={`input-weight-${factor}`}
                  />
                  <span className="text-sm font-medium">%</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Slider
                  value={[weights[factor]]}
                  onValueChange={(value) => updateWeight(factor, value[0])}
                  max={100}
                  step={1}
                  className="flex-1"
                  data-testid={`slider-weight-${factor}`}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              <button
                onClick={() => distributeRemaining(factor, weights[factor])}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
                data-testid={`button-distribute-${factor}`}
              >
                Ajustar otros factores automáticamente
              </button>
            </div>
          ))}

          <div className="border-t pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || totalWeight !== 100 || updateMutation.isPending}
                className="flex-1"
                data-testid="button-save-weights"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? "Guardando..." : "Guardar Configuración"}
              </Button>
              
              <Button
                variant="outline"
                onClick={resetToDefaults}
                disabled={!hasChanges}
                data-testid="button-reset-original"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurar
              </Button>
              
              <Button
                variant="outline"
                onClick={resetToSystemDefaults}
                data-testid="button-reset-defaults"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Valores por Defecto
              </Button>
            </div>
            
            {totalWeight !== 100 && (
              <p className="text-sm text-red-600 mt-3">
                ⚠️ La suma debe ser exactamente 100% para poder guardar los cambios.
                Actual: {totalWeight}%
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}