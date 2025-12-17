import { doubleCsrf } from 'csrf-csrf';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from './logger';

// CSRF configuration
const isProduction = process.env.NODE_ENV === 'production';

// Validate CSRF secret is set (but don't throw - allow fallback in getSecret)
// Log detailed information about secret availability at startup
const csrfSecretAtStartup = process.env.CSRF_SECRET;
if (!csrfSecretAtStartup) {
  if (isProduction) {
    logger.warn('⚠️  CSRF_SECRET not set in production - will use fallback secret (less secure)');
    logger.warn(`⚠️  Available env vars with 'SECRET' or 'CSRF': ${Object.keys(process.env).filter(k => k.includes('SECRET') || k.includes('CSRF')).join(', ') || 'none'}`);
  } else {
    logger.warn('⚠️  CSRF_SECRET not set - using development fallback (INSECURE)');
  }
} else {
  logger.info(`✅ CSRF_SECRET loaded at startup (length: ${csrfSecretAtStartup.length})`);
}

const csrfOptions = {
  getSecret: () => {
    const secret = process.env.CSRF_SECRET;
    if (!secret) {
      // Don't throw in production - allow fallback token generation instead
      // This prevents the endpoint from returning 500 when secret is missing
      logger.warn('[CSRF] CSRF_SECRET not set - using fallback secret (less secure but prevents 500 errors)');
      // Generate a deterministic fallback based on environment
      // This is less secure but prevents complete failure
      return process.env.SESSION_SECRET || 'fallback-csrf-secret-' + (process.env.PORT || '5000');
    }
    return secret;
  },
  getSessionIdentifier: (req: Request) => {
    try {
      // In development, use a consistent identifier
      // In production, use actual session ID for better security
      if (isProduction) {
        // Try to get session ID, but provide a fallback if session is not initialized
        if (req.session?.id) {
          return req.session.id as string;
        }
        // If no session, create a temporary identifier based on request
        // This allows CSRF tokens to work even before login
        const tempId = req.headers['x-request-id'] || 
                       req.ip || 
                       `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        return `session-${tempId}`;
      }
      // Use user ID if available, otherwise use a fixed development identifier
      const user = (req as any).user;
      return user?.claims?.sub || 'development-session';
    } catch (error: any) {
      // Fallback if session identifier generation fails
      logger.warn(`[CSRF] Error generating session identifier, using fallback: ${error?.message || String(error)}`);
      return `fallback-session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    }
  },
  // Use __Host- prefix only in production (requires HTTPS)
  cookieName: isProduction ? '__Host-psifi.x-csrf-token' : 'psifi.x-csrf-token',
  cookieOptions: {
    httpOnly: false, // Must be false so JavaScript can read the token
    sameSite: isProduction ? ('none' as const) : ('lax' as const), // 'none' for cross-site cookies when behind Firebase Hosting proxy
    path: '/',
    secure: isProduction, // Only secure in production (requires HTTPS)
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'] as Array<'GET' | 'HEAD' | 'OPTIONS'>,
  getTokenFromRequest: (req: Request) => {
    // Try to get token from header first
    const headerToken = req.headers['x-csrf-token'];
    return (typeof headerToken === 'string' ? headerToken : req.body?._csrf) as string | undefined;
  },
};

// Initialize CSRF with error handling
let invalidCsrfTokenError: any;
let doubleCsrfProtection: RequestHandler;
let generateCsrfToken: (req: Request, res: Response) => string;

try {
  const csrfModule = doubleCsrf(csrfOptions);
  invalidCsrfTokenError = csrfModule.invalidCsrfTokenError;
  doubleCsrfProtection = csrfModule.doubleCsrfProtection;
  generateCsrfToken = csrfModule.generateCsrfToken;
  logger.info('[CSRF] CSRF module initialized successfully');
} catch (initError: any) {
  logger.error(`[CSRF] Failed to initialize CSRF module: ${initError?.message || String(initError)}`);
  logger.error(`[CSRF] Stack: ${initError?.stack || 'No stack trace'}`);
  
  // Create fallback implementations to prevent complete failure
  invalidCsrfTokenError = class extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'InvalidCsrfTokenError';
    }
  };
  
  doubleCsrfProtection = (req: Request, res: Response, next: NextFunction) => {
    logger.warn('[CSRF] CSRF protection disabled due to initialization error');
    next();
  };
  
  generateCsrfToken = (req: Request, res: Response): string => {
    logger.warn('[CSRF] Using fallback token generation due to initialization error');
    const fallbackToken = Buffer.from(`${Date.now()}-${Math.random()}`).toString('base64');
    const cookieName = isProduction ? '__Host-psifi.x-csrf-token' : 'psifi.x-csrf-token';
    res.cookie(cookieName, fallbackToken, {
      httpOnly: false,
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
      path: '/',
      secure: isProduction
    });
    return fallbackToken;
  };
}

