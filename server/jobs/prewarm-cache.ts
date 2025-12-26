import { twoTierCache } from '../services/two-tier-cache';
import { storage } from '../storage';

/**
 * Cache Prewarm Service
 * 
 * Precarga catálogos críticos antes de que expiren para mantener cache siempre caliente.
 * Esto asegura que Upstash nunca esté en el camino crítico - cache siempre está listo.
 * 
 * Estrategia:
 * - Ejecuta cada 28 minutos (2 min antes de que expire L2 de 30 min)
 * - Solo entre 07:30 y 21:30 (horario activo)
 * - Precarga en background (no bloquea requests)
 */

interface PrewarmConfig {
  key: string;
  fetchFn: () => Promise<any>;
  description: string;
}

class CachePrewarmService {
  private static instance: CachePrewarmService;
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastPrewarmTime: number = 0;

  // Catálogos críticos que deben estar siempre en cache
  private readonly CRITICAL_CATALOGS: PrewarmConfig[] = [
    {
      key: 'processes-basic:single-tenant',
      description: 'Processes catalog with risk levels',
      fetchFn: async () => {
        const [processes, allRiskLevels] = await Promise.all([
          storage.getProcessesWithOwners(),
          storage.getAllRiskLevelsOptimized({ entities: ['processes'] })
        ]);
        return processes.map((process: any) => {
          const riskLevels = allRiskLevels.processes.get(process.id) || { inherentRisk: 0, residualRisk: 0, riskCount: 0 };
          return {
            id: process.id,
            code: process.code,
            name: process.name,
            description: process.description,
            ownerId: process.ownerId,
            macroprocesoId: process.macroprocesoId,
            owner: process.owner,
            inherentRisk: riskLevels.inherentRisk,
            residualRisk: riskLevels.residualRisk,
            riskCount: riskLevels.riskCount
          };
        });
      }
    },
    {
      key: 'subprocesos:single-tenant',
      description: 'Subprocesos catalog with risk levels',
      fetchFn: async () => {
        const [subprocesos, allRiskLevels] = await Promise.all([
          storage.getSubprocesosWithOwners(),
          storage.getAllRiskLevelsOptimized({ entities: ['subprocesos'] })
        ]);
        const activeSubprocesos = subprocesos.filter((s: any) => s.status !== 'deleted');
        return activeSubprocesos.map((subproceso: any) => {
          const riskLevels = allRiskLevels.subprocesos.get(subproceso.id) || { inherentRisk: 0, residualRisk: 0, riskCount: 0 };
          return {
            ...subproceso,
            ...riskLevels
          };
        });
      }
    },
    {
      key: 'macroprocesos-basic:single-tenant',
      description: 'Macroprocesos catalog',
      fetchFn: async () => {
        // Match the logic from /api/macroprocesos/basic endpoint
        const { requireDb } = await import('../db');
        const { macroprocesos } = await import('@shared/schema');
        const { isNull } = await import('drizzle-orm');
        
        const data = await requireDb()
          .select({
            id: macroprocesos.id,
            code: macroprocesos.code,
            name: macroprocesos.name
          })
          .from(macroprocesos)
          .where(isNull(macroprocesos.deletedAt));
        
        return data;
      }
    },
    {
      key: 'process-owners:single-tenant',
      description: 'Process owners catalog',
      fetchFn: async () => {
        // Match the logic from /api/process-owners endpoint
        const { requireDb } = await import('../db');
        const { processOwners } = await import('@shared/schema');
        const { eq } = await import('drizzle-orm');
        
        const data = await requireDb()
          .select({
            id: processOwners.id,
            name: processOwners.name,
            email: processOwners.email,
            position: processOwners.position,
            isActive: processOwners.isActive,
            createdAt: processOwners.createdAt,
            updatedAt: processOwners.updatedAt,
          })
          .from(processOwners)
          .where(eq(processOwners.isActive, true))
          .orderBy(processOwners.name);
        
        return data;
      }
    }
  ];

  public static getInstance(): CachePrewarmService {
    if (!CachePrewarmService.instance) {
      CachePrewarmService.instance = new CachePrewarmService();
    }
    return CachePrewarmService.instance;
  }

  /**
   * Check if current time is within active hours (07:30 - 21:30)
   */
  private isWithinActiveHours(): boolean {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTimeMinutes = hours * 60 + minutes;
    
    const startTimeMinutes = 7 * 60 + 30; // 07:30
    const endTimeMinutes = 21 * 60 + 30;  // 21:30
    
    return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes;
  }

