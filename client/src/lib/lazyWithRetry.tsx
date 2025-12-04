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
        
        // Check if it's a network/module loading error
        const isNetworkError = 
          error instanceof TypeError && 
          (error.message.includes('Failed to fetch') || 
           error.message.includes('dynamically imported module') ||
           error.message.includes('Loading chunk') ||
           error.message.includes('Loading CSS chunk'));
        
        if (!isNetworkError || attempt === retries) {
          // If it's not a network error or we've exhausted retries, throw
          throw error;
        }
        
        // Exponential backoff: delay * 2^attempt
        const waitTime = delay * Math.pow(2, attempt);
        console.warn(
          `[LazyLoad] Failed to load module (attempt ${attempt + 1}/${retries + 1}), retrying in ${waitTime}ms...`,
          error
        );
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // This should never be reached, but TypeScript needs it
    throw lastError || new Error('Failed to load module after retries');
  });
}

