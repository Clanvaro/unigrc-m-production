import { storage } from "./storage";
import { 
  type Risk, 
  type Control, 
  type RiskControl,
  type RiskProfile,
  type RiskClassification,
  type TestRequirement,
  type RiskAnalysisProfile,
  type InsertRiskAnalysisProfile,
  type GenerationParams
} from "@shared/schema";

/**
 * RISK ANALYSIS ENGINE
 * 
 * Core component for analyzing risks and determining appropriate audit test requirements.
 * This engine classifies risks, assesses control environments, and recommends test approaches.
 */
export class RiskAnalysisEngine {
  
  /**
   * Analyze a single risk and generate a comprehensive risk profile
   */
  async analyzeRiskProfile(riskId: string): Promise<RiskProfile> {
    // Get risk details with controls
    const risk = await storage.getRiskWithDetails(riskId);
    if (!risk) {
      throw new Error(`Risk not found: ${riskId}`);
    }

    // Classify the risk
    const classification = this.classifyRiskType(risk);
    
    // Assess control environment
    const controlEnvironment = await this.assessControlEnvironment(risk);
    
    // Determine test requirements
    const testRequirements = await this.calculateTestRequirements(risk, classification);
    
    // Build comprehensive profile
    const riskProfile: RiskProfile = {
      riskId: risk.id,
      category: classification.category,
      complexity: classification.complexity,
      auditScope: classification.auditScope,
      priority: classification.priority,
      controlEnvironment: classification.controlEnvironment,
      requiredSkills: testRequirements.skillsRequired,
      estimatedHours: testRequirements.estimatedHours,
      toolsNeeded: testRequirements.toolsNeeded,
      controlGaps: await this.identifyControlGaps(risk),
      controlStrength: await this.calculateControlStrength(risk),
      inherentRiskScore: risk.inherentRisk,
      residualRiskScore: await this.calculateResidualRisk(risk),
      riskTrend: await this.determineRiskTrend(risk),
      historicalIssues: await this.getHistoricalIssues(risk),
      regulatoryRequirements: await this.identifyRegulatoryRequirements(risk),
      complianceLevel: this.determineComplianceLevel(risk),
      confidenceScore: this.calculateConfidenceScore(risk, classification),
      analysisMethod: 'rule_based', // Can be enhanced with ML later
      recommendedTemplates: await this.recommendTemplates(classification)
    };

    // Store the analysis profile for future reference
    await this.saveAnalysisProfile(riskProfile);

    return riskProfile;
  }

  /**
   * Analyze multiple risks and identify collective test requirements
   */
  async identifyTestRequirements(risks: Risk[]): Promise<TestRequirement[]> {
    const requirements: TestRequirement[] = [];

    for (const risk of risks) {
      const classification = this.classifyRiskType(risk);
      const requirement = await this.calculateTestRequirements(risk, classification);
      requirements.push(requirement);
    }

    // Optimize for overlapping requirements
    return this.optimizeTestRequirements(requirements);
  }

  /**
   * Classify risk type based on multiple factors
   */
  classifyRiskType(risk: Risk): RiskClassification {
    const category = this.determineRiskCategory(risk);
    const complexity = this.determineTestComplexity(risk);
    const auditScope = this.determineAuditScope(risk);
    const priority = this.assessRiskPriority(risk);
    const controlEnvironment = this.assessControlEnvironmentLevel(risk);

    return {
      category,
      complexity,
      auditScope,
      priority,
      controlEnvironment
    };
  }

  /**
   * Determine risk category based on risk characteristics
   */
  private determineRiskCategory(risk: Risk): RiskProfile['category'] {
    // Analyze risk name, description, and categories for classification
    const riskText = `${risk.name} ${risk.description}`.toLowerCase();
    const categories = risk.category || [];

    // Financial risk indicators
    if (this.containsFinancialKeywords(riskText, categories)) {
      return 'financial';
    }

    // Compliance risk indicators  
    if (this.containsComplianceKeywords(riskText, categories)) {
      return 'compliance';
    }

    // Operational risk indicators
    if (this.containsOperationalKeywords(riskText, categories)) {
      return 'operational';
    }

    // IT/Security risk indicators
    if (this.containsITKeywords(riskText, categories)) {
      return 'it_security';
    }

    // Strategic risk indicators
    if (this.containsStrategicKeywords(riskText, categories)) {
      return 'strategic';
    }

    // Default to operational if no clear category identified
    return 'operational';
  }

