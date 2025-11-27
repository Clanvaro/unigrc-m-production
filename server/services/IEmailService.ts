/**
 * Interface for email service providers
 */
export interface EmailParams {
  to: string;
  from: string;
  subject: string;
  html: string;
}

export interface IEmailService {
  /**
   * Send an email
   * @returns true if successful, false otherwise
   */
  sendEmail(params: EmailParams): Promise<boolean>;
  
  /**
   * Test the email service configuration
   * @returns true if configuration is valid, false otherwise
   */
  testConnection(): Promise<boolean>;
  
  /**
   * Get the service name
   */
  getServiceName(): string;
}
