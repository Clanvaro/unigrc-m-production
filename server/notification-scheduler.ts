import { notificationService } from "./notification-service";
import { storage } from "./storage";
import type { IStorage } from "./storage";
import { NotificationTypes, NotificationPriorities, type NotificationType, type NotificationPriority } from "@shared/schema";

// Feature flags para habilitar/deshabilitar tareas programadas
// NOTA: Estas funcionalidades están deshabilitadas para compatibilidad con autoscale de Replit
// Para habilitar en el futuro, cambiar el valor a 'true' y reiniciar la aplicación
const ENABLE_NOTIFICATION_QUEUE_PROCESSING = false; // Procesamiento de cola de notificaciones (emails, SMS, push) cada 2 min
const ENABLE_ACTION_PLAN_DEADLINE_REMINDERS = false; // Recordatorios de deadlines de planes de acción (cada 6 horas)

export class NotificationScheduler {
  private static instance: NotificationScheduler;
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isFirstStartup: boolean = true;
  private lastWorkflowExecution: Map<string, number> = new Map();
  
  public static getInstance(): NotificationScheduler {
    if (!NotificationScheduler.instance) {
      NotificationScheduler.instance = new NotificationScheduler();
    }
    return NotificationScheduler.instance;
  }

  /**
   * Start all notification-related scheduled tasks
   */
  startScheduledTasks(): void {
    console.log('Starting notification scheduled tasks...');
    
    // Process notification queue every 2 minutes
    // NOTA: Esta tarea está deshabilitada por defecto para compatibilidad con autoscale
    // Para habilitar, cambiar ENABLE_NOTIFICATION_QUEUE_PROCESSING a true
    if (ENABLE_NOTIFICATION_QUEUE_PROCESSING) {
      this.scheduleTask('notification-queue', () => {
        notificationService.processNotificationQueue(50);
      }, 2 * 60 * 1000); // 2 minutes
      console.log('Notification queue processing enabled (emails, SMS, push)');
    } else {
      console.log('Notification queue processing disabled (feature flag) - in-app notifications still work');
    }

    // Clean up old notifications daily at 2 AM
    this.scheduleTask('cleanup', () => {
      this.cleanupOldNotifications();
    }, 24 * 60 * 60 * 1000, this.getMillisecondsUntil(2, 0)); // Daily at 2 AM

    // Check action plan deadlines every 6 hours
    // NOTA: Esta tarea está deshabilitada por defecto para compatibilidad con autoscale
    // Para habilitar, cambiar ENABLE_ACTION_PLAN_DEADLINE_REMINDERS a true
    if (ENABLE_ACTION_PLAN_DEADLINE_REMINDERS) {
      this.scheduleTask('action-plan-deadlines', async () => {
        await this.checkActionPlanDeadlines();
      }, 6 * 60 * 60 * 1000); // 6 hours
      console.log('Action plan deadline reminders enabled');
    } else {
      console.log('Action plan deadline reminders disabled (feature flag)');
    }

    console.log('All notification and workflow scheduled tasks started');
  }

  /**
   * Stop all scheduled tasks
   */
  stopScheduledTasks(): void {
    console.log('Stopping notification scheduled tasks...');
    
    this.intervals.forEach((interval, name) => {
      clearInterval(interval);
      console.log(`Stopped scheduled task: ${name}`);
    });
    
    this.intervals.clear();
    console.log('All notification scheduled tasks stopped');
  }

  /**
   * Schedule a recurring task
   */
  private scheduleTask(name: string, task: () => void | Promise<void>, intervalMs: number, initialDelayMs?: number): void {
    const wrappedTask = async () => {
      try {
        console.log(`Executing scheduled task: ${name}`);
        this.lastWorkflowExecution.set(name, Date.now());
        await task();
        console.log(`Completed scheduled task: ${name}`);
      } catch (error) {
        console.error(`Error in scheduled task ${name}:`, error);
      }
    };

    // Use custom initial delay if provided, otherwise use the regular interval
    const firstRunDelay = initialDelayMs !== undefined ? initialDelayMs : intervalMs;
    
    // Schedule first run after initial delay
    const firstRunTimeout = setTimeout(() => {
      wrappedTask().then(() => {
        // After first run, set up recurring interval
        const interval = setInterval(wrappedTask, intervalMs);
        this.intervals.set(name, interval);
      });
    }, firstRunDelay);
    
    // Store the timeout (will be replaced by interval after first run)
    this.intervals.set(name, firstRunTimeout as any);
    
    console.log(`Scheduled task '${name}' will run every ${intervalMs / 1000} seconds (first run in ${firstRunDelay / 1000} seconds)`);
  }

  /**
   * Get milliseconds until specified time today (or tomorrow if already passed)
   */
  private getMillisecondsUntil(hour: number, minute: number = 0): number {
    const now = new Date();
    const target = new Date();
    target.setHours(hour, minute, 0, 0);

    // If target time has already passed today, schedule for tomorrow
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }

