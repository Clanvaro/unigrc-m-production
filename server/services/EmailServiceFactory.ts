import { IEmailService } from './IEmailService';
import { MailgunEmailService, MailgunConfig } from './MailgunEmailService';
import { SMTPEmailService, SMTPConfig } from './SMTPEmailService';
import type { IStorage } from '../storage';

export interface EmailConfig {
  provider: 'mailgun' | 'smtp';
  mailgun?: MailgunConfig;
  smtp?: SMTPConfig;
}

export class EmailServiceFactory {
  /**
   * Create an email service based on system configuration
   */
  static async createFromConfig(storage: IStorage): Promise<IEmailService | null> {
    try {
      // Get email configuration from system_config
      const config = await storage.getSystemConfig('email_service_config');
      
      if (!config) {
        // Fall back to environment variables (legacy)
        return this.createFromEnv();
      }

      const emailConfig = JSON.parse(config.configValue) as EmailConfig;
      
      return this.createService(emailConfig);
    } catch (error) {
      console.error('❌ Error loading email service config:', error);
      // Fall back to environment variables
      return this.createFromEnv();
    }
  }

  /**
   * Create service from configuration object
   */
  static createService(config: EmailConfig): IEmailService | null {
    try {
      switch (config.provider) {
        case 'mailgun':
          if (!config.mailgun) {
            throw new Error('Mailgun configuration missing');
          }
          return new MailgunEmailService(config.mailgun);
        
        case 'smtp':
          if (!config.smtp) {
            throw new Error('SMTP configuration missing');
          }
          return new SMTPEmailService(config.smtp);
        
        default:
          console.error(`❌ Unknown email provider: ${config.provider}`);
          return null;
      }
    } catch (error) {
      console.error('❌ Error creating email service:', error);
      return null;
    }
  }

  /**
   * Create service from environment variables (legacy support)
   */
  private static createFromEnv(): IEmailService | null {
    // Try Mailgun from environment
    if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
      console.log('✅ Using Mailgun from environment variables');
      return new MailgunEmailService({
        apiKey: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN,
        from: process.env.MAILGUN_FROM || `noreply@${process.env.MAILGUN_DOMAIN}`,
      });
    }

    // Try SMTP from environment
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
      console.log('✅ Using SMTP from environment variables');
      return new SMTPEmailService({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER,
        password: process.env.SMTP_PASSWORD,
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
      });
    }

    console.log('⚠️  No email service configured');
    return null;
  }
}
