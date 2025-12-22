import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Mail, UserX, Edit, Shield, Calendar } from "lucide-react";
import { UserForm } from "@/components/forms/user-form";
import { PermissionGuard, EditGuard, DeleteGuard } from "@/components/auth/permission-guard";
import type { User, Role } from "@shared/schema";

interface UserWithRoles extends User {
  roles?: (Role & { assignedAt: Date })[];
}

export default function UsersPage() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ["/api/user-roles"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest(`/api/users/${userId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Usuario desactivado",
        description: "El usuario ha sido desactivado exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo desactivar el usuario.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleDeactivate = (userId: string) => {
    setUserToDeactivate(userId);
  };

  const confirmDeactivate = () => {
    if (userToDeactivate) {
      deleteMutation.mutate(userToDeactivate);
      setUserToDeactivate(null);
    }
  };

  const getInitials = (fullName: string) => {
    return fullName
      .split(" ")
      .map(name => name.charAt(0))
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const getUserRoles = (userId: string) => {
    return (userRoles as any[])
      .filter((ur: any) => ur.userId === userId)
      .map((ur: any) => ur.role)
      .filter(Boolean);
  };

  const getRoleBadgeColor = (roleName: string) => {
    switch (roleName) {
      case 'Administrador':
        return 'destructive';
      case 'Supervisor de Auditoría':
        return 'default';
      case 'Auditor':
        return 'secondary';
      case 'Analista de Riesgo':
        return 'outline';
      default:
        return 'secondary';
    }
  };


  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard permissions={["manage_users", "view_users", "view_all"]}>
      <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
        <p className="text-muted-foreground">
          Administra las cuentas de usuario y sus roles
        </p>
      </div>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifica la información del usuario existente.
            </DialogDescription>
          </DialogHeader>
          <UserForm
            user={selectedUser}
            roles={roles}
            onSuccess={() => {
              setDialogOpen(false);
              // Invalidate both users and user-roles to ensure roles are updated
              queryClient.invalidateQueries({ 
                queryKey: ["/api/users"],
                refetchType: 'active'
              });
              queryClient.invalidateQueries({ 
                queryKey: ["/api/user-roles"],
                refetchType: 'active'
              });
            }}
          />
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="active" data-testid="tab-active-users">
            Usuarios Activos ({users.filter(u => u.isActive).length})
          </TabsTrigger>
          <TabsTrigger value="inactive" data-testid="tab-inactive-users">
            Usuarios Desactivados ({users.filter(u => !u.isActive).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {users.filter(user => user.isActive).map((user) => (
              <Card key={user.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-2">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {getInitials(user.fullName || "")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base sm:text-lg" data-testid={`text-user-name-${user.id}`}>
                        {user.fullName}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground" data-testid={`text-username-${user.id}`}>
                        @{user.username}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2 self-end sm:self-auto">
                    <EditGuard itemType="user">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(user)}
                        data-testid={`button-edit-user-${user.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </EditGuard>
                    <DeleteGuard itemType="user">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeactivate(user.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-deactivate-user-${user.id}`}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    </DeleteGuard>
                  </div>
                </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Email */}
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm" data-testid={`text-user-email-${user.id}`}>
                    {user.email}
                  </span>
                </div>

                {/* Status */}
                <div className="flex items-center space-x-2">
                  <div className={`h-2 w-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className={`text-sm ${user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {user.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {/* Roles */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center">
                    <Shield className="h-4 w-4 mr-1" />
                    Roles Asignados
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {getUserRoles(user.id).length > 0 ? (
                      getUserRoles(user.id).map((role) => (
                        <Badge 
                          key={role.id} 
                          variant={getRoleBadgeColor(role.name)} 
                          className="text-xs"
                          data-testid={`badge-user-role-${user.id}-${role.id}`}
                        >
                          {role.name}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Sin roles asignados
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Last login */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>Último acceso:</span>
                  </div>
                  <span data-testid={`text-user-last-login-${user.id}`}>
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Nunca"}
                  </span>
                </div>

                {/* Created date */}
                <div className="pt-4 border-t">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Creado:</span>
                    <span data-testid={`text-user-created-${user.id}`}>
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {users.filter(u => u.isActive).length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold text-muted-foreground">
            No hay usuarios activos
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Todos los usuarios han sido desactivados.
          </p>
        </div>
      )}
    </TabsContent>

    <TabsContent value="inactive" className="mt-6">
      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {users.filter(user => !user.isActive).map((user) => (
          <Card key={user.id} className="hover:shadow-lg transition-shadow opacity-75">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-2">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gray-100 text-gray-600">
                    {getInitials(user.fullName || "")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base sm:text-lg" data-testid={`text-user-name-${user.id}`}>
                    {user.fullName}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground" data-testid={`text-username-${user.id}`}>
                    @{user.username}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2 self-end sm:self-auto">
                <EditGuard itemType="user">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(user)}
                    data-testid={`button-edit-user-${user.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </EditGuard>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Email */}
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm" data-testid={`text-user-email-${user.id}`}>
                    {user.email}
                  </span>
                </div>

                {/* Status */}
                <div className="flex items-center space-x-2">
                  <div className={`h-2 w-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className={`text-sm ${user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {user.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {/* Roles */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center">
                    <Shield className="h-4 w-4 mr-1" />
                    Roles Asignados
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {getUserRoles(user.id).length > 0 ? (
                      getUserRoles(user.id).map((role) => (
                        <Badge 
                          key={role.id} 
                          variant={getRoleBadgeColor(role.name)} 
                          className="text-xs"
                          data-testid={`badge-user-role-${user.id}-${role.id}`}
                        >
                          {role.name}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Sin roles asignados
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Last login */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>Último acceso:</span>
                  </div>
                  <span data-testid={`text-user-last-login-${user.id}`}>
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Nunca"}
                  </span>
                </div>

                {/* Created date */}
                <div className="pt-4 border-t">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Creado:</span>
                    <span data-testid={`text-user-created-${user.id}`}>
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {users.filter(u => !u.isActive).length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold text-muted-foreground">
            No hay usuarios desactivados
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Todos los usuarios están activos.
          </p>
        </div>
      )}
    </TabsContent>
  </Tabs>

      <AlertDialog open={!!userToDeactivate} onOpenChange={(open) => !open && setUserToDeactivate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción desactivará el usuario y no podrá acceder al sistema. 
              Podrás reactivarlo más tarde si es necesario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-deactivate">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-deactivate"
            >
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </PermissionGuard>
  );
}