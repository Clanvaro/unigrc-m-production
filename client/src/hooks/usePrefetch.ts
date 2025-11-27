import { useEffect } from 'react';

/**
 * Hook to intelligently prefetch route components
 * Prefetches critical routes after initial page load to improve navigation speed
 */
export function usePrefetchRoutes() {
  useEffect(() => {
    // Wait for initial render and idle time before prefetching
    const prefetchTimer = setTimeout(() => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          prefetchCriticalRoutes();
        });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(prefetchCriticalRoutes, 2000);
      }
    }, 1000);

    return () => clearTimeout(prefetchTimer);
  }, []);
}

function prefetchCriticalRoutes() {
  // Prefetch the most commonly accessed routes
  const criticalRoutes = [
    () => import('@/pages/risks'),
    () => import('@/pages/controls'),
    () => import('@/pages/action-plans'),
    () => import('@/pages/risk-matrix'),
  ];

  criticalRoutes.forEach((route, index) => {
    // Stagger prefetch calls to avoid blocking
    setTimeout(() => {
      route().catch(() => {
        // Silently fail - prefetch is optional
      });
    }, index * 200);
  });
}

/**
 * Hook to prefetch a specific route on hover
 * Use this for navigation links to load routes before click
 */
export function usePrefetchOnHover(routeImport: () => Promise<any>) {
  const prefetch = () => {
    routeImport().catch(() => {
      // Silently fail - prefetch is optional
    });
  };

  return {
    onMouseEnter: prefetch,
    onTouchStart: prefetch, // For mobile devices
  };
}
