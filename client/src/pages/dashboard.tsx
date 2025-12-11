import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Shield, CheckSquare, TrendingUp, TrendingDown, Bell, ArrowRight } from "lucide-react";
import MatrixGrid from "@/components/risk-matrix/matrix-grid";
import { getRiskLevelText } from "@/lib/risk-calculations";
import { Top5Risks } from "@/components/Top5Risks";
import type { Risk, RiskWithProcess } from "@shared/schema";
import { ExplanationPopover } from "@/components/ExplanationPopover";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Link } from "wouter";

interface DashboardStats {
  totalRisks: number;
  criticalRisks: number;
  activeControls: number;
  organizationalRiskAvg: number;
  actionPlans: number;
  entityRiskBreakdown?: {
    processAvg: number;
    regulationAvg: number;
    processCount: number;
    regulationCount: number;
  };
  riskDistribution?: Array<{ 
    level: string; 
    count: number;
    name?: string;
    value?: number;
  }>;
}

interface TrendDataPoint {
  date: string;
  riskCount: number;
  criticalRisks: number;
  organizationalRisk: number;
  controlEffectiveness: number;
}

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  count: number;
  action: string;
  link: string;
}

export default function Dashboard() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRisks, setSelectedRisks] = useState<RiskWithProcess[]>([]);
  const [matrixInfo, setMatrixInfo] = useState({ probability: 0, impact: 0, matrixType: '' });
  
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    staleTime: 120000, // 2 minutos - reducir refetches durante navegación rápida
  });

  const { data: trendData = [] } = useQuery<TrendDataPoint[]>({
    queryKey: ["/api/dashboard/risk-trends"],
    enabled: !!stats,
    staleTime: 120000, // 2 minutos - reducir refetches durante navegación rápida
  });

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ["/api/dashboard/alerts"],
    enabled: !!stats,
    staleTime: 120000, // 2 minutos - reducir refetches durante navegación rápida
  });

  const handleMatrixCellClick = (risks: RiskWithProcess[], probability: number, impact: number, matrixType: string) => {
    setSelectedRisks(risks);
    setMatrixInfo({ probability, impact, matrixType });
    setDialogOpen(true);
  };

  if (isLoading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="@container p-6" data-testid="dashboard-content">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 @md:grid-cols-2 @2xl:grid-cols-4 gap-6 mb-8">
        <Card data-testid="card-total-risks">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Riesgos</p>
                <p className="text-2xl font-bold" data-testid="text-total-risks">{stats?.totalRisks || 0}</p>
              </div>
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-primary h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              {trendData && trendData.length >= 2 && (
                <>
                  {trendData[trendData.length - 1].riskCount >= trendData[0].riskCount ? (
                    <>
                      <TrendingUp className="h-4 w-4 text-chart-1" />
                      <span className="text-chart-1 font-medium">
                        +{Math.round(((trendData[trendData.length - 1].riskCount - trendData[0].riskCount) / trendData[0].riskCount) * 100)}%
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-4 w-4 text-green-600" />
                      <span className="text-green-600 font-medium">
                        {Math.round(((trendData[trendData.length - 1].riskCount - trendData[0].riskCount) / trendData[0].riskCount) * 100)}%
                      </span>
                    </>
                  )}
                  <span className="text-foreground/70">vs. mes anterior</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-critical-risks">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-muted-foreground">Riesgos Críticos</p>
                  <ExplanationPopover
                    title="Riesgos Críticos"
                    description="Riesgos con valor inherente que superan el umbral crítico configurado en el sistema"
                    formula="Riesgo Crítico: inherent_risk > 19"
                    calculationSteps={[
                      {
                        label: 'Umbral Crítico Configurado',
                        value: '19'
                      },
                      {
                        label: 'Total de Riesgos Críticos',
                        formula: 'COUNT(risks WHERE inherent_risk > 19)',
                        value: stats?.criticalRisks || 0
                      }
                    ]}
                    dataSource={{
                      table: 'risks, system_config',
                      query: 'SELECT COUNT(*) FROM risks WHERE inherent_risk > 19',
                      timestamp: new Date().toLocaleString()
                    }}
                    variant="icon"
                  />
                </div>
                <p className="text-2xl font-bold text-destructive" data-testid="text-critical-risks">{stats?.criticalRisks || 0}</p>
              </div>
              <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-destructive h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              {alerts && alerts.find((a: any) => a.id === 'critical-no-controls') && (
                <>
                  <Bell className="h-4 w-4 text-destructive" />
                  <span className="text-destructive font-medium">
                    {alerts.find((a: any) => a.id === 'critical-no-controls')?.count} sin controles
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-active-controls">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Controles Activos</p>
                <p className="text-2xl font-bold" data-testid="text-active-controls">{stats?.activeControls || 0}</p>
              </div>
              <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center">
                <Shield className="text-secondary h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              {trendData && trendData.length >= 2 && (
                <>
                  <div className="flex items-center gap-1">
                    <Shield className="h-4 w-4 text-chart-1" />
                    <span className="text-foreground/90 font-medium">
                      {Math.round(trendData[trendData.length - 1].controlEffectiveness)}%
                    </span>
                  </div>
                  <span className="text-foreground/70">efectividad promedio</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-organizational-risk">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-muted-foreground">Riesgo Organizacional</p>
                  <ExplanationPopover
                    title="Riesgo Organizacional"
                    description="Promedio agregado de todos los riesgos en la organización"
                    formula="Riesgo Organizacional = AVG(Todos los Riesgos)"
                    calculationSteps={[
                      {
                        label: 'Total de Riesgos',
                        value: stats?.totalRisks || 0
                      },
                      {
                        label: 'Promedio de Procesos',
                        value: stats?.entityRiskBreakdown?.processAvg?.toFixed(1) || '0.0'
                      },
                      {
                        label: 'Promedio de Normativas',
                        value: stats?.entityRiskBreakdown?.regulationAvg?.toFixed(1) || '0.0'
                      },
                      {
                        label: 'Riesgo Organizacional',
                        formula: 'AVG(Todos los Riesgos de la Organización)',
                        value: stats?.organizationalRiskAvg?.toFixed(1) || '0.0'
                      }
                    ]}
                    dataSource={{
                      table: 'risks',
                      query: 'SELECT AVG(inherent_risk) FROM risks',
                      timestamp: new Date().toLocaleString()
                    }}
                    variant="icon"
                  />
                </div>
                <p className="text-2xl font-bold" data-testid="text-organizational-risk">
                  {stats?.organizationalRiskAvg ? stats.organizationalRiskAvg.toFixed(1) : '0.0'}
                </p>
              </div>
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                <TrendingUp className="text-orange-600 dark:text-orange-400 h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-muted-foreground">
                Procesos: {stats?.entityRiskBreakdown?.processAvg?.toFixed(1) || '0.0'} | 
                Normativas: {stats?.entityRiskBreakdown?.regulationAvg?.toFixed(1) || '0.0'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actionable Alerts Panel */}
      {alerts && alerts.length > 0 && (
        <Card className="mb-8 border-l-4 border-l-destructive" data-testid="card-alerts">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
                  <Bell className="text-destructive h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">Alertas Accionables</h3>
              </div>
              <Badge variant="destructive" data-testid="text-alert-count">{alerts.length}</Badge>
            </div>
            <div className="space-y-3">
              {alerts.map((alert: any) => (
                <Link key={alert.id} href={alert.link}>
                  <div 
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer group"
                    data-testid={`alert-${alert.id}`}
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`mt-0.5 w-2 h-2 rounded-full ${
                        alert.type === 'critical' ? 'bg-destructive' :
                        alert.type === 'warning' ? 'bg-orange-500' : 'bg-blue-500'
                      }`}></div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground/90">{alert.title}</p>
                        <p className="text-sm text-foreground/70 mt-1">{alert.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-primary group-hover:underline">
                        {alert.action}
                      </span>
                      <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Trends Chart */}
      {trendData && trendData.length > 0 && (
        <Card className="mb-8" data-testid="card-trends">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-6">Tendencias de Riesgo (Últimos 30 días)</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--foreground) / 0.7)' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--foreground) / 0.7)' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="organizationalRisk" 
                    stroke="hsl(var(--chart-1))" 
                    fillOpacity={1}
                    fill="url(#colorRisk)"
                    name="Riesgo Organizacional"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="criticalRisks" 
                    stroke="hsl(var(--destructive))" 
                    fillOpacity={1}
                    fill="url(#colorCritical)"
                    name="Riesgos Críticos"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Risk Info Card */}
      <div className="grid grid-cols-1 @md:grid-cols-2 @2xl:grid-cols-3 gap-6 mb-8">
        <Card data-testid="card-action-plans">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Planes de Acción</p>
                <p className="text-2xl font-bold" data-testid="text-action-plans">{stats?.actionPlans || 0}</p>
              </div>
              <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                <CheckSquare className="text-accent h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              {alerts && alerts.find((a: any) => a.id === 'overdue-plans') ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-orange-600 dark:text-orange-400 font-medium">
                    {alerts.find((a: any) => a.id === 'overdue-plans')?.count} vencidos
                  </span>
                </>
              ) : (
                <span className="text-foreground/70">Sin planes vencidos</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-entity-breakdown">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-muted-foreground">Desglose por Entidad</p>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Procesos con Riesgo</span>
                <span className="font-medium" data-testid="text-process-count">
                  {stats?.entityRiskBreakdown?.processCount || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Normativas con Riesgo</span>
                <span className="font-medium" data-testid="text-regulation-count">
                  {stats?.entityRiskBreakdown?.regulationCount || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-risk-summary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-muted-foreground">Resumen de Riesgos</p>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Promedio Procesos</span>
                <span className="font-medium text-blue-600 dark:text-blue-400" data-testid="text-process-avg">
                  {stats?.entityRiskBreakdown?.processAvg?.toFixed(1) || '0.0'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Promedio Normativas</span>
                <span className="font-medium text-purple-600 dark:text-purple-400" data-testid="text-regulation-avg">
                  {stats?.entityRiskBreakdown?.regulationAvg?.toFixed(1) || '0.0'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Matrix Overview - Both Inherent and Residual */}
      <Card data-testid="card-risk-matrices" className="mb-8">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Matrices de Riesgo - Vista Rápida</h3>
          <div className="grid grid-cols-1 @lg:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-medium mb-3 text-center">Riesgo Inherente</h4>
              <MatrixGrid isOverview={true} matrixType="inherent" onCellClick={handleMatrixCellClick} />
            </div>
            <div>
              <h4 className="text-md font-medium mb-3 text-center">Riesgo Residual</h4>
              <MatrixGrid isOverview={true} matrixType="residual" onCellClick={handleMatrixCellClick} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Distribution */}
      <Card data-testid="card-risk-distribution" className="mb-8">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Distribución por Nivel de Riesgo</h3>
          <div className="space-y-4">
            {stats?.riskDistribution?.map((item, index) => (
              <div key={item.level} className="flex items-center justify-between" data-testid={`risk-level-${item.level.toLowerCase()}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded ${
                    index === 0 ? 'bg-chart-1' :
                    index === 1 ? 'bg-chart-2' :
                    index === 2 ? 'bg-chart-3' : 'bg-destructive'
                  }`}></div>
                  <span className="text-sm">{item.level}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{item.count}</span>
                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        index === 0 ? 'bg-chart-1' :
                        index === 1 ? 'bg-chart-2' :
                        index === 2 ? 'bg-chart-3' : 'bg-destructive'
                      }`}
                      style={{ width: `${Math.min((item.count / (stats?.totalRisks || 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top 5 Risks */}
      <div className="grid grid-cols-1 @2xl:grid-cols-2 gap-6 mb-8">
        <Top5Risks />
        
        {/* Recent Activity */}
        <Card data-testid="card-recent-activity">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Actividad Reciente</h3>
              <button className="text-sm text-primary hover:text-primary/80" data-testid="button-view-all">Ver todo</button>
            </div>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-3 hover:bg-muted/50 rounded-lg transition-colors" data-testid="activity-item-1">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <TrendingUp className="text-primary text-xs" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Sistema inicializado correctamente</p>
                <p className="text-xs text-muted-foreground">Todos los módulos están funcionando • Ahora</p>
              </div>
            </div>
          </div>
        </CardContent>
        </Card>
      </div>

      {/* Risk Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Riesgos en Cuadrante - {matrixInfo.matrixType === 'inherent' ? 'Riesgo Inherente' : 'Riesgo Residual'}
            </DialogTitle>
            <DialogDescription>
              Probabilidad: {matrixInfo.probability} | Impacto: {matrixInfo.impact} | Total: {selectedRisks.length} riesgos
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedRisks.length > 0 ? (
              selectedRisks.map((risk) => (
                <Card key={risk.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{risk.code}</h4>
                        <Badge variant="outline" className="text-xs">
                          {getRiskLevelText(risk.probability * risk.impact)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{risk.name}</p>
                      <p className="text-xs text-muted-foreground mb-2">{risk.description}</p>
                      
                      {/* Process Information */}
                      <div className="mb-2">
                        {risk.macroproceso && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Macroproceso:</span> {risk.macroproceso.name}
                          </div>
                        )}
                        {risk.process && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Proceso:</span> {risk.process.name}
                          </div>
                        )}
                        {risk.subproceso && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Subproceso:</span> {risk.subproceso.name}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-xs">
                        <span>Probabilidad: {risk.probability}</span>
                        <span>Impacto: {risk.impact}</span>
                        <span>Riesgo Inherente: {risk.inherentRisk}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
                <p>No hay riesgos en este cuadrante</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
