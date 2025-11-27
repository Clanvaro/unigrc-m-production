import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AUDIT_SECTIONS } from "./AuditSectionRegistry";
import type { Audit } from "@shared/schema";

interface AuditSectionSidebarProps {
  audit: Audit;
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
}

export function AuditSectionSidebar({ audit, activeSection, onSectionChange }: AuditSectionSidebarProps) {
  return (
    <div className="w-52 border-r bg-muted/10">
      <ScrollArea className="h-full py-4">
        <div className="space-y-1 px-2">
          {AUDIT_SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            
            return (
              <Button
                key={section.id}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2",
                  isActive && "bg-secondary font-medium"
                )}
                onClick={() => onSectionChange(section.id)}
                data-testid={`sidebar-section-${section.id}`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{section.title}</span>
                {section.badge && (
                  <span className="text-xs text-muted-foreground">
                    {section.badge}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
