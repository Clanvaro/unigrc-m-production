import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { queryKeys } from "@/lib/queryKeys";
import { Building2, Users, Edit, Trash2, UserPlus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tenant, TenantUserWithDetails, User } from "@shared/schema";

const tenantFormSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  slug: z.string().min(2, "El slug debe tener al menos 2 caracteres").regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  description: z.string().optional(),
  settings: z.any().optional(),
});

const tenantUserFormSchema = z.object({
  userId: z.string().min(1, "Selecciona un usuario"),
  role: z.enum(["owner", "admin", "member"]),
});

type TenantFormData = z.infer<typeof tenantFormSchema>;
type TenantUserFormData = z.infer<typeof tenantUserFormSchema>;

export default function PlatformOrganizationsPage() {
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantDialogOpen, setTenantDialogOpen] = useState(false);
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<string | null>(null);
  const [userToRemove, setUserToRemove] = useState<{ tenantId: string; userId: string } | null>(null);
  const { toast } = useToast();

  const { data: tenants = [], isLoading: isLoadingTenants } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: tenantUsers = [], isLoading: isLoadingUsers } = useQuery<TenantUserWithDetails[]>({
    queryKey: queryKeys.tenants.users(selectedTenant?.id),
    enabled: !!selectedTenant?.id && usersDialogOpen,
  });

  const tenantForm = useForm<TenantFormData>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
    },
  });

  const tenantUserForm = useForm<TenantUserFormData>({
    resolver: zodResolver(tenantUserFormSchema),
    defaultValues: {
      userId: "",
      role: "member",
    },
  });

  const createTenantMutation = useMutation({
    mutationFn: async (data: TenantFormData) => {
      return await apiRequest("/api/tenants", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      toast({
        title: "Organización creada",
        description: "La organización ha sido creada exitosamente.",
      });
      setTenantDialogOpen(false);
      tenantForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear la organización.",
        variant: "destructive",
      });
    },
  });

  const updateTenantMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<TenantFormData> }) => {
      return await apiRequest(`/api/tenants/${data.id}`, "PATCH", data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      toast({
        title: "Organización actualizada",
        description: "La organización ha sido actualizada exitosamente.",
      });
      setTenantDialogOpen(false);
      tenantForm.reset();
      setSelectedTenant(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la organización.",
        variant: "destructive",
      });
    },
  });

  const deleteTenantMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      return await apiRequest(`/api/tenants/${tenantId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      toast({
        title: "Organización eliminada",
        description: "La organización ha sido eliminada exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la organización.",
        variant: "destructive",
      });
    },
  });

  const addUserToTenantMutation = useMutation({
    mutationFn: async (data: { tenantId: string; userId: string; role: string }) => {
      return await apiRequest(`/api/tenants/${data.tenantId}/users`, "POST", {
        userId: data.userId,
        role: data.role,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.users(selectedTenant?.id) });
      toast({
        title: "Usuario agregado",
        description: "El usuario ha sido agregado a la organización exitosamente.",
      });
      tenantUserForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo agregar el usuario a la organización.",
        variant: "destructive",
      });
    },
  });

  const removeUserFromTenantMutation = useMutation({
    mutationFn: async (data: { tenantId: string; userId: string }) => {
      return await apiRequest(`/api/tenants/${data.tenantId}/users/${data.userId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.users(selectedTenant?.id) });
      toast({
        title: "Usuario removido",
        description: "El usuario ha sido removido de la organización exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo remover el usuario de la organización.",
        variant: "destructive",
      });
    },
  });

  const handleCreateTenant = () => {
    setSelectedTenant(null);
    tenantForm.reset({
      name: "",
      slug: "",
      description: "",
    });
    setTenantDialogOpen(true);
  };

  const handleEditTenant = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    tenantForm.reset({
      name: tenant.name,
      slug: tenant.slug,
      description: tenant.description || "",
    });
    setTenantDialogOpen(true);
  };

  const handleManageUsers = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setUsersDialogOpen(true);
  };

  const handleDeleteTenant = (tenantId: string) => {
    setTenantToDelete(tenantId);
  };

  const confirmDeleteTenant = () => {
    if (tenantToDelete) {
      deleteTenantMutation.mutate(tenantToDelete);
      setTenantToDelete(null);
    }
  };

  const handleRemoveUser = (userId: string) => {
    if (selectedTenant) {
      setUserToRemove({ tenantId: selectedTenant.id, userId });
    }
  };

  const confirmRemoveUser = () => {
    if (userToRemove) {
      removeUserFromTenantMutation.mutate(userToRemove);
      setUserToRemove(null);
    }
  };

  const onTenantSubmit = (data: TenantFormData) => {
    if (selectedTenant) {
      updateTenantMutation.mutate({ id: selectedTenant.id, updates: data });
    } else {
      createTenantMutation.mutate(data);
    }
  };

  const onAddUserSubmit = (data: TenantUserFormData) => {
    if (selectedTenant) {
      addUserToTenantMutation.mutate({
        tenantId: selectedTenant.id,
        ...data,
      });
    }
  };

  const getRoleBadgeVariant = (role: string | null) => {
    const effectiveRole = role || "member"; // Fallback to "member" if null (deprecated field)
    switch (effectiveRole) {
      case "owner":
        return "destructive";
      case "admin":
        return "default";
      default:
        return "secondary";
    }
  };

  const getRoleLabel = (role: string | null) => {
    const effectiveRole = role || "member"; // Fallback to "member" if null (deprecated field)
    const labels: Record<string, string> = {
      owner: "Propietario",
      admin: "Administrador",
      member: "Miembro",
    };
    return labels[effectiveRole] || effectiveRole;
  };

  if (isLoadingTenants) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administración de Plataforma</h1>
          <p className="text-muted-foreground">
            Gestiona todas las organizaciones y sus miembros desde la vista global de platform admin
          </p>
        </div>
        <Button onClick={handleCreateTenant} data-testid="button-create-tenant">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Organización
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tenants.map((tenant) => (
          <Card key={tenant.id} className="hover:shadow-lg transition-shadow" data-testid={`card-tenant-${tenant.id}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{tenant.name}</CardTitle>
                    <CardDescription className="text-sm">@{tenant.slug}</CardDescription>
                  </div>
                </div>
                <Badge variant={tenant.isActive ? "default" : "secondary"} data-testid={`badge-status-${tenant.id}`}>
                  {tenant.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {tenant.description || "Sin descripción"}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditTenant(tenant)}
                    data-testid={`button-edit-tenant-${tenant.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleManageUsers(tenant)}
                    data-testid={`button-manage-users-${tenant.id}`}
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                  {tenant.slug !== "default" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTenant(tenant.id)}
                      data-testid={`button-delete-tenant-${tenant.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={tenantDialogOpen} onOpenChange={setTenantDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTenant ? "Editar Organización" : "Nueva Organización"}
            </DialogTitle>
            <DialogDescription>
              {selectedTenant
                ? "Modifica la información de la organización."
                : "Crea una nueva organización para gestionar datos de forma independiente."}
            </DialogDescription>
          </DialogHeader>
          <Form {...tenantForm}>
            <form onSubmit={tenantForm.handleSubmit(onTenantSubmit)} className="space-y-4">
              <FormField
                control={tenantForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Mi Organización" {...field} data-testid="input-tenant-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={tenantForm.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug (Identificador único)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="mi-organizacion" 
                        {...field} 
                        disabled={!!selectedTenant}
                        data-testid="input-tenant-slug"
                      />
                    </FormControl>
                    <FormDescription>
                      Solo minúsculas, números y guiones. No se puede cambiar después de crear.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={tenantForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción (opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe brevemente esta organización..." 
                        {...field} 
                        data-testid="input-tenant-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTenantDialogOpen(false)}
                  data-testid="button-cancel-tenant"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createTenantMutation.isPending || updateTenantMutation.isPending}
                  data-testid="button-submit-tenant"
                >
                  {selectedTenant ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={usersDialogOpen} onOpenChange={setUsersDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Gestionar Usuarios - {selectedTenant?.name}
            </DialogTitle>
            <DialogDescription>
              Administra los usuarios que tienen acceso a esta organización.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Agregar Usuario</h3>
              <Form {...tenantUserForm}>
                <form onSubmit={tenantUserForm.handleSubmit(onAddUserSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={tenantUserForm.control}
                      name="userId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Usuario</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-user">
                                <SelectValue placeholder="Selecciona un usuario" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {allUsers
                                .filter(
                                  (user) =>
                                    !tenantUsers.some((tu) => tu.userId === user.id)
                                )
                                .map((user) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.fullName || user.email}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={tenantUserForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rol</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-role">
                                <SelectValue placeholder="Selecciona un rol" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="member">Miembro</SelectItem>
                              <SelectItem value="admin">Administrador</SelectItem>
                              <SelectItem value="owner">Propietario</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={addUserToTenantMutation.isPending}
                    data-testid="button-add-user"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Agregar Usuario
                  </Button>
                </form>
              </Form>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Usuarios Actuales</h3>
              {isLoadingUsers ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenantUsers.map((tenantUser) => (
                      <TableRow key={tenantUser.id} data-testid={`row-tenant-user-${tenantUser.userId}`}>
                        <TableCell className="font-medium">
                          {tenantUser.user?.fullName || tenantUser.user?.email || "Usuario"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tenantUser.user?.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(tenantUser.role)} data-testid={`badge-role-${tenantUser.userId}`}>
                            {getRoleLabel(tenantUser.role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {tenantUser.role !== "owner" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveUser(tenantUser.userId)}
                              data-testid={`button-remove-user-${tenantUser.userId}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!tenantToDelete} onOpenChange={() => setTenantToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente la organización y todos sus datos asociados.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-tenant">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTenant}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-tenant"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!userToRemove} onOpenChange={() => setUserToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Remover usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              El usuario perderá acceso a esta organización y todos sus datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-remove-user">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-remove-user"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