  /**
   * Determine test complexity based on risk factors
   */
  determineTestComplexity(risk: Risk): RiskProfile['complexity'] {
    let complexityScore = 0;

    // Factor 1: Inherent risk level (25% weight)
    if (risk.inherentRisk >= 20) complexityScore += 4;
    else if (risk.inherentRisk >= 15) complexityScore += 3;
    else if (risk.inherentRisk >= 10) complexityScore += 2;
    else complexityScore += 1;

    // Factor 2: Complexity assessment from risk (25% weight)
    complexityScore += risk.complexity;

    // Factor 3: Exposure factors (25% weight)
    const exposureScore = (risk.exposureVolume + risk.exposureMassivity + risk.exposureCriticalPath) / 3;
    complexityScore += exposureScore;

    // Factor 4: Change volatility (25% weight)
    complexityScore += risk.changeVolatility;

    // Calculate average complexity
    const avgComplexity = complexityScore / 4;

    if (avgComplexity >= 4.5) return 'highly_complex';
    if (avgComplexity >= 3.5) return 'complex';
    if (avgComplexity >= 2.5) return 'moderate';
    return 'simple';
  }

  /**
   * Determine appropriate audit scope
   */
  private determineAuditScope(risk: Risk): RiskProfile['auditScope'] {
    const riskText = `${risk.name} ${risk.description}`.toLowerCase();
    
    // Controls-focused testing
    if (riskText.includes('control') || riskText.includes('procedure') || riskText.includes('governance')) {
      return 'controls';
    }

    // Substantive testing focus
    if (riskText.includes('balance') || riskText.includes('transaction') || riskText.includes('financial')) {
      return 'substantive';
    }

    // Default to hybrid approach for comprehensive coverage
    return 'hybrid';
  }

  /**
   * Assess risk priority based on multiple factors
   */
  private assessRiskPriority(risk: Risk): RiskProfile['priority'] {
    // Base priority on inherent risk score
    if (risk.inherentRisk >= 20) return 'critical';
    if (risk.inherentRisk >= 15) return 'high';
    if (risk.inherentRisk >= 10) return 'medium';
    return 'low';
  }

  /**
   * Assess control environment level
   */
  private assessControlEnvironmentLevel(risk: Risk): RiskProfile['controlEnvironment'] {
    // This would typically integrate with control effectiveness data
    // For now, use a simple heuristic based on risk characteristics
    
    if (risk.vulnerabilities >= 4) return 'deficient';
    if (risk.vulnerabilities >= 3) return 'weak';
    if (risk.vulnerabilities >= 2) return 'adequate';
    return 'strong';
  }

  /**
   * Calculate specific test requirements for a risk
   */
  private async calculateTestRequirements(risk: Risk, classification: RiskClassification): Promise<TestRequirement> {
    const baseHours = this.calculateBaseHours(classification);
    const skillsRequired = this.identifyRequiredSkills(classification);
    const toolsNeeded = this.identifyRequiredTools(classification);
    const evidenceTypes = this.determineEvidenceTypes(classification);
    const testingMethods = this.determineTestingMethods(classification);

    return {
      riskId: risk.id,
      testType: classification.auditScope,
      evidenceTypes,
      testingMethods,
      skillsRequired,
      estimatedHours: baseHours,
      toolsNeeded,
      regulatoryRequirements: await this.identifyRegulatoryRequirements(risk),
      minimumProcedures: this.calculateMinimumProcedures(classification),
      reviewLevel: this.determineReviewLevel(classification)
    };
  }

  /**
   * Calculate base hours required for testing
   */
  private calculateBaseHours(classification: RiskClassification): number {
    let baseHours = 8; // Standard base

    // Adjust by complexity
    switch (classification.complexity) {
      case 'highly_complex': baseHours *= 3; break;
      case 'complex': baseHours *= 2; break;
      case 'moderate': baseHours *= 1.5; break;
      case 'simple': baseHours *= 1; break;
    }

    // Adjust by priority
    switch (classification.priority) {
      case 'critical': baseHours *= 1.5; break;
      case 'high': baseHours *= 1.25; break;
      case 'medium': baseHours *= 1; break;
      case 'low': baseHours *= 0.75; break;
    }

    // Adjust by scope
    switch (classification.auditScope) {
      case 'hybrid': baseHours *= 1.4; break;
      case 'substantive': baseHours *= 1.2; break;
      case 'controls': baseHours *= 1; break;
    }

    return Math.round(baseHours);
  }

