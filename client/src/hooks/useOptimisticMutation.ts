import { useMutation, useQueryClient } from '@tanstack/react-query';

interface OptimisticMutationConfig<TData, TVariables> {
  queryKey: string | string[];
  mutationFn: (variables: TVariables) => Promise<TData>;
  
  onOptimisticUpdate?: (oldData: any, variables: TVariables) => any;
  
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: any) => void;
}

export function useOptimisticMutation<TData = any, TVariables = any>(
  config: OptimisticMutationConfig<TData, TVariables>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: config.mutationFn,
    
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: Array.isArray(config.queryKey) ? config.queryKey : [config.queryKey] });
      
      const previousData = queryClient.getQueryData(
        Array.isArray(config.queryKey) ? config.queryKey : [config.queryKey]
      );
      
      if (config.onOptimisticUpdate) {
        queryClient.setQueryData(
          Array.isArray(config.queryKey) ? config.queryKey : [config.queryKey],
          (old: any) => config.onOptimisticUpdate!(old, variables)
        );
      }
      
      return { previousData };
    },
    
    onError: (error, variables, context: any) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          Array.isArray(config.queryKey) ? config.queryKey : [config.queryKey],
          context.previousData
        );
      }
      config.onError?.(error);
    },
    
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: Array.isArray(config.queryKey) ? config.queryKey : [config.queryKey] 
      });
    },
    
    onSuccess: config.onSuccess
  });
}
