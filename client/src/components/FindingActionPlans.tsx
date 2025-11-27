import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Calendar, Users, AlertTriangle, CheckCircle, FileText } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Action, User } from "@shared/schema";
import { insertActionSchema } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";

const actionPlanSchema = z.object({
  title: z.string().min(1, "El título es requerido"),
  description: z.string().optional(),
  responsible: z.string().min(1, "El responsable es requerido"),
  dueDate: z.string().min(1, "La fecha límite es requerida"),
  priority: z.enum(["low", "medium", "high", "critical"]),
  managementResponse: z.string().optional(),
  agreedAction: z.string().optional(),
});

type ActionPlanFormData = z.infer<typeof actionPlanSchema>;

interface FindingActionPlansProps {
  findingId: string;
  findingTitle: string;
}

export function FindingActionPlans({ findingId, findingTitle }: FindingActionPlansProps) {
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();

  // Fetch action plans for this finding
  const { data: actionPlans = [], isLoading } = useQuery<Action[]>({
    queryKey: ['/api/audit-findings', findingId, 'actions'],
    queryFn: async () => {
      const response = await fetch(`/api/audit-findings/${findingId}/actions`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch action plans');
      return response.json();
    },
  });

  // Fetch users for assignment
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const form = useForm<ActionPlanFormData>({
    resolver: zodResolver(actionPlanSchema),
    defaultValues: {
      title: "",
      description: "",
      responsible: "",
      dueDate: "",
      priority: "medium",
      managementResponse: "",
      agreedAction: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ActionPlanFormData) => {
      return apiRequest(`/api/audit-findings/${findingId}/actions`, 'POST', {
        ...data,
        dueDate: new Date(data.dueDate).toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/audit-findings', findingId, 'actions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/actions'] });
      toast({ title: "Plan de acción creado exitosamente" });
      setShowDialog(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error al crear el plan de acción",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    },
  });

  const onSubmit = (data: ActionPlanFormData) => {
    createMutation.mutate(data);
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      low: { variant: "secondary", label: "Baja" },
      medium: { variant: "default", label: "Media" },
      high: { variant: "outline", label: "Alta" },
      critical: { variant: "destructive", label: "Crítica" },
    };
    const config = variants[priority] || variants.medium;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      approved: { variant: "default", label: "Aprobado" },
      in_progress: { variant: "outline", label: "En Progreso" },
      completed: { variant: "secondary", label: "Completado" },
      pending: { variant: "secondary", label: "Pendiente" },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Planes de Acción</CardTitle>
            <CardDescription>
              Planes de acción asociados a este hallazgo
            </CardDescription>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-action-plan">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nuevo Plan de Acción</DialogTitle>
                <DialogDescription>
                  Crear un plan de acción para: {findingTitle}
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título del Plan de Acción</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ej: Implementar control de acceso" data-testid="input-action-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} placeholder="Describe las acciones específicas..." data-testid="textarea-action-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="responsible"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Responsable</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-action-responsible">
                                <SelectValue placeholder="Selecciona responsable" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.fullName || user.username}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha Límite</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" data-testid="input-action-due-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioridad</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-action-priority">
                              <SelectValue placeholder="Selecciona prioridad" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Baja</SelectItem>
                            <SelectItem value="medium">Media</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                            <SelectItem value="critical">Crítica</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="agreedAction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Acción Acordada</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} placeholder="Acción específica acordada con la administración..." data-testid="textarea-agreed-action" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="managementResponse"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Respuesta de la Administración</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} placeholder="Respuesta oficial de la administración..." data-testid="textarea-management-response" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowDialog(false)}
                      data-testid="button-cancel-action"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      data-testid="button-submit-action"
                    >
                      {createMutation.isPending ? "Creando..." : "Crear Plan de Acción"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando planes de acción...</p>
        ) : actionPlans.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay planes de acción asociados a este hallazgo.
          </p>
        ) : (
          <div className="space-y-3">
            {actionPlans.map((action) => (
              <div
                key={action.id}
                className="border rounded-lg p-4 space-y-2"
                data-testid={`action-plan-${action.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{action.title}</h4>
                    {action.description && (
                      <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {getPriorityBadge(action.priority)}
                    {getStatusBadge(action.status)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Responsable:</span>
                    <span>{users.find(u => u.id === action.responsible)?.fullName || "Sin asignar"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Fecha límite:</span>
                    <span>{action.dueDate ? format(new Date(action.dueDate), 'dd/MM/yyyy') : "Sin fecha"}</span>
                  </div>
                </div>

                {action.agreedAction && (
                  <div className="text-sm">
                    <span className="font-medium">Acción acordada: </span>
                    <span className="text-muted-foreground">{action.agreedAction}</span>
                  </div>
                )}

                {action.managementResponse && (
                  <div className="text-sm">
                    <span className="font-medium">Respuesta: </span>
                    <span className="text-muted-foreground">{action.managementResponse}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
