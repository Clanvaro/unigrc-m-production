import { storage } from "./storage";
import { riskAnalysisEngine } from "./risk-analysis-engine";
import { 
  type Risk,
  type Audit,
  type AuditTest,
  type AuditTestTemplate,
  type RiskProfile,
  type GenerationParams,
  type GeneratedTestResult,
  type TestGenerationSession,
  type InsertTestGenerationSession,
  type InsertGeneratedTestsTracking,
  type InsertAuditTest,
  type ValidationResult,
  type GenerationSessionSummary
} from "@shared/schema";

/**
 * AUTOMATIC AUDIT TEST GENERATOR
 * 
 * Core engine for automatically generating comprehensive audit tests from risk analysis.
 * This generator orchestrates the entire process from risk selection to test creation.
 */
export class AuditTestGenerator {

  /**
   * Main generation method - orchestrates the complete generation process
   */
  async generateAuditTests(params: GenerationParams): Promise<GeneratedTestResult[]> {
    console.log(`🚀 Starting audit test generation for audit: ${params.auditId}`);

    // Step 1: Create generation session
    const session = await this.createGenerationSession(params);
    console.log(`📝 Created generation session: ${session.id}`);

    try {
      // Step 2: Analyze selected risks
      const riskProfiles = await this.analyzeSelectedRisks(params.selectedRisks);
      console.log(`🔍 Analyzed ${riskProfiles.length} risk profiles`);

      // Step 3: Determine test requirements for each risk
      const testRequirements = await this.determineTestRequirements(riskProfiles);
      console.log(`📋 Determined test requirements for ${testRequirements.length} risks`);

      // Step 4: Select and customize templates
      const customizedTemplates = await this.selectAndCustomizeTemplates(testRequirements, params);
      console.log(`🎯 Selected and customized ${customizedTemplates.length} templates`);

      // Step 5: Generate actual audit tests
      const generatedTests = await this.generateTestsFromTemplates(customizedTemplates, params, session.id);
      console.log(`✅ Generated ${generatedTests.length} audit tests`);

      // Step 6: Validate generated tests
      const validatedTests = await this.validateGeneratedTests(generatedTests);
      console.log(`🔎 Validated ${validatedTests.length} tests`);

      // Step 7: Assign test codes
      const codedTests = await this.assignTestCodes(validatedTests);
      console.log(`🏷️ Assigned codes to ${codedTests.length} tests`);

      // Step 8: Update session status
      await this.completeGenerationSession(session.id, codedTests);
      console.log(`🎉 Generation session completed successfully`);

      return codedTests;

    } catch (error) {
      console.error('❌ Generation failed:', error);
      await this.failGenerationSession(session.id, error.message);
      throw error;
    }
  }

  /**
   * Create a new generation session to track the process
   */
  private async createGenerationSession(params: GenerationParams & { createdBy: string }): Promise<TestGenerationSession> {
    // Generate a descriptive session name
    const currentDate = new Date().toISOString().split('T')[0];
    const sessionName = `Generación Automática - ${currentDate} - ${params.selectedRisks.length} riesgos`;
    
    const sessionData: InsertTestGenerationSession = {
      auditId: params.auditId,
      sessionName: sessionName,
      selectedRisks: params.selectedRisks,
      generationType: params.generationType,
      scopeFilters: params.scopeFilters,
      generationRules: params.generationRules,
      customizations: params.customizations,
      algorithmVersion: params.algorithmVersion,
      aiAssistanceLevel: params.aiAssistanceLevel,
      qualityThreshold: params.qualityThreshold,
      status: 'in_progress',
      createdBy: params.createdBy
    };

    return await storage.createTestGenerationSession(sessionData);
  }

  /**
   * Analyze all selected risks to create comprehensive risk profiles
   */
  private async analyzeSelectedRisks(riskIds: string[]): Promise<RiskProfile[]> {
    const riskProfiles: RiskProfile[] = [];

    for (const riskId of riskIds) {
      try {
        const profile = await riskAnalysisEngine.analyzeRiskProfile(riskId);
        riskProfiles.push(profile);
      } catch (error) {
        console.warn(`⚠️ Failed to analyze risk ${riskId}:`, error.message);
        // Continue with other risks
      }
    }

    return riskProfiles;
  }

