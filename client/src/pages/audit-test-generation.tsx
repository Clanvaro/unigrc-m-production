import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle, 
  Settings, 
  FileText, 
  Users, 
  Clock, 
  AlertTriangle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Target,
  Shield,
  TrendingUp
} from "lucide-react";
import { GenerationWizard } from "@/components/audit-generation/GenerationWizard";
import { RiskSelectionPanel } from "@/components/audit-generation/RiskSelectionPanel";
import { TemplatePreview } from "@/components/audit-generation/TemplatePreview";
import { GenerationSummary } from "@/components/audit-generation/GenerationSummary";
import { GeneratedTestsDisplay } from "@/components/audit-generation/GeneratedTestsDisplay";

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

interface GenerationParams {
  auditId: string;
  selectedRisks: string[];
  generationType: 'auto' | 'semi_auto' | 'manual_assisted';
  scopeFilters: Record<string, any>;
  generationRules: Record<string, any>;
  customizations: Record<string, any>;
  algorithmVersion: string;
  aiAssistanceLevel: 'none' | 'basic' | 'standard' | 'advanced';
  qualityThreshold: number;
}

interface GeneratedTest {
  auditTestId: string;
  templateId: string;
  riskId: string;
  generationMethod: 'auto' | 'customized' | 'manual';
  customizationLevel: 'none' | 'minimal' | 'moderate' | 'extensive';
  customizations: Record<string, any>;
  generationScore: number;
  validationPassed: boolean;
  issuesFound: string[];
  estimatedHours: number;
  procedures: any[];
}

interface TemplateStatus {
  initialized: boolean;
  categoriesCount: number;
  templatesCount: number;
  categories: Array<{
    name: string;
    code: string;
    riskTypes: string[];
  }>;
}

