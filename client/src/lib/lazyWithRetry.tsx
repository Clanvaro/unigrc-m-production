import { lazy, ComponentType } from 'react';

// Track if we've already prompted for reload to avoid spam
let hasPromptedReload = false;

/**
 * Extract module name from the import function string or error message
 */
function extractModuleName(importFn: () => Promise<any>, error?: Error): string {
  // Try to extract from error message (contains the actual URL)
  if (error?.message) {
    // Match patterns like: /assets/risk-events-CqPkqwui.js or risk-events.tsx
    const urlMatch = error.message.match(/\/assets\/([^-]+)/);
    if (urlMatch) return urlMatch[1];
    
    const fileMatch = error.message.match(/([a-z-]+)(?:-[A-Za-z0-9]+)?\.(?:js|tsx?)/i);
    if (fileMatch) return fileMatch[1];
  }
  
  // Try to extract from import function string (works in dev, may not in prod)
  const fnStr = importFn.toString();
  const patterns = [
    /@\/pages\/([^"')\s]+)/,      // @/pages/risk-events
    /pages\/([^"')\s]+)/,          // pages/risk-events  
    /import\("([^"]+)"\)/,         // import("...")
    /import\('([^']+)'\)/,         // import('...')
  ];
  
  for (const pattern of patterns) {
    const match = fnStr.match(pattern);
    if (match) {
      // Extract just the page name from the path
      const path = match[1];
      const name = path.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '');
      if (name) return name;
    }
  }
  
  return 'página';
}

/**
 * Check if error indicates the module file doesn't exist
 * This happens when:
 * 1. 404 response (file not found)
 * 2. MIME type error (server returns HTML instead of JS - SPA fallback for 404)
 * 3. Failed to fetch dynamically imported module
 */
function isModuleNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  const msg = error.message.toLowerCase();
  
  return (
    // Direct 404 indicators
    msg.includes('404') ||
    // MIME type error (server returned HTML fallback for missing JS file)
    msg.includes('mime type') ||
    msg.includes('text/html') ||
    // Vite/webpack dynamic import failures
    msg.includes('failed to fetch dynamically imported module') ||
    // Module resolution failures
    (msg.includes('failed to fetch') && msg.includes('module'))
  );
}

/**
 * Check if error is a transient network error that might recover on retry
 */
function isTransientNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  const msg = error.message.toLowerCase();
  
  // These are transient errors that might recover
  return (
    msg.includes('networkerror') ||
    msg.includes('network error') ||
    msg.includes('loading chunk') ||
    msg.includes('loading css chunk') ||
    msg.includes('timeout') ||
    msg.includes('aborted') ||
    // Generic fetch failures (not module-specific) might be network issues
    (msg.includes('failed to fetch') && !msg.includes('module') && !msg.includes('mime'))
  );
}

/**
 * Wrapper for lazy imports with automatic retry on failure
 * Handles "Failed to fetch dynamically imported module" errors
 * by retrying the import with exponential backoff
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retries = 2,
  delay = 500
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const module = await importFn();
        return module;
      } catch (error) {
        lastError = error as Error;
        const moduleName = extractModuleName(importFn, lastError);
        
        // Module not found errors (404, MIME type) - don't retry, offer reload
        if (isModuleNotFoundError(error)) {
          // Only log once to avoid console spam
          if (!hasPromptedReload) {
            hasPromptedReload = true;
            console.warn(
              `[LazyLoad] Módulo "${moduleName}" no encontrado. Esto ocurre cuando hay una nueva versión de la aplicación.`
            );
          }
          
          // Throw a user-friendly error that will be caught by ErrorBoundary
          const friendlyError = new Error(
            `Nueva versión disponible. Por favor recarga la página.`
          );
          friendlyError.name = 'ChunkLoadError';
          throw friendlyError;
        }
        
        // Transient network errors - retry with backoff
        if (isTransientNetworkError(error) && attempt < retries) {
          const waitTime = delay * Math.pow(2, attempt);
          console.debug(
            `[LazyLoad] Reintentando cargar "${moduleName}" (${attempt + 1}/${retries + 1}) en ${waitTime}ms...`
          );
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // Unknown error or retries exhausted - throw
        throw error;
      }
    }
    
    // This should never be reached, but TypeScript needs it
    throw lastError || new Error('Failed to load module after retries');
  });
}