  /**
   * Determine test requirements for each risk profile
   */
  private async determineTestRequirements(riskProfiles: RiskProfile[]): Promise<Array<{
    riskProfile: RiskProfile;
    templates: AuditTestTemplate[];
    estimatedHours: number;
    procedureCount: number;
  }>> {
    const requirements = [];

    for (const riskProfile of riskProfiles) {
      // Get recommended templates for this risk
      const templates = await this.getTemplatesForRisk(riskProfile);
      
      // Calculate total estimated hours
      const estimatedHours = templates.reduce((sum, template) => sum + template.estimatedHours, 0);
      
      // Calculate total procedure count
      const procedureCount = templates.reduce((sum, template) => sum + template.proceduresCount, 0);

      requirements.push({
        riskProfile,
        templates,
        estimatedHours,
        procedureCount
      });
    }

    return requirements;
  }

  /**
   * Get appropriate templates for a specific risk profile
   */
  private async getTemplatesForRisk(riskProfile: RiskProfile): Promise<AuditTestTemplate[]> {
    // Get templates by risk category
    const templates = await storage.getAuditTestTemplatesByRiskCategory(riskProfile.category);
    
    // Filter templates based on complexity and scope
    const filteredTemplates = templates.filter(template => {
      // Match complexity level (allow equal or lower complexity)
      const complexityMatch = this.isComplexityMatch(template.complexityLevel, riskProfile.complexity);
      
      // Match audit scope
      const scopeMatch = template.auditScope === riskProfile.auditScope || template.auditScope === 'hybrid';
      
      // Check if template is suitable for the risk types
      const riskTypeMatch = this.isRiskTypeMatch(template.riskTypes, riskProfile);

      return complexityMatch && scopeMatch && riskTypeMatch;
    });

    // If no exact matches, fall back to basic templates for the category
    if (filteredTemplates.length === 0) {
      return templates.slice(0, 1); // Take first template as fallback
    }

    // Return top 2-3 most suitable templates
    return this.rankTemplatesByFit(filteredTemplates, riskProfile).slice(0, 3);
  }

  /**
   * Check if template complexity matches risk complexity
   */
  private isComplexityMatch(templateComplexity: string, riskComplexity: string): boolean {
    const complexityOrder = ['simple', 'moderate', 'complex', 'highly_complex'];
    const templateIndex = complexityOrder.indexOf(templateComplexity);
    const riskIndex = complexityOrder.indexOf(riskComplexity);
    
    // Allow templates of equal or lower complexity
    return templateIndex <= riskIndex;
  }

  /**
   * Check if template risk types match the risk profile
   */
  private isRiskTypeMatch(templateRiskTypes: string[], riskProfile: RiskProfile): boolean {
    // This would be more sophisticated in practice
    return templateRiskTypes.length > 0; // Simplified for now
  }

  /**
   * Rank templates by how well they fit the risk profile
   */
  private rankTemplatesByFit(templates: AuditTestTemplate[], riskProfile: RiskProfile): AuditTestTemplate[] {
    return templates.sort((a, b) => {
      let scoreA = 0, scoreB = 0;

      // Prefer exact complexity match
      if (a.complexityLevel === riskProfile.complexity) scoreA += 10;
      if (b.complexityLevel === riskProfile.complexity) scoreB += 10;

      // Prefer exact scope match
      if (a.auditScope === riskProfile.auditScope) scoreA += 5;
      if (b.auditScope === riskProfile.auditScope) scoreB += 5;

      // Prefer templates with more procedures for complex risks
      if (riskProfile.complexity === 'complex' || riskProfile.complexity === 'highly_complex') {
        scoreA += a.proceduresCount;
        scoreB += b.proceduresCount;
      }

      return scoreB - scoreA; // Higher score first
    });
  }