export default function AuditTestGenerationPage() {
  const [selectedAuditId, setSelectedAuditId] = useState<string>("");
  const [selectedRisks, setSelectedRisks] = useState<string[]>([]);
  const [generationParams, setGenerationParams] = useState<Partial<GenerationParams>>({
    generationType: 'auto',
    algorithmVersion: '1.0',
    aiAssistanceLevel: 'standard',
    qualityThreshold: 80,
    scopeFilters: {},
    generationRules: {},
    customizations: {}
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [generatedTests, setGeneratedTests] = useState<GeneratedTest[]>([]);
  const [riskProfiles, setRiskProfiles] = useState<RiskProfile[]>([]);
  const [previewData, setPreviewData] = useState<any>(null);

  // Fetch available audits
  const { data: audits, isLoading: auditsLoading } = useQuery({
    queryKey: ["/api/audits"],
    enabled: true,
    select: (data: any) => data.data || []
  });

  // Fetch available risks
  const { data: risks, isLoading: risksLoading } = useQuery({
    queryKey: ["/api/risks"],
    enabled: true
  });

  // Fetch template status
  const { data: templateStatus, isLoading: templateStatusLoading } = useQuery<TemplateStatus>({
    queryKey: ["/api/templates/status"],
    enabled: true
  });

  // Initialize templates mutation
  const initializeTemplatesMutation = useMutation({
    mutationFn: () => apiRequest("/api/templates/initialize", "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates/status"] });
    }
  });

  // Risk analysis mutation
  const analyzeRisksMutation = useMutation({
    mutationFn: (riskIds: string[]) => apiRequest("/api/audit-generation/analyze-risks", "POST", { riskIds }),
    onSuccess: async (response) => {
      const data = await response.json();
      setRiskProfiles(data.riskProfiles || []);
    }
  });

  // Generation preview mutation
  const previewGenerationMutation = useMutation({
    mutationFn: (params: Partial<GenerationParams>) => apiRequest("/api/audit-generation/preview", "POST", params),
    onSuccess: async (response) => {
      const data = await response.json();
      setPreviewData(data.preview);
    }
  });

  // Test generation mutation
  const generateTestsMutation = useMutation({
    mutationFn: (params: GenerationParams) => apiRequest("/api/audit-generation/generate-tests", "POST", params),
    onSuccess: async (response) => {
      const data = await response.json();
      setGeneratedTests(data.tests || []);
      setCurrentStep(4); // Move to results step
    }
  });

  const wizardSteps = [
    {
      id: 'audit-selection',
      title: 'Seleccionar Auditoría',
      description: 'Selecciona la auditoría para la cual generar tests',
      icon: Target,
      color: 'text-blue-600'
    },
    {
      id: 'risk-selection',
      title: 'Seleccionar Riesgos',
      description: 'Selecciona los riesgos para analizar y generar tests',
      icon: Shield,
      color: 'text-orange-600'
    },
    {
      id: 'generation-options',
      title: 'Opciones de Generación',
      description: 'Configura las opciones de generación y personalización',
      icon: Settings,
      color: 'text-purple-600'
    },
    {
      id: 'preview-customize',
      title: 'Vista Previa y Personalización',
      description: 'Revisa y personaliza los tests antes de generar',
      icon: FileText,
      color: 'text-green-600'
    },
    {
      id: 'results',
      title: 'Tests Generados',
      description: 'Revisa los tests generados y asigna auditores',
      icon: CheckCircle,
      color: 'text-emerald-600'
    }
  ];

  const handleNextStep = () => {
    if (currentStep < wizardSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleRiskSelection = (riskIds: string[]) => {
    setSelectedRisks(riskIds);
    
    // Automatically analyze selected risks
    if (riskIds.length > 0) {
      analyzeRisksMutation.mutate(riskIds);
    }
  };

  const handleGenerationOptionsUpdate = (options: Partial<GenerationParams>) => {
    setGenerationParams(prev => ({ ...prev, ...options }));
  };

  const handlePreviewGeneration = () => {
    if (selectedRisks.length > 0 && selectedAuditId) {
      const params = {
        ...generationParams,
        auditId: selectedAuditId,
        selectedRisks
      };
      previewGenerationMutation.mutate(params);
    }
  };

  const handleGenerateTests = () => {
    if (selectedRisks.length > 0 && selectedAuditId) {
      const params: GenerationParams = {
        auditId: selectedAuditId,
        selectedRisks,
        generationType: generationParams.generationType || 'auto',
        scopeFilters: generationParams.scopeFilters || {},
        generationRules: generationParams.generationRules || {},
        customizations: generationParams.customizations || {},
        algorithmVersion: generationParams.algorithmVersion || '1.0',
        aiAssistanceLevel: generationParams.aiAssistanceLevel || 'standard',
        qualityThreshold: generationParams.qualityThreshold || 80
      };
      generateTestsMutation.mutate(params);
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 0: return selectedAuditId !== "";
      case 1: return selectedRisks.length > 0;
      case 2: return true; // Options are optional
      case 3: return true; // Preview is optional
      default: return false;
    }
  };

  // Initialize templates if not already done
  useEffect(() => {
    if (templateStatus && !templateStatus.initialized) {
      initializeTemplatesMutation.mutate();
    }
  }, [templateStatus]);

  if (auditsLoading || risksLoading || templateStatusLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-generation">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando sistema de generación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6" data-testid="audit-test-generation-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">
            Generación Automática de Audit Tests
          </h1>
          <p className="text-muted-foreground mt-2">
            Sistema inteligente para generar tests de auditoría basados en análisis de riesgos
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-green-50 text-green-700">
            <Sparkles className="h-3 w-3 mr-1" />
            Generación Inteligente
          </Badge>
          {templateStatus?.initialized && (
            <Badge variant="secondary">
              {templateStatus.templatesCount} Templates Disponibles
            </Badge>
          )}
        </div>
      </div>

      {/* Template Status Alert */}
      {templateStatus && !templateStatus.initialized && (
        <Alert data-testid="template-initialization-alert">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            El repositorio de templates no está inicializado. 
            <Button 
              variant="link" 
              size="sm" 
              className="p-0 ml-1 h-auto"
              onClick={() => initializeTemplatesMutation.mutate()}
              disabled={initializeTemplatesMutation.isPending}
              data-testid="button-initialize-templates"
            >
              {initializeTemplatesMutation.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Inicializando...
                </>
              ) : (
                'Inicializar ahora'
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Progress Indicator */}
      <Card data-testid="progress-indicator">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Progreso de Generación</CardTitle>
            <Badge variant="outline">
              Paso {currentStep + 1} de {wizardSteps.length}
            </Badge>
          </div>
          <Progress value={(currentStep / (wizardSteps.length - 1)) * 100} className="mt-2" />
        </CardHeader>
        <CardContent>
          <div className="flex justify-between">
            {wizardSteps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={step.id} className="flex flex-col items-center space-y-2">
                  <div 
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center
                      ${isActive ? 'bg-blue-600 text-white' : 
                        isCompleted ? 'bg-green-600 text-white' : 
                        'bg-muted text-muted-foreground'}
                    `}
                    data-testid={`step-indicator-${index}`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-medium ${isActive ? step.color : 'text-muted-foreground'}`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground max-w-24">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Wizard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3">
          <Card data-testid="wizard-content">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {(() => {
                  const Icon = wizardSteps[currentStep].icon;
                  return <Icon className={`h-5 w-5 ${wizardSteps[currentStep].color}`} />;
                })()}
                <span>{wizardSteps[currentStep].title}</span>
              </CardTitle>
              <CardDescription>
                {wizardSteps[currentStep].description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Step 0: Audit Selection */}
              {currentStep === 0 && (
                <div className="space-y-4" data-testid="audit-selection-step">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Seleccionar Auditoría
                    </label>
                    <select 
                      className="w-full p-3 border rounded-lg"
                      value={selectedAuditId}
                      onChange={(e) => setSelectedAuditId(e.target.value)}
                      data-testid="select-audit"
                    >
                      <option value="">Selecciona una auditoría...</option>
                      {audits?.map((audit: any) => (
                        <option key={audit.id} value={audit.id}>
                          {audit.name} - {audit.type} ({audit.year})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {selectedAuditId && (
                    <Alert>
                      <Target className="h-4 w-4" />
                      <AlertDescription>
                        Auditoría seleccionada. Procede al siguiente paso para seleccionar los riesgos.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Step 1: Risk Selection */}
              {currentStep === 1 && (
                <RiskSelectionPanel
                  risks={(risks as any[]) || []}
                  selectedRisks={selectedRisks}
                  onRiskSelection={handleRiskSelection}
                  isAnalyzing={analyzeRisksMutation.isPending}
                  riskProfiles={riskProfiles}
                />
              )}

              {/* Step 2: Generation Options */}
              {currentStep === 2 && (
                <div className="space-y-6" data-testid="generation-options-step">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-medium">Tipo de Generación</h3>
                      <div className="space-y-2">
                        {[
                          { value: 'auto', label: 'Automática', description: 'Generación completamente automática' },
                          { value: 'semi_auto', label: 'Semi-automática', description: 'Con revisión intermedia' },
                          { value: 'manual_assisted', label: 'Asistida', description: 'Control manual con sugerencias' }
                        ].map((option) => (
                          <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                            <input
                              type="radio"
                              name="generationType"
                              value={option.value}
                              checked={generationParams.generationType === option.value}
                              onChange={(e) => handleGenerationOptionsUpdate({ generationType: e.target.value as any })}
                              className="mt-1"
                              data-testid={`radio-generation-type-${option.value}`}
                            />
                            <div>
                              <p className="font-medium">{option.label}</p>
                              <p className="text-sm text-muted-foreground">{option.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-medium">Nivel de Asistencia IA</h3>
                      <div className="space-y-2">
                        {[
                          { value: 'none', label: 'Sin IA' },
                          { value: 'basic', label: 'Básico' },
                          { value: 'standard', label: 'Estándar' },
                          { value: 'advanced', label: 'Avanzado' }
                        ].map((option) => (
                          <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="radio"
                              name="aiAssistanceLevel"
                              value={option.value}
                              checked={generationParams.aiAssistanceLevel === option.value}
                              onChange={(e) => handleGenerationOptionsUpdate({ aiAssistanceLevel: e.target.value as any })}
                              data-testid={`radio-ai-level-${option.value}`}
                            />
                            <span>{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium">Umbral de Calidad</h3>
                    <div className="space-y-2">
                      <input
                        type="range"
                        min="60"
                        max="100"
                        step="5"
                        value={generationParams.qualityThreshold || 80}
                        onChange={(e) => handleGenerationOptionsUpdate({ qualityThreshold: parseInt(e.target.value) })}
                        className="w-full"
                        data-testid="slider-quality-threshold"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>60% (Rápido)</span>
                        <span className="font-medium">Actual: {generationParams.qualityThreshold}%</span>
                        <span>100% (Exhaustivo)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Preview & Customize */}
              {currentStep === 3 && (
                <div className="space-y-6" data-testid="preview-customize-step">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Vista Previa de Generación</h3>
                    <Button 
                      onClick={handlePreviewGeneration}
                      disabled={previewGenerationMutation.isPending}
                      variant="outline"
                      data-testid="button-preview-generation"
                    >
                      {previewGenerationMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Generando vista previa...
                        </>
                      ) : (
                        'Generar Vista Previa'
                      )}
                    </Button>
                  </div>

                  {previewData && (
                    <div className="space-y-4">
                      <Alert>
                        <TrendingUp className="h-4 w-4" />
                        <AlertDescription>
                          Se generarán <strong>{previewData.estimatedTests}</strong> tests con un total estimado de <strong>{previewData.estimatedHours} horas</strong> de trabajo.
                        </AlertDescription>
                      </Alert>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {previewData.templatesPreview?.map((template: any, index: number) => (
                          <Card key={index} className="p-4">
                            <h4 className="font-medium text-sm mb-2">{template.templateName}</h4>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <p>Horas estimadas: {template.estimatedHours}</p>
                              <p>Procedimientos: {template.procedureCount}</p>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Results */}
              {currentStep === 4 && (
                <GeneratedTestsDisplay
                  generatedTests={generatedTests}
                  onTestUpdate={(testId, updates) => {
                    setGeneratedTests(prev => 
                      prev.map(test => 
                        test.auditTestId === testId ? { ...test, ...updates } : test
                      )
                    );
                  }}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card data-testid="generation-summary-sidebar">
            <CardHeader>
              <CardTitle className="text-lg">Resumen de Generación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Auditoría</span>
                  <Badge variant="outline" className="text-xs">
                    {selectedAuditId ? 'Seleccionada' : 'Pendiente'}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Riesgos</span>
                  <Badge variant="outline" className="text-xs">
                    {selectedRisks.length} seleccionados
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Templates</span>
                  <Badge variant="outline" className="text-xs">
                    {templateStatus?.templatesCount || 0} disponibles
                  </Badge>
                </div>

                {riskProfiles.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    <h4 className="text-sm font-medium">Análisis de Riesgos</h4>
                    {riskProfiles.map((profile) => (
                      <div key={profile.riskId} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Categoría</span>
                          <Badge variant="secondary" className="text-xs">
                            {profile.category}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Complejidad</span>
                          <Badge 
                            variant={profile.complexity === 'highly_complex' ? 'destructive' : 'outline'} 
                            className="text-xs"
                          >
                            {profile.complexity}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Horas est.</span>
                          <span className="text-xs font-medium">{profile.estimatedHours}h</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="space-y-2">
            <Button 
              onClick={currentStep === 3 ? handleGenerateTests : handleNextStep}
              disabled={!canProceedToNext() || currentStep === wizardSteps.length - 1}
              className="w-full"
              data-testid="button-next-step"
            >
              {currentStep === 3 ? (
                generateTestsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Generando Tests...
                  </>
                ) : (
                  <>
                    Generar Tests
                    <Sparkles className="h-4 w-4 ml-2" />
                  </>
                )
              ) : (
                <>
                  Siguiente
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>

            {currentStep > 0 && (
              <Button 
                onClick={handlePreviousStep}
                variant="outline"
                className="w-full"
                data-testid="button-previous-step"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}