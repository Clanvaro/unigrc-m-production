import { db } from "./db";
import { 
  notifications, notificationPreferences, notificationTemplates, notificationQueue, notificationStats,
  users, audits, auditTests, auditFindings, actions, risks, controls, macroprocesos, processOwners
} from "@shared/schema";
import type { 
  Notification, InsertNotification, NotificationWithContext,
  NotificationPreference, InsertNotificationPreference,
  NotificationTemplate, InsertNotificationTemplate,
  NotificationQueue as NotificationQueueItem, InsertNotificationQueue,
  NotificationType, NotificationPriority, NotificationChannel,
  User
} from "@shared/schema";
import { eq, and, desc, sql, inArray, lte, gte, isNull, or } from "drizzle-orm";
import { sendEmail } from "./email-service";

// Template variable interpolation interface
interface TemplateVariables {
  user?: User;
  audit?: any;
  auditTest?: any;
  auditFinding?: any;
  action?: any;
  risk?: any;
  control?: any;
  [key: string]: any;
}

// Notification creation options
interface CreateNotificationOptions {
  recipientId: string;
  type: NotificationType;
  priority?: NotificationPriority;
  category?: string;
  title: string;
  message: string;
  actionText?: string;
  actionUrl?: string;
  data?: Record<string, any>;
  channels?: NotificationChannel[];
  scheduledFor?: Date;
  
  // Context references
  auditId?: string;
  auditTestId?: string;
  auditFindingId?: string;
  actionId?: string;
  riskId?: string;
  controlId?: string;
  
  // Grouping and replacement
  groupingKey?: string;
  replacesNotificationId?: string;
  
  createdBy?: string;
}

// Batch notification options
interface BatchNotificationOptions {
  recipients: string[];
  type: NotificationType;
  priority?: NotificationPriority;
  templateKey?: string;
  templateVariables?: TemplateVariables;
  channels?: NotificationChannel[];
  scheduledFor?: Date;
  
  // Common context for all notifications
  auditId?: string;
  auditTestId?: string;
  createdBy?: string;
}

export class NotificationService {
  private static instance: NotificationService;
  
  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // ============= CORE NOTIFICATION METHODS =============
  
  /**
   * Create a single notification
   */
  async createNotification(options: CreateNotificationOptions): Promise<Notification> {
    const {
      recipientId,
      type,
      priority = "normal",
      category = "audit",
      title,
      message,
      actionText,
      actionUrl,
      data = {},
      channels = ["in_app"],
      scheduledFor = new Date(),
      auditId,
      auditTestId,
      auditFindingId,
      actionId,
      riskId,
      controlId,
      groupingKey,
      replacesNotificationId,
      createdBy
    } = options;

    // Apply user preferences to determine final channels
    const finalChannels = await this.applyUserPreferences(recipientId, type, channels);
    
    if (finalChannels.length === 0) {
      console.log(`No delivery channels for notification type ${type} to user ${recipientId} - user disabled all channels`);
      throw new Error("User has disabled all notification channels for this type");
    }

    // Replace existing notification if specified
    if (replacesNotificationId) {
      await this.cancelNotification(replacesNotificationId);
    }

    // Cancel existing notifications with same grouping key to prevent spam
    if (groupingKey) {
      await this.cancelNotificationsByGroupingKey(groupingKey);
    }
    
    // Create the notification
    const notificationData = {
      recipientId,
      type,
      category,
      priority,
      title,
      message,
      actionText,
      actionUrl,
      data,
      channels: finalChannels,
      scheduledFor,
      auditId,
      auditTestId,
      auditFindingId,
      actionId,
      riskId,
      controlId,
      groupingKey,
      replacesNotificationId,
      createdBy
    };

    const [notification] = await db!.insert(notifications).values(notificationData).returning();
    
    // Queue the notification for delivery
    await this.queueNotification(notification.id, finalChannels, scheduledFor);
    
    console.log(`Created notification ${notification.id} for user ${recipientId} with type ${type}`);
    return notification;
  }

  /**
   * Create multiple notifications using a template
   */
  async createBatchNotifications(options: BatchNotificationOptions): Promise<Notification[]> {
    const {
      recipients,
      type,
      priority = "normal",
      templateKey,
      templateVariables = {},
      channels = ["in_app"],
      scheduledFor = new Date(),
      auditId,
      auditTestId,
      createdBy
    } = options;

    if (recipients.length === 0) {
      return [];
    }

    // Get template if specified
    let template: NotificationTemplate | undefined;
    if (templateKey) {
      template = await this.getTemplateByKey(templateKey);
    }

    const createdNotifications: Notification[] = [];

    // Create notifications for each recipient
    for (const recipientId of recipients) {
      try {
        // Get user data for template variables
        const [user] = await db.select().from(users).where(eq(users.id, recipientId));
        if (!user) {
          console.warn(`User ${recipientId} not found, skipping notification`);
          continue;
        }

        const fullTemplateVariables = {
          ...templateVariables,
          user
        };

        let title: string;
        let message: string;
        let actionText: string | undefined;

        if (template) {
          // Use template to generate content
          title = this.interpolateTemplate(template.inAppTitle || template.emailSubject || 'Notificación', fullTemplateVariables);
          message = this.interpolateTemplate(template.inAppMessage || template.emailHtmlBody || 'Tiene una nueva notificación', fullTemplateVariables);
          actionText = template.inAppActionText ? this.interpolateTemplate(template.inAppActionText, fullTemplateVariables) : undefined;
        } else {
          // Fallback content
          title = `Nueva notificación de ${type}`;
          message = `Tiene una nueva notificación de ${type}`;
        }

        const notification = await this.createNotification({
          recipientId,
          type,
          priority,
          title,
          message,
          actionText,
          channels,
          scheduledFor,
          auditId,
          auditTestId,
          createdBy,
          data: fullTemplateVariables
        });

        createdNotifications.push(notification);
      } catch (error) {
        console.error(`Failed to create notification for user ${recipientId}:`, error);
      }
    }

    console.log(`Created ${createdNotifications.length} batch notifications with type ${type}`);
    return createdNotifications;
  }