  /**
   * Select and customize templates based on requirements
   */
  private async selectAndCustomizeTemplates(
    requirements: Array<{
      riskProfile: RiskProfile;
      templates: AuditTestTemplate[];
      estimatedHours: number;
      procedureCount: number;
    }>,
    params: GenerationParams
  ): Promise<Array<{
    riskProfile: RiskProfile;
    template: AuditTestTemplate;
    customizations: Record<string, any>;
    procedures: any[];
  }>> {
    const customizedTemplates = [];

    for (const requirement of requirements) {
      // Select best template for this risk
      const selectedTemplate = requirement.templates[0]; // Take the highest ranked
      
      if (!selectedTemplate) {
        console.warn(`⚠️ No suitable template found for risk: ${requirement.riskProfile.riskId}`);
        continue;
      }

      // Apply customizations based on risk profile
      const customizations = await this.generateCustomizations(selectedTemplate, requirement.riskProfile, params);
      
      // Get and customize procedures
      const procedures = await this.customizeProcedures(selectedTemplate, requirement.riskProfile);

      customizedTemplates.push({
        riskProfile: requirement.riskProfile,
        template: selectedTemplate,
        customizations,
        procedures
      });
    }

    return customizedTemplates;
  }

  /**
   * Generate customizations for a template based on risk profile
   */
  private async generateCustomizations(
    template: AuditTestTemplate,
    riskProfile: RiskProfile,
    params: GenerationParams
  ): Promise<Record<string, any>> {
    const customizations: Record<string, any> = {};

    // Apply AI assistance level customizations
    if (params.aiAssistanceLevel === 'advanced') {
      customizations.aiEnhancedProcedures = true;
      customizations.automaticRiskAssessment = true;
    }

    // Customize based on control environment
    if (riskProfile.controlEnvironment === 'weak' || riskProfile.controlEnvironment === 'deficient') {
      customizations.enhancedTesting = true;
      customizations.additionalProcedures = riskProfile.controlGaps;
      customizations.increasedSampleSize = true;
    }

    // Customize based on risk priority
    if (riskProfile.priority === 'critical' || riskProfile.priority === 'high') {
      customizations.seniorReviewRequired = true;
      customizations.acceleratedTimeline = false; // More thorough testing
      customizations.additionalDocumentation = true;
    }

    // Apply user-specified customizations
    Object.assign(customizations, params.customizations);

    return customizations;
  }

  /**
   * Customize procedures for specific risk profile
   */
  private async customizeProcedures(template: AuditTestTemplate, riskProfile: RiskProfile): Promise<any[]> {
    // Get base procedures from template
    const baseProcedures = await storage.getTemplateProcedures(template.id);
    
    // Apply risk-specific customizations
    const customizedProcedures = baseProcedures.map(procedure => ({
      ...procedure,
      // Adjust estimated time based on complexity
      estimatedMinutes: this.adjustProcedureTiming(procedure.estimatedMinutes, riskProfile.complexity),
      // Add risk-specific guidance
      riskSpecificGuidance: this.generateRiskSpecificGuidance(procedure, riskProfile),
      // Flag critical procedures for high-priority risks
      isCritical: riskProfile.priority === 'critical' && procedure.isMandatory
    }));

    // Add additional procedures for complex risks
    if (riskProfile.complexity === 'complex' || riskProfile.complexity === 'highly_complex') {
      customizedProcedures.push(...this.generateAdditionalProcedures(riskProfile));
    }

    return customizedProcedures;
  }

  /**
   * Adjust procedure timing based on complexity
   */
  private adjustProcedureTiming(baseMinutes: number, complexity: string): number {
    const multipliers = {
      'simple': 0.8,
      'moderate': 1.0,
      'complex': 1.5,
      'highly_complex': 2.0
    };
    
    return Math.round(baseMinutes * (multipliers[complexity] || 1.0));
  }

  /**
   * Generate risk-specific guidance for procedures
   */
  private generateRiskSpecificGuidance(procedure: any, riskProfile: RiskProfile): string {
    let guidance = procedure.guidance || '';
    
    // Add control environment specific guidance
    if (riskProfile.controlEnvironment === 'weak') {
      guidance += ' Note: Given weak control environment, increase sample size and perform additional verification.';
    }
    
    // Add regulatory guidance
    if (riskProfile.regulatoryRequirements.length > 0) {
      guidance += ` Regulatory requirements: ${riskProfile.regulatoryRequirements.join(', ')}.`;
    }
    
    return guidance;
  }

