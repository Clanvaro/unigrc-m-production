import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  title: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  className?: string;
  allowAllClickable?: boolean;
}

export function Stepper({ steps, currentStep, onStepClick, className, allowAllClickable = false }: StepperProps) {
  return (
    <div className={cn("w-full", className)}>
      <nav aria-label="Progress">
        <ol role="list" className="flex items-center">
          {steps.map((step, stepIdx) => {
            const isCompleted = stepIdx < currentStep;
            const isCurrent = stepIdx === currentStep;
            const isClickable = onStepClick && (allowAllClickable || isCompleted || isCurrent);

            return (
              <li
                key={step.id}
                className={cn(
                  "relative",
                  stepIdx !== steps.length - 1 ? "pr-8 sm:pr-20 flex-1" : ""
                )}
              >
                {/* Línea de conexión */}
                {stepIdx !== steps.length - 1 && (
                  <div
                    className="absolute top-4 left-4 -ml-px mt-0.5 h-0.5 w-full"
                    aria-hidden="true"
                  >
                    <div
                      className={cn(
                        "h-full w-full transition-colors",
                        isCompleted ? "bg-primary" : "bg-gray-200"
                      )}
                    />
                  </div>
                )}

                {/* Paso */}
                <div
                  className={cn(
                    "relative flex flex-col items-start",
                    isClickable && "cursor-pointer"
                  )}
                  onClick={() => isClickable && onStepClick(stepIdx)}
                  data-testid={`step-${step.id}`}
                >
                  <span className="flex items-center">
                    <span
                      className={cn(
                        "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                        isCompleted &&
                          "border-primary bg-primary text-primary-foreground",
                        isCurrent &&
                          "border-primary bg-background text-primary",
                        !isCompleted &&
                          !isCurrent &&
                          "border-gray-300 bg-background text-gray-500"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <span className="text-sm font-semibold">{stepIdx + 1}</span>
                      )}
                    </span>
                  </span>
                  <span className="mt-2 flex flex-col">
                    <span
                      className={cn(
                        "text-sm font-medium transition-colors",
                        isCurrent ? "text-primary" : "text-gray-900"
                      )}
                    >
                      {step.title}
                    </span>
                    {step.description && (
                      <span className="text-xs text-muted-foreground mt-0.5">
                        {step.description}
                      </span>
                    )}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

interface StepperContentProps {
  children: React.ReactNode;
  className?: string;
}

export function StepperContent({ children, className }: StepperContentProps) {
  return (
    <div className={cn("mt-8", className)} data-testid="stepper-content">
      {children}
    </div>
  );
}

interface StepperActionsProps {
  children: React.ReactNode;
  className?: string;
}

export function StepperActions({ children, className }: StepperActionsProps) {
  return (
    <div
      className={cn(
        "mt-8 flex items-center justify-between border-t pt-6",
        className
      )}
      data-testid="stepper-actions"
    >
      {children}
    </div>
  );
}
