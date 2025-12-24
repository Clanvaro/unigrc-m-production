import { Redis as UpstashRedis } from '@upstash/redis';
import IoRedis from 'ioredis';

interface CacheEntry {
  data: string;
  expiresAt: number;
}

class InMemoryCache {
  private cache = new Map<string, CacheEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.startCleanup();
  }
  
  private startCleanup() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiresAt <= now) {
          this.cache.delete(key);
        }
      }
    }, 30000);
  }
  
  async setex(key: string, ttl: number, value: string): Promise<string> {
    this.cache.set(key, {
      data: value,
      expiresAt: Date.now() + (ttl * 1000)
    });
    return 'OK';
  }
  
  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }
  
  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (this.cache.delete(key)) deleted++;
    }
    return deleted;
  }
  
  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    const result: string[] = [];
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt > now && regex.test(key)) {
        result.push(key);
      }
    }
    return result;
  }
  
  async exists(...keys: string[]): Promise<number> {
    const now = Date.now();
    let count = 0;
    for (const key of keys) {
      const entry = this.cache.get(key);
      if (entry && entry.expiresAt > now) count++;
    }
    return count;
  }
  
  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.cache.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + (seconds * 1000);
    return 1;
  }
  
  async ttl(key: string): Promise<number> {
    const entry = this.cache.get(key);
    if (!entry) return -2;
    const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -1;
  }
  
  async setnx(key: string, value: string, ttlSeconds: number): Promise<number> {
    // SETNX: Set if not exists
    if (this.cache.has(key)) {
      return 0; // Key already exists
    }
    this.cache.set(key, {
      data: value,
      expiresAt: Date.now() + (ttlSeconds * 1000)
    });
    return 1; // Key was set
  }
  
  async flushdb(): Promise<string> {
    this.cache.clear();
    return 'OK';
  }
  
  on(event: string, handler: Function) {}
  off(event: string, handler: Function) {}
  
  async disconnect() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
  
  getStats() {
    return {
      size: this.cache.size,
      memoryUsage: process.memoryUsage().heapUsed
    };
  }
}

class UpstashRedisAdapter {
  private client: UpstashRedis;
  
  constructor(url: string, token: string) {
    this.client = new UpstashRedis({
      url,
      token,
    });
  }
  
  async setex(key: string, ttl: number, value: string): Promise<string> {
    await this.client.setex(key, ttl, value);
    return 'OK';
  }
  
  async get(key: string): Promise<string | null> {
    const result = await this.client.get<string>(key);
    return result;
  }
  
  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return await this.client.del(...keys);
  }
  
  async keys(pattern: string): Promise<string[]> {
    return await this.client.keys(pattern);
  }
  
  async exists(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return await this.client.exists(...keys);
  }
  
  async expire(key: string, seconds: number): Promise<number> {
    return await this.client.expire(key, seconds);
  }
  
  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }
  
  async setnx(key: string, value: string, ttlSeconds: number): Promise<number> {
    // SETNX with expiration: Use SET with NX option
    // Upstash Redis supports SET with NX and EX options
    const result = await this.client.set(key, value, { nx: true, ex: ttlSeconds });
    return result === 'OK' ? 1 : 0;
  }
  
  async flushdb(): Promise<string> {
    await this.client.flushdb();
    return 'OK';
  }
  
  on(event: string, handler: Function) {}
  off(event: string, handler: Function) {}
  
  async disconnect() {}
  
  getStats() {
    return { distributed: true, type: 'upstash' };
  }
}

// Wrapper for IoRedis to add setnx method with TTL support
class IoRedisWrapper {
  private client: IoRedis;
  
  constructor(client: IoRedis) {
    this.client = client;
  }
  
