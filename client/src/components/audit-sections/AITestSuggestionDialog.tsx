import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Sparkles, CheckCircle2, AlertCircle, Loader2, X, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TestFormModal } from "./TestFormModal";

interface TestSuggestion {
  name: string;
  objective: string;
  testProcedures: string;
  testingNature: string;
  sampleSize: string;
  evaluationCriteria: string;
}

interface AITestSuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auditId: string;
  riskId?: string;
  controlId?: string;
  riskCode?: string;
  controlCode?: string;
  onTestsCreated: () => void;
}

export function AITestSuggestionDialog({
  open,
  onOpenChange,
  auditId,
  riskId,
  controlId,
  riskCode,
  controlCode,
  onTestsCreated
}: AITestSuggestionDialogProps) {
  const [suggestions, setSuggestions] = useState<TestSuggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [reviewQueue, setReviewQueue] = useState<number[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState<number | null>(null);
  const [successfullyCreated, setSuccessfullyCreated] = useState(0);
  const { toast } = useToast();

  const suggestionsQuery = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/audits/${auditId}/ai-test-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riskId, controlId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar sugerencias');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log('AI suggestions received:', data);
      setSuggestions(data.data.suggestions || []);
      setError(null);
    },
    onError: (error: Error) => {
      console.error('Error generating suggestions:', error);
      setError(error.message);
      toast({
        title: "Error al generar sugerencias",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Start the review process for selected suggestions
  const handleStartReview = () => {
    const queue = Array.from(selectedSuggestions);
    if (queue.length > 0) {
      setReviewQueue(queue);
      setCurrentReviewIndex(queue[0]);
      setSuccessfullyCreated(0);
    }
  };

  // Handle successful test creation from TestFormModal
  const handleTestCreated = () => {
    const newCreatedCount = successfullyCreated + 1;
    setSuccessfullyCreated(newCreatedCount);
    
    // Remove current item from queue and move to next
    const remainingQueue = reviewQueue.slice(1);
    
    if (remainingQueue.length > 0) {
      // More tests to review
      setReviewQueue(remainingQueue);
      setCurrentReviewIndex(remainingQueue[0]);
    } else {
      // All tests reviewed and created
      toast({
        title: "Pruebas creadas exitosamente",
        description: `Se crearon ${newCreatedCount} prueba(s) de auditoría basadas en las sugerencias de la IA`
      });
      onTestsCreated();
      onOpenChange(false);
      // Reset state
      setSuggestions([]);
      setSelectedSuggestions(new Set());
      setReviewQueue([]);
      setCurrentReviewIndex(null);
      setSuccessfullyCreated(0);
    }
  };

  // Handle canceling the review process
  const handleCancelReview = () => {
    if (successfullyCreated > 0) {
      toast({
        title: "Revisión interrumpida",
        description: `Se crearon ${successfullyCreated} prueba(s) antes de cancelar. ${reviewQueue.length} prueba(s) pendientes no fueron creadas.`
      });
      onTestsCreated(); // Refresh to show any created tests
    }
    // Clear review state but keep selections
    setReviewQueue([]);
    setCurrentReviewIndex(null);
    setSuccessfullyCreated(0);
  };

  // Auto-trigger suggestions generation when dialog opens
  useEffect(() => {
    if (open && suggestions.length === 0 && !suggestionsQuery.isPending && !error) {
      console.log('🤖 Auto-triggering AI suggestions generation for risk:', riskId);
      suggestionsQuery.mutate();
    }
    // Reset state when dialog closes
    if (!open) {
      setSuggestions([]);
      setSelectedSuggestions(new Set());
      setError(null);
    }
  }, [open]);

  const handleToggleSuggestion = (index: number) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSuggestions(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedSuggestions.size === suggestions.length) {
      setSelectedSuggestions(new Set());
    } else {
      setSelectedSuggestions(new Set(suggestions.map((_, i) => i)));
    }
  };


  const handleDialogOpen = (open: boolean) => {
    onOpenChange(open);
    if (open && suggestions.length === 0 && !suggestionsQuery.isPending) {
      // Auto-generate suggestions when dialog opens
      suggestionsQuery.mutate();
    } else if (!open) {
      // Reset state when closing
      setSuggestions([]);
      setSelectedSuggestions(new Set());
      setError(null);
    }
  };

  // Get the current suggestion being reviewed
  const currentSuggestion = currentReviewIndex !== null ? suggestions[currentReviewIndex] : null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Sugerencias de Pruebas con IA
          </DialogTitle>
          <DialogDescription>
            La IA analizará el contexto de la auditoría{riskCode ? ` (Riesgo: ${riskCode})` : ''}{controlCode ? ` (Control: ${controlCode})` : ''} y generará sugerencias de pruebas específicas y accionables.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          {suggestionsQuery.isPending && (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-8">
                <div className="text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400 mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Analizando contexto y generando sugerencias...
                  </p>
                </div>
              </div>
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 dark:text-red-100">Error</h4>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => suggestionsQuery.mutate()}
                  data-testid="button-retry-suggestions"
                >
                  Reintentar
                </Button>
              </div>
            </div>
          )}

          {!suggestionsQuery.isPending && !error && suggestions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-purple-50 dark:bg-purple-950 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <span className="font-medium text-purple-900 dark:text-purple-100">
                    {suggestions.length} sugerencia{suggestions.length !== 1 ? 's' : ''} generada{suggestions.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  data-testid="button-select-all-suggestions"
                >
                  {selectedSuggestions.size === suggestions.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                </Button>
              </div>

              {suggestions.map((suggestion, index) => (
                <Card 
                  key={index}
                  className={`transition-all ${selectedSuggestions.has(index) ? 'ring-2 ring-purple-500 dark:ring-purple-400' : ''}`}
                  data-testid={`suggestion-card-${index}`}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedSuggestions.has(index)}
                        onCheckedChange={() => handleToggleSuggestion(index)}
                        className="mt-1"
                        data-testid={`checkbox-suggestion-${index}`}
                      />
                      <div className="flex-1 space-y-3">
                        <div>
                          <h4 className="font-semibold text-lg mb-1">{suggestion.name}</h4>
                          <Badge variant="secondary" className="mb-2">
                            {suggestion.testingNature === 'sustantivo' ? 'Sustantivo' : 'Cumplimiento'}
                          </Badge>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">Objetivo</Label>
                          <p className="text-sm mt-1">{suggestion.objective}</p>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">Procedimientos de Prueba</Label>
                          <p className="text-sm mt-1 whitespace-pre-wrap">{suggestion.testProcedures}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">Tamaño de Muestra</Label>
                            <p className="text-sm mt-1">{suggestion.sampleSize}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Criterios de Evaluación</Label>
                            <p className="text-sm mt-1">{suggestion.evaluationCriteria}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-suggestions"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>

          <Button
            onClick={handleStartReview}
            disabled={selectedSuggestions.size === 0 || reviewQueue.length > 0}
            data-testid="button-review-selected-tests"
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {reviewQueue.length > 0 ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Revisando {reviewQueue.length} prueba{reviewQueue.length !== 1 ? 's' : ''}...
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Revisar y Crear {selectedSuggestions.size} Prueba{selectedSuggestions.size !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Modal for reviewing individual test suggestions */}
    {currentSuggestion && (
      <TestFormModal
        open={currentReviewIndex !== null}
        onOpenChange={(open) => {
          if (!open) {
            handleCancelReview();
          }
        }}
        mode="create"
        auditId={auditId}
        riskId={riskId}
        riskCode={riskCode}
        controlId={controlId}
        controlCode={controlCode}
        initialValues={{
          name: currentSuggestion.name,
          description: currentSuggestion.objective, // Use objective as description
          objective: currentSuggestion.objective,
          testProcedures: currentSuggestion.testProcedures,
          evaluationCriteria: currentSuggestion.evaluationCriteria,
          sampleSize: currentSuggestion.sampleSize,
          testingNature: currentSuggestion.testingNature as any,
          priority: "medium",
          status: "proposed",
        }}
        onSuccess={handleTestCreated}
      />
    )}
  </>
  );
}
