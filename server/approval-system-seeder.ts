/**
 * Approval System Database Seeder
 * Seeds the PostgreSQL database with comprehensive default approval system data
 * This ensures production-ready operation with meaningful default policies, rules, hierarchy, and workflows
 */

import { db } from "./db";
import { 
  approvalPolicies, 
  approvalRules, 
  approvalHierarchy, 
  approvalWorkflows, 
  escalationPaths,
  type InsertApprovalPolicy,
  type InsertApprovalRule,
  type InsertApprovalHierarchy,
  type InsertApprovalWorkflow,
  type InsertEscalationPath
} from "@shared/schema";

/**
 * Comprehensive approval system seeding for production readiness
 */
export class ApprovalSystemSeeder {
  
  /**
   * Main seeding function - seeds all approval system components
   */
  async seedApprovalSystem(): Promise<void> {
    console.log('🎯 Seeding Approval System with comprehensive production data...');

    try {
      // Check if already seeded
      const existingPolicies = await db.select().from(approvalPolicies).limit(1);
      if (existingPolicies.length > 0) {
        console.log('✅ Approval System already seeded, skipping...');
        return;
      }

      // 1. Seed Approval Policies
      await this.seedApprovalPolicies();
      
      // 2. Seed Approval Rules  
      await this.seedApprovalRules();
      
      // 3. Seed Approval Hierarchy
      await this.seedApprovalHierarchy();
      
      // 4. Seed Approval Workflows
      await this.seedApprovalWorkflows();
      
      // 5. Seed Escalation Paths
      await this.seedEscalationPaths();
      
      console.log('🎉 Approval System seeding completed successfully!');
      
    } catch (error) {
      console.error('❌ Error seeding Approval System:', error);
      throw error;
    }
  }

  /**
   * Seed comprehensive approval policies for production use
   */
  private async seedApprovalPolicies(): Promise<void> {
    const defaultPolicies: InsertApprovalPolicy[] = [
      {
        policyName: "Risk-Based Auto Approval",
        policyDescription: "Automatically approve low-risk items with minimal financial impact",
        policyType: "risk_based",
        conditions: {
          riskLevel: ["low"],
          maxFinancialImpact: 10000,
          requiresCompliance: true
        },
        approvalAction: "auto_approve",
        escalationLevel: null,
        priority: 10,
        isActive: true,
        applicableDepartments: ["audit", "risk", "compliance"],
        effectiveDate: new Date(),
        expiryDate: null,
        createdBy: "user-1", // Admin user
        approvedBy: "user-1"
      },
      {
        policyName: "High-Risk Escalation",
        policyDescription: "Escalate high and critical risk items to supervisors",
        policyType: "risk_based",
        conditions: {
          riskLevel: ["high", "critical"],
          escalateImmediate: true
        },
        approvalAction: "escalate",
        escalationLevel: "supervisor",
        priority: 20,
        isActive: true,
        applicableDepartments: ["audit", "risk"],
        effectiveDate: new Date(),
        expiryDate: null,
        createdBy: "user-1",
        approvedBy: "user-1"
      },
      {
        policyName: "Financial Threshold Escalation",
        policyDescription: "Escalate items exceeding financial thresholds to management",
        policyType: "financial",
        conditions: {
          minFinancialImpact: 50000,
          requiresExecutiveApproval: true
        },
        approvalAction: "escalate",
        escalationLevel: "manager",
        priority: 30,
        isActive: true,
        applicableDepartments: ["audit", "finance"],
        effectiveDate: new Date(),
        expiryDate: null,
        createdBy: "user-1",
        approvedBy: "user-1"
      },
      {
        policyName: "Critical Finding Escalation",
        policyDescription: "Immediately escalate critical audit findings to executive level",
        policyType: "finding_severity",
        conditions: {
          severity: ["critical"],
          immediateEscalation: true,
          requiresExecutiveReview: true
        },
        approvalAction: "escalate",
        escalationLevel: "executive",
        priority: 5,
        isActive: true,
        applicableDepartments: ["audit"],
        effectiveDate: new Date(),
        expiryDate: null,
        createdBy: "user-1",
        approvedBy: "user-1"
      }
    ];

    await db.insert(approvalPolicies).values(defaultPolicies);
    console.log(`✅ Seeded ${defaultPolicies.length} approval policies`);
  }

  /**
   * Seed intelligent approval rules for automated decision making
   */
  private async seedApprovalRules(): Promise<void> {
    const defaultRules: InsertApprovalRule[] = [
      {
        ruleName: "Low Risk Auto-Approval Rule",
        ruleDescription: "Auto-approve items with low risk score and policy compliance",
        ruleType: "risk_based",
        conditions: {
          riskScore: { max: 30 },
          policyCompliant: true,
          financialImpact: { max: 10000 }
        },
        action: "auto_approve",
        priority: 10,
        isActive: true,
        applicableContexts: ["audit", "compliance"],
        effectiveDate: new Date(),
        expiryDate: null
      },
      {
        ruleName: "High Risk Escalation Rule",
        ruleDescription: "Escalate items with high risk scores or policy violations",
        ruleType: "risk_based",
        conditions: {
          riskScore: { min: 70 },
          escalateOnPolicyViolation: true
        },
        action: "escalate",
        priority: 20,
        isActive: true,
        applicableContexts: ["audit", "risk"],
        effectiveDate: new Date(),
        expiryDate: null
      },
      {
        ruleName: "Manual Review Default Rule",
        ruleDescription: "Default to manual review for medium-risk items",
        ruleType: "severity_based",
        conditions: {
          riskScore: { min: 31, max: 69 },
          requiresHumanJudgment: true
        },
        action: "require_review",
        priority: 30,
        isActive: true,
        applicableContexts: ["audit"],
        effectiveDate: new Date(),
        expiryDate: null
      }
    ];

    await db.insert(approvalRules).values(defaultRules);
    console.log(`✅ Seeded ${defaultRules.length} approval rules`);
  }

