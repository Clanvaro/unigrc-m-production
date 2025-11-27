import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, 
  Calendar, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  Target,
  Zap
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface TimelineRecommendation {
  recommendedDurationHours: number;
  confidenceLevel: number;
  factors: {
    factorName: string;
    impact: 'increases' | 'decreases' | 'varies';
    magnitude: number;
    description: string;
    mitigationStrategies: string[];
  }[];
  riskAdjustment: number;
  bufferRecommendation: number;
  milestones: {
    milestoneId: string;
    name: string;
    scheduledHours: number;
    description: string;
    dependencies: string[];
    criticality: 'low' | 'medium' | 'high' | 'critical';
    flexibility: number;
  }[];
  schedulingStrategy: {
    recommendedSequence: {
      step: number;
      testId: string;
      estimatedHours: number;
      dependencies: string[];
    }[];
    parallelExecutionOpportunities: {
      testIds: string[];
      savingsHours: number;
      requirements: string[];
      risks: string[];
    }[];
  };
  optimizationOpportunities: {
    type: string;
    description: string;
    potentialSavings: number;
    implementationCost: number;
  }[];
}

interface TimelineRecommendationsProps {
  auditTestId: string | null;
}

export function TimelineRecommendations({ auditTestId }: TimelineRecommendationsProps) {
  const [selectedOptimization, setSelectedOptimization] = useState<string | null>(null);
  const [showMilestones, setShowMilestones] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch timeline recommendations
  const { data: recommendation, isLoading, error } = useQuery<TimelineRecommendation>({
    queryKey: ['/api/recommendations/timeline', auditTestId],
    enabled: !!auditTestId,
    queryFn: async () => {
      const response = await fetch('/api/recommendations/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditTest: {
            id: auditTestId,
            complexity: 'moderate',
            riskCategory: 'financial',
            proceduresCount: 8,
            estimatedHours: 40
          },
          assignedAuditor: {
            id: 'auditor-1',
            skillLevel: 85,
            experience: 'senior'
          },
          constraints: {
            maxDuration: 60,
            resourceLimitations: []
          },
          dependencies: []
        })
      });
      if (!response.ok) throw new Error('Failed to fetch timeline recommendations');
      const data = await response.json();
      return data.timelineRecommendations;
    }
  });

  // Accept timeline mutation
  const acceptTimeline = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/recommendations/feedback', {
        method: 'POST',
        body: {
          recommendationId: auditTestId,
          feedbackType: 'acceptance',
          satisfactionScore: 5,
          comments: 'Cronograma aceptado desde la interfaz'
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "Cronograma Aceptado",
        description: "La recomendación de cronograma ha sido aceptada",
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

  const getCriticalityColor = (criticality: string) => {
    switch (criticality) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'increases': return <TrendingUp className="h-4 w-4 text-red-600" />;
      case 'decreases': return <TrendingUp className="h-4 w-4 text-green-600 rotate-180" />;
      default: return <Target className="h-4 w-4 text-blue-600" />;
    }
  };

  if (!auditTestId) {
    return (
      <Card data-testid="timeline-recommendations-empty">
        <CardHeader>
          <CardTitle>Recomendaciones de Cronograma</CardTitle>
          <CardDescription>
            Selecciona una prueba de auditoría para ver recomendaciones de cronograma
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-2" />
            <p>No hay prueba de auditoría seleccionada</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="timeline-recommendations-loading">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (error || !recommendation) {
    return (
      <Card data-testid="timeline-recommendations-error">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Sin Recomendaciones
          </CardTitle>
          <CardDescription>
            No se pudieron generar recomendaciones de cronograma para esta prueba
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const totalOptimalHours = recommendation.recommendedDurationHours + recommendation.bufferRecommendation;

  return (
    <div className="space-y-6" data-testid="timeline-recommendations">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Recomendaciones de Cronograma</h2>
          <p className="text-muted-foreground">
            Cronograma optimizado basado en análisis predictivo y factores de riesgo
          </p>
        </div>
        <Badge variant="secondary" data-testid="confidence-level">
          {recommendation.confidenceLevel}% confianza
        </Badge>
      </div>

      {/* Timeline Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="recommended-duration">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Duración Recomendada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recommendation.recommendedDurationHours}h</div>
            <p className="text-xs text-muted-foreground">Base estimada</p>
          </CardContent>
        </Card>

        <Card data-testid="buffer-recommendation">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Buffer Recomendado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">+{recommendation.bufferRecommendation}h</div>
            <p className="text-xs text-muted-foreground">Margen de seguridad</p>
          </CardContent>
        </Card>

        <Card data-testid="total-duration">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Duración Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalOptimalHours}h</div>
            <p className="text-xs text-muted-foreground">Con buffer incluido</p>
          </CardContent>
        </Card>

        <Card data-testid="risk-adjustment">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Ajuste de Riesgo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">+{recommendation.riskAdjustment}%</div>
            <p className="text-xs text-muted-foreground">Factor de riesgo</p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline Factors */}
      <Card data-testid="timeline-factors">
        <CardHeader>
          <CardTitle>Factores de Impacto en Cronograma</CardTitle>
          <CardDescription>
            Factores que influyen en la duración estimada del proyecto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendation.factors.map((factor, index) => (
              <div 
                key={index} 
                className="flex items-start gap-4 p-3 border rounded-lg"
                data-testid={`timeline-factor-${index}`}
              >
                <div className="flex-shrink-0 mt-1">
                  {getImpactIcon(factor.impact)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium">{factor.factorName}</h4>
                    <Badge variant="outline" className="text-xs">
                      {factor.impact === 'increases' ? '+' : factor.impact === 'decreases' ? '-' : '±'}
                      {factor.magnitude}%
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{factor.description}</p>
                  {factor.mitigationStrategies.length > 0 && (
                    <div className="text-xs">
                      <span className="font-medium">Estrategias de mitigación: </span>
                      {factor.mitigationStrategies.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card data-testid="timeline-milestones">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Hitos del Proyecto</CardTitle>
              <CardDescription>
                Puntos de control y entregables clave del cronograma
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMilestones(!showMilestones)}
              data-testid="toggle-milestones"
            >
              {showMilestones ? 'Ocultar' : 'Mostrar'} Hitos
            </Button>
          </div>
        </CardHeader>
        {showMilestones && (
          <CardContent>
            <div className="space-y-3">
              {recommendation.milestones.map((milestone, index) => (
                <div 
                  key={milestone.milestoneId} 
                  className="flex items-center gap-4 p-3 border rounded-lg"
                  data-testid={`milestone-${milestone.milestoneId}`}
                >
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{milestone.name}</h4>
                      <Badge className={getCriticalityColor(milestone.criticality)}>
                        {milestone.criticality}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{milestone.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>⏱️ {milestone.scheduledHours}h</span>
                      <span>🔄 Flexibilidad: {milestone.flexibility}%</span>
                      {milestone.dependencies.length > 0 && (
                        <span>📋 Dependencias: {milestone.dependencies.length}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Optimization Opportunities */}
      {recommendation.optimizationOpportunities.length > 0 && (
        <Card data-testid="optimization-opportunities">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Oportunidades de Optimización
            </CardTitle>
            <CardDescription>
              Mejoras que pueden reducir el tiempo total del proyecto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendation.optimizationOpportunities.map((opportunity, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => setSelectedOptimization(opportunity.type)}
                  data-testid={`optimization-${index}`}
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{opportunity.type}</h4>
                    <p className="text-sm text-muted-foreground">{opportunity.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-green-600 font-bold">-{opportunity.potentialSavings}h</div>
                    <div className="text-xs text-muted-foreground">Costo: {opportunity.implementationCost}h</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parallel Execution Opportunities */}
      {recommendation.schedulingStrategy.parallelExecutionOpportunities.length > 0 && (
        <Card data-testid="parallel-execution">
          <CardHeader>
            <CardTitle>Ejecución Paralela</CardTitle>
            <CardDescription>
              Actividades que pueden realizarse simultáneamente para ahorrar tiempo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendation.schedulingStrategy.parallelExecutionOpportunities.map((parallel, index) => (
                <div 
                  key={index} 
                  className="p-3 border rounded-lg"
                  data-testid={`parallel-execution-${index}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Grupo de Actividades Paralelas {index + 1}</h4>
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Ahorro: {parallel.savingsHours}h
                    </Badge>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Actividades: </span>
                      {parallel.testIds.join(', ')}
                    </div>
                    <div>
                      <span className="font-medium">Requerimientos: </span>
                      {parallel.requirements.join(', ')}
                    </div>
                  </div>
                  {parallel.risks.length > 0 && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium text-yellow-700">Riesgos: </span>
                      {parallel.risks.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4">
        <Button
          onClick={() => acceptTimeline.mutate()}
          disabled={acceptTimeline.isPending}
          data-testid="accept-timeline"
        >
          <ThumbsUp className="h-4 w-4 mr-2" />
          Aceptar Cronograma
        </Button>
        <Button
          variant="outline"
          data-testid="modify-timeline"
        >
          Modificar Parámetros
        </Button>
        <Button
          variant="outline"
          data-testid="export-timeline"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Exportar a Calendario
        </Button>
      </div>
    </div>
  );
}