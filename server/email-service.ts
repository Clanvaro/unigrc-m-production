import { IEmailService, EmailParams } from './services/IEmailService';
import { EmailServiceFactory } from './services/EmailServiceFactory';
import type { IStorage } from './storage';

let emailService: IEmailService | null = null;

/**
 * Initialize email service from database configuration
 */
export async function initializeEmailService(storage: IStorage): Promise<void> {
  try {
    emailService = await EmailServiceFactory.createFromConfig(storage);
    if (emailService) {
      console.log(`✅ Email service initialized: ${emailService.getServiceName()}`);
    } else {
      console.log('⚠️  No email service configured');
    }
  } catch (error) {
    console.error('❌ Error initializing email service:', error);
  }
}

/**
 * Get the current email service instance
 */
export function getEmailService(): IEmailService | null {
  return emailService;
}

/**
 * Set email service (for testing or manual configuration)
 */
export function setEmailService(service: IEmailService | null): void {
  emailService = service;
}

/**
 * Send an email using the configured service
 */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!emailService) {
    console.error("❌ Email service not configured - email not sent:", {
      to: params.to,
      subject: params.subject,
      message: "Email service is not initialized. Check email configuration in system settings or environment variables."
    });
    return false;
  }

  try {
    const result = await emailService.sendEmail(params);
    if (!result) {
      console.error("❌ Email service returned false for:", {
        to: params.to,
        subject: params.subject
      });
    }
    return result;
  } catch (error) {
    console.error('❌ Error sending email:', {
      to: params.to,
      subject: params.subject,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return false;
  }
}

/**
 * Test email service connection
 */
export async function testEmailConnection(): Promise<boolean> {
  if (!emailService) {
    return false;
  }
  return await emailService.testConnection();
}

// ==========================================================================
// EMAIL TEMPLATE GENERATORS
// ==========================================================================

export function generateRiskValidationEmail(
  riskCode: string,
  riskName: string,
  processOwner: string,
  validationLink: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Validación de Riesgo Requerida</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="color: #2c3e50; margin-bottom: 20px;">Validación de Riesgo Requerida</h1>
        
        <p>Estimado/a <strong>${processOwner}</strong>,</p>
        
        <p>Se requiere su validación para el siguiente riesgo:</p>
        
        <div style="background-color: white; padding: 15px; border-radius: 6px; border-left: 4px solid #e74c3c; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #e74c3c;">Riesgo ${riskCode}</h3>
          <p style="margin-bottom: 0;"><strong>${riskName}</strong></p>
        </div>
        
        <p>Como dueño del proceso, su aprobación es necesaria para proceder con la gestión de este riesgo.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${validationLink}" 
             style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Validar Riesgo
          </a>
        </div>
        
        <p><strong>¿Qué necesita hacer?</strong></p>
        <ul>
          <li>Haga clic en el botón "Validar Riesgo" para acceder al sistema</li>
          <li>Revise los detalles del riesgo</li>
          <li>Apruebe o rechace el riesgo según corresponda</li>
          <li>Agregue comentarios si es necesario</li>
        </ul>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #666;">
          Este es un mensaje automático del sistema de gestión de riesgos. 
          Si tiene problemas para acceder al enlace, póngase en contacto con el administrador del sistema.
        </p>
      </div>
    </body>
    </html>
  `;
}

