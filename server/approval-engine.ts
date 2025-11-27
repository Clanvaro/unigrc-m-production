import { 
  type ApprovalItem, 
  type ApprovalDecision, 
  type RiskAssessment,
  type PolicyComplianceResult,
  type ApprovalRecord,
  type EscalationRequirement,
  type ApprovalEngineConfig,
  type ApprovalRule,
  type RiskLevel,
  type ApprovalAction,
  insertApprovalRecordSchema,
  insertApprovalAuditTrailSchema,
  risks,
  auditFindings,
  controls,
  approvalRecords,
  approvalRules,
  approvalPolicies,
  approvalAuditTrail,
  systemConfig,
  NotificationTypes
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { notificationService } from "./notification-service";

/**
 * Core Approval Engine - Intelligent risk-based approval processing
 * 
 * This engine evaluates items for automatic approval using:
 * - Risk assessment algorithms
 * - Finding severity analysis  
 * - Policy compliance checking
 * - Rules-based decision making
 * - Escalation path determination
 */
export class ApprovalEngine {
  private config: ApprovalEngineConfig;
  private riskAnalyzer: RiskAnalyzer;
  private policyEngine: PolicyComplianceEngine;
  private ruleEngine: ApprovalRuleEngine;

  constructor() {
    this.riskAnalyzer = new RiskAnalyzer();
    this.policyEngine = new PolicyComplianceEngine();
    this.ruleEngine = new ApprovalRuleEngine();
    this.loadConfiguration();
  }

  /**
   * Main approval evaluation function
   * Processes an item through the complete approval pipeline
   */
  async evaluateForApproval(item: ApprovalItem): Promise<ApprovalDecision> {
    console.log(`🎯 Evaluating item ${item.id} (${item.type}) for approval`);
    
    // Declare variables in outer scope to ensure they're accessible in catch block
    let riskAssessment: RiskAssessment | null = null;
    let policyCompliance: PolicyComplianceResult | null = null;
    let ruleEvaluation: any = null;
    
    try {
      // Phase 1: Risk Assessment
      riskAssessment = await this.riskAnalyzer.assessRiskLevel(item);
      console.log(`📊 Risk assessment: ${riskAssessment.level} (score: ${riskAssessment.score})`);

      // Phase 2: Policy Compliance Check
      policyCompliance = await this.policyEngine.checkCompliance(item);
      console.log(`📋 Policy compliance: ${policyCompliance.isCompliant ? 'PASS' : 'FAIL'} (${policyCompliance.violations.length} violations)`);

      // Phase 3: Rules Engine Evaluation
      ruleEvaluation = await this.ruleEngine.evaluateApprovalRules(item, riskAssessment);
      console.log(`⚙️ Rule evaluation: ${ruleEvaluation.recommendedAction}`);

      // Phase 4: Decision Synthesis
      const decision = await this.synthesizeDecision(item, riskAssessment, policyCompliance, ruleEvaluation);
      console.log(`✅ Final decision: ${decision.decision} (confidence: ${decision.confidence}%)`);

      // Phase 5: Audit Trail Creation
      await this.createApprovalRecord(item, decision, riskAssessment, policyCompliance);

      return decision;
    } catch (error) {
      console.error(`❌ Error evaluating approval for item ${item.id}:`, error);
      
      // Create default fallback risk assessment if needed
      const fallbackRiskAssessment: RiskAssessment = riskAssessment || {
        level: 'high' as RiskLevel,
        score: 90,
        factors: {
          complexity: 5,
          impact: 5,
          likelihood: 4,
          controls: 1
        },
        reasoning: 'Default high-risk classification due to evaluation error'
      };
      
      // Fallback to manual review on error
      return {
        decision: 'require_review',
        reasoning: `System error during evaluation: ${error.message}. Defaulting to manual review for safety.`,
        confidence: 0,
        escalationRequired: true,
        policyViolations: [],
        riskAssessment: fallbackRiskAssessment,
        appliedRules: ruleEvaluation?.appliedRules || [],
        followUpRequired: true
      };
    }
  }

  /**
   * Synthesize final approval decision from all evaluation components
   */
  private async synthesizeDecision(
    item: ApprovalItem,
    riskAssessment: RiskAssessment,
    policyCompliance: PolicyComplianceResult,
    ruleEvaluation: any
  ): Promise<ApprovalDecision> {
    
    // Critical violations always require escalation
    const criticalViolations = policyCompliance.violations.filter(v => v.violationType === 'critical');
    if (criticalViolations.length > 0) {
      return {
        decision: 'escalate',
        reasoning: `Critical policy violations detected: ${criticalViolations.map(v => v.policyName).join(', ')}`,
        confidence: 95,
        escalationRequired: true,
        policyViolations: policyCompliance.violations.map(v => v.policyName),
        riskAssessment,
        appliedRules: ruleEvaluation.appliedRules,
        followUpRequired: true
      };
    }

    // High/Critical risk items need escalation
    if (riskAssessment.level === 'critical' || (riskAssessment.level === 'high' && riskAssessment.score > 85)) {
      return {
        decision: 'escalate',
        reasoning: `High risk level (${riskAssessment.level}) with score ${riskAssessment.score} requires escalation`,
        confidence: 90,
        escalationRequired: true,
        policyViolations: policyCompliance.violations.map(v => v.policyName),
        riskAssessment,
        appliedRules: ruleEvaluation.appliedRules,
        followUpRequired: true
      };
    }

    // Financial thresholds check
    if (item.financialImpact && item.financialImpact > this.config.financialThresholds.executiveApprovalRequired) {
      return {
        decision: 'escalate',
        reasoning: `Financial impact $${item.financialImpact.toLocaleString()} exceeds executive approval threshold`,
        confidence: 95,
        escalationRequired: true,
        policyViolations: policyCompliance.violations.map(v => v.policyName),
        riskAssessment,
        appliedRules: ruleEvaluation.appliedRules,
        followUpRequired: true
      };
    }

    // Rule-based decision override
    if (ruleEvaluation.recommendedAction !== 'auto_approve' && ruleEvaluation.confidence > 80) {
      return {
        decision: ruleEvaluation.recommendedAction,
        reasoning: `Rules engine recommendation: ${ruleEvaluation.reasoning}`,
        confidence: ruleEvaluation.confidence,
        escalationRequired: ruleEvaluation.recommendedAction === 'escalate',
        policyViolations: policyCompliance.violations.map(v => v.policyName),
        riskAssessment,
        appliedRules: ruleEvaluation.appliedRules,
        followUpRequired: ruleEvaluation.recommendedAction !== 'auto_approve'
      };
    }

    // Auto-approve for low risk, compliant items
    if (riskAssessment.level === 'low' && 
        policyCompliance.isCompliant && 
        (!item.financialImpact || item.financialImpact <= this.config.financialThresholds.autoApproveLimit)) {
      return {
        decision: 'auto_approve',
        reasoning: `Low risk (${riskAssessment.score}), policy compliant, within financial limits`,
        confidence: 85,
        escalationRequired: false,
        policyViolations: [],
        riskAssessment,
        appliedRules: ruleEvaluation.appliedRules,
        followUpRequired: false
      };
    }

    // Default to manual review
    return {
      decision: 'require_review',
      reasoning: `Item requires manual review based on risk level (${riskAssessment.level}) and policy compliance status`,
      confidence: 70,
      escalationRequired: false,
      policyViolations: policyCompliance.violations.map(v => v.policyName),
      riskAssessment,
      appliedRules: ruleEvaluation.appliedRules,
      followUpRequired: true
    };
  }

  /**
   * Create comprehensive approval record with audit trail
   */
  private async createApprovalRecord(
    item: ApprovalItem,
    decision: ApprovalDecision,
    riskAssessment: RiskAssessment,
    policyCompliance: PolicyComplianceResult
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Create main approval record
      const [approvalRecord] = await db.insert(approvalRecords).values({
        approvalItemId: item.id,
        approvalItemType: item.type,
        approvalStatus: decision.decision === 'auto_approve' ? 'approved' : 'pending',
        decisionMethod: 'automatic',
        approvalReasoning: decision.reasoning,
        riskLevel: riskAssessment.level,
        severityAnalysis: {
          riskScore: riskAssessment.score,
          factors: riskAssessment.factors,
          complianceImpact: riskAssessment.complianceImpact
        },
        policyCompliance: {
          isCompliant: policyCompliance.isCompliant,
          violations: policyCompliance.violations,
          complianceScore: policyCompliance.complianceScore
        },
        decisionConfidence: decision.confidence,
        processingTimeMinutes: Math.round((Date.now() - startTime) / 1000 / 60),
        approvalDate: decision.decision === 'auto_approve' ? new Date() : null,
        followUpRequired: decision.followUpRequired,
        submittedBy: item.submittedBy,
        submittedAt: item.submittedAt,
      }).returning();

      // Create audit trail entry
      await db.insert(approvalAuditTrail).values({
        approvalRecordId: approvalRecord.id,
        action: decision.decision === 'auto_approve' ? 'auto_approved' : 'evaluation_completed',
        newStatus: decision.decision === 'auto_approve' ? 'approved' : 'pending',
        actionDetails: {
          algorithmVersion: '1.0',
          decisionFactors: {
            riskLevel: riskAssessment.level,
            riskScore: riskAssessment.score,
            policyCompliant: policyCompliance.isCompliant,
            appliedRules: decision.appliedRules
          }
        },
        reasoning: decision.reasoning,
      });

      console.log(`📝 Created approval record ${approvalRecord.id} for item ${item.id}`);
      
      // Send notifications if appropriate
      if (decision.decision === 'auto_approve') {
        await this.notifyAutoApproval(item, decision, approvalRecord);
      } else if (decision.escalationRequired) {
        await this.notifyEscalationRequired(item, decision, approvalRecord);
      }

    } catch (error) {
      console.error(`❌ Error creating approval record for item ${item.id}:`, error);
      throw error;
    }
  }

  /**
   * Send notification for auto-approved items
   */
  private async notifyAutoApproval(item: ApprovalItem, decision: ApprovalDecision, record: ApprovalRecord): Promise<void> {
    try {
      const itemTypeLabels: Record<string, string> = {
        'audit_finding': 'Hallazgo de auditoría',
        'risk': 'Riesgo',
        'control': 'Control',
        'action_plan': 'Plan de acción',
        'document': 'Documento',
        'process': 'Proceso'
      };
      
      const typeLabel = itemTypeLabels[item.type] || item.type.replace('_', ' ');
      
      await notificationService.createNotification({
        recipientId: item.submittedBy,
        type: NotificationTypes.TEST_APPROVED,
        category: 'approval',
        priority: 'normal',
        title: `${typeLabel} Auto-Aprobado`,
        message: `Su ${typeLabel.toLowerCase()} ha sido aprobado automáticamente. Razón: ${decision.reasoning}`,
        actionText: 'Ver Detalles',
        actionUrl: `/approvals/${record.id}`,
        data: {
          approvalRecordId: record.id,
          itemId: item.id,
          itemType: item.type,
          decisionConfidence: decision.confidence
        },
        channels: ['in_app', 'email']
      });
    } catch (error) {
      console.error(`❌ Error sending auto-approval notification:`, error);
    }
  }

  /**
   * Send notification for escalation required
   */
  private async notifyEscalationRequired(item: ApprovalItem, decision: ApprovalDecision, record: ApprovalRecord): Promise<void> {
    try {
      const itemTypeLabels: Record<string, string> = {
        'audit_finding': 'Hallazgo de auditoría',
        'risk': 'Riesgo',
        'control': 'Control',
        'action_plan': 'Plan de acción',
        'document': 'Documento',
        'process': 'Proceso'
      };
      
      const typeLabel = itemTypeLabels[item.type] || item.type.replace('_', ' ');
      
      await notificationService.createNotification({
        recipientId: item.submittedBy,
        type: NotificationTypes.REVIEW_REQUEST,
        category: 'approval',
        priority: decision.riskAssessment.level === 'critical' ? 'critical' : 'important',
        title: `${typeLabel} Requiere Revisión`,
        message: `Su ${typeLabel.toLowerCase()} requiere revisión manual o escalamiento. Razón: ${decision.reasoning}`,
        actionText: 'Ver Detalles',
        actionUrl: `/approvals/${record.id}`,
        data: {
          approvalRecordId: record.id,
          itemId: item.id,
          itemType: item.type,
          escalationRequired: decision.escalationRequired,
          riskLevel: decision.riskAssessment.level
        },
        channels: ['in_app', 'email']
      });
    } catch (error) {
      console.error(`❌ Error sending escalation notification:`, error);
    }
  }

  /**
   * Load approval engine configuration
   */
  private async loadConfiguration(): Promise<void> {
    // Default configuration - should be loaded from system config in production
    this.config = {
      riskThresholds: {
        autoApprove: 30,        // Risk score threshold for auto-approval
        requireReview: 70,      // Risk score threshold for manual review
        escalateImmediately: 85 // Risk score threshold for immediate escalation
      },
      findingSeverityLimits: {
        maxCriticalFindings: 0,     // No critical findings allowed for auto-approval
        maxHighSeverityFindings: 2, // Max 2 high severity findings for auto-approval
        autoApproveThreshold: 5     // Max total findings for auto-approval
      },
      financialThresholds: {
        autoApproveLimit: 10000,           // $10K auto-approve limit
        manualReviewRequired: 50000,       // $50K manual review required
        executiveApprovalRequired: 100000  // $100K executive approval required
      },
      timeConstraints: {
        urgentApprovalTimeLimit: 4,    // 4 hours for urgent items
        standardProcessingTime: 24,    // 24 hours standard processing
        escalationTimeLimit: 72        // 72 hours before auto-escalation
      },
      defaultPolicies: {
        enableAutoApproval: true,
        enableEscalation: true,
        strictComplianceMode: false,
        auditTrailRequired: true
      }
    };

    try {
      // Load configuration from database if available
      const configs = await db.select().from(systemConfig).where(eq(systemConfig.configKey, 'approval_engine_config'));
      if (configs.length > 0) {
        const dbConfig = JSON.parse(configs[0].configValue);
        this.config = { ...this.config, ...dbConfig };
        console.log('🔧 Loaded approval engine configuration from database');
      }
    } catch (error) {
      console.warn('⚠️ Could not load configuration from database, using defaults:', error.message);
    }
  }

  /**
   * Update approval engine configuration
   */
  async updateConfiguration(newConfig: Partial<ApprovalEngineConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    try {
      // Save to database
      await db.insert(systemConfig).values({
        configKey: 'approval_engine_config',
        configValue: JSON.stringify(this.config),
        updatedBy: 'system'
      }).onConflictDoUpdate({
        target: systemConfig.configKey,
        set: {
          configValue: JSON.stringify(this.config),
          updatedAt: new Date()
        }
      });
      console.log('💾 Updated approval engine configuration');
    } catch (error) {
      console.error('❌ Error saving configuration:', error);
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  getConfiguration(): ApprovalEngineConfig {
    return { ...this.config };
  }
}

/**
 * Risk Analysis Engine - Evaluates risk levels for approval decisions
 */
class RiskAnalyzer {
  
  async assessRiskLevel(item: ApprovalItem): Promise<RiskAssessment> {
    console.log(`🔍 Analyzing risk for ${item.type} item ${item.id}`);
    
    const riskFactors = await this.calculateRiskFactors(item);
    const riskScore = this.calculateRiskScore(riskFactors);
    const riskLevel = this.determineRiskLevel(riskScore);
    
    return {
      level: riskLevel,
      score: riskScore,
      factors: riskFactors,
      mitigationSuggestions: await this.generateMitigationSuggestions(riskFactors),
      complianceImpact: this.assessComplianceImpact(item, riskScore),
      financialImpact: item.financialImpact || 0,
      reputationalRisk: this.assessReputationalRisk(item, riskScore)
    };
  }

  private async calculateRiskFactors(item: ApprovalItem): Promise<any[]> {
    const factors = [];

    // Base risk from item type
    factors.push({
      factor: 'item_type',
      weight: 0.2,
      value: this.getItemTypeRisk(item.type),
      description: `Risk associated with ${item.type} items`
    });

    // Financial impact factor
    if (item.financialImpact) {
      factors.push({
        factor: 'financial_impact',
        weight: 0.3,
        value: Math.min(100, (item.financialImpact / 100000) * 100), // Scale to 0-100
        description: `Financial impact of $${item.financialImpact.toLocaleString()}`
      });
    }

    // Regulatory implications
    if (item.regulatoryImplications) {
      factors.push({
        factor: 'regulatory_risk',
        weight: 0.25,
        value: 80,
        description: 'Item has regulatory implications'
      });
    }

    // Organizational context risk
    factors.push({
      factor: 'organizational_context',
      weight: 0.15,
      value: await this.assessOrganizationalRisk(item.organizationalContext),
      description: 'Risk based on organizational context and department'
    });

    // Stakeholder count factor
    if (item.stakeholders && item.stakeholders.length > 0) {
      factors.push({
        factor: 'stakeholder_impact',
        weight: 0.1,
        value: Math.min(100, item.stakeholders.length * 10),
        description: `Impact on ${item.stakeholders.length} stakeholders`
      });
    }

    return factors;
  }

  private calculateRiskScore(factors: any[]): number {
    const weightedScore = factors.reduce((total, factor) => {
      return total + (factor.value * factor.weight);
    }, 0);
    
    return Math.round(Math.min(100, Math.max(0, weightedScore)));
  }

  private determineRiskLevel(score: number): RiskLevel {
    if (score <= 25) return 'low';
    if (score <= 50) return 'medium';
    if (score <= 75) return 'high';
    return 'critical';
  }

  private getItemTypeRisk(type: string): number {
    const typeRisks = {
      'audit_test': 40,
      'audit_finding': 60,
      'risk_assessment': 70,
      'action_plan': 50,
      'compliance_test': 55
    };
    return typeRisks[type] || 50;
  }

  private async assessOrganizationalRisk(context: any): Promise<number> {
    // Higher risk for critical departments
    const departmentRisk = {
      'finance': 70,
      'legal': 80,
      'compliance': 75,
      'it_security': 85,
      'operations': 50,
      'hr': 45
    };
    
    return departmentRisk[context.department?.toLowerCase()] || 50;
  }

  private assessComplianceImpact(item: ApprovalItem, riskScore: number): any {
    if (item.regulatoryImplications || riskScore > 70) return 'significant';
    if (riskScore > 50) return 'moderate';
    if (riskScore > 25) return 'minor';
    return 'none';
  }

  private assessReputationalRisk(item: ApprovalItem, riskScore: number): RiskLevel {
    if (item.regulatoryImplications && riskScore > 70) return 'critical';
    if (riskScore > 75) return 'high';
    if (riskScore > 50) return 'medium';
    return 'low';
  }

  private async generateMitigationSuggestions(factors: any[]): Promise<string[]> {
    const suggestions = [];
    
    factors.forEach(factor => {
      if (factor.value > 70) {
        switch (factor.factor) {
          case 'financial_impact':
            suggestions.push('Consider additional financial controls and oversight');
            break;
          case 'regulatory_risk':
            suggestions.push('Ensure compliance team reviews all regulatory implications');
            break;
          case 'stakeholder_impact':
            suggestions.push('Implement comprehensive stakeholder communication plan');
            break;
          default:
            suggestions.push(`Monitor and mitigate ${factor.factor} risk factors`);
        }
      }
    });
    
    return suggestions;
  }
}

/**
 * Policy Compliance Engine - Checks items against organizational policies
 */
class PolicyComplianceEngine {
  
  async checkCompliance(item: ApprovalItem): Promise<PolicyComplianceResult> {
    console.log(`📋 Checking policy compliance for ${item.type} item ${item.id}`);
    
    // Get applicable policies for this item
    const applicablePolicies = await this.getApplicablePolicies(item);
    
    const violations = [];
    const warnings = [];
    let totalScore = 100;
    
    for (const policy of applicablePolicies) {
      const evaluation = await this.evaluatePolicy(item, policy);
      
      if (evaluation.violation) {
        violations.push(evaluation.violation);
        totalScore -= evaluation.impact;
      }
      
      if (evaluation.warning) {
        warnings.push(evaluation.warning);
        totalScore -= evaluation.impact / 2;
      }
    }
    
    return {
      isCompliant: violations.length === 0,
      violations,
      warnings,
      recommendedActions: await this.generateRecommendedActions(violations, warnings),
      complianceScore: Math.max(0, totalScore)
    };
  }

  private async getApplicablePolicies(item: ApprovalItem): Promise<any[]> {
    try {
      const policies = await db.select()
        .from(approvalPolicies)
        .where(
          and(
            eq(approvalPolicies.isActive, true),
            // Check if policy is currently effective
            lte(approvalPolicies.effectiveDate, new Date())
          )
        );

      // Filter policies applicable to this item
      return policies.filter(policy => {
        const conditions = policy.conditions as any;
        
        // Check item type applicability
        if (conditions.itemTypes && !conditions.itemTypes.includes(item.type)) {
          return false;
        }
        
        // Check department applicability
        if (policy.applicableDepartments?.length > 0 && 
            !policy.applicableDepartments.includes(item.organizationalContext.department)) {
          return false;
        }
        
        return true;
      });
    } catch (error) {
      console.error('❌ Error fetching applicable policies:', error);
      return [];
    }
  }

  private async evaluatePolicy(item: ApprovalItem, policy: any): Promise<any> {
    const conditions = policy.conditions as any;
    let violation = null;
    let warning = null;
    let impact = 0;

    // Evaluate financial limits
    if (conditions.maxFinancialImpact && item.financialImpact && 
        item.financialImpact > conditions.maxFinancialImpact) {
      violation = {
        policyId: policy.id,
        policyName: policy.policyName,
        violationType: 'critical' as const,
        description: `Financial impact $${item.financialImpact.toLocaleString()} exceeds policy limit of $${conditions.maxFinancialImpact.toLocaleString()}`,
        remediation: 'Reduce financial impact or obtain executive approval'
      };
      impact = 50;
    }

    // Evaluate risk level limits
    if (conditions.maxRiskLevel && this.compareRiskLevels(item.riskLevel, conditions.maxRiskLevel) > 0) {
      violation = {
        policyId: policy.id,
        policyName: policy.policyName,
        violationType: 'major' as const,
        description: `Risk level ${item.riskLevel} exceeds policy maximum of ${conditions.maxRiskLevel}`,
        remediation: 'Implement additional risk controls or seek approval'
      };
      impact = 30;
    }

    // Evaluate regulatory requirements
    if (conditions.requiresRegulatoryReview && item.regulatoryImplications && !conditions.regulatoryReviewCompleted) {
      warning = {
        policyId: policy.id,
        policyName: policy.policyName,
        warningType: 'recommendation' as const,
        description: 'Item has regulatory implications and may require compliance review',
        suggestion: 'Consider routing through compliance team for review'
      };
      impact = 10;
    }

    return { violation, warning, impact };
  }

  private compareRiskLevels(level1: string, level2: string): number {
    const levels = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
    return (levels[level1] || 0) - (levels[level2] || 0);
  }

  private async generateRecommendedActions(violations: any[], warnings: any[]): Promise<string[]> {
    const actions = [];
    
    if (violations.length > 0) {
      actions.push('Address all policy violations before proceeding');
      violations.forEach(violation => {
        actions.push(violation.remediation);
      });
    }
    
    if (warnings.length > 0) {
      warnings.forEach(warning => {
        actions.push(warning.suggestion);
      });
    }
    
    return actions;
  }
}

/**
 * Approval Rules Engine - Applies configurable rules for decision making
 */
class ApprovalRuleEngine {
  
  async evaluateApprovalRules(item: ApprovalItem, riskAssessment: RiskAssessment): Promise<any> {
    console.log(`⚙️ Evaluating approval rules for ${item.type} item ${item.id}`);
    
    // Get active rules applicable to this item
    const applicableRules = await this.getApplicableRules(item);
    
    let recommendedAction: ApprovalAction = 'require_review';
    let confidence = 50;
    let reasoning = 'Default manual review required';
    const appliedRules = [];

    // Sort rules by priority (lower number = higher priority)
    applicableRules.sort((a, b) => a.priority - b.priority);

    for (const rule of applicableRules) {
      const ruleResult = await this.evaluateRule(rule, item, riskAssessment);
      
      if (ruleResult.matches) {
        recommendedAction = rule.action as ApprovalAction;
        confidence = ruleResult.confidence;
        reasoning = `Rule '${rule.name}': ${ruleResult.reasoning}`;
        appliedRules.push(rule.name);
        
        // Stop at first matching rule (highest priority wins)
        break;
      }
    }

    return {
      recommendedAction,
      confidence,
      reasoning,
      appliedRules
    };
  }

  private async getApplicableRules(item: ApprovalItem): Promise<ApprovalRule[]> {
    try {
      const rules = await db.select()
        .from(approvalRules)
        .where(eq(approvalRules.isActive, true))
        .orderBy(approvalRules.priority);

      // Filter rules applicable to this item
      return rules.filter(rule => {
        return !rule.applicableContexts || 
               rule.applicableContexts.length === 0 || 
               rule.applicableContexts.includes(item.type);
      });
    } catch (error) {
      console.error('❌ Error fetching approval rules:', error);
      return [];
    }
  }

  private async evaluateRule(rule: ApprovalRule, item: ApprovalItem, riskAssessment: RiskAssessment): Promise<any> {
    const conditions = rule.conditions as any[];
    
    if (!conditions || conditions.length === 0) {
      return { matches: false, confidence: 0, reasoning: 'No conditions defined' };
    }

    let overallMatch = true;
    let confidence = 85;

    for (const condition of conditions) {
      const conditionMatch = this.evaluateCondition(condition, item, riskAssessment);
      
      if (condition.logicalOperator === 'or') {
        overallMatch = overallMatch || conditionMatch;
      } else {
        overallMatch = overallMatch && conditionMatch;
      }
      
      if (!conditionMatch && condition.logicalOperator !== 'or') {
        confidence -= 20;
      }
    }

    return {
      matches: overallMatch,
      confidence: Math.max(0, confidence),
      reasoning: overallMatch ? rule.description : `Conditions not met for rule: ${rule.name}`
    };
  }

  private evaluateCondition(condition: any, item: ApprovalItem, riskAssessment: RiskAssessment): boolean {
    const { field, operator, value } = condition;
    
    let fieldValue;
    
    // Extract field value from item or risk assessment
    switch (field) {
      case 'riskLevel':
        fieldValue = riskAssessment.level;
        break;
      case 'riskScore':
        fieldValue = riskAssessment.score;
        break;
      case 'financialImpact':
        fieldValue = item.financialImpact || 0;
        break;
      case 'itemType':
        fieldValue = item.type;
        break;
      case 'department':
        fieldValue = item.organizationalContext.department;
        break;
      case 'regulatoryImplications':
        fieldValue = item.regulatoryImplications;
        break;
      default:
        return false;
    }

    // Evaluate condition based on operator
    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
      case 'not_contains':
        return !String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
      default:
        return false;
    }
  }
}

// Export singleton instance
export const approvalEngine = new ApprovalEngine();