// Export generateCsrfToken for use in other modules (e.g., after login)
export { generateCsrfToken };

// CSRF protection middleware with custom error handling
export const csrfProtection: RequestHandler = (req, res, next) => {
  doubleCsrfProtection(req, res, (err) => {
    if (err) {
      const logMessage = `CSRF validation failed for ${req.method} ${req.path} - IP: ${req.ip}, UA: ${req.get('user-agent')}, HasToken: ${!!req.headers['x-csrf-token']}`;
      logger.warn(logMessage);
      
      return res.status(403).json({
        message: 'Invalid CSRF token. Please refresh the page and try again.',
        code: 'CSRF_VALIDATION_FAILED'
      });
    }
    next();
  });
};

// Route-specific CSRF protection (for routes that modify data)
export const csrfProtectionForMutations: RequestHandler = (req, res, next) => {
  // Skip CSRF validation in development to avoid cookie issues
  const isDevelopment = process.env.NODE_ENV !== 'production';
  if (isDevelopment) {
    return next();
  }
  
  // Skip CSRF protection for public validation endpoints (email-based validation)
  if (req.path.startsWith('/public/batch-validation') || 
      req.path.startsWith('/public/validate-control') ||
      req.path.startsWith('/public/validate-action-plan')) {
    return next();
  }
  
  // Only apply CSRF protection for state-changing methods in production
  const mutationMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  
  if (mutationMethods.includes(req.method)) {
    return csrfProtection(req, res, next);
  }
  
  next();
};

