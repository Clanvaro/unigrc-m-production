import { lazy, ComponentType } from 'react';

/**
 * Wrapper for lazy imports with automatic retry on failure
 * Handles "Failed to fetch dynamically imported module" errors
 * by retrying the import with exponential backoff
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retries = 3,
  delay = 1000
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const module = await importFn();
        return module;
      } catch (error) {
        lastError = error as Error;
        
        // Check if it's a 404 error (module not found) - don't retry these
        const is404Error = 
          error instanceof TypeError && 
          (error.message.includes('404') || 
           error.message.includes('Failed to fetch dynamically imported module') ||
           (error.message.includes('Failed to fetch') && 
            (error.message.includes('not found') || error.message.includes('404'))));
        
        // If it's a 404 error, don't retry - the module doesn't exist
        if (is404Error) {
          const moduleName = importFn.toString().match(/@\/pages\/([^"']+)/)?.[1] || 'unknown';
          console.error(
            `[LazyLoad] Module not found (404): ${moduleName}. This may indicate a build/deployment issue.`,
            error
          );
          throw new Error(`Module "${moduleName}" not found. Please verify the build is complete and try refreshing the page.`);
        }
        
        // Check if it's a network/module loading error (transient errors that might recover)
        const isNetworkError = 
          error instanceof TypeError && 
          (error.message.includes('Failed to fetch') || 
           error.message.includes('dynamically imported module') ||
           error.message.includes('Loading chunk') ||
           error.message.includes('Loading CSS chunk') ||
           error.message.includes('NetworkError') ||
           error.message.includes('network'));
        
        if (!isNetworkError || attempt === retries) {
          // If it's not a network error or we've exhausted retries, throw
          throw error;
        }
        
        // Exponential backoff: delay * 2^attempt
        const waitTime = delay * Math.pow(2, attempt);
        const moduleName = importFn.toString().match(/@\/pages\/([^"']+)/)?.[1] || 'unknown';
        console.warn(
          `[LazyLoad] Failed to load module "${moduleName}" (attempt ${attempt + 1}/${retries + 1}), retrying in ${waitTime}ms...`,
          error
        );
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // This should never be reached, but TypeScript needs it
    throw lastError || new Error('Failed to load module after retries');
  });
}

