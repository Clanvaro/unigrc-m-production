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
// Improved detection: Check for 'render.com' in hostname OR specific Render env vars
const isRenderDb =
  databaseUrl?.includes('render.com') ||
  databaseUrl?.includes('oregon-postgres.render.com') ||
  process.env.RENDER === 'true' || // Generic Render environment flag
  false;

// Detect if using Google Cloud SQL
const isCloudSql = 
  process.env.IS_GCP_DEPLOYMENT === 'true' ||
  databaseUrl?.includes('.googleapis.com') ||
  databaseUrl?.includes('cloudsql') ||
  false;

// Detect pooler based on actual connection string content (not env var name)
const isPooled = !isRenderDb && !isCloudSql && (databaseUrl?.includes('-pooler') || databaseUrl?.includes('pooler.') || false);

// Log which database is being used
if (isRenderDb) {
  console.log(`[DB Config] Using: Render PostgreSQL (Detected via ${process.env.RENDER === 'true' ? 'Env Var' : 'URL'}), host: ${databaseUrl?.split('@')[1]?.split('/')[0] || 'unknown'}`);
} else if (isCloudSql) {
  console.log(`[DB Config] Using: Google Cloud SQL, host: ${databaseUrl?.split('@')[1]?.split('/')[0] || 'unknown'}`);
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

  // Ensure Cloud SQL connection string has sslmode=require
  // Cloud SQL with public IP requires SSL but should not require client certificates
  let normalizedDatabaseUrl = databaseUrl;
  if (isCloudSql && !databaseUrl.includes('sslmode=')) {
    normalizedDatabaseUrl = databaseUrl.includes('?')
      ? `${databaseUrl}&sslmode=require`
      : `${databaseUrl}?sslmode=require`;
    console.log('[DB Config] Added sslmode=require to Cloud SQL connection string');
  }

  // Render PostgreSQL has always-on connections but may have SSL handshake latency
  // Increase timeout to handle occasional slow SSL negotiations
  const connectionTimeout = isRenderDb ? 30000 : (isProduction ? 60000 : 15000);
  // CRITICAL: Reduced from 45s to 10s to fail fast on slow queries (Nov 29, 2025)
  // This prevents 138s hangs when N+1 queries saturate the pool
  const statementTimeout = isRenderDb ? 10000 : (isProduction ? 15000 : 10000);

  // Render PostgreSQL requires SSL with sslmode=require in connection string
  // The connection string already includes sslmode=require, so we just need to enable SSL
  // Cloud SQL requires SSL but may not require client certificates if configured properly
  // For Cloud SQL with public IP, use sslmode=require (not verify-full) to avoid client cert requirement
  const sslConfig = isRenderDb
    ? { rejectUnauthorized: false }  // Render requires SSL
    : isCloudSql
    ? { rejectUnauthorized: false }  // Cloud SQL requires SSL but may not need client certs
    : (isProduction ? { rejectUnauthorized: false } : false);

  // Optimized pool settings for Render PostgreSQL Basic-1gb (1 GB RAM, 0.5 CPU)
  // - Higher max connections to leverage upgraded DB capacity
  // - Min connections for warm pool readiness
  // - Shorter idle timeout to recycle connections before Render closes them
  // - Aggressive keep-alive to maintain connection health
  pool = new Pool({
    connectionString: normalizedDatabaseUrl,
    max: isRenderDb ? 20 : (isPooled ? 10 : 6),  // Increased to 20 for Render Basic-1gb (can handle ~50-100)
    min: isRenderDb ? 5 : 2,  // Keep 5 warm connections for faster response
    idleTimeoutMillis: isRenderDb ? 60000 : 30000,  // Render: 1 min idle (recycle before server closes)
    connectionTimeoutMillis: connectionTimeout,
    statement_timeout: statementTimeout,
    keepAlive: true,
    keepAliveInitialDelayMillis: 5000,  // Start keep-alive sooner (was 10000)
    ssl: sslConfig,
    allowExitOnIdle: false,
  });
  db = drizzle(pool, { schema, logger: true });

  const poolMax = isRenderDb ? 20 : (isPooled ? 10 : 6);
  const poolMin = isRenderDb ? 5 : 2;
  console.log(`📊 Database config: pool=${poolMin}-${poolMax}, connectionTimeout=${connectionTimeout}ms, statementTimeout=${statementTimeout}ms, idleTimeout=${isRenderDb ? 60000 : 30000}ms, env=${isProduction ? 'production' : 'development'}`);

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
  // Updated Nov 29, 2025: Reduced threshold to 5s and added more detail
  const originalQuery = pool.query.bind(pool);
  (pool as any).query = function (queryText: any, values?: any, callback?: any): any {
    const startTime = Date.now();
    const SLOW_QUERY_THRESHOLD = 5000; // 5 seconds

    const logSlowQuery = (duration: number) => {
      if (duration > SLOW_QUERY_THRESHOLD) {
        const queryStr = typeof queryText === 'string' ? queryText : queryText?.text || '';
        const truncatedQuery = queryStr.substring(0, 300);
        const metrics = getPoolMetrics();
        console.warn(`⚠️ SLOW QUERY (${duration}ms): ${truncatedQuery}`);
        if (metrics) {
          console.warn(`   Pool: active=${metrics.totalCount - metrics.idleCount}/${metrics.maxConnections}, waiting=${metrics.waitingCount}`);
        }
      }
    };

    // Handle callback-based queries
    if (callback) {
      return originalQuery(queryText, values, (err: any, result: any) => {
        logSlowQuery(Date.now() - startTime);
        callback(err, result);
      });
    }

    // Handle promise-based queries
    const result = originalQuery(queryText, values);
    if (result && typeof (result as any).then === 'function') {
      return (result as Promise<any>).then((res) => {
        logSlowQuery(Date.now() - startTime);
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

// Database operation wrapper with retry logic
// Optimized for Render PostgreSQL (fast always-on) and Neon (serverless with cold starts)
// Render: Faster retries since DB is always-on, just need to handle transient network issues
// Neon: Longer delays to handle Scale to Zero wake-up time
const RETRY_DELAYS_RENDER = [200, 500, 1000, 2000]; // ~4s total window for Render
const RETRY_DELAYS_NEON = [300, 800, 2000, 5000];   // ~8s total window for Neon cold starts

// Detect database type once at module load
const isRenderDatabase = process.env.RENDER_DATABASE_URL?.includes('render.com') || false;
const RETRY_DELAYS = isRenderDatabase ? RETRY_DELAYS_RENDER : RETRY_DELAYS_NEON;

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 4  // Increased from 3 to 4 for better resilience
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
        error.code === '57014' || // query canceled (timeout)
        // Node.js network error codes
        error.code === 'ENETUNREACH' || // Network unreachable
        error.code === 'ECONNRESET' ||  // Connection reset by peer
        error.code === 'ETIMEDOUT' ||   // Connection timed out
        error.code === 'ECONNREFUSED' || // Connection refused
        error.code === 'EPIPE' ||       // Broken pipe
        error.code === 'EHOSTUNREACH' || // Host unreachable
        error.code === 'EAI_AGAIN' ||   // DNS temporary failure
        error.code === 'ENOTFOUND' ||   // DNS lookup failed
        // Message-based detection for edge cases
        error.message?.includes('connection') ||
        error.message?.includes('timeout') ||
        error.message?.includes('Connection terminated') ||
        error.message?.includes('ENETUNREACH') ||
        error.message?.includes('socket hang up') ||
        error.message?.includes('SSL') ||
        error.message?.includes('ECONNRESET');

      if (!isRecoverable || attempt === maxRetries) {
        console.error(`❌ Database operation failed (attempt ${attempt}/${maxRetries}):`, error.code || 'NO_CODE', error.message);
        throw error;
      }

      // Use delay from array based on attempt number
      const delay = RETRY_DELAYS[attempt - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];

      console.warn(`⚠️ Database retry (${attempt}/${maxRetries}) after ${delay}ms - ${error.code || 'ERROR'}: ${error.message?.substring(0, 100)}`);

      // On connection errors, try to warm the pool before retry
      if (attempt === 2 && (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET')) {
        console.log('🔄 Warming pool before retry...');
        try {
          await warmPool(2);
        } catch (warmError) {
          // Ignore warming errors, proceed with retry
        }
      }

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
let lastWarmLogTime = 0; // Track last time we logged warming (reduce log noise)
const WARM_LOG_COOLDOWN = 300000; // Only log warming every 5 minutes

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

    // Only log warming success every 5 minutes to reduce noise
    const now = Date.now();
    if (successCount > 0 && (now - lastWarmLogTime > WARM_LOG_COOLDOWN || lastWarmLogTime === 0)) {
      console.log(`🔥 Pool warmed: ${successCount}/${minConnections} connections ready in ${duration}ms`);
      lastWarmLogTime = now;
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

// Keep pool warm with periodic pings
// For Render PostgreSQL: Prevent connection timeout by server
// For Neon: Prevent Scale to Zero (suspends after ~5 minutes)
// Paused between 00:00-07:00 Chile time to save resources
function startPoolWarming() {
  if (!pool || poolWarmingInterval) return;

  // Detect database type for appropriate ping interval
  const isRender = process.env.RENDER_DATABASE_URL?.includes('render.com') || false;
  const PING_INTERVAL = isRender ? 15000 : 20000; // 15s for Render, 20s for Neon

  poolWarmingInterval = setInterval(async () => {
    try {
      const currentlyQuiet = isQuietHours();

      // Detect transition from quiet hours to active hours (7:00 AM)
      if (wasInQuietHours && !currentlyQuiet) {
        console.log('🌅 Quiet hours ended - aggressive pool warming');
        const warmCount = isRender ? 5 : 2;
        await warmPool(warmCount);
        wasInQuietHours = false;
        return;
      }

      wasInQuietHours = currentlyQuiet;

      // Skip pings during quiet hours (00:00-07:00 Chile time)
      if (currentlyQuiet) {
        return;
      }

      const metrics = getPoolMetrics();
      // Match pool min config: Render=2, others=2 (don't over-warm as Render closes idle connections)
      const minWarm = 2;

      // Warm more aggressively if pool is below minimum
      // Only log if pool is empty (reduce log noise from normal connection recycling)
      if (metrics && metrics.totalCount < minWarm) {
        if (metrics.totalCount === 0) {
          console.log(`🔄 Pool empty, warming to ${minWarm} connections...`);
        }
        await warmPool(minWarm);
      } else {
        // Lightweight ping to keep connections active and detect stale connections
        const pingStart = Date.now();
        await pool!.query('SELECT 1');
        const pingDuration = Date.now() - pingStart;

        // Log slow pings (indicates connection issues)
        if (pingDuration > 500) {
          console.warn(`⚠️ Slow DB ping: ${pingDuration}ms - possible connection issue`);
          // If ping is very slow, proactively warm the pool
          if (pingDuration > 2000) {
            console.log('🔄 Very slow ping detected, warming pool...');
            await warmPool(3);
          }
        }
      }
    } catch (error: any) {
      console.warn('⚠️ Pool keep-alive ping failed:', error?.message || error);
      // On ping failure, try to warm the pool
      try {
        console.log('🔄 Recovering pool after ping failure...');
        await warmPool(3);
      } catch (warmError) {
        console.error('❌ Pool warming failed during recovery:', warmError);
      }
    }
  }, PING_INTERVAL);

  console.log(`✅ Pool warming started - pinging every ${PING_INTERVAL / 1000}s (paused 00:00-07:00 Chile time)`);
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
  setTimeout(async () => {
    if (isQuietHours()) {
      console.log('🌙 Quiet hours (00:00-07:00 Chile time) - skipping initial pool warming');
      startPoolWarming(); // Start the interval anyway, it will skip pings during quiet hours
    } else {
      // Pool warming for Render PostgreSQL
      // Pre-establish connections respecting pool max to avoid SSL handshake latency during requests
      const isRender = process.env.RENDER_DATABASE_URL?.includes('render.com') || 
                       process.env.DATABASE_URL?.includes('render.com') || false;
      // Match actual pool config: max=20, min=5 for Render
      const poolMax = isRender ? 20 : 6;
      // Warm up to min connections (5 for Render) to ensure fast initial requests
      const warmCount = Math.min(isRender ? 8 : 3, poolMax);
      console.log(`🔥 Starting aggressive pool warming (${warmCount} of ${poolMax} connections)...`);
      await warmPool(warmCount);
      startPoolWarming();
    }
  }, 500); // Start even sooner for faster cold start
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
