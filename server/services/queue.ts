// Conditional imports for memory optimization - only load BullMQ/Redis when needed
import type { Queue, Worker, Job } from 'bullmq';
import { sendEmail } from '../email-service';
// AI service import - will be implemented separately

// Check if Redis is available - only enable if explicitly configured
const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true' && (process.env.REDIS_HOST || process.env.REDIS_URL);

// Lazy load BullMQ and Redis only when enabled (saves ~6MB memory when disabled)
let BullMQModule: typeof import('bullmq') | null = null;
async function loadBullMQ() {
  if (!BullMQModule && REDIS_ENABLED) {
    BullMQModule = await import('bullmq');
  }
  return BullMQModule;
}

// Redis connection for BullMQ (only if enabled)
const connection = REDIS_ENABLED ? {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
} : undefined;

// Mock queue for development (when Redis is disabled)
const mockQueue = {
  add: async (name: string, data: any, opts?: any) => {
    console.log(`🔄 Mock queue: ${name} job added (data:`, data, ')');
    return { id: Date.now().toString() };
  },
  process: async (processor: Function) => {
    console.log('🔄 Mock queue: processor registered');
  },
  getJobCounts: async () => ({
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
    paused: 0
  }),
  close: async () => {
    console.log('🔄 Mock queue: closed');
  }
};

// Queue initialization (lazy loaded to avoid loading BullMQ when Redis is disabled)
let emailQueue: any = mockQueue;
let pdfProcessingQueue: any = mockQueue;
let aiProcessingQueue: any = mockQueue;
let queuesInitialized = false;

// Initialize queues - MUST be called during server startup
export async function initializeQueues(): Promise<void> {
  if (queuesInitialized) {
    console.log('⚠️  Queues already initialized, skipping...');
    return;
  }

  if (REDIS_ENABLED) {
    console.log('📦 Initializing BullMQ queues and workers...');
    const bullmq = await loadBullMQ();
    if (bullmq) {
      const { Queue } = bullmq;
      emailQueue = new Queue('email', { connection });
      pdfProcessingQueue = new Queue('pdf-processing', { connection });
      aiProcessingQueue = new Queue('ai-processing', { connection });
      console.log('✅ BullMQ queues initialized');
      
      // Initialize workers
      await initializeWorkers();
      
      queuesInitialized = true;
    }
  } else {
    console.log('📝 Redis disabled, using mock queues');
    queuesInitialized = true;
  }
}

export { emailQueue, pdfProcessingQueue, aiProcessingQueue };

// OPTIMIZED: Lazy getters for queues (initialization happens on first access)
export async function getEmailQueue() {
  if (!queuesInitialized) {
    await initializeQueues();
  }
  return emailQueue;
}

export async function getPdfProcessingQueue() {
  if (!queuesInitialized) {
    await initializeQueues();
  }
  return pdfProcessingQueue;
}

export async function getAiProcessingQueue() {
  if (!queuesInitialized) {
    await initializeQueues();
  }
  return aiProcessingQueue;
}

// Job data interfaces
interface EmailJobData {
  to: string;
  from: string;
  subject: string;
  html: string;
  retries?: number;
}

interface PDFProcessingJobData {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  userId?: string;
  retries?: number;
}

interface AIProcessingJobData {
  prompt: string;
  context?: any;
  userId?: string;
  retries?: number;
}

// Workers (initialized by initializeQueues function)
let emailWorker: any = null;
let pdfWorker: any = null;
let aiWorker: any = null;

