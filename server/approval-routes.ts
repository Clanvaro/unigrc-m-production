import express from "express";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { 
  insertApprovalPolicySchema,
  insertApprovalWorkflowSchema,
  insertApprovalHierarchySchema,
  insertApprovalDelegationSchema,
  insertApprovalRecordSchema,
  insertApprovalRuleSchema,
  type ApprovalItem,
  type ApprovalDecision,
  type User
} from "@shared/schema";
import { approvalEngine } from "./approval-engine";
import { escalationManager } from "./escalation-management";
import { approvalStorage } from "./approval-storage";
import { approvalAnalytics } from "./approval-analytics";

const router = express.Router();

// ============= APPROVAL PROCESSING ENDPOINTS =============

/**
 * POST /api/approval/evaluate
 * Evaluate an item for automatic approval
 */
router.post("/evaluate", async (req, res) => {
  try {
    const approvalItemSchema = z.object({
      id: z.string(),
      type: z.enum(['audit_test', 'audit_finding', 'remediation_plan', 'risk_assessment']),
      riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
      content: z.any(),
      submittedBy: z.string(),
      submittedAt: z.string().transform(str => new Date(str)),
      organizationalContext: z.object({
        department: z.string(),
        division: z.string().optional(),
        region: z.string().optional()
      }),
      financialImpact: z.number().optional(),
      regulatoryImplications: z.boolean().optional(),
      stakeholders: z.array(z.string()).optional()
    });

    const validatedData = approvalItemSchema.parse(req.body);
    console.log(`🎯 Evaluating approval for ${validatedData.type} item ${validatedData.id}`);

    const decision = await approvalEngine.evaluateForApproval(validatedData as ApprovalItem);
    
    res.json({
      success: true,
      data: decision,
      message: `Approval evaluation completed: ${decision.decision}`
    });
  } catch (error) {
    console.error("❌ Error evaluating approval:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: fromZodError(error).toString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: "Failed to evaluate approval",
      details: error.message
    });
  }
});

/**
 * POST /api/approval/process
 * Process a complete approval workflow
 */
router.post("/process", async (req, res) => {
  try {
    const processSchema = z.object({
      item: z.object({
        id: z.string(),
        type: z.enum(['audit_test', 'audit_finding', 'remediation_plan', 'risk_assessment']),
        riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
        content: z.any(),
        submittedBy: z.string(),
        submittedAt: z.string().transform(str => new Date(str)),
        organizationalContext: z.object({
          department: z.string(),
          division: z.string().optional(),
          region: z.string().optional()
        }),
        financialImpact: z.number().optional(),
        regulatoryImplications: z.boolean().optional(),
        stakeholders: z.array(z.string()).optional()
      }),
      workflowId: z.string().optional()
    });

    const { item, workflowId } = processSchema.parse(req.body);
    console.log(`🔄 Processing approval workflow for ${item.type} item ${item.id}`);

    // Process automatic approval
    const decision = await approvalStorage.processAutomaticApproval(item as ApprovalItem);
    
    res.json({
      success: true,
      data: {
        decision,
        workflowId: workflowId || 'default',
        processedAt: new Date()
      },
      message: `Approval workflow processed: ${decision.decision}`
    });
  } catch (error) {
    console.error("❌ Error processing approval workflow:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: fromZodError(error).toString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: "Failed to process approval workflow",
      details: error.message
    });
  }
});

/**
 * GET /api/approval/pending
 * Get pending approvals for current user or specific approver
 */
router.get("/pending", async (req, res) => {
  try {
    const { approverId, limit = "50", offset = "0" } = req.query;
    
    console.log(`📋 Fetching pending approvals for approver: ${approverId || 'all'}`);
    
    const pendingApprovals = await approvalStorage.getPendingApprovals(approverId as string);
    
    // Apply pagination
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    const paginatedApprovals = pendingApprovals.slice(offsetNum, offsetNum + limitNum);
    
    res.json({
      success: true,
      data: {
        approvals: paginatedApprovals,
        pagination: {
          total: pendingApprovals.length,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < pendingApprovals.length
        }
      },
      message: `Found ${pendingApprovals.length} pending approvals`
    });
  } catch (error) {
    console.error("❌ Error fetching pending approvals:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch pending approvals",
      details: error.message
    });
  }
});

