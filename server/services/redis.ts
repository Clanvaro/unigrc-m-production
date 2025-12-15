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

// FIXED: Initialize variables to prevent 'Cannot access before initialization' errors
let redis: RedisClient | null = null;
let usingRealRedis = false;

const REDIS_URL = process.env.REDIS_URL;
const UPSTASH_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (UPSTASH_REST_URL && UPSTASH_REST_TOKEN) {
  try {
    redis = new UpstashRedisAdapter(UPSTASH_REST_URL, UPSTASH_REST_TOKEN);
    usingRealRedis = true;
    console.log('✅ Using Upstash Redis (REST API) for distributed caching');
  } catch (error) {
    console.warn('⚠️ Upstash Redis initialization failed, using in-memory cache:', error);
    redis = new InMemoryCache();
  }
} else if (REDIS_URL && REDIS_URL.startsWith('redis')) {
  try {
    redis = new IoRedis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      connectTimeout: 10000,
      lazyConnect: true,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });
    
    redis.on('connect', () => {
      console.log('✅ Connected to Redis');
      usingRealRedis = true;
    });
    
    redis.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message);
    });
    
    redis.connect().catch((err) => {
      console.warn('⚠️ Redis connection failed, falling back to in-memory cache:', err.message);
      redis = new InMemoryCache();
      usingRealRedis = false;
    });
    
    console.log('🔄 Attempting Redis connection...');
  } catch (error) {
    console.warn('⚠️ Redis initialization failed, using in-memory cache');
    redis = new InMemoryCache();
  }
} else {
  console.log('ℹ️  Using in-memory cache (set UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN for distributed caching)');
  redis = new InMemoryCache();
}

export default redis;
export { usingRealRedis };

export class DistributedCache {
  private readonly defaultTTL = 5 * 60;
  private redisClient: RedisClient | null = null;
  
  constructor() {
    // FIXED: Initialize redisClient reference after redis is initialized
    // This prevents 'Cannot access before initialization' errors
    this.redisClient = redis || null;
  }
  
  private getRedis(): RedisClient | null {
    // FIXED: Always get the current redis instance to handle re-initialization
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
