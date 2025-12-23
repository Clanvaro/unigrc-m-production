import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type User, type Role } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ResponsiveTable, 
  ResponsiveTableContent,
  ResponsiveTableHeader, 
  ResponsiveTableBody, 
  ResponsiveTableRow, 
  ResponsiveTableHead, 
  ResponsiveTableCell 
} from "@/components/ui/responsive-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Award,
  Mail,
  Phone
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TeamMembersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Obtener usuarios activos
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Obtener relaciones usuario-rol
  const { data: userRoles = [] } = useQuery<any[]>({
    queryKey: ["/api/user-roles"],
  });

  // Obtener roles (usando endpoint básico accesible a todos los usuarios)
  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["/api/roles/basic"],
  });

  // Crear mapa de roles para fácil acceso
  const roleMap = new Map(roles.map(role => [role.id, role]));

  // Definir roles que pertenecen al equipo auditor
  const auditRoles = ['Supervisor de Auditoría', 'Auditor', 'Auditor Junior'];
  
  // Obtener los IDs de roles de auditoría
  const auditRoleIds = roles
    .filter(role => auditRoles.includes(role.name))
    .map(role => role.id);
  
  // Filtrar usuarios disponibles (activos que NO tienen roles de auditoría)
  const availableUsers = users.filter(user => {
    if (!user.isActive) return false;
    const hasAuditRole = userRoles.some(ur => 
      ur.userId === user.id && auditRoleIds.includes(ur.roleId)
    );
    return !hasAuditRole;
  });
  
  // Filtrar usuarios disponibles por búsqueda
  const filteredAvailableUsers = availableUsers.filter(user => {
    const searchLower = userSearchTerm.toLowerCase();
    const fullName = (user.fullName || "").toLowerCase();
    const email = (user.email || "").toLowerCase();
    const username = (user.username || "").toLowerCase();
    
    return fullName.includes(searchLower) || 
           email.includes(searchLower) || 
           username.includes(searchLower);
  });
  
  // Mutación para agregar miembro al equipo
  const addMemberMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const response = await fetch("/api/user-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, roleId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al agregar miembro");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsAddDialogOpen(false);
      setSelectedUserId("");
      setSelectedRoleId("");
      setUserSearchTerm("");
      toast({
        title: "Miembro agregado",
        description: "El miembro ha sido agregado al equipo de auditoría exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleAddMember = () => {
    if (!selectedUserId || !selectedRoleId) {
      toast({
        title: "Campos requeridos",
        description: "Por favor selecciona un usuario y un rol.",
        variant: "destructive",
      });
      return;
    }
    addMemberMutation.mutate({ userId: selectedUserId, roleId: selectedRoleId });
  };

  // Filtrar solo usuarios activos del equipo auditor y enriquecer con información de roles
  const teamMembers = users
    .filter(user => {
      if (!user.isActive) return false;
      const hasAuditRole = userRoles.some(ur => 
        ur.userId === user.id && auditRoleIds.includes(ur.roleId)
      );
      return hasAuditRole;
    })
    .map(user => {
      // Buscar específicamente el rol de auditoría del usuario
      const userRole = userRoles.find(ur => 
        ur.userId === user.id && auditRoleIds.includes(ur.roleId)
      );
      const role = userRole ? roleMap.get(userRole.roleId) : null;
      
      return {
        id: user.id,
        employeeCode: (user.username || "").toUpperCase(),
        name: user.fullName,
        email: user.email,
        phone: "+1 555-0000", // Placeholder
        department: "Auditoría Interna",
        roleId: role?.id || "",
        roleName: role?.name || "Sin rol",
        roleLevel: getRoleLevelByName(role?.name || ""),
        status: user.isActive ? "active" : "inactive",
        certifications: ["CPA"], // Placeholder
        totalHours: 160,
        availableHours: 120,
        allocatedHours: 40,
        joiningDate: user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : "2024-01-01"
      };
    });

  function getRoleLevelByName(roleName: string): number {
    if (roleName.toLowerCase().includes('gerente') || roleName.toLowerCase().includes('administrador')) return 4;
    if (roleName.toLowerCase().includes('jefe') || roleName.toLowerCase().includes('supervisor')) return 3;
    if (roleName.toLowerCase().includes('analista') || roleName.toLowerCase().includes('senior')) return 2;
    return 1; // Auditor, Junior, etc.
  }

  const filteredMembers = teamMembers.filter(member =>
    member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.roleName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (level: number) => {
    switch (level) {
      case 1: return "bg-blue-100 text-blue-800";
      case 2: return "bg-green-100 text-green-800"; 
      case 3: return "bg-orange-100 text-orange-800";
      case 4: return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "inactive": return "bg-gray-100 text-gray-800";
      case "vacation": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6" data-testid="team-members-page">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gestión del Equipo</h1>
          <p className="text-muted-foreground">
            Administra los miembros del equipo de auditoría
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-member">
              <UserPlus className="w-4 h-4 mr-2" />
              Agregar Miembro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Agregar Miembro al Equipo de Auditoría</DialogTitle>
              <DialogDescription>
                Selecciona un usuario del sistema y asígnale un rol de auditoría.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Búsqueda de usuarios */}
              <div>
                <label className="text-sm font-medium mb-2 block">Buscar Usuario</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, email o usuario..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Selector de usuario */}
              <div>
                <label className="text-sm font-medium mb-2 block">Seleccionar Usuario</label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un usuario..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredAvailableUsers.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        {availableUsers.length === 0 
                          ? "No hay usuarios disponibles para agregar"
                          : "No se encontraron usuarios con ese criterio"}
                      </div>
                    ) : (
                      filteredAvailableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{user.fullName || user.username}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Usuarios disponibles: {availableUsers.length}
                </p>
              </div>

              {/* Selector de rol de auditoría */}
              <div>
                <label className="text-sm font-medium mb-2 block">Rol de Auditoría</label>
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol..." />
                  </SelectTrigger>
                  <SelectContent>
                    {roles
                      .filter(role => auditRoles.includes(role.name))
                      .map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setSelectedUserId("");
                    setSelectedRoleId("");
                    setUserSearchTerm("");
                  }}
                  disabled={addMemberMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button 
                  data-testid="button-save-member"
                  onClick={handleAddMember}
                  disabled={!selectedUserId || !selectedRoleId || addMemberMutation.isPending}
                >
                  {addMemberMutation.isPending ? "Agregando..." : "Agregar Miembro"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Miembros</p>
                <p className="text-2xl font-bold">{teamMembers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Horas Disponibles</p>
                <p className="text-2xl font-bold">
                  {teamMembers.reduce((sum, member) => sum + member.availableHours, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Certificaciones</p>
                <p className="text-2xl font-bold">
                  {teamMembers.reduce((sum, member) => sum + member.certifications.length, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Activos</p>
                <p className="text-2xl font-bold">
                  {teamMembers.filter(member => member.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por nombre, código o rol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-members"
          />
        </div>
        <Button variant="outline" data-testid="button-filter">
          <Filter className="w-4 h-4 mr-2" />
          Filtros
        </Button>
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Miembros del Equipo</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveTable variant="compact" showScrollIndicator={true}>
            <ResponsiveTableContent variant="compact">
              <ResponsiveTableHeader variant="compact">
                <ResponsiveTableRow variant="compact">
                  <ResponsiveTableHead variant="compact" priority="high">Miembro</ResponsiveTableHead>
                  <ResponsiveTableHead variant="compact" priority="high">Rol</ResponsiveTableHead>
                  <ResponsiveTableHead variant="compact" priority="medium">Departamento</ResponsiveTableHead>
                  <ResponsiveTableHead variant="compact" priority="medium">Horas</ResponsiveTableHead>
                  <ResponsiveTableHead variant="compact" priority="low">Certificaciones</ResponsiveTableHead>
                  <ResponsiveTableHead variant="compact" priority="high">Estado</ResponsiveTableHead>
                  <ResponsiveTableHead variant="compact" priority="high">Acciones</ResponsiveTableHead>
                </ResponsiveTableRow>
              </ResponsiveTableHeader>
              <ResponsiveTableBody variant="compact">
                {filteredMembers.map((member) => (
                  <ResponsiveTableRow key={member.id} variant="compact">
                    <ResponsiveTableCell variant="compact" priority="high" label="Miembro">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{member.name}</p>
                        <p className="text-sm text-muted-foreground font-mono">{member.employeeCode}</p>
                        <div className="flex items-center gap-2 mt-1 min-w-0">
                          <Mail className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">{member.email}</span>
                        </div>
                      </div>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell variant="compact" priority="high" label="Rol">
                      <Badge className={getRoleColor(member.roleLevel)}>
                        {member.roleName}
                      </Badge>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell variant="compact" priority="medium" label="Departamento" className="text-sm">
                      <div className="min-w-0">
                        <span className="truncate block">{member.department}</span>
                      </div>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell variant="compact" priority="medium" label="Horas">
                      <div className="text-sm min-w-0">
                        <p><strong>{member.availableHours}</strong> disponibles</p>
                        <p className="text-muted-foreground">{member.allocatedHours} asignadas</p>
                      </div>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell variant="compact" priority="low" label="Certificaciones">
                      <div className="flex flex-wrap gap-1 min-w-0">
                        {member.certifications.map((cert, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell variant="compact" priority="high" label="Estado">
                      <Badge className={getStatusColor(member.status)}>
                        {member.status === 'active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </ResponsiveTableCell>
                    <ResponsiveTableCell variant="compact" priority="high" label="Acciones">
                      <div className="flex gap-1 min-w-0">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          data-testid={`button-edit-${member.id}`}
                          className="min-w-[44px] min-h-[44px] sm:min-w-auto sm:min-h-auto"
                        >
                          <Edit className="w-4 h-4" />
                          <span className="sr-only">Editar miembro</span>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700 min-w-[44px] min-h-[44px] sm:min-w-auto sm:min-h-auto"
                          data-testid={`button-delete-${member.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="sr-only">Eliminar miembro</span>
                        </Button>
                      </div>
                    </ResponsiveTableCell>
                  </ResponsiveTableRow>
                ))}
              </ResponsiveTableBody>
            </ResponsiveTableContent>
          </ResponsiveTable>
        </CardContent>
      </Card>
    </div>
  );
}