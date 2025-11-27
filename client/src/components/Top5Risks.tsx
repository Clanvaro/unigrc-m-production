import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { getRiskLevelText, getRiskColor } from "@/lib/risk-calculations";
import { RiskValue } from "@/components/RiskValue";
import type { Risk, Process } from "@shared/schema";

interface RiskWithProcess extends Risk {
  process?: Process;
}

interface Top5RisksProps {
  showHeader?: boolean;
  compact?: boolean;
  className?: string;
}

export function Top5Risks({ showHeader = true, compact = false, className = "" }: Top5RisksProps) {
  const { data: risksResponse, isLoading: risksLoading } = useQuery<{ data: Risk[], pagination: { limit: number, offset: number, total: number } }>({
    queryKey: ["/api/risks"],
  });
  const risks = risksResponse?.data || [];

  const { data: processes = [] } = useQuery<Process[]>({
    queryKey: ["/api/processes"],
  });

  if (risksLoading) {
    return (
      <Card className={className} data-testid="card-top5-risks-loading">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Cargando top 5 riesgos...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get top 5 risks by inherent risk value
  const top5Risks: RiskWithProcess[] = risks
    .sort((a, b) => (b.inherentRisk || 0) - (a.inherentRisk || 0))
    .slice(0, 5)
    .map(risk => ({
      ...risk,
      process: processes.find(p => p.id === risk.processId)
    }));

  if (top5Risks.length === 0) {
    return (
      <Card className={className} data-testid="card-top5-risks-empty">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top 5 Riesgos Críticos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay riesgos registrados</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} data-testid="card-top5-risks">
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top 5 Riesgos Críticos
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={compact ? "p-4" : "p-6"}>
        <div className="space-y-4">
          {top5Risks.map((risk, index) => (
            <div 
              key={risk.id} 
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              data-testid={`risk-item-${index + 1}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm bg-primary/10 text-primary px-2 py-1 rounded">
                    #{index + 1}
                  </span>
                  <span className="font-medium text-sm" data-testid={`risk-name-${index + 1}`}>
                    {risk.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span data-testid={`risk-code-${index + 1}`}>{risk.code}</span>
                  {risk.process && (
                    <>
                      <span>•</span>
                      <span data-testid={`risk-process-${index + 1}`}>{risk.process.name}</span>
                    </>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Badge 
                    className={`text-xs ${getRiskColor(risk.inherentRisk)}`}
                    data-testid={`risk-level-${index + 1}`}
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {getRiskLevelText(risk.inherentRisk)}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold" data-testid={`risk-value-${index + 1}`}>
                  <RiskValue value={risk.inherentRisk} />
                </div>
                <div className="text-xs text-muted-foreground">
                  Riesgo Inherente
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Summary */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium" data-testid="text-avg-risk">
                <RiskValue value={top5Risks.reduce((sum, risk) => sum + (risk.inherentRisk || 0), 0) / top5Risks.length} />
              </div>
              <div className="text-xs text-muted-foreground">Promedio Top 5</div>
            </div>
            <div className="text-center">
              <div className="font-medium" data-testid="text-highest-risk">
                <RiskValue value={top5Risks[0]?.inherentRisk || 0} />
              </div>
              <div className="text-xs text-muted-foreground">Riesgo Más Alto</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}