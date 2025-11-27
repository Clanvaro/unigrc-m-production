import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Search, Building2, Shield, Trash2, UserPlus, Edit, Pencil, UserCheck, UserX } from "lucide-react";
import PlatformAdminLayout from "./layout";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import type { PlatformAdminUser, TenantUserWithDetails, Tenant } from "@shared/schema";

// Type alias for convenience
type TenantMembership = TenantUserWithDetails;

interface MembershipFormData {
  tenantId: string;
  isActive: boolean;
}

interface UserFormData {
  username: string;
  email: string;
  fullName: string;
  password: string;
  isPlatformAdmin: boolean;
}

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<PlatformAdminUser | null>(null);
  const [isMembershipsDialogOpen, setIsMembershipsDialogOpen] = useState(false);
  const [isAddMembershipDialogOpen, setIsAddMembershipDialogOpen] = useState(false);
  const [isDeleteMembershipDialogOpen, setIsDeleteMembershipDialogOpen] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<TenantMembership | null>(null);
  const [membershipFormData, setMembershipFormData] = useState<MembershipFormData>({
    tenantId: "",
    isActive: true,
  });

  // New states for user management
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isManageRolesDialogOpen, setIsManageRolesDialogOpen] = useState(false);
  const [userFormData, setUserFormData] = useState<UserFormData>({
    username: "",
    email: "",
    fullName: "",
    password: "",
    isPlatformAdmin: false,
  });
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading: isLoadingUsers } = useQuery<PlatformAdminUser[]>({
    queryKey: ["/api/platform-admin/users"],
  });

  const { data: tenants = [], isLoading: isLoadingTenants } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
  });

  // Fetch global roles for dynamic role selection
  const { data: globalRoles = [], isLoading: isLoadingRoles } = useQuery<Array<{
    id: string;
    name: string;
    displayName: string | null;
    description: string | null;
    permissions: string[];
    isActive: boolean;
  }>>({
    queryKey: ["/api/platform-admin/roles"],
  });

  const addMembershipMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: MembershipFormData }) =>
      apiRequest(`/api/tenants/${data.tenantId}/users`, "POST", {
        userId,
        role: null, // DEPRECATED: role is now managed via global roles only
        isActive: data.isActive,
      }),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/users"] });
      await queryClient.refetchQueries({ queryKey: ["/api/platform-admin/users"] });
      
      const updatedUsers = queryClient.getQueryData<PlatformAdminUser[]>(["/api/platform-admin/users"]);
      const updatedUser = updatedUsers?.find(u => u.id === variables.userId);
      if (updatedUser && selectedUser?.id === variables.userId) {
        setSelectedUser(updatedUser);
      }
      
      setIsAddMembershipDialogOpen(false);
      setMembershipFormData({
        tenantId: "",
        isActive: true,
      });
      toast({
        title: "Membresía agregada",
        description: "El usuario ha sido agregado a la organización exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMembershipMutation = useMutation({
    mutationFn: ({
      tenantId,
      userId,
      data,
    }: {
      tenantId: string;
      userId: string;
      data: { isActive?: boolean }; // DEPRECATED: role field removed, use global roles only
    }) => apiRequest(`/api/tenants/${tenantId}/users/${userId}`, "PATCH", data),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/users"] });
      await queryClient.refetchQueries({ queryKey: ["/api/platform-admin/users"] });
      
      const updatedUsers = queryClient.getQueryData<PlatformAdminUser[]>(["/api/platform-admin/users"]);
      const updatedUser = updatedUsers?.find(u => u.id === variables.userId);
      if (updatedUser && selectedUser?.id === variables.userId) {
        setSelectedUser(updatedUser);
      }
      
      toast({
        title: "Membresía actualizada",
        description: "La membresía ha sido actualizada exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMembershipMutation = useMutation({
    mutationFn: ({ tenantId, userId }: { tenantId: string; userId: string }) =>
      apiRequest(`/api/tenants/${tenantId}/users/${userId}`, "DELETE"),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/users"] });
      await queryClient.refetchQueries({ queryKey: ["/api/platform-admin/users"] });
      
      const updatedUsers = queryClient.getQueryData<PlatformAdminUser[]>(["/api/platform-admin/users"]);
      const updatedUser = updatedUsers?.find(u => u.id === variables.userId);
      if (updatedUser && selectedUser?.id === variables.userId) {
        setSelectedUser(updatedUser);
      }
      
      setIsDeleteMembershipDialogOpen(false);
      setSelectedMembership(null);
      toast({
        title: "Membresía eliminada",
        description: "El usuario ha sido removido de la organización",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // User Management Mutations
  const createUserMutation = useMutation({
    mutationFn: (data: UserFormData) => apiRequest("/api/platform-admin/users", "POST", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/users"] });
      await queryClient.refetchQueries({ queryKey: ["/api/platform-admin/users"] });
      setIsCreateUserDialogOpen(false);
      setUserFormData({
        username: "",
        email: "",
        fullName: "",
        password: "",
        isPlatformAdmin: false,
      });
      toast({
        title: "Usuario creado",
        description: "El usuario ha sido creado exitosamente",
      });
    },
    onError: (error: Error) => {
      console.error("Error creating user:", error);
      toast({
        title: "Error al crear usuario",
        description: error.message || "No se pudo crear el usuario",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: Partial<UserFormData> }) => 
      apiRequest(`/api/platform-admin/users/${userId}`, "PATCH", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/users"] });
      await queryClient.refetchQueries({ queryKey: ["/api/platform-admin/users"] });
      setIsEditUserDialogOpen(false);
      setSelectedUser(null);
      toast({
        title: "Usuario actualizado",
        description: "El usuario ha sido actualizado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleUserActiveMutation = useMutation({
    mutationFn: (userId: string) => 
      apiRequest(`/api/platform-admin/users/${userId}/toggle-active`, "PATCH"),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/users"] });
      await queryClient.refetchQueries({ queryKey: ["/api/platform-admin/users"] });
      toast({
        title: "Estado actualizado",
        description: "El estado del usuario ha sido actualizado",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) => 
      apiRequest(`/api/platform-admin/users/${userId}/roles`, "POST", { roleId }),
    onSuccess: async (_, variables) => {
      // Invalidar cache
      await queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/users"] });
      
      // Hacer fetch fresco de los datos
      const refreshedUsers = await queryClient.fetchQuery<PlatformAdminUser[]>({
        queryKey: ["/api/platform-admin/users"],
      });
      
      // Actualizar selectedUser con los datos frescos
      if (refreshedUsers) {
        const updatedUser = refreshedUsers.find(u => u.id === variables.userId);
        if (updatedUser && selectedUser?.id === variables.userId) {
          setSelectedUser(updatedUser);
        }
      }
      
      toast({
        title: "Rol asignado",
        description: "El rol ha sido asignado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) => 
      apiRequest(`/api/platform-admin/users/${userId}/roles/${roleId}`, "DELETE"),
    onSuccess: async (_, variables) => {
      // Invalidar cache
      await queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/users"] });
      
      // Hacer fetch fresco de los datos
      const refreshedUsers = await queryClient.fetchQuery<PlatformAdminUser[]>({
        queryKey: ["/api/platform-admin/users"],
      });
      
      // Actualizar selectedUser con los datos frescos
      if (refreshedUsers) {
        const updatedUser = refreshedUsers.find(u => u.id === variables.userId);
        if (updatedUser && selectedUser?.id === variables.userId) {
          setSelectedUser(updatedUser);
        }
      }
      
      toast({
        title: "Rol removido",
        description: "El rol ha sido removido exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleViewMemberships = (user: PlatformAdminUser) => {
    setSelectedUser(user);
    setIsMembershipsDialogOpen(true);
  };

  const handleAddMembership = () => {
    if (!selectedUser) return;
    if (!membershipFormData.tenantId) {
      toast({
        title: "Error",
        description: "Debe seleccionar una organización",
        variant: "destructive",
      });
      return;
    }
    addMembershipMutation.mutate({
      userId: selectedUser.id,
      data: membershipFormData,
    });
  };


  const handleToggleActive = (membership: TenantMembership) => {
    if (!selectedUser) return;
    updateMembershipMutation.mutate({
      tenantId: membership.tenantId,
      userId: selectedUser.id,
      data: { isActive: !membership.isActive },
    });
  };

  const handleDeleteMembership = (membership: TenantMembership) => {
    setSelectedMembership(membership);
    setIsDeleteMembershipDialogOpen(true);
  };

  const confirmDeleteMembership = () => {
    if (!selectedUser || !selectedMembership) return;
    deleteMembershipMutation.mutate({
      tenantId: selectedMembership.tenantId,
      userId: selectedUser.id,
    });
  };

  // User Management Handlers
  const handleCreateUser = () => {
    createUserMutation.mutate(userFormData);
  };

  const handleEditUser = (user: PlatformAdminUser) => {
    setSelectedUser(user);
    setUserFormData({
      username: user.username || "",
      email: user.email || "",
      fullName: user.fullName || "",
      password: "",
      isPlatformAdmin: user.isPlatformAdmin || false,
    });
    setIsEditUserDialogOpen(true);
  };

  const handleUpdateUser = () => {
    if (!selectedUser) return;
    const updateData: Partial<UserFormData> = {};
    if (userFormData.username) updateData.username = userFormData.username;
    if (userFormData.email) updateData.email = userFormData.email;
    if (userFormData.fullName) updateData.fullName = userFormData.fullName;
    if (userFormData.password) updateData.password = userFormData.password;
    updateData.isPlatformAdmin = userFormData.isPlatformAdmin;

    updateUserMutation.mutate({ userId: selectedUser.id, data: updateData });
  };

  const handleToggleUserActive = (user: PlatformAdminUser) => {
    toggleUserActiveMutation.mutate(user.id);
  };

  const handleManageRoles = (user: PlatformAdminUser) => {
    setSelectedUser(user);
    const userRoleIds = (user.roles || []).map((r: any) => r.id);
    setSelectedRoles(userRoleIds);
    setIsManageRolesDialogOpen(true);
  };

  const handleAssignRole = (roleId: string) => {
    if (!selectedUser) return;
    assignRoleMutation.mutate({ userId: selectedUser.id, roleId });
  };

  const handleRemoveRole = (roleId: string) => {
    if (!selectedUser) return;
    removeRoleMutation.mutate({ userId: selectedUser.id, roleId });
  };

  const getAvailableTenants = () => {
    if (!selectedUser) return [];
    const userTenantIds = selectedUser.tenantMemberships?.map((t) => t.tenantId) || [];
    return tenants.filter((t) => !userTenantIds.includes(t.id) && t.isActive);
  };

  const getInitials = (user: PlatformAdminUser) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.fullName) {
      const names = user.fullName.split(" ");
      return names.length > 1
        ? `${names[0][0]}${names[1][0]}`.toUpperCase()
        : names[0][0].toUpperCase();
    }
    return user.email ? user.email[0].toUpperCase() : "?";
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PlatformAdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">Usuarios</h1>
              <p className="text-muted-foreground mt-2">
                Gestiona los usuarios y sus membresías en las organizaciones
              </p>
            </div>
            <Button
              onClick={() => {
                setIsCreateUserDialogOpen(true);
              }}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Crear Usuario
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoadingUsers ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Cargando usuarios...</p>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">No se encontraron usuarios</p>
            <p className="text-muted-foreground">
              {searchTerm
                ? "Intenta con otros términos de búsqueda"
                : "No hay usuarios registrados en la plataforma"}
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Avatar</TableHead>
                  <TableHead>Nombre Completo</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Organizaciones</TableHead>
                  <TableHead>Roles Globales</TableHead>
                  <TableHead>Platform Admin</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.profileImageUrl || undefined} alt={user.fullName || user.email || "User"} />
                        <AvatarFallback>{getInitials(user)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">
                      {user.fullName || `${user.firstName} ${user.lastName}`.trim() || "Sin nombre"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{user.tenantMemberships?.length || 0}</span>
                        {user.tenantMemberships && user.tenantMemberships.length > 0 && (
                          <div className="flex gap-1">
                            {user.tenantMemberships.slice(0, 3).map((tenant) => (
                              <Badge
                                key={tenant.id}
                                variant="secondary"
                                className="text-xs"
                              >
                                {tenant.tenant?.slug}
                              </Badge>
                            ))}
                            {user.tenantMemberships.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{user.tenantMemberships.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.roles && user.roles.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.roles.slice(0, 2).map((role: any) => (
                            <Badge
                              key={role.id}
                              variant="outline"
                              className="text-xs"
                            >
                              {role.name}
                            </Badge>
                          ))}
                          {user.roles.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.roles.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin roles</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.isPlatformAdmin && (
                        <Badge variant="default" className="gap-1">
                          <Shield className="h-3 w-3" />
                          Admin
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleManageRoles(user)}
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewMemberships(user)}
                        >
                          <Building2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={user.isActive ? "outline" : "default"}
                          size="sm"
                          onClick={() => handleToggleUserActive(user)}
                        >
                          {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Memberships Dialog */}
      <Dialog open={isMembershipsDialogOpen} onOpenChange={setIsMembershipsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Membresías de Usuario</DialogTitle>
            <DialogDescription>
              {selectedUser
                ? `${selectedUser.fullName || selectedUser.email} - ${selectedUser.tenantMemberships?.length || 0} ${
                    (selectedUser.tenantMemberships?.length || 0) === 1 ? "organización" : "organizaciones"
                  }`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setMembershipFormData({
                    tenantId: "",
                    isActive: true,
                  });
                  setIsAddMembershipDialogOpen(true);
                }}
                disabled={getAvailableTenants().length === 0}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Agregar a Organización
              </Button>
            </div>

            {selectedUser && (selectedUser.tenantMemberships?.length || 0) === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Este usuario no pertenece a ninguna organización</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organización</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha de Ingreso</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedUser?.tenantMemberships?.map((membership) => (
                    <TableRow key={membership.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{membership.tenant?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {membership.tenant?.slug}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={membership.isActive}
                            onCheckedChange={() => handleToggleActive(membership)}
                            disabled={updateMembershipMutation.isPending}
                          />
                          <span className="text-sm">
                            {membership.isActive ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {membership.joinedAt
                          ? new Date(membership.joinedAt).toLocaleDateString("es-ES", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMembership(membership)}
                          disabled={deleteMembershipMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Membership Dialog */}
      <Dialog open={isAddMembershipDialogOpen} onOpenChange={setIsAddMembershipDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar a Organización</DialogTitle>
            <DialogDescription>
              Agrega al usuario a una nueva organización
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="tenant">Organización</Label>
              <Select
                value={membershipFormData.tenantId}
                onValueChange={(value) =>
                  setMembershipFormData({ ...membershipFormData, tenantId: value })
                }
              >
                <SelectTrigger id="tenant">
                  <SelectValue placeholder="Selecciona una organización" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableTenants().map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name} ({tenant.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is-active"
                checked={membershipFormData.isActive}
                onCheckedChange={(checked) =>
                  setMembershipFormData({ ...membershipFormData, isActive: checked })
                }
              />
              <Label htmlFor="is-active" className="cursor-pointer">
                Membresía activa
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddMembershipDialogOpen(false)}
              disabled={addMembershipMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddMembership}
              disabled={addMembershipMutation.isPending || !membershipFormData.tenantId}
            >
              {addMembershipMutation.isPending ? "Agregando..." : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Membership Confirmation */}
      <AlertDialog
        open={isDeleteMembershipDialogOpen}
        onOpenChange={setIsDeleteMembershipDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar membresía?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción removerá al usuario de la organización{" "}
              <strong>{selectedMembership?.tenant?.name}</strong>. El usuario perderá acceso a
              todos los recursos de esta organización.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMembershipMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteMembership}
              disabled={deleteMembershipMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMembershipMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create User Dialog */}
      <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Crea un nuevo usuario en la plataforma
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="create-username">Nombre de Usuario</Label>
              <Input
                id="create-username"
                value={userFormData.username}
                onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                placeholder="usuario123"
              />
            </div>

            <div>
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                value={userFormData.email}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                placeholder="usuario@ejemplo.com"
              />
            </div>

            <div>
              <Label htmlFor="create-fullname">Nombre Completo</Label>
              <Input
                id="create-fullname"
                value={userFormData.fullName}
                onChange={(e) => setUserFormData({ ...userFormData, fullName: e.target.value })}
                placeholder="Juan Pérez"
              />
            </div>

            <div>
              <Label htmlFor="create-password">Contraseña</Label>
              <Input
                id="create-password"
                type="password"
                value={userFormData.password}
                onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="create-platform-admin"
                checked={userFormData.isPlatformAdmin}
                onCheckedChange={(checked) =>
                  setUserFormData({ ...userFormData, isPlatformAdmin: checked })
                }
              />
              <Label htmlFor="create-platform-admin" className="cursor-pointer">
                Administrador de Plataforma
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateUserDialogOpen(false)}
              disabled={createUserMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={createUserMutation.isPending}
            >
              {createUserMutation.isPending ? "Creando..." : "Crear Usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifica la información del usuario
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-username">Nombre de Usuario</Label>
              <Input
                id="edit-username"
                value={userFormData.username}
                onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                placeholder="usuario123"
              />
            </div>

            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={userFormData.email}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                placeholder="usuario@ejemplo.com"
              />
            </div>

            <div>
              <Label htmlFor="edit-fullname">Nombre Completo</Label>
              <Input
                id="edit-fullname"
                value={userFormData.fullName}
                onChange={(e) => setUserFormData({ ...userFormData, fullName: e.target.value })}
                placeholder="Juan Pérez"
              />
            </div>

            <div>
              <Label htmlFor="edit-password">Nueva Contraseña (opcional)</Label>
              <Input
                id="edit-password"
                type="password"
                value={userFormData.password}
                onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                placeholder="Dejar vacío para no cambiar"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-platform-admin"
                checked={userFormData.isPlatformAdmin}
                onCheckedChange={(checked) =>
                  setUserFormData({ ...userFormData, isPlatformAdmin: checked })
                }
              />
              <Label htmlFor="edit-platform-admin" className="cursor-pointer">
                Administrador de Plataforma
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditUserDialogOpen(false)}
              disabled={updateUserMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateUser}
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Roles Dialog */}
      <Dialog open={isManageRolesDialogOpen} onOpenChange={setIsManageRolesDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gestionar Roles Globales</DialogTitle>
            <DialogDescription>
              Asigna o remueve roles globales para {selectedUser?.fullName || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Roles Asignados</Label>
              <div className="border rounded-lg p-4 min-h-[100px] space-y-2">
                {selectedUser?.roles && selectedUser.roles.length > 0 ? (
                  selectedUser.roles.map((role: any) => (
                    <div key={role.id} className="flex items-center justify-between p-2 bg-secondary rounded">
                      <div>
                        <div className="font-medium">{role.name}</div>
                        {role.description && (
                          <div className="text-sm text-muted-foreground">{role.description}</div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveRole(role.id)}
                        disabled={removeRoleMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    Este usuario no tiene roles asignados
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label>Agregar Rol</Label>
              <div className="flex gap-2">
                <Select
                  onValueChange={(roleId) => {
                    if (roleId && !selectedUser?.roles?.some((r: any) => r.id === roleId)) {
                      handleAssignRole(roleId);
                    }
                  }}
                  disabled={isLoadingRoles || assignRoleMutation.isPending}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecciona un rol para agregar" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingRoles ? (
                      <SelectItem value="loading" disabled>
                        Cargando roles...
                      </SelectItem>
                    ) : (
                      globalRoles
                        .filter(role => role.isActive && !selectedUser?.roles?.some((ur: any) => ur.id === role.id))
                        .map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            <div>
                              <div className="font-medium">{role.displayName || role.name}</div>
                              {role.description && (
                                <div className="text-xs text-muted-foreground">{role.description}</div>
                              )}
                            </div>
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setIsManageRolesDialogOpen(false);
                setSelectedUser(null);
              }}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PlatformAdminLayout>
  );
}
