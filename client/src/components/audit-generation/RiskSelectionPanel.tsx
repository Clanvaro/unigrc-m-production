import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  Circle, 
  Loader2, 
  AlertTriangle,
  Target,
  Shield,
  TrendingUp,
  Building,
  Users
} from "lucide-react";

interface Risk {
  id: string;
  name: string;
  description: string;
  inherentRisk: number;
  residualRisk: number;
  category: string[];
  complexity: number;
  processId?: string;
  processName?: string;
  macroprocesoName?: string;
}

interface RiskProfile {
  riskId: string;
  category: 'financial' | 'operational' | 'compliance' | 'strategic' | 'reputational' | 'it_security';
  complexity: 'simple' | 'moderate' | 'complex' | 'highly_complex';
  auditScope: 'substantive' | 'controls' | 'hybrid';
  priority: 'low' | 'medium' | 'high' | 'critical';
  controlEnvironment: 'strong' | 'adequate' | 'weak' | 'deficient';
  requiredSkills: string[];
  estimatedHours: number;
  toolsNeeded: string[];
  controlGaps: string[];
  recommendedTemplates: string[];
}

interface RiskSelectionPanelProps {
  risks: Risk[];
  selectedRisks: string[];
  onRiskSelection: (riskIds: string[]) => void;
  isAnalyzing: boolean;
  riskProfiles: RiskProfile[];
}

