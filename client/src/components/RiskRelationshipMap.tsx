import { useMemo } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MarkerType,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { Badge } from "@/components/ui/badge";
import { getRiskColor, getRiskLevelText } from "@/lib/risk-calculations";
import { RiskValue } from "@/components/RiskValue";
import type { Risk } from "@shared/schema";

interface RiskRelationshipMapProps {
  risk: Risk;
  macroprocesos: any[];
  processes: any[];
  subprocesos: any[];
  riskControls: any[];
  riskEvents: any[];
  riskProcessLinks?: any[];
}

interface CustomNodeData {
  label: string;
  type: "risk" | "macroproceso" | "proceso" | "subproceso" | "control" | "event";
  details?: any;
}

const nodeTypes = {
  risk: ({ data }: { data: CustomNodeData }) => (
    <div className="px-6 py-4 bg-blue-500 text-white rounded-full shadow-lg border-4 border-blue-600 min-w-[200px] text-center relative">
      <Handle type="source" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <div className="font-bold text-sm truncate">{data.label}</div>
      {data.details && (
        <div className="mt-1">
          <div className="text-xs">
            Inherente: <RiskValue value={data.details.inherentRisk} />
          </div>
        </div>
      )}
    </div>
  ),
  macroproceso: ({ data }: { data: CustomNodeData }) => (
    <div className="px-3 py-2 bg-orange-500 text-white rounded-lg shadow-md border-2 border-orange-600 w-[140px] text-center relative">
      <Handle type="target" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left} style={{ opacity: 0 }} />
      <div className="text-xs font-semibold">Macroproceso</div>
      <div className="text-xs mt-1 truncate">{data.label}</div>
    </div>
  ),
  proceso: ({ data }: { data: CustomNodeData }) => (
    <div className="px-3 py-2 bg-yellow-500 text-white rounded-lg shadow-md border-2 border-yellow-600 w-[140px] text-center relative">
      <Handle type="target" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <div className="text-xs font-semibold">Proceso</div>
      <div className="text-xs mt-1 truncate">{data.label}</div>
    </div>
  ),
  subproceso: ({ data }: { data: CustomNodeData }) => (
    <div className="px-3 py-2 bg-gray-500 text-white rounded-lg shadow-md border-2 border-gray-600 w-[140px] text-center relative">
      <Handle type="target" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left} style={{ opacity: 0 }} />
      <div className="text-xs font-semibold">Subproceso</div>
      <div className="text-xs mt-1 truncate">{data.label}</div>
    </div>
  ),
  control: ({ data }: { data: CustomNodeData }) => (
    <div className="relative">
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div className="px-2 bg-green-500 text-white shadow-md border-2 border-green-600 w-[140px] text-center overflow-hidden flex flex-col justify-end"
           style={{ 
             clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
             height: "140px",
             paddingBottom: "1rem"
           }}>
        <div className="text-[10px] font-semibold">Control</div>
        <div className="text-[9px] mt-1 font-medium px-1 line-clamp-2" style={{ wordBreak: "break-word" }}>{data.label}</div>
        {data.details && (
          <div className="mt-0.5 text-[9px]">
            <div>E:{data.details.effectiveness}%</div>
            <div>R:<RiskValue value={data.details.residualRisk} /></div>
          </div>
        )}
      </div>
    </div>
  ),
  event: ({ data }: { data: CustomNodeData }) => (
    <div className="relative">
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div className="px-3 py-3 bg-red-500 text-white shadow-md border-2 border-red-600 w-[120px] h-[120px] text-center transform rotate-45 flex items-center justify-center">
        <div className="transform -rotate-45">
          <div className="text-xs font-semibold">Evento</div>
          <div className="text-[10px] mt-1 truncate px-1">{data.label}</div>
          {data.details && data.details.estimatedLoss && (
            <div className="text-[10px] mt-1">
              ${(data.details.estimatedLoss / 1000000).toFixed(1)}M
            </div>
          )}
        </div>
      </div>
    </div>
  ),
};

