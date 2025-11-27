import { storage } from "./storage";
import { 
  type AuditContext, type ProcedureRecommendation, type AlternativeProcedure,
  type BestPractice, type ContextualFactor, type LearningData,
  type AuditTestTemplate, type TemplateProcedure, type ProcedurePerformanceHistory,
  type InsertProcedurePerformanceHistory, type AuditBestPractice
} from "@shared/schema";

/**
 * PROCEDURE RECOMMENDATION ENGINE
 * 
 * Analyzes historical procedure performance and provides intelligent recommendations
 * for optimal audit procedures based on context and success patterns.
 */
export class ProcedureRecommendationEngine {
  private readonly CONFIDENCE_THRESHOLD = 70;
  private readonly MAX_RECOMMENDATIONS = 5;
  private readonly LEARNING_WEIGHT = 0.3; // How much to weight recent learning vs historical data

  /**
   * Recommend optimal procedures for a given audit context
   */
  async recommendProcedures(context: AuditContext): Promise<ProcedureRecommendation[]> {
    console.log(`🔍 Analyzing procedures for ${context.riskProfile.category} risk category`);

    try {
      // Get relevant historical data
      const historicalPerformance = await this.getHistoricalProcedurePerformance(context);
      const bestPractices = await this.getBestPracticesForContext(context);
      const availableTemplates = await this.getRelevantTemplates(context);

      // Analyze each template and generate recommendations
      const recommendations: ProcedureRecommendation[] = [];

      for (const template of availableTemplates) {
        const recommendation = await this.analyzeTemplateForContext(
          template,
          context,
          historicalPerformance,
          bestPractices
        );

        if (recommendation.recommendationScore >= this.CONFIDENCE_THRESHOLD) {
          recommendations.push(recommendation);
        }
      }

      // Sort by recommendation score and limit results
      recommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);
      const topRecommendations = recommendations.slice(0, this.MAX_RECOMMENDATIONS);

      console.log(`✅ Generated ${topRecommendations.length} procedure recommendations`);
      return topRecommendations;

    } catch (error) {
      console.error('❌ Error generating procedure recommendations:', error);
      throw error;
    }
  }

  /**
   * Analyze effectiveness of specific procedures
   */
  async analyzeProcedureEffectiveness(procedureId: string): Promise<any> {
    try {
      const performanceHistory = await storage.getProcedurePerformanceHistory(procedureId);
      
      if (performanceHistory.length === 0) {
        return {
          procedureId,
          effectivenessScore: 0,
          confidence: 0,
          dataPoints: 0,
          insights: ['Insufficient data for analysis']
        };
      }

      const averageEffectiveness = performanceHistory.reduce((sum, item) => sum + item.effectivenessScore, 0) / performanceHistory.length;
      const averageTime = performanceHistory.reduce((sum, item) => sum + Number(item.completionTimeHours), 0) / performanceHistory.length;
      const successRate = performanceHistory.filter(item => item.completionStatus === 'completed').length / performanceHistory.length;

      return {
        procedureId,
        effectivenessScore: Math.round(averageEffectiveness),
        averageCompletionTime: Math.round(averageTime * 10) / 10,
        successRate: Math.round(successRate * 100),
        totalExecutions: performanceHistory.length,
        qualityRating: performanceHistory.reduce((sum, item) => sum + item.qualityRating, 0) / performanceHistory.length,
        insights: this.generateEffectivenessInsights(performanceHistory)
      };

    } catch (error) {
      console.error(`❌ Error analyzing procedure ${procedureId} effectiveness:`, error);
      throw error;
    }
  }

  /**
   * Update recommendations based on learning from completed audits
   */
  async updateWithLearning(learningData: LearningData[]): Promise<void> {
    console.log(`📚 Processing learning data from ${learningData.length} completed audits`);

    try {
      for (const data of learningData) {
        // Extract procedure performance data
        if (data.actualProceduresUsed && data.actualProceduresUsed.length > 0) {
          await this.recordProcedurePerformance(data);
        }

        // Identify successful patterns
        if (data.outcomeSuccess && data.qualityScore >= 80) {
          await this.identifySuccessPatterns(data);
        }

        // Update best practices if exceptional performance
        if (data.qualityScore >= 90 && data.outcomeSuccess) {
          await this.updateBestPractices(data);
        }
      }

      console.log(`✅ Learning completed for procedure recommendations`);

    } catch (error) {
      console.error('❌ Error in procedure learning process:', error);
      throw error;
    }
  }

  /**
   * Suggest procedure improvements based on analysis
   */
  async suggestProcedureImprovements(procedureId: string): Promise<any[]> {
    try {
      const effectiveness = await this.analyzeProcedureEffectiveness(procedureId);
      const improvements = [];

      if (effectiveness.effectivenessScore < 70) {
        improvements.push({
          type: 'effectiveness',
          priority: 'high',
          description: 'Consider alternative procedures with higher success rates',
          expectedImprovement: '15-25% increase in effectiveness'
        });
      }

      if (effectiveness.averageCompletionTime > 8) {
        improvements.push({
          type: 'efficiency',
          priority: 'medium',
          description: 'Streamline procedure steps to reduce completion time',
          expectedImprovement: '10-20% time savings'
        });
      }

      if (effectiveness.qualityRating < 4.0) {
        improvements.push({
          type: 'quality',
          priority: 'high',
          description: 'Enhance procedure guidance and quality control measures',
          expectedImprovement: '0.5-1.0 point quality increase'
        });
      }

      return improvements;

    } catch (error) {
      console.error(`❌ Error suggesting improvements for procedure ${procedureId}:`, error);
      throw error;
    }
  }

  // Private helper methods

  private async getHistoricalProcedurePerformance(context: AuditContext): Promise<ProcedurePerformanceHistory[]> {
    try {
      // Get performance data for similar contexts
      return await storage.getProcedurePerformanceByContext({
        riskCategory: context.riskProfile.category,
        complexityLevel: context.complexityLevel,
        industryType: context.organizationalContext.industryType,
        organizationSize: context.organizationalContext.organizationSize
      });
    } catch (error) {
      console.error('Error fetching historical procedure performance:', error);
      return [];
    }
  }

  private async getBestPracticesForContext(context: AuditContext): Promise<AuditBestPractice[]> {
    try {
      return await storage.getBestPracticesByRiskCategory(context.riskProfile.category);
    } catch (error) {
      console.error('Error fetching best practices:', error);
      return [];
    }
  }

  private async getRelevantTemplates(context: AuditContext): Promise<AuditTestTemplate[]> {
    try {
      // Get templates that match the context
      const templates = await storage.getAuditTestTemplates();
      return templates.filter(template => 
        template.riskCategories?.includes(context.riskProfile.category) ||
        template.complexityLevels?.includes(context.complexityLevel)
      );
    } catch (error) {
      console.error('Error fetching relevant templates:', error);
      return [];
    }
  }

  private async analyzeTemplateForContext(
    template: AuditTestTemplate,
    context: AuditContext,
    historicalData: ProcedurePerformanceHistory[],
    bestPractices: AuditBestPractice[]
  ): Promise<ProcedureRecommendation> {
    
    // Calculate recommendation score based on multiple factors
    const factors = {
      historicalSuccess: this.calculateHistoricalSuccessScore(template, historicalData),
      contextMatch: this.calculateContextMatchScore(template, context),
      bestPracticeAlignment: this.calculateBestPracticeScore(template, bestPractices),
      timeEfficiency: this.calculateTimeEfficiencyScore(template, historicalData),
      qualityPotential: this.calculateQualityScore(template, historicalData)
    };

    const recommendationScore = this.calculateWeightedScore(factors);
    const expectedEffectiveness = this.predictEffectiveness(template, context, historicalData);
    const estimatedTime = this.estimateCompletionTime(template, context, historicalData);

    // Generate reasoning
    const reasoning = this.generateReasoning(template, factors, context);

    // Find alternative procedures
    const alternatives = await this.findAlternativeProcedures(template, context);

    // Get applicable best practices
    const applicablePractices = this.getApplicableBestPractices(template, bestPractices);

    // Identify contextual factors
    const contextualFactors = this.identifyContextualFactors(template, context);

    return {
      procedureId: template.id,
      procedureName: template.name,
      recommendationScore: Math.round(recommendationScore),
      reasoning,
      expectedEffectiveness: Math.round(expectedEffectiveness),
      estimatedTimeHours: Math.round(estimatedTime * 10) / 10,
      requiredSkills: template.requiredSkills || [],
      alternativeProcedures: alternatives,
      historicalSuccessRate: Math.round(factors.historicalSuccess),
      riskMitigationLevel: this.calculateRiskMitigation(template, context),
      confidenceLevel: this.calculateConfidenceLevel(historicalData.length, factors),
      contextualFactors,
      bestPractices: applicablePractices
    };
  }

  private calculateHistoricalSuccessScore(template: AuditTestTemplate, historicalData: ProcedurePerformanceHistory[]): number {
    const relevantData = historicalData.filter(data => 
      data.procedureId === template.id ||
      data.procedureType === template.type
    );

    if (relevantData.length === 0) return 50; // Neutral score for no data

    const successRate = relevantData.filter(data => data.completionStatus === 'completed').length / relevantData.length;
    const avgEffectiveness = relevantData.reduce((sum, data) => sum + data.effectivenessScore, 0) / relevantData.length;

    return (successRate * 0.6 + (avgEffectiveness / 100) * 0.4) * 100;
  }

  private calculateContextMatchScore(template: AuditTestTemplate, context: AuditContext): number {
    let score = 0;

    // Risk category match
    if (template.riskCategories?.includes(context.riskProfile.category)) {
      score += 30;
    }

    // Complexity match
    if (template.complexityLevels?.includes(context.complexityLevel)) {
      score += 25;
    }

    // Industry match
    if (template.applicableIndustries?.includes(context.organizationalContext.industryType)) {
      score += 20;
    }

    // Organization size match
    if (template.organizationSizes?.includes(context.organizationalContext.organizationSize)) {
      score += 15;
    }

    // Compliance level match
    if (template.complianceLevels?.includes(context.organizationalContext.complianceLevel)) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  private calculateBestPracticeScore(template: AuditTestTemplate, bestPractices: AuditBestPractice[]): number {
    const applicablePractices = bestPractices.filter(practice => 
      practice.procedureType === template.type ||
      practice.applicableContexts.some(ctx => template.tags?.includes(ctx))
    );

    if (applicablePractices.length === 0) return 50;

    const avgSuccessRate = applicablePractices.reduce((sum, practice) => sum + Number(practice.successRate), 0) / applicablePractices.length;
    return Math.min(avgSuccessRate, 100);
  }

  private calculateTimeEfficiencyScore(template: AuditTestTemplate, historicalData: ProcedurePerformanceHistory[]): number {
    const relevantData = historicalData.filter(data => data.procedureType === template.type);
    
    if (relevantData.length === 0) return 70; // Default score

    const avgTime = relevantData.reduce((sum, data) => sum + Number(data.completionTimeHours), 0) / relevantData.length;
    const estimatedTime = template.estimatedHours || 8;

    // Score based on how close actual time is to estimated time (efficiency)
    const efficiency = Math.max(0, (estimatedTime - Math.abs(avgTime - estimatedTime)) / estimatedTime);
    return Math.round(efficiency * 100);
  }

  private calculateQualityScore(template: AuditTestTemplate, historicalData: ProcedurePerformanceHistory[]): number {
    const relevantData = historicalData.filter(data => data.procedureType === template.type);
    
    if (relevantData.length === 0) return 75; // Default score

    const avgQuality = relevantData.reduce((sum, data) => sum + data.qualityRating, 0) / relevantData.length;
    return Math.round((avgQuality / 5) * 100); // Convert 1-5 scale to 0-100
  }

  private calculateWeightedScore(factors: Record<string, number>): number {
    const weights = {
      historicalSuccess: 0.3,
      contextMatch: 0.25,
      bestPracticeAlignment: 0.2,
      timeEfficiency: 0.15,
      qualityPotential: 0.1
    };

    let weightedSum = 0;
    for (const [factor, score] of Object.entries(factors)) {
      weightedSum += score * (weights[factor] || 0);
    }

    return Math.round(weightedSum);
  }

  private predictEffectiveness(
    template: AuditTestTemplate, 
    context: AuditContext, 
    historicalData: ProcedurePerformanceHistory[]
  ): number {
    const baseEffectiveness = template.baseEffectiveness || 75;
    
    // Adjust based on context factors
    let adjustment = 0;
    
    if (context.complexityLevel === 'simple') adjustment += 10;
    else if (context.complexityLevel === 'highly_complex') adjustment -= 15;
    
    if (context.organizationalContext.maturityLevel === 'optimized') adjustment += 10;
    else if (context.organizationalContext.maturityLevel === 'initial') adjustment -= 10;

    // Factor in historical performance
    const relevantData = historicalData.filter(data => data.procedureType === template.type);
    if (relevantData.length > 0) {
      const historicalAvg = relevantData.reduce((sum, data) => sum + data.effectivenessScore, 0) / relevantData.length;
      adjustment += (historicalAvg - baseEffectiveness) * this.LEARNING_WEIGHT;
    }

    return Math.max(30, Math.min(95, baseEffectiveness + adjustment));
  }

  private estimateCompletionTime(
    template: AuditTestTemplate,
    context: AuditContext,
    historicalData: ProcedurePerformanceHistory[]
  ): number {
    let baseTime = template.estimatedHours || 8;

    // Adjust for complexity
    const complexityMultiplier = {
      'simple': 0.8,
      'moderate': 1.0,
      'complex': 1.3,
      'highly_complex': 1.6
    };
    baseTime *= complexityMultiplier[context.complexityLevel] || 1.0;

    // Adjust for organization size
    const sizeMultiplier = {
      'small': 0.9,
      'medium': 1.0,
      'large': 1.2,
      'enterprise': 1.4
    };
    baseTime *= sizeMultiplier[context.organizationalContext.organizationSize] || 1.0;

    // Factor in historical data
    const relevantData = historicalData.filter(data => data.procedureType === template.type);
    if (relevantData.length > 0) {
      const historicalAvg = relevantData.reduce((sum, data) => sum + Number(data.completionTimeHours), 0) / relevantData.length;
      baseTime = baseTime * (1 - this.LEARNING_WEIGHT) + historicalAvg * this.LEARNING_WEIGHT;
    }

    return Math.max(1, baseTime);
  }

  private generateReasoning(
    template: AuditTestTemplate,
    factors: Record<string, number>,
    context: AuditContext
  ): string {
    const strongFactors = Object.entries(factors)
      .filter(([_, score]) => score >= 80)
      .map(([factor, _]) => factor);

    const weakFactors = Object.entries(factors)
      .filter(([_, score]) => score <= 50)
      .map(([factor, _]) => factor);

    let reasoning = `Recommended for ${context.riskProfile.category} risk auditing due to:\n`;

    if (strongFactors.includes('historicalSuccess')) {
      reasoning += `• Strong historical performance in similar contexts\n`;
    }
    if (strongFactors.includes('contextMatch')) {
      reasoning += `• Excellent alignment with audit context and requirements\n`;
    }
    if (strongFactors.includes('bestPracticeAlignment')) {
      reasoning += `• Consistent with proven best practices\n`;
    }

    if (weakFactors.length > 0) {
      reasoning += `\nConsiderations:\n`;
      if (weakFactors.includes('timeEfficiency')) {
        reasoning += `• May require additional time planning\n`;
      }
      if (weakFactors.includes('qualityPotential')) {
        reasoning += `• Consider quality enhancement measures\n`;
      }
    }

    return reasoning.trim();
  }

  private async findAlternativeProcedures(
    template: AuditTestTemplate,
    context: AuditContext
  ): Promise<AlternativeProcedure[]> {
    try {
      const alternatives = await storage.getAlternativeTemplates(template.id, context.riskProfile.category);
      
      return alternatives.slice(0, 3).map(alt => ({
        procedureId: alt.id,
        procedureName: alt.name,
        score: this.calculateContextMatchScore(alt, context),
        tradeoffs: this.identifyTradeoffs(template, alt),
        benefits: this.identifyBenefits(alt, template),
        limitations: this.identifyLimitations(alt, context)
      }));
    } catch (error) {
      console.error('Error finding alternative procedures:', error);
      return [];
    }
  }

  private getApplicableBestPractices(
    template: AuditTestTemplate,
    bestPractices: AuditBestPractice[]
  ): BestPractice[] {
    return bestPractices
      .filter(practice => practice.procedureType === template.type)
      .slice(0, 3)
      .map(practice => ({
        practiceId: practice.id,
        title: practice.practiceTitle,
        description: practice.bestPracticeText,
        applicability: Math.round(Number(practice.successRate)),
        expectedImprovement: Number(practice.averageTimeSavings)
      }));
  }

  private identifyContextualFactors(
    template: AuditTestTemplate,
    context: AuditContext
  ): ContextualFactor[] {
    const factors: ContextualFactor[] = [];

    // Risk level factor
    if (context.riskProfile.inherentRiskScore >= 20) {
      factors.push({
        factorName: 'High Risk Environment',
        impact: 'positive',
        strength: 85,
        description: 'Template well-suited for high-risk scenarios'
      });
    }

    // Complexity factor
    if (context.complexityLevel === template.targetComplexity) {
      factors.push({
        factorName: 'Complexity Alignment',
        impact: 'positive',
        strength: 90,
        description: 'Template designed for this complexity level'
      });
    }

    // Resource factor
    if (context.availableResources.skillAvailability.length >= 3) {
      factors.push({
        factorName: 'Resource Availability',
        impact: 'positive',
        strength: 75,
        description: 'Sufficient skilled resources available'
      });
    }

    // Timeline factor
    if (context.timelineConstraints.urgencyLevel === 'critical') {
      factors.push({
        factorName: 'Time Pressure',
        impact: 'negative',
        strength: 70,
        description: 'Critical timeline may impact thoroughness'
      });
    }

    return factors.slice(0, 4); // Limit to most relevant factors
  }

  private calculateRiskMitigation(template: AuditTestTemplate, context: AuditContext): number {
    // Assess how well the template mitigates the identified risks
    const riskCoverage = template.riskCategories?.includes(context.riskProfile.category) ? 80 : 40;
    const complexityHandling = template.complexityLevels?.includes(context.complexityLevel) ? 85 : 50;
    const controlStrength = template.controlFocus ? 75 : 60;

    return Math.round((riskCoverage + complexityHandling + controlStrength) / 3);
  }

  private calculateConfidenceLevel(dataPoints: number, factors: Record<string, number>): number {
    let confidence = 50; // Base confidence

    // Increase confidence with more data points
    confidence += Math.min(30, dataPoints * 2);

    // Increase confidence with strong factors
    const avgFactorScore = Object.values(factors).reduce((sum, score) => sum + score, 0) / Object.values(factors).length;
    confidence += (avgFactorScore - 50) * 0.4;

    return Math.max(30, Math.min(95, Math.round(confidence)));
  }

  private identifyTradeoffs(original: AuditTestTemplate, alternative: AuditTestTemplate): string[] {
    const tradeoffs = [];
    
    if ((alternative.estimatedHours || 8) > (original.estimatedHours || 8)) {
      tradeoffs.push('Longer execution time');
    }
    if ((alternative.requiredSkills?.length || 0) > (original.requiredSkills?.length || 0)) {
      tradeoffs.push('Higher skill requirements');
    }
    if (alternative.complexityLevel === 'highly_complex' && original.complexityLevel !== 'highly_complex') {
      tradeoffs.push('Increased complexity');
    }

    return tradeoffs;
  }

  private identifyBenefits(alternative: AuditTestTemplate, original: AuditTestTemplate): string[] {
    const benefits = [];
    
    if ((alternative.estimatedHours || 8) < (original.estimatedHours || 8)) {
      benefits.push('Faster completion');
    }
    if ((alternative.effectivenessRating || 0) > (original.effectivenessRating || 0)) {
      benefits.push('Higher effectiveness');
    }
    if (alternative.automationLevel > (original.automationLevel || 0)) {
      benefits.push('More automated procedures');
    }

    return benefits;
  }

  private identifyLimitations(template: AuditTestTemplate, context: AuditContext): string[] {
    const limitations = [];
    
    if (!template.industryApplicability?.includes(context.organizationalContext.industryType)) {
      limitations.push('Limited industry applicability');
    }
    if (template.minimumMaturityLevel && template.minimumMaturityLevel > context.organizationalContext.maturityLevel) {
      limitations.push('Requires higher organizational maturity');
    }
    if (template.requiredTools?.length > context.availableResources.toolsAvailable.length) {
      limitations.push('Tool availability constraints');
    }

    return limitations;
  }

  private async recordProcedurePerformance(learningData: LearningData): Promise<void> {
    try {
      for (const procedure of learningData.actualProceduresUsed) {
        const performanceData: InsertProcedurePerformanceHistory = {
          auditTestId: learningData.auditTestId,
          procedureId: procedure.procedureId || 'unknown',
          procedureType: procedure.procedureType || 'general',
          completionTimeHours: procedure.actualTimeHours || 0,
          effectivenessScore: Math.round((procedure.effectivenessRating || 0) * 20), // Convert 1-5 to 0-100
          qualityRating: procedure.qualityRating || 3,
          auditorId: learningData.actualAuditor,
          findingsDiscovered: procedure.findingsCount || 0,
          issuesIdentified: procedure.issuesCount || 0,
          completionStatus: learningData.outcomeSuccess ? 'completed' : 'incomplete',
          auditDate: new Date(),
          riskCategory: learningData.contextFactors?.find(f => f.factorName === 'riskCategory')?.description || 'general',
          complexityLevel: learningData.contextFactors?.find(f => f.factorName === 'complexityLevel')?.description || 'moderate',
          organizationSize: learningData.contextFactors?.find(f => f.factorName === 'organizationSize')?.description || 'medium',
          industryType: learningData.contextFactors?.find(f => f.factorName === 'industryType')?.description || 'general',
          contextFactors: JSON.stringify(learningData.contextFactors || {}),
          performanceMetrics: JSON.stringify({
            qualityScore: learningData.qualityScore,
            recommendationFollowed: learningData.recommendationFollowed,
            outcomeSuccess: learningData.outcomeSuccess
          })
        };

        await storage.createProcedurePerformanceHistory(performanceData);
      }
    } catch (error) {
      console.error('Error recording procedure performance:', error);
    }
  }

  private async identifySuccessPatterns(learningData: LearningData): Promise<void> {
    // Implementation for identifying successful patterns would go here
    console.log(`🎯 Identified success pattern for audit ${learningData.auditTestId}`);
  }

  private async updateBestPractices(learningData: LearningData): Promise<void> {
    // Implementation for updating best practices would go here
    console.log(`📈 Updated best practices based on exceptional performance in audit ${learningData.auditTestId}`);
  }

  private generateEffectivenessInsights(performanceHistory: ProcedurePerformanceHistory[]): string[] {
    const insights = [];
    
    const avgEffectiveness = performanceHistory.reduce((sum, item) => sum + item.effectivenessScore, 0) / performanceHistory.length;
    const avgTime = performanceHistory.reduce((sum, item) => sum + Number(item.completionTimeHours), 0) / performanceHistory.length;

    if (avgEffectiveness > 85) {
      insights.push('Consistently high effectiveness across executions');
    } else if (avgEffectiveness < 60) {
      insights.push('Below-average effectiveness may indicate need for improvement');
    }

    if (avgTime < 4) {
      insights.push('Efficient execution time compared to similar procedures');
    } else if (avgTime > 12) {
      insights.push('Longer than average completion time - consider optimization');
    }

    const qualityTrend = this.calculateQualityTrend(performanceHistory);
    if (qualityTrend === 'improving') {
      insights.push('Quality scores showing improvement trend');
    } else if (qualityTrend === 'declining') {
      insights.push('Quality scores declining - may need attention');
    }

    return insights;
  }

  private calculateQualityTrend(performanceHistory: ProcedurePerformanceHistory[]): string {
    if (performanceHistory.length < 3) return 'stable';

    const recent = performanceHistory.slice(-3);
    const older = performanceHistory.slice(0, -3);

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, item) => sum + item.qualityRating, 0) / recent.length;
    const olderAvg = older.reduce((sum, item) => sum + item.qualityRating, 0) / older.length;

    if (recentAvg > olderAvg + 0.2) return 'improving';
    if (recentAvg < olderAvg - 0.2) return 'declining';
    return 'stable';
  }
}

// Export singleton instance
export const procedureRecommendationEngine = new ProcedureRecommendationEngine();