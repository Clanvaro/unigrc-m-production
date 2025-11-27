import { 
  type ApprovalPolicy, type InsertApprovalPolicy, type ApprovalPolicyWithDetails,
  type ApprovalWorkflow, type InsertApprovalWorkflow, type ApprovalWorkflowWithDetails,
  type ApprovalHierarchy, type InsertApprovalHierarchy,
  type ApprovalDelegation, type InsertApprovalDelegation,
  type ApprovalRecord, type InsertApprovalRecord, type ApprovalRecordWithDetails,
  type ApprovalRule, type InsertApprovalRule,
  type EscalationPath, type InsertEscalationPath, type EscalationPathWithDetails,
  type ApprovalNotification, type InsertApprovalNotification,
  type ApprovalAnalytics, type InsertApprovalAnalytics,
  type ApprovalAuditTrail, type InsertApprovalAuditTrail,
  type ApprovalPerformanceMetrics, type InsertApprovalPerformanceMetrics,
  type ApprovalItem, type ApprovalDecision, type PolicyComplianceResult,
  type ApprovalMetrics, type ApproverPerformance, type EscalationRequirement,
  type User,
  approvalPolicies, approvalWorkflows, approvalHierarchy, approvalDelegations, 
  approvalRecords, approvalRules, escalationPaths, approvalNotifications,
  approvalAnalytics, approvalAuditTrail, approvalPerformanceMetrics,
  users
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray, gte, lte, isNull, or } from "drizzle-orm";
import { approvalEngine } from "./approval-engine";
import { escalationManager } from "./escalation-management";

/**
 * Approval System Storage Implementation
 * 
 * Provides comprehensive database operations for the approval workflow system
 */
export class ApprovalStorage {
  
  // ============= APPROVAL POLICIES =============
  
  async getApprovalPolicies(): Promise<ApprovalPolicy[]> {
    return await db.select().from(approvalPolicies).orderBy(desc(approvalPolicies.priority));
  }

  async getApprovalPolicy(id: string): Promise<ApprovalPolicy | undefined> {
    const policies = await db.select().from(approvalPolicies).where(eq(approvalPolicies.id, id)).limit(1);
    return policies[0];
  }

  async getApprovalPolicyWithDetails(id: string): Promise<ApprovalPolicyWithDetails | undefined> {
    const result = await db.select({
      policy: approvalPolicies,
      createdByUser: users,
      approvedByUser: users
    })
    .from(approvalPolicies)
    .leftJoin(users, eq(approvalPolicies.createdBy, users.id))
    .leftJoin(users, eq(approvalPolicies.approvedBy, users.id))
    .where(eq(approvalPolicies.id, id))
    .limit(1);

    if (result.length === 0) return undefined;

    return {
      ...result[0].policy,
      createdByUser: result[0].createdByUser || undefined,
      approvedByUser: result[0].approvedByUser || undefined
    };
  }

  async getActivePoliciesForContext(itemType: string, department: string): Promise<ApprovalPolicy[]> {
    return await db.select()
      .from(approvalPolicies)
      .where(
        and(
          eq(approvalPolicies.isActive, true),
          lte(approvalPolicies.effectiveDate, new Date()),
          or(
            isNull(approvalPolicies.expiryDate),
            gte(approvalPolicies.expiryDate, new Date())
          ),
          // Check if department is in applicable departments or empty (applies to all)
          or(
            sql`${approvalPolicies.applicableDepartments} IS NULL`,
            sql`array_length(${approvalPolicies.applicableDepartments}, 1) IS NULL`,
            sql`${department} = ANY(${approvalPolicies.applicableDepartments})`
          )
        )
      )
      .orderBy(approvalPolicies.priority);
  }

  async createApprovalPolicy(policy: InsertApprovalPolicy): Promise<ApprovalPolicy> {
    const [created] = await db.insert(approvalPolicies).values(policy).returning();
    return created;
  }