  /**
   * Identify required skills based on risk classification
   */
  private identifyRequiredSkills(classification: RiskClassification): string[] {
    const skills: string[] = ['General Auditing'];

    switch (classification.category) {
      case 'financial':
        skills.push('Financial Analysis', 'Accounting Standards', 'Financial Reporting');
        break;
      case 'operational':
        skills.push('Process Analysis', 'Operational Risk Assessment', 'Business Process Understanding');
        break;
      case 'compliance':
        skills.push('Regulatory Knowledge', 'Compliance Testing', 'Legal Requirements');
        break;
      case 'strategic':
        skills.push('Strategic Planning', 'Business Analysis', 'Risk Management');
        break;
      case 'it_security':
        skills.push('IT Auditing', 'Cybersecurity', 'Data Analytics', 'System Controls');
        break;
      case 'reputational':
        skills.push('Brand Risk Assessment', 'Media Analysis', 'Stakeholder Management');
        break;
    }

    // Add complexity-based skills
    if (classification.complexity === 'highly_complex' || classification.complexity === 'complex') {
      skills.push('Senior Audit Experience', 'Complex Risk Assessment');
    }

    return skills;
  }

  /**
   * Identify required tools and technologies
   */
  private identifyRequiredTools(classification: RiskClassification): string[] {
    const tools: string[] = ['Audit Software', 'Documentation Tools'];

    switch (classification.category) {
      case 'financial':
        tools.push('Financial Analysis Software', 'Data Analytics', 'Excel/Spreadsheets');
        break;
      case 'it_security':
        tools.push('Security Scanning Tools', 'Log Analysis', 'Vulnerability Assessment');
        break;
      case 'operational':
        tools.push('Process Mapping', 'Statistical Analysis', 'Performance Metrics');
        break;
      case 'compliance':
        tools.push('Compliance Tracking', 'Regulatory Databases', 'Policy Management');
        break;
    }

    return tools;
  }

  /**
   * Determine evidence types needed
   */
  private determineEvidenceTypes(classification: RiskClassification): TestRequirement['evidenceTypes'] {
    const evidenceTypes: TestRequirement['evidenceTypes'] = ['documentary'];

    // Add based on scope
    if (classification.auditScope === 'controls' || classification.auditScope === 'hybrid') {
      evidenceTypes.push('observational', 'inquiry');
    }

    if (classification.auditScope === 'substantive' || classification.auditScope === 'hybrid') {
      evidenceTypes.push('analytical');
    }

    // Add based on category
    if (classification.category === 'operational') {
      evidenceTypes.push('observational');
    }

    return [...new Set(evidenceTypes)]; // Remove duplicates
  }

  /**
   * Determine testing methods
   */
  private determineTestingMethods(classification: RiskClassification): TestRequirement['testingMethods'] {
    const methods: TestRequirement['testingMethods'] = [];

    switch (classification.auditScope) {
      case 'controls':
        methods.push('controls_testing', 'walkthrough');
        break;
      case 'substantive':
        methods.push('substantive', 'sampling');
        break;
      case 'hybrid':
        methods.push('controls_testing', 'substantive', 'sampling');
        break;
    }

    return methods;
  }

  /**
   * Calculate minimum procedures required
   */
  private calculateMinimumProcedures(classification: RiskClassification): number {
    let baseProcedures = 3;

    switch (classification.complexity) {
      case 'highly_complex': baseProcedures = 8; break;
      case 'complex': baseProcedures = 6; break;
      case 'moderate': baseProcedures = 4; break;
      case 'simple': baseProcedures = 3; break;
    }

    if (classification.priority === 'critical') baseProcedures += 2;
    if (classification.priority === 'high') baseProcedures += 1;

    return baseProcedures;
  }

  /**
   * Determine review level required
   */
  private determineReviewLevel(classification: RiskClassification): TestRequirement['reviewLevel'] {
    if (classification.priority === 'critical' || classification.complexity === 'highly_complex') {
      return 'expert';
    }
    if (classification.priority === 'high' || classification.complexity === 'complex') {
      return 'enhanced';
    }
    return 'standard';
  }

  /**
   * Assess control environment for a risk
   */
  private async assessControlEnvironment(risk: Risk): Promise<{
    strength: number;
    gaps: string[];
    recommendations: string[];
  }> {
    const riskControls = await storage.getRiskControls(risk.id);
    
    if (riskControls.length === 0) {
      return {
        strength: 1,
        gaps: ['No controls identified', 'Control framework missing'],
        recommendations: ['Implement basic controls', 'Establish control monitoring']
      };
    }

    // Calculate average control effectiveness
    const avgEffectiveness = riskControls.reduce((sum, rc) => sum + rc.control.effectiveness, 0) / riskControls.length;
    const strength = Math.ceil(avgEffectiveness / 10); // Convert to 1-10 scale

    // Identify gaps based on control effectiveness
    const gaps: string[] = [];
    const recommendations: string[] = [];

    if (avgEffectiveness < 50) {
      gaps.push('Low control effectiveness');
      recommendations.push('Strengthen existing controls');
    }

    if (riskControls.length < 2) {
      gaps.push('Insufficient control coverage');
      recommendations.push('Implement additional controls');
    }

    return { strength, gaps, recommendations };
  }