  // ============= TEMPLATE METHODS =============

  /**
   * Get template by key
   */
  private async getTemplateByKey(key: string): Promise<NotificationTemplate | undefined> {
    const [template] = await db
      .select()
      .from(notificationTemplates)
      .where(and(eq(notificationTemplates.key, key), eq(notificationTemplates.isActive, true)));
    
    return template;
  }

  /**
   * Interpolate template with variables
   */
  private interpolateTemplate(template: string, variables: TemplateVariables): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const keys = path.split('.');
      let value = variables;
      
      for (const key of keys) {
        value = value?.[key];
        if (value === undefined || value === null) {
          return match; // Keep original placeholder if value not found
        }
      }
      
      return String(value);
    });
  }

  // ============= QUEUE METHODS =============

  /**
   * Queue notification for delivery across multiple channels
   */
  private async queueNotification(notificationId: string, channels: NotificationChannel[], scheduledFor: Date): Promise<void> {
    const queueItems: InsertNotificationQueue[] = channels.map(channel => ({
      notificationId,
      channel,
      scheduledFor,
      queuePriority: this.getChannelPriority(channel)
    }));

    await db.insert(notificationQueue).values(queueItems);
  }

  /**
   * Get priority for different channels
   */
  private getChannelPriority(channel: NotificationChannel): number {
    switch (channel) {
      case 'in_app': return 1;   // Highest priority
      case 'push': return 2;     // Medium priority  
      case 'email': return 3;    // Lower priority
      default: return 5;         // Default priority
    }
  }

  /**
   * Process notification queue
   */
  async processNotificationQueue(batchSize: number = 50): Promise<void> {
    console.log('Processing notification queue...');
    
    // Get pending queue items that are ready to process
    const queueItems = await db
      .select({
        id: notificationQueue.id,
        notificationId: notificationQueue.notificationId,
        channel: notificationQueue.channel,
        attempts: notificationQueue.attempts,
        maxAttempts: notificationQueue.maxAttempts
      })
      .from(notificationQueue)
      .where(
        and(
          eq(notificationQueue.status, "queued"),
          lte(notificationQueue.scheduledFor, new Date()),
          or(isNull(notificationQueue.nextRetryAt), lte(notificationQueue.nextRetryAt, new Date()))
        )
      )
      .orderBy(notificationQueue.queuePriority, notificationQueue.scheduledFor)
      .limit(batchSize);

    if (queueItems.length === 0) {
      console.log('No pending notifications in queue');
      return;
    }

    console.log(`Processing ${queueItems.length} queued notifications`);

    for (const item of queueItems) {
      try {
        // Mark as processing
        await db
          .update(notificationQueue)
          .set({ 
            status: "processing", 
            updatedAt: new Date() 
          })
          .where(eq(notificationQueue.id, item.id));

        // Process the notification
        const success = await this.deliverNotification(item.notificationId, item.channel as NotificationChannel);
        
        if (success) {
          // Mark as completed
          await db
            .update(notificationQueue)
            .set({ 
              status: "completed", 
              processedAt: new Date(),
              updatedAt: new Date()
            })
            .where(eq(notificationQueue.id, item.id));

          // Update notification status
          await db
            .update(notifications)
            .set({ 
              status: "sent",
              sentAt: new Date(),
              updatedAt: new Date()
            })
            .where(eq(notifications.id, item.notificationId));

        } else {
          // Handle failure with retry logic
          await this.handleDeliveryFailure(item.id, item.attempts, item.maxAttempts);
        }

      } catch (error) {
        console.error(`Error processing queue item ${item.id}:`, error);
        await this.handleDeliveryFailure(item.id, item.attempts, item.maxAttempts, error);
      }
    }
  }

  /**
   * Handle delivery failure with retry logic
   */
  private async handleDeliveryFailure(queueId: string, attempts: number, maxAttempts: number, error?: any): Promise<void> {
    const nextAttempt = attempts + 1;
    
    if (nextAttempt >= maxAttempts) {
      // Max attempts reached, mark as failed
      await db
        .update(notificationQueue)
        .set({ 
          status: "failed", 
          attempts: nextAttempt,
          lastError: error?.message || 'Unknown error',
          updatedAt: new Date()
        })
        .where(eq(notificationQueue.id, queueId));
    } else {
      // Schedule retry with exponential backoff
      const retryDelay = Math.pow(2, nextAttempt) * 60000; // 2^n minutes in milliseconds
      const nextRetryAt = new Date(Date.now() + retryDelay);
      
      await db
        .update(notificationQueue)
        .set({ 
          status: "queued", 
          attempts: nextAttempt,
          nextRetryAt,
          lastError: error?.message || 'Unknown error',
          updatedAt: new Date()
        })
        .where(eq(notificationQueue.id, queueId));
    }
  }

  // ============= DELIVERY METHODS =============

  /**
   * Deliver notification through specific channel
   */
  private async deliverNotification(notificationId: string, channel: NotificationChannel): Promise<boolean> {
    // Get notification with full context
    const notification = await this.getNotificationWithContext(notificationId);
    if (!notification) {
      console.error(`Notification ${notificationId} not found`);
      return false;
    }

    try {
      switch (channel) {
        case 'in_app':
          return await this.deliverInAppNotification(notification);
        case 'email':
          return await this.deliverEmailNotification(notification);
        case 'push':
          return await this.deliverPushNotification(notification);
        case 'sms':
          console.warn('SMS notifications are not available - service has been disabled');
          return false;
        default:
          console.error(`Unknown notification channel: ${channel}`);
          return false;
      }
    } catch (error) {
      console.error(`Error delivering ${channel} notification ${notificationId}:`, error);
      return false;
    }
  }

  /**
   * Deliver in-app notification (always succeeds as it's stored in DB)
   */
  private async deliverInAppNotification(notification: NotificationWithContext): Promise<boolean> {
    // In-app notifications are already stored in the database
    // We just need to ensure they're marked as delivered
    return true;
  }

  /**
   * Deliver email notification
   */
  private async deliverEmailNotification(notification: NotificationWithContext): Promise<boolean> {
    if (!notification.recipient?.email) {
      console.error(`No email address for user ${notification.recipientId}`);
      return false;
    }

    try {
      await sendEmail({
        from: process.env.MAILGUN_FROM_EMAIL || 'noreply@unigrc.com',
        to: notification.recipient.email,
        subject: notification.title,
        html: this.generateEmailHTML(notification)
      });
      
      console.log(`Email notification sent to ${notification.recipient.email}`);
      return true;
    } catch (error) {
      console.error('Failed to send email notification:', error);
      return false;
    }
  }

  /**
   * Generate HTML email content
   */
  private generateEmailHTML(notification: NotificationWithContext): string {
    const actionButton = notification.actionUrl ? `
      <div style="text-align: center; margin: 24px 0;">
        <a href="${notification.actionUrl}" 
           style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          ${notification.actionText || 'View Details'}
        </a>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${notification.title}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
          <h1 style="margin: 0; color: #1f2937; font-size: 24px;">${notification.title}</h1>
        </div>
        
        <div style="background-color: white; padding: 24px; border-radius: 8px; border: 1px solid #e5e7eb;">
          <p style="margin-top: 0; font-size: 16px;">${notification.message}</p>
          
          ${actionButton}
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          
          <p style="margin-bottom: 0; font-size: 14px; color: #6b7280;">
            This is an automated notification from the Audit Management System.
            <br>
            If you no longer wish to receive these notifications, you can update your preferences in your account settings.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Deliver push notification
   */
  private async deliverPushNotification(notification: NotificationWithContext): Promise<boolean> {
    // TODO: Implement web push notifications
    // For now, just log and return success
    console.log(`Push notification would be sent: ${notification.title}`);
    return true;
  }


  // ============= PREFERENCE METHODS =============

  /**
   * Apply user preferences to determine final delivery channels
   */
  private async applyUserPreferences(userId: string, notificationType: NotificationType, requestedChannels: NotificationChannel[]): Promise<NotificationChannel[]> {
    // Get user preferences for this notification type
    const [preference] = await db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.notificationType, notificationType),
          eq(notificationPreferences.isActive, true)
        )
      );

    if (!preference) {
      // No specific preference found, use default channels
      return requestedChannels;
    }

    if (preference.frequency === 'disabled') {
      return [];
    }

    // Filter requested channels by user's enabled channels
    const enabledChannels = preference.enabledChannels as NotificationChannel[];
    return requestedChannels.filter(channel => enabledChannels.includes(channel));
  }

  /**
   * Get user's notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreference[]> {
    return await db
      .select()
      .from(notificationPreferences)
      .where(and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.isActive, true)
      ));
  }

  /**
   * Update user's notification preference
   */
  async updateUserPreference(userId: string, notificationType: NotificationType, preference: Partial<InsertNotificationPreference>): Promise<NotificationPreference> {
    // Check if preference exists
    const [existing] = await db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.notificationType, notificationType),
          eq(notificationPreferences.isActive, true)
        )
      );

    if (existing) {
      // Update existing preference
      const [updated] = await db
        .update(notificationPreferences)
        .set({
          ...preference,
          updatedAt: new Date()
        })
        .where(eq(notificationPreferences.id, existing.id))
        .returning();
      
      return updated;
    } else {
      // Create new preference
      const [created] = await db
        .insert(notificationPreferences)
        .values({
          userId,
          notificationType,
          ...preference
        })
        .returning();
      
      return created;
    }
  }

  // ============= UTILITY METHODS =============

  /**
   * Get notification with full context
   */
  async getNotificationWithContext(notificationId: string): Promise<NotificationWithContext | undefined> {
    const [notification] = await db!
      .select({
        // Notification fields
        id: notifications.id,
        recipientId: notifications.recipientId,
        auditId: notifications.auditId,
        auditTestId: notifications.auditTestId,
        auditFindingId: notifications.auditFindingId,
        actionId: notifications.actionId,
        riskId: notifications.riskId,
        controlId: notifications.controlId,
        type: notifications.type,
        category: notifications.category,
        priority: notifications.priority,
        title: notifications.title,
        message: notifications.message,
        actionText: notifications.actionText,
        actionUrl: notifications.actionUrl,
        data: notifications.data,
        channels: notifications.channels,
        status: notifications.status,
        isRead: notifications.isRead,
        readAt: notifications.readAt,
        scheduledFor: notifications.scheduledFor,
        sentAt: notifications.sentAt,
        deliveryAttempts: notifications.deliveryAttempts,
        lastDeliveryError: notifications.lastDeliveryError,
        deliveryStatus: notifications.deliveryStatus,
        groupingKey: notifications.groupingKey,
        replacesNotificationId: notifications.replacesNotificationId,
        createdBy: notifications.createdBy,
        createdAt: notifications.createdAt,
        updatedAt: notifications.updatedAt,
        
        // Recipient user
        recipient: users
      })
      .from(notifications)
      .innerJoin(users, eq(notifications.recipientId, users.id))
      .where(eq(notifications.id, notificationId));

    return notification as NotificationWithContext;
  }

  /**
   * Cancel notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    // Cancel the notification
    await db
      .update(notifications)
      .set({ 
        status: "cancelled",
        updatedAt: new Date()
      })
      .where(eq(notifications.id, notificationId));

    // Cancel any queued deliveries
    await db
      .update(notificationQueue)
      .set({ 
        status: "cancelled",
        updatedAt: new Date()
      })
      .where(eq(notificationQueue.notificationId, notificationId));
  }

  /**
   * Cancel notifications by grouping key
   */
  private async cancelNotificationsByGroupingKey(groupingKey: string): Promise<void> {
    // Get notification IDs to cancel
    const notificationsToCancel = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(
        eq(notifications.groupingKey, groupingKey),
        inArray(notifications.status, ["pending", "sent"])
      ));

    if (notificationsToCancel.length === 0) {
      return;
    }

    const notificationIds = notificationsToCancel.map(n => n.id);

    // Cancel notifications
    await db
      .update(notifications)
      .set({ 
        status: "cancelled",
        updatedAt: new Date()
      })
      .where(inArray(notifications.id, notificationIds));

    // Cancel queued deliveries
    await db
      .update(notificationQueue)
      .set({ 
        status: "cancelled",
        updatedAt: new Date()
      })
      .where(inArray(notificationQueue.notificationId, notificationIds));
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ 
        isRead: true,
        readAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(notifications.id, notificationId));
  }

  /**
   * Get user notifications with pagination
   */
  async getUserNotifications(userId: string, options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    type?: NotificationType;
  } = {}): Promise<NotificationWithContext[]> {
    const {
      limit = 20,
      offset = 0,
      unreadOnly = false,
      type
    } = options;

    let query = db!
      .select({
        id: notifications.id,
        recipientId: notifications.recipientId,
        auditId: notifications.auditId,
        auditTestId: notifications.auditTestId,
        auditFindingId: notifications.auditFindingId,
        actionId: notifications.actionId,
        riskId: notifications.riskId,
        controlId: notifications.controlId,
        type: notifications.type,
        category: notifications.category,
        priority: notifications.priority,
        title: notifications.title,
        message: notifications.message,
        actionText: notifications.actionText,
        actionUrl: notifications.actionUrl,
        data: notifications.data,
        channels: notifications.channels,
        status: notifications.status,
        isRead: notifications.isRead,
        readAt: notifications.readAt,
        scheduledFor: notifications.scheduledFor,
        sentAt: notifications.sentAt,
        deliveryAttempts: notifications.deliveryAttempts,
        lastDeliveryError: notifications.lastDeliveryError,
        deliveryStatus: notifications.deliveryStatus,
        groupingKey: notifications.groupingKey,
        replacesNotificationId: notifications.replacesNotificationId,
        createdBy: notifications.createdBy,
        createdAt: notifications.createdAt,
        updatedAt: notifications.updatedAt,
        recipient: users
      })
      .from(notifications)
      .innerJoin(users, eq(notifications.recipientId, users.id));

    // Apply filters
    const conditions = [
      eq(notifications.recipientId, userId)
    ];
    
    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }
    
    if (type) {
      conditions.push(eq(notifications.type, type));
    }

    const result = await query
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    return result as NotificationWithContext[];
  }

  /**
   * Get unread notification count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const [result] = await db!
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.recipientId, userId),
        eq(notifications.isRead, false)
      ));

    return result?.count || 0;
  }

  // ============= PROCESS VALIDATION NOTIFICATION METHODS =============

  /**
   * Get process owner user ID based on macroproceso ID
   * Maps from processOwners to users table via email
   */
  async getProcessOwnerUserIdByMacroprocesoId(macroprocesoId: string): Promise<string | null> {
    try {
      // First get the macroproceso and its owner
      const [macroproceso] = await db
        .select({ 
          ownerId: macroprocesos.ownerId 
        })
        .from(macroprocesos)
        .where(eq(macroprocesos.id, macroprocesoId));

      if (!macroproceso?.ownerId) {
        console.warn(`No owner found for macroproceso ${macroprocesoId}`);
        return null;
      }

      // Get the process owner details
      const [processOwner] = await db
        .select({ 
          email: processOwners.email,
          name: processOwners.name 
        })
        .from(processOwners)
        .where(eq(processOwners.id, macroproceso.ownerId));

      if (!processOwner) {
        console.warn(`Process owner ${macroproceso.ownerId} not found`);
        return null;
      }

      // Find corresponding user by email
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, processOwner.email));

      if (!user) {
        console.warn(`No user found with email ${processOwner.email} for process owner ${processOwner.name}`);
        return null;
      }

      return user.id;
    } catch (error) {
      console.error('Error getting process owner user ID:', error);
      return null;
    }
  }

  /**
   * Notify process owner about validation status change
   */
  async notifyProcessValidationStatusChange(
    macroprocesoId: string,
    processName: string,
    oldStatus: string,
    newStatus: string,
    validatorName: string
  ): Promise<void> {
    const ownerId = await this.getProcessOwnerUserIdByMacroprocesoId(macroprocesoId);
    if (!ownerId) {
      console.warn(`No owner found for macroproceso ${macroprocesoId}`);
      return;
    }

    const statusMessages = {
      pending: "Pendiente",
      in_progress: "En Progreso", 
      completed: "Completada"
    };

    await this.createNotification({
      recipientId: ownerId,
      type: "process_validation_status_changed",
      priority: "normal",
      category: "process_validation",
      title: `Estado de validación actualizado - ${processName}`,
      message: `La validación del proceso "${processName}" cambió de ${statusMessages[oldStatus as keyof typeof statusMessages] || oldStatus} a ${statusMessages[newStatus as keyof typeof statusMessages] || newStatus} por ${validatorName}.`,
      actionText: "Ver Proceso",
      actionUrl: `/validation?tab=risks&process=${macroprocesoId}`,
      channels: ["in_app", "email"],
      data: {
        macroprocesoId,
        oldStatus,
        newStatus,
        processName
      }
    });
  }

  /**
   * Notify process owner about pending risk validation
   */
  async notifyProcessRiskValidationRequired(
    macroprocesoId: string,
    processName: string,
    riskCount: number
  ): Promise<void> {
    try {
      // Get macroproceso owner details
      const [macroproceso] = await db
        .select({ ownerId: macroprocesos.ownerId })
        .from(macroprocesos)
        .where(eq(macroprocesos.id, macroprocesoId));

      if (!macroproceso?.ownerId) {
        console.warn(`No owner found for macroproceso ${macroprocesoId}`);
        return;
      }

      // Get process owner email
      const [processOwner] = await db
        .select({ email: processOwners.email, name: processOwners.name })
        .from(processOwners)
        .where(eq(processOwners.id, macroproceso.ownerId));

      if (!processOwner?.email) {
        console.warn(`No email found for process owner ${macroproceso.ownerId}`);
        return;
      }

      // Check if user exists
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, processOwner.email));

      if (user) {
        // User exists - create full notification (in-app + email)
        await this.createNotification({
          recipientId: user.id,
          type: "process_risk_validation_required",
          priority: "important",
          category: "process_validation",
          title: `Validación de riesgos requerida - ${processName}`,
          message: `Su proceso "${processName}" tiene ${riskCount} riesgo${riskCount > 1 ? 's' : ''} pendiente${riskCount > 1 ? 's' : ''} de validación. Por favor, revise y valide los riesgos asociados.`,
          actionText: "Validar Riesgos",
          actionUrl: `/validation?tab=risks&process=${macroprocesoId}`,
          channels: ["in_app", "email"],
          data: {
            macroprocesoId,
            processName,
            riskCount
          }
        });
      } else {
        // User doesn't exist - send email directly
        console.log(`Sending validation email directly to ${processOwner.email} (no user account)`);
        await sendEmail({
          from: process.env.MAILGUN_FROM_EMAIL || 'noreply@unigrc.com',
          to: processOwner.email,
          subject: `Validación de riesgos requerida - ${processName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Validación de Riesgos Requerida</h2>
              <p>Estimado/a ${processOwner.name},</p>
              <p>Su proceso <strong>"${processName}"</strong> tiene <strong>${riskCount} riesgo${riskCount > 1 ? 's' : ''}</strong> pendiente${riskCount > 1 ? 's' : ''} de validación.</p>
              <p>Por favor, revise y valide los riesgos asociados a la brevedad posible.</p>
              <p style="margin-top: 20px;">
                <a href="https://${process.env.REPLIT_DOMAINS?.split(',')[0]}/validation?tab=risks&process=${macroprocesoId}" 
                   style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Validar Riesgos
                </a>
              </p>
              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                Este es un mensaje automático del sistema UniGRC. Por favor no responda a este correo.
              </p>
            </div>
          `
        });
      }
    } catch (error) {
      console.error('Error sending process risk validation notification:', error);
    }
  }

  /**
   * Notify process owner about pending control validation
   */
  async notifyProcessControlValidationRequired(
    macroprocesoId: string,
    processName: string,
    controlCount: number
  ): Promise<void> {
    try {
      // Get macroproceso owner details
      const [macroproceso] = await db
        .select({ ownerId: macroprocesos.ownerId })
        .from(macroprocesos)
        .where(eq(macroprocesos.id, macroprocesoId));

      if (!macroproceso?.ownerId) {
        console.warn(`No owner found for macroproceso ${macroprocesoId}`);
        return;
      }

      // Get process owner email
      const [processOwner] = await db
        .select({ email: processOwners.email, name: processOwners.name })
        .from(processOwners)
        .where(eq(processOwners.id, macroproceso.ownerId));

      if (!processOwner?.email) {
        console.warn(`No email found for process owner ${macroproceso.ownerId}`);
        return;
      }

      // Check if user exists
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, processOwner.email));

      if (user) {
        // User exists - create full notification (in-app + email)
        await this.createNotification({
          recipientId: user.id,
          type: "process_control_validation_required",
          priority: "important",
          category: "process_validation",
          title: `Validación de controles requerida - ${processName}`,
          message: `Su proceso "${processName}" tiene ${controlCount} control${controlCount > 1 ? 'es' : ''} pendiente${controlCount > 1 ? 's' : ''} de validación. Por favor, revise y valide los controles asociados.`,
          actionText: "Validar Controles",
          actionUrl: `/validation?tab=controls&process=${macroprocesoId}`,
          channels: ["in_app", "email"],
          data: {
            macroprocesoId,
            processName,
            controlCount
          }
        });
      } else {
        // User doesn't exist - send email directly
        console.log(`Sending validation email directly to ${processOwner.email} (no user account)`);
        await sendEmail({
          from: process.env.MAILGUN_FROM_EMAIL || 'noreply@unigrc.com',
          to: processOwner.email,
          subject: `Validación de controles requerida - ${processName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Validación de Controles Requerida</h2>
              <p>Estimado/a ${processOwner.name},</p>
              <p>Su proceso <strong>"${processName}"</strong> tiene <strong>${controlCount} control${controlCount > 1 ? 'es' : ''}</strong> pendiente${controlCount > 1 ? 's' : ''} de validación.</p>
              <p>Por favor, revise y valide los controles asociados a la brevedad posible.</p>
              <p style="margin-top: 20px;">
                <a href="https://${process.env.REPLIT_DOMAINS?.split(',')[0]}/validation?tab=controls&process=${macroprocesoId}" 
                   style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Validar Controles
                </a>
              </p>
              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                Este es un mensaje automático del sistema UniGRC. Por favor no responda a este correo.
              </p>
            </div>
          `
        });
      }
    } catch (error) {
      console.error('Error sending process control validation notification:', error);
    }
  }

  /**
   * Notify process owner about validation completion
   */
  async notifyProcessValidationCompleted(
    macroprocesoId: string,
    processName: string,
    completionPercentage: number
  ): Promise<void> {
    const ownerId = await this.getProcessOwnerUserIdByMacroprocesoId(macroprocesoId);
    if (!ownerId) {
      console.warn(`No owner found for macroproceso ${macroprocesoId}`);
      return;
    }

    await this.createNotification({
      recipientId: ownerId,
      type: "process_validation_completed",
      priority: "normal",
      category: "process_validation",
      title: `Validación completada - ${processName}`,
      message: `¡Excelente! La validación del proceso "${processName}" ha sido completada al ${completionPercentage}%. Todos los riesgos y controles han sido revisados.`,
      actionText: "Ver Resultados",
      actionUrl: `/validation?tab=risks&process=${macroprocesoId}`,
      channels: ["in_app", "email"],
      data: {
        macroprocesoId,
        processName,
        completionPercentage
      }
    });
  }

  /**
   * Notify process owner about overdue validation
   */
  async notifyProcessValidationOverdue(
    macroprocesoId: string,
    processName: string,
    daysPastDue: number
  ): Promise<void> {
    const ownerId = await this.getProcessOwnerUserIdByMacroprocesoId(macroprocesoId);
    if (!ownerId) {
      console.warn(`No owner found for macroproceso ${macroprocesoId}`);
      return;
    }

    await this.createNotification({
      recipientId: ownerId,
      type: "process_validation_overdue",
      priority: "critical",
      category: "process_validation",
      title: `Validación vencida - ${processName}`,
      message: `ATENCIÓN: La validación del proceso "${processName}" está vencida por ${daysPastDue} día${daysPastDue > 1 ? 's' : ''}. Se requiere acción inmediata para completar la validación.`,
      actionText: "Validar Ahora",
      actionUrl: `/validation?tab=risks&process=${macroprocesoId}`,
      channels: ["in_app", "email"],
      data: {
        macroprocesoId,
        processName,
        daysPastDue
      }
    });
  }

  // ============= ACTION PLAN NOTIFICATION METHODS =============
  // NOTA: Estos métodos están preparados pero DESACTIVADOS por defecto
  // Para activar las notificaciones de planes de acción, cambiar ACTION_PLAN_NOTIFICATIONS_ENABLED a true
  
  private readonly ACTION_PLAN_NOTIFICATIONS_ENABLED = false;

  /**
   * Notify about action plan creation
   * STRUCTURE READY - FUNCTIONALITY DISABLED
   */
  async notifyActionPlanCreated(
    actionId: string,
    actionName: string,
    responsible: string,
    createdBy: string,
    dueDate?: Date
  ): Promise<void> {
    if (!this.ACTION_PLAN_NOTIFICATIONS_ENABLED) {
      console.log(`Action plan notifications disabled - would notify creation of: ${actionName}`);
      return;
    }

    // TODO: Activar cuando se requiera la funcionalidad
    /*
    const dueDateText = dueDate ? ` - Vence: ${dueDate.toLocaleDateString()}` : '';
    
    await this.createNotification({
      recipientId: responsible,
      type: "action_plan_created",
      priority: "normal",
      category: "action_plan",
      title: "Nuevo Plan de Acción Asignado",
      message: `Se le ha asignado un nuevo plan de acción: "${actionName}"${dueDateText}`,
      actionText: "Ver Plan de Acción",
      actionUrl: `/actions/${actionId}`,
      actionId,
      channels: ["in_app", "email"],
      data: {
        actionId,
        actionName,
        responsible,
        dueDate,
        createdBy
      },
      createdBy
    });
    */
  }

  /**
   * Notify about action plan assignment change
   * STRUCTURE READY - FUNCTIONALITY DISABLED
   */
  async notifyActionPlanAssigned(
    actionId: string,
    actionName: string,
    newResponsible: string,
    oldResponsible?: string,
    assignedBy?: string
  ): Promise<void> {
    if (!this.ACTION_PLAN_NOTIFICATIONS_ENABLED) {
      console.log(`Action plan notifications disabled - would notify assignment of: ${actionName}`);
      return;
    }

    // TODO: Activar cuando se requiera la funcionalidad
    /*
    await this.createNotification({
      recipientId: newResponsible,
      type: "action_plan_assigned",
      priority: "important",
      category: "action_plan",
      title: "Plan de Acción Reasignado",
      message: `Se le ha asignado el plan de acción: "${actionName}"`,
      actionText: "Ver Plan de Acción",
      actionUrl: `/actions/${actionId}`,
      actionId,
      channels: ["in_app", "email"],
      data: {
        actionId,
        actionName,
        newResponsible,
        oldResponsible,
        assignedBy
      },
      createdBy: assignedBy
    });
    */
  }

  /**
   * Notify about action plan status change
   * STRUCTURE READY - FUNCTIONALITY DISABLED
   */
  async notifyActionPlanStatusChanged(
    actionId: string,
    actionName: string,
    newStatus: string,
    oldStatus: string,
    responsible: string,
    changedBy?: string
  ): Promise<void> {
    if (!this.ACTION_PLAN_NOTIFICATIONS_ENABLED) {
      console.log(`Action plan notifications disabled - would notify status change of: ${actionName} (${oldStatus} -> ${newStatus})`);
      return;
    }

    // TODO: Activar cuando se requiera la funcionalidad
    /*
    const statusNames: Record<string, string> = {
      pending: "Pendiente",
      in_progress: "En Progreso", 
      completed: "Completado",
      overdue: "Vencido",
      cancelled: "Cancelado"
    };

    const priority = newStatus === 'overdue' ? 'critical' : 
                    newStatus === 'completed' ? 'normal' : 'important';

    await this.createNotification({
      recipientId: responsible,
      type: "action_plan_status_changed",
      priority: priority as NotificationPriority,
      category: "action_plan",
      title: `Estado del Plan de Acción Actualizado`,
      message: `El plan de acción "${actionName}" cambió de "${statusNames[oldStatus] || oldStatus}" a "${statusNames[newStatus] || newStatus}"`,
      actionText: "Ver Plan de Acción",
      actionUrl: `/actions/${actionId}`,
      actionId,
      channels: ["in_app", "email"],
      data: {
        actionId,
        actionName,
        newStatus,
        oldStatus,
        responsible,
        changedBy
      },
      createdBy: changedBy
    });
    */
  }

  /**
   * Notify about approaching action plan deadline
   * STRUCTURE READY - FUNCTIONALITY DISABLED
   */
  async notifyActionPlanDeadlineApproaching(
    actionId: string,
    actionName: string,
    responsible: string,
    dueDate: Date,
    daysRemaining: number
  ): Promise<void> {
    if (!this.ACTION_PLAN_NOTIFICATIONS_ENABLED) {
      console.log(`Action plan notifications disabled - would notify deadline approaching for: ${actionName} (${daysRemaining} days)`);
      return;
    }

    // TODO: Activar cuando se requiera la funcionalidad
    /*
    const priority: NotificationPriority = daysRemaining <= 1 ? 'critical' : 
                                          daysRemaining <= 3 ? 'important' : 'normal';
    
    const urgencyText = daysRemaining === 0 ? 'HOY' : 
                       daysRemaining === 1 ? 'MAÑANA' : 
                       `en ${daysRemaining} días`;

    await this.createNotification({
      recipientId: responsible,
      type: daysRemaining === 0 ? "action_plan_deadline_today" : "action_plan_deadline_approaching",
      priority,
      category: "action_plan",
      title: `Plan de Acción Próximo a Vencer`,
      message: `ATENCIÓN: El plan de acción "${actionName}" vence ${urgencyText} (${dueDate.toLocaleDateString()})`,
      actionText: "Actualizar Plan",
      actionUrl: `/actions/${actionId}`,
      actionId,
      channels: ["in_app", "email"],
      data: {
        actionId,
        actionName,
        responsible,
        dueDate,
        daysRemaining
      }
    });
    */
  }

  /**
   * Notify about overdue action plan
   * STRUCTURE READY - FUNCTIONALITY DISABLED
   */
  async notifyActionPlanOverdue(
    actionId: string,
    actionName: string,
    responsible: string,
    dueDate: Date,
    daysPastDue: number
  ): Promise<void> {
    if (!this.ACTION_PLAN_NOTIFICATIONS_ENABLED) {
      console.log(`Action plan notifications disabled - would notify overdue: ${actionName} (${daysPastDue} days overdue)`);
      return;
    }

    // TODO: Activar cuando se requiera la funcionalidad
    /*
    await this.createNotification({
      recipientId: responsible,
      type: "action_plan_deadline_overdue",
      priority: "critical",
      category: "action_plan", 
      title: `Plan de Acción VENCIDO`,
      message: `CRÍTICO: El plan de acción "${actionName}" está vencido por ${daysPastDue} día${daysPastDue > 1 ? 's' : ''}. Fecha de vencimiento: ${dueDate.toLocaleDateString()}`,
      actionText: "Actualizar Estado",
      actionUrl: `/actions/${actionId}`,
      actionId,
      channels: ["in_app", "email"],
      data: {
        actionId,
        actionName,
        responsible,
        dueDate,
        daysPastDue
      }
    });
    */
  }

  /**
   * Notify about action plan progress update
   * STRUCTURE READY - FUNCTIONALITY DISABLED
   */
  async notifyActionPlanProgressUpdated(
    actionId: string,
    actionName: string,
    responsible: string,
    newProgress: number,
    oldProgress: number,
    updatedBy: string
  ): Promise<void> {
    if (!this.ACTION_PLAN_NOTIFICATIONS_ENABLED) {
      console.log(`Action plan notifications disabled - would notify progress update: ${actionName} (${oldProgress}% -> ${newProgress}%)`);
      return;
    }

    // TODO: Activar cuando se requiera la funcionalidad
    /*
    if (responsible !== updatedBy) {
      await this.createNotification({
        recipientId: responsible,
        type: "action_plan_progress_updated",
        priority: "normal",
        category: "action_plan",
        title: "Progreso de Plan de Acción Actualizado",
        message: `El progreso del plan de acción "${actionName}" fue actualizado del ${oldProgress}% al ${newProgress}%`,
        actionText: "Ver Detalles",
        actionUrl: `/actions/${actionId}`,
        actionId,
        channels: ["in_app"],
        data: {
          actionId,
          actionName,
          responsible,
          newProgress,
          oldProgress,
          updatedBy
        },
        createdBy: updatedBy
      });
    }
    */
  }

  /**
   * Notify about action plan completion
   * STRUCTURE READY - FUNCTIONALITY DISABLED
   */
  async notifyActionPlanCompleted(
    actionId: string,
    actionName: string,
    responsible: string,
    completedBy: string,
    completedAt: Date
  ): Promise<void> {
    if (!this.ACTION_PLAN_NOTIFICATIONS_ENABLED) {
      console.log(`Action plan notifications disabled - would notify completion: ${actionName}`);
      return;
    }

    // TODO: Activar cuando se requiera la funcionalidad
    /*
    await this.createNotification({
      recipientId: responsible,
      type: "action_plan_completed",
      priority: "normal",
      category: "action_plan",
      title: "Plan de Acción Completado",
      message: `¡Excelente! El plan de acción "${actionName}" ha sido marcado como completado el ${completedAt.toLocaleDateString()}`,
      actionText: "Ver Resultado",
      actionUrl: `/actions/${actionId}`,
      actionId,
      channels: ["in_app", "email"],
      data: {
        actionId,
        actionName,
        responsible,
        completedBy,
        completedAt
      },
      createdBy: completedBy
    });
    */
  }

  /**
   * Batch notify multiple recipients about action plan events
   * STRUCTURE READY - FUNCTIONALITY DISABLED
   */
  async batchNotifyActionPlan(
    recipients: string[],
    type: NotificationType,
    actionId: string,
    actionName: string,
    customData: Record<string, any> = {},
    createdBy?: string
  ): Promise<void> {
    if (!this.ACTION_PLAN_NOTIFICATIONS_ENABLED) {
      console.log(`Action plan notifications disabled - would batch notify ${recipients.length} recipients about: ${actionName}`);
      return;
    }

    // TODO: Activar cuando se requiera la funcionalidad
    /*
    await this.createBatchNotifications({
      recipients,
      type,
      priority: "normal",
      templateKey: `action_plan_${type}`,
      templateVariables: {
        actionId,
        actionName,
        ...customData
      },
      channels: ["in_app", "email"],
      auditTestId: actionId,
      createdBy
    });
    */
  }
}

// ============= DOCUMENTATION: HOW TO ACTIVATE ACTION PLAN NOTIFICATIONS =============
/*
GUÍA PARA ACTIVAR NOTIFICACIONES DE PLANES DE ACCIÓN:

1. ACTIVAR LA FUNCIONALIDAD:
   - Cambiar ACTION_PLAN_NOTIFICATIONS_ENABLED = true en esta clase (línea ~1137)

2. DESCOMENTAR LOS HOOKS EN server/routes.ts:
   - POST /api/actions (~línea 2971): Descomenta el hook de creación
   - PUT /api/actions/:id (~línea 3019): Descomenta los hooks según necesites:
     * Hook de cambio de responsable
     * Hook de cambio de estado  
     * Hook de cambio de progreso
     * Hook de completación
     * Hook de reapertura

3. CONFIGURAR MONITOREO DE FECHAS LÍMITE (opcional):
   Para notificaciones automáticas de deadlines, agregar en notification-scheduler.ts:
   
   // Ejemplo de tarea programada para revisar vencimientos de planes de acción
   this.scheduleTask('action-plan-deadlines', async () => {
     if (!this.ACTION_PLAN_NOTIFICATIONS_ENABLED) return;
     
     // Obtener acciones próximas a vencer
     const actionsNearDeadline = await storage.getActionsNearDeadline(3); // 3 días
     for (const action of actionsNearDeadline) {
       const daysRemaining = Math.ceil((action.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
       await notificationService.notifyActionPlanDeadlineApproaching(
         action.id,
         action.name,
         action.responsible,
         action.dueDate,
         daysRemaining
       );
     }
     
     // Obtener acciones vencidas
     const overdueActions = await storage.getOverdueActions();
     for (const action of overdueActions) {
       const daysPastDue = Math.floor((Date.now() - action.dueDate.getTime()) / (1000 * 60 * 60 * 24));
       await notificationService.notifyActionPlanOverdue(
         action.id,
         action.name,
         action.responsible,
         action.dueDate,
         daysPastDue
       );
     }
   }, 24 * 60 * 60 * 1000); // Ejecutar diariamente

4. TIPOS DE NOTIFICACIONES DISPONIBLES:
   - action_plan_created: Cuando se crea un plan de acción
   - action_plan_assigned: Cuando se asigna a alguien
   - action_plan_status_changed: Cambios de estado
   - action_plan_deadline_approaching: Próximo a vencer  
   - action_plan_deadline_overdue: Vencido
   - action_plan_deadline_today: Vence hoy
   - action_plan_progress_updated: Actualización de progreso
   - action_plan_completed: Completado
   - action_plan_reopened: Reabierto
   - action_plan_extension_request: Solicitud de extensión
   - action_plan_responsible_changed: Cambio de responsable
   - action_plan_priority_changed: Cambio de prioridad
   - action_plan_review_required: Requiere revisión

5. CANALES DE NOTIFICACIÓN:
   Por defecto se configuran ["in_app", "email"] pero se puede personalizar según:
   - in_app: Notificaciones dentro de la aplicación
   - email: Notificaciones por correo electrónico
   - push: Notificaciones push del navegador
   - sms: Notificaciones por SMS (requiere configuración adicional)

6. CONFIGURACIÓN DE PREFERENCIAS DE USUARIO:
   Los usuarios pueden controlar qué notificaciones reciben a través del sistema
   de preferencias existente en /api/notification-preferences

NOTA: Esta estructura fue creada como preparación pero está desactivada por defecto
para permitir una activación controlada cuando sea requerido por el negocio.
*/

// Export singleton instance
export const notificationService = NotificationService.getInstance();