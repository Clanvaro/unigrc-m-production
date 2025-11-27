import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Filter, 
  Users, 
  Crown,
  Shield,
  Star,
  Building2,
  UserCheck,
  Calendar,
  Paperclip,
  FileText,
  Download
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { insertComplianceOfficerSchema } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type ComplianceOfficer = {
  id: string;
  fiscalEntityId?: string; // Legacy field, now optional
  fullName: string;
  email: string;
  phone?: string;
  roleType: string;
  scope: string;
  hierarchyLevel: number;
  title?: string;
  status: string;
  assignmentStartDate: string;
  assignmentEndDate?: string;
  crimeCategories?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  fiscalEntity?: { name: string; code: string }; // Legacy single entity
  fiscalEntities?: Array<{ id: string; name: string; code: string }>; // New multiple entities
  crimeCategData?: Array<{ id: string; name: string; code: string }>;
  attachments?: Array<{
    id: string;
    filename: string;
    originalFilename: string;
    size: number;
    uploadedAt: string;
  }>;
};

type CrimeCategory = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

type FiscalEntity = {
  id: string;
  name: string;
  code: string;
};

const complianceOfficerFormSchema = z.object({
  fiscalEntityId: z.string().optional(),
  fiscalEntityIds: z.array(z.string()).default([]),
  fullName: z.string().min(1, "El nombre completo es requerido"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  roleType: z.string().min(1, "El tipo de rol es requerido"),
  scope: z.string().min(1, "El alcance es requerido"),
  hierarchyLevel: z.number().min(1).max(3),
  title: z.string().optional(),
  status: z.string().min(1, "El estado es requerido"),
  assignmentStartDate: z.string().min(1, "La fecha de inicio es requerida"),
  assignmentEndDate: z.string().optional(),
  crimeCategories: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

const ROLE_TYPE_LABELS = {
  "encargado_prevencion": "Encargado de Prevención",
  "oficial_cumplimiento": "Oficial de Cumplimiento",
  "sujeto_responsable": "Sujeto Responsable"
};

const HIERARCHY_LABELS = {
  1: "Principal",
  2: "Coordinador", 
  3: "Especialista"
};

const ROLE_TYPE_ICONS = {
  "encargado_prevencion": Crown,
  "oficial_cumplimiento": Shield,
  "sujeto_responsable": Star
};

export default function ComplianceOfficers() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<ComplianceOfficer | null>(null);
  const [selectedOfficer, setSelectedOfficer] = useState<ComplianceOfficer | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filter, setFilter] = useState({
    search: "",
    fiscalEntityId: "",
    roleType: "",
    activeOnly: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: officers = [], isLoading } = useQuery<ComplianceOfficer[]>({
    queryKey: ["/api/compliance-officers/with-details"],
  });

  const { data: crimeCategories = [] } = useQuery<CrimeCategory[]>({
    queryKey: ["/api/crime-categories"],
  });

  const { data: fiscalEntities = [] } = useQuery<FiscalEntity[]>({
    queryKey: ["/api/fiscal-entities"],
  });

  // Form
  const form = useForm<z.infer<typeof complianceOfficerFormSchema>>({
    resolver: zodResolver(complianceOfficerFormSchema),
    defaultValues: {
      fiscalEntityId: "",
      fiscalEntityIds: [],
      fullName: "",
      email: "",
      phone: "",
      roleType: "encargado_prevencion",
      scope: "general",
      hierarchyLevel: 1,
      title: "",
      status: "active",
      assignmentStartDate: new Date().toISOString().split('T')[0],
      assignmentEndDate: "",
      crimeCategories: [],
      notes: "",
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: z.infer<typeof complianceOfficerFormSchema>) =>
      apiRequest("/api/compliance-officers", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance-officers"] });
      toast({
        title: "Encargado creado",
        description: "El encargado de cumplimiento ha sido creado exitosamente",
      });
      setShowDialog(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error al crear encargado",
        description: "No se pudo crear el encargado de cumplimiento",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string } & Partial<ComplianceOfficer>) =>
      apiRequest(`/api/compliance-officers/${data.id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance-officers"] });
      toast({
        title: "Encargado actualizado",
        description: "El encargado de cumplimiento ha sido actualizado exitosamente",
      });
      setShowDialog(false);
      setEditingOfficer(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error al actualizar encargado",
        description: "No se pudo actualizar el encargado de cumplimiento",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/compliance-officers/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance-officers"] });
      toast({
        title: "Encargado eliminado",
        description: "El encargado de cumplimiento ha sido eliminado exitosamente",
      });
    },
    onError: () => {
      toast({
        title: "Error al eliminar encargado",
        description: "No se pudo eliminar el encargado de cumplimiento",
        variant: "destructive",
      });
    },
  });

  // Helpers
  const getFilteredOfficers = () => {
    return officers.filter(officer => {
      if (filter.activeOnly && officer.status !== "active") return false;
      if (filter.search) {
        const searchTerm = filter.search.toLowerCase();
        const fullName = officer.fullName.toLowerCase();
        if (!fullName.includes(searchTerm) && !officer.email.toLowerCase().includes(searchTerm)) {
          return false;
        }
      }
      if (filter.fiscalEntityId && filter.fiscalEntityId !== "all") {
        // Check if the officer is associated with the filtered fiscal entity
        const hasMatchingEntity = officer.fiscalEntities && officer.fiscalEntities.length > 0 
          ? officer.fiscalEntities.some(fe => fe.id === filter.fiscalEntityId)
          : officer.fiscalEntityId === filter.fiscalEntityId;
        if (!hasMatchingEntity) return false;
      }
      if (filter.roleType && filter.roleType !== "all-roles" && officer.roleType !== filter.roleType) return false;
      return true;
    });
  };

  const getOfficersByHierarchy = (hierarchyLevel: number) => {
    return getFilteredOfficers().filter(officer => officer.hierarchyLevel === hierarchyLevel);
  };

  const handleEdit = (officer: ComplianceOfficer) => {
    setEditingOfficer(officer);
    
    // Handle multiple fiscal entities or fallback to single entity (legacy)
    const fiscalEntityIds: string[] = [];
    if (officer.fiscalEntities && officer.fiscalEntities.length > 0) {
      // New format: multiple entities
      fiscalEntityIds.push(...officer.fiscalEntities.map(fe => fe.id));
    } else if (officer.fiscalEntityId) {
      // Legacy format: single entity
      fiscalEntityIds.push(officer.fiscalEntityId);
    }
    
    form.reset({
      fiscalEntityId: officer.fiscalEntityId || "", // Keep legacy field for backward compatibility
      fiscalEntityIds: fiscalEntityIds,
      fullName: officer.fullName,
      email: officer.email,
      phone: officer.phone || "",
      roleType: officer.roleType,
      scope: officer.scope,
      hierarchyLevel: officer.hierarchyLevel,
      title: officer.title || "",
      status: officer.status,
      assignmentStartDate: officer.assignmentStartDate,
      assignmentEndDate: officer.assignmentEndDate || "",
      crimeCategories: officer.crimeCategories || [],
      notes: officer.notes || "",
    });
    setShowDialog(true);
  };

  const handleSubmit = (values: z.infer<typeof complianceOfficerFormSchema>) => {
    const data = {
      ...values,
      assignmentEndDate: values.assignmentEndDate || undefined,
      phone: values.phone || undefined,
      notes: values.notes || undefined,
      crimeCategories: values.crimeCategories?.length ? values.crimeCategories : [],
    };

    if (editingOfficer) {
      updateMutation.mutate({ id: editingOfficer.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleNewOfficer = () => {
    setEditingOfficer(null);
    form.reset({
      fiscalEntityId: "",
      fiscalEntityIds: [],
      fullName: "",
      email: "",
      phone: "",
      roleType: "encargado_prevencion",
      scope: "general",
      hierarchyLevel: 1,
      title: "",
      status: "active",
      assignmentStartDate: new Date().toISOString().split('T')[0],
      assignmentEndDate: "",
      crimeCategories: [],
      notes: "",
    });
    setShowDialog(true);
  };

  const renderOfficerCard = (officer: ComplianceOfficer) => {
    const RoleIcon = ROLE_TYPE_ICONS[officer.roleType as keyof typeof ROLE_TYPE_ICONS] || Crown;
    
    return (
      <div key={officer.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="p-2 rounded-full bg-primary/10">
                <RoleIcon className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold" data-testid={`text-officer-name-${officer.id}`}>
                  {officer.fullName}
                </h3>
                <Badge variant="secondary" data-testid={`badge-officer-role-${officer.id}`}>
                  {ROLE_TYPE_LABELS[officer.roleType as keyof typeof ROLE_TYPE_LABELS] || officer.roleType}
                </Badge>
                <Badge variant="outline" data-testid={`badge-officer-hierarchy-${officer.id}`}>
                  {HIERARCHY_LABELS[officer.hierarchyLevel as keyof typeof HIERARCHY_LABELS] || `Nivel ${officer.hierarchyLevel}`}
                </Badge>
                {officer.status !== "active" && (
                  <Badge variant="destructive">Inactivo</Badge>
                )}
              </div>
              
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <div className="flex flex-col">
                    {officer.fiscalEntities && officer.fiscalEntities.length > 0 ? (
                      <>
                        <span>{officer.fiscalEntities[0].name}</span>
                        {officer.fiscalEntities.length > 1 && (
                          <span className="text-xs text-muted-foreground">
                            +{officer.fiscalEntities.length - 1} más
                          </span>
                        )}
                      </>
                    ) : officer.fiscalEntity ? (
                      <span>{officer.fiscalEntity.name}</span>
                    ) : (
                      <span>Sin entidad asignada</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  <span>{officer.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Desde: {format(new Date(officer.assignmentStartDate), 'dd/MM/yyyy', { locale: es })}
                    {officer.assignmentEndDate && ` - Hasta: ${format(new Date(officer.assignmentEndDate), 'dd/MM/yyyy', { locale: es })}`}
                  </span>
                </div>
                
                {officer.crimeCategData && officer.crimeCategData.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {officer.crimeCategData.map((category) => (
                      <Badge key={category.id} variant="outline" className="text-xs">
                        {category.code}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {officer.attachments && officer.attachments.length > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-xs">
                    <Paperclip className="h-3 w-3" />
                    <span>{officer.attachments.length} archivo(s) adjunto(s)</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedOfficer(officer)}
              data-testid={`button-view-officer-${officer.id}`}
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleEdit(officer)}
              data-testid={`button-edit-officer-${officer.id}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => deleteMutation.mutate(officer.id)}
              disabled={deleteMutation.isPending}
              data-testid={`button-delete-officer-${officer.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Encargados de Cumplimiento</h1>
          <p className="text-muted-foreground">
            Gestión de encargados de prevención del lavado de activos
          </p>
        </div>
        <Button onClick={handleNewOfficer} data-testid="button-new-officer">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Encargado
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Buscar</label>
              <Input
                placeholder="Nombre o email..."
                value={filter.search}
                onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                data-testid="input-search"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Entidad Fiscal</label>
              <Select
                value={filter.fiscalEntityId}
                onValueChange={(value) => setFilter(prev => ({ ...prev, fiscalEntityId: value === "all" ? "" : value }))}
              >
                <SelectTrigger data-testid="select-entity-filter">
                  <SelectValue placeholder="Todas las entidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las entidades</SelectItem>
                  {fiscalEntities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Tipo de Rol</label>
              <Select
                value={filter.roleType}
                onValueChange={(value) => setFilter(prev => ({ ...prev, roleType: value === "all-roles" ? "" : value }))}
              >
                <SelectTrigger data-testid="select-role-filter">
                  <SelectValue placeholder="Todos los roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-roles">Todos los roles</SelectItem>
                  <SelectItem value="encargado_prevencion">Encargado de Prevención</SelectItem>
                  <SelectItem value="oficial_cumplimiento">Oficial de Cumplimiento</SelectItem>
                  <SelectItem value="sujeto_responsable">Sujeto Responsable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant={filter.activeOnly ? "default" : "outline"}
                onClick={() => setFilter(prev => ({ ...prev, activeOnly: !prev.activeOnly }))}
                data-testid="button-active-filter"
              >
                {filter.activeOnly ? "Solo Activos" : "Todos"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list" data-testid="tab-list">Lista Completa</TabsTrigger>
          <TabsTrigger value="hierarchy" data-testid="tab-hierarchy">Vista Jerárquica</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Todos los Encargados ({getFilteredOfficers().length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : getFilteredOfficers().length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontraron encargados de cumplimiento
                </div>
              ) : (
                <div className="space-y-4">
                  {getFilteredOfficers().map(renderOfficerCard)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hierarchy" className="space-y-4">
          {/* Principal Officers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-600" />
                Principales ({getOfficersByHierarchy(1).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getOfficersByHierarchy(1).length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No hay encargados principales
                </div>
              ) : (
                <div className="space-y-4">
                  {getOfficersByHierarchy(1).map(renderOfficerCard)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Coordinators */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Coordinadores ({getOfficersByHierarchy(2).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getOfficersByHierarchy(2).length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No hay coordinadores
                </div>
              ) : (
                <div className="space-y-4">
                  {getOfficersByHierarchy(2).map(renderOfficerCard)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Specialists */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-green-600" />
                Especialistas ({getOfficersByHierarchy(3).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getOfficersByHierarchy(3).length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No hay especialistas
                </div>
              ) : (
                <div className="space-y-4">
                  {getOfficersByHierarchy(3).map(renderOfficerCard)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-officer-form">
          <DialogHeader>
            <DialogTitle>
              {editingOfficer ? "Editar Encargado" : "Nuevo Encargado"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Juan Carlos Pérez López" {...field} data-testid="input-full-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="juan.perez@empresa.com" 
                          {...field} 
                          data-testid="input-email" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="+1234567890" {...field} data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="fiscalEntityIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entidades Fiscales</FormLabel>
                      <div className="space-y-2">
                        {fiscalEntities.map((entity) => (
                          <div key={entity.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={field.value?.includes(entity.id) || false}
                              onCheckedChange={(checked) => {
                                const currentValues = field.value || [];
                                if (checked) {
                                  field.onChange([...currentValues, entity.id]);
                                } else {
                                  field.onChange(currentValues.filter((id) => id !== entity.id));
                                }
                              }}
                              data-testid={`checkbox-entity-${entity.id}`}
                            />
                            <label className="text-sm font-medium">
                              {entity.name} ({entity.code})
                            </label>
                          </div>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />

                {/* Legacy single entity support - hidden but maintained for backward compatibility */}
                <FormField
                  control={form.control}
                  name="fiscalEntityId"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-fiscal-entity-legacy">
                            <SelectValue placeholder="Seleccionar entidad" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {fiscalEntities.map((entity) => (
                            <SelectItem key={entity.id} value={entity.id}>
                              {entity.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="roleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Rol</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-role-type">
                            <SelectValue placeholder="Seleccionar rol" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="encargado_prevencion">Encargado de Prevención</SelectItem>
                          <SelectItem value="oficial_cumplimiento">Oficial de Cumplimiento</SelectItem>
                          <SelectItem value="sujeto_responsable">Sujeto Responsable</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hierarchyLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nivel Jerárquico</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger data-testid="select-hierarchy-level">
                            <SelectValue placeholder="Seleccionar nivel" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1 - Principal</SelectItem>
                          <SelectItem value="2">2 - Coordinador</SelectItem>
                          <SelectItem value="3">3 - Especialista</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo en la Empresa (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Gerente de Cumplimiento" {...field} data-testid="input-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="assignmentStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Inicio de Asignación</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-assignment-start-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assignmentEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Fin de Asignación (Opcional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-assignment-end-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {form.watch("hierarchyLevel") === 3 && (
                <FormField
                  control={form.control}
                  name="crimeCategories"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categorías de Delitos Especializadas</FormLabel>
                      <div className="space-y-2">
                        {crimeCategories
                          .filter(cat => cat.isActive)
                          .map((category) => (
                            <div key={category.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`category-${category.id}`}
                                checked={field.value?.includes(category.id) || false}
                                onChange={(e) => {
                                  const currentValues = field.value || [];
                                  if (e.target.checked) {
                                    field.onChange([...currentValues, category.id]);
                                  } else {
                                    field.onChange(currentValues.filter(id => id !== category.id));
                                  }
                                }}
                                data-testid={`checkbox-category-${category.id}`}
                              />
                              <label htmlFor={`category-${category.id}`} className="text-sm">
                                {category.name} ({category.code})
                              </label>
                            </div>
                          ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Información adicional sobre el encargado..."
                        {...field}
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* File Upload Section - Temporalmente comentado para debugging */}
              {/*
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Documentación de Designación
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                        }
                      }}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      data-testid="input-file-upload"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Adjuntar acta de designación (PDF, DOC, DOCX, JPG, PNG - Máx. 10MB)
                    </p>
                    {selectedFile && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                        <Paperclip className="h-4 w-4" />
                        <span>{selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedFile(null)}
                          className="h-auto p-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              */}

              {/* Nota sobre adjuntos */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-600">
                  <Paperclip className="h-4 w-4" />
                  <span className="text-sm font-medium">Documentación de Designación</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  La funcionalidad de adjuntos estará disponible próximamente para cargar actas de designación en PDF.
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-officer"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Guardando..."
                    : editingOfficer
                    ? "Actualizar"
                    : "Crear"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Officer Details Dialog */}
      {selectedOfficer && (
        <Dialog open={!!selectedOfficer} onOpenChange={() => setSelectedOfficer(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-officer-details">
            <DialogHeader>
              <DialogTitle>
                Detalles del Encargado: {selectedOfficer.fullName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Información Personal</h3>
                  <div className="space-y-2 text-sm">
                    <div><strong>Nombre:</strong> {selectedOfficer.fullName}</div>
                    <div><strong>Email:</strong> {selectedOfficer.email}</div>
                    {selectedOfficer.phone && <div><strong>Teléfono:</strong> {selectedOfficer.phone}</div>}
                    <div><strong>Rol:</strong> {ROLE_TYPE_LABELS[selectedOfficer.roleType as keyof typeof ROLE_TYPE_LABELS] || selectedOfficer.roleType}</div>
                    <div><strong>Nivel:</strong> {HIERARCHY_LABELS[selectedOfficer.hierarchyLevel as keyof typeof HIERARCHY_LABELS] || `Nivel ${selectedOfficer.hierarchyLevel}`}</div>
                    <div><strong>Estado:</strong> {selectedOfficer.status === "active" ? "Activo" : "Inactivo"}</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Información del Cargo</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Entidades:</strong>{" "}
                      {selectedOfficer.fiscalEntities && selectedOfficer.fiscalEntities.length > 0 ? (
                        <div className="ml-4 space-y-1">
                          {selectedOfficer.fiscalEntities.map((entity) => (
                            <div key={entity.id} className="flex items-center gap-2">
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              {entity.name} ({entity.code})
                            </div>
                          ))}
                        </div>
                      ) : selectedOfficer.fiscalEntity ? (
                        <span>{selectedOfficer.fiscalEntity.name}</span>
                      ) : (
                        <span>Sin entidades asignadas</span>
                      )}
                    </div>
                    <div><strong>Inicio:</strong> {format(new Date(selectedOfficer.assignmentStartDate), 'dd/MM/yyyy', { locale: es })}</div>
                    {selectedOfficer.assignmentEndDate && (
                      <div><strong>Fin:</strong> {format(new Date(selectedOfficer.assignmentEndDate), 'dd/MM/yyyy', { locale: es })}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Crime Categories */}
              {selectedOfficer.crimeCategData && selectedOfficer.crimeCategData.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Categorías de Delitos Especializadas</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedOfficer.crimeCategData.map((category) => (
                      <Badge key={category.id} variant="outline">
                        {category.name} ({category.code})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedOfficer.notes && (
                <div>
                  <h3 className="font-semibold mb-2">Notas</h3>
                  <p className="text-sm text-muted-foreground">{selectedOfficer.notes}</p>
                </div>
              )}

              {/* Attachments */}
              {selectedOfficer.attachments && selectedOfficer.attachments.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Archivos Adjuntos</h3>
                  <div className="space-y-2">
                    {selectedOfficer.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm">{attachment.originalFilename}</span>
                          <span className="text-xs text-muted-foreground">
                            ({Math.round(attachment.size / 1024)} KB)
                          </span>
                        </div>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}