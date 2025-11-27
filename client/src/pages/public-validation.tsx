import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2, XCircle, Clock, Shield, AlertTriangle, CheckSquare, FileText, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ValidationTokenData {
  id: string;
  entityType: string;
  entityId: string;
  processOwnerEmail: string;
  processOwnerName: string;
  expiresAt: string;
  createdAt: string;
  entityData?: {
    id: string;
    code?: string;
    name?: string;
    title?: string;
    description?: string;
    type?: string;
    // Control-specific fields
    automationLevel?: string;
    frequency?: string;
    effectiveness?: number;
    effectTarget?: string;
    evidence?: string;
    selfAssessment?: string;
    selfAssessmentComments?: string;
    selfAssessmentDate?: string;
    // Risk-specific fields
    probability?: number;
    impact?: number;
    inherentRisk?: number;
    residualRisk?: number;
    riskCategory?: string;
    process?: string;
    subproceso?: string;
    macroproceso?: string;
  };
}

// Translation functions
const translateControlType = (type: string) => {
  const translations: Record<string, string> = {
    'preventive': 'Preventivo',
    'detective': 'Detectivo',
    'corrective': 'Correctivo',
    'directive': 'Directivo'
  };
  return translations[type.toLowerCase()] || type;
};

const translateAutomationLevel = (level: string) => {
  const translations: Record<string, string> = {
    'automatic': 'Automático',
    'manual': 'Manual',
    'semi_automatic': 'Semi-automático',
    'semiautomatic': 'Semi-automático'
  };
  return translations[level.toLowerCase()] || level;
};

const translateSelfAssessment = (assessment: string) => {
  const translations: Record<string, string> = {
    'efectivo': 'Efectivo',
    'parcialmente_efectivo': 'Parcialmente Efectivo',
    'no_efectivo': 'No Efectivo',
    'no_aplica': 'No Aplica'
  };
  return translations[assessment.toLowerCase()] || assessment;
};

