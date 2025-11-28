import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { authCache } from "./auth-cache";

// Check if Replit Auth is properly configured
const isReplitAuthConfigured = () => {
  return !!process.env.REPLIT_DOMAINS;
};

const getOidcConfig = memoize(
  async () => {
    // Use REPL_ID if available, otherwise derive from REPLIT_DOMAINS
    const clientId = process.env.REPL_ID || process.env.REPLIT_DOMAINS?.split(',')[0] || '';
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      clientId
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const isProduction = process.env.NODE_ENV === 'production';
  const pgStore = connectPg(session);
  
  // Use pooled connection for session store for better performance under load
  let databaseUrl = process.env.POOLED_DATABASE_URL || process.env.DATABASE_URL;
  
  // Remove channel_binding parameter if present (can cause issues with some drivers)
  if (databaseUrl) {
    databaseUrl = databaseUrl.replace(/[&?]channel_binding=[^&]*/g, '');
  }
  
  console.log('[Session] Initializing PostgreSQL session store');
  console.log('[Session] Database URL configured:', databaseUrl ? 'Yes (hidden)' : 'No');
  
  const sessionStore = new pgStore({
    conString: databaseUrl,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
    pruneSessionInterval: 24 * 60 * 60, // Auto-cleanup expired sessions every 24 hours (in seconds)
    errorLog: (err: Error) => {
      console.error('[Session Store Error]', err.message);
      console.error('[Session Store Error Stack]', err.stack);
    },
  });
  
  // Log when store is ready
  sessionStore.on?.('connect', () => {
    console.log('[Session] PostgreSQL session store connected');
  });
  
  sessionStore.on?.('error', (err: Error) => {
    console.error('[Session] Store error:', err.message);
  });
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction, // Only require HTTPS in production
      maxAge: sessionTtl,
      sameSite: 'lax', // Lax is required for OAuth flows to work correctly
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  try {
    console.log(`[Replit Auth] upsertUser called with claims:`, JSON.stringify(claims, null, 2));
    
    // First, try to find an existing user by email
    const email = claims["email"];
    console.log(`[Replit Auth] Looking for user with email: ${email}`);
    
    if (email) {
      const existingUser = await storage.getUserByEmail(email);
      console.log(`[Replit Auth] getUserByEmail result:`, existingUser ? `Found: ${existingUser.id}` : 'Not found');
      
      if (existingUser) {
        // Update existing user with Replit Auth info
        console.log(`[Replit Auth] Updating existing user: ${email} (ID: ${existingUser.id})`);
        const updatedUser = await storage.updateUser(existingUser.id, {
          firstName: claims["first_name"],
          lastName: claims["last_name"],
          profileImageUrl: claims["profile_image_url"],
        });
        console.log(`[Replit Auth] User updated successfully. Returning ID: ${updatedUser?.id}`);
        return updatedUser;
      }
    }
    
    // No existing user found, create a new one
    console.log(`[Replit Auth] Creating new user with email: ${email}, ID: ${claims["sub"]}`);
    const user = await storage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
    });
    console.log(`[Replit Auth] New user created successfully. ID: ${user.id}`);
    
    return user;
  } catch (error) {
    console.error(`[Replit Auth] ERROR in upsertUser:`, error);
    console.error(`[Replit Auth] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}

// Routes that should skip session/passport middleware (static assets, Vite HMR)
const shouldSkipSession = (path: string): boolean => {
  // Skip session for:
  // - Vite HMR and dev files
  // - Node modules served by Vite
  // - Static assets (images, fonts, etc.)
  // - Source files served by Vite dev server
  return (
    path.startsWith('/@') ||
    path.startsWith('/node_modules/') ||
    path.startsWith('/@fs/') ||
    path.startsWith('/src/') ||
    path.endsWith('.tsx') ||
    path.endsWith('.ts') ||
    path.endsWith('.css') ||
    path.endsWith('.js') ||
    path.endsWith('.map') ||
    path.endsWith('.png') ||
    path.endsWith('.jpg') ||
    path.endsWith('.jpeg') ||
    path.endsWith('.gif') ||
    path.endsWith('.svg') ||
    path.endsWith('.ico') ||
    path.endsWith('.woff') ||
    path.endsWith('.woff2') ||
    path.endsWith('.ttf') ||
    path.endsWith('.eot')
  );
};

export async function setupAuth(app: Express) {
  // Trust only the first proxy (Replit's GCE load balancer)
  // This ensures secure cookies work in production without opening rate-limit bypass vulnerabilities
  app.set("trust proxy", 1);
  
  // Get session middleware instance
  const sessionMiddleware = getSession();
  
  // OPTIMIZATION: Skip session middleware for static assets to reduce DB queries
  app.use((req, res, next) => {
    if (shouldSkipSession(req.path)) {
      return next();
    }
    return sessionMiddleware(req, res, next);
  });
  
  app.use(passport.initialize());
  
  // CRITICAL: Define serializers BEFORE passport.session() and OUTSIDE any conditional blocks
  // These must always be defined for both Replit Auth and local auth to work
  passport.serializeUser((user: Express.User, cb) => {
    try {
      const sessionData = {
        id: user.id,
        email: user.email || '',
        activeTenantId: user.activeTenantId || 'single-tenant',
        isPlatformAdmin: user.isPlatformAdmin === true
      };
      console.log('[Passport] Serializing user:', sessionData.id);
      cb(null, sessionData);
    } catch (err) {
      console.error('[Passport] Serialize error:', err);
      cb(err as Error, null);
    }
  });
  
  passport.deserializeUser(async (sessionData: any, cb) => {
    try {
      const user = {
        id: sessionData.id,
        email: sessionData.email || '',
        activeTenantId: sessionData.activeTenantId || 'single-tenant',
        isPlatformAdmin: sessionData.isPlatformAdmin === true,
        permissions: [] as string[]
      };
      console.log('[Passport] Deserializing user:', user.id);
      cb(null, user as Express.User);
    } catch (err) {
      console.error('[Passport] Deserialize error:', err);
      cb(err as Error, null);
    }
  });
  
  // Wrap passport.session() with timing instrumentation to detect session store latency
  // OPTIMIZATION: Skip passport.session() for static assets (same as session middleware)
  app.use((req, res, next) => {
    // Skip passport session for static assets - they don't need user context
    if (shouldSkipSession(req.path)) {
      return next();
    }
    
    const sessionStart = Date.now();
    passport.session()(req, res, (err) => {
      const sessionTime = Date.now() - sessionStart;
      // Log slow session loads (>500ms indicates potential session store issues)
      if (sessionTime > 500) {
        console.warn(`[Session] SLOW session load: ${sessionTime}ms`, {
          hasUser: !!req.user,
          sessionId: req.sessionID?.substring(0, 8) + '...',
          path: req.path
        });
      } else if (sessionTime > 100 && process.env.NODE_ENV === 'production') {
        // In production, log any session load >100ms for diagnostic purposes
        console.log(`[Session] Session load: ${sessionTime}ms path=${req.path}`);
      }
      next(err);
    });
  });

  // Only configure Replit Auth if environment variables are available
  if (!isReplitAuthConfigured()) {
    console.log("⚠️  Replit Auth not configured - running in development mode");
    console.log("ℹ️  To enable production auth, configure: REPLIT_DOMAINS");
    
    // Setup minimal routes for development
    app.get("/api/login", (req, res) => {
      res.redirect("/");
    });
    
    app.get("/api/logout", async (req, res) => {
      const sessionId = req.sessionID;
      
      // Get userId BEFORE destroying session to invalidate cache
      const user = req.user as any;
      const userId = user?.id || user?.claims?.sub || (req.session as any)?.switchedUserId;
      
      // Invalidate auth caches for this user
      if (userId) {
        try {
          // Always invalidate in-memory cache first (this should never fail)
          authCache.invalidate(userId);
          
          // Try to invalidate distributed cache (Redis may be down)
          try {
            const { distributedCache } = await import('./services/redis');
            await distributedCache.invalidate(`auth-me:${userId}`);
          } catch (redisError) {
            console.error("[Logout] Failed to invalidate distributed cache (Redis may be unavailable):", redisError);
            // In-memory cache was already cleared, so user will be logged out correctly
            // Worst case: stale cache in Redis expires after TTL (60s)
          }
        } catch (cacheError) {
          console.error("[Logout] CRITICAL: Failed to invalidate auth caches:", cacheError);
          // Still proceed with logout even if cache invalidation fails
        }
      }
      
      req.logout((err) => {
        if (err) {
          console.error("[Logout] Error during logout:", err);
        }
        
        // Destroy session first, then send response
        if (req.session) {
          req.session.destroy((destroyErr) => {
            if (destroyErr) {
              console.error("[Logout] Error destroying session:", destroyErr);
            }
            
            // Clear the session cookie after destroying the session
            const isProduction = process.env.NODE_ENV === 'production';
            res.clearCookie('connect.sid', { 
              path: '/', 
              sameSite: 'lax',
              secure: isProduction,
              httpOnly: true
            });
            res.redirect("/login");
          });
        } else {
          // No session to destroy, just clear cookie and redirect
          const isProduction = process.env.NODE_ENV === 'production';
          res.clearCookie('connect.sid', { 
            path: '/', 
            sameSite: 'lax',
            secure: isProduction,
            httpOnly: true
          });
          res.redirect("/login");
        }
      });
    });
    
    return;
  }

  console.log("🔐 Configuring Replit Auth for production");
  
  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user: any = {};
    updateUserSession(user, tokens);
    const dbUser = await upsertUser(tokens.claims());
    
    if (!dbUser) {
      console.error("[Replit Auth] Failed to upsert user");
      return verified(new Error("Failed to create user"));
    }
    
    // Obtener los tenants del usuario
    const userTenants = await storage.getUserTenants(dbUser.id);
    
    // Agregar información del usuario a la sesión
    user.id = dbUser.id;
    user.email = dbUser.email;
    user.firstName = dbUser.firstName;
    user.lastName = dbUser.lastName;
    user.isPlatformAdmin = dbUser.isPlatformAdmin || false;
    
    console.log(`[Replit Auth] User object after DB upsert:`);
    console.log(`  - DB User ID: ${dbUser.id}`);
    console.log(`  - Session User ID: ${user.id}`);
    console.log(`  - Email: ${user.email}`);
    console.log(`  - isPlatformAdmin: ${user.isPlatformAdmin}`);
    
    // Si el usuario tiene tenants, seleccionar el primero activo
    if (userTenants && userTenants.length > 0) {
      const activeTenant = userTenants.find(t => t.isActive) || userTenants[0];
      if (activeTenant) {
        user.activeTenantId = activeTenant.tenantId;
      }
    }
    // Si no tiene tenants, lo manejaremos en el middleware de rutas
    // El usuario podrá autenticarse pero no acceder a recursos que requieran tenant
    
    // Load user's permissions from global roles
    user.permissions = await storage.getUserPermissions(dbUser.id);
    
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
        // CRITICAL: Disable state verification to fix production OAuth issues
        // This is a known issue with Replit Auth where state doesn't persist properly
        state: false,
        passReqToCallback: true,
      } as any,
      verify,
    );
    passport.use(strategy);
  }

  app.get("/api/login", (req, res, next) => {
    // Use the first domain from REPLIT_DOMAINS or req.hostname as fallback
    const configuredDomains = process.env.REPLIT_DOMAINS!.split(",");
    const requestDomain = req.hostname;
    
    // Try to find matching domain or use first one
    const targetDomain = configuredDomains.includes(requestDomain) 
      ? requestDomain 
      : configuredDomains[0];
    
    const strategyName = `replitauth:${targetDomain}`;
    
    console.log("[Replit Auth] Login initiated:");
    console.log("  - req.hostname:", requestDomain);
    console.log("  - REPLIT_DOMAINS:", process.env.REPLIT_DOMAINS);
    console.log("  - Target domain:", targetDomain);
    console.log("  - Strategy name:", strategyName);
    console.log("  - Session ID:", req.sessionID);
    
    passport.authenticate(strategyName, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    // Use the first domain from REPLIT_DOMAINS or req.hostname as fallback
    const configuredDomains = process.env.REPLIT_DOMAINS!.split(",");
    const requestDomain = req.hostname;
    
    // Try to find matching domain or use first one
    const targetDomain = configuredDomains.includes(requestDomain) 
      ? requestDomain 
      : configuredDomains[0];
    
    const strategyName = `replitauth:${targetDomain}`;
    
    console.log("[Replit Auth] Callback initiated:");
    console.log("  - req.hostname:", requestDomain);
    console.log("  - REPLIT_DOMAINS:", process.env.REPLIT_DOMAINS);
    console.log("  - Target domain:", targetDomain);
    console.log("  - Strategy name:", strategyName);
    console.log("  - Session ID:", req.sessionID);
    console.log("  - Query params:", req.query);
    console.log("  - Has session?:", !!req.session);
    console.log("  - Session cookie:", req.headers.cookie);
    
    passport.authenticate(strategyName, async (err: any, user: any, info: any) => {
      if (err) {
        console.error("[Replit Auth] Authentication error:", err);
        console.error("[Replit Auth] Error details:", JSON.stringify(err, null, 2));
        // Redirect to home with error instead of retrying login (prevents loop)
        return res.redirect("/?error=auth_failed");
      }
      
      if (!user) {
        console.error("[Replit Auth] No user returned. Info:", info);
        console.error("[Replit Auth] Info details:", JSON.stringify(info, null, 2));
        // Redirect to home with error instead of retrying login (prevents loop)
        return res.redirect("/?error=auth_no_user");
      }
      
      console.log("[Replit Auth] User authenticated successfully:", user.email);
      
      req.logIn(user, async (loginErr: any) => {
        if (loginErr) {
          console.error("[Replit Auth] Login error:", loginErr);
          return next(loginErr);
        }
        
        console.log("[Replit Auth] Session created successfully");
        
        try {
          // Fetch fresh user data to determine redirect
          // CRITICAL: Use email lookup because user.id may be the Replit ID, not the DB ID
          const dbUser = await storage.getUserByEmail(user.email);
          
          console.log("[Replit Auth] DB User lookup:", dbUser ? `Found: ${dbUser.id}, isPlatformAdmin: ${dbUser.isPlatformAdmin}` : 'Not found');
          
          // Check if user is deactivated
          if (dbUser && !dbUser.isActive) {
            console.log("[Replit Auth] User is deactivated:", user.email);
            req.logout(() => {});
            return res.redirect("/?error=account_deactivated");
          }
          
          // Check if user is platform admin (MUST check BEFORE tenant check)
          if (dbUser?.isPlatformAdmin) {
            console.log("[Replit Auth] Platform admin detected. Redirecting to /platform-admin");
            return res.redirect("/platform-admin");
          }
          
          // Check if user has any tenants (only applies to non-admin users)
          const userTenants = dbUser ? await storage.getUserTenants(dbUser.id) : [];
          if (!userTenants || userTenants.length === 0) {
            console.log("[Replit Auth] User has no tenants. Redirecting to /no-access");
            return res.redirect("/no-access");
          }
          
          // Normal user with tenants - redirect to dashboard
          console.log("[Replit Auth] Normal user with tenants. Redirecting to /");
          return res.redirect("/");
        } catch (error) {
          console.error("[Replit Auth] Error determining redirect:", error);
          // Fallback to root on error
          return res.redirect("/");
        }
      });
    })(req, res, next);
  });

  app.get("/api/logout", async (req, res) => {
    const sessionId = req.sessionID;
    
    // Get userId BEFORE destroying session to invalidate cache
    const user = req.user as any;
    const userId = user?.id || user?.claims?.sub;
    
    // Invalidate auth caches for this user
    if (userId) {
      try {
        // Always invalidate in-memory cache first (this should never fail)
        authCache.invalidate(userId);
        
        // Try to invalidate distributed cache (Redis may be down)
        try {
          const { distributedCache } = await import('./services/redis');
          await distributedCache.invalidate(`auth-me:${userId}`);
        } catch (redisError) {
          console.error("[Logout] Failed to invalidate distributed cache (Redis may be unavailable):", redisError);
          // In-memory cache was already cleared, so user will be logged out correctly
          // Worst case: stale cache in Redis expires after TTL (60s)
        }
      } catch (cacheError) {
        console.error("[Logout] CRITICAL: Failed to invalidate auth caches:", cacheError);
        // Still proceed with logout even if cache invalidation fails
      }
    }
    
    req.logout((err) => {
      if (err) {
        console.error("[Logout] Error during logout:", err);
      }
      
      // Destroy session first, then send response
      if (req.session) {
        req.session.destroy((destroyErr) => {
          if (destroyErr) {
            console.error("[Logout] Error destroying session:", destroyErr);
          }
          
          // Clear the session cookie after destroying the session
          const isProduction = process.env.NODE_ENV === 'production';
          res.clearCookie('connect.sid', { 
            path: '/', 
            sameSite: 'lax',
            secure: isProduction,
            httpOnly: true
          });
          
          // Redirect to login page after everything is cleaned up
          // IMPORTANT: We don't redirect to Replit OIDC logout because:
          // 1. It violates CSP (https://replit.com is not https://*.replit.com)
          // 2. Local session is already destroyed
          // 3. Next login will create a fresh OIDC session anyway
          res.redirect("/login");
        });
      } else {
        // No session to destroy, just clear cookie and redirect
        const isProduction = process.env.NODE_ENV === 'production';
        res.clearCookie('connect.sid', { 
          path: '/', 
          sameSite: 'lax',
          secure: isProduction,
          httpOnly: true
        });
        res.redirect("/login");
      }
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const startTime = Date.now();
  const timings: Record<string, number> = {};
  const user = req.user as any;

  // Check if user is authenticated (production OAuth flow)
  if (req.isAuthenticated()) {
    // For local authentication (email/password), user won't have expires_at
    if (!user?.expires_at) {
      timings['path'] = 0; // 0 = local auth fast path
      timings['total'] = Date.now() - startTime;
      if (timings['total'] > 50) {
        console.log(`[isAuthenticated] SLOW (${timings['total']}ms) path=local-auth`);
      }
      return next();
    }
    
    // For OAuth authentication, check token expiration
    const now = Math.floor(Date.now() / 1000);
    if (now <= user.expires_at) {
      timings['path'] = 1; // 1 = OAuth valid token
      timings['total'] = Date.now() - startTime;
      if (timings['total'] > 50) {
        console.log(`[isAuthenticated] SLOW (${timings['total']}ms) path=oauth-valid`);
      }
      return next();
    }

    // Try to refresh token
    const refreshToken = user.refresh_token;
    if (refreshToken) {
      try {
        const refreshStart = Date.now();
        const config = await getOidcConfig();
        timings['oidc:config'] = Date.now() - refreshStart;
        
        const tokenStart = Date.now();
        const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
        timings['oidc:refresh'] = Date.now() - tokenStart;
        
        updateUserSession(user, tokenResponse);
        timings['path'] = 2; // 2 = OAuth token refreshed
        timings['total'] = Date.now() - startTime;
        
        if (timings['total'] > 200) {
          console.warn(`[isAuthenticated] SLOW token refresh (${timings['total']}ms)`, timings);
        }
        return next();
      } catch (error) {
        timings['oidc:error'] = Date.now() - startTime;
        console.warn(`[isAuthenticated] Token refresh failed after ${timings['oidc:error']}ms`);
        // Token refresh failed, fall through to development check
      }
    }
  }

  // Development fallback - allow access when not authenticated in development
  if (process.env.NODE_ENV === 'development') {
    // Set a development mock user if not already authenticated
    if (!req.user) {
      // CRITICAL FIX: Check for switched user in session first
      const switchedUserId = (req.session as any)?.switchedUserId;
      const effectiveUserId = switchedUserId || 'user-1';
      
      // Try to get cached auth data first
      let activeTenantId = 'tenant-1';
      let isPlatformAdmin = false;
      let userEmail = 'admin@riskmatrix.com';
      let username = 'admin';
      let fullName = 'Administrator';
      let permissions: string[] = [];
      
      try {
        // Check cache first
        const cachedData = authCache.get(effectiveUserId);
        
        if (cachedData) {
          // Use cached data - no DB queries needed!
          console.log("[isAuthenticated] Using cached auth data (cache hit)");
          const dbUser = cachedData.user;
          userEmail = dbUser.email || userEmail;
          username = dbUser.username || username;
          fullName = dbUser.fullName || fullName;
          isPlatformAdmin = dbUser.isPlatformAdmin || false;
          
          const activeTenant = cachedData.tenants.find(t => t.isActive) || cachedData.tenants[0];
          if (activeTenant) {
            activeTenantId = activeTenant.tenantId;
          }
          
          permissions = cachedData.permissions;
          timings['path'] = 3; // 3 = dev cache hit
        } else {
          // Cache miss - load from database and cache
          console.log("[isAuthenticated] Cache miss - loading from database");
          
          const userStart = Date.now();
          const dbUser = await storage.getUser(effectiveUserId);
          timings['db:getUser'] = Date.now() - userStart;
          
          if (dbUser) {
            userEmail = dbUser.email || userEmail;
            username = dbUser.username || username;
            fullName = dbUser.fullName || fullName;
            isPlatformAdmin = dbUser.isPlatformAdmin || false;
          }
          
          const tenantsStart = Date.now();
          const userTenants = await storage.getUserTenants(effectiveUserId);
          timings['db:getUserTenants'] = Date.now() - tenantsStart;
          
          const activeTenant = userTenants.find(t => t.isActive) || userTenants[0];
          if (activeTenant) {
            activeTenantId = activeTenant.tenantId;
          }
          
          const permsStart = Date.now();
          permissions = await storage.getUserPermissions(effectiveUserId);
          timings['db:getPermissions'] = Date.now() - permsStart;
          
          // Store in cache for future requests
          authCache.set(effectiveUserId, {
            user: dbUser || {
              id: effectiveUserId,
              email: userEmail,
              username,
              fullName,
              isPlatformAdmin
            },
            tenants: userTenants,
            permissions,
            cachedAt: Date.now()
          });
          timings['path'] = 4; // 4 = dev cache miss (DB queries)
        }
      } catch (error) {
        timings['error'] = Date.now() - startTime;
        console.log("[isAuthenticated] Could not fetch user data, using defaults", timings);
      }
      
      (req as any).user = {
        id: effectiveUserId,
        username,
        email: userEmail,
        fullName,
        activeTenantId,
        permissions,
        isPlatformAdmin
      };
      
      timings['total'] = Date.now() - startTime;
      if (timings['total'] > 100) {
        console.warn(`[isAuthenticated] SLOW dev auth (${timings['total']}ms)`, timings);
      }
    }
    return next();
  }

  // Production - require authentication
  timings['path'] = -1; // -1 = unauthorized
  timings['total'] = Date.now() - startTime;
  console.log(`[isAuthenticated] Unauthorized after ${timings['total']}ms`);
  return res.status(401).json({ message: "Unauthorized" });
};

// Middleware que permite acceso sin tenant activo (para platform admins)
export const optionalTenant: RequestHandler = async (req, res, next) => {
  // Primero verificar que esté autenticado
  const user = req.user as any;

  // Check if user is authenticated
  if (req.isAuthenticated() && user?.expires_at) {
    const now = Math.floor(Date.now() / 1000);
    if (now <= user.expires_at) {
      return next();
    }

    // Try to refresh token
    const refreshToken = user.refresh_token;
    if (refreshToken) {
      try {
        const config = await getOidcConfig();
        const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
        updateUserSession(user, tokenResponse);
        return next();
      } catch (error) {
        // Token refresh failed, fall through to development check
      }
    }
  }

  // Development fallback - allow access when not authenticated in development
  if (process.env.NODE_ENV === 'development') {
    // Set a development mock user if not already authenticated
    if (!req.user) {
      console.log("[optionalTenant] Setting development mock user");
      
      // Try to get the user's active tenant from the database
      let activeTenantId = 'tenant-1';
      let permissions: string[] = [];
      
      try {
        const userTenants = await storage.getUserTenants('user-1');
        const activeTenant = userTenants.find(t => t.isActive) || userTenants[0];
        if (activeTenant) {
          activeTenantId = activeTenant.tenantId;
        }
        
        // Load user's permissions from global roles
        permissions = await storage.getUserPermissions('user-1');
      } catch (error) {
        console.log("[optionalTenant] Could not fetch user tenants, using defaults");
      }
      
      (req as any).user = {
        id: 'user-1',
        username: 'admin',
        email: 'admin@riskmatrix.com',
        activeTenantId,
        permissions,
        isPlatformAdmin: true  // Mock user has platform admin access in development
      };
    }
    return next();
  }

  // Production - require authentication
  return res.status(401).json({ message: "Unauthorized" });
};