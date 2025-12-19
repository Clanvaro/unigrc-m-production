// Recolector de métricas de pool con estadísticas agregadas
// Almacena métricas en memoria para evitar queries pesadas

import { getPoolMetrics, PoolMetrics } from '../db';

export interface AggregatedPoolMetrics {
  timestamp: Date;
  current: PoolMetrics | null;
  stats: {
    avgActive: number;
    avgIdle: number;
    avgWaiting: number;
    p95Active: number;
    p99Active: number;
    maxActive: number;
    maxWaiting: number;
    utilizationPct: number;
  };
  slowQueries: SlowQuery[];
}

export interface SlowQuery {
  query: string;
  duration: number;
  timestamp: Date;
}

// Almacenar últimas 100 muestras en memoria
const METRICS_HISTORY: PoolMetrics[] = [];
const MAX_HISTORY_SIZE = 100;

// Almacenar últimas 50 slow queries
const SLOW_QUERIES: SlowQuery[] = [];
const MAX_SLOW_QUERIES = 50;
const SLOW_QUERY_THRESHOLD = 5000; // 5 segundos

// Recolectar métricas periódicamente (cada 30 segundos)
let metricsInterval: NodeJS.Timeout | null = null;

export function startPoolMetricsCollection() {
  if (metricsInterval) {
    return; // Ya está corriendo
  }

  // Recolectar métricas cada 30 segundos
  metricsInterval = setInterval(() => {
    const metrics = getPoolMetrics();
    if (metrics) {
      METRICS_HISTORY.push(metrics);
      
      // Mantener solo las últimas MAX_HISTORY_SIZE muestras
      if (METRICS_HISTORY.length > MAX_HISTORY_SIZE) {
        METRICS_HISTORY.shift();
      }
    }
  }, 30000); // 30 segundos

  console.log('✅ Pool metrics collection started (30s interval)');
}

export function stopPoolMetricsCollection() {
  if (metricsInterval) {
    clearInterval(metricsInterval);
    metricsInterval = null;
    console.log('🔄 Pool metrics collection stopped');
  }
}

// Registrar slow query (llamado desde db.ts)
export function recordSlowQuery(query: string, duration: number) {
  SLOW_QUERIES.push({
    query: query.substring(0, 500), // Limitar tamaño
    duration,
    timestamp: new Date()
  });

  // Mantener solo las últimas MAX_SLOW_QUERIES
  if (SLOW_QUERIES.length > MAX_SLOW_QUERIES) {
    SLOW_QUERIES.shift();
  }
}

// Calcular estadísticas agregadas
function calculateStats(): AggregatedPoolMetrics['stats'] {
  if (METRICS_HISTORY.length === 0) {
    return {
      avgActive: 0,
      avgIdle: 0,
      avgWaiting: 0,
      p95Active: 0,
      p99Active: 0,
      maxActive: 0,
      maxWaiting: 0,
      utilizationPct: 0
    };
  }

  const activeConnections = METRICS_HISTORY.map(m => m.totalCount - m.idleCount);
  const idleConnections = METRICS_HISTORY.map(m => m.idleCount);
  const waitingCounts = METRICS_HISTORY.map(m => m.waitingCount);
  const maxConnections = METRICS_HISTORY[0]?.maxConnections || 10;

  // Ordenar para calcular percentiles
  const sortedActive = [...activeConnections].sort((a, b) => a - b);
  
  const avgActive = activeConnections.reduce((a, b) => a + b, 0) / activeConnections.length;
  const avgIdle = idleConnections.reduce((a, b) => a + b, 0) / idleConnections.length;
  const avgWaiting = waitingCounts.reduce((a, b) => a + b, 0) / waitingCounts.length;
  
  const p95Index = Math.floor(sortedActive.length * 0.95);
  const p99Index = Math.floor(sortedActive.length * 0.99);
  
  const p95Active = sortedActive[p95Index] || 0;
  const p99Active = sortedActive[p99Index] || 0;
  const maxActive = Math.max(...activeConnections);
  const maxWaiting = Math.max(...waitingCounts);
  
  const utilizationPct = Math.round((maxActive / maxConnections) * 100);

  return {
    avgActive: Math.round(avgActive * 100) / 100,
    avgIdle: Math.round(avgIdle * 100) / 100,
    avgWaiting: Math.round(avgWaiting * 100) / 100,
    p95Active,
    p99Active,
    maxActive,
    maxWaiting,
    utilizationPct
  };
}

// Obtener métricas agregadas (sin queries pesadas, solo datos en memoria)
export function getAggregatedMetrics(): AggregatedPoolMetrics {
  const current = getPoolMetrics();
  const stats = calculateStats();
  
  // Obtener últimas 20 slow queries (más recientes)
  const recentSlowQueries = SLOW_QUERIES
    .slice(-20)
    .reverse(); // Más recientes primero

  return {
    timestamp: new Date(),
    current,
    stats,
    slowQueries: recentSlowQueries
  };
}

// Limpiar métricas antiguas (últimas 24 horas)
export function cleanupOldMetrics() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 horas

  // Limpiar slow queries antiguas
  const filteredSlowQueries = SLOW_QUERIES.filter(
    sq => now - sq.timestamp.getTime() < maxAge
  );
  SLOW_QUERIES.length = 0;
  SLOW_QUERIES.push(...filteredSlowQueries);
}

// Limpiar cada hora
setInterval(cleanupOldMetrics, 60 * 60 * 1000);
