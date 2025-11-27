import { Request, Response } from 'express';
import multer from 'multer';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';
import { ObjectStorageService } from '../objectStorage';
const objectStorageService = new ObjectStorageService();
import { QueueService } from './queue';

// Maximum file size per upload (reduced from 50MB to 10MB for better performance)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES_PER_REQUEST = 3; // Reduced from 5 to 3

// Allowed file types (same as before)
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'image/jpeg',
  'image/png',
  'image/gif',
  'text/plain',
  'text/csv'
];

// Custom storage engine that streams directly to object storage
class StreamingStorage implements multer.StorageEngine {
  _handleFile(req: Request, file: Express.Multer.File, callback: (error?: any, info?: Partial<Express.Multer.File>) => void): void {
    try {
      console.log(`📤 Starting streaming upload for file: ${file.originalname}`);
      
      // Generate unique filename
      const fileId = randomUUID();
      const extension = file.originalname.split('.').pop();
      const fileName = `${fileId}.${extension}`;
      
      // Create a buffer to collect file data
      const chunks: Buffer[] = [];
      let totalSize = 0;
      
      // Handle the file stream
      file.stream.on('data', (chunk: Buffer) => {
        totalSize += chunk.length;
        
        // Check size limit during streaming
        if (totalSize > MAX_FILE_SIZE) {
          const error = new Error(`File ${file.originalname} exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
          return callback(error);
        }
        
        chunks.push(chunk);
      });
      
      file.stream.on('error', (error: Error) => {
        console.error(`❌ Stream error for file ${file.originalname}:`, error);
        callback(error);
      });
      
      file.stream.on('end', async () => {
        try {
          // Combine all chunks into a single buffer
          const fileBuffer = Buffer.concat(chunks);
          
          console.log(`📊 File ${file.originalname} received: ${fileBuffer.length} bytes`);
          
          // Upload to object storage
          const uploadResult = await objectStorageService.uploadObjectFromBuffer(
            fileBuffer, 
            fileName, 
            file.mimetype
          );
          
          console.log(`✅ File uploaded successfully: ${fileName} -> ${uploadResult.objectPath}`);
          
          // If it's a PDF, queue for background processing
          if (file.mimetype === 'application/pdf') {
            await QueueService.addPDFProcessingJob({
              fileBuffer,
              fileName,
              mimeType: file.mimetype,
              userId: (req as any).user?.id
            });
            console.log(`📄 PDF queued for processing: ${fileName}`);
          }
          
          // Return file info
          callback(null, {
            filename: fileName,
            path: uploadResult.objectPath,
            size: fileBuffer.length,
            destination: uploadResult.storageUrl,
            fieldname: file.fieldname,
            originalname: file.originalname,
            encoding: file.encoding,
            mimetype: file.mimetype
          });
          
        } catch (uploadError) {
          console.error(`❌ Upload failed for file ${file.originalname}:`, uploadError);
          callback(uploadError);
        }
      });
      
    } catch (error) {
      console.error(`❌ File handling error for ${file.originalname}:`, error);
      callback(error);
    }
  }

  _removeFile(req: Request, file: Express.Multer.File, callback: (error: Error | null) => void): void {
    // For streaming storage, we don't need to remove anything locally
    callback(null);
  }
}

// Create multer instance with streaming storage
export const streamingUpload = multer({
  storage: new StreamingStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES_PER_REQUEST,
    fieldSize: 1024 * 1024, // 1MB field size limit
  },
  fileFilter: (req, file, callback) => {
    console.log(`🔍 Validating file: ${file.originalname} (${file.mimetype})`);
    
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      callback(null, true);
    } else {
      const error = new Error(
        `File type ${file.mimetype} not allowed. Allowed types: PDF, Word, Excel, PowerPoint, Images, Text, CSV`
      );
      callback(error);
    }
  }
});

// Middleware for handling streaming uploads with better error handling
export const handleStreamingUpload = (fieldName: string = 'files', maxFiles: number = MAX_FILES_PER_REQUEST) => {
  return (req: Request, res: Response, next: Function) => {
    const upload = streamingUpload.array(fieldName, maxFiles);
    
    upload(req, res, (error) => {
      if (error instanceof multer.MulterError) {
        console.error('❌ Multer error:', error);
        
        let message = 'File upload error';
        let statusCode = 400;
        
        switch (error.code) {
          case 'LIMIT_FILE_SIZE':
            message = `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`;
            break;
          case 'LIMIT_FILE_COUNT':
            message = `Too many files. Maximum is ${MAX_FILES_PER_REQUEST} files per request`;
            break;
          case 'LIMIT_UNEXPECTED_FILE':
            message = 'Unexpected file field';
            break;
          case 'LIMIT_FIELD_VALUE':
            message = 'Form field value too large';
            break;
          default:
            message = error.message;
        }
        
        return res.status(statusCode).json({ error: message });
      }
      
      if (error) {
        console.error('❌ Upload error:', error);
        return res.status(500).json({ 
          error: error.message || 'File upload failed' 
        });
      }
      
      // Log successful upload
      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        console.log(`✅ Successfully uploaded ${files.length} files`);
        files.forEach(file => {
          console.log(`   - ${file.originalname} (${file.size} bytes) -> ${file.path}`);
        });
      }
      
      next();
    });
  };
};

// Utility function for processing uploaded files
export class FileProcessor {
  static async processUploadedFiles(files: Express.Multer.File[], userId?: string) {
    const results = [];
    
    for (const file of files) {
      try {
        const result = {
          id: randomUUID(),
          originalName: file.originalname,
          fileName: file.filename,
          size: file.size,
          mimeType: file.mimetype,
          objectPath: file.path,
          storageUrl: file.destination,
          uploadedAt: new Date().toISOString(),
          status: 'uploaded' as const
        };
        
        // Queue background processing for specific file types
        if (file.mimetype === 'application/pdf') {
          console.log(`📄 PDF ${file.originalname} queued for text extraction`);
        }
        
        results.push(result);
      } catch (error) {
        console.error(`❌ Error processing file ${file.originalname}:`, error);
        results.push({
          originalName: file.originalname,
          error: error instanceof Error ? error.message : 'Processing failed',
          status: 'error' as const
        });
      }
    }
    
    return results;
  }
}