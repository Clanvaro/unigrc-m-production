// CSRF token cache management utilities
// Separated from hooks to avoid mixed static/dynamic imports

// Store CSRF token in memory (shared across all components)
let cachedToken: string | null = null;
let tokenFetchPromise: Promise<string> | null = null;

interface CSRFTokenResponse {
  csrfToken?: string;
  message?: string;
  cookieName?: string;
}

// Fetch CSRF token from server
export async function fetchCSRFToken(): Promise<string> {
  // Return cached token if available
  if (cachedToken) {
    return cachedToken;
  }

  // If a fetch is already in progress, wait for it
  if (tokenFetchPromise) {
    return tokenFetchPromise;
  }

  // Start new fetch
  tokenFetchPromise = (async () => {
    try {
      const response = await fetch('/api/csrf-token', {
        credentials: 'include', // Important: include cookies
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.statusText}`);
      }

      const data: CSRFTokenResponse = await response.json();
      
      // Store the token value from the response as backup
      // This is useful if cookies don't work properly
      if (data.csrfToken) {
        cachedToken = data.csrfToken;
      } else {
        // Fallback: just indicate the cookie should be set
        cachedToken = 'csrf-token-set-in-cookie';
      }
      
      return cachedToken;
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
      throw error;
    } finally {
      tokenFetchPromise = null;
    }
  })();

  return tokenFetchPromise;
}

// Get CSRF token from cookie (for use in requests)
export function getCSRFTokenFromCookie(): string | null {
  // Try both cookie names (production uses __Host- prefix, development doesn't)
  const cookieNames = ['__Host-psifi.x-csrf-token', 'psifi.x-csrf-token'];
  const cookies = document.cookie.split(';');
  
  // First, try to get the token from cookies
  for (const cookieName of cookieNames) {
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === cookieName) {
        return decodeURIComponent(value);
      }
    }
  }
  
  // If cookie not found, fall back to memory-cached token
  if (cachedToken && cachedToken !== 'csrf-token-set-in-cookie') {
    return cachedToken;
  }
  
  return null;
}

// Get cached token (used by hook)
export function getCachedToken(): string | null {
  return cachedToken;
}

// Set cached token (used by hook)
export function setCachedToken(token: string | null): void {
  cachedToken = token;
}

// Clear cached CSRF token (useful when token becomes invalid)
export function clearCSRFTokenCache(): void {
  cachedToken = null;
  tokenFetchPromise = null;
}

// Ensure CSRF token is initialized on app load
export function initializeCSRFToken(): Promise<string> {
  return fetchCSRFToken();
}
