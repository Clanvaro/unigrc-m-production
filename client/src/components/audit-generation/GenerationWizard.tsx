import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles,
  Target,
  Settings,
  FileText,
  Eye,
  Wand2
} from "lucide-react";

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  component: any;
}

interface GenerationWizardProps {
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  canProceedToNext: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onComplete: () => void;
  isGenerating?: boolean;
}

export function GenerationWizard({
  steps,
  currentStep,
  onStepChange,
  canProceedToNext,
  onNext,
  onPrevious,
  onComplete,
  isGenerating = false
}: GenerationWizardProps) {
  const progress = (currentStep / (steps.length - 1)) * 100;
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="space-y-6" data-testid="generation-wizard">
      {/* Progress Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="flex items-center space-x-2">
              <Wand2 className="h-5 w-5 text-purple-600" />
              <span>Generación Automática de Audit Tests</span>
            </CardTitle>
            <Badge variant="outline">
              Paso {currentStep + 1} de {steps.length}
            </Badge>
          </div>
          <CardDescription>
            Proceso guiado para generar audit tests automáticamente basados en análisis de riesgos
          </CardDescription>
          <Progress value={progress} className="mt-3" />
        </CardHeader>
        
        <CardContent>
          <div className="flex justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              const isAvailable = index <= currentStep;
              
              return (
                <div key={step.id} className="flex flex-col items-center space-y-2">
                  <button
                    onClick={() => isAvailable && onStepChange(index)}
                    disabled={!isAvailable}
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center transition-all
                      ${isActive ? 
                        'bg-blue-600 text-white shadow-lg scale-110' : 
                        isCompleted ? 
                        'bg-green-600 text-white hover:bg-green-700' : 
                        isAvailable ?
                        'bg-muted text-muted-foreground hover:bg-muted/80' :
                        'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'}
                    `}
                    data-testid={`wizard-step-${index}`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </button>
                  
                  <div className="text-center max-w-20">
                    <p className={`text-xs font-medium ${
                      isActive ? step.color : 
                      isCompleted ? 'text-green-600' : 
                      'text-muted-foreground'
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground leading-tight">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Current Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {(() => {
              const Icon = steps[currentStep].icon;
              return <Icon className={`h-5 w-5 ${steps[currentStep].color}`} />;
            })()}
            <span>{steps[currentStep].title}</span>
          </CardTitle>
          <CardDescription>
            {steps[currentStep].description}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Step content will be rendered by parent component */}
          <div data-testid={`wizard-content-step-${currentStep}`}>
            {/* Content injected by parent */}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {!isFirstStep && (
                <Button 
                  variant="outline"
                  onClick={onPrevious}
                  disabled={isGenerating}
                  data-testid="wizard-button-previous"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Anterior
                </Button>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {/* Step Info */}
              <div className="text-sm text-muted-foreground">
                {currentStep + 1} de {steps.length} pasos completados
              </div>

              {/* Next/Complete Button */}
              {isLastStep ? (
                <Button 
                  onClick={onComplete}
                  disabled={!canProceedToNext || isGenerating}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="wizard-button-complete"
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                      Generando Tests...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generar Tests
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={onNext}
                  disabled={!canProceedToNext || isGenerating}
                  data-testid="wizard-button-next"
                >
                  Siguiente
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-4 pt-4 border-t">
            <Alert>
              <Target className="h-4 w-4" />
              <AlertDescription>
                {isLastStep ? (
                  "Revisa la configuración y haz clic en 'Generar Tests' para crear automáticamente los audit tests basados en tu selección."
                ) : !canProceedToNext ? (
                  "Completa los campos requeridos en este paso para continuar."
                ) : (
                  "Información completada. Puedes continuar al siguiente paso."
                )}
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}