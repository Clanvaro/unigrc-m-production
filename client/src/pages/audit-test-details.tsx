import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  FileText, 
  Clock, 
  User, 
  Calendar, 
  Target, 
  CheckCircle, 
  AlertTriangle,
  Play,
  Pause,
  Save,
  Upload,
  MessageSquare,
  Activity,
  X,
  Filter,
  FileEdit,
  FileX,
  ExternalLink,
  Trash2,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AuditTestAttachmentManager, AuditTestAttachmentUploader } from "@/components/audit-attachments";
import { AuditFindingFormTabs } from "./audit-findings-form-tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAuditFindingSchema } from "@shared/schema";
import { z } from "zod";

interface AuditTest {
  id: string;
  auditId: string;
  code: string;
  name: string;
  description: string;
  objectives: string[];
  scope: string;
  testProcedures: string[];
  sampleSize: number;
  expectedResults: string[];
  status: string;
  priority: string;
  executorId?: string;
  supervisorId?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  estimatedHours: number;
  progress: number;
  conclusions?: string;
  evaluationCriteria?: string[];
  methodologies?: string[];
  tools?: string[];
  approvalStatus?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface AuditTestWithDetails extends AuditTest {
  audit?: {
    id: string;
    name: string;
    code: string;
    leadAuditor: string;
  };
  executor?: {
    id: string;
    fullName: string;
    email: string;
  };
  supervisor?: {
    id: string;
    fullName: string;
    email: string;
  };
  risk?: {
    id: string;
    code: string;
    name: string;
  };
  auditRisk?: {
    id: string;
    code?: string;
    name: string;
  };
  control?: {
    id: string;
    code: string;
    name: string;
  };
  workLogs?: Array<{
    id: string;
    entryDate: string;
    hoursWorked: number;
    workDescription: string;
    createdBy: string;
    createdAt: string;
  }>;
  progressHistory?: Array<{
    id: string;
    fromStatus: string;
    toStatus: string;
    changedBy: string;
    changeDate: string;
    comments: string;
  }>;
  totalHoursWorked?: number;
  lastWorkLogDate?: string;
}

const STATUS_COLORS: Record<string, string> = {
  'draft': 'bg-gray-100 text-gray-800',
  'planned': 'bg-slate-100 text-slate-800',
  'assigned': 'bg-blue-100 text-blue-800',
  'in_progress': 'bg-yellow-100 text-yellow-800',
  'under_review': 'bg-purple-100 text-purple-800',
  'completed': 'bg-green-100 text-green-800',
  'rejected': 'bg-red-100 text-red-800'
};

interface DependenciesResponse {
  hasAttachments: boolean;
  attachmentCount: number;
  canDelete: boolean;
  warnings: string[];
}

const STATUS_LABELS: Record<string, string> = {
  'draft': 'Borrador',
  'planned': 'Planificado',
  'assigned': 'Asignado',
  'in_progress': 'En Progreso',
  'under_review': 'En Revisión',
  'completed': 'Completado',
  'rejected': 'Rechazado'
};

// Audit finding form schema
const auditFindingFormSchema = insertAuditFindingSchema.extend({
  dueDate: z.string().optional(),
});

type AuditFindingFormData = z.infer<typeof auditFindingFormSchema>;

// Workflow-specific attachment components
interface WorkflowAttachmentViewProps {
  auditTestId: string;
  workflowStage: string;
  allowUpload?: boolean;
  allowEdit?: boolean;
  title: string;
  description: string;
  onUploadClick?: (workflowStage: string) => void;
}

function WorkflowAttachmentView({ 
  auditTestId, 
  workflowStage, 
  allowUpload = false, 
  allowEdit = false, 
  title, 
  description,
  onUploadClick
}: WorkflowAttachmentViewProps) {
  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['/api/audit-tests', auditTestId, 'attachments', 'workflow', workflowStage],
    queryFn: async () => {
      const response = await fetch(`/api/audit-tests/${auditTestId}/attachments?workflowStage=${workflowStage}`);
      if (!response.ok) throw new Error('Failed to fetch workflow attachments');
      return response.json();
    },
  });

  return (
    <div className="space-y-4">
      <div className="text-center p-6 border-2 border-dashed border-muted-foreground/25 rounded-lg">
        <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <h3 className="font-medium mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-1/2 mx-auto mb-2" />
            <div className="h-3 bg-muted rounded w-1/3 mx-auto" />
          </div>
        ) : attachments.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">{attachments.length} archivo(s) encontrado(s)</p>
            <div className="flex flex-wrap gap-1 justify-center">
              {attachments.slice(0, 3).map((attachment: any) => (
                <Badge key={attachment.id} variant="outline" className="text-xs">
                  {attachment.fileName.substring(0, 15)}...
                </Badge>
              ))}
              {attachments.length > 3 && (
                <Badge variant="secondary" className="text-xs">+{attachments.length - 3} más</Badge>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No hay archivos en esta etapa</p>
        )}
        
        {allowUpload && (
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3" 
            onClick={() => onUploadClick?.(workflowStage)}
            data-testid={`upload-${workflowStage}`}
          >
            <Upload className="h-4 w-4 mr-2" />
            Subir Archivo
          </Button>
        )}
      </div>
    </div>
  );
}

interface ProgressMilestoneViewProps {
  auditTestId: string;
  currentProgress: number;
  allowUpload?: boolean;
  onUploadClick?: (milestoneIndex: number) => void;
}

