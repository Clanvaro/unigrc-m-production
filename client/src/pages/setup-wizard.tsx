import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Stepper, StepperContent, StepperActions } from "@/components/ui/stepper";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Building2, 
  Users, 
  Network, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  AlertCircle,
  Plus 
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { Gerencia, ProcessOwner, Macroproceso } from "@shared/schema";
import { getCSRFTokenFromCookie } from "@/lib/csrf-cache";

const steps = [
  {
    id: "organization",
    title: "Estructura Organizacional",
    description: "Gerencias y departamentos",
    icon: Building2,
  },
  {
    id: "responsibles",
    title: "Responsables",
    description: "Usuarios y process owners",
    icon: Users,
  },
  {
    id: "process-map",
    title: "Mapa de Procesos",
    description: "Macroprocesos, procesos y subprocesos",
    icon: Network,
  },
  {
    id: "completion",
    title: "Listo",
    description: "Resumen y próximos pasos",
    icon: CheckCircle2,
  },
];

// Paso 1: Estructura Organizacional
function OrganizationStep() {
  const [, setLocation] = useLocation();
  const { data: gerencias } = useQuery<Gerencia[]>({
    queryKey: ["/api/gerencias"],
    staleTime: 0,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Estructura Organizacional</h2>
        <p className="text-muted-foreground">
          Define las gerencias y departamentos de tu organización. Esto formará la base de tu estructura organizacional.
        </p>
      </div>

      {gerencias && gerencias.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {gerencias.length} gerencia(s) creada(s)
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation("/organization")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar más
            </Button>
          </div>
          <div className="grid gap-2">
            {gerencias.map((gerencia) => (
              <div
                key={gerencia.id}
                className="p-3 border rounded-lg bg-muted/50"
              >
                <div className="font-medium">{gerencia.name}</div>
                {gerencia.description && (
                  <div className="text-sm text-muted-foreground">
                    {gerencia.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay gerencias creadas aún. Ve a Estructura Organizacional para crear al menos una.
          </AlertDescription>
        </Alert>
      )}

      {(!gerencias || gerencias.length === 0) && (
        <Button 
          className="w-full" 
          onClick={() => setLocation("/organization")}
          data-testid="button-go-to-organization"
        >
          <Building2 className="w-4 h-4 mr-2" />
          Ir a Estructura Organizacional
        </Button>
      )}
    </div>
  );
}

// Paso 2: Responsables
function ResponsiblesStep() {
  const [, setLocation] = useLocation();
  const { data: processOwners } = useQuery<ProcessOwner[]>({
    queryKey: ["/api/process-owners"],
    staleTime: 0,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Responsables de Procesos</h2>
        <p className="text-muted-foreground">
          Agrega los usuarios que serán responsables de los procesos en tu organización.
        </p>
      </div>

      {processOwners && processOwners.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {processOwners.length} responsable(s) agregado(s)
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation("/usuarios")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar más
            </Button>
          </div>
          <div className="grid gap-2">
            {processOwners.map((owner) => (
              <div
                key={owner.id}
                className="p-3 border rounded-lg bg-muted/50"
              >
                <div className="font-medium">{owner.name}</div>
                <div className="text-sm text-muted-foreground">
                  {owner.email} • {owner.position || "Sin cargo"}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay responsables agregados aún. Ve a la sección de Usuarios para crear al menos uno.
          </AlertDescription>
        </Alert>
      )}

      {(!processOwners || processOwners.length === 0) && (
        <Button 
          className="w-full" 
          onClick={() => setLocation("/usuarios")}
          data-testid="button-go-to-users"
        >
          <Users className="w-4 h-4 mr-2" />
          Ir a Gestión de Usuarios
        </Button>
      )}
    </div>
  );
}

// Paso 3: Mapa de Procesos
function ProcessMapStep() {
  const [, setLocation] = useLocation();
  const { data: macroprocesos } = useQuery<Macroproceso[]>({
    queryKey: ["/api/macroprocesos"],
    staleTime: 0,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Mapa de Procesos</h2>
        <p className="text-muted-foreground">
          Define los macroprocesos de tu organización. Luego podrás agregar procesos y subprocesos dentro de cada uno.
        </p>
      </div>

      {macroprocesos && macroprocesos.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {macroprocesos.length} macroproceso(s) creado(s)
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation("/organization")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar más
            </Button>
          </div>
          <div className="grid gap-2">
            {macroprocesos.map((macro) => (
              <div
                key={macro.id}
                className="p-3 border rounded-lg bg-muted/50"
              >
                <div className="font-medium">{macro.name}</div>
                {macro.description && (
                  <div className="text-sm text-muted-foreground">
                    {macro.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay macroprocesos creados aún. Ve a Estructura Organizacional para crear al menos uno.
          </AlertDescription>
        </Alert>
      )}

      {(!macroprocesos || macroprocesos.length === 0) && (
        <Button 
          className="w-full" 
          onClick={() => setLocation("/organization")}
          data-testid="button-go-to-processes"
        >
          <Network className="w-4 h-4 mr-2" />
          Ir a Estructura Organizacional
        </Button>
      )}
    </div>
  );
}

// Paso 4: Completado
function CompletionStep({ 
  gerenciasCount, 
  responsiblesCount, 
  macroprocesosCount 
}: { 
  gerenciasCount: number; 
  responsiblesCount: number; 
  macroprocesosCount: number;
}) {
  return (
    <div className="space-y-6 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
        <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
      </div>
      
      <div>
        <h2 className="text-2xl font-bold mb-2">¡Configuración Completada!</h2>
        <p className="text-muted-foreground">
          Has configurado exitosamente la estructura base de tu sistema
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 py-6">
        <div className="p-4 border rounded-lg">
          <div className="text-3xl font-bold text-primary">{gerenciasCount}</div>
          <div className="text-sm text-muted-foreground">Gerencias</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-3xl font-bold text-primary">{responsiblesCount}</div>
          <div className="text-sm text-muted-foreground">Responsables</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-3xl font-bold text-primary">{macroprocesosCount}</div>
          <div className="text-sm text-muted-foreground">Macroprocesos</div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-lg text-left">
        <h3 className="font-semibold mb-3">Próximos Pasos Sugeridos:</h3>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li>Agrega procesos y subprocesos a tus macroprocesos</li>
          <li>Define los riesgos asociados a cada proceso</li>
          <li>Crea controles para mitigar los riesgos</li>
          <li>Establece planes de acción para gestionar los riesgos</li>
        </ol>
      </div>
    </div>
  );
}

export default function SetupWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Verificar datos existentes para saber qué pasos ya están completos
  const { data: gerencias = [] } = useQuery<Gerencia[]>({
    queryKey: ["/api/gerencias"],
    staleTime: 0,
  });

  const { data: processOwners = [] } = useQuery<ProcessOwner[]>({
    queryKey: ["/api/process-owners"],
    staleTime: 0,
  });

  const { data: macroprocesos = [] } = useQuery<Macroproceso[]>({
    queryKey: ["/api/macroprocesos"],
    staleTime: 0,
  });

  // Mutation para marcar el wizard como completado
  const completeWizardMutation = useMutation({
    mutationFn: async () => {
      // Build headers with CSRF token for production
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      
      const isProduction = import.meta.env.MODE === 'production';
      if (isProduction) {
        const csrfToken = getCSRFTokenFromCookie();
        if (csrfToken) {
          headers["x-csrf-token"] = csrfToken;
        }
      }

      const response = await fetch("/api/user-preferences", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ setupWizardCompleted: true }),
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to update preferences");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-preferences"] });
      toast({
        title: "Configuración completada",
        description: "El sistema está listo para usar",
      });
      setLocation("/dashboard");
    },
  });

  // Validar si se puede avanzar al siguiente paso
  const canProceed = () => {
    switch (currentStep) {
      case 0: // Organization
        return gerencias.length > 0;
      case 1: // Responsibles
        return processOwners.length > 0;
      case 2: // Process Map
        return macroprocesos.length > 0;
      case 3: // Completion
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Último paso - completar wizard
      completeWizardMutation.mutate();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipWizard = () => {
    setShowSkipDialog(true);
  };

  const confirmSkipWizard = () => {
    setShowSkipDialog(false);
    completeWizardMutation.mutate();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <OrganizationStep />;
      case 1:
        return <ResponsiblesStep />;
      case 2:
        return <ProcessMapStep />;
      case 3:
        return <CompletionStep 
          gerenciasCount={gerencias.length}
          responsiblesCount={processOwners.length}
          macroprocesosCount={macroprocesos.length}
        />;
      default:
        return null;
    }
  };

  const StepIcon = steps[currentStep].icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <StepIcon className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Configuración Inicial
          </h1>
          <p className="text-muted-foreground">
            Sigue estos pasos para configurar tu sistema de gestión de riesgos
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <Stepper
            steps={steps}
            currentStep={currentStep}
            onStepClick={(stepIdx) => {
              // Solo permitir ir a pasos anteriores o al siguiente si está validado
              if (stepIdx < currentStep || (stepIdx === currentStep + 1 && canProceed())) {
                setCurrentStep(stepIdx);
              }
            }}
          />
        </div>

        {/* Content Card */}
        <Card className="p-8">
          {/* Alerta si no se puede avanzar */}
          {!canProceed() && currentStep < 3 && (
            <Alert className="mb-6" variant="default">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Complete este paso antes de continuar. Debe agregar al menos un elemento.
              </AlertDescription>
            </Alert>
          )}

          <StepperContent>
            {renderStepContent()}
          </StepperContent>

          <StepperActions>
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  data-testid="button-previous-step"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Anterior
                </Button>
              )}
              
              <Button
                variant="ghost"
                onClick={handleSkipWizard}
                data-testid="button-skip-wizard"
              >
                Saltar configuración
              </Button>
            </div>

            <Button
              onClick={handleNext}
              disabled={!canProceed() && currentStep < 3}
              data-testid="button-next-step"
            >
              {currentStep === steps.length - 1 ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Finalizar
                </>
              ) : (
                <>
                  Siguiente
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </StepperActions>
        </Card>

        {/* Progress indicator */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Paso {currentStep + 1} de {steps.length}
        </div>
      </div>

      {/* Skip wizard confirmation dialog */}
      <AlertDialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Saltar Configuración Inicial</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas saltar la configuración inicial? Puedes volver a ejecutarla desde Configuración.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSkipWizard}>Aceptar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
