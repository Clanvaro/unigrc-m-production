import { Request, Response, NextFunction } from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import validator from 'validator';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Configure DOMPurify for strict sanitization
purify.setConfig({
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
  SAFE_FOR_TEMPLATES: true,
});

const isProduction = process.env.NODE_ENV === 'production';

// Sanitize a single value
export function sanitizeValue(value: any): any {
  if (typeof value === 'string') {
    // Remove null bytes
    let sanitized = value.replace(/\0/g, '');
    
    // HTML sanitization with DOMPurify
    sanitized = purify.sanitize(sanitized);
    
    // Additional SQL injection prevention
    sanitized = sanitized.replace(/('|(--)|;|\/\*|\*\/|xp_|exec|execute|script|alert|onerror)/gi, '');
    
    return sanitized;
  }
  
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  
  if (value !== null && typeof value === 'object') {
    return sanitizeObject(value);
  }
  
  return value;
}

// Sanitize an object recursively
export function sanitizeObject(obj: any): any {
  const sanitized: any = {};
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Sanitize the key itself to prevent prototype pollution
      const sanitizedKey = key.replace(/\$/g, '').replace(/\./g, '');
      sanitized[sanitizedKey] = sanitizeValue(obj[key]);
    }
  }
  
  return sanitized;
}

// Middleware to sanitize request body, query, and params
export const inputSanitizer = (req: Request, res: Response, next: NextFunction) => {
  // Skip in development for easier debugging (optional)
  if (!isProduction && req.path.startsWith('/api/dev')) {
    return next();
  }
  
  // MongoDB operator sanitization (prevents NoSQL injection)
  mongoSanitize.sanitize(req.body, { replaceWith: '_' });
  mongoSanitize.sanitize(req.query, { replaceWith: '_' });
  mongoSanitize.sanitize(req.params, { replaceWith: '_' });
  
  // Deep sanitization for strings
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
};

// Validate email
export function isValidEmail(email: string): boolean {
  return validator.isEmail(email, {
    allow_utf8_local_part: false,
    require_tld: true,
  });
}

// Validate URL
export function isValidUrl(url: string): boolean {
  return validator.isURL(url, {
    protocols: ['http', 'https'],
    require_protocol: true,
    require_valid_protocol: true,
    allow_query_components: true,
  });
}

// Validate UUID
export function isValidUUID(uuid: string): boolean {
  return validator.isUUID(uuid, 4);
}

// Validate alphanumeric with specific characters
export function isValidCode(code: string, pattern?: RegExp): boolean {
  const defaultPattern = /^[A-Z0-9\-_]+$/;
  return (pattern || defaultPattern).test(code);
}

// Sanitize path to prevent directory traversal
export function sanitizePath(path: string): string {
  // Remove null bytes, ../, ..\, and other dangerous patterns
  return path
    .replace(/\0/g, '')
    .replace(/\.\./g, '')
    .replace(/[<>:"|?*]/g, '')
    .replace(/^\/+/, '') // Remove leading slashes
    .replace(/\/+/g, '/'); // Normalize multiple slashes
}

// Validate file path (no traversal attacks)
export function isValidFilePath(filePath: string): boolean {
  const sanitized = sanitizePath(filePath);
  
  // Check for directory traversal patterns
  if (filePath.includes('..') || filePath.includes('~')) {
    return false;
  }
  
  // Check for absolute paths in user input
  if (filePath.startsWith('/') || filePath.match(/^[a-zA-Z]:\\/)) {
    return false;
  }
  
  return sanitized === filePath;
}

// Validate JSON input size (AWS ALB has 1MB limit by default)
export function isValidJSONSize(jsonString: string, maxSizeKB: number = 900): boolean {
  const sizeInKB = Buffer.byteLength(jsonString, 'utf8') / 1024;
  return sizeInKB <= maxSizeKB;
}

// Sanitize for SQL LIKE queries
export function sanitizeForLike(value: string): string {
  return value
    .replace(/[%_\\]/g, '\\$&') // Escape LIKE wildcards
    .replace(/'/g, "''"); // Escape single quotes
}

// Content-Type validation middleware
export const validateContentType = (allowedTypes: string[] = ['application/json']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.get('Content-Type');
    
    // Skip for GET, HEAD, DELETE (no body)
    if (['GET', 'HEAD', 'DELETE'].includes(req.method)) {
      return next();
    }
    
    // Check if Content-Type is allowed
    if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
      return res.status(415).json({
        message: 'Tipo de contenido no soportado',
        code: 'UNSUPPORTED_MEDIA_TYPE',
        allowedTypes,
      });
    }
    
    next();
  };
};

// Payload size limit middleware (AWS ALB compatibility)
export const payloadSizeLimit = (maxSizeKB: number = 900) => {
  return (req: Request, res: Response, next: NextFunction) => {
    let size = 0;
    
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxSizeKB * 1024) {
        req.pause();
        res.status(413).json({
          message: `Payload demasiado grande. Máximo permitido: ${maxSizeKB}KB`,
          code: 'PAYLOAD_TOO_LARGE',
        });
      }
    });
    
    next();
  };
};
