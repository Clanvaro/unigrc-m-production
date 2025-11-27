import { useLocation } from "wouter";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, Shield, ListChecks, ArrowRight } from "lucide-react";
import { useRiskMath } from "@/hooks/useRiskMath";

export interface RiskCellItem {
  id: string;
  code: string;
  name: string;
  probability: number;
  impact: number;
  inherentRisk: number;
  controlEffectiveness: number[];
  controls?: Array<{effectiveness: number, effectTarget: string}>;
  residualProbability?: number;
  residualImpact?: number;
}

interface RiskCellDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  probability: number;
  impact: number;
  mode: 'inherent' | 'residual';
  risks: RiskCellItem[];
}

export function RiskCellDrawer({
  open,
  onOpenChange,
  probability,
  impact,
  mode,
  risks,
}: RiskCellDrawerProps) {
  const [, setLocation] = useLocation();
  const { classify, combineControls, residualFromControls, colorFor } = useRiskMath();

  const handleViewRisk = (riskId: string) => {
    setLocation(`/risks?id=${riskId}`);
    onOpenChange(false);
  };

  const scoreForRisk = (risk: RiskCellItem) => {
    if (mode === 'inherent') {
      return risk.inherentRisk;
    }
    // Si no hay controles, el residual es igual al inherente
    if (!risk.controlEffectiveness || risk.controlEffectiveness.length === 0) {
      return risk.inherentRisk;
    }
    // Combinar efectividades y calcular residual
    const combinedEffectiveness = combineControls(risk.controlEffectiveness);
    const residualScore = residualFromControls(risk.inherentRisk, combinedEffectiveness);
    return residualScore;
  };

  const inherentScore = probability * impact;
  const band = classify(mode === 'inherent' ? inherentScore : risks[0] ? scoreForRisk(risks[0]) : inherentScore);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl" data-testid="risk-cell-drawer">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Riesgos en Celda P{probability} × I{impact}
            <Badge
              style={{ backgroundColor: band.color }}
              className="text-white"
              data-testid="cell-band-badge"
            >
              {band.label}
            </Badge>
          </SheetTitle>
          <SheetDescription>
            {mode === 'inherent' ? 'Riesgo Inherente' : 'Riesgo Residual'} • {risks.length} {risks.length === 1 ? 'riesgo' : 'riesgos'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] mt-6 pr-4">
          <div className="space-y-4">
            {risks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="no-risks-message">
                No hay riesgos en esta celda
              </div>
            ) : (
              risks.map((risk) => {
                const riskScore = scoreForRisk(risk);
                const riskBand = classify(riskScore);
                const effectivenessReduction = combineControls(risk.controlEffectiveness || []);

                return (
                  <div
                    key={risk.id}
                    className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
                    data-testid={`risk-item-${risk.code}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" data-testid={`risk-code-${risk.code}`}>
                            {risk.code}
                          </Badge>
                          <Badge
                            style={{ backgroundColor: riskBand.color }}
                            className="text-white"
                            data-testid={`risk-band-${risk.code}`}
                          >
                            {riskBand.label}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-sm" data-testid={`risk-name-${risk.code}`}>
                          {risk.name}
                        </h4>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Inherente:</span>
                        <span className="ml-1 font-medium" data-testid={`risk-inherent-${risk.code}`}>
                          {risk.inherentRisk}
                        </span>
                      </div>
                      {mode === 'residual' && (
                        <div>
                          <span className="text-muted-foreground">Residual:</span>
                          <span className="ml-1 font-medium" data-testid={`risk-residual-${risk.code}`}>
                            {riskScore}
                          </span>
                        </div>
                      )}
                    </div>

                    {risk.controlEffectiveness.length > 0 && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Efectividad controles:</span>
                        <span className="ml-1 font-medium" data-testid={`risk-effectiveness-${risk.code}`}>
                          {(effectivenessReduction * 100).toFixed(0)}%
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                          ({risk.controlEffectiveness.length} {risk.controlEffectiveness.length === 1 ? 'control' : 'controles'})
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewRisk(risk.id)}
                        data-testid={`button-view-risk-${risk.code}`}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Ver Riesgo
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="mt-4 pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            <strong>Acciones rápidas:</strong> Selecciona un riesgo para ver detalles completos
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
