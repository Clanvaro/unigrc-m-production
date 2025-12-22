import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertRoleSchema, type Role } from "@shared/schema";
import { Loader2 } from "lucide-react";

const roleFormSchema = insertRoleSchema.extend({
  permissions: z.array(z.string()).default([]),
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

interface RoleFormProps {
  role?: Role | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Definición de permisos disponibles en el sistema
const AVAILABLE_PERMISSIONS = [
  // Permisos generales
  { id: "view_all", label: "Ver Todo", description: "Acceso de visualización completo" },
  { id: "create_all", label: "Crear Todo", description: "Crear cualquier elemento" },
  { id: "edit_all", label: "Editar Todo", description: "Modificar cualquier elemento" },
  { id: "delete_all", label: "Eliminar Todo", description: "Eliminar cualquier elemento" },
  
  // Permisos de gestión de usuarios
  { id: "manage_users", label: "Gestionar Usuarios", description: "Administrar cuentas de usuario" },
  { id: "manage_roles", label: "Gestionar Roles", description: "Administrar roles y permisos" },
  { id: "team:manage", label: "Gestionar Equipo", description: "Gestionar miembros del equipo y asignaciones" },
  
  // Permisos específicos de riesgos
  { id: "view_risks", label: "Ver Riesgos", description: "Visualizar riesgos del sistema" },
  { id: "create_risks", label: "Crear Riesgos", description: "Crear nuevos riesgos" },
  { id: "edit_risks", label: "Editar Riesgos", description: "Modificar riesgos existentes" },
  { id: "delete_risks", label: "Eliminar Riesgos", description: "Eliminar riesgos" },
  
  // Permisos específicos de controles
  { id: "view_controls", label: "Ver Controles", description: "Visualizar controles del sistema" },
  { id: "create_controls", label: "Crear Controles", description: "Crear nuevos controles" },
  { id: "edit_controls", label: "Editar Controles", description: "Modificar controles existentes" },
  { id: "delete_controls", label: "Eliminar Controles", description: "Eliminar controles" },
  
  // Permisos específicos de procesos
  { id: "view_processes", label: "Ver Procesos", description: "Visualizar procesos del sistema" },
  { id: "create_processes", label: "Crear Procesos", description: "Crear nuevos procesos" },
  { id: "edit_processes", label: "Editar Procesos", description: "Modificar procesos existentes" },
  { id: "delete_processes", label: "Eliminar Procesos", description: "Eliminar procesos" },
  
  // Permisos específicos de planes de acción
  { id: "view_action_plans", label: "Ver Planes de Acción", description: "Visualizar planes de acción" },
  { id: "create_action_plans", label: "Crear Planes de Acción", description: "Crear nuevos planes" },
  { id: "edit_action_plans", label: "Editar Planes de Acción", description: "Modificar planes existentes" },
  { id: "delete_action_plans", label: "Eliminar Planes de Acción", description: "Eliminar planes" },
  
  // Permisos de reportes
  { id: "view_reports", label: "Ver Reportes", description: "Acceso a reportes y estadísticas" },
  { id: "export_data", label: "Exportar Datos", description: "Exportar información del sistema" },
  
  // Permisos específicos de auditorías
  { id: "view_audits", label: "Ver Auditorías", description: "Visualizar auditorías del sistema" },
  { id: "create_audits", label: "Crear Auditorías", description: "Crear nuevas auditorías" },
  { id: "edit_audits", label: "Editar Auditorías", description: "Modificar auditorías existentes" },
  { id: "delete_audits", label: "Eliminar Auditorías", description: "Eliminar auditorías" },
  { id: "conduct_audits", label: "Ejecutar Auditorías", description: "Realizar trabajo de campo de auditorías" },
  { id: "supervise_audits", label: "Supervisar Auditorías", description: "Supervisar y aprobar auditorías" },
  { id: "manage_audit_planning", label: "Planificación de Auditoría", description: "Gestionar planes anuales y planificación de auditorías" },
  
  // Permisos específicos de cumplimiento
  { id: "view_compliance", label: "Ver Cumplimiento", description: "Visualizar módulo de cumplimiento" },
  { id: "create_compliance", label: "Crear Cumplimiento", description: "Crear registros de cumplimiento" },
  { id: "edit_compliance", label: "Editar Cumplimiento", description: "Modificar registros de cumplimiento" },
  { id: "delete_compliance", label: "Eliminar Cumplimiento", description: "Eliminar registros de cumplimiento" },
  { id: "manage_compliance", label: "Gestionar Cumplimiento", description: "Administración completa de cumplimiento" },
];

export function RoleForm({ role, onSuccess }: RoleFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: role?.name || "",
      description: role?.description || "",
      permissions: role?.permissions || [],
      isActive: role?.isActive ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: RoleFormValues) => {
      if (role) {
        return await apiRequest(`/api/roles/${role.id}`, "PUT", data);
      } else {
        return await apiRequest("/api/roles", "POST", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({
        title: "Éxito",
        description: `Rol ${role ? "actualizado" : "creado"} exitosamente.`,
      });
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: `No se pudo ${role ? "actualizar" : "crear"} el rol.`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RoleFormValues) => {
    mutation.mutate(data);
  };

  const groupedPermissions = {
    general: AVAILABLE_PERMISSIONS.filter(p => ["view_all", "create_all", "edit_all", "delete_all", "manage_users", "manage_roles", "team:manage"].includes(p.id)),
    risks: AVAILABLE_PERMISSIONS.filter(p => p.id.includes("risk")),
    controls: AVAILABLE_PERMISSIONS.filter(p => p.id.includes("control")),
    processes: AVAILABLE_PERMISSIONS.filter(p => p.id.includes("process")),
    actionPlans: AVAILABLE_PERMISSIONS.filter(p => p.id.includes("action_plan")),
    audits: AVAILABLE_PERMISSIONS.filter(p => p.id.includes("audit")),
    compliance: AVAILABLE_PERMISSIONS.filter(p => p.id.includes("compliance")),
    reports: AVAILABLE_PERMISSIONS.filter(p => ["view_reports", "export_data"].includes(p.id)),
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Rol *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ej: Analista Senior" 
                    {...field} 
                    data-testid="input-role-name"
                    onKeyDown={(e) => { if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") { e.stopPropagation(); } }} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Rol Activo</FormLabel>
                  <FormDescription>
                    Los roles inactivos no pueden ser asignados
                  </FormDescription>
                </div>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    data-testid="checkbox-role-active"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Descripción del rol y sus responsabilidades"
                  className="resize-none"
                  {...field} 
                  value={field.value || ""}
                  data-testid="textarea-role-description"
                  onKeyDown={(e) => { if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") { e.stopPropagation(); } }} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="permissions"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base">Permisos del Rol</FormLabel>
                <FormDescription>
                  Selecciona los permisos que tendrá este rol en el sistema
                </FormDescription>
              </div>
              
              <div className="space-y-6">
                {Object.entries(groupedPermissions).map(([group, permissions]) => (
                  <div key={group} className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      {group === "general" && "Permisos Generales"}
                      {group === "risks" && "Gestión de Riesgos"}
                      {group === "controls" && "Gestión de Controles"}
                      {group === "processes" && "Gestión de Procesos"}
                      {group === "actionPlans" && "Planes de Acción"}
                      {group === "audits" && "Gestión de Auditorías"}
                      {group === "compliance" && "Cumplimiento Normativo"}
                      {group === "reports" && "Reportes y Exportación"}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {permissions.map((permission) => (
                        <FormField
                          key={permission.id}
                          control={form.control}
                          name="permissions"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={permission.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(permission.id)}
                                    onCheckedChange={(checked) => {
                                      const newPermissions = checked
                                        ? [...(field.value || []), permission.id]
                                        : (field.value || []).filter((value) => value !== permission.id);
                                      field.onChange(newPermissions);
                                    }}
                                    data-testid={`checkbox-permission-${permission.id}`}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-sm font-normal">
                                    {permission.label}
                                  </FormLabel>
                                  <FormDescription className="text-xs">
                                    {permission.description}
                                  </FormDescription>
                                </div>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4 border-t bg-white sticky bottom-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (onCancel) {
                onCancel();
              } else {
                // Fallback: intentar cerrar el diálogo disparando evento Escape
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
              }
            }}
            data-testid="button-cancel-role"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={mutation.isPending}
            data-testid="button-submit-role"
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {role ? "Actualizar Rol" : "Crear Rol"}
          </Button>
        </div>
      </form>
    </Form>
  );
}