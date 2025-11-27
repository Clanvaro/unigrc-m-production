import { storage } from "./storage";
import { 
  type AuditContext, type TimelineRecommendation, type DurationFactor,
  type TimelineMilestone, type ContingencyOption, type SchedulingStrategy,
  type OptimizationOpportunity, type LearningData, type TimelinePerformanceAnalysis,
  type InsertTimelinePerformanceAnalysis, type OptimalTimelinePattern
} from "@shared/schema";

/**
 * TIMELINE INTELLIGENCE SERVICE
 * 
 * Analyzes historical timeline data to provide intelligent duration predictions,
 * scheduling optimization, and timeline risk assessment.
 */
export class TimelineIntelligenceService {
  private readonly CONFIDENCE_THRESHOLD = 70;
  private readonly BUFFER_PERCENTAGE = 0.15; // 15% default buffer
  private readonly LEARNING_WEIGHT = 0.4; // How much to weight recent data

  /**
   * Recommend optimal timeline for audit context
   */
  async recommendTimeline(context: AuditContext): Promise<TimelineRecommendation> {
    console.log(`⏱️ Analyzing timeline for ${context.complexityLevel} complexity audit`);

    try {
      // Get historical timeline data for similar contexts
      const historicalData = await this.getHistoricalTimelineData(context);
      const timelinePatterns = await this.getOptimalTimelinePatterns(context);

      // Calculate base duration
      const baseDuration = await this.calculateBaseDuration(context, historicalData, timelinePatterns);
      
      // Analyze duration factors
      const durationFactors = this.analyzeDurationFactors(context, historicalData);
      
      // Apply factor adjustments
      const adjustedDuration = this.applyFactorAdjustments(baseDuration, durationFactors);
      
      // Calculate risk adjustment
      const riskAdjustment = this.calculateRiskAdjustment(context, historicalData);
      
      // Determine buffer recommendation
      const bufferRecommendation = this.calculateBufferRecommendation(context, riskAdjustment);
      
      // Calculate final duration
      const recommendedDurationHours = Math.round((adjustedDuration + riskAdjustment) * 10) / 10;
      
      // Generate milestones
      const milestones = await this.generateTimelineMilestones(recommendedDurationHours, context);
      
      // Create contingency plans
      const contingencyPlan = this.createContingencyPlans(context, historicalData);
      
      // Generate scheduling strategy
      const schedulingStrategy = await this.generateSchedulingStrategy(context, recommendedDurationHours);
      
      // Identify optimization opportunities
      const optimizationOpportunities = this.identifyOptimizationOpportunities(context, historicalData);
      
      // Calculate confidence level
      const confidenceLevel = this.calculateConfidenceLevel(historicalData.length, durationFactors);

      const recommendation: TimelineRecommendation = {
        recommendedDurationHours,
        confidenceLevel,
        factors: durationFactors,
        riskAdjustment,
        bufferRecommendation,
        milestones,
        contingencyPlan,
        schedulingStrategy,
        optimizationOpportunities
      };

      console.log(`✅ Timeline recommendation: ${recommendedDurationHours} hours (${confidenceLevel}% confidence)`);
      return recommendation;

    } catch (error) {
      console.error('❌ Error generating timeline recommendation:', error);
      throw error;
    }
  }

  /**
   * Predict completion time for specific auditor and context
   */
  async predictAuditorTimeline(auditorId: string, context: AuditContext): Promise<number> {
    try {
      const auditorHistory = await storage.getAuditorTimelineHistory(auditorId);
      const generalTimeline = await this.recommendTimeline(context);

      if (auditorHistory.length === 0) {
        return generalTimeline.recommendedDurationHours;
      }

      // Filter for similar contexts
      const relevantHistory = auditorHistory.filter(history => 
        this.isContextSimilar(history.contextFactors, context)
      );

      if (relevantHistory.length === 0) {
        // Apply auditor's general performance pattern to base timeline
        const auditorFactor = this.calculateAuditorPerformanceFactor(auditorHistory);
        return Math.round(generalTimeline.recommendedDurationHours * auditorFactor * 10) / 10;
      }

      // Calculate auditor-specific timeline based on relevant history
      const auditorAverage = relevantHistory.reduce((sum, h) => sum + Number(h.actualDurationHours), 0) / relevantHistory.length;
      const generalAverage = generalTimeline.recommendedDurationHours;

      // Blend auditor-specific and general predictions
      const blendedPrediction = auditorAverage * this.LEARNING_WEIGHT + generalAverage * (1 - this.LEARNING_WEIGHT);

      return Math.round(blendedPrediction * 10) / 10;

    } catch (error) {
      console.error(`❌ Error predicting timeline for auditor ${auditorId}:`, error);
      return context.timelineConstraints.maxDurationHours * 0.8; // Default fallback
    }
  }