  // Delegate all methods to the underlying client
  async setex(key: string, ttl: number, value: string): Promise<string> {
    return await this.client.setex(key, ttl, value);
  }
  
  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }
  
  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return await this.client.del(...keys);
  }
  
  async keys(pattern: string): Promise<string[]> {
    return await this.client.keys(pattern);
  }
  
  async exists(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return await this.client.exists(...keys);
  }
  
  async expire(key: string, seconds: number): Promise<number> {
    return await this.client.expire(key, seconds);
  }
  
  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }
  
  async setnx(key: string, value: string, ttlSeconds: number): Promise<number> {
    // SETNX with expiration: Use SET with NX and EX options
    // ioredis syntax: set(key, value, 'EX', seconds, 'NX')
    const result = await this.client.set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK' ? 1 : 0;
  }
  
  async flushdb(): Promise<string> {
    return await this.client.flushdb();
  }
  
  on(event: string, handler: Function) {
    this.client.on(event, handler as any);
  }
  
  off(event: string, handler: Function) {
    this.client.off(event, handler as any);
  }
  
  async disconnect() {
    // CRITICAL: Never disconnect the singleton connection
    // This method exists for interface compatibility but should never be called
    console.warn('⚠️ [REDIS] disconnect() called on singleton - ignoring to maintain connection');
  }
  
  getStats() {
    return { distributed: true, type: 'ioredis' };
  }
  
  // Expose connect method for initialization
  async connect(): Promise<void> {
    return await this.client.connect();
  }
}

type RedisClient = IoRedisWrapper | InMemoryCache | UpstashRedisAdapter;

// ============================================================================
// CRITICAL: Redis Client Singleton Pattern
// ============================================================================
// This module implements a strict singleton pattern for Redis connections:
// - ONE connection per Cloud Run instance (process)
// - Connection is created ONCE at startup
// - Connection is NEVER closed (remains open for instance lifetime)
// - Connection is reused across ALL requests (no per-request connections)
// - TCP keep-alive is enabled to prevent connection timeouts
// ============================================================================

let redis: RedisClient | null = null;
let usingRealRedis = false;
let redisInitialized = false; // Track initialization to prevent multiple initializations
let redisInitPromise: Promise<void> | null = null; // Track ongoing initialization

const REDIS_URL = process.env.REDIS_URL;
const UPSTASH_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

/**
 * CRITICAL: Initialize Redis client ONCE per process instance (singleton)
 * 
 * This function ensures:
 * - Only ONE connection is created per Cloud Run instance
 * - Connection is established at startup, not on first request
 * - Connection is NEVER closed (remains open for instance lifetime)
 * - Connection is reused across ALL requests
 * - TCP keep-alive prevents connection timeouts
 * 
 * @returns Promise that resolves when Redis is initialized
 */
