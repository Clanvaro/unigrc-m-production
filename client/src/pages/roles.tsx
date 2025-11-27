import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Users, Shield, Eye, Trash2, Edit } from "lucide-react";
import { RoleForm } from "../components/forms/role-form";
import { PlatformAdminGuard, CreateGuard, EditGuard, DeleteGuard } from "@/components/auth/permission-guard";
import type { Role } from "@shared/schema";

export default function RolesPage() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (roleId: string) => {
      await apiRequest(`/api/roles/${roleId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({
        title: "Rol eliminado",
        description: "El rol ha sido eliminado exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el rol.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (role: Role) => {
    setSelectedRole(role);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedRole(null);
    setDialogOpen(true);
  };

  const handleDelete = (roleId: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este rol?")) {
      deleteMutation.mutate(roleId);
    }
  };

  const getRoleIcon = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case "administrador":
        return <Shield className="h-5 w-5 text-red-500" />;
      case "analista de riesgo":
        return <Users className="h-5 w-5 text-blue-500" />;
      case "auditor":
        return <Eye className="h-5 w-5 text-green-500" />;
      case "consulta":
        return <Eye className="h-5 w-5 text-gray-500" />;
      default:
        return <Users className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPermissionBadgeColor = (permission: string) => {
    if (permission.includes("delete") || permission.includes("manage")) {
      return "destructive";
    }
    if (permission.includes("edit") || permission.includes("create")) {
      return "default";
    }
    return "secondary";
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <PlatformAdminGuard>
      <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Roles</h1>
          <p className="text-muted-foreground">
            Administra los roles y permisos del sistema
          </p>
        </div>
        <CreateGuard itemType="role">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreate} data-testid="button-create-role">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Rol
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md mx-4 sm:max-w-2xl max-h-[90vh] flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>
                  {selectedRole ? "Editar Rol" : "Crear Nuevo Rol"}
                </DialogTitle>
                <DialogDescription>
                  {selectedRole 
                    ? "Modifica la información del rol existente."
                    : "Completa la información para crear un nuevo rol."
                  }
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto pr-2">
                <RoleForm
                  role={selectedRole}
                  onSuccess={() => {
                    setDialogOpen(false);
                    queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        </CreateGuard>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {roles.map((role) => (
          <Card key={role.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-2">
              <div className="flex items-center space-x-2">
                {getRoleIcon(role.name)}
                <CardTitle className="text-base sm:text-lg" data-testid={`text-role-name-${role.id}`}>
                  {role.name}
                </CardTitle>
              </div>
              <div className="flex space-x-2 self-end sm:self-auto">
                <EditGuard itemType="role">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(role)}
                    data-testid={`button-edit-role-${role.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </EditGuard>
                <DeleteGuard itemType="role">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(role.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-role-${role.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </DeleteGuard>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4" data-testid={`text-role-description-${role.id}`}>
                {role.description}
              </CardDescription>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Permisos ({(role.permissions || []).length})
                </h4>
                <div className="flex flex-wrap gap-1">
                  {(role.permissions || []).slice(0, 4).map((permission) => (
                    <Badge
                      key={permission}
                      variant={getPermissionBadgeColor(permission)}
                      className="text-xs"
                      data-testid={`badge-permission-${permission}-${role.id}`}
                    >
                      {permission.replace(/_/g, " ")}
                    </Badge>
                  ))}
                  {(role.permissions || []).length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{(role.permissions || []).length - 4} más
                    </Badge>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Creado:</span>
                  <span data-testid={`text-role-created-${role.id}`}>
                    {role.createdAt ? new Date(role.createdAt).toLocaleDateString() : "N/A"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {roles.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold text-muted-foreground">
            No hay roles configurados
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Comienza creando el primer rol del sistema.
          </p>
        </div>
      )}
      </div>
    </PlatformAdminGuard>
  );
}