  /**
   * Update timeline predictions based on learning from completed audits
   */
  async updateWithLearning(learningData: LearningData[]): Promise<void> {
    console.log(`📚 Processing timeline learning data from ${learningData.length} completed audits`);

    try {
      for (const data of learningData) {
        // Extract timeline performance data
        if (data.actualTimeline && data.predictedTimeline) {
          await this.recordTimelinePerformance(data);
        }

        // Identify timeline patterns
        if (data.actualTimeline && data.outcomeSuccess) {
          await this.identifyTimelinePatterns(data);
        }
      }

      // Update optimal timeline patterns
      await this.updateOptimalPatterns(learningData);

      console.log(`✅ Timeline learning completed`);

    } catch (error) {
      console.error('❌ Error in timeline learning process:', error);
      throw error;
    }
  }

  /**
   * Analyze timeline risks and provide mitigation strategies
   */
  async analyzeTimelineRisks(context: AuditContext): Promise<any> {
    try {
      const risks = [];
      
      // Analyze urgency risk
      if (context.timelineConstraints.urgencyLevel === 'critical') {
        risks.push({
          riskType: 'Critical Timeline Pressure',
          probability: 80,
          impact: 'High',
          description: 'Extremely tight timeline may compromise audit quality',
          mitigationStrategies: [
            'Allocate most experienced auditor',
            'Pre-prepare all materials and procedures',
            'Establish clear priorities and focus areas'
          ]
        });
      }

      // Analyze complexity risk
      if (context.complexityLevel === 'highly_complex') {
        risks.push({
          riskType: 'High Complexity Delays',
          probability: 70,
          impact: 'Medium-High',
          description: 'Complex audits often exceed initial time estimates',
          mitigationStrategies: [
            'Add 20-25% buffer to initial estimate',
            'Break down into smaller, manageable phases',
            'Assign senior auditor with relevant experience'
          ]
        });
      }

      // Analyze resource constraints
      if (context.availableResources.skillAvailability.length < 2) {
        risks.push({
          riskType: 'Limited Resource Availability',
          probability: 60,
          impact: 'Medium',
          description: 'Limited skilled resources may cause scheduling delays',
          mitigationStrategies: [
            'Secure resource commitments early',
            'Identify backup resources',
            'Consider external expert consultation'
          ]
        });
      }

      return {
        totalRisks: risks.length,
        highProbabilityRisks: risks.filter(r => r.probability >= 70).length,
        overallRiskLevel: this.calculateOverallTimelineRisk(risks),
        risks,
        recommendedActions: this.generateTimelineRiskActions(risks)
      };

    } catch (error) {
      console.error('❌ Error analyzing timeline risks:', error);
      throw error;
    }
  }

  // Private helper methods

  private async getHistoricalTimelineData(context: AuditContext): Promise<TimelinePerformanceAnalysis[]> {
    try {
      return await storage.getTimelinePerformanceByContext({
        riskCategory: context.riskProfile.category,
        complexityLevel: context.complexityLevel,
        organizationSize: context.organizationalContext.organizationSize,
        industryType: context.organizationalContext.industryType
      });
    } catch (error) {
      console.error('Error fetching historical timeline data:', error);
      return [];
    }
  }

