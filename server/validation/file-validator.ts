import { Request } from 'express';
import path from 'path';
import { sanitizePath } from './input-sanitizer';

const isProduction = process.env.NODE_ENV === 'production';

// Allowed MIME types for file uploads
export const ALLOWED_MIME_TYPES = {
  images: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
  ],
  archives: [
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
  ],
  all: [] as string[], // Will be populated below
};

// Combine all allowed types
ALLOWED_MIME_TYPES.all = [
  ...ALLOWED_MIME_TYPES.images,
  ...ALLOWED_MIME_TYPES.documents,
  ...ALLOWED_MIME_TYPES.archives,
];

// Allowed file extensions
export const ALLOWED_EXTENSIONS = {
  images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
  documents: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'],
  archives: ['.zip', '.rar', '.7z'],
  all: [] as string[],
};

ALLOWED_EXTENSIONS.all = [
  ...ALLOWED_EXTENSIONS.images,
  ...ALLOWED_EXTENSIONS.documents,
  ...ALLOWED_EXTENSIONS.archives,
];

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  archive: 50 * 1024 * 1024, // 50MB
  default: 10 * 1024 * 1024, // 10MB
};

// AWS-specific limits
export const AWS_LIMITS = {
  // AWS ALB request size limit
  ALB_MAX_REQUEST_SIZE: 1024 * 1024, // 1MB (for non-multipart)
  
  // AWS Lambda payload limit (if using Lambda for processing)
  LAMBDA_PAYLOAD_LIMIT: 6 * 1024 * 1024, // 6MB
  
  // Recommended multipart chunk size for S3
  S3_MULTIPART_CHUNK: 5 * 1024 * 1024, // 5MB
};

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

// Validate file type by MIME and extension
export function validateFileType(
  file: Express.Multer.File,
  allowedTypes: string[] = ALLOWED_MIME_TYPES.all,
  allowedExtensions: string[] = ALLOWED_EXTENSIONS.all
): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Extract extension
  const ext = path.extname(file.originalname).toLowerCase();
  
  // Validate MIME type
  if (!allowedTypes.includes(file.mimetype)) {
    errors.push(`Tipo de archivo no permitido: ${file.mimetype}`);
  }
  
  // Validate extension
  if (!allowedExtensions.includes(ext)) {
    errors.push(`Extensión de archivo no permitida: ${ext}`);
  }
  
  // Cross-check MIME and extension consistency
  const isImageMime = ALLOWED_MIME_TYPES.images.includes(file.mimetype);
  const isImageExt = ALLOWED_EXTENSIONS.images.includes(ext);
  
  if (isImageMime !== isImageExt) {
    warnings.push('La extensión del archivo no coincide con su tipo MIME');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// Validate file size
export function validateFileSize(
  file: Express.Multer.File,
  maxSize?: number
): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Determine max size based on file type
  let limit = maxSize || FILE_SIZE_LIMITS.default;
  
  if (ALLOWED_MIME_TYPES.images.includes(file.mimetype)) {
    limit = maxSize || FILE_SIZE_LIMITS.image;
  } else if (ALLOWED_MIME_TYPES.documents.includes(file.mimetype)) {
    limit = maxSize || FILE_SIZE_LIMITS.document;
  } else if (ALLOWED_MIME_TYPES.archives.includes(file.mimetype)) {
    limit = maxSize || FILE_SIZE_LIMITS.archive;
  }
  
  if (file.size > limit) {
    errors.push(
      `Archivo demasiado grande: ${(file.size / 1024 / 1024).toFixed(2)}MB. Máximo: ${(limit / 1024 / 1024).toFixed(2)}MB`
    );
  }
  
  // AWS-specific warnings
  if (file.size > AWS_LIMITS.S3_MULTIPART_CHUNK) {
    warnings.push('Archivo grande detectado. Se recomienda usar multipart upload para S3');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// Validate filename (prevent malicious filenames)
export function validateFileName(filename: string): FileValidationResult {
  const errors: string[] = [];
  const sanitized = sanitizePath(filename);
  
  // Check for directory traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    errors.push('Nombre de archivo contiene caracteres no permitidos');
  }
  
  // Check for null bytes
  if (filename.includes('\0')) {
    errors.push('Nombre de archivo contiene bytes nulos');
  }
  
  // Check for executable extensions (security risk)
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js', '.jar'];
  const ext = path.extname(filename).toLowerCase();
  
  if (dangerousExtensions.includes(ext)) {
    errors.push(`Extensión de archivo no segura: ${ext}`);
  }
  
  // Check length (AWS S3 object key limit is 1024 bytes)
  if (filename.length > 255) {
    errors.push('Nombre de archivo demasiado largo (máximo 255 caracteres)');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Complete file validation
export function validateFile(
  file: Express.Multer.File,
  options?: {
    allowedTypes?: string[];
    allowedExtensions?: string[];
    maxSize?: number;
  }
): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate filename
  const filenameResult = validateFileName(file.originalname);
  errors.push(...filenameResult.errors);
  
  // Validate file type
  const typeResult = validateFileType(
    file,
    options?.allowedTypes,
    options?.allowedExtensions
  );
  errors.push(...typeResult.errors);
  if (typeResult.warnings) warnings.push(...typeResult.warnings);
  
  // Validate file size
  const sizeResult = validateFileSize(file, options?.maxSize);
  errors.push(...sizeResult.errors);
  if (sizeResult.warnings) warnings.push(...sizeResult.warnings);
  
  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

// Generate safe filename for storage
export function generateSafeFilename(originalName: string, userId?: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const basename = path.basename(originalName, ext);
  
  // Sanitize basename
  const safeName = basename
    .replace(/[^a-zA-Z0-9\-_]/g, '_')
    .substring(0, 50); // Limit length
  
  // Add timestamp and random string
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const userPrefix = userId ? `${userId.substring(0, 8)}_` : '';
  
  return `${userPrefix}${safeName}_${timestamp}_${random}${ext}`;
}

// Multer file filter for use with multer configuration
export function createMulterFileFilter(
  allowedTypes?: string[],
  allowedExtensions?: string[]
) {
  return (req: Request, file: Express.Multer.File, cb: any) => {
    const result = validateFileType(file, allowedTypes, allowedExtensions);
    
    if (!result.valid) {
      cb(new Error(result.errors.join(', ')), false);
    } else {
      cb(null, true);
    }
  };
}

// Check if request is multipart for proper AWS ALB handling
export function isMultipartRequest(req: Request): boolean {
  const contentType = req.get('Content-Type');
  return contentType?.includes('multipart/form-data') || false;
}
