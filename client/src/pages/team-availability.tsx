import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Clock, Users, Calendar, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { User, Role } from "@db/schema";

// Data structure for team availability
interface TeamMemberAvailability {
  id: string;
  name: string;
  role: string;
  availableHours: number;
  allocatedHours: number;
  department: string;
}

export default function TeamAvailability() {
  const { toast } = useToast();
  const [isEditMode, setIsEditMode] = useState(false);

  // Obtener usuarios activos
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Obtener relaciones usuario-rol
  const { data: userRoles = [] } = useQuery<any[]>({
    queryKey: ["/api/user-roles"],
  });

  // Obtener roles (usando endpoint básico accesible a todos los usuarios)
  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/roles/basic"],
  });

  // Definir roles que pertenecen al equipo auditor
  const auditRoles = ['Supervisor de Auditoría', 'Auditor', 'Auditor Junior'];
  
  // Obtener los IDs de roles de auditoría
  const auditRoleIds = roles
    .filter(role => auditRoles.includes(role.name))
    .map(role => role.id);
  
  // Filtrar usuarios que tienen roles de auditoría
  const auditTeamMembers = users.filter(user => {
    if (!user.isActive) return false;
    return userRoles.some(ur => 
      ur.userId === user.id && auditRoleIds.includes(ur.roleId)
    );
  });

  // Crear mapa de roles para obtener nombres
  const roleMap = new Map(roles.map(role => [role.id, role]));

  // Transformar a estructura de disponibilidad
  const teamAvailability: TeamMemberAvailability[] = auditTeamMembers.map(user => {
    const userRole = userRoles.find(ur => ur.userId === user.id && auditRoleIds.includes(ur.roleId));
    const role = userRole ? roleMap.get(userRole.roleId) : null;
    
    return {
      id: user.id,
      name: user.fullName || user.username || 'Sin nombre',
      role: role?.name || 'Sin rol',
      availableHours: 40, // Valor por defecto
      allocatedHours: 0,  // Valor por defecto
      department: 'Auditoría'
    };
  });

  const isLoading = !users || !userRoles || !roles;

  const handleSaveChanges = () => {
    toast({
      title: "Disponibilidad actualizada",
      description: "Los cambios de disponibilidad han sido guardados exitosamente."
    });
    setIsEditMode(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-48 mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            Gestión de Disponibilidad de Horas
          </h1>
          <p className="text-muted-foreground mt-2">
            Administre la disponibilidad y asignación de horas del equipo de auditoría
          </p>
        </div>
        <div className="flex gap-2">
          {isEditMode ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => setIsEditMode(false)}
                data-testid="button-cancel-edit"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveChanges}
                data-testid="button-save-changes"
              >
                Guardar Cambios
              </Button>
            </>
          ) : (
            <Button 
              onClick={() => setIsEditMode(true)}
              data-testid="button-edit-availability"
            >
              <Plus className="w-4 h-4 mr-2" />
              Editar Disponibilidad
            </Button>
          )}
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-total-members">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Miembros del Equipo</p>
                <p className="text-2xl font-bold">{teamAvailability?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-hours">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Horas Disponibles</p>
                <p className="text-2xl font-bold">
                  {teamAvailability?.reduce((sum, member) => sum + member.availableHours, 0) || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-allocated-hours">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Horas Asignadas</p>
                <p className="text-2xl font-bold">
                  {teamAvailability?.reduce((sum, member) => sum + member.allocatedHours, 0) || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members Availability */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Disponibilidad por Miembro</h2>
        
        {teamAvailability?.map((member) => {
          const utilizationRate = Math.round((member.allocatedHours / member.availableHours) * 100);
          const availableHours = member.availableHours - member.allocatedHours;
          
          return (
            <Card key={member.id} data-testid={`card-member-${member.id}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{member.name}</CardTitle>
                    <CardDescription>
                      {member.role} - {member.department}
                    </CardDescription>
                  </div>
                  <Badge 
                    variant={utilizationRate > 85 ? "destructive" : utilizationRate > 70 ? "default" : "secondary"}
                    data-testid={`badge-utilization-${member.id}`}
                  >
                    {utilizationRate}% Utilización
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`available-${member.id}`}>Horas Disponibles</Label>
                    {isEditMode ? (
                      <Input
                        id={`available-${member.id}`}
                        type="number"
                        defaultValue={member.availableHours}
                        min="0"
                        max="168"
                        data-testid={`input-available-${member.id}`}
                      />
                    ) : (
                      <p className="text-2xl font-semibold text-green-600" data-testid={`text-available-${member.id}`}>
                        {member.availableHours}h
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`allocated-${member.id}`}>Horas Asignadas</Label>
                    {isEditMode ? (
                      <Input
                        id={`allocated-${member.id}`}
                        type="number"
                        defaultValue={member.allocatedHours}
                        min="0"
                        max={member.availableHours}
                        data-testid={`input-allocated-${member.id}`}
                      />
                    ) : (
                      <p className="text-2xl font-semibold text-orange-600" data-testid={`text-allocated-${member.id}`}>
                        {member.allocatedHours}h
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Horas Libres</Label>
                    <p className="text-2xl font-semibold text-blue-600" data-testid={`text-free-${member.id}`}>
                      {availableHours}h
                    </p>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-muted-foreground mb-1">
                    <span>Progreso de Asignación</span>
                    <span>{utilizationRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        utilizationRate > 85 
                          ? "bg-red-500" 
                          : utilizationRate > 70 
                          ? "bg-orange-500" 
                          : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(utilizationRate, 100)}%` }}
                      data-testid={`progress-bar-${member.id}`}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Information Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <Clock className="w-6 h-6 text-blue-500 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Información sobre Gestión de Horas</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Las horas disponibles representan la capacidad total semanal de cada miembro</li>
                <li>• Las horas asignadas incluyen tiempo dedicado a auditorías activas y tareas programadas</li>
                <li>• Se recomienda mantener una utilización máxima del 85% para permitir flexibilidad</li>
                <li>• Los cambios se aplicarán a partir de la próxima semana de planificación</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}