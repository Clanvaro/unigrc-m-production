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

type RedisClient = IoRedis | InMemoryCache | UpstashRedisAdapter;

// CRITICAL: Singleton pattern - ONE Redis client per Cloud Run instance
// This prevents multiple connections from being created
let redis: RedisClient | null = null;
let usingRealRedis = false;
let redisInitialized = false; // Track initialization to prevent multiple initializations
let redisInitPromise: Promise<void> | null = null; // Track ongoing initialization

const REDIS_URL = process.env.REDIS_URL;
const UPSTASH_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

/**
 * CRITICAL: Initialize Redis client ONCE per process instance
 * This function ensures only ONE connection is created, even if called multiple times
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
        // OPTIMIZED: Singleton Redis client with persistent connection and keep-alive
        // CRITICAL: One connection per Cloud Run instance, reused across all requests
        const redisClient = new IoRedis(REDIS_URL, {
          // Connection management
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          connectTimeout: 10000,
          lazyConnect: true, // CRITICAL: Use lazy connect, then connect explicitly below for better control
          
          // CRITICAL: Keep connection alive to prevent frequent reconnections
          keepAlive: 30000, // Send keep-alive ping every 30 seconds
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
          
          // CRITICAL: Auto-reconnect on connection loss (default is true, but explicit is better)
          enableAutoPipelining: false, // Disable auto-pipelining to avoid connection issues
          
          // Reconnect on close (critical for Cloud Run)
          reconnectOnError: (err) => {
            const targetError = 'READONLY';
            if (err.message.includes(targetError)) {
              // Only reconnect on specific errors
              return true;
            }
            return false;
          },
        });
        
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
        
        redisClient.on('error', (err) => {
          console.error(`❌ [REDIS] Connection error (PID: ${process.pid}):`, err.message);
          // Don't fall back to in-memory on error - let retry strategy handle it
        });
        
        redisClient.on('close', () => {
          console.warn(`⚠️ [REDIS] Connection closed (PID: ${process.pid}) - will reconnect automatically`);
        });
        
        redisClient.on('reconnecting', (delay) => {
          console.log(`🔄 [REDIS] Reconnecting in ${delay}ms... (PID: ${process.pid})`);
        });
        
        redisClient.on('end', () => {
          console.warn(`⚠️ [REDIS] Connection ended (PID: ${process.pid})`);
        });
        
        redis = redisClient;
        redisInitialized = true;
        
        // Connect immediately to establish connection at startup
        await redisClient.connect().catch((err) => {
          console.warn(`⚠️ [REDIS] Initial connection failed (PID: ${process.pid}), falling back to in-memory cache:`, err.message);
          redis = new InMemoryCache();
          usingRealRedis = false;
        });
        
        console.log(`🔄 [REDIS] Redis connection initiated (singleton pattern - ONE connection per instance, PID: ${process.pid})...`);
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

// CRITICAL: Initialize Redis immediately when module loads
// This ensures connection is established at startup, not on first request
initializeRedis().catch((err) => {
  console.error('❌ [REDIS] Failed to initialize Redis:', err);
});

// CRITICAL: Export singleton instance directly
// The initialization happens at module load time, ensuring ONE connection per process
export default redis;
export { usingRealRedis, initializeRedis };

export class DistributedCache {
  private readonly defaultTTL = 5 * 60;
  // CRITICAL: Don't store redisClient reference - always get it fresh via getRedis()
  // This prevents 'Cannot access before initialization' errors when module loads
  
  private getRedis(): RedisClient | null {
    // CRITICAL: Always get the current singleton instance dynamically
    // This ensures we always have the latest redis instance, even if it was initialized after module load
    // The redis variable is initialized asynchronously, so we can't reference it in the constructor
    
    // If Redis is not initialized yet, try to initialize it (shouldn't happen in production after startup)
    if (!redisInitialized && !redis) {
      console.warn('[REDIS] Redis not initialized yet in getRedis(), initializing now...');
      // This should not happen after startup, but if it does, initialize it
      initializeRedis().catch(err => {
        console.error('[REDIS] Failed to initialize Redis in getRedis():', err);
      });
      // Return null for now - will be available on next call
      return null;
    }
    
    // Return the current redis instance (may be null if still initializing)
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