/**
 * POST /api/approval/approve/:id
 * Manually approve an approval record
 */
router.post("/approve/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const approveSchema = z.object({
      approverId: z.string(),
      reasoning: z.string().optional(),
      conditions: z.array(z.string()).optional(),
      followUpRequired: z.boolean().optional(),
      followUpDate: z.string().transform(str => new Date(str)).optional()
    });

    const { approverId, reasoning, conditions, followUpRequired, followUpDate } = approveSchema.parse(req.body);
    console.log(`✅ Manually approving record ${id} by approver ${approverId}`);

    const updatedRecord = await approvalStorage.updateApprovalRecord(id, {
      approvalStatus: 'approved',
      approvedBy: approverId,
      approvalReasoning: reasoning || 'Manual approval',
      approvalDate: new Date(),
      decisionMethod: 'manual',
      approvalConditions: conditions || [],
      followUpRequired: followUpRequired || false,
      followUpDate
    });

    if (!updatedRecord) {
      return res.status(404).json({
        success: false,
        error: "Approval record not found"
      });
    }

    // Create audit trail entry
    await approvalStorage.createApprovalAuditTrail({
      approvalRecordId: id,
      action: 'manually_approved',
      performedBy: approverId,
      newStatus: 'approved',
      reasoning: reasoning || 'Manual approval'
    });

    res.json({
      success: true,
      data: updatedRecord,
      message: "Approval record successfully approved"
    });
  } catch (error) {
    console.error("❌ Error approving record:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: fromZodError(error).toString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: "Failed to approve record",
      details: error.message
    });
  }
});

/**
 * POST /api/approval/reject/:id
 * Reject an approval record with reasoning
 */
router.post("/reject/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const rejectSchema = z.object({
      approverId: z.string(),
      reasoning: z.string().min(10, "Rejection reasoning must be at least 10 characters"),
      recommendations: z.array(z.string()).optional()
    });

    const { approverId, reasoning, recommendations } = rejectSchema.parse(req.body);
    console.log(`❌ Rejecting approval record ${id} by approver ${approverId}`);

    const updatedRecord = await approvalStorage.updateApprovalRecord(id, {
      approvalStatus: 'rejected',
      approvedBy: approverId,
      approvalReasoning: reasoning,
      approvalDate: new Date(),
      decisionMethod: 'manual',
      rejectionRecommendations: recommendations || []
    });

    if (!updatedRecord) {
      return res.status(404).json({
        success: false,
        error: "Approval record not found"
      });
    }

    // Create audit trail entry
    await approvalStorage.createApprovalAuditTrail({
      approvalRecordId: id,
      action: 'rejected',
      performedBy: approverId,
      newStatus: 'rejected',
      reasoning
    });

    res.json({
      success: true,
      data: updatedRecord,
      message: "Approval record successfully rejected"
    });
  } catch (error) {
    console.error("❌ Error rejecting record:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: fromZodError(error).toString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: "Failed to reject record",
      details: error.message
    });
  }
});

/**
 * POST /api/approval/escalate/:id
 * Escalate an approval record to higher authority
 */
