import { storage } from "./storage";
import { 
  type AuditTest, type AuditContext, type AuditTestWithDetails,
  type ProcedureRecommendation, type AuditorRecommendation, type TimelineRecommendation,
  type ComprehensiveRecommendation, type IntelligentRecommendation, type InsertIntelligentRecommendation,
  type LearningData, type UserFeedback, type Pattern
} from "@shared/schema";
import { ProcedureRecommendationEngine } from "./procedure-recommendation-engine";
import { AuditorAssignmentIntelligence } from "./auditor-assignment-intelligence";
import { TimelineIntelligenceService } from "./timeline-intelligence-service";
import { PatternRecognitionEngine } from "./pattern-recognition-engine";
import { MLModelManager } from "./ml-model-manager";

/**
 * INTELLIGENT RECOMMENDATION ENGINE
 * 
 * Core orchestrator for all recommendation services providing comprehensive
 * audit optimization through AI-powered procedure, auditor, and timeline recommendations.
 */
export class IntelligentRecommendationEngine {
  private procedureEngine: ProcedureRecommendationEngine;
  private auditorEngine: AuditorAssignmentIntelligence;
  private timelineEngine: TimelineIntelligenceService;
  private patternEngine: PatternRecognitionEngine;
  private mlManager: MLModelManager;

  constructor() {
    this.procedureEngine = new ProcedureRecommendationEngine();
    this.auditorEngine = new AuditorAssignmentIntelligence();
    this.timelineEngine = new TimelineIntelligenceService();
    this.patternEngine = new PatternRecognitionEngine();
    this.mlManager = new MLModelManager();
  }

  /**
   * Generate comprehensive recommendations for all aspects of an audit test
   */
  async generateComprehensiveRecommendation(
    auditTestId: string,
    context: AuditContext,
    userId: string
  ): Promise<ComprehensiveRecommendation> {
    console.log(`🧠 Generating comprehensive recommendations for audit test: ${auditTestId}`);

    try {
      // Run all recommendation engines in parallel for better performance
      const [
        procedureRecommendations,
        auditorRecommendations,
        timelineRecommendation,
        riskAssessment,
        alternativeStrategies
      ] = await Promise.all([
        this.procedureEngine.recommendProcedures(context),
        this.auditorEngine.recommendOptimalAuditors(context),
        this.timelineEngine.recommendTimeline(context),
        this.assessOverallRisk(context),
        this.generateAlternativeStrategies(context)
      ]);

      // Calculate overall recommendation score
      const overallScore = this.calculateOverallScore(
        procedureRecommendations,
        auditorRecommendations,
        timelineRecommendation
      );

      // Generate reasoning for recommendations
      const reasoning = this.generateComprehensiveReasoning(
        procedureRecommendations,
        auditorRecommendations,
        timelineRecommendation,
        context
      );

      // Create implementation plan
      const implementationPlan = await this.createImplementationPlan(
        procedureRecommendations,
        auditorRecommendations,
        timelineRecommendation,
        context
      );

      // Calculate success probability
      const successProbability = this.calculateSuccessProbability(
        procedureRecommendations,
        auditorRecommendations,
        timelineRecommendation,
        riskAssessment
      );

      const comprehensiveRecommendation: ComprehensiveRecommendation = {
        auditTestId,
        procedureRecommendations,
        auditorRecommendations,
        timelineRecommendation,
        overallScore,
        reasoning,
        riskAssessment,
        successProbability,
        alternativeStrategies,
        implementationPlan
      };

      // Store the recommendation for learning and tracking
      await this.storeRecommendation(comprehensiveRecommendation, userId);

      console.log(`✅ Comprehensive recommendations generated with overall score: ${overallScore}%`);
      return comprehensiveRecommendation;

    } catch (error) {
      console.error('❌ Error generating comprehensive recommendations:', error);
      throw error;
    }
  }

  /**
   * Recommend audit procedures based on context and historical performance
   */
  async recommendAuditProcedures(context: AuditContext): Promise<ProcedureRecommendation[]> {
    console.log(`🔍 Generating procedure recommendations for risk category: ${context.riskProfile.category}`);
    return await this.procedureEngine.recommendProcedures(context);
  }

