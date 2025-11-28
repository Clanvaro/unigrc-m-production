import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronRight, AlertTriangle, Building2, Layers, FolderTree } from "lucide-react";
import { cn } from "@/lib/utils";

interface EntityGroup {
  entityId: string;
  entityName: string;
  entityCode: string;
  entityType: 'macroproceso' | 'process' | 'subproceso';
  macroprocesoId: string | null;
  macroprocesoName: string | null;
  processId: string | null;
  processName: string | null;
  riskCount: number;
}

interface Risk {
  id: string;
  code: string;
  name: string;
  probability: number;
  impact: number;
  inherentRisk: number;
  status: string;
}

export function RisksByProcess() {
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());

  const { data: entityGroups, isLoading: isGroupsLoading } = useQuery<EntityGroup[]>({
    queryKey: ["/api/risks/grouped-by-process"],
    staleTime: 1000 * 60, 
    refetchOnWindowFocus: false,
  });

  const toggleEntity = (entityId: string) => {
    setExpandedEntities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entityId)) {
        newSet.delete(entityId);
      } else {
        newSet.add(entityId);
      }
      return newSet;
    });
  };

  if (isGroupsLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!entityGroups || entityGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Building2 className="h-12 w-12 mb-4 opacity-50" />
        <p>No hay riesgos asociados a procesos</p>
      </div>
    );
  }

  const groupedByMacroproceso = entityGroups.reduce((acc, entity) => {
    const key = entity.macroprocesoName || "Sin Macroproceso";
    if (!acc[key]) {
      acc[key] = { entities: [], macroprocesoId: entity.macroprocesoId };
    }
    acc[key].entities.push(entity);
    return acc;
  }, {} as Record<string, { entities: EntityGroup[], macroprocesoId: string | null }>);

  const totalEntities = entityGroups.length;
  const totalRisks = entityGroups.reduce((sum, e) => sum + e.riskCount, 0);

  return (
    <div className="space-y-2 px-4 pb-4">
      <div className="text-sm text-muted-foreground">
        {totalEntities} {totalEntities === 1 ? 'entidad' : 'entidades'} con {totalRisks} riesgos asociados
      </div>
      
      {Object.entries(groupedByMacroproceso).map(([macroprocesoName, { entities, macroprocesoId }]) => (
        <Card key={macroprocesoName} className="overflow-hidden">
          <CardHeader className="py-3 px-4 bg-muted/50">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {macroprocesoName}
              <Badge variant="secondary" className="ml-auto">
                {entities.reduce((sum, e) => sum + e.riskCount, 0)} riesgos
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {entities.map(entity => (
              <EntityRow 
                key={entity.entityId}
                entity={entity}
                isExpanded={expandedEntities.has(entity.entityId)}
                onToggle={() => toggleEntity(entity.entityId)}
              />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EntityRow({ 
  entity, 
  isExpanded, 
  onToggle 
}: { 
  entity: EntityGroup; 
  isExpanded: boolean; 
  onToggle: () => void;
}) {
  const { data: risks, isLoading: isRisksLoading } = useQuery<{ data: Risk[] }>({
    queryKey: ["/api/risks", { entityType: entity.entityType, entityId: entity.entityId }],
    queryFn: async () => {
      let url = `/api/risks?limit=100`;
      if (entity.entityType === 'macroproceso') {
        url += `&macroprocesoId=${entity.entityId}`;
      } else if (entity.entityType === 'process') {
        url += `&processId=${entity.entityId}`;
      } else if (entity.entityType === 'subproceso') {
        url += `&subprocesoId=${entity.entityId}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch risks");
      return response.json();
    },
    enabled: isExpanded,
    staleTime: 1000 * 30,
  });

  const getEntityIcon = () => {
    switch (entity.entityType) {
      case 'macroproceso':
        return <Layers className="h-4 w-4 shrink-0 text-primary" />;
      case 'process':
        return <FolderTree className="h-4 w-4 shrink-0 text-blue-500" />;
      case 'subproceso':
        return <FolderTree className="h-3 w-3 shrink-0 text-muted-foreground" />;
      default:
        return <FolderTree className="h-4 w-4 shrink-0" />;
    }
  };

  const getEntityTypeLabel = () => {
    switch (entity.entityType) {
      case 'macroproceso':
        return 'Macroproceso';
      case 'process':
        return 'Proceso';
      case 'subproceso':
        return 'Subproceso';
      default:
        return '';
    }
  };

  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 text-left hover-elevate",
          isExpanded && "bg-muted/30",
          entity.entityType === 'subproceso' && "pl-8"
        )}
        data-testid={`entity-row-${entity.entityId}`}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        {getEntityIcon()}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{entity.entityCode}</span>
            <span className="text-sm text-muted-foreground truncate">{entity.entityName}</span>
            {entity.entityType !== 'process' && (
              <Badge variant="outline" className="text-xs py-0">
                {getEntityTypeLabel()}
              </Badge>
            )}
          </div>
        </div>
        <Badge variant="outline" className="shrink-0">
          {entity.riskCount} {entity.riskCount === 1 ? "riesgo" : "riesgos"}
        </Badge>
      </button>

      {isExpanded && (
        <div className={cn(
          "bg-muted/20 px-4 py-2",
          entity.entityType === 'subproceso' ? "pl-14" : "pl-10"
        )}>
          {isRisksLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : risks?.data && risks.data.length > 0 ? (
            <div className="space-y-1">
              {risks.data.map((risk: Risk) => (
                <RiskItem key={risk.id} risk={risk} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">No se encontraron riesgos</p>
          )}
        </div>
      )}
    </div>
  );
}

function RiskItem({ risk }: { risk: Risk }) {
  const getRiskLevelColor = (level: number) => {
    if (level >= 15) return "bg-red-500 text-white";
    if (level >= 8) return "bg-orange-500 text-white";
    if (level >= 4) return "bg-yellow-500 text-black";
    return "bg-green-500 text-white";
  };

  const inherentRisk = risk.inherentRisk || (risk.probability * risk.impact);

  return (
    <div 
      className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer"
      data-testid={`risk-item-${risk.id}`}
    >
      <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="font-mono text-xs text-muted-foreground w-20">{risk.code}</span>
      <span className="text-sm flex-1 truncate">{risk.name}</span>
      <Badge className={cn("shrink-0", getRiskLevelColor(inherentRisk))}>
        {inherentRisk.toFixed(1)}
      </Badge>
    </div>
  );
}