  async updateApprovalPolicy(id: string, policy: Partial<InsertApprovalPolicy>): Promise<ApprovalPolicy | undefined> {
    const [updated] = await db.update(approvalPolicies)
      .set({ ...policy, updatedAt: new Date() })
      .where(eq(approvalPolicies.id, id))
      .returning();
    return updated;
  }

  async deleteApprovalPolicy(id: string): Promise<boolean> {
    const result = await db.delete(approvalPolicies).where(eq(approvalPolicies.id, id));
    return result.rowCount > 0;
  }

  // ============= APPROVAL WORKFLOWS =============

  async getApprovalWorkflows(): Promise<ApprovalWorkflow[]> {
    return await db.select().from(approvalWorkflows).orderBy(approvalWorkflows.workflowName);
  }

  async getApprovalWorkflow(id: string): Promise<ApprovalWorkflow | undefined> {
    const workflows = await db.select().from(approvalWorkflows).where(eq(approvalWorkflows.id, id)).limit(1);
    return workflows[0];
  }

  async getApprovalWorkflowWithDetails(id: string): Promise<ApprovalWorkflowWithDetails | undefined> {
    const workflow = await this.getApprovalWorkflow(id);
    if (!workflow) return undefined;

    const records = await db.select()
      .from(approvalRecords)
      .where(eq(approvalRecords.workflowId, id));

    return {
      ...workflow,
      approvalRecords: records
    };
  }

  async getWorkflowByType(itemType: string): Promise<ApprovalWorkflow | undefined> {
    const workflows = await db.select()
      .from(approvalWorkflows)
      .where(
        and(
          eq(approvalWorkflows.itemType, itemType),
          eq(approvalWorkflows.isActive, true)
        )
      )
      .limit(1);
    return workflows[0];
  }

  async createApprovalWorkflow(workflow: InsertApprovalWorkflow): Promise<ApprovalWorkflow> {
    const [created] = await db.insert(approvalWorkflows).values(workflow).returning();
    return created;
  }

  async updateApprovalWorkflow(id: string, workflow: Partial<InsertApprovalWorkflow>): Promise<ApprovalWorkflow | undefined> {
    const [updated] = await db.update(approvalWorkflows)
      .set({ ...workflow, updatedAt: new Date() })
      .where(eq(approvalWorkflows.id, id))
      .returning();
    return updated;
  }

  async deleteApprovalWorkflow(id: string): Promise<boolean> {
    const result = await db.delete(approvalWorkflows).where(eq(approvalWorkflows.id, id));
    return result.rowCount > 0;
  }

  // ============= APPROVAL HIERARCHY =============

  async getApprovalHierarchy(): Promise<ApprovalHierarchy[]> {
    return await db.select().from(approvalHierarchy).orderBy(approvalHierarchy.department, approvalHierarchy.approvalLevel);
  }

  async getApprovalHierarchyByDepartment(department: string): Promise<ApprovalHierarchy[]> {
    return await db.select()
      .from(approvalHierarchy)
      .where(
        and(
          eq(approvalHierarchy.department, department),
          eq(approvalHierarchy.isActive, true)
        )
      )
      .orderBy(approvalHierarchy.approvalLevel);
  }

  async getApprovalHierarchyByLevel(level: string): Promise<ApprovalHierarchy[]> {
    return await db.select()
      .from(approvalHierarchy)
      .where(
        and(
          eq(approvalHierarchy.approvalLevel, level),
          eq(approvalHierarchy.isActive, true)
        )
      );
  }

  async getApproverForLevel(department: string, level: string): Promise<ApprovalHierarchy | undefined> {
    const hierarchy = await db.select()
      .from(approvalHierarchy)
      .where(
        and(
          eq(approvalHierarchy.department, department),
          eq(approvalHierarchy.approvalLevel, level),
          eq(approvalHierarchy.isActive, true)
        )
      )
      .limit(1);
    return hierarchy[0];
  }

  async createApprovalHierarchy(hierarchy: InsertApprovalHierarchy): Promise<ApprovalHierarchy> {
    const [created] = await db.insert(approvalHierarchy).values(hierarchy).returning();
    return created;
  }