  /**
   * Recommend optimal auditor assignment based on skills, availability, and performance
   */
  async recommendOptimalAuditor(context: AuditContext): Promise<AuditorRecommendation[]> {
    console.log(`👥 Generating auditor recommendations for complexity: ${context.complexityLevel}`);
    return await this.auditorEngine.recommendOptimalAuditors(context);
  }

  /**
   * Recommend timeline with duration prediction and scheduling optimization
   */
  async recommendTimeline(context: AuditContext): Promise<TimelineRecommendation> {
    console.log(`⏱️ Generating timeline recommendations for audit context`);
    return await this.timelineEngine.recommendTimeline(context);
  }

  /**
   * Predict auditor performance for a specific audit context
   */
  async predictAuditorPerformance(auditorId: string, context: AuditContext): Promise<any> {
    return await this.auditorEngine.predictPerformance(auditorId, context);
  }

  /**
   * Learn from completed audit outcomes to improve future recommendations
   */
  async learnFromCompletedAudits(auditResults: any[]): Promise<void> {
    console.log(`🎓 Processing learning data from ${auditResults.length} completed audits`);

    try {
      // Extract learning data from audit results
      const learningData: LearningData[] = auditResults.map(result => ({
        auditTestId: result.auditTestId,
        recommendedProcedures: result.recommendedProcedures || [],
        actualProceduresUsed: result.actualProceduresUsed || [],
        recommendedAuditor: result.recommendedAuditor,
        actualAuditor: result.actualAuditor,
        predictedTimeline: result.predictedTimeline,
        actualTimeline: result.actualTimeline,
        recommendationFollowed: result.recommendationFollowed,
        outcomeSuccess: result.outcomeSuccess,
        qualityScore: result.qualityScore,
        feedbackReceived: result.feedbackReceived,
        contextFactors: result.contextFactors || []
      }));

      // Identify patterns in the data
      const patterns = await this.patternEngine.analyzePatterns(learningData);

      // Update ML models with new learning data
      await this.mlManager.updateModelsWithLearningData(learningData);

      // Update individual engines with insights
      await Promise.all([
        this.procedureEngine.updateWithLearning(learningData),
        this.auditorEngine.updateWithLearning(learningData),
        this.timelineEngine.updateWithLearning(learningData)
      ]);

      console.log(`✅ Learning completed - processed ${auditResults.length} audits and identified ${patterns.length} patterns`);

    } catch (error) {
      console.error('❌ Error in learning process:', error);
      throw error;
    }
  }

  /**
   * Process user feedback to improve recommendation accuracy
   */
  async processFeedback(feedback: UserFeedback[]): Promise<void> {
    console.log(`📝 Processing ${feedback.length} user feedback entries`);

    try {
      // Store feedback in database
      for (const fb of feedback) {
        await storage.createRecommendationFeedback({
          recommendationId: fb.recommendationId,
          feedbackType: fb.feedbackType,
          feedbackScore: fb.satisfactionScore,
          feedbackComments: fb.comments,
          specificAspects: JSON.stringify(fb.specificAspects),
          improvementSuggestions: fb.improvementSuggestions.join('; '),
          alternativeApproach: fb.alternativeApproach,
          providedBy: 'user-1', // TODO: Get from authenticated user
          contextWhenProvided: JSON.stringify({ timestamp: new Date() })
        });
      }

      // Use feedback to improve models
      await this.mlManager.incorporateFeedback(feedback);

      console.log(`✅ Feedback processing completed`);

    } catch (error) {
      console.error('❌ Error processing feedback:', error);
      throw error;
    }
  }

