import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { withRetry, retryConfigs } from "./retry";
import { handleAuthError } from "./auth-interceptor";
import { getCSRFTokenFromCookie, clearCSRFTokenCache } from "./csrf-cache";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    let errorMessage = text;
    
    // Try to parse JSON error response
    try {
      const errorData = JSON.parse(text);
      if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
      // If not JSON, use the text as is
    }
    
    const error = new Error(errorMessage);
    (error as any).status = res.status;
    
    // Handle authentication errors
    if (res.status === 401) {
      handleAuthError({ status: 401, message: errorMessage });
    }
    
    // Handle CSRF token errors - mark token as invalid (only in production)
    const isProduction = import.meta.env.MODE === 'production';
    if (isProduction && res.status === 403 && text.includes('CSRF')) {
      console.warn('CSRF token invalid, will retry with fresh token');
      // Clear the cached token so next request fetches a new one
      (error as any).isCSRFError = true;
    }
    
    throw error;
  }
}

export async function apiRequest(
  url: string,
  method: string,
  data?: unknown | undefined,
): Promise<any> {
  // Critical mutations use retry with backoff
  const isCritical = method !== 'GET';
  
  const makeRequest = async (attempt: number = 1) => {
    // Build headers
    const headers: Record<string, string> = {};
    
    // Always set Content-Type for state-changing requests
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      headers["Content-Type"] = "application/json";
    }
    
    // Add CSRF token for state-changing requests (only in production)
    const isProduction = import.meta.env.MODE === 'production';
    if (isProduction && method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      const csrfToken = getCSRFTokenFromCookie();
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken;
      }
    }
    
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
      });

      await throwIfResNotOk(res);
      
      // Handle 204 No Content responses
      if (res.status === 204) {
        return null;
      }
      
      return await res.json();
    } catch (error: any) {
      // If CSRF error and first attempt, clear token cache and retry once
      if (error.isCSRFError && attempt === 1) {
        console.log('🔄 CSRF token invalid, clearing cache and retrying...');
        clearCSRFTokenCache();
        
        // Retry the request once with fresh token
        return makeRequest(2);
      }
      throw error;
    }
  };

  if (isCritical) {
    return withRetry(() => makeRequest(), {
      ...retryConfigs.critical,
      onRetry: (attempt, error) => {
        console.warn(`Retrying ${method} ${url} (attempt ${attempt}):`, error.message);
      }
    });
  }

  return makeRequest();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    let url = queryKey[0] as string;
    
    // Handle query parameters if second element is an object
    if (queryKey.length > 1 && typeof queryKey[1] === 'object' && queryKey[1] !== null) {
      const params = new URLSearchParams();
      const queryParams = queryKey[1] as Record<string, string>;
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value);
        }
      });
      if (params.toString()) {
        url += '?' + params.toString();
      }
    } else if (queryKey.length > 1) {
      // Handle path segments (legacy behavior)
      url = queryKey.join("/") as string;
    }
    
    const fetchData = async () => {
      const res = await fetch(url, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

    // Retry network errors for data fetching
    return withRetry(fetchData, {
      ...retryConfigs.fetch,
      onRetry: (attempt, error) => {
        console.warn(`Retrying fetch ${url} (attempt ${attempt}):`, error.message);
      }
    });
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000, // 30 seconds - data considered fresh, prevents redundant refetches
      gcTime: 5 * 60 * 1000, // 5 minutes cache retention
      refetchOnMount: false, // Only refetch if data is stale (respects staleTime)
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
