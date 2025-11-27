import { useRiskMath, RiskBand } from "@/hooks/useRiskMath";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface RiskLegendProps {
  className?: string;
  showTitle?: boolean;
  compact?: boolean;
}

export function RiskLegend({ className = "", showTitle = true, compact = false }: RiskLegendProps) {
  const { getBands } = useRiskMath();
  const bands = getBands();

  if (compact) {
    return (
      <div className={`flex gap-4 items-center ${className}`} data-testid="risk-legend-compact">
        {bands.map((band) => (
          <div key={band.label} className="flex items-center gap-2" data-testid={`legend-item-${band.label.toLowerCase()}`}>
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: band.color }}
              aria-label={`Color ${band.label}`}
            />
            <span className="text-sm font-medium">
              {band.label}
            </span>
            <span className="text-xs text-muted-foreground">
              ({band.min}-{band.max})
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card className={className} data-testid="risk-legend">
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Leyenda de Niveles de Riesgo</CardTitle>
          <CardDescription>
            Clasificación basada en la puntuación calculada (Probabilidad × Impacto)
          </CardDescription>
        </CardHeader>
      )}
      <CardContent>
        <div className="space-y-3">
          {bands.map((band) => (
            <div
              key={band.label}
              className="flex items-center justify-between p-3 rounded-lg border"
              data-testid={`legend-item-${band.label.toLowerCase()}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: band.color }}
                  aria-label={`Color ${band.label}`}
                />
                <div>
                  <div className="font-semibold">{band.label}</div>
                  <div className="text-sm text-muted-foreground">
                    Rango: {band.min} - {band.max}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
