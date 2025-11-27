import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AuditSectionProps } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
  FileText,
  Download,
  Printer,
  Calendar,
  User,
  FileWarning,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  TrendingUp
} from "lucide-react";
import type { AuditFinding, User as UserType } from "@shared/schema";

export function AuditReportSection({ audit }: AuditSectionProps) {
  const [reportView, setReportView] = useState<"preview" | "formal">("preview");

  const { data: findings = [], isLoading: loadingFindings } = useQuery<AuditFinding[]>({
    queryKey: ["/api/audit-findings", { auditId: audit.id }],
  });

  const { data: leadAuditor, isLoading: loadingAuditor } = useQuery<UserType | null>({
    queryKey: ["/api/users", audit.leadAuditor],
    queryFn: async () => {
      if (!audit.leadAuditor) return null;
      const response = await fetch(`/api/users/${audit.leadAuditor}`);
      if (!response.ok) return null;
      return response.json();
    },
  });

  const formatDate = (date: Date | string | null) => {
    if (!date) return "No establecida";
    return new Date(date).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; color: string }> = {
      draft: { label: "Borrador", color: "bg-gray-500" },
      under_review: { label: "En Revisión", color: "bg-blue-500" },
      scope_approved: { label: "Alcance Aprobado", color: "bg-purple-500" },
      in_execution: { label: "En Ejecución", color: "bg-yellow-500" },
      technical_close: { label: "Cierre Técnico", color: "bg-orange-500" },
      preliminary_report: { label: "Informe Preliminar", color: "bg-cyan-500" },
      final_report: { label: "Informe Final", color: "bg-green-600" },
      follow_up: { label: "Seguimiento", color: "bg-indigo-500" },
      cancelled: { label: "Cancelado", color: "bg-red-500" },
    };
    const { label, color } = config[status] || { label: status, color: "bg-gray-500" };
    return <Badge className={`${color} text-white`}>{label}</Badge>;
  };

  const severityCounts = {
    critical: findings.filter(f => f.severity === "critical").length,
    high: findings.filter(f => f.severity === "high").length,
    medium: findings.filter(f => f.severity === "medium").length,
    low: findings.filter(f => f.severity === "low").length,
  };

  const totalFindings = findings.length;
  const criticalAndHigh = severityCounts.critical + severityCounts.high;

  const getOverallRisk = () => {
    if (severityCounts.critical > 0) return { level: "Alto", color: "text-red-600", icon: AlertTriangle };
    if (severityCounts.high > 2) return { level: "Alto", color: "text-red-600", icon: AlertTriangle };
    if (severityCounts.high > 0 || severityCounts.medium > 3) return { level: "Medio", color: "text-yellow-600", icon: AlertTriangle };
    if (severityCounts.medium > 0) return { level: "Bajo-Medio", color: "text-blue-600", icon: TrendingUp };
    return { level: "Bajo", color: "text-green-600", icon: CheckCircle2 };
  };

  const riskAssessment = getOverallRisk();
  const RiskIcon = riskAssessment.icon;

  if (loadingFindings || loadingAuditor) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="audit-report">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informe de Auditoría
              </CardTitle>
              {getStatusBadge(audit.status)}
            </div>
            <div className="flex gap-2">
              <Button
                variant={reportView === "preview" ? "default" : "outline"}
                size="sm"
                onClick={() => setReportView("preview")}
                data-testid="button-view-preview"
              >
                Vista Previa
              </Button>
              <Button
                variant={reportView === "formal" ? "default" : "outline"}
                size="sm"
                onClick={() => setReportView("formal")}
                data-testid="button-view-formal"
              >
                Formato Formal
              </Button>
              <Separator orientation="vertical" className="h-8" />
              <Button variant="outline" size="sm" data-testid="button-export-pdf">
                <Download className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
              <Button variant="outline" size="sm" data-testid="button-print">
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {reportView === "preview" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Código de Auditoría</p>
                  <p className="font-medium text-lg">{audit.code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nombre de Auditoría</p>
                  <p className="font-medium">{audit.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Auditoría</p>
                  <p className="font-medium capitalize">{audit.type.replace("_", " ")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Auditor Líder</p>
                  <p className="font-medium">{leadAuditor?.fullName || audit.leadAuditor}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Período de Revisión</p>
                  <p className="font-medium">
                    {formatDate(audit.reviewPeriodStartDate)} - {formatDate(audit.reviewPeriodEndDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de Ejecución</p>
                  <p className="font-medium">
                    {formatDate(audit.actualStartDate)} - {formatDate(audit.actualEndDate)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Alcance de la Auditoría</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">
                {audit.scope || "El alcance de la auditoría no ha sido definido."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Objetivos de la Auditoría</CardTitle>
            </CardHeader>
            <CardContent>
              {audit.objectives && audit.objectives.length > 0 ? (
                <ul className="list-disc list-inside space-y-2">
                  {audit.objectives.map((objective, index) => (
                    <li key={index} className="text-sm">{objective}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No se han definido objetivos específicos para esta auditoría.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Resumen de Hallazgos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm text-muted-foreground">Críticos</p>
                  <p className="text-3xl font-bold text-red-600">{severityCounts.critical}</p>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <p className="text-sm text-muted-foreground">Altos</p>
                  <p className="text-3xl font-bold text-orange-600">{severityCounts.high}</p>
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-muted-foreground">Medios</p>
                  <p className="text-3xl font-bold text-yellow-600">{severityCounts.medium}</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-muted-foreground">Bajos</p>
                  <p className="text-3xl font-bold text-blue-600">{severityCounts.low}</p>
                </div>
              </div>

              <div className="p-4 bg-accent/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Hallazgos</p>
                    <p className="text-2xl font-bold">{totalFindings}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Evaluación de Riesgo</p>
                    <div className="flex items-center gap-2 justify-end">
                      <RiskIcon className={`h-5 w-5 ${riskAssessment.color}`} />
                      <p className={`text-xl font-bold ${riskAssessment.color}`}>
                        {riskAssessment.level}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {criticalAndHigh > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-2">
                    <FileWarning className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-red-900 dark:text-red-100">
                        Hallazgos de Alta Prioridad
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                        Se identificaron {criticalAndHigh} hallazgo(s) de severidad crítica o alta que requieren
                        atención inmediata de la gerencia.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hallazgos Principales</CardTitle>
            </CardHeader>
            <CardContent>
              {findings.length > 0 ? (
                <div className="space-y-3">
                  {findings.slice(0, 5).map((finding) => (
                    <div
                      key={finding.id}
                      className="p-3 border rounded-lg"
                      data-testid={`finding-summary-${finding.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="font-mono text-xs">
                              {finding.code}
                            </Badge>
                            <Badge className={
                              finding.severity === "critical" ? "bg-red-600" :
                              finding.severity === "high" ? "bg-orange-500" :
                              finding.severity === "medium" ? "bg-yellow-500" :
                              "bg-blue-500"
                            }>
                              {finding.severity === "critical" ? "Crítico" :
                               finding.severity === "high" ? "Alto" :
                               finding.severity === "medium" ? "Medio" : "Bajo"}
                            </Badge>
                          </div>
                          <h4 className="font-medium text-sm">{finding.title}</h4>
                          {finding.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {finding.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {findings.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      y {findings.length - 5} hallazgo(s) adicional(es)...
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No se identificaron hallazgos durante esta auditoría
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conclusión General</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">
                {totalFindings === 0 ? (
                  "La auditoría no identificó deficiencias significativas. Los controles evaluados operan de manera efectiva para mitigar los riesgos identificados."
                ) : criticalAndHigh > 0 ? (
                  `La auditoría identificó ${totalFindings} hallazgo(s), de los cuales ${criticalAndHigh} son de severidad crítica o alta. Se recomienda que la gerencia tome acciones inmediatas para abordar estos hallazgos y fortalecer el entorno de control.`
                ) : (
                  `La auditoría identificó ${totalFindings} hallazgo(s) que requieren atención. Si bien no se identificaron deficiencias críticas, se recomienda implementar las acciones correctivas para mejorar continuamente el sistema de control interno.`
                )}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {reportView === "formal" && (
        <Card className="bg-white dark:bg-card p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2 border-b pb-6">
              <h1 className="text-3xl font-bold">INFORME DE AUDITORÍA</h1>
              <p className="text-xl">{audit.code}</p>
              <p className="text-lg text-muted-foreground">{audit.name}</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div>
                  <span className="font-semibold">Auditor Líder:</span> {leadAuditor?.fullName}
                </div>
                <div>
                  <span className="font-semibold">Tipo:</span> {audit.type.replace("_", " ")}
                </div>
                <div>
                  <span className="font-semibold">Período Revisado:</span>{" "}
                  {formatDate(audit.reviewPeriodStartDate)} - {formatDate(audit.reviewPeriodEndDate)}
                </div>
                <div>
                  <span className="font-semibold">Fecha del Informe:</span> {formatDate(new Date())}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-bold border-b pb-2">1. ALCANCE</h2>
              <p className="text-sm">{audit.scope || "No definido"}</p>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-bold border-b pb-2">2. OBJETIVOS</h2>
              {audit.objectives && audit.objectives.length > 0 ? (
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  {audit.objectives.map((obj, idx) => (
                    <li key={idx}>{obj}</li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">No definidos</p>
              )}
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-bold border-b pb-2">3. RESUMEN EJECUTIVO</h2>
              <p className="text-sm">
                Se realizó una auditoría {audit.type.replace("_", " ")} durante el período{" "}
                {formatDate(audit.actualStartDate)} a {formatDate(audit.actualEndDate)}. La auditoría
                identificó un total de {totalFindings} hallazgo(s).
              </p>
              <div className="grid grid-cols-4 gap-4 py-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{severityCounts.critical}</p>
                  <p className="text-xs">Críticos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">{severityCounts.high}</p>
                  <p className="text-xs">Altos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">{severityCounts.medium}</p>
                  <p className="text-xs">Medios</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{severityCounts.low}</p>
                  <p className="text-xs">Bajos</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-bold border-b pb-2">4. HALLAZGOS DETALLADOS</h2>
              {findings.length > 0 ? (
                <div className="space-y-6">
                  {findings.map((finding, index) => (
                    <div key={finding.id} className="space-y-2">
                      <h3 className="font-semibold text-base">
                        Hallazgo {index + 1}: {finding.title} [{finding.code}]
                      </h3>
                      <div className="pl-4 space-y-2 text-sm">
                        <div>
                          <span className="font-semibold">Severidad:</span>{" "}
                          <Badge className={
                            finding.severity === "critical" ? "bg-red-600" :
                            finding.severity === "high" ? "bg-orange-500" :
                            finding.severity === "medium" ? "bg-yellow-500" :
                            "bg-blue-500"
                          }>
                            {finding.severity === "critical" ? "Crítica" :
                             finding.severity === "high" ? "Alta" :
                             finding.severity === "medium" ? "Media" : "Baja"}
                          </Badge>
                        </div>
                        <div>
                          <span className="font-semibold">Condición:</span> {finding.condition}
                        </div>
                        <div>
                          <span className="font-semibold">Criterio:</span> {finding.criteria}
                        </div>
                        <div>
                          <span className="font-semibold">Causa:</span> {finding.cause}
                        </div>
                        <div>
                          <span className="font-semibold">Efecto:</span> {finding.effect}
                        </div>
                        <div>
                          <span className="font-semibold">Recomendación:</span> {finding.recommendation}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm">No se identificaron hallazgos.</p>
              )}
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-bold border-b pb-2">5. CONCLUSIÓN</h2>
              <p className="text-sm">
                {totalFindings === 0 ? (
                  "La auditoría no identificó deficiencias significativas. Los controles evaluados operan de manera efectiva."
                ) : criticalAndHigh > 0 ? (
                  `Se identificaron ${criticalAndHigh} hallazgo(s) de alta prioridad que requieren atención inmediata. Se recomienda implementar las acciones correctivas propuestas.`
                ) : (
                  `Se identificaron ${totalFindings} oportunidad(es) de mejora. Se recomienda implementar las acciones correctivas sugeridas.`
                )}
              </p>
            </div>

            <div className="pt-8 space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div className="text-center">
                  <div className="border-t-2 border-gray-800 pt-2">
                    <p className="font-semibold">{leadAuditor?.fullName}</p>
                    <p className="text-sm text-muted-foreground">Auditor Líder</p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="border-t-2 border-gray-800 pt-2">
                    <p className="font-semibold">_____________________</p>
                    <p className="text-sm text-muted-foreground">Director de Auditoría Interna</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
