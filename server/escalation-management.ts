import { 
  type EscalationPath, 
  type InsertEscalationPath,
  type EscalationPathWithDetails,
  type ApprovalRecord,
  type ApprovalHierarchy,
  type ApprovalDelegation,
  type User,
  type ApprovalItem,
  type ApprovalDecision,
  type EscalationRequirement,
  type UrgencyLevel,
  type EscalationLevel,
  escalationPaths,
  approvalRecords,
  approvalHierarchy,
  approvalDelegations,
  users,
  approvalNotifications,
  NotificationTypes
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, isNull, or } from "drizzle-orm";
import { notificationService } from "./notification-service";

/**
 * Intelligent Escalation Management System
 * 
 * Manages automated escalation of approval items based on:
 * - Risk levels and severity
 * - Organizational hierarchy
 * - Approval timeouts
 * - Delegation rules
 * - Business rules and policies
 */
export class EscalationManagementService {
  
  /**
   * Determine the appropriate escalation path for an approval item
   */
  async determineEscalationPath(
    item: ApprovalItem, 
    decision: ApprovalDecision, 
    approvalRecord: ApprovalRecord
  ): Promise<EscalationRequirement> {
    console.log(`🔄 Determining escalation path for ${item.type} item ${item.id}`);
    
    try {
      // Assess escalation urgency based on risk and context
      const urgency = await this.calculateEscalationUrgency(item, decision);
      console.log(`⚡ Escalation urgency: ${urgency}`);
      
      // Determine appropriate escalation level
      const escalationLevel = await this.determineEscalationLevel(item, decision, urgency);
      console.log(`📈 Escalation level: ${escalationLevel}`);
      
      // Find appropriate approvers for this level
      const assignedApprovers = await this.identifyApprovers(escalationLevel, item.organizationalContext);
      console.log(`👥 Found ${assignedApprovers.length} potential approvers`);
      
      // Calculate timeout based on urgency and organizational policies
      const timeoutHours = this.calculateEscalationTimeout(urgency, escalationLevel);
      
      // Determine escalation reason
      const escalationReason = this.generateEscalationReason(item, decision, urgency);
      
      return {
        required: true,
        level: escalationLevel,
        reason: escalationReason,
        urgency,
        timeoutHours,
        assignedApprovers: assignedApprovers.map(a => a.id)
      };
    } catch (error) {
      console.error(`❌ Error determining escalation path:`, error);
      // Fallback to standard escalation
      return {
        required: true,
        level: 'supervisor',
        reason: `System error during escalation path determination. Defaulting to supervisor review.`,
        urgency: 'medium',
        timeoutHours: 72,
        assignedApprovers: []
      };
    }
  }

  /**
   * Process escalation by creating escalation path record and notifications
   */
  async processEscalation(
    approvalRecord: ApprovalRecord,
    escalationRequirement: EscalationRequirement
  ): Promise<EscalationPath> {
    console.log(`🚀 Processing escalation for approval record ${approvalRecord.id}`);
    
    try {
      // Create escalation path record
      const [escalationPath] = await db.insert(escalationPaths).values({
        approvalRecordId: approvalRecord.id,
        escalationLevel: escalationRequirement.level,
        assignedApprovers: escalationRequirement.assignedApprovers,
        escalationReason: escalationRequirement.reason,
        urgency: escalationRequirement.urgency,
        timeoutHours: escalationRequirement.timeoutHours,
        nextEscalationLevel: this.getNextEscalationLevel(escalationRequirement.level),
        escalationStatus: 'pending'
      }).returning();
      
      console.log(`📝 Created escalation path ${escalationPath.id}`);
      
      // Update approval record status
      await db.update(approvalRecords)
        .set({
          approvalStatus: 'escalated',
          escalationPath: {
            escalationId: escalationPath.id,
            level: escalationRequirement.level,
            assignedApprovers: escalationRequirement.assignedApprovers
          },
          updatedAt: new Date()
        })
        .where(eq(approvalRecords.id, approvalRecord.id));
      
      // Send escalation notifications
      await this.sendEscalationNotifications(escalationPath, approvalRecord);
      
      // Schedule timeout monitoring
      await this.scheduleEscalationTimeout(escalationPath);
      
      return escalationPath;
    } catch (error) {
      console.error(`❌ Error processing escalation:`, error);
      throw error;
    }
  }