  async updateApprovalHierarchy(id: string, hierarchy: Partial<InsertApprovalHierarchy>): Promise<ApprovalHierarchy | undefined> {
    const [updated] = await db.update(approvalHierarchy)
      .set({ ...hierarchy, updatedAt: new Date() })
      .where(eq(approvalHierarchy.id, id))
      .returning();
    return updated;
  }

  async deleteApprovalHierarchy(id: string): Promise<boolean> {
    const result = await db.delete(approvalHierarchy).where(eq(approvalHierarchy.id, id));
    return result.rowCount > 0;
  }

  // ============= APPROVAL DELEGATIONS =============

  async getApprovalDelegations(): Promise<ApprovalDelegation[]> {
    return await db.select().from(approvalDelegations).orderBy(desc(approvalDelegations.startDate));
  }

  async getApprovalDelegation(id: string): Promise<ApprovalDelegation | undefined> {
    const delegations = await db.select().from(approvalDelegations).where(eq(approvalDelegations.id, id)).limit(1);
    return delegations[0];
  }

  async getActiveDelegationsForUser(userId: string): Promise<ApprovalDelegation[]> {
    return await db.select()
      .from(approvalDelegations)
      .where(
        and(
          eq(approvalDelegations.delegatorId, userId),
          eq(approvalDelegations.isActive, true),
          lte(approvalDelegations.startDate, new Date()),
          or(
            isNull(approvalDelegations.endDate),
            gte(approvalDelegations.endDate, new Date())
          )
        )
      );
  }

  async getDelegatedApprovals(delegateId: string): Promise<ApprovalDelegation[]> {
    return await db.select()
      .from(approvalDelegations)
      .where(
        and(
          eq(approvalDelegations.delegateId, delegateId),
          eq(approvalDelegations.isActive, true),
          lte(approvalDelegations.startDate, new Date()),
          or(
            isNull(approvalDelegations.endDate),
            gte(approvalDelegations.endDate, new Date())
          )
        )
      );
  }

  async createApprovalDelegation(delegation: InsertApprovalDelegation): Promise<ApprovalDelegation> {
    const [created] = await db.insert(approvalDelegations).values(delegation).returning();
    return created;
  }

  async updateApprovalDelegation(id: string, delegation: Partial<InsertApprovalDelegation>): Promise<ApprovalDelegation | undefined> {
    const [updated] = await db.update(approvalDelegations)
      .set({ ...delegation, updatedAt: new Date() })
      .where(eq(approvalDelegations.id, id))
      .returning();
    return updated;
  }

  async deleteApprovalDelegation(id: string): Promise<boolean> {
    const result = await db.delete(approvalDelegations).where(eq(approvalDelegations.id, id));
    return result.rowCount > 0;
  }

  // ============= APPROVAL RECORDS =============

  async getApprovalRecords(): Promise<ApprovalRecord[]> {
    return await db.select().from(approvalRecords).orderBy(desc(approvalRecords.submittedAt));
  }

  async getApprovalRecord(id: string): Promise<ApprovalRecord | undefined> {
    const records = await db.select().from(approvalRecords).where(eq(approvalRecords.id, id)).limit(1);
    return records[0];
  }

  async getApprovalRecordWithDetails(id: string): Promise<ApprovalRecordWithDetails | undefined> {
    const result = await db.select({
      record: approvalRecords,
      workflow: approvalWorkflows,
      policy: approvalPolicies,
      submittedByUser: users,
      approvedByUser: users
    })
    .from(approvalRecords)
    .leftJoin(approvalWorkflows, eq(approvalRecords.workflowId, approvalWorkflows.id))
    .leftJoin(approvalPolicies, eq(approvalRecords.policyId, approvalPolicies.id))
    .leftJoin(users, eq(approvalRecords.submittedBy, users.id))
    .leftJoin(users, eq(approvalRecords.approvedBy, users.id))
    .where(eq(approvalRecords.id, id))
    .limit(1);

    if (result.length === 0) return undefined;

    const record = result[0];
    
    // Get escalation paths
    const escalations = await db.select()
      .from(escalationPaths)
      .where(eq(escalationPaths.approvalRecordId, id));

    // Get audit trail
    const auditTrail = await db.select()
      .from(approvalAuditTrail)
      .where(eq(approvalAuditTrail.approvalRecordId, id))
      .orderBy(approvalAuditTrail.timestamp);

    // Get notifications
    const notifications = await db.select()
      .from(approvalNotifications)
      .where(eq(approvalNotifications.approvalRecordId, id));

    return {
      ...record.record,
      workflow: record.workflow || undefined,
      policy: record.policy || undefined,
      submittedByUser: record.submittedByUser || undefined,
      approvedByUser: record.approvedByUser || undefined,
      escalationPaths: escalations,
      auditTrail,
      notifications
    };
  }

