import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageSquare,
  Star,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  BarChart,
  Send
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface FeedbackEntry {
  id: string;
  recommendationId: string;
  recommendationType: 'procedure' | 'auditor' | 'timeline' | 'complete';
  feedbackType: 'quality' | 'accuracy' | 'usefulness' | 'outcome';
  satisfactionScore: number;
  comments: string;
  createdAt: string;
  wasHelpful: boolean;
  outcomeData?: {
    actualDuration?: number;
    actualQuality?: number;
    successfullyImplemented?: boolean;
    issuesEncountered?: string[];
  };
}

interface FeedbackStats {
  totalFeedback: number;
  averageSatisfaction: number;
  helpfulnessRate: number;
  improvementRate: number;
  categoryBreakdown: {
    [key: string]: {
      count: number;
      averageScore: number;
    };
  };
}

export function RecommendationFeedback() {
  const [newFeedback, setNewFeedback] = useState({
    recommendationId: '',
    feedbackType: 'quality' as const,
    satisfactionScore: 3,
    comments: '',
    outcomeData: {
      actualDuration: 0,
      actualQuality: 0,
      successfullyImplemented: false,
      issuesEncountered: []
    }
  });
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch feedback statistics
  const { data: stats, isLoading: statsLoading } = useQuery<FeedbackStats>({
    queryKey: ['/api/recommendations/feedback/stats'],
    queryFn: async () => {
      const response = await fetch('/api/recommendations/feedback/stats');
      if (!response.ok) throw new Error('Failed to fetch feedback stats');
      return response.json();
    }
  });

  // Fetch recent feedback entries
  const { data: feedbackHistory, isLoading: historyLoading } = useQuery<FeedbackEntry[]>({
    queryKey: ['/api/recommendations/feedback'],
    queryFn: async () => {
      const response = await fetch('/api/recommendations/feedback');
      if (!response.ok) throw new Error('Failed to fetch feedback history');
      return response.json();
    }
  });

  // Fetch available recommendations for feedback
  const { data: availableRecommendations, isLoading: recommendationsLoading } = useQuery({
    queryKey: ['/api/recommendations/recent'],
    queryFn: async () => {
      const response = await fetch('/api/recommendations/recent?limit=10');
      if (!response.ok) throw new Error('Failed to fetch recommendations');
      return response.json();
    }
  });

  // Submit feedback mutation
  const submitFeedback = useMutation({
    mutationFn: async (feedback: typeof newFeedback) => {
      return apiRequest('/api/recommendations/feedback', {
        method: 'POST',
        body: feedback
      });
    },
    onSuccess: () => {
      toast({
        title: "Retroalimentación Enviada",
        description: "Tu retroalimentación ayudará a mejorar las recomendaciones futuras",
      });
      setNewFeedback({
        recommendationId: '',
        feedbackType: 'quality',
        satisfactionScore: 3,
        comments: '',
        outcomeData: {
          actualDuration: 0,
          actualQuality: 0,
          successfullyImplemented: false,
          issuesEncountered: []
        }
      });
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations/feedback'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo enviar la retroalimentación",
        variant: "destructive",
      });
    }
  });

  const renderStars = (score: number) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < score ? 'text-yellow-500 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const getFeedbackTypeColor = (type: string) => {
    switch (type) {
      case 'quality': return 'bg-blue-100 text-blue-800';
      case 'accuracy': return 'bg-green-100 text-green-800';
      case 'usefulness': return 'bg-purple-100 text-purple-800';
      case 'outcome': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (statsLoading || historyLoading || recommendationsLoading) {
    return (
      <div className="space-y-6" data-testid="feedback-loading">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="recommendation-feedback">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Retroalimentación de Recomendaciones</h2>
          <p className="text-muted-foreground">
            Ayuda a mejorar la precisión del sistema proporcionando retroalimentación
          </p>
        </div>
        <Badge variant="secondary" data-testid="total-feedback">
          {stats?.totalFeedback || 0} comentarios
        </Badge>
      </div>

      {/* Feedback Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="average-satisfaction">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4" />
              Satisfacción Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{stats?.averageSatisfaction || 0}</div>
              <div className="flex">
                {renderStars(Math.round(stats?.averageSatisfaction || 0))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">De 5 estrellas</p>
          </CardContent>
        </Card>

        <Card data-testid="helpfulness-rate">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ThumbsUp className="h-4 w-4" />
              Tasa de Utilidad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.helpfulnessRate || 0}%</div>
            <p className="text-xs text-muted-foreground">Marcadas como útiles</p>
          </CardContent>
        </Card>

        <Card data-testid="improvement-rate">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Tasa de Mejora
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.improvementRate || 0}%</div>
            <p className="text-xs text-muted-foreground">Mes a mes</p>
          </CardContent>
        </Card>

        <Card data-testid="feedback-coverage">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              Cobertura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(((stats?.totalFeedback || 0) / 100) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">Recomendaciones evaluadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Submit New Feedback */}
      <Card data-testid="submit-feedback-form">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Enviar Nueva Retroalimentación
          </CardTitle>
          <CardDescription>
            Comparte tu experiencia con las recomendaciones recibidas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recommendation Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Recomendación a Evaluar</label>
            <select
              className="w-full p-2 border rounded-md"
              value={newFeedback.recommendationId}
              onChange={(e) => setNewFeedback({ ...newFeedback, recommendationId: e.target.value })}
              data-testid="select-recommendation"
            >
              <option value="">Seleccionar recomendación...</option>
              {availableRecommendations?.map((rec: any) => (
                <option key={rec.id} value={rec.id}>
                  {rec.type} - {rec.reasoning.substring(0, 50)}...
                </option>
              ))}
            </select>
          </div>

          {/* Feedback Type */}
          <div>
            <label className="text-sm font-medium mb-2 block">Tipo de Retroalimentación</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['quality', 'accuracy', 'usefulness', 'outcome'].map((type) => (
                <Button
                  key={type}
                  variant={newFeedback.feedbackType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewFeedback({ ...newFeedback, feedbackType: type as any })}
                  data-testid={`feedback-type-${type}`}
                >
                  {type === 'quality' && 'Calidad'}
                  {type === 'accuracy' && 'Precisión'}
                  {type === 'usefulness' && 'Utilidad'}
                  {type === 'outcome' && 'Resultado'}
                </Button>
              ))}
            </div>
          </div>

          {/* Satisfaction Score */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Puntuación de Satisfacción: {newFeedback.satisfactionScore}/5
            </label>
            <div className="flex items-center gap-2">
              {[...Array(5)].map((_, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  size="sm"
                  className="p-1"
                  onClick={() => setNewFeedback({ ...newFeedback, satisfactionScore: i + 1 })}
                  data-testid={`star-rating-${i + 1}`}
                >
                  <Star
                    className={`h-6 w-6 ${
                      i < newFeedback.satisfactionScore 
                        ? 'text-yellow-500 fill-current' 
                        : 'text-gray-300'
                    }`}
                  />
                </Button>
              ))}
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="text-sm font-medium mb-2 block">Comentarios</label>
            <Textarea
              placeholder="Describe tu experiencia con esta recomendación..."
              value={newFeedback.comments}
              onChange={(e) => setNewFeedback({ ...newFeedback, comments: e.target.value })}
              rows={4}
              data-testid="feedback-comments"
            />
          </div>

          {/* Outcome Data (for outcome feedback) */}
          {newFeedback.feedbackType === 'outcome' && (
            <div className="space-y-3 p-3 bg-muted rounded-lg">
              <h4 className="font-medium">Datos de Resultado</h4>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm mb-1 block">Duración Real (horas)</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded"
                    value={newFeedback.outcomeData.actualDuration}
                    onChange={(e) => setNewFeedback({
                      ...newFeedback,
                      outcomeData: {
                        ...newFeedback.outcomeData,
                        actualDuration: Number(e.target.value)
                      }
                    })}
                    data-testid="actual-duration"
                  />
                </div>
                <div>
                  <label className="text-sm mb-1 block">Calidad Real (%)</label>
                  <input
                    type="number"
                    className="w-full p-2 border rounded"
                    max="100"
                    value={newFeedback.outcomeData.actualQuality}
                    onChange={(e) => setNewFeedback({
                      ...newFeedback,
                      outcomeData: {
                        ...newFeedback.outcomeData,
                        actualQuality: Number(e.target.value)
                      }
                    })}
                    data-testid="actual-quality"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newFeedback.outcomeData.successfullyImplemented}
                  onChange={(e) => setNewFeedback({
                    ...newFeedback,
                    outcomeData: {
                      ...newFeedback.outcomeData,
                      successfullyImplemented: e.target.checked
                    }
                  })}
                  data-testid="successfully-implemented"
                />
                <label className="text-sm">Implementado exitosamente</label>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={() => submitFeedback.mutate(newFeedback)}
            disabled={!newFeedback.recommendationId || submitFeedback.isPending}
            className="w-full"
            data-testid="submit-feedback"
          >
            <Send className="h-4 w-4 mr-2" />
            Enviar Retroalimentación
          </Button>
        </CardContent>
      </Card>

      {/* Feedback History */}
      <Card data-testid="feedback-history">
        <CardHeader>
          <CardTitle>Historial de Retroalimentación</CardTitle>
          <CardDescription>
            Retroalimentación reciente del sistema de recomendaciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {feedbackHistory?.slice(0, 10).map((feedback) => (
              <div 
                key={feedback.id} 
                className="flex items-start gap-4 p-3 border rounded-lg"
                data-testid={`feedback-entry-${feedback.id}`}
              >
                <div className="flex-shrink-0 mt-1">
                  {feedback.wasHelpful ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={getFeedbackTypeColor(feedback.feedbackType)}>
                      {feedback.feedbackType}
                    </Badge>
                    <Badge variant="outline">
                      {feedback.recommendationType}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {renderStars(feedback.satisfactionScore)}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {feedback.comments || 'Sin comentarios adicionales'}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    {new Date(feedback.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      {stats?.categoryBreakdown && Object.keys(stats.categoryBreakdown).length > 0 && (
        <Card data-testid="category-breakdown">
          <CardHeader>
            <CardTitle>Desglose por Categoría</CardTitle>
            <CardDescription>
              Retroalimentación agrupada por tipo de recomendación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats.categoryBreakdown).map(([category, data]) => (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{data.count} evaluaciones</span>
                      <div className="flex">{renderStars(Math.round(data.averageScore))}</div>
                    </div>
                  </div>
                  <Progress value={(data.averageScore / 5) * 100} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}