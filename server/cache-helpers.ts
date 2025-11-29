import { distributedCache } from "./services/redis";

/**
 * Cache version for risk-control associations
 * Increment this when schema or query logic changes to bust old caches
 */
export const CACHE_VERSION = "v2";

/**
 * Single-tenant cache key suffix (no more dynamic tenantId)
 */
const TENANT_KEY = "single-tenant";

/**
 * Invalidates all risk matrix related caches
 * Call this after any mutation that affects risk matrix data (risks, controls, processes, etc.)
 */
export async function invalidateRiskMatrixCache() {
  try {
    // Use versioned cache key
    await distributedCache.invalidate(`risk-matrix-aggregated:${CACHE_VERSION}:${TENANT_KEY}`);
    // Also invalidate old version for backward compatibility
    await distributedCache.invalidate(`risk-matrix-aggregated:${TENANT_KEY}`);
  } catch (error) {
    console.error(`Error invalidating risk matrix cache:`, error);
  }
}

/**
 * Invalidates all caches affected by risk-control associations
 * Call this whenever risk_controls table is mutated (create, update, delete, bulk operations)
 * 
 * This ensures real-time UI updates across:
 * - Paginated risk tables
 * - Paginated control tables
 * - Validation center views
 * - Detail views with associations
 * - Risk matrix calculations
 * 
 * CRITICAL: This MUST be called from:
 * - createRiskControl
 * - updateRiskControl
 * - deleteRiskControl
 * - bulkCreateRiskControls
 * - Any direct SQL manipulation of risk_controls
 * - When risks or controls are deleted (cascading deletes)
 */