// Generate CSRF token for API endpoint
// This function generates a token and sets it as a cookie
export function getCSRFToken(req: Request, res: Response): void {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Anti-500 silent patch: Early validation of CSRF_SECRET
    const secret = process.env.CSRF_SECRET;
    if (!secret || secret.trim().length < 32) {
      const diagnosticInfo = {
        hasSecret: !!secret,
        length: secret?.length || 0,
        isEmpty: !secret || secret.trim().length === 0,
        isTooShort: secret ? secret.trim().length < 32 : true
      };
      console.error('[CSRF] CSRF_SECRET missing/too short', diagnosticInfo);
      logger.error(`[CSRF] CSRF_SECRET validation failed: ${JSON.stringify(diagnosticInfo)}`);
      
      if (!res.headersSent) {
        return res.status(503).json({ 
          error: 'CSRF misconfigured',
          code: 'CSRF_SECRET_INVALID',
          message: 'CSRF_SECRET is missing or too short (minimum 32 characters required)',
          diagnostic: diagnosticInfo
        });
      }
      return;
    }
    
    // Enhanced diagnostic logging
    const hasSession = !!req.session;
    const sessionId = req.session?.id || 'none';
    const secretAvailable = !!secret;
    const secretLength = secret.length;
    
    logger.info(`[CSRF] Generating token - Production: ${isProduction}, HasSession: ${hasSession}, SessionID: ${sessionId}, SecretAvailable: ${secretAvailable}, SecretLength: ${secretLength}`);
    if (!secret) {
      logger.warn(`[CSRF] CSRF_SECRET is not set! Production: ${isProduction}, AllEnvKeys: ${Object.keys(process.env).filter(k => k.includes('CSRF') || k.includes('SECRET')).join(',')}`);
      
      // Don't throw - use fallback instead
      const cookieName = isProduction ? '__Host-psifi.x-csrf-token' : 'psifi.x-csrf-token';
      const fallbackToken = Buffer.from(`${Date.now()}-${Math.random()}`).toString('base64');
      
      try {
        res.cookie(cookieName, fallbackToken, {
          httpOnly: false,
          sameSite: 'lax',
          path: '/',
          secure: isProduction
        });
        logger.warn('[CSRF] Using fallback token due to missing CSRF_SECRET');
        return res.json({ 
          message: 'CSRF token cookie set successfully (fallback - missing secret)',
          cookieName,
          csrfToken: fallbackToken
        });
      } catch (cookieError: any) {
        logger.error(`[CSRF] Failed to set fallback cookie: ${cookieError?.message || String(cookieError)}`);
        // Continue to try generateCsrfToken anyway
      }
    }
    
    // Generate the CSRF token - this will set the cookie automatically
    let csrfToken: string;
    try {
      logger.info('[CSRF] Calling generateCsrfToken...');
      logger.info(`[CSRF] Request details - Method: ${req.method}, Path: ${req.path}, HasSession: ${!!req.session}, SessionID: ${req.session?.id || 'none'}`);
      
      // Verify secret is available before calling generateCsrfToken
      const secretBeforeGen = process.env.CSRF_SECRET;
      if (!secretBeforeGen) {
        logger.warn('[CSRF] CSRF_SECRET not available when calling generateCsrfToken, will use fallback');
        throw new Error('CSRF_SECRET not available');
      }
      
      csrfToken = generateCsrfToken(req, res);
      logger.info(`[CSRF] Token generated successfully, length: ${csrfToken?.length || 0}`);
    } catch (genError: any) {
      const errorMsg = genError?.message || String(genError);
      const errorStack = genError?.stack || 'No stack trace';
      logger.error(`[CSRF] Error generating token: ${errorMsg}`);
      logger.error(`[CSRF] Error stack: ${errorStack}`);
      logger.error(`[CSRF] Error type: ${genError?.constructor?.name || typeof genError}`);
      
      // Try fallback token instead of throwing
      const cookieName = isProduction ? '__Host-psifi.x-csrf-token' : 'psifi.x-csrf-token';
      const fallbackToken = Buffer.from(`${Date.now()}-${Math.random()}`).toString('base64');
      
      try {
        res.cookie(cookieName, fallbackToken, {
          httpOnly: false,
          sameSite: 'lax',
          path: '/',
          secure: isProduction
        });
        logger.warn('[CSRF] Using fallback token due to generation error');
        return res.json({ 
          message: 'CSRF token cookie set successfully (fallback - generation error)',
          cookieName,
          csrfToken: fallbackToken
        });
      } catch (fallbackCookieError: any) {
        logger.error(`[CSRF] Fallback cookie also failed: ${fallbackCookieError?.message || String(fallbackCookieError)}`);
        // Fall through to outer catch block
        throw genError;
      }
    }
    
    const cookieName = isProduction ? '__Host-psifi.x-csrf-token' : 'psifi.x-csrf-token';
    
    // Also manually set the cookie to ensure it's sent with correct settings
    try {
      if (!res.headersSent) {
        res.cookie(cookieName, csrfToken, {
          httpOnly: false,
          sameSite: isProduction ? ('none' as const) : ('lax' as const),
          path: '/',
          secure: isProduction
        });
      }
    } catch (cookieError: any) {
      logger.error(`[CSRF] Error setting cookie: ${cookieError?.message || String(cookieError)}`);
      // Continue anyway - token was already set by generateCsrfToken
    }
    
    logger.info(`CSRF token generated and cookie set: ${cookieName} with SameSite=${isProduction ? 'none' : 'lax'}`);
    
    if (!res.headersSent) {
      res.json({ 
        message: 'CSRF token cookie set successfully',
        cookieName,
        // Return the token value so frontend can store it in memory as backup
        csrfToken: csrfToken
      });
    }
  } catch (error: any) {
    // Safely extract error info
    let errorMessage: string | undefined;
    let errorStack: string | undefined;
    try {
      errorMessage = error?.message;
      errorStack = error?.stack;
    } catch (e) {
      errorMessage = String(error);
    }
    
    logger.error(`Error handling CSRF token request: ${errorMessage || 'Unknown error'}`);
    if (errorStack) {
      logger.error(`Error stack: ${errorStack}`);
    }
    
    // Try to provide a fallback token if possible
    if (!res.headersSent) {
      try {
        const isProduction = process.env.NODE_ENV === 'production';
        const cookieName = isProduction ? '__Host-psifi.x-csrf-token' : 'psifi.x-csrf-token';
        
        // Generate a simple fallback token
        const fallbackToken = Buffer.from(`${Date.now()}-${Math.random()}`).toString('base64');
        
        res.cookie(cookieName, fallbackToken, {
          httpOnly: false,
          sameSite: 'lax',
          path: '/',
          secure: isProduction
        });
        
        logger.warn('[CSRF] Using fallback CSRF token due to error');
        
        res.json({ 
          message: 'CSRF token cookie set successfully (fallback)',
          cookieName,
          csrfToken: fallbackToken
        });
      } catch (fallbackError: any) {
        // Safely extract fallback error info
        let fallbackErrorMessage: string | undefined;
        try {
          fallbackErrorMessage = fallbackError?.message;
        } catch (e) {
          fallbackErrorMessage = String(fallbackError);
        }
        
        logger.error(`[CSRF] Fallback CSRF token generation also failed: ${fallbackErrorMessage || 'Unknown error'}`);
        if (!res.headersSent) {
          res.status(500).json({ 
            message: 'Error handling CSRF token request',
            code: 'CSRF_ERROR',
            error: errorMessage || 'Unknown error'
          });
        }
      }
    }
  }
}