  async getApprovalRecordsByStatus(status: string): Promise<ApprovalRecord[]> {
    return await db.select()
      .from(approvalRecords)
      .where(eq(approvalRecords.approvalStatus, status))
      .orderBy(desc(approvalRecords.submittedAt));
  }

  async getApprovalRecordsByUser(userId: string): Promise<ApprovalRecord[]> {
    return await db.select()
      .from(approvalRecords)
      .where(eq(approvalRecords.submittedBy, userId))
      .orderBy(desc(approvalRecords.submittedAt));
  }

  async getApprovalRecordsByItem(itemId: string, itemType: string): Promise<ApprovalRecord[]> {
    return await db.select()
      .from(approvalRecords)
      .where(
        and(
          eq(approvalRecords.approvalItemId, itemId),
          eq(approvalRecords.approvalItemType, itemType)
        )
      )
      .orderBy(desc(approvalRecords.submittedAt));
  }

  async getPendingApprovals(approverId?: string): Promise<ApprovalRecord[]> {
    let query = db.select()
      .from(approvalRecords)
      .where(eq(approvalRecords.approvalStatus, 'pending'));

    // If approverId is provided, filter by escalation assignments
    if (approverId) {
      query = query.innerJoin(
        escalationPaths,
        and(
          eq(escalationPaths.approvalRecordId, approvalRecords.id),
          sql`${approverId} = ANY(${escalationPaths.assignedApprovers})`
        )
      );
    }

    return await query.orderBy(desc(approvalRecords.submittedAt));
  }

  async getExpiredApprovals(): Promise<ApprovalRecord[]> {
    return await db.select()
      .from(approvalRecords)
      .where(
        and(
          eq(approvalRecords.approvalStatus, 'pending'),
          lte(approvalRecords.expiryDate, new Date())
        )
      );
  }

  async createApprovalRecord(record: InsertApprovalRecord): Promise<ApprovalRecord> {
    const [created] = await db.insert(approvalRecords).values(record).returning();
    return created;
  }

  async updateApprovalRecord(id: string, record: Partial<InsertApprovalRecord>): Promise<ApprovalRecord | undefined> {
    const [updated] = await db.update(approvalRecords)
      .set({ ...record, updatedAt: new Date() })
      .where(eq(approvalRecords.id, id))
      .returning();
    return updated;
  }

  async deleteApprovalRecord(id: string): Promise<boolean> {
    const result = await db.delete(approvalRecords).where(eq(approvalRecords.id, id));
    return result.rowCount > 0;
  }

  // ============= APPROVAL RULES =============

  async getApprovalRules(): Promise<ApprovalRule[]> {
    return await db.select().from(approvalRules).orderBy(approvalRules.priority, approvalRules.ruleName);
  }

  async getApprovalRule(id: string): Promise<ApprovalRule | undefined> {
    const rules = await db.select().from(approvalRules).where(eq(approvalRules.id, id)).limit(1);
    return rules[0];
  }

