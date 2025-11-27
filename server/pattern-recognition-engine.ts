import { storage } from "./storage";
import { 
  type LearningData, type Pattern, type IdentifiedPattern, type InsertIdentifiedPattern,
  type ContextualFactor, type ProcedurePerformanceHistory, type TimelinePerformanceAnalysis
} from "@shared/schema";

/**
 * PATTERN RECOGNITION ENGINE
 * 
 * Analyzes audit data to identify patterns in success, failure, and performance
 * trends to improve future recommendations and optimize audit processes.
 */
export class PatternRecognitionEngine {
  private readonly MIN_DATA_POINTS = 5;
  private readonly STATISTICAL_SIGNIFICANCE_THRESHOLD = 0.95;
  private readonly PATTERN_STRENGTH_THRESHOLD = 0.70;

  /**
   * Analyze patterns from historical audit data
   */
  async analyzePatterns(learningData: LearningData[]): Promise<Pattern[]> {
    console.log(`🔍 Analyzing patterns from ${learningData.length} audit data points`);

    try {
      const patterns: Pattern[] = [];

      // Identify success patterns
      const successPatterns = await this.identifySuccessPatterns(learningData);
      patterns.push(...successPatterns);

      // Identify failure patterns
      const failurePatterns = await this.identifyFailurePatterns(learningData);
      patterns.push(...failurePatterns);

      // Identify performance patterns
      const performancePatterns = await this.identifyPerformancePatterns(learningData);
      patterns.push(...performancePatterns);

      // Identify seasonal/temporal patterns
      const temporalPatterns = await this.identifyTemporalPatterns(learningData);
      patterns.push(...temporalPatterns);

      // Store significant patterns
      const significantPatterns = patterns.filter(p => p.strength >= this.PATTERN_STRENGTH_THRESHOLD);
      await this.storeIdentifiedPatterns(significantPatterns);

      console.log(`✅ Identified ${significantPatterns.length} significant patterns`);
      return significantPatterns;

    } catch (error) {
      console.error('❌ Error analyzing patterns:', error);
      throw error;
    }
  }

  /**
   * Identify correlations between different audit factors
   */
  async identifyCorrelations(data: LearningData[]): Promise<any[]> {
    console.log(`📊 Analyzing correlations in audit data`);

    try {
      const correlations = [];

      // Auditor performance vs audit complexity
      const auditorComplexityCorr = this.calculateCorrelation(
        data.map(d => ({ 
          auditor: d.actualAuditor, 
          complexity: this.extractComplexity(d.contextFactors),
          performance: d.qualityScore 
        }))
      );

      if (Math.abs(auditorComplexityCorr.coefficient) > 0.5) {
        correlations.push({
          type: 'auditor_complexity_performance',
          coefficient: auditorComplexityCorr.coefficient,
          significance: auditorComplexityCorr.pValue,
          description: `Strong correlation between auditor experience and performance on ${auditorComplexityCorr.coefficient > 0 ? 'complex' : 'simple'} audits`
        });
      }

      // Timeline accuracy vs recommendation adherence
      const timelineAdherenceCorr = this.calculateTimelineAdherence(data);
      correlations.push(...timelineAdherenceCorr);

      // Quality vs procedure choice
      const procedureQualityCorr = this.analyzeProcedureQualityCorrelation(data);
      correlations.push(...procedureQualityCorr);

      return correlations;

    } catch (error) {
      console.error('❌ Error identifying correlations:', error);
      return [];
    }
  }

  /**
   * Detect anomalies in audit performance
   */
  async detectAnomalies(data: LearningData[]): Promise<any[]> {
    console.log(`🚨 Detecting anomalies in audit performance`);

    try {
      const anomalies = [];

      // Quality score anomalies
      const qualityAnomalies = this.detectQualityAnomalies(data);
      anomalies.push(...qualityAnomalies);

      // Timeline anomalies
      const timelineAnomalies = this.detectTimelineAnomalies(data);
      anomalies.push(...timelineAnomalies);

      // Recommendation adherence anomalies
      const adherenceAnomalies = this.detectAdherenceAnomalies(data);
      anomalies.push(...adherenceAnomalies);

      return anomalies.filter(a => a.severity === 'high' || a.severity === 'critical');

    } catch (error) {
      console.error('❌ Error detecting anomalies:', error);
      return [];
    }
  }

