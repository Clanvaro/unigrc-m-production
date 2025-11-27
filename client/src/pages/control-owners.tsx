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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Shield, Calendar, UserX, User as UserIcon, Settings } from "lucide-react";
import { CreateGuard, EditGuard, DeleteGuard } from "@/components/auth/permission-guard";
import type { ControlOwner, User, Control } from "@shared/schema";

interface ControlOwnerWithDetails extends ControlOwner {
  user?: User;
  control?: Control;
  assignedByUser?: User;
}

export default function ControlOwnersPage() {
  const [selectedControl, setSelectedControl] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: controlOwners = [], isLoading } = useQuery<ControlOwnerWithDetails[]>({
    queryKey: ["/api/control-owners"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: controlsResponse } = useQuery<{ data: Control[], pagination: { limit: number, offset: number, total: number } }>({
    queryKey: ["/api/controls"],
  });
  const controls = controlsResponse?.data || [];

  const createMutation = useMutation({
    mutationFn: async (data: { controlId: string; userId: string }) => {
      return await apiRequest("/api/control-owners", "POST", {
        controlId: data.controlId,
        userId: data.userId,
        // assignedBy is now determined server-side for security
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/control-owners"] });
      setDialogOpen(false);
      setSelectedControl("");
      setSelectedUser("");
      toast({
        title: "Propietario asignado",
        description: "El propietario del control ha sido asignado exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo asignar el propietario del control.",
        variant: "destructive",
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (ownerId: string) => {
      await apiRequest(`/api/control-owners/${ownerId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/control-owners"] });
      toast({
        title: "Asignación removida",
        description: "La asignación del propietario ha sido removida.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo remover la asignación.",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!selectedControl || !selectedUser) {
      toast({
        title: "Error",
        description: "Selecciona un control y un usuario.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({ controlId: selectedControl, userId: selectedUser });
  };

  const handleDeactivate = (ownerId: string) => {
    if (confirm("¿Estás seguro de que deseas remover esta asignación de propietario?")) {
      deactivateMutation.mutate(ownerId);
    }
  };

  const getInitials = (fullName: string) => {
    return fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Group control owners by control
  const groupedOwners = controlOwners.reduce((acc, owner) => {
    if (!owner.isActive) return acc;
    const controlId = owner.controlId;
    if (!acc[controlId]) {
      acc[controlId] = [];
    }
    acc[controlId].push(owner);
    return acc;
  }, {} as Record<string, ControlOwnerWithDetails[]>);

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
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-muted-foreground mb-2">
            Propietarios de Controles
          </h1>
          <p className="text-muted-foreground">
            Administra la asignación de responsables para cada control de seguridad
          </p>
        </div>
        <CreateGuard itemType="controls">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-create-owner">
                <Plus className="h-4 w-4" />
                Asignar Propietario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Asignar Propietario de Control</DialogTitle>
                <DialogDescription>
                  Selecciona un control y asigna un usuario responsable
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Control</label>
                  <Select value={selectedControl} onValueChange={setSelectedControl}>
                    <SelectTrigger data-testid="select-control">
                      <SelectValue placeholder="Seleccionar control" />
                    </SelectTrigger>
                    <SelectContent>
                      {controls.map((control) => (
                        <SelectItem key={control.id} value={control.id}>
                          {control.code} - {control.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Usuario Responsable</label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger data-testid="select-user">
                      <SelectValue placeholder="Seleccionar usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.filter(u => u.isActive).map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.fullName} {user.cargo && `(${user.cargo})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-assign">
                    {createMutation.isPending ? "Asignando..." : "Asignar"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CreateGuard>
      </div>

      {Object.keys(groupedOwners).length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay propietarios asignados</h3>
            <p className="text-muted-foreground mb-4">
              Comienza asignando propietarios a los controles de seguridad.
            </p>
            <CreateGuard itemType="controls">
              <Button onClick={() => setDialogOpen(true)} data-testid="button-assign-first">
                <Plus className="h-4 w-4 mr-2" />
                Asignar Primer Propietario
              </Button>
            </CreateGuard>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(groupedOwners).map(([controlId, owners]) => {
            const control = controls.find(c => c.id === controlId);
            const currentOwner = owners.find(o => o.isActive);
            const ownerUser = users.find(u => u.id === currentOwner?.userId);
            const assignedByUser = users.find(u => u.id === currentOwner?.assignedBy);

            return (
              <Card key={controlId} className="hover:shadow-md transition-shadow" data-testid={`card-control-${control?.code}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base font-semibold">
                        {control?.code}
                      </CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {control?.name}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      Control
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentOwner && ownerUser ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(ownerUser.fullName || ownerUser.username || "?")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-sm" data-testid={`text-owner-${ownerUser.id}`}>
                            {ownerUser.fullName || ownerUser.username}
                          </p>
                          {ownerUser.cargo && (
                            <p className="text-xs text-muted-foreground">{ownerUser.cargo}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Asignado el {currentOwner.assignedAt ? new Date(currentOwner.assignedAt).toLocaleDateString() : 'Fecha desconocida'}
                        </div>
                        {assignedByUser && (
                          <div className="flex items-center gap-1">
                            <UserIcon className="h-3 w-3" />
                            Por {assignedByUser.fullName || assignedByUser.username}
                          </div>
                        )}
                      </div>

                      <DeleteGuard itemType="controls">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-red-600 hover:text-red-700"
                          onClick={() => handleDeactivate(currentOwner.id)}
                          data-testid={`button-remove-${currentOwner.id}`}
                        >
                          <UserX className="h-3 w-3 mr-1" />
                          Remover Asignación
                        </Button>
                      </DeleteGuard>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <UserX className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-3">
                        Sin propietario asignado
                      </p>
                      <CreateGuard itemType="controls">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedControl(controlId);
                            setDialogOpen(true);
                          }}
                          data-testid={`button-assign-${controlId}`}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Asignar
                        </Button>
                      </CreateGuard>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}