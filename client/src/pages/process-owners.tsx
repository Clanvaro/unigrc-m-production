import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, UserCheck, Mail, UserX, Edit, Building, Calendar, Eye, ChevronUp, ChevronDown } from "lucide-react";
import { CreateGuard, EditGuard, DeleteGuard } from "@/components/auth/permission-guard";
import type { ProcessOwner } from "@shared/schema";
import { ProcessOwnerForm } from "../components/forms/process-owner-form-v2";

export default function ProcessOwnersPage() {
  const [selectedProcessOwner, setSelectedProcessOwner] = useState<ProcessOwner | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sortField, setSortField] = useState<'name' | 'isActive' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Escuchar evento del header para abrir el diálogo
  useEffect(() => {
    const handleOpenDialog = () => {
      setSelectedProcessOwner(null);
      setDialogOpen(true);
    };

    window.addEventListener('openProcessOwnerDialog', handleOpenDialog);
    return () => window.removeEventListener('openProcessOwnerDialog', handleOpenDialog);
  }, []);

  const { data: processOwners = [], isLoading } = useQuery<ProcessOwner[]>({
    queryKey: ["/api/process-owners"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (ownerId: string) => {
      await apiRequest(`/api/process-owners/${ownerId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/process-owners"] });
      toast({
        title: "Dueño de proceso eliminado",
        description: "El dueño de proceso ha sido eliminado exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el dueño de proceso.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (processOwner: ProcessOwner) => {
    setSelectedProcessOwner(processOwner);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedProcessOwner(null);
    setDialogOpen(true);
  };

  const handleDelete = (ownerId: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este dueño de proceso?")) {
      deleteMutation.mutate(ownerId);
    }
  };

  const handleFormSuccess = () => {
    setDialogOpen(false);
    setSelectedProcessOwner(null);
    queryClient.invalidateQueries({ queryKey: ["/api/process-owners"] });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800";
  };

  const handleSort = (field: 'name' | 'isActive') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedProcessOwners = [...processOwners].sort((a, b) => {
    if (!sortField) return 0;

    let comparison = 0;
    
    if (sortField === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortField === 'isActive') {
      comparison = (a.isActive === b.isActive) ? 0 : a.isActive ? -1 : 1;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-muted-foreground">Cargando dueños de proceso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dialog para crear/editar dueño de proceso - controlado desde el header */}
      <CreateGuard itemType="process-owners">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedProcessOwner ? "Editar Dueño de Proceso" : "Nuevo Dueño de Proceso"}
              </DialogTitle>
              <DialogDescription>
                {selectedProcessOwner 
                  ? "Modifica la información del dueño de proceso"
                  : "Registra un nuevo dueño de proceso para validación externa"
                }
              </DialogDescription>
            </DialogHeader>
            <ProcessOwnerForm
              processOwner={selectedProcessOwner}
              onSuccess={handleFormSuccess}
              onCancel={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CreateGuard>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center space-x-1 hover:text-foreground transition-colors"
                >
                  <span>Dueño</span>
                  {sortField === 'name' && (
                    sortOrder === 'asc' ? 
                      <ChevronUp className="h-4 w-4" /> : 
                      <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </TableHead>
              <TableHead className="w-[200px]">Cargo</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('isActive')}
                  className="flex items-center space-x-1 hover:text-foreground transition-colors"
                >
                  <span>Estado</span>
                  {sortField === 'isActive' && (
                    sortOrder === 'asc' ? 
                      <ChevronUp className="h-4 w-4" /> : 
                      <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </TableHead>
              <TableHead>Fecha Creación</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProcessOwners.map((owner) => (
              <TableRow key={owner.id} data-testid={`row-process-owner-${owner.id}`}>
                <TableCell className="font-medium">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs font-medium">
                        {getInitials(owner.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="font-medium" data-testid={`text-owner-name-${owner.id}`}>
                      {owner.name}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm" data-testid={`text-owner-position-${owner.id}`}>
                    {owner.position}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm" data-testid={`text-owner-email-${owner.id}`}>
                    {owner.email}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm" data-testid={`text-owner-company-${owner.id}`}>
                    {owner.company}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge 
                    className={`text-xs ${getStatusColor(owner.isActive)}`}
                    data-testid={`badge-status-${owner.id}`}
                  >
                    {owner.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm" data-testid={`text-owner-created-${owner.id}`}>
                    {owner.createdAt ? new Date(owner.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <EditGuard itemType="process-owners">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(owner)}
                        data-testid={`button-edit-${owner.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </EditGuard>
                    <DeleteGuard itemType="process-owners">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(owner.id)}
                        className="text-red-600 hover:text-red-700"
                        data-testid={`button-delete-${owner.id}`}
                      >
                        <UserX className="w-4 h-4" />
                      </Button>
                    </DeleteGuard>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {processOwners.length === 0 && (
        <div className="text-center py-12">
          <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            No hay dueños de proceso registrados
          </h3>
          <p className="text-muted-foreground mb-4">
            Comienza registrando el primer dueño de proceso para habilitar la validación externa
          </p>
          <CreateGuard itemType="process-owners">
            <Button onClick={handleCreate} data-testid="button-create-first-process-owner">
              <Plus className="w-4 h-4 mr-2" />
              Registrar Primer Dueño
            </Button>
          </CreateGuard>
        </div>
      )}
    </div>
  );
}