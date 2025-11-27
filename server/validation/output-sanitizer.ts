import { Response, NextFunction } from 'express';
import { sanitizeValue } from './input-sanitizer';

const isProduction = process.env.NODE_ENV === 'production';

// Fields that should never be exposed in API responses
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'pwd',
  'secret',
  'privateKey',
  'private_key',
  'sessionSecret',
  'session_secret',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'csrfSecret',
  'csrf_secret',
  'salt',
  'hash',
];

// Sanitize response data by removing sensitive fields
export function sanitizeResponseData(data: any): any {
  if (typeof data === 'string') {
    return sanitizeValue(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeResponseData(item));
  }
  
  if (data !== null && typeof data === 'object') {
    const sanitized: any = {};
    
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        // Skip sensitive fields
        const lowerKey = key.toLowerCase();
        if (SENSITIVE_FIELDS.some(sensitive => lowerKey.includes(sensitive))) {
          continue; // Don't include this field
        }
        
        sanitized[key] = sanitizeResponseData(data[key]);
      }
    }
    
    return sanitized;
  }
  
  return data;
}

// Middleware to sanitize all JSON responses
export const responseSanitizer = (req: any, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);
  
  res.json = function(data: any) {
    // Only sanitize in production for performance
    const sanitizedData = isProduction ? sanitizeResponseData(data) : data;
    
    // Add security headers for JSON responses
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    
    return originalJson(sanitizedData);
  };
  
  next();
};

// Remove null and undefined values from response
export function removeNullValues(data: any): any {
  if (Array.isArray(data)) {
    return data
      .filter(item => item !== null && item !== undefined)
      .map(item => removeNullValues(item));
  }
  
  if (data !== null && typeof data === 'object') {
    const cleaned: any = {};
    
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key];
        if (value !== null && value !== undefined) {
          cleaned[key] = removeNullValues(value);
        }
      }
    }
    
    return cleaned;
  }
  
  return data;
}

// Format error response for API
export function formatErrorResponse(
  error: any,
  includeDetails: boolean = !isProduction
): any {
  const response: any = {
    success: false,
    message: error.message || 'Ha ocurrido un error',
  };
  
  // Add error code if available
  if (error.code) {
    response.code = error.code;
  }
  
  // Include stack trace only in development
  if (includeDetails && error.stack) {
    response.stack = error.stack;
    response.details = error.details;
  }
  
  return response;
}

// Format success response for API
export function formatSuccessResponse(data: any, message?: string): any {
  return {
    success: true,
    ...(message && { message }),
    data: sanitizeResponseData(data),
  };
}

// Sanitize user object for API response (common use case)
export function sanitizeUserResponse(user: any): any {
  if (!user) return null;
  
  const {
    password,
    passwordHash,
    salt,
    sessionSecret,
    apiKey,
    refreshToken,
    ...sanitizedUser
  } = user;
  
  return sanitizedUser;
}

// Paginated response formatter
export function formatPaginatedResponse(
  data: any[],
  page: number,
  limit: number,
  total: number
): any {
  return {
    success: true,
    data: sanitizeResponseData(data),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

// AWS API Gateway compatible response
export function formatAWSAPIResponse(
  statusCode: number,
  data: any,
  headers?: Record<string, string>
): any {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // Configure based on CORS settings
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
    body: JSON.stringify(sanitizeResponseData(data)),
  };
}

// Check if response should be cached (for CloudFront/ALB caching)
export function shouldCacheResponse(req: any): boolean {
  // Don't cache authenticated requests
  if (req.headers.authorization || req.headers.cookie) {
    return false;
  }
  
  // Only cache GET requests
  if (req.method !== 'GET') {
    return false;
  }
  
  // Don't cache API requests with query params (unless whitelisted)
  if (Object.keys(req.query).length > 0) {
    return false;
  }
  
  return true;
}

// Add cache headers for AWS CloudFront
export function addCacheHeaders(
  res: Response,
  maxAge: number = 300, // 5 minutes default
  isPublic: boolean = false
): void {
  const cacheControl = isPublic
    ? `public, max-age=${maxAge}`
    : `private, max-age=${maxAge}`;
  
  res.set('Cache-Control', cacheControl);
  res.set('Vary', 'Accept-Encoding, Authorization');
}
