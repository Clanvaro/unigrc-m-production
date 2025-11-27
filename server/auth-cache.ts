/**
 * Authentication Cache Module
 * 
 * Caches user authentication data to reduce database queries:
 * - User data
 * - User tenants
 * - User permissions
 * 
 * Cache TTL: 5 minutes (configurable)
 * Invalidation: Automatic on user/permission changes
 */

export interface CachedUserData {
  user: any;
  tenants: any[];
  permissions: string[];
  cachedAt: number;
}

interface CacheEntry {
  data: CachedUserData;
  expiresAt: number;
}

class AuthCache {
  private cache: Map<string, CacheEntry> = new Map();
  private ttl: number = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  /**
   * Get cached authentication data for a user
   * @param userId - User ID to lookup
   * @returns Cached data or null if expired/not found
   */
  get(userId: string): CachedUserData | null {
    const entry = this.cache.get(userId);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(userId);
      return null;
    }
    
    return entry.data;
  }
  
  /**
   * Store authentication data in cache
   * @param userId - User ID
   * @param data - User authentication data to cache
   */
  set(userId: string, data: CachedUserData): void {
    this.cache.set(userId, {
      data: {
        ...data,
        cachedAt: Date.now()
      },
      expiresAt: Date.now() + this.ttl
    });
  }
  
  /**
   * Invalidate cached data for a specific user
   * @param userId - User ID to invalidate
   */
  invalidate(userId: string): void {
    this.cache.delete(userId);
  }
  
  /**
   * Invalidate all cached data
   * Use when global permission/role changes occur
   */
  invalidateAll(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache statistics for monitoring
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    
    for (const [_, entry] of this.cache) {
      if (now > entry.expiresAt) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }
    
    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      ttlMs: this.ttl
    };
  }
  
  /**
   * Clean up expired entries (run periodically)
   */
  cleanup(): void {
    const now = Date.now();
    const entriesToDelete: string[] = [];
    
    for (const [userId, entry] of this.cache) {
      if (now > entry.expiresAt) {
        entriesToDelete.push(userId);
      }
    }
    
    entriesToDelete.forEach(userId => this.cache.delete(userId));
    
    if (entriesToDelete.length > 0) {
      console.log(`[AuthCache] Cleaned up ${entriesToDelete.length} expired entries`);
    }
  }
}

// Singleton instance
export const authCache = new AuthCache();

// Run cleanup every 10 minutes
setInterval(() => {
  authCache.cleanup();
}, 10 * 60 * 1000);
