import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, User, Users, AlertTriangle, Loader2 } from "lucide-react";
import type { Gerencia, ProcessOwner } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

interface GerenciasOrganigramaProps {
  gerencias: Gerencia[];
  processOwners: ProcessOwner[];
  onNodeClick?: (gerencia: Gerencia) => void;
}

interface GerenciaNodeData {
  gerencia: Gerencia;
  manager?: ProcessOwner;
  childCount: number;
  riskLevel?: {
    inherentRisk: number;
    residualRisk: number;
    riskCount: number;
  };
}

// Componente personalizado para los nodos
function GerenciaNode({ data }: { data: GerenciaNodeData }) {
  const { gerencia, manager, childCount, riskLevel } = data;
  
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'gerencia':
        return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800';
      case 'subgerencia':
        return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800';
      case 'jefatura':
        return 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800';
      default:
        return 'bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'gerencia':
        return <Building2 className="h-4 w-4" />;
      case 'subgerencia':
        return <Users className="h-4 w-4" />;
      case 'jefatura':
        return <User className="h-4 w-4" />;
      default:
        return <Building2 className="h-4 w-4" />;
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'gerencia':
        return 'Gerencia';
      case 'subgerencia':
        return 'Subgerencia';
      case 'jefatura':
        return 'Jefatura';
      default:
        return level;
    }
  };

  const getRiskColor = (risk: number) => {
    if (risk > 16) return 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700';
    if (risk > 12) return 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700';
    if (risk > 6) return 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700';
    return 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700';
  };

  const getRiskLabel = (risk: number) => {
    if (risk > 16) return 'Crítico';
    if (risk > 12) return 'Alto';
    if (risk > 6) return 'Medio';
    return 'Bajo';
  };

  return (
    <Card className={`min-w-[240px] max-w-[280px] border-2 ${getLevelColor(gerencia.level)} cursor-pointer hover:shadow-lg transition-shadow`}>
      {/* Handle superior para recibir conexiones desde arriba */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#555' }}
      />
      
      <div className="p-3 space-y-2">
        {/* Header con nivel */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            {getLevelIcon(gerencia.level)}
            <span className="ml-1">{getLevelLabel(gerencia.level)}</span>
          </Badge>
          <div className="flex flex-col items-end gap-0.5">
            <Badge variant="secondary" className="text-xs">
              {gerencia.code}
            </Badge>
            {/* Nivel de riesgo residual acumulado - justo debajo del código */}
            {riskLevel && riskLevel.riskCount > 0 && (
              <Badge className={`text-xs font-semibold ${getRiskColor(riskLevel.residualRisk)}`}>
                {riskLevel.residualRisk.toFixed(2)} - {getRiskLabel(riskLevel.residualRisk)}
              </Badge>
            )}
          </div>
        </div>

        {/* Nombre de la gerencia */}
        <div className="font-semibold text-sm leading-tight">
          {gerencia.name}
        </div>

        {/* Gerente responsable */}
        {manager && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate">{manager.name}</span>
          </div>
        )}

        {/* Contador de sub-unidades */}
        {childCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{childCount} sub-unidad{childCount !== 1 ? 'es' : ''}</span>
          </div>
        )}
      </div>
      
      {/* Handle inferior para enviar conexiones hacia abajo */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#555' }}
      />
    </Card>
  );
}

const nodeTypes = {
  gerenciaNode: GerenciaNode,
};

