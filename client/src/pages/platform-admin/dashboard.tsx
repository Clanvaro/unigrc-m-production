import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, UserCheck, TrendingUp } from "lucide-react";
import PlatformAdminLayout from "./layout";

interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  tenantUserMemberships: number;
}

export default function PlatformAdminDashboard() {
  const { data: tenants = [] } = useQuery({
    queryKey: ["/api/tenants"],
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/platform/users"],
  });

  const stats: PlatformStats = {
    totalTenants: tenants.length,
    activeTenants: tenants.filter((t: any) => t.isActive).length,
    totalUsers: users.length,
    tenantUserMemberships: users.reduce((acc: number, user: any) => 
      acc + (user.tenantMemberships?.length || 0), 0
    ),
  };

  const statCards = [
    {
      title: "Organizaciones Totales",
      value: stats.totalTenants,
      description: `${stats.activeTenants} activas`,
      icon: Building2,
      color: "text-blue-600",
    },
    {
      title: "Usuarios Totales",
      value: stats.totalUsers,
      description: "En toda la plataforma",
      icon: Users,
      color: "text-green-600",
    },
    {
      title: "Membresías Activas",
      value: stats.tenantUserMemberships,
      description: "Asignaciones de usuarios",
      icon: UserCheck,
      color: "text-purple-600",
    },
    {
      title: "Promedio Usuarios/Org",
      value: stats.totalTenants > 0 
        ? Math.round(stats.tenantUserMemberships / stats.totalTenants * 10) / 10 
        : 0,
      description: "Por organización",
      icon: TrendingUp,
      color: "text-orange-600",
    },
  ];

  return (
    <PlatformAdminLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Platform Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona organizaciones y usuarios de la plataforma Unigrc
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Organizaciones Recientes</CardTitle>
              <CardDescription>
                Últimas organizaciones creadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tenants.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay organizaciones registradas
                </p>
              ) : (
                <div className="space-y-4">
                  {tenants.slice(0, 5).map((tenant: any) => (
                    <div key={tenant.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs ${tenant.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                          {tenant.isActive ? 'Activa' : 'Inactiva'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {tenant.plan || 'free'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usuarios Recientes</CardTitle>
              <CardDescription>
                Últimos usuarios registrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay usuarios registrados
                </p>
              ) : (
                <div className="space-y-4">
                  {users.slice(0, 5).map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">
                          {user.tenantMemberships?.length || 0} org(s)
                        </div>
                        {user.isPlatformAdmin && (
                          <div className="text-xs text-primary">Admin</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PlatformAdminLayout>
  );
}