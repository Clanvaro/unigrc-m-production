import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export function serveStatic(app: Express) {
  // In production (bundled), look for dist/public
  // In development, look for client folder (Vite dev server handles it)
  const isProduction = process.env.NODE_ENV === "production";
  
  // Log environment info for debugging
  log(`NODE_ENV: ${process.env.NODE_ENV}`, "static");
  log(`isProduction: ${isProduction}`, "static");
  log(`process.cwd(): ${process.cwd()}`, "static");
  
  const distPath = isProduction 
    ? path.resolve(process.cwd(), "dist", "public")
    : path.resolve(import.meta.dirname, "public");

  log(`Resolved distPath: ${distPath}`, "static");
  
  // NOTE: Las operaciones síncronas de fs (existsSync, readdirSync) aquí son aceptables
  // porque esta función solo se ejecuta UNA VEZ al inicio del servidor, no en rutas de API.
  // No bloquean el hilo principal durante el procesamiento de requests.
  // List files in the dist directory for debugging
  if (isProduction) {
    try {
      const distDir = path.resolve(process.cwd(), "dist");
      if (fs.existsSync(distDir)) {
        const files = fs.readdirSync(distDir);
        log(`Files in dist/: ${files.join(", ")}`, "static");
      } else {
        log(`dist/ directory does not exist at ${distDir}`, "static");
      }
    } catch (e) {
      log(`Error listing dist/: ${e}`, "static");
    }
  }

  if (!fs.existsSync(distPath)) {
    log(`Build directory not found: ${distPath}`, "static");
    if (isProduction) {
      throw new Error(
        `Could not find the build directory: ${distPath}, make sure to build the client first`,
      );
    }
    return; // In dev, Vite handles serving
  }

  // Check if index.html exists - critical for SPA routing
  const indexHtmlPath = path.resolve(distPath, "index.html");
  const hasIndexHtml = fs.existsSync(indexHtmlPath);
  if (!hasIndexHtml) {
    log(`WARNING: index.html not found at ${indexHtmlPath}. SPA routing will not work on this server.`, "static");
    log(`This backend instance is API-only. Frontend routes should be handled by Firebase Hosting or another frontend server.`, "static");
  }

  // List files in public for debugging
  try {
    const publicFiles = fs.readdirSync(distPath);
    log(`Files in ${distPath}: ${publicFiles.join(", ")}`, "static");
  } catch (e) {
    log(`Error listing public files: ${e}`, "static");
  }

  log(`Serving static files from: ${distPath}`, "static");

  // Serve static assets with appropriate cache headers
  app.use(express.static(distPath, {
    setHeaders: (res, filepath) => {
      // Log para debugging de errores 403
      console.log(`[STATIC] Serving file: ${filepath}`);
      
      // For index.html: always revalidate to get latest version
      if (filepath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      // For favicon.ico: cache aggressively (1 year) to eliminate redundant requests
      else if (filepath.endsWith('favicon.ico')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      // For hashed assets (main.abc123.js): cache aggressively since hash changes when content changes
      else if (/\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|ico)$/.test(filepath)) {
        // Check if file has hash in name (Vite adds hashes like: main.abc123.js)
        if (/\.[a-f0-9]{8,}\.(js|css)$/.test(filepath)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          // Non-hashed assets: short cache with revalidation
          res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
        }
      }
    }
  }));

  // fall through to index.html if the file doesn't exist
  // CRITICAL: Only catch non-API routes to avoid interfering with API endpoints
  app.use((req, res, next) => {
    // Skip API routes - they need to go through registerRoutes
    if (req.path.startsWith('/api/')) {
      return next();
    }
    
    // For non-API routes, serve index.html for SPA routing
    console.log(`[STATIC] Fallback to index.html for: ${req.path}`);
    
    // If index.html doesn't exist, this is an API-only backend
    // Return a helpful message instead of a cryptic 404
    if (!hasIndexHtml) {
      console.log(`[STATIC] No index.html available - this is an API-only backend`);
      // Return 404 with a clear message for frontend routes
      return res.status(404).json({
        error: "Frontend not available on this server",
        message: "This backend serves API endpoints only. Frontend routes should be served by Firebase Hosting.",
        path: req.path,
        suggestion: "If you're seeing this error, ensure your request is routed to the correct frontend server."
      });
    }
    
    // Always send fresh index.html for SPA routing
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}