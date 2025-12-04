import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Plus, Pencil, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import PlatformAdminLayout from "./layout";

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
}

// Permisos por defecto necesarios para acceder al menú de configuración
const DEFAULT_ROLE_PERMISSIONS = ["manage_users", "manage_roles", "view_users", "view_roles", "view_all"];

const AVAILABLE_PERMISSIONS = [
  { value: "*", label: "Acceso Total (Wildcard)", category: "Sistema" },
  // Permisos generales
  { value: "view_all", label: "Ver Todos los Datos", category: "General" },
  { value: "create_all", label: "Crear Todo", category: "General" },
  { value: "edit_all", label: "Editar Todo", category: "General" },
  { value: "delete_all", label: "Eliminar Todo", category: "General" },
  // Permisos de gestión de usuarios y roles
  { value: "manage_users", label: "Gestionar Usuarios", category: "Administración" },
  { value: "view_users", label: "Ver Usuarios", category: "Administración" },
  { value: "create_users", label: "Crear Usuarios", category: "Administración" },
  { value: "edit_users", label: "Editar Usuarios", category: "Administración" },
  { value: "manage_roles", label: "Gestionar Roles", category: "Administración" },
  { value: "view_roles", label: "Ver Roles", category: "Administración" },
  { value: "create_roles", label: "Crear Roles", category: "Administración" },
  { value: "edit_roles", label: "Editar Roles", category: "Administración" },
  { value: "users:manage_roles", label: "Gestionar Roles de Usuarios", category: "Administración" },
  // Permisos específicos de riesgos
  { value: "view_risks", label: "Ver Riesgos", category: "Riesgos" },
  { value: "create_risks", label: "Crear Riesgos", category: "Riesgos" },
  { value: "edit_risks", label: "Editar Riesgos", category: "Riesgos" },
  { value: "delete_risks", label: "Eliminar Riesgos", category: "Riesgos" },
  { value: "risks:approve", label: "Aprobar Riesgos", category: "Riesgos" },
  { value: "validate_risks", label: "Validar Riesgos", category: "Riesgos" },
  // Permisos específicos de controles
  { value: "view_controls", label: "Ver Controles", category: "Controles" },
  { value: "create_controls", label: "Crear Controles", category: "Controles" },
  { value: "edit_controls", label: "Editar Controles", category: "Controles" },
  { value: "delete_controls", label: "Eliminar Controles", category: "Controles" },
  { value: "controls:evaluate", label: "Evaluar Controles", category: "Controles" },
  // Permisos específicos de procesos
  { value: "view_processes", label: "Ver Procesos", category: "Procesos" },
  { value: "create_processes", label: "Crear Procesos", category: "Procesos" },
  { value: "edit_processes", label: "Editar Procesos", category: "Procesos" },
  { value: "delete_processes", label: "Eliminar Procesos", category: "Procesos" },
  // Permisos específicos de planes de acción
  { value: "view_action_plans", label: "Ver Planes de Acción", category: "Acciones" },
  { value: "create_action_plans", label: "Crear Planes de Acción", category: "Acciones" },
  { value: "edit_action_plans", label: "Editar Planes de Acción", category: "Acciones" },
  { value: "delete_action_plans", label: "Eliminar Planes de Acción", category: "Acciones" },
  // Permisos de reportes
  { value: "view_reports", label: "Ver Reportes", category: "Reportes" },
  { value: "export_data", label: "Exportar Datos", category: "Reportes" },
  { value: "reports:generate", label: "Generar Reportes", category: "Reportes" },
  // Permisos específicos de auditorías
  { value: "view_audits", label: "Ver Auditorías", category: "Auditorías" },
  { value: "audits:read", label: "Ver Auditorías (alternativo)", category: "Auditorías" },
  { value: "create_audits", label: "Crear Auditorías", category: "Auditorías" },
  { value: "audits:create", label: "Crear Auditorías (alternativo)", category: "Auditorías" },
  { value: "edit_audits", label: "Editar Auditorías", category: "Auditorías" },
  { value: "audits:update", label: "Actualizar Auditorías", category: "Auditorías" },
  { value: "delete_audits", label: "Eliminar Auditorías", category: "Auditorías" },
  { value: "conduct_audits", label: "Ejecutar Auditorías", category: "Auditorías" },
  { value: "supervise_audits", label: "Supervisar Auditorías", category: "Auditorías" },
  { value: "audit_tests:execute", label: "Ejecutar Pruebas de Auditoría", category: "Auditorías" },
  { value: "audit_tests:view", label: "Ver Pruebas de Auditoría", category: "Auditorías" },
  // Permisos específicos de cumplimiento
  { value: "view_compliance", label: "Ver Cumplimiento", category: "Cumplimiento" },
  { value: "compliance:read", label: "Ver Cumplimiento (alternativo)", category: "Cumplimiento" },
  { value: "create_compliance", label: "Crear Cumplimiento", category: "Cumplimiento" },
  { value: "compliance:create", label: "Crear Registros de Cumplimiento", category: "Cumplimiento" },
  { value: "edit_compliance", label: "Editar Cumplimiento", category: "Cumplimiento" },
  { value: "compliance:update", label: "Actualizar Cumplimiento", category: "Cumplimiento" },
  { value: "delete_compliance", label: "Eliminar Cumplimiento", category: "Cumplimiento" },
  { value: "compliance:delete", label: "Eliminar Cumplimiento (alternativo)", category: "Cumplimiento" },
  { value: "manage_compliance", label: "Gestionar Cumplimiento", category: "Cumplimiento" },
  { value: "compliance:manage", label: "Gestionar Cumplimiento (alternativo)", category: "Cumplimiento" },
  // Permisos de administración
  { value: "team:manage", label: "Gestionar Equipo", category: "Administración" },
];

