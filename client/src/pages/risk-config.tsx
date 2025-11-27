import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, Sliders, Calculator } from "lucide-react";
import RiskCategories from "@/pages/risk-categories";
import RiskRangesConfig from "@/pages/risk-ranges-config";
import RiskAggregationConfig from "@/pages/risk-aggregation-config";

export default function RiskConfig() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="categories" className="flex items-center gap-2" data-testid="tab-categories">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Categorías</span>
          </TabsTrigger>
          <TabsTrigger value="ranges" className="flex items-center gap-2" data-testid="tab-ranges">
            <Sliders className="h-4 w-4" />
            <span className="hidden sm:inline">Rangos</span>
          </TabsTrigger>
          <TabsTrigger value="aggregation" className="flex items-center gap-2" data-testid="tab-aggregation">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Agregación</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" forceMount className="data-[state=inactive]:hidden">
          <RiskCategories />
        </TabsContent>

        <TabsContent value="ranges" forceMount className="data-[state=inactive]:hidden">
          <RiskRangesConfig />
        </TabsContent>

        <TabsContent value="aggregation" forceMount className="data-[state=inactive]:hidden">
          <RiskAggregationConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}
