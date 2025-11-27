import { db } from "./db";
import { auditTests, users } from "@shared/schema";
import { and, lte, gte, eq, sql, isNull } from "drizzle-orm";
import { notificationService } from "./notification-service";
import { NotificationTypes } from "@shared/schema";

export interface DeadlineAlert {
  testId: string;
  testName: string;
  executorId: string;
  supervisorId?: string;
  plannedEndDate: Date;
  daysRemaining: number;
  priority: 'critical' | 'important' | 'normal';
  status: string;
  tenantId: string;
}

export class DeadlineMonitorService {
  private static instance: DeadlineMonitorService;
  
  public static getInstance(): DeadlineMonitorService {
    if (!DeadlineMonitorService.instance) {
      DeadlineMonitorService.instance = new DeadlineMonitorService();
    }
    return DeadlineMonitorService.instance;
  }

  /**
   * Check for upcoming and overdue deadlines
   */
  async checkDeadlines(): Promise<void> {
    try {
      console.log('Checking audit test deadlines...');
      
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      // Get tests with approaching or overdue deadlines
      const testsWithDeadlines = await db
        .select({
          id: auditTests.id,
          name: auditTests.name,
          executorId: auditTests.executorId,
          supervisorId: auditTests.supervisorId,
          plannedEndDate: auditTests.plannedEndDate,
          status: auditTests.status,
          priority: auditTests.priority,
          tenantId: auditTests.tenantId
        })
        .from(auditTests)
        .where(
          and(
            eq(auditTests.status, 'in_progress'), // Only check tests in progress
            lte(auditTests.plannedEndDate, sevenDaysFromNow), // Within 7 days or overdue
            isNull(auditTests.actualEndDate) // Not completed yet
          )
        );

      if (testsWithDeadlines.length === 0) {
        console.log('No upcoming deadlines found');
        return;
      }

      console.log(`Found ${testsWithDeadlines.length} tests with approaching/overdue deadlines`);

      // Process each test
      for (const test of testsWithDeadlines) {
        if (!test.plannedEndDate) continue;

        const daysRemaining = Math.ceil((test.plannedEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        
        await this.processDeadlineAlert({
          testId: test.id,
          testName: test.name,
          executorId: test.executorId,
          supervisorId: test.supervisorId,
          plannedEndDate: test.plannedEndDate,
          daysRemaining,
          priority: this.calculateDeadlinePriority(daysRemaining, test.priority),
          status: test.status,
          tenantId: test.tenantId
        });
      }
    } catch (error) {
      console.error('Error checking deadlines:', error);
    }
  }

  /**
   * Process individual deadline alert
   */
  private async processDeadlineAlert(alert: DeadlineAlert): Promise<void> {
    const { testId, testName, executorId, supervisorId, daysRemaining, priority } = alert;
    
    // Determine notification type and messaging based on days remaining
    let notificationType: string;
    let title: string;
    let message: string;
    let channels: string[];
    
    if (daysRemaining < 0) {
      // Overdue
      notificationType = NotificationTypes.DEADLINE_OVERDUE;
      title = '⚠️ Prueba vencida';
      message = `La prueba "${testName}" venció hace ${Math.abs(daysRemaining)} día${Math.abs(daysRemaining) > 1 ? 's' : ''}. Requiere atención inmediata.`;
      channels = ['in_app', 'email', 'push'];
    } else if (daysRemaining === 0) {
      // Due today
      notificationType = NotificationTypes.DEADLINE_TODAY;
      title = '🔥 Prueba vence HOY';
      message = `La prueba "${testName}" vence hoy. Completa la prueba lo antes posible.`;
      channels = ['in_app', 'email', 'push'];
    } else if (daysRemaining === 1) {
      // Due tomorrow
      notificationType = NotificationTypes.DEADLINE_APPROACHING;
      title = '⏰ Prueba vence mañana';
      message = `La prueba "${testName}" vence mañana. Asegúrate de completarla a tiempo.`;
      channels = ['in_app', 'email', 'push'];
    } else if (daysRemaining <= 3) {
      // Due in 2-3 days
      notificationType = NotificationTypes.DEADLINE_APPROACHING;
      title = '📅 Deadline próximo';
      message = `La prueba "${testName}" vence en ${daysRemaining} días. Planifica completar pronto.`;
      channels = ['in_app', 'email'];
    } else if (daysRemaining <= 7) {
      // Due in 4-7 days
      notificationType = NotificationTypes.DEADLINE_APPROACHING;
      title = '📋 Deadline en una semana';
      message = `La prueba "${testName}" vence en ${daysRemaining} días. Mantén el progreso constante.`;
      channels = ['in_app'];
    } else {
      // Shouldn't happen based on our query, but handle it
      return;
    }

    // Create unique grouping key to prevent duplicate notifications
    const groupingKey = `deadline-${testId}-${daysRemaining}`;

    // Send notification to executor
    await notificationService.createNotification({
      recipientId: executorId,
      type: notificationType,
      priority,
      title,
      message,
      actionText: 'Ver prueba',
      actionUrl: `/audit-tests/${testId}`,
      channels,
      auditTestId: testId,
      groupingKey,
      tenantId: alert.tenantId,
      data: {
        testName,
        plannedEndDate: alert.plannedEndDate,
        daysRemaining,
        isOverdue: daysRemaining < 0,
        urgencyLevel: this.getUrgencyLevel(daysRemaining)
      }
    });

    // Also notify supervisor for critical deadlines (overdue or due today)
    if (supervisorId && (daysRemaining <= 0)) {
      const supervisorTitle = daysRemaining < 0 ? 
        '⚠️ Prueba de equipo vencida' : 
        '🔥 Prueba de equipo vence HOY';
      
      const supervisorMessage = `La prueba "${testName}" asignada a tu equipo ${daysRemaining < 0 ? 
        `venció hace ${Math.abs(daysRemaining)} día${Math.abs(daysRemaining) > 1 ? 's' : ''}` : 
        'vence hoy'}. Considera intervenir o reasignar.`;

      await notificationService.createNotification({
        recipientId: supervisorId,
        type: notificationType,
        priority: 'critical',
        title: supervisorTitle,
        message: supervisorMessage,
        actionText: 'Ver prueba',
        actionUrl: `/audit-tests/${testId}`,
        channels: ['in_app', 'email', 'push'],
        auditTestId: testId,
        groupingKey: `supervisor-${groupingKey}`,
        tenantId: alert.tenantId,
        data: {
          testName,
          executorId,
          plannedEndDate: alert.plannedEndDate,
          daysRemaining,
          isTeamAlert: true
        }
      });
    }
  }

  /**
   * Calculate deadline priority based on days remaining and test priority
   */
  private calculateDeadlinePriority(daysRemaining: number, testPriority?: string): 'critical' | 'important' | 'normal' {
    if (daysRemaining < 0) return 'critical'; // Overdue
    if (daysRemaining === 0) return 'critical'; // Due today
    if (daysRemaining === 1) return 'important'; // Due tomorrow
    if (daysRemaining <= 3) return 'important'; // Due in 2-3 days
    
    // For 4-7 days, consider test priority
    if (testPriority === 'urgent' || testPriority === 'high') return 'important';
    
    return 'normal';
  }

  /**
   * Get urgency level for additional context
   */
  private getUrgencyLevel(daysRemaining: number): string {
    if (daysRemaining < -7) return 'severely_overdue';
    if (daysRemaining < -3) return 'very_overdue';
    if (daysRemaining < 0) return 'overdue';
    if (daysRemaining === 0) return 'due_today';
    if (daysRemaining === 1) return 'due_tomorrow';
    if (daysRemaining <= 3) return 'due_soon';
    if (daysRemaining <= 7) return 'upcoming';
    
    return 'future';
  }

  /**
   * Check for deadline extension requests
   */
  async checkExtensionRequests(): Promise<void> {
    // This would integrate with a deadline extension request system
    // For now, we'll skip this implementation
    console.log('Checking deadline extension requests...');
  }

  /**
   * Get deadline statistics for reporting
   */
  async getDeadlineStats(): Promise<{
    overdue: number;
    dueToday: number;
    dueTomorrow: number;
    dueThisWeek: number;
    total: number;
  }> {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const [overdue] = await db
        .select({ count: sql<number>`count(*)` })
        .from(auditTests)
        .where(
          and(
            eq(auditTests.status, 'in_progress'),
            lte(auditTests.plannedEndDate, now),
            isNull(auditTests.actualEndDate)
          )
        );

      const [dueToday] = await db
        .select({ count: sql<number>`count(*)` })
        .from(auditTests)
        .where(
          and(
            eq(auditTests.status, 'in_progress'),
            gte(auditTests.plannedEndDate, now),
            lte(auditTests.plannedEndDate, tomorrow),
            isNull(auditTests.actualEndDate)
          )
        );

      const [dueTomorrow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(auditTests)
        .where(
          and(
            eq(auditTests.status, 'in_progress'),
            gte(auditTests.plannedEndDate, tomorrow),
            lte(auditTests.plannedEndDate, new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)),
            isNull(auditTests.actualEndDate)
          )
        );

      const [dueThisWeek] = await db
        .select({ count: sql<number>`count(*)` })
        .from(auditTests)
        .where(
          and(
            eq(auditTests.status, 'in_progress'),
            gte(auditTests.plannedEndDate, now),
            lte(auditTests.plannedEndDate, oneWeekFromNow),
            isNull(auditTests.actualEndDate)
          )
        );

      return {
        overdue: overdue?.count || 0,
        dueToday: dueToday?.count || 0,
        dueTomorrow: dueTomorrow?.count || 0,
        dueThisWeek: dueThisWeek?.count || 0,
        total: (overdue?.count || 0) + (dueThisWeek?.count || 0)
      };
    } catch (error) {
      console.error('Error getting deadline stats:', error);
      return {
        overdue: 0,
        dueToday: 0,
        dueTomorrow: 0,
        dueThisWeek: 0,
        total: 0
      };
    }
  }

  /**
   * Schedule deadline monitoring (should be called periodically)
   */
  async scheduleDeadlineCheck(): Promise<void> {
    // In a production environment, this would be called by a cron job or scheduler
    // For now, we'll just run the check
    try {
      await this.checkDeadlines();
      await this.checkExtensionRequests();
      console.log('Deadline monitoring completed successfully');
    } catch (error) {
      console.error('Error in deadline monitoring:', error);
    }
  }
}

// Export singleton instance
export const deadlineMonitor = DeadlineMonitorService.getInstance();