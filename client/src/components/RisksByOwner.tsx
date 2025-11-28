import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown, ChevronRight, AlertTriangle, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface OwnerGroup {
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerPosition: string | null;
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

export function RisksByOwner() {
  const [expandedOwners, setExpandedOwners] = useState<Set<string>>(new Set());

  const { data: ownerGroups, isLoading: isGroupsLoading } = useQuery<OwnerGroup[]>({
    queryKey: ["/api/risks/grouped-by-owner"],
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });

  const toggleOwner = (ownerId: string) => {
    setExpandedOwners(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ownerId)) {
        newSet.delete(ownerId);
      } else {
        newSet.add(ownerId);
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

  if (!ownerGroups || ownerGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Users className="h-12 w-12 mb-4 opacity-50" />
        <p>No hay riesgos con responsables asignados</p>
      </div>
    );
  }

  const totalRisks = ownerGroups.reduce((sum, o) => sum + o.riskCount, 0);

  return (
    <div className="space-y-4 p-4">
      <div className="text-sm text-muted-foreground mb-4">
        {ownerGroups.length} responsables gestionando {totalRisks} riesgos
      </div>
      
      <Card className="overflow-hidden">
        <CardHeader className="py-3 px-4 bg-muted/50">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Responsables de Riesgos
            <Badge variant="secondary" className="ml-auto">
              {totalRisks} riesgos
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {ownerGroups.map(owner => (
            <OwnerRow 
              key={owner.ownerId}
              owner={owner}
              isExpanded={expandedOwners.has(owner.ownerId)}
              onToggle={() => toggleOwner(owner.ownerId)}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function OwnerRow({ 
  owner, 
  isExpanded, 
  onToggle 
}: { 
  owner: OwnerGroup; 
  isExpanded: boolean; 
  onToggle: () => void;
}) {
  const { data: risks, isLoading: isRisksLoading } = useQuery<{ data: Risk[] }>({
    queryKey: ["/api/risks", { ownerId: owner.ownerId }],
    queryFn: async () => {
      const response = await fetch(`/api/risks?ownerId=${owner.ownerId}&limit=100`);
      if (!response.ok) throw new Error("Failed to fetch risks");
      return response.json();
    },
    enabled: isExpanded,
    staleTime: 1000 * 30,
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 text-left hover-elevate",
          isExpanded && "bg-muted/30"
        )}
        data-testid={`owner-row-${owner.ownerId}`}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {getInitials(owner.ownerName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{owner.ownerName}</div>
          <div className="text-xs text-muted-foreground truncate">
            {owner.ownerPosition || owner.ownerEmail}
          </div>
        </div>
        <Badge variant="outline" className="shrink-0">
          {owner.riskCount} {owner.riskCount === 1 ? "riesgo" : "riesgos"}
        </Badge>
      </button>

      {isExpanded && (
        <div className="bg-muted/20 px-4 py-2 pl-14">
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