  /**
   * Seed organizational approval hierarchy for proper escalation chains
   */
  private async seedApprovalHierarchy(): Promise<void> {
    const defaultHierarchy: InsertApprovalHierarchy[] = [
      {
        userId: "user-2", // María González (Supervisor de Auditoría)
        supervisorId: "user-3", // Carlos Ruiz (Gerente de Riesgos)
        departmentId: "audit",
        hierarchyLevel: 1,
        maxApprovalLimit: 25000,
        canDelegate: true,
        isActive: true,
        effectiveDate: new Date(),
        expiryDate: null
      },
      {
        userId: "user-3", // Carlos Ruiz (Gerente de Riesgos)
        supervisorId: "user-1", // Admin (Director de Auditoría)
        departmentId: "risk",
        hierarchyLevel: 2,
        maxApprovalLimit: 100000,
        canDelegate: true,
        isActive: true,
        effectiveDate: new Date(),
        expiryDate: null
      },
      {
        userId: "user-1", // Admin (Director de Auditoría)
        supervisorId: null, // Top level
        departmentId: "audit",
        hierarchyLevel: 3,
        maxApprovalLimit: null, // Unlimited
        canDelegate: true,
        isActive: true,
        effectiveDate: new Date(),
        expiryDate: null
      }
    ];

    await db.insert(approvalHierarchy).values(defaultHierarchy);
    console.log(`✅ Seeded ${defaultHierarchy.length} approval hierarchy levels`);
  }

  /**
   * Seed approval workflows for different item types
   */
  private async seedApprovalWorkflows(): Promise<void> {
    const defaultWorkflows: InsertApprovalWorkflow[] = [
      {
        workflowName: "Standard Audit Test Approval",
        workflowType: "sequential",
        itemType: "audit_test",
        approvalSteps: [
          {
            stepOrder: 1,
            approverRole: "supervisor",
            required: true,
            timeoutHours: 24,
            autoEscalate: true
          },
          {
            stepOrder: 2,
            approverRole: "manager",
            required: false,
            condition: "high_risk",
            timeoutHours: 48,
            autoEscalate: true
          }
        ],
        autoEscalationEnabled: true,
        escalationTimeoutHours: 72,
        bypassConditions: {
          riskLevel: ["low"],
          autoApprovalEnabled: true
        },
        notificationSettings: {
          notifyOnSubmission: true,
          notifyOnApproval: true,
          notifyOnEscalation: true,
          escalationReminders: [24, 48]
        },
        isActive: true
      },
      {
        workflowName: "Critical Finding Approval",
        workflowType: "parallel",
        itemType: "audit_finding",
        approvalSteps: [
          {
            stepOrder: 1,
            approverRole: "manager",
            required: true,
            timeoutHours: 12,
            autoEscalate: true
          },
          {
            stepOrder: 1,
            approverRole: "risk_manager",
            required: true,
            timeoutHours: 12,
            autoEscalate: true
          }
        ],
        autoEscalationEnabled: true,
        escalationTimeoutHours: 24,
        bypassConditions: null,
        notificationSettings: {
          notifyOnSubmission: true,
          notifyOnApproval: true,
          notifyOnEscalation: true,
          escalationReminders: [6, 12]
        },
        isActive: true
      }
    ];

    await db.insert(approvalWorkflows).values(defaultWorkflows);
    console.log(`✅ Seeded ${defaultWorkflows.length} approval workflows`);
  }

  /**
   * Seed escalation paths for proper escalation handling
   */
  private async seedEscalationPaths(): Promise<void> {
    const defaultPaths: InsertEscalationPath[] = [
      {
        pathName: "Standard Audit Escalation",
        triggerConditions: {
          riskLevel: ["high", "critical"],
          timeoutExceeded: true
        },
        escalationSteps: [
          {
            level: 1,
            roleRequired: "supervisor",
            timeoutHours: 24,
            notificationTemplate: "supervisor_escalation"
          },
          {
            level: 2,
            roleRequired: "manager",
            timeoutHours: 48,
            notificationTemplate: "manager_escalation"
          },
          {
            level: 3,
            roleRequired: "executive",
            timeoutHours: 72,
            notificationTemplate: "executive_escalation"
          }
        ],
        maxEscalationLevel: 3,
        isActive: true
      }
    ];

    await db.insert(escalationPaths).values(defaultPaths);
    console.log(`✅ Seeded ${defaultPaths.length} escalation paths`);
  }
}

/**
 * Execute approval system seeding if this file is run directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const seeder = new ApprovalSystemSeeder();
  seeder.seedApprovalSystem()
    .then(() => {
      console.log('🎉 Approval System seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Approval System seeding failed:', error);
      process.exit(1);
    });
}

export const approvalSystemSeeder = new ApprovalSystemSeeder();