export default function GerenciasOrganigrama({
  gerencias,
  processOwners,
  onNodeClick,
}: GerenciasOrganigramaProps) {
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  // Fetch risk levels for all gerencias
  const { data: riskLevels, isLoading: isLoadingRiskLevels } = useQuery<Record<string, {inherentRisk: number, residualRisk: number, riskCount: number}>>({
    queryKey: ['/api/gerencias-risk-levels'],
  });

  // Calcular el layout jerárquico
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    // Filtrar gerencias según el nivel seleccionado
    const filteredGerencias = selectedLevel === 'all'
      ? gerencias
      : gerencias.filter(g => g.level === selectedLevel);

    if (filteredGerencias.length === 0) {
      return { nodes, edges };
    }

    // Crear un mapa de children para cada nodo
    const childrenMap = new Map<string | null, Gerencia[]>();
    filteredGerencias.forEach(gerencia => {
      const parentId = gerencia.parentId || null;
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(gerencia);
    });

    // Ordenar children por order
    childrenMap.forEach(children => {
      children.sort((a, b) => a.order - b.order);
    });

    // Calcular posiciones usando un layout de árbol
    const HORIZONTAL_SPACING = 380;
    const VERTICAL_SPACING = 180;
    const nodePositions = new Map<string, { x: number; y: number }>();

    function calculatePositions(
      gerenciaId: string | null,
      level: number,
      offsetX: number
    ): number {
      const children = childrenMap.get(gerenciaId) || [];
      
      if (children.length === 0) {
        return offsetX;
      }

      let currentX = offsetX;
      const childPositions: { id: string; x: number }[] = [];

      // Calcular posiciones de todos los hijos recursivamente
      children.forEach(child => {
        const startX = currentX;
        const endX = calculatePositions(child.id, level + 1, currentX);
        const width = Math.max(HORIZONTAL_SPACING, endX - startX);
        const centerX = startX + width / 2;

        nodePositions.set(child.id, { 
          x: centerX - 140, 
          y: level * VERTICAL_SPACING 
        });
        
        childPositions.push({ id: child.id, x: centerX });
        currentX = endX + HORIZONTAL_SPACING;
      });

      // Calcular la posición del nodo padre (centrado sobre sus hijos)
      if (gerenciaId && childPositions.length > 0) {
        const firstChild = childPositions[0];
        const lastChild = childPositions[childPositions.length - 1];
        const parentX = (firstChild.x + lastChild.x) / 2;

        nodePositions.set(gerenciaId, {
          x: parentX - 140,
          y: (level - 1) * VERTICAL_SPACING
        });
      }

      return currentX - HORIZONTAL_SPACING;
    }

    // Calcular todas las posiciones primero
    calculatePositions(null, 0, 0);

    // Crear todos los nodos
    filteredGerencias.forEach(gerencia => {
      const position = nodePositions.get(gerencia.id);
      if (position) {
        const manager = gerencia.managerId
          ? processOwners.find(po => po.id === gerencia.managerId)
          : undefined;
        
        const childCount = childrenMap.get(gerencia.id)?.length || 0;

        nodes.push({
          id: gerencia.id,
          type: 'gerenciaNode',
          position,
          data: {
            gerencia,
            manager,
            childCount,
            riskLevel: riskLevels?.[gerencia.id],
          },
        });
      }
    });

    // Crear todos los edges después de que todos los nodos existan
    filteredGerencias.forEach(gerencia => {
      if (gerencia.parentId && nodePositions.has(gerencia.parentId)) {
        edges.push({
          id: `${gerencia.parentId}-${gerencia.id}`,
          source: gerencia.parentId,
          target: gerencia.id,
          type: 'smoothstep',
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
          },
          style: {
            strokeWidth: 2,
            stroke: '#94a3b8',
          },
        });
      }
    });

    return { nodes, edges };
  }, [gerencias, processOwners, selectedLevel, riskLevels]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when initialNodes changes (especially when riskLevels loads)
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  // Update edges when initialEdges changes
  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const onNodeClickHandler = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (onNodeClick && node.data) {
        const nodeData = node.data as unknown as GerenciaNodeData;
        onNodeClick(nodeData.gerencia);
      }
    },
    [onNodeClick]
  );

  // Filtrar opciones
  const levelOptions = [
    { value: 'all', label: 'Todos los niveles' },
    { value: 'gerencia', label: 'Solo Gerencias' },
    { value: 'subgerencia', label: 'Solo Subgerencias' },
    { value: 'jefatura', label: 'Solo Jefaturas' },
  ];

  return (
    <div className="w-full h-[700px] border rounded-lg bg-background relative">
      {isLoadingRiskLevels && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-50">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Cargando...</p>
          </div>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClickHandler}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (!node.data) return '#6b7280';
            const data = node.data as unknown as GerenciaNodeData;
            switch (data.gerencia.level) {
              case 'gerencia':
                return '#3b82f6';
              case 'subgerencia':
                return '#10b981';
              case 'jefatura':
                return '#8b5cf6';
              default:
                return '#6b7280';
            }
          }}
          maskColor="rgba(0, 0, 0, 0.2)"
        />
        
        <Panel position="top-right" className="bg-background border rounded-lg p-2 shadow-sm">
          <div className="flex flex-col gap-2">
            <div className="text-xs font-medium">Filtrar por nivel:</div>
            <div className="flex gap-1">
              {levelOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setSelectedLevel(option.value)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    selectedLevel === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </Panel>

        <Panel position="top-left" className="bg-background border rounded-lg p-3 shadow-sm">
          <div className="space-y-2">
            <div className="text-sm font-semibold mb-2">Leyenda:</div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800"></div>
              <span className="text-xs">Gerencia</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-800"></div>
              <span className="text-xs">Subgerencia</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-100 dark:bg-purple-950/20 border-2 border-purple-200 dark:border-purple-800"></div>
              <span className="text-xs">Jefatura</span>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