export function RiskRelationshipMap({
  risk,
  macroprocesos,
  processes,
  subprocesos,
  riskControls,
  riskEvents,
  riskProcessLinks = [],
}: RiskRelationshipMapProps) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node<CustomNodeData>[] = [];
    const edges: Edge[] = [];

    // Central risk node
    nodes.push({
      id: "risk-center",
      type: "risk",
      position: { x: 450, y: 350 },
      data: {
        label: risk.name,
        type: "risk",
        details: { inherentRisk: risk.inherentRisk },
      },
    });

    // Calculate radial positions
    const centerX = 450;
    const centerY = 350;
    const radius = 400;
    
    // Get related entities using riskProcessLinks if available
    let relatedProcesses: any[] = [];
    let relatedMacroprocesos: any[] = [];
    let relatedSubprocesos: any[] = [];
    
    if (riskProcessLinks.length > 0) {
      // Use riskProcessLinks to find related entities
      riskProcessLinks.forEach((link: any) => {
        if (link.processId) {
          const proc = processes.find((p: any) => p.id === link.processId);
          if (proc && !relatedProcesses.find(p => p.id === proc.id)) {
            relatedProcesses.push(proc);
            // Also add its macroproceso
            if (proc.macroprocesoId) {
              const macro = macroprocesos.find((m: any) => m.id === proc.macroprocesoId);
              if (macro && !relatedMacroprocesos.find(m => m.id === macro.id)) {
                relatedMacroprocesos.push(macro);
              }
            }
          }
        }
        if (link.macroprocesoId) {
          const macro = macroprocesos.find((m: any) => m.id === link.macroprocesoId);
          if (macro && !relatedMacroprocesos.find(m => m.id === macro.id)) {
            relatedMacroprocesos.push(macro);
          }
        }
        if (link.subprocesoId) {
          const sub = subprocesos.find((s: any) => s.id === link.subprocesoId);
          if (sub && !relatedSubprocesos.find(s => s.id === sub.id)) {
            relatedSubprocesos.push(sub);
            // Also add its parent process
            if (sub.procesoId) {
              const proc = processes.find((p: any) => p.id === sub.procesoId);
              if (proc && !relatedProcesses.find(p => p.id === proc.id)) {
                relatedProcesses.push(proc);
                // And the macroproceso
                if (proc.macroprocesoId) {
                  const macro = macroprocesos.find((m: any) => m.id === proc.macroprocesoId);
                  if (macro && !relatedMacroprocesos.find(m => m.id === macro.id)) {
                    relatedMacroprocesos.push(macro);
                  }
                }
              }
            }
          }
        }
      });
    } else {
      // Fallback to legacy direct fields
      const process = processes.find((p: any) => p.id === risk.processId);
      if (process) relatedProcesses.push(process);
      
      const macroproceso = process ? macroprocesos.find((m: any) => m.id === process.macroprocesoId) : null;
      if (macroproceso) relatedMacroprocesos.push(macroproceso);
      
      const subproceso = subprocesos.find((s: any) => s.id === risk.subprocesoId);
      if (subproceso) relatedSubprocesos.push(subproceso);
    }
    
    // Count nodes for each sector
    const leftNodes = [...relatedMacroprocesos, ...relatedProcesses, ...relatedSubprocesos].filter(Boolean);
    const rightNodes = riskControls;
    const bottomNodes = riskEvents;
    
    // Left sector: processes and their hierarchies
    const leftBaseAngle = Math.PI; // 180°
    
    // Add processes (directly connected to risk)
    relatedProcesses.forEach((process, index) => {
      const processAngle = leftBaseAngle + (index - (relatedProcesses.length - 1) / 2) * 0.3; // Spread if multiple
      
      nodes.push({
        id: `proceso-${process.id}`,
        type: "proceso",
        position: {
          x: centerX + radius * Math.cos(processAngle) - 70,
          y: centerY + radius * Math.sin(processAngle) - 25,
        },
        data: {
          label: process.name,
          type: "proceso",
        },
      });
      edges.push({
        id: `edge-proceso-${process.id}`,
        source: "risk-center",
        target: `proceso-${process.id}`,
        animated: true,
        style: { stroke: "#eab308", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#eab308" },
      });
      
      // Add macroproceso for this process if exists
      if (process.macroprocesoId) {
        const macroproceso = macroprocesos.find((m: any) => m.id === process.macroprocesoId);
        if (macroproceso && !nodes.find(n => n.id === `macroproceso-${macroproceso.id}`)) {
          const macroprocesoAngle = processAngle - Math.PI / 6; // 30° above proceso
          nodes.push({
            id: `macroproceso-${macroproceso.id}`,
            type: "macroproceso",
            position: {
              x: centerX + (radius + 150) * Math.cos(macroprocesoAngle) - 70,
              y: centerY + (radius + 150) * Math.sin(macroprocesoAngle) - 25,
            },
            data: {
              label: macroproceso.name,
              type: "macroproceso",
            },
          });
          edges.push({
            id: `edge-macroproceso-${macroproceso.id}`,
            source: `proceso-${process.id}`,
            target: `macroproceso-${macroproceso.id}`,
            animated: true,
            style: { stroke: "#f97316", strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#f97316" },
          });
        }
      }
    });
    
    // Add subprocesos connected to their parent processes
    relatedSubprocesos.forEach((subproceso, index) => {
      const parentProcess = processes.find((p: any) => p.id === subproceso.procesoId);
      if (parentProcess) {
        const parentNodeId = `proceso-${parentProcess.id}`;
        const subprocesoAngle = leftBaseAngle + (index - (relatedSubprocesos.length - 1) / 2) * 0.3 + Math.PI / 6;
        
        nodes.push({
          id: `subproceso-${subproceso.id}`,
          type: "subproceso",
          position: {
            x: centerX + (radius + 150) * Math.cos(subprocesoAngle) - 70,
            y: centerY + (radius + 150) * Math.sin(subprocesoAngle) - 25,
          },
          data: {
            label: subproceso.name,
            type: "subproceso",
          },
        });
        edges.push({
          id: `edge-subproceso-${subproceso.id}`,
          source: parentNodeId,
          target: `subproceso-${subproceso.id}`,
          animated: true,
          style: { stroke: "#6b7280", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#6b7280" },
        });
      }
    });

    // Add orphaned macroprocesos (not connected through a process)
    relatedMacroprocesos.forEach((macroproceso) => {
      if (!nodes.find(n => n.id === `macroproceso-${macroproceso.id}`)) {
        const macroprocesoAngle = leftBaseAngle - Math.PI / 8;
        nodes.push({
          id: `macroproceso-${macroproceso.id}`,
          type: "macroproceso",
          position: {
            x: centerX + radius * Math.cos(macroprocesoAngle) - 70,
            y: centerY + radius * Math.sin(macroprocesoAngle) - 25,
          },
          data: {
            label: macroproceso.name,
            type: "macroproceso",
          },
        });
        edges.push({
          id: `edge-macroproceso-${macroproceso.id}`,
          source: "risk-center",
          target: `macroproceso-${macroproceso.id}`,
          animated: true,
          style: { stroke: "#f97316", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#f97316" },
        });
      }
    });

    // Right sector: controls (around 0°)
    const rightBaseAngle = 0; // 0°
    const controlRadius = 550; // Increased radius to avoid overlap with risk node
    const rightSpread = rightNodes.length > 1 ? Math.PI / 2.2 : 0; // 82° spread
    const rightStartAngle = rightBaseAngle - rightSpread / 2;
    const rightAngleIncrement = rightNodes.length > 1 ? rightSpread / (rightNodes.length - 1) : 0;
    
    riskControls.forEach((rc: any, index: number) => {
      if (!rc.control) return; // Skip if control data is missing
      
      const angle = rightStartAngle + rightAngleIncrement * index;
      nodes.push({
        id: `control-${rc.id}`,
        type: "control",
        position: {
          x: centerX + controlRadius * Math.cos(angle) - 100,
          y: centerY + controlRadius * Math.sin(angle) - 160,
        },
        data: {
          label: rc.control.name,
          type: "control",
          details: {
            effectiveness: rc.control.effectiveness,
            residualRisk: rc.residualRisk,
          },
        },
      });
      edges.push({
        id: `edge-control-${rc.id}`,
        source: "risk-center",
        target: `control-${rc.id}`,
        animated: true,
        style: { stroke: "#22c55e", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#22c55e" },
      });
    });

    // Bottom sector: events (around 270°, 3π/2)
    const bottomBaseAngle = Math.PI * 1.5; // 270°
    const bottomSpread = bottomNodes.length > 1 ? Math.PI / 2.5 : 0; // 72° spread
    const bottomStartAngle = bottomBaseAngle - bottomSpread / 2;
    const bottomAngleIncrement = bottomNodes.length > 1 ? bottomSpread / (bottomNodes.length - 1) : 0;
    
    riskEvents.forEach((event: any, index: number) => {
      const angle = bottomStartAngle + bottomAngleIncrement * index;
      nodes.push({
        id: `event-${event.id}`,
        type: "event",
        position: {
          x: centerX + radius * Math.cos(angle) - 60,
          y: centerY + radius * Math.sin(angle) - 60,
        },
        data: {
          label: event.title || "Sin título",
          type: "event",
          details: {
            estimatedLoss: event.estimatedLoss,
          },
        },
      });
      edges.push({
        id: `edge-event-${event.id}`,
        source: "risk-center",
        target: `event-${event.id}`,
        animated: true,
        style: { stroke: "#ef4444", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#ef4444" },
      });
    });

    return { nodes, edges };
  }, [risk, macroprocesos, processes, subprocesos, riskControls, riskEvents]);

  return (
    <div className="w-full h-[600px] border rounded-lg bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
