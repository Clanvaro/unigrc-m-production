import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import type { CorsOptions } from 'cors';
import type { Options as RateLimitOptions } from 'express-rate-limit';

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// ============= RATE LIMITING =============

// Global rate limiter - very permissive in dev, reasonable in prod
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 10000 : 500, // Dev: 10k req/15min, Prod: 500 req/15min (increased for web app)
  message: 'Demasiadas solicitudes desde esta IP, intente nuevamente más tarde.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isDevelopment && req.path.startsWith('/src/'), // Skip Vite HMR in dev
});

// Strict rate limiter for authentication endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 20, // Dev: 1k attempts, Prod: 20 attempts (increased for legitimate retries)
  message: 'Demasiados intentos de autenticación, intente nuevamente en 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

// API mutation rate limiter (POST/PUT/PATCH/DELETE)
export const apiMutationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isDevelopment ? 1000 : 100, // Dev: 1k req/min, Prod: 100 req/min (increased for bulk operations)
  message: 'Demasiadas modificaciones, intente nuevamente en un minuto.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ============= HELMET (Security Headers) =============

export const helmetConfig = helmet({
  // Content Security Policy - disabled to avoid CSP errors in production
  // The app is served in iframes on Replit/Render which have their own CSP
  contentSecurityPolicy: false,
  
  // Other security headers
  crossOriginEmbedderPolicy: false, // Disable to allow external resources
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'sameorigin' },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
});

// ============= CORS Configuration =============

const allowedOrigins = [
  // Development origins
  'http://localhost:5000',
  'http://localhost:3000',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:3000',
  
  // Production Replit domains
  ...(process.env.REPLIT_DOMAINS?.split(',').map(domain => `https://${domain}`) || []),
  
  // Production Render domains
  'https://unigrc.onrender.com',
  ...(process.env.RENDER_EXTERNAL_URL ? [process.env.RENDER_EXTERNAL_URL] : []),
  
  // AWS Production domains (CloudFront, ALB, EC2, ECS, Elastic Beanstalk)
  ...(process.env.AWS_ALLOWED_ORIGINS?.split(',') || []),
  ...(process.env.CLOUDFRONT_DOMAIN ? [`https://${process.env.CLOUDFRONT_DOMAIN}`] : []),
  ...(process.env.ALB_DOMAIN ? [`https://${process.env.ALB_DOMAIN}`] : []),
];

export const corsConfig: CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // In development, allow all localhost/127.0.0.1 origins
    if (isDevelopment && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      return callback(null, true);
    }
    
    // Check whitelist
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Check Render patterns (*.onrender.com)
    if (origin.endsWith('.onrender.com')) {
      return callback(null, true);
    }
    
    // Check AWS patterns (*.amazonaws.com, *.elasticbeanstalk.com)
    if (isProduction && (
      origin.endsWith('.amazonaws.com') ||
      origin.endsWith('.elasticbeanstalk.com') ||
      origin.endsWith('.awsapprunner.com')
    )) {
      return callback(null, true);
    }
    
    // In production, reject unknown origins
    if (isProduction) {
      return callback(new Error('Origin not allowed by CORS'));
    }
    
    // In development, allow all
    callback(null, true);
  },
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
  exposedHeaders: ['X-CSRF-Token'],
  maxAge: 86400, // 24 hours
};

// ============= Environment Variables Validation =============

export function validateRequiredSecrets(): void {
  const requiredSecrets = [
    'SESSION_SECRET',
    'CSRF_SECRET',
    'DATABASE_URL',
  ];

  const missing: string[] = [];
  
  for (const secret of requiredSecrets) {
    if (!process.env[secret]) {
      missing.push(secret);
    }
  }

  // Check for insecure defaults in production
  if (isProduction) {
    if (process.env.SESSION_SECRET === 'your-secret-key-here') {
      missing.push('SESSION_SECRET (usando valor por defecto inseguro)');
    }
    if (process.env.CSRF_SECRET === 'csrf-secret-key-change-in-production') {
      missing.push('CSRF_SECRET (usando valor por defecto inseguro)');
    }
  }

  if (missing.length > 0) {
    console.error('\n❌ SECURITY ERROR: Variables de entorno faltantes o inseguras:');
    missing.forEach(secret => console.error(`   - ${secret}`));
    console.error('\nDefine estas variables en tu archivo .env antes de continuar.\n');
    
    if (isProduction) {
      process.exit(1); // Exit in production
    } else {
      console.warn('⚠️  Continuando en modo desarrollo, pero debes configurar estas variables.\n');
    }
  } else {
    console.log('✅ Todas las variables de entorno de seguridad están configuradas correctamente.\n');
  }
}
