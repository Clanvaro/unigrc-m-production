import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, Calculator, CheckCircle, Clock, XCircle } from "lucide-react";
import { RiskValue } from "@/components/RiskValue";
import { ExplanationPopover } from "@/components/ExplanationPopover";
import { getRiskColor } from "./OrganizationUtils";

export interface RiskIndicatorProps {
  inherentRisk?: number;
  residualRisk?: number;
  riskCount?: number;
  size?: "xs" | "sm" | "md";
  onRiskCountClick?: () => void;
  entityName?: string;
  entityType?: string;
  risks?: any[];
}

export function RiskIndicator({ 
  inherentRisk = 0, 
  residualRisk = 0, 
  riskCount = 0,
  size = "sm",
  onRiskCountClick,
  entityName,
  entityType,
  risks = []
}: RiskIndicatorProps) {
  if (riskCount === 0) {
    return (
      <div className="flex items-center gap-1">
        <Badge variant="outline" className={`text-xs ${size === "xs" ? "px-1 py-0" : ""}`}>
          <Shield className={`h-3 w-3 mr-1 ${size === "xs" ? "h-2 w-2" : ""}`} />
          Sin riesgos
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Badge className={`text-xs ${getRiskColor(inherentRisk)} ${size === "xs" ? "px-1 py-0" : ""}`}>
        <AlertTriangle className={`h-3 w-3 mr-1 ${size === "xs" ? "h-2 w-2" : ""}`} />
        I: <RiskValue value={inherentRisk} />
      </Badge>
      <Badge className={`text-xs ${getRiskColor(residualRisk)} ${size === "xs" ? "px-1 py-0" : ""}`}>
        <Shield className={`h-3 w-3 mr-1 ${size === "xs" ? "h-2 w-2" : ""}`} />
        R: <RiskValue value={residualRisk} />
      </Badge>
      <Badge 
        variant="secondary" 
        className={`text-xs ${size === "xs" ? "px-1 py-0" : ""} ${riskCount > 0 ? "cursor-pointer hover:bg-secondary/80" : ""}`}
        onClick={riskCount > 0 ? onRiskCountClick : undefined}
        data-testid="badge-risk-count"
      >
        {riskCount} riesgo{riskCount !== 1 ? "s" : ""}
      </Badge>
      {riskCount > 0 && entityName && (
        <ExplanationPopover
          title={`Agregación de Riesgos - ${entityType || 'Entidad'}`}
          description={`Este valor se calcula agregando ${riskCount} riesgo${riskCount > 1 ? 's' : ''} del ${entityType?.toLowerCase() || 'entidad'} "${entityName}"`}
          formula="Riesgo Agregado = PROMEDIO(Riesgos)"
          calculationSteps={risks.length > 0 ? [
            ...risks.map((r, i) => ({
              label: `Riesgo ${i + 1}: ${r.code || r.name || 'Sin nombre'}`,
              value: `Inherente: ${r.inherentRisk?.toFixed(1) || 'N/A'}`,
              formula: r.residualRisk ? `Residual: ${r.residualRisk?.toFixed(1)}` : undefined
            })),
            {
              label: 'Riesgo Inherente Agregado',
              formula: `AVG(${risks.map(r => r.inherentRisk?.toFixed(1) || 0).join(', ')})`,
              value: inherentRisk.toFixed(1)
            },
            {
              label: 'Riesgo Residual Agregado',
              formula: `AVG(${risks.map(r => r.residualRisk?.toFixed(1) || r.inherentRisk?.toFixed(1) || 0).join(', ')})`,
              value: residualRisk.toFixed(1)
            }
          ] : [
            {
              label: `${riskCount} riesgo${riskCount > 1 ? 's' : ''} asociado${riskCount > 1 ? 's' : ''}`,
              value: `Inherente: ${inherentRisk.toFixed(1)}, Residual: ${residualRisk.toFixed(1)}`
            }
          ]}
          dataSource={{
            table: 'risks',
            query: `SELECT AVG(inherent_risk), AVG(residual_risk) FROM risks WHERE ${entityType?.toLowerCase()}_id = '...'`,
            timestamp: new Date().toLocaleString()
          }}
          relatedEntities={risks.slice(0, 3).map(r => ({
            type: 'Riesgo',
            id: r.id || '',
            name: r.code || r.name || 'N/A'
          }))}
        />
      )}
    </div>
  );
}

export interface ResidualRiskIndicatorProps {
  level: number;
  color: string;
  label: string;
  size?: "xs" | "sm" | "md";
  onClick?: () => void;
}

export function ResidualRiskIndicator({ 
  level,
  color,
  label,
  size = "sm",
  onClick 
}: ResidualRiskIndicatorProps) {
  return (
    <Badge 
      className={`text-xs ${color} ${size === "xs" ? "px-1 py-0" : ""} ${onClick ? "cursor-pointer hover:opacity-80" : ""}`}
      onClick={onClick}
      data-testid={`residual-risk-${label.toLowerCase()}`}
    >
      <Calculator className={`h-3 w-3 mr-1 ${size === "xs" ? "h-2 w-2" : ""}`} />
      R: {label} {level > 0 && level}
    </Badge>
  );
}

export interface ValidationIndicatorProps {
  status: string;
  completionPercentage?: number;
  size?: "xs" | "sm" | "md";
  onClick?: () => void;
}

export function ValidationIndicator({ 
  status,
  completionPercentage = 0,
  size = "sm",
  onClick 
}: ValidationIndicatorProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed":
        return { 
          icon: CheckCircle, 
          color: "bg-green-100 text-green-700", 
          label: "Validado" 
        };
      case "in_progress":
        return { 
          icon: Clock, 
          color: "bg-yellow-100 text-yellow-700", 
          label: "En Progreso" 
        };
      case "requires_review":
        return { 
          icon: AlertTriangle, 
          color: "bg-orange-100 text-orange-700", 
          label: "Requiere Revisión" 
        };
      case "not_started":
      default:
        return { 
          icon: XCircle, 
          color: "bg-gray-100 text-gray-600", 
          label: "Sin Validar" 
        };
    }
  };

  const { icon: Icon, color, label } = getStatusConfig(status);

  return (
    <Badge 
      className={`text-xs ${color} ${size === "xs" ? "px-1 py-0" : ""} ${onClick ? "cursor-pointer hover:opacity-80" : ""}`}
      onClick={onClick}
      data-testid={`validation-status-${status}`}
    >
      <Icon className={`h-3 w-3 mr-1 ${size === "xs" ? "h-2 w-2" : ""}`} />
      {label} {completionPercentage > 0 && `(${Math.round(completionPercentage)}%)`}
    </Badge>
  );
}
