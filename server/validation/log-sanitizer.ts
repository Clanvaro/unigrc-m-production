import { Request } from 'express';

// Patterns to detect and redact sensitive data
const SENSITIVE_PATTERNS = {
  // Credit card numbers (various formats)
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  
  // Social Security Numbers (US format)
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  
  // Email addresses (partial redaction)
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Phone numbers (various formats)
  phone: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
  
  // API keys and tokens (common patterns)
  apiKey: /\b[A-Za-z0-9]{32,}\b/g,
  bearer: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  
  // AWS credentials
  awsAccessKey: /AKIA[0-9A-Z]{16}/g,
  awsSecretKey: /[A-Za-z0-9/+=]{40}/g,
  
  // Passwords in URLs or JSON
  password: /(password|pwd|pass)["']?\s*[:=]\s*["']?([^"'\s&]+)/gi,
  
  // JWT tokens
  jwt: /eyJ[A-Za-z0-9-_=]+\.eyJ[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g,
  
  // IP addresses (sometimes sensitive in certain contexts)
  ipv4: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
};

// Fields that should never be logged
const BLOCKED_FIELDS = [
  'password',
  'pwd',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'privateKey',
  'private_key',
  'sessionId',
  'session_id',
  'csrf',
  'csrfToken',
  'authToken',
  'auth_token',
];

// Redaction replacement texts
const REDACTED_TEXT = '[REDACTED]';
const REDACTED_EMAIL = (email: string) => {
  const [local, domain] = email.split('@');
  return `${local.substring(0, 2)}***@${domain}`;
};
const REDACTED_PHONE = '***-***-####';
const REDACTED_CARD = '****-****-****-####';

// Sanitize a string value
export function sanitizeString(value: string): string {
  let sanitized = value;
  
  // Redact credit cards
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.creditCard, REDACTED_CARD);
  
  // Redact SSN
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.ssn, '***-**-####');
  
  // Redact emails (partial)
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.email, (match) => REDACTED_EMAIL(match));
  
  // Redact phone numbers
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.phone, REDACTED_PHONE);
  
  // Redact Bearer tokens
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.bearer, 'Bearer [REDACTED]');
  
  // Redact JWT
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.jwt, '[JWT_REDACTED]');
  
  // Redact AWS credentials
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.awsAccessKey, 'AKIA[REDACTED]');
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.awsSecretKey, '[AWS_SECRET_REDACTED]');
  
  // Redact passwords in text
  sanitized = sanitized.replace(SENSITIVE_PATTERNS.password, (match, key) => `${key}=${REDACTED_TEXT}`);
  
  return sanitized;
}

// Sanitize an object recursively
export function sanitizeObject(obj: any, depth: number = 0): any {
  // Prevent infinite recursion
  if (depth > 10) return '[MAX_DEPTH_REACHED]';
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }
  
  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // Check if key is in blocked list
        const lowerKey = key.toLowerCase();
        if (BLOCKED_FIELDS.some(blocked => lowerKey.includes(blocked))) {
          sanitized[key] = REDACTED_TEXT;
        } else {
          sanitized[key] = sanitizeObject(obj[key], depth + 1);
        }
      }
    }
    
    return sanitized;
  }
  
  return obj;
}

// Sanitize request for logging
export function sanitizeRequest(req: Request): any {
  return {
    method: req.method,
    url: sanitizeString(req.url),
    path: req.path,
    query: sanitizeObject(req.query),
    params: sanitizeObject(req.params),
    headers: sanitizeHeaders(req.headers),
    body: sanitizeObject(req.body),
    ip: maskIP(req.ip),
    userAgent: req.get('user-agent'),
  };
}

// Sanitize headers (remove sensitive ones)
export function sanitizeHeaders(headers: any): any {
  const sanitized: any = {};
  
  for (const key in headers) {
    const lowerKey = key.toLowerCase();
    
    // Block sensitive headers
    if (
      lowerKey.includes('authorization') ||
      lowerKey.includes('cookie') ||
      lowerKey.includes('token') ||
      lowerKey.includes('api-key') ||
      lowerKey.includes('csrf')
    ) {
      sanitized[key] = REDACTED_TEXT;
    } else {
      sanitized[key] = headers[key];
    }
  }
  
  return sanitized;
}

// Mask IP address (GDPR compliance - keep first 3 octets for IPv4)
export function maskIP(ip?: string): string {
  if (!ip) return 'unknown';
  
  // For IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
    }
  }
  
  // For IPv6 (keep first 4 groups)
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length >= 4) {
      return `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]}:****`;
    }
  }
  
  return '[IP_MASKED]';
}

// Sanitize error for logging (remove stack traces in production)
export function sanitizeError(error: any): any {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    message: sanitizeString(error.message || 'Unknown error'),
    code: error.code,
    status: error.status || error.statusCode,
    // Only include stack in development
    ...(isProduction ? {} : { stack: error.stack }),
  };
}

// Create a safe log message
export function createSafeLogMessage(
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  metadata?: any
): string {
  const timestamp = new Date().toISOString();
  const sanitizedMessage = sanitizeString(message);
  const sanitizedMetadata = metadata ? sanitizeObject(metadata) : undefined;
  
  return JSON.stringify({
    timestamp,
    level,
    message: sanitizedMessage,
    ...(sanitizedMetadata && { metadata: sanitizedMetadata }),
  });
}

// AWS CloudWatch Logs specific sanitization
export function sanitizeForCloudWatch(logData: any): any {
  // CloudWatch has specific requirements
  const sanitized = sanitizeObject(logData);
  
  // Ensure log size doesn't exceed CloudWatch limits (256KB per event)
  const logString = JSON.stringify(sanitized);
  const maxSize = 256 * 1024; // 256KB
  
  if (Buffer.byteLength(logString, 'utf8') > maxSize) {
    return {
      ...sanitized,
      _truncated: true,
      _originalSize: Buffer.byteLength(logString, 'utf8'),
      message: logString.substring(0, maxSize - 1000) + '... [TRUNCATED]',
    };
  }
  
  return sanitized;
}
