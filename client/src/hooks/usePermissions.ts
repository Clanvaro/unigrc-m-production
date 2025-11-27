import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { User, Role } from "@shared/schema";

interface UserWithRoles extends User {
  roles?: Role[];
}

export function usePermissions() {
  // Get current authenticated user
  const { data: authResponse, isLoading: queryLoading } = useQuery<{
    authenticated: boolean;
    user: {
      id: string;
      email: string;
      fullName?: string;
      firstName?: string;
      lastName?: string;
      profileImageUrl?: string;
      isPlatformAdmin?: boolean;
    } | null;
    permissions?: string[];
    roles?: Array<{ id: string; role: { name: string; permissions: string[] } }>;
  }>({
    queryKey: ['/api/auth/user'],
  });

  const currentUser = authResponse?.user ? {
    id: authResponse.user.id,
    email: authResponse.user.email,
    fullName: authResponse.user.fullName,
    firstName: authResponse.user.firstName,
    lastName: authResponse.user.lastName,
    profileImageUrl: authResponse.user.profileImageUrl,
    isPlatformAdmin: authResponse.user.isPlatformAdmin
  } : undefined;

  const userRoles = authResponse?.roles || [];

  // Use permissions directly from auth response, with fallback to role-based computation
  const permissions = useMemo(() => {
    // Use direct permissions from auth response if available and non-empty
    if (authResponse?.permissions && authResponse.permissions.length > 0) {
      return authResponse.permissions;
    }
    
    // Fallback to role-based computation
    if (!userRoles || userRoles.length === 0) return [];
    
    const allPermissions = userRoles.reduce((acc: string[], userRole: any) => {
      if (userRole.role && userRole.role.permissions) {
        return [...acc, ...userRole.role.permissions];
      }
      return acc;
    }, []);

    // Remove duplicates
    return Array.from(new Set(allPermissions));
  }, [authResponse?.permissions, userRoles]);

  const hasPermission = (permission: string): boolean => {
    if (!permissions) return false;
    
    // Check for wildcard "*" permission (admin access to everything)
    if (permissions.includes("*")) return true;
    
    // Check for specific permission
    if (permissions.includes(permission)) return true;
    
    // Check for "view_all" or other wildcard permissions
    if (permissions.includes("view_all") && permission.startsWith("view_")) return true;
    if (permissions.includes("create_all") && permission.startsWith("create_")) return true;
    if (permissions.includes("edit_all") && permission.startsWith("edit_")) return true;
    if (permissions.includes("delete_all") && permission.startsWith("delete_")) return true;
    
    return false;
  };

  const hasAnyPermission = (permissionList: string[]): boolean => {
    return permissionList.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissionList: string[]): boolean => {
    return permissionList.every(permission => hasPermission(permission));
  };

  const isAdmin = (): boolean => {
    return hasPermission("manage_users") && hasPermission("manage_roles");
  };

  const canViewSection = (section: string): boolean => {
    const sectionPermissions = {
      dashboard: ["view_all"],
      processes: ["view_processes", "view_all"],
      risks: ["view_risks", "view_all"],
      controls: ["view_controls", "view_all"],
      actions: ["view_action_plans", "view_all"],
      reports: ["view_reports", "view_all"],
      validation: ["validate_risks", "view_all"],
      config: ["manage_users", "manage_roles", "view_users", "view_roles", "view_all"],
      users: ["manage_users", "view_users", "create_users", "edit_users", "view_all"],
      roles: ["manage_roles", "view_roles", "create_roles", "edit_roles", "view_all"],
    };

    const requiredPermissions = sectionPermissions[section as keyof typeof sectionPermissions] || [];
    return hasAnyPermission(requiredPermissions);
  };

  const canValidateRisks = (): boolean => {
    return hasPermission("validate_risks");
  };

  const canCreateItem = (itemType: string): boolean => {
    const createPermissions = {
      process: ["create_processes", "create_all"],
      proceso: ["create_processes", "create_all"],
      macroproceso: ["create_processes", "create_all"],
      subproceso: ["create_processes", "create_all"],
      risk: ["create_risks", "create_all"],
      control: ["create_controls", "create_all"],
      action_plan: ["create_action_plans", "create_all"],
      audit: ["create_audits", "create_all"],
      audit_plan: ["create_audits", "create_all"],
      user: ["manage_users", "create_all"],
      role: ["manage_roles", "create_all"],
      "process-owners": ["manage_users", "create_all"],
      gerencia: ["create_processes", "create_all"],
      document: ["create_all", "view_all"],
    };

    const requiredPermissions = createPermissions[itemType as keyof typeof createPermissions] || [];
    return hasAnyPermission(requiredPermissions);
  };

  const canEditItem = (itemType: string): boolean => {
    const editPermissions = {
      process: ["edit_processes", "edit_all"],
      proceso: ["edit_processes", "edit_all"],
      macroproceso: ["edit_processes", "edit_all"],
      subproceso: ["edit_processes", "edit_all"],
      risk: ["edit_risks", "edit_all"],
      risk_event: ["edit_risks", "edit_all"],
      control: ["edit_controls", "edit_all"],
      control_assessment: ["edit_controls", "edit_all"],
      regulation: ["edit_all"],
      action_plan: ["edit_action_plans", "edit_all"],
      audit: ["edit_audits", "edit_all"],
      audit_plan: ["edit_audits", "edit_all"],
      user: ["manage_users", "edit_all"],
      role: ["manage_roles", "edit_all"],
      "process-owners": ["manage_users", "edit_all"],
      gerencia: ["edit_processes", "edit_all"],
      document: ["edit_all", "view_all"],
    };

    const requiredPermissions = editPermissions[itemType as keyof typeof editPermissions] || [];
    return hasAnyPermission(requiredPermissions);
  };

  const canDeleteItem = (itemType: string): boolean => {
    const deletePermissions = {
      process: ["delete_processes", "delete_all"],
      proceso: ["delete_processes", "delete_all"],
      macroproceso: ["delete_processes", "delete_all"],
      subproceso: ["delete_processes", "delete_all"],
      risk: ["delete_risks", "delete_all"],
      risk_event: ["delete_risks", "delete_all"],
      control: ["delete_controls", "delete_all"],
      regulation: ["delete_all"],
      action_plan: ["delete_action_plans", "delete_all"],
      audit: ["delete_audits", "delete_all"],
      audit_plan: ["delete_audits", "delete_all"],
      user: ["manage_users", "delete_all"],
      role: ["manage_roles", "delete_all"],
      "process-owners": ["manage_users", "delete_all"],
      gerencia: ["delete_processes", "delete_all"],
      document: ["delete_all", "view_all"],
    };

    const requiredPermissions = deletePermissions[itemType as keyof typeof deletePermissions] || [];
    return hasAnyPermission(requiredPermissions);
  };

  return {
    currentUser,
    userRoles,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
    canViewSection,
    canCreateItem,
    canEditItem,
    canDeleteItem,
    canValidateRisks,
    isLoading: queryLoading || !authResponse?.user,
  };
}

export type PermissionHook = ReturnType<typeof usePermissions>;