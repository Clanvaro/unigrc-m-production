// Load environment variables FIRST before any other imports
import dotenv from "dotenv";
dotenv.config();

// Now import everything else after env vars are loaded
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes, warmCacheForAllTenants } from "./routes";
import { serveStatic, log } from "./static";
import { performanceMiddleware, errorLoggingMiddleware } from "./middleware/performance";
import { logger } from "./logger";
import {
  validateRequiredSecrets,
  helmetConfig,
  corsConfig,
  globalRateLimiter
} from "./security";
import cors from "cors";
import {
  inputSanitizer,
  validateContentType,
  payloadSizeLimit
} from "./validation/input-sanitizer";
import { responseSanitizer } from "./validation/output-sanitizer";
import { applyPerformanceOptimizations } from "./performance";
// OPTIMIZED: Lazy load openAIService - only needed for status check at startup
// import { openAIService } from "./openai-service";
import { initializeQueues } from "./services/queue";
import { requestTimeoutMiddleware } from "./middleware/request-timeout";

// Validate required secrets before starting server
validateRequiredSecrets();

// Memory optimization check
// IMPORTANT: Memory limits must be set when Node.js starts (not at runtime)
// Configured in package.json "start" script: NODE_OPTIONS='--max-old-space-size=1024'
const hasMemoryLimitInExecArgv = process.execArgv.some(arg => arg.includes('max-old-space-size'));
const hasMemoryLimitInEnv = process.env.NODE_OPTIONS?.includes('max-old-space-size');

if (hasMemoryLimitInExecArgv) {
  const memoryFlag = process.execArgv.find(arg => arg.includes('max-old-space-size'));
  console.log(`✅ [MEMORY] Memory limit configured: ${memoryFlag}`);
} else if (hasMemoryLimitInEnv) {
  console.log(`ℹ️  [MEMORY] Memory limit configured via NODE_OPTIONS (--max-old-space-size=1024)`);
} else if (process.env.NODE_ENV === 'production') {
  // Neither execArgv nor NODE_OPTIONS env var has the limit - warn about potential issue
  console.warn('⚠️  [MEMORY] No memory limit detected. For production, set NODE_OPTIONS="--max-old-space-size=1024" in your start command or deployment config.');
}

const app = express();

// Set Express environment based on NODE_ENV (critical for production)
// This ensures app.get("env") matches NODE_ENV
if (process.env.NODE_ENV) {
  app.set("env", process.env.NODE_ENV);
  console.log(`🌍 [ENV] Express environment: ${app.get("env")}`);
}

// Disable ETag to prevent 304 Not Modified issues with fresh data
app.set('etag', false);

// 🚀 Apply performance optimizations (compression, caching, monitoring)
applyPerformanceOptimizations(app);

// Trust proxy for correct protocol/host detection
// Required for: CSRF, rate limiting, HTTPS detection
// AWS: Set to number of proxies (ALB=1, CloudFront+ALB=2)
const proxyCount = process.env.TRUST_PROXY_COUNT ? parseInt(process.env.TRUST_PROXY_COUNT, 10) : 1;
app.set('trust proxy', proxyCount);

// Security headers (Helmet.js)
app.use(helmetConfig);

// CORS configuration
app.use(cors(corsConfig));

// Global rate limiting
app.use(globalRateLimiter);

// Request timeout middleware - prevents requests from hanging indefinitely
// Must be early in the middleware chain but after rate limiting
app.use(requestTimeoutMiddleware);

// Payload size limit (AWS ALB compatible - 900KB limit)
// SKIP for file upload endpoints - they need raw stream for Multer
app.use((req, res, next) => {
  if (req.path.includes('/upload') && req.method === 'POST') {
    return next(); // Skip payload limit for uploads
  }
  payloadSizeLimit(900)(req, res, next);
});

// Body parsing middleware with size limits
// SKIP for file upload endpoints - Multer needs raw stream
app.use((req, res, next) => {
  if (req.path.includes('/upload') && req.method === 'POST') {
    return next(); // Skip body parsing for uploads
  }
  express.json({ limit: '1mb' })(req, res, () => {
    express.urlencoded({ extended: false, limit: '1mb' })(req, res, next);
  });
});

// Input sanitization (XSS, NoSQL injection prevention)
// SKIP for file upload endpoints - no body to sanitize yet
app.use((req, res, next) => {
  if (req.path.includes('/upload') && req.method === 'POST') {
    return next(); // Skip sanitization for uploads
  }
  inputSanitizer(req, res, next);
});

// Content-Type validation for POST/PUT/PATCH requests
app.use(validateContentType(['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded']));

// Output sanitization for all responses
app.use(responseSanitizer);

app.use(cookieParser());

// Note: Cache headers are now managed by performance optimization module
// Development mode: Caching disabled for debugging
// Production mode: Optimized CDN-friendly cache headers applied

// Performance monitoring middleware
app.use(performanceMiddleware);

