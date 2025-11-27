import type { Audit, User } from "@shared/schema";

export interface AuditSectionProps {
  audit: Audit;
  onUpdate: (audit: Audit) => void;
  auditTeamUsers?: User[];
  getAuditorName?: (auditorId: string) => string;
}

export interface AuditSectionConfig {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType<AuditSectionProps>;
  order: number;
  badge?: string | number;
}
