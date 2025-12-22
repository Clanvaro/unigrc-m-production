import { useLocation } from "wouter";
import { BarChart3, Table, AlertTriangle, Grid3x3, ClipboardCheck, Sliders, CheckSquare, FileText, Settings, Users, UserCog, Calendar, Search, BookOpen, Clock, UserPlus, Award, Scale, FileCheck, FolderOpen, UserCheck, FileX, MessageSquare, Eye, Target, Upload, Tag, Crown, Trash2, Activity, LayoutGrid, ChevronLeft, ChevronRight, Building2, AlertCircle, Shield } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import UserSwitcher from "@/components/user-switcher";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PrefetchLink } from "@/components/PrefetchLink";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Organización y Procesos", href: "/organization", icon: Table },
  { name: "Riesgos", href: "/risks", icon: AlertTriangle },
  { name: "Eventos de Riesgo", href: "/risk-events", icon: FileX },
  { name: "Controles", href: "/controls", icon: Sliders },
  { name: "Matriz de Riesgo", href: "/matrix", icon: Grid3x3 },
  { name: "Validaciones", href: "/validation", icon: CheckSquare, tooltip: "Revisa y aprueba riesgos, controles y planes de acción" },
  { name: "Planes de Acción", href: "/action-plans", icon: Activity },
  { name: "Reportes", href: "/reports", icon: FileText },
];

const configNavigation = [
  { name: "Configuración", href: "/config", icon: Settings, requiredSection: "config" },
  { name: "Usuarios", href: "/config/users", icon: Users, requiredSection: "users" },
  { name: "Roles", href: "/config/roles", icon: Shield, requiredSection: "roles", requirePlatformAdmin: true },
];

const importNavigation = [
  { name: "Importar datos", href: "/import", icon: Upload },
];

