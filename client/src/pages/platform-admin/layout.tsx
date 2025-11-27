import { useLocation } from "wouter";
import { Building2, Users, LayoutDashboard, ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export default function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

  // Redirect if not platform admin
  useEffect(() => {
    if (!isLoading && !user?.isPlatformAdmin) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user?.isPlatformAdmin) {
    return null;
  }

  const navigation = [
    { name: "Dashboard", href: "/platform-admin", icon: LayoutDashboard },
    { name: "Organizaciones", href: "/platform-admin/tenants", icon: Building2 },
    { name: "Usuarios", href: "/platform-admin/users", icon: Users },
    { name: "Roles y Permisos", href: "/platform-admin/roles", icon: Shield },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Platform Admin</h1>
              <p className="text-xs text-muted-foreground">Unigrc</p>
            </div>
          </div>

          {/* Back to App Button */}
          <Button
            variant="outline"
            className="w-full mb-6"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a la App
          </Button>

          {/* Navigation */}
          <nav className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Button
                  key={item.name}
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setLocation(item.href)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.name}
                </Button>
              );
            })}
          </nav>
        </div>

        {/* User Info */}
        <div className="absolute bottom-0 left-0 right-0 w-64 p-4 border-t bg-card">
          <div className="text-sm">
            <p className="font-medium">{user.fullName || `${user.firstName} ${user.lastName}`.trim()}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            <p className="text-xs text-primary mt-1">Platform Administrator</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}