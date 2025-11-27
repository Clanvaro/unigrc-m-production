import { HelpCircle, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface CalculationStep {
  label: string;
  value: string | number;
  formula?: string;
}

interface DataSource {
  table: string;
  query?: string;
  timestamp?: string;
}

interface ExplanationPopoverProps {
  title: string;
  description?: string;
  formula?: string;
  calculationSteps?: CalculationStep[];
  dataSource?: DataSource;
  relatedEntities?: { type: string; id: string; name: string }[];
  variant?: 'icon' | 'badge';
  size?: 'sm' | 'md' | 'lg';
}

export function ExplanationPopover({
  title,
  description,
  formula,
  calculationSteps,
  dataSource,
  relatedEntities,
  variant = 'icon',
  size = 'sm'
}: ExplanationPopoverProps) {
  const triggerContent = variant === 'icon' ? (
    <button
      className="inline-flex items-center justify-center rounded-full hover:bg-muted p-1 transition-colors"
      aria-label="Ver explicación"
      data-testid="explanation-trigger"
      type="button"
    >
      <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
    </button>
  ) : (
    <Badge variant="outline" className="cursor-pointer hover:bg-muted">
      <Info className="h-3 w-3 mr-1" />
      ¿Cómo se calculó?
    </Badge>
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        {triggerContent}
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-80 max-h-96 overflow-y-auto" 
        align="start"
        data-testid="explanation-content"
      >
        <div className="space-y-4">
          {/* Header */}
          <div>
            <h4 className="font-semibold text-sm">{title}</h4>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>

          {/* Formula */}
          {formula && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium mb-1">Fórmula:</p>
                <code className="block bg-muted p-2 rounded text-xs font-mono">
                  {formula}
                </code>
              </div>
            </>
          )}

          {/* Calculation Steps */}
          {calculationSteps && calculationSteps.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium mb-2">Pasos del cálculo:</p>
                <ol className="space-y-2">
                  {calculationSteps.map((step, index) => (
                    <li key={index} className="text-xs">
                      <div className="flex items-start gap-2">
                        <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center shrink-0">
                          {index + 1}
                        </Badge>
                        <div className="flex-1">
                          <p className="font-medium">{step.label}</p>
                          {step.formula && (
                            <code className="text-xs text-muted-foreground block mt-0.5">{step.formula}</code>
                          )}
                          <p className="text-primary font-semibold mt-1">= {step.value}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}

          {/* Data Source */}
          {dataSource && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium mb-1">Origen de datos:</p>
                <div className="bg-muted p-2 rounded text-xs space-y-1">
                  <p><span className="font-medium">Tabla:</span> {dataSource.table}</p>
                  {dataSource.query && (
                    <p className="font-mono text-xs text-muted-foreground truncate" title={dataSource.query}>
                      {dataSource.query}
                    </p>
                  )}
                  {dataSource.timestamp && (
                    <p><span className="font-medium">Última actualización:</span> {dataSource.timestamp}</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Related Entities */}
          {relatedEntities && relatedEntities.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium mb-2">Entidades relacionadas:</p>
                <div className="flex flex-wrap gap-1">
                  {relatedEntities.map((entity, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {entity.type}: {entity.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
