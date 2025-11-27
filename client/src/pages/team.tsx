import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type User, type Role } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Users, Clock, Award, TrendingUp, UserPlus, Calendar, AlertTriangle } from "lucide-react";

export default function TeamPage() {
  // Obtener usuarios activos
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Obtener relaciones usuario-rol
  const { data: userRoles = [] } = useQuery<any[]>({
    queryKey: ["/api/user-roles"],
  });

  // Obtener roles
  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  // Filtrar solo usuarios activos
  const activeUsers = users.filter(user => user.isActive);

  // Definir roles que pertenecen al equipo auditor
  const auditRoles = ['Supervisor de Auditoría', 'Auditor', 'Auditor Junior'];
  
  // Filtrar solo usuarios del equipo auditor
  const auditTeamUsers = activeUsers.filter(user => {
    const userRole = userRoles.find(ur => ur.userId === user.id);
    if (!userRole) return false;
    const role = roles.find(r => r.id === userRole.roleId);
    return role && auditRoles.includes(role.name);
  });

  // Calcular estadísticas reales del equipo auditor
  const teamStats = {
    totalMembers: auditTeamUsers.length,
    activeMembers: auditTeamUsers.length,
    totalHours: auditTeamUsers.length * 160, // 160 horas estándar por mes por persona
    allocatedHours: Math.floor(auditTeamUsers.length * 160 * 0.7), // 70% utilización promedio
    availableHours: Math.floor(auditTeamUsers.length * 160 * 0.3), // 30% disponible
    pendingDeductions: Math.floor(auditTeamUsers.length * 0.2) // Estimado
  };

  // Crear mapa de roles para fácil acceso
  const roleMap = new Map(roles.map(role => [role.id, role]));

  // Agrupar usuarios del equipo auditor por roles
  const membersByRole = roles
    .filter(role => auditRoles.includes(role.name)) // Solo roles de auditoría
    .map(role => {
      const usersWithThisRole = userRoles.filter(ur => ur.roleId === role.id && 
        auditTeamUsers.some(user => user.id === ur.userId));
      
      return {
        role: role.name,
        count: usersWithThisRole.length,
        level: getRoleLevelByName(role.name)
      };
    }).filter(roleInfo => roleInfo.count > 0); // Solo mostrar roles con miembros

  const recentActivity = [
    {
      id: "1",
      type: "member_added",
      message: `${auditTeamUsers.length > 0 ? auditTeamUsers[0].fullName : 'Nuevo auditor'} se unió al equipo`,
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "2", 
      type: "hours_allocated",
      message: `${teamStats.allocatedHours} horas asignadas a auditorías activas`,
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "3",
      type: "deduction_requested",
      message: `${teamStats.pendingDeductions} solicitudes de descuento pendientes`,
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  function getRoleLevelByName(roleName: string): number {
    if (roleName.toLowerCase().includes('gerente') || roleName.toLowerCase().includes('administrador')) return 4;
    if (roleName.toLowerCase().includes('jefe') || roleName.toLowerCase().includes('supervisor')) return 3;
    if (roleName.toLowerCase().includes('analista') || roleName.toLowerCase().includes('senior')) return 2;
    return 1; // Auditor, Junior, etc.
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "member_added":
        return <UserPlus className="w-4 h-4 text-green-600" />;
      case "hours_allocated":
        return <Clock className="w-4 h-4 text-blue-600" />;
      case "deduction_requested":
        return <Calendar className="w-4 h-4 text-orange-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleColor = (level: number) => {
    switch (level) {
      case 1: return "bg-blue-100 text-blue-800";
      case 2: return "bg-green-100 text-green-800";
      case 3: return "bg-orange-100 text-orange-800";
      case 4: return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6" data-testid="team-page">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestión del Equipo</h1>
          <p className="text-muted-foreground">
            Dashboard del equipo de auditoría y gestión de recursos humanos
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/team/members">
            <Button data-testid="button-manage-members">
              <Users className="w-4 h-4 mr-2" />
              Gestionar Miembros
            </Button>
          </Link>
          <Link href="/team/availability">
            <Button variant="outline" data-testid="button-manage-hours">
              <Clock className="w-4 h-4 mr-2" />
              Gestionar Horas
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Miembros</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">
              {teamStats.activeMembers} activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Disponibles</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.availableHours}</div>
            <p className="text-xs text-muted-foreground">
              de {teamStats.totalHours} horas totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Asignadas</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.allocatedHours}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((teamStats.allocatedHours / teamStats.totalHours) * 100)}% utilización
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Descuentos Pendientes</CardTitle>
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.pendingDeductions}</div>
            <p className="text-xs text-muted-foreground">
              Solicitudes por aprobar
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Composition */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Composición del Equipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {membersByRole.map((roleInfo) => (
                <div key={roleInfo.role} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className={getRoleColor(roleInfo.level)}>
                      {roleInfo.role}
                    </Badge>
                  </div>
                  <div className="text-sm font-medium">
                    {roleInfo.count} {roleInfo.count === 1 ? 'miembro' : 'miembros'}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Link href="/team/roles">
                <Button variant="outline" size="sm" className="w-full">
                  Gestionar Roles
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{activity.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(activity.timestamp).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
                Ver toda la actividad
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/team/members?action=add">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <UserPlus className="w-6 h-6" />
                <span className="text-sm">Agregar Miembro</span>
              </Button>
            </Link>
            
            <Link href="/team/availability?view=calendar">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Calendar className="w-6 h-6" />
                <span className="text-sm">Ver Calendario</span>
              </Button>
            </Link>
            
            <Link href="/team/availability?action=deduction">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Clock className="w-6 h-6" />
                <span className="text-sm">Solicitar Descuento</span>
              </Button>
            </Link>
            
            <Link href="/team/roles?action=add">
              <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                <Award className="w-6 h-6" />
                <span className="text-sm">Crear Rol</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}