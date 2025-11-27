import { useState, useMemo } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Cell, ResponsiveContainer, Tooltip, CartesianGrid, LabelList } from "recharts";
import { useRiskMath } from "@/hooks/useRiskMath";
import { RiskCellDrawer, RiskCellItem } from "./RiskCellDrawer";
import { Card } from "@/components/ui/card";
import { calculateResidualProbability, calculateResidualImpact } from "@/lib/risk-calculations";

interface HeatmapDataPoint {
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

interface RiskHeatmapRechartsProps {
  data: HeatmapDataPoint[];
  mode: 'inherent' | 'residual';
  onCellClick?: (probability: number, impact: number, risks: RiskCellItem[]) => void;
}

interface CellData {
  probability: number;
  impact: number;
  count: number;
  score: number;
  color: string;
  label: string;
  risks: RiskCellItem[];
  topCodes: string[];
}

export function RiskHeatmapRecharts({ data, mode }: RiskHeatmapRechartsProps) {
  const { colorFor, classify, combineControls, residualFromControls } = useRiskMath();
  const [selectedCell, setSelectedCell] = useState<CellData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Agrupar datos en celdas 5x5
  const cellData = useMemo(() => {
    const cells = new Map<string, CellData>();

    // Inicializar todas las celdas
    for (let p = 1; p <= 5; p++) {
      for (let i = 1; i <= 5; i++) {
        const key = `${p}-${i}`;
        const score = p * i;
        const band = classify(score);
        cells.set(key, {
          probability: p,
          impact: i,
          count: 0,
          score,
          color: band.color,
          label: band.label,
          risks: [],
          topCodes: [],
        });
      }
    }

    // Poblar con datos reales
    for (const risk of data) {
      let probability = risk.probability;
      let impact = risk.impact;
      
      // Para modo residual, usar valores del backend si están disponibles
      if (mode === 'residual') {
        // Preferir valores calculados por el backend
        if (risk.residualProbability !== undefined && risk.residualImpact !== undefined) {
          probability = Math.min(5, Math.max(1, Math.round(risk.residualProbability)));
          impact = Math.min(5, Math.max(1, Math.round(risk.residualImpact)));
        } else if (risk.controls && risk.controls.length > 0) {
          // Fallback: calcular localmente si el backend no envió los valores
          const residualProb = calculateResidualProbability(risk.probability, risk.controls);
          const residualImp = calculateResidualImpact(risk.impact, risk.controls);
          probability = Math.min(5, Math.max(1, Math.round(residualProb)));
          impact = Math.min(5, Math.max(1, Math.round(residualImp)));
        }
      }
      
      const key = `${probability}-${impact}`;
      const cell = cells.get(key);
      
      if (cell) {
        cell.count++;
        cell.risks.push(risk);
        
        // Actualizar score y color según el modo
        if (mode === 'residual' && cell.risks.length > 0) {
          // Calcular score residual promedio de la celda
          const avgResidual = cell.risks.reduce((sum, r) => {
            // Usar valores del backend si están disponibles
            if (r.residualProbability !== undefined && r.residualImpact !== undefined) {
              return sum + (r.residualProbability * r.residualImpact);
            }
            // Fallback a cálculo local
            if (!r.controls || r.controls.length === 0) {
              return sum + r.inherentRisk;
            }
            const residualProb = calculateResidualProbability(r.probability, r.controls);
            const residualImp = calculateResidualImpact(r.impact, r.controls);
            return sum + (residualProb * residualImp);
          }, 0) / cell.risks.length;
          
          const band = classify(avgResidual);
          cell.color = band.color;
          cell.label = band.label;
          cell.score = avgResidual;
        }
      }
    }

    // Generar top códigos para tooltip
    cells.forEach(cell => {
      cell.topCodes = cell.risks.slice(0, 10).map(r => r.code);
    });

    return Array.from(cells.values());
  }, [data, mode, classify, combineControls, residualFromControls]);

  const handleCellClick = (cell: CellData) => {
    setSelectedCell(cell);
    setDrawerOpen(true);
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const cell = payload[0].payload as CellData;
      
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg" data-testid="heatmap-tooltip">
          <div className="font-semibold mb-1">{cell.label}</div>
          <div className="text-sm space-y-1">
            <div>P{cell.probability} × I{cell.impact} = {cell.score.toFixed(1)}</div>
            <div className="text-muted-foreground">
              {cell.count} {cell.count === 1 ? 'riesgo' : 'riesgos'}
            </div>
            {cell.topCodes.length > 0 && (
              <div className="text-xs text-muted-foreground mt-2">
                Top códigos: {cell.topCodes.slice(0, 5).join(', ')}
                {cell.topCodes.length > 5 && '...'}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Tamaño de la celda basado en cantidad de riesgos
  const getCellSize = (count: number) => {
    if (count === 0) return 30;
    if (count <= 2) return 50;
    if (count <= 5) return 70;
    if (count <= 10) return 90;
    return 110;
  };

  return (
    <>
      <Card className="p-4" data-testid="risk-heatmap">
        <ResponsiveContainer width="100%" height={500}>
          <ScatterChart
            margin={{ top: 20, right: 20, bottom: 40, left: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="number" 
              dataKey="impact" 
              name="Impacto" 
              domain={[0.5, 5.5]}
              ticks={[1, 2, 3, 4, 5]}
              label={{ value: 'Impacto', position: 'bottom', offset: 10 }}
            />
            <YAxis 
              type="number" 
              dataKey="probability" 
              name="Probabilidad" 
              domain={[0.5, 5.5]}
              ticks={[1, 2, 3, 4, 5]}
              label={{ value: 'Probabilidad', angle: -90, position: 'left', offset: 10 }}
            />
            <ZAxis 
              type="number" 
              dataKey="count" 
              range={[400, 2000]} 
            />
            <Tooltip content={<CustomTooltip />} />
            <Scatter 
              data={cellData} 
              shape="square"
              onClick={(data: CellData) => handleCellClick(data)}
              style={{ cursor: 'pointer' }}
              data-testid="heatmap-scatter"
            >
              {cellData.map((cell, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={cell.color}
                  fillOpacity={cell.count > 0 ? 0.8 : 0.3}
                  stroke={cell.count > 0 ? '#000' : '#ccc'}
                  strokeWidth={cell.count > 0 ? 1 : 0.5}
                  data-testid={`cell-${cell.probability}-${cell.impact}`}
                />
              ))}
              <LabelList 
                dataKey="count" 
                position="center"
                fill="#000"
                fontSize={14}
                formatter={(value: number) => value > 0 ? value : ''}
                style={{ pointerEvents: 'none' }}
              />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </Card>

      <RiskCellDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        probability={selectedCell?.probability || 1}
        impact={selectedCell?.impact || 1}
        mode={mode}
        risks={selectedCell?.risks || []}
      />
    </>
  );
}
