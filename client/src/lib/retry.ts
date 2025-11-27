interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  shouldRetry?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  shouldRetry: (error: Error) => {
    // Retry on network errors and 5xx server errors
    if (error.message.includes('Failed to fetch')) return true;
    if (error.message.includes('NetworkError')) return true;
    if (error.message.includes('500')) return true;
    if (error.message.includes('502')) return true;
    if (error.message.includes('503')) return true;
    if (error.message.includes('504')) return true;
    return false;
  },
  onRetry: () => {}
};

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: Error;
  let currentDelay = opts.initialDelay;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if it's the last attempt or if shouldn't retry
      if (attempt === opts.maxAttempts || !opts.shouldRetry(lastError)) {
        throw lastError;
      }

      // Call onRetry callback
      opts.onRetry(attempt, lastError);

      // Wait before retrying with exponential backoff
      await delay(currentDelay);

      // Increase delay for next attempt
      currentDelay = Math.min(
        currentDelay * opts.backoffFactor,
        opts.maxDelay
      );
    }
  }

  throw lastError!;
}

export function createRetryWrapper(defaultOptions: RetryOptions = {}) {
  return <T>(operation: () => Promise<T>, options?: RetryOptions) =>
    withRetry(operation, { ...defaultOptions, ...options });
}

// Specific retry configurations for different scenarios
export const retryConfigs = {
  // For critical mutations
  critical: {
    maxAttempts: 5,
    initialDelay: 500,
    maxDelay: 5000,
    backoffFactor: 2
  },
  
  // For data fetching
  fetch: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 5000,
    backoffFactor: 2
  },
  
  // For authentication
  auth: {
    maxAttempts: 2,
    initialDelay: 2000,
    maxDelay: 5000,
    backoffFactor: 1.5,
    shouldRetry: (error: Error) => {
      // Only retry on network errors, not auth errors
      return error.message.includes('Failed to fetch') || 
             error.message.includes('NetworkError');
    }
  }
};

// Enhanced fetch with retry
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  return withRetry(
    () => fetch(url, options),
    { ...retryConfigs.fetch, ...retryOptions }
  );
}
