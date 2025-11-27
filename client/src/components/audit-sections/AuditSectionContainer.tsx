import type { Audit } from "@shared/schema";
import { getAuditSection } from "./AuditSectionRegistry";

interface AuditSectionContainerProps {
  audit: Audit;
  activeSection: string;
  onUpdate: (audit: Audit) => void;
}

export function AuditSectionContainer({ audit, activeSection, onUpdate }: AuditSectionContainerProps) {
  const sectionConfig = getAuditSection(activeSection);
  if (!sectionConfig) {
    return <div>Sección no encontrada</div>;
  }

  const SectionComponent = sectionConfig.component;

  return (
    <div className="flex flex-col h-full">
      {/* Contenido de la sección */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 sm:p-4 md:p-6">
          <SectionComponent audit={audit} onUpdate={onUpdate} />
        </div>
      </div>
    </div>
  );
}