  private async getOptimalTimelinePatterns(context: AuditContext): Promise<OptimalTimelinePattern[]> {
    try {
      return await storage.getOptimalTimelinePatterns({
        riskCategory: context.riskProfile.category,
        complexityLevel: context.complexityLevel,
        organizationSize: context.organizationalContext.organizationSize
      });
    } catch (error) {
      console.error('Error fetching optimal timeline patterns:', error);
      return [];
    }
  }

  private async calculateBaseDuration(
    context: AuditContext,
    historicalData: TimelinePerformanceAnalysis[],
    patterns: OptimalTimelinePattern[]
  ): Promise<number> {
    // Start with constraint-based estimate
    let baseDuration = context.timelineConstraints.maxDurationHours * 0.8;

    // Use pattern-based estimate if available
    if (patterns.length > 0) {
      const relevantPattern = patterns.find(p => 
        p.riskCategory === context.riskProfile.category && 
        p.complexityLevel === context.complexityLevel
      );
      
      if (relevantPattern) {
        baseDuration = Number(relevantPattern.optimalDurationHours);
      }
    }

    // Refine with historical data
    if (historicalData.length >= 3) {
      const historicalAverage = historicalData.reduce((sum, data) => 
        sum + Number(data.actualDurationHours), 0) / historicalData.length;
      
      // Blend pattern/constraint estimate with historical data
      baseDuration = baseDuration * 0.6 + historicalAverage * 0.4;
    }

    return Math.max(4, baseDuration); // Minimum 4 hours
  }

  private analyzeDurationFactors(
    context: AuditContext,
    historicalData: TimelinePerformanceAnalysis[]
  ): DurationFactor[] {
    const factors: DurationFactor[] = [];

    // Complexity factor
    const complexityImpact = this.getComplexityImpact(context.complexityLevel);
    factors.push({
      factorName: 'Audit Complexity',
      impact: complexityImpact > 0 ? 'increases' : 'decreases',
      magnitude: Math.abs(complexityImpact),
      description: `${context.complexityLevel} complexity ${complexityImpact > 0 ? 'increases' : 'reduces'} timeline requirements`,
      mitigationStrategies: this.getComplexityMitigations(context.complexityLevel)
    });

    // Organization size factor
    const sizeImpact = this.getOrganizationSizeImpact(context.organizationalContext.organizationSize);
    factors.push({
      factorName: 'Organization Size',
      impact: sizeImpact > 0 ? 'increases' : 'decreases',
      magnitude: Math.abs(sizeImpact),
      description: `${context.organizationalContext.organizationSize} organization ${sizeImpact > 0 ? 'requires more' : 'requires less'} audit time`,
      mitigationStrategies: this.getSizeMitigations(context.organizationalContext.organizationSize)
    });

    // Risk level factor
    const riskImpact = this.getRiskLevelImpact(context.riskProfile.inherentRiskScore);
    factors.push({
      factorName: 'Risk Level',
      impact: riskImpact > 0 ? 'increases' : 'varies',
      magnitude: Math.abs(riskImpact),
      description: `Risk level ${context.riskProfile.inherentRiskScore} requires ${riskImpact > 10 ? 'extensive' : 'standard'} audit procedures`,
      mitigationStrategies: this.getRiskMitigations(context.riskProfile.inherentRiskScore)
    });

    // Urgency factor
    if (context.timelineConstraints.urgencyLevel === 'critical') {
      factors.push({
        factorName: 'Critical Urgency',
        impact: 'varies',
        magnitude: 15,
        description: 'Critical timeline may require focused approach with potential quality trade-offs',
        mitigationStrategies: [
          'Prioritize high-risk areas',
          'Use experienced auditor',
          'Prepare materials in advance'
        ]
      });
    }

    // Historical variance factor
    if (historicalData.length >= 3) {
      const variances = historicalData.map(d => Math.abs(Number(d.variancePercentage)));
      const avgVariance = variances.reduce((sum, v) => sum + v, 0) / variances.length;
      
      if (avgVariance > 20) {
        factors.push({
          factorName: 'Historical Variability',
          impact: 'varies',
          magnitude: Math.min(25, avgVariance),
          description: 'Historical data shows high timeline variability for similar audits',
          mitigationStrategies: [
            'Add extra buffer time',
            'Plan for contingencies',
            'Monitor progress closely'
          ]
        });
      }
    }

    return factors;
  }

