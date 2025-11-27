/**
 * Comprehensive End-to-End Approval Workflow Testing
 * Tests all critical approval scenarios to verify production readiness
 */

import { ApprovalEngine } from "./approval-engine";
import type { ApprovalItem } from "@shared/schema";

export class ApprovalWorkflowTester {
  private approvalEngine: ApprovalEngine;

  constructor() {
    this.approvalEngine = new ApprovalEngine();
  }

  /**
   * Run comprehensive end-to-end approval workflow verification
   */
  async runCompleteVerification(): Promise<void> {
    console.log('🔍 Starting Comprehensive Approval Workflow Verification...\n');

    const results = {
      passed: 0,
      failed: 0,
      tests: []
    };

    try {
      // Test 1: Low-risk auto-approval
      console.log('📋 TEST 1: Low-Risk Auto-Approval');
      await this.testLowRiskAutoApproval(results);

      // Test 2: High-risk escalation
      console.log('\n📋 TEST 2: High-Risk Escalation');
      await this.testHighRiskEscalation(results);

      // Test 3: Policy violation escalation
      console.log('\n📋 TEST 3: Policy Violation Escalation');
      await this.testPolicyViolationEscalation(results);

      // Test 4: Financial threshold escalation
      console.log('\n📋 TEST 4: Financial Threshold Escalation');
      await this.testFinancialThresholdEscalation(results);

      // Test 5: Error handling (no crashes)
      console.log('\n📋 TEST 5: Error Handling Verification');
      await this.testErrorHandling(results);

      // Test 6: Critical finding escalation
      console.log('\n📋 TEST 6: Critical Finding Escalation');
      await this.testCriticalFindingEscalation(results);

      // Print final results
      this.printFinalResults(results);

    } catch (error) {
      console.error('❌ CRITICAL: Approval workflow verification failed:', error);
      throw error;
    }
  }

  private async testLowRiskAutoApproval(results: any): Promise<void> {
    const testItem: ApprovalItem = {
      id: "test-low-risk-001",
      type: "audit_test",
      riskLevel: "low",
      content: {
        testName: "Basic Internal Controls Check",
        procedures: ["Review documentation", "Test sample transactions"]
      },
      submittedBy: "user-2",
      submittedAt: new Date(),
      organizationalContext: {
        department: "audit",
        division: "internal-audit"
      },
      financialImpact: 5000, // Below threshold
      regulatoryImplications: false,
      stakeholders: ["audit-team"]
    };

    try {
      const decision = await this.approvalEngine.evaluateForApproval(testItem);
      
      const success = decision.decision === 'auto_approve' && 
                     decision.confidence >= 80 && 
                     !decision.escalationRequired;
      
      if (success) {
        console.log('✅ PASS: Low-risk item auto-approved successfully');
        console.log(`   Decision: ${decision.decision}, Confidence: ${decision.confidence}%`);
        console.log(`   Risk Level: ${decision.riskAssessment.level}, Score: ${decision.riskAssessment.score}`);
        results.passed++;
      } else {
        console.log('❌ FAIL: Low-risk item not auto-approved');
        console.log(`   Expected: auto_approve, Got: ${decision.decision}`);
        results.failed++;
      }
      
      results.tests.push({
        name: 'Low-Risk Auto-Approval',
        status: success ? 'PASS' : 'FAIL',
        decision: decision.decision,
        confidence: decision.confidence
      });

    } catch (error) {
      console.log('❌ FAIL: Error in low-risk approval test:', error.message);
      results.failed++;
      results.tests.push({
        name: 'Low-Risk Auto-Approval',
        status: 'FAIL',
        error: error.message
      });
    }
  }

