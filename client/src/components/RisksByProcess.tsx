import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronRight, AlertTriangle, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProcessGroup {
  processId: string;
  processName: string;
  processCode: string;
  macroprocesoId: string | null;
  macroprocesoName: string | null;
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
  const [expandedProcesses, setExpandedProcesses] = useState<Set<string>>(new Set());

  const { data: processGroups, isLoading: isGroupsLoading } = useQuery<ProcessGroup[]>({
    queryKey: ["/api/risks/grouped-by-process"],
    staleTime: 1000 * 60, 
    refetchOnWindowFocus: false,
  });

  const toggleProcess = (processId: string) => {
    setExpandedProcesses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(processId)) {
        newSet.delete(processId);
      } else {
        newSet.add(processId);
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

  if (!processGroups || processGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Building2 className="h-12 w-12 mb-4 opacity-50" />
        <p>No hay riesgos asociados a procesos</p>
      </div>
    );
  }

  const groupedByMacroproceso = processGroups.reduce((acc, process) => {
    const key = process.macroprocesoName || "Sin Macroproceso";
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(process);
    return acc;
  }, {} as Record<string, ProcessGroup[]>);

  return (
    <div className="space-y-4 p-4">
      <div className="text-sm text-muted-foreground mb-4">
        {processGroups.length} procesos con riesgos asociados
      </div>
      
      {Object.entries(groupedByMacroproceso).map(([macroprocesoName, processes]) => (
        <Card key={macroprocesoName} className="overflow-hidden">
          <CardHeader className="py-3 px-4 bg-muted/50">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {macroprocesoName}
              <Badge variant="secondary" className="ml-auto">
                {processes.reduce((sum, p) => sum + p.riskCount, 0)} riesgos
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {processes.map(process => (
              <ProcessRow 
                key={process.processId}
                process={process}
                isExpanded={expandedProcesses.has(process.processId)}
                onToggle={() => toggleProcess(process.processId)}
              />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ProcessRow({ 
  process, 
  isExpanded, 
  onToggle 
}: { 
  process: ProcessGroup; 
  isExpanded: boolean; 
  onToggle: () => void;
}) {
  const { data: risks, isLoading: isRisksLoading } = useQuery<{ data: Risk[] }>({
    queryKey: ["/api/risks", { processId: process.processId }],
    queryFn: async () => {
      const response = await fetch(`/api/risks?processId=${process.processId}&limit=100`);
      if (!response.ok) throw new Error("Failed to fetch risks");
      return response.json();
    },
    enabled: isExpanded,
    staleTime: 1000 * 30,
  });

  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 text-left hover-elevate",
          isExpanded && "bg-muted/30"
        )}
        data-testid={`process-row-${process.processId}`}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{process.processCode}</span>
            <span className="text-sm text-muted-foreground truncate">{process.processName}</span>
          </div>
        </div>
        <Badge variant="outline" className="shrink-0">
          {process.riskCount} {process.riskCount === 1 ? "riesgo" : "riesgos"}
        </Badge>
      </button>

      {isExpanded && (
        <div className="bg-muted/20 px-4 py-2 pl-10">
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
