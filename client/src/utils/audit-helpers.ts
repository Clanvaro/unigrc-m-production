export const getStatusColor = (status: string) => {
  switch (status) {
    // Estados en español
    case "planificacion": return "bg-blue-100 text-blue-800";
    case "borrador": return "bg-gray-100 text-gray-800";
    case "en_revision": return "bg-yellow-100 text-yellow-800";
    case "alcance_aprobado": return "bg-indigo-100 text-indigo-800";
    case "en_ejecucion": return "bg-orange-100 text-orange-800";
    case "cierre_tecnico": return "bg-purple-100 text-purple-800";
    case "informe_preliminar": return "bg-blue-100 text-blue-800";
    case "informe_final": return "bg-teal-100 text-teal-800";
    case "seguimiento": return "bg-cyan-100 text-cyan-800";
    case "trabajo_campo": return "bg-orange-100 text-orange-800";
    case "reporte": return "bg-purple-100 text-purple-800";
    case "completado": return "bg-green-100 text-green-800";
    case "cancelado": return "bg-red-100 text-red-800";
    // Estados en inglés (compatibilidad)
    case "planned": return "bg-blue-100 text-blue-800";
    case "draft": return "bg-gray-100 text-gray-800";
    case "in_progress": return "bg-orange-100 text-orange-800";
    case "fieldwork": return "bg-orange-100 text-orange-800";
    case "reporting": return "bg-purple-100 text-purple-800";
    case "completed": return "bg-green-100 text-green-800";
    case "cancelled": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

export const getStatusText = (status: string) => {
  switch (status) {
    // Estados en español
    case "planificacion": return "Planificación";
    case "borrador": return "Borrador";
    case "en_revision": return "En Revisión";
    case "alcance_aprobado": return "Alcance Aprobado";
    case "en_ejecucion": return "En Ejecución";
    case "cierre_tecnico": return "Cierre Técnico";
    case "informe_preliminar": return "Informe Preliminar";
    case "informe_final": return "Informe Final";
    case "seguimiento": return "Seguimiento";
    case "trabajo_campo": return "Trabajo de Campo";
    case "reporte": return "Reporte";
    case "completado": return "Completada";
    case "cancelado": return "Cancelada";
    // Estados en inglés (compatibilidad) - traducir a español
    case "planned": return "Planificada";
    case "draft": return "Borrador";
    case "in_progress": return "En Progreso";
    case "fieldwork": return "Trabajo de Campo";
    case "reporting": return "Reportando";
    case "completed": return "Completada";
    case "cancelled": return "Cancelada";
    default: return status;
  }
};

export const getTypeText = (type: string) => {
  switch (type) {
    case "risk_based": return "Basada en Riesgos";
    case "compliance": return "Cumplimiento";
    case "operational": return "Operacional";
    case "financial": return "Financiera";
    default: return type;
  }
};