  private applyFactorAdjustments(baseDuration: number, factors: DurationFactor[]): number {
    let adjustedDuration = baseDuration;

    for (const factor of factors) {
      const multiplier = factor.magnitude / 100;
      
      switch (factor.impact) {
        case 'increases':
          adjustedDuration *= (1 + multiplier);
          break;
        case 'decreases':
          adjustedDuration *= (1 - multiplier);
          break;
        case 'varies':
          // For variable factors, we add a smaller adjustment
          adjustedDuration *= (1 + multiplier * 0.5);
          break;
      }
    }

    return Math.max(baseDuration * 0.5, adjustedDuration); // Don't reduce below 50% of base
  }

  private calculateRiskAdjustment(context: AuditContext, historicalData: TimelinePerformanceAnalysis[]): number {
    let riskAdjustment = 0;

    // High-risk audits typically need more time
    if (context.riskProfile.inherentRiskScore >= 20) {
      riskAdjustment += 2; // Add 2 hours for high risk
    }

    // First-time audits in specific contexts
    const similarContexts = historicalData.filter(d => 
      d.riskCategory === context.riskProfile.category &&
      d.complexityLevel === context.complexityLevel
    );

    if (similarContexts.length === 0) {
      riskAdjustment += 3; // Add 3 hours for unknown context
    }

    // Resource constraints
    if (context.availableResources.skillAvailability.length < 2) {
      riskAdjustment += 1.5; // Add time for limited resources
    }

    return riskAdjustment;
  }

  private calculateBufferRecommendation(context: AuditContext, riskAdjustment: number): number {
    let bufferPercentage = this.BUFFER_PERCENTAGE;

    // Adjust buffer based on context
    if (context.complexityLevel === 'highly_complex') {
      bufferPercentage += 0.05; // Additional 5% for high complexity
    }

    if (context.timelineConstraints.urgencyLevel === 'critical') {
      bufferPercentage *= 0.5; // Reduce buffer for critical timelines
    }

    if (riskAdjustment > 2) {
      bufferPercentage += 0.05; // Additional buffer for high-risk adjustments
    }

    // Convert to hours (assuming base duration calculation)
    const baseDurationEstimate = context.timelineConstraints.maxDurationHours * 0.8;
    return Math.round(baseDurationEstimate * bufferPercentage * 10) / 10;
  }

  private async generateTimelineMilestones(duration: number, context: AuditContext): Promise<TimelineMilestone[]> {
    const milestones: TimelineMilestone[] = [];

    // Planning milestone (15-20% of duration)
    milestones.push({
      milestoneId: 'milestone-planning',
      name: 'Planning & Preparation Complete',
      scheduledHours: Math.round(duration * 0.18 * 10) / 10,
      description: 'Initial planning, resource allocation, and preparation completed',
      dependencies: [],
      criticality: 'high',
      flexibility: 20
    });

    // Fieldwork milestone (60-70% of duration) 
    milestones.push({
      milestoneId: 'milestone-fieldwork',
      name: 'Fieldwork & Testing Complete',
      scheduledHours: Math.round(duration * 0.65 * 10) / 10,
      description: 'All audit procedures executed and evidence collected',
      dependencies: ['milestone-planning'],
      criticality: 'critical',
      flexibility: 10
    });

    // Review milestone (85% of duration)
    milestones.push({
      milestoneId: 'milestone-review',
      name: 'Review & Quality Assurance Complete',
      scheduledHours: Math.round(duration * 0.85 * 10) / 10,
      description: 'Findings reviewed and quality assurance completed',
      dependencies: ['milestone-fieldwork'],
      criticality: 'high',
      flexibility: 15
    });

    // Completion milestone (100% of duration)
    milestones.push({
      milestoneId: 'milestone-completion',
      name: 'Final Report & Closure',
      scheduledHours: duration,
      description: 'Final report completed and audit closed',
      dependencies: ['milestone-review'],
      criticality: 'medium',
      flexibility: 25
    });

    return milestones;
  }