  /**
   * Calculate escalation urgency based on item risk and context
   */
  private async calculateEscalationUrgency(
    item: ApprovalItem, 
    decision: ApprovalDecision
  ): Promise<UrgencyLevel> {
    let urgencyScore = 0;
    
    // Risk level factor (40% weight)
    const riskWeights = { 'low': 10, 'medium': 25, 'high': 35, 'critical': 40 };
    urgencyScore += riskWeights[item.riskLevel] || 25;
    
    // Financial impact factor (30% weight)
    if (item.financialImpact) {
      if (item.financialImpact > 100000) urgencyScore += 30;
      else if (item.financialImpact > 50000) urgencyScore += 20;
      else if (item.financialImpact > 10000) urgencyScore += 10;
      else urgencyScore += 5;
    }
    
    // Regulatory implications (20% weight)
    if (item.regulatoryImplications) {
      urgencyScore += 20;
    }
    
    // Stakeholder count (10% weight)
    if (item.stakeholders) {
      urgencyScore += Math.min(10, item.stakeholders.length * 2);
    }
    
    // Decision confidence factor - lower confidence increases urgency
    if (decision.confidence < 70) {
      urgencyScore += 10;
    }
    
    // Map score to urgency level
    if (urgencyScore >= 80) return 'critical';
    if (urgencyScore >= 60) return 'high';
    if (urgencyScore >= 40) return 'medium';
    return 'low';
  }

  /**
   * Determine appropriate escalation level based on item and decision context
   */
  private async determineEscalationLevel(
    item: ApprovalItem, 
    decision: ApprovalDecision, 
    urgency: UrgencyLevel
  ): Promise<EscalationLevel> {
    // Critical items or high financial impact go to executive level
    if (item.riskLevel === 'critical' || 
        (item.financialImpact && item.financialImpact > 100000) ||
        urgency === 'critical') {
      return 'executive';
    }
    
    // High risk or regulatory items go to director level
    if (item.riskLevel === 'high' || 
        item.regulatoryImplications ||
        urgency === 'high') {
      return 'director';
    }
    
    // Medium risk items go to manager level
    if (item.riskLevel === 'medium' || urgency === 'medium') {
      return 'manager';
    }
    
    // Default to supervisor level
    return 'supervisor';
  }

  /**
   * Identify appropriate approvers for escalation level
   */
  private async identifyApprovers(
    escalationLevel: EscalationLevel,
    organizationalContext: any
  ): Promise<User[]> {
    try {
      // Get hierarchy for department and level
      const hierarchyRecords = await db.select({
        id: approvalHierarchy.id,
        approverUserId: approvalHierarchy.approverUserId,
        backupApproverUserId: approvalHierarchy.backupApproverUserId,
        approvalLimits: approvalHierarchy.approvalLimits
      })
      .from(approvalHierarchy)
      .where(
        and(
          eq(approvalHierarchy.department, organizationalContext.department),
          eq(approvalHierarchy.approvalLevel, this.mapEscalationToApprovalLevel(escalationLevel)),
          eq(approvalHierarchy.isActive, true)
        )
      );

      const approverIds = new Set<string>();
      
      // Add primary approvers
      hierarchyRecords.forEach(record => {
        if (record.approverUserId) {
          approverIds.add(record.approverUserId);
        }
        if (record.backupApproverUserId) {
          approverIds.add(record.backupApproverUserId);
        }
      });

      // Check for active delegations
      const activeDelegations = await this.getActiveDelegations(Array.from(approverIds));
      activeDelegations.forEach(delegation => {
        approverIds.add(delegation.delegateId);
      });

      // Fetch user details
      if (approverIds.size === 0) {
        console.warn(`⚠️ No approvers found for level ${escalationLevel} in department ${organizationalContext.department}`);
        return [];
      }

      const approvers = await db.select()
        .from(users)
        .where(
          and(
            eq(users.isActive, true),
            // Use SQL IN operator for user IDs
            sql`${users.id} = ANY(${Array.from(approverIds)})`
          )
        );

      return approvers;
    } catch (error) {
      console.error(`❌ Error identifying approvers:`, error);
      return [];
    }
  }

  /**
   * Get active delegations for a list of user IDs
   */
  private async getActiveDelegations(userIds: string[]): Promise<ApprovalDelegation[]> {
    if (userIds.length === 0) return [];
    
    try {
      return await db.select()
        .from(approvalDelegations)
        .where(
          and(
            eq(approvalDelegations.isActive, true),
            lte(approvalDelegations.startDate, new Date()),
            or(
              isNull(approvalDelegations.endDate),
              gte(approvalDelegations.endDate, new Date())
            ),
            // Use SQL IN operator for delegator IDs
            sql`${approvalDelegations.delegatorId} = ANY(${userIds})`
          )
        );
    } catch (error) {
      console.error(`❌ Error fetching delegations:`, error);
      return [];
    }
  }

  /**
   * Map escalation level to approval hierarchy level
   */
  private mapEscalationToApprovalLevel(escalationLevel: EscalationLevel): string {
    const mapping = {
      'supervisor': 'level_1',
      'manager': 'level_2', 
      'director': 'level_3',
      'executive': 'executive',
      'board': 'board'
    };
    return mapping[escalationLevel] || 'level_1';
  }

  /**
   * Calculate escalation timeout based on urgency and level
   */
  private calculateEscalationTimeout(urgency: UrgencyLevel, level: EscalationLevel): number {
    const baseTimeouts = {
      'supervisor': 24,
      'manager': 48,
      'director': 72,
      'executive': 96,
      'board': 168
    };
    
    const urgencyMultipliers = {
      'critical': 0.5,
      'high': 0.75,
      'medium': 1.0,
      'low': 1.5
    };
    
    const baseTimeout = baseTimeouts[level] || 72;
    const multiplier = urgencyMultipliers[urgency] || 1.0;
    
    return Math.round(baseTimeout * multiplier);
  }

  /**
   * Generate escalation reason text
   */
  private generateEscalationReason(
    item: ApprovalItem,
    decision: ApprovalDecision,
    urgency: UrgencyLevel
  ): string {
    const reasons = [];
    
    if (item.riskLevel === 'critical' || item.riskLevel === 'high') {
      reasons.push(`High risk level (${item.riskLevel})`);
    }
    
    if (item.financialImpact && item.financialImpact > 50000) {
      reasons.push(`Significant financial impact ($${item.financialImpact.toLocaleString()})`);
    }
    
    if (item.regulatoryImplications) {
      reasons.push('Regulatory implications require review');
    }
    
    if (decision.confidence < 70) {
      reasons.push(`Low decision confidence (${decision.confidence}%)`);
    }
    
    if (decision.policyViolations.length > 0) {
      reasons.push(`Policy violations detected: ${decision.policyViolations.join(', ')}`);
    }
    
    if (reasons.length === 0) {
      reasons.push('Item requires manual review per organizational policy');
    }
    
    return `Escalation required due to: ${reasons.join('; ')}. Urgency: ${urgency}.`;
  }

  /**
   * Get the next escalation level in hierarchy
   */
  private getNextEscalationLevel(currentLevel: EscalationLevel): EscalationLevel | null {
    const hierarchy: EscalationLevel[] = ['supervisor', 'manager', 'director', 'executive', 'board'];
    const currentIndex = hierarchy.indexOf(currentLevel);
    
    if (currentIndex >= 0 && currentIndex < hierarchy.length - 1) {
      return hierarchy[currentIndex + 1];
    }
    
    return null; // No further escalation available
  }

  /**
   * Send notifications for escalation
   */
  private async sendEscalationNotifications(
    escalationPath: EscalationPath,
    approvalRecord: ApprovalRecord
  ): Promise<void> {
    try {
      // Parse assigned approvers from JSONB
      const assignedApproverIds = Array.isArray(escalationPath.assignedApprovers) 
        ? escalationPath.assignedApprovers 
        : JSON.parse(escalationPath.assignedApprovers as string);

      const levelLabels: Record<string, string> = {
        'supervisor': 'Supervisor',
        'manager': 'Gerente',
        'director': 'Director',
        'executive': 'Ejecutivo',
        'board': 'Junta Directiva'
      };
      
      for (const approverId of assignedApproverIds) {
        const levelLabel = levelLabels[escalationPath.escalationLevel] || escalationPath.escalationLevel.toUpperCase();
        
        await notificationService.createNotification({
          recipientId: approverId,
          type: NotificationTypes.REVIEW_REQUEST,
          category: 'approval',
          priority: escalationPath.urgency === 'critical' ? 'critical' : 
                   escalationPath.urgency === 'high' ? 'important' : 'normal',
          title: `Aprobación de ${levelLabel} Requerida`,
          message: `Un elemento ha sido escalado a su nivel para aprobación. Razón: ${escalationPath.escalationReason}`,
          actionText: 'Revisar',
          actionUrl: `/approvals/${approvalRecord.id}`,
          data: {
            escalationPathId: escalationPath.id,
            approvalRecordId: approvalRecord.id,
            escalationLevel: escalationPath.escalationLevel,
            urgency: escalationPath.urgency,
            timeoutHours: escalationPath.timeoutHours
          },
          channels: ['in_app', 'email']
        });
      }
      
      // Notify original submitter
      const levelLabel = levelLabels[escalationPath.escalationLevel] || escalationPath.escalationLevel;
      
      await notificationService.createNotification({
        recipientId: approvalRecord.submittedBy,
        type: NotificationTypes.STATUS_CHANGED,
        category: 'approval',
        priority: 'normal',
        title: 'Elemento Escalado para Revisión',
        message: `Su solicitud ha sido escalada al nivel de ${levelLabel} para revisión.`,
        actionText: 'Ver Estado',
        actionUrl: `/approvals/${approvalRecord.id}`,
        data: {
          escalationPathId: escalationPath.id,
          approvalRecordId: approvalRecord.id,
          escalationLevel: escalationPath.escalationLevel
        },
        channels: ['in_app', 'email']
      });
      
      console.log(`📧 Sent escalation notifications for escalation ${escalationPath.id}`);
    } catch (error) {
      console.error(`❌ Error sending escalation notifications:`, error);
    }
  }

  /**
   * Schedule escalation timeout monitoring
   */
  private async scheduleEscalationTimeout(escalationPath: EscalationPath): Promise<void> {
    // In a production system, this would integrate with a job scheduler
    // For now, we'll create a notification record for manual processing
    
    const timeoutDate = new Date();
    timeoutDate.setHours(timeoutDate.getHours() + escalationPath.timeoutHours);
    
    try {
      // Create timeout reminder notification
      await db.insert(approvalNotifications).values({
        escalationPathId: escalationPath.id,
        notificationType: 'escalation_timeout_warning',
        recipientId: 'system', // System notification
        channel: 'system',
        subject: 'Escalation Timeout Warning',
        message: `Escalation ${escalationPath.id} will timeout at ${timeoutDate.toISOString()}`,
        // Schedule for 2 hours before timeout
        // In production, this would be handled by a job scheduler
      });
      
      console.log(`⏰ Scheduled timeout monitoring for escalation ${escalationPath.id} at ${timeoutDate}`);
    } catch (error) {
      console.error(`❌ Error scheduling escalation timeout:`, error);
    }
  }

  /**
   * Process escalation timeout
   */
  async processEscalationTimeout(escalationPathId: string): Promise<void> {
    console.log(`⏰ Processing timeout for escalation ${escalationPathId}`);
    
    try {
      const escalationPath = await db.select()
        .from(escalationPaths)
        .where(eq(escalationPaths.id, escalationPathId))
        .limit(1);
      
      if (escalationPath.length === 0) {
        console.warn(`⚠️ Escalation path ${escalationPathId} not found`);
        return;
      }
      
      const escalation = escalationPath[0];
      
      if (escalation.escalationStatus !== 'pending') {
        console.log(`ℹ️ Escalation ${escalationPathId} already resolved, skipping timeout`);
        return;
      }
      
      // Check if there's a next escalation level
      if (escalation.nextEscalationLevel) {
        // Escalate to next level
        await this.escalateToNextLevel(escalation);
      } else {
        // Mark as expired and notify
        await this.markEscalationExpired(escalation);
      }
    } catch (error) {
      console.error(`❌ Error processing escalation timeout:`, error);
    }
  }

  /**
   * Escalate to next level on timeout
   */
  private async escalateToNextLevel(escalation: EscalationPath): Promise<void> {
    console.log(`📈 Escalating ${escalation.id} to next level: ${escalation.nextEscalationLevel}`);
    
    try {
      // Update current escalation as timeout
      await db.update(escalationPaths)
        .set({
          escalationStatus: 'timeout',
          updatedAt: new Date()
        })
        .where(eq(escalationPaths.id, escalation.id));
      
      // Create new escalation at next level
      const nextEscalationLevel = escalation.nextEscalationLevel as EscalationLevel;
      const nextLevelApprovers = await this.identifyApprovers(nextEscalationLevel, {
        department: 'general' // This should be extracted from context
      });
      
      const [newEscalation] = await db.insert(escalationPaths).values({
        approvalRecordId: escalation.approvalRecordId,
        escalationLevel: nextEscalationLevel,
        assignedApprovers: nextLevelApprovers.map(a => a.id),
        escalationReason: `Escalated from ${escalation.escalationLevel} due to timeout`,
        urgency: escalation.urgency,
        timeoutHours: this.calculateEscalationTimeout(escalation.urgency as UrgencyLevel, nextEscalationLevel),
        nextEscalationLevel: this.getNextEscalationLevel(nextEscalationLevel),
        escalationStatus: 'pending'
      }).returning();
      
      // Send notifications for new escalation level
      const approvalRecord = await db.select()
        .from(approvalRecords)
        .where(eq(approvalRecords.id, escalation.approvalRecordId))
        .limit(1);
      
      if (approvalRecord.length > 0) {
        await this.sendEscalationNotifications(newEscalation, approvalRecord[0]);
      }
      
      console.log(`✅ Successfully escalated to ${nextEscalationLevel} level`);
    } catch (error) {
      console.error(`❌ Error escalating to next level:`, error);
    }
  }

  /**
   * Mark escalation as expired when no further escalation is possible
   */
  private async markEscalationExpired(escalation: EscalationPath): Promise<void> {
    console.log(`⏰ Marking escalation ${escalation.id} as expired`);
    
    try {
      await db.update(escalationPaths)
        .set({
          escalationStatus: 'timeout',
          updatedAt: new Date()
        })
        .where(eq(escalationPaths.id, escalation.id));
      
      // Update approval record as expired
      await db.update(approvalRecords)
        .set({
          approvalStatus: 'expired',
          updatedAt: new Date()
        })
        .where(eq(approvalRecords.id, escalation.approvalRecordId));
      
      // Send expiration notifications
      const approvalRecord = await db.select()
        .from(approvalRecords)
        .where(eq(approvalRecords.id, escalation.approvalRecordId))
        .limit(1);
      
      if (approvalRecord.length > 0) {
        await notificationService.createNotification({
          recipientId: approvalRecord[0].submittedBy,
          type: NotificationTypes.STATUS_CHANGED,
          category: 'approval',
          priority: 'important',
          title: 'Solicitud de Aprobación Expirada',
          message: 'Su solicitud de aprobación ha expirado debido a tiempo de espera agotado en todos los niveles de escalamiento.',
          actionText: 'Ver Detalles',
          actionUrl: `/approvals/${escalation.approvalRecordId}`,
          data: {
            escalationPathId: escalation.id,
            approvalRecordId: escalation.approvalRecordId
          },
          channels: ['in_app', 'email']
        });
      }
      
      console.log(`📧 Sent expiration notifications for escalation ${escalation.id}`);
    } catch (error) {
      console.error(`❌ Error marking escalation as expired:`, error);
    }
  }

  /**
   * Get escalation analytics for performance monitoring
   */
  async getEscalationAnalytics(startDate: Date, endDate: Date): Promise<any> {
    try {
      const escalations = await db.select()
        .from(escalationPaths)
        .where(
          and(
            gte(escalationPaths.createdAt, startDate),
            lte(escalationPaths.createdAt, endDate)
          )
        );
      
      const analytics = {
        totalEscalations: escalations.length,
        escalationsByLevel: {},
        escalationsByUrgency: {},
        escalationsByStatus: {},
        averageResolutionTime: 0,
        timeoutRate: 0
      };
      
      // Calculate metrics
      let totalResolutionTime = 0;
      let resolvedCount = 0;
      let timeoutCount = 0;
      
      escalations.forEach(escalation => {
        // Count by level
        analytics.escalationsByLevel[escalation.escalationLevel] = 
          (analytics.escalationsByLevel[escalation.escalationLevel] || 0) + 1;
        
        // Count by urgency
        analytics.escalationsByUrgency[escalation.urgency] = 
          (analytics.escalationsByUrgency[escalation.urgency] || 0) + 1;
        
        // Count by status
        analytics.escalationsByStatus[escalation.escalationStatus] = 
          (analytics.escalationsByStatus[escalation.escalationStatus] || 0) + 1;
        
        // Calculate resolution time
        if (escalation.resolvedAt && escalation.createdAt) {
          const resolutionTime = escalation.resolvedAt.getTime() - escalation.createdAt.getTime();
          totalResolutionTime += resolutionTime;
          resolvedCount++;
        }
        
        // Count timeouts
        if (escalation.escalationStatus === 'timeout') {
          timeoutCount++;
        }
      });
      
      analytics.averageResolutionTime = resolvedCount > 0 ? totalResolutionTime / resolvedCount / (1000 * 60 * 60) : 0; // hours
      analytics.timeoutRate = escalations.length > 0 ? (timeoutCount / escalations.length) * 100 : 0; // percentage
      
      return analytics;
    } catch (error) {
      console.error(`❌ Error generating escalation analytics:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const escalationManager = new EscalationManagementService();