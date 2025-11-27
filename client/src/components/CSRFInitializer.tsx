import { useCSRFToken } from '@/hooks/use-csrf-token';

export function CSRFInitializer() {
  // Initialize CSRF token on mount
  useCSRFToken();
  
  // This component doesn't render anything
  return null;
}
