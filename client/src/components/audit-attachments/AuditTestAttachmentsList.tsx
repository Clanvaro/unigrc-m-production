import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  File,
  Image,
  FileText,
  FileSpreadsheet,
  Calendar,
  User,
  Tag,
  Shield,
  MoreVertical,
  SortAsc,
  SortDesc,
  Grid3X3,
  List,
  RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export interface AuditTestAttachment {
  id: string;
  auditTestId: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  attachmentCode: string;
  storageUrl: string;
  objectPath: string;
  description?: string;
  category: string;
  tags: string[];
  isConfidential: boolean;
  isActive: boolean;
  uploadedBy: string;
  uploadedAt: string;
  updatedAt: string;
  // Joined user data
  uploadedByUser?: {
    id: string;
    fullName: string;
    email: string;
  };
}

interface AuditTestAttachmentsListProps {
  auditTestId: string;
  onPreviewFile?: (attachment: AuditTestAttachment) => void;
  onEditMetadata?: (attachment: AuditTestAttachment) => void;
  allowBulkActions?: boolean;
  allowDelete?: boolean;
  showStats?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  'evidence': 'Evidencia',
  'workpaper': 'Papel de Trabajo',
  'reference': 'Referencia',
  'communication': 'Comunicación',
  'regulation': 'Normativa'
};

const CATEGORY_COLORS: Record<string, string> = {
  'evidence': 'bg-green-100 text-green-800',
  'workpaper': 'bg-blue-100 text-blue-800',
  'reference': 'bg-purple-100 text-purple-800',
  'communication': 'bg-orange-100 text-orange-800',
  'regulation': 'bg-red-100 text-red-800'
};

type SortField = 'fileName' | 'fileSize' | 'uploadedAt' | 'category' | 'attachmentCode';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