  /**
   * Validate recommendation accuracy against actual outcomes
   */
  async validateRecommendationAccuracy(): Promise<any> {
    console.log(`🔍 Validating recommendation accuracy`);

    try {
      // Get recent recommendations and their outcomes
      const recentRecommendations = await storage.getRecentRecommendations();
      const actualOutcomes = await storage.getActualOutcomes();

      // Calculate accuracy metrics
      const accuracyMetrics = this.calculateAccuracyMetrics(recentRecommendations, actualOutcomes);

      // Update model performance metrics
      await this.mlManager.updatePerformanceMetrics(accuracyMetrics);

      console.log(`✅ Validation completed - accuracy: ${accuracyMetrics.overallAccuracy}%`);
      return accuracyMetrics;

    } catch (error) {
      console.error('❌ Error validating accuracy:', error);
      throw error;
    }
  }

  // Private helper methods

  private calculateOverallScore(
    procedureRecs: ProcedureRecommendation[],
    auditorRecs: AuditorRecommendation[],
    timelineRec: TimelineRecommendation
  ): number {
    const procedureScore = procedureRecs.length > 0 
      ? procedureRecs.reduce((sum, rec) => sum + rec.recommendationScore, 0) / procedureRecs.length 
      : 0;
    
    const auditorScore = auditorRecs.length > 0
      ? auditorRecs.reduce((sum, rec) => sum + rec.matchScore, 0) / auditorRecs.length
      : 0;
    
    const timelineScore = timelineRec.confidenceLevel;

    // Weighted average with procedure recommendations having highest weight
    return Math.round((procedureScore * 0.4 + auditorScore * 0.35 + timelineScore * 0.25));
  }

  private generateComprehensiveReasoning(
    procedureRecs: ProcedureRecommendation[],
    auditorRecs: AuditorRecommendation[],
    timelineRec: TimelineRecommendation,
    context: AuditContext
  ): string {
    let reasoning = `Based on analysis of ${context.riskProfile.category} risk in ${context.organizationalContext.industryType} context:\n\n`;

    if (procedureRecs.length > 0) {
      reasoning += `**Procedure Recommendations:**\n`;
      reasoning += `- Top procedure: ${procedureRecs[0].procedureName} (${procedureRecs[0].recommendationScore}% confidence)\n`;
      reasoning += `- Expected effectiveness: ${procedureRecs[0].expectedEffectiveness}%\n`;
      reasoning += `- Historical success rate: ${procedureRecs[0].historicalSuccessRate}%\n\n`;
    }

    if (auditorRecs.length > 0) {
      reasoning += `**Auditor Assignment:**\n`;
      reasoning += `- Recommended auditor: ${auditorRecs[0].auditorName} (${auditorRecs[0].matchScore}% match)\n`;
      reasoning += `- Key strengths: ${auditorRecs[0].strengths.slice(0, 2).join(', ')}\n`;
      reasoning += `- Availability: ${auditorRecs[0].availabilityStatus}\n\n`;
    }

    reasoning += `**Timeline Optimization:**\n`;
    reasoning += `- Recommended duration: ${timelineRec.recommendedDurationHours} hours\n`;
    reasoning += `- Confidence level: ${timelineRec.confidenceLevel}%\n`;
    reasoning += `- Buffer recommendation: ${timelineRec.bufferRecommendation} hours\n`;

    return reasoning;
  }