  /**
   * Identify control gaps for a specific risk
   */
  private async identifyControlGaps(risk: Risk): Promise<string[]> {
    const { gaps } = await this.assessControlEnvironment(risk);
    return gaps;
  }

  /**
   * Calculate control strength score (1-10)
   */
  private async calculateControlStrength(risk: Risk): Promise<number> {
    const { strength } = await this.assessControlEnvironment(risk);
    return strength;
  }

  /**
   * Calculate residual risk after controls
   */
  private async calculateResidualRisk(risk: Risk): Promise<number> {
    const riskControls = await storage.getRiskControls(risk.id);
    
    if (riskControls.length === 0) {
      return risk.inherentRisk; // No controls = full inherent risk
    }

    // Get the minimum residual risk from all controls
    const minResidualRisk = Math.min(...riskControls.map(rc => Number(rc.residualRisk)));
    return minResidualRisk;
  }

  /**
   * Determine risk trend based on historical data
   */
  private async determineRiskTrend(risk: Risk): Promise<RiskProfile['riskTrend']> {
    // This would typically analyze historical risk assessments
    // For now, return stable as default
    return 'stable';
  }

  /**
   * Get historical issues for this risk
   */
  private async getHistoricalIssues(risk: Risk): Promise<string[]> {
    // This would typically query historical audit findings
    // For now, return empty array
    return [];
  }

  /**
   * Identify regulatory requirements for this risk
   */
  private async identifyRegulatoryRequirements(risk: Risk): Promise<string[]> {
    const requirements: string[] = [];
    const riskText = `${risk.name} ${risk.description}`.toLowerCase();

    // Financial regulations
    if (this.containsFinancialKeywords(riskText, risk.category || [])) {
      requirements.push('IFRS Compliance', 'Local GAAP', 'Financial Reporting Standards');
    }

    // Data privacy regulations
    if (riskText.includes('data') || riskText.includes('privacy')) {
      requirements.push('GDPR', 'Data Protection Laws', 'Privacy Regulations');
    }

    // Industry-specific regulations would be added here
    
    return requirements;
  }

  /**
   * Determine compliance level required
   */
  private determineComplianceLevel(risk: Risk): RiskProfile['complianceLevel'] {
    if (risk.inherentRisk >= 20) return 'strict';
    if (risk.inherentRisk >= 15) return 'enhanced';
    if (risk.inherentRisk >= 10) return 'standard';
    return 'basic';
  }

  /**
   * Calculate confidence score for the analysis
   */
  private calculateConfidenceScore(risk: Risk, classification: RiskClassification): number {
    let confidence = 70; // Base confidence

    // Increase confidence based on data completeness
    if (risk.description && risk.description.length > 50) confidence += 10;
    if (risk.category && risk.category.length > 0) confidence += 10;
    if (risk.validationStatus === 'validated') confidence += 10;

    return Math.min(confidence, 100);
  }

  /**
   * Recommend templates based on classification
   */
  private async recommendTemplates(classification: RiskClassification): Promise<string[]> {
    // This would query the template repository
    // For now, return category-based recommendations
    const templates: string[] = [];

    switch (classification.category) {
      case 'financial':
        templates.push('financial-basic', 'revenue-testing', 'expense-validation');
        break;
      case 'operational':
        templates.push('operational-basic', 'process-testing', 'efficiency-analysis');
        break;
      case 'compliance':
        templates.push('compliance-basic', 'regulatory-testing', 'policy-adherence');
        break;
      case 'it_security':
        templates.push('it-security-basic', 'access-controls', 'data-integrity');
        break;
      case 'strategic':
        templates.push('strategic-basic', 'business-continuity', 'strategic-planning');
        break;
    }

    return templates;
  }