router.post("/escalate/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const escalateSchema = z.object({
      escalationLevel: z.enum(['supervisor', 'manager', 'director', 'executive', 'board']),
      reason: z.string().min(10, "Escalation reason must be at least 10 characters"),
      urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      escalatedBy: z.string()
    });

    const { escalationLevel, reason, urgency, escalatedBy } = escalateSchema.parse(req.body);
    console.log(`📈 Escalating approval record ${id} to ${escalationLevel} level`);

    // Get approval record
    const approvalRecord = await approvalStorage.getApprovalRecord(id);
    if (!approvalRecord) {
      return res.status(404).json({
        success: false,
        error: "Approval record not found"
      });
    }

    // Create escalation requirement
    const escalationRequirement = {
      required: true,
      level: escalationLevel,
      reason,
      urgency: urgency || 'medium',
      timeoutHours: 72,
      assignedApprovers: []
    };

    // Process escalation
    const escalationPath = await escalationManager.processEscalation(approvalRecord, escalationRequirement);

    // Create audit trail entry
    await approvalStorage.createApprovalAuditTrail({
      approvalRecordId: id,
      action: 'escalated',
      performedBy: escalatedBy,
      newStatus: 'escalated',
      reasoning: reason,
      actionDetails: {
        escalationLevel,
        escalationPathId: escalationPath.id,
        urgency: urgency || 'medium'
      }
    });

    res.json({
      success: true,
      data: {
        escalationPath,
        updatedRecord: await approvalStorage.getApprovalRecord(id)
      },
      message: `Approval record escalated to ${escalationLevel} level`
    });
  } catch (error) {
    console.error("❌ Error escalating record:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: fromZodError(error).toString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: "Failed to escalate record",
      details: error.message
    });
  }
});

/**
 * POST /api/approval/bulk-approve
 * Bulk approve multiple approval records
 */
router.post("/bulk-approve", async (req, res) => {
  try {
    const bulkApproveSchema = z.object({
      itemIds: z.array(z.string()).min(1, "At least one item ID is required"),
      approverId: z.string(),
      reasoning: z.string().optional(),
      conditions: z.array(z.string()).optional()
    });

    const { itemIds, approverId, reasoning, conditions } = bulkApproveSchema.parse(req.body);
    console.log(`✅ Bulk approving ${itemIds.length} items by approver ${approverId}`);

    const approvedRecords = await approvalStorage.bulkApproveItems(itemIds, approverId, reasoning);

    res.json({
      success: true,
      data: {
        approvedRecords,
        processedCount: approvedRecords.length,
        skippedCount: itemIds.length - approvedRecords.length
      },
      message: `Successfully approved ${approvedRecords.length} of ${itemIds.length} items`
    });
  } catch (error) {
    console.error("❌ Error bulk approving items:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: fromZodError(error).toString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: "Failed to bulk approve items",
      details: error.message
    });
  }
});

/**
 * POST /api/approval/bulk-reject
 * Bulk reject multiple approval records
 */
router.post("/bulk-reject", async (req, res) => {
  try {
    const bulkRejectSchema = z.object({
      itemIds: z.array(z.string()).min(1, "At least one item ID is required"),
      approverId: z.string(),
      reasoning: z.string().min(10, "Rejection reasoning must be at least 10 characters")
    });

    const { itemIds, approverId, reasoning } = bulkRejectSchema.parse(req.body);
    console.log(`❌ Bulk rejecting ${itemIds.length} items by approver ${approverId}`);

    const rejectedRecords = await approvalStorage.bulkRejectItems(itemIds, approverId, reasoning);

    res.json({
      success: true,
      data: {
        rejectedRecords,
        processedCount: rejectedRecords.length,
        skippedCount: itemIds.length - rejectedRecords.length
      },
      message: `Successfully rejected ${rejectedRecords.length} of ${itemIds.length} items`
    });
  } catch (error) {
    console.error("❌ Error bulk rejecting items:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: fromZodError(error).toString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: "Failed to bulk reject items",
      details: error.message
    });
  }
});

// ============= CONFIGURATION ENDPOINTS =============

/**
 * GET /api/approval/policies
 * Get all approval policies
 */
router.get("/policies", async (req, res) => {
  try {
    const { department, isActive } = req.query;
    console.log(`📋 Fetching approval policies`);

    let policies;
    if (department) {
      policies = await approvalStorage.getActivePoliciesForContext('all', department as string);
    } else {
      policies = await approvalStorage.getApprovalPolicies();
    }

    // Filter by active status if specified
    if (isActive !== undefined) {
      const activeFilter = isActive === 'true';
      policies = policies.filter(policy => policy.isActive === activeFilter);
    }

    res.json({
      success: true,
      data: policies,
      message: `Found ${policies.length} approval policies`
    });
  } catch (error) {
    console.error("❌ Error fetching approval policies:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch approval policies",
      details: error.message
    });
  }
});