export default function PublicValidationPage() {
  const { token } = useParams<{ token: string }>();
  const [validationResult, setValidationResult] = useState<"validated" | "rejected" | "">("");
  const [comments, setComments] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState<string>("");

  // Clean and validate token - handle trailing slashes and query strings
  const cleanToken = token?.trim().split('?')[0] || "";

  const { data: tokenData, isLoading, error } = useQuery<ValidationTokenData>({
    queryKey: ["/api/validation-tokens", cleanToken],
    queryFn: async () => {
      const response = await fetch(`/api/validation-tokens/${cleanToken}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Token inválido o expirado");
      }
      return response.json();
    },
    enabled: !!cleanToken,
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: async ({ result, comments }: { result: string; comments: string }) => {
      const response = await fetch(`/api/validation-tokens/${cleanToken}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ result, comments }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al procesar la validación");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setSubmissionError("");
      setIsSubmitted(true);
    },
    onError: (error: Error) => {
      setSubmissionError(error.message || "Error al procesar la validación. Por favor intenta nuevamente.");
    },
  });

  const handleSubmit = () => {
    if (!validationResult) return;
    
    // Clear any previous errors
    setSubmissionError("");
    
    submitMutation.mutate({
      result: validationResult,
      comments: comments.trim(),
    });
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType.toLowerCase()) {
      case 'risk':
        return <AlertTriangle className="w-6 h-6 text-orange-500" />;
      case 'control':
        return <Shield className="w-6 h-6 text-blue-500" />;
      default:
        return <FileText className="w-6 h-6 text-gray-500" />;
    }
  };

  const getEntityTypeLabel = (entityType: string) => {
    switch (entityType.toLowerCase()) {
      case 'risk':
        return 'Riesgo';
      case 'control':
        return 'Control';
      default:
        return entityType;
    }
  };

  const getRiskLevelBadge = (risk: number) => {
    if (risk <= 5) return <Badge className="bg-green-100 text-green-800">Bajo</Badge>;
    if (risk <= 10) return <Badge className="bg-yellow-100 text-yellow-800">Medio</Badge>;
    if (risk <= 15) return <Badge className="bg-orange-100 text-orange-800">Alto</Badge>;
    return <Badge className="bg-red-100 text-red-800">Crítico</Badge>;
  };

  if (!cleanToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Token no válido</CardTitle>
            <CardDescription>
              No se proporcionó un token de validación válido
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <Clock className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <CardTitle>Verificando token...</CardTitle>
            <CardDescription>
              Por favor espera mientras verificamos tu token de validación
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error || !tokenData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Token inválido</CardTitle>
            <CardDescription>
              {error?.message || "El token de validación no es válido o ha expirado"}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <CardTitle>Validación completada</CardTitle>
            <CardDescription>
              Tu respuesta ha sido registrada exitosamente. Gracias por tu colaboración.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isExpired = new Date() > new Date(tokenData.expiresAt);

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Clock className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <CardTitle>Token expirado</CardTitle>
            <CardDescription>
              Este token de validación ha expirado. Por favor contacta al administrador del sistema para obtener uno nuevo.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              {getEntityIcon(tokenData.entityType)}
              <h1 className="text-2xl font-bold ml-3">
                Validación de {getEntityTypeLabel(tokenData.entityType)}
              </h1>
            </div>
            <CardDescription className="text-lg">
              Hola <strong>{tokenData.processOwnerName}</strong>, se requiere tu validación como dueño de proceso
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Entity Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {getEntityIcon(tokenData.entityType)}
              <span className="ml-2">
                Detalles del {getEntityTypeLabel(tokenData.entityType)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tokenData.entityData && (
              <>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Nombre/Título</Label>
                  <p className="text-base font-medium">
                    {tokenData.entityData.name || tokenData.entityData.title || "N/A"}
                  </p>
                </div>
                
                {tokenData.entityData.description && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Descripción</Label>
                    <p className="text-base">{tokenData.entityData.description}</p>
                  </div>
                )}

                {tokenData.entityType.toLowerCase() === 'risk' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {tokenData.entityData.probability !== undefined && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Probabilidad</Label>
                          <p className="text-base font-medium">{tokenData.entityData.probability}</p>
                        </div>
                      )}
                      
                      {tokenData.entityData.impact !== undefined && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Impacto</Label>
                          <p className="text-base font-medium">{tokenData.entityData.impact}</p>
                        </div>
                      )}
                      
                      {tokenData.entityData.inherentRisk !== undefined && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Riesgo Inherente</Label>
                          <div className="flex items-center space-x-2">
                            <span className="text-base font-medium">{tokenData.entityData.inherentRisk}</span>
                            {getRiskLevelBadge(tokenData.entityData.inherentRisk)}
                          </div>
                        </div>
                      )}
                    </div>

                    {tokenData.entityData.riskCategory && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Categoría de Riesgo</Label>
                        <p className="text-base">{tokenData.entityData.riskCategory}</p>
                      </div>
                    )}
                  </>
                )}

                {tokenData.entityType.toLowerCase() === 'control' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {tokenData.entityData.type && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Tipo de Control</Label>
                          <p className="text-base">{translateControlType(tokenData.entityData.type)}</p>
                        </div>
                      )}
                      
                      {tokenData.entityData.automationLevel && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Nivel de Automatización</Label>
                          <p className="text-base">{translateAutomationLevel(tokenData.entityData.automationLevel)}</p>
                        </div>
                      )}
                      
                      {tokenData.entityData.effectTarget && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Objetivo del Efecto</Label>
                          <p className="text-base">
                            {tokenData.entityData.effectTarget === 'both' ? 'Probabilidad e Impacto' : 
                             tokenData.entityData.effectTarget === 'probability' ? 'Probabilidad' : 'Impacto'}
                          </p>
                        </div>
                      )}
                    </div>

                    {tokenData.entityData.effectiveness !== undefined && tokenData.entityData.effectiveness !== null && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Efectividad del Control</Label>
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-2xl font-bold text-blue-600">{tokenData.entityData.effectiveness}%</span>
                            <Badge variant={tokenData.entityData.effectiveness >= 80 ? "default" : tokenData.entityData.effectiveness >= 60 ? "secondary" : "destructive"}>
                              {tokenData.entityData.effectiveness >= 80 ? 'Alta' : tokenData.entityData.effectiveness >= 60 ? 'Media' : 'Baja'}
                            </Badge>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className={`h-3 rounded-full transition-all ${
                                tokenData.entityData.effectiveness >= 80 ? 'bg-green-500' : 
                                tokenData.entityData.effectiveness >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${tokenData.entityData.effectiveness}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {tokenData.entityData.selfAssessment && (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <Label className="text-sm font-medium text-blue-900">Autoevaluación</Label>
                        <p className="text-base font-medium mt-1">
                          {translateSelfAssessment(tokenData.entityData.selfAssessment)}
                        </p>
                        {tokenData.entityData.selfAssessmentComments && (
                          <p className="text-sm text-blue-700 mt-2">
                            {tokenData.entityData.selfAssessmentComments}
                          </p>
                        )}
                        {tokenData.entityData.selfAssessmentDate && (
                          <p className="text-xs text-blue-600 mt-1">
                            Evaluado el: {new Date(tokenData.entityData.selfAssessmentDate).toLocaleDateString('es-ES')}
                          </p>
                        )}
                      </div>
                    )}

                    {tokenData.entityData.evidence && (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <Label className="text-sm font-medium text-gray-900">Evidencia Requerida</Label>
                        <p className="text-base mt-1">{tokenData.entityData.evidence}</p>
                      </div>
                    )}
                  </>
                )}

                <div className="border-t pt-4">
                  <Label className="text-sm font-medium text-muted-foreground">Ubicación en el Proceso</Label>
                  <div className="text-base space-y-1">
                    {tokenData.entityData.macroproceso && (
                      <p><strong>Macroproceso:</strong> {tokenData.entityData.macroproceso}</p>
                    )}
                    {tokenData.entityData.process && (
                      <p><strong>Proceso:</strong> {tokenData.entityData.process}</p>
                    )}
                    {tokenData.entityData.subproceso && (
                      <p><strong>Subproceso:</strong> {tokenData.entityData.subproceso}</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Validation Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckSquare className="w-5 h-5 mr-2" />
              Tu Validación
            </CardTitle>
            <CardDescription>
              Por favor revisa la información y proporciona tu validación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-base font-medium mb-3 block">
                ¿La información del {getEntityTypeLabel(tokenData.entityType).toLowerCase()} es correcta y está actualizada?
              </Label>
              <RadioGroup value={validationResult} onValueChange={(value) => setValidationResult(value as "validated" | "rejected")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="validated" id="validated" />
                  <Label htmlFor="validated" className="flex items-center cursor-pointer">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                    Sí, la información es correcta
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="rejected" id="rejected" />
                  <Label htmlFor="rejected" className="flex items-center cursor-pointer">
                    <XCircle className="w-4 h-4 text-red-500 mr-2" />
                    No, la información necesita correcciones
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="comments" className="text-base font-medium">
                Comentarios {validationResult === "rejected" && <span className="text-red-500">*</span>}
              </Label>
              <p className="text-sm text-muted-foreground mb-2">
                {validationResult === "rejected" 
                  ? "Por favor describe qué información necesita ser corregida"
                  : "Proporciona cualquier comentario adicional (opcional)"
                }
              </p>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder={validationResult === "rejected" 
                  ? "Describe los cambios necesarios..."
                  : "Comentarios adicionales..."
                }
                rows={4}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {comments.length}/1000 caracteres
              </p>
            </div>

            {validationResult === "rejected" && !comments.trim() && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Comentarios requeridos</AlertTitle>
                <AlertDescription>
                  Por favor proporciona detalles sobre las correcciones necesarias.
                </AlertDescription>
              </Alert>
            )}

            {submissionError && (
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800">Error de envío</AlertTitle>
                <AlertDescription className="text-red-700">
                  {submissionError}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                onClick={handleSubmit}
                disabled={
                  !validationResult || 
                  (validationResult === "rejected" && !comments.trim()) ||
                  submitMutation.isPending
                }
                className={`${
                  validationResult === "validated" 
                    ? "bg-green-600 hover:bg-green-700" 
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {submitMutation.isPending ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    {validationResult === "validated" ? (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    ) : (
                      <XCircle className="w-4 h-4 mr-2" />
                    )}
                    Enviar Validación
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Token Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                Token enviado a: {tokenData.processOwnerEmail}
              </div>
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Expira: {new Date(tokenData.expiresAt).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}