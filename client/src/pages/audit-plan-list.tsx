import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Search, Calendar, Eye, Trash2, FileText, CheckCircle2, Clock, XCircle, Edit, MoreVertical, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSearch } from "@/contexts/SearchContext";
import type { AuditPlan } from "@shared/schema";

export default function AuditPlanList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { setSearchHandler } = useSearch();
  const { userRoles } = usePermissions();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);
  const [deletionReason, setDeletionReason] = useState("");
  
  // Check if user can approve audit plans
  const canApprove = userRoles.some((r: any) => 
    r.role?.name === 'Administrador del Sistema' || 
    r.role?.name === 'Supervisor de Auditoría'
  );

  // Register search handler
  useEffect(() => {
    setSearchHandler((term: string) => {
      setSearchTerm(term);
    });
  }, [setSearchHandler]);

  // Listen to filter changes from header
  useEffect(() => {
    const handleFiltersChanged = (event: any) => {
      const { statusFilter: newStatusFilter, yearFilter: newYearFilter } = event.detail;
      setStatusFilter(newStatusFilter);
      setYearFilter(newYearFilter);
    };

    window.addEventListener('auditPlanFiltersChanged', handleFiltersChanged);
    return () => window.removeEventListener('auditPlanFiltersChanged', handleFiltersChanged);
  }, []);

  const { data: plans = [], isLoading, refetch } = useQuery<AuditPlan[]>({
    queryKey: ["/api/audit-plans"],
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await fetch(`/api/audit-plans/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deletionReason: reason }),
      });
      if (!response.ok) throw new Error("Failed to delete audit plan");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/audit-plans"] });
      toast({ title: "Plan eliminado exitosamente" });
      setPlanToDelete(null);
      setDeletionReason("");
    },
    onError: () => {
      toast({ 
        title: "Error al eliminar el plan", 
        variant: "destructive" 
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/audit-plans/${id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to approve audit plan");
      }
      return response.json();
    },
    onSuccess: async () => {
      // Invalidar y refetch inmediatamente
      await queryClient.invalidateQueries({ queryKey: ["/api/audit-plans"] });
      await queryClient.refetchQueries({ queryKey: ["/api/audit-plans"] });
      toast({ title: "Plan aprobado exitosamente" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error al aprobar el plan", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Filtrar planes
  const filteredPlans = plans.filter((plan) => {
    const matchesSearch = !searchTerm || 
      plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || plan.status === statusFilter;
    const matchesYear = yearFilter === "all" || plan.year.toString() === yearFilter;
    return matchesSearch && matchesStatus && matchesYear;
  });

  // Debug: Log filtered plans when filters change
  useEffect(() => {
    if (plans.length > 0) {
      console.log("Audit plans loaded:", plans.length, "Filtered:", filteredPlans.length, "Status filter:", statusFilter);
    }
  }, [plans.length, filteredPlans.length, statusFilter]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      draft: {
        label: "Borrador",
        className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
        icon: <FileText className="h-3 w-3" />
      },
      in_review: {
        label: "En Revisión",
        className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        icon: <Clock className="h-3 w-3" />
      },
      approved: {
        label: "Aprobado",
        className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        icon: <CheckCircle2 className="h-3 w-3" />
      },
      active: {
        label: "Activo",
        className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        icon: <CheckCircle2 className="h-3 w-3" />
      },
      completed: {
        label: "Completado",
        className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
        icon: <CheckCircle2 className="h-3 w-3" />
      },
      cancelled: {
        label: "Cancelado",
        className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        icon: <XCircle className="h-3 w-3" />
      },
    };

    const config = statusConfig[status] || statusConfig.draft;

    return (
      <Badge className={config.className}>
        <span className="flex items-center gap-1">
          {config.icon}
          {config.label}
        </span>
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Cargando planes...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-3">
      {/* Search term badge */}
      {searchTerm && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary" className="gap-1">
            Búsqueda: "{searchTerm}"
            <button
              onClick={() => setSearchTerm("")}
              className="ml-1 hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
          <span>({filteredPlans.length} resultados)</span>
        </div>
      )}

      {/* Tabla de planes */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre del Plan</TableHead>
                <TableHead className="text-center">Año</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha de Creación</TableHead>
                <TableHead>Aprobado Por</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Calendar className="h-12 w-12 text-muted-foreground/50" />
                      <p className="text-muted-foreground">
                        {searchTerm || statusFilter !== "all" || yearFilter !== "all"
                          ? "No se encontraron planes con los filtros aplicados"
                          : "No hay planes de auditoría creados"}
                      </p>
                      {!searchTerm && statusFilter === "all" && yearFilter === "all" && (
                        <Button
                          variant="outline"
                          onClick={() => setLocation("/audit-plan-wizard")}
                          className="mt-2"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Crear primer plan
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlans.map((plan) => (
                  <TableRow key={plan.id} data-testid={`row-plan-${plan.id}`}>
                    <TableCell className="font-medium">{plan.code}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{plan.name}</div>
                        {plan.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {plan.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono">
                        {plan.year}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(plan.status)}</TableCell>
                    <TableCell>
                      {plan.createdAt && !isNaN(new Date(plan.createdAt).getTime())
                        ? new Date(plan.createdAt).toLocaleDateString("es-ES", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {plan.approvedBy ? (
                        <span className="text-sm">
                          {(plan as any).approverName || 'Usuario desconocido'}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Pendiente</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-actions-${plan.id}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setLocation(`/audit-plan-wizard?planId=${plan.id}&mode=view`)}
                            data-testid={`menu-view-${plan.id}`}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                          </DropdownMenuItem>
                          {canApprove && plan.status !== 'approved' && (
                            <DropdownMenuItem
                              onClick={() => approveMutation.mutate(plan.id)}
                              disabled={approveMutation.isPending}
                              data-testid={`menu-approve-${plan.id}`}
                              className="text-green-600 focus:text-green-600 dark:text-green-400"
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Aprobar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => setLocation(`/audit-plan-wizard?planId=${plan.id}&mode=edit`)}
                            data-testid={`menu-edit-${plan.id}`}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setPlanToDelete(plan.id)}
                            className="text-destructive focus:text-destructive"
                            data-testid={`menu-delete-${plan.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog 
        open={!!planToDelete} 
        onOpenChange={(open) => {
          if (!open) {
            setPlanToDelete(null);
            setDeletionReason("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plan de auditoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Por favor, ingresa la razón de eliminación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Ingresa la razón de eliminación..."
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              className="min-h-[80px]"
              data-testid="input-deletion-reason"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletionReason("")}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (planToDelete && deletionReason.trim()) {
                  deleteMutation.mutate({ id: planToDelete, reason: deletionReason });
                }
              }}
              disabled={!deletionReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              data-testid="button-confirm-delete"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
