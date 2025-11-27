import { useLocation, Link } from "wouter";
import { Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbRoute {
  path: string;
  label: string;
  icon?: React.ReactNode;
}

const routeConfig: Record<string, BreadcrumbRoute> = {
  "/": { path: "/", label: "Inicio", icon: <Home className="h-3.5 w-3.5" /> },
  "/dashboard": { path: "/dashboard", label: "Dashboard" },
  "/risks": { path: "/risks", label: "Riesgos" },
  "/risk-matrix": { path: "/risk-matrix", label: "Matriz de Riesgos" },
  "/controls": { path: "/controls", label: "Controles" },
  "/action-plans": { path: "/action-plans", label: "Planes de Acción" },
  "/actions": { path: "/actions", label: "Planes de Acción" },
  "/audits": { path: "/audits", label: "Auditorías" },
  "/audit-plans": { path: "/audit-plans", label: "Planes de Auditoría" },
  "/audit-findings": { path: "/audit-findings", label: "Hallazgos" },
  "/risk-events": { path: "/risk-events", label: "Eventos de Riesgo" },
  "/compliance": { path: "/compliance", label: "Cumplimiento Normativo" },
  "/config": { path: "/config", label: "Configuración" },
  "/config/users": { path: "/config/users", label: "Usuarios" },
  "/config/process-owners": { path: "/config/process-owners", label: "Dueños de Proceso" },
  "/config/macroprocesos": { path: "/config/macroprocesos", label: "Macroprocesos" },
  "/config/procesos": { path: "/config/procesos", label: "Procesos" },
  "/config/subprocesos": { path: "/config/subprocesos", label: "Subprocesos" },
  "/config/gerencias": { path: "/config/gerencias", label: "Gerencias" },
  "/config/regulations": { path: "/config/regulations", label: "Normativas" },
  "/config/roles": { path: "/config/roles", label: "Roles y Permisos" },
  "/config/risks": { path: "/config/risks", label: "Configuración de Riesgos" },
  "/config/email": { path: "/config/email", label: "Servicio de Email" },
  "/config/control-effectiveness": { path: "/config/control-effectiveness", label: "Efectividad de Controles" },
  "/config/fiscal-entities": { path: "/config/fiscal-entities", label: "Entidades Fiscales" },
  "/config/weights": { path: "/config/weights", label: "Evaluación de Factores" },
  "/config/criteria": { path: "/config/criteria", label: "Criterios Dinámicos" },
  "/setup-wizard": { path: "/setup-wizard", label: "Asistente de Configuración" },
  "/reports": { path: "/reports", label: "Reportes" },
  "/validation": { path: "/validation", label: "Centro de Validación" },
};

function buildBreadcrumbTrail(pathname: string): BreadcrumbRoute[] {
  const trail: BreadcrumbRoute[] = [];
  
  // Normalize pathname: strip query strings and hash
  const cleanPath = pathname.split('?')[0].split('#')[0];
  
  // Handle dynamic routes (e.g., /audits/123)
  const segments = cleanPath.split("/").filter(Boolean);
  
  // If root path, return just home
  if (cleanPath === "/") {
    return [routeConfig["/"]];
  }
  
  // Build path incrementally
  let currentPath = "";
  for (let i = 0; i < segments.length; i++) {
    currentPath += `/${segments[i]}`;
    
    // Check if this path exists in config
    if (routeConfig[currentPath]) {
      trail.push(routeConfig[currentPath]);
    } else if (i === segments.length - 1) {
      // Last segment might be an ID - show the parent route's context
      const parentPath = currentPath.substring(0, currentPath.lastIndexOf("/"));
      if (routeConfig[parentPath]) {
        // Add a generic "Detalle" or ID-based breadcrumb
        trail.push({
          path: currentPath,
          label: segments[i].startsWith("edit") ? "Editar" : "Detalle",
        });
      }
    }
  }
  
  // Always start with home
  return [routeConfig["/"], ...trail];
}

export function Breadcrumbs() {
  const [location] = useLocation();
  const trail = buildBreadcrumbTrail(location);
  
  // Don't show breadcrumbs only on root home page
  const cleanPath = location.split('?')[0].split('#')[0];
  if (cleanPath === "/") {
    return null;
  }
  
  return (
    <Breadcrumb className="mt-1" data-testid="breadcrumbs-navigation">
      <BreadcrumbList className="text-xs text-muted-foreground">
        {trail.map((route, index) => {
          const isLast = index === trail.length - 1;
          
          return (
            <div key={route.path} className="flex items-center gap-1.5">
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage data-testid={`breadcrumb-current-${route.path.replace(/\//g, "-")}`} className="flex items-center">
                    {route.icon && <span className="mr-1.5 inline-flex">{route.icon}</span>}
                    {route.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link 
                      href={route.path}
                      data-testid={`breadcrumb-link-${route.path.replace(/\//g, "-")}`}
                      className="flex items-center"
                    >
                      {route.icon && <span className="mr-1.5 inline-flex">{route.icon}</span>}
                      {route.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
