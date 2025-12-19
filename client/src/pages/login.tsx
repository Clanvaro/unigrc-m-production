import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Lock, Mail } from 'lucide-react';
import { fetchCSRFToken, getCSRFTokenFromCookie } from '@/lib/csrf-cache';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();

  // Check for error in URL query params (from OAuth redirects)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        'auth_failed': 'Error al autenticar con Microsoft. Por favor intenta nuevamente.',
        'auth_no_user': 'No se pudo obtener la información del usuario de Microsoft.',
        'account_deactivated': 'Tu cuenta ha sido desactivada. Contacta al administrador.',
      };
      setError(errorMessages[errorParam] || 'Error al iniciar sesión. Por favor intenta nuevamente.');
      // Clean URL
      window.history.replaceState({}, '', '/login');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Fetch CSRF token first
      await fetchCSRFToken();
      const csrfToken = getCSRFTokenFromCookie();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add CSRF token if available (needed for production)
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await response.json();
      
      // Log for debugging
      console.log('Login response:', response.status, data);

      if (!response.ok) {
        setError(data.message || 'Error al iniciar sesión');
        setLoading(false);
        return;
      }

      // Check if authentication was successful
      if (data.authenticated === true) {
        // Redirect based on user type
        if (data.isPlatformAdmin) {
          window.location.href = '/platform-admin';
        } else if (data.needsTenantSelection) {
          window.location.href = '/no-access';
        } else {
          window.location.href = '/';
        }
      } else {
        setError(data.message || 'Credenciales inválidas');
        setLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Error de conexión. Por favor intenta nuevamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Lock className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Iniciar Sesión</CardTitle>
          <CardDescription className="text-center">
            Ingresa tu email y contraseña para acceder a UniGRC
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-2">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
            
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">O continúa con</span>
              </div>
            </div>
            
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                window.location.href = '/api/auth/microsoft';
              }}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="11" height="11" fill="#F25022"/>
                <rect x="12" width="11" height="11" fill="#7FBA00"/>
                <rect y="12" width="11" height="11" fill="#00A4EF"/>
                <rect x="12" y="12" width="11" height="11" fill="#FFB900"/>
              </svg>
              Continuar con Microsoft
            </Button>
            
            <div className="text-sm text-center text-gray-500">
              ¿Necesitas ayuda? Contacta al administrador
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
