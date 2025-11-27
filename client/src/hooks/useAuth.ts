import { useQuery, useQueryClient } from "@tanstack/react-query";

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
        return {
          authenticated: false,
          user: null,
          permissions: [],
        };
      }
      
      return response.json();
    },
    staleTime: 1 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
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
