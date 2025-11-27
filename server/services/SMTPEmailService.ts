import nodemailer from 'nodemailer';
import { IEmailService, EmailParams } from './IEmailService';

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean; // true for 465, false for other ports
  user: string;
  password: string;
  from: string;
}

export class SMTPEmailService implements IEmailService {
  private transporter: nodemailer.Transporter;
  private defaultFrom: string;

  constructor(config: SMTPConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });
    this.defaultFrom = config.from;
  }

  async sendEmail(params: EmailParams): Promise<boolean> {
    try {
      const info = await this.transporter.sendMail({
        from: params.from || this.defaultFrom,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });

      console.log(`✅ [SMTP] Email sent to ${params.to} - Message ID: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('❌ [SMTP] Error sending email:', error);
      return false;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ [SMTP] Connection test successful');
      return true;
    } catch (error) {
      console.error('❌ [SMTP] Connection test failed:', error);
      return false;
    }
  }

  getServiceName(): string {
    return 'smtp';
  }
}