  private async testHighRiskEscalation(results: any): Promise<void> {
    const testItem: ApprovalItem = {
      id: "test-high-risk-002",
      type: "audit_finding",
      riskLevel: "high",
      content: {
        findingTitle: "Significant Control Weakness",
        severity: "high",
        impact: "Material financial statement misstatement risk"
      },
      submittedBy: "user-2",
      submittedAt: new Date(),
      organizationalContext: {
        department: "audit",
        division: "financial-audit"
      },
      financialImpact: 75000, // Above threshold
      regulatoryImplications: true,
      stakeholders: ["audit-team", "management"]
    };

    try {
      const decision = await this.approvalEngine.evaluateForApproval(testItem);
      
      const success = decision.decision === 'escalate' && 
                     decision.escalationRequired &&
                     decision.confidence >= 80;
      
      if (success) {
        console.log('✅ PASS: High-risk item escalated successfully');
        console.log(`   Decision: ${decision.decision}, Escalation Required: ${decision.escalationRequired}`);
        console.log(`   Risk Level: ${decision.riskAssessment.level}, Score: ${decision.riskAssessment.score}`);
        results.passed++;
      } else {
        console.log('❌ FAIL: High-risk item not properly escalated');
        console.log(`   Expected: escalate + escalationRequired, Got: ${decision.decision}`);
        results.failed++;
      }
      
      results.tests.push({
        name: 'High-Risk Escalation',
        status: success ? 'PASS' : 'FAIL',
        decision: decision.decision,
        escalationRequired: decision.escalationRequired
      });

    } catch (error) {
      console.log('❌ FAIL: Error in high-risk escalation test:', error.message);
      results.failed++;
      results.tests.push({
        name: 'High-Risk Escalation',
        status: 'FAIL',
        error: error.message
      });
    }
  }

  private async testPolicyViolationEscalation(results: any): Promise<void> {
    const testItem: ApprovalItem = {
      id: "test-policy-violation-003",
      type: "audit_test",
      riskLevel: "medium",
      content: {
        testName: "Non-compliant Testing Procedure",
        violations: ["Missing required documentation", "Inadequate sample size"]
      },
      submittedBy: "user-2",
      submittedAt: new Date(),
      organizationalContext: {
        department: "audit",
        division: "compliance-audit"
      },
      financialImpact: 25000,
      regulatoryImplications: true,
      stakeholders: ["audit-team", "compliance"]
    };

    try {
      const decision = await this.approvalEngine.evaluateForApproval(testItem);
      
      // Should escalate due to regulatory implications and medium risk
      const success = decision.decision !== 'auto_approve';
      
      if (success) {
        console.log('✅ PASS: Policy violation item handled appropriately');
        console.log(`   Decision: ${decision.decision}`);
        console.log(`   Policy Violations: ${decision.policyViolations.length}`);
        results.passed++;
      } else {
        console.log('❌ FAIL: Policy violation item incorrectly auto-approved');
        results.failed++;
      }
      
      results.tests.push({
        name: 'Policy Violation Escalation',
        status: success ? 'PASS' : 'FAIL',
        decision: decision.decision,
        policyViolations: decision.policyViolations.length
      });

    } catch (error) {
      console.log('❌ FAIL: Error in policy violation test:', error.message);
      results.failed++;
      results.tests.push({
        name: 'Policy Violation Escalation',
        status: 'FAIL',
        error: error.message
      });
    }
  }

  private async testFinancialThresholdEscalation(results: any): Promise<void> {
    const testItem: ApprovalItem = {
      id: "test-financial-004",
      type: "remediation_plan",
      riskLevel: "medium",
      content: {
        planTitle: "Major System Remediation",
        estimatedCost: 150000
      },
      submittedBy: "user-3",
      submittedAt: new Date(),
      organizationalContext: {
        department: "risk",
        division: "operational-risk"
      },
      financialImpact: 150000, // Above executive threshold
      regulatoryImplications: false,
      stakeholders: ["risk-team", "management", "executives"]
    };

    try {
      const decision = await this.approvalEngine.evaluateForApproval(testItem);
      
      // Should escalate due to high financial impact
      const success = decision.decision === 'escalate' && decision.escalationRequired;
      
      if (success) {
        console.log('✅ PASS: Financial threshold escalation working');
        console.log(`   Decision: ${decision.decision} (${decision.reasoning})`);
        console.log(`   Financial Impact: $${testItem.financialImpact?.toLocaleString()}`);
        results.passed++;
      } else {
        console.log('❌ FAIL: Financial threshold not properly escalated');
        console.log(`   Expected: escalate, Got: ${decision.decision}`);
        results.failed++;
      }
      
      results.tests.push({
        name: 'Financial Threshold Escalation',
        status: success ? 'PASS' : 'FAIL',
        decision: decision.decision,
        financialImpact: testItem.financialImpact
      });

    } catch (error) {
      console.log('❌ FAIL: Error in financial threshold test:', error.message);
      results.failed++;
      results.tests.push({
        name: 'Financial Threshold Escalation',
        status: 'FAIL',
        error: error.message
      });
    }
  }