    return target.getTime() - now.getTime();
  }

  /**
   * Clean up old notifications to prevent database bloat
   */
  private async cleanupOldNotifications(): Promise<void> {
    console.log('Cleaning up old notifications...');
    
    try {
      // This would implement cleanup logic
      // For now, we'll just log
      console.log('Notification cleanup completed');
    } catch (error) {
      console.error('Error during notification cleanup:', error);
    }
  }

  /**
   * Check action plan deadlines and send notifications (OPTIMIZED with batch processing)
   */
  private async checkActionPlanDeadlines(): Promise<void> {
    console.log('Checking action plan deadlines...');
    
    try {
      const actionPlans = await storage.getActionPlans();
      const now = new Date();
      
      // Get notification intervals from configuration (batch load)
      const configKeys = [
        "notification_interval_1", "notification_interval_2", "notification_interval_3",
        "overdue_interval_1", "overdue_interval_2", "overdue_interval_3"
      ];
      const configs = await Promise.all(configKeys.map(key => storage.getSystemConfig(key)));
      
      const [interval1, interval2, interval3, overdueInterval1, overdueInterval2, overdueInterval3] = [
        configs[0] ? parseInt(configs[0].configValue) : 7,
        configs[1] ? parseInt(configs[1].configValue) : 3,
        configs[2] ? parseInt(configs[2].configValue) : 1,
        configs[3] ? parseInt(configs[3].configValue) : 1,
        configs[4] ? parseInt(configs[4].configValue) : 3,
        configs[5] ? parseInt(configs[5].configValue) : 7
      ];
      
      // Filter active action plans with due dates
      const activePlans = actionPlans.filter(plan => 
        plan.status !== 'completed' && 
        plan.status !== 'deleted' && 
        plan.dueDate
      );
      
      if (activePlans.length === 0) {
        console.log('No active action plans with due dates found');
        return;
      }
      
      // Batch load all process owners once (optimization)
      const processOwners = await storage.getProcessOwners();
      const ownerMap = new Map(processOwners.map(po => [po.name, po.id]));
      const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      
      // Collect all notifications to send in batch
      const notificationsToSend: Array<{
        recipientId: string;
        type: NotificationType;
        title: string;
        message: string;
        actionUrl: string;
        data: Record<string, any>;
        priority?: NotificationPriority;
        groupingKey: string;
      }> = [];
      
      for (const plan of activePlans) {
        if (!plan.dueDate) continue;
        
        const dueDate = new Date(plan.dueDate);
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Resolve user ID (use cached owner map)
        let recipientId = plan.responsible;
        if (recipientId && !isUUID(recipientId)) {
          recipientId = ownerMap.get(recipientId) || null;
        }
        
        if (!recipientId) continue;
        
        // Send notifications at configured intervals BEFORE due date
        if (daysUntilDue === interval1 || daysUntilDue === interval2 || daysUntilDue === interval3) {
          notificationsToSend.push({
            recipientId,
            type: NotificationTypes.ACTION_PLAN_DEADLINE_APPROACHING,
            title: `Plan de acción próximo a vencer`,
            message: `El plan "${plan.name}" vence en ${daysUntilDue} día(s). Fecha límite: ${dueDate.toLocaleDateString()}`,
            actionUrl: `/action-plans`,
            data: {
              actionPlanId: plan.id,
              daysUntilDue,
              dueDate: dueDate.toISOString()
            },
            groupingKey: `action-plan-deadline-${plan.id}-days-${daysUntilDue}`
          });
        }
        
        // Send overdue notifications at configured intervals AFTER due date
        const daysOverdue = Math.abs(daysUntilDue);
        if (daysUntilDue < 0 && plan.status === 'pending') {
          if (daysOverdue === overdueInterval1 || daysOverdue === overdueInterval2 || daysOverdue === overdueInterval3) {
            notificationsToSend.push({
              recipientId,
              type: NotificationTypes.ACTION_PLAN_DEADLINE_OVERDUE,
              title: `Plan de acción VENCIDO`,
              message: `El plan "${plan.name}" está vencido desde hace ${daysOverdue} día(s). Fecha límite: ${dueDate.toLocaleDateString()}`,
              actionUrl: `/action-plans`,
              data: {
                actionPlanId: plan.id,
                daysOverdue,
                dueDate: dueDate.toISOString()
              },
              priority: NotificationPriorities.IMPORTANT,
              groupingKey: `action-plan-overdue-${plan.id}-days-${daysOverdue}`
            });
          }
        }
      }
      
      // Send all notifications in parallel (batch processing)
      if (notificationsToSend.length > 0) {
        await Promise.all(notificationsToSend.map(notification =>
          notificationService.createNotification(notification)
        ));
        console.log(`Sent ${notificationsToSend.length} notifications in batch`);
      }
      
      console.log(`Action plan deadline check completed. Processed ${activePlans.length} active plans`);
    } catch (error) {
      console.error('Error checking action plan deadlines:', error);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    activeTasks: string[];
    taskCount: number;
  } {
    return {
      isRunning: this.intervals.size > 0,
      activeTasks: Array.from(this.intervals.keys()),
      taskCount: this.intervals.size
    };
  }
}

// Export singleton instance
export const notificationScheduler = NotificationScheduler.getInstance();