  /**
   * Get milliseconds until next active hour window starts
   */
  private getMillisecondsUntilActiveHours(): number {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTimeMinutes = hours * 60 + minutes;
    
    const startTimeMinutes = 7 * 60 + 30; // 07:30
    
    let minutesUntilStart: number;
    if (currentTimeMinutes < startTimeMinutes) {
      // Before 07:30 today - wait until 07:30
      minutesUntilStart = startTimeMinutes - currentTimeMinutes;
    } else if (currentTimeMinutes > 21 * 60 + 30) {
      // After 21:30 - wait until 07:30 tomorrow
      minutesUntilStart = (24 * 60 - currentTimeMinutes) + startTimeMinutes;
    } else {
      // Within active hours - execute immediately
      return 0;
    }
    
    return minutesUntilStart * 60 * 1000;
  }

  /**
   * Start prewarm service
   * Executes every 28 minutes, but only between 07:30 and 21:30
   */
  start(): void {
    if (this.isRunning) {
      console.log('[Prewarm] Service already running');
      return;
    }

    console.log('[Prewarm] Starting cache prewarm service...');
    console.log('[Prewarm] Active hours: 07:30 - 21:30');
    console.log('[Prewarm] Interval: 28 minutes');
    this.isRunning = true;

    // Check if we're within active hours
    if (this.isWithinActiveHours()) {
      // Execute immediately if within active hours
      console.log('[Prewarm] Within active hours - executing immediately');
      this.executePrewarm();
    } else {
      const msUntilStart = this.getMillisecondsUntilActiveHours();
      const hoursUntilStart = Math.floor(msUntilStart / (60 * 60 * 1000));
      const minutesUntilStart = Math.floor((msUntilStart % (60 * 60 * 1000)) / (60 * 1000));
      console.log(`[Prewarm] Outside active hours - will start in ${hoursUntilStart}h ${minutesUntilStart}m`);
    }

    // Set up interval to check and execute every 28 minutes
    const PREWARM_INTERVAL_MS = 28 * 60 * 1000; // 28 minutes
    this.interval = setInterval(() => {
      if (this.isWithinActiveHours()) {
        this.executePrewarm();
      } else {
        console.log('[Prewarm] Outside active hours (07:30-21:30) - skipping prewarm');
      }
    }, PREWARM_INTERVAL_MS);

    console.log(`[Prewarm] Service started - will prewarm every ${PREWARM_INTERVAL_MS / 1000 / 60} minutes (only between 07:30-21:30)`);
  }

  /**
   * Stop prewarm service
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('[Prewarm] Stopping cache prewarm service...');
    this.isRunning = false;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    console.log('[Prewarm] Service stopped');
  }

  /**
   * Execute prewarm for all critical catalogs
   * Runs in background - doesn't block requests
   */
  async executePrewarm(): Promise<void> {
    const startTime = Date.now();
    console.log(`[Prewarm] Starting prewarm for ${this.CRITICAL_CATALOGS.length} critical catalogs...`);

    const results = await Promise.allSettled(
      this.CRITICAL_CATALOGS.map(async (config) => {
        const catalogStart = Date.now();
        try {
          // Use twoTierCache.get() with fetchFn to populate cache
          // This ensures data goes through L1 and L2 caches
          const data = await twoTierCache.get(config.key, config.fetchFn);
          const duration = Date.now() - catalogStart;
          
          if (data !== null) {
            console.log(`[Prewarm] ✅ ${config.description} (${duration}ms)`);
            return { key: config.key, success: true, duration };
          } else {
            console.warn(`[Prewarm] ⚠️ ${config.description} returned null (${duration}ms)`);
            return { key: config.key, success: false, duration, error: 'Null data' };
          }
        } catch (error) {
          const duration = Date.now() - catalogStart;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[Prewarm] ❌ ${config.description} failed (${duration}ms):`, errorMessage);
          return { key: config.key, success: false, duration, error: errorMessage };
        }
      })
    );

    const totalDuration = Date.now() - startTime;
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    this.lastPrewarmTime = Date.now();

    console.log(`[Prewarm] Completed: ${successful}/${this.CRITICAL_CATALOGS.length} successful in ${totalDuration}ms`);
    
    if (failed > 0) {
      console.warn(`[Prewarm] ${failed} catalogs failed to prewarm`);
    }
  }

  /**
   * Get prewarm service status
   */
  getStatus(): {
    isRunning: boolean;
    lastPrewarmTime: number;
    catalogsCount: number;
    catalogs: string[];
  } {
    return {
      isRunning: this.isRunning,
      lastPrewarmTime: this.lastPrewarmTime,
      catalogsCount: this.CRITICAL_CATALOGS.length,
      catalogs: this.CRITICAL_CATALOGS.map(c => c.key)
    };
  }

  /**
   * Manually trigger prewarm (useful for testing or Cloud Scheduler)
   */
  async triggerPrewarm(): Promise<{ success: boolean; message: string }> {
    try {
      await this.executePrewarm();
      return { success: true, message: 'Prewarm executed successfully' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: `Prewarm failed: ${errorMessage}` };
    }
  }
}

// Export singleton instance
export const cachePrewarmService = CachePrewarmService.getInstance();

