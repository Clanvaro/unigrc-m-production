import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Star, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  BarChart
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AuditorRecommendation {
  auditorId: string;
  auditorName: string;
  matchScore: number;
  strengths: string[];
  potentialChallenges: string[];
  estimatedPerformance: {
    expectedQualityScore: number;
    expectedCompletionTime: number;
    successProbability: number;
    riskFactors: string[];
  };
  availabilityStatus: 'fully_available' | 'partially_available' | 'overloaded';
  historicalPerformance: {
    averageQualityScore: number;
    completionReliability: number;
    timeEstimateAccuracy: number;
    improvementTrend: 'improving' | 'stable' | 'declining';
  };
  skillAlignment: {
    overallAlignment: number;
    criticalSkills: {
      skillName: string;
      required: number;
      actual: number;
      gap: number;
    }[];
  };
  workloadAnalysis: {
    currentUtilization: number;
    availableCapacity: number;
    overcommitmentRisk: 'low' | 'medium' | 'high';
  };
}

interface AuditorRecommendationsProps {
  auditTestId: string | null;
}

export function AuditorRecommendations({ auditTestId }: AuditorRecommendationsProps) {
  const [selectedAuditor, setSelectedAuditor] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch auditor recommendations
  const { data: recommendations, isLoading, error } = useQuery<AuditorRecommendation[]>({
    queryKey: ['/api/recommendations/auditors', auditTestId],
    enabled: !!auditTestId,
    queryFn: async () => {
      const response = await fetch('/api/recommendations/auditors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testRequirements: {
            skillsRequired: ['financial_audit', 'risk_assessment'],
            complexityLevel: 'moderate',
            riskCategory: 'financial',
            estimatedHours: 40
          },
          timeline: {},
          workloadConstraints: {},
          skillRequirements: []
        })
      });
      if (!response.ok) throw new Error('Failed to fetch auditor recommendations');
      const data = await response.json();
      return data.auditorRecommendations;
    }
  });

  // Assign auditor mutation
  const assignAuditor = useMutation({
    mutationFn: async (auditorId: string) => {
      return apiRequest('/api/recommendations/feedback', {
        method: 'POST',
        body: {
          recommendationId: auditorId,
          feedbackType: 'acceptance',
          satisfactionScore: 5,
          comments: `Auditor ${auditorId} asignado desde la interfaz`
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "Auditor Asignado",
        description: "El auditor ha sido asignado exitosamente",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo asignar el auditor",
        variant: "destructive",
      });
    }
  });

  const toggleDetails = (auditorId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [auditorId]: !prev[auditorId]
    }));
  };

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'fully_available': return 'text-green-600';
      case 'partially_available': return 'text-yellow-600';
      case 'overloaded': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining': return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
      default: return <BarChart className="h-4 w-4 text-blue-600" />;
    }
  };

  if (!auditTestId) {
    return (
      <Card data-testid="auditor-recommendations-empty">
        <CardHeader>
          <CardTitle>Recomendaciones de Auditores</CardTitle>
          <CardDescription>
            Selecciona una prueba de auditoría para ver recomendaciones de auditores
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-2" />
            <p>No hay prueba de auditoría seleccionada</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="auditor-recommendations-loading">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    );
  }

  if (error || !recommendations?.length) {
    return (
      <Card data-testid="auditor-recommendations-error">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Sin Recomendaciones
          </CardTitle>
          <CardDescription>
            No se encontraron recomendaciones de auditores para esta prueba
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="auditor-recommendations">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Recomendaciones de Auditores</h2>
          <p className="text-muted-foreground">
            Auditores sugeridos basados en habilidades, disponibilidad y rendimiento
          </p>
        </div>
        <Badge variant="secondary" data-testid="recommendations-count">
          {recommendations.length} candidatos
        </Badge>
      </div>

      <div className="grid gap-6">
        {recommendations.map((rec) => (
          <Card 
            key={rec.auditorId} 
            className={`${selectedAuditor === rec.auditorId ? 'ring-2 ring-primary' : ''}`}
            data-testid={`auditor-recommendation-${rec.auditorId}`}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={`/api/users/${rec.auditorId}/avatar`} />
                    <AvatarFallback>
                      {rec.auditorName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {rec.auditorName}
                      <Badge 
                        variant={rec.matchScore >= 80 ? "default" : "secondary"}
                        data-testid={`match-score-${rec.auditorId}`}
                      >
                        {rec.matchScore}% match
                      </Badge>
                    </CardTitle>
                    <CardDescription className={getAvailabilityColor(rec.availabilityStatus)}>
                      {rec.availabilityStatus === 'fully_available' && 'Completamente disponible'}
                      {rec.availabilityStatus === 'partially_available' && 'Parcialmente disponible'}
                      {rec.availabilityStatus === 'overloaded' && 'Sobrecargado'}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleDetails(rec.auditorId)}
                    data-testid={`toggle-details-${rec.auditorId}`}
                  >
                    {showDetails[rec.auditorId] ? 'Ocultar' : 'Ver'} Detalles
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Performance Prediction */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {rec.estimatedPerformance.expectedQualityScore}%
                  </div>
                  <div className="text-sm text-muted-foreground">Calidad Esperada</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {rec.estimatedPerformance.expectedCompletionTime}h
                  </div>
                  <div className="text-sm text-muted-foreground">Tiempo Est.</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {rec.estimatedPerformance.successProbability}%
                  </div>
                  <div className="text-sm text-muted-foreground">Prob. Éxito</div>
                </div>
              </div>

              {/* Workload Analysis */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Utilización Actual</span>
                  <span className="text-sm text-muted-foreground">
                    {rec.workloadAnalysis.currentUtilization}%
                  </span>
                </div>
                <Progress value={rec.workloadAnalysis.currentUtilization} className="h-2" />
                <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                  <span>Capacidad disponible: {rec.workloadAnalysis.availableCapacity}h</span>
                  <Badge 
                    variant={
                      rec.workloadAnalysis.overcommitmentRisk === 'low' ? 'default' :
                      rec.workloadAnalysis.overcommitmentRisk === 'medium' ? 'secondary' : 'destructive'
                    }
                    className="text-xs"
                  >
                    Riesgo: {rec.workloadAnalysis.overcommitmentRisk}
                  </Badge>
                </div>
              </div>

              {/* Strengths and Challenges */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium mb-2 text-green-700">Fortalezas</div>
                  <div className="space-y-1">
                    {rec.strengths.slice(0, 3).map((strength, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        {strength}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-2 text-yellow-700">Desafíos Potenciales</div>
                  <div className="space-y-1">
                    {rec.potentialChallenges.slice(0, 3).map((challenge, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="h-3 w-3 text-yellow-600" />
                        {challenge}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Detailed Information */}
              {showDetails[rec.auditorId] && (
                <div className="space-y-4 pt-4 border-t">
                  {/* Historical Performance */}
                  <div>
                    <div className="text-sm font-medium mb-3 flex items-center gap-2">
                      Rendimiento Histórico
                      {getTrendIcon(rec.historicalPerformance.improvementTrend)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="text-lg font-bold">{rec.historicalPerformance.averageQualityScore}%</div>
                        <div className="text-xs text-muted-foreground">Calidad Promedio</div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="text-lg font-bold">{rec.historicalPerformance.completionReliability}%</div>
                        <div className="text-xs text-muted-foreground">Confiabilidad</div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="text-lg font-bold">{rec.historicalPerformance.timeEstimateAccuracy}%</div>
                        <div className="text-xs text-muted-foreground">Precisión Temporal</div>
                      </div>
                    </div>
                  </div>

                  {/* Skill Alignment */}
                  <div>
                    <div className="text-sm font-medium mb-3">
                      Alineación de Habilidades ({rec.skillAlignment.overallAlignment}%)
                    </div>
                    <div className="space-y-2">
                      {rec.skillAlignment.criticalSkills.slice(0, 3).map((skill, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{skill.skillName}</span>
                            <span className="text-muted-foreground">
                              {skill.actual}% / {skill.required}%
                            </span>
                          </div>
                          <Progress value={(skill.actual / skill.required) * 100} className="h-1" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Risk Factors */}
                  {rec.estimatedPerformance.riskFactors.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2">Factores de Riesgo</div>
                      <div className="space-y-1">
                        {rec.estimatedPerformance.riskFactors.map((factor, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm text-yellow-700">
                            <AlertTriangle className="h-3 w-3" />
                            {factor}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={() => assignAuditor.mutate(rec.auditorId)}
                  disabled={assignAuditor.isPending || rec.availabilityStatus === 'overloaded'}
                  data-testid={`assign-auditor-${rec.auditorId}`}
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Asignar Auditor
                </Button>
                <Button
                  variant="outline"
                  data-testid={`view-calendar-${rec.auditorId}`}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Ver Calendario
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}