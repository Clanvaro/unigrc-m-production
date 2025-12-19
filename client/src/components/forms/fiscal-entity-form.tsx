import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertFiscalEntitySchema } from "@shared/schema";
import type { FiscalEntity, InsertFiscalEntity } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";

const formSchema = insertFiscalEntitySchema.extend({
  // Add any additional form validation if needed
});

interface FiscalEntityFormProps {
  entity?: FiscalEntity | null;
  onClose: () => void;
}

export function FiscalEntityForm({ entity, onClose }: FiscalEntityFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: entity ? {
      code: entity.code,
      name: entity.name,
      type: entity.type as "matriz" | "filial" | "otra",
      taxId: entity.taxId ?? "",
      description: entity.description ?? "",
      isActive: entity.isActive ?? true,
    } : {
      code: "",
      name: "",
      type: "matriz" as const,
      taxId: "",
      description: "",
      isActive: true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      if (entity) {
        return await apiRequest(`/api/fiscal-entities/${entity.id}`, "PUT", values);
      } else {
        return await apiRequest("/api/fiscal-entities", "POST", values);
      }
    },
    onSuccess: async () => {
      // Invalidar y refetch inmediatamente
      await queryClient.invalidateQueries({ queryKey: ["/api/fiscal-entities"] });
      await queryClient.refetchQueries({ queryKey: ["/api/fiscal-entities"] });
      toast({
        title: entity ? "Entidad actualizada" : "Entidad creada",
        description: entity
          ? "La entidad fiscal ha sido actualizada exitosamente."
          : "La entidad fiscal ha sido creada exitosamente.",
      });
      onClose();
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "No se pudo guardar la entidad fiscal.";
      const fieldErrors = error?.response?.data?.errors;
      
      toast({
        title: "Error",
        description: fieldErrors 
          ? `Error de validación: ${fieldErrors.map((e: any) => e.message).join(", ")}`
          : errorMessage,
        variant: "destructive",
      });
      console.error("Error creating/updating fiscal entity:", error);
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Remove empty strings for optional fields
    const cleanedValues = {
      ...values,
      taxId: values.taxId?.trim() || undefined,
      description: values.description?.trim() || undefined,
    };
    mutation.mutate(cleanedValues);
  };

  const entityTypes = [
    { value: "matriz", label: "Matriz" },
    { value: "filial", label: "Filial" },
    { value: "otra", label: "Otra" },
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="ABC-01" 
                    {...field}
                    data-testid="input-entity-code"
                    onKeyDown={(e) => { if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") { e.stopPropagation(); } }} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                  />
                </FormControl>
                <FormDescription>
                  Código único de identificación
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-entity-type">
                      <SelectValue placeholder="Selecciona el tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {entityTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Nombre de la entidad fiscal" 
                  {...field}
                  data-testid="input-entity-name"
                  onKeyDown={(e) => { if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") { e.stopPropagation(); } }} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="taxId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>RUT / Identificador Fiscal</FormLabel>
              <FormControl>
                <Input 
                  placeholder="12.345.678-9" 
                  {...field}
                  value={field.value ?? ""}
                  data-testid="input-entity-tax-id"
                  onKeyDown={(e) => { if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") { e.stopPropagation(); } }} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                />
              </FormControl>
              <FormDescription>
                Número de identificación tributaria (opcional)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descripción de la entidad fiscal..."
                  rows={3}
                  {...field}
                  value={field.value ?? ""}
                  data-testid="textarea-entity-description"
                  onKeyDown={(e) => { if (e.key === " " || e.key === "Dead" || e.key === "Process" || e.key === "Meta") { e.stopPropagation(); } }} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                />
              </FormControl>
              <FormDescription>
                Descripción opcional de la entidad
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Entidad Activa</FormLabel>
                <FormDescription>
                  Las entidades inactivas no aparecerán en los formularios
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="switch-entity-active"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
            data-testid="button-cancel"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={mutation.isPending}
            data-testid="button-submit"
          >
            {mutation.isPending
              ? entity
                ? "Actualizando..."
                : "Creando..."
              : entity
              ? "Actualizar Entidad"
              : "Crear Entidad"}
          </Button>
        </div>
      </form>
    </Form>
  );
}