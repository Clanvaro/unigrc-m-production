import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Allow server to start without DATABASE_URL for autoscale compatibility
// This prevents deployment timeouts when the database is unavailable
let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

// Database URL priority: PGBOUNCER_URL > RENDER_DATABASE_URL > POOLED_DATABASE_URL > DATABASE_URL
// PGBOUNCER_URL is for PgBouncer connection pooler (recommended for Cloud Run + Cloud SQL)
// IMPORTANT: PgBouncer provides connection pooling and significantly improves performance
// PgBouncer should use Unix socket format: postgresql://user:pass@/db?host=/cloudsql/...
// RENDER_DATABASE_URL is for Render PostgreSQL hosting (always-on, no cold start)
// POOLED_DATABASE_URL is for Neon pooled connections (better scalability)
// DATABASE_URL is the fallback direct Neon connection
const pgbouncerUrl = process.env.PGBOUNCER_URL;
const databaseUrl = pgbouncerUrl || process.env.RENDER_DATABASE_URL || process.env.POOLED_DATABASE_URL || process.env.DATABASE_URL;

// Detect if using Render PostgreSQL (non-Neon)
// Improved detection: Check for 'render.com' in hostname OR specific Render env vars
const isRenderDb =
  databaseUrl?.includes('render.com') ||
  databaseUrl?.includes('oregon-postgres.render.com') ||
  process.env.RENDER === 'true' || // Generic Render environment flag
  false;

// Detect if using Google Cloud SQL
// Check for: IS_GCP_DEPLOYMENT flag, .googleapis.com, cloudsql, or private IP (10.x.x.x) when IS_GCP_DEPLOYMENT is true
const isCloudSql =
  process.env.IS_GCP_DEPLOYMENT === 'true' ||
  databaseUrl?.includes('.googleapis.com') ||
  databaseUrl?.includes('cloudsql') ||
  (process.env.IS_GCP_DEPLOYMENT === 'true' && /@10\.\d+\.\d+\.\d+/.test(databaseUrl || '')) ||
  false;

// Detect if using Cloud SQL Proxy (Unix socket connection)
// Cloud SQL Proxy uses format: postgresql://user:pass@/db?host=/cloudsql/...
const isCloudSqlProxy = databaseUrl?.includes('/cloudsql/') || false;

// Detect if using PgBouncer (dedicated connection pooler)
const isUsingPgBouncer = !!pgbouncerUrl;

// Detect pooler based on actual connection string content (not env var name)
const isPooled = !isRenderDb && !isCloudSql && (databaseUrl?.includes('-pooler') || databaseUrl?.includes('pooler.') || false);