export async function invalidateRiskControlCaches() {
  const startTime = Date.now();
  console.log(`[CACHE INVALIDATION START] Invalidating all risk-control caches`);
  
  try {
    // Execute invalidations in sequence to ensure completion before response
    // This prevents race conditions where the client refetches before invalidation completes
    
    // 1. First, invalidate the main risks cache patterns (most critical)
    await distributedCache.invalidatePattern(`risks:${TENANT_KEY}:*`);
    
    // 2. Versioned risk caches
    await Promise.all([
      distributedCache.invalidate(`risks-with-details:${CACHE_VERSION}:${TENANT_KEY}`),
      distributedCache.invalidate(`risks-with-details:${TENANT_KEY}`),
    ]);
    
    // 3. Control caches
    await Promise.all([
      distributedCache.invalidatePattern(`controls:${CACHE_VERSION}:${TENANT_KEY}:*`),
      distributedCache.invalidatePattern(`controls:${TENANT_KEY}:*`),
    ]);
    
    // 4. Validation center caches
    await Promise.all([
      distributedCache.invalidatePattern(`validation:risks:${CACHE_VERSION}:*:${TENANT_KEY}`),
      distributedCache.invalidatePattern(`validation:controls:${CACHE_VERSION}:*:${TENANT_KEY}`),
      distributedCache.invalidatePattern(`validation:risks:*:${TENANT_KEY}`),
      distributedCache.invalidatePattern(`validation:controls:*:${TENANT_KEY}`),
    ]);
    
    // 5. Association and entity caches
    await Promise.all([
      distributedCache.invalidatePattern(`risk-control-associations:${CACHE_VERSION}:${TENANT_KEY}:*`),
      distributedCache.invalidate(`risk-controls-with-details:${TENANT_KEY}`),
      distributedCache.invalidate(`subprocesos:${TENANT_KEY}`),
      distributedCache.invalidate(`processes:${TENANT_KEY}`),
      distributedCache.invalidate(`macroprocesos:${TENANT_KEY}`),
      distributedCache.invalidate(`risk-processes:${CACHE_VERSION}:${TENANT_KEY}`),
      distributedCache.invalidate(`risk-processes:${TENANT_KEY}`),
      distributedCache.invalidate(`gerencias-risk-levels:${CACHE_VERSION}:${TENANT_KEY}`),
      distributedCache.invalidate(`gerencias-risk-levels:${TENANT_KEY}`),
      // Consolidated risks page data cache
      distributedCache.invalidate(`risks-page-data:${CACHE_VERSION}:${TENANT_KEY}`),
    ]);
    
    // 6. Risk matrix caches (including bootstrap granular caches)
    await invalidateRiskMatrixCache();
    await Promise.all([
      distributedCache.invalidate(`risk-matrix:macroprocesos:${TENANT_KEY}`),
      distributedCache.invalidate(`risk-matrix:processes:${TENANT_KEY}`),
      distributedCache.invalidate(`risk-matrix:heatmap:${TENANT_KEY}`),
    ]);
    
    const duration = Date.now() - startTime;
    console.log(`✅ [CACHE INVALIDATION COMPLETE] All risk-control caches invalidated in ${duration}ms (version: ${CACHE_VERSION})`);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [CACHE INVALIDATION ERROR] Failed after ${duration}ms:`, error);
  }
}

/**
 * Get the current cache version for risk-control associations
 * Use this when creating cache keys to ensure proper versioning
 */
export function getRiskControlCacheVersion(): string {
  return CACHE_VERSION;
}

/**
 * Invalidates process-gerencia relations caches
 * Call this whenever process-gerencia associations are modified
 */
export async function invalidateProcessRelationsCaches() {
  try {
    await Promise.all([
      distributedCache.invalidate(`process-gerencias:${TENANT_KEY}`),
      // Also invalidate consolidated risks page data cache
      distributedCache.invalidate(`risks-page-data:${CACHE_VERSION}:${TENANT_KEY}`)
    ]);
    console.log(`✅ Invalidated process relations caches`);
  } catch (error) {
    console.error(`Error invalidating process relations caches:`, error);
  }
}

/**
 * Invalidates consolidated risks page data cache
 * Call this after any mutation that affects data in the risks page:
 * - gerencias, macroprocesos, processes, subprocesos
 * - processOwners, riskCategories, riskProcessLinks, riskControls
 */
export async function invalidateRisksPageDataCache() {
  try {
    await distributedCache.invalidate(`risks-page-data:${CACHE_VERSION}:${TENANT_KEY}`);
    console.log(`✅ Invalidated risks page data cache`);
  } catch (error) {
    console.error(`Error invalidating risks page data cache:`, error);
  }
}

/**
 * Invalidates consolidated risk events page data cache
 * Call this after any mutation that affects data in the risk events page:
 * - risk events, risks, processes
 */
export async function invalidateRiskEventsPageDataCache() {
  try {
    await distributedCache.invalidate(`risk-events-page-data:${CACHE_VERSION}:${TENANT_KEY}`);
    console.log(`✅ Invalidated risk events page data cache`);
  } catch (error) {
    console.error(`Error invalidating risk events page data cache:`, error);
  }
}

const SYSTEM_CONFIG_CACHE_KEY = "system-config:all";
const SYSTEM_CONFIG_TTL = 10 * 60; // 10 minutes

export async function getSystemConfigFromCache(): Promise<Record<string, any> | null> {
  try {
    return await distributedCache.get(SYSTEM_CONFIG_CACHE_KEY);
  } catch (error) {
    console.error('Error getting system config from cache:', error);
    return null;
  }
}

export async function setSystemConfigCache(configs: Record<string, any>): Promise<void> {
  try {
    await distributedCache.set(SYSTEM_CONFIG_CACHE_KEY, configs, SYSTEM_CONFIG_TTL);
    console.log(`✅ System config cached with ${Object.keys(configs).length} keys (TTL: ${SYSTEM_CONFIG_TTL}s)`);
  } catch (error) {
    console.error('Error setting system config cache:', error);
  }
}

export async function invalidateSystemConfigCache(): Promise<void> {
  try {
    await distributedCache.invalidate(SYSTEM_CONFIG_CACHE_KEY);
    console.log(`✅ Invalidated system config cache`);
  } catch (error) {
    console.error('Error invalidating system config cache:', error);
  }
}
