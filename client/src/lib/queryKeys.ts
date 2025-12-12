/**
 * Centralized React Query Key Factory
 * 
 * This module provides a single source of truth for all React Query cache keys.
 * Using structured tuples instead of template literals ensures cache consistency
 * across queries, mutations, and invalidations in both development and production.
 * 
 * Benefits:
 * - Referential equality: Same parameters always produce identical keys
 * - Type safety: TypeScript enforces correct parameter types
 * - Easy invalidation: Partial matching with hierarchical keys
 * - Production reliability: No cache mismatches due to template literal inconsistencies
 * 
 * Pattern: [resource, id?, subresource?, params?]
 * Examples:
 *   - List: ["risks"] or ["/api/risks"]
 *   - Detail: ["/api/risks", "risk-123"]
 *   - Nested: ["/api/risks", "risk-123", "controls"]
 *   - With params: ["/api/risks", { limit: 50, offset: 0 }]
 */

export const queryKeys = {
  // Audits
  audits: {
    all: () => ["/api/audits"] as const,
    detail: (id: string | undefined | null) => ["/api/audits", id] as const,
    risks: (id: string | undefined | null) => ["/api/audits", id, "risks"] as const,
    adHocRisks: (id: string | undefined | null) => ["/api/audits", id, "ad-hoc-risks"] as const,
    controlsScope: (id: string | undefined | null) => ["/api/audits", id, "controls-scope"] as const,
    milestones: (id: string | undefined | null) => ["/api/audits", id, "milestones"] as const,
  },
  
  // Audit Plans
  auditPlans: {
    all: () => ["/api/audit-plans"] as const,
    detail: (id: string | undefined | null) => ["/api/audit-plans", id] as const,
    prioritization: (id: string | undefined | null) => ["/api/audit-plans", id, "prioritization"] as const,
  },
  
  // Risks
  risks: {
    all: () => ["/api/risks"] as const,
    // Paginated list with stable serialization
    paginated: (params: { limit?: number; offset?: number; paginate?: boolean } = {}) => {
      // Sort keys alphabetically for consistent serialization
      const stableParams = JSON.stringify(params, Object.keys(params).sort());
      return ["/api/risks", "paginated", stableParams] as const;
    },
    detail: (id: string | undefined | null) => ["/api/risks", id] as const,
    controls: (id: string | undefined | null) => ["/api/risks", id, "controls"] as const,
    validationStatus: (id: string | undefined | null) => ["/api/risks", id, "validation-status"] as const,
    processes: (id: string | undefined | null) => ["/api/risk-processes", "risk", id] as const,
    // Aggregated endpoint with controls summary
    withControls: (params: { limit?: number; offset?: number; [key: string]: any } = {}) => {
      const stableParams = JSON.stringify(params, Object.keys(params).sort());
      return ["/api/risks/with-controls", stableParams] as const;
    },
  },
  
  // Controls
  controls: {
    all: () => ["/api/controls"] as const,
    // Paginated list with stable serialization
    paginated: (params: { limit?: number; offset?: number; paginate?: boolean } = {}) => {
      // Sort keys alphabetically for consistent serialization
      const stableParams = JSON.stringify(params, Object.keys(params).sort());
      return ["/api/controls", "paginated", stableParams] as const;
    },
    detail: (id: string | undefined | null) => ["/api/controls", id] as const,
    risks: (id: string | undefined | null) => ["/api/controls", id, "risks"] as const,
    // Aggregated endpoint with all details (risks, owners) in single query
    withDetails: (params: { limit?: number; offset?: number; [key: string]: any } = {}) => {
      const stableParams = JSON.stringify(params, Object.keys(params).sort());
      return ["/api/controls/with-details", stableParams] as const;
    },
  },
  
  // Risk Events
  riskEvents: {
    all: () => ["/api/risk-events"] as const,
    byRisk: (riskId: string | undefined | null) => ["/api/risk-events", "risk", riskId] as const,
  },
  
  // Tenants
  tenants: {
    all: () => ["/api/tenants"] as const,
    detail: (id: string | undefined | null) => ["/api/tenants", id] as const,
    users: (id: string | undefined | null) => ["/api/tenants", id, "users"] as const,
  },
  
  // Users
  users: {
    all: () => ["/api/users"] as const,
    detail: (id: string | undefined | null) => ["/api/users", id] as const,
    roles: (id: string | undefined | null) => ["/api/users", id, "roles"] as const,
  },
  
  // Auth
  auth: {
    me: () => ["/api/auth/me"] as const,
    user: () => ["/api/auth/user"] as const,
  },
  
  // System Config
  systemConfig: {
    riskLevelRanges: () => ["/api/system-config/risk-level-ranges"] as const,
    riskDecimals: () => ["/api/system-config/risk-decimals"] as const,
  },
  
  // Dashboard
  dashboard: {
    riskMatrix: () => ["/api/dashboard/risk-matrix"] as const,
    stats: () => ["/api/dashboard/stats"] as const,
    riskTrends: () => ["/api/dashboard/risk-trends"] as const,
    alerts: () => ["/api/dashboard/alerts"] as const,
  },
  
  // Other common endpoints
  processes: () => ["/api/processes"] as const,
  macroprocesos: () => ["/api/macroprocesos"] as const,
  subprocesos: () => ["/api/subprocesos"] as const,
  gerencias: () => ["/api/gerencias"] as const,
  processOwners: () => ["/api/process-owners"] as const,
  actionPlans: () => ["/api/action-plans"] as const,
  trash: () => ["/api/trash"] as const,
  riskControls: () => ["/api/risk-controls"] as const,
  riskControlsWithDetails: () => ["/api/risk-controls-with-details"] as const,
  riskProcesses: () => ["/api/risk-processes"] as const,
  roles: () => ["/api/roles"] as const,
  userRoles: () => ["/api/user-roles"] as const,
  aiStatus: () => ["/api/ai/status"] as const,
  csrfToken: () => ["csrf-token"] as const,
} as const;

/**
 * Helper to invalidate all queries related to a specific resource
 * Usage: await invalidateResource(queryClient, "risks", riskId)
 */
export function invalidateResource(
  queryClient: any,
  resource: keyof typeof queryKeys,
  id?: string
) {
  const resourceKeys = queryKeys[resource];
  
  if (typeof resourceKeys === 'function') {
    // Simple resource like queryKeys.processes()
    return queryClient.invalidateQueries({ queryKey: resourceKeys() });
  }
  
  if (id && typeof resourceKeys === 'object' && 'detail' in resourceKeys) {
    // Invalidate specific resource and all nested keys
    return queryClient.invalidateQueries({ 
      queryKey: (resourceKeys as any).detail(id),
      refetchType: 'all'
    });
  }
  
  // Invalidate all keys for this resource
  if (typeof resourceKeys === 'object' && 'all' in resourceKeys) {
    return queryClient.invalidateQueries({ 
      queryKey: (resourceKeys as any).all(),
      refetchType: 'all'
    });
  }
}