/**
 * POST /api/approval/policies
 * Create or update an approval policy
 */
router.post("/policies", async (req, res) => {
  try {
    const validatedData = insertApprovalPolicySchema.parse(req.body);
    console.log(`📝 Creating approval policy: ${validatedData.policyName}`);

    const createdPolicy = await approvalStorage.createApprovalPolicy(validatedData);

    res.status(201).json({
      success: true,
      data: createdPolicy,
      message: "Approval policy created successfully"
    });
  } catch (error) {
    console.error("❌ Error creating approval policy:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: fromZodError(error).toString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: "Failed to create approval policy",
      details: error.message
    });
  }
});

/**
 * PUT /api/approval/policies/:id
 * Update an approval policy
 */
router.put("/policies/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = insertApprovalPolicySchema.partial().parse(req.body);
    console.log(`📝 Updating approval policy ${id}`);

    const updatedPolicy = await approvalStorage.updateApprovalPolicy(id, updateData);
    
    if (!updatedPolicy) {
      return res.status(404).json({
        success: false,
        error: "Approval policy not found"
      });
    }

    res.json({
      success: true,
      data: updatedPolicy,
      message: "Approval policy updated successfully"
    });
  } catch (error) {
    console.error("❌ Error updating approval policy:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: fromZodError(error).toString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: "Failed to update approval policy",
      details: error.message
    });
  }
});

/**
 * GET /api/approval/rules
 * Get approval rules
 */
router.get("/rules", async (req, res) => {
  try {
    const { itemType, isActive } = req.query;
    console.log(`📋 Fetching approval rules`);

    let rules;
    if (itemType) {
      rules = await approvalStorage.getActiveRulesForContext(itemType as string);
    } else {
      rules = await approvalStorage.getApprovalRules();
    }

    // Filter by active status if specified
    if (isActive !== undefined) {
      const activeFilter = isActive === 'true';
      rules = rules.filter(rule => rule.isActive === activeFilter);
    }

    res.json({
      success: true,
      data: rules,
      message: `Found ${rules.length} approval rules`
    });
  } catch (error) {
    console.error("❌ Error fetching approval rules:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch approval rules",
      details: error.message
    });
  }
});

/**
 * POST /api/approval/rules
 * Create a new approval rule
 */
router.post("/rules", async (req, res) => {
  try {
    const validatedData = insertApprovalRuleSchema.parse(req.body);
    console.log(`📝 Creating approval rule: ${validatedData.ruleName}`);

    const createdRule = await approvalStorage.createApprovalRule(validatedData);

    res.status(201).json({
      success: true,
      data: createdRule,
      message: "Approval rule created successfully"
    });
  } catch (error) {
    console.error("❌ Error creating approval rule:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: fromZodError(error).toString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: "Failed to create approval rule",
      details: error.message
    });
  }
});

/**
 * GET /api/approval/hierarchy
 * Get organizational approval hierarchy
 */
router.get("/hierarchy", async (req, res) => {
  try {
    const { department, level } = req.query;
    console.log(`📋 Fetching approval hierarchy`);

    let hierarchy;
    if (department) {
      hierarchy = await approvalStorage.getApprovalHierarchyByDepartment(department as string);
    } else if (level) {
      hierarchy = await approvalStorage.getApprovalHierarchyByLevel(level as string);
    } else {
      hierarchy = await approvalStorage.getApprovalHierarchy();
    }

    res.json({
      success: true,
      data: hierarchy,
      message: `Found ${hierarchy.length} hierarchy records`
    });
  } catch (error) {
    console.error("❌ Error fetching approval hierarchy:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch approval hierarchy",
      details: error.message
    });
  }
});

/**
 * POST /api/approval/hierarchy
 * Create or update approval hierarchy
 */
router.post("/hierarchy", async (req, res) => {
  try {
    const validatedData = insertApprovalHierarchySchema.parse(req.body);
    console.log(`📝 Creating approval hierarchy for ${validatedData.department}/${validatedData.approvalLevel}`);

    const createdHierarchy = await approvalStorage.createApprovalHierarchy(validatedData);

    res.status(201).json({
      success: true,
      data: createdHierarchy,
      message: "Approval hierarchy created successfully"
    });
  } catch (error) {
    console.error("❌ Error creating approval hierarchy:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: fromZodError(error).toString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: "Failed to create approval hierarchy",
      details: error.message
    });
  }
});