export function AuditTestAttachmentsList({
  auditTestId,
  onPreviewFile,
  onEditMetadata,
  allowBulkActions = true,
  allowDelete = true,
  showStats = true
}: AuditTestAttachmentsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [confidentialFilter, setConfidentialFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("uploadedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: attachments = [], isLoading, error, refetch } = useQuery<AuditTestAttachment[]>({
    queryKey: ['/api/audit-tests', auditTestId, 'attachments'],
    queryFn: async () => {
      const response = await fetch(`/api/audit-tests/${auditTestId}/attachments`);
      if (!response.ok) throw new Error('Failed to fetch attachments');
      const data = await response.json();
      return data.attachments || [];
    },
  });

  // Delete mutation for single attachment
  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      return apiRequest(`/api/audit-test-attachments/${attachmentId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/audit-tests', auditTestId, 'attachments'] });
      toast({
        title: "Adjunto eliminado",
        description: "El archivo ha sido eliminado exitosamente."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar el archivo. Intenta nuevamente.",
        variant: "destructive"
      });
    }
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (attachmentIds: string[]) => {
      const results = await Promise.allSettled(
        attachmentIds.map(id => apiRequest(`/api/audit-test-attachments/${id}`, "DELETE"))
      );
      return results;
    },
    onSuccess: (results, attachmentIds) => {
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      queryClient.invalidateQueries({ queryKey: ['/api/audit-tests', auditTestId, 'attachments'] });
      setSelectedIds(new Set());
      
      if (successful > 0) {
        toast({
          title: "Adjuntos eliminados",
          description: `${successful} archivo(s) eliminado(s) exitosamente.${failed > 0 ? ` ${failed} fallaron.` : ''}`
        });
      }
      
      if (failed > 0 && successful === 0) {
        toast({
          title: "Error al eliminar",
          description: "No se pudieron eliminar los archivos seleccionados.",
          variant: "destructive"
        });
      }
    }
  });

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType === 'application/pdf') return FileText;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet;
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
  };

  const filteredAndSortedAttachments = useMemo(() => {
    let filtered = attachments.filter(attachment => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === "" || 
        attachment.fileName.toLowerCase().includes(searchLower) ||
        attachment.attachmentCode.toLowerCase().includes(searchLower) ||
        attachment.description?.toLowerCase().includes(searchLower) ||
        attachment.tags.some(tag => tag.toLowerCase().includes(searchLower));

      // Category filter
      const matchesCategory = categoryFilter === "all" || attachment.category === categoryFilter;

      // Confidential filter
      const matchesConfidential = confidentialFilter === "all" || 
        (confidentialFilter === "confidential" && attachment.isConfidential) ||
        (confidentialFilter === "public" && !attachment.isConfidential);

      // Date filter
      let matchesDate = true;
      if (dateFilter !== "all") {
        const uploadDate = new Date(attachment.uploadedAt);
        const now = new Date();
        
        switch (dateFilter) {
          case "today":
            matchesDate = uploadDate.toDateString() === now.toDateString();
            break;
          case "week":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = uploadDate >= weekAgo;
            break;
          case "month":
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = uploadDate >= monthAgo;
            break;
        }
      }

      return matchesSearch && matchesCategory && matchesConfidential && matchesDate;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'uploadedAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (sortField === 'fileSize') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      } else {
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [attachments, searchTerm, categoryFilter, confidentialFilter, dateFilter, sortField, sortOrder]);

  // Statistics
  const stats = useMemo(() => {
    const total = attachments.length;
    const totalSize = attachments.reduce((sum, att) => sum + att.fileSize, 0);
    const byCategory = attachments.reduce((acc, att) => {
      acc[att.category] = (acc[att.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const confidentialCount = attachments.filter(att => att.isConfidential).length;

    return { total, totalSize, byCategory, confidentialCount };
  }, [attachments]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredAndSortedAttachments.map(att => att.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectItem = (attachmentId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(attachmentId);
    } else {
      newSelected.delete(attachmentId);
    }
    setSelectedIds(newSelected);
  };

  const handleDownload = async (attachment: AuditTestAttachment) => {
    try {
      const response = await fetch(`/api/audit-test-attachments/${attachment.id}/download`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Descarga iniciada",
        description: `Descargando ${attachment.fileName}`
      });
    } catch (error) {
      toast({
        title: "Error de descarga",
        description: "No se pudo descargar el archivo.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = (attachmentId: string) => {
    deleteMutation.mutate(attachmentId);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    bulkDeleteMutation.mutate(Array.from(selectedIds));
  };

  if (error) {
    return (
      <Card className="w-full" data-testid="attachments-error">
        <CardContent className="p-6 text-center">
          <div className="text-red-500 mb-4">
            <FileText className="h-12 w-12 mx-auto mb-2" />
            <h3 className="font-semibold">Error al cargar adjuntos</h3>
            <p className="text-sm text-muted-foreground">
              No se pudieron cargar los archivos adjuntos.
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Intentar nuevamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full" data-testid="attachments-list">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <File className="h-5 w-5" />
            Adjuntos ({filteredAndSortedAttachments.length})
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              data-testid="button-toggle-view"
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              data-testid="button-toggle-filters"
            >
              <Filter className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Stats */}
        {showStats && stats.total > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total archivos</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</div>
              <div className="text-sm text-muted-foreground">Tamaño total</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.confidentialCount}</div>
              <div className="text-sm text-muted-foreground">Confidenciales</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {Object.keys(stats.byCategory).length}
              </div>
              <div className="text-sm text-muted-foreground">Categorías</div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar archivos por nombre, código o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger data-testid="select-category-filter">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fecha</Label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger data-testid="select-date-filter">
                    <SelectValue placeholder="Cualquier fecha" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Cualquier fecha</SelectItem>
                    <SelectItem value="today">Hoy</SelectItem>
                    <SelectItem value="week">Última semana</SelectItem>
                    <SelectItem value="month">Último mes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Confidencialidad</Label>
                <Select value={confidentialFilter} onValueChange={setConfidentialFilter}>
                  <SelectTrigger data-testid="select-confidential-filter">
                    <SelectValue placeholder="Todos los archivos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los archivos</SelectItem>
                    <SelectItem value="public">Solo públicos</SelectItem>
                    <SelectItem value="confidential">Solo confidenciales</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ordenar por</Label>
                <Select value={`${sortField}-${sortOrder}`} onValueChange={(value) => {
                  const [field, order] = value.split('-') as [SortField, SortOrder];
                  setSortField(field);
                  setSortOrder(order);
                }}>
                  <SelectTrigger data-testid="select-sort">
                    <SelectValue placeholder="Ordenamiento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uploadedAt-desc">Más recientes</SelectItem>
                    <SelectItem value="uploadedAt-asc">Más antiguos</SelectItem>
                    <SelectItem value="fileName-asc">Nombre A-Z</SelectItem>
                    <SelectItem value="fileName-desc">Nombre Z-A</SelectItem>
                    <SelectItem value="fileSize-desc">Tamaño mayor</SelectItem>
                    <SelectItem value="fileSize-asc">Tamaño menor</SelectItem>
                    <SelectItem value="category-asc">Categoría A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        )}

        {/* Bulk Actions */}
        {allowBulkActions && selectedIds.size > 0 && (
          <Card className="p-4 bg-blue-50 dark:bg-blue-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedIds.size === filteredAndSortedAttachments.length}
                  onCheckedChange={handleSelectAll}
                  data-testid="checkbox-select-all"
                />
                <span className="text-sm font-medium">
                  {selectedIds.size} archivo(s) seleccionado(s)
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {allowDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        disabled={bulkDeleteMutation.isPending}
                        data-testid="button-bulk-delete"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar seleccionados
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar archivos seleccionados?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción eliminará permanentemente {selectedIds.size} archivo(s). 
                          No se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive">
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedIds(new Set())}
                  data-testid="button-clear-selection"
                >
                  Limpiar selección
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-muted animate-pulse rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
                    <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredAndSortedAttachments.length === 0 ? (
          <Card className="p-8 text-center">
            <File className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">
              {searchTerm || categoryFilter !== "all" || dateFilter !== "all" || confidentialFilter !== "all" 
                ? "No se encontraron adjuntos" 
                : "No hay adjuntos"}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {searchTerm || categoryFilter !== "all" || dateFilter !== "all" || confidentialFilter !== "all"
                ? "Intenta ajustar los filtros para encontrar los archivos que buscas."
                : "Los archivos adjuntos aparecerán aquí una vez que se suban."}
            </p>
            {(searchTerm || categoryFilter !== "all" || dateFilter !== "all" || confidentialFilter !== "all") && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter("all");
                  setDateFilter("all");
                  setConfidentialFilter("all");
                }}
                data-testid="button-clear-filters"
              >
                Limpiar filtros
              </Button>
            )}
          </Card>
        ) : (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
            : "space-y-2"
          }>
            {filteredAndSortedAttachments.map((attachment) => {
              const FileIcon = getFileIcon(attachment.mimeType);
              const isSelected = selectedIds.has(attachment.id);

              return viewMode === 'grid' ? (
                <Card key={attachment.id} className={`p-4 transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}>
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      {allowBulkActions && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelectItem(attachment.id, !!checked)}
                          data-testid={`checkbox-select-${attachment.id}`}
                        />
                      )}
                      
                      <div className="flex items-center gap-2 ml-auto">
                        {attachment.isConfidential && (
                          <Shield className="h-4 w-4 text-red-500" aria-label="Confidencial" />
                        )}
                      </div>
                    </div>

                    {/* File Icon & Info */}
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 mx-auto bg-muted rounded-lg flex items-center justify-center">
                        <FileIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                      
                      <div className="space-y-1">
                        <h4 
                          className="font-medium text-sm truncate" 
                          title={attachment.fileName}
                          data-testid={`text-filename-${attachment.id}`}
                        >
                          {attachment.fileName}
                        </h4>
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                          data-testid={`badge-code-${attachment.id}`}
                        >
                          {attachment.attachmentCode}
                        </Badge>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tamaño:</span>
                        <span data-testid={`text-size-${attachment.id}`}>
                          {formatFileSize(attachment.fileSize)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Categoría:</span>
                        <Badge 
                          className={`text-xs ${CATEGORY_COLORS[attachment.category] || 'bg-gray-100 text-gray-800'}`}
                          data-testid={`badge-category-${attachment.id}`}
                        >
                          {CATEGORY_LABELS[attachment.category] || attachment.category}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subido:</span>
                        <span data-testid={`text-date-${attachment.id}`}>
                          {formatDate(attachment.uploadedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Tags */}
                    {attachment.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {attachment.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {attachment.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{attachment.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-center gap-1">
                      {onPreviewFile && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPreviewFile(attachment)}
                          data-testid={`button-preview-${attachment.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(attachment)}
                        data-testid={`button-download-${attachment.id}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      
                      {onEditMetadata && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditMetadata(attachment)}
                          data-testid={`button-edit-${attachment.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {allowDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              data-testid={`button-delete-${attachment.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                ¿Estás seguro de que deseas eliminar "{attachment.fileName}"? 
                                Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(attachment.id)}
                                className="bg-destructive"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </Card>
              ) : (
                <Card key={attachment.id} className={`p-3 transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}>
                  <div className="flex items-center gap-4">
                    {allowBulkActions && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectItem(attachment.id, !!checked)}
                        data-testid={`checkbox-select-${attachment.id}`}
                      />
                    )}

                    {/* File Icon */}
                    <div className="w-10 h-10 bg-muted rounded flex items-center justify-center flex-shrink-0">
                      <FileIcon className="h-5 w-5 text-muted-foreground" />
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 
                          className="font-medium truncate" 
                          title={attachment.fileName}
                          data-testid={`text-filename-${attachment.id}`}
                        >
                          {attachment.fileName}
                        </h4>
                        <Badge 
                          variant="outline" 
                          className="text-xs flex-shrink-0"
                          data-testid={`badge-code-${attachment.id}`}
                        >
                          {attachment.attachmentCode}
                        </Badge>
                        {attachment.isConfidential && (
                          <Shield className="h-4 w-4 text-red-500 flex-shrink-0" aria-label="Confidencial" />
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span data-testid={`text-size-${attachment.id}`}>
                          {formatFileSize(attachment.fileSize)}
                        </span>
                        
                        <Badge 
                          className={`text-xs ${CATEGORY_COLORS[attachment.category] || 'bg-gray-100 text-gray-800'}`}
                          data-testid={`badge-category-${attachment.id}`}
                        >
                          {CATEGORY_LABELS[attachment.category] || attachment.category}
                        </Badge>
                        
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span data-testid={`text-date-${attachment.id}`}>
                            {formatDate(attachment.uploadedAt)}
                          </span>
                        </div>
                        
                        {attachment.uploadedByUser && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{attachment.uploadedByUser.fullName}</span>
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      {attachment.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {attachment.tags.slice(0, 5).map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                          {attachment.tags.length > 5 && (
                            <Badge variant="secondary" className="text-xs">
                              +{attachment.tags.length - 5}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {attachment.description && (
                        <p className="text-xs text-muted-foreground truncate" title={attachment.description}>
                          {attachment.description}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {onPreviewFile && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onPreviewFile(attachment)}
                          data-testid={`button-preview-${attachment.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(attachment)}
                        data-testid={`button-download-${attachment.id}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      
                      {onEditMetadata && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditMetadata(attachment)}
                          data-testid={`button-edit-${attachment.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {allowDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              data-testid={`button-delete-${attachment.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                ¿Estás seguro de que deseas eliminar "{attachment.fileName}"? 
                                Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(attachment.id)}
                                className="bg-destructive"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}