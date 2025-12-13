/**
 * Request Timeout Middleware
 * Prevents requests from hanging indefinitely by enforcing a global timeout
 */

import type { Request, Response, NextFunction } from 'express';

const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS || String(DEFAULT_TIMEOUT_MS), 10);

/**
 * Middleware to enforce request timeout
 * Automatically responds with 504 if request takes longer than timeout
 */
export function requestTimeoutMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip timeout for health checks, warmup endpoints, and endpoints that manage their own timeouts
  // Endpoints with their own timeout handling:
  // - /api/controls/with-details: Has 25s endpoint timeout and 20s query timeout
  // - /api/processes: Has 10s endpoint timeout and 8s query timeout
  // - /api/process-owners: Has timeout handling
  // - /api/risk-processes/validation/:status: Has 15s endpoint timeout and 10s query timeout
  // - /api/risks/bootstrap: Needs timeout handling (will add)
  // - /api/macroprocesos: Has 10s endpoint timeout and 8s query timeout
  if (req.path === '/health' || 
      req.path === '/api/health' || 
      req.path === '/api/warmup' ||
      req.path === '/api/controls/with-details' ||
      req.path === '/api/processes' ||
      req.path === '/api/process-owners' ||
      req.path.startsWith('/api/risk-processes/validation/') ||
      req.path === '/api/risks/bootstrap' ||
      req.path === '/api/macroprocesos') {
    return next();
  }

  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      console.warn(`⏱️ Request timeout: ${req.method} ${req.path} after ${REQUEST_TIMEOUT_MS}ms`);
      res.status(504).json({
        message: "Request timeout. The server took too long to respond.",
        error: "TIMEOUT",
        timeout: REQUEST_TIMEOUT_MS
      });
    }
  }, REQUEST_TIMEOUT_MS);

  // Clear timeout when response finishes
  const originalEnd = res.end.bind(res);
  res.end = function(...args: any[]) {
    clearTimeout(timeoutId);
    return originalEnd(...args);
  };

  next();
}

/**
 * Express timeout handler (for connect-timeout compatibility)
 * This is a simpler version that works with Express directly
 */
export function handleTimeout(req: Request, res: Response, next: NextFunction): void {
  if ((req as any).timedout) {
    if (!res.headersSent) {
      res.status(504).json({
        message: "Request timeout",
        error: "TIMEOUT"
      });
    }
  } else {
    next();
  }
}

