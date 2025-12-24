import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

// Lazy import to avoid circular dependency - cached after first load
let systemMetricsModule: typeof import('./system-metrics') | null = null;
let systemMetricsLoaded = false;

// Load system metrics module once (non-blocking)
function ensureSystemMetricsLoaded() {
  if (!systemMetricsLoaded && !systemMetricsModule) {
    systemMetricsLoaded = true; // Mark as loading to prevent multiple loads
    import('./system-metrics').then(module => {
      systemMetricsModule = module;
    }).catch(() => {
      // Ignore if not available
      systemMetricsLoaded = false;
    });
  }
}

// Initialize on module load
ensureSystemMetricsLoaded();

interface PerformanceMetrics {
  endpoint: string;
  method: string;
  avgDuration: number;
  maxDuration: number;
  minDuration: number;
  p95Duration: number;
  p99Duration: number;
  count: number;
  errorCount: number;
  durations: number[];
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private slowThreshold = 1000; // ms
  private verySlowThreshold = 3000; // ms
  private globalRequestCount = 0;
  private globalErrorCount = 0;
  private startTime = Date.now();
  private recentRequests: { timestamp: number; duration: number }[] = [];
  private maxRecentRequests = 1000; // Keep last 1000 requests for metrics

  recordRequest(method: string, endpoint: string, duration: number, isError: boolean = false): void {
    const key = `${method}:${endpoint}`;
    const existing = this.metrics.get(key);

    this.globalRequestCount++;
    if (isError) {
      this.globalErrorCount++;
    }

    // Track recent requests for time-based metrics
    this.recentRequests.push({ timestamp: Date.now(), duration });
    if (this.recentRequests.length > this.maxRecentRequests) {
      this.recentRequests.shift();
    }

    if (existing) {
      const newCount = existing.count + 1;
      const newErrorCount = existing.errorCount + (isError ? 1 : 0);
      const updatedDurations = [...existing.durations, duration].slice(-100); // Keep last 100 for P95
      
      this.metrics.set(key, {
        endpoint,
        method,
        avgDuration: (existing.avgDuration * existing.count + duration) / newCount,
        maxDuration: Math.max(existing.maxDuration, duration),
        minDuration: Math.min(existing.minDuration, duration),
        p95Duration: this.calculateP95(updatedDurations),
        p99Duration: this.calculateP99(updatedDurations),
        count: newCount,
        errorCount: newErrorCount,
        durations: updatedDurations
      });
    } else {
      this.metrics.set(key, {
        endpoint,
        method,
        avgDuration: duration,
        maxDuration: duration,
        minDuration: duration,
        p95Duration: duration,
        p99Duration: duration,
        count: 1,
        errorCount: isError ? 1 : 0,
        durations: [duration]
      });
    }

    if (duration > this.verySlowThreshold) {
      logger.error('Very slow endpoint detected', 'PERFORMANCE', {
        method,
        endpoint,
        duration: `${duration}ms`,
        threshold: `${this.verySlowThreshold}ms`
      });
    } else if (duration > this.slowThreshold) {
      logger.warn('Slow endpoint detected', 'PERFORMANCE', {
        method,
        endpoint,
        duration: `${duration}ms`,
        threshold: `${this.slowThreshold}ms`
      });
    }
  }

  private calculateP95(durations: number[]): number {
    if (durations.length === 0) return 0;
    const sorted = [...durations].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * 0.95) - 1;
    return sorted[Math.max(0, index)];
  }

  private calculateP99(durations: number[]): number {
    if (durations.length === 0) return 0;
    const sorted = [...durations].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * 0.99) - 1;
    return sorted[Math.max(0, index)];
  }

  getRequestsPerMinute(): number {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentCount = this.recentRequests.filter(r => r.timestamp > oneMinuteAgo).length;
    return recentCount;
  }

  getGlobalP95(): number {
    const recentDurations = this.recentRequests.map(r => r.duration);
    return this.calculateP95(recentDurations);
  }

  getGlobalP99(): number {
    const recentDurations = this.recentRequests.map(r => r.duration);
    return this.calculateP99(recentDurations);
  }

  getGlobalMetrics() {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    return {
      totalRequests: this.globalRequestCount,
      totalErrors: this.globalErrorCount,
      errorRate: this.globalRequestCount > 0 
        ? ((this.globalErrorCount / this.globalRequestCount) * 100).toFixed(2) + '%'
        : '0%',
      requestsPerMinute: this.getRequestsPerMinute(),
      p95Latency: Math.round(this.getGlobalP95()),
      p99Latency: Math.round(this.getGlobalP99()),
      uptimeSeconds,
      uptimeHuman: this.formatUptime(uptimeSeconds)
    };
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(' ');
  }

  getMetrics(): PerformanceMetrics[] {
    return Array.from(this.metrics.values()).sort((a, b) => b.avgDuration - a.avgDuration);
  }

  getSlowestEndpoints(limit: number = 10): PerformanceMetrics[] {
    return this.getMetrics().slice(0, limit);
  }
}

export const performanceMonitor = new PerformanceMonitor();

export function performanceMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  
  // OPTIMIZED: Track request start synchronously (no async overhead)
  // System metrics module is loaded in background, tracking is optional
  let requestId: number | null = null;
  if (systemMetricsModule) {
    try {
      requestId = systemMetricsModule.trackRequestStart();
    } catch (error) {
      // Ignore if tracking fails - metrics are optional
    }
  }

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const isError = res.statusCode >= 400;
    
    const endpoint = req.route?.path || req.path;
    performanceMonitor.recordRequest(req.method, endpoint, duration, isError);
    
    // OPTIMIZED: Track request end synchronously (no async overhead)
    if (requestId !== null && systemMetricsModule) {
      try {
        systemMetricsModule.trackRequestEnd(requestId);
      } catch (error) {
        // Ignore if tracking fails - metrics are optional
      }
    }
    
    logger.logRequest(req, res, duration);
  });

  next();
}

export function errorLoggingMiddleware(err: Error, req: Request, res: Response, next: NextFunction): void {
  logger.error('Unhandled error in request', 'ERROR', {
    method: req.method,
    url: req.url,
    body: req.body,
    params: req.params,
    query: req.query
  }, err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    message: process.env.NODE_ENV === 'production' 
      ? 'Error interno del servidor' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
}