// Log which database is being used
if (isUsingPgBouncer) {
  // Detect PgBouncer host - handle both Unix socket and IP formats
  let pgbouncerHost = 'unknown';
  if (pgbouncerUrl?.includes('/cloudsql/')) {
    // Unix socket format: postgresql://user:pass@/db?host=/cloudsql/...
    const match = pgbouncerUrl.match(/host=([^&]+)/);
    pgbouncerHost = match ? match[1] : 'Unix socket (/cloudsql/)';
  } else {
    // IP format: postgresql://user:pass@host:port/db
    pgbouncerHost = pgbouncerUrl?.split('@')[1]?.split('/')[0]?.split(':')[0] || 'unknown';
  }
  console.log(`[DB Config] Using: PgBouncer connection pooler at ${pgbouncerHost}`);
  console.log(`[DB Config] PgBouncer mode: Cloud Run will use more client connections (poolMax=10) since PgBouncer handles real pooling`);
} else if (isRenderDb) {
  console.log(`[DB Config] Using: Render PostgreSQL (Detected via ${process.env.RENDER === 'true' ? 'Env Var' : 'URL'}), host: ${databaseUrl?.split('@')[1]?.split('/')[0] || 'unknown'}`);
} else if (isCloudSql) {
  const host = databaseUrl?.split('@')[1]?.split('/')[0]?.split(':')[0] || 'unknown';
  const isPrivateIP = /^10\.|^172\.(1[6-9]|2[0-9]|3[01])\.|^192\.168\./.test(host);
  const connectionType = isCloudSqlProxy
    ? 'Unix socket (Cloud SQL Proxy)'
    : isPrivateIP
      ? 'IP privada (VPC)'
      : 'IP pública';
  console.log(`[DB Config] Using: Google Cloud SQL via ${connectionType}, host: ${host}`);
  if (!isCloudSqlProxy && !isPrivateIP) {
    console.warn(`⚠️ WARNING: Using Cloud SQL with public IP - consider switching to Unix socket or Private IP for better performance (<10ms vs 100-1000ms latency)`);
  }
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

  // Normalize Cloud SQL connection string
  // Cloud SQL Proxy (Unix socket) doesn't need SSL
  // Cloud SQL with public IP requires SSL but should not require client certificates
  let normalizedDatabaseUrl = databaseUrl;
  if (isCloudSqlProxy) {
    // Remove sslmode if present (Cloud SQL Proxy doesn't need SSL)
    normalizedDatabaseUrl = normalizedDatabaseUrl.replace(/[&?]sslmode=[^&]*/g, '');
    console.log('[DB Config] Using Cloud SQL Proxy - SSL not required');
  } else if (isCloudSql && databaseUrl.includes('sslmode=disable')) {
    // If sslmode=disable, ensure SSL is disabled in config
    console.log('[DB Config] Cloud SQL with sslmode=disable - SSL will be disabled');
  } else if (isCloudSql && !databaseUrl.includes('sslmode=')) {
    // For Cloud SQL with public IP, use sslmode=require since Cloud SQL now requires SSL
    normalizedDatabaseUrl = databaseUrl.includes('?')
      ? `${databaseUrl}&sslmode=require`
      : `${databaseUrl}?sslmode=require`;
    console.log('[DB Config] Added sslmode=require to Cloud SQL connection string (SSL required)');
  } else if (isCloudSql && databaseUrl.includes('sslmode=require')) {
    // If sslmode=require is already set, keep it but ensure rejectUnauthorized: false in sslConfig
    // The sslConfig will handle certificate verification, not the connection string
    console.log('[DB Config] Cloud SQL with sslmode=require - SSL config will disable certificate verification');
  } else if (isCloudSql && databaseUrl.includes('sslmode=prefer')) {
    // Upgrade prefer to require since Cloud SQL now requires SSL
    normalizedDatabaseUrl = normalizedDatabaseUrl.replace('sslmode=prefer', 'sslmode=require');
    console.log('[DB Config] Upgraded sslmode=prefer to sslmode=require (SSL required)');
  }

  // Render PostgreSQL has always-on connections but may have SSL handshake latency
  // Increase timeout to handle occasional slow SSL negotiations
  // Cloud SQL Proxy (Unix socket) is much faster, so lower timeout is acceptable
  const connectionTimeout = isRenderDb
    ? 30000
    : isCloudSql
      ? (isCloudSqlProxy ? 10000 : 20000) // Unix socket: 10s, IP pública: 20s
      : (isProduction ? 60000 : 15000);

  // Statement timeout: Shorter than connection timeout to prevent queries from blocking the pool
  // If a query takes longer than this, it will be cancelled, freeing the connection for other queries
  // This prevents slow queries from exhausting the connection pool
  // Cloud SQL: 30s (connection timeout is 60s, so queries have 30s before being cancelled)
  // Render/Others: 10-15s (connection timeout is 30-60s)
  const statementTimeout = isCloudSql
    ? 30000  // 30s for Cloud SQL (connection timeout is 60s)
    : (isRenderDb ? 10000 : (isProduction ? 15000 : 10000));

  // Render PostgreSQL requires SSL with sslmode=require in connection string
  // The connection string already includes sslmode=require, so we just need to enable SSL
  // Cloud SQL Proxy (Unix socket) doesn't need SSL - connection is already secure
  // Cloud SQL with public IP requires SSL but may not require client certificates if configured properly
  // For Cloud SQL with public IP, use sslmode=require (not verify-full) to avoid client cert requirement
  // IMPORTANT: Always set rejectUnauthorized: false for Cloud SQL to avoid certificate verification errors
  // If sslmode=disable, completely disable SSL (regardless of database type)
  const sslModeDisabled = databaseUrl?.includes('sslmode=disable');
  const sslConfig = sslModeDisabled
    ? false  // Always disable SSL if sslmode=disable is explicitly set
    : isCloudSqlProxy
      ? false  // Cloud SQL Proxy doesn't need SSL
      : isRenderDb
        ? { rejectUnauthorized: false }  // Render requires SSL
        : isCloudSql
          ? { rejectUnauthorized: false }  // Cloud SQL requires SSL but disable certificate verification
          : (isProduction ? { rejectUnauthorized: false } : false);

  // Log SSL configuration for debugging
  if (isCloudSql && !isCloudSqlProxy) {
    console.log('[DB Config] Cloud SQL SSL config:', JSON.stringify(sslConfig));
    console.log('[DB Config] Database URL contains sslmode=disable:', databaseUrl?.includes('sslmode=disable'));
  }

  // Optimized pool settings for different environments
  // Cloud Run + Cloud SQL: max = (concurrency × max_replicas) vs Cloud SQL max_connections
  // - Default Cloud Run concurrency: 80 (can be reduced to 20-40 for better experience)
  // - Cloud SQL max_connections: varies by instance type
  // - Formula: max should be < (Cloud SQL max_connections / max_replicas)
  // - Example: If Cloud SQL has 100 max_connections and max_replicas=5, max should be < 20
  // Render PostgreSQL: Higher max connections to leverage upgraded DB capacity
  // - Min connections for warm pool readiness
  // - Shorter idle timeout to recycle connections before Render closes them
  // - Aggressive keep-alive to maintain connection health

  // Calculate pool max for Cloud SQL based on environment
  let poolMax: number;
  if (isUsingPgBouncer) {
    // PgBouncer mode: PgBouncer handles the real pooling to Cloud SQL
    // Cloud Run only needs "client" connections to PgBouncer, which can be higher
    // PgBouncer will pool these client connections to a smaller set of DB connections
    // Formula: Cloud Run poolMax=10 × concurrency=1 = 10 client connections to PgBouncer
    // PgBouncer pools these to ~25 DB connections (configurable in pgbouncer.ini)
    const pgbouncerMax = parseInt(process.env.DB_POOL_MAX || '10', 10);
    poolMax = pgbouncerMax;
    console.log(`[DB Config] PgBouncer mode: Cloud Run poolMax=${poolMax} (PgBouncer handles real pooling to DB)`);
  } else if (isCloudSql) {
    // OPTIMIZED: Reduced pool max from 20 to 4 for Cloud Run stability
    // Formula: max instances (5) × pool max (4) = 20 total connections (stable)
    // This prevents pool exhaustion and improves connection reuse
    // Cloud Run + Cloud SQL: Adjust based on concurrency and max_connections
    // Default: Conservative 4 connections per instance (adjust based on Cloud SQL instance size)
    // Review Cloud SQL logs to detect too many connections and adjust accordingly
    const cloudSqlMax = parseInt(process.env.DB_POOL_MAX || '4', 10);
    poolMax = cloudSqlMax;
  } else if (isRenderDb) {
    poolMax = 20; // Render Basic-1gb can handle ~50-100
  } else {
    poolMax = isPooled ? 10 : 6; // Neon pooled vs direct
  }

  const poolMin = isCloudSql ? 2 : (isRenderDb ? 5 : 2);

  // PgBouncer doesn't support statement_timeout as a connection parameter
  // It has its own query timeout mechanism, so we omit it when using PgBouncer
  const poolConfig: any = {
    connectionString: normalizedDatabaseUrl,
    max: poolMax,
    min: poolMin,
    // Cloud SQL: Longer idle timeout to avoid frequent reconnections (Unix socket is stable)
    // Render: 1 min idle (recycle before server closes)
    idleTimeoutMillis: isCloudSql ? 60000 : (isRenderDb ? 60000 : 30000),
    // Increased connection timeout to 60s for Cloud SQL to handle pool saturation better
    // This gives more time when pool is busy, reducing "Connection terminated due to connection timeout" errors
    // Also increased for other DBs to handle pool saturation better
    connectionTimeoutMillis: isCloudSql ? 60000 : Math.max(connectionTimeout, 30000), // Min 30s to handle pool saturation
    keepAlive: true,
    // Cloud SQL Proxy: Start keep-alive sooner for better connection health
    keepAliveInitialDelayMillis: isCloudSql ? 3000 : 5000,
    // OPTIMIZED: Allow connections to be reused many times before recycling
    // Higher maxUses reduces connection churn and improves performance with slow databases
    // Connections will be recycled naturally after many uses, preventing stale connections
    maxUses: 100, // Same for all DB types - allows connections to serve many queries before recycling
    // Application name for better monitoring in Cloud SQL
    application_name: 'unigrc-backend',
    ssl: sslConfig,
    allowExitOnIdle: false,
    // OPTIMIZED: Add acquire timeout to prevent indefinite waiting when pool is saturated
    // This will throw an error if a connection can't be acquired within this time
    // Set to 30s to match connectionTimeout, but this is for acquiring from pool, not creating new connection
    // Note: pg Pool doesn't have acquireTimeoutMillis, but we handle this in our retry logic
  };

  // Only add statement_timeout if NOT using PgBouncer
  if (!isUsingPgBouncer) {
    poolConfig.statement_timeout = statementTimeout;
  }

  pool = new Pool(poolConfig);
  db = drizzle(pool, { schema, logger: true });

  const actualConnectionTimeout = isCloudSql ? 60000 : connectionTimeout;
  console.log(`📊 Database config: pool=${poolMin}-${poolMax}, connectionTimeout=${actualConnectionTimeout}ms, statementTimeout=${statementTimeout}ms, idleTimeout=${isRenderDb ? 60000 : 30000}ms, maxUses=100, env=${isProduction ? 'production' : 'development'}`);
  if (isCloudSql) {
    // FIXED: Detect private IP correctly for logging
    const host = databaseUrl?.split('@')[1]?.split('/')[0]?.split(':')[0] || 'unknown';
    const isPrivateIP = /^10\.|^172\.(1[6-9]|2[0-9]|3[01])\.|^192\.168\./.test(host);
    const connectionType = isCloudSqlProxy
      ? 'Unix socket (Cloud SQL Proxy)'
      : isPrivateIP
        ? 'IP privada (VPC)'
        : 'IP pública';
    console.log(`📊 Cloud SQL pool config: max=${poolMax}, connectionTimeout=${actualConnectionTimeout}ms, maxUses=100 (connections recycled after 100 uses), connectionType=${connectionType}, host: ${host}`);
    if (!isCloudSqlProxy) {
      console.warn(`⚠️ RECOMMENDATION: Switch to Unix socket connection for Cloud SQL to reduce latency from 100-1000ms to <10ms`);
    }
  }

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
// OPTIMIZED: Lazy initialization - only runs on first API request
let dbInitialized = false;
export async function ensureDatabaseInitialized() {
  if (dbInitialized) return;
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
    dbInitialized = true;
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
}
async function initializeDatabase() {
  await ensureDatabaseInitialized();
}

// Connection error handling
if (pool) {
  pool.on('error', (err: any) => {
    // Neon automatically closes idle connections - this is expected behavior
    if (err.code === '57P01') {
      console.log('🔄 Database connection recycled by server (normal for Neon)');
      return;
    }

    // Handle timeout errors specifically with detailed pool metrics
    const isTimeoutError = err.message?.includes('timeout') ||
      err.code === 'ETIMEDOUT' ||
      err.message?.includes('Connection terminated due to connection timeout');

    if (isTimeoutError) {
      const metrics = getPoolMetrics();
      console.error('❌ Connection timeout error:', {
        code: err.code || 'NO_CODE',
        message: err.message?.substring(0, 200),
        poolActive: metrics?.totalCount - metrics?.idleCount,
        poolMax: metrics?.maxConnections,
        poolWaiting: metrics?.waitingCount,
        poolIdle: metrics?.idleCount,
        poolUtilization: metrics ? `${Math.round(((metrics.totalCount - metrics.idleCount) / metrics.maxConnections) * 100)}%` : 'unknown',
        stack: err.stack?.substring(0, 300)
      });
      // Don't throw - let the pool handle reconnection
      // The retry logic in withRetry will handle retries
      return;
    }

    // Handle "Connection terminated unexpectedly" errors
    if (err.message?.includes('Connection terminated') || err.message?.includes('terminated unexpectedly')) {
      const metrics = getPoolMetrics();
      console.warn('⚠️ Database connection terminated unexpectedly:', {
        code: err.code,
        message: err.message?.substring(0, 200),
        poolActive: metrics?.totalCount - metrics?.idleCount,
        poolMax: metrics?.maxConnections,
        poolWaiting: metrics?.waitingCount,
        stack: err.stack?.substring(0, 200)
      });
      // Don't log as error - this is often recoverable
      return;
    }

    // Other database pool errors
    const metrics = getPoolMetrics();
    console.error('❌ Database pool error:', {
      code: err.code,
      message: err.message,
      name: err.name,
      poolActive: metrics?.totalCount - metrics?.idleCount,
      poolMax: metrics?.maxConnections,
      poolWaiting: metrics?.waitingCount
    });
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
// Retry delays with exponential backoff for different database types
// Cloud SQL: Exponential backoff (1s, 2s, 4s) - handles pool saturation better
// Render: Faster retries since DB is always-on, just need to handle transient network issues
// Neon: Longer delays to handle Scale to Zero wake-up time
const RETRY_DELAYS_CLOUDSQL = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s (max 4s cap)
const RETRY_DELAYS_RENDER = [200, 500, 1000, 2000]; // ~4s total window for Render
const RETRY_DELAYS_NEON = [300, 800, 2000, 5000];   // ~8s total window for Neon cold starts

// Detect database type once at module load
const isRenderDatabase = process.env.RENDER_DATABASE_URL?.includes('render.com') || false;
const isCloudSqlDatabase = process.env.IS_GCP_DEPLOYMENT === 'true' ||
  process.env.DATABASE_URL?.includes('.googleapis.com') ||
  process.env.DATABASE_URL?.includes('cloudsql') || false;

const RETRY_DELAYS = isCloudSqlDatabase
  ? RETRY_DELAYS_CLOUDSQL
  : (isRenderDatabase ? RETRY_DELAYS_RENDER : RETRY_DELAYS_NEON);

// Retryable error patterns - specifically for connection timeouts and transient errors
const RETRYABLE_ERROR_PATTERNS = [
  'Connection terminated',
  'connection timeout',
  'Connection terminated due to connection timeout',
  'ETIMEDOUT',
  'ECONNRESET',
  'connection terminated unexpectedly'
];

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: { maxRetries?: number; retryableErrors?: string[]; retryDelay?: number } = {}
): Promise<T> {
  if (!db || !pool) {
    throw new Error('Database not configured - cannot perform operation');
  }

  const maxRetries = options.maxRetries ?? 3;
  const retryDelay = options.retryDelay ?? 500;
  const customRetryableErrors = options.retryableErrors ?? [];
  const allRetryablePatterns = [...RETRYABLE_ERROR_PATTERNS, ...customRetryableErrors];

  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Safely extract error message and code to avoid "Cannot access before initialization" errors
      let errorCode: string | undefined;
      let errorMessage: string | undefined;
      let errorStack: string | undefined;

      try {
        errorCode = error?.code;
        errorMessage = error?.message;
        errorStack = error?.stack;
      } catch (e) {
        // If accessing error properties throws, use fallback values
        errorCode = 'UNKNOWN_ERROR';
        errorMessage = String(error);
        errorStack = undefined;
      }

      // Check if it's a recoverable connection/network error
      const isRecoverable =
        // PostgreSQL error codes
        errorCode === '57P01' || // admin shutdown
        errorCode === '08006' || // connection failure
        errorCode === '08001' || // unable to connect
        errorCode === '08004' || // connection rejected
        errorCode === '53300' || // too many connections
        errorCode === '57014' || // query canceled (timeout)
        // Node.js network error codes
        errorCode === 'ENETUNREACH' || // Network unreachable
        errorCode === 'ECONNRESET' ||  // Connection reset by peer
        errorCode === 'ETIMEDOUT' ||   // Connection timed out
        errorCode === 'ECONNREFUSED' || // Connection refused
        errorCode === 'EPIPE' ||       // Broken pipe
        errorCode === 'EHOSTUNREACH' || // Host unreachable
        errorCode === 'EAI_AGAIN' ||   // DNS temporary failure
        errorCode === 'ENOTFOUND' ||   // DNS lookup failed
        // Message-based detection for edge cases (including timeout-specific patterns)
        (errorMessage && (
          errorMessage.includes('connection') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('Connection terminated') ||
          errorMessage.includes('ENETUNREACH') ||
          errorMessage.includes('socket hang up') ||
          errorMessage.includes('SSL') ||
          errorMessage.includes('ECONNRESET')
        )) ||
        // Check against retryable error patterns
        (errorMessage && allRetryablePatterns.some(pattern =>
          errorMessage.includes(pattern) || errorCode === pattern
        ));

      if (!isRecoverable || attempt === maxRetries) {
        // Enhanced error logging with pool metrics for timeout errors
        const isTimeoutError = (errorMessage && (
          errorMessage.includes('timeout') ||
          errorMessage.includes('Connection terminated due to connection timeout')
        )) || errorCode === 'ETIMEDOUT';

        if (isTimeoutError) {
          const metrics = getPoolMetrics();
          console.error(`❌ Database timeout error (attempt ${attempt}/${maxRetries}):`, {
            code: errorCode || 'NO_CODE',
            message: errorMessage?.substring(0, 200) || 'Unknown error',
            poolActive: metrics?.totalCount - metrics?.idleCount,
            poolMax: metrics?.maxConnections,
            poolWaiting: metrics?.waitingCount,
            poolUtilization: metrics ? `${Math.round(((metrics.totalCount - metrics.idleCount) / metrics.maxConnections) * 100)}%` : 'unknown',
            stack: errorStack?.substring(0, 500)
          });
        } else {
          console.error(`❌ Database operation failed (attempt ${attempt}/${maxRetries}):`, {
            code: errorCode || 'NO_CODE',
            message: errorMessage || 'Unknown error',
            stack: errorStack?.substring(0, 500),
            errorType: error?.constructor?.name || typeof error
          });
        }
        throw error;
      }

      // Use exponential backoff delay or custom retryDelay
      const delay = options.retryDelay
        ? options.retryDelay * Math.pow(2, attempt - 1)
        : (RETRY_DELAYS[attempt - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1]);
      const cappedDelay = Math.min(delay, 8000); // Cap at 8 seconds

      // Safely extract error info for retry log
      let retryErrorCode: string | undefined;
      let retryErrorMessage: string | undefined;
      try {
        retryErrorCode = error?.code;
        retryErrorMessage = error?.message;
      } catch (e) {
        retryErrorCode = 'ERROR';
        retryErrorMessage = String(error);
      }

      console.warn(`⚠️ DB retry ${attempt}/${maxRetries} after ${cappedDelay}ms:`, {
        error: retryErrorCode || 'ERROR',
        message: retryErrorMessage?.substring(0, 100) || 'Unknown error',
        isTimeout: (retryErrorMessage && retryErrorMessage.includes('timeout')) || retryErrorCode === 'ETIMEDOUT'
      });

      // On connection errors, try to warm the pool before retry
      const shouldWarmPool = attempt === 2 && (
        errorCode === 'ETIMEDOUT' ||
        errorCode === 'ECONNRESET' ||
        (errorMessage && errorMessage.includes('timeout'))
      );

      if (shouldWarmPool) {
        console.log('🔄 Warming pool before retry...');
        try {
          await warmPool(2);
        } catch (warmError) {
          // Ignore warming errors, proceed with retry
        }
      }

      await new Promise(resolve => setTimeout(resolve, cappedDelay));
    }
  }

  throw lastError!;
}

/**
 * Execute database queries in batches to limit concurrency and prevent pool saturation
 * This prevents Promise.all from exhausting the connection pool when executing many queries
 * 
 * @param queries Array of query functions to execute
 * @param batchSize Maximum number of concurrent queries per batch (default: 5)
 * @returns Array of results in the same order as queries
 */
export async function batchQueries<T>(
  queries: (() => Promise<T>)[],
  batchSize: number = 5
): Promise<T[]> {
  if (queries.length === 0) {
    return [];
  }

  const results: T[] = [];

  // Process queries in batches to limit concurrent connections
  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(q => q()));
    results.push(...batchResults);
  }

  return results;
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

    // Alert on high ACTIVE connection saturation (>80% threshold)
    // Idle connections are harmless - they're ready to serve new requests
    // 80% threshold provides early warning before pool exhaustion
    if (activeUtilizationPct >= 80) {
      console.warn(
        `⚠️ HIGH POOL SATURATION: ${activeUtilizationPct}% active (${activeConnections}/${metrics.maxConnections}) - ` +
        `Pool is ${activeUtilizationPct >= 90 ? 'CRITICALLY' : 'highly'} saturated. ` +
        `Consider: 1) Investigating slow queries, 2) Increasing DB_POOL_MAX, 3) Optimizing concurrent queries`
      );
    }

    // Alert on queued connections (this indicates real saturation)
    // Reduced threshold for smaller pool size
    if (metrics.waitingCount > 3) {
      console.warn(
        `⚠️ CONNECTION QUEUE BUILD-UP: ${metrics.waitingCount} queries waiting - ` +
        `Pool is saturated, queries are queuing. Check for slow queries or increase max connections`
      );
    }

    // Critical alert when pool is nearly exhausted (>90%)
    if (activeUtilizationPct >= 90) {
      console.error(
        `🚨 CRITICAL POOL SATURATION: ${activeUtilizationPct}% active (${activeConnections}/${metrics.maxConnections}), ` +
        `${metrics.waitingCount} waiting - Pool near exhaustion! Immediate action required.`
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

// OPTIMIZED: Pool monitoring is now lazy - starts on first API request
let poolMonitoringStarted = false;
export function startPoolMonitoringIfNeeded() {
  if (poolMonitoringStarted || !pool) return;
  startPoolMonitoring();
  poolMonitoringStarted = true;
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
// During quiet hours, ALL pings are paused to save resources
// No database connections will be pinged during this period
function isQuietHours(): boolean {
  const now = new Date();
  const chileTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Santiago' }));
  const hour = chileTime.getHours();
  return hour >= 0 && hour < 7; // 00:00 to 06:59 (inclusive)
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
  const isCloudSql = process.env.IS_GCP_DEPLOYMENT === 'true' || false;
  // OPTIMIZED: Less frequent pings to reduce load and connection churn
  // Ping goal: verify DB is alive, not create excessive load or reconnections
  // Higher interval (30-60s) allows connections to be reused more before recycling
  const PING_INTERVAL = 45000; // 45 seconds - balanced between health checks and low overhead

  poolWarmingInterval = setInterval(async () => {
    try {
      const currentlyQuiet = isQuietHours();

      // Detect transition from quiet hours to active hours (7:00 AM)
      if (wasInQuietHours && !currentlyQuiet) {
        console.log('🌅 Quiet hours ended - aggressive pool warming');
        const warmCount = isRender ? 5 : (isCloudSql ? 3 : 2);
        await warmPool(warmCount);
        wasInQuietHours = currentlyQuiet;
        return;
      }

      // Detect transition into quiet hours (00:00) - log once
      if (!wasInQuietHours && currentlyQuiet) {
        console.log('🌙 Quiet hours (00:00-07:00 Chile time) - pings paused until 07:00');
      }

      wasInQuietHours = currentlyQuiet;

      // Skip ALL pings during quiet hours (00:00-07:00 Chile time) to save resources
      // No database pings will be executed during this period
      if (currentlyQuiet) {
        return; // Exit early - no ping will be executed
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
        // IMPROVED: Better timeout handling for ping to detect and close stale connections faster
        let client: any = null;
        let timeoutId: NodeJS.Timeout | null = null;
        let pingCompleted = false;

        try {
          const pingStart = Date.now();

          // REDUCED: Timeout reducido a 3 segundos para detectar conexiones lentas más rápido
          // OPTIMIZED: Increase timeout when pool is saturated to handle connection acquisition delays
          // Check pool metrics to adjust timeout dynamically
          const poolMetrics = getPoolMetrics();
          const poolUtilization = poolMetrics ? (poolMetrics.totalCount - poolMetrics.idleCount) / poolMetrics.maxConnections : 0;
          // Increase timeout if pool is >50% utilized (more connections active = longer wait time)
          const PING_TIMEOUT_MS = poolUtilization > 0.5 ? 10000 : 5000; // 10s if pool busy, 5s otherwise

          // Mejor manejo del timeout: separar timeout para conexión y query
          const pingPromise = (async () => {
            try {
              // Intentar obtener conexión con timeout más agresivo
              client = await Promise.race([
                pool!.connect(),
                new Promise<any>((_, reject) => {
                  timeoutId = setTimeout(() => reject(new Error('Connection acquisition timeout')), PING_TIMEOUT_MS);
                })
              ]);

              // Si llegamos aquí, cancelar el timeout de conexión
              if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
              }

              // Ejecutar query con timeout separado
              await Promise.race([
                client.query({ text: 'SELECT 1', rowMode: 'array' }),
                new Promise((_, reject) => {
                  timeoutId = setTimeout(() => reject(new Error('Query timeout')), PING_TIMEOUT_MS);
                })
              ]);

              // Si llegamos aquí, cancelar el timeout de query
              if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
              }

              pingCompleted = true;
            } catch (error) {
              // Limpiar timeout si existe
              if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
              }
              throw error;
            }
          })();

          await pingPromise;
          const pingDuration = Date.now() - pingStart;

          // Log slow pings for monitoring (but don't close connections aggressively)
          if (pingDuration > 1000) {
            // FIXED: Detect private IP correctly for logging
            const host = databaseUrl?.split('@')[1]?.split('/')[0]?.split(':')[0] || 'unknown';
            const isPrivateIP = /^10\.|^172\.(1[6-9]|2[0-9]|3[01])\.|^192\.168\./.test(host);
            const connectionType = isCloudSqlProxy
              ? 'Unix socket (Cloud SQL Proxy)'
              : isCloudSql && isPrivateIP
                ? 'IP privada (VPC)'
                : isCloudSql
                  ? 'IP pública'
                  : 'unknown';
            console.warn(`⚠️ Slow DB ping: ${pingDuration}ms (connectionType: ${connectionType}, host: ${host}) - connection will recycle naturally via maxUses`);
          }

          // OPTIMIZED: Let connections recycle naturally via maxUses instead of closing aggressively
          // Slow pings don't necessarily mean the connection is bad - it might just be network latency
          // maxUses=100 ensures connections are recycled after many uses anyway
          // Only log for monitoring, don't force close or warm pool unnecessarily
        } catch (error: any) {
          // Limpiar timeout si aún existe
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }

          // OPTIMIZED: Less aggressive error handling - let pool handle connection recovery naturally
          const isTimeout = error?.message === 'Ping timeout' ||
            error?.message === 'Connection acquisition timeout' ||
            error?.message === 'Query timeout' ||
            error?.code === 'ETIMEDOUT' ||
            error?.code === 'ECONNRESET';

          if (isTimeout) {
            // FIXED: Detect private IP correctly for logging
            const host = databaseUrl?.split('@')[1]?.split('/')[0]?.split(':')[0] || 'unknown';
            const isPrivateIP = /^10\.|^172\.(1[6-9]|2[0-9]|3[01])\.|^192\.168\./.test(host);
            const connectionType = isCloudSqlProxy
              ? 'Unix socket (Cloud SQL Proxy)'
              : isCloudSql && isPrivateIP
                ? 'IP privada (VPC)'
                : isCloudSql
                  ? 'IP pública'
                  : 'unknown';
            console.warn(`⚠️ Ping timeout/error (${error?.message || error}) - connection will be recycled naturally (connectionType: ${connectionType}, host: ${host})`);
            // Don't force close - let the pool handle it naturally via maxUses and idleTimeout
          } else {
            console.warn('⚠️ Pool keep-alive ping failed:', error?.message || error);
            // Only warm pool if it's completely empty, not on every ping failure
          }
        } finally {
          // Limpiar timeout si aún existe
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }

          // Always release connection back to pool if valid (let maxUses handle recycling)
          if (client) {
            try {
              client.release();
            } catch (e) {
              // Ignore release errors - connection may already be closed
            }
          }
        }
      }
    } catch (error: any) {
      // This catch block should rarely be hit now since we handle errors in the inner try-catch
      // But keep it as a safety net for interval-level errors
      console.warn('⚠️ Pool keep-alive interval error:', error?.message || error);
    }
  }, PING_INTERVAL);

  console.log(`✅ Pool warming started - pinging every ${PING_INTERVAL / 1000}s (paused 00:00-07:00 Chile time, maxUses=100 for natural recycling)`);
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

