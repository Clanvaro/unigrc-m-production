import memoizee from 'memoizee';

/**
 * Cache Manager for Performance Optimization
 * Uses in-memory memoization for frequently accessed data
 */

// Cache configuration based on environment
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Optimized cache limits for production (reduced memory footprint)
const CACHE_LIMITS = {
  DEFAULT: isProduction ? 50 : 100,
  DASHBOARD: isProduction ? 30 : 50,
  RISK_AGGREGATION: isProduction ? 100 : 200,
  ANALYTICS: isProduction ? 50 : 100,
  STATIC: isProduction ? 200 : 500,
  REALTIME: isProduction ? 30 : 50
} as const;

export const CACHE_DURATIONS = {
  SHORT: 60 * 1000,        // 1 minute
  MEDIUM: 5 * 60 * 1000,   // 5 minutes
  LONG: 15 * 60 * 1000,    // 15 minutes
  EXTENDED: 60 * 60 * 1000 // 1 hour
} as const;

// Generic memoization wrapper
export function createCachedFunction<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    maxAge?: number;
    max?: number;
    primitive?: boolean;
    promise?: boolean;
  } = {}
): T {
  const defaultOptions = {
    maxAge: CACHE_DURATIONS.MEDIUM,
    max: CACHE_LIMITS.DEFAULT, // Maximum number of cached items (optimized per environment)
    primitive: false,
    promise: true, // Support async functions
    ...options
  };

  // Disable cache in development for easier debugging
  if (isDevelopment && process.env.DISABLE_CACHE === 'true') {
    return fn;
  }

  return memoizee(fn, defaultOptions);
}

// Specialized cache functions for common use cases

/**
 * Cache for dashboard data (5 minutes)
 */
export function cacheDashboard<T extends (...args: any[]) => any>(fn: T): T {
  return createCachedFunction(fn, {
    maxAge: CACHE_DURATIONS.MEDIUM,
    max: CACHE_LIMITS.DASHBOARD
  });
}

/**
 * Cache for risk aggregations (15 minutes)
 */
export function cacheRiskAggregation<T extends (...args: any[]) => any>(fn: T): T {
  return createCachedFunction(fn, {
    maxAge: CACHE_DURATIONS.LONG,
    max: CACHE_LIMITS.RISK_AGGREGATION
  });
}

/**
 * Cache for analytics data (1 hour)
 */
export function cacheAnalytics<T extends (...args: any[]) => any>(fn: T): T {
  return createCachedFunction(fn, {
    maxAge: CACHE_DURATIONS.EXTENDED,
    max: CACHE_LIMITS.ANALYTICS
  });
}

/**
 * Cache for static/rarely changing data (1 hour)
 */
export function cacheStatic<T extends (...args: any[]) => any>(fn: T): T {
  return createCachedFunction(fn, {
    maxAge: CACHE_DURATIONS.EXTENDED,
    max: CACHE_LIMITS.STATIC
  });
}

/**
 * Short-lived cache for real-time data (1 minute)
 */
export function cacheRealtime<T extends (...args: any[]) => any>(fn: T): T {
  return createCachedFunction(fn, {
    maxAge: CACHE_DURATIONS.SHORT,
    max: CACHE_LIMITS.REALTIME
  });
}

// Cache invalidation utilities
export class CacheInvalidator {
  private static caches: Map<string, any> = new Map();

  static register(key: string, cachedFn: any) {
    this.caches.set(key, cachedFn);
  }

  static invalidate(key: string) {
    const cachedFn = this.caches.get(key);
    if (cachedFn && typeof cachedFn.clear === 'function') {
      cachedFn.clear();
    }
  }

  static invalidateAll() {
    this.caches.forEach(cachedFn => {
      if (typeof cachedFn.clear === 'function') {
        cachedFn.clear();
      }
    });
  }

  static invalidatePattern(pattern: RegExp) {
    Array.from(this.caches.keys())
      .filter(key => pattern.test(key))
      .forEach(key => this.invalidate(key));
  }
}

// Helper to create cache key from arguments
export function createCacheKey(...args: any[]): string {
  return JSON.stringify(args);
}

// Statistics tracking
export class CacheStats {
  private static hits = 0;
  private static misses = 0;

  static recordHit() {
    this.hits++;
  }

  static recordMiss() {
    this.misses++;
  }

  static getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;
    
    return {
      hits: this.hits,
      misses: this.misses,
      total,
      hitRate: hitRate.toFixed(2) + '%'
    };
  }

  static reset() {
    this.hits = 0;
    this.misses = 0;
  }
}