// Initialize workers - called automatically by initializeQueues
async function initializeWorkers(): Promise<void> {
  if (!REDIS_ENABLED) return;

  const bullmq = await loadBullMQ();
  if (!bullmq) return;

  const { Worker } = bullmq;

  // Email worker
  emailWorker = new Worker('email', async (job: Job<EmailJobData>) => {
    const { to, from, subject, html } = job.data;
  
    console.log(`📧 Processing email job ${job.id} to ${to}`);
    
    try {
      const success = await sendEmail({ to, from, subject, html });
      
      if (!success) {
        throw new Error('Email sending failed');
      }
      
      console.log(`✅ Email sent successfully to ${to}`);
      return { success: true, timestamp: new Date().toISOString() };
    } catch (error) {
      console.error(`❌ Email job ${job.id} failed:`, error);
      throw error; // Let BullMQ handle retries
    }
  }, { 
    connection,
    concurrency: 5, // Process 5 emails concurrently
    removeOnComplete: { count: 100 }, // Keep last 100 completed jobs
    removeOnFail: { count: 50 } // Keep last 50 failed jobs
  });

  // PDF processing worker
  pdfWorker = new Worker('pdf-processing', async (job: Job<PDFProcessingJobData>) => {
    const { fileBuffer, fileName, mimeType, userId } = job.data;
    
    console.log(`📄 Processing PDF job ${job.id} for file ${fileName}`);
    
    try {
      // Here you would implement PDF text extraction or processing
      // For now, we'll simulate the processing
      const extractedText = `Processed content from ${fileName}`;
      
      console.log(`✅ PDF processed successfully: ${fileName}`);
      return { 
        extractedText, 
        fileName, 
        fileSize: fileBuffer.length,
        timestamp: new Date().toISOString() 
      };
    } catch (error) {
      console.error(`❌ PDF processing job ${job.id} failed:`, error);
      throw error;
    }
  }, { 
    connection,
    concurrency: 3, // Process 3 PDFs concurrently (CPU intensive)
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 25 }
  });

  // AI processing worker
  aiWorker = new Worker('ai-processing', async (job: Job<AIProcessingJobData>) => {
    const { prompt, context, userId } = job.data;
    
    console.log(`🤖 Processing AI job ${job.id}`);
    
    try {
      // TODO: Implement AI service integration
      const result = { text: `AI processing result for: ${prompt.substring(0, 100)}...` };
      
      console.log(`✅ AI processing completed for job ${job.id}`);
      return { 
        result, 
        prompt, 
        timestamp: new Date().toISOString() 
      };
    } catch (error) {
      console.error(`❌ AI processing job ${job.id} failed:`, error);
      throw error;
    }
  }, { 
    connection,
    concurrency: 2, // Limit AI processing concurrency
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 25 }
  });

  console.log('✅ BullMQ workers initialized');
}

// Queue management functions
export class QueueService {
  // Add email to queue
  static async addEmailJob(emailData: EmailJobData, options?: {
    delay?: number;
    attempts?: number;
    priority?: number;
  }): Promise<Job<EmailJobData>> {
    return emailQueue.add('send-email', emailData, {
      delay: options?.delay || 0,
      attempts: options?.attempts || 3,
      priority: options?.priority || 0,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }

  // Add PDF processing to queue
  static async addPDFProcessingJob(pdfData: PDFProcessingJobData, options?: {
    delay?: number;
    attempts?: number;
  }): Promise<Job<PDFProcessingJobData>> {
    return pdfProcessingQueue.add('process-pdf', pdfData, {
      delay: options?.delay || 0,
      attempts: options?.attempts || 2,
      backoff: {
        type: 'exponential',
        delay: 10000,
      },
    });
  }

  // Add AI processing to queue
  static async addAIProcessingJob(aiData: AIProcessingJobData, options?: {
    delay?: number;
    attempts?: number;
  }): Promise<Job<AIProcessingJobData>> {
    return aiProcessingQueue.add('process-ai', aiData, {
      delay: options?.delay || 0,
      attempts: options?.attempts || 2,
      backoff: {
        type: 'exponential',
        delay: 15000,
      },
    });
  }

  // Get queue statistics
  static async getQueueStats() {
    const emailStats = await emailQueue.getJobCounts();
    const pdfStats = await pdfProcessingQueue.getJobCounts();
    const aiStats = await aiProcessingQueue.getJobCounts();

    return {
      email: emailStats,
      pdf: pdfStats,
      ai: aiStats,
      timestamp: new Date().toISOString()
    };
  }
}

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  console.log('📊 Shutting down queue workers...');
  const closePromises = [];
  if (emailWorker) closePromises.push(emailWorker.close());
  if (pdfWorker) closePromises.push(pdfWorker.close());
  if (aiWorker) closePromises.push(aiWorker.close());
  await Promise.all(closePromises);
});

process.on('SIGINT', async () => {
  console.log('📊 Shutting down queue workers...');
  const closePromises = [];
  if (emailWorker) closePromises.push(emailWorker.close());
  if (pdfWorker) closePromises.push(pdfWorker.close());
  if (aiWorker) closePromises.push(aiWorker.close());
  await Promise.all(closePromises);
});

export { emailWorker, pdfWorker, aiWorker };