  private createContingencyPlans(context: AuditContext, historicalData: TimelinePerformanceAnalysis[]): ContingencyOption[] {
    const contingencies: ContingencyOption[] = [];

    // Delay contingency
    contingencies.push({
      scenario: 'Significant Delay (>20% over estimate)',
      probability: this.calculateDelayProbability(context, historicalData),
      impact: Math.round(context.timelineConstraints.maxDurationHours * 0.25), // 25% extension
      responseStrategy: 'Escalate to management, request timeline extension, add resources if possible',
      resources: ['Senior auditor support', 'Management approval', 'Additional team member']
    });

    // Complexity escalation
    if (context.complexityLevel !== 'highly_complex') {
      contingencies.push({
        scenario: 'Complexity Higher Than Expected',
        probability: 35,
        impact: Math.round(context.timelineConstraints.maxDurationHours * 0.15),
        responseStrategy: 'Engage specialist, revise scope or add expertise',
        resources: ['Subject matter expert', 'Extended timeline approval']
      });
    }

    // Resource unavailability
    contingencies.push({
      scenario: 'Key Resource Becomes Unavailable',
      probability: 25,
      impact: Math.round(context.timelineConstraints.maxDurationHours * 0.20),
      responseStrategy: 'Activate backup resource, redistribute workload, or delay non-critical activities',
      resources: ['Backup auditor', 'Cross-training materials', 'Workload redistribution plan']
    });

    return contingencies;
  }

  private async generateSchedulingStrategy(context: AuditContext, duration: number): Promise<SchedulingStrategy> {
    // This would be more sophisticated with actual test sequences
    const testSequences = [
      {
        step: 1,
        testId: 'planning-phase',
        estimatedHours: duration * 0.18,
        dependencies: [],
        alternatives: ['accelerated-planning']
      },
      {
        step: 2,
        testId: 'fieldwork-phase',
        estimatedHours: duration * 0.47,
        dependencies: ['planning-phase'],
        alternatives: ['parallel-fieldwork']
      },
      {
        step: 3,
        testId: 'review-phase',
        estimatedHours: duration * 0.20,
        dependencies: ['fieldwork-phase'],
        alternatives: ['concurrent-review']
      },
      {
        step: 4,
        testId: 'reporting-phase',
        estimatedHours: duration * 0.15,
        dependencies: ['review-phase'],
        alternatives: ['draft-concurrent-reporting']
      }
    ];

    return {
      recommendedSequence: testSequences,
      parallelExecutionOpportunities: [
        {
          testIds: ['planning-phase', 'resource-preparation'],
          savingsHours: 2,
          requirements: ['Multiple team members', 'Clear role definition'],
          risks: ['Coordination overhead', 'Communication gaps']
        }
      ],
      resourceOptimization: {
        resourceType: 'Primary Auditor',
        optimization: 'Focus on critical path activities',
        expectedBenefit: '10-15% time savings',
        implementation: 'Prioritize high-risk areas and delegate routine tasks'
      },
      criticalPath: {
        totalDuration: duration,
        criticalTests: ['fieldwork-phase', 'review-phase'],
        bufferAvailable: Math.round(duration * 0.15 * 10) / 10,
        riskPoints: ['Complex procedure execution', 'Quality review bottlenecks']
      },
      flexibilityPoints: [
        {
          testId: 'reporting-phase',
          flexibilityType: 'schedule',
          options: ['Parallel drafting', 'Phased reporting'],
          impact: 'Can reduce final phase by 20-30%'
        }
      ]
    };
  }

