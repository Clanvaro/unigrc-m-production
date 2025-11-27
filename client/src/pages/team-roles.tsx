import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription 
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type User, type Role } from "@shared/schema";
import { 
  Users, 
  UserPlus, 
  Award, 
  Edit3, 
  UserMinus,
  Crown,
  Settings
} from "lucide-react";

export default function TeamRolesPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Obtener datos
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: userRoles = [] } = useQuery<any[]>({
    queryKey: ["/api/user-roles"],
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  // Filtrar usuarios activos
  const activeUsers = users.filter(user => user.isActive);

  // Definir roles que pertenecen al equipo auditor
  const auditRoles = ['Supervisor de Auditoría', 'Auditor', 'Auditor Junior'];
  
  // Filtrar roles de auditoría
  const auditRoleObjects = roles.filter(role => auditRoles.includes(role.name));

  // Crear mapa de usuarios por rol
  const usersByRole = new Map();
  userRoles.forEach(ur => {
    const user = users.find(u => u.id === ur.userId);
    if (user && user.isActive) {
      if (!usersByRole.has(ur.roleId)) {
        usersByRole.set(ur.roleId, []);
      }
      usersByRole.get(ur.roleId).push(user);
    }
  });

  // Mutación para asignar rol
  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const response = await apiRequest(`/api/users/${userId}/roles`, "POST", { roleId });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Éxito",
        description: "Rol asignado correctamente.",
      });
      setIsAssignDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo asignar el rol.",
        variant: "destructive",
      });
    },
  });

  // Mutación para remover rol
  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const response = await apiRequest(`/api/users/${userId}/roles/${roleId}`, "DELETE");
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Éxito",
        description: "Rol removido correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo remover el rol.",
        variant: "destructive",
      });
    },
  });

  const getRoleColor = (roleName: string) => {
    if (roleName.toLowerCase().includes('administrador') || roleName.toLowerCase().includes('gerente')) return "bg-purple-100 text-purple-800";
    if (roleName.toLowerCase().includes('supervisor') || roleName.toLowerCase().includes('jefe')) return "bg-orange-100 text-orange-800";
    if (roleName.toLowerCase().includes('analista') || roleName.toLowerCase().includes('senior')) return "bg-green-100 text-green-800";
    return "bg-blue-100 text-blue-800";
  };

  const handleAssignRole = (userId: string, roleId: string) => {
    assignRoleMutation.mutate({ userId, roleId });
  };

  const handleRemoveRole = (userId: string, roleId: string) => {
    removeRoleMutation.mutate({ userId, roleId });
  };

  const getUserCurrentRole = (userId: string) => {
    const userRole = userRoles.find(ur => ur.userId === userId);
    return userRole ? roles.find(role => role.id === userRole.roleId) : null;
  };

  return (
    <div className="space-y-6" data-testid="team-roles-page">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestión de Roles del Equipo</h1>
          <p className="text-muted-foreground">
            Asigna y gestiona roles para los miembros del equipo de auditoría
          </p>
        </div>
        <div className="flex gap-3">
          <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-assign-roles">
                <UserPlus className="w-4 h-4 mr-2" />
                Asignar Roles
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Asignar Roles a Usuarios</DialogTitle>
                <DialogDescription>
                  Selecciona un usuario y el rol que deseas asignarle
                </DialogDescription>
              </DialogHeader>
              <AssignRoleForm
                users={activeUsers}
                roles={roles}
                onAssign={handleAssignRole}
                isLoading={assignRoleMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Roles de Auditoría</CardTitle>
            <Award className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditRoleObjects.length}</div>
            <p className="text-xs text-muted-foreground">
              Roles del equipo auditor
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers.length}</div>
            <p className="text-xs text-muted-foreground">
              Con roles asignados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Roles Asignados</CardTitle>
            <Crown className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userRoles.length}</div>
            <p className="text-xs text-muted-foreground">
              Asignaciones activas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Rol</CardTitle>
            <UserMinus className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeUsers.length - userRoles.filter(ur => activeUsers.some(u => u.id === ur.userId)).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Usuarios sin asignar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Roles y sus miembros */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {auditRoleObjects.map((role) => {
          const roleUsers = usersByRole.get(role.id) || [];
          return (
            <Card key={role.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={getRoleColor(role.name)}>
                      {role.name}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      ({roleUsers.length} {roleUsers.length === 1 ? 'miembro' : 'miembros'})
                    </span>
                  </div>
                </CardTitle>
                {role.description && (
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {roleUsers.length > 0 ? (
                    roleUsers.map((user: User) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{user.fullName}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveRole(user.id, role.id)}
                          disabled={removeRoleMutation.isPending}
                          data-testid={`button-remove-role-${user.id}-${role.id}`}
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      No hay usuarios asignados a este rol
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Usuarios sin rol asignado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserMinus className="w-5 h-5" />
            Usuarios Sin Rol Asignado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeUsers
              .filter(user => !userRoles.some(ur => ur.userId === user.id))
              .map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{user.fullName}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedRole(null);
                      setIsAssignDialogOpen(true);
                    }}
                    data-testid={`button-assign-role-${user.id}`}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Asignar Rol
                  </Button>
                </div>
              ))}
            {activeUsers.filter(user => !userRoles.some(ur => ur.userId === user.id)).length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Todos los usuarios tienen roles asignados
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente para el formulario de asignación
interface AssignRoleFormProps {
  users: User[];
  roles: Role[];
  onAssign: (userId: string, roleId: string) => void;
  isLoading: boolean;
}

function AssignRoleForm({ users, roles, onAssign, isLoading }: AssignRoleFormProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserId && selectedRoleId) {
      onAssign(selectedUserId, selectedRoleId);
      setSelectedUserId("");
      setSelectedRoleId("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="user-select">Usuario</Label>
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar usuario" />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.fullName} ({user.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="role-select">Rol</Label>
        <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar rol" />
          </SelectTrigger>
          <SelectContent>
            {auditRoleObjects.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name} - {role.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={!selectedUserId || !selectedRoleId || isLoading}
        data-testid="button-submit-assign-role"
      >
        {isLoading ? "Asignando..." : "Asignar Rol"}
      </Button>
    </form>
  );
}