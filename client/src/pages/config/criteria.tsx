import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProbabilityCriteriaConfig from "./probability-criteria";
import ImpactCriteriaConfig from "./impact-criteria";

export default function CriteriaConfig() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-muted-foreground mb-2">Criterios dinámicos de Probabilidad e Impacto</h1>
        <p className="text-muted-foreground">
          Gestiona criterios personalizados para evaluar probabilidad e impacto
        </p>
      </div>

      <Tabs defaultValue="probability" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="probability" data-testid="tab-probability">
            Probabilidad
          </TabsTrigger>
          <TabsTrigger value="impact" data-testid="tab-impact">
            Impacto
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="probability" className="mt-6">
          <ProbabilityCriteriaConfig />
        </TabsContent>
        
        <TabsContent value="impact" className="mt-6">
          <ImpactCriteriaConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}