  private identifyOptimizationOpportunities(
    context: AuditContext,
    historicalData: TimelinePerformanceAnalysis[]
  ): OptimizationOpportunity[] {
    const opportunities: OptimizationOpportunity[] = [];

    // Time optimization
    if (historicalData.some(d => Number(d.actualDurationHours) < Number(d.plannedDurationHours) * 0.9)) {
      opportunities.push({
        opportunityType: 'time',
        description: 'Historical data shows potential for faster execution',
        expectedBenefit: '10-20% time reduction possible',
        implementationEffort: 'low',
        riskLevel: 'low'
      });
    }

    // Quality optimization
    if (context.qualityRequirements.thoroughnessLevel === 'comprehensive') {
      opportunities.push({
        opportunityType: 'quality',
        description: 'Implement continuous quality monitoring',
        expectedBenefit: 'Early issue detection, reduced rework',
        implementationEffort: 'medium',
        riskLevel: 'low'
      });
    }

    // Resource optimization
    if (context.availableResources.skillAvailability.length >= 3) {
      opportunities.push({
        opportunityType: 'cost',
        description: 'Parallel execution with multiple team members',
        expectedBenefit: '15-25% time savings through parallelization',
        implementationEffort: 'medium',
        riskLevel: 'medium'
      });
    }

    return opportunities;
  }

  private calculateConfidenceLevel(dataPoints: number, factors: DurationFactor[]): number {
    let confidence = 50; // Base confidence

    // More data points increase confidence
    confidence += Math.min(30, dataPoints * 3);

    // Factor certainty affects confidence
    const factorCertainty = factors.reduce((sum, factor) => {
      if (factor.impact === 'increases' || factor.impact === 'decreases') return sum + 20;
      return sum + 10; // 'varies' factors are less certain
    }, 0) / factors.length;

    confidence += factorCertainty;

    return Math.max(40, Math.min(95, Math.round(confidence)));
  }

  private getComplexityImpact(complexity: string): number {
    const impacts = {
      'simple': -10,      // 10% reduction
      'moderate': 0,      // No change
      'complex': 15,      // 15% increase
      'highly_complex': 30 // 30% increase
    };
    return impacts[complexity] || 0;
  }

  private getComplexityMitigations(complexity: string): string[] {
    const mitigations = {
      'simple': ['Streamline procedures', 'Use junior auditors for efficiency'],
      'moderate': ['Standard procedures', 'Regular progress monitoring'],
      'complex': ['Senior auditor involvement', 'Detailed planning', 'Regular checkpoints'],
      'highly_complex': ['Expert specialist support', 'Phased approach', 'Extensive planning and preparation']
    };
    return mitigations[complexity] || [];
  }

  private getOrganizationSizeImpact(size: string): number {
    const impacts = {
      'small': -5,      // 5% reduction
      'medium': 0,      // No change  
      'large': 10,      // 10% increase
      'enterprise': 20  // 20% increase
    };
    return impacts[size] || 0;
  }

  private getSizeMitigations(size: string): string[] {
    const mitigations = {
      'small': ['Simplified procedures', 'Focus on key risks'],
      'medium': ['Standard approach', 'Balanced coverage'],
      'large': ['Systematic sampling', 'Multiple audit areas'],
      'enterprise': ['Team-based approach', 'Structured methodology', 'Clear coordination protocols']
    };
    return mitigations[size] || [];
  }

  private getRiskLevelImpact(riskScore: number): number {
    if (riskScore >= 20) return 20; // High risk: 20% increase
    if (riskScore >= 15) return 10; // Medium-high risk: 10% increase
    if (riskScore >= 10) return 5;  // Medium risk: 5% increase
    return 0; // Low risk: no change
  }

  private getRiskMitigations(riskScore: number): string[] {
    if (riskScore >= 20) {
      return ['Extensive testing', 'Senior auditor required', 'Comprehensive documentation'];
    }
    if (riskScore >= 15) {
      return ['Enhanced procedures', 'Additional review steps'];
    }
    if (riskScore >= 10) {
      return ['Standard risk-based procedures', 'Regular monitoring'];
    }
    return ['Basic risk assessment', 'Standard procedures'];
  }

  private calculateDelayProbability(context: AuditContext, historicalData: TimelinePerformanceAnalysis[]): number {
    let baseProbability = 30;

    if (context.complexityLevel === 'highly_complex') baseProbability += 25;
    if (context.timelineConstraints.urgencyLevel === 'critical') baseProbability += 20;
    if (context.availableResources.skillAvailability.length < 2) baseProbability += 15;

    // Factor in historical data
    if (historicalData.length >= 3) {
      const delayedAudits = historicalData.filter(d => Number(d.variancePercentage) > 10);
      const historicalDelayRate = (delayedAudits.length / historicalData.length) * 100;
      baseProbability = baseProbability * 0.6 + historicalDelayRate * 0.4;
    }

    return Math.round(Math.max(10, Math.min(80, baseProbability)));
  }

