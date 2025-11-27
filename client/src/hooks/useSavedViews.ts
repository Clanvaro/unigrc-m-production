import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UserSavedView, InsertUserSavedView } from "@shared/schema";

export function useSavedViews(entityType: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query to load saved views for the entity type
  const { data: savedViews = [], isLoading } = useQuery<UserSavedView[]>({
    queryKey: ["/api/user-saved-views", { entityType }],
    queryFn: async () => {
      const response = await fetch(`/api/user-saved-views?entityType=${entityType}`);
      if (!response.ok) throw new Error("Failed to fetch saved views");
      return response.json();
    },
  });

  // Mutation to create a new view
  const createViewMutation = useMutation({
    mutationFn: async (data: { name: string; filters: Record<string, any>; isDefault?: boolean }) => {
      return apiRequest("/api/user-saved-views", "POST", {
        name: data.name,
        entityType,
        filters: data.filters,
        isDefault: data.isDefault || false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-saved-views"] });
      toast({
        title: "Vista guardada",
        description: "La vista se ha guardado exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la vista.",
        variant: "destructive",
      });
    },
  });

  // Mutation to update a view
  const updateViewMutation = useMutation({
    mutationFn: async (data: { id: string; name?: string; filters?: Record<string, any>; isDefault?: boolean }) => {
      return apiRequest(`/api/user-saved-views/${data.id}`, "PATCH", {
        name: data.name,
        filters: data.filters,
        isDefault: data.isDefault,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-saved-views"] });
      toast({
        title: "Vista actualizada",
        description: "La vista se ha actualizado exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la vista.",
        variant: "destructive",
      });
    },
  });

  // Mutation to delete a view
  const deleteViewMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/user-saved-views/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-saved-views"] });
      toast({
        title: "Vista eliminada",
        description: "La vista se ha eliminado exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la vista.",
        variant: "destructive",
      });
    },
  });

  // Mutation to set default view
  const setDefaultViewMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/user-saved-views/${id}/set-default`, "POST", {
        entityType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-saved-views"] });
      toast({
        title: "Vista predeterminada",
        description: "La vista se ha marcado como predeterminada.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo establecer la vista como predeterminada.",
        variant: "destructive",
      });
    },
  });

  // Get the default view for this entity type
  // CRITICAL: Filter out undefined/null entries before searching to prevent race condition crashes
  const safeViews = savedViews.filter(Boolean);
  const defaultView = safeViews.find((view) => view.isDefault);

  return {
    savedViews: safeViews,
    isLoading,
    defaultView,
    createView: createViewMutation.mutate,
    updateView: updateViewMutation.mutate,
    deleteView: deleteViewMutation.mutate,
    setDefaultView: setDefaultViewMutation.mutate,
    isCreating: createViewMutation.isPending,
    isUpdating: updateViewMutation.isPending,
    isDeleting: deleteViewMutation.isPending,
    isSettingDefault: setDefaultViewMutation.isPending,
  };
}
