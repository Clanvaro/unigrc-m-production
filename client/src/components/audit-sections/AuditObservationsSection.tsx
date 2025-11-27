import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { AuditSectionProps } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  MessageSquare,
  AlertCircle,
  Info,
  CheckCircle,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  User,
  Calendar,
  MessageCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AuditReviewComment } from "@shared/schema";

type CommentWithUser = AuditReviewComment & {
  commentedByName?: string;
  resolvedByName?: string;
};

export function AuditObservationsSection({ audit }: AuditSectionProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [showResolved, setShowResolved] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newComment, setNewComment] = useState({
    commentType: "review",
    comment: "",
    severity: "info",
    section: "",
  });

  const { data: comments = [], isLoading } = useQuery<CommentWithUser[]>({
    queryKey: ["/api/audit-review-comments/audit", audit.id],
    queryFn: async () => {
      const response = await fetch(`/api/audit-review-comments/audit/${audit.id}`);
      if (!response.ok) throw new Error("Failed to fetch comments");
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newComment) => {
      const response = await apiRequest(`/api/audit-review-comments`, "POST", {
        auditId: audit.id,
        commentType: data.commentType,
        comment: data.comment,
        severity: data.severity,
        section: data.section || null,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audit-review-comments/audit", audit.id] });
      toast({
        title: "Observación agregada",
        description: "La observación ha sido registrada correctamente.",
      });
      setIsDialogOpen(false);
      setNewComment({
        commentType: "review",
        comment: "",
        severity: "info",
        section: "",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo agregar la observación.",
        variant: "destructive",
      });
    },
  });

  const resolveCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const response = await apiRequest(`/api/audit-review-comments/${commentId}`, "PUT", {
        isResolved: true,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audit-review-comments/audit", audit.id] });
      toast({
        title: "Observación resuelta",
        description: "La observación ha sido marcada como resuelta.",
      });
    },
  });

  const handleCreateComment = () => {
    if (!newComment.comment.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingrese un comentario.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(newComment);
  };

  const getSeverityIcon = (severity: string) => {
    const icons: Record<string, React.ReactNode> = {
      critical: <AlertTriangle className="h-4 w-4 text-red-600" />,
      error: <AlertCircle className="h-4 w-4 text-orange-600" />,
      warning: <AlertCircle className="h-4 w-4 text-yellow-600" />,
      info: <Info className="h-4 w-4 text-blue-600" />,
    };
    return icons[severity] || icons.info;
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: "bg-red-600 text-white",
      error: "bg-orange-600 text-white",
      warning: "bg-yellow-600 text-white",
      info: "bg-blue-600 text-white",
    };
    return colors[severity] || colors.info;
  };

  const getSeverityText = (severity: string) => {
    const texts: Record<string, string> = {
      critical: "Crítico",
      error: "Error",
      warning: "Advertencia",
      info: "Información",
    };
    return texts[severity] || severity;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      review: "bg-blue-100 text-blue-800",
      clarification: "bg-purple-100 text-purple-800",
      correction: "bg-orange-100 text-orange-800",
      approval: "bg-green-100 text-green-800",
      rejection: "bg-red-100 text-red-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const getTypeText = (type: string) => {
    const texts: Record<string, string> = {
      review: "Revisión",
      clarification: "Aclaración",
      correction: "Corrección",
      approval: "Aprobación",
      rejection: "Rechazo",
    };
    return texts[type] || type;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "Sin fecha";
    return new Date(date).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredComments = comments.filter(comment => {
    const matchesSearch = comment.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (comment.section?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesType = typeFilter === "all" || comment.commentType === typeFilter;
    const matchesSeverity = severityFilter === "all" || comment.severity === severityFilter;
    const matchesResolved = showResolved || !comment.isResolved;
    return matchesSearch && matchesType && matchesSeverity && matchesResolved;
  });

  const typeCounts = {
    all: comments.length,
    review: comments.filter(c => c.commentType === "review").length,
    clarification: comments.filter(c => c.commentType === "clarification").length,
    correction: comments.filter(c => c.commentType === "correction").length,
    approval: comments.filter(c => c.commentType === "approval").length,
    rejection: comments.filter(c => c.commentType === "rejection").length,
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="audit-observations">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Observaciones y Comentarios
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-observation">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Observación
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Agregar Observación</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Tipo de Comentario</Label>
                    <Select
                      value={newComment.commentType}
                      onValueChange={(value) =>
                        setNewComment({ ...newComment, commentType: value })
                      }
                    >
                      <SelectTrigger data-testid="select-comment-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="review">Revisión</SelectItem>
                        <SelectItem value="clarification">Aclaración</SelectItem>
                        <SelectItem value="correction">Corrección</SelectItem>
                        <SelectItem value="approval">Aprobación</SelectItem>
                        <SelectItem value="rejection">Rechazo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Severidad</Label>
                    <Select
                      value={newComment.severity}
                      onValueChange={(value) =>
                        setNewComment({ ...newComment, severity: value })
                      }
                    >
                      <SelectTrigger data-testid="select-severity">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Información</SelectItem>
                        <SelectItem value="warning">Advertencia</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                        <SelectItem value="critical">Crítico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Sección (Opcional)</Label>
                    <Input
                      placeholder="ej: Conclusiones, Procedimientos, etc."
                      value={newComment.section}
                      onChange={(e) =>
                        setNewComment({ ...newComment, section: e.target.value })
                      }
                      data-testid="input-section"
                    />
                  </div>

                  <div>
                    <Label>Comentario</Label>
                    <Textarea
                      placeholder="Escriba su observación aquí..."
                      value={newComment.comment}
                      onChange={(e) =>
                        setNewComment({ ...newComment, comment: e.target.value })
                      }
                      rows={6}
                      data-testid="textarea-comment"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      data-testid="button-cancel"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleCreateComment}
                      disabled={createMutation.isPending}
                      data-testid="button-submit-comment"
                    >
                      {createMutation.isPending ? "Guardando..." : "Agregar Observación"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <button
                onClick={() => setTypeFilter("all")}
                className={`p-2 rounded-lg border-2 transition-colors ${
                  typeFilter === "all"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                data-testid="filter-type-all"
              >
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{typeCounts.all}</p>
              </button>
              <button
                onClick={() => setTypeFilter("review")}
                className={`p-2 rounded-lg border-2 transition-colors ${
                  typeFilter === "review"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                data-testid="filter-type-review"
              >
                <p className="text-xs text-muted-foreground">Revisión</p>
                <p className="text-xl font-bold">{typeCounts.review}</p>
              </button>
              <button
                onClick={() => setTypeFilter("clarification")}
                className={`p-2 rounded-lg border-2 transition-colors ${
                  typeFilter === "clarification"
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                data-testid="filter-type-clarification"
              >
                <p className="text-xs text-muted-foreground">Aclaración</p>
                <p className="text-xl font-bold">{typeCounts.clarification}</p>
              </button>
              <button
                onClick={() => setTypeFilter("correction")}
                className={`p-2 rounded-lg border-2 transition-colors ${
                  typeFilter === "correction"
                    ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                data-testid="filter-type-correction"
              >
                <p className="text-xs text-muted-foreground">Corrección</p>
                <p className="text-xl font-bold">{typeCounts.correction}</p>
              </button>
              <button
                onClick={() => setTypeFilter("approval")}
                className={`p-2 rounded-lg border-2 transition-colors ${
                  typeFilter === "approval"
                    ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                data-testid="filter-type-approval"
              >
                <p className="text-xs text-muted-foreground">Aprobación</p>
                <p className="text-xl font-bold">{typeCounts.approval}</p>
              </button>
              <button
                onClick={() => setTypeFilter("rejection")}
                className={`p-2 rounded-lg border-2 transition-colors ${
                  typeFilter === "rejection"
                    ? "border-red-500 bg-red-50 dark:bg-red-950/20"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                data-testid="filter-type-rejection"
              >
                <p className="text-xs text-muted-foreground">Rechazo</p>
                <p className="text-xl font-bold">{typeCounts.rejection}</p>
              </button>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar en observaciones..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-severity-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Severidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="critical">Crítico</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warning">Advertencia</SelectItem>
                  <SelectItem value="info">Información</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={showResolved ? "default" : "outline"}
                onClick={() => setShowResolved(!showResolved)}
                data-testid="button-toggle-resolved"
              >
                {showResolved ? "Ocultar" : "Mostrar"} Resueltas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {filteredComments.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              {comments.length === 0 ? (
                <>
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-medium mb-2">No hay observaciones</h3>
                  <p className="text-sm text-muted-foreground">
                    Agregue observaciones importantes durante el proceso de auditoría
                  </p>
                </>
              ) : (
                <>
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-medium mb-2">No se encontraron observaciones</h3>
                  <p className="text-sm text-muted-foreground">
                    Intenta con otros términos de búsqueda o filtros
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {filteredComments.map((comment) => (
          <Card key={comment.id} data-testid={`card-comment-${comment.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getSeverityIcon(comment.severity)}
                    <Badge className={getSeverityColor(comment.severity)}>
                      {getSeverityText(comment.severity)}
                    </Badge>
                    <Badge className={getTypeColor(comment.commentType)}>
                      {getTypeText(comment.commentType)}
                    </Badge>
                    {comment.section && (
                      <Badge variant="outline">{comment.section}</Badge>
                    )}
                    {comment.isResolved && (
                      <Badge className="bg-green-600 text-white">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Resuelta
                      </Badge>
                    )}
                  </div>
                </div>
                {!comment.isResolved && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resolveCommentMutation.mutate(comment.id)}
                    disabled={resolveCommentMutation.isPending}
                    data-testid={`button-resolve-${comment.id}`}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Marcar como resuelta
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm whitespace-pre-wrap" data-testid={`text-comment-${comment.id}`}>
                {comment.comment}
              </p>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>{comment.commentedByName || "Usuario"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(comment.createdAt)}</span>
                </div>
              </div>

              {comment.isResolved && comment.resolvedBy && (
                <div className="p-2 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800">
                  <p className="text-xs text-muted-foreground">
                    Resuelta por {comment.resolvedByName || "Usuario"} el{" "}
                    {formatDate(comment.resolvedAt)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
