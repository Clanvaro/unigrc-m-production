import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ResponsiveTable, 
  ResponsiveTableContent,
  ResponsiveTableHeader, 
  ResponsiveTableBody, 
  ResponsiveTableRow, 
  ResponsiveTableHead, 
  ResponsiveTableCell 
} from "@/components/ui/responsive-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Download,
  Trash2,
  FileText,
  FolderOpen,
  HardDrive,
  FileCheck,
  Eye,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

// Types
interface WorkingPaperDocument {
  id: string;
  auditTestId: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  mimeType: string;
  attachmentCode: string;
  storageUrl: string;
  description: string | null;
  category: string;
  isConfidential: boolean;
  uploadedAt: string;
  uploadedBy: string;
  auditId: string | null;
  auditName: string;
  auditCode: string;
  testCode: string;
  testName: string;
  categoryLabel: string;
  fileSizeFormatted: string;
  uploadedByName: string;
}

interface WorkingPapersSummary {
  totalDocuments: number;
  totalSize: number;
  totalSizeFormatted: string;
  byAudit: Array<{
    auditId: string;
    auditName: string;
    auditCode: string;
    documentCount: number;
    totalSize: number;
    totalSizeFormatted: string;
  }>;
  byCategory: Array<{
    category: string;
    categoryLabel: string;
    count: number;
  }>;
}

interface WorkingPapersResponse {
  data: WorkingPaperDocument[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export default function WorkingPapers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [auditFilter, setAuditFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<WorkingPaperDocument | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch summary statistics
  const { data: summary, isLoading: summaryLoading } = useQuery<WorkingPapersSummary>({
    queryKey: ['/api/working-papers/summary'],
    staleTime: 30000, // 30 seconds
  });

  // Fetch documents with filters
  const { data: documentsResponse, isLoading: documentsLoading, refetch } = useQuery<WorkingPapersResponse>({
    queryKey: ['/api/working-papers', { auditId: auditFilter, category: categoryFilter, search: searchTerm }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (auditFilter !== 'all') params.append('auditId', auditFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (searchTerm) params.append('search', searchTerm);
      params.append('limit', '100');
      
      const response = await fetch(`/api/working-papers?${params.toString()}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch documents');
      return response.json();
    },
    staleTime: 15000, // 15 seconds
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fetch(`/api/working-papers/${documentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete document');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/working-papers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/working-papers/summary'] });
      toast({
        title: "Documento eliminado",
        description: "El documento se ha eliminado correctamente.",
      });
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el documento.",
        variant: "destructive",
      });
    },
  });