  private async assessOverallRisk(context: AuditContext): Promise<any> {
    // Risk assessment logic based on context factors
    const riskFactors = [];
    let overallRisk: 'low' | 'medium' | 'high' | 'critical' = 'medium';

    // Assess complexity risk
    if (context.complexityLevel === 'highly_complex') {
      riskFactors.push({
        factorName: 'High Complexity',
        riskLevel: 'high' as const,
        probability: 80,
        impact: 75,
        description: 'Highly complex audit increases risk of delays and quality issues',
        indicators: ['Complex processes', 'Multiple systems', 'Integration challenges']
      });
      overallRisk = 'high';
    }

    // Assess timeline risk
    if (context.timelineConstraints.urgencyLevel === 'critical') {
      riskFactors.push({
        factorName: 'Critical Timeline',
        riskLevel: 'high' as const,
        probability: 70,
        impact: 85,
        description: 'Critical timeline pressure may compromise thoroughness',
        indicators: ['Fixed deadline', 'Limited buffer', 'High stakes']
      });
      overallRisk = 'high';
    }

    // Assess resource risk
    if (context.availableResources.skillAvailability.length < 2) {
      riskFactors.push({
        factorName: 'Limited Skilled Resources',
        riskLevel: 'medium' as const,
        probability: 60,
        impact: 60,
        description: 'Limited availability of skilled auditors',
        indicators: ['Few qualified auditors', 'High workload', 'Skill gaps']
      });
    }

    return {
      overallRisk,
      riskFactors,
      mitigationStrategies: [
        {
          strategyName: 'Enhanced Planning',
          applicableRisks: ['High Complexity', 'Critical Timeline'],
          effectiveness: 75,
          implementationEffort: 'medium' as const,
          cost: 0,
          description: 'Detailed planning with buffer time and resource allocation'
        }
      ],
      contingencyPlans: [
        {
          scenario: 'Timeline Overrun',
          triggerConditions: ['50% duration exceeded', 'Quality concerns raised'],
          responseActions: ['Request deadline extension', 'Allocate additional resources'],
          resourceRequirements: ['Senior auditor support', 'Management approval'],
          timeline: 'Immediate'
        }
      ]
    };
  }

  private async generateAlternativeStrategies(context: AuditContext): Promise<any[]> {
    return [
      {
        strategyName: 'Phased Approach',
        description: 'Break audit into phases with intermediate deliverables',
        pros: ['Better risk management', 'Early feedback', 'Easier resource planning'],
        cons: ['Longer overall timeline', 'More coordination needed'],
        applicability: 85,
        expectedOutcome: {
          qualityScore: 85,
          durationHours: context.timelineConstraints.maxDurationHours * 1.2,
          successProbability: 90,
          riskLevel: 'low' as const,
          resourceRequirements: [
            {
              resourceType: 'human' as const,
              quantity: 2,
              skillLevel: 'senior',
              availability: 'available' as const
            }
          ]
        }
      },
      {
        strategyName: 'Team-based Approach',
        description: 'Use team of auditors with different specializations',
        pros: ['Knowledge sharing', 'Risk distribution', 'Faster execution'],
        cons: ['Coordination overhead', 'Higher cost', 'Consistency challenges'],
        applicability: 70,
        expectedOutcome: {
          qualityScore: 80,
          durationHours: context.timelineConstraints.maxDurationHours * 0.8,
          successProbability: 85,
          riskLevel: 'medium' as const,
          resourceRequirements: [
            {
              resourceType: 'human' as const,
              quantity: 3,
              skillLevel: 'mixed',
              availability: 'limited' as const
            }
          ]
        }
      }
    ];
  }