// Reusable sidebar content component
function SidebarContent({ onNavigate, isCollapsed, onToggleCollapsed }: { onNavigate?: () => void; isCollapsed?: boolean; onToggleCollapsed?: () => void }) {
  const [location] = useLocation();
  const { canViewSection, currentUser, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center shrink-0" style={{ width: '43.26px', height: '43.26px' }}>
              <img src="/unigrc-logo.png" alt="Unigrc" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Unigrc</h1>
              <p className="text-xs text-muted-foreground">Cargando...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filter navigation items based on permissions
  const filteredNavigation = navigation.filter(item => {
    switch (item.href) {
      case "/dashboard":
        return canViewSection("dashboard");
      case "/organization":
        return canViewSection("processes");
      case "/risks":
        return canViewSection("risks");
      case "/risk-events":
        return canViewSection("risks"); // Risk events use same permissions as risks
      case "/matrix":
        return canViewSection("risks");
      case "/risk-heatmap":
        return canViewSection("risks");
      case "/validation":
        return canViewSection("validation");
      case "/controls":
        return canViewSection("controls");
      case "/action-plans":
        return canViewSection("actions");
      case "/reports":
        return canViewSection("reports");
      default:
        return true;
    }
  });

  // Filter config items based on permissions - each item has its own permission check
  const filteredConfigNavigation = configNavigation.filter(item => {
    // Check if item requires platform admin
    if ((item as any).requirePlatformAdmin && !currentUser?.isPlatformAdmin) {
      return false;
    }
    // Check if item has a specific required section, otherwise fall back to "config"
    const sectionToCheck = (item as any).requiredSection || "config";
    return canViewSection(sectionToCheck);
  });

  // Filter import items based on permissions
  const filteredImportNavigation = importNavigation.filter(item => {
    return canViewSection("config");
  });

  const handleLinkClick = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className={`p-6 border-b border-border ${isCollapsed ? 'p-4' : ''}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="flex items-center justify-center shrink-0" style={{ width: isCollapsed ? '34.608px' : '43.26px', height: isCollapsed ? '34.608px' : '43.26px' }}>
            <img src="/unigrc-logo.png" alt="Unigrc" className="w-full h-full object-contain" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold">Unigrc</h1>
              <p className="text-xs text-muted-foreground">Gestión de Riesgos</p>
            </div>
          )}
        </div>
      </div>

      <nav className={`flex-1 bg-card overflow-y-auto ${isCollapsed ? 'p-2' : 'p-4'}`}>
        <TooltipProvider>
          <ul className="space-y-2">
            {filteredNavigation.map((item) => {
              const isActive = location === item.href || (location === "/" && item.href === "/dashboard");
              const linkContent = (
                <PrefetchLink 
                  href={item.href}
                  className={`sidebar-item flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-md transition-colors ${
                    isActive ? 'active' : ''
                  }`}
                  onClick={handleLinkClick}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span>{item.name}</span>}
                </PrefetchLink>
              );

              return (
                <li key={item.name}>
                  {(item.tooltip || isCollapsed) ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {linkContent}
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{item.tooltip || item.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    linkContent
                  )}
                </li>
              );
            })}
          </ul>

        {/* Módulo de Auditoría - Solo mostrar si el usuario tiene permisos */}
        {canViewSection("audits") && (
        <div className="mt-8">
          {!isCollapsed && (<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
            Auditoría
          </h3>)}
          <ul className="space-y-2">
            <li>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PrefetchLink 
                    href="/audit-plan-list"
                    className={`sidebar-item flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-md transition-colors ${
                      location === '/audit-plan-list' || location === '/audit-plan-wizard' ? 'active' : ''
                    }`}
                    onClick={handleLinkClick}
                  >
                    <Calendar className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span>Planificación de Auditoría</span>}
                  </PrefetchLink>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>Planificación de Auditoría</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </li>
            <li>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PrefetchLink 
                    href="/audits"
                    className={`sidebar-item flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-md transition-colors ${
                      location === '/audits' ? 'active' : ''
                    }`}
                    onClick={handleLinkClick}
                  >
                    <Search className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span>Auditorías</span>}
                  </PrefetchLink>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>Auditorías</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </li>
            <li>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PrefetchLink 
                    href="/audit-tests"
                    className={`sidebar-item flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-md transition-colors ${
                      location === '/audit-tests' ? 'active' : ''
                    }`}
                    data-testid="nav-audit-tests"
                    onClick={handleLinkClick}
                  >
                    <FileCheck className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span>Pruebas de auditoría</span>}
                  </PrefetchLink>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>Pruebas de auditoría</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </li>
            <li>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PrefetchLink 
                    href="/audit-findings"
                    className={`sidebar-item flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-md transition-colors ${
                      location === '/audit-findings' ? 'active' : ''
                    }`}
                    onClick={handleLinkClick}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span>Hallazgos</span>}
                  </PrefetchLink>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>Hallazgos</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </li>
            <li>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PrefetchLink 
                    href="/audit-reports"
                    className={`sidebar-item flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-md transition-colors ${
                      location === '/audit-reports' ? 'active' : ''
                    }`}
                    onClick={handleLinkClick}
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span>Informes de Auditoría</span>}
                  </PrefetchLink>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>Informes de Auditoría</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </li>
            <li>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PrefetchLink 
                    href="/working-papers"
                    className={`sidebar-item flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-md transition-colors ${
                      location === '/working-papers' ? 'active' : ''
                    }`}
                    onClick={handleLinkClick}
                  >
                    <BookOpen className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span>Papeles de Trabajo</span>}
                  </PrefetchLink>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>Papeles de Trabajo</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </li>
          </ul>
        </div>
        )}

        {/* Módulo de Compliance - Solo mostrar si el usuario tiene permisos */}
        {canViewSection("compliance") && (
        <div className="mt-8">
          {!isCollapsed && (<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
            Cumplimiento
          </h3>)}
          <ul className="space-y-2">
            <li>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PrefetchLink 
                    href="/regulations"
                    className={`sidebar-item flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-md transition-colors ${
                      location === '/regulations' ? 'active' : ''
                    }`}
                    data-testid="nav-regulations"
                    onClick={handleLinkClick}
                  >
                    <Scale className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span>Normativas</span>}
                  </PrefetchLink>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>Normativas</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </li>
            <li>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PrefetchLink 
                    href="/compliance-audits"
                    className={`sidebar-item flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-md transition-colors ${
                      location === '/compliance-audits' ? 'active' : ''
                    }`}
                    data-testid="nav-compliance-audits"
                    onClick={handleLinkClick}
                  >
                    <Search className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span>Auditorías de Cumplimiento</span>}
                  </PrefetchLink>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>Auditorías de Cumplimiento</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </li>
            <li>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PrefetchLink 
                    href="/compliance-tests"
                    className={`sidebar-item flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-md transition-colors ${
                      location === '/compliance-tests' ? 'active' : ''
                    }`}
                    data-testid="nav-compliance-tests"
                    onClick={handleLinkClick}
                  >
                    <FileCheck className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span>Pruebas de Cumplimiento</span>}
                  </PrefetchLink>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>Pruebas de Cumplimiento</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </li>
            <li>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PrefetchLink 
                    href="/compliance-documents"
                    className={`sidebar-item flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-md transition-colors ${
                      location === '/compliance-documents' ? 'active' : ''
                    }`}
                    data-testid="nav-compliance-documents"
                    onClick={handleLinkClick}
                  >
                    <FolderOpen className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span>Gestión Documental</span>}
                  </PrefetchLink>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>Gestión Documental</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </li>
            <li>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PrefetchLink 
                    href="/compliance-officers"
                    className={`sidebar-item flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-md transition-colors ${
                      location === '/compliance-officers' ? 'active' : ''
                    }`}
                    data-testid="nav-compliance-officers"
                    onClick={handleLinkClick}
                  >
                    <Crown className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span>Encargados de Cumplimiento</span>}
                  </PrefetchLink>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>Encargados de Cumplimiento</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </li>
          </ul>
        </div>
        )}

        {/* Módulo de Equipo de Auditoría */}
        <div className="mt-8">
          {!isCollapsed && (<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
            Equipo
          </h3>)}
          <ul className="space-y-2">
            <li>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PrefetchLink 
                    href="/team"
                    className={`sidebar-item flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-md transition-colors ${
                      location === '/team' ? 'active' : ''
                    }`}
                    data-testid="nav-team"
                    onClick={handleLinkClick}
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    {!isCollapsed && <span>Gestionar Equipo</span>}
                  </PrefetchLink>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>Gestionar Equipo</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </li>
          </ul>
        </div>


        {filteredConfigNavigation.length > 0 && (
          <div className="mt-8">
            {!isCollapsed && (<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
              Configuración
            </h3>)}
            <ul className="space-y-2">
              {filteredConfigNavigation.map((item) => {
                const isActive = location === item.href;
                return (
                <li key={item.name}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PrefetchLink 
                        href={item.href}
                        data-testid={`nav-config-${item.name.toLowerCase()}`}
                        className={`sidebar-item flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-md transition-colors ${
                          isActive ? 'active' : ''
                        }`}
                        onClick={handleLinkClick}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        {!isCollapsed && <span>{item.name}</span>}
                      </PrefetchLink>
                    </TooltipTrigger>
                    {isCollapsed && (
                      <TooltipContent side="right">
                        <p>{item.name}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Módulo de Importar Datos */}
        {filteredImportNavigation.length > 0 && (
          <div className="mt-8">
            {!isCollapsed && (<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
              Herramientas
            </h3>)}
            <ul className="space-y-2">
              {filteredImportNavigation.map((item) => {
                const isActive = location === item.href;
                return (
                <li key={item.name}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PrefetchLink 
                        href={item.href}
                        data-testid={`nav-import-${item.name.toLowerCase()}`}
                        className={`sidebar-item flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-md transition-colors ${
                          isActive ? 'active' : ''
                        }`}
                        onClick={handleLinkClick}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        {!isCollapsed && <span>{item.name}</span>}
                      </PrefetchLink>
                    </TooltipTrigger>
                    {isCollapsed && (
                      <TooltipContent side="right">
                        <p>{item.name}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </li>
                );
              })}
              <li>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PrefetchLink 
                      href="/manual"
                      data-testid="nav-manual"
                      className={`sidebar-item flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-md transition-colors ${
                        location === '/manual' ? 'active' : ''
                      }`}
                      onClick={handleLinkClick}
                    >
                      <BookOpen className="w-4 h-4 shrink-0" />
                      {!isCollapsed && <span>Manual de Uso</span>}
                    </PrefetchLink>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right">
                      <p>Manual de Uso</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </li>
              <li>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PrefetchLink 
                      href="/trash"
                      data-testid="nav-trash"
                      className={`sidebar-item flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-md transition-colors ${
                        location === '/trash' ? 'active' : ''
                      }`}
                      onClick={handleLinkClick}
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                      {!isCollapsed && <span>Papelera</span>}
                    </PrefetchLink>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right">
                      <p>Papelera</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </li>
            </ul>
          </div>
        )}

        {/* Platform Administration - Only for Platform Admins */}
        {currentUser?.isPlatformAdmin && (
          <div className="mt-8">
            {!isCollapsed && (<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
              Platform Admin
            </h3>)}
            <ul className="space-y-2">
              <li>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PrefetchLink 
                      href="/platform/organizations"
                      data-testid="nav-platform-organizations"
                      className={`sidebar-item flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-md transition-colors ${
                        location === '/platform/organizations' ? 'active' : ''
                      }`}
                      onClick={handleLinkClick}
                    >
                      <Crown className="w-4 h-4 shrink-0" />
                      {!isCollapsed && <span>Administración Global</span>}
                    </PrefetchLink>
                  </TooltipTrigger>
                  {isCollapsed && (
                    <TooltipContent side="right">
                      <p>Administración Global de Organizaciones</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </li>
            </ul>
          </div>
        )}
        </TooltipProvider>
      </nav>

      <div className={`border-t border-border bg-card ${isCollapsed ? 'p-2' : 'p-4'}`}>
        {onToggleCollapsed && (
          <div className="mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapsed}
              className="w-full"
              data-testid="button-toggle-sidebar"
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        )}
        <div className={`flex items-center ${isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between gap-2'}`}>
          <div className={`flex items-center gap-3 ${isCollapsed ? 'flex-col' : 'flex-1 min-w-0'}`}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center shrink-0">
                    <span className="text-muted-foreground text-sm font-medium">
                      {((currentUser?.firstName || "") + (currentUser?.lastName || "")).split(" ").map((n: string) => n[0]).join("") || "U"}
                    </span>
                  </div>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>{currentUser?.fullName || ((currentUser?.firstName || "") + " " + (currentUser?.lastName || "")).trim() || "Usuario"}</p>
                    <p className="text-xs opacity-70">{currentUser?.email || "No identificado"}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{currentUser?.fullName || ((currentUser?.firstName || "") + " " + (currentUser?.lastName || "")).trim() || "Usuario"}</p>
                <p className="text-xs text-muted-foreground truncate">{currentUser?.email || "No identificado"}</p>
              </div>
            )}
          </div>
          {!isCollapsed && <UserSwitcher />}
        </div>
      </div>
    </div>
  );
}

// Main Sidebar component with mobile support
interface SidebarProps {
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export default function Sidebar({ isMobile = false, isOpen = false, onClose, isCollapsed = false, onToggleCollapsed }: SidebarProps) {
  if (isMobile) {
    // Mobile: Use Sheet component
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent onNavigate={onClose} />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Use regular sidebar with collapsible support
  return (
    <aside 
      className={`bg-card border-r border-border flex flex-col h-full transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
      data-testid="sidebar"
    >
      <SidebarContent isCollapsed={isCollapsed} onToggleCollapsed={onToggleCollapsed} />
    </aside>
  );
}