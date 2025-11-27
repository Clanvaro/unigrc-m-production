import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Control, FieldValues, Path } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Audit, User } from "@shared/schema";

interface AuditFindingFormTabsProps<T extends FieldValues> {
  control: Control<T>;
}

export function AuditFindingFormTabs<T extends FieldValues>({ control }: AuditFindingFormTabsProps<T>) {
  const isMobile = useIsMobile();
  
  // Fetch audits for selection
  const { data: auditsResponse } = useQuery<{ data: Audit[]; pagination: any }>({
    queryKey: ['/api/audits'],
  });
  const audits = auditsResponse?.data || [];

  // Fetch users for assignment
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Form section renderers
  const renderIdentificationSection = () => (
    <div className="space-y-4">
      <FormField
        control={control}
        name={"auditId" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Auditoría *</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
              <FormControl>
                <SelectTrigger data-testid="select-audit">
                  <SelectValue placeholder="Selecciona la auditoría" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {audits.map((audit) => (
                  <SelectItem key={audit.id} value={audit.id}>
                    {audit.code} - {audit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={"title" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Título del Hallazgo *</FormLabel>
            <FormControl>
              <Input 
                {...field} 
                placeholder="Frase breve y clara que identifica el hallazgo"
                data-testid="input-title" 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={"description" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Descripción Detallada *</FormLabel>
            <FormControl>
              <Textarea 
                {...field} 
                rows={4}
                placeholder="Descripción detallada del hallazgo identificado durante la auditoría..."
                data-testid="textarea-description"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name={"type" as Path<T>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Hallazgo *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                <FormControl>
                  <SelectTrigger data-testid="select-type">
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="deficiency">Deficiencia</SelectItem>
                  <SelectItem value="weakness">Debilidad</SelectItem>
                  <SelectItem value="observation">Observación</SelectItem>
                  <SelectItem value="opportunity">Oportunidad de Mejora</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={"severity" as Path<T>}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Severidad *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                <FormControl>
                  <SelectTrigger data-testid="select-severity">
                    <SelectValue placeholder="Selecciona la severidad" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  const renderAnalysisSection = () => (
    <div className="space-y-4">
      <FormField
        control={control}
        name={"criteria" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Criterio (Lo que debería ser) *</FormLabel>
            <FormControl>
              <Textarea 
                {...field} 
                rows={3}
                placeholder="Norma, estándar, política, procedimiento o referencia utilizada como criterio de evaluación..."
                data-testid="textarea-criteria"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={"condition" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Condición (Lo que se encontró) *</FormLabel>
            <FormControl>
              <Textarea 
                {...field} 
                rows={3}
                placeholder="Descripción objetiva de lo que efectivamente se observó durante la auditoría..."
                data-testid="textarea-condition"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={"cause" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Causa Raíz (Por qué ocurrió) *</FormLabel>
            <FormControl>
              <Textarea 
                {...field} 
                rows={3}
                placeholder="Análisis de la causa raíz que originó la desviación identificada..."
                data-testid="textarea-cause"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={"effect" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Efecto/Riesgo (Consecuencias) *</FormLabel>
            <FormControl>
              <Textarea 
                {...field} 
                rows={3}
                placeholder="Impacto actual o potencial y consecuencias de no corregir esta situación..."
                data-testid="textarea-effect"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderRecommendationSection = () => (
    <div className="space-y-4">
      <FormField
        control={control}
        name={"recommendation" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Recomendación *</FormLabel>
            <FormControl>
              <Textarea 
                {...field} 
                rows={4}
                placeholder="Recomendación específica para corregir la deficiencia o implementar mejoras..."
                data-testid="textarea-recommendation"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={"managementResponse" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Respuesta de la Administración</FormLabel>
            <FormControl>
              <Textarea 
                {...field} 
                rows={3}
                placeholder="Respuesta oficial de la administración al hallazgo y recomendación..."
                data-testid="textarea-management-response"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={"agreedAction" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Acción Acordada</FormLabel>
            <FormControl>
              <Textarea 
                {...field} 
                rows={3}
                placeholder="Plan de acción específico acordado entre auditoría y administración..."
                data-testid="textarea-agreed-action"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderAssignmentSection = () => (
    <div className="space-y-4">
      <FormField
        control={control}
        name={"responsiblePerson" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Persona Responsable</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
              <FormControl>
                <SelectTrigger data-testid="select-responsible-person">
                  <SelectValue placeholder="Selecciona el responsable" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.fullName} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={"dueDate" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Fecha Límite de Implementación</FormLabel>
            <FormControl>
              <Input 
                {...field} 
                type="date"
                data-testid="input-due-date"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={"status" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Estado</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
              <FormControl>
                <SelectTrigger data-testid="select-status">
                  <SelectValue placeholder="Selecciona el estado" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="open">Abierto</SelectItem>
                <SelectItem value="in_progress">En Progreso</SelectItem>
                <SelectItem value="implemented">Implementado</SelectItem>
                <SelectItem value="overdue">Vencido</SelectItem>
                <SelectItem value="closed">Cerrado</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={"identifiedBy" as Path<T>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Identificado por *</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
              <FormControl>
                <SelectTrigger data-testid="select-identified-by">
                  <SelectValue placeholder="Selecciona quién identificó el hallazgo" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.fullName} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  // Helper function to check if a section has required fields filled
  const getSectionCompletionStatus = (sectionFields: string[]) => {
    return sectionFields.some(fieldName => {
      const value = control._formValues[fieldName];
      return value && value.toString().trim() !== '';
    });
  };

  // Section completion indicators
  const identificationFields = ['auditId', 'title', 'description', 'type', 'severity'];
  const analysisFields = ['criteria', 'condition', 'cause', 'effect'];
  const recommendationFields = ['recommendation'];
  const assignmentFields = ['identifiedBy'];

  const sections = [
    {
      id: 'identification',
      title: 'Identificación',
      content: renderIdentificationSection,
      isCompleted: getSectionCompletionStatus(identificationFields),
      testId: 'accordion-identification'
    },
    {
      id: 'analysis', 
      title: 'Análisis',
      content: renderAnalysisSection,
      isCompleted: getSectionCompletionStatus(analysisFields),
      testId: 'accordion-analysis'
    },
    {
      id: 'recommendation',
      title: 'Recomendación', 
      content: renderRecommendationSection,
      isCompleted: getSectionCompletionStatus(recommendationFields),
      testId: 'accordion-recommendation'
    },
    {
      id: 'assignment',
      title: 'Asignación',
      content: renderAssignmentSection,
      isCompleted: getSectionCompletionStatus(assignmentFields),
      testId: 'accordion-assignment'
    }
  ];

  // Desktop: Use Tabs
  if (!isMobile) {
    return (
      <Tabs defaultValue="identification" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="identification" data-testid="tab-identification">
            Identificación
          </TabsTrigger>
          <TabsTrigger value="analysis" data-testid="tab-analysis">
            Análisis
          </TabsTrigger>
          <TabsTrigger value="recommendation" data-testid="tab-recommendation">
            Recomendación
          </TabsTrigger>
          <TabsTrigger value="assignment" data-testid="tab-assignment">
            Asignación
          </TabsTrigger>
        </TabsList>

        <TabsContent value="identification" className="space-y-4" data-testid="tab-content-identification">
          {renderIdentificationSection()}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4" data-testid="tab-content-analysis">
          {renderAnalysisSection()}
        </TabsContent>

        <TabsContent value="recommendation" className="space-y-4" data-testid="tab-content-recommendation">
          {renderRecommendationSection()}
        </TabsContent>

        <TabsContent value="assignment" className="space-y-4" data-testid="tab-content-assignment">
          {renderAssignmentSection()}
        </TabsContent>
      </Tabs>
    );
  }

  // Mobile: Use Accordion
  return (
    <Accordion type="multiple" className="w-full" data-testid="audit-findings-accordion">
      {sections.map((section) => (
        <AccordionItem key={section.id} value={section.id} data-testid={section.testId}>
          <AccordionTrigger className="text-left hover:no-underline" data-testid={`trigger-${section.id}`}>
            <div className="flex items-center gap-3 w-full">
              <div className="flex-shrink-0">
                {section.isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" data-testid={`icon-completed-${section.id}`} />
                ) : (
                  <Circle className="h-5 w-5 text-gray-400 dark:text-gray-500" data-testid={`icon-pending-${section.id}`} />
                )}
              </div>
              <span className="font-medium text-sm md:text-base" data-testid={`title-${section.id}`}>
                {section.title}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6" data-testid={`content-${section.id}`}>
            {section.content()}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}