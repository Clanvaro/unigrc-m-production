/**
 * Job para refrescar la vista materializada risk_list_view
 * Usa advisory lock para evitar refreshes concurrentes
 */

import { requireDb } from '../db';
import { sql } from 'drizzle-orm';

const REFRESH_LOCK_ID = 12345; // ID único para advisory lock de PostgreSQL

/**
 * Refresca la vista materializada con advisory lock
 * Asegura que solo 1 refresh corra a la vez
 */
export async function refreshRiskListView(): Promise<void> {
  const db = requireDb();
  
  console.log('[JOB] Attempting to refresh risk_list_view...');
  const start = Date.now();
  
  try {
    // Intentar adquirir advisory lock (no bloqueante)
    const lockResult = await db.execute(sql`
      SELECT pg_try_advisory_lock(${REFRESH_LOCK_ID}) as acquired
    `);
    
    const lockAcquired = (lockResult.rows[0] as any)?.acquired;
    
    if (!lockAcquired) {
      console.log('[JOB] Another refresh is already running, skipping...');
      return; // Otro proceso ya está refrescando
    }
    
    try {
      // REFRESH CONCURRENTLY (requiere índice único ux_risk_list_view_id)
      await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY risk_list_view`);
      
      const duration = Date.now() - start;
      console.log(`[JOB] risk_list_view refreshed in ${duration}ms`);
    } finally {
      // Siempre liberar el lock
      await db.execute(sql`SELECT pg_advisory_unlock(${REFRESH_LOCK_ID})`);
    }
  } catch (error) {
    console.error('[JOB] Failed to refresh risk_list_view:', error);
    
    // Asegurar que el lock se libere incluso en error
    try {
      await db.execute(sql`SELECT pg_advisory_unlock(${REFRESH_LOCK_ID})`);
    } catch (unlockError) {
      console.error('[JOB] Failed to release lock:', unlockError);
    }
    
    throw error;
  }
}

/**
 * Marca la vista como "stale" para que se refresque en el próximo ciclo
 * También invalida el cache de la página
 */
export async function invalidateRiskListView(riskId?: string): Promise<void> {
  const { distributedCache } = await import('../services/redis');
  
  // Invalidar cache de la página
  try {
    await distributedCache.invalidate(`pages:risks:*`);
  } catch (err) {
    console.warn('[CACHE] Failed to invalidate pages:risks cache:', err);
  }
  
  // Marcar vista como stale (refresh en próximo ciclo de 5 min)
  try {
    await distributedCache.set(`risk_list_view:stale`, '1', 300); // 5 min TTL
  } catch (err) {
    console.warn('[CACHE] Failed to set stale flag:', err);
  }
  
  // Si es crítico, refrescar inmediatamente (opcional - descomentar si necesario)
  // await refreshRiskListView();
}

/**
 * Verifica si la vista está marcada como stale
 */
export async function isRiskListViewStale(): Promise<boolean> {
  const { distributedCache } = await import('../services/redis');
  
  try {
    const stale = await distributedCache.get('risk_list_view:stale');
    return stale === '1';
  } catch (err) {
    console.warn('[CACHE] Failed to check stale flag:', err);
    return false;
  }
}

/**
 * Servicio programado para refrescar risk_list_view
 * Refresca cada 5 minutos, pero solo si está marcado como stale
 */
class RiskListViewRefreshService {
  private static instance: RiskListViewRefreshService;
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastRefreshTime: number = 0;

  public static getInstance(): RiskListViewRefreshService {
    if (!RiskListViewRefreshService.instance) {
      RiskListViewRefreshService.instance = new RiskListViewRefreshService();
    }
    return RiskListViewRefreshService.instance;
  }

  /**
   * Inicia el servicio de refresh
   * Ejecuta cada 5 minutos, pero solo si la vista está marcada como stale
   */
  start(): void {
    if (this.isRunning) {
      console.log('[RiskListViewRefresh] Service already running');
      return;
    }

    console.log('[RiskListViewRefresh] Starting refresh service...');
    console.log('[RiskListViewRefresh] Interval: 5 minutes');
    this.isRunning = true;

    // Ejecutar inmediatamente al inicio (una vez)
    setTimeout(() => {
      this.executeRefresh().catch(err => {
        console.error('[RiskListViewRefresh] Initial refresh failed:', err);
      });
    }, 10000); // Esperar 10s para que la DB esté lista

    // Configurar intervalo de 5 minutos
    const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos
    this.interval = setInterval(() => {
      this.executeRefresh().catch(err => {
        console.error('[RiskListViewRefresh] Scheduled refresh failed:', err);
      });
    }, REFRESH_INTERVAL_MS);

    console.log(`[RiskListViewRefresh] Service started - will check and refresh every ${REFRESH_INTERVAL_MS / 1000 / 60} minutes`);
  }

  /**
   * Detiene el servicio de refresh
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('[RiskListViewRefresh] Stopping refresh service...');
    this.isRunning = false;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    console.log('[RiskListViewRefresh] Service stopped');
  }

  /**
   * Ejecuta refresh si la vista está marcada como stale
   */
  async executeRefresh(): Promise<void> {
    try {
      // Verificar si la vista está marcada como stale
      const isStale = await isRiskListViewStale();

      if (isStale) {
        console.log('[RiskListViewRefresh] risk_list_view is stale, refreshing...');
        await refreshRiskListView();
        this.lastRefreshTime = Date.now();

        // Limpiar flag de stale
        const { distributedCache } = await import('../services/redis');
        await distributedCache.invalidate('risk_list_view:stale').catch(() => {});
      } else {
        console.log('[RiskListViewRefresh] risk_list_view is fresh, skipping refresh');
      }
    } catch (error) {
      console.error('[RiskListViewRefresh] Failed to execute refresh:', error);
      throw error;
    }
  }

  /**
   * Obtiene el estado del servicio
   */
  getStatus(): {
    isRunning: boolean;
    lastRefreshTime: number;
  } {
    return {
      isRunning: this.isRunning,
      lastRefreshTime: this.lastRefreshTime,
    };
  }

  /**
   * Fuerza un refresh inmediato (útil para testing)
   */
  async triggerRefresh(): Promise<{ success: boolean; message: string }> {
    try {
      await refreshRiskListView();
      this.lastRefreshTime = Date.now();
      return { success: true, message: 'Refresh executed successfully' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: `Refresh failed: ${errorMessage}` };
    }
  }
}

// Export singleton instance
export const riskListViewRefreshService = RiskListViewRefreshService.getInstance();

