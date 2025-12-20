import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertProcessOwnerSchema, type ProcessOwner } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { processOwnerFormSchema, type ProcessOwnerFormValues } from "./process-owner-form-v2-schema";

interface ProcessOwnerFormProps {
  processOwner?: ProcessOwner | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ProcessOwnerForm({ processOwner, onSuccess, onCancel }: ProcessOwnerFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!processOwner;

  // Fetch fiscal entities for the company dropdown
  const { data: fiscalEntities } = useQuery<any[]>({
    queryKey: ["/api/fiscal-entities"],
  });

  const form = useForm<ProcessOwnerFormValues>({
    resolver: zodResolver(processOwnerFormSchema),
    defaultValues: {
      name: processOwner?.name || "",
      email: processOwner?.email || "",
      position: processOwner?.position || "",
      company: processOwner?.company || "",
      isActive: processOwner?.isActive ?? true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProcessOwnerFormValues) => {
      const response = await apiRequest("/api/process-owners", "POST", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/process-owners"] });
      toast({
        title: "Dueño de proceso creado",
        description: "El dueño de proceso ha sido registrado exitosamente.",
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      console.log('❌ Create error object:', error);
      console.log('❌ Error message:', error.message);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el responsable.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProcessOwnerFormValues) => {
      const response = await apiRequest(`/api/process-owners/${processOwner!.id}`, "PUT", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/process-owners"] });
      toast({
        title: "Dueño de proceso actualizado",
        description: "La información ha sido actualizada exitosamente.",
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      console.log('❌ Update error object:', error);
      console.log('❌ Error message:', error.message);
      console.log('❌ Error as string:', String(error));
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el responsable.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProcessOwnerFormValues) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre Completo *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ej. Juan Pérez González" 
                  {...field} 
                  data-testid="input-process-owner-name"
                  onKeyDown={(e) => { if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") { e.stopPropagation(); } }} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo Electrónico *</FormLabel>
              <FormControl>
                <Input 
                  type="email"
                  placeholder="ejemplo@empresa.com" 
                  {...field} 
                  data-testid="input-process-owner-email"
                  onKeyDown={(e) => { if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") { e.stopPropagation(); } }} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="position"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cargo *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ej. Gerente de Operaciones" 
                  {...field} 
                  data-testid="input-process-owner-position"
                  onKeyDown={(e) => { if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") { e.stopPropagation(); } }} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="company"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Empresa *</FormLabel>
              <FormControl>
                <select
                  {...field}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="select-process-owner-company"
                  onChange={(e) => field.onChange(e.target.value)}
                >
                  <option value="">-- Selecciona una entidad fiscal --</option>
                  {fiscalEntities && Array.isArray(fiscalEntities) && fiscalEntities.map((entity: any) => (
                    <option key={entity.id} value={entity.name}>
                      {entity.name}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="checkbox-process-owner-active"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Activo</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Los dueños activos pueden recibir solicitudes de validación
                </p>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            data-testid="button-cancel-process-owner"
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
            data-testid="button-submit-process-owner"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? "Actualizar" : "Crear"}
          </Button>
        </div>
      </form>
    </Form>
  );
}