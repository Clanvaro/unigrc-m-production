import { LayoutDashboard, ClipboardCheck, Scale, RefreshCw, Calendar, Target, FileWarning, MessageSquare, FileOutput, TrendingUp } from "lucide-react";
import type { AuditSectionConfig } from "./types";
import { AuditDashboardSection } from "./AuditDashboardSection";
import { AuditPlanGeneralSection } from "./AuditPlanGeneralSection";
import { AuditCriteriaSection } from "./AuditCriteriaSection";
import { AuditReEvaluationSection } from "./AuditReEvaluationSection";
import { AuditWorkProgramSection } from "./AuditWorkProgramSection";
import { AuditEvidenceSection } from "./AuditEvidenceSection";
import { AuditFindingsSection } from "./AuditFindingsSection";
import { AuditObservationsSection } from "./AuditObservationsSection";
import { AuditReportSection } from "./AuditReportSection";
import { AuditFollowUpSection } from "./AuditFollowUpSection";

export const AUDIT_SECTIONS: AuditSectionConfig[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    component: AuditDashboardSection,
    order: 1,
  },
  {
    id: "plan-general",
    title: "Plan General",
    icon: ClipboardCheck,
    component: AuditPlanGeneralSection,
    order: 2,
  },
  {
    id: "criteria",
    title: "Criterios",
    icon: Scale,
    component: AuditCriteriaSection,
    order: 3,
  },
  {
    id: "reevaluation",
    title: "Re-evaluación",
    icon: RefreshCw,
    component: AuditReEvaluationSection,
    order: 4,
  },
  {
    id: "workprogram",
    title: "Programa de Trabajo",
    icon: Calendar,
    component: AuditWorkProgramSection,
    order: 5,
  },
  {
    id: "evidence",
    title: "Pruebas de auditoría",
    icon: Target,
    component: AuditEvidenceSection,
    order: 6,
  },
  {
    id: "findings",
    title: "Hallazgos",
    icon: FileWarning,
    component: AuditFindingsSection,
    order: 7,
  },
  {
    id: "observations",
    title: "Observaciones",
    icon: MessageSquare,
    component: AuditObservationsSection,
    order: 8,
  },
  {
    id: "report",
    title: "Informe",
    icon: FileOutput,
    component: AuditReportSection,
    order: 9,
  },
  {
    id: "followup",
    title: "Seguimiento",
    icon: TrendingUp,
    component: AuditFollowUpSection,
    order: 10,
  },
];

export function getAuditSection(id: string): AuditSectionConfig | undefined {
  return AUDIT_SECTIONS.find(section => section.id === id);
}