  private async testErrorHandling(results: any): Promise<void> {
    const malformedItem: any = {
      id: "test-error-005",
      type: "invalid_type", // This will cause an error
      riskLevel: "unknown",
      content: null,
      submittedBy: null,
      submittedAt: "invalid-date",
      organizationalContext: {},
      financialImpact: "not-a-number"
    };

    try {
      const decision = await this.approvalEngine.evaluateForApproval(malformedItem as ApprovalItem);
      
      // Should handle error gracefully and default to require_review
      const success = decision.decision === 'require_review' && 
                     decision.confidence === 0 &&
                     decision.reasoning.includes('System error');
      
      if (success) {
        console.log('✅ PASS: Error handling works - no crashes, safe fallback');
        console.log(`   Decision: ${decision.decision} (confidence: ${decision.confidence}%)`);
        console.log(`   Reasoning: ${decision.reasoning.substring(0, 100)}...`);
        results.passed++;
      } else {
        console.log('❌ FAIL: Error handling not working as expected');
        results.failed++;
      }
      
      results.tests.push({
        name: 'Error Handling Verification',
        status: success ? 'PASS' : 'FAIL',
        decision: decision.decision,
        confidence: decision.confidence
      });

    } catch (error) {
      console.log('❌ CRITICAL FAIL: Approval engine crashed on error:', error.message);
      results.failed++;
      results.tests.push({
        name: 'Error Handling Verification',
        status: 'CRITICAL FAIL',
        error: 'Engine crashed instead of handling error gracefully'
      });
    }
  }

  private async testCriticalFindingEscalation(results: any): Promise<void> {
    const testItem: ApprovalItem = {
      id: "test-critical-006",
      type: "audit_finding",
      riskLevel: "critical",
      content: {
        findingTitle: "Critical Control Failure",
        severity: "critical",
        impact: "Immediate regulatory violation risk"
      },
      submittedBy: "user-2",
      submittedAt: new Date(),
      organizationalContext: {
        department: "audit",
        division: "regulatory-audit"
      },
      financialImpact: 500000,
      regulatoryImplications: true,
      stakeholders: ["audit-team", "management", "executives", "board"]
    };

    try {
      const decision = await this.approvalEngine.evaluateForApproval(testItem);
      
      // Critical findings should escalate immediately
      const success = decision.decision === 'escalate' && 
                     decision.escalationRequired &&
                     decision.riskAssessment.level === 'critical';
      
      if (success) {
        console.log('✅ PASS: Critical finding escalated immediately');
        console.log(`   Decision: ${decision.decision}, Risk Level: ${decision.riskAssessment.level}`);
        console.log(`   Confidence: ${decision.confidence}%`);
        results.passed++;
      } else {
        console.log('❌ FAIL: Critical finding not escalated appropriately');
        results.failed++;
      }
      
      results.tests.push({
        name: 'Critical Finding Escalation',
        status: success ? 'PASS' : 'FAIL',
        decision: decision.decision,
        riskLevel: decision.riskAssessment.level
      });

    } catch (error) {
      console.log('❌ FAIL: Error in critical finding test:', error.message);
      results.failed++;
      results.tests.push({
        name: 'Critical Finding Escalation',
        status: 'FAIL',
        error: error.message
      });
    }
  }

  private printFinalResults(results: any): void {
    console.log('\n' + '='.repeat(70));
    console.log('🎯 APPROVAL WORKFLOW VERIFICATION RESULTS');
    console.log('='.repeat(70));
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   ✅ Passed: ${results.passed}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

    console.log(`\n📋 DETAILED RESULTS:`);
    results.tests.forEach((test: any, index: number) => {
      const status = test.status === 'PASS' ? '✅' : '❌';
      console.log(`   ${index + 1}. ${status} ${test.name}: ${test.status}`);
      if (test.decision) console.log(`      → Decision: ${test.decision}`);
      if (test.confidence) console.log(`      → Confidence: ${test.confidence}%`);
      if (test.error) console.log(`      → Error: ${test.error}`);
    });

    console.log('\n' + '='.repeat(70));
    
    if (results.failed === 0) {
      console.log('🎉 ALL TESTS PASSED! Approval workflow is production ready! 🎉');
    } else {
      console.log('⚠️  Some tests failed. Please review and fix issues before production.');
    }
    
    console.log('='.repeat(70));
  }
}

/**
 * Execute comprehensive approval workflow testing if this file is run directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ApprovalWorkflowTester();
  tester.runCompleteVerification()
    .then(() => {
      console.log('\n🎯 Approval workflow verification completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Approval workflow verification failed:', error);
      process.exit(1);
    });
}

export const approvalWorkflowTester = new ApprovalWorkflowTester();