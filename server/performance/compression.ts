import { Request, Response, NextFunction } from 'express';
import compression from 'compression';

/**
 * Compression Middleware Configuration
 * Optimized for AWS deployment with CloudFront CDN
 */

const isProduction = process.env.NODE_ENV === 'production';

// Compression options - Optimized for Reserved VM 1 CPU 2GB
export const compressionOptions: compression.CompressionOptions = {
  // Compression level (0-9): 4 is faster for 1 CPU VM (reduced from 6)
  level: isProduction ? 4 : 3,
  
  // Only compress responses above 1KB
  threshold: 1024,
  
  // Custom filter to determine what to compress
  filter: (req: Request, res: Response) => {
    // Don't compress if explicitly disabled
    if (req.headers['x-no-compression']) {
      return false;
    }

    // Don't compress already compressed content
    const contentType = res.getHeader('Content-Type') as string;
    if (contentType && /^(image|video|audio)/.test(contentType)) {
      return false;
    }

    // Compress text-based responses
    return compression.filter(req, res);
  },
  
  // Memory level (1-9): 6 balances memory usage for 2GB VM (reduced from 8)
  memLevel: isProduction ? 6 : 5,
  
  // Window bits for zlib
  windowBits: 15,
  
  // Strategy: Z_DEFAULT_STRATEGY is good for most content
  strategy: 0
};

// Middleware factory
export function createCompressionMiddleware() {
  return compression(compressionOptions);
}

// Response size monitoring middleware
export function responseSizeMonitor(req: Request, res: Response, next: NextFunction) {
  const originalSend = res.send;
  const originalJson = res.json;

  res.send = function(data: any) {
    if (data) {
      const size = Buffer.byteLength(JSON.stringify(data));
      res.setHeader('X-Response-Size', size.toString());
      
      // Log large responses in production
      if (isProduction && size > 900000) { // 900KB (AWS ALB limit consideration)
        console.warn(`Large response detected: ${size} bytes for ${req.method} ${req.path}`);
      }
    }
    return originalSend.call(this, data);
  };

  res.json = function(data: any) {
    if (data) {
      const size = Buffer.byteLength(JSON.stringify(data));
      res.setHeader('X-Response-Size', size.toString());
      
      if (isProduction && size > 900000) {
        console.warn(`Large JSON response: ${size} bytes for ${req.method} ${req.path}`);
      }
    }
    return originalJson.call(this, data);
  };

  next();
}

// CDN-friendly cache headers
export function setCacheHeaders(req: Request, res: Response, next: NextFunction) {
  const path = req.path;

  // Static assets - cache for 1 year
  if (/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/.test(path)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('CDN-Cache-Control', 'public, max-age=31536000');
  }
  
  // API responses - cache based on endpoint
  else if (path.startsWith('/api/')) {
    // Dashboard and analytics - cache for 5 minutes
    if (path.includes('/dashboard') || path.includes('/analytics')) {
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
      res.setHeader('CDN-Cache-Control', 'public, max-age=600');
    }
    
    // Static configuration data - cache for 15 minutes
    else if (path.includes('/config') || path.includes('/categories')) {
      res.setHeader('Cache-Control', 'public, max-age=900, s-maxage=1800');
      res.setHeader('CDN-Cache-Control', 'public, max-age=1800');
    }
    
    // Real-time/mutable data - cache for 1 minute
    else if (path.includes('/risks') || path.includes('/controls')) {
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120');
      res.setHeader('CDN-Cache-Control', 'public, max-age=120');
    }
    
    // Default API cache - 2 minutes
    else {
      res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=240');
      res.setHeader('CDN-Cache-Control', 'public, max-age=240');
    }
    
    // Add ETag for conditional requests
    res.setHeader('ETag', 'true');
  }
  
  // HTML pages - no cache (always fresh)
  else {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }

  next();
}

// Conditional request handling (304 Not Modified)
export function handleConditionalRequests(req: Request, res: Response, next: NextFunction) {
  const ifNoneMatch = req.headers['if-none-match'];
  const currentEtag = res.getHeader('ETag');

  if (ifNoneMatch && currentEtag && ifNoneMatch === currentEtag) {
    return res.status(304).end();
  }

  next();
}