// OPTIMIZED: Pool warming is now lazy - starts on first API request
let poolWarmingStarted = false;
export function startPoolWarmingIfNeeded() {
  if (poolWarmingStarted || !pool) return;

  // Initial warm in background after delay
  setTimeout(async () => {
    if (isQuietHours()) {
      console.log('🌙 Quiet hours (00:00-07:00 Chile time) - skipping initial pool warming');
      startPoolWarming(); // Start the interval anyway, it will skip pings during quiet hours
    } else {
      // Pool warming for Render PostgreSQL and Cloud SQL
      // Pre-establish connections respecting pool max to avoid SSL handshake latency during requests
      const isRender = process.env.RENDER_DATABASE_URL?.includes('render.com') ||
        process.env.DATABASE_URL?.includes('render.com') || false;
      const isCloudSql = process.env.IS_GCP_DEPLOYMENT === 'true' || false;
      // Match actual pool config: Render max=20, Cloud SQL max=10 (configurable), Neon max=6
      const poolMax = isRender ? 20 : (isCloudSql ? parseInt(process.env.DB_POOL_MAX || '10', 10) : 6);
      // Warm up to min connections to ensure fast initial requests
      // Render: 8, Cloud SQL: 3, Neon: 3
      const warmCount = Math.min(
        isRender ? 8 : (isCloudSql ? 3 : 3),
        poolMax
      );
      console.log(`🔥 Starting aggressive pool warming (${warmCount} of ${poolMax} connections)...`);
      await warmPool(warmCount);
      startPoolWarming();
    }
  }, 500); // Start even sooner for faster cold start

  poolWarmingStarted = true;
}

// Cleanup on shutdown
process.on('SIGTERM', () => {
  stopPoolWarming();
});

process.on('SIGINT', () => {
  stopPoolWarming();
});

// OPTIMIZED: Database initialization is now lazy - will run on first use via ensureDatabaseInitialized()
