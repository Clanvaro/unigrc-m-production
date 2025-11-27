import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  fetchCSRFToken, 
  getCachedToken, 
  setCachedToken 
} from '@/lib/csrf-cache';

// Hook to get CSRF token
export function useCSRFToken() {
  const [token, setToken] = useState<string | null>(getCachedToken());

  const { data, error, isLoading } = useQuery({
    queryKey: ['csrf-token'],
    queryFn: fetchCSRFToken,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour (formerly cacheTime)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  useEffect(() => {
    if (data) {
      setToken(data);
      setCachedToken(data);
    }
  }, [data]);

  return {
    token,
    isLoading,
    error,
    refetch: fetchCSRFToken,
  };
}

// Re-export utilities for backward compatibility
export { 
  getCSRFTokenFromCookie,
  initializeCSRFToken,
  clearCSRFTokenCache
} from '@/lib/csrf-cache';
