import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle2, 
  Clock, 
  Users, 
  FileText, 
  Target,
  Shield,
  TrendingUp,
  AlertTriangle,
  Info,
  Zap
} from "lucide-react";

interface GenerationSummary {
  auditInfo: {
    id: string;
    name: string;
    type: string;
    year: number;
  };
  selectedRisks: {
    id: string;
    name: string;
    category: string;
    priority: string;
    estimatedHours: number;
  }[];
  templatesUsed: {
    id: string;
    name: string;
    category: string;
    complexity: string;
    procedureCount: number;
    estimatedHours: number;
  }[];
  totals: {
    testsToGenerate: number;
    totalHours: number;
    totalProcedures: number;
    uniqueSkills: string[];
    requiredTools: string[];
  };
  generationConfig: {
    generationType: string;
    aiAssistanceLevel: string;
    qualityThreshold: number;
    customizations: Record<string, any>;
  };
  recommendations: string[];
  warnings: string[];
}

interface GenerationSummaryProps {
  summary: GenerationSummary;
  isReady: boolean;
}

export function GenerationSummary({ summary, isReady }: GenerationSummaryProps) {
  const getPriorityColor = (priority: string) => {
    const colors = {
      'low': 'bg-green-100 text-green-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'high': 'bg-orange-100 text-orange-800',
      'critical': 'bg-red-100 text-red-800'
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const getComplexityColor = (complexity: string) => {
    const colors = {
      'simple': 'bg-green-100 text-green-800',
      'moderate': 'bg-blue-100 text-blue-800',
      'complex': 'bg-orange-100 text-orange-800',
      'highly_complex': 'bg-red-100 text-red-800'
    };
    return colors[complexity as keyof typeof colors] || colors.simple;
  };

  const getGenerationTypeLabel = (type: string) => {
    const labels = {
      'auto': 'Automática',
      'semi_auto': 'Semi-automática',
      'manual_assisted': 'Asistida'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getAILevelLabel = (level: string) => {
    const labels = {
      'none': 'Sin IA',
      'basic': 'Básico',
      'standard': 'Estándar',
      'advanced': 'Avanzado'
    };
    return labels[level as keyof typeof labels] || level;
  };

  return (
    <div className="space-y-6" data-testid="generation-summary">
      {/* Header Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {isReady ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            )}
            <span>Resumen de Generación</span>
          </CardTitle>
          <CardDescription>
            Revisión final antes de generar los audit tests automáticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className={isReady ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}>
            {isReady ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            )}
            <AlertDescription>
              {isReady ? (
                <span className="text-green-800">
                  <strong>Sistema listo para generar tests.</strong> Toda la configuración ha sido validada y los tests pueden generarse automáticamente.
                </span>
              ) : (
                <span className="text-orange-800">
                  <strong>Revisión requerida.</strong> Hay elementos que requieren atención antes de proceder con la generación.
                </span>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Audit Information */}
      <Card data-testid="audit-info-summary">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-blue-600" />
            <span>Información de Auditoría</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Nombre:</span>
              <div className="font-medium">{summary.auditInfo.name}</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Tipo:</span>
              <div className="font-medium">{summary.auditInfo.type}</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Año:</span>
              <div className="font-medium">{summary.auditInfo.year}</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">ID:</span>
              <div className="font-medium text-xs">{summary.auditInfo.id.slice(-8)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generation Totals */}
      <Card data-testid="generation-totals">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            <span>Totales de Generación</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{summary.totals.testsToGenerate}</div>
              <div className="text-sm text-muted-foreground">Tests a Generar</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{summary.totals.totalHours}</div>
              <div className="text-sm text-muted-foreground">Horas Totales</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{summary.totals.totalProcedures}</div>
              <div className="text-sm text-muted-foreground">Procedimientos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{summary.totals.uniqueSkills.length}</div>
              <div className="text-sm text-muted-foreground">Habilidades</div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-3">
            <div>
              <h4 className="font-medium mb-2">Habilidades Requeridas:</h4>
              <div className="flex flex-wrap gap-2">
                {summary.totals.uniqueSkills.map((skill, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            {summary.totals.requiredTools.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Herramientas Necesarias:</h4>
                <div className="flex flex-wrap gap-2">
                  {summary.totals.requiredTools.map((tool, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tool}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected Risks */}
      <Card data-testid="selected-risks-summary">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-orange-600" />
            <span>Riesgos Seleccionados ({summary.selectedRisks.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {summary.selectedRisks.map((risk, index) => (
              <div key={risk.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{risk.name}</h4>
                  <p className="text-xs text-muted-foreground">Categoría: {risk.category}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getPriorityColor(risk.priority)} variant="secondary">
                    {risk.priority}
                  </Badge>
                  <div className="text-sm font-medium">{risk.estimatedHours}h</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Templates Used */}
      <Card data-testid="templates-used-summary">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-green-600" />
            <span>Templates Seleccionados ({summary.templatesUsed.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {summary.templatesUsed.map((template, index) => (
              <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{template.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    Categoría: {template.category} | {template.procedureCount} procedimientos
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getComplexityColor(template.complexity)} variant="secondary">
                    {template.complexity}
                  </Badge>
                  <div className="text-sm font-medium">{template.estimatedHours}h</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Generation Configuration */}
      <Card data-testid="generation-config-summary">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            <span>Configuración de Generación</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Tipo de Generación:</span>
              <div className="font-medium">{getGenerationTypeLabel(summary.generationConfig.generationType)}</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Nivel de IA:</span>
              <div className="font-medium">{getAILevelLabel(summary.generationConfig.aiAssistanceLevel)}</div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Umbral de Calidad:</span>
              <div className="font-medium">{summary.generationConfig.qualityThreshold}%</div>
            </div>
          </div>

          {Object.keys(summary.generationConfig.customizations).length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-medium mb-2">Personalizaciones:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {Object.entries(summary.generationConfig.customizations).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground">{key}:</span>
                    <span className="font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quality Progress */}
      <Card data-testid="quality-progress">
        <CardHeader>
          <CardTitle className="text-lg">Progreso de Calidad</CardTitle>
          <CardDescription>
            Indicadores de completitud y calidad de la configuración
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Configuración General</span>
              <span className="font-medium">100%</span>
            </div>
            <Progress value={100} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Selección de Riesgos</span>
              <span className="font-medium">100%</span>
            </div>
            <Progress value={100} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Templates Validados</span>
              <span className="font-medium">100%</span>
            </div>
            <Progress value={100} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Umbral de Calidad</span>
              <span className="font-medium">{summary.generationConfig.qualityThreshold}%</span>
            </div>
            <Progress value={summary.generationConfig.qualityThreshold} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {summary.recommendations.length > 0 && (
        <Card data-testid="recommendations">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Info className="h-5 w-5 text-blue-600" />
              <span>Recomendaciones</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.recommendations.map((recommendation, index) => (
                <Alert key={index} className="border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    {recommendation}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {summary.warnings.length > 0 && (
        <Card data-testid="warnings">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span>Advertencias</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.warnings.map((warning, index) => (
                <Alert key={index} className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    {warning}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}