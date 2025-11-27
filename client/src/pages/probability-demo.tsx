import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import ProbabilityHeatMap from "@/components/probability/ProbabilityHeatMap";
import ProbabilityWheel from "@/components/probability/ProbabilityWheel";
import ProbabilityWheelNew from "@/components/probability/ProbabilityWheelNew";
import ImpactWheel from "@/components/probability/ImpactWheel";
import { calculateInherentRisk, getRiskLevelText } from "@/lib/risk-calculations";
import type { ProbabilityFactors } from "@shared/probability-calculation";
import type { ImpactFactors } from "@shared/impact-calculation";

export default function ProbabilityDemo() {
  const [heatMapFactors, setHeatMapFactors] = useState<ProbabilityFactors>({
    frequencyOccurrence: 3,
    exposureVolume: 3,
    exposureMassivity: 3,
    exposureCriticalPath: 3,
    complexity: 3,
    changeVolatility: 3,
    vulnerabilities: 3
  });

  const [wheelFactors, setWheelFactors] = useState<ProbabilityFactors>({
    frequencyOccurrence: 3,
    exposureVolume: 3,
    exposureMassivity: 3,
    exposureCriticalPath: 3,
    complexity: 3,
    changeVolatility: 3,
    vulnerabilities: 3
  });

  const [selectedImpact] = useState(3); // Para el cálculo del riesgo inherente

  const resetBoth = () => {
    const defaultFactors: ProbabilityFactors = {
      frequencyOccurrence: 3,
      exposureVolume: 3,
      exposureMassivity: 3,
      exposureCriticalPath: 3,
      complexity: 3,
      changeVolatility: 3,
      vulnerabilities: 3
    };
    setHeatMapFactors(defaultFactors);
    setWheelFactors(defaultFactors);
  };

  const heatMapInherentRisk = calculateInherentRisk(heatMapFactors.frequencyOccurrence || 3, selectedImpact);
  const wheelInherentRisk = calculateInherentRisk(wheelFactors.frequencyOccurrence || 3, selectedImpact);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4">
            <Link href="/risks">
              <Button variant="ghost" size="sm" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a Riesgos
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Demo: Tamaños de Ruedas Interactivas</h1>
              <p className="text-muted-foreground mt-1">
                Compara diferentes tamaños para las ruedas de Probabilidad e Impacto
              </p>
            </div>
          </div>
        </div>
        <Button onClick={resetBoth} variant="outline" data-testid="button-reset">
          <RotateCcw className="h-4 w-4 mr-2" />
          Resetear Todas
        </Button>
      </div>

      {/* Descripción */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <h3 className="font-semibold text-xl mb-4">📏 Comparación de Tamaños de Ruedas</h3>
            <p className="text-muted-foreground max-w-4xl mx-auto">
              Aquí puedes ver las ruedas de Probabilidad e Impacto en diferentes tamaños y configuraciones. 
              Todas son funcionales - haz clic en los segmentos para probar la interactividad.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Ruedas Lado a Lado - Tamaño Medium (Actual) */}
      <Card>
        <CardHeader>
          <CardTitle>📐 Tamaño Actual - Medium</CardTitle>
          <CardDescription>
            Configuración actual: size="medium" + max-w-lg (512px) + breakpoint xl (1280px)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <ProbabilityWheelNew size="medium" />
            <ImpactWheel size="medium" />
          </div>
        </CardContent>
      </Card>

      {/* Ruedas Lado a Lado - Tamaño Large */}
      <Card>
        <CardHeader>
          <CardTitle>📏 Propuesta 1 - Large</CardTitle>
          <CardDescription>
            Configuración: size="large" + max-w-2xl (672px) + breakpoint xl - Ruedas 30% más grandes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <ProbabilityWheelNew size="large" />
            <ImpactWheel size="large" />
          </div>
        </CardContent>
      </Card>

      {/* Ruedas con Breakpoint Mejorado */}
      <Card>
        <CardHeader>
          <CardTitle>📱 Propuesta 2 - Large + Breakpoint Mejorado</CardTitle>
          <CardDescription>
            Configuración: size="large" + breakpoint lg (1024px) - Se ponen lado a lado más temprano
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <ProbabilityWheelNew size="large" />
            <ImpactWheel size="large" />
          </div>
        </CardContent>
      </Card>

      {/* Ruedas con Contenedor Más Grande */}
      <Card>
        <CardHeader>
          <CardTitle>🖥️ Propuesta 3 - Large + Contenedor Expandido</CardTitle>
          <CardDescription>
            Configuración: size="large" + max-w-7xl + gap-10 - Máximo espacio disponible
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-7xl mx-auto">
            <ProbabilityWheelNew size="large" />
            <ImpactWheel size="large" />
          </div>
        </CardContent>
      </Card>

      {/* Análisis de Opciones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📊 Análisis de las Opciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-semibold mb-3 text-green-600">✅ Recomendación: Propuesta 2</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>• <strong>Tamaño óptimo:</strong> 30% más grandes que la versión actual</li>
                <li>• <strong>Responsividad:</strong> Se acomodan mejor en pantallas medianas</li>
                <li>• <strong>Usabilidad:</strong> Más fáciles de usar en tablets y laptops</li>
                <li>• <strong>Balance:</strong> No demasiado grandes para dispositivos pequeños</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">🎯 Detalles Técnicos</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>• <strong>Actual:</strong> max-w-lg (512px) en xl+ (1280px+)</li>
                <li>• <strong>Propuesta 2:</strong> max-w-2xl (672px) en lg+ (1024px+)</li>
                <li>• <strong>Diferencia:</strong> +160px de ancho por rueda</li>
                <li>• <strong>Breakpoint:</strong> Cambia de xl (1280px) a lg (1024px)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Card className="border-primary">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">¿Cuál tamaño prefieres?</h3>
            <p className="text-muted-foreground mb-4">
              Interactúa con las ruedas en cada sección para sentir la diferencia. 
              Todas son completamente funcionales - haz clic en los segmentos para probar.
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              <Button variant="outline" data-testid="button-prefer-actual">
                Mantener Actual
              </Button>
              <Button variant="default" data-testid="button-prefer-proposal2">
                Usar Propuesta 2 (Recomendada)
              </Button>
              <Button variant="outline" data-testid="button-prefer-proposal3">
                Usar Propuesta 3
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}