// Legacy logging for backwards compatibility
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // OPTIMIZED: Queues are now lazy - initialization happens on first access via getters
  // await initializeQueues(); // Removed - now lazy via getters

  const server = await registerRoutes(app);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    try {
      // Dynamic import to prevent Vite from being included in production build
      const { setupVite } = await import("./vite");
      await setupVite(app, server);
    } catch (error) {
      console.warn("⚠️ Could not load Vite dev server. Running in production mode.");
      serveStatic(app);
    }
  } else {
    serveStatic(app);
  }

  // Global error handling middleware (must be after static files)
  app.use(errorLoggingMiddleware);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  // Use 0.0.0.0 in production (required for Render/cloud deployments)
  // Use 127.0.0.1 in development (avoids macOS AirPlay Receiver conflict on port 5000)
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';

  // Graceful shutdown handler
  let isShuttingDown = false;
  let activeConnections = new Set<any>();

  // Track active connections for graceful shutdown
  server.on('connection', (socket: any) => {
    activeConnections.add(socket);
    socket.on('close', () => {
      activeConnections.delete(socket);
    });
  });

  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) {
      console.log(`⚠️ Shutdown already in progress, forcing exit...`);
      process.exit(1);
      return;
    }

    isShuttingDown = true;
    console.log(`📴 Received ${signal}, starting graceful shutdown...`);

    // 1. Stop accepting new connections
    server.close(() => {
      console.log('✅ HTTP server closed - no longer accepting new connections');
    });

    // 2. Close all active connections (give them time to finish)
    const closeConnections = () => {
      activeConnections.forEach((socket: any) => {
        socket.destroy();
      });
      activeConnections.clear();
    };

    // 3. Wait for active requests to finish (max 10 seconds)
    const shutdownTimeout = setTimeout(() => {
      console.log('⚠️ Shutdown timeout reached, forcing close of active connections...');
      closeConnections();
      process.exit(1);
    }, 10000);

    // 4. Close database pool (already handled in db.ts)
    try {
      const { pool } = await import('./db');
      if (pool) {
        console.log('🔄 Closing database pool...');
        await pool.end();
        console.log('✅ Database pool closed');
      }
    } catch (error) {
      console.warn('⚠️ Error closing database pool:', error);
    }

    // 5. Close queues (already handled in services/queue.ts)
    try {
      const { emailWorker, pdfWorker, aiWorker } = await import('./services/queue');
      const closePromises = [];
      if (emailWorker) closePromises.push(emailWorker.close());
      if (pdfWorker) closePromises.push(pdfWorker.close());
      if (aiWorker) closePromises.push(aiWorker.close());
      await Promise.all(closePromises);
      console.log('✅ Queue workers closed');
    } catch (error) {
      console.warn('⚠️ Error closing queue workers:', error);
    }

    // 6. Close active connections and exit
    clearTimeout(shutdownTimeout);
    closeConnections();
    console.log('✅ Graceful shutdown complete');
    process.exit(0);
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle unhandled errors
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('❌ Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
    
    // In production, attempt graceful shutdown
    if (process.env.NODE_ENV === 'production') {
      console.error('⚠️ Attempting graceful shutdown due to unhandled rejection...');
      gracefulShutdown('UNHANDLED_REJECTION').catch(() => {
        console.error('❌ Graceful shutdown failed, forcing exit...');
        process.exit(1);
      });
    }
  });

  process.on('uncaughtException', (error: Error) => {
    console.error('❌ Uncaught Exception:', error);
    console.error('Stack:', error.stack);
    
    // In production, attempt graceful shutdown
    if (process.env.NODE_ENV === 'production') {
      console.error('⚠️ Attempting graceful shutdown due to uncaught exception...');
      gracefulShutdown('UNCAUGHT_EXCEPTION').catch(() => {
        console.error('❌ Graceful shutdown failed, forcing exit...');
        process.exit(1);
      });
    } else {
      // In development, just exit to allow restart
      process.exit(1);
    }
  });

  server.listen({
    port,
    host,
  }, async () => {
    log(`serving on port ${port} (host: ${host})`);
    console.log('✅ Graceful shutdown handlers registered');

    // OPTIMIZED: Lazy load OpenAI Service - only check status if needed
    try {
      const { openAIService } = await import("./openai-service");
      const aiStatus = openAIService.getStatus();
      if (aiStatus.ready) {
        console.log(`✅ OpenAI Service ready with model: ${aiStatus.deployment}`);
      } else {
        console.warn('⚠️ OpenAI Service not configured. AI features will be disabled.');
      }
    } catch (error) {
      console.warn('⚠️ Could not load OpenAI Service:', error);
    }

    // OPTIMIZED: Cache warming is now lazy - triggered by getFromTieredCache on first access
    // // Warm cache in background (non-blocking) after server is ready
    // // This pre-loads common data to Redis to eliminate cold cache latency on first load
    // setTimeout(() => {
    //   warmCacheForAllTenants().catch((error) => {
    //     console.warn('⚠️ Background cache warming failed:', error);
    //   });
    // }, 2000); // Wait 2s for DB pool to stabilize before warming cache
  });
})();
