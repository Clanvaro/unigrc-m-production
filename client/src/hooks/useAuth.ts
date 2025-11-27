import { useQuery, useQueryClient } from "@tanstack/react-query";
import { handleAuthError, handleSessionExpired } from "@/lib/auth-interceptor";

interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  profileImageUrl?: string;
  isAdmin?: boolean;
  isPlatformAdmin?: boolean;
}

interface AuthResponse {
  authenticated: boolean;
  user: User | null;
  permissions: string[];
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch, isFetching } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });
      
      if (!response.ok) {
        // For 401 on the auth endpoint, session is definitely expired - redirect immediately
        if (response.status === 401) {
          // Only redirect if we're not already on login page
          if (window.location.pathname !== '/login') {
            handleSessionExpired();
          }
        }
        return {
          authenticated: false,
          user: null,
          permissions: [],
        };
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - auth data rarely changes
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer
    refetchOnMount: false, // Don't refetch on every component mount
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: true, // DO refetch on network reconnect to detect session expiration
    retry: false,
  });

  const authIsLoading = isLoading || !data;

  const isAuthenticated = data?.authenticated || false;
  const user = data?.user || null;
  const permissions = data?.permissions || [];

  const login = () => {
    window.location.href = "/login";
  };

  const logout = async () => {
    await fetch("/api/logout", {
      method: "GET",
      credentials: "include",
    });
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    window.location.href = "/";
  };

  return {
    isLoading: authIsLoading,
    isAuthenticated,
    user,
    permissions,
    login,
    logout,
    refetch,
  };
}
