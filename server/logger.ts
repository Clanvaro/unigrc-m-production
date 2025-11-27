import { Request, Response } from 'express';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

class Logger {
  private minLevel: LogLevel = 'info';
  private levels: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
  };

  constructor() {
    const env = process.env.NODE_ENV || 'development';
    this.minLevel = env === 'production' ? 'warn' : 'debug';
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] <= this.levels[this.minLevel];
  }

  private formatLog(entry: LogEntry): string {
    const parts = [
      `[${entry.timestamp}]`,
      `[${entry.level.toUpperCase()}]`,
      entry.context ? `[${entry.context}]` : '',
      entry.message
    ].filter(Boolean);

    let output = parts.join(' ');

    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      output += '\n  Metadata: ' + JSON.stringify(entry.metadata, null, 2);
    }

    if (entry.error) {
      output += '\n  Error: ' + entry.error.message;
      if (entry.error.stack) {
        output += '\n  Stack: ' + entry.error.stack;
      }
    }

    return output;
  }

  private log(level: LogLevel, message: string, context?: string, metadata?: Record<string, any>, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      metadata
    };

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      };
    }

    const formatted = this.formatLog(entry);

    switch (level) {
      case 'error':
        console.error(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'debug':
        console.debug(formatted);
        break;
    }
  }

  error(message: string, context?: string, metadata?: Record<string, any>, error?: Error): void {
    this.log('error', message, context, metadata, error);
  }

  warn(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log('warn', message, context, metadata);
  }

  info(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log('info', message, context, metadata);
  }

  debug(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log('debug', message, context, metadata);
  }

  logRequest(req: Request, res: Response, duration?: number): void {
    const metadata: Record<string, any> = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      userAgent: req.get('user-agent'),
      ip: req.ip
    };

    if (duration !== undefined) {
      metadata.duration = `${duration}ms`;
    }

    const level: LogLevel = res.statusCode >= 500 ? 'error' 
                          : res.statusCode >= 400 ? 'warn' 
                          : 'info';

    this.log(level, `${req.method} ${req.url}`, 'HTTP', metadata);
  }

  logDatabaseQuery(query: string, duration?: number, error?: Error): void {
    const metadata: Record<string, any> = { query };
    
    if (duration !== undefined) {
      metadata.duration = `${duration}ms`;
    }

    if (error) {
      this.error('Database query failed', 'DATABASE', metadata, error);
    } else if (duration && duration > 1000) {
      this.warn('Slow database query', 'DATABASE', metadata);
    } else {
      this.debug('Database query executed', 'DATABASE', metadata);
    }
  }

  logAuthentication(userId: string | undefined, success: boolean, reason?: string): void {
    const metadata: Record<string, any> = { 
      userId: userId || 'unknown',
      success 
    };

    if (reason) {
      metadata.reason = reason;
    }

    if (success) {
      this.info('Authentication successful', 'AUTH', metadata);
    } else {
      this.warn('Authentication failed', 'AUTH', metadata);
    }
  }
}

export const logger = new Logger();
