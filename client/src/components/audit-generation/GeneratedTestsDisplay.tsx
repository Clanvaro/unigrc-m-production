import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Users, 
  FileText, 
  Eye,
  Edit,
  Download,
  Share2,
  ChevronRight,
  TrendingUp,
  Shield,
  Target,
  Settings,
  Activity
} from "lucide-react";

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

interface GeneratedTestsDisplayProps {
  generatedTests: GeneratedTest[];
  onTestUpdate: (testId: string, updates: any) => void;
}

export function GeneratedTestsDisplay({ generatedTests, onTestUpdate }: GeneratedTestsDisplayProps) {
  const [selectedTest, setSelectedTest] = useState<GeneratedTest | null>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');

  const getMethodBadge = (method: string) => {
    const badges = {
      'auto': { color: 'bg-green-100 text-green-800', label: 'Automático' },
      'customized': { color: 'bg-blue-100 text-blue-800', label: 'Personalizado' },
      'manual': { color: 'bg-orange-100 text-orange-800', label: 'Manual' }
    };
    return badges[method as keyof typeof badges] || badges.auto;
  };

  const getComplexityBadge = (level: string) => {
    const badges = {
      'none': { color: 'bg-gray-100 text-gray-800', label: 'Sin personalización' },
      'minimal': { color: 'bg-blue-100 text-blue-800', label: 'Mínima' },
      'moderate': { color: 'bg-yellow-100 text-yellow-800', label: 'Moderada' },
      'extensive': { color: 'bg-red-100 text-red-800', label: 'Extensa' }
    };
    return badges[level as keyof typeof badges] || badges.none;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const totalHours = generatedTests.reduce((sum, test) => sum + test.estimatedHours, 0);
  const validTests = generatedTests.filter(test => test.validationPassed);
  const averageScore = generatedTests.length > 0 
    ? Math.round(generatedTests.reduce((sum, test) => sum + test.generationScore, 0) / generatedTests.length)
    : 0;

  if (generatedTests.length === 0) {
    return (
      <div className="text-center py-12" data-testid="no-tests-message">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No hay tests generados</h3>
        <p className="text-muted-foreground">
          Completa los pasos anteriores para generar tests de auditoría automáticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="generated-tests-display">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{generatedTests.length}</div>
                <div className="text-sm text-muted-foreground">Tests Generados</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{totalHours}</div>
                <div className="text-sm text-muted-foreground">Horas Totales</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{validTests.length}</div>
                <div className="text-sm text-muted-foreground">Tests Válidos</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <div className={`text-2xl font-bold ${getScoreColor(averageScore)}`}>
                  {averageScore}%
                </div>
                <div className="text-sm text-muted-foreground">Score Promedio</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Validation Issues Alert */}
      {generatedTests.some(test => !test.validationPassed) && (
        <Alert data-testid="validation-issues-alert">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {generatedTests.filter(test => !test.validationPassed).length} tests requieren revisión debido a problemas de validación.
          </AlertDescription>
        </Alert>
      )}

      {/* View Mode Toggle */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="summary" data-testid="tab-summary-view">Vista Resumen</TabsTrigger>
          <TabsTrigger value="detailed" data-testid="tab-detailed-view">Vista Detallada</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {generatedTests.map((test) => {
              const methodBadge = getMethodBadge(test.generationMethod);
              const complexityBadge = getComplexityBadge(test.customizationLevel);
              
              return (
                <Card 
                  key={test.auditTestId} 
                  className="hover:shadow-md transition-shadow"
                  data-testid={`test-card-${test.auditTestId}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-sm mb-2">
                          Test #{test.auditTestId.slice(-8)}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Riesgo: {test.riskId.slice(-8)}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-1">
                        {test.validationPassed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className={methodBadge.color} variant="secondary">
                        {methodBadge.label}
                      </Badge>
                      <div className={`text-sm font-medium ${getScoreColor(test.generationScore)}`}>
                        {test.generationScore}%
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Horas estimadas:</span>
                        <span className="font-medium">{test.estimatedHours}h</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Procedimientos:</span>
                        <span className="font-medium">{test.procedures.length}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Personalización:</span>
                        <Badge className={`${complexityBadge.color} text-xs`} variant="secondary">
                          {complexityBadge.label}
                        </Badge>
                      </div>
                    </div>

                    {test.issuesFound.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-red-600">
                          {test.issuesFound.length} problemas encontrados
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {test.issuesFound.join(', ')}
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-2 pt-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => setSelectedTest(test)}
                            data-testid={`button-view-test-${test.auditTestId}`}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Ver
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Detalles del Test Generado</DialogTitle>
                            <DialogDescription>
                              Test #{test.auditTestId} - {methodBadge.label}
                            </DialogDescription>
                          </DialogHeader>
                          <TestDetailsModal test={test} />
                        </DialogContent>
                      </Dialog>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        data-testid={`button-edit-test-${test.auditTestId}`}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tests Generados - Vista Detallada</CardTitle>
              <CardDescription>
                Información completa de todos los tests generados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {generatedTests.map((test, index) => {
                    const methodBadge = getMethodBadge(test.generationMethod);
                    const complexityBadge = getComplexityBadge(test.customizationLevel);
                    
                    return (
                      <div 
                        key={test.auditTestId}
                        className="border rounded-lg p-4 space-y-3"
                        data-testid={`test-detailed-${test.auditTestId}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="text-lg font-medium">
                              Test #{index + 1}
                            </div>
                            <Badge className={methodBadge.color} variant="secondary">
                              {methodBadge.label}
                            </Badge>
                            <Badge className={complexityBadge.color} variant="secondary">
                              {complexityBadge.label}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className={`text-lg font-bold ${getScoreColor(test.generationScore)}`}>
                              {test.generationScore}%
                            </div>
                            {test.validationPassed ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">ID:</span>
                            <div className="font-medium">{test.auditTestId.slice(-12)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Riesgo:</span>
                            <div className="font-medium">{test.riskId.slice(-12)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Horas:</span>
                            <div className="font-medium">{test.estimatedHours}h</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Procedimientos:</span>
                            <div className="font-medium">{test.procedures.length}</div>
                          </div>
                        </div>

                        {test.issuesFound.length > 0 && (
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Problemas encontrados:</strong>
                              <ul className="list-disc list-inside mt-1">
                                {test.issuesFound.map((issue, i) => (
                                  <li key={i} className="text-sm">{issue}</li>
                                ))}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}

                        {Object.keys(test.customizations).length > 0 && (
                          <div className="bg-muted p-3 rounded">
                            <h4 className="font-medium mb-2">Personalizaciones Aplicadas:</h4>
                            <div className="space-y-1 text-sm">
                              {Object.entries(test.customizations).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span className="text-muted-foreground">{key}:</span>
                                  <span className="font-medium">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-3 w-3 mr-1" />
                            Ver Detalles
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                          <Button variant="outline" size="sm">
                            <Share2 className="h-3 w-3 mr-1" />
                            Asignar
                          </Button>
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

      {/* Actions */}
      <Card data-testid="test-actions">
        <CardHeader>
          <CardTitle>Acciones</CardTitle>
          <CardDescription>
            Acciones disponibles para los tests generados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="default" data-testid="button-assign-auditors">
              <Users className="h-4 w-4 mr-2" />
              Asignar Auditores
            </Button>
            <Button variant="outline" data-testid="button-export-tests">
              <Download className="h-4 w-4 mr-2" />
              Exportar Tests
            </Button>
            <Button variant="outline" data-testid="button-generate-report">
              <FileText className="h-4 w-4 mr-2" />
              Generar Reporte
            </Button>
            <Button variant="outline" data-testid="button-bulk-edit">
              <Settings className="h-4 w-4 mr-2" />
              Edición en Lote
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TestDetailsModal({ test }: { test: GeneratedTest }) {
  const methodBadge = {
    'auto': { color: 'bg-green-100 text-green-800', label: 'Automático' },
    'customized': { color: 'bg-blue-100 text-blue-800', label: 'Personalizado' },
    'manual': { color: 'bg-orange-100 text-orange-800', label: 'Manual' }
  }[test.generationMethod];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Test #{test.auditTestId.slice(-8)}</h3>
          <p className="text-sm text-muted-foreground">Riesgo: {test.riskId}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={methodBadge.color} variant="secondary">
            {methodBadge.label}
          </Badge>
          <div className="text-lg font-bold text-blue-600">
            {test.generationScore}%
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold">{test.estimatedHours}</div>
          <div className="text-sm text-muted-foreground">Horas Estimadas</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{test.procedures.length}</div>
          <div className="text-sm text-muted-foreground">Procedimientos</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{Object.keys(test.customizations).length}</div>
          <div className="text-sm text-muted-foreground">Personalizaciones</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{test.issuesFound.length}</div>
          <div className="text-sm text-muted-foreground">Problemas</div>
        </div>
      </div>

      {/* Procedures */}
      <div>
        <h4 className="font-medium mb-3">Procedimientos de Auditoría</h4>
        <div className="space-y-3">
          {test.procedures.map((procedure, index) => (
            <div key={index} className="border rounded-lg p-3">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{procedure.procedureText}</p>
                  <p className="text-xs text-muted-foreground mt-1">{procedure.expectedOutcome}</p>
                  <div className="flex space-x-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {procedure.evidenceType}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {procedure.testingMethod}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Issues */}
      {test.issuesFound.length > 0 && (
        <div>
          <h4 className="font-medium mb-3">Problemas Identificados</h4>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {test.issuesFound.map((issue, index) => (
                  <li key={index} className="text-sm">{issue}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Customizations */}
      {Object.keys(test.customizations).length > 0 && (
        <div>
          <h4 className="font-medium mb-3">Personalizaciones Aplicadas</h4>
          <div className="bg-muted rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(test.customizations).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-sm text-muted-foreground">{key}:</span>
                  <span className="text-sm font-medium">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}