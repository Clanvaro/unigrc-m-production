import { storage } from "./storage";
import { 
  type AuditContext, type AuditorRecommendation, type PerformanceEstimate,
  type HistoricalPerformance, type SkillAlignment, type WorkloadAnalysis, 
  type TeamCompatibility, type LearningData, type User, type AuditorExpertiseProfile,
  type InsertAuditorExpertiseProfile, type SkillMatch, type SkillGap
} from "@shared/schema";

/**
 * AUDITOR ASSIGNMENT INTELLIGENCE
 * 
 * Analyzes auditor skills, performance history, and availability to provide
 * intelligent recommendations for optimal auditor assignments.
 */
export class AuditorAssignmentIntelligence {
  private readonly PERFORMANCE_WINDOW_MONTHS = 12;
  private readonly MIN_PERFORMANCE_DATA_POINTS = 3;
  private readonly WORKLOAD_THRESHOLD = 80; // percentage

  /**
   * Recommend optimal auditors for a given audit context
   */
  async recommendOptimalAuditors(context: AuditContext): Promise<AuditorRecommendation[]> {
    console.log(`👥 Analyzing auditor assignments for ${context.complexityLevel} complexity audit`);

    try {
      // Get all available auditors
      const availableAuditors = await this.getAvailableAuditors();
      
      // Analyze each auditor for this context
      const auditorAnalyses = await Promise.all(
        availableAuditors.map(auditor => this.analyzeAuditorForContext(auditor, context))
      );

      // Filter and sort by match score
      const recommendations = auditorAnalyses
        .filter(analysis => analysis.matchScore >= 60) // Only recommend auditors with reasonable match
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 5); // Top 5 recommendations

      console.log(`✅ Generated ${recommendations.length} auditor recommendations`);
      return recommendations;

    } catch (error) {
      console.error('❌ Error generating auditor recommendations:', error);
      throw error;
    }
  }

  /**
   * Predict auditor performance for specific context
   */
  async predictPerformance(auditorId: string, context: AuditContext): Promise<PerformanceEstimate> {
    try {
      const auditor = await storage.getUser(auditorId);
      const expertiseProfile = await this.getAuditorExpertise(auditorId);
      const historicalPerformance = await this.getHistoricalPerformance(auditorId);

      // Handle case where auditor doesn't exist (for sample/test data)
      if (!auditor) {
        console.log(`⚠️ Auditor ${auditorId} not found, using default predictions`);
        return this.getDefaultPerformanceEstimate();
      }

      // Calculate performance predictions
      const expectedQualityScore = this.predictQualityScore(expertiseProfile, context, historicalPerformance);
      const expectedCompletionTime = this.predictCompletionTime(auditorId, context, historicalPerformance);
      const successProbability = this.calculateSuccessProbability(expertiseProfile, context, historicalPerformance);

      // Identify potential risk factors
      const riskFactors = await this.identifyRiskFactors(auditorId, context);

      return {
        expectedQualityScore: Math.round(expectedQualityScore),
        expectedCompletionTime: Math.round(expectedCompletionTime * 10) / 10,
        successProbability: Math.round(successProbability),
        riskFactors,
        mitigationStrategies: this.generateMitigationStrategies(riskFactors)
      };

    } catch (error) {
      console.error(`❌ Error predicting performance for auditor ${auditorId}:`, error);
      throw error;
    }
  }

  /**
   * Update auditor profiles based on learning from completed audits
   */
  async updateWithLearning(learningData: LearningData[]): Promise<void> {
    console.log(`📚 Processing auditor performance data from ${learningData.length} completed audits`);

    try {
      const auditorUpdates = new Map<string, any>();

      for (const data of learningData) {
        if (data.actualAuditor) {
          // Aggregate performance data for each auditor
          if (!auditorUpdates.has(data.actualAuditor)) {
            auditorUpdates.set(data.actualAuditor, {
              auditorId: data.actualAuditor,
              completedAudits: 0,
              totalQualityScore: 0,
              totalTime: 0,
              successes: 0,
              riskExposure: new Set<string>()
            });
          }

          const update = auditorUpdates.get(data.actualAuditor);
          update.completedAudits++;
          update.totalQualityScore += data.qualityScore;
          update.totalTime += data.actualTimeline;
          if (data.outcomeSuccess) update.successes++;
          
          // Track risk categories handled
          data.contextFactors?.forEach(factor => {
            if (factor.factorName === 'riskCategory') {
              update.riskExposure.add(factor.description);
            }
          });
        }
      }

      // Update each auditor's expertise profile
      for (const [auditorId, updateData] of auditorUpdates) {
        await this.updateAuditorExpertiseProfile(auditorId, updateData);
      }

      console.log(`✅ Updated expertise profiles for ${auditorUpdates.size} auditors`);

    } catch (error) {
      console.error('❌ Error updating auditor profiles with learning:', error);
      throw error;
    }
  }

  /**
   * Analyze workload balance and recommend reassignments
   */
  async analyzeWorkloadBalance(): Promise<any> {
    try {
      const auditors = await this.getAvailableAuditors();
      const workloadAnalyses = await Promise.all(
        auditors.map(auditor => this.analyzeCurrentWorkload(auditor.id))
      );

      const overloaded = workloadAnalyses.filter(analysis => analysis.currentUtilization > this.WORKLOAD_THRESHOLD);
      const underutilized = workloadAnalyses.filter(analysis => analysis.currentUtilization < 50);

      return {
        overloaded: overloaded.length,
        underutilized: underutilized.length,
        averageUtilization: workloadAnalyses.reduce((sum, w) => sum + w.currentUtilization, 0) / workloadAnalyses.length,
        recommendations: this.generateWorkloadRecommendations(workloadAnalyses)
      };

    } catch (error) {
      console.error('❌ Error analyzing workload balance:', error);
      throw error;
    }
  }

  // Private helper methods

  private async getAvailableAuditors(): Promise<User[]> {
    try {
      // Get users with auditor role
      const auditors = await storage.getUsersByRole('auditor');
      return auditors.filter(auditor => auditor.isActive);
    } catch (error) {
      console.error('Error fetching available auditors:', error);
      return [];
    }
  }

  private async analyzeAuditorForContext(auditor: User, context: AuditContext): Promise<AuditorRecommendation> {
    const expertiseProfile = await this.getAuditorExpertise(auditor.id);
    const historicalPerformance = await this.getHistoricalPerformance(auditor.id);
    const workloadAnalysis = await this.analyzeCurrentWorkload(auditor.id);
    const skillAlignment = await this.analyzeSkillAlignment(auditor.id, context);

    // Calculate match score
    const matchScore = this.calculateMatchScore(expertiseProfile, context, skillAlignment, workloadAnalysis);

    // Identify strengths and challenges
    const strengths = this.identifyStrengths(expertiseProfile, context);
    const potentialChallenges = this.identifyPotentialChallenges(expertiseProfile, context, workloadAnalysis);

    // Determine availability status
    const availabilityStatus = this.determineAvailabilityStatus(workloadAnalysis);

    // Check if this would be a learning opportunity
    const learningOpportunity = this.isLearningOpportunity(expertiseProfile, context);

    // Get team compatibility (placeholder - would need team data)
    const teamCompatibility = await this.assessTeamCompatibility(auditor.id);

    return {
      auditorId: auditor.id,
      auditorName: auditor.fullName || auditor.username || 'Unknown',
      matchScore,
      strengths,
      potentialChallenges,
      estimatedPerformance: await this.predictPerformance(auditor.id, context),
      availabilityStatus,
      learningOpportunity,
      historicalPerformance,
      skillAlignment,
      workloadAnalysis,
      teamCompatibility
    };
  }

  private async getAuditorExpertise(auditorId: string): Promise<AuditorExpertiseProfile> {
    try {
      let profile = await storage.getAuditorExpertiseProfile(auditorId);
      
      if (!profile) {
        // Create default profile if none exists
        profile = await this.createDefaultExpertiseProfile(auditorId);
      }
      
      return profile;
    } catch (error) {
      console.error(`Error getting auditor expertise for ${auditorId}:`, error);
      return this.getDefaultProfile(auditorId);
    }
  }

  private async getHistoricalPerformance(auditorId: string): Promise<HistoricalPerformance> {
    try {
      const auditHistory = await storage.getAuditorPerformanceHistory(auditorId, this.PERFORMANCE_WINDOW_MONTHS);
      
      if (auditHistory.length < this.MIN_PERFORMANCE_DATA_POINTS) {
        return this.getDefaultPerformance();
      }

      const completedAudits = auditHistory.filter(audit => audit.status === 'completed');
      const avgQualityScore = completedAudits.reduce((sum, audit) => sum + (audit.qualityScore || 75), 0) / completedAudits.length;
      
      const completionReliability = completedAudits.length / auditHistory.length;
      const onTimeAudits = completedAudits.filter(audit => audit.completedOnTime);
      const timeAccuracy = onTimeAudits.length / completedAudits.length;
      
      const findingsEffectiveness = completedAudits.reduce((sum, audit) => sum + (audit.findingsCount || 0), 0) / completedAudits.length;
      
      return {
        averageQualityScore: Math.round(avgQualityScore),
        completionReliability: Math.round(completionReliability * 100),
        timeEstimateAccuracy: Math.round(timeAccuracy * 100),
        findingsEffectiveness: Math.round(findingsEffectiveness * 20), // Convert to 0-100 scale
        clientSatisfaction: 75, // Placeholder - would need client feedback data
        improvementTrend: this.calculateImprovementTrend(auditHistory)
      };

    } catch (error) {
      console.error(`Error getting historical performance for ${auditorId}:`, error);
      return this.getDefaultPerformance();
    }
  }

  private async analyzeCurrentWorkload(auditorId: string): Promise<WorkloadAnalysis> {
    try {
      const activeAssignments = await storage.getActiveAuditorAssignments(auditorId);
      const totalHoursAssigned = activeAssignments.reduce((sum, assignment) => 
        sum + (assignment.estimatedHours || 0), 0
      );
      
      const weeklyCapacity = 40; // Standard work week
      const currentUtilization = Math.round((totalHoursAssigned / weeklyCapacity) * 100);
      const availableCapacity = Math.max(0, weeklyCapacity - totalHoursAssigned);
      
      const schedulingFlexibility = this.assessSchedulingFlexibility(activeAssignments);
      const overcommitmentRisk = this.assessOvercommitmentRisk(currentUtilization, activeAssignments);

      return {
        currentUtilization,
        availableCapacity,
        schedulingFlexibility,
        overcommitmentRisk,
        recommendations: this.generateWorkloadRecommendations([{ currentUtilization } as any])
      };

    } catch (error) {
      console.error(`Error analyzing workload for ${auditorId}:`, error);
      return {
        currentUtilization: 50,
        availableCapacity: 20,
        schedulingFlexibility: 70,
        overcommitmentRisk: 'low',
        recommendations: []
      };
    }
  }

  private async analyzeSkillAlignment(auditorId: string, context: AuditContext): Promise<SkillAlignment> {
    const expertiseProfile = await this.getAuditorExpertise(auditorId);
    const requiredSkills = this.extractRequiredSkills(context);
    
    const criticalSkills: SkillMatch[] = [];
    const skillGaps: SkillGap[] = [];
    const developmentOpportunities: string[] = [];

    let totalAlignment = 0;
    let skillCount = 0;

    for (const requiredSkill of requiredSkills) {
      const auditorSkillLevel = this.getAuditorSkillLevel(expertiseProfile, requiredSkill);
      const requiredLevel = this.getRequiredSkillLevel(requiredSkill, context);
      
      const gap = Math.max(0, requiredLevel - auditorSkillLevel);
      const match: SkillMatch = {
        skillName: requiredSkill,
        required: requiredLevel,
        actual: auditorSkillLevel,
        gap,
        criticality: this.assessSkillCriticality(requiredSkill, context)
      };

      criticalSkills.push(match);
      totalAlignment += Math.min(auditorSkillLevel / requiredLevel, 1) * 100;
      skillCount++;

      if (gap > 20) {
        skillGaps.push({
          skillName: requiredSkill,
          gapSize: gap,
          impact: gap > 40 ? 'high' : gap > 25 ? 'medium' : 'low',
          mitigationOptions: this.suggestSkillMitigations(requiredSkill, gap)
        });
      }

      if (gap > 0 && gap < 30) {
        developmentOpportunities.push(`Strengthen ${requiredSkill} skills`);
      }
    }

    const overallAlignment = skillCount > 0 ? Math.round(totalAlignment / skillCount) : 50;

    return {
      overallAlignment,
      criticalSkills,
      skillGaps,
      developmentOpportunities
    };
  }

  private calculateMatchScore(
    expertise: AuditorExpertiseProfile,
    context: AuditContext,
    skillAlignment: SkillAlignment,
    workload: WorkloadAnalysis
  ): number {
    const factors = {
      skillAlignment: skillAlignment.overallAlignment,
      riskSpecialization: this.assessRiskSpecialization(expertise, context),
      experienceLevel: Number(expertise.averagePerformanceScore),
      availability: this.scoreAvailability(workload),
      qualityConsistency: Number(expertise.qualityConsistency),
      reliabilityScore: Number(expertise.completionReliability)
    };

    const weights = {
      skillAlignment: 0.25,
      riskSpecialization: 0.20,
      experienceLevel: 0.15,
      availability: 0.15,
      qualityConsistency: 0.15,
      reliabilityScore: 0.10
    };

    let weightedScore = 0;
    for (const [factor, score] of Object.entries(factors)) {
      weightedScore += score * (weights[factor] || 0);
    }

    return Math.round(Math.max(0, Math.min(100, weightedScore)));
  }

  private identifyStrengths(expertise: AuditorExpertiseProfile, context: AuditContext): string[] {
    const strengths = [];

    if ((expertise.riskSpecializations || []).includes(context.riskProfile.category)) {
      strengths.push(`Specialized in ${context.riskProfile.category} risk assessment`);
    }

    if ((expertise.industryExperience || []).includes(context.organizationalContext.industryType)) {
      strengths.push(`Extensive ${context.organizationalContext.industryType} industry experience`);
    }

    if (Number(expertise.averagePerformanceScore) >= 85) {
      strengths.push('Consistently high performance ratings');
    }

    if (Number(expertise.completionReliability) >= 90) {
      strengths.push('Excellent track record for on-time completion');
    }

    if (Number(expertise.qualityConsistency) >= 80) {
      strengths.push('Consistent quality delivery');
    }

    if (context.complexityLevel === expertise.complexityHandling) {
      strengths.push(`Well-suited for ${context.complexityLevel} complexity audits`);
    }

    return strengths;
  }

  private identifyPotentialChallenges(
    expertise: AuditorExpertiseProfile,
    context: AuditContext,
    workload: WorkloadAnalysis
  ): string[] {
    const challenges = [];

    if (workload.currentUtilization > this.WORKLOAD_THRESHOLD) {
      challenges.push('High current workload may impact focus and quality');
    }

    if (!(expertise.riskSpecializations || []).includes(context.riskProfile.category)) {
      challenges.push(`Limited experience with ${context.riskProfile.category} risk category`);
    }

    if (!(expertise.industryExperience || []).includes(context.organizationalContext.industryType)) {
      challenges.push(`May need additional support for ${context.organizationalContext.industryType} industry specifics`);
    }

    if (Number(expertise.learningVelocity) < 60 && context.complexityLevel === 'highly_complex') {
      challenges.push('Complex audit may require additional guidance and support');
    }

    if (Number(expertise.availabilityScore) < 80) {
      challenges.push('Limited availability may affect scheduling flexibility');
    }

    return challenges;
  }

  private determineAvailabilityStatus(workload: WorkloadAnalysis): 'fully_available' | 'partially_available' | 'overloaded' {
    if (workload.currentUtilization <= 70) return 'fully_available';
    if (workload.currentUtilization <= this.WORKLOAD_THRESHOLD) return 'partially_available';
    return 'overloaded';
  }

  private isLearningOpportunity(expertise: AuditorExpertiseProfile, context: AuditContext): boolean {
    // Check if this audit would expand the auditor's expertise
    const hasRiskExperience = (expertise.riskSpecializations || []).includes(context.riskProfile.category);
    const hasIndustryExperience = (expertise.industryExperience || []).includes(context.organizationalContext.industryType);
    const complexityStretch = this.getComplexityLevel(expertise.complexityHandling) < this.getComplexityLevel(context.complexityLevel);

    return !hasRiskExperience || !hasIndustryExperience || (complexityStretch && Number(expertise.learningVelocity) >= 70);
  }

  private async assessTeamCompatibility(auditorId: string): Promise<TeamCompatibility> {
    // Placeholder implementation - would need team interaction data
    return {
      teamworkScore: 75,
      communicationScore: 80,
      leadershipPotential: 70,
      mentorshipCapability: 65,
      culturalFit: 85
    };
  }

  private predictQualityScore(
    expertise: AuditorExpertiseProfile,
    context: AuditContext,
    historical: HistoricalPerformance
  ): number {
    let baseScore = Number(expertise.averagePerformanceScore) || 75;

    // Adjust for specialization
    if ((expertise.riskSpecializations || []).includes(context.riskProfile.category)) {
      baseScore += 5;
    }

    // Adjust for complexity alignment
    const complexityAlignment = this.getComplexityAlignment(expertise.complexityHandling, context.complexityLevel);
    baseScore += complexityAlignment;

    // Factor in historical performance
    baseScore = baseScore * 0.7 + historical.averageQualityScore * 0.3;

    return Math.max(60, Math.min(95, baseScore));
  }

  private predictCompletionTime(auditorId: string, context: AuditContext, historical: HistoricalPerformance): number {
    // Base time estimate would come from context or procedure analysis
    let baseTime = context.timelineConstraints.maxDurationHours * 0.8; // Estimate 80% of max

    // Adjust based on auditor's historical accuracy
    const timelineAccuracy = historical.timeEstimateAccuracy / 100;
    if (timelineAccuracy > 0.9) {
      baseTime *= 0.95; // Efficient auditor
    } else if (timelineAccuracy < 0.7) {
      baseTime *= 1.15; // May take longer
    }

    return Math.max(4, baseTime);
  }

  private calculateSuccessProbability(
    expertise: AuditorExpertiseProfile,
    context: AuditContext,
    historical: HistoricalPerformance
  ): number {
    let baseProbability = 75;

    // Factor in completion reliability
    baseProbability += (historical.completionReliability - 75) * 0.3;

    // Factor in specialization
    if ((expertise.riskSpecializations || []).includes(context.riskProfile.category)) {
      baseProbability += 10;
    }

    // Factor in performance consistency
    baseProbability += (Number(expertise.qualityConsistency) - 75) * 0.2;

    // Factor in complexity handling
    const complexityAlignment = this.getComplexityAlignment(expertise.complexityHandling, context.complexityLevel);
    baseProbability += complexityAlignment * 0.5;

    return Math.max(50, Math.min(95, Math.round(baseProbability)));
  }

  private async identifyRiskFactors(auditorId: string, context: AuditContext): Promise<any[]> {
    const riskFactors = [];
    
    const workload = await this.analyzeCurrentWorkload(auditorId);
    if (workload.currentUtilization > this.WORKLOAD_THRESHOLD) {
      riskFactors.push({
        factorName: 'High Workload',
        riskLevel: 'medium',
        probability: 70,
        impact: 60,
        description: 'Current high workload may impact performance',
        indicators: ['Multiple active assignments', 'Limited availability']
      });
    }

    const expertise = await this.getAuditorExpertise(auditorId);
    if (!(expertise.riskSpecializations || []).includes(context.riskProfile.category)) {
      riskFactors.push({
        factorName: 'Limited Risk Expertise',
        riskLevel: 'medium',
        probability: 60,
        impact: 50,
        description: 'Limited experience with this risk category',
        indicators: ['No prior specialization', 'May need additional guidance']
      });
    }

    return riskFactors;
  }

  private generateMitigationStrategies(riskFactors: any[]): string[] {
    const strategies = [];
    
    for (const factor of riskFactors) {
      switch (factor.factorName) {
        case 'High Workload':
          strategies.push('Consider workload redistribution or timeline adjustment');
          strategies.push('Provide additional support resources');
          break;
        case 'Limited Risk Expertise':
          strategies.push('Pair with senior auditor with relevant expertise');
          strategies.push('Provide specialized training materials');
          break;
      }
    }
    
    return strategies;
  }

  private async createDefaultExpertiseProfile(auditorId: string): Promise<AuditorExpertiseProfile> {
    const defaultProfile: InsertAuditorExpertiseProfile = {
      auditorId,
      riskSpecializations: [],
      industryExperience: [],
      technicalSkills: [],
      certifications: [],
      averagePerformanceScore: 75,
      completionReliability: 80,
      qualityConsistency: 75,
      learningVelocity: 70,
      workloadCapacity: 40,
      availabilityScore: 100,
      teamCollaborationScore: 75,
      complexityHandling: 'moderate'
    };

    return await storage.createAuditorExpertiseProfile(defaultProfile);
  }

  private getDefaultProfile(auditorId: string): AuditorExpertiseProfile {
    return {
      id: 'default',
      auditorId,
      riskSpecializations: [],
      industryExperience: [],
      technicalSkills: [],
      certifications: [],
      averagePerformanceScore: 75,
      completionReliability: 80,
      qualityConsistency: 75,
      learningVelocity: 70,
      workloadCapacity: 40,
      availabilityScore: 100,
      teamCollaborationScore: 75,
      complexityHandling: 'moderate',
      lastProfileUpdate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private getDefaultPerformance(): HistoricalPerformance {
    return {
      averageQualityScore: 75,
      completionReliability: 80,
      timeEstimateAccuracy: 75,
      findingsEffectiveness: 70,
      clientSatisfaction: 75,
      improvementTrend: 'stable'
    };
  }

  private getDefaultPerformanceEstimate(): PerformanceEstimate {
    return {
      expectedQualityScore: 75,
      expectedCompletionTime: 40,
      successProbability: 80,
      riskFactors: [],
      mitigationStrategies: []
    };
  }

  private calculateImprovementTrend(auditHistory: any[]): 'improving' | 'stable' | 'declining' {
    if (auditHistory.length < 4) return 'stable';

    const recent = auditHistory.slice(-3);
    const older = auditHistory.slice(0, -3);

    const recentAvg = recent.reduce((sum, audit) => sum + (audit.qualityScore || 75), 0) / recent.length;
    const olderAvg = older.reduce((sum, audit) => sum + (audit.qualityScore || 75), 0) / older.length;

    const difference = recentAvg - olderAvg;
    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  }

  private extractRequiredSkills(context: AuditContext): string[] {
    const skills = [];
    
    skills.push(`${context.riskProfile.category}_risk_assessment`);
    skills.push(`${context.organizationalContext.industryType}_industry_knowledge`);
    skills.push(`${context.complexityLevel}_complexity_handling`);
    
    if (context.qualityRequirements.reviewRequirements === 'expert') {
      skills.push('advanced_analytical_skills');
    }
    
    if (context.timelineConstraints.urgencyLevel === 'critical') {
      skills.push('time_management');
    }

    return skills;
  }

  private getAuditorSkillLevel(expertise: AuditorExpertiseProfile, skill: string): number {
    // Ensure we have valid inputs
    if (!expertise || !skill) {
      return 65; // Default skill level
    }
    
    // Simplified skill level assessment - in reality this would be more sophisticated
    if (skill.includes('risk_assessment')) {
      const riskSpecs = Array.isArray(expertise.riskSpecializations) ? expertise.riskSpecializations : [];
      return riskSpecs.some(spec => spec && typeof spec === 'string' && skill.includes(spec)) ? 90 : 60;
    }
    
    if (skill.includes('industry_knowledge')) {
      const industryExp = Array.isArray(expertise.industryExperience) ? expertise.industryExperience : [];
      return industryExp.some(exp => exp && typeof exp === 'string' && skill.includes(exp)) ? 85 : 50;
    }
    
    if (skill.includes('complexity_handling')) {
      const auditorLevel = this.getComplexityLevel(expertise.complexityHandling || 'moderate');
      const skillParts = skill.split('_');
      const requiredLevel = this.getComplexityLevel(skillParts[0] || 'moderate');
      return auditorLevel >= requiredLevel ? 80 : 60;
    }
    
    const techSkills = Array.isArray(expertise.technicalSkills) ? expertise.technicalSkills : [];
    return techSkills.includes(skill) ? 80 : 65;
  }

  private getRequiredSkillLevel(skill: string, context: AuditContext): number {
    // Return required proficiency level for each skill (0-100)
    if (skill.includes('risk_assessment')) {
      return context.riskProfile.inherentRiskScore >= 20 ? 85 : 70;
    }
    if (skill.includes('complexity_handling')) {
      const complexityLevels = { simple: 60, moderate: 75, complex: 85, highly_complex: 95 };
      return complexityLevels[context.complexityLevel] || 75;
    }
    return 75; // Default required level
  }

  private assessSkillCriticality(skill: string, context: AuditContext): 'low' | 'medium' | 'high' | 'critical' {
    if (skill.includes('risk_assessment') && context.riskProfile.inherentRiskScore >= 20) {
      return 'critical';
    }
    if (skill.includes('complexity_handling') && context.complexityLevel === 'highly_complex') {
      return 'high';
    }
    if (skill.includes('time_management') && context.timelineConstraints.urgencyLevel === 'critical') {
      return 'high';
    }
    return 'medium';
  }

  private suggestSkillMitigations(skill: string, gapSize: number): string[] {
    const mitigations = [];
    
    if (gapSize > 30) {
      mitigations.push('Assign senior auditor as mentor');
      mitigations.push('Provide intensive training before assignment');
    } else if (gapSize > 20) {
      mitigations.push('Provide targeted training materials');
      mitigations.push('Schedule periodic check-ins with supervisor');
    }
    
    if (skill.includes('industry_knowledge')) {
      mitigations.push('Pair with industry specialist');
    }
    
    return mitigations;
  }

  private assessRiskSpecialization(expertise: AuditorExpertiseProfile, context: AuditContext): number {
    if ((expertise.riskSpecializations || []).includes(context.riskProfile.category)) {
      return 90;
    }
    
    // Check for related specializations
    const relatedScore = expertise.riskSpecializations.length > 0 ? 60 : 40;
    return relatedScore;
  }

  private scoreAvailability(workload: WorkloadAnalysis): number {
    return Math.max(0, 100 - workload.currentUtilization);
  }

  private getComplexityLevel(complexity: string): number {
    const levels = { simple: 1, moderate: 2, complex: 3, highly_complex: 4 };
    return levels[complexity] || 2;
  }

  private getComplexityAlignment(auditorComplexity: string, contextComplexity: string): number {
    const auditorLevel = this.getComplexityLevel(auditorComplexity);
    const contextLevel = this.getComplexityLevel(contextComplexity);
    
    if (auditorLevel === contextLevel) return 10;
    if (auditorLevel > contextLevel) return 5;
    if (auditorLevel === contextLevel - 1) return -5;
    return -10;
  }

  private assessSchedulingFlexibility(assignments: any[]): number {
    // Assess how flexible the auditor's schedule is
    const hardDeadlines = assignments.filter(a => a.isFixedDeadline).length;
    const flexibility = Math.max(0, 100 - (hardDeadlines * 20));
    return flexibility;
  }

  private assessOvercommitmentRisk(utilization: number, assignments: any[]): 'low' | 'medium' | 'high' {
    if (utilization > 90) return 'high';
    if (utilization > this.WORKLOAD_THRESHOLD || assignments.length > 5) return 'medium';
    return 'low';
  }

  private generateWorkloadRecommendations(workloadAnalyses: WorkloadAnalysis[]): string[] {
    const recommendations = [];
    
    const avgUtilization = workloadAnalyses.reduce((sum, w) => sum + w.currentUtilization, 0) / workloadAnalyses.length;
    
    if (avgUtilization > 85) {
      recommendations.push('Consider hiring additional auditors or redistributing workload');
    }
    if (avgUtilization < 60) {
      recommendations.push('Team has capacity for additional assignments');
    }
    
    return recommendations;
  }

  private async updateAuditorExpertiseProfile(auditorId: string, updateData: any): Promise<void> {
    try {
      const currentProfile = await this.getAuditorExpertise(auditorId);
      
      // Calculate new averages
      const newAveragePerformance = updateData.totalQualityScore / updateData.completedAudits;
      const newReliability = (updateData.successes / updateData.completedAudits) * 100;
      
      // Update the profile
      await storage.updateAuditorExpertiseProfile(auditorId, {
        averagePerformanceScore: Math.round(newAveragePerformance),
        completionReliability: Math.round(newReliability),
        riskSpecializations: Array.from(updateData.riskExposure),
        lastProfileUpdate: new Date()
      });
      
      console.log(`📊 Updated expertise profile for auditor ${auditorId}`);
      
    } catch (error) {
      console.error(`Error updating expertise profile for ${auditorId}:`, error);
    }
  }
}

// Export singleton instance  
export const auditorAssignmentIntelligence = new AuditorAssignmentIntelligence();