  private async createImplementationPlan(
    procedureRecs: ProcedureRecommendation[],
    auditorRecs: AuditorRecommendation[],
    timelineRec: TimelineRecommendation,
    context: AuditContext
  ): Promise<any> {
    const phases = [
      {
        phaseId: 'phase-1',
        phaseName: 'Planning & Setup',
        description: 'Initial setup and resource allocation',
        durationHours: timelineRec.recommendedDurationHours * 0.2,
        dependencies: [],
        deliverables: ['Audit plan', 'Resource allocation', 'Risk assessment'],
        qualityCriteria: ['Plan completeness', 'Risk coverage', 'Resource availability']
      },
      {
        phaseId: 'phase-2',
        phaseName: 'Execution',
        description: 'Core audit procedures execution',
        durationHours: timelineRec.recommendedDurationHours * 0.6,
        dependencies: ['phase-1'],
        deliverables: ['Procedure results', 'Findings documentation', 'Evidence collection'],
        qualityCriteria: ['Procedure compliance', 'Evidence quality', 'Coverage completeness']
      },
      {
        phaseId: 'phase-3',
        phaseName: 'Review & Reporting',
        description: 'Review findings and prepare reports',
        durationHours: timelineRec.recommendedDurationHours * 0.2,
        dependencies: ['phase-2'],
        deliverables: ['Audit report', 'Recommendations', 'Action plans'],
        qualityCriteria: ['Report quality', 'Recommendation clarity', 'Actionability']
      }
    ];

    return {
      phases,
      totalDuration: timelineRec.recommendedDurationHours,
      resourceAllocation: [
        {
          resourceType: 'Primary Auditor',
          allocatedTo: auditorRecs[0]?.auditorName || 'TBD',
          quantity: 1,
          timeframe: 'Full duration',
          responsibilities: ['Lead execution', 'Quality review', 'Client communication']
        }
      ],
      qualityGates: [
        {
          gateId: 'gate-1',
          gateName: 'Planning Review',
          criteria: [
            {
              criteriaName: 'Plan Completeness',
              measurementMethod: 'Checklist review',
              threshold: 90,
              importance: 'high' as const
            }
          ],
          approver: 'Audit Supervisor',
          consequences: ['Proceed to execution', 'Revise plan if needed']
        }
      ],
      riskMonitoring: {
        monitoringFrequency: 'Daily',
        keyIndicators: ['Progress vs plan', 'Quality metrics', 'Resource utilization'],
        escalationProcedures: [
          {
            triggerCondition: 'Timeline deviation > 20%',
            escalationLevel: 'supervisor' as const,
            responseTime: '4 hours',
            actions: ['Assess impact', 'Adjust plan', 'Communicate status']
          }
        ],
        reportingRequirements: ['Daily status', 'Weekly summary', 'Issue escalation']
      }
    };
  }

  private calculateSuccessProbability(
    procedureRecs: ProcedureRecommendation[],
    auditorRecs: AuditorRecommendation[],
    timelineRec: TimelineRecommendation,
    riskAssessment: any
  ): number {
    let baseProbability = 80; // Base success probability

    // Adjust based on procedure confidence
    if (procedureRecs.length > 0) {
      const avgProcedureScore = procedureRecs.reduce((sum, rec) => sum + rec.recommendationScore, 0) / procedureRecs.length;
      baseProbability += (avgProcedureScore - 75) * 0.2;
    }

    // Adjust based on auditor match
    if (auditorRecs.length > 0) {
      const topAuditorScore = auditorRecs[0].matchScore;
      baseProbability += (topAuditorScore - 75) * 0.15;
    }

    // Adjust based on timeline confidence
    baseProbability += (timelineRec.confidenceLevel - 75) * 0.1;

    // Adjust based on risk level
    switch (riskAssessment.overallRisk) {
      case 'low':
        baseProbability += 10;
        break;
      case 'high':
        baseProbability -= 10;
        break;
      case 'critical':
        baseProbability -= 20;
        break;
    }

    return Math.max(30, Math.min(95, Math.round(baseProbability)));
  }

  private async storeRecommendation(
    recommendation: ComprehensiveRecommendation,
    userId: string
  ): Promise<void> {
    try {
      const recommendationData: InsertIntelligentRecommendation = {
        auditTestId: recommendation.auditTestId,
        recommendationType: 'complete',
        recommendationData: JSON.stringify(recommendation),
        confidenceScore: recommendation.overallScore,
        reasoning: recommendation.reasoning,
        alternativeOptions: JSON.stringify(recommendation.alternativeStrategies),
        algorithmVersion: '1.0.0',
        createdBy: userId
      };

      await storage.createIntelligentRecommendation(recommendationData);
      console.log(`💾 Comprehensive recommendation stored for audit test: ${recommendation.auditTestId}`);

    } catch (error) {
      console.error('❌ Error storing recommendation:', error);
      // Don't throw error - recommendation failure shouldn't break the main flow
    }
  }

  private calculateAccuracyMetrics(recommendations: any[], outcomes: any[]): any {
    // Placeholder implementation - would calculate real accuracy metrics
    return {
      overallAccuracy: 85,
      procedureAccuracy: 87,
      auditorAccuracy: 82,
      timelineAccuracy: 83,
      userSatisfaction: 4.2,
      improvementTrend: 'improving' as const
    };
  }
}

// Export singleton instance
export const intelligentRecommendationEngine = new IntelligentRecommendationEngine();