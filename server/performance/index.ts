/**
 * Performance Optimization Module
 * Centralized performance enhancements for production deployment
 */

export * from './cache-manager';
export * from './compression';
export * from './database-optimization';
export * from './query-analyzer';

import { Express } from 'express';
import { 
  createCompressionMiddleware,
  responseSizeMonitor,
  setCacheHeaders 
} from './compression';

/**
 * Apply all performance optimizations to Express app
 */
export function applyPerformanceOptimizations(app: Express) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  console.log(`🚀 Applying performance optimizations (${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode)`);
  
  // 1. Response compression (gzip/brotli)
  app.use(createCompressionMiddleware());
  console.log('✅ Compression middleware enabled');
  
  // 2. Response size monitoring
  app.use(responseSizeMonitor);
  console.log('✅ Response size monitoring enabled');
  
  // 3. CDN-friendly cache headers
  if (isProduction) {
    app.use(setCacheHeaders);
    console.log('✅ CDN cache headers enabled');
  }
  
  console.log('🎯 Performance optimizations applied successfully');
}

/**
 * Performance monitoring endpoint
 */
export function getPerformanceStats() {
  return {
    cacheEnabled: process.env.DISABLE_CACHE !== 'true',
    compressionEnabled: true,
    environment: process.env.NODE_ENV || 'development',
    poolConfig: {
      max: process.env.DB_POOL_MAX || '10',
      min: process.env.DB_POOL_MIN || '2'
    }
  };
}
