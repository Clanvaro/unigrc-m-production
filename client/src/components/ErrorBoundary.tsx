import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Don't spam console for chunk load errors - these are expected during deploys
    const isChunkError = this.isChunkLoadError(error);
    if (!isChunkError) {
      console.error('Error caught by boundary:', error, errorInfo);
    }
    
    this.setState({
      error,
      errorInfo
    });

    if (this.props.onError && !isChunkError) {
      this.props.onError(error, errorInfo);
    }
  }
  
  isChunkLoadError(error: Error | null): boolean {
    if (!error) return false;
    const msg = error.message || '';
    const name = error.name || '';
    return (
      name === 'ChunkLoadError' ||
      msg.includes('Nueva versión disponible') ||
      msg.includes('dynamically imported module') ||
      msg.includes('Loading chunk') ||
      msg.includes('MIME type') ||
      msg.includes('text/html')
    );
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Check if it's a chunk/module loading error (new version available)
      const isChunkError = this.isChunkLoadError(this.state.error);
      
      // Check for other module loading errors
      const isModuleError = !isChunkError && (
        this.state.error?.message?.includes('Failed to fetch dynamically imported module') ||
        this.state.error?.message?.includes('Loading chunk') ||
        this.state.error?.message?.includes('Loading CSS chunk')
      );

      // Special UI for chunk errors - clean and simple
      if (isChunkError) {
        return (
          <div className="min-h-[400px] flex items-center justify-center p-6">
            <Alert className="max-w-md border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
              <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-lg font-semibold mb-2 text-blue-900 dark:text-blue-100">
                Nueva versión disponible
              </AlertTitle>
              <AlertDescription className="space-y-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Hay una actualización de la aplicación. Recarga la página para obtener la última versión.
                </p>
                <Button
                  onClick={this.handleReload}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-chunk-reload"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recargar ahora
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        );
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Alert variant="destructive" className="max-w-2xl">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="text-lg font-semibold mb-2">
              {isModuleError ? 'Error al cargar el módulo' : 'Algo salió mal'}
            </AlertTitle>
            <AlertDescription className="space-y-4">
              <p className="text-sm">
                {isModuleError 
                  ? 'No se pudo cargar un módulo necesario. Esto puede deberse a un problema de red temporal. Por favor, recarga la página.'
                  : 'Ha ocurrido un error inesperado. Por favor, intenta recargar la página.'}
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 p-3 bg-muted rounded-md text-xs">
                  <summary className="cursor-pointer font-semibold mb-2">
                    Detalles técnicos
                  </summary>
                  <pre className="whitespace-pre-wrap overflow-auto max-h-48">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex gap-2 mt-4">
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  size="sm"
                  data-testid="button-error-reset"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Intentar de nuevo
                </Button>
                <Button
                  onClick={this.handleReload}
                  size="sm"
                  data-testid="button-error-reload"
                >
                  Recargar página
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}

export function SectionErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 border border-destructive rounded-md bg-destructive/5">
          <p className="text-sm text-destructive">
            Error al cargar esta sección. Por favor, recarga la página.
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