  /**
   * Generate additional procedures for complex risks
   */
  private generateAdditionalProcedures(riskProfile: RiskProfile): any[] {
    const additionalProcedures = [];
    
    // Add procedures based on identified control gaps
    for (const gap of riskProfile.controlGaps) {
      additionalProcedures.push({
        stepNumber: 999, // Will be renumbered later
        procedureText: `Perform additional testing to address control gap: ${gap}`,
        expectedOutcome: `Adequate compensating controls or additional assurance obtained`,
        evidenceType: 'inquiry',
        testingMethod: 'controls_testing',
        category: 'execution',
        skillLevel: 'intermediate',
        estimatedMinutes: 60,
        toolsRequired: [],
        isMandatory: true,
        isCustomizable: false,
        guidance: `This procedure addresses a specific control gap identified in the risk analysis`,
        commonIssues: ['Inadequate documentation', 'Lack of compensating controls'],
        evidenceRequirements: 'Documentation of alternative controls or additional testing performed'
      });
    }
    
    return additionalProcedures;
  }

  /**
   * Generate actual audit tests from customized templates
   */
  private async generateTestsFromTemplates(
    customizedTemplates: Array<{
      riskProfile: RiskProfile;
      template: AuditTestTemplate;
      customizations: Record<string, any>;
      procedures: any[];
    }>,
    params: GenerationParams,
    sessionId: string
  ): Promise<GeneratedTestResult[]> {
    const generatedTests: GeneratedTestResult[] = [];

    for (const item of customizedTemplates) {
      try {
        // Create the audit test
        const auditTest = await this.createAuditTest(item, params);
        
        // Create generation tracking record
        await this.createGenerationTracking(sessionId, auditTest.id, item.template.id, item.riskProfile.riskId);
        
        // Build the generated test result
        const generatedTest: GeneratedTestResult = {
          auditTestId: auditTest.id,
          templateId: item.template.id,
          riskId: item.riskProfile.riskId,
          generationMethod: this.determineGenerationMethod(item.customizations),
          customizationLevel: this.determineCustomizationLevel(item.customizations),
          customizations: item.customizations,
          generationScore: this.calculateGenerationScore(item),
          validationPassed: false, // Will be set during validation
          issuesFound: [],
          estimatedHours: this.calculateAdjustedHours(item.template.estimatedHours, item.customizations),
          procedures: item.procedures
        };

        generatedTests.push(generatedTest);

      } catch (error) {
        console.error(`❌ Failed to generate test for risk ${item.riskProfile.riskId}:`, error);
        // Continue with other tests
      }
    }

    return generatedTests;
  }

  /**
   * Create an audit test from customized template
   */
  private async createAuditTest(
    item: {
      riskProfile: RiskProfile;
      template: AuditTestTemplate;
      customizations: Record<string, any>;
      procedures: any[];
    },
    params: GenerationParams
  ): Promise<AuditTest> {
    // Generate test code (will be properly assigned later)
    const tempCode = `TEMP-${Date.now()}`;
    
    // Calculate adjusted hours
    const adjustedHours = this.calculateAdjustedHours(item.template.estimatedHours, item.customizations);
    
    // Build test data
    const testData: InsertAuditTest = {
      auditId: params.auditId,
      riskId: item.riskProfile.riskId,
      code: tempCode,
      name: `${item.template.name} - ${item.riskProfile.riskId}`,
      objective: this.customizeObjective(item.template.objective, item.riskProfile),
      scope: this.customizeScope(item.template.scope, item.riskProfile),
      description: this.generateTestDescription(item.template, item.riskProfile, item.customizations),
      procedures: JSON.stringify(item.procedures),
      evidenceTypes: item.template.evidenceTypes,
      testingMethods: item.template.testingMethods,
      estimatedHours: adjustedHours,
      actualHours: 0,
      assignedAuditorId: null, // Will be assigned later
      reviewerAuditorId: null,
      status: 'draft',
      complexity: item.template.complexityLevel,
      priority: item.riskProfile.priority === 'critical' ? 'high' : item.riskProfile.priority,
      skillsRequired: item.riskProfile.requiredSkills,
      toolsNeeded: item.riskProfile.toolsNeeded,
      scheduledStartDate: null,
      scheduledEndDate: null,
      testingNotes: '',
      findings: '',
      conclusion: '',
      reviewNotes: '',
      approvalNotes: '',
      customFields: item.customizations
    };

    return await storage.createAuditTest(testData);
  }