export default function RolesManagementPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery<Role[]>({
    queryKey: ["/api/platform-admin/roles"],
  });

  const createRoleMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; permissions: string[] }) => {
      return await apiRequest("/api/platform-admin/roles", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/roles"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Rol creado",
        description: "El rol ha sido creado exitosamente",
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

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Role> }) => {
      return await apiRequest(`/api/platform-admin/roles/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/roles"] });
      setIsEditDialogOpen(false);
      setSelectedRole(null);
      toast({
        title: "Rol actualizado",
        description: "El rol ha sido actualizado exitosamente",
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

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/platform-admin/roles/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-admin/roles"] });
      setIsDeleteDialogOpen(false);
      setSelectedRole(null);
      toast({
        title: "Rol eliminado",
        description: "El rol ha sido eliminado exitosamente",
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

  return (
    <PlatformAdminLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Roles y Permisos</h1>
            <p className="text-muted-foreground">
              Configura roles de usuario y permisos de acceso
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Rol
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Cargando roles...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                onEdit={() => {
                  setSelectedRole(role);
                  setIsEditDialogOpen(true);
                }}
                onDelete={() => {
                  setSelectedRole(role);
                  setIsDeleteDialogOpen(true);
                }}
              />
            ))}
          </div>
        )}

        <CreateRoleDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSubmit={(data) => createRoleMutation.mutate(data)}
          isLoading={createRoleMutation.isPending}
        />

        {selectedRole && (
          <>
            <EditRoleDialog
              open={isEditDialogOpen}
              onOpenChange={setIsEditDialogOpen}
              role={selectedRole}
              onSubmit={(data) => updateRoleMutation.mutate({ id: selectedRole.id, data })}
              isLoading={updateRoleMutation.isPending}
            />

            <DeleteRoleDialog
              open={isDeleteDialogOpen}
              onOpenChange={setIsDeleteDialogOpen}
              role={selectedRole}
              onConfirm={() => deleteRoleMutation.mutate(selectedRole.id)}
              isLoading={deleteRoleMutation.isPending}
            />
          </>
        )}
      </div>
    </PlatformAdminLayout>
  );
}

function RoleCard({
  role,
  onEdit,
  onDelete,
}: {
  role: Role;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const getIconForRole = (roleName: string) => {
    if (roleName.toLowerCase().includes("admin")) return "🔴";
    if (roleName.toLowerCase().includes("audit")) return "🟢";
    if (roleName.toLowerCase().includes("gestor") || roleName.toLowerCase().includes("manager")) return "🟣";
    if (roleName.toLowerCase().includes("viewer") || roleName.toLowerCase().includes("visualiz")) return "🔵";
    return "👥";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getIconForRole(role.name)}</span>
            <div>
              <CardTitle className="text-lg">{role.name}</CardTitle>
              <CardDescription className="text-sm mt-1">
                {role.description || "Sin descripción"}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div>
          <p className="text-sm font-medium mb-2">Permisos ({role.permissions.length})</p>
          <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
            {role.permissions.slice(0, 5).map((permission) => (
              <Badge key={permission} variant="secondary" className="text-xs">
                {permission}
              </Badge>
            ))}
            {role.permissions.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{role.permissions.length - 5} más
              </Badge>
            )}
          </div>
        </div>
        <div className="mt-4 text-xs text-muted-foreground">
          Creado: {new Date(role.createdAt).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}

function CreateRoleDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; description: string; permissions: string[] }) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Preseleccionar permisos por defecto cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      setSelectedPermissions([...DEFAULT_ROLE_PERMISSIONS]);
    } else {
      // Resetear cuando se cierra
      setName("");
      setDescription("");
      setSelectedPermissions([]);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, description, permissions: selectedPermissions });
    setName("");
    setDescription("");
    setSelectedPermissions([]);
  };

  const togglePermission = (permission: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const groupedPermissions = useMemo(() => {
    return AVAILABLE_PERMISSIONS.reduce((acc, perm) => {
      if (!acc[perm.category]) acc[perm.category] = [];
      acc[perm.category].push(perm);
      return acc;
    }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Rol</DialogTitle>
          <DialogDescription>
            Define un nuevo rol y asigna los permisos correspondientes
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre del Rol *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej: Analista de Riesgos"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción del rol..."
              rows={2}
            />
          </div>

          <div>
            <Label>Permisos *</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Selecciona los permisos que tendrá este rol
            </p>
            
            <div className="space-y-4">
              {Object.entries(groupedPermissions).map(([category, perms]) => (
                <div key={category} className="border rounded-lg p-3">
                  <h4 className="font-medium text-sm mb-2">{category}</h4>
                  <div className="space-y-2">
                    {perms.map((perm) => (
                      <div key={perm.value} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`perm-${perm.value}`}
                          checked={selectedPermissions.includes(perm.value)}
                          onChange={() => togglePermission(perm.value)}
                          className="mr-2"
                        />
                        <label htmlFor={`perm-${perm.value}`} className="text-sm cursor-pointer">
                          {perm.label}
                          <span className="text-xs text-muted-foreground ml-1">({perm.value})</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !name || selectedPermissions.length === 0}>
              {isLoading ? "Creando..." : "Crear Rol"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditRoleDialog({
  open,
  onOpenChange,
  role,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role;
  onSubmit: (data: Partial<Role>) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description || "");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(role.permissions);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, description, permissions: selectedPermissions });
  };

  const togglePermission = (permission: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const groupedPermissions = useMemo(() => {
    return AVAILABLE_PERMISSIONS.reduce((acc, perm) => {
      if (!acc[perm.category]) acc[perm.category] = [];
      acc[perm.category].push(perm);
      return acc;
    }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Rol</DialogTitle>
          <DialogDescription>
            Modifica el nombre, descripción y permisos del rol
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-name">Nombre del Rol *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="edit-description">Descripción</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div>
            <Label>Permisos *</Label>
            <div className="space-y-4 mt-3">
              {Object.entries(groupedPermissions).map(([category, perms]) => (
                <div key={category} className="border rounded-lg p-3">
                  <h4 className="font-medium text-sm mb-2">{category}</h4>
                  <div className="space-y-2">
                    {perms.map((perm) => (
                      <div key={perm.value} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`edit-perm-${perm.value}`}
                          checked={selectedPermissions.includes(perm.value)}
                          onChange={() => togglePermission(perm.value)}
                          className="mr-2"
                        />
                        <label htmlFor={`edit-perm-${perm.value}`} className="text-sm cursor-pointer">
                          {perm.label}
                          <span className="text-xs text-muted-foreground ml-1">({perm.value})</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !name || selectedPermissions.length === 0}>
              {isLoading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteRoleDialog({
  open,
  onOpenChange,
  role,
  onConfirm,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar Rol</DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que deseas eliminar el rol "{role.name}"?
            Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm font-medium mb-1">Rol: {role.name}</p>
          <p className="text-sm text-muted-foreground">
            {role.permissions.length} permiso(s)
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
