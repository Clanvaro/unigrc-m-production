import { queryClient } from './queryClient';
import { useToast } from '@/hooks/use-toast';

interface OptimisticUpdateOptions<TData, TVariables> {
  queryKey: string | string[];
  mutationFn: (variables: TVariables) => Promise<TData>;
  getOptimisticData?: (variables: TVariables) => TData;
  updateCache?: (oldData: any, newData: TData, variables: TVariables) => any;
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
}

// Helper to create optimistic mutations
export function createOptimisticMutation<TData = any, TVariables = any>(
  options: OptimisticUpdateOptions<TData, TVariables>
) {
  return async (variables: TVariables) => {
    const queryKey = Array.isArray(options.queryKey) ? options.queryKey : [options.queryKey];
    
    // Snapshot the previous value
    const previousData = queryClient.getQueryData(queryKey);
    
    // Optimistically update the cache if getOptimisticData is provided
    if (options.getOptimisticData) {
      const optimisticData = options.getOptimisticData(variables);
      
      if (options.updateCache && previousData) {
        const updatedData = options.updateCache(previousData, optimisticData, variables);
        queryClient.setQueryData(queryKey, updatedData);
      } else {
        queryClient.setQueryData(queryKey, optimisticData);
      }
    }
    
    try {
      // Perform the actual mutation
      const data = await options.mutationFn(variables);
      
      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey });
      
      // Call success callback if provided
      if (options.onSuccess) {
        options.onSuccess(data);
      }
      
      return data;
    } catch (error) {
      // On error, roll back to the previous value
      queryClient.setQueryData(queryKey, previousData);
      
      // Call error callback if provided
      if (options.onError) {
        options.onError(error as Error);
      }
      
      throw error;
    }
  };
}

// Optimistic update patterns for common operations
export const optimisticPatterns = {
  // Add item to list
  addToList: <T extends { id: string | number }>(
    items: T[] | undefined,
    newItem: T
  ): T[] => {
    if (!items) return [newItem];
    return [...items, newItem];
  },
  
  // Update item in list
  updateInList: <T extends { id: string | number }>(
    items: T[] | undefined,
    updatedItem: Partial<T> & { id: string | number }
  ): T[] => {
    if (!items) return [];
    return items.map(item =>
      item.id === updatedItem.id ? { ...item, ...updatedItem } : item
    );
  },
  
  // Remove item from list
  removeFromList: <T extends { id: string | number }>(
    items: T[] | undefined,
    itemId: string | number
  ): T[] => {
    if (!items) return [];
    return items.filter(item => item.id !== itemId);
  },
  
  // Soft delete (update status to deleted)
  softDelete: <T extends { id: string | number }>(
    items: T[] | undefined,
    itemId: string | number,
    deletedBy?: string,
    deletionReason?: string
  ): T[] => {
    if (!items) return [];
    return items.map(item =>
      item.id === itemId
        ? { ...item, status: 'deleted', deletedBy, deletionReason, deletedAt: new Date().toISOString() }
        : item
    ) as T[];
  },
  
  // Restore item (update status back to active)
  restore: <T extends { id: string | number }>(
    items: T[] | undefined,
    itemId: string | number
  ): T[] => {
    if (!items) return [];
    return items.map(item =>
      item.id === itemId
        ? { ...item, status: 'active', deletedBy: null, deletionReason: null, deletedAt: null }
        : item
    ) as T[];
  }
};

// Cache invalidation strategies
export const cacheStrategies = {
  // Invalidate single entity and its list
  invalidateEntity: async (entityType: string, entityId?: string) => {
    const queries = [
      { queryKey: [`/api/${entityType}`] },
    ];
    
    if (entityId) {
      queries.push({ queryKey: [`/api/${entityType}`, entityId] });
    }
    
    await Promise.all(
      queries.map(q => queryClient.invalidateQueries(q))
    );
  },
  
  // Invalidate entity and its related entities
  invalidateWithRelations: async (
    entityType: string,
    relatedTypes: string[],
    entityId?: string
  ) => {
    const queries = [
      { queryKey: [`/api/${entityType}`] },
      ...relatedTypes.map(type => ({ queryKey: [`/api/${type}`] }))
    ];
    
    if (entityId) {
      queries.push({ queryKey: [`/api/${entityType}`, entityId] });
    }
    
    await Promise.all(
      queries.map(q => queryClient.invalidateQueries(q))
    );
  },
  
  // Invalidate all related to a risk
  invalidateRiskRelations: async (riskId?: string) => {
    await cacheStrategies.invalidateWithRelations(
      'risks',
      ['risk-controls', 'risk-events', 'action-plans', 'controls'],
      riskId
    );
  },
  
  // Invalidate all related to a process
  invalidateProcessRelations: async (processId?: string) => {
    await cacheStrategies.invalidateWithRelations(
      'processes',
      ['risks', 'controls', 'macroprocesos', 'subprocesos'],
      processId
    );
  },
  
  // Invalidate all related to an audit
  invalidateAuditRelations: async (auditId?: string) => {
    await cacheStrategies.invalidateWithRelations(
      'audits',
      ['audit-tests', 'audit-findings', 'audit-reports', 'commitments'],
      auditId
    );
  }
};

// Hook to use toast with optimistic updates
export function useOptimisticToast() {
  const { toast } = useToast();
  
  return {
    showOptimistic: (message: string) => {
      return toast({
        title: "Procesando...",
        description: message,
        duration: 1000
      });
    },
    
    showSuccess: (message: string) => {
      return toast({
        title: "Éxito",
        description: message,
        variant: "default"
      });
    },
    
    showError: (message: string, error?: Error) => {
      return toast({
        title: "Error",
        description: error?.message || message,
        variant: "destructive"
      });
    }
  };
}
