import { queryClient } from './queryClient';

interface AuthError {
  status: number;
  message: string;
}

// Track auth errors to prevent loops
let authErrorCount = 0;
let lastAuthErrorTime = 0;
const AUTH_ERROR_THRESHOLD = 3;
const AUTH_ERROR_WINDOW = 5000; // 5 seconds

// Auth state listeners
const authListeners: Array<(isAuthenticated: boolean) => void> = [];

export function onAuthStateChange(listener: (isAuthenticated: boolean) => void) {
  authListeners.push(listener);
  return () => {
    const index = authListeners.indexOf(listener);
    if (index > -1) {
      authListeners.splice(index, 1);
    }
  };
}

function notifyAuthStateChange(isAuthenticated: boolean) {
  authListeners.forEach(listener => listener(isAuthenticated));
}

// Handle authentication errors
export function handleAuthError(error: AuthError): void {
  const now = Date.now();
  
  // Reset count if outside the error window
  if (now - lastAuthErrorTime > AUTH_ERROR_WINDOW) {
    authErrorCount = 0;
  }
  
  authErrorCount++;
  lastAuthErrorTime = now;
  
  // If multiple auth errors in short time, session is expired
  if (authErrorCount >= AUTH_ERROR_THRESHOLD && error.status === 401) {
    handleSessionExpired();
  }
}

// Handle session expiration (exported for direct use in auth queries)
export function handleSessionExpired(): void {
  console.warn('🔐 Session expired, redirecting to login...');
  
  // Clear all cached data
  queryClient.clear();
  
  // Notify listeners
  notifyAuthStateChange(false);
  
  // Store current path for redirect after login
  const currentPath = window.location.pathname;
  if (currentPath !== '/login' && currentPath !== '/') {
    sessionStorage.setItem('redirectAfterLogin', currentPath);
  }
  
  // Redirect to login
  window.location.href = '/login';
}

// Reset auth error tracking
export function resetAuthErrors(): void {
  authErrorCount = 0;
  lastAuthErrorTime = 0;
}

// Check if user is authenticated
export async function checkAuthStatus(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/check', {
      credentials: 'include'
    });
    
    if (response.ok) {
      resetAuthErrors();
      notifyAuthStateChange(true);
      return true;
    } else if (response.status === 401) {
      notifyAuthStateChange(false);
      return false;
    }
    
    return false;
  } catch (error) {
    console.error('Auth check failed:', error);
    return false;
  }
}

// Attempt to refresh session
export async function refreshSession(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include'
    });
    
    if (response.ok) {
      resetAuthErrors();
      notifyAuthStateChange(true);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Session refresh failed:', error);
    return false;
  }
}

// Periodic auth check (every 5 minutes)
let authCheckInterval: NodeJS.Timeout | null = null;

export function startAuthMonitoring(): void {
  if (authCheckInterval) return;
  
  authCheckInterval = setInterval(async () => {
    const isAuth = await checkAuthStatus();
    if (!isAuth) {
      // Try to refresh before giving up
      const refreshed = await refreshSession();
      if (!refreshed) {
        handleSessionExpired();
      }
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
}

export function stopAuthMonitoring(): void {
  if (authCheckInterval) {
    clearInterval(authCheckInterval);
    authCheckInterval = null;
  }
}

// Enhanced fetch with auth error handling
export async function fetchWithAuth(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include'
  });
  
  if (response.status === 401) {
    handleAuthError({ status: 401, message: 'Unauthorized' });
  }
  
  return response;
}
