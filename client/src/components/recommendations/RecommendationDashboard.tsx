import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  TrendingUp, 
  Users, 
  Clock, 
  Star, 
  AlertCircle,
  CheckCircle,
  Lightbulb
} from "lucide-react";
import { ProcedureRecommendations } from "./ProcedureRecommendations";
import { AuditorRecommendations } from "./AuditorRecommendations";
import { TimelineRecommendations } from "./TimelineRecommendations";
import { RecommendationFeedback } from "./RecommendationFeedback";

interface RecommendationStats {
  totalRecommendations: number;
  acceptanceRate: number;
  averageQualityScore: number;
  activeSuggestions: number;
}

interface RecentRecommendation {
  id: string;
  type: 'procedure' | 'auditor' | 'timeline' | 'complete';
  auditTestId: string;
  confidence: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  reasoning: string;
}

export function RecommendationDashboard() {
  const [selectedAuditTest, setSelectedAuditTest] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  // Fetch recommendation statistics
  const { data: stats, isLoading: statsLoading } = useQuery<RecommendationStats>({
    queryKey: ['/api/recommendations/analytics'],
  });

  // Fetch recent recommendations
  const { data: recentRecommendations, isLoading: recentsLoading } = useQuery<RecentRecommendation[]>({
    queryKey: ['/api/recommendations/recent'],
  });

  // Fetch available audit tests for recommendations
  const { data: auditTests, isLoading: testsLoading } = useQuery({
    queryKey: ['/api/audit-tests'],
  });

  const handleGenerateRecommendations = async (auditTestId: string) => {
    try {
      const response = await fetch('/api/recommendations/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditTestId,
          riskCategory: 'financial',
          complexity: 'moderate'
        })
      });

      if (!response.ok) throw new Error('Failed to generate recommendations');

      const result = await response.json();
      
      toast({
        title: "Recomendaciones Generadas",
        description: `Se generaron recomendaciones con puntuación de ${result.recommendationScore}%`,
      });

      setSelectedAuditTest(auditTestId);
      setActiveTab("procedures");
      
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron generar las recomendaciones",
        variant: "destructive",
      });
    }
  };

  if (statsLoading || recentsLoading || testsLoading) {
    return (
      <div className="space-y-6" data-testid="recommendation-dashboard-loading">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="recommendation-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Motor de Recomendaciones Inteligente</h1>
          <p className="text-muted-foreground">
            Optimiza tus auditorías con recomendaciones basadas en IA
          </p>
        </div>
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline"
          data-testid="refresh-recommendations"
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Actualizar Métricas
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="stats-total-recommendations">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recomendaciones</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalRecommendations || 0}</div>
            <p className="text-xs text-muted-foreground">+12% este mes</p>
          </CardContent>
        </Card>

        <Card data-testid="stats-acceptance-rate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Aceptación</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.acceptanceRate || 0}%</div>
            <p className="text-xs text-muted-foreground">+5% vs anterior</p>
          </CardContent>
        </Card>

        <Card data-testid="stats-quality-score">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Puntuación de Calidad</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.averageQualityScore || 0}%</div>
            <p className="text-xs text-muted-foreground">Promedio general</p>
          </CardContent>
        </Card>

        <Card data-testid="stats-active-suggestions">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sugerencias Activas</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeSuggestions || 0}</div>
            <p className="text-xs text-muted-foreground">Pendientes de revisión</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" data-testid="tab-overview">
            Resumen
          </TabsTrigger>
          <TabsTrigger value="procedures" data-testid="tab-procedures">
            Procedimientos
          </TabsTrigger>
          <TabsTrigger value="auditors" data-testid="tab-auditors">
            Auditores
          </TabsTrigger>
          <TabsTrigger value="timeline" data-testid="tab-timeline">
            Cronograma
          </TabsTrigger>
          <TabsTrigger value="feedback" data-testid="tab-feedback">
            Retroalimentación
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Audit Test Selection */}
            <Card data-testid="audit-test-selector">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Generar Recomendaciones
                </CardTitle>
                <CardDescription>
                  Selecciona una prueba de auditoría para obtener recomendaciones inteligentes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {auditTests?.slice(0, 3).map((test: any) => (
                  <div
                    key={test.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{test.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Riesgo: {test.riskCategory} | Estado: {test.status}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleGenerateRecommendations(test.id)}
                      size="sm"
                      data-testid={`generate-recommendations-${test.id}`}
                    >
                      Generar
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Recommendations */}
            <Card data-testid="recent-recommendations">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recomendaciones Recientes
                </CardTitle>
                <CardDescription>
                  Últimas sugerencias del sistema de IA
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentRecommendations?.slice(0, 4).map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                    data-testid={`recent-recommendation-${rec.id}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={rec.status === 'accepted' ? 'default' : 'secondary'}>
                          {rec.type}
                        </Badge>
                        <span className="text-sm font-medium">
                          Confianza: {rec.confidence}%
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {rec.reasoning.substring(0, 60)}...
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {rec.status === 'accepted' && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                      {rec.status === 'rejected' && (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="procedures">
          <ProcedureRecommendations auditTestId={selectedAuditTest} />
        </TabsContent>

        <TabsContent value="auditors">
          <AuditorRecommendations auditTestId={selectedAuditTest} />
        </TabsContent>

        <TabsContent value="timeline">
          <TimelineRecommendations auditTestId={selectedAuditTest} />
        </TabsContent>

        <TabsContent value="feedback">
          <RecommendationFeedback />
        </TabsContent>
      </Tabs>
    </div>
  );
}