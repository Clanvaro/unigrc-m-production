import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Allow server to start without DATABASE_URL for autoscale compatibility
// This prevents deployment timeouts when the database is unavailable
let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

// Database URL priority: RENDER_DATABASE_URL > POOLED_DATABASE_URL > DATABASE_URL
// RENDER_DATABASE_URL is for Render PostgreSQL hosting (always-on, no cold start)
// POOLED_DATABASE_URL is for Neon pooled connections (better scalability)
// DATABASE_URL is the fallback direct Neon connection
const databaseUrl = process.env.RENDER_DATABASE_URL || process.env.POOLED_DATABASE_URL || process.env.DATABASE_URL;

// Detect if using Render PostgreSQL (non-Neon)
const isRenderDb = databaseUrl?.includes('render.com') || databaseUrl?.includes('oregon-postgres.render.com') || false;

// Detect pooler based on actual connection string content (not env var name)
const isPooled = !isRenderDb && (databaseUrl?.includes('-pooler') || databaseUrl?.includes('pooler.') || false);

// Log which database is being used
if (isRenderDb) {
  console.log(`[DB Config] Using: Render PostgreSQL, host: ${databaseUrl?.split('@')[1]?.split('/')[0] || 'unknown'}`);
} else {
  console.log(`[DB Config] Using: ${isPooled ? 'Neon Pooled connection' : 'Neon Direct connection'}, host: ${databaseUrl?.split('@')[1]?.split('/')[0] || 'unknown'}`);
}
if (process.env.POOLED_DATABASE_URL && process.env.DATABASE_URL && !isRenderDb) {
  const pooledHost = process.env.POOLED_DATABASE_URL.split('@')[1]?.split('-pooler')[0];
  const directHost = process.env.DATABASE_URL.split('@')[1]?.split('.')[0];
  if (pooledHost !== directHost) {
    console.warn(`⚠️ WARNING: DATABASE_URL and POOLED_DATABASE_URL appear to point to different Neon databases!`);
    console.warn(`   DATABASE_URL host: ${directHost}`);
    console.warn(`   POOLED_DATABASE_URL host: ${pooledHost}`);
  }
}

if (databaseUrl) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Render PostgreSQL has always-on connections, no Scale to Zero delays
  // Neon production needs longer timeouts when Scale to Zero is enabled (can take 30-60s to wake)
  const connectionTimeout = isRenderDb ? 15000 : (isProduction ? 60000 : 15000);
  const statementTimeout = isRenderDb ? 30000 : (isProduction ? 60000 : 15000);
  
  // Render PostgreSQL requires SSL with sslmode=require in connection string
  // The connection string already includes sslmode=require, so we just need to enable SSL
  const sslConfig = isRenderDb 
    ? { rejectUnauthorized: false }  // Render requires SSL
    : (isProduction ? { rejectUnauthorized: false } : false);
  
  pool = new Pool({ 
    connectionString: databaseUrl,
    max: isRenderDb ? 12 : (isPooled ? 10 : 6),  // Render supports more connections (12 for headroom)
    min: isRenderDb ? 3 : 1,  // Keep 3 warm connections for Render to reduce acquisition latency
    idleTimeoutMillis: isRenderDb ? 120000 : 30000,  // Render: 2 min idle before releasing (stable connections)
    connectionTimeoutMillis: connectionTimeout,
    statement_timeout: statementTimeout,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    ssl: sslConfig,
    allowExitOnIdle: false,
  });
  db = drizzle(pool, { schema, logger: true });
  
  const poolMax = isRenderDb ? 12 : (isPooled ? 10 : 6);
  const poolMin = isRenderDb ? 3 : 1;
  console.log(`📊 Database config: pool=${poolMin}-${poolMax}, connectionTimeout=${connectionTimeout}ms, statementTimeout=${statementTimeout}ms, idleTimeout=${isRenderDb ? 120000 : 30000}ms, env=${isProduction ? 'production' : 'development'}`);
  
  if (isRenderDb) {
    console.log('✅ Using Render PostgreSQL - always-on database with no cold start delays');
  } else if (isPooled) {
    console.log('✅ Using Neon connection pooler (PgBouncer) - up to 10,000 concurrent connections supported');
  } else {
    console.log('⚠️ Using direct database connection - consider setting POOLED_DATABASE_URL for better scalability');
  }
}

