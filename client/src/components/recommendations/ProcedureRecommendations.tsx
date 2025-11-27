import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  Clock, 
  Star, 
  TrendingUp, 
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Eye
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ProcedureRecommendation {
  procedureId: string;
  procedureName: string;
  recommendationScore: number;
  reasoning: string;
  expectedEffectiveness: number;
  estimatedTimeHours: number;
  requiredSkills: string[];
  historicalSuccessRate: number;
  riskMitigationLevel: number;
  confidenceLevel: number;
  alternativeProcedures: {
    procedureId: string;
    procedureName: string;
    score: number;
    tradeoffs: string[];
  }[];
  bestPractices: {
    title: string;
    description: string;
    applicability: number;
  }[];
}

interface ProcedureRecommendationsProps {
  auditTestId: string | null;
}

export function ProcedureRecommendations({ auditTestId }: ProcedureRecommendationsProps) {
  const [selectedProcedure, setSelectedProcedure] = useState<string | null>(null);
  const [showAlternatives, setShowAlternatives] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch procedure recommendations
  const { data: recommendations, isLoading, error } = useQuery<ProcedureRecommendation[]>({
    queryKey: ['/api/recommendations/procedures', auditTestId],
    enabled: !!auditTestId,
    queryFn: async () => {
      const response = await fetch('/api/recommendations/procedures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riskCategory: 'financial',
          complexity: 'moderate',
          historicalContext: {},
          preferences: {}
        })
      });
      if (!response.ok) throw new Error('Failed to fetch procedure recommendations');
      const data = await response.json();
      return data.procedureRecommendations;
    }
  });

  // Accept recommendation mutation
  const acceptRecommendation = useMutation({
    mutationFn: async (procedureId: string) => {
      return apiRequest('/api/recommendations/feedback', {
        method: 'POST',
        body: {
          recommendationId: procedureId,
          feedbackType: 'acceptance',
          satisfactionScore: 5,
          comments: 'Recomendación aceptada desde la interfaz'
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "Recomendación Aceptada",
        description: "La recomendación ha sido marcada como aceptada",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo procesar la aceptación",
        variant: "destructive",
      });
    }
  });

  // Reject recommendation mutation
  const rejectRecommendation = useMutation({
    mutationFn: async (procedureId: string) => {
      return apiRequest('/api/recommendations/feedback', {
        method: 'POST',
        body: {
          recommendationId: procedureId,
          feedbackType: 'rejection',
          satisfactionScore: 1,
          comments: 'Recomendación rechazada desde la interfaz'
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "Recomendación Rechazada",
        description: "El feedback ha sido registrado para mejorar futuras recomendaciones",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo procesar el rechazo",
        variant: "destructive",
      });
    }
  });

  const toggleAlternatives = (procedureId: string) => {
    setShowAlternatives(prev => ({
      ...prev,
      [procedureId]: !prev[procedureId]
    }));
  };

  if (!auditTestId) {
    return (
      <Card data-testid="procedure-recommendations-empty">
        <CardHeader>
          <CardTitle>Recomendaciones de Procedimientos</CardTitle>
          <CardDescription>
            Selecciona una prueba de auditoría para ver recomendaciones de procedimientos
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-2" />
            <p>No hay prueba de auditoría seleccionada</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="procedure-recommendations-loading">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  if (error || !recommendations?.length) {
    return (
      <Card data-testid="procedure-recommendations-error">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Sin Recomendaciones
          </CardTitle>
          <CardDescription>
            No se encontraron recomendaciones de procedimientos para esta prueba de auditoría
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="procedure-recommendations">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Recomendaciones de Procedimientos</h2>
          <p className="text-muted-foreground">
            Procedimientos sugeridos basados en análisis de IA y datos históricos
          </p>
        </div>
        <Badge variant="secondary" data-testid="recommendations-count">
          {recommendations.length} recomendaciones
        </Badge>
      </div>

      <div className="grid gap-6">
        {recommendations.map((rec, index) => (
          <Card 
            key={rec.procedureId} 
            className={`${selectedProcedure === rec.procedureId ? 'ring-2 ring-primary' : ''}`}
            data-testid={`procedure-recommendation-${rec.procedureId}`}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    {rec.procedureName}
                    <Badge 
                      variant={rec.recommendationScore >= 80 ? "default" : "secondary"}
                      data-testid={`score-${rec.procedureId}`}
                    >
                      {rec.recommendationScore}% match
                    </Badge>
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {rec.reasoning}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedProcedure(rec.procedureId)}
                    data-testid={`view-details-${rec.procedureId}`}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Detalles
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {rec.expectedEffectiveness}%
                  </div>
                  <div className="text-sm text-muted-foreground">Efectividad</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {rec.estimatedTimeHours}h
                  </div>
                  <div className="text-sm text-muted-foreground">Tiempo Est.</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {rec.historicalSuccessRate}%
                  </div>
                  <div className="text-sm text-muted-foreground">Éxito Histórico</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {rec.confidenceLevel}%
                  </div>
                  <div className="text-sm text-muted-foreground">Confianza</div>
                </div>
              </div>

              {/* Risk Mitigation */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Mitigación de Riesgo</span>
                  <span className="text-sm text-muted-foreground">
                    {rec.riskMitigationLevel}%
                  </span>
                </div>
                <Progress value={rec.riskMitigationLevel} className="h-2" />
              </div>

              {/* Required Skills */}
              <div>
                <div className="text-sm font-medium mb-2">Habilidades Requeridas</div>
                <div className="flex flex-wrap gap-2">
                  {rec.requiredSkills.map((skill, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Best Practices */}
              {rec.bestPractices.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Mejores Prácticas</div>
                  <div className="space-y-2">
                    {rec.bestPractices.slice(0, 2).map((practice, idx) => (
                      <div key={idx} className="text-sm p-2 bg-muted rounded">
                        <div className="font-medium">{practice.title}</div>
                        <div className="text-muted-foreground">{practice.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alternatives */}
              {rec.alternativeProcedures.length > 0 && (
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleAlternatives(rec.procedureId)}
                    data-testid={`toggle-alternatives-${rec.procedureId}`}
                  >
                    {showAlternatives[rec.procedureId] ? 'Ocultar' : 'Ver'} Alternativas
                    ({rec.alternativeProcedures.length})
                  </Button>
                  
                  {showAlternatives[rec.procedureId] && (
                    <div className="mt-2 space-y-2">
                      {rec.alternativeProcedures.map((alt, idx) => (
                        <div 
                          key={idx} 
                          className="p-3 border rounded-lg"
                          data-testid={`alternative-${rec.procedureId}-${idx}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{alt.procedureName}</span>
                            <Badge variant="outline">{alt.score}% match</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Compromisos: {alt.tradeoffs.join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={() => acceptRecommendation.mutate(rec.procedureId)}
                  disabled={acceptRecommendation.isPending}
                  data-testid={`accept-procedure-${rec.procedureId}`}
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Aceptar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => rejectRecommendation.mutate(rec.procedureId)}
                  disabled={rejectRecommendation.isPending}
                  data-testid={`reject-procedure-${rec.procedureId}`}
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Rechazar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}