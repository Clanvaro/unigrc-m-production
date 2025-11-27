import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, FileText } from "lucide-react";
import { AuditSectionContainer, AUDIT_SECTIONS } from "@/components/audit-sections";
import { getStatusColor, getStatusText } from "@/utils/audit-helpers";
import { queryKeys } from "@/lib/queryKeys";
import type { Audit } from "@shared/schema";

export default function AuditDetail() {
  const { auditId } = useParams<{ auditId: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState("dashboard");
  
  // Touch/swipe handling for mobile
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const { data: audit, isLoading, error } = useQuery<Audit>({
    queryKey: queryKeys.audits.detail(auditId),
    enabled: !!auditId,
  });

  // Handle swipe gestures for tab navigation on mobile
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let hasMoved = false;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchEndX = e.touches[0].clientX;
      hasMoved = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      touchEndX = e.touches[0].clientX;
      const moveDistance = Math.abs(touchStartX - touchEndX);
      
      // Mark as moved if there's significant movement
      if (moveDistance > 10) {
        hasMoved = true;
      }
    };

    const handleTouchEnd = () => {
      // Only process if there was actual movement
      if (!hasMoved || touchStartX === 0) {
        touchStartX = 0;
        touchEndX = 0;
        hasMoved = false;
        return;
      }
      
      const swipeDistanceX = touchStartX - touchEndX;
      const minSwipeDistance = 50;
      const currentIndex = AUDIT_SECTIONS.findIndex(s => s.id === activeSection);

      if (Math.abs(swipeDistanceX) > minSwipeDistance) {
        if (swipeDistanceX > 0 && currentIndex < AUDIT_SECTIONS.length - 1) {
          // Swipe left - go to next tab
          setActiveSection(AUDIT_SECTIONS[currentIndex + 1].id);
        } else if (swipeDistanceX < 0 && currentIndex > 0) {
          // Swipe right - go to previous tab
          setActiveSection(AUDIT_SECTIONS[currentIndex - 1].id);
        }
      }

      touchStartX = 0;
      touchEndX = 0;
      touchStartY = 0;
      hasMoved = false;
    };

    // Add listeners to document for better capture
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [activeSection]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>
              No se pudo cargar la auditoría. Es posible que no exista o no tengas permisos para verla.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const tabsPortalTarget = typeof document !== 'undefined' ? document.getElementById('audit-tabs-portal') : null;

  return (
    <>
      {/* Render complete audit header with tabs in header portal */}
      {tabsPortalTarget && createPortal(
        <div className="flex flex-col w-full">
          {/* First row: Back button + Audit info (responsive) */}
          <div className="flex items-center gap-3 mb-3 flex-wrap sm:flex-nowrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/audits")}
              data-testid="button-back-to-audits"
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap min-w-0">
              <FileText className="h-5 w-5 shrink-0" />
              <h1 className="text-lg sm:text-xl font-bold truncate">{audit.name}</h1>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="font-mono text-xs">
                  {audit.code}
                </Badge>
                <Badge className={`${getStatusColor(audit.status)} text-xs`}>
                  {getStatusText(audit.status)}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Second row: Tabs */}
          <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full -mb-2">
            <TabsList className="w-full justify-start rounded-none h-auto p-0 bg-transparent border-b-0 overflow-x-auto">
              {AUDIT_SECTIONS.map((section) => {
                const Icon = section.icon;
                return (
                  <TabsTrigger
                    key={section.id}
                    value={section.id}
                    className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-2 shrink-0"
                    data-testid={`tab-section-${section.id}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline text-sm">{section.title}</span>
                    <span className="sm:hidden text-xs">{section.title.split(' ')[0]}</span>
                    {section.badge && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        {section.badge}
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>,
        tabsPortalTarget
      )}
      
      {/* Contenido principal con AuditSectionContainer - sin header duplicado */}
      <div className="flex flex-col h-screen">
        <div className="flex-1 overflow-hidden">
          <AuditSectionContainer
            audit={audit}
            activeSection={activeSection}
            onUpdate={(updatedAudit) => {
              queryClient.setQueryData(queryKeys.audits.detail(auditId), updatedAudit);
              queryClient.setQueryData(["/api/audits"], (oldData: any) => {
                if (!oldData) return oldData;
                // Handle paginated response structure
                if (oldData.data && Array.isArray(oldData.data)) {
                  return {
                    ...oldData,
                    data: oldData.data.map((a: Audit) => a.id === updatedAudit.id ? updatedAudit : a)
                  };
                }
                // Fallback for direct array (backward compatibility)
                if (Array.isArray(oldData)) {
                  return oldData.map((a: Audit) => a.id === updatedAudit.id ? updatedAudit : a);
                }
                return oldData;
              });
            }}
          />
        </div>
      </div>
    </>
  );
}