// ============= ANALYTICS ENDPOINTS =============

/**
 * GET /api/approval/analytics
 * Get approval performance analytics
 */
router.get("/analytics", async (req, res) => {
  try {
    const analyticsSchema = z.object({
      startDate: z.string().transform(str => new Date(str)),
      endDate: z.string().transform(str => new Date(str)),
      department: z.string().optional(),
      granularity: z.enum(['daily', 'weekly', 'monthly']).optional().default('daily')
    });

    const { startDate, endDate, department, granularity } = analyticsSchema.parse(req.query);
    console.log(`📊 Generating approval analytics from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    const metrics = await approvalAnalytics.generateApprovalMetrics(startDate, endDate, department);
    const trends = await approvalAnalytics.generateApprovalTrends(startDate, endDate, granularity);
    const escalationAnalytics = await approvalAnalytics.generateEscalationAnalytics(startDate, endDate);

    res.json({
      success: true,
      data: {
        metrics,
        trends,
        escalationAnalytics,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          granularity
        }
      },
      message: "Approval analytics generated successfully"
    });
  } catch (error) {
    console.error("❌ Error generating approval analytics:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: fromZodError(error).toString()
      });
    }
    
    res.status(500).json({
      success: false,
      error: "Failed to generate approval analytics",
      details: error.message
    });
  }
});

/**
 * GET /api/approval/metrics
 * Get current approval metrics and KPIs
 */
router.get("/metrics", async (req, res) => {
  try {
    console.log(`📊 Generating current approval metrics`);
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const currentMetrics = await approvalAnalytics.generateApprovalMetrics(startOfMonth, now);
    const bottleneckAnalysis = await approvalAnalytics.identifyApprovalBottlenecks(startOfMonth, now);

    res.json({
      success: true,
      data: {
        currentMetrics,
        bottleneckAnalysis,
        generatedAt: now.toISOString()
      },
      message: "Current approval metrics generated successfully"
    });
  } catch (error) {
    console.error("❌ Error generating approval metrics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate approval metrics",
      details: error.message
    });
  }
});

/**
 * GET /api/approval/dashboard
 * Get real-time approval dashboard data
 */
router.get("/dashboard", async (req, res) => {
  try {
    console.log(`📊 Generating approval dashboard data`);
    
    const dashboardData = await approvalAnalytics.generateDashboardData();

    res.json({
      success: true,
      data: dashboardData,
      message: "Dashboard data generated successfully"
    });
  } catch (error) {
    console.error("❌ Error generating dashboard data:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate dashboard data",
      details: error.message
    });
  }
});

/**
 * GET /api/approval/records/:id
 * Get detailed approval record with audit trail
 */
router.get("/records/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 Fetching approval record details for ${id}`);

    const recordDetails = await approvalStorage.getApprovalRecordWithDetails(id);
    
    if (!recordDetails) {
      return res.status(404).json({
        success: false,
        error: "Approval record not found"
      });
    }

    res.json({
      success: true,
      data: recordDetails,
      message: "Approval record details retrieved successfully"
    });
  } catch (error) {
    console.error("❌ Error fetching approval record details:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch approval record details",
      details: error.message
    });
  }
});

/**
 * GET /api/approval/escalations
 * Get active escalations
 */
router.get("/escalations", async (req, res) => {
  try {
    const { assigneeId, status } = req.query;
    console.log(`📈 Fetching escalations`);

    let escalations;
    if (status === 'active') {
      escalations = await approvalStorage.getActiveEscalations(assigneeId as string);
    } else {
      escalations = await approvalStorage.getEscalationPaths();
    }

    res.json({
      success: true,
      data: escalations,
      message: `Found ${escalations.length} escalations`
    });
  } catch (error) {
    console.error("❌ Error fetching escalations:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch escalations",
      details: error.message
    });
  }
});

export default router;