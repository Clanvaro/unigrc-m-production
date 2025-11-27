import { useQuery } from "@tanstack/react-query";
import { getRiskLevel, calculateResidualProbability, calculateResidualImpact } from "@/lib/risk-calculations";
import type { Risk, RiskControl, RiskWithProcess, Control } from "@shared/schema";

interface MatrixGridProps {
  isOverview?: boolean;
  matrixType?: 'inherent' | 'residual' | 'criticality-gap';
  onCellClick?: (risks: RiskWithProcess[], probability: number, impact: number, matrixType: string) => void;
  validationStatusFilter?: string;
  categoryFilter?: string;
  macroprocesoFilter?: string;
  processFilter?: string;
}

export default function MatrixGrid({ 
  isOverview = false, 
  matrixType = 'inherent', 
  onCellClick, 
  validationStatusFilter = 'all', 
  categoryFilter = 'all',
  macroprocesoFilter = 'all',
  processFilter = 'all'
}: MatrixGridProps) {
  const { data: allRisks = [] } = useQuery<RiskWithProcess[]>({
    queryKey: ["/api/risks-with-details"],
  });

  // Get processes and subprocesses for hierarchical filtering
  const { data: processes = [] } = useQuery<any[]>({
    queryKey: ["/api/processes"],
  });

  const { data: subprocesos = [] } = useQuery<any[]>({
    queryKey: ["/api/subprocesos"],
  });

  // Apply filters with hierarchical logic
  const risks = allRisks.filter((risk: any) => {
    // DEBUG: Log validation status for debugging
    if (validationStatusFilter !== 'all') {
      console.log('[DEBUG MatrixGrid]', {
        riskCode: risk.code,
        validationStatus: risk.validationStatus,
        filter: validationStatusFilter,
        type: typeof risk.validationStatus
      });
    }
    
    // Hierarchical Macroproceso filter
    if (macroprocesoFilter !== 'all') {
      // Include risks from macroproceso and all its child processes and subprocesses
      const childProcesses = processes.filter((p: any) => p.macroprocesoId === macroprocesoFilter);
      const childProcessIds = childProcesses.map((p: any) => p.id);
      const childSubprocesos = subprocesos.filter((sp: any) => 
        childProcesses.some((p: any) => p.id === sp.procesoId)
      );
      const childSubprocesoIds = childSubprocesos.map((sp: any) => sp.id);
      
      const belongsToMacroproceso = 
        risk.macroprocesoId === macroprocesoFilter || 
        childProcessIds.includes(risk.processId) || 
        childSubprocesoIds.includes(risk.subprocesoId);
      
      if (!belongsToMacroproceso) return false;
    }

    // Hierarchical Process filter
    if (processFilter !== 'all') {
      // Include risks from process and all its child subprocesses
      const childSubprocesos = subprocesos.filter((sp: any) => sp.procesoId === processFilter);
      const childSubprocesoIds = childSubprocesos.map((sp: any) => sp.id);
      
      const belongsToProcess = 
        risk.processId === processFilter || 
        childSubprocesoIds.includes(risk.subprocesoId);
      
      if (!belongsToProcess) return false;
    }

    // Validation status filter
    if (validationStatusFilter !== 'all') {
      const status = risk.validationStatus || 'pending';
      
      let validationMatch = false;
      switch (validationStatusFilter) {
        case 'validated':
          validationMatch = status === 'validated' || status === 'approved';
          break;
        case 'pending':
          validationMatch = status === 'pending' || status === 'pending_validation' || status === 'notified';
          break;
        case 'observed':
          validationMatch = status === 'observed';
          break;
        case 'rejected':
          validationMatch = status === 'rejected';
          break;
        default:
          validationMatch = true;
      }
      
      if (!validationMatch) return false;
    }
    
    // Category filter
    if (categoryFilter !== 'all') {
      const categories = risk.category || [];
      if (!categories.includes(categoryFilter)) return false;
    }
    
    return true;
  });

  // Get all risk-control associations WITH control details for residual risk calculation
  const { data: allRiskControlsWithDetails = [] } = useQuery<(RiskControl & { control: Control })[]>({
    queryKey: ["/api/risk-controls-with-details"],
    enabled: matrixType === 'residual' || matrixType === 'criticality-gap',
  });

  // Extract just the risk-controls for criticality-gap matrix (backward compatibility)
  const allRiskControls = allRiskControlsWithDetails.map(rc => ({
    id: rc.id,
    riskId: rc.riskId,
    controlId: rc.controlId,
    residualRisk: rc.residualRisk,
  }));

  // Get risk level ranges
  const { data: riskRanges = { lowMax: 6, mediumMax: 12, highMax: 19 } } = useQuery<{lowMax: number, mediumMax: number, highMax: number}>({
    queryKey: ["/api/system-config/risk-level-ranges"],
  });

  // Create matrix data and store risks by position
  const matrix = Array(5).fill(null).map(() => Array(5).fill(0));
  const risksByPosition = new Map<string, RiskWithProcess[]>();
  
  if (matrixType === 'inherent') {
    // Use inherent risk (probability * impact)
    risks.forEach((risk) => {
      const row = 5 - risk.probability; // Flip for display (5 at top) - Y axis is now probability
      const col = risk.impact - 1; // X axis is now impact
      if (row >= 0 && row < 5 && col >= 0 && col < 5) {
        matrix[row][col]++;
        const key = `${row}-${col}`;
        if (!risksByPosition.has(key)) {
          risksByPosition.set(key, []);
        }
        risksByPosition.get(key)!.push(risk);
      }
    });
  } else if (matrixType === 'criticality-gap') {
    // Criticality-Gap Matrix: X-axis = Inherent Impact, Y-axis = Residual Risk
    const riskResidualMap = new Map<string, number>();
    
    // Get minimum residual risk for each risk (best case scenario)
    allRiskControls.forEach((rc) => {
      const currentMin = riskResidualMap.get(rc.riskId) || Infinity;
      const residualRiskNum = Number(rc.residualRisk);
      if (residualRiskNum < currentMin) {
        riskResidualMap.set(rc.riskId, residualRiskNum);
      }
    });

    risks.forEach((risk) => {
      const inherentImpact = risk.impact; // X-axis: Inherent Impact (what matters)
      const residualRisk = riskResidualMap.get(risk.id) || risk.inherentRisk; // Y-axis: What's missing
      
      // Convert residual risk to a 1-5 scale for Y-axis positioning
      // Higher residual risk = higher on Y-axis (more control gap)
      let residualRiskLevel;
      if (residualRisk <= 5) residualRiskLevel = 1;
      else if (residualRisk <= 10) residualRiskLevel = 2;
      else if (residualRisk <= 15) residualRiskLevel = 3;
      else if (residualRisk <= 20) residualRiskLevel = 4;
      else residualRiskLevel = 5;
      
      // For criticality gap, we need to convert back to probability for Y-axis
      // Since this is criticality gap, we'll keep the original logic for now
      const row = 5 - residualRiskLevel; // Flip for display (high residual risk at top)
      const col = inherentImpact - 1; // Inherent impact on X-axis
      
      if (row >= 0 && row < 5 && col >= 0 && col < 5) {
        matrix[row][col]++;
        const key = `${row}-${col}`;
        if (!risksByPosition.has(key)) {
          risksByPosition.set(key, []);
        }
        risksByPosition.get(key)!.push(risk);
      }
    });
  } else {
    // Use residual values from backend (already calculated with SQL aggregation)
    risks.forEach((risk: any) => {
      // Use backend-calculated residual values if available, otherwise fallback to inherent
      const residualProbability = risk.residualProbability ?? risk.probability;
      const residualImpact = risk.residualImpact ?? risk.impact;
      
      // Ensure values are within bounds [1, 5]
      const finalProbability = Math.min(5, Math.max(1, Math.round(residualProbability)));
      const finalImpact = Math.min(5, Math.max(1, Math.round(residualImpact)));
      
      const row = 5 - finalProbability; // Flip for display (5 at top) - Y axis is now probability
      const col = finalImpact - 1; // X axis is now impact
      
      if (row >= 0 && row < 5 && col >= 0 && col < 5) {
        matrix[row][col]++;
        const key = `${row}-${col}`;
        if (!risksByPosition.has(key)) {
          risksByPosition.set(key, []);
        }
        risksByPosition.get(key)!.push(risk);
      }
    });
  }

  const handleCellClick = (rowIndex: number, colIndex: number) => {
    if (onCellClick) {
      const key = `${rowIndex}-${colIndex}`;
      const cellRisks = risksByPosition.get(key) || [];
      const probability = 5 - rowIndex; // Y axis is now probability
      const impact = colIndex + 1; // X axis is now impact
      onCellClick(cellRisks, probability, impact, matrixType);
    }
  };

  // Conditional labels based on matrix type
  let impactLabels, probabilityLabels;
  
  if (matrixType === 'criticality-gap') {
    // For Criticality-Gap Matrix: Y-axis = Residual Risk, X-axis = Inherent Impact
    impactLabels = isOverview ? ["5", "4", "3", "2", "1"] : ["Alto (5)", "Medio-Alto (4)", "Medio (3)", "Medio-Bajo (2)", "Bajo (1)"];
    probabilityLabels = isOverview ? ["1", "2", "3", "4", "5"] : ["Bajo (1)", "Medio-Bajo (2)", "Medio (3)", "Medio-Alto (4)", "Alto (5)"];
  } else {
    // Standard risk matrix labels - swapped for new axis orientation
    probabilityLabels = isOverview ? ["5", "4", "3", "2", "1"] : ["Muy Alta (5)", "Alta (4)", "Media (3)", "Baja (2)", "Muy Baja (1)"];
    impactLabels = isOverview ? ["1", "2", "3", "4", "5"] : ["Insignificante (1)", "Menor (2)", "Moderado (3)", "Mayor (4)", "Catastrófico (5)"];
  }

  return (
    <div className="overflow-x-auto" data-testid="risk-matrix-grid">
      <div className="inline-block relative">
        {/* Axis Labels for Criticality-Gap Matrix */}
        {matrixType === 'criticality-gap' && !isOverview && (
          <div className="text-center mb-4">
            <p className="text-sm font-medium text-muted-foreground">
              Eje X: Impacto Inherente (qué importa) | Eje Y: Riesgo Residual (qué falta)
            </p>
          </div>
        )}
        <div className={`grid ${isOverview ? 'grid-cols-6 gap-1' : 'grid-cols-6 gap-2'}`}>
          {/* Empty corner */}
          <div className={isOverview ? "w-60px h-60px" : "text-center p-4"}></div>
          
          {/* Impact headers (now X-axis) */}
          {impactLabels.map((label, index) => (
            <div 
              key={`impact-${index}`} 
              className={isOverview ? "matrix-cell bg-muted font-semibold" : "text-center p-4 font-semibold"}
              data-testid={`impact-header-${index}`}
            >
              {label}
            </div>
          ))}
          
          {/* Matrix rows */}
          {matrix.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="contents">
              {/* Probability label (now Y-axis) */}
              <div 
                className={isOverview ? "matrix-cell bg-muted font-semibold" : "text-center p-4 font-semibold transform -rotate-90"}
                data-testid={`prob-header-${rowIndex}`}
              >
                {probabilityLabels[rowIndex]}
              </div>
              
              {/* Matrix cells */}
              {row.map((count, colIndex) => {
                const riskValue = (5 - rowIndex) * (colIndex + 1); // (probability) * (impact)
                const level = getRiskLevel(riskValue, riskRanges);
                
                return (
                  <div 
                    key={`cell-${rowIndex}-${colIndex}`}
                    className={isOverview ? 
                      `matrix-cell risk-level-${level} ${onCellClick && count > 0 ? 'cursor-pointer hover:opacity-80' : ''}` : 
                      `p-4 min-h-[100px] rounded risk-level-${level} ${onCellClick && count > 0 ? 'cursor-pointer hover:opacity-80' : ''}`
                    }
                    data-testid={`matrix-cell-${rowIndex}-${colIndex}`}
                    onClick={() => count > 0 && handleCellClick(rowIndex, colIndex)}
                  >
                    {isOverview ? (
                      count || ""
                    ) : (
                      <div>
                        <span className="text-xs font-medium text-current">
                          {level === 1 ? 'BAJO' :
                           level === 2 ? 'MEDIO' :
                           level >= 3 && level <= 4 ? 'ALTO' :
                           'CRÍTICO'} ({riskValue})
                        </span>
                        <div className="mt-2 text-xs">{count} riesgos</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        
        {!isOverview && (
          <>
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-6 -rotate-90 text-sm font-medium text-muted-foreground">
              Probabilidad →
            </div>
            <div className="text-center text-sm font-medium text-muted-foreground mt-4">
              Impacto →
            </div>
          </>
        )}
      </div>
    </div>
  );
}