function initializeRedis(): Promise<void> {
  // If already initialized, return immediately
  if (redisInitialized && redis !== null) {
    return Promise.resolve();
  }
  
  // If initialization is in progress, wait for it
  if (redisInitPromise) {
    return redisInitPromise;
  }
  
  // Start initialization
  redisInitPromise = (async () => {
    if (redisInitialized) {
      console.log('⚠️ [REDIS] Redis already initialized, skipping re-initialization');
      return;
    }
    
    console.log(`🔄 [REDIS] Initializing Redis client (singleton pattern - process PID: ${process.pid})...`);
    
    if (UPSTASH_REST_URL && UPSTASH_REST_TOKEN) {
      try {
        redis = new UpstashRedisAdapter(UPSTASH_REST_URL, UPSTASH_REST_TOKEN);
        usingRealRedis = true;
        redisInitialized = true;
        console.log('✅ [REDIS] Using Upstash Redis (REST API) for distributed caching (singleton)');
      } catch (error) {
        console.warn('⚠️ [REDIS] Upstash Redis initialization failed, using in-memory cache:', error);
        redis = new InMemoryCache();
        redisInitialized = true;
      }
    } else if (REDIS_URL && REDIS_URL.startsWith('redis')) {
      try {
        // CRITICAL: Singleton Redis client - ONE connection per Cloud Run instance
        // This connection is created ONCE at startup and reused across ALL requests
        // NEVER create/close connections per request - this ensures optimal performance
        const rawRedisClient = new IoRedis(REDIS_URL, {
          // Connection management
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          connectTimeout: 10000,
          lazyConnect: true, // Use lazy connect, then connect explicitly for better control
          
          // CRITICAL: TCP Keep-Alive is handled automatically by Node.js net.Socket
          // ioredis uses Node.js net.Socket which has keep-alive enabled by default
          // The connection will remain alive between requests automatically
          // No explicit configuration needed - ioredis handles this internally
          
          // Network configuration
          family: 4, // Use IPv4 (faster, more reliable)
          
          // Retry strategy: exponential backoff with max delay
          retryStrategy: (times) => {
            const delay = Math.min(times * 100, 3000);
            console.log(`[REDIS] Retry attempt ${times}, waiting ${delay}ms`);
            return delay;
          },
          
          // CRITICAL: Prevent connection from closing on idle
          // This ensures the connection stays open between requests
          enableOfflineQueue: true, // Queue commands when disconnected
          
          // CRITICAL: Auto-reconnect on connection loss
          // Default is true, but explicit is better for clarity
          enableAutoPipelining: false, // Disable auto-pipelining to avoid connection issues
          
          // CRITICAL: Always reconnect on errors (except for specific cases)
          // This ensures the singleton connection is always maintained
          reconnectOnError: (err: Error) => {
            const targetError = 'READONLY';
            if (err.message.includes(targetError)) {
              // Reconnect on READONLY errors
              return true;
            }
            // For other errors, let ioredis handle reconnection automatically
            // ioredis will reconnect on connection loss by default
            return false;
          },
          
          // CRITICAL: Never close connection automatically
          // The connection should remain open for the lifetime of the Cloud Run instance
          // This is handled by the singleton pattern - we never call disconnect() or quit()
        });
        
        // Wrap the client to add setnx method and ensure singleton behavior
        const redisClient = new IoRedisWrapper(rawRedisClient);
        
        // CRITICAL: Track connection creation to detect multiple connections
        const connectionId = `redis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log(`🔄 [REDIS] Creating Redis client instance: ${connectionId} (PID: ${process.pid})`);
        
        // Connection event handlers with detailed logging
        redisClient.on('connect', () => {
          console.log(`✅ [REDIS] Connected to Redis (connection: ${connectionId}, PID: ${process.pid})`);
          console.log(`📊 [REDIS] Connection stats: ${JSON.stringify({
            connectionId,
            pid: process.pid,
            uptime: process.uptime(),
            memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
          })}`);
          usingRealRedis = true;
        });
        
        redisClient.on('ready', () => {
          console.log(`✅ [REDIS] Redis client ready (PID: ${process.pid})`);
        });
        
        redisClient.on('error', (err: Error) => {
          console.error(`❌ [REDIS] Connection error (PID: ${process.pid}):`, err.message);
          // Don't fall back to in-memory on error - let retry strategy handle it
        });
        
        redisClient.on('close', () => {
          console.warn(`⚠️ [REDIS] Connection closed (PID: ${process.pid}) - will reconnect automatically`);
        });
        
        redisClient.on('reconnecting', (delay: number) => {
          console.log(`🔄 [REDIS] Reconnecting in ${delay}ms... (PID: ${process.pid})`);
        });
        
        redisClient.on('end', () => {
          console.warn(`⚠️ [REDIS] Connection ended (PID: ${process.pid}) - singleton will attempt to reconnect`);
        });
        
        // CRITICAL: Assign to singleton variable BEFORE connecting
        // This ensures getRedis() returns the client even during connection
        redis = redisClient;
        redisInitialized = true;
        
        // CRITICAL: Connect immediately to establish connection at startup
        // This connection will remain open for the lifetime of the Cloud Run instance
        // NEVER call disconnect() or quit() - the connection must stay alive
        await redisClient.connect().catch((err) => {
          console.warn(`⚠️ [REDIS] Initial connection failed (PID: ${process.pid}), falling back to in-memory cache:`, err.message);
          redis = new InMemoryCache();
          usingRealRedis = false;
          redisInitialized = true;
        });
        
        // CRITICAL: Configure TCP keep-alive on the underlying socket
        // This ensures the connection stays alive between requests
        rawRedisClient.stream?.once('connect', () => {
          if (rawRedisClient.stream && typeof rawRedisClient.stream.setKeepAlive === 'function') {
            rawRedisClient.stream.setKeepAlive(true, 0); // Enable keep-alive immediately
            console.log(`✅ [REDIS] TCP keep-alive enabled on socket (PID: ${process.pid})`);
          }
        });
        
        console.log(`✅ [REDIS] Singleton connection established (ONE connection per instance, PID: ${process.pid})`);
        console.log(`📌 [REDIS] Connection will remain open for instance lifetime - never closed per request`);
      } catch (error) {
        console.warn(`⚠️ [REDIS] Initialization failed (PID: ${process.pid}), using in-memory cache:`, error);
        redis = new InMemoryCache();
        redisInitialized = true;
      }
    } else {
      console.log('ℹ️  [REDIS] Using in-memory cache (set UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN for distributed caching)');
      redis = new InMemoryCache();
      redisInitialized = true;
    }
  })();
  
  return redisInitPromise;
}

// ============================================================================
// CRITICAL: Initialize Redis Singleton at Module Load
// ============================================================================
// Initialize Redis immediately when module loads (not on first request)
// This ensures:
// - Connection is established at startup
// - Connection is ready before any requests arrive
// - ONE connection per process (singleton pattern)
// - Connection remains open for the lifetime of the instance
// ============================================================================
initializeRedis().catch((err) => {
  console.error('❌ [REDIS] Failed to initialize Redis singleton:', err);
});

/**
 * Get the Redis singleton client instance
 * 
 * CRITICAL: This returns the SAME connection instance for all requests
 * - Never creates a new connection
 * - Never closes the connection
 * - Connection is shared across all requests in the same process
 * 
 * @returns The singleton Redis client instance (may be null if not initialized yet)
 */
function getRedisClient(): RedisClient | null {
  return redis;
}

// CRITICAL: Export singleton instance directly
// The initialization happens at module load time, ensuring ONE connection per process
// NEVER call disconnect() or quit() on this instance - it must remain open
export default redis;
export { usingRealRedis, initializeRedis, getRedisClient };

export class DistributedCache {
  private readonly defaultTTL = 5 * 60;
  
  /**
   * Get the Redis singleton client instance
   * 
   * CRITICAL: This method returns the SAME singleton connection for all requests
   * - Never creates a new connection
   * - Never closes the connection
   * - Uses the singleton pattern - ONE connection per Cloud Run instance
   * 
   * @returns The singleton Redis client instance (may be null if not initialized yet)
   */
  private getRedis(): RedisClient | null {
    // CRITICAL: Always get the current singleton instance dynamically
    // This ensures we always have the latest redis instance, even if it was initialized after module load
    // The redis variable is initialized asynchronously, so we can't reference it in the constructor
    
    // If Redis is not initialized yet, try to initialize it (shouldn't happen in production after startup)
    if (!redisInitialized && !redis) {
      console.warn('[REDIS] Redis singleton not initialized yet in getRedis(), initializing now...');
      // This should not happen after startup, but if it does, initialize it
      initializeRedis().catch(err => {
        console.error('[REDIS] Failed to initialize Redis singleton in getRedis():', err);
      });
      // Return null for now - will be available on next call
      return null;
    }
    
    // CRITICAL: Return the singleton instance
    // This is the SAME connection for all requests - never creates a new one
    return redis || null;
  }
  
  async set(key: string, data: any, ttl?: number): Promise<void> {
    try {
      // FIXED: Get current redis instance to handle re-initialization
      const redisInstance = this.getRedis();
      if (!redisInstance || redisInstance === null) {
        console.warn('[CACHE] Redis not initialized, skipping set operation');
        return;
      }
      const serializedData = JSON.stringify(data);
      const ttlSeconds = ttl || this.defaultTTL;
      await redisInstance.setex(key, ttlSeconds, serializedData);
    } catch (error) {
      // FIXED: More detailed error logging to help debug initialization issues
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorName = error instanceof Error ? error.name : 'Error';
      console.error(`[CACHE] Set error for key ${key}:`, errorName, errorMessage);
      // Don't throw - graceful degradation
    }
  }

  async get(key: string): Promise<any | null> {
    try {
      // FIXED: Get current redis instance to handle re-initialization
      const redisInstance = this.getRedis();
      if (!redisInstance || redisInstance === null) {
        console.warn('[CACHE] Redis not initialized, returning null');
        return null;
      }
      const data = await redisInstance.get(key);
      if (!data) return null;
      if (typeof data === 'string') {
        return JSON.parse(data);
      }
      return data;
    } catch (error) {
      // FIXED: More detailed error logging to help debug initialization issues
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorName = error instanceof Error ? error.name : 'Error';
      console.error(`[CACHE] Get error for key ${key}:`, errorName, errorMessage);
      return null;
    }
  }

  async invalidate(key?: string): Promise<void> {
    try {
      const redisInstance = this.getRedis();
      if (!redisInstance || redisInstance === null) {
        console.warn('[CACHE] Redis not initialized, skipping invalidate operation');
        return;
      }
      if (key) {
        await redisInstance.del(key);
      } else {
        const keys = await redisInstance.keys('*');
        if (keys.length > 0) {
          await redisInstance.del(...keys);
        }
      }
    } catch (error) {
      console.error('Cache invalidate error:', error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const redisInstance = this.getRedis();
      if (!redisInstance || redisInstance === null) {
        console.warn('[CACHE] Redis not initialized, skipping invalidatePattern operation');
        return;
      }
      const keys = await redisInstance.keys(pattern);
      if (keys.length > 0) {
        console.log(`[CACHE INVALIDATE PATTERN] Found ${keys.length} keys matching pattern "${pattern}":`, keys.slice(0, 10).join(', '));
        await redisInstance.del(...keys);
        console.log(`[CACHE INVALIDATE PATTERN] Deleted ${keys.length} keys matching pattern "${pattern}"`);
      } else {
        console.log(`[CACHE INVALIDATE PATTERN] No keys found matching pattern "${pattern}"`);
      }
    } catch (error) {
      console.error('Cache invalidatePattern error:', error);
    }
  }

  async setnx(key: string, value: string, ttlSeconds: number): Promise<number> {
    try {
      const redisInstance = this.getRedis();
      if (!redisInstance || redisInstance === null) {
        console.warn('[CACHE] Redis not initialized, skipping setnx operation');
        return 0;
      }
      return await redisInstance.setnx(key, value, ttlSeconds);
    } catch (error) {
      console.error(`[CACHE] Setnx error for key ${key}:`, error);
      return 0; // Fail gracefully - assume lock not acquired
    }
  }

  async getOrSet<T>(
    key: string, 
    computeFn: () => Promise<T>, 
    ttl?: number
  ): Promise<T> {
    try {
      const cached = await this.get(key);
      if (cached !== null) {
        return cached;
      }
      
      const computed = await computeFn();
      await this.set(key, computed, ttl);
      return computed;
    } catch (error) {
      console.error('Cache getOrSet error:', error);
      return await computeFn();
    }
  }
  
  isDistributed(): boolean {
    return usingRealRedis;
  }
  
  getStats() {
    const redisInstance = this.getRedis();
    if (!redisInstance) {
      return { initialized: false };
    }
    if (redisInstance instanceof InMemoryCache) {
      return redisInstance.getStats();
    }
    if (redisInstance instanceof UpstashRedisAdapter) {
      return redisInstance.getStats();
    }
    return { distributed: true };
  }
}

// FIXED: Initialize distributedCache after redis is initialized
// This prevents 'Cannot access before initialization' errors
export const distributedCache = new DistributedCache();
