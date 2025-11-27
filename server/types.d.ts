import 'express-session';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      username?: string;
      firstName?: string;
      lastName?: string;
      fullName?: string;
      isPlatformAdmin?: boolean;
      activeTenantId?: string;
      permissions?: string[];
      
      // OAuth/OIDC fields
      claims?: any;
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    activeTenantId?: string;
    switchedUserId?: string;
  }
}

export {};
