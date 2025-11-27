import { useLocation } from "wouter";
import { User as UserIcon, LogIn, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";

export function UserMenu() {
  const { isAuthenticated, user, login, logout, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  if (isLoading) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <UserIcon className="h-4 w-4" />
      </Button>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <Button 
        variant="default" 
        size="sm"
        onClick={login}
        data-testid="button-login"
        className="gap-2"
      >
        <LogIn className="h-4 w-4" />
        <span className="hidden sm:inline">Iniciar Sesión</span>
      </Button>
    );
  }
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          data-testid="button-user-menu"
          className="relative"
        >
          {user?.profileImageUrl ? (
            <img 
              src={user.profileImageUrl} 
              alt={user.fullName || user.email || 'User'} 
              className="h-6 w-6 rounded-full"
            />
          ) : (
            <UserIcon className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm">
          <div className="font-medium">{user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Usuario'}</div>
          <div className="text-muted-foreground">{user?.email}</div>
        </div>
        <DropdownMenuSeparator />
        {user?.isPlatformAdmin && (
          <>
            <DropdownMenuItem 
              onClick={() => setLocation('/platform-admin')}
              data-testid="menu-platform-admin"
              className="cursor-pointer"
            >
              <Shield className="mr-2 h-4 w-4 text-primary" />
              Platform Admin
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem 
          onClick={logout}
          data-testid="menu-logout"
          className="text-red-600 dark:text-red-400 cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
