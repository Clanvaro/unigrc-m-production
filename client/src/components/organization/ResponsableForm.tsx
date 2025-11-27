import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProcessOwner } from "@shared/schema";

export interface ResponsableFormProps {
  responsable?: ProcessOwner | null;
  onSubmit: (data: { name: string; email: string; position?: string; company?: string; isActive: boolean }) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function ResponsableForm({ 
  responsable, 
  onSubmit, 
  onCancel, 
  isPending = false 
}: ResponsableFormProps) {
  const [name, setName] = useState(responsable?.name || "");
  const [email, setEmail] = useState(responsable?.email || "");
  const [position, setPosition] = useState(responsable?.position || "");
  const [company, setCompany] = useState(responsable?.company || "");
  const [isActive, setIsActive] = useState(responsable?.isActive ?? true);

  const { data: fiscalEntities = [] } = useQuery<any[]>({
    queryKey: ["/api/fiscal-entities"],
    staleTime: 60000,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      email: email.trim(),
      position: position.trim() || undefined,
      company: company.trim() || undefined,
      isActive
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Juan Pérez"
          required
          data-testid="input-responsable-name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Ej: juan.perez@empresa.com"
          required
          data-testid="input-responsable-email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="position">Cargo</Label>
        <Input
          id="position"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          placeholder="Ej: Gerente de Operaciones"
          data-testid="input-responsable-position"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="company">Empresa (Entidad Fiscal)</Label>
        <Select value={company || "none"} onValueChange={(value) => setCompany(value === "none" ? "" : value)}>
          <SelectTrigger id="company" data-testid="select-responsable-company">
            <SelectValue placeholder="Seleccionar entidad fiscal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" data-testid="select-company-none">Sin especificar</SelectItem>
            {fiscalEntities.map((entity: any) => (
              <SelectItem key={entity.id} value={entity.name} data-testid={`select-company-${entity.id}`}>
                {entity.code} - {entity.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isActive"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-4 w-4"
          data-testid="checkbox-responsable-active"
        />
        <Label htmlFor="isActive" className="cursor-pointer">
          Activo
        </Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
          data-testid="button-cancel-form"
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending || !name.trim() || !email.trim()} data-testid="button-submit-form">
          {isPending ? "Guardando..." : responsable ? "Actualizar" : "Crear"}
        </Button>
      </div>
    </form>
  );
}