export function RiskSelectionPanel({
  risks,
  selectedRisks,
  onRiskSelection,
  isAnalyzing,
  riskProfiles
}: RiskSelectionPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedProcess, setSelectedProcess] = useState<string>("all");

  const priorities = useMemo(() => {
    const priorityMap = {
      'low': { color: 'bg-green-100 text-green-800', label: 'Bajo' },
      'medium': { color: 'bg-yellow-100 text-yellow-800', label: 'Medio' },
      'high': { color: 'bg-orange-100 text-orange-800', label: 'Alto' },
      'critical': { color: 'bg-red-100 text-red-800', label: 'Crítico' }
    };
    
    return (risk: Risk) => {
      if (risk.inherentRisk >= 20) return priorityMap.critical;
      if (risk.inherentRisk >= 15) return priorityMap.high;
      if (risk.inherentRisk >= 10) return priorityMap.medium;
      return priorityMap.low;
    };
  }, []);

  const categoryIcons = {
    'financial': Target,
    'operational': Building,
    'compliance': Shield,
    'strategic': TrendingUp,
    'it_security': Shield,
    'reputational': Users
  };

  const filteredRisks = useMemo(() => {
    return risks.filter(risk => {
      const matchesSearch = risk.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           risk.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === "all" || 
                             risk.category.some(cat => cat.toLowerCase().includes(selectedCategory.toLowerCase()));
      
      const riskPriority = priorities(risk).label.toLowerCase();
      const matchesPriority = selectedPriority === "all" || 
                             riskPriority === selectedPriority.toLowerCase();
      
      const matchesProcess = selectedProcess === "all" || 
                            risk.processId === selectedProcess;
      
      return matchesSearch && matchesCategory && matchesPriority && matchesProcess;
    });
  }, [risks, searchTerm, selectedCategory, selectedPriority, selectedProcess, priorities]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    risks.forEach(risk => {
      risk.category.forEach(cat => cats.add(cat));
    });
    return Array.from(cats);
  }, [risks]);

  const processes = useMemo(() => {
    const procs = new Map<string, string>();
    risks.forEach(risk => {
      if (risk.processId && risk.processName) {
        procs.set(risk.processId, risk.processName);
      }
    });
    return Array.from(procs.entries());
  }, [risks]);

  const handleRiskToggle = (riskId: string) => {
    const newSelection = selectedRisks.includes(riskId)
      ? selectedRisks.filter(id => id !== riskId)
      : [...selectedRisks, riskId];
    onRiskSelection(newSelection);
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredRisks.map(risk => risk.id);
    onRiskSelection(allFilteredIds);
  };

  const handleClearSelection = () => {
    onRiskSelection([]);
  };

  const getRiskProfile = (riskId: string) => {
    return riskProfiles.find(profile => profile.riskId === riskId);
  };

  return (
    <div className="space-y-6" data-testid="risk-selection-panel">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Buscar y Filtrar Riesgos</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Buscar</label>
              <Input
                placeholder="Buscar por nombre o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-risks"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Categoría</label>
              <select 
                className="w-full p-2 border rounded-md"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                data-testid="select-category-filter"
              >
                <option value="all">Todas las categorías</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Prioridad</label>
              <select 
                className="w-full p-2 border rounded-md"
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                data-testid="select-priority-filter"
              >
                <option value="all">Todas las prioridades</option>
                <option value="bajo">Bajo</option>
                <option value="medio">Medio</option>
                <option value="alto">Alto</option>
                <option value="crítico">Crítico</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Proceso</label>
              <select 
                className="w-full p-2 border rounded-md"
                value={selectedProcess}
                onChange={(e) => setSelectedProcess(e.target.value)}
                data-testid="select-process-filter"
              >
                <option value="all">Todos los procesos</option>
                {processes.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {filteredRisks.length} riesgos encontrados, {selectedRisks.length} seleccionados
            </div>
            <div className="space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSelectAll}
                data-testid="button-select-all-risks"
              >
                Seleccionar Todos
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleClearSelection}
                data-testid="button-clear-selection"
              >
                Limpiar Selección
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Analysis Status */}
      {isAnalyzing && (
        <Alert data-testid="analyzing-alert">
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Analizando riesgos seleccionados para determinar requerimientos de testing...
          </AlertDescription>
        </Alert>
      )}

      {/* Risk Selection */}
      <Tabs defaultValue="grid" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="grid" data-testid="tab-grid-view">Vista en Grilla</TabsTrigger>
          <TabsTrigger value="list" data-testid="tab-list-view">Vista de Lista</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRisks.map((risk) => {
              const isSelected = selectedRisks.includes(risk.id);
              const riskProfile = getRiskProfile(risk.id);
              const priorityInfo = priorities(risk);
              
              return (
                <Card 
                  key={risk.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => handleRiskToggle(risk.id)}
                  data-testid={`risk-card-${risk.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {isSelected ? (
                            <CheckCircle2 className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                          <CardTitle className="text-sm">{risk.name}</CardTitle>
                        </div>
                        <CardDescription className="text-xs line-clamp-2">
                          {risk.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className={priorityInfo.color} variant="secondary">
                        {priorityInfo.label}
                      </Badge>
                      <div className="text-xs text-muted-foreground">
                        Riesgo: {risk.inherentRisk}/25
                      </div>
                    </div>

                    {risk.category.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {risk.category.slice(0, 2).map((cat, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {cat}
                          </Badge>
                        ))}
                        {risk.category.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{risk.category.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}

                    {risk.processName && (
                      <div className="text-xs text-muted-foreground">
                        Proceso: {risk.processName}
                      </div>
                    )}

                    {riskProfile && (
                      <div className="space-y-2 pt-2 border-t">
                        <div className="text-xs font-medium text-green-700">
                          Análisis Completado
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Complejidad:</span>
                            <div className="font-medium">{riskProfile.complexity}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Horas est.:</span>
                            <div className="font-medium">{riskProfile.estimatedHours}h</div>
                          </div>
                        </div>
                        {riskProfile.controlGaps.length > 0 && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">Gaps identificados:</span>
                            <div className="text-orange-600 font-medium">
                              {riskProfile.controlGaps.length} gaps
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-96">
                <div className="space-y-1 p-4">
                  {filteredRisks.map((risk) => {
                    const isSelected = selectedRisks.includes(risk.id);
                    const riskProfile = getRiskProfile(risk.id);
                    const priorityInfo = priorities(risk);
                    
                    return (
                      <div
                        key={risk.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer hover:bg-muted/50 ${
                          isSelected ? 'bg-blue-50 border border-blue-200' : ''
                        }`}
                        onClick={() => handleRiskToggle(risk.id)}
                        data-testid={`risk-list-item-${risk.id}`}
                      >
                        {isSelected ? (
                          <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-sm truncate">{risk.name}</h4>
                            <Badge className={priorityInfo.color} variant="secondary">
                              {priorityInfo.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {risk.description}
                          </p>
                          {risk.processName && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Proceso: {risk.processName}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end space-y-1">
                          <div className="text-xs text-muted-foreground">
                            {risk.inherentRisk}/25
                          </div>
                          {riskProfile && (
                            <div className="text-xs text-green-600 font-medium">
                              {riskProfile.estimatedHours}h est.
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Selection Summary */}
      {selectedRisks.length > 0 && (
        <Card data-testid="selection-summary">
          <CardHeader>
            <CardTitle className="text-lg">Resumen de Selección</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{selectedRisks.length}</div>
                <div className="text-sm text-muted-foreground">Riesgos Seleccionados</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {riskProfiles.reduce((sum, profile) => sum + profile.estimatedHours, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Horas Estimadas</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {riskProfiles.filter(p => p.complexity === 'complex' || p.complexity === 'highly_complex').length}
                </div>
                <div className="text-sm text-muted-foreground">Riesgos Complejos</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {riskProfiles.filter(p => p.priority === 'critical').length}
                </div>
                <div className="text-sm text-muted-foreground">Riesgos Críticos</div>
              </div>
            </div>

            {riskProfiles.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-medium mb-2">Habilidades Requeridas:</h4>
                <div className="flex flex-wrap gap-2">
                  {[...new Set(riskProfiles.flatMap(p => p.requiredSkills))].map((skill, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {filteredRisks.length === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No se encontraron riesgos que coincidan con los filtros aplicados.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}