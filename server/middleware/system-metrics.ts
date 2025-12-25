// System metrics tracking: OOM, restarts, concurrency, memory
import { performanceMonitor } from './performance';
import { getPoolMetrics } from '../db';

interface SystemMetrics {
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    usagePercent: number;
  };
  concurrency: {
    activeRequests: number;
    peakActiveRequests: number;
    requestsPerSecond: number;
    poolActive: number;
    poolIdle: number;
    poolWaiting: number;
    poolUtilization: number;
  };
  restarts: {
    count: number;
    lastRestart: Date | null;
    oomCount: number;
    lastOOM: Date | null;
    uptime: number;
  };
  process: {
    pid: number;
    uptime: number;
    startTime: Date;
  };
}

// Track active requests for concurrency metrics
let activeRequests = 0;
let peakActiveRequests = 0;
let requestStartTimes: Map<number, number> = new Map();
let requestCounter = 0;

// Track restarts and OOM
let restartCount = 0;
let oomCount = 0;
let lastRestart: Date | null = null;
let lastOOM: Date | null = null;
let processStartTime = Date.now();

// Initialize from environment or previous state
if (process.env.RESTART_COUNT) {
  restartCount = parseInt(process.env.RESTART_COUNT, 10) || 0;
}
if (process.env.OOM_COUNT) {
  oomCount = parseInt(process.env.OOM_COUNT, 10) || 0;
}

// Track OOM events
process.on('uncaughtException', (error: Error) => {
  if (error.message?.includes('heap') || error.message?.includes('memory') || error.message?.includes('allocation')) {
    oomCount++;
    lastOOM = new Date();
    console.error(`🚨 [OOM] Out of memory detected: ${error.message}`);
    console.error(`[OOM] Total OOM count: ${oomCount}`);
  }
});

// Track process exits (potential restarts)
process.on('exit', (code) => {
  if (code !== 0) {
    console.log(`⚠️ [RESTART] Process exiting with code ${code}`);
  }
});

// Track memory usage periodically
let memoryCheckInterval: NodeJS.Timeout | null = null;
let peakMemoryUsage = 0;

export function startSystemMetricsCollection() {
  if (memoryCheckInterval) {
    return; // Already started
  }

  // Check memory every 30 seconds
  // NOTE: With --max-old-space-size=1536, V8 can grow up to 1.5GB
  // heapTotal is the currently allocated heap, not the max available
  // So heapUsed/heapTotal will often be >90% which is normal and healthy
  const MAX_HEAP_MB = 1536; // Must match --max-old-space-size in Dockerfile
  
  memoryCheckInterval = setInterval(() => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    
    // Calculate usage against max available heap, not just allocated
    const usagePercent = (heapUsedMB / MAX_HEAP_MB) * 100;
    const allocatedPercent = (heapUsedMB / heapTotalMB) * 100;
    
    if (usagePercent > peakMemoryUsage) {
      peakMemoryUsage = usagePercent;
    }

    // Only warn if using >80% of max available heap (not allocated)
    // This prevents false positives when V8 hasn't expanded the heap yet
    if (usagePercent > 80) {
      console.warn(`⚠️ [MEMORY] High memory usage: ${usagePercent.toFixed(1)}% of max (${heapUsedMB.toFixed(1)}MB / ${MAX_HEAP_MB}MB)`);
    }
  }, 30000);

  console.log('✅ System metrics collection started');
}

export function stopSystemMetricsCollection() {
  if (memoryCheckInterval) {
    clearInterval(memoryCheckInterval);
    memoryCheckInterval = null;
  }
}

// OPTIMIZED: Track request start (synchronous, minimal overhead)
export function trackRequestStart(): number {
  const requestId = ++requestCounter;
  activeRequests++;
  // Only store timestamp if we need it (currently not used, but kept for future use)
  // requestStartTimes.set(requestId, Date.now());
  
  if (activeRequests > peakActiveRequests) {
    peakActiveRequests = activeRequests;
  }
  
  return requestId;
}

// OPTIMIZED: Track request end (synchronous, minimal overhead)
export function trackRequestEnd(requestId: number): void {
  activeRequests = Math.max(0, activeRequests - 1);
  // Cleanup timestamp if stored
  // requestStartTimes.delete(requestId);
}

// Get current concurrency metrics
function getConcurrencyMetrics() {
  const poolMetrics = getPoolMetrics();
  const requestsPerSecond = performanceMonitor.getRequestsPerMinute() / 60;
  
  return {
    activeRequests,
    peakActiveRequests,
    requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
    poolActive: poolMetrics ? poolMetrics.totalCount - poolMetrics.idleCount : 0,
    poolIdle: poolMetrics?.idleCount || 0,
    poolWaiting: poolMetrics?.waitingCount || 0,
    poolUtilization: poolMetrics 
      ? Math.round(((poolMetrics.totalCount - poolMetrics.idleCount) / poolMetrics.maxConnections) * 100)
      : 0
  };
}

// Get system metrics
export function getSystemMetrics(): SystemMetrics {
  const memUsage = process.memoryUsage();
  const usagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  const uptime = Math.floor((Date.now() - processStartTime) / 1000);

  return {
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024), // MB
      rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      usagePercent: Math.round(usagePercent * 100) / 100
    },
    concurrency: getConcurrencyMetrics(),
    restarts: {
      count: restartCount,
      lastRestart,
      oomCount,
      lastOOM,
      uptime
    },
    process: {
      pid: process.pid,
      uptime,
      startTime: new Date(processStartTime)
    }
  };
}

// Record restart (call this on startup if detecting a restart)
export function recordRestart() {
  restartCount++;
  lastRestart = new Date();
  processStartTime = Date.now();
  console.log(`🔄 [RESTART] Restart #${restartCount} recorded`);
}

// Record OOM
export function recordOOM() {
  oomCount++;
  lastOOM = new Date();
  console.error(`🚨 [OOM] Out of memory event #${oomCount} recorded`);
}

