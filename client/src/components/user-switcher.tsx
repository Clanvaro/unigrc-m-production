import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Users, Shield } from "lucide-react";
import type { User, Role, UserRole } from "@shared/schema";

interface UserWithRoles extends User {
  roles?: Role[];
}

interface UserRoleWithRole extends UserRole {
  role: Role;
}

export default function UserSwitcher() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: userRoles = [] } = useQuery<UserRoleWithRole[]>({
    queryKey: ["/api/user-roles"],
  });

  // Usando endpoint básico accesible a todos los usuarios
  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/roles/basic"],
  });

  const switchUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const result = await apiRequest("/api/auth/switch-user", "POST", { userId });
      return result;
    },
    onSuccess: async (data) => {
      // CRITICAL FIX: Invalidate auth queries to force refetch from server
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      
      toast({
        title: "Usuario cambiado",
        description: `Ahora eres: ${data?.user?.fullName || 'Usuario'}`,
      });
      setDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo cambiar de usuario.",
        variant: "destructive",
      });
    },
  });

  const handleSwitchUser = (userId: string) => {
    switchUserMutation.mutate(userId);
  };

  const getRoleNames = (userId: string): string[] => {
    const userRoleAssignments = userRoles.filter(ur => ur.userId === userId);
    return userRoleAssignments
      .filter(ur => ur.role && ur.role.name)
      .map(ur => ur.role.name);
  };

  const getUserPermissions = (userId: string): string[] => {
    const userRoleAssignments = userRoles.filter(ur => ur.userId === userId);
    const allPermissions = userRoleAssignments.reduce((acc: string[], ur) => {
      if (ur.role && ur.role.permissions) {
        return [...acc, ...ur.role.permissions];
      }
      return acc;
    }, []);
    return Array.from(new Set(allPermissions)); // Remove duplicates
  };

  const getPermissionDisplayName = (permission: string): string => {
    const permissionNames: Record<string, string> = {
      'view_all': 'Acceso completo de visualización',
      'edit_all': 'Acceso completo de edición',
      'create_all': 'Crear cualquier elemento',
      'delete_all': 'Eliminar cualquier elemento',
      'manage_users': 'Gestionar usuarios',
      'manage_roles': 'Gestionar roles',
      'view_risks': 'Ver riesgos',
      'edit_risks': 'Editar riesgos',
      'validate_risks': 'Validar riesgos',
      'view_controls': 'Ver controles',
      'edit_controls': 'Editar controles',
      'view_audits': 'Ver auditorías',
      'edit_audits': 'Editar auditorías',
      'view_audit_assignments': 'Ver asignaciones de auditoría',
      'view_audit_reviews': 'Ver revisiones de auditoría',
      'view_audit_teams': 'Ver equipos de auditoría',
      'create_work_logs': 'Crear registros de trabajo',
      'review_work_logs': 'Revisar registros de trabajo',
      'update_audit_progress': 'Actualizar progreso de auditoría',
      'review_audit_tests': 'Revisar pruebas de auditoría'
    };
    return permissionNames[permission] || permission;
  };

  const getRoleBadgeColor = (roleName: string) => {
    switch (roleName) {
      case "Administrador":
        return "bg-red-100 text-red-800";
      case "Analista de Riesgo":
        return "bg-blue-100 text-blue-800";
      case "Dueños de Proceso":
        return "bg-green-100 text-green-800";
      case "Auditor":
        return "bg-purple-100 text-purple-800";
      case "Consulta":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-user-switcher">
          <Users className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Cambiar Usuario</span>
          </DialogTitle>
          <DialogDescription>
            Selecciona un usuario para probar los diferentes roles y permisos del sistema.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {users.map((user) => (
            <Card key={user.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{user.fullName}</CardTitle>
                    <CardDescription>@{user.username} • {user.email}</CardDescription>
                  </div>
                  <Button
                    onClick={() => handleSwitchUser(user.id)}
                    disabled={switchUserMutation.isPending}
                    data-testid={`button-switch-${user.username}`}
                  >
                    {switchUserMutation.isPending ? "Cambiando..." : "Usar este usuario"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {getRoleNames(user.id).map((roleName) => (
                    <Badge 
                      key={roleName} 
                      className={getRoleBadgeColor(roleName)}
                      data-testid={`badge-role-${roleName.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {roleName}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}