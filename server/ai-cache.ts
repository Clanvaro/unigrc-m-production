/**
 * Sistema de caché en memoria para respuestas del AI Assistant
 * Optimiza consultas frecuentes y reduce tiempos de respuesta
 */

interface CacheEntry {
  response: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: string;
}

class AICache {
  private cache: Map<string, CacheEntry>;
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minutos
  private hits = 0;
  private misses = 0;

  constructor() {
    this.cache = new Map();
    // Limpiar entradas expiradas cada minuto
    setInterval(() => this.cleanExpired(), 60000);
  }

  /**
   * Generar clave de caché normalizada
   */
  private generateKey(question: string): string {
    return question.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Verificar si una entrada está expirada
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > this.TTL_MS;
  }

  /**
   * Obtener respuesta del caché
   */
  get(question: string): string | null {
    const key = this.generateKey(question);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    console.log(`✅ Cache HIT: "${question.substring(0, 50)}..." (${this.getHitRate()}% hit rate)`);
    return entry.response;
  }

  /**
   * Guardar respuesta en caché
   */
  set(question: string, response: string, metadata?: Record<string, any>): void {
    const key = this.generateKey(question);
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      metadata
    });
    console.log(`💾 Cached: "${question.substring(0, 50)}..." (${this.cache.size} items in cache)`);
  }

  /**
   * Invalidar caché por tipo de dato
   */
  invalidateByType(dataType: 'risks' | 'controls' | 'audits' | 'documents' | 'events' | 'actions' | 'all'): void {
    if (dataType === 'all') {
      this.clear();
      return;
    }

    // Patrones que indican que una pregunta está relacionada con un tipo específico
    const patterns: Record<string, RegExp[]> = {
      risks: [/riesgo/i, /risk/i, /amenaza/i],
      controls: [/control/i, /mitigación/i, /prevención/i],
      audits: [/auditor/i, /audit/i, /revisión/i],
      documents: [/documento/i, /normativ/i, /regulación/i],
      events: [/evento/i, /incident/i],
      actions: [/acción/i, /plan/i, /tarea/i]
    };

    const relatedPatterns = patterns[dataType] || [];
    let invalidatedCount = 0;

    const entries = Array.from(this.cache.entries());
    for (const [key] of entries) {
      if (relatedPatterns.some(pattern => pattern.test(key))) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }

    if (invalidatedCount > 0) {
      console.log(`🗑️  Invalidated ${invalidatedCount} cache entries for type: ${dataType}`);
    }
  }

  /**
   * Limpiar entradas expiradas
   */
  private cleanExpired(): void {
    let cleanedCount = 0;
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * Limpiar todo el caché
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    console.log(`🗑️  Cleared entire cache (${size} entries)`);
  }

  /**
   * Obtener estadísticas del caché
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(1) : '0.0';
    
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: `${hitRate}%`
    };
  }

  /**
   * Obtener tasa de aciertos
   */
  private getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? Math.round((this.hits / total) * 100) : 0;
  }
}

// Exportar instancia singleton
export const aiCache = new AICache();

// Exportar función helper para invalidar caché cuando se modifican datos
export function invalidateCacheOnDataChange(dataType: 'risks' | 'controls' | 'audits' | 'documents' | 'events' | 'actions') {
  aiCache.invalidateByType(dataType);
}
