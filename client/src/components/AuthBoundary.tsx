import { ReactNode, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LoginPage } from "./LoginPage";

interface AuthBoundaryProps {
  children: ReactNode;
}

/**
 * Checks if there's likely a valid session cookie.
 * This enables optimistic rendering - show layout immediately while auth validates in background.
 */
function hasSessionCookie(): boolean {
  if (typeof document === "undefined") return false;
  // Check for common session cookie names (connect.sid for express-session)
  return document.cookie.includes("connect.sid");
}

export function AuthBoundary({ children }: AuthBoundaryProps) {
  const { isLoading, isAuthenticated } = useAuth();
  
  // Memoize cookie check to avoid re-checking on every render
  const hasSession = useMemo(() => hasSessionCookie(), []);

  // OPTIMISTIC AUTH: If we have a session cookie, show layout immediately
  // while auth validates in background. This eliminates the "loading spinner" delay.
  // The internal page components have their own loading states (skeletons).
  if (isLoading && hasSession) {
    // User likely has valid session - render children optimistically
    // If auth fails, we'll redirect to login on the next render cycle
    return <>{children}</>;
  }

  // No session cookie and still loading - show minimal loader
  // (This case is rare: new user or cleared cookies)
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // Auth check complete - not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Authenticated - render children
  return <>{children}</>;
}
