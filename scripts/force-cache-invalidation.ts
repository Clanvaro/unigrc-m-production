/**
 * Force Cache Invalidation Script
 * 
 * This script manually invalidates all risk-control related caches across all tenants.
 * Run this after deploying the unified query fix to clear stale v1 cache entries.
 * 
 * Usage:
 *   npm run tsx scripts/force-cache-invalidation.ts
 */

import { db } from "../server/db";
import { tenants } from "../db/schema";
import { distributedCache } from "../server/services/redis";

async function invalidateAllCaches() {
  console.log("🧹 Starting cache invalidation for all tenants...\n");

  try {
    // Get all tenants
    const allTenants = await db.select().from(tenants);
    console.log(`Found ${allTenants.length} tenants to process\n`);

    for (const tenant of allTenants) {
      console.log(`Processing tenant: ${tenant.name} (${tenant.id})`);
      
      try {
        // Invalidate all risk-control related caches (both v1 and v2)
        await Promise.all([
          // V2 (current) caches
          distributedCache.invalidate(`risks-with-details:v2:${tenant.id}`),
          distributedCache.invalidatePattern(`controls:v2:${tenant.id}:*`),
          distributedCache.invalidatePattern(`validation:risks:v2:*:${tenant.id}`),
          distributedCache.invalidatePattern(`validation:controls:v2:*:${tenant.id}`),
          distributedCache.invalidatePattern(`risk-control-associations:v2:${tenant.id}:*`),
          distributedCache.invalidate(`risk-matrix-aggregated:v2:${tenant.id}`),
          
          // V1 (legacy) caches - CRITICAL: Remove these to force reload
          distributedCache.invalidate(`risks-with-details:${tenant.id}`),
          distributedCache.invalidatePattern(`controls:${tenant.id}:*`),
          distributedCache.invalidatePattern(`validation:risks:*:${tenant.id}`),
          distributedCache.invalidatePattern(`validation:controls:*:${tenant.id}`),
          distributedCache.invalidate(`risk-matrix-aggregated:${tenant.id}`),
        ]);
        
        console.log(`  ✅ Cache invalidated for ${tenant.name}`);
      } catch (error) {
        console.error(`  ❌ Error invalidating cache for ${tenant.name}:`, error);
      }
    }

    console.log("\n✅ Cache invalidation completed for all tenants!");
    console.log("\n📊 Next steps:");
    console.log("1. Refresh the application in your browser");
    console.log("2. Verify that R-0002 now shows both controls in the table");
    console.log("3. Check that modal and table views match");
    
  } catch (error) {
    console.error("❌ Fatal error during cache invalidation:", error);
    process.exit(1);
  }
}

// Execute
invalidateAllCaches()
  .then(() => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
