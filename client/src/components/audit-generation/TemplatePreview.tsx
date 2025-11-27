import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  FileText, 
  Eye, 
  Edit, 
  Clock, 
  Users, 
  Settings,
  ChevronRight,
  Lightbulb,
  Target,
  Shield,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";

interface TemplatePreview {
  templateId: string;
  templateName: string;
  riskId: string;
  riskName: string;
  category: string;
  complexity: string;
  estimatedHours: number;
  procedureCount: number;
  requiredSkills: string[];
  toolsNeeded: string[];
  customizations: Record<string, any>;
  procedures: TemplateProcedure[];
}

interface TemplateProcedure {
  stepNumber: number;
  procedureText: string;
  expectedOutcome: string;
  evidenceType: string;
  testingMethod: string;
  skillLevel: string;
  estimatedMinutes: number;
  isMandatory: boolean;
  isCustomizable: boolean;
}

interface TemplatePreviewProps {
  templatesPreview: TemplatePreview[];
  onCustomizeTemplate: (templateId: string, customizations: Record<string, any>) => void;
  onRemoveTemplate: (templateId: string) => void;
  onAddCustomProcedure: (templateId: string, procedure: TemplateProcedure) => void;
}

export function TemplatePreview({
  templatesPreview,
  onCustomizeTemplate,
  onRemoveTemplate,
  onAddCustomProcedure
}: TemplatePreviewProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplatePreview | null>(null);
  const [customizationMode, setCustomizationMode] = useState<string | null>(null);

  const getComplexityColor = (complexity: string) => {
    const colors = {
      'simple': 'bg-green-100 text-green-800',
      'moderate': 'bg-blue-100 text-blue-800',
      'complex': 'bg-orange-100 text-orange-800',
      'highly_complex': 'bg-red-100 text-red-800'
    };
    return colors[complexity as keyof typeof colors] || colors.simple;
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      'financial': Target,
      'operational': Settings,
      'compliance': Shield,
      'strategic': Lightbulb,
      'it_security': Shield
    };
    return icons[category as keyof typeof icons] || FileText;
  };

  const totalHours = templatesPreview.reduce((sum, template) => sum + template.estimatedHours, 0);
  const totalProcedures = templatesPreview.reduce((sum, template) => sum + template.procedureCount, 0);
  const allSkills = [...new Set(templatesPreview.flatMap(t => t.requiredSkills))];

  if (templatesPreview.length === 0) {
    return (
      <div className="text-center py-12" data-testid="no-templates-preview">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No hay templates para previsualizar</h3>
        <p className="text-muted-foreground">
          Selecciona riesgos en el paso anterior para ver los templates recomendados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="template-preview">
      {/* Summary Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>Vista Previa de Templates</span>
          </CardTitle>
          <CardDescription>
            Templates seleccionados automáticamente basados en el análisis de riesgos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{templatesPreview.length}</div>
              <div className="text-sm text-muted-foreground">Templates</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{totalHours}</div>
              <div className="text-sm text-muted-foreground">Horas Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{totalProcedures}</div>
              <div className="text-sm text-muted-foreground">Procedimientos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{allSkills.length}</div>
              <div className="text-sm text-muted-foreground">Habilidades</div>
            </div>
          </div>
          
          {allSkills.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="font-medium mb-2">Habilidades Requeridas:</h4>
              <div className="flex flex-wrap gap-2">
                {allSkills.map((skill, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {templatesPreview.map((template) => {
          const CategoryIcon = getCategoryIcon(template.category);
          
          return (
            <Card 
              key={template.templateId} 
              className="hover:shadow-md transition-shadow"
              data-testid={`template-preview-${template.templateId}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <CategoryIcon className="h-5 w-5 text-blue-600" />
                      <span>{template.templateName}</span>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Para riesgo: <strong>{template.riskName}</strong>
                    </CardDescription>
                  </div>
                  <Badge className={getComplexityColor(template.complexity)} variant="secondary">
                    {template.complexity}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Template Metrics */}
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="text-center">
                    <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <div className="font-medium">{template.estimatedHours}h</div>
                    <div className="text-xs text-muted-foreground">Estimadas</div>
                  </div>
                  <div className="text-center">
                    <FileText className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <div className="font-medium">{template.procedureCount}</div>
                    <div className="text-xs text-muted-foreground">Procedimientos</div>
                  </div>
                  <div className="text-center">
                    <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                    <div className="font-medium">{template.requiredSkills.length}</div>
                    <div className="text-xs text-muted-foreground">Habilidades</div>
                  </div>
                </div>

                {/* Required Skills */}
                {template.requiredSkills.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Habilidades Requeridas:</h4>
                    <div className="flex flex-wrap gap-1">
                      {template.requiredSkills.slice(0, 3).map((skill, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {template.requiredSkills.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.requiredSkills.length - 3} más
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Tools Needed */}
                {template.toolsNeeded.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Herramientas Necesarias:</h4>
                    <div className="flex flex-wrap gap-1">
                      {template.toolsNeeded.slice(0, 2).map((tool, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tool}
                        </Badge>
                      ))}
                      {template.toolsNeeded.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{template.toolsNeeded.length - 2} más
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Customizations Applied */}
                {Object.keys(template.customizations).length > 0 && (
                  <Alert>
                    <Settings className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Personalizaciones aplicadas:</strong> {Object.keys(template.customizations).length} configuraciones automáticas.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Actions */}
                <div className="flex space-x-2 pt-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => setSelectedTemplate(template)}
                        data-testid={`button-view-template-${template.templateId}`}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Ver Detalles
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Detalles del Template</DialogTitle>
                        <DialogDescription>
                          {template.templateName} - {template.category}
                        </DialogDescription>
                      </DialogHeader>
                      <TemplateDetailsModal template={template} />
                    </DialogContent>
                  </Dialog>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCustomizationMode(template.templateId)}
                    data-testid={`button-customize-template-${template.templateId}`}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Personalizar
                  </Button>
                  
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => onRemoveTemplate(template.templateId)}
                    data-testid={`button-remove-template-${template.templateId}`}
                  >
                    Quitar
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Global Actions */}
      <Card data-testid="template-actions">
        <CardHeader>
          <CardTitle>Acciones Globales</CardTitle>
          <CardDescription>
            Acciones que se aplicarán a todos los templates seleccionados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" data-testid="button-customize-all">
              <Settings className="h-4 w-4 mr-2" />
              Personalizar Todos
            </Button>
            <Button variant="outline" data-testid="button-adjust-hours">
              <Clock className="h-4 w-4 mr-2" />
              Ajustar Horas
            </Button>
            <Button variant="outline" data-testid="button-modify-procedures">
              <FileText className="h-4 w-4 mr-2" />
              Modificar Procedimientos
            </Button>
            <Button variant="outline" data-testid="button-export-preview">
              <FileText className="h-4 w-4 mr-2" />
              Exportar Vista Previa
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Validation Status */}
      <Alert data-testid="validation-status">
        <CheckCircle2 className="h-4 w-4" />
        <AlertDescription>
          <strong>Validación completada:</strong> Todos los templates han sido validados y están listos para generar. 
          Tiempo total estimado: <strong>{totalHours} horas</strong> de trabajo de auditoría.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function TemplateDetailsModal({ template }: { template: TemplatePreview }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{template.templateName}</h3>
          <p className="text-sm text-muted-foreground">
            Categoría: {template.category} | Complejidad: {template.complexity}
          </p>
        </div>
        <Badge className={
          template.complexity === 'highly_complex' ? 'bg-red-100 text-red-800' :
          template.complexity === 'complex' ? 'bg-orange-100 text-orange-800' :
          template.complexity === 'moderate' ? 'bg-blue-100 text-blue-800' :
          'bg-green-100 text-green-800'
        } variant="secondary">
          {template.complexity}
        </Badge>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold">{template.estimatedHours}</div>
          <div className="text-sm text-muted-foreground">Horas Estimadas</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{template.procedureCount}</div>
          <div className="text-sm text-muted-foreground">Procedimientos</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{template.requiredSkills.length}</div>
          <div className="text-sm text-muted-foreground">Habilidades</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{template.toolsNeeded.length}</div>
          <div className="text-sm text-muted-foreground">Herramientas</div>
        </div>
      </div>

      {/* Procedures */}
      <div>
        <h4 className="font-medium mb-3">Procedimientos de Auditoría</h4>
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {template.procedures.map((procedure, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">
                    {procedure.stepNumber}
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
                      <Badge variant="outline" className="text-xs">
                        {procedure.estimatedMinutes} min
                      </Badge>
                      {procedure.isMandatory && (
                        <Badge variant="secondary" className="text-xs">
                          Obligatorio
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Required Skills */}
      <div>
        <h4 className="font-medium mb-3">Habilidades Requeridas</h4>
        <div className="flex flex-wrap gap-2">
          {template.requiredSkills.map((skill, index) => (
            <Badge key={index} variant="outline">
              {skill}
            </Badge>
          ))}
        </div>
      </div>

      {/* Tools Needed */}
      {template.toolsNeeded.length > 0 && (
        <div>
          <h4 className="font-medium mb-3">Herramientas Necesarias</h4>
          <div className="flex flex-wrap gap-2">
            {template.toolsNeeded.map((tool, index) => (
              <Badge key={index} variant="secondary">
                {tool}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Customizations */}
      {Object.keys(template.customizations).length > 0 && (
        <div>
          <h4 className="font-medium mb-3">Personalizaciones Aplicadas</h4>
          <div className="bg-muted rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(template.customizations).map(([key, value]) => (
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