  /**
   * Save analysis profile to database
   */
  private async saveAnalysisProfile(riskProfile: RiskProfile): Promise<void> {
    const profileData: InsertRiskAnalysisProfile = {
      riskId: riskProfile.riskId,
      riskCategory: riskProfile.category,
      complexity: riskProfile.complexity,
      auditScope: riskProfile.auditScope,
      priority: riskProfile.priority,
      controlEnvironment: riskProfile.controlEnvironment,
      controlGaps: riskProfile.controlGaps,
      controlStrength: riskProfile.controlStrength,
      requiredSkills: riskProfile.requiredSkills,
      estimatedHours: riskProfile.estimatedHours,
      toolsNeeded: riskProfile.toolsNeeded,
      inherentRiskScore: riskProfile.inherentRiskScore,
      residualRiskScore: riskProfile.residualRiskScore,
      riskTrend: riskProfile.riskTrend,
      historicalIssues: riskProfile.historicalIssues,
      regulatoryRequirements: riskProfile.regulatoryRequirements,
      complianceLevel: riskProfile.complianceLevel,
      confidenceScore: riskProfile.confidenceScore,
      analysisMethod: riskProfile.analysisMethod,
      recommendedTemplates: riskProfile.recommendedTemplates
    };

    await storage.createRiskAnalysisProfile(profileData);
  }

  /**
   * Optimize overlapping test requirements
   */
  private optimizeTestRequirements(requirements: TestRequirement[]): TestRequirement[] {
    // Group by similar characteristics and merge where possible
    const optimized: TestRequirement[] = [];
    const processed = new Set<string>();

    for (const req of requirements) {
      if (processed.has(req.riskId)) continue;

      // Find similar requirements that can be combined
      const similar = requirements.filter(r => 
        r !== req && 
        r.testType === req.testType &&
        r.reviewLevel === req.reviewLevel &&
        this.arraysOverlap(r.evidenceTypes, req.evidenceTypes)
      );

      if (similar.length > 0) {
        // Merge requirements
        const merged: TestRequirement = {
          ...req,
          skillsRequired: this.mergeArrays(req.skillsRequired, ...similar.map(s => s.skillsRequired)),
          toolsNeeded: this.mergeArrays(req.toolsNeeded, ...similar.map(s => s.toolsNeeded)),
          evidenceTypes: this.mergeArrays(req.evidenceTypes, ...similar.map(s => s.evidenceTypes)),
          testingMethods: this.mergeArrays(req.testingMethods, ...similar.map(s => s.testingMethods)),
          estimatedHours: req.estimatedHours + similar.reduce((sum, s) => sum + s.estimatedHours, 0),
          minimumProcedures: Math.max(req.minimumProcedures, ...similar.map(s => s.minimumProcedures))
        };

        optimized.push(merged);
        processed.add(req.riskId);
        similar.forEach(s => processed.add(s.riskId));
      } else {
        optimized.push(req);
        processed.add(req.riskId);
      }
    }

    return optimized;
  }

  // Utility methods for keyword matching
  private containsFinancialKeywords(text: string, categories: string[]): boolean {
    const keywords = ['revenue', 'financial', 'accounting', 'cash', 'expense', 'asset', 'liability', 'equity', 'profit', 'loss'];
    return keywords.some(keyword => text.includes(keyword)) || 
           categories.some(cat => cat.toLowerCase().includes('financial'));
  }

  private containsComplianceKeywords(text: string, categories: string[]): boolean {
    const keywords = ['compliance', 'regulatory', 'legal', 'policy', 'regulation', 'standard', 'requirement'];
    return keywords.some(keyword => text.includes(keyword)) || 
           categories.some(cat => cat.toLowerCase().includes('compliance'));
  }

  private containsOperationalKeywords(text: string, categories: string[]): boolean {
    const keywords = ['operational', 'process', 'procedure', 'efficiency', 'quality', 'production', 'service', 'customer'];
    return keywords.some(keyword => text.includes(keyword)) || 
           categories.some(cat => cat.toLowerCase().includes('operational'));
  }

  private containsITKeywords(text: string, categories: string[]): boolean {
    const keywords = ['it', 'technology', 'system', 'cyber', 'security', 'data', 'software', 'network', 'infrastructure'];
    return keywords.some(keyword => text.includes(keyword)) || 
           categories.some(cat => cat.toLowerCase().includes('it') || cat.toLowerCase().includes('security'));
  }

  private containsStrategicKeywords(text: string, categories: string[]): boolean {
    const keywords = ['strategic', 'strategy', 'business', 'market', 'competitive', 'growth', 'expansion', 'planning'];
    return keywords.some(keyword => text.includes(keyword)) || 
           categories.some(cat => cat.toLowerCase().includes('strategic'));
  }

  // Utility methods
  private arraysOverlap<T>(arr1: T[], arr2: T[]): boolean {
    return arr1.some(item => arr2.includes(item));
  }

  private mergeArrays<T>(...arrays: T[][]): T[] {
    return [...new Set(arrays.flat())];
  }
}

// Export singleton instance
export const riskAnalysisEngine = new RiskAnalysisEngine();