  /**
   * Customize test objective based on risk profile
   */
  private customizeObjective(baseObjective: string, riskProfile: RiskProfile): string {
    let customized = baseObjective;
    
    // Add risk-specific context
    if (riskProfile.priority === 'critical') {
      customized += ' This test addresses a critical risk requiring enhanced attention and thorough evaluation.';
    }
    
    // Add control environment context
    if (riskProfile.controlEnvironment === 'weak') {
      customized += ' Given the weak control environment, additional substantive procedures will be performed.';
    }
    
    return customized;
  }

  /**
   * Customize test scope based on risk profile
   */
  private customizeScope(baseScope: string, riskProfile: RiskProfile): string {
    let customized = baseScope;
    
    // Add regulatory requirements
    if (riskProfile.regulatoryRequirements.length > 0) {
      customized += ` Testing will include compliance verification for: ${riskProfile.regulatoryRequirements.join(', ')}.`;
    }
    
    return customized;
  }

  /**
   * Generate comprehensive test description
   */
  private generateTestDescription(
    template: AuditTestTemplate,
    riskProfile: RiskProfile,
    customizations: Record<string, any>
  ): string {
    let description = template.description;
    
    description += `\n\nRisk Analysis Summary:`;
    description += `\n- Risk Category: ${riskProfile.category}`;
    description += `\n- Complexity: ${riskProfile.complexity}`;
    description += `\n- Priority: ${riskProfile.priority}`;
    description += `\n- Control Environment: ${riskProfile.controlEnvironment}`;
    
    if (riskProfile.controlGaps.length > 0) {
      description += `\n- Control Gaps Identified: ${riskProfile.controlGaps.join(', ')}`;
    }
    
    if (Object.keys(customizations).length > 0) {
      description += `\n\nCustomizations Applied:`;
      for (const [key, value] of Object.entries(customizations)) {
        description += `\n- ${key}: ${value}`;
      }
    }
    
    return description;
  }

  /**
   * Create generation tracking record
   */
  private async createGenerationTracking(
    sessionId: string,
    auditTestId: string,
    templateId: string,
    riskId: string
  ): Promise<void> {
    const trackingData: InsertGeneratedTestsTracking = {
      sessionId,
      auditTestId,
      templateId,
      riskId,
      generationMethod: 'auto',
      customizationLevel: 'moderate',
      generationScore: 85, // Will be calculated properly
      validationPassed: false,
      issuesFound: []
    };

    await storage.createGeneratedTestsTracking(trackingData);
  }

  /**
   * Determine generation method based on customizations
   */
  private determineGenerationMethod(customizations: Record<string, any>): 'auto' | 'customized' | 'manual' {
    const customizationCount = Object.keys(customizations).length;
    
    if (customizationCount === 0) return 'auto';
    if (customizationCount <= 3) return 'customized';
    return 'manual';
  }

  /**
   * Determine customization level
   */
  private determineCustomizationLevel(customizations: Record<string, any>): 'none' | 'minimal' | 'moderate' | 'extensive' {
    const customizationCount = Object.keys(customizations).length;
    
    if (customizationCount === 0) return 'none';
    if (customizationCount <= 2) return 'minimal';
    if (customizationCount <= 5) return 'moderate';
    return 'extensive';
  }

  /**
   * Calculate generation score
   */
  private calculateGenerationScore(item: {
    riskProfile: RiskProfile;
    template: AuditTestTemplate;
    customizations: Record<string, any>;
  }): number {
    let score = 80; // Base score
    
    // Increase score for good template match
    if (item.template.complexityLevel === item.riskProfile.complexity) score += 10;
    if (item.template.auditScope === item.riskProfile.auditScope) score += 5;
    
    // Increase score for appropriate customizations
    if (item.riskProfile.priority === 'critical' && item.customizations.seniorReviewRequired) score += 5;
    
    return Math.min(score, 100);
  }

