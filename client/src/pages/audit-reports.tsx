import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import jsPDF from "jspdf";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveTable, ResponsiveTableContent, ResponsiveTableBody, ResponsiveTableCell, ResponsiveTableHead, ResponsiveTableHeader, ResponsiveTableRow } from "@/components/ui/responsive-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Calendar, 
  Users, 
  FileText, 
  AlertTriangle, 
  Target, 
  Clock,
  CheckCircle,
  Eye,
  Download,
  User,
  Building2,
  Settings,
  ArrowLeft
} from "lucide-react";
import type { 
  Audit, 
  AuditFinding, 
  User as UserType, 
  Process, 
  Subproceso, 
  Macroproceso,
  AuditTest
} from "@shared/schema";

export default function AuditReports() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);

  // Fetch audits
  const { data: audits = [], isLoading: auditsLoading } = useQuery<Audit[]>({
    queryKey: ["/api/audits"],
    select: (data: any) => data.data || []
  });

  // Fetch audit findings for selected audit
  const { data: auditFindings = [], isLoading: findingsLoading } = useQuery<AuditFinding[]>({
    queryKey: ["/api/audit-findings"],
    enabled: !!selectedAudit,
  });


  // Fetch processes and macroprocesos
  const { data: processes = [] } = useQuery<Process[]>({
    queryKey: ["/api/processes"],
  });

  const { data: macroprocesos = [] } = useQuery<Macroproceso[]>({
    queryKey: ["/api/macroprocesos"],
  });

  const { data: subprocesos = [] } = useQuery<Subproceso[]>({
    queryKey: ["/api/subprocesos"],
  });

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  // Fetch all actions (we'll filter later)
  const { data: allActions = [] } = useQuery<any[]>({
    queryKey: ["/api/actions"],
    enabled: !!selectedAudit,
  });

  // Filter audits based on search and status
  const filteredAudits = audits.filter((audit) => {
    const matchesSearch = audit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         audit.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || audit.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get related findings for selected audit
  const relatedFindings = selectedAudit 
    ? auditFindings.filter((finding) => finding.auditId === selectedAudit.id)
    : [];


  // Get audit commitments (actions with origin='audit' related to findings)
  const auditCommitments = allActions.filter((action: any) => 
    action.origin === 'audit' && 
    relatedFindings.some(finding => finding.id === action.auditFindingId)
  );

  // Helper functions
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      "planned": { label: "Planificada", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
      "in_progress": { label: "En Progreso", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
      "completed": { label: "Completada", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
      "cancelled": { label: "Cancelada", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.planned;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      "low": { label: "Baja", className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300" },
      "medium": { label: "Media", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
      "high": { label: "Alta", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
      "critical": { label: "Crítica", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" }
    };
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user ? user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username : "No asignado";
  };

  const getProcessName = (processId: string) => {
    const process = processes.find((p) => p.id === processId);
    return process ? process.name : "Proceso no encontrado";
  };

  const getMacroprocesoName = (macroprocesoId: string) => {
    const macroproceso = macroprocesos.find((m) => m.id === macroprocesoId);
    return macroproceso ? macroproceso.name : "Macroproceso no encontrado";
  };

  const getSubprocesoName = (subprocesoId: string) => {
    const subproceso = subprocesos.find((s) => s.id === subprocesoId);
    return subproceso ? subproceso.name : "Subproceso no encontrado";
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "No definido";
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return date.toLocaleDateString('es-ES');
    } catch {
      return "Fecha inválida";
    }
  };

  const parseAuditTeam = (auditTeam: string | string[] | null): string[] => {
    if (!auditTeam) return [];
    if (Array.isArray(auditTeam)) return auditTeam;
    if (typeof auditTeam === 'string') {
      try {
        const parsed = JSON.parse(auditTeam);
        return Array.isArray(parsed) ? parsed : [auditTeam];
      } catch {
        return auditTeam.split(',').map(member => member.trim()).filter(Boolean);
      }
    }
    return [];
  };

  const parseObjectives = (objectives: string | string[] | null): string[] => {
    if (!objectives) return [];
    if (Array.isArray(objectives)) return objectives;
    if (typeof objectives === 'string') {
      try {
        const parsed = JSON.parse(objectives);
        return Array.isArray(parsed) ? parsed : [objectives];
      } catch {
        return [objectives];
      }
    }
    return [];
  };

  const generatePDF = () => {
    if (!selectedAudit) return;
    
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 20;
    let yPosition = margin;
    
    // Configurar fuentes
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    
    // Título principal
    pdf.text("Informe de Auditoría", margin, yPosition);
    yPosition += 10;
    
    pdf.setFontSize(14);
    pdf.text(selectedAudit.name, margin, yPosition);
    yPosition += 15;
    
    // Información general
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("INFORMACIÓN GENERAL", margin, yPosition);
    yPosition += 8;
    
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Código: ${selectedAudit.code}`, margin, yPosition);
    yPosition += 6;
    pdf.text(`Tipo: ${selectedAudit.type}`, margin, yPosition);
    yPosition += 6;
    pdf.text(`Estado: ${selectedAudit.status}`, margin, yPosition);
    yPosition += 6;
    pdf.text(`Fecha Inicio: ${formatDate(selectedAudit.plannedStartDate)}`, margin, yPosition);
    yPosition += 6;
    pdf.text(`Fecha Fin: ${formatDate(selectedAudit.plannedEndDate)}`, margin, yPosition);
    yPosition += 15;
    
    // Alcance
    if (selectedAudit.scope) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text("ALCANCE", margin, yPosition);
      yPosition += 8;
      
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      const scopeLines = pdf.splitTextToSize(selectedAudit.scope, pageWidth - 2 * margin);
      scopeLines.forEach((line: string) => {
        if (yPosition > pageHeight - 30) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(line, margin, yPosition);
        yPosition += 6;
      });
      yPosition += 10;
    }
    
    // Objetivos
    const auditObjectives = parseObjectives(selectedAudit.objectives);
    if (auditObjectives.length > 0) {
      if (yPosition > pageHeight - 50) {
        pdf.addPage();
        yPosition = margin;
      }
      
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text("OBJETIVOS", margin, yPosition);
      yPosition += 8;
      
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      auditObjectives.forEach((objective, index) => {
        if (yPosition > pageHeight - 30) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(`${index + 1}. ${objective}`, margin, yPosition);
        yPosition += 6;
      });
      yPosition += 10;
    }
    
    // Equipo auditor
    if (yPosition > pageHeight - 50) {
      pdf.addPage();
      yPosition = margin;
    }
    
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("EQUIPO AUDITOR", margin, yPosition);
    yPosition += 8;
    
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Auditor Líder: ${selectedAudit.leadAuditor ? getUserName(selectedAudit.leadAuditor) : "No asignado"}`, margin, yPosition);
    yPosition += 6;
    
    const auditTeamMembers = parseAuditTeam(selectedAudit.auditTeam);
    if (auditTeamMembers.length > 0) {
      pdf.text("Miembros del Equipo:", margin, yPosition);
      yPosition += 6;
      auditTeamMembers.forEach((memberId) => {
        if (yPosition > pageHeight - 30) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(`• ${getUserName(memberId)}`, margin + 5, yPosition);
        yPosition += 6;
      });
    }
    yPosition += 10;
    
    // Procesos auditados
    if (selectedAudit.processId || selectedAudit.subprocesoId) {
      if (yPosition > pageHeight - 30) {
        pdf.addPage();
        yPosition = margin;
      }
      
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text("PROCESOS AUDITADOS", margin, yPosition);
      yPosition += 8;
      
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      if (selectedAudit.processId) {
        pdf.text(`Proceso: ${getProcessName(selectedAudit.processId)}`, margin, yPosition);
        yPosition += 6;
      }
      if (selectedAudit.subprocesoId) {
        pdf.text(`Subproceso: ${getSubprocesoName(selectedAudit.subprocesoId)}`, margin, yPosition);
        yPosition += 6;
      }
      yPosition += 10;
    }
    
    // Hallazgos detallados
    if (relatedFindings.length > 0) {
      if (yPosition > pageHeight - 50) {
        pdf.addPage();
        yPosition = margin;
      }
      
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text(`HALLAZGOS DE AUDITORÍA (${relatedFindings.length})`, margin, yPosition);
      yPosition += 10;
      
      relatedFindings.forEach((finding, index) => {
        if (yPosition > pageHeight - 80) {
          pdf.addPage();
          yPosition = margin;
        }
        
        // Título del hallazgo
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.text(`${index + 1}. ${finding.title}`, margin, yPosition);
        yPosition += 8;
        
        // Información básica
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.text(`Código: ${finding.code}`, margin + 5, yPosition);
        yPosition += 5;
        pdf.text(`Tipo: ${finding.type} | Severidad: ${finding.severity || "Media"} | Estado: ${finding.status}`, margin + 5, yPosition);
        yPosition += 5;
        pdf.text(`Responsable: ${finding.responsiblePerson || "No asignado"} | Fecha Límite: ${formatDate(finding.dueDate)}`, margin + 5, yPosition);
        yPosition += 8;
        
        // Descripción
        if (finding.description) {
          pdf.setFont("helvetica", "bold");
          pdf.text("Descripción:", margin + 5, yPosition);
          yPosition += 5;
          pdf.setFont("helvetica", "normal");
          const descLines = pdf.splitTextToSize(finding.description, pageWidth - 2 * margin - 10);
          descLines.forEach((line: string) => {
            if (yPosition > pageHeight - 20) {
              pdf.addPage();
              yPosition = margin;
            }
            pdf.text(line, margin + 10, yPosition);
            yPosition += 4;
          });
          yPosition += 3;
        }
        
        // Condición
        if (finding.condition) {
          pdf.setFont("helvetica", "bold");
          pdf.text("Condición:", margin + 5, yPosition);
          yPosition += 5;
          pdf.setFont("helvetica", "normal");
          const condLines = pdf.splitTextToSize(finding.condition, pageWidth - 2 * margin - 10);
          condLines.forEach((line: string) => {
            if (yPosition > pageHeight - 20) {
              pdf.addPage();
              yPosition = margin;
            }
            pdf.text(line, margin + 10, yPosition);
            yPosition += 4;
          });
          yPosition += 3;
        }
        
        // Criterio
        if (finding.criteria) {
          pdf.setFont("helvetica", "bold");
          pdf.text("Criterio:", margin + 5, yPosition);
          yPosition += 5;
          pdf.setFont("helvetica", "normal");
          const critLines = pdf.splitTextToSize(finding.criteria, pageWidth - 2 * margin - 10);
          critLines.forEach((line: string) => {
            if (yPosition > pageHeight - 20) {
              pdf.addPage();
              yPosition = margin;
            }
            pdf.text(line, margin + 10, yPosition);
            yPosition += 4;
          });
          yPosition += 3;
        }
        
        // Causa
        if (finding.cause) {
          pdf.setFont("helvetica", "bold");
          pdf.text("Causa:", margin + 5, yPosition);
          yPosition += 5;
          pdf.setFont("helvetica", "normal");
          const causeLines = pdf.splitTextToSize(finding.cause, pageWidth - 2 * margin - 10);
          causeLines.forEach((line: string) => {
            if (yPosition > pageHeight - 20) {
              pdf.addPage();
              yPosition = margin;
            }
            pdf.text(line, margin + 10, yPosition);
            yPosition += 4;
          });
          yPosition += 3;
        }
        
        // Efecto
        if (finding.effect) {
          pdf.setFont("helvetica", "bold");
          pdf.text("Efecto:", margin + 5, yPosition);
          yPosition += 5;
          pdf.setFont("helvetica", "normal");
          const effectLines = pdf.splitTextToSize(finding.effect, pageWidth - 2 * margin - 10);
          effectLines.forEach((line: string) => {
            if (yPosition > pageHeight - 20) {
              pdf.addPage();
              yPosition = margin;
            }
            pdf.text(line, margin + 10, yPosition);
            yPosition += 4;
          });
          yPosition += 3;
        }
        
        // Recomendación
        if (finding.recommendation) {
          pdf.setFont("helvetica", "bold");
          pdf.text("Recomendación:", margin + 5, yPosition);
          yPosition += 5;
          pdf.setFont("helvetica", "normal");
          const recLines = pdf.splitTextToSize(finding.recommendation, pageWidth - 2 * margin - 10);
          recLines.forEach((line: string) => {
            if (yPosition > pageHeight - 20) {
              pdf.addPage();
              yPosition = margin;
            }
            pdf.text(line, margin + 10, yPosition);
            yPosition += 4;
          });
          yPosition += 3;
        }
        
        // Respuesta de la administración
        if (finding.managementResponse) {
          pdf.setFont("helvetica", "bold");
          pdf.text("Respuesta de la Administración:", margin + 5, yPosition);
          yPosition += 5;
          pdf.setFont("helvetica", "normal");
          const mgmtLines = pdf.splitTextToSize(finding.managementResponse, pageWidth - 2 * margin - 10);
          mgmtLines.forEach((line: string) => {
            if (yPosition > pageHeight - 20) {
              pdf.addPage();
              yPosition = margin;
            }
            pdf.text(line, margin + 10, yPosition);
            yPosition += 4;
          });
          yPosition += 3;
        }
        
        // Acción acordada
        if (finding.agreedAction) {
          pdf.setFont("helvetica", "bold");
          pdf.text("Acción Acordada:", margin + 5, yPosition);
          yPosition += 5;
          pdf.setFont("helvetica", "normal");
          const actionLines = pdf.splitTextToSize(finding.agreedAction, pageWidth - 2 * margin - 10);
          actionLines.forEach((line: string) => {
            if (yPosition > pageHeight - 20) {
              pdf.addPage();
              yPosition = margin;
            }
            pdf.text(line, margin + 10, yPosition);
            yPosition += 4;
          });
          yPosition += 3;
        }
        
        yPosition += 8; // Espacio entre hallazgos
      });
      yPosition += 5;
    }
    
    // Compromisos de auditoría
    if (auditCommitments.length > 0) {
      if (yPosition > pageHeight - 50) {
        pdf.addPage();
        yPosition = margin;
      }
      
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text(`COMPROMISOS DE AUDITORÍA (${auditCommitments.length})`, margin, yPosition);
      yPosition += 10;
      
      auditCommitments.forEach((commitment: any, index: number) => {
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = margin;
        }
        
        // Título del compromiso
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.text(`${index + 1}. ${commitment.title}`, margin, yPosition);
        yPosition += 8;
        
        // Información básica
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.text(`Código: ${commitment.code}`, margin + 5, yPosition);
        yPosition += 5;
        pdf.text(`Prioridad: ${commitment.priority} | Estado: ${commitment.status} | Progreso: ${commitment.progress}%`, margin + 5, yPosition);
        yPosition += 5;
        pdf.text(`Responsable: ${getUserName(commitment.responsible)} | Fecha Límite: ${formatDate(commitment.dueDate)}`, margin + 5, yPosition);
        yPosition += 8;
        
        // Descripción
        if (commitment.description) {
          pdf.setFont("helvetica", "bold");
          pdf.text("Descripción:", margin + 5, yPosition);
          yPosition += 5;
          pdf.setFont("helvetica", "normal");
          const descLines = pdf.splitTextToSize(commitment.description, pageWidth - 2 * margin - 10);
          descLines.forEach((line: string) => {
            if (yPosition > pageHeight - 20) {
              pdf.addPage();
              yPosition = margin;
            }
            pdf.text(line, margin + 10, yPosition);
            yPosition += 4;
          });
          yPosition += 3;
        }
        
        // Respuesta de la administración
        if (commitment.managementResponse) {
          pdf.setFont("helvetica", "bold");
          pdf.text("Respuesta de la Administración:", margin + 5, yPosition);
          yPosition += 5;
          pdf.setFont("helvetica", "normal");
          const mgmtLines = pdf.splitTextToSize(commitment.managementResponse, pageWidth - 2 * margin - 10);
          mgmtLines.forEach((line: string) => {
            if (yPosition > pageHeight - 20) {
              pdf.addPage();
              yPosition = margin;
            }
            pdf.text(line, margin + 10, yPosition);
            yPosition += 4;
          });
          yPosition += 3;
        }
        
        // Acción acordada
        if (commitment.agreedAction) {
          pdf.setFont("helvetica", "bold");
          pdf.text("Acción Acordada:", margin + 5, yPosition);
          yPosition += 5;
          pdf.setFont("helvetica", "normal");
          const actionLines = pdf.splitTextToSize(commitment.agreedAction, pageWidth - 2 * margin - 10);
          actionLines.forEach((line: string) => {
            if (yPosition > pageHeight - 20) {
              pdf.addPage();
              yPosition = margin;
            }
            pdf.text(line, margin + 10, yPosition);
            yPosition += 4;
          });
          yPosition += 3;
        }
        
        yPosition += 8; // Espacio entre compromisos
      });
      yPosition += 5;
    }
    
    // Estadísticas
    if (yPosition > pageHeight - 40) {
      pdf.addPage();
      yPosition = margin;
    }
    
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("RESUMEN EJECUTIVO", margin, yPosition);
    yPosition += 8;
    
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Total de Hallazgos: ${relatedFindings.length}`, margin, yPosition);
    yPosition += 6;
    pdf.text(`Total de Compromisos: ${auditCommitments.length}`, margin, yPosition);
    yPosition += 6;
    
    // Distribución por severidad
    const severityCount = relatedFindings.reduce((acc: any, finding) => {
      const severity = finding.severity || 'media';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {});
    
    if (Object.keys(severityCount).length > 0) {
      yPosition += 4;
      pdf.text("Distribución por Severidad:", margin, yPosition);
      yPosition += 6;
      Object.entries(severityCount).forEach(([severity, count]) => {
        pdf.text(`  • ${severity}: ${count}`, margin + 10, yPosition);
        yPosition += 5;
      });
    }
    
    // Estado de compromisos
    const commitmentStatus = auditCommitments.reduce((acc: any, commitment) => {
      const status = commitment.status || 'pending';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    if (Object.keys(commitmentStatus).length > 0) {
      yPosition += 4;
      pdf.text("Estado de Compromisos:", margin, yPosition);
      yPosition += 6;
      Object.entries(commitmentStatus).forEach(([status, count]) => {
        pdf.text(`  • ${status}: ${count}`, margin + 10, yPosition);
        yPosition += 5;
      });
    }
    
    // Pie de página
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.text(`Página ${i} de ${pageCount}`, pageWidth - 40, pageHeight - 10);
      pdf.text(`Generado el ${new Date().toLocaleDateString('es-ES')}`, margin, pageHeight - 10);
    }
    
    // Descargar el PDF
    const fileName = `Informe_Auditoria_${selectedAudit.code}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  };

  if (selectedAudit) {
    const auditTeamMembers = parseAuditTeam(selectedAudit.auditTeam);
    const auditObjectives = parseObjectives(selectedAudit.objectives);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => setSelectedAudit(null)}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a la lista
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Informe de Auditoría</h1>
              <p className="text-muted-foreground">{selectedAudit.name}</p>
            </div>
          </div>
          <Button 
            onClick={generatePDF}
            data-testid="button-download"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Resumen Ejecutivo</TabsTrigger>
            <TabsTrigger value="scope">Alcance y Objetivos</TabsTrigger>
            <TabsTrigger value="team">Equipo Auditor</TabsTrigger>
            <TabsTrigger value="processes">Procesos Auditados</TabsTrigger>
            <TabsTrigger value="findings">Hallazgos</TabsTrigger>
          </TabsList>

          {/* Resumen Ejecutivo */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Información General
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Código</p>
                      <p className="font-medium" data-testid="text-audit-code">{selectedAudit.code}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                      <p className="font-medium" data-testid="text-audit-type">{selectedAudit.type}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Estado</p>
                      {getStatusBadge(selectedAudit.status)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Prioridad</p>
                      {getPriorityBadge(selectedAudit.priority || "medium")}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Fecha Inicio Planificada</p>
                      <p className="font-medium">{formatDate(selectedAudit.plannedStartDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Fecha Fin Planificada</p>
                      <p className="font-medium">{formatDate(selectedAudit.plannedEndDate)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Estadísticas del Informe
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary" data-testid="text-findings-count">
                        {relatedFindings.length}
                      </p>
                      <p className="text-sm text-muted-foreground">Hallazgos Identificados</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Período de Revisión</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fecha Inicio Período</p>
                    <p className="font-medium">{formatDate(selectedAudit.reviewPeriodStartDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fecha Fin Período</p>
                    <p className="font-medium">{formatDate(selectedAudit.reviewPeriodEndDate)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alcance y Objetivos */}
          <TabsContent value="scope" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Alcance de la Auditoría
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none">
                  <p data-testid="text-audit-scope">{selectedAudit.scope || "No definido"}</p>
                </div>
              </CardContent>
            </Card>

            {auditObjectives.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Objetivos de la Auditoría</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-2">
                    {auditObjectives.map((objective: string, index: number) => (
                      <li key={index} className="text-sm" data-testid={`text-objective-${index}`}>
                        {objective}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {selectedAudit.scopeEntities && (
              <Card>
                <CardHeader>
                  <CardTitle>Entidades en Alcance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      try {
                        const entities = JSON.parse(selectedAudit.scopeEntities!) as string[];
                        return Array.isArray(entities) ? entities.map((entity: string, index: number) => (
                          <Badge key={index} variant="outline" data-testid={`badge-entity-${index}`}>
                            {entity}
                          </Badge>
                        )) : null;
                      } catch {
                        return null;
                      }
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Equipo Auditor */}
          <TabsContent value="team" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Equipo Auditor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Auditor Líder</p>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium" data-testid="text-lead-auditor">
                      {selectedAudit.leadAuditor ? getUserName(selectedAudit.leadAuditor) : "No asignado"}
                    </span>
                  </div>
                </div>

                {auditTeamMembers.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Miembros del Equipo</p>
                    <div className="space-y-2">
                      {auditTeamMembers.map((memberId: string, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span data-testid={`text-team-member-${index}`}>{getUserName(memberId)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Procesos Auditados */}
          <TabsContent value="processes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Procesos y Subprocesos Auditados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedAudit.processId && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Proceso Principal</p>
                    <Badge variant="outline" className="text-sm" data-testid="badge-main-process">
                      {getProcessName(selectedAudit.processId)}
                    </Badge>
                  </div>
                )}

                {selectedAudit.subprocesoId && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Subproceso</p>
                    <Badge variant="outline" className="text-sm" data-testid="badge-subprocess">
                      {getSubprocesoName(selectedAudit.subprocesoId)}
                    </Badge>
                  </div>
                )}

                {!selectedAudit.processId && !selectedAudit.subprocesoId && (
                  <p className="text-muted-foreground italic">No se han especificado procesos específicos</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hallazgos */}
          <TabsContent value="findings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Hallazgos de Auditoría ({relatedFindings.length})
                </CardTitle>
                <CardDescription>
                  Hallazgos identificados durante la ejecución de la auditoría
                </CardDescription>
              </CardHeader>
              <CardContent>
                {relatedFindings.length > 0 ? (
                  <ResponsiveTable>
                    <ResponsiveTableContent>
                      <ResponsiveTableHeader>
                        <ResponsiveTableRow>
                          <ResponsiveTableHead>Código</ResponsiveTableHead>
                          <ResponsiveTableHead>Título</ResponsiveTableHead>
                          <ResponsiveTableHead>Tipo</ResponsiveTableHead>
                          <ResponsiveTableHead>Severidad</ResponsiveTableHead>
                          <ResponsiveTableHead>Estado</ResponsiveTableHead>
                          <ResponsiveTableHead>Responsable</ResponsiveTableHead>
                          <ResponsiveTableHead>Fecha Límite</ResponsiveTableHead>
                        </ResponsiveTableRow>
                      </ResponsiveTableHeader>
                      <ResponsiveTableBody>
                        {relatedFindings.map((finding) => (
                          <ResponsiveTableRow key={finding.id} data-testid={`row-finding-${finding.id}`}>
                            <ResponsiveTableCell className="font-mono text-sm">
                              {finding.code}
                            </ResponsiveTableCell>
                            <ResponsiveTableCell className="font-medium">
                              {finding.title}
                            </ResponsiveTableCell>
                            <ResponsiveTableCell>
                              <Badge variant="outline">{finding.type}</Badge>
                            </ResponsiveTableCell>
                            <ResponsiveTableCell>
                              {getPriorityBadge(finding.severity || "medium")}
                            </ResponsiveTableCell>
                            <ResponsiveTableCell>
                              {getStatusBadge(finding.status)}
                            </ResponsiveTableCell>
                            <ResponsiveTableCell>
                              {finding.responsiblePerson || "No asignado"}
                            </ResponsiveTableCell>
                            <ResponsiveTableCell>
                              <p>{formatDate(finding.dueDate)}</p>
                            </ResponsiveTableCell>
                          </ResponsiveTableRow>
                        ))}
                      </ResponsiveTableBody>
                    </ResponsiveTableContent>
                  </ResponsiveTable>
                ) : (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No se han registrado hallazgos para esta auditoría</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    );
  }

  // Lista principal de auditorías
  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search"
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="planned">Planificada</SelectItem>
                <SelectItem value="in_progress">En Progreso</SelectItem>
                <SelectItem value="completed">Completada</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de auditorías */}
      <Card>
        <CardHeader>
          <CardTitle>Auditorías Disponibles</CardTitle>
          <CardDescription>
            Listado de auditorías para generar informes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {auditsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredAudits.length > 0 ? (
            <ResponsiveTable>
              <ResponsiveTableContent>
                <ResponsiveTableHeader>
                  <ResponsiveTableRow>
                    <ResponsiveTableHead>Código</ResponsiveTableHead>
                    <ResponsiveTableHead>Nombre</ResponsiveTableHead>
                    <ResponsiveTableHead>Tipo</ResponsiveTableHead>
                    <ResponsiveTableHead>Estado</ResponsiveTableHead>
                    <ResponsiveTableHead>Auditor Líder</ResponsiveTableHead>
                    <ResponsiveTableHead>Fecha Inicio</ResponsiveTableHead>
                    <ResponsiveTableHead>Acciones</ResponsiveTableHead>
                  </ResponsiveTableRow>
                </ResponsiveTableHeader>
                <ResponsiveTableBody>
                  {filteredAudits.map((audit) => (
                    <ResponsiveTableRow key={audit.id} data-testid={`row-audit-${audit.id}`}>
                      <ResponsiveTableCell className="font-mono text-sm">
                        {audit.code}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell className="font-medium">
                        {audit.name}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell>
                        <Badge variant="outline">{audit.type}</Badge>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell>
                        {getStatusBadge(audit.status)}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell>
                        {audit.leadAuditor ? getUserName(audit.leadAuditor) : "No asignado"}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell>
                        <p>{formatDate(audit.plannedStartDate)}</p>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAudit(audit)}
                          data-testid={`button-view-report-${audit.id}`}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Informe
                        </Button>
                      </ResponsiveTableCell>
                    </ResponsiveTableRow>
                  ))}
                </ResponsiveTableBody>
              </ResponsiveTableContent>
            </ResponsiveTable>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" 
                  ? "No se encontraron auditorías que coincidan con los filtros"
                  : "No hay auditorías disponibles"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}