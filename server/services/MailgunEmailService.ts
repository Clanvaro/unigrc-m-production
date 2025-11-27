import Mailgun from 'mailgun.js';
import formData from 'form-data';
import { IEmailService, EmailParams } from './IEmailService';

export interface MailgunConfig {
  apiKey: string;
  domain: string;
  from: string;
}

export class MailgunEmailService implements IEmailService {
  private client: any;
  private domain: string;
  private defaultFrom: string;

  constructor(config: MailgunConfig) {
    const mailgun = new Mailgun(formData);
    this.client = mailgun.client({
      username: 'api',
      key: config.apiKey,
    });
    this.domain = config.domain;
    this.defaultFrom = config.from;
  }

  async sendEmail(params: EmailParams): Promise<boolean> {
    try {
      const messageData = {
        from: params.from || this.defaultFrom,
        to: params.to,
        subject: params.subject,
        html: params.html,
      };

      const result = await this.client.messages.create(this.domain, messageData);
      console.log(`✅ [Mailgun] Email sent to ${params.to} - Message ID: ${result.id}`);
      return true;
    } catch (error) {
      console.error('❌ [Mailgun] Error sending email:', error);
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test by sending a test message (we just validate client is set up)
      if (!this.client || !this.domain) {
        return false;
      }
      // Mailgun doesn't have a ping endpoint, so we just check configuration
      return true;
    } catch (error) {
      console.error('❌ [Mailgun] Connection test failed:', error);
      return false;
    }
  }

  getServiceName(): string {
    return 'mailgun';
  }
}