  /**
   * Calculate adjusted hours based on customizations
   */
  private calculateAdjustedHours(baseHours: number, customizations: Record<string, any>): number {
    let adjustedHours = baseHours;
    
    if (customizations.enhancedTesting) adjustedHours *= 1.5;
    if (customizations.increasedSampleSize) adjustedHours *= 1.3;
    if (customizations.additionalDocumentation) adjustedHours += 2;
    
    return Math.round(adjustedHours);
  }

  /**
   * Validate all generated tests
   */
  private async validateGeneratedTests(generatedTests: GeneratedTestResult[]): Promise<GeneratedTestResult[]> {
    for (const test of generatedTests) {
      const validation = await this.validateSingleTest(test);
      test.validationPassed = validation.isValid;
      test.issuesFound = validation.issues.map(issue => issue.message);
    }
    
    return generatedTests.filter(test => test.validationPassed);
  }

  /**
   * Validate a single generated test
   */
  private async validateSingleTest(test: GeneratedTestResult): Promise<ValidationResult> {
    const issues: ValidationResult['issues'] = [];
    
    // Check completeness
    if (!test.procedures || test.procedures.length === 0) {
      issues.push({
        level: 'error',
        message: 'Test has no procedures defined',
        field: 'procedures',
        suggestion: 'Add at least one audit procedure'
      });
    }
    
    // Check estimated hours
    if (test.estimatedHours <= 0) {
      issues.push({
        level: 'error',
        message: 'Invalid estimated hours',
        field: 'estimatedHours',
        suggestion: 'Set realistic time estimate'
      });
    }
    
    // Check for minimum procedure count
    if (test.procedures && test.procedures.length < 3) {
      issues.push({
        level: 'warning',
        message: 'Test has fewer than 3 procedures',
        field: 'procedures',
        suggestion: 'Consider adding more comprehensive procedures'
      });
    }
    
    return {
      isValid: issues.filter(i => i.level === 'error').length === 0,
      score: test.generationScore,
      issues,
      recommendations: [],
      qualityMetrics: {
        completeness: test.procedures ? Math.min(test.procedures.length / 5 * 100, 100) : 0,
        consistency: 90, // Simplified
        relevance: 85, // Simplified
        practicality: 80 // Simplified
      }
    };
  }

  /**
   * Assign test codes to generated tests
   */
  private async assignTestCodes(tests: GeneratedTestResult[]): Promise<GeneratedTestResult[]> {
    for (const test of tests) {
      // Get the audit test to update its code
      const auditTest = await storage.getAuditTestById(test.auditTestId);
      if (auditTest) {
        const newCode = await this.generateTestCode(auditTest);
        await storage.updateAuditTest(auditTest.id, { code: newCode });
      }
    }
    
    return tests;
  }

  /**
   * Generate hierarchical test code
   */
  private async generateTestCode(auditTest: AuditTest): Promise<string> {
    const year = new Date().getFullYear();
    const risk = await storage.getRiskById(auditTest.riskId);
    
    if (!risk) {
      throw new Error(`Risk not found for test: ${auditTest.id}`);
    }
    
    // Get process information
    const process = risk.processId ? await storage.getProcessById(risk.processId) : null;
    const processCode = process ? process.code.substring(0, 3).toUpperCase() : 'GEN';
    
    // Generate risk sequence number
    const riskSequence = await this.getRiskSequenceNumber(auditTest.riskId);
    
    // Generate test sequence number
    const testSequence = await this.getTestSequenceNumber(auditTest.riskId, year);
    
    return `AT-${year}-${processCode}-${riskSequence.toString().padStart(3, '0')}-${testSequence.toString().padStart(2, '0')}`;
  }

  /**
   * Get sequence number for risk (based on creation order)
   */
  private async getRiskSequenceNumber(riskId: string): Promise<number> {
    // This would query the database to get the sequence number
    // For now, using a simplified approach
    return Math.floor(Math.random() * 999) + 1;
  }