export { pool, db };

// Startup migration guard to ensure scopeEntities column exists
async function initializeDatabase() {
  if (!pool) {
    console.log('⚠️ Skipping database initialization - no DATABASE_URL configured');
    return;
  }
  
  try {
    // Add scope_entities column if it doesn't exist - safe and idempotent
    await pool.query(`
      ALTER TABLE audits 
      ADD COLUMN IF NOT EXISTS scope_entities text[] DEFAULT '{}'::text[]
    `);
    console.log('✅ Database initialization complete - scope_entities column ready');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
}

// Connection error handling
if (pool) {
  pool.on('error', (err: any) => {
    // Neon automatically closes idle connections - this is expected behavior
    if (err.code === '57P01') {
      console.log('🔄 Database connection recycled by server (normal for Neon)');
      return;
    }
    console.error('❌ Database pool error:', err);
  });

  pool.on('connect', () => {
    console.log('✅ New database connection established');
  });

  // Log slow queries for debugging (Nov 23, 2025)
  const originalQuery = pool.query.bind(pool);
  (pool as any).query = function(queryText: any, values?: any, callback?: any): any {
    const startTime = Date.now();
    
    // Handle callback-based queries
    if (callback) {
      return originalQuery(queryText, values, (err: any, result: any) => {
        const duration = Date.now() - startTime;
        if (duration > 10000) {
          const queryStr = typeof queryText === 'string' ? queryText : queryText?.text || '';
          console.warn(`⚠️ Slow query detected (${duration}ms):`, queryStr.substring(0, 200));
        }
        callback(err, result);
      });
    }
    
    // Handle promise-based queries
    const result = originalQuery(queryText, values);
    if (result && typeof (result as any).then === 'function') {
      return (result as Promise<any>).then((res) => {
        const duration = Date.now() - startTime;
        if (duration > 10000) {
          const queryStr = typeof queryText === 'string' ? queryText : queryText?.text || '';
          console.warn(`⚠️ Slow query detected (${duration}ms):`, queryStr.substring(0, 200));
        }
        return res;
      });
    }
    
    return result;
  };
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  stopPoolMonitoring();
  if (pool) {
    console.log('🔄 Gracefully closing database connections...');
    await pool.end();
    console.log('✅ Database connections closed');
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  stopPoolMonitoring();
  if (pool) {
    console.log('🔄 Gracefully closing database connections...');
    await pool.end();
    console.log('✅ Database connections closed');
  }
  process.exit(0);
});

// Database operation wrapper with retry logic for Neon Launch plan (updated Nov 26, 2025)
// Launch plan has faster autoscaling with shorter cold starts, but still needs tolerance for resume delays
const RETRY_DELAYS = [300, 800, 2000]; // ms - optimized for Launch plan (faster cold starts, ~3s total retry window)

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  if (!db || !pool) {
    throw new Error('Database not configured - cannot perform operation');
  }
  
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a recoverable connection/network error
      const isRecoverable = 
        // PostgreSQL error codes
        error.code === '57P01' || // admin shutdown
        error.code === '08006' || // connection failure
        error.code === '08001' || // unable to connect
        error.code === '08004' || // connection rejected
        error.code === '53300' || // too many connections
        // Node.js network error codes (critical for Neon serverless)
        error.code === 'ENETUNREACH' || // Network unreachable - common with Neon cold starts
        error.code === 'ECONNRESET' ||  // Connection reset by peer
        error.code === 'ETIMEDOUT' ||   // Connection timed out
        error.code === 'ECONNREFUSED' || // Connection refused
        error.code === 'EPIPE' ||       // Broken pipe
        error.code === 'EHOSTUNREACH' || // Host unreachable
        // Message-based detection for edge cases
        error.message?.includes('connection') ||
        error.message?.includes('timeout') ||
        error.message?.includes('Connection terminated') ||
        error.message?.includes('ENETUNREACH') ||
        error.message?.includes('socket hang up');
      
      if (!isRecoverable || attempt === maxRetries) {
        console.error(`❌ Database operation failed (attempt ${attempt}/${maxRetries}):`, error.code || 'NO_CODE', error.message);
        throw error;
      }
      
      // Use fixed delay array: 200ms, 500ms, 1000ms
      const delay = RETRY_DELAYS[attempt - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      
      console.warn(`⚠️ Database retry (${attempt}/${maxRetries}) after ${delay}ms - ${error.code || 'ERROR'}: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  if (!pool) {
    return false;
  }
  
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    return false;
  }
}

// Transaction wrapper for complex operations
export async function withTransaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  if (!pool) {
    throw new Error('Database not configured - cannot perform transaction');
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Transaction rolled back due to error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Drizzle transaction wrapper
export async function withDrizzleTransaction<T>(
  callback: (tx: any) => Promise<T>
): Promise<T> {
  if (!db) {
    throw new Error('Database not configured - cannot perform transaction');
  }
  
  return db.transaction(async (tx) => {
    try {
      return await callback(tx);
    } catch (error) {
      console.error('❌ Drizzle transaction rolled back:', error);
      throw error;
    }
  });
}

// Pool monitoring and observability (Phase 1 - Nov 23, 2025)
let poolMonitoringInterval: NodeJS.Timeout | null = null;

export interface PoolMetrics {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
  maxConnections: number;
  timestamp: Date;
}

export function getPoolMetrics(): PoolMetrics | null {
  if (!pool) {
    return null;
  }

  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    maxConnections: (pool as any).options?.max || 10,
    timestamp: new Date(),
  };
}

// Diagnostic function to measure actual network latency to Neon
export async function measureDatabaseLatency(): Promise<{
  connect: number;      // Time to acquire connection from pool
  query: number;        // Time to execute simple query
  roundTrip: number;    // Total round-trip time
  poolBefore: PoolMetrics | null;
  poolAfter: PoolMetrics | null;
  error?: string;
}> {
  const poolBefore = getPoolMetrics();
  const totalStart = Date.now();
  
  if (!pool) {
    return {
      connect: 0,
      query: 0,
      roundTrip: 0,
      poolBefore: null,
      poolAfter: null,
      error: 'Pool not available'
    };
  }

  let client: any = null;
  let connectTime = 0;
  let queryTime = 0;

  try {
    // Measure connection acquisition time
    const connectStart = Date.now();
    client = await pool.connect();
    connectTime = Date.now() - connectStart;

    // Measure query execution time (simple ping)
    const queryStart = Date.now();
    await client.query('SELECT 1');
    queryTime = Date.now() - queryStart;

    const roundTrip = Date.now() - totalStart;
    const poolAfter = getPoolMetrics();

    // Log if latency is unexpectedly high
    if (roundTrip > 500) {
      console.warn(`[DB LATENCY] SLOW: connect=${connectTime}ms, query=${queryTime}ms, total=${roundTrip}ms`);
    }

    return {
      connect: connectTime,
      query: queryTime,
      roundTrip,
      poolBefore,
      poolAfter
    };
  } catch (error) {
    console.error('[DB LATENCY] Error measuring latency:', error);
    return {
      connect: connectTime,
      query: 0,
      roundTrip: Date.now() - totalStart,
      poolBefore,
      poolAfter: getPoolMetrics(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  } finally {
    if (client) {
      try {
        client.release();
      } catch (e) {
        // Ignore release errors
      }
    }
  }
}

function startPoolMonitoring() {
  if (!pool || poolMonitoringInterval) {
    return;
  }

  // Log pool metrics every minute
  poolMonitoringInterval = setInterval(() => {
    const metrics = getPoolMetrics();
    if (!metrics) return;

    const utilizationPct = Math.round((metrics.totalCount / metrics.maxConnections) * 100);
    const activeConnections = metrics.totalCount - metrics.idleCount;
    const activeUtilizationPct = Math.round((activeConnections / metrics.maxConnections) * 100);
    
    console.log(
      `📊 Pool Metrics: total=${metrics.totalCount}/${metrics.maxConnections} (${utilizationPct}%), ` +
      `idle=${metrics.idleCount}, active=${activeConnections}, waiting=${metrics.waitingCount}`
    );

    // Alert only on high ACTIVE connection saturation (not idle connections)
    // Idle connections are harmless - they're ready to serve new requests
    // Adjusted thresholds for 1 CPU VM (lower pool size)
    if (activeUtilizationPct >= 75) {
      console.warn(
        `⚠️ HIGH POOL SATURATION: ${activeUtilizationPct}% active (${activeConnections}/${metrics.maxConnections}) - ` +
        `Consider scaling or investigating slow queries`
      );
    }

    // Alert on queued connections (this indicates real saturation)
    // Reduced threshold for smaller pool size
    if (metrics.waitingCount > 3) {
      console.warn(
        `⚠️ CONNECTION QUEUE BUILD-UP: ${metrics.waitingCount} queries waiting - ` +
        `Pool may be saturated, check for slow queries or increase max connections`
      );
    }
  }, 60000); // Every 60 seconds

  console.log('✅ Pool monitoring started - metrics logged every 60 seconds');
}

function stopPoolMonitoring() {
  if (poolMonitoringInterval) {
    clearInterval(poolMonitoringInterval);
    poolMonitoringInterval = null;
    console.log('🔄 Pool monitoring stopped');
  }
}

// Start monitoring if pool exists
if (pool) {
  startPoolMonitoring();
}

// Pool warming - pre-create connections to avoid cold start latency
let poolWarmingInterval: NodeJS.Timeout | null = null;

export async function warmPool(minConnections: number = 1): Promise<{ success: boolean; connections: number; duration: number }> {
  if (!pool) {
    return { success: false, connections: 0, duration: 0 };
  }

  const startTime = Date.now();
  const clients: any[] = [];
  let successCount = 0;
  
  try {
    // Request multiple connections to warm up the pool
    // Each connection is handled independently with its own try-finally
    const connectionPromises = Array(minConnections).fill(null).map(async (_, index) => {
      let client: any = null;
      try {
        client = await pool!.connect();
        // Push immediately after acquisition to ensure cleanup on partial failures
        clients.push(client);
        await client.query('SELECT 1'); // Simple query to ensure connection is ready
        successCount++;
        return true;
      } catch (error) {
        console.warn(`⚠️ Pool warming connection ${index + 1} failed:`, error);
        // If client was acquired, it's already in the clients array for cleanup
        return false;
      }
    });
    
    await Promise.allSettled(connectionPromises);
    
    const duration = Date.now() - startTime;
    
    if (successCount > 0) {
      console.log(`🔥 Pool warmed: ${successCount}/${minConnections} connections ready in ${duration}ms`);
    }
    
    return { success: successCount > 0, connections: successCount, duration };
  } catch (error) {
    console.error('❌ Pool warming failed:', error);
    return { success: false, connections: 0, duration: Date.now() - startTime };
  } finally {
    // Always release all acquired connections back to the pool
    for (const client of clients) {
      try {
        client.release();
      } catch (e) {
        // Ignore release errors - connection may already be closed
      }
    }
  }
}

// Check if current time is within quiet hours (00:00 - 07:00 Chile time)
// During quiet hours, pool warming is paused to save resources
function isQuietHours(): boolean {
  const now = new Date();
  const chileTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Santiago' }));
  const hour = chileTime.getHours();
  return hour >= 0 && hour < 7;
}

// Track if we were in quiet hours to detect transitions
let wasInQuietHours = false;

// Keep pool warm with periodic pings (every 20 seconds to prevent Neon Scale to Zero)
// Neon suspends after ~5 minutes of inactivity, causing 30-60s cold start delays
// Paused between 00:00-07:00 Chile time to save resources
function startPoolWarming() {
  if (!pool || poolWarmingInterval) return;

  const PING_INTERVAL = 20000; // 20 seconds - aggressive to prevent Neon sleep
  
  poolWarmingInterval = setInterval(async () => {
    try {
      const currentlyQuiet = isQuietHours();
      
      // Detect transition from quiet hours to active hours (7:00 AM)
      if (wasInQuietHours && !currentlyQuiet) {
        console.log('🌅 Quiet hours ended - pool warming');
        await warmPool(2); // Warm-up after quiet period (reduced for 1 CPU VM)
        wasInQuietHours = false;
        return;
      }
      
      wasInQuietHours = currentlyQuiet;
      
      // Skip pings during quiet hours (00:00-07:00 Chile time)
      if (currentlyQuiet) {
        return;
      }
      
      const metrics = getPoolMetrics();
      // Only warm if pool is below minimum (reduced for 1 CPU VM)
      if (metrics && metrics.totalCount < 2) {
        await warmPool(2);
      } else {
        // Lightweight ping to keep Neon database awake
        const pingStart = Date.now();
        await pool!.query('SELECT 1');
        const pingDuration = Date.now() - pingStart;
        // Log if ping takes too long (indicates Neon was waking up)
        if (pingDuration > 1000) {
          console.warn(`⚠️ Slow DB ping: ${pingDuration}ms - Neon may have been sleeping`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Pool keep-alive ping failed:', error);
    }
  }, PING_INTERVAL);

  console.log(`✅ Pool warming started - pinging every ${PING_INTERVAL/1000}s (paused 00:00-07:00 Chile time)`);
}

function stopPoolWarming() {
  if (poolWarmingInterval) {
    clearInterval(poolWarmingInterval);
    poolWarmingInterval = null;
    console.log('🔄 Pool warming stopped');
  }
}

// Health check with detailed metrics
export async function getHealthStatus(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  database: boolean;
  poolMetrics: PoolMetrics | null;
  uptime: number;
  timestamp: string;
}> {
  const dbHealthy = await checkDatabaseHealth();
  const poolMetrics = getPoolMetrics();
  const uptime = process.uptime();
  
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (!dbHealthy) {
    status = 'unhealthy';
  } else if (poolMetrics && poolMetrics.waitingCount > 3) {
    status = 'degraded';
  }
  
  return {
    status,
    database: dbHealthy,
    poolMetrics,
    uptime,
    timestamp: new Date().toISOString()
  };
}

// Start pool warming if pool exists
if (pool) {
  // Initial warm on startup (after a short delay to let server initialize)
  // Skip initial warming during quiet hours (00:00-07:00 Chile time)
  setTimeout(() => {
    if (isQuietHours()) {
      console.log('🌙 Quiet hours (00:00-07:00 Chile time) - skipping initial pool warming');
      startPoolWarming(); // Start the interval anyway, it will skip pings during quiet hours
    } else {
      warmPool(2).then(() => { // Reduced from 5 to 2 for 1 CPU VM
        startPoolWarming();
      });
    }
  }, 2000);
}

// Cleanup on shutdown
process.on('SIGTERM', () => {
  stopPoolWarming();
});

process.on('SIGINT', () => {
  stopPoolWarming();
});

// Initialize database on startup
initializeDatabase();
