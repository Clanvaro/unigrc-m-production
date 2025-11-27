import { Link } from "wouter";
import { ReactNode, forwardRef } from "react";

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

interface PrefetchLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * Enhanced Link component with intelligent prefetching
 * Prefetches route on hover/touch for instant navigation
 */
export const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
  ({ href, children, className, onClick }, ref) => {
    const prefetchRoute = () => {
      const prefetchFn = routePrefetchMap[href];
      if (prefetchFn) {
        prefetchFn().catch(() => {
          // Silently fail - prefetch is optional
        });
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