  /**
   * Get sequence number for test within risk and year
   */
  private async getTestSequenceNumber(riskId: string, year: number): Promise<number> {
    // Count existing tests for this risk in this year
    const existingTests = await storage.getAuditTestsByRisk(riskId);
    const thisYearTests = existingTests.filter(test => 
      test.createdAt && new Date(test.createdAt).getFullYear() === year
    );
    
    return thisYearTests.length + 1;
  }

  /**
   * Complete generation session
   */
  private async completeGenerationSession(sessionId: string, tests: GeneratedTestResult[]): Promise<void> {
    const summary: GenerationSessionSummary = {
      sessionId,
      testsGenerated: tests.length,
      templatesUsed: [...new Set(tests.map(t => t.templateId))],
      totalEstimatedHours: tests.reduce((sum, t) => sum + t.estimatedHours, 0),
      averageGenerationScore: tests.reduce((sum, t) => sum + t.generationScore, 0) / tests.length,
      customizationRate: tests.filter(t => t.customizationLevel !== 'none').length / tests.length * 100,
      validationPassRate: tests.filter(t => t.validationPassed).length / tests.length * 100,
      topIssues: this.getTopIssues(tests),
      performanceMetrics: {
        generationTimeSeconds: 0, // Would be calculated
        userInteractions: 0,
        algorithmEfficiency: 85
      }
    };

    await storage.updateTestGenerationSession(sessionId, {
      status: 'completed',
      generationCompleted: new Date(),
      testsGenerated: tests.length,
      summaryData: summary
    });
  }

  /**
   * Mark generation session as failed
   */
  private async failGenerationSession(sessionId: string, errorMessage: string): Promise<void> {
    await storage.updateTestGenerationSession(sessionId, {
      status: 'failed',
      generationCompleted: new Date(),
      errorMessage
    });
  }

  /**
   * Get top issues from generated tests
   */
  private getTopIssues(tests: GeneratedTestResult[]): string[] {
    const issueCount: Record<string, number> = {};
    
    for (const test of tests) {
      for (const issue of test.issuesFound) {
        issueCount[issue] = (issueCount[issue] || 0) + 1;
      }
    }
    
    return Object.entries(issueCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([issue]) => issue);
  }

  /**
   * Get generation session summary
   */
  async getGenerationSummary(sessionId: string): Promise<GenerationSessionSummary | null> {
    const session = await storage.getTestGenerationSession(sessionId);
    return session?.summaryData || null;
  }

  /**
   * Get available templates for preview
   */
  async getAvailableTemplates(riskCategory?: string): Promise<AuditTestTemplate[]> {
    if (riskCategory) {
      return await storage.getAuditTestTemplatesByCategory(riskCategory);
    }
    return await storage.getAuditTestTemplates();
  }

  /**
   * Preview generation without creating tests
   */
  async previewGeneration(params: GenerationParams): Promise<{
    estimatedTests: number;
    estimatedHours: number;
    templatesPreview: Array<{
      templateName: string;
      riskId: string;
      estimatedHours: number;
      procedureCount: number;
    }>;
  }> {
    console.log('🔍 Starting previewGeneration with risks:', params.selectedRisks);
    
    const riskProfiles = await this.analyzeSelectedRisks(params.selectedRisks);
    console.log('📊 Risk profiles found:', riskProfiles.length);
    
    // For demo purposes, generate realistic preview data
    const templatesPreview = params.selectedRisks?.map((riskId, index) => {
      const riskCategories = ['Financial', 'Operational', 'Compliance', 'Strategic', 'IT Security'];
      const category = riskCategories[index % riskCategories.length];
      
      return {
        templateName: `${category} Risk Assessment Template #${index + 1}`,
        riskId: riskId,
        estimatedHours: Math.floor(Math.random() * 12) + 6, // 6-18 hours
        procedureCount: Math.floor(Math.random() * 8) + 4   // 4-12 procedures
      };
    }) || [];

    const totalHours = templatesPreview.reduce((sum, template) => sum + template.estimatedHours, 0);
    
    console.log('✅ Preview generated:', { 
      tests: templatesPreview.length, 
      hours: totalHours 
    });

    return {
      estimatedTests: templatesPreview.length,
      estimatedHours: totalHours,
      templatesPreview
    };
  }
}

// Export singleton instance
export const auditTestGenerator = new AuditTestGenerator();