  private calculateOverallTimelineRisk(risks: any[]): string {
    const highRisks = risks.filter(r => r.probability >= 70).length;
    const mediumRisks = risks.filter(r => r.probability >= 50 && r.probability < 70).length;

    if (highRisks >= 2) return 'High';
    if (highRisks >= 1 || mediumRisks >= 2) return 'Medium';
    return 'Low';
  }

  private generateTimelineRiskActions(risks: any[]): string[] {
    const actions = [];

    if (risks.some(r => r.riskType.includes('Critical Timeline'))) {
      actions.push('Establish clear priorities and must-have deliverables');
      actions.push('Prepare contingency plan for scope reduction if needed');
    }

    if (risks.some(r => r.riskType.includes('Complexity'))) {
      actions.push('Secure specialist support before audit starts');
      actions.push('Build in additional buffer time');
    }

    if (risks.some(r => r.riskType.includes('Resource'))) {
      actions.push('Confirm resource availability and backup plans');
      actions.push('Cross-train team members on key procedures');
    }

    return actions.length > 0 ? actions : ['Monitor progress daily', 'Maintain regular communication with stakeholders'];
  }

  private isContextSimilar(historicalContext: any, currentContext: AuditContext): boolean {
    // Simplified context similarity check
    if (typeof historicalContext === 'object' && historicalContext !== null) {
      return historicalContext.complexityLevel === currentContext.complexityLevel &&
             historicalContext.riskCategory === currentContext.riskProfile.category;
    }
    return false;
  }

  private calculateAuditorPerformanceFactor(auditHistory: any[]): number {
    // Calculate how this auditor typically performs relative to estimates
    const variances = auditHistory.map(audit => {
      const planned = audit.plannedDuration || audit.estimatedDuration || 8;
      const actual = audit.actualDuration || 8;
      return actual / planned;
    });

    const avgFactor = variances.reduce((sum, v) => sum + v, 0) / variances.length;
    return Math.max(0.5, Math.min(2.0, avgFactor)); // Constrain between 0.5x and 2.0x
  }

  private async recordTimelinePerformance(learningData: LearningData): Promise<void> {
    try {
      const variancePercentage = ((learningData.actualTimeline - learningData.predictedTimeline) / learningData.predictedTimeline) * 100;

      const performanceData: InsertTimelinePerformanceAnalysis = {
        auditTestId: learningData.auditTestId,
        plannedDurationHours: learningData.predictedTimeline,
        actualDurationHours: learningData.actualTimeline,
        variancePercentage: Math.round(variancePercentage * 100) / 100,
        delayFactors: [], // Would extract from contextFactors
        accelerationFactors: [],
        auditorId: learningData.actualAuditor,
        complexityFactors: JSON.stringify(learningData.contextFactors || {}),
        externalDependencies: [],
        resourceConstraints: [],
        completionQualityScore: Math.round(learningData.qualityScore),
        timelineAccuracyScore: Math.max(0, 100 - Math.abs(variancePercentage))
      };

      await storage.createTimelinePerformanceAnalysis(performanceData);
      console.log(`📊 Recorded timeline performance for audit ${learningData.auditTestId}`);

    } catch (error) {
      console.error('Error recording timeline performance:', error);
    }
  }

  private async identifyTimelinePatterns(learningData: LearningData): Promise<void> {
    // Implementation for identifying successful timeline patterns
    console.log(`🎯 Identified timeline pattern for audit ${learningData.auditTestId}`);
  }

  private async updateOptimalPatterns(learningData: LearningData[]): Promise<void> {
    // Implementation for updating optimal timeline patterns
    console.log(`📈 Updated optimal timeline patterns based on ${learningData.length} audits`);
  }
}

// Export singleton instance
export const timelineIntelligenceService = new TimelineIntelligenceService();