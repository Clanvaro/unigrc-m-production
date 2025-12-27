import { Link } from "wouter";
import { ReactNode, forwardRef } from "react";
import { queryClient } from "@/lib/queryClient";

/**
 * Route prefetch mapping
 * Maps href paths to their corresponding lazy import functions
 */
const routePrefetchMap: Record<string, () => Promise<any>> = {
  '/dashboard': () => import('@/pages/DashboardRouter'),
  '/risks': () => import('@/pages/risks'),
  '/risk-events': () => import('@/pages/risk-events'),
  '/controls': () => import('@/pages/controls'),
  '/matrix': () => import('@/pages/risk-matrix'),
  '/validation': () => import('@/pages/risk-validation'),
  '/actions': () => import('@/pages/action-plans'),
  '/reports': () => import('@/pages/reports'),
  '/organization': () => import('@/pages/organization'),
  '/audits': () => import('@/pages/audits'),
  '/audit-plan-list': () => import('@/pages/audit-plan-list'),
  '/team': () => import('@/pages/team'),
  '/team/members': () => import('@/pages/team-members'),
  '/regulations': () => import('@/pages/regulations'),
  '/config': () => import('@/pages/config'),
  '/audit-findings': () => import('@/pages/audit-findings'),
  '/import': () => import('@/pages/import'),
  '/trash': () => import('@/pages/trash'),
};

/**
 * Default risks page query params - MUST match risks.tsx initial state
 * This ensures prefetch cache is reused when navigating to /risks
 */
const DEFAULT_RISKS_QUERY_PARAMS = { limit: 50, offset: 0 };

/**
 * Default controls page query params - MUST match controls.tsx initial state
 */
const DEFAULT_CONTROLS_QUERY_PARAMS = { limit: 25, offset: 0 };

/**
 * API prefetch mapping for data-heavy pages
 * OPTIMIZED: Uses /api/pages/risks (BFF) instead of multiple legacy endpoints
 * 
 * NOTE: The queryKey must match EXACTLY what risks.tsx uses.
 * risks.tsx uses: ["/api/pages/risks", queryKeyParams] where queryKeyParams
 * is { limit: 50, offset: 0 } when no filters are applied (initial state)
 */
const apiPrefetchMap: Record<string, () => void> = {
  '/risks': () => {
    // OPTIMIZED: Prefetch with the EXACT same queryKey structure as risks.tsx
    // Uses same object shape: { limit, offset } with no extra properties
    queryClient.prefetchQuery({
      queryKey: ["/api/pages/risks", DEFAULT_RISKS_QUERY_PARAMS],
      queryFn: async () => {
        const response = await fetch('/api/pages/risks?limit=50&offset=0');
        if (!response.ok) throw new Error('Failed to prefetch');
        return response.json();
      },
      staleTime: 2 * 60 * 1000, // 2 minutes - matches risks.tsx staleTime
      gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache
    });
  },
  '/controls': () => {
    // OPTIMIZED: Prefetch controls with the EXACT same queryKey structure as controls.tsx
    // Uses queryKeys.controls.withDetails to match exactly
    const { queryKeys } = require('@/lib/queryKeys');
    queryClient.prefetchQuery({
      queryKey: queryKeys.controls.withDetails(DEFAULT_CONTROLS_QUERY_PARAMS),
      queryFn: async () => {
        const params = new URLSearchParams({
          limit: '25',
          offset: '0',
          search: '',
          type: '',
          status: '',
          validationStatus: '',
        });
        const response = await fetch(`/api/controls/with-details?${params}`);
        if (!response.ok) throw new Error('Failed to prefetch');
        return response.json();
      },
      staleTime: 2 * 60 * 1000, // 2 minutes - matches controls.tsx staleTime
      gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache
    });
  },
};

interface PrefetchLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * Enhanced Link component with intelligent prefetching
 * Prefetches route AND API data on hover/touch for instant navigation
 */
export const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
  ({ href, children, className, onClick }, ref) => {
    const prefetchRoute = () => {
      // Prefetch route module
      const prefetchFn = routePrefetchMap[href];
      if (prefetchFn) {
        prefetchFn().catch(() => {
          // Silently fail - prefetch is optional
        });
      }
      
      // Prefetch API data for the route
      const apiPrefetchFn = apiPrefetchMap[href];
      if (apiPrefetchFn) {
        try {
          apiPrefetchFn();
        } catch {
          // Silently fail - API prefetch is optional
        }
      }
    };

    return (
      <Link
        href={href}
        className={className}
        onClick={onClick}
        onMouseEnter={prefetchRoute}
        onTouchStart={prefetchRoute}
        ref={ref}
      >
        {children}
      </Link>
    );
  }
);

PrefetchLink.displayName = "PrefetchLink";
