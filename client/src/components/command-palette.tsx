import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  AlertTriangle,
  Shield,
  AlertCircle,
  Building2,
  ClipboardCheck,
  GitBranch,
  MapPin,
  FileText,
  Scale,
  Plus,
  Search,
  Trash2,
  Settings,
  HelpCircle,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [, setLocation] = useLocation();
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchType, setSearchType] = useState<"risk" | "control" | null>(null);

  // Detect OS for keyboard shortcut display
  const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const modifierKey = isMac ? "⌘" : "Ctrl";

  const runCommand = (callback: () => void) => {
    onOpenChange(false);
    callback();
  };

  const navigationActions = [
    {
      id: "nav-dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      action: () => runCommand(() => setLocation("/dashboard")),
      keywords: ["inicio", "dashboard", "home"],
    },
    {
      id: "nav-risks",
      label: "Riesgos",
      icon: AlertTriangle,
      action: () => runCommand(() => setLocation("/risks")),
      keywords: ["riesgos", "risks", "risk"],
    },
    {
      id: "nav-controls",
      label: "Controles",
      icon: Shield,
      action: () => runCommand(() => setLocation("/controls")),
      keywords: ["controles", "controls", "control"],
    },
    {
      id: "nav-action-plans",
      label: "Planes de Acción",
      icon: ClipboardCheck,
      action: () => runCommand(() => setLocation("/action-plans")),
      keywords: ["planes", "accion", "action", "plans", "acciones"],
    },
    {
      id: "nav-risk-events",
      label: "Eventos Riesgosos",
      icon: AlertCircle,
      action: () => runCommand(() => setLocation("/risk-events")),
      keywords: ["eventos", "events", "riesgosos", "risky"],
    },
    {
      id: "nav-audits",
      label: "Auditorías",
      icon: ClipboardCheck,
      action: () => runCommand(() => setLocation("/audit-plans")),
      keywords: ["auditorias", "audits", "audit", "planes"],
    },
    {
      id: "nav-risk-matrix",
      label: "Matriz de Riesgos",
      icon: MapPin,
      action: () => runCommand(() => setLocation("/risk-matrix")),
      keywords: ["mapa", "matriz", "riesgos", "matrix", "risk", "heatmap"],
    },
    {
      id: "nav-reports",
      label: "Reportes",
      icon: FileText,
      action: () => runCommand(() => setLocation("/reports")),
      keywords: ["reportes", "reports", "informes"],
    },
    {
      id: "nav-validation",
      label: "Centro de Validación",
      icon: Shield,
      action: () => runCommand(() => setLocation("/validation")),
      keywords: ["validacion", "validation", "centro", "aprobar", "rechazar"],
    },
    {
      id: "nav-compliance",
      label: "Cumplimiento Normativo",
      icon: Scale,
      action: () => runCommand(() => setLocation("/compliance")),
      keywords: ["cumplimiento", "compliance", "normativas", "regulations"],
    },
  ];

  const createActions = [
    {
      id: "create-risk",
      label: "Nuevo Riesgo",
      icon: Plus,
      action: () => runCommand(() => {
        // Trigger the create risk dialog from the header
        const createButton = document.querySelector('[data-testid="button-create-risk"]') as HTMLElement;
        createButton?.click();
      }),
      keywords: ["nuevo", "riesgo", "crear", "create", "risk"],
    },
    {
      id: "create-control",
      label: "Nuevo Control",
      icon: Plus,
      action: () => runCommand(() => {
        // Trigger the create control dialog from the header
        const createButton = document.querySelector('[data-testid="button-create-control"]') as HTMLElement;
        createButton?.click();
      }),
      keywords: ["nuevo", "control", "crear", "create"],
    },
    {
      id: "create-event",
      label: "Nuevo Evento",
      icon: Plus,
      action: () => runCommand(() => {
        // Trigger the create event dialog from the header
        const createButton = document.querySelector('[data-testid="button-create-event"]') as HTMLElement;
        createButton?.click();
      }),
      keywords: ["nuevo", "evento", "crear", "create", "event"],
    },
    {
      id: "create-audit",
      label: "Nueva Auditoría",
      icon: Plus,
      action: () => runCommand(() => setLocation("/audit-plan-wizard")),
      keywords: ["nueva", "auditoria", "crear", "create", "audit"],
    },
    {
      id: "create-process",
      label: "Nuevo Proceso",
      icon: Plus,
      action: () => runCommand(() => {
        // Trigger the create process dialog from the header
        const createButton = document.querySelector('[data-testid="button-create-process"]') as HTMLElement;
        createButton?.click();
      }),
      keywords: ["nuevo", "proceso", "crear", "create", "process"],
    },
  ];

  const utilityActions = [
    {
      id: "search-risk",
      label: "Buscar Riesgo",
      icon: Search,
      action: () => runCommand(() => {
        // Navigate to risks page and trigger search
        setLocation("/risks");
        setTimeout(() => {
          const searchInput = document.querySelector('input[placeholder*="Buscar"]') as HTMLInputElement;
          searchInput?.focus();
        }, 100);
      }),
      keywords: ["buscar", "riesgo", "search", "risk", "codigo", "nombre"],
    },
    {
      id: "search-control",
      label: "Buscar Control",
      icon: Search,
      action: () => runCommand(() => {
        // Navigate to controls page and trigger search
        setLocation("/controls");
        setTimeout(() => {
          const searchInput = document.querySelector('input[placeholder*="Buscar"]') as HTMLInputElement;
          searchInput?.focus();
        }, 100);
      }),
      keywords: ["buscar", "control", "search"],
    },
    {
      id: "trash",
      label: "Ver Papelera",
      icon: Trash2,
      action: () => runCommand(() => setLocation("/trash")),
      keywords: ["papelera", "trash", "eliminados", "deleted", "recycle"],
    },
    {
      id: "config",
      label: "Configuración",
      icon: Settings,
      action: () => runCommand(() => setLocation("/config")),
      keywords: ["configuracion", "settings", "config", "ajustes"],
    },
    {
      id: "manual",
      label: "Ayuda / Manual",
      icon: HelpCircle,
      action: () => runCommand(() => setLocation("/manual")),
      keywords: ["ayuda", "help", "manual", "guia", "guide", "documentacion"],
    },
  ];

  return (
    <div data-testid="command-palette-container">
      <CommandDialog open={open} onOpenChange={onOpenChange}>
        <div className="relative">
          <CommandInput 
            placeholder={`Buscar acciones... (${modifierKey}K)`}
            data-testid="input-command-palette-search"
            className="h-12"
          />
        </div>
        <CommandList className="max-h-[400px]">
          <CommandEmpty>
            <div className="py-6 text-center text-sm text-muted-foreground">
              No se encontraron resultados.
            </div>
          </CommandEmpty>
          
          <CommandGroup heading="Navegación">
            {navigationActions.map((action) => (
              <CommandItem
                key={action.id}
                value={`${action.label} ${action.keywords.join(" ")}`}
                onSelect={action.action}
                data-testid={`command-item-${action.id}`}
                className="cursor-pointer"
              >
                <action.icon className="mr-2 h-4 w-4 shrink-0" />
                <span className="flex-1">{action.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          
          <CommandSeparator />
          
          <CommandGroup heading="Crear">
            {createActions.map((action) => (
              <CommandItem
                key={action.id}
                value={`${action.label} ${action.keywords.join(" ")}`}
                onSelect={action.action}
                data-testid={`command-item-${action.id}`}
                className="cursor-pointer"
              >
                <action.icon className="mr-2 h-4 w-4 shrink-0" />
                <span className="flex-1">{action.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          
          <CommandSeparator />
          
          <CommandGroup heading="Utilidades">
            {utilityActions.map((action) => (
              <CommandItem
                key={action.id}
                value={`${action.label} ${action.keywords.join(" ")}`}
                onSelect={action.action}
                data-testid={`command-item-${action.id}`}
                className="cursor-pointer"
              >
                <action.icon className="mr-2 h-4 w-4 shrink-0" />
                <span className="flex-1">{action.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
        
        <div className="border-t px-4 py-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Navega con ↑↓</span>
            <span>Selecciona con ↵</span>
            <span>Cierra con ESC</span>
          </div>
        </div>
      </CommandDialog>
    </div>
  );
}
