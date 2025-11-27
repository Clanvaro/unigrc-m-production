import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface AIStatus {
  ready: boolean;
  deployment?: string;
  provider?: string;
  model?: string;
}

/**
 * Hook para monitorear el estado del servicio de IA (Azure OpenAI)
 * Verifica una vez al montar y luego mantiene el estado en cache
 */
export function useAIStatus() {
  const [isReady, setIsReady] = useState(false);
  
  const { data, isLoading } = useQuery<AIStatus>({
    queryKey: ['/api/ai/status'],
    // Azure OpenAI está siempre listo (sin modelo local para cargar)
    // Solo verificar una vez al montar
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: !isReady,
    staleTime: Infinity, // Cache permanente
  });

  useEffect(() => {
    if (data?.ready) {
      setIsReady(true);
    }
  }, [data]);

  return {
    ready: data?.ready ?? false,
    deployment: data?.deployment,
    provider: data?.provider,
    model: data?.model,
    isChecking: isLoading
  };
}