function ProgressMilestoneView({ auditTestId, currentProgress, allowUpload = false, onUploadClick }: ProgressMilestoneViewProps) {
  const milestones = [
    { range: [0, 25], label: 'Inicio (0-25%)', color: 'bg-red-100 text-red-800' },
    { range: [25, 50], label: 'Desarrollo (25-50%)', color: 'bg-yellow-100 text-yellow-800' },
    { range: [50, 75], label: 'Avanzado (50-75%)', color: 'bg-blue-100 text-blue-800' },
    { range: [75, 100], label: 'Finalización (75-100%)', color: 'bg-green-100 text-green-800' }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {milestones.map((milestone, index) => {
          const isActive = currentProgress >= milestone.range[0] && currentProgress < milestone.range[1];
          const isCompleted = currentProgress >= milestone.range[1];
          
          return (
            <Card key={index} className={`${isActive ? 'ring-2 ring-primary' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge className={milestone.color}>
                    {milestone.label}
                  </Badge>
                  {isCompleted && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {isActive && <Target className="h-4 w-4 text-primary" />}
                </div>
                
                <div className="text-center p-4 border border-dashed rounded">
                  <FileText className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground mb-2">
                    Evidencia de {milestone.label.toLowerCase()}
                  </p>
                  {isActive && allowUpload ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onUploadClick?.(index)}
                      data-testid={`upload-milestone-${index}`}
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Adjuntar
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      {isCompleted ? 'Etapa completada' : isActive ? 'Etapa actual' : 'Pendiente'}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

interface ReviewAttachmentManagerProps {
  auditTestId: string;
  auditTestStatus: string;
  supervisor?: {
    id: string;
    fullName: string;
    email: string;
  };
  allowUpload?: boolean;
  onUploadClick?: (category: string) => void;
}

function ReviewAttachmentManager({ auditTestId, auditTestStatus, supervisor, allowUpload = false, onUploadClick }: ReviewAttachmentManagerProps) {
  return (
    <div className="space-y-4">
      {supervisor ? (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium">{supervisor.fullName}</p>
                  <p className="text-xs text-muted-foreground">{supervisor.email}</p>
                </div>
              </div>
              <Badge variant={auditTestStatus === 'under_review' ? 'default' : 'secondary'}>
                {auditTestStatus === 'under_review' ? 'Revisando' : 'Supervisor Asignado'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <User className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No hay supervisor asignado</p>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Documentos del Executor</CardTitle>
            <p className="text-sm text-muted-foreground">Evidencia y documentos enviados para revisión</p>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-center p-6 border-2 border-dashed border-muted-foreground/25 rounded-lg">
              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Documentos enviados para revisión</p>
              <Badge variant="outline" className="mt-2">En desarrollo</Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Retroalimentación del Supervisor</CardTitle>
            <p className="text-sm text-muted-foreground">Comentarios y documentos de retroalimentación</p>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-center p-6 border-2 border-dashed border-muted-foreground/25 rounded-lg">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              {allowUpload ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Adjuntar documentos de retroalimentación</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onUploadClick?.('communication')}
                    data-testid="upload-supervisor-feedback"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Subir Retroalimentación
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">Retroalimentación del supervisor</p>
                  <Badge variant="outline" className="mt-2">No disponible aún</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface ReviewCommentsSectionProps {
  auditTestId: string;
  supervisor?: {
    id: string;
    fullName: string;
    email: string;
  };
  status: string;
}

function ReviewCommentsSection({ auditTestId, supervisor, status }: ReviewCommentsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Proceso de Revisión</h3>
          <p className="text-sm text-muted-foreground">Comentarios y retroalimentación del supervisor</p>
        </div>
        <Badge variant={status === 'under_review' ? 'default' : status === 'completed' ? 'secondary' : 'outline'}>
          {STATUS_LABELS[status] || status}
        </Badge>
      </div>
      
      {supervisor && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <p className="font-medium">{supervisor.fullName}</p>
                <p className="text-xs text-muted-foreground">Supervisor de Revisión</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comentarios de Revisión</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">Sistema de Comentarios</h3>
            <p className="text-sm text-muted-foreground mb-4">
              La funcionalidad de comentarios de revisión estará disponible próximamente.
            </p>
            <Badge variant="outline">En Desarrollo</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuditTestDetails() {
  const params = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { currentUser, hasPermission } = usePermissions();
  const rqClient = useQueryClient();
  
  const auditTestId = params.id;
  
  // Detect view mode from URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode');
  const isViewMode = mode === 'view';
  
  const [activeTab, setActiveTab] = useState("work");
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [workDescription, setWorkDescription] = useState("");
  const [hoursWorked, setHoursWorked] = useState("");
  const [showAttachmentUploader, setShowAttachmentUploader] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
  const [uploadDialogContext, setUploadDialogContext] = useState<{
    workflowStage?: string;
    category?: string;
    milestoneIndex?: number;
  } | null>(null);

  // Audit findings state management
  const [showFindingDialog, setShowFindingDialog] = useState(false);
  
  // Edit test state management
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // Delete test state management
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteWarnings, setDeleteWarnings] = useState<string[]>([]);

  // Audit finding form setup
  const findingForm = useForm<AuditFindingFormData>({
    resolver: zodResolver(auditFindingFormSchema),
    defaultValues: {
      auditId: "",
      title: "",
      description: "",
      type: "deficiency",
      severity: "medium",
      condition: "",
      criteria: "",
      cause: "",
      effect: "",
      recommendation: "",
      managementResponse: "",
      agreedAction: "",
      responsiblePerson: "",
      dueDate: "",
      status: "open",
      identifiedBy: "",
    },
  });

  // Edit test form schema
  const editTestSchema = z.object({
    name: z.string().min(1, "El nombre es requerido"),
    description: z.string().optional(),
    objectives: z.array(z.string()).optional().default([]),
    scope: z.string().optional(),
    testProcedures: z.array(z.string()).optional().default([]),
    plannedStartDate: z.string().optional(),
    plannedEndDate: z.string().optional(),
    estimatedHours: z.number().min(0).optional(),
    priority: z.string().optional(),
    riskId: z.string().optional().nullable(),
    controlId: z.string().optional().nullable(),
  });

  type EditTestFormData = z.infer<typeof editTestSchema>;

  const editTestForm = useForm<EditTestFormData>({
    resolver: zodResolver(editTestSchema),
    defaultValues: {
      name: "",
      description: "",
      objectives: [],
      scope: "",
      testProcedures: [],
      plannedStartDate: "",
      plannedEndDate: "",
      estimatedHours: 0,
      priority: "medium",
      riskId: null,
      controlId: null,
    },
  });

  // Permission validation function
  const canEditTest = (auditTest: AuditTestWithDetails | undefined): boolean => {
    if (!currentUser || !auditTest) return false;
    
    // Admin users with edit_all permission can always edit
    if (hasPermission("edit_all")) return true;
    
    // Check if current user is the assigned executor (with fallback compatibility)
    const executorId = auditTest.executorId || auditTest.executor?.id;
    if (executorId === currentUser.id) return true;
    
    // Check if current user is the assigned supervisor (with fallback compatibility)
    const supervisorId = auditTest.supervisorId || auditTest.supervisor?.id;
    if (supervisorId === currentUser.id) return true;
    
    return false;
  };

  // This will be computed after auditTest is loaded

  // Fetch audit test details
  const { data: auditTest, isLoading, error } = useQuery<AuditTestWithDetails>({
    queryKey: ["/api/audit-tests", auditTestId, "details"],
    queryFn: async () => {
      if (!auditTestId) throw new Error("No audit test ID provided");
      const response = await fetch(`/api/audit-tests/${auditTestId}/details`);
      if (!response.ok) throw new Error('Failed to fetch audit test');
      return response.json();
    },
    enabled: !!auditTestId,
  });

  // queryClient already declared above, no need to redeclare

  // Query for risks from the audit scope
  const risksQuery = useQuery({
    queryKey: ['/api/audits', auditTest?.auditId, 'risks'],
    enabled: !!auditTest?.auditId && showEditDialog,
  });

  // Watch for risk selection changes
  const selectedRiskId = editTestForm.watch("riskId");

  // Query for controls from the selected risk
  const controlsQuery = useQuery({
    queryKey: ['/api/risks', selectedRiskId, 'controls'],
    enabled: !!selectedRiskId && showEditDialog,
  });

  // Watch for risk changes and clear control if necessary
  useEffect(() => {
    const currentControlId = editTestForm.getValues("controlId");
    if (!selectedRiskId && currentControlId) {
      // If risk is cleared, clear control too
      editTestForm.setValue("controlId", null);
    } else if (selectedRiskId && currentControlId && controlsQuery.data) {
      // If risk changed, verify control still belongs to new risk
      const controls = controlsQuery.data as any[];
      const isControlValid = controls.some((c: any) => c.id === currentControlId);
      if (!isControlValid) {
        editTestForm.setValue("controlId", null);
      }
    }
  }, [selectedRiskId, controlsQuery.data, editTestForm]);

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async ({ progress, workDescription, hoursWorked }: { 
      progress: number; 
      workDescription: string; 
      hoursWorked: number;
    }) => {
      return apiRequest(`/api/audit-tests/${auditTestId}/update-progress`, "PUT", {
        progress,
        notes: workDescription,
        hoursWorked: Number(hoursWorked)
      });
    },
    onSuccess: () => {
      rqClient.invalidateQueries({ queryKey: ["/api/audit-tests", auditTestId, "details"] });
      rqClient.invalidateQueries({ queryKey: ["/api/audit-tests", auditTestId, "attachments"] });
      toast({
        title: "Progreso actualizado",
        description: "El progreso y log de trabajo han sido actualizados."
      });
      setIsEditingProgress(false);
      setWorkDescription("");
      setHoursWorked("");
      setPendingAttachments([]);
      setShowAttachmentUploader(false);
    },
    onError: () => {
      toast({
        title: "Error al actualizar",
        description: "No se pudo actualizar el progreso. Intenta nuevamente.",
        variant: "destructive"
      });
    }
  });

  // Work log with attachments mutation
  const workLogWithAttachmentsMutation = useMutation({
    mutationFn: async ({ progress, workDescription, hoursWorked, attachments }: { 
      progress: number; 
      workDescription: string; 
      hoursWorked: number;
      attachments: File[];
    }) => {
      const formData = new FormData();
      formData.append('progress', progress.toString());
      formData.append('workDescription', workDescription);
      formData.append('hoursWorked', hoursWorked.toString());
      
      attachments.forEach((file, index) => {
        formData.append('attachments', file);
        formData.append(`attachmentCategories[${index}]`, 'workpaper');
        formData.append(`attachmentDescriptions[${index}]`, `Evidence for ${Math.round(progress)}% progress`);
      });
      
      const response = await fetch(`/api/audit-tests/${auditTestId}/work-log-with-attachments`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to create work log with attachments');
      }
      
      return response.json();
    },
    onSuccess: () => {
      rqClient.invalidateQueries({ queryKey: ["/api/audit-tests", auditTestId, "details"] });
      rqClient.invalidateQueries({ queryKey: ["/api/audit-tests", auditTestId, "attachments"] });
      toast({
        title: "Progreso y adjuntos guardados",
        description: "El progreso, log de trabajo y adjuntos han sido registrados."
      });
      setIsEditingProgress(false);
      setWorkDescription("");
      setHoursWorked("");
      setPendingAttachments([]);
      setShowAttachmentUploader(false);
    },
    onError: (error) => {
      console.error('Work log with attachments error:', error);
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar el progreso con adjuntos. Intenta nuevamente.",
        variant: "destructive"
      });
    }
  });

  // Update test mutation
  const updateTestMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/audit-tests/${auditTestId}`, "PUT", data);
    },
    onSuccess: () => {
      rqClient.invalidateQueries({ queryKey: ['/api/audit-tests', auditTestId, 'details'] });
      if (auditTest?.auditId) {
        rqClient.invalidateQueries({ queryKey: ['/api/audits', auditTest.auditId, 'work-program'] });
      }
      toast({
        title: "Prueba actualizada",
        description: "Los cambios se han guardado exitosamente."
      });
      setShowEditDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar",
        description: error.message || "No se pudo actualizar la prueba",
        variant: "destructive"
      });
    }
  });

  // Status update mutations
  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      return apiRequest(`/api/audit-tests/${auditTestId}`, "PUT", { status });
    },
    onSuccess: () => {
      rqClient.invalidateQueries({ queryKey: ["/api/audit-tests", auditTestId, "details"] });
      toast({
        title: "Estado actualizado",
        description: "El estado del test ha sido actualizado."
      });
    }
  });

  // Conclusions state and mutation
  const [conclusions, setConclusions] = useState("");
  const [isSavingConclusions, setIsSavingConclusions] = useState(false);

  const conclusionsMutation = useMutation({
    mutationFn: async (conclusions: string) => {
      return apiRequest(`/api/audit-tests/${auditTestId}`, "PUT", { conclusions });
    },
    onSuccess: () => {
      toast({
        title: "Conclusiones guardadas",
        description: "Las conclusiones del test han sido guardadas correctamente.",
      });
      rqClient.invalidateQueries({ queryKey: ["/api/audit-tests", auditTestId, "details"] });
      setIsSavingConclusions(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al guardar las conclusiones",
        variant: "destructive",
      });
      setIsSavingConclusions(false);
    },
  });

  // Delete test mutation
  const deleteTestMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/audit-tests/${auditTestId}`, "DELETE");
    },
    onSuccess: () => {
      // Invalidate all relevant caches before navigation
      rqClient.invalidateQueries({ queryKey: ['/api/audit-tests', auditTestId] });
      rqClient.invalidateQueries({ queryKey: ['/api/audit-tests', auditTestId, 'details'] });
      rqClient.invalidateQueries({ queryKey: ['/api/audit-tests'] }); // Global tests list
      if (auditTest?.auditId) {
        rqClient.invalidateQueries({ queryKey: ['/api/audits', auditTest.auditId] }); // Audit details
        rqClient.invalidateQueries({ queryKey: ['/api/audits', auditTest.auditId, 'tests'] });
        rqClient.invalidateQueries({ queryKey: ['/api/audits', auditTest.auditId, 'work-program'] });
      }
      rqClient.invalidateQueries({ queryKey: ['/api/audits'] }); // Audits list
      
      toast({
        title: "Prueba eliminada",
        description: "La prueba de auditoría ha sido eliminada exitosamente."
      });
      // Redirect to audits list
      navigate("/audits");
    },
    onError: (error: any) => {
      toast({
        title: "Error al eliminar",
        description: error.message || "No se pudo eliminar la prueba",
        variant: "destructive"
      });
      setShowDeleteDialog(false);
    }
  });

  // Check if user can edit this specific test (computed after auditTest is loaded)
  const userCanEdit = canEditTest(auditTest);
  
  // Check if user can delete test (admin or audit lead)
  const userCanDelete = () => {
    if (!currentUser || !auditTest?.audit) return false;
    
    // Admin users with edit_all permission can delete
    if (hasPermission("edit_all")) return true;
    
    // Check if current user is the audit lead auditor
    if (auditTest.audit.leadAuditor === currentUser.id) return true;
    
    return false;
  };

  // Audit finding creation mutation
  const createFindingMutation = useMutation({
    mutationFn: async (data: AuditFindingFormData) => {
      // Convert dueDate string to proper format if provided
      const processedData = {
        ...data,
        dueDate: data.dueDate && data.dueDate.trim() ? data.dueDate : undefined,
      };
      
      return apiRequest('/api/audit-findings', 'POST', processedData);
    },
    onSuccess: (createdFinding) => {
      rqClient.invalidateQueries({ queryKey: ['/api/audit-findings'] });
      toast({
        title: "Hallazgo creado",
        description: (
          <div className="flex items-center gap-2">
            <span>El hallazgo ha sido creado exitosamente</span>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs"
              onClick={() => navigate(`/audit-findings`)}
              data-testid="button-view-finding"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Ver hallazgos
            </Button>
          </div>
        ),
      });
      setShowFindingDialog(false);
      findingForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear hallazgo",
        description: error.message || "No se pudo crear el hallazgo. Intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  // Approval mutation
  const approvalMutation = useMutation({
    mutationFn: async (approvalStatus: 'approved' | 'rejected') => {
      return apiRequest(`/api/audit-tests/${auditTestId}/approve`, 'POST', { approvalStatus });
    },
    onSuccess: () => {
      rqClient.invalidateQueries({ queryKey: ['/api/audit-tests', auditTestId, 'details'] });
      if (auditTest?.auditId) {
        rqClient.invalidateQueries({ queryKey: ['/api/audits', auditTest.auditId, 'work-program'] });
      }
      toast({
        title: "Programa de trabajo actualizado",
        description: "El estado de aprobación ha sido actualizado exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar aprobación",
        description: error.message || "No se pudo actualizar el estado de aprobación",
        variant: "destructive",
      });
    },
  });

  // Handle approval action
  const handleApproval = (status: 'approved' | 'rejected') => {
    approvalMutation.mutate(status);
  };

  // Handle opening audit finding dialog with pre-populated data
  const handleOpenFindingDialog = () => {
    if (!auditTest || !currentUser) return;
    
    // Pre-populate form with context data
    const suggestedTitle = `Hallazgo identificado en test: ${auditTest.name}`;
    const suggestedDescription = `Durante la ejecución del test de auditoría "${auditTest.name}" (${auditTest.code}) se identificó la siguiente situación:`;
    
    findingForm.reset({
      auditId: auditTest.auditId,
      title: suggestedTitle,
      description: suggestedDescription,
      type: "deficiency",
      severity: "medium",
      condition: "",
      criteria: "",
      cause: "",
      effect: "",
      recommendation: "",
      managementResponse: "",
      agreedAction: "",
      responsiblePerson: "",
      dueDate: "",
      status: "open",
      identifiedBy: currentUser.id,
    });
    
    setShowFindingDialog(true);
  };

  // Handle closing audit finding dialog
  const handleCloseFindingDialog = () => {
    setShowFindingDialog(false);
    findingForm.reset();
  };

  // Handle form submission
  const handleFindingSubmit = (data: AuditFindingFormData) => {
    createFindingMutation.mutate(data);
  };

  // Handle delete test button click
  const handleDeleteTest = async () => {
    if (!auditTestId) return;
    
    try {
      // Check dependencies before showing dialog
      const dependencies = await apiRequest(`/api/audit-tests/${auditTestId}/dependencies`, "GET") as DependenciesResponse;
      setDeleteWarnings(dependencies.warnings || []);
      setShowDeleteDialog(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se puede verificar las dependencias",
        variant: "destructive"
      });
    }
  };

  // Confirm delete test
  const handleConfirmDelete = () => {
    deleteTestMutation.mutate();
  };

  // Initialize conclusions state when audit test data is loaded
  useEffect(() => {
    if (auditTest?.conclusions) {
      setConclusions(auditTest.conclusions);
    }
  }, [auditTest?.conclusions]);

  // Handle save conclusions
  const handleSaveConclusions = () => {
    if (!auditTest || !userCanEdit) return;
    setIsSavingConclusions(true);
    conclusionsMutation.mutate(conclusions);
  };

  useEffect(() => {
    if (auditTest) {
      setProgressValue(auditTest.progress);
    }
  }, [auditTest]);

  // Load test data into edit form when dialog opens
  useEffect(() => {
    if (showEditDialog && auditTest) {
      editTestForm.reset({
        name: auditTest.name,
        description: auditTest.description || "",
        objectives: auditTest.objectives || [],
        scope: auditTest.scope || "",
        testProcedures: auditTest.testProcedures || [],
        plannedStartDate: auditTest.plannedStartDate ? new Date(auditTest.plannedStartDate).toISOString().split('T')[0] : "",
        plannedEndDate: auditTest.plannedEndDate ? new Date(auditTest.plannedEndDate).toISOString().split('T')[0] : "",
        estimatedHours: auditTest.estimatedHours || 0,
        priority: auditTest.priority || "medium",
        riskId: (auditTest as any).riskId || null,
        controlId: (auditTest as any).controlId || null,
      });
    }
  }, [showEditDialog, auditTest]);

  const handleEditTestSubmit = (data: EditTestFormData) => {
    // Coerce empty strings to null for proper nullable handling
    const sanitizedData = {
      ...data,
      riskId: data.riskId || null,
      controlId: data.controlId || null,
    };
    updateTestMutation.mutate(sanitizedData);
  };

  const handleProgressUpdate = () => {
    // Check permissions first
    if (!userCanEdit) {
      toast({
        title: "Sin permisos",
        description: "No tienes permisos para actualizar este test de auditoría.",
        variant: "destructive"
      });
      return;
    }

    if (!workDescription.trim() || !hoursWorked) {
      toast({
        title: "Información requerida",
        description: "Debes completar la descripción del trabajo y las horas trabajadas.",
        variant: "destructive"
      });
      return;
    }

    if (pendingAttachments.length > 0) {
      workLogWithAttachmentsMutation.mutate({
        progress: progressValue,
        workDescription,
        hoursWorked: Number(hoursWorked),
        attachments: pendingAttachments
      });
    } else {
      updateProgressMutation.mutate({
        progress: progressValue,
        workDescription,
        hoursWorked: Number(hoursWorked)
      });
    }
  };

  const handleAttachmentChange = (files: File[]) => {
    setPendingAttachments(files);
  };

  const handleRemoveAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleStatusChange = (newStatus: string) => {
    // Check permissions first
    if (!userCanEdit) {
      toast({
        title: "Sin permisos",
        description: "No tienes permisos para cambiar el estado de este test de auditoría.",
        variant: "destructive"
      });
      return;
    }
    statusMutation.mutate(newStatus);
  };

  // Upload dialog handlers
  const openUploadDialog = (context: {
    workflowStage?: string;
    category?: string;
    milestoneIndex?: number;
  }) => {
    // Check permissions before opening upload dialog
    if (!userCanEdit) {
      toast({
        title: "Sin permisos",
        description: "No tienes permisos para subir adjuntos a este test de auditoría.",
        variant: "destructive"
      });
      return;
    }
    setUploadDialogContext(context);
    setShowAttachmentUploader(true);
  };

  const closeUploadDialog = () => {
    setShowAttachmentUploader(false);
    setUploadDialogContext(null);
  };

  const handleUploadComplete = () => {
    // Invalidate all relevant queries
    rqClient.invalidateQueries({ queryKey: ['/api/audit-tests', auditTestId, 'attachments'] });
    rqClient.invalidateQueries({ queryKey: ['/api/audit-tests', auditTestId, 'details'] });
    if (uploadDialogContext?.workflowStage) {
      rqClient.invalidateQueries({ 
        queryKey: ['/api/audit-tests', auditTestId, 'attachments', 'workflow', uploadDialogContext.workflowStage] 
      });
    }
    closeUploadDialog();
    toast({
      title: "Archivos subidos",
      description: "Los archivos se han subido exitosamente."
    });
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-muted animate-pulse rounded" />
            <div className="flex-1">
              <div className="h-8 bg-muted animate-pulse rounded mb-2" />
              <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="h-16 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !auditTest) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">Test no encontrado</h2>
          <p className="text-muted-foreground mb-4">
            El test de auditoría solicitado no existe o no tienes permisos para verlo.
          </p>
          <Button onClick={() => navigate("/audits")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Auditorías
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="audit-test-details">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/audits")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Auditorías
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight" data-testid="test-title">
                {auditTest.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" data-testid="test-code">
                  {auditTest.code}
                </Badge>
                <Badge className={STATUS_COLORS[auditTest.status]} data-testid="test-status">
                  {STATUS_LABELS[auditTest.status] || auditTest.status}
                </Badge>
                {auditTest.audit && (
                  <span className="text-sm text-muted-foreground">
                    Auditoría: {auditTest.audit.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isViewMode ? (
              <Badge variant="secondary" className="px-3 py-2">
                <Eye className="h-4 w-4 mr-2" />
                Modo Solo Lectura
              </Badge>
            ) : (
              <>
                {/* Edit Test Button */}
                {userCanEdit && (
                  <Button 
                    onClick={() => setShowEditDialog(true)}
                    variant="outline"
                    data-testid="button-edit-test"
                  >
                    <FileEdit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                )}
                
                {/* Delete Test Button - only for admin or audit lead */}
                {userCanDelete() && (
                  <Button 
                    onClick={handleDeleteTest}
                    variant="outline"
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    data-testid="button-delete-test"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </Button>
                )}
                
                {/* Workflow Action Buttons */}
                {auditTest.status === 'pending' && userCanEdit && (
                  <Button 
                    onClick={() => handleStatusChange('in_progress')}
                    data-testid="button-start-test"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar Test
                  </Button>
                )}
                {auditTest.status === 'assigned' && userCanEdit && (
                  <>
                    <Button 
                      onClick={handleOpenFindingDialog}
                      variant="secondary"
                      data-testid="button-create-finding"
                    >
                      <FileX className="h-4 w-4 mr-2" />
                      Crear Hallazgo
                    </Button>
                    <Button 
                      onClick={() => handleStatusChange('in_progress')}
                      data-testid="button-start-test"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Iniciar Test
                    </Button>
                  </>
                )}
                {auditTest.status === 'in_progress' && userCanEdit && (
                  <>
                    <Button 
                      onClick={handleOpenFindingDialog}
                      variant="secondary"
                      data-testid="button-create-finding"
                    >
                      <FileX className="h-4 w-4 mr-2" />
                      Crear Hallazgo
                    </Button>
                    <Button 
                      onClick={() => handleStatusChange('under_review')}
                      variant="outline"
                      data-testid="button-submit-review"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Enviar a Revisión
                    </Button>
                  </>
                )}
                {auditTest.status === 'under_review' && userCanEdit && (
                  <Button 
                    onClick={handleOpenFindingDialog}
                    variant="secondary"
                    data-testid="button-create-finding"
                  >
                    <FileX className="h-4 w-4 mr-2" />
                    Crear Hallazgo
                  </Button>
                )}
                {!userCanEdit && (
                  <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                    <AlertTriangle className="h-4 w-4" />
                    Solo el ejecutor o supervisor puede gestionar este test
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progreso</span>
                <Target className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <Progress value={auditTest.progress} />
                <div className="text-2xl font-bold">{auditTest.progress}%</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Horas Trabajadas</span>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">
                {auditTest.totalHoursWorked || 0}h
              </div>
              <p className="text-xs text-muted-foreground">
                de {auditTest.estimatedHours}h estimadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Ejecutor</span>
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-sm font-medium">
                {auditTest.executor?.fullName || 'No asignado'}
              </div>
              <p className="text-xs text-muted-foreground">
                {auditTest.executor?.email}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Supervisor</span>
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-sm font-medium">
                {auditTest.supervisor?.fullName || 'No asignado'}
              </div>
              <p className="text-xs text-muted-foreground">
                {auditTest.supervisor?.email}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Simplified 3 Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="work" data-testid="tab-work">
              <Activity className="h-4 w-4 mr-2" />
              Trabajo
            </TabsTrigger>
            <TabsTrigger value="evidence" data-testid="tab-evidence">
              <Upload className="h-4 w-4 mr-2" />
              Evidencias
            </TabsTrigger>
            <TabsTrigger value="review" data-testid="tab-review">
              <MessageSquare className="h-4 w-4 mr-2" />
              Revisión
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Trabajo - Combined Overview + Progress */}
          <TabsContent value="work" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Detalles del Test</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Descripción</label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {auditTest.description || 'Sin descripción'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Alcance</label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {auditTest.scope || 'Sin definir'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Tamaño de Muestra</label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {auditTest.sampleSize || 'No especificado'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Fechas Planificadas</label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {auditTest.plannedStartDate && auditTest.plannedEndDate
                        ? `${formatDate(auditTest.plannedStartDate)} - ${formatDate(auditTest.plannedEndDate)}`
                        : 'Sin definir'}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Riesgo Asociado</label>
                    {auditTest.risk ? (
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="default" className="font-mono text-xs">
                          {auditTest.risk.code}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {auditTest.risk.name}
                        </span>
                      </div>
                    ) : auditTest.auditRisk ? (
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="destructive" className="font-mono text-xs">
                          {auditTest.auditRisk.code}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          Ad-hoc
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {auditTest.auditRisk.name}
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-1">Sin riesgo asociado</p>
                    )}
                  </div>

                  {auditTest.control && (
                    <div>
                      <label className="text-sm font-medium">Control Asociado</label>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          {auditTest.control.code}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {auditTest.control.name}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Objetivos y Procedimientos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Objetivos</label>
                    <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                      {auditTest.objectives && auditTest.objectives.length > 0 ? (
                        auditTest.objectives.map((objective, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="inline-block w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                            {objective}
                          </li>
                        ))
                      ) : (
                        <li>Sin objetivos definidos</li>
                      )}
                    </ul>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Procedimientos de Prueba</label>
                    <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                      {auditTest.testProcedures && auditTest.testProcedures.length > 0 ? (
                        auditTest.testProcedures.map((procedure, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="inline-block w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                            {procedure}
                          </li>
                        ))
                      ) : (
                        <li>Sin procedimientos definidos</li>
                      )}
                    </ul>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Resultados Esperados</label>
                    <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                      {auditTest.expectedResults && auditTest.expectedResults.length > 0 ? (
                        auditTest.expectedResults.map((result, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="inline-block w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                            {result}
                          </li>
                        ))
                      ) : (
                        <li>Sin resultados esperados definidos</li>
                      )}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Metodología y Criterios */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Metodología y Criterios
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Criterios de Evaluación</label>
                  {auditTest.evaluationCriteria && auditTest.evaluationCriteria.length > 0 ? (
                    <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                      {auditTest.evaluationCriteria.map((criterion: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="inline-block w-1 h-1 bg-muted-foreground rounded-full mt-2 flex-shrink-0" />
                          {criterion}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">No especificados</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Metodologías y Procedimientos Analíticos</label>
                  {auditTest.methodologies && auditTest.methodologies.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {auditTest.methodologies.map((methodology: string, index: number) => (
                        <Badge key={index} variant="outline">
                          {methodology}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">No especificadas</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Herramientas</label>
                  {auditTest.tools && auditTest.tools.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {auditTest.tools.map((tool: string, index: number) => (
                        <Badge key={index} variant="secondary">
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">No especificadas</p>
                  )}
                </div>

                <Separator />

                <div>
                  <label className="text-sm font-medium">Estado de Aprobación</label>
                  <div className="mt-2">
                    <Badge 
                      variant={
                        auditTest.approvalStatus === 'approved' ? 'default' :
                        auditTest.approvalStatus === 'rejected' ? 'destructive' :
                        auditTest.approvalStatus === 'pending_approval' ? 'secondary' :
                        'outline'
                      }
                    >
                      {auditTest.approvalStatus === 'approved' ? 'Aprobado' :
                       auditTest.approvalStatus === 'rejected' ? 'Rechazado' :
                       auditTest.approvalStatus === 'pending_approval' ? 'Pendiente de Aprobación' :
                       'Borrador'}
                    </Badge>
                  </div>
                  {auditTest.approvedBy && auditTest.approvedAt && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Aprobado por: {auditTest.approvedBy} el {formatDate(auditTest.approvedAt)}
                    </p>
                  )}
                  
                  {hasPermission("edit_all") && auditTest.approvalStatus !== 'approved' && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => handleApproval('approved')}
                        variant="default"
                        size="sm"
                        data-testid="button-approve-test"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Aprobar Prueba
                      </Button>
                      {auditTest.approvalStatus !== 'draft' && (
                        <Button
                          onClick={() => handleApproval('rejected')}
                          variant="destructive"
                          size="sm"
                          data-testid="button-reject-test"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Rechazar
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Work Sessions Section - Moved from Progress Tab */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Registro de Sesiones de Trabajo</h2>
                  <p className="text-sm text-muted-foreground">
                    {isViewMode 
                      ? "Historial de sesiones de trabajo realizadas"
                      : "Documenta el progreso diario, horas trabajadas y evidencia de cada sesión individual de trabajo"
                    }
                  </p>
                </div>
              </div>

              <div className={isViewMode ? "space-y-6" : "grid grid-cols-1 lg:grid-cols-2 gap-6"}>
                {/* New Work Session - Only in edit mode */}
                {!isViewMode && (
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      Nueva Sesión de Trabajo
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Registra el trabajo realizado en la sesión actual, actualiza el progreso y adjunta evidencia
                    </p>
                    {!userCanEdit && (
                      <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Solo el auditor asignado o supervisor pueden editar esta prueba</span>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Progreso de la Sesión: {progressValue}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={progressValue}
                        onChange={(e) => setProgressValue(Number(e.target.value))}
                        className="w-full"
                        disabled={!userCanEdit}
                        data-testid="progress-slider"
                      />
                      <Progress value={progressValue} className="mt-2" />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Descripción del Trabajo Realizado</label>
                      <Textarea
                        placeholder={userCanEdit ? "Describe el trabajo específico realizado en esta sesión..." : "Solo el auditor asignado o supervisor pueden editar"}
                        value={workDescription}
                        onChange={(e) => setWorkDescription(e.target.value)}
                        rows={3}
                        disabled={!userCanEdit}
                        data-testid="work-description"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Horas Trabajadas en esta Sesión</label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="24"
                        placeholder={userCanEdit ? "ej. 2.5" : "Solo lectura"}
                        value={hoursWorked}
                        onChange={(e) => setHoursWorked(e.target.value)}
                        disabled={!userCanEdit}
                        data-testid="hours-worked"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Evidencia de la Sesión</label>
                        {userCanEdit ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAttachmentUploader(!showAttachmentUploader)}
                            data-testid="button-toggle-attachments"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {showAttachmentUploader ? 'Ocultar' : 'Adjuntar'} Archivos
                          </Button>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Adjuntos solo para auditor/supervisor
                          </Badge>
                        )}
                      </div>
                      
                      {/* Pending attachments preview */}
                      {pendingAttachments.length > 0 && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="text-sm font-medium mb-2">
                            Archivos a adjuntar ({pendingAttachments.length}):
                          </div>
                          <div className="space-y-1">
                            {pendingAttachments.map((file, index) => (
                              <div key={index} className="flex items-center justify-between text-sm">
                                <span className="truncate">{file.name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveAttachment(index)}
                                  data-testid={`button-remove-attachment-${index}`}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* File input for simple attachment */}
                      {showAttachmentUploader && (
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.csv"
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              setPendingAttachments(prev => [...prev, ...files]);
                              e.target.value = '';
                            }}
                            className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                            data-testid="input-attachments"
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            Selecciona archivos de evidencia de esta sesión de trabajo (máx. 10MB cada uno)
                          </p>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={handleProgressUpdate}
                      disabled={!userCanEdit || updateProgressMutation.isPending || workLogWithAttachmentsMutation.isPending}
                      className="w-full"
                      data-testid="button-update-progress"
                    >
                      {(updateProgressMutation.isPending || workLogWithAttachmentsMutation.isPending) ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          {pendingAttachments.length > 0 ? 'Guardando sesión con adjuntos...' : 'Registrando sesión...'}
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          {pendingAttachments.length > 0 ? 
                            `Registrar Sesión con ${pendingAttachments.length} adjunto${pendingAttachments.length !== 1 ? 's' : ''}` :
                            'Registrar Sesión de Trabajo'
                          }
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
                )}

                {/* Work Sessions History */}
                <Card className={isViewMode ? "border-l-4 border-l-blue-300" : "border-l-4 border-l-blue-300"}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-500" />
                      Historial de Sesiones de Trabajo
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Registro cronológico de todas las sesiones de trabajo realizadas en este test
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 max-h-80 overflow-y-auto">
                      {auditTest.workLogs && auditTest.workLogs.length > 0 ? (
                        auditTest.workLogs.map((log, index) => (
                          <div key={log.id} className="border-l-2 border-blue-200 pl-4 pb-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3 text-blue-500" />
                                <span className="text-sm font-medium">
                                  {formatDateTime(log.entryDate)}
                                </span>
                              </div>
                              <Badge variant="outline" className="text-blue-600 border-blue-200">
                                {log.hoursWorked}h
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {log.workDescription}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            No hay sesiones de trabajo registradas aún
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Registra tu primera sesión usando el formulario de la izquierda
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Separator */}
            <div className="flex items-center">
              <Separator className="flex-1" />
              <div className="px-3">
                <Badge variant="secondary" className="text-xs">CONCLUSIONES</Badge>
              </div>
              <Separator className="flex-1" />
            </div>
            
            {/* Final Conclusions Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-2">
                <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Conclusiones Finales de la Auditoría</h2>
                  <p className="text-sm text-muted-foreground">
                    Documenta las conclusiones generales, hallazgos principales y recomendaciones del test completo
                  </p>
                </div>
              </div>

              <Card className="border-l-4 border-l-green-500 bg-green-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Informe de Conclusiones del Test
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Esta sección es independiente de las sesiones de trabajo. Documenta el resultado final y las conclusiones 
                    generales una vez completado todo el trabajo de auditoría.
                  </p>
                  {!userCanEdit && (
                    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Solo el auditor asignado o supervisor pueden editar las conclusiones</span>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Resumen Ejecutivo y Conclusiones
                    </label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Incluye: hallazgos principales, observaciones críticas, evaluación de controles, 
                      recomendaciones para la gerencia y conclusión sobre la efectividad del área auditada.
                    </p>
                    <Textarea
                      placeholder={userCanEdit 
                        ? "Escribe las conclusiones finales del test de auditoría:\n\n• Hallazgos principales identificados\n• Observaciones sobre la efectividad de los controles\n• Recomendaciones para la gerencia\n• Conclusión general sobre el área auditada..." 
                        : "Solo el auditor asignado o supervisor pueden editar las conclusiones"
                      }
                      value={conclusions}
                      onChange={(e) => setConclusions(e.target.value)}
                      rows={10}
                      disabled={!userCanEdit}
                      data-testid="textarea-conclusions"
                      className="resize-none"
                    />
                  </div>
                  
                  {userCanEdit && (
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        {auditTest?.conclusions ? 
                          `Última actualización: ${formatDateTime(auditTest.updatedAt)}` : 
                          "Sin conclusiones guardadas aún"
                        }
                      </div>
                      <Button
                        onClick={handleSaveConclusions}
                        disabled={isSavingConclusions || conclusionsMutation.isPending || conclusions === (auditTest?.conclusions || "")}
                        data-testid="button-save-conclusions"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {(isSavingConclusions || conclusionsMutation.isPending) ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Guardando Conclusiones...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Guardar Conclusiones Finales
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  
                  {!userCanEdit && auditTest?.conclusions && (
                    <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                      <div className="text-sm font-medium mb-2 text-green-800">Conclusiones Finales:</div>
                      <div className="text-sm text-green-700 whitespace-pre-wrap">
                        {auditTest.conclusions}
                      </div>
                      <div className="text-xs text-green-600 mt-3 pt-2 border-t border-green-200">
                        Última actualización: {formatDateTime(auditTest.updatedAt)}
                      </div>
                    </div>
                  )}
                  
                  {!userCanEdit && !auditTest?.conclusions && (
                    <div className="text-center py-8 bg-green-50/50 rounded-lg border border-green-200">
                      <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-400" />
                      <p className="text-sm text-green-600 font-medium">Conclusiones Finales Pendientes</p>
                      <p className="text-xs text-green-500 mt-1">
                        Las conclusiones serán completadas por el auditor asignado
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab 2: Evidencias - Simplified Attachments Tab */}
          <TabsContent value="evidence" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Gestión de Evidencias
                  <Badge variant="outline" className="ml-2">
                    {auditTest.name}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AuditTestAttachmentManager
                  auditTestId={auditTest.id}
                  auditTestName={auditTest.name}
                  allowUpload={userCanEdit && auditTest.status === 'in_progress'}
                  allowEdit={userCanEdit}
                  allowDelete={userCanEdit}
                  showUploader={userCanEdit}
                  compact={false}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Revisión - Combined History + Comments */}
          <TabsContent value="review" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Historial de Estados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {auditTest.progressHistory && auditTest.progressHistory.length > 0 ? (
                    auditTest.progressHistory.map((entry, index) => (
                      <div key={entry.id} className="border-l-2 border-muted pl-4 pb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge className={STATUS_COLORS[entry.toStatus]}>
                              {STATUS_LABELS[entry.toStatus] || entry.toStatus}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              desde {STATUS_LABELS[entry.fromStatus] || entry.fromStatus}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(entry.changeDate)}
                          </span>
                        </div>
                        {entry.comments && (
                          <p className="text-sm text-muted-foreground">
                            {entry.comments}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No hay historial de cambios de estado
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Comentarios de Revisión</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {auditTest.status === 'under_review' || auditTest.status === 'completed' ? (
                    <ReviewCommentsSection 
                      auditTestId={auditTest.id}
                      supervisor={auditTest.supervisor}
                      status={auditTest.status}
                    />
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="font-semibold mb-2">Comentarios de Revisión</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Los comentarios del supervisor aparecerán cuando el test esté en revisión.
                      </p>
                      <Badge variant="outline">
                        Estado Actual: {STATUS_LABELS[auditTest.status] || auditTest.status}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Upload Dialog */}
      <Dialog open={showAttachmentUploader} onOpenChange={setShowAttachmentUploader}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {uploadDialogContext?.workflowStage 
                ? `Subir Adjuntos - ${uploadDialogContext.workflowStage === 'work_log' ? 'Registro de Trabajo' : 
                    uploadDialogContext.workflowStage === 'general' ? 'Documentos Generales' : uploadDialogContext.workflowStage}`
                : uploadDialogContext?.milestoneIndex !== undefined 
                  ? `Subir Evidencia - Hito ${uploadDialogContext.milestoneIndex + 1}`
                  : 'Subir Adjuntos'
              }
            </DialogTitle>
            <DialogDescription>
              Selecciona los archivos que deseas adjuntar como evidencia o documentación del test de auditoría.
            </DialogDescription>
          </DialogHeader>
          {auditTestId && (
            <AuditTestAttachmentUploader
              auditTestId={auditTestId}
              onUploadComplete={handleUploadComplete}
              maxFiles={10}
              maxFileSize={50 * 1024 * 1024}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Audit Finding Creation Dialog */}
      <Dialog open={showFindingDialog} onOpenChange={setShowFindingDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" aria-describedby="finding-dialog-description">
          <DialogHeader>
            <DialogTitle data-testid="finding-dialog-title">
              Crear Hallazgo de Auditoría
            </DialogTitle>
            <DialogDescription id="finding-dialog-description">
              Documenta un hallazgo identificado durante la ejecución del test "{auditTest?.name}".
              Completa la información requerida para registrar el hallazgo en el sistema.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...findingForm}>
            <form 
              onSubmit={findingForm.handleSubmit(handleFindingSubmit)} 
              className="space-y-6"
              data-testid="finding-form"
            >
              <AuditFindingFormTabs control={findingForm.control} />
              
              <div className="flex items-center justify-between pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseFindingDialog}
                  disabled={createFindingMutation.isPending}
                  data-testid="button-cancel-finding"
                >
                  Cancelar
                </Button>
                
                <div className="flex items-center gap-2">
                  {createFindingMutation.isPending && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      Creando hallazgo...
                    </div>
                  )}
                  <Button
                    type="submit"
                    disabled={createFindingMutation.isPending}
                    data-testid="button-submit-finding"
                  >
                    <FileX className="h-4 w-4 mr-2" />
                    Crear Hallazgo
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Test Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Prueba de Auditoría</DialogTitle>
            <DialogDescription>
              Actualiza la información de la prueba de auditoría.
            </DialogDescription>
          </DialogHeader>
          <Form {...editTestForm}>
            <form onSubmit={editTestForm.handleSubmit(handleEditTestSubmit)} className="space-y-6">
              <div className="space-y-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    {...editTestForm.register("name")}
                    placeholder="Nombre de la prueba"
                    data-testid="input-edit-name"
                  />
                  {editTestForm.formState.errors.name && (
                    <p className="text-sm text-destructive">{editTestForm.formState.errors.name.message}</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    {...editTestForm.register("description")}
                    placeholder="Descripción de la prueba"
                    rows={3}
                    data-testid="input-edit-description"
                  />
                </div>

                {/* Scope */}
                <div className="space-y-2">
                  <Label htmlFor="scope">Alcance</Label>
                  <Textarea
                    id="scope"
                    {...editTestForm.register("scope")}
                    placeholder="Alcance de la prueba"
                    rows={2}
                    data-testid="input-edit-scope"
                  />
                </div>

                {/* Dates Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="plannedStartDate">Fecha Inicio Planificada</Label>
                    <Input
                      id="plannedStartDate"
                      type="date"
                      {...editTestForm.register("plannedStartDate")}
                      data-testid="input-edit-start-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plannedEndDate">Fecha Fin Planificada</Label>
                    <Input
                      id="plannedEndDate"
                      type="date"
                      {...editTestForm.register("plannedEndDate")}
                      data-testid="input-edit-end-date"
                    />
                  </div>
                </div>

                {/* Hours and Priority */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="estimatedHours">Horas Estimadas</Label>
                    <Input
                      id="estimatedHours"
                      type="number"
                      min="0"
                      step="0.5"
                      {...editTestForm.register("estimatedHours", { valueAsNumber: true })}
                      data-testid="input-edit-hours"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Prioridad</Label>
                    <Select
                      value={editTestForm.watch("priority")}
                      onValueChange={(value) => editTestForm.setValue("priority", value)}
                    >
                      <SelectTrigger data-testid="select-edit-priority">
                        <SelectValue placeholder="Seleccionar prioridad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baja</SelectItem>
                        <SelectItem value="medium">Media</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Risk and Control Selectors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Risk Selector */}
                  <div className="space-y-2">
                    <Label htmlFor="riskId">Riesgo Asociado</Label>
                    <Select
                      value={editTestForm.watch("riskId") || "none"}
                      onValueChange={(value) => editTestForm.setValue("riskId", value === "none" ? null : value)}
                    >
                      <SelectTrigger data-testid="select-edit-risk">
                        <SelectValue placeholder="Seleccionar riesgo (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin riesgo</SelectItem>
                        {(risksQuery.data as any[] || []).map((risk: any) => (
                          <SelectItem key={risk.id} value={risk.id}>
                            {risk.code || risk.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {risksQuery.isLoading && (
                      <p className="text-sm text-muted-foreground">Cargando riesgos...</p>
                    )}
                  </div>

                  {/* Control Selector */}
                  <div className="space-y-2">
                    <Label htmlFor="controlId">Control Asociado</Label>
                    <Select
                      value={editTestForm.watch("controlId") || "none"}
                      onValueChange={(value) => editTestForm.setValue("controlId", value === "none" ? null : value)}
                      disabled={!selectedRiskId}
                    >
                      <SelectTrigger data-testid="select-edit-control">
                        <SelectValue placeholder={!selectedRiskId ? "Primero selecciona un riesgo" : "Seleccionar control (opcional)"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin control</SelectItem>
                        {(controlsQuery.data as any[] || []).map((control: any) => (
                          <SelectItem key={control.id} value={control.id}>
                            {control.code || control.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {controlsQuery.isLoading && selectedRiskId && (
                      <p className="text-sm text-muted-foreground">Cargando controles...</p>
                    )}
                    {!selectedRiskId && (
                      <p className="text-sm text-muted-foreground">Selecciona un riesgo para ver los controles disponibles</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={updateTestMutation.isPending}
                  data-testid="button-save-edit"
                >
                  {updateTestMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent data-testid="dialog-delete-test">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar prueba de auditoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la prueba "{auditTest?.name}" y todos sus datos asociados.
              
              {deleteWarnings.length > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="font-semibold text-yellow-900 mb-2">Advertencias:</p>
                  <ul className="list-disc list-inside space-y-1 text-yellow-800">
                    {deleteWarnings.map((warning, index) => (
                      <li key={index} className="text-sm">{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteTestMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteTestMutation.isPending ? "Eliminando..." : "Eliminar Prueba"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}