  // Filter documents locally for instant search feedback
  const filteredDocuments = useMemo(() => {
    if (!documentsResponse?.data) return [];
    
    return documentsResponse.data.filter(doc => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        doc.fileName.toLowerCase().includes(search) ||
        doc.attachmentCode.toLowerCase().includes(search) ||
        doc.auditName.toLowerCase().includes(search) ||
        doc.testName.toLowerCase().includes(search) ||
        doc.description?.toLowerCase().includes(search)
      );
    });
  }, [documentsResponse?.data, searchTerm]);

  // Get category badge style
  const getCategoryBadge = (category: string, label: string) => {
    const styles: Record<string, string> = {
      evidence: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
      workpaper: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
      working_paper: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
      reference: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
      communication: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
      regulation: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
      procedure: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
      implementation_evidence: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100",
    };
    return (
      <Badge className={styles[category] || "bg-gray-100 text-gray-800"}>
        {label}
      </Badge>
    );
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handle document download/view
  const handleViewDocument = (doc: WorkingPaperDocument) => {
    window.open(doc.storageUrl, '_blank');
  };

  // Handle delete confirmation
  const handleDeleteClick = (doc: WorkingPaperDocument) => {
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (documentToDelete) {
      deleteMutation.mutate(documentToDelete.id);
    }
  };

  const isLoading = summaryLoading || documentsLoading;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Papeles de Trabajo</h1>
          <p className="text-muted-foreground">
            Repositorio consolidado de documentos de auditoría
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{summary?.totalDocuments || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tamaño Total</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{summary?.totalSizeFormatted || '0 B'}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auditorías</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{summary?.byAudit?.length || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorías</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{summary?.byCategory?.length || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Summary */}
      {summary?.byCategory && summary.byCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Documentos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {summary.byCategory.map((cat) => (
                <div 
                  key={cat.category} 
                  className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => setCategoryFilter(cat.category)}
                >
                  {getCategoryBadge(cat.category, cat.categoryLabel)}
                  <span className="text-sm font-medium">{cat.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, código, auditoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={auditFilter} onValueChange={setAuditFilter}>
              <SelectTrigger className="w-full md:w-[250px]">
                <SelectValue placeholder="Filtrar por auditoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las auditorías</SelectItem>
                {summary?.byAudit?.map((audit) => (
                  <SelectItem key={audit.auditId} value={audit.auditId}>
                    {audit.auditCode ? `${audit.auditCode} - ` : ''}{audit.auditName} ({audit.documentCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filtrar por categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {summary?.byCategory?.map((cat) => (
                  <SelectItem key={cat.category} value={cat.category}>
                    {cat.categoryLabel} ({cat.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(auditFilter !== 'all' || categoryFilter !== 'all' || searchTerm) && (
              <Button 
                variant="ghost" 
                onClick={() => {
                  setAuditFilter('all');
                  setCategoryFilter('all');
                  setSearchTerm('');
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Documentos {filteredDocuments.length > 0 && `(${filteredDocuments.length})`}
          </CardTitle>
          <CardDescription>
            Lista completa de documentos adjuntos en auditorías
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documentsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No hay documentos</h3>
              <p className="text-muted-foreground">
                {searchTerm || auditFilter !== 'all' || categoryFilter !== 'all'
                  ? 'No se encontraron documentos con los filtros seleccionados.'
                  : 'Aún no hay documentos adjuntos en las auditorías.'}
              </p>
            </div>
          ) : (
            <ResponsiveTable>
              <ResponsiveTableContent>
                <ResponsiveTableHeader>
                  <ResponsiveTableRow>
                    <ResponsiveTableHead className="w-[140px]">Código</ResponsiveTableHead>
                    <ResponsiveTableHead>Documento</ResponsiveTableHead>
                    <ResponsiveTableHead className="hidden md:table-cell">Auditoría</ResponsiveTableHead>
                    <ResponsiveTableHead className="hidden lg:table-cell">Prueba</ResponsiveTableHead>
                    <ResponsiveTableHead className="hidden sm:table-cell">Categoría</ResponsiveTableHead>
                    <ResponsiveTableHead className="hidden md:table-cell text-right">Tamaño</ResponsiveTableHead>
                    <ResponsiveTableHead className="hidden lg:table-cell">Subido por</ResponsiveTableHead>
                    <ResponsiveTableHead className="text-right">Acciones</ResponsiveTableHead>
                  </ResponsiveTableRow>
                </ResponsiveTableHeader>
                <ResponsiveTableBody>
                  {filteredDocuments.map((doc) => (
                    <ResponsiveTableRow key={doc.id}>
                      <ResponsiveTableCell className="font-mono text-xs">
                        {doc.attachmentCode}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell>
                        <div className="flex flex-col">
                          <span className="font-medium truncate max-w-[200px]" title={doc.fileName}>
                            {doc.fileName}
                          </span>
                          {doc.description && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={doc.description}>
                              {doc.description}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground md:hidden">
                            {doc.auditName}
                          </span>
                        </div>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell className="hidden md:table-cell">
                        <span className="truncate max-w-[150px] block" title={doc.auditName}>
                          {doc.auditCode && <span className="font-mono text-xs mr-1">{doc.auditCode}</span>}
                          {doc.auditName}
                        </span>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell className="hidden lg:table-cell">
                        <span className="truncate max-w-[120px] block text-sm" title={doc.testName}>
                          {doc.testCode && <span className="font-mono text-xs mr-1">{doc.testCode}</span>}
                          {doc.testName}
                        </span>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell className="hidden sm:table-cell">
                        {getCategoryBadge(doc.category, doc.categoryLabel)}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell className="hidden md:table-cell text-right text-sm">
                        {doc.fileSizeFormatted}
                      </ResponsiveTableCell>
                      <ResponsiveTableCell className="hidden lg:table-cell">
                        <div className="flex flex-col">
                          <span className="text-sm">{doc.uploadedByName}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(doc.uploadedAt)}
                          </span>
                        </div>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDocument(doc)}
                            title="Ver/Descargar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(doc.storageUrl, '_blank')}
                            title="Abrir en nueva pestaña"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(doc)}
                            title="Eliminar"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </ResponsiveTableCell>
                    </ResponsiveTableRow>
                  ))}
                </ResponsiveTableBody>
              </ResponsiveTableContent>
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el documento "{documentToDelete?.fileName}". 
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
