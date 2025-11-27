import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Users, UserCog, Sliders, Building2, BarChart3, Shield, UserCheck, Calculator, Target, Mail, Wand2 } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useMemo } from "react";

const allConfigOptions = [
  {
    title: "Asistente de Configuración Inicial",
    description: "Guía paso a paso para configurar tu organización por primera vez (Gerencias, Responsables, Procesos)",
    href: "/setup-wizard",
    icon: Wand2,
    requiresPlatformAdmin: false,
  },
  {
    title: "Configuración de Riesgos",
    description: "Gestiona categorías, rangos y métodos de cálculo para la evaluación de riesgos",
    href: "/config/risks",
    icon: Shield,
    requiresPlatformAdmin: false,
  },
  {
    title: "Gestión de Usuarios",
    description: "Administra usuarios de tu organización y sus perfiles (solo Platform Admins)",
    href: "/config/users",
    icon: Users,
    requiresPlatformAdmin: true,
  },
  {
    title: "Roles y Permisos",
    description: "Configura roles de usuario y permisos de acceso (solo Platform Admins)",
    href: "/config/roles",
    icon: UserCog,
    requiresPlatformAdmin: true,
  },
  {
    title: "Servicio de Email",
    description: "Configura el proveedor de email para enviar notificaciones (Mailgun o SMTP/Outlook)",
    href: "/config/email",
    icon: Mail,
    requiresPlatformAdmin: false,
  },
  {
    title: "Efectividad de Controles",
    description: "Configura variables y pesos porcentuales para evaluar la efectividad de los controles",
    href: "/config/control-effectiveness",
    icon: Sliders,
    requiresPlatformAdmin: false,
  },
  {
    title: "Entidades Fiscales",
    description: "Administra las entidades fiscales del grupo empresarial y sus relaciones",
    href: "/config/fiscal-entities",
    icon: Building2,
    requiresPlatformAdmin: false,
  },
  {
    title: "Evaluación de Factores de Probabilidad e Impacto",
    description: "Configura los pesos porcentuales para cada factor en el cálculo de probabilidad e impacto de riesgos",
    href: "/config/weights",
    icon: Calculator,
    requiresPlatformAdmin: false,
  },
  {
    title: "Criterios dinámicos de Probabilidad e Impacto",
    description: "Gestiona criterios personalizados para evaluar probabilidad e impacto (agregar, eliminar, reordenar)",
    href: "/config/criteria",
    icon: Target,
    requiresPlatformAdmin: false,
  },
];

export default function Config() {
  const { currentUser, hasPermission } = usePermissions();

  // Filter configuration options based on user permissions
  const configOptions = useMemo(() => {
    return allConfigOptions.filter(option => {
      // If option requires platform admin, check that first
      if (option.requiresPlatformAdmin && !currentUser?.isPlatformAdmin) {
        return false;
      }
      
      // If option requires specific permission, check that
      const optionWithPermission = option as typeof option & { requiresPermission?: string };
      if (optionWithPermission.requiresPermission && !hasPermission(optionWithPermission.requiresPermission)) {
        return false;
      }
      
      return true;
    });
  }, [currentUser, hasPermission]);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-bold text-muted-foreground mb-2">¿Qué quieres configurar?</h1>
        <p className="text-muted-foreground">
          Selecciona el área de configuración que deseas gestionar
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {configOptions.map((option) => (
          <Link key={option.href} href={option.href}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow h-full touch-manipulation" data-testid={`config-option-${option.href.split('/').pop()}`}>
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <option.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg">{option.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  {option.description}
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}