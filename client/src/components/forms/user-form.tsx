import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { insertUserSchema, type User, type Role } from "@shared/schema";
import { Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";

// Crear esquema dinámico basado en si es edición o creación
const createUserFormSchema = (isEditing: boolean) => {
  const baseSchema = insertUserSchema.extend({
    confirmPassword: isEditing 
      ? z.string().optional() 
      : z.string().min(1, "Confirmar contraseña es requerido"),
  });

  if (isEditing) {
    return baseSchema.refine(
      (data) => !data.password || data.password === data.confirmPassword,
      {
        message: "Las contraseñas no coinciden",
        path: ["confirmPassword"],
      }
    );
  } else {
    return baseSchema.refine(
      (data) => data.password === data.confirmPassword,
      {
        message: "Las contraseñas no coinciden",
        path: ["confirmPassword"],
      }
    );
  }
};

// Tipo dinámico para los valores del formulario
type UserFormValues = {
  username: string;
  email: string;
  fullName: string;
  cargo?: string;
  password: string;
  confirmPassword?: string;
  isActive: boolean;
};

interface UserFormProps {
  user?: User | null;
  roles: Role[];
  onSuccess?: () => void;
}

export function UserForm({ user, roles, onSuccess }: UserFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  // Load existing user roles when editing
  useEffect(() => {
    if (user) {
      const loadUserRoles = async () => {
        try {
          const response = await fetch(`/api/users/${user.id}/roles`);
          if (response.ok) {
            const userRoles = await response.json();
            setSelectedRoles(userRoles.map((ur: any) => ur.roleId));
          }
        } catch (error) {
          console.error("Error loading user roles:", error);
        }
      };
      loadUserRoles();
    }
  }, [user]);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(createUserFormSchema(!!user)),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || "",
      fullName: user?.fullName || "",
      cargo: user?.cargo || "",
      password: "",
      confirmPassword: "",
      isActive: user?.isActive ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      const { confirmPassword, ...userDataWithoutConfirm } = data;
      
      if (user) {
        return await apiRequest(`/api/users/${user.id}`, "PUT", userDataWithoutConfirm);
      } else {
        return await apiRequest("/api/users", "POST", userDataWithoutConfirm);
      }
    },
    onSuccess: async (userData: any) => {
      const userId = user ? user.id : userData.id;
      
      // Handle role assignments for both new and existing users
      if (selectedRoles.length > 0 && userId) {
        try {
          if (user) {
            // For editing: first get current roles, then add/remove as needed
            const currentRolesResponse = await fetch(`/api/users/${userId}/roles`);
            const currentRoles = currentRolesResponse.ok ? await currentRolesResponse.json() : [];
            const currentRoleIds = currentRoles.map((ur: any) => ur.roleId);
            
            // Remove roles that are no longer selected
            for (const currentRoleId of currentRoleIds) {
              if (!selectedRoles.includes(currentRoleId)) {
                await apiRequest(`/api/users/${userId}/roles/${currentRoleId}`, "DELETE");
              }
            }
            
            // Add new roles
            for (const roleId of selectedRoles) {
              if (!currentRoleIds.includes(roleId)) {
                await apiRequest(`/api/users/${userId}/roles`, "POST", { roleId });
              }
            }
          } else {
            // For new users: add all selected roles
            for (const roleId of selectedRoles) {
              await apiRequest(`/api/users/${userId}/roles`, "POST", { roleId });
            }
          }
        } catch (error) {
          console.error("Error managing roles:", error);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-roles"] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/roles`] });
      toast({
        title: "Éxito",
        description: `Usuario ${user ? "actualizado" : "creado"} exitosamente.`,
      });
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: `No se pudo ${user ? "actualizar" : "crear"} el usuario.`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UserFormValues) => {
    mutation.mutate(data);
  };

  const addRole = (roleId: string) => {
    if (!selectedRoles.includes(roleId)) {
      setSelectedRoles([...selectedRoles, roleId]);
    }
  };

  const removeRole = (roleId: string) => {
    setSelectedRoles(selectedRoles.filter(id => id !== roleId));
  };

  const getSelectedRole = (roleId: string) => {
    return roles.find(role => role.id === roleId);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre Completo *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Juan Carlos Pérez" 
                    {...field} 
                    data-testid="input-user-fullname"
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") {
                        e.stopPropagation();
                      }
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre de Usuario *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="jperez" 
                    {...field} 
                    data-testid="input-user-username"
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") {
                        e.stopPropagation();
                      }
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo Electrónico *</FormLabel>
              <FormControl>
                <Input 
                  type="email"
                  placeholder="juan.perez@empresa.com" 
                  {...field} 
                  data-testid="input-user-email"
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") {
                      e.stopPropagation();
                    }
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cargo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cargo</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ej: Gerente de Operaciones, Analista de Riesgos, etc." 
                  {...field} 
                  data-testid="input-user-cargo"
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") {
                      e.stopPropagation();
                    }
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contraseña *</FormLabel>
                <FormControl>
                  <Input 
                    type="password"
                    placeholder="Mínimo 6 caracteres" 
                    {...field} 
                    data-testid="input-user-password"
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") {
                        e.stopPropagation();
                      }
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar Contraseña *</FormLabel>
                <FormControl>
                  <Input 
                    type="password"
                    placeholder="Repite la contraseña" 
                    {...field} 
                    data-testid="input-user-confirm-password"
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") {
                        e.stopPropagation();
                      }
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Role Assignment Section */}
        {true && (
          <div className="space-y-4">
            <div>
              <FormLabel className="text-base">{user ? "Gestionar Roles" : "Asignar Roles"}</FormLabel>
              <FormDescription>
                {user ? "Modifica los roles de este usuario" : "Selecciona los roles que tendrá este usuario"}
              </FormDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              <Select onValueChange={addRole} data-testid="select-user-role">
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Seleccionar rol..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.filter(role => !selectedRoles.includes(role.id)).map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedRoles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Roles seleccionados:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedRoles.map((roleId) => {
                    const role = getSelectedRole(roleId);
                    return role ? (
                      <Badge key={roleId} variant="secondary" className="flex items-center gap-1">
                        {role.name}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-transparent"
                          onClick={() => removeRole(roleId)}
                          data-testid={`button-remove-role-${roleId}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Usuario Activo</FormLabel>
                <FormDescription>
                  Los usuarios inactivos no pueden acceder al sistema
                </FormDescription>
              </div>
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="checkbox-user-active"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button
            type="submit"
            disabled={mutation.isPending}
            data-testid="button-submit-user"
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {user ? "Actualizar Usuario" : "Crear Usuario"}
          </Button>
        </div>
      </form>
    </Form>
  );
}