  async getActiveRulesForContext(itemType: string): Promise<ApprovalRule[]> {
    return await db.select()
      .from(approvalRules)
      .where(
        and(
          eq(approvalRules.isActive, true),
          lte(approvalRules.effectiveDate, new Date()),
          or(
            isNull(approvalRules.expiryDate),
            gte(approvalRules.expiryDate, new Date())
          ),
          or(
            sql`${approvalRules.applicableContexts} IS NULL`,
            sql`array_length(${approvalRules.applicableContexts}, 1) IS NULL`,
            sql`${itemType} = ANY(${approvalRules.applicableContexts})`
          )
        )
      )
      .orderBy(approvalRules.priority);
  }

  async createApprovalRule(rule: InsertApprovalRule): Promise<ApprovalRule> {
    const [created] = await db.insert(approvalRules).values(rule).returning();
    return created;
  }

  async updateApprovalRule(id: string, rule: Partial<InsertApprovalRule>): Promise<ApprovalRule | undefined> {
    const [updated] = await db.update(approvalRules)
      .set({ ...rule, updatedAt: new Date() })
      .where(eq(approvalRules.id, id))
      .returning();
    return updated;
  }

  async deleteApprovalRule(id: string): Promise<boolean> {
    const result = await db.delete(approvalRules).where(eq(approvalRules.id, id));
    return result.rowCount > 0;
  }

  // ============= ESCALATION PATHS =============

  async getEscalationPaths(): Promise<EscalationPath[]> {
    return await db.select().from(escalationPaths).orderBy(desc(escalationPaths.createdAt));
  }

  async getEscalationPath(id: string): Promise<EscalationPath | undefined> {
    const paths = await db.select().from(escalationPaths).where(eq(escalationPaths.id, id)).limit(1);
    return paths[0];
  }

  async getEscalationPathWithDetails(id: string): Promise<EscalationPathWithDetails | undefined> {
    const result = await db.select({
      escalationPath: escalationPaths,
      approvalRecord: approvalRecords,
      currentAssigneeUser: users,
      resolvedByUser: users
    })
    .from(escalationPaths)
    .leftJoin(approvalRecords, eq(escalationPaths.approvalRecordId, approvalRecords.id))
    .leftJoin(users, eq(escalationPaths.currentAssignee, users.id))
    .leftJoin(users, eq(escalationPaths.resolvedBy, users.id))
    .where(eq(escalationPaths.id, id))
    .limit(1);

    if (result.length === 0) return undefined;

    const notifications = await db.select()
      .from(approvalNotifications)
      .where(eq(approvalNotifications.escalationPathId, id));

    return {
      ...result[0].escalationPath,
      approvalRecord: result[0].approvalRecord || undefined,
      currentAssigneeUser: result[0].currentAssigneeUser || undefined,
      resolvedByUser: result[0].resolvedByUser || undefined,
      notifications
    };
  }

  async getEscalationPathsByRecord(approvalRecordId: string): Promise<EscalationPath[]> {
    return await db.select()
      .from(escalationPaths)
      .where(eq(escalationPaths.approvalRecordId, approvalRecordId))
      .orderBy(desc(escalationPaths.createdAt));
  }

  async getActiveEscalations(assigneeId?: string): Promise<EscalationPath[]> {
    let query = db.select()
      .from(escalationPaths)
      .where(eq(escalationPaths.escalationStatus, 'pending'));

    if (assigneeId) {
      query = query.where(
        and(
          eq(escalationPaths.escalationStatus, 'pending'),
          sql`${assigneeId} = ANY(${escalationPaths.assignedApprovers})`
        )
      );
    }

    return await query.orderBy(desc(escalationPaths.createdAt));
  }

  async createEscalationPath(escalation: InsertEscalationPath): Promise<EscalationPath> {
    const [created] = await db.insert(escalationPaths).values(escalation).returning();
    return created;
  }

  async updateEscalationPath(id: string, escalation: Partial<InsertEscalationPath>): Promise<EscalationPath | undefined> {
    const [updated] = await db.update(escalationPaths)
      .set({ ...escalation, updatedAt: new Date() })
      .where(eq(escalationPaths.id, id))
      .returning();
    return updated;
  }

  async deleteEscalationPath(id: string): Promise<boolean> {
    const result = await db.delete(escalationPaths).where(eq(escalationPaths.id, id));
    return result.rowCount > 0;
  }

  // ============= APPROVAL SYSTEM OPERATIONS =============

  async processAutomaticApproval(item: ApprovalItem): Promise<ApprovalDecision> {
    console.log(`🎯 Processing automatic approval for ${item.type} item ${item.id}`);
    
    try {
      // Use the approval engine to evaluate the item
      const decision = await approvalEngine.evaluateForApproval(item);
      
      // If escalation is required, process it
      if (decision.escalationRequired) {
        const approvalRecord = await this.getApprovalRecordsByItem(item.id, item.type);
        if (approvalRecord.length > 0) {
          const escalationRequirement = await escalationManager.determineEscalationPath(
            item, 
            decision, 
            approvalRecord[0]
          );
          
          if (escalationRequirement.required) {
            await escalationManager.processEscalation(approvalRecord[0], escalationRequirement);
          }
        }
      }
      
      return decision;
    } catch (error) {
      console.error(`❌ Error processing automatic approval:`, error);
      throw error;
    }
  }

  async evaluateApprovalEligibility(item: ApprovalItem): Promise<PolicyComplianceResult> {
    // Get applicable policies
    const policies = await this.getActivePoliciesForContext(item.type, item.organizationalContext.department);
    
    // Evaluate compliance
    const violations = [];
    const warnings = [];
    let complianceScore = 100;
    
    for (const policy of policies) {
      // Policy evaluation logic would go here
      // For now, return a basic compliance result
    }
    
    return {
      isCompliant: violations.length === 0,
      violations,
      warnings,
      recommendedActions: [],
      complianceScore
    };
  }

  async determineEscalationPath(item: ApprovalItem, decision: ApprovalDecision): Promise<EscalationRequirement> {
    return await escalationManager.determineEscalationPath(item, decision, {} as ApprovalRecord);
  }

  async calculateApprovalMetrics(startDate: Date, endDate: Date, department?: string): Promise<ApprovalMetrics> {
    const baseQuery = db.select()
      .from(approvalRecords)
      .where(
        and(
          gte(approvalRecords.submittedAt, startDate),
          lte(approvalRecords.submittedAt, endDate)
        )
      );

    const records = await baseQuery;
    
    const metrics: ApprovalMetrics = {
      totalApprovals: records.length,
      automaticApprovals: records.filter(r => r.decisionMethod === 'automatic').length,
      manualApprovals: records.filter(r => r.decisionMethod === 'manual').length,
      escalatedApprovals: records.filter(r => r.approvalStatus === 'escalated').length,
      rejectedApprovals: records.filter(r => r.approvalStatus === 'rejected').length,
      expiredApprovals: records.filter(r => r.approvalStatus === 'expired').length,
      averageProcessingTime: 0,
      approvalRate: 0,
      escalationRate: 0,
      automaticApprovalRate: 0,
      policyComplianceRate: 0,
      departmentBreakdown: {},
      riskLevelBreakdown: {},
      approverPerformance: {}
    };

    // Calculate rates
    if (records.length > 0) {
      metrics.approvalRate = (records.filter(r => r.approvalStatus === 'approved').length / records.length) * 100;
      metrics.escalationRate = (metrics.escalatedApprovals / records.length) * 100;
      metrics.automaticApprovalRate = (metrics.automaticApprovals / records.length) * 100;
      
      // Calculate average processing time
      const processedRecords = records.filter(r => r.processingTimeMinutes);
      if (processedRecords.length > 0) {
        const totalTime = processedRecords.reduce((sum, r) => sum + (r.processingTimeMinutes || 0), 0);
        metrics.averageProcessingTime = totalTime / processedRecords.length / 60; // Convert to hours
      }
    }

    return metrics;
  }

  async getApproverPerformance(approverId: string, startDate: Date, endDate: Date): Promise<ApproverPerformance> {
    const records = await db.select()
      .from(approvalRecords)
      .where(
        and(
          eq(approvalRecords.approvedBy, approverId),
          gte(approvalRecords.submittedAt, startDate),
          lte(approvalRecords.submittedAt, endDate)
        )
      );

    const performance: ApproverPerformance = {
      approverId,
      approverName: '',
      approvalsProcessed: records.length,
      averageDecisionTime: 0,
      accuracyScore: 100,
      workload: 0,
      overdueItems: 0,
      escalationInitiated: 0,
      policyViolations: 0,
      stakeholderFeedback: 5
    };

    // Calculate average decision time
    if (records.length > 0) {
      const totalTime = records.reduce((sum, r) => sum + (r.processingTimeMinutes || 0), 0);
      performance.averageDecisionTime = totalTime / records.length;
    }

    // Get current workload (pending items assigned to this approver)
    const pendingEscalations = await db.select()
      .from(escalationPaths)
      .where(
        and(
          eq(escalationPaths.escalationStatus, 'pending'),
          sql`${approverId} = ANY(${escalationPaths.assignedApprovers})`
        )
      );
    
    performance.workload = pendingEscalations.length;

    // Get approver name
    const user = await db.select().from(users).where(eq(users.id, approverId)).limit(1);
    if (user.length > 0) {
      performance.approverName = user[0].fullName || user[0].username || 'Unknown';
    }

    return performance;
  }

  // ============= BULK OPERATIONS =============

  async bulkApproveItems(itemIds: string[], approverId: string, reasoning?: string): Promise<ApprovalRecord[]> {
    const approvedRecords = [];
    
    for (const itemId of itemIds) {
      const [updated] = await db.update(approvalRecords)
        .set({
          approvalStatus: 'approved',
          approvedBy: approverId,
          approvalReasoning: reasoning || 'Bulk approval',
          approvalDate: new Date(),
          decisionMethod: 'manual',
          updatedAt: new Date()
        })
        .where(
          and(
            eq(approvalRecords.approvalItemId, itemId),
            eq(approvalRecords.approvalStatus, 'pending')
          )
        )
        .returning();
      
      if (updated) {
        approvedRecords.push(updated);
        
        // Create audit trail
        await db.insert(approvalAuditTrail).values({
          approvalRecordId: updated.id,
          action: 'manually_approved',
          performedBy: approverId,
          newStatus: 'approved',
          reasoning: reasoning || 'Bulk approval'
        });
      }
    }
    
    return approvedRecords;
  }

  async bulkRejectItems(itemIds: string[], approverId: string, reasoning: string): Promise<ApprovalRecord[]> {
    const rejectedRecords = [];
    
    for (const itemId of itemIds) {
      const [updated] = await db.update(approvalRecords)
        .set({
          approvalStatus: 'rejected',
          approvedBy: approverId,
          approvalReasoning: reasoning,
          approvalDate: new Date(),
          decisionMethod: 'manual',
          updatedAt: new Date()
        })
        .where(
          and(
            eq(approvalRecords.approvalItemId, itemId),
            eq(approvalRecords.approvalStatus, 'pending')
          )
        )
        .returning();
      
      if (updated) {
        rejectedRecords.push(updated);
        
        // Create audit trail
        await db.insert(approvalAuditTrail).values({
          approvalRecordId: updated.id,
          action: 'rejected',
          performedBy: approverId,
          newStatus: 'rejected',
          reasoning
        });
      }
    }
    
    return rejectedRecords;
  }

  async bulkEscalateItems(itemIds: string[], escalationLevel: string, reason: string): Promise<EscalationPath[]> {
    const escalatedPaths = [];
    
    for (const itemId of itemIds) {
      const records = await this.getApprovalRecordsByItem(itemId, 'unknown');
      if (records.length > 0) {
        const escalationRequirement: EscalationRequirement = {
          required: true,
          level: escalationLevel as any,
          reason,
          urgency: 'medium',
          timeoutHours: 72,
          assignedApprovers: []
        };
        
        const escalationPath = await escalationManager.processEscalation(records[0], escalationRequirement);
        escalatedPaths.push(escalationPath);
      }
    }
    
    return escalatedPaths;
  }
}

// Export singleton instance
export const approvalStorage = new ApprovalStorage();