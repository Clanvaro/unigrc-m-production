import { distributedCache } from "./services/redis";

/**
 * Cache version for risk-control associations
 * Increment this when schema or query logic changes to bust old caches
 */
export const CACHE_VERSION = "v3";

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
    // NEW: Invalidate optimized matrix endpoint cache (Sprint 1)
    await distributedCache.invalidate(`risk-matrix:data:${CACHE_VERSION}:${TENANT_KEY}`);
    await distributedCache.invalidate(`risk-matrix:heatmap:${TENANT_KEY}`);
  } catch (error) {
    console.error(`Error invalidating risk matrix cache:`, error);
  }
}

// ============================================
// GRANULAR CACHE INVALIDATION FUNCTIONS
// Use these instead of the "nuclear" invalidateRiskControlCaches
// ============================================

/**
 * FAST: Invalidates only risk-process link caches
 * Use when: Creating, updating, or deleting risk-process associations
 * Duration: ~5-10ms (vs 100ms+ for nuclear)
 */
export async function invalidateRiskProcessLinkCaches() {
  const startTime = Date.now();
  try {
    // Invalidate local cache first (instant)
    invalidatePageDataLiteCache();
    
    await Promise.all([
      distributedCache.invalidate(`risk-processes:${CACHE_VERSION}:${TENANT_KEY}`),
      distributedCache.invalidate(`risk-processes:${TENANT_KEY}`),
      distributedCache.invalidate(`risks-page-data:${CACHE_VERSION}:${TENANT_KEY}`),
      distributedCache.invalidate(`risks-page-data-lite:${CACHE_VERSION}:${TENANT_KEY}`),
      distributedCache.invalidate(`risks-overview:${CACHE_VERSION}:single-tenant`),
      distributedCache.invalidatePattern(`validation:risks:${CACHE_VERSION}:*:${TENANT_KEY}`),
      // CRITICAL: Invalidate batch-relations cache so risk list shows updated validation status
      // Pattern matches all batch-relations cache keys (they include riskIds in the key)
      distributedCache.invalidatePattern(`risks-batch-relations:${CACHE_VERSION}:*`),
    ]);
    console.log(`[GRANULAR] Risk-process link caches invalidated in ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error(`Error invalidating risk-process link caches:`, error);
  }
}

/**
 * FAST: Invalidates risk data caches AND dependent aggregates
 * Use when: Creating, updating, or deleting risks
 * Duration: ~15-25ms
 * Note: Also invalidates risk-processes caches since risk CRUD affects associations
 */
export async function invalidateRiskDataCaches() {
  const startTime = Date.now();
  try {
    // Invalidate local cache first (instant)
    invalidatePageDataLiteCache();
    
    await Promise.all([
      distributedCache.invalidatePattern(`risks:${TENANT_KEY}:*`),
      distributedCache.invalidatePattern(`risks-bootstrap:risks:${CACHE_VERSION}:*`),
      distributedCache.invalidate(`risks-with-details:${CACHE_VERSION}:${TENANT_KEY}`),
      distributedCache.invalidate(`risks-with-details:${TENANT_KEY}`),
      distributedCache.invalidate(`risks-basic:single-tenant`),
      distributedCache.invalidate(`risks-page-data:${CACHE_VERSION}:${TENANT_KEY}`),
      distributedCache.invalidate(`risks-page-data-lite:${CACHE_VERSION}:${TENANT_KEY}`),
      distributedCache.invalidate(`risks-overview:${CACHE_VERSION}:single-tenant`),
      distributedCache.invalidate(`risk-matrix-lite:${CACHE_VERSION}:${TENANT_KEY}`),
      distributedCache.invalidate(`risk-processes:${CACHE_VERSION}:${TENANT_KEY}`),
      distributedCache.invalidate(`risk-processes:${TENANT_KEY}`),
      distributedCache.invalidatePattern(`validation:risks:${CACHE_VERSION}:*:${TENANT_KEY}`),
    ]);
    await invalidateRiskMatrixCache();
    console.log(`[GRANULAR] Risk data caches invalidated in ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error(`Error invalidating risk data caches:`, error);
  }
}

/**
 * FAST: Invalidates control data caches AND dependent risk aggregates
 * Use when: Creating, updating, or deleting controls
 * Duration: ~15-25ms
 * Note: Also invalidates risks-with-details and risks-page-data since control
 *       effectiveness and residual risk info is embedded in those caches
 */
export async function invalidateControlDataCaches() {
  const startTime = Date.now();
  try {
    // Invalidate local cache first (instant)
    invalidatePageDataLiteCache();
    
    await Promise.all([
      distributedCache.invalidatePattern(`controls:${CACHE_VERSION}:${TENANT_KEY}:*`),
      distributedCache.invalidatePattern(`controls:${TENANT_KEY}:*`),
      distributedCache.invalidate(`risk-controls-with-details:${TENANT_KEY}`),
      distributedCache.invalidate(`risks-with-details:${CACHE_VERSION}:${TENANT_KEY}`),
      distributedCache.invalidate(`risks-with-details:${TENANT_KEY}`),
      distributedCache.invalidate(`risks-page-data:${CACHE_VERSION}:${TENANT_KEY}`),
      distributedCache.invalidate(`risks-page-data-lite:${CACHE_VERSION}:${TENANT_KEY}`),
      distributedCache.invalidate(`risks-overview:${CACHE_VERSION}:single-tenant`),
      distributedCache.invalidatePattern(`risks-bootstrap:risks:${CACHE_VERSION}:*`),
    ]);
    await invalidateRiskMatrixCache();
    console.log(`[GRANULAR] Control data caches invalidated in ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error(`Error invalidating control data caches:`, error);
  }
}

/**
 * FAST: Invalidates only risk-control association caches
 * Use when: Creating, updating, or deleting risk-control links
 * Duration: ~15-25ms
 */
export async function invalidateRiskControlAssociationCaches() {
  const startTime = Date.now();
  try {
    // Invalidate local cache first (instant)
    invalidatePageDataLiteCache();
    
    await Promise.all([
      distributedCache.invalidatePattern(`risk-control-associations:${CACHE_VERSION}:${TENANT_KEY}:*`),
      distributedCache.invalidate(`risk-controls-with-details:${TENANT_KEY}`),
      distributedCache.invalidate(`risks-page-data:${CACHE_VERSION}:${TENANT_KEY}`),
      distributedCache.invalidate(`risks-page-data-lite:${CACHE_VERSION}:${TENANT_KEY}`),
      distributedCache.invalidate(`risks-overview:${CACHE_VERSION}:single-tenant`),
      distributedCache.invalidatePattern(`risks-bootstrap:risks:${CACHE_VERSION}:*`),
      // CRITICAL: Invalidate controls-with-details cache so control list shows updated associated risks
      distributedCache.invalidatePattern(`controls-with-details:${CACHE_VERSION}:*`),
    ]);
    await invalidateRiskMatrixCache();
    console.log(`[GRANULAR] Risk-control association caches invalidated in ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error(`Error invalidating risk-control association caches:`, error);
  }
}

/**
 * FAST: Invalidates only validation center caches
 * Use when: Updating validation status
 * Duration: ~5-10ms
 */
export async function invalidateValidationCaches() {
  const startTime = Date.now();
  try {
    // Keys in routes.ts follow: validation:risk-processes:${CACHE_VERSION}:${tenantId}:${actualStatus}
    // and validation:controls:validated:${CACHE_VERSION}:${tenantId}
    await Promise.all([
      // Risks: tenantId is in the middle, status is at the end
      distributedCache.invalidatePattern(`validation:risk-processes:${CACHE_VERSION}:${TENANT_KEY}:*`),
      // Controls: status is in the middle/start, tenant is at the end
      distributedCache.invalidatePattern(`validation:controls:*:${CACHE_VERSION}:${TENANT_KEY}`),
      // Legacy patterns or other variants
      distributedCache.invalidatePattern(`validation:risk-processes:*:${TENANT_KEY}`),
      distributedCache.invalidatePattern(`validation:controls:*:${TENANT_KEY}`),
      // Also invalidate the counts cache which uses: validation:counts:${CACHE_VERSION}:${tenantId}
      distributedCache.invalidatePattern(`validation:counts:${CACHE_VERSION}:${TENANT_KEY}`)
    ]);
    console.log(`[GRANULAR] Validation caches invalidated in ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error(`Error invalidating validation caches:`, error);
  }
}

/**
 * LEGACY/NUCLEAR: Invalidates ALL caches - USE SPARINGLY
 * @deprecated Prefer granular invalidation functions above
 * Only use for major schema changes or when multiple cache types are affected
 */
export async function invalidateRiskControlCaches() {
  const startTime = Date.now();
  console.log(`[CACHE INVALIDATION START] Nuclear invalidation (consider using granular functions)`);

  try {
    // Invalidate local cache first (instant)
    invalidatePageDataLiteCache();
    
    // Execute all invalidations in parallel for speed
    await Promise.all([
      // Risk caches
      distributedCache.invalidatePattern(`risks:${TENANT_KEY}:*`),
      distributedCache.invalidatePattern(`risks-bootstrap:risks:${CACHE_VERSION}:*`),
      distributedCache.invalidate(`risks-with-details:${CACHE_VERSION}:${TENANT_KEY}`),
      distributedCache.invalidate(`risks-with-details:${TENANT_KEY}`),

      // Control caches
      distributedCache.invalidatePattern(`controls:${CACHE_VERSION}:${TENANT_KEY}:*`),
      distributedCache.invalidatePattern(`controls:${TENANT_KEY}:*`),

      // Validation caches
      distributedCache.invalidatePattern(`validation:risks:${CACHE_VERSION}:*:${TENANT_KEY}`),
      distributedCache.invalidatePattern(`validation:controls:${CACHE_VERSION}:*:${TENANT_KEY}`),

      // Association caches
      distributedCache.invalidatePattern(`risk-control-associations:${CACHE_VERSION}:${TENANT_KEY}:*`),
      distributedCache.invalidate(`risk-controls-with-details:${TENANT_KEY}`),
      distributedCache.invalidate(`risks-basic:single-tenant`),
      distributedCache.invalidate(`risk-processes:${CACHE_VERSION}:${TENANT_KEY}`),
      distributedCache.invalidate(`risk-processes:${TENANT_KEY}`),

      // Page data caches
      distributedCache.invalidate(`risks-page-data:${CACHE_VERSION}:${TENANT_KEY}`),
      distributedCache.invalidate(`risks-page-data-lite:${CACHE_VERSION}:${TENANT_KEY}`),

      // Matrix caches
      distributedCache.invalidate(`risk-matrix:macroprocesos:${TENANT_KEY}`),
      distributedCache.invalidate(`risk-matrix:processes:${TENANT_KEY}`),
      distributedCache.invalidate(`risk-matrix:heatmap:${TENANT_KEY}`),
      distributedCache.invalidate(`process-map-risks:${TENANT_KEY}`),
      distributedCache.invalidate(`risk-matrix-lite:${CACHE_VERSION}:${TENANT_KEY}`),
    ]);

    await invalidateRiskMatrixCache();

    const duration = Date.now() - startTime;
    console.log(`✅ [CACHE INVALIDATION COMPLETE] Nuclear invalidation in ${duration}ms`);
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
 * Updated to support 15-minute TTL caching strategy
 */
export async function invalidateRiskEventsPageDataCache() {
  try {
    await Promise.all([
      // Invalidate all paginated caches (pattern matching)
      distributedCache.invalidatePattern(`risk-events-page-data:${CACHE_VERSION}:${TENANT_KEY}:*`),
      // Also invalidate legacy key
      distributedCache.invalidate(`risk-events-page-data:${CACHE_VERSION}:${TENANT_KEY}`),
      // Invalidate risks-overview (contains risk event counts)
      distributedCache.invalidate(`risks-overview:${TENANT_KEY}`)
    ]);
    console.log(`✅ Invalidated risk events page data cache (15-min TTL caches cleared)`);
  } catch (error) {
    console.error(`Error invalidating risk events page data cache:`, error);
  }
}

/**
 * Invalidates catalog basic caches (lightweight endpoints for client-side joins)
 * Call this after CRUD operations on macroprocesos, processes, subprocesos, risks
 */
export async function invalidateCatalogBasicCaches(catalogs?: ('macroprocesos' | 'processes' | 'subprocesos' | 'risks')[]) {
  try {
    const allCatalogs = catalogs || ['macroprocesos', 'processes', 'subprocesos'];
    const invalidations = allCatalogs.map(catalog =>
      distributedCache.invalidate(`${catalog}-basic:${TENANT_KEY}`)
    );
    await Promise.all(invalidations);
    console.log(`✅ Invalidated catalog basic caches: ${allCatalogs.join(', ')}`);
  } catch (error) {
    console.error(`Error invalidating catalog basic caches:`, error);
  }
}

/**
 * Invalidates risks-basic catalog cache
 * Call this after CRUD operations on risks
 */
export async function invalidateRisksBasicCache() {
  try {
    await distributedCache.invalidate(`risks-basic:single-tenant`);
    console.log(`✅ Invalidated risks-basic catalog cache`);
  } catch (error) {
    console.error(`Error invalidating risks-basic cache:`, error);
  }
}

const SYSTEM_CONFIG_CACHE_KEY = "system-config:all";
const SYSTEM_CONFIG_TTL = 10 * 60; // 10 minutes

// ============================================
// CATALOG CACHE SYSTEM
// In-memory cache for rarely changing catalog data
// TTL: 5-10 minutes depending on change frequency
// ============================================

interface CatalogCacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// In-memory catalog cache (Node.js process memory)
const catalogCache = new Map<string, CatalogCacheEntry<any>>();

// Cache TTLs in milliseconds
// OPTIMIZED: Long TTLs for static catalogs - these rarely change and are invalidated on mutation
// Benefits: 1) Near-zero latency (<1ms vs 60-115ms from Upstash) 2) No network calls 3) Free (uses allocated memory)
const CATALOG_TTL = {
  macroprocesos: 2 * 60 * 60 * 1000,  // 2 hours - organizational structure rarely changes
  processes: 2 * 60 * 60 * 1000,      // 2 hours - organizational structure rarely changes
  subprocesos: 2 * 60 * 60 * 1000,    // 2 hours - organizational structure rarely changes
  gerencias: 2 * 60 * 60 * 1000,      // 2 hours - organizational structure rarely changes
  controls: 1 * 60 * 60 * 1000,       // 1 hour - control definitions change infrequently
  processOwners: 1 * 60 * 60 * 1000,  // 1 hour - ownership changes infrequently
  riskCategories: 2 * 60 * 60 * 1000, // 2 hours - static configuration
  fiscalEntities: 2 * 60 * 60 * 1000, // 2 hours - organizational structure rarely changes
};

type CatalogKey = keyof typeof CATALOG_TTL;

/**
 * Get catalog data from in-memory cache
 */
export function getCatalogFromCache<T>(key: CatalogKey): T | null {
  const entry = catalogCache.get(key);
  if (!entry) {
    console.log(`[CATALOG CACHE MISS] ${key}`);
    return null;
  }

  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    console.log(`[CATALOG CACHE EXPIRED] ${key} (age: ${Math.round((now - entry.timestamp) / 1000)}s, ttl: ${entry.ttl / 1000}s)`);
    catalogCache.delete(key);
    return null;
  }

  console.log(`[CATALOG CACHE HIT] ${key} (age: ${Math.round((now - entry.timestamp) / 1000)}s)`);
  return entry.data as T;
}

/**
 * Set catalog data in in-memory cache
 */
export function setCatalogCache<T>(key: CatalogKey, data: T): void {
  const ttl = CATALOG_TTL[key];
  catalogCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
  console.log(`[CATALOG CACHE SET] ${key} (TTL: ${ttl / 1000}s, items: ${Array.isArray(data) ? data.length : 1})`);
}

/**
 * Invalidate specific catalog cache
 */
export function invalidateCatalogCache(key: CatalogKey): void {
  if (catalogCache.has(key)) {
    catalogCache.delete(key);
    console.log(`[CATALOG CACHE INVALIDATED] ${key}`);
  }
}

/**
 * Invalidate multiple catalog caches at once
 */
export function invalidateCatalogCaches(keys: CatalogKey[]): void {
  keys.forEach(key => invalidateCatalogCache(key));
}

/**
 * Invalidate all catalog caches
 */
export function invalidateAllCatalogCaches(): void {
  const keys = Array.from(catalogCache.keys());
  catalogCache.clear();
  console.log(`[CATALOG CACHE CLEARED] All ${keys.length} catalogs invalidated`);
}

/**
 * Invalidate macroproceso hierarchy (macroprocesos + processes + subprocesos)
 */
export function invalidateMacroprocesoHierarchy(): void {
  invalidateCatalogCaches(['macroprocesos', 'processes', 'subprocesos']);
  console.log(`[CATALOG CACHE] Macroproceso hierarchy invalidated`);
}

// ============================================
// LOCAL CACHE FOR PAGE-DATA-LITE
// Eliminates Upstash latency (~1.5s per cache miss)
// ============================================

interface PageDataLiteCacheEntry {
  data: any;
  timestamp: number;
}

// Single-tenant cache for page-data-lite
const pageDataLiteCache = new Map<string, PageDataLiteCacheEntry>();
const PAGE_DATA_LITE_TTL = 20 * 60 * 1000; // 20 minutes (same as previous Upstash TTL)

// Local lock for single-flight pattern (prevents duplicate computation in same instance)
const pageDataLiteLocks = new Map<string, Promise<any>>();

/**
 * Get page-data-lite from local cache
 */
export function getPageDataLiteFromCache(tenantId: string): any | null {
  const entry = pageDataLiteCache.get(tenantId);
  if (!entry) {
    console.log(`[PAGE-DATA-LITE CACHE MISS] ${tenantId}`);
    return null;
  }

  const now = Date.now();
  if (now - entry.timestamp > PAGE_DATA_LITE_TTL) {
    console.log(`[PAGE-DATA-LITE CACHE EXPIRED] ${tenantId} (age: ${Math.round((now - entry.timestamp) / 1000)}s)`);
    pageDataLiteCache.delete(tenantId);
    return null;
  }

  console.log(`[PAGE-DATA-LITE CACHE HIT] ${tenantId} (age: ${Math.round((now - entry.timestamp) / 1000)}s)`);
  return entry.data;
}

/**
 * Set page-data-lite in local cache
 */
export function setPageDataLiteCache(tenantId: string, data: any): void {
  pageDataLiteCache.set(tenantId, {
    data,
    timestamp: Date.now(),
  });
  console.log(`[PAGE-DATA-LITE CACHE SET] ${tenantId} (TTL: ${PAGE_DATA_LITE_TTL / 1000}s)`);
}

/**
 * Invalidate page-data-lite cache
 */
export function invalidatePageDataLiteCache(tenantId?: string): void {
  if (tenantId) {
    if (pageDataLiteCache.has(tenantId)) {
      pageDataLiteCache.delete(tenantId);
      console.log(`[PAGE-DATA-LITE CACHE INVALIDATED] ${tenantId}`);
    }
  } else {
    pageDataLiteCache.clear();
    console.log(`[PAGE-DATA-LITE CACHE CLEARED] All entries invalidated`);
  }
}

/**
 * Get or acquire lock for single-flight pattern
 * Returns existing promise if computation is in progress, null otherwise
 */
export function getPageDataLiteLock(tenantId: string): Promise<any> | null {
  return pageDataLiteLocks.get(tenantId) || null;
}

/**
 * Set lock for single-flight pattern
 */
export function setPageDataLiteLock(tenantId: string, promise: Promise<any>): void {
  pageDataLiteLocks.set(tenantId, promise);
  // Auto-cleanup after promise resolves (with timeout fallback)
  Promise.race([
    promise,
    new Promise(resolve => setTimeout(resolve, 30000)) // 30 second max lock
  ]).finally(() => {
    pageDataLiteLocks.delete(tenantId);
  });
}

/**
 * Invalidate process hierarchy (processes + subprocesos)
 */
export function invalidateProcessHierarchy(): void {
  invalidateCatalogCaches(['processes', 'subprocesos']);
  console.log(`[CATALOG CACHE] Process hierarchy invalidated`);
}

/**
 * Get catalog cache stats for monitoring
 */
export function getCatalogCacheStats(): { key: string; age: number; ttl: number; size: number }[] {
  const now = Date.now();
  return Array.from(catalogCache.entries()).map(([key, entry]) => ({
    key,
    age: Math.round((now - entry.timestamp) / 1000),
    ttl: entry.ttl / 1000,
    size: Array.isArray(entry.data) ? entry.data.length : 1,
  }));
}

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
