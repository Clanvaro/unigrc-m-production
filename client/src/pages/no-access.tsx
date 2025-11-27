import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, LogOut, Mail } from "lucide-react";
import { useLocation } from "wouter";

export default function NoAccess() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user?.isPlatformAdmin) {
      setLocation("/platform-admin");
    }
  }, [user, setLocation]);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <CardTitle className="text-2xl">No Tienes Acceso</CardTitle>
          <CardDescription className="text-base">
            Tu cuenta no está asignada a ninguna organización
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Has iniciado sesión exitosamente, pero tu cuenta aún no tiene acceso a ninguna organización en UniGRC.
            </p>
            {user && (
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Usuario: {user.email}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-start space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Mail className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Contacta al administrador de tu organización para que te agregue como usuario autorizado.
              </p>
            </div>
          </div>

          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