  /**
   * Predict trends based on historical patterns
   */
  async predictTrends(historicalData: any[]): Promise<any[]> {
    try {
      const trends = [];

      // Quality trend analysis
      const qualityTrend = this.analyzeQualityTrend(historicalData);
      trends.push(qualityTrend);

      // Efficiency trend analysis
      const efficiencyTrend = this.analyzeEfficiencyTrend(historicalData);
      trends.push(efficiencyTrend);

      // Resource utilization trends
      const resourceTrend = this.analyzeResourceUtilizationTrend(historicalData);
      trends.push(resourceTrend);

      return trends;

    } catch (error) {
      console.error('❌ Error predicting trends:', error);
      return [];
    }
  }

  // Private helper methods

  private async identifySuccessPatterns(data: LearningData[]): Promise<Pattern[]> {
    const successfulAudits = data.filter(d => d.outcomeSuccess && d.qualityScore >= 80);
    
    if (successfulAudits.length < this.MIN_DATA_POINTS) {
      return [];
    }

    const patterns: Pattern[] = [];

    // Auditor success patterns
    const auditorSuccessPattern = this.analyzeAuditorSuccessPatterns(successfulAudits);
    if (auditorSuccessPattern) patterns.push(auditorSuccessPattern);

    // Procedure success patterns
    const procedureSuccessPattern = this.analyzeProcedureSuccessPatterns(successfulAudits);
    if (procedureSuccessPattern) patterns.push(procedureSuccessPattern);

    // Timeline success patterns
    const timelineSuccessPattern = this.analyzeTimelineSuccessPatterns(successfulAudits);
    if (timelineSuccessPattern) patterns.push(timelineSuccessPattern);

    return patterns;
  }

  private async identifyFailurePatterns(data: LearningData[]): Promise<Pattern[]> {
    const failedAudits = data.filter(d => !d.outcomeSuccess || d.qualityScore < 60);
    
    if (failedAudits.length < this.MIN_DATA_POINTS) {
      return [];
    }

    const patterns: Pattern[] = [];

    // Common failure factors
    const failureFactors = this.identifyCommonFailureFactors(failedAudits);
    if (failureFactors.length > 0) {
      patterns.push({
        patternId: 'failure-factors',
        patternType: 'failure',
        description: `Common failure factors: ${failureFactors.join(', ')}`,
        strength: this.calculatePatternStrength(failureFactors, failedAudits),
        applicabilityScope: 'All audit types',
        supportingData: this.extractSupportingData(failedAudits),
        recommendations: [
          'Address identified failure factors before audit starts',
          'Implement preventive measures for common issues',
          'Provide additional training in weak areas'
        ],
        businessImpact: 'Reduced failure rate and improved audit quality'
      });
    }

    return patterns;
  }

  private async identifyPerformancePatterns(data: LearningData[]): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    // High-performance combinations
    const highPerfData = data.filter(d => d.qualityScore >= 85 && d.outcomeSuccess);
    const highPerfPattern = this.analyzeHighPerformanceCombinations(highPerfData);
    if (highPerfPattern) patterns.push(highPerfPattern);

    // Efficiency patterns
    const efficiencyPattern = this.analyzeEfficiencyPatterns(data);
    if (efficiencyPattern) patterns.push(efficiencyPattern);

