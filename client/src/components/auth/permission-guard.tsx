import { ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle } from "lucide-react";

interface PermissionGuardProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean; // If true, user must have ALL permissions. If false, user needs ANY permission
  fallback?: ReactNode;
  showFallback?: boolean;
}

export function PermissionGuard({
  children,
  permission,
  permissions = [],
  requireAll = false,
  fallback,
  showFallback = true,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions.length > 0) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
  } else {
    // If no permissions specified, allow access
    hasAccess = true;
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showFallback) {
    return null;
  }

  return (
    <div className="p-6">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No tienes permisos suficientes para acceder a esta sección.
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Specific permission guards for common use cases
export function AdminGuard({ children, fallback, showFallback = true }: Omit<PermissionGuardProps, 'permission'>) {
  return (
    <PermissionGuard
      permissions={["manage_users", "manage_roles"]}
      requireAll={true}
      fallback={fallback}
      showFallback={showFallback}
    >
      {children}
    </PermissionGuard>
  );
}

// Platform Admin Guard - only platform administrators can access
export function PlatformAdminGuard({ children, fallback, showFallback = true }: Omit<PermissionGuardProps, 'permission'>) {
  const { currentUser, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (currentUser?.isPlatformAdmin) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showFallback) {
    return null;
  }

  return (
    <div className="p-6">
      <Alert variant="destructive">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Esta sección solo está disponible para administradores de plataforma.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export function CreateGuard({ 
  children, 
  itemType, 
  fallback, 
  showFallback = true 
}: Omit<PermissionGuardProps, 'permission'> & { itemType: string }) {
  const { canCreateItem } = usePermissions();
  
  if (canCreateItem(itemType)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showFallback) {
    return null;
  }

  return null; // Silently hide create buttons/forms if no permission
}

export function EditGuard({ 
  children, 
  itemType, 
  fallback, 
  showFallback = true 
}: Omit<PermissionGuardProps, 'permission'> & { itemType: string }) {
  const { canEditItem } = usePermissions();
  
  if (canEditItem(itemType)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showFallback) {
    return null;
  }

  return null; // Silently hide edit buttons/forms if no permission
}

export function DeleteGuard({ 
  children, 
  itemType, 
  fallback, 
  showFallback = true 
}: Omit<PermissionGuardProps, 'permission'> & { itemType: string }) {
  const { canDeleteItem } = usePermissions();
  
  if (canDeleteItem(itemType)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showFallback) {
    return null;
  }

  return null; // Silently hide delete buttons if no permission
}