export interface PageTitle {
  title: string;
  subtitle: string;
}

export const pageTitles: Record<string, PageTitle> = {
  "/": { title: "Dashboard", subtitle: "Visión general del estado de riesgos" },
  "/dashboard": { title: "Dashboard", subtitle: "Visión general del estado de riesgos" },
  "/processes": { title: "Procesos", subtitle: "Gestión de procesos de negocio. Estructura jerárquica: Macroproceso → Procesos → Subprocesos" },
  "/organization": { title: "Organización y Procesos", subtitle: "Gestión de la estructura organizacional, gerencias y cadena de valor" },
  "/risks": { title: "Gestión de Riesgos", subtitle: "Administra y evalúa todos los riesgos identificados" },
  "/matrix": { title: "Matriz de Riesgo", subtitle: "Visualización completa de riesgos por probabilidad e impacto" },
  "/validation": { title: "Centro de Validación", subtitle: "Revisa y valida los riesgos pendientes de aprobación" },
  "/controls": { title: "Gestión de Controles", subtitle: "Administra controles y evalúa su efectividad" },
  "/config": { title: "Configuración", subtitle: "Configura los parámetros del sistema" },
  "/config/risks": { title: "Configuración de Riesgos", subtitle: "Gestiona categorías, rangos y métodos de cálculo para la evaluación de riesgos" },
  "/config/categories": { title: "Gestión de Categorías de Riesgo", subtitle: "Personaliza las categorías disponibles para clasificar los riesgos" },
  "/config/control-effectiveness": { title: "Efectividad de Controles", subtitle: "Configura variables y pesos porcentuales para evaluar la efectividad de los controles" },
  "/actions": { title: "Planes de Acción", subtitle: "Gestione las acciones correctivas y preventivas para mitigar los riesgos identificados" },
  "/action-plans": { title: "Planes de Acción", subtitle: "Gestiona los planes de acción para mitigar riesgos y hallazgos de auditoría" },
  "/reports": { title: "Reportes", subtitle: "Genera informes y análisis de riesgos" },
  "/audits": { title: "Gestión de Auditorías", subtitle: "Administra el registro y seguimiento de auditorías" },
  "/audit-plan-list": { title: "Planificación de Auditoría", subtitle: "Gestiona la planificación anual de auditorías con priorización basada en riesgos" },
  "/audit-plan-wizard": { title: "Plan de Auditoría", subtitle: "Crea y gestiona planes anuales con selección y priorización de auditorías" },
  "/team": { title: "Gestión del Equipo", subtitle: "Dashboard del equipo de auditoría y gestión de recursos humanos" },
  "/team/members": { title: "Gestión del Equipo", subtitle: "Administra los miembros del equipo de auditoría" },
  "/team/roles": { title: "Gestión de Roles del Equipo", subtitle: "Asigna y gestiona roles para los miembros del equipo" },
  "/regulations": { title: "Normativas de Cumplimiento", subtitle: "Gestione las normativas y regulaciones aplicables a su organización" },
  "/compliance-audits": { title: "Auditorías de Cumplimiento", subtitle: "Gestión especializada de auditorías normativas" },
  "/compliance-tests": { title: "Pruebas de Cumplimiento", subtitle: "Ejecuta y gestiona pruebas de cumplimiento normativo" },
  "/compliance-documents": { title: "Gestión Documental", subtitle: "Administra documentos normativos y de cumplimiento" },
  "/config/users": { title: "Gestión de Usuarios", subtitle: "Administra usuarios del sistema y sus perfiles" },
  "/config/roles": { title: "Roles y Permisos", subtitle: "Configura roles de usuario y permisos de acceso" },
  "/config/fiscal-entities": { title: "Entidades Fiscales", subtitle: "Administra las entidades fiscales del grupo empresarial y sus relaciones" },
  "/risk-events": { title: "Eventos de Riesgo", subtitle: "Gestión y seguimiento de eventos materializados, fraudes y delitos" },
  "/audit-tests": { title: "Mis Pruebas de Auditoría", subtitle: "Gestiona las pruebas de auditoría asignadas" },
  "/audit-findings": { title: "Hallazgos de Auditoría", subtitle: "Gestión y seguimiento de hallazgos identificados en auditorías" },
  "/audit-reports": { title: "Informes de Auditoría", subtitle: "Selecciona una auditoría para generar su informe completo" },
  "/manual": { title: "Manual de Uso", subtitle: "Guía completa para usar Unigrc" },
  "/trash": { title: "Papelera de Reciclaje", subtitle: "Elementos eliminados que pueden ser restaurados" },
  "/import": { title: "Importar Datos", subtitle: "Importe entidades, procesos, riesgos y controles desde Excel" },
};

export interface HeaderProps {
  isMobile?: boolean;
  onToggleMobileSidebar?: () => void;
  onToggleDesktopSidebar?: () => void;
  isDesktopSidebarCollapsed?: boolean;
}