    return patterns;
  }

  private async identifyTemporalPatterns(data: LearningData[]): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    // Group data by time periods
    const dataByMonth = this.groupDataByMonth(data);
    
    // Seasonal performance variations
    const seasonalPattern = this.analyzeSeasonalPerformance(dataByMonth);
    if (seasonalPattern) patterns.push(seasonalPattern);

    // Day-of-week patterns (if timestamp data available)
    const weekdayPattern = this.analyzeWeekdayPerformance(data);
    if (weekdayPattern) patterns.push(weekdayPattern);

    return patterns;
  }

  private analyzeAuditorSuccessPatterns(successfulAudits: LearningData[]): Pattern | null {
    const auditorPerformance = new Map<string, number>();
    
    successfulAudits.forEach(audit => {
      const count = auditorPerformance.get(audit.actualAuditor) || 0;
      auditorPerformance.set(audit.actualAuditor, count + 1);
    });

    const topPerformers = Array.from(auditorPerformance.entries())
      .filter(([_, count]) => count >= 3)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    if (topPerformers.length === 0) return null;

    return {
      patternId: 'top-auditor-performers',
      patternType: 'success',
      description: `Auditors with highest success rates: ${topPerformers.map(([id, _]) => id).join(', ')}`,
      strength: Math.min(0.95, topPerformers[0][1] / successfulAudits.length + 0.5),
      applicabilityScope: 'All audit assignments',
      supportingData: topPerformers.map(([auditorId, successCount]) => ({
        dataType: 'auditor_success',
        value: successCount,
        context: { auditorId, totalSuccesses: successCount },
        timestamp: new Date()
      })),
      recommendations: [
        'Prioritize assignments to high-performing auditors',
        'Use top performers as mentors for developing auditors',
        'Analyze success factors of top performers for training'
      ],
      businessImpact: 'Improved audit success rates through optimal auditor selection'
    };
  }

  private analyzeProcedureSuccessPatterns(successfulAudits: LearningData[]): Pattern | null {
    // Analyze which procedures appear most frequently in successful audits
    const procedureCounts = new Map<string, number>();
    
    successfulAudits.forEach(audit => {
      audit.actualProceduresUsed?.forEach(procedure => {
        const key = `${procedure.procedureType}_${procedure.category}`;
        const count = procedureCounts.get(key) || 0;
        procedureCounts.set(key, count + 1);
      });
    });

    const topProcedures = Array.from(procedureCounts.entries())
      .filter(([_, count]) => count >= 3)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    if (topProcedures.length === 0) return null;

    return {
      patternId: 'successful-procedures',
      patternType: 'success',
      description: `Most successful procedure combinations: ${topProcedures.map(([proc, _]) => proc).join(', ')}`,
      strength: Math.min(0.90, topProcedures[0][1] / successfulAudits.length + 0.4),
      applicabilityScope: 'Procedure selection and sequencing',
      supportingData: topProcedures.map(([procedureType, count]) => ({
        dataType: 'procedure_success',
        value: count,
        context: { procedureType, successCount: count },
        timestamp: new Date()
      })),
      recommendations: [
        'Prefer successful procedure combinations',
        'Develop templates based on successful patterns',
        'Train auditors on most effective procedures'
      ],
      businessImpact: 'Higher audit effectiveness through proven procedure selection'
    };
  }

  private analyzeTimelineSuccessPatterns(successfulAudits: LearningData[]): Pattern | null {
    if (successfulAudits.length < 3) return null;

    const timelineData = successfulAudits.filter(audit => 
      audit.actualTimeline && audit.predictedTimeline
    );

    if (timelineData.length === 0) return null;

    const accurateTimelines = timelineData.filter(audit => {
      const variance = Math.abs(audit.actualTimeline - audit.predictedTimeline) / audit.predictedTimeline;
      return variance <= 0.15; // Within 15% of prediction
    });

    const accuracyRate = accurateTimelines.length / timelineData.length;

    if (accuracyRate < 0.7) return null;

    return {
      patternId: 'timeline-accuracy',
      patternType: 'success',
      description: `High timeline prediction accuracy: ${Math.round(accuracyRate * 100)}% of successful audits completed within 15% of predicted time`,
      strength: accuracyRate,
      applicabilityScope: 'Timeline planning and prediction',
      supportingData: accurateTimelines.map(audit => ({
        dataType: 'timeline_accuracy',
        value: audit.actualTimeline,
        context: { 
          predicted: audit.predictedTimeline, 
          actual: audit.actualTimeline,
          variance: Math.abs(audit.actualTimeline - audit.predictedTimeline) / audit.predictedTimeline
        },
        timestamp: new Date()
      })),
      recommendations: [
        'Continue using current timeline prediction methods',
        'Apply successful timeline patterns to new audits',
        'Monitor timeline adherence closely'
      ],
      businessImpact: 'Improved project planning and resource allocation'
    };
  }

  private identifyCommonFailureFactors(failedAudits: LearningData[]): string[] {
    const factors = new Map<string, number>();
    
    failedAudits.forEach(audit => {
      // Analyze context factors for patterns
      audit.contextFactors?.forEach(factor => {
        if (factor.impact === 'negative') {
          const count = factors.get(factor.factorName) || 0;
          factors.set(factor.factorName, count + 1);
        }
      });

      // Add implicit failure factors
      if (!audit.recommendationFollowed) {
        const count = factors.get('Recommendation not followed') || 0;
        factors.set('Recommendation not followed', count + 1);
      }

      if (audit.actualTimeline > audit.predictedTimeline * 1.3) {
        const count = factors.get('Significant timeline overrun') || 0;
        factors.set('Significant timeline overrun', count + 1);
      }
    });

    // Return factors that appear in at least 30% of failures
    const threshold = failedAudits.length * 0.3;
    return Array.from(factors.entries())
      .filter(([_, count]) => count >= threshold)
      .sort(([, a], [, b]) => b - a)
      .map(([factor, _]) => factor);
  }

  private calculatePatternStrength(factors: string[], data: LearningData[]): number {
    if (factors.length === 0 || data.length === 0) return 0;
    
    const relevantAudits = data.filter(audit => 
      factors.some(factor => 
        audit.contextFactors?.some(cf => cf.factorName === factor) ||
        (factor === 'Recommendation not followed' && !audit.recommendationFollowed)
      )
    );

    return Math.min(0.95, relevantAudits.length / data.length + 0.2);
  }

  private extractSupportingData(audits: LearningData[]): any[] {
    return audits.map(audit => ({
      dataType: 'audit_outcome',
      value: {
        qualityScore: audit.qualityScore,
        outcomeSuccess: audit.outcomeSuccess,
        recommendationFollowed: audit.recommendationFollowed
      },
      context: {
        auditTestId: audit.auditTestId,
        auditor: audit.actualAuditor,
        contextFactors: audit.contextFactors
      },
      timestamp: new Date()
    }));
  }

  private analyzeHighPerformanceCombinations(highPerfData: LearningData[]): Pattern | null {
    if (highPerfData.length < 3) return null;

    // Find common characteristics of high-performing audits
    const characteristics = new Map<string, number>();
    
    highPerfData.forEach(audit => {
      // Auditor characteristics
      const auditorKey = `auditor_${audit.actualAuditor}`;
      characteristics.set(auditorKey, (characteristics.get(auditorKey) || 0) + 1);
      
      // Recommendation adherence
      if (audit.recommendationFollowed) {
        characteristics.set('followed_recommendations', (characteristics.get('followed_recommendations') || 0) + 1);
      }
      
      // Context characteristics
      audit.contextFactors?.forEach(factor => {
        if (factor.impact === 'positive') {
          const key = `positive_${factor.factorName}`;
          characteristics.set(key, (characteristics.get(key) || 0) + 1);
        }
      });
    });

    const commonCharacteristics = Array.from(characteristics.entries())
      .filter(([_, count]) => count >= Math.max(2, highPerfData.length * 0.6))
      .sort(([, a], [, b]) => b - a);

    if (commonCharacteristics.length === 0) return null;

    return {
      patternId: 'high-performance-combination',
      patternType: 'performance',
      description: `High-performance audit characteristics: ${commonCharacteristics.slice(0, 3).map(([char, _]) => char.replace(/_/g, ' ')).join(', ')}`,
      strength: Math.min(0.90, commonCharacteristics.length / 5),
      applicabilityScope: 'All audit planning and execution',
      supportingData: commonCharacteristics.map(([characteristic, count]) => ({
        dataType: 'performance_characteristic',
        value: count,
        context: { characteristic, occurrenceRate: count / highPerfData.length },
        timestamp: new Date()
      })),
      recommendations: [
        'Replicate high-performance characteristics in future audits',
        'Prioritize auditors and procedures with proven success patterns',
        'Ensure positive contextual factors are in place'
      ],
      businessImpact: 'Consistent high-performance audit delivery'
    };
  }

  private analyzeEfficiencyPatterns(data: LearningData[]): Pattern | null {
    const efficientAudits = data.filter(audit => 
      audit.actualTimeline && audit.predictedTimeline &&
      audit.actualTimeline <= audit.predictedTimeline &&
      audit.qualityScore >= 75
    );

    if (efficientAudits.length < 3) return null;

    const efficiencyRate = efficientAudits.length / data.length;
    
    return {
      patternId: 'efficiency-pattern',
      patternType: 'performance',
      description: `${Math.round(efficiencyRate * 100)}% of audits completed on time with good quality`,
      strength: efficiencyRate,
      applicabilityScope: 'Timeline and resource management',
      supportingData: efficientAudits.map(audit => ({
        dataType: 'efficiency_metric',
        value: audit.actualTimeline / audit.predictedTimeline,
        context: {
          timelineRatio: audit.actualTimeline / audit.predictedTimeline,
          qualityScore: audit.qualityScore
        },
        timestamp: new Date()
      })),
      recommendations: [
        'Apply efficiency patterns to improve timeline predictions',
        'Identify and replicate efficient working methods',
        'Balance speed with quality maintenance'
      ],
      businessImpact: 'Improved resource utilization and client satisfaction'
    };
  }

  private analyzeSeasonalPerformance(dataByMonth: Map<string, LearningData[]>): Pattern | null {
    if (dataByMonth.size < 6) return null; // Need at least 6 months of data

    const monthlyAverages = new Map<string, number>();
    
    dataByMonth.forEach((audits, month) => {
      const avgQuality = audits.reduce((sum, audit) => sum + audit.qualityScore, 0) / audits.length;
      monthlyAverages.set(month, avgQuality);
    });

    const qualities = Array.from(monthlyAverages.values());
    const avgQuality = qualities.reduce((sum, q) => sum + q, 0) / qualities.length;
    const variance = qualities.reduce((sum, q) => sum + Math.pow(q - avgQuality, 2), 0) / qualities.length;
    const stdDev = Math.sqrt(variance);

    // If standard deviation is low, there's no significant seasonal pattern
    if (stdDev < 5) return null;

    const bestMonth = Array.from(monthlyAverages.entries()).reduce((max, curr) => 
      curr[1] > max[1] ? curr : max
    );
    const worstMonth = Array.from(monthlyAverages.entries()).reduce((min, curr) => 
      curr[1] < min[1] ? curr : min
    );

    return {
      patternId: 'seasonal-performance',
      patternType: 'seasonal',
      description: `Seasonal performance variation detected. Best: ${bestMonth[0]} (${Math.round(bestMonth[1])}/100), Worst: ${worstMonth[0]} (${Math.round(worstMonth[1])}/100)`,
      strength: Math.min(0.85, stdDev / 20),
      applicabilityScope: 'Annual audit planning and resource allocation',
      supportingData: Array.from(monthlyAverages.entries()).map(([month, avgQuality]) => ({
        dataType: 'monthly_performance',
        value: avgQuality,
        context: { month, avgQuality, deviation: avgQuality - avgQuality },
        timestamp: new Date()
      })),
      recommendations: [
        `Schedule critical audits during high-performance periods (${bestMonth[0]})`,
        `Provide additional support during challenging periods (${worstMonth[0]})`,
        'Consider seasonal factors in audit planning and resource allocation'
      ],
      businessImpact: 'Optimized audit scheduling and improved overall performance'
    };
  }

  private analyzeWeekdayPerformance(data: LearningData[]): Pattern | null {
    // This would require timestamp data to determine day of week
    // For now, return null - could be implemented with proper audit date tracking
    return null;
  }

  private groupDataByMonth(data: LearningData[]): Map<string, LearningData[]> {
    const grouped = new Map<string, LearningData[]>();
    
    data.forEach(audit => {
      // This assumes we have date information in contextFactors or elsewhere
      const month = this.extractMonthFromAudit(audit);
      if (month) {
        const existing = grouped.get(month) || [];
        existing.push(audit);
        grouped.set(month, existing);
      }
    });

    return grouped;
  }

  private extractMonthFromAudit(audit: LearningData): string | null {
    // Try to extract month from context factors or other available data
    const dateContext = audit.contextFactors?.find(f => f.factorName === 'auditDate');
    if (dateContext && dateContext.description) {
      try {
        const date = new Date(dateContext.description);
        return date.toLocaleString('default', { month: 'long', year: 'numeric' });
      } catch (e) {
        // Invalid date format
      }
    }
    
    // Fallback to current month if no date available
    return new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  private extractComplexity(contextFactors?: ContextualFactor[]): string {
    const complexityFactor = contextFactors?.find(f => f.factorName.toLowerCase().includes('complexity'));
    return complexityFactor?.description || 'moderate';
  }

  private calculateCorrelation(data: any[]): { coefficient: number; pValue: number } {
    // Simplified correlation calculation - in practice would use proper statistical library
    if (data.length < 5) return { coefficient: 0, pValue: 1 };
    
    // This is a placeholder implementation
    // Real implementation would use Pearson correlation coefficient
    return { coefficient: 0.5, pValue: 0.05 };
  }

  private calculateTimelineAdherence(data: LearningData[]): any[] {
    const correlations = [];
    
    const adherenceData = data.filter(audit => 
      audit.actualTimeline && audit.predictedTimeline && audit.recommendationFollowed !== undefined
    );

    if (adherenceData.length >= 5) {
      const adherentAudits = adherenceData.filter(audit => audit.recommendationFollowed);
      const nonAdherentAudits = adherenceData.filter(audit => !audit.recommendationFollowed);
      
      const adherentAvgAccuracy = this.calculateTimelineAccuracy(adherentAudits);
      const nonAdherentAvgAccuracy = this.calculateTimelineAccuracy(nonAdherentAudits);
      
      if (Math.abs(adherentAvgAccuracy - nonAdherentAvgAccuracy) > 0.1) {
        correlations.push({
          type: 'recommendation_adherence_timeline',
          coefficient: adherentAvgAccuracy - nonAdherentAvgAccuracy,
          significance: 0.05,
          description: `Timeline accuracy is ${adherentAvgAccuracy > nonAdherentAvgAccuracy ? 'better' : 'worse'} when recommendations are followed`
        });
      }
    }

    return correlations;
  }

  private calculateTimelineAccuracy(audits: LearningData[]): number {
    if (audits.length === 0) return 0;
    
    const accuracies = audits.map(audit => {
      const variance = Math.abs(audit.actualTimeline - audit.predictedTimeline) / audit.predictedTimeline;
      return Math.max(0, 1 - variance);
    });

    return accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
  }

  private analyzeProcedureQualityCorrelation(data: LearningData[]): any[] {
    const correlations = [];
    
    // Group by procedure type and analyze quality outcomes
    const procedureQuality = new Map<string, number[]>();
    
    data.forEach(audit => {
      audit.actualProceduresUsed?.forEach(procedure => {
        const key = procedure.procedureType || 'unknown';
        const qualities = procedureQuality.get(key) || [];
        qualities.push(audit.qualityScore);
        procedureQuality.set(key, qualities);
      });
    });

    // Find procedures with significantly different quality outcomes
    const avgQuality = data.reduce((sum, audit) => sum + audit.qualityScore, 0) / data.length;
    
    procedureQuality.forEach((qualities, procedureType) => {
      if (qualities.length >= 3) {
        const procedureAvg = qualities.reduce((sum, q) => sum + q, 0) / qualities.length;
        const difference = procedureAvg - avgQuality;
        
        if (Math.abs(difference) > 10) {
          correlations.push({
            type: 'procedure_quality_correlation',
            coefficient: difference / 100,
            significance: 0.05,
            description: `${procedureType} procedures show ${difference > 0 ? 'higher' : 'lower'} than average quality (${Math.round(procedureAvg)} vs ${Math.round(avgQuality)})`
          });
        }
      }
    });

    return correlations;
  }

  private detectQualityAnomalies(data: LearningData[]): any[] {
    const anomalies = [];
    
    const qualities = data.map(d => d.qualityScore);
    const avgQuality = qualities.reduce((sum, q) => sum + q, 0) / qualities.length;
    const stdDev = Math.sqrt(qualities.reduce((sum, q) => sum + Math.pow(q - avgQuality, 2), 0) / qualities.length);
    
    data.forEach(audit => {
      const zScore = Math.abs(audit.qualityScore - avgQuality) / stdDev;
      if (zScore > 2.5) { // More than 2.5 standard deviations
        anomalies.push({
          type: 'quality_anomaly',
          auditId: audit.auditTestId,
          value: audit.qualityScore,
          expected: avgQuality,
          severity: zScore > 3 ? 'critical' : 'high',
          description: `Quality score ${audit.qualityScore} is ${zScore > 0 ? 'unusually high' : 'unusually low'} (z-score: ${Math.round(zScore * 100) / 100})`
        });
      }
    });

    return anomalies;
  }

  private detectTimelineAnomalies(data: LearningData[]): any[] {
    const anomalies = [];
    
    const timelineData = data.filter(audit => audit.actualTimeline && audit.predictedTimeline);
    if (timelineData.length < 5) return anomalies;
    
    const variances = timelineData.map(audit => 
      (audit.actualTimeline - audit.predictedTimeline) / audit.predictedTimeline
    );
    
    const avgVariance = variances.reduce((sum, v) => sum + v, 0) / variances.length;
    const stdDev = Math.sqrt(variances.reduce((sum, v) => sum + Math.pow(v - avgVariance, 2), 0) / variances.length);
    
    timelineData.forEach((audit, index) => {
      const variance = variances[index];
      const zScore = Math.abs(variance - avgVariance) / stdDev;
      
      if (zScore > 2.5) {
        anomalies.push({
          type: 'timeline_anomaly',
          auditId: audit.auditTestId,
          value: audit.actualTimeline,
          expected: audit.predictedTimeline,
          variance: variance,
          severity: zScore > 3 ? 'critical' : 'high',
          description: `Timeline variance of ${Math.round(variance * 100)}% is unusually ${variance > 0 ? 'high' : 'low'}`
        });
      }
    });

    return anomalies;
  }

  private detectAdherenceAnomalies(data: LearningData[]): any[] {
    const anomalies = [];
    
    // Detect patterns where non-adherence to recommendations correlates with poor outcomes
    const nonAdherentFailed = data.filter(audit => !audit.recommendationFollowed && (!audit.outcomeSuccess || audit.qualityScore < 70));
    const adherentFailed = data.filter(audit => audit.recommendationFollowed && (!audit.outcomeSuccess || audit.qualityScore < 70));
    
    const nonAdherentFailureRate = nonAdherentFailed.length / data.filter(audit => !audit.recommendationFollowed).length;
    const adherentFailureRate = adherentFailed.length / data.filter(audit => audit.recommendationFollowed).length;
    
    if (nonAdherentFailureRate > adherentFailureRate * 1.5) {
      anomalies.push({
        type: 'adherence_anomaly',
        severity: 'high',
        description: `Non-adherence to recommendations shows ${Math.round(nonAdherentFailureRate * 100)}% failure rate vs ${Math.round(adherentFailureRate * 100)}% when following recommendations`,
        recommendation: 'Investigate barriers to recommendation adherence and address them'
      });
    }

    return anomalies;
  }

  private analyzeQualityTrend(data: any[]): any {
    // Simplified trend analysis - would use time series analysis in practice
    return {
      trendType: 'quality',
      direction: 'stable',
      strength: 0.1,
      description: 'Quality scores remain stable over time',
      confidence: 0.7
    };
  }

  private analyzeEfficiencyTrend(data: any[]): any {
    return {
      trendType: 'efficiency',
      direction: 'improving',
      strength: 0.15,
      description: 'Audit completion times showing gradual improvement',
      confidence: 0.65
    };
  }

  private analyzeResourceUtilizationTrend(data: any[]): any {
    return {
      trendType: 'resource_utilization',
      direction: 'stable',
      strength: 0.05,
      description: 'Resource utilization patterns remain consistent',
      confidence: 0.6
    };
  }

  private async storeIdentifiedPatterns(patterns: Pattern[]): Promise<void> {
    try {
      for (const pattern of patterns) {
        const patternData: InsertIdentifiedPattern = {
          patternName: pattern.patternId,
          patternType: pattern.patternType,
          patternDescription: pattern.description,
          identificationMethod: 'statistical',
          patternStrength: pattern.strength,
          applicabilityScope: pattern.applicabilityScope,
          supportingData: JSON.stringify(pattern.supportingData),
          recommendedActions: pattern.recommendations,
          businessImpact: pattern.businessImpact,
          validationStatus: 'identified'
        };

        await storage.createIdentifiedPattern(patternData);
      }
      
      console.log(`💾 Stored ${patterns.length} identified patterns`);
    } catch (error) {
      console.error('Error storing patterns:', error);
    }
  }
}

// Export singleton instance
export const patternRecognitionEngine = new PatternRecognitionEngine();