import { storage } from "./storage";
import { 
  type InsertAuditTestTemplateCategory,
  type InsertAuditTestTemplate,
  type InsertTemplateProcedure,
  type AuditTestTemplate,
  type AuditTestTemplateCategory
} from "@shared/schema";

/**
 * TEMPLATE SEEDING SERVICE
 * 
 * Service responsible for populating the database with comprehensive base templates
 * for different risk categories and audit approaches.
 */
export class TemplateSeedingService {

  /**
   * Initialize the complete template repository
   */
  async initializeTemplateRepository(): Promise<void> {
    console.log('🌱 Initializing Audit Test Template Repository...');

    // Step 1: Create template categories
    const categories = await this.createTemplateCategories();
    console.log(`✅ Created ${categories.length} template categories`);

    // Step 2: Create base templates for each category
    const templates = await this.createBaseTemplates(categories);
    console.log(`✅ Created ${templates.length} base templates`);

    // Step 3: Create detailed procedures for each template
    await this.createTemplateProcedures(templates);
    console.log(`✅ Created detailed procedures for all templates`);

    console.log('🎉 Template repository initialization complete!');
  }

  /**
   * Create template categories for organizing templates
   */
  private async createTemplateCategories(): Promise<AuditTestTemplateCategory[]> {
    const categories: InsertAuditTestTemplateCategory[] = [
      {
        name: "Financial Risks",
        code: "FIN",
        description: "Templates for financial statement audits, revenue recognition, cash management, and financial controls",
        color: "#10B981",
        riskTypes: ["revenue_recognition", "cash_flow", "financial_reporting", "asset_valuation", "expense_validation"],
        order: 1
      },
      {
        name: "Operational Risks", 
        code: "OPS",
        description: "Templates for operational efficiency, process controls, quality management, and service delivery",
        color: "#3B82F6",
        riskTypes: ["process_efficiency", "quality_control", "inventory_management", "supplier_management", "customer_service"],
        order: 2
      },
      {
        name: "Compliance Risks",
        code: "COMP",
        description: "Templates for regulatory compliance, policy adherence, and legal requirements",
        color: "#F59E0B",
        riskTypes: ["regulatory_compliance", "policy_adherence", "legal_requirements", "environmental_compliance", "safety_regulations"],
        order: 3
      },
      {
        name: "Strategic Risks",
        code: "STRAT",
        description: "Templates for business continuity, strategic planning, market risks, and governance",
        color: "#8B5CF6",
        riskTypes: ["business_continuity", "strategic_planning", "market_risk", "governance", "reputation_management"],
        order: 4
      },
      {
        name: "IT & Security Risks",
        code: "IT",
        description: "Templates for information security, data privacy, system reliability, and technology governance",
        color: "#EF4444",
        riskTypes: ["information_security", "data_privacy", "system_reliability", "access_controls", "backup_recovery"],
        order: 5
      },
      {
        name: "Reputational Risks",
        code: "REP",
        description: "Templates for brand protection, stakeholder management, and corporate social responsibility",
        color: "#EC4899",
        riskTypes: ["brand_protection", "stakeholder_management", "social_responsibility", "media_relations", "crisis_management"],
        order: 6
      }
    ];

    const createdCategories: AuditTestTemplateCategory[] = [];
    for (const category of categories) {
      const created = await storage.createAuditTestTemplateCategory(category);
      createdCategories.push(created);
    }

    return createdCategories;
  }

  /**
   * Create comprehensive base templates for each category
   */
  private async createBaseTemplates(categories: AuditTestTemplateCategory[]): Promise<AuditTestTemplate[]> {
    const allTemplates: AuditTestTemplate[] = [];

    for (const category of categories) {
      const templates = await this.createTemplatesForCategory(category);
      allTemplates.push(...templates);
    }

    return allTemplates;
  }

  /**
   * Create templates for a specific category
   */
  private async createTemplatesForCategory(category: AuditTestTemplateCategory): Promise<AuditTestTemplate[]> {
    const templates: AuditTestTemplate[] = [];

    switch (category.code) {
      case 'FIN':
        templates.push(...await this.createFinancialTemplates(category.id));
        break;
      case 'OPS':
        templates.push(...await this.createOperationalTemplates(category.id));
        break;
      case 'COMP':
        templates.push(...await this.createComplianceTemplates(category.id));
        break;
      case 'STRAT':
        templates.push(...await this.createStrategicTemplates(category.id));
        break;
      case 'IT':
        templates.push(...await this.createITSecurityTemplates(category.id));
        break;
      case 'REP':
        templates.push(...await this.createReputationalTemplates(category.id));
        break;
    }

    return templates;
  }

  /**
   * Create Financial Risk Templates
   */
  private async createFinancialTemplates(categoryId: string): Promise<AuditTestTemplate[]> {
    const templates: InsertAuditTestTemplate[] = [
      {
        name: "Revenue Recognition Testing",
        code: "FIN-REV-001",
        categoryId,
        riskCategory: "financial",
        riskTypes: ["revenue_recognition", "sales_processes"],
        complexityLevel: "moderate",
        auditScope: "substantive",
        objective: "To verify that revenue is recognized in accordance with applicable accounting standards and that sales transactions are properly recorded and supported by adequate documentation.",
        scope: "All revenue streams for the audit period, including sales transactions, service revenues, and any other sources of income.",
        description: "Comprehensive testing of revenue recognition practices including transaction testing, cut-off procedures, and analytical reviews.",
        proceduresCount: 6,
        evidenceTypes: ["documentary", "analytical", "inquiry"],
        testingMethods: ["substantive", "sampling"],
        skillsRequired: ["Financial Analysis", "Accounting Standards", "Revenue Recognition", "Sampling Techniques"],
        estimatedHours: 16,
        toolsNeeded: ["Data Analytics Software", "Audit Sampling Tools", "Spreadsheet Analysis"],
        reviewLevel: "standard",
        approvalRequired: true,
        isCustomizable: true,
        allowProcedureModification: true,
        version: "1.0",
        tags: ["revenue", "sales", "recognition", "substantive"]
      },
      {
        name: "Cash Management Testing",
        code: "FIN-CASH-001", 
        categoryId,
        riskCategory: "financial",
        riskTypes: ["cash_flow", "treasury_management"],
        complexityLevel: "simple",
        auditScope: "controls",
        objective: "To evaluate the effectiveness of cash management controls and verify the accuracy of cash balances and cash flow reporting.",
        scope: "All cash accounts, bank reconciliations, cash handling procedures, and treasury operations.",
        description: "Testing of cash controls including bank confirmations, reconciliations, and segregation of duties in cash handling.",
        proceduresCount: 5,
        evidenceTypes: ["documentary", "observational", "inquiry"],
        testingMethods: ["controls_testing", "walkthrough"],
        skillsRequired: ["Cash Management", "Internal Controls", "Bank Confirmations"],
        estimatedHours: 12,
        toolsNeeded: ["Bank Confirmation Software", "Reconciliation Tools"],
        reviewLevel: "standard",
        approvalRequired: false,
        isCustomizable: true,
        allowProcedureModification: true,
        version: "1.0",
        tags: ["cash", "treasury", "controls", "reconciliation"]
      },
      {
        name: "Expense Validation Testing",
        code: "FIN-EXP-001",
        categoryId,
        riskCategory: "financial", 
        riskTypes: ["expense_validation", "procurement"],
        complexityLevel: "moderate",
        auditScope: "hybrid",
        objective: "To verify that expenses are properly authorized, accurately recorded, and represent legitimate business transactions.",
        scope: "All major expense categories including operational expenses, capital expenditures, and related party transactions.",
        description: "Comprehensive testing of expense transactions including authorization controls, supporting documentation, and proper classification.",
        proceduresCount: 7,
        evidenceTypes: ["documentary", "inquiry", "analytical"],
        testingMethods: ["substantive", "controls_testing", "sampling"],
        skillsRequired: ["Expense Analysis", "Procurement Auditing", "Authorization Controls"],
        estimatedHours: 18,
        toolsNeeded: ["Expense Analysis Tools", "Sampling Software", "Document Management"],
        reviewLevel: "standard",
        approvalRequired: false,
        isCustomizable: true,
        allowProcedureModification: true,
        version: "1.0",
        tags: ["expenses", "procurement", "authorization", "hybrid"]
      },
      {
        name: "Asset Valuation Testing",
        code: "FIN-ASSET-001",
        categoryId,
        riskCategory: "financial",
        riskTypes: ["asset_valuation", "impairment_testing"],
        complexityLevel: "complex",
        auditScope: "substantive",
        objective: "To verify that assets are properly valued in accordance with accounting standards and that impairment assessments are appropriately performed.",
        scope: "All significant asset categories including property, plant, equipment, intangible assets, and investments.",
        description: "Detailed testing of asset valuations including impairment testing, depreciation calculations, and fair value assessments.",
        proceduresCount: 8,
        evidenceTypes: ["documentary", "analytical", "inquiry"],
        testingMethods: ["substantive", "sampling"],
        skillsRequired: ["Asset Valuation", "Impairment Testing", "Fair Value Accounting", "Advanced Analytics"],
        estimatedHours: 24,
        toolsNeeded: ["Valuation Software", "Financial Modeling Tools", "Market Data Sources"],
        reviewLevel: "enhanced",
        approvalRequired: true,
        isCustomizable: true,
        allowProcedureModification: false,
        version: "1.0",
        tags: ["assets", "valuation", "impairment", "complex"]
      }
    ];

    const createdTemplates: AuditTestTemplate[] = [];
    for (const template of templates) {
      const created = await storage.createAuditTestTemplate(template);
      createdTemplates.push(created);
    }

    return createdTemplates;
  }

  /**
   * Create Operational Risk Templates
   */
  private async createOperationalTemplates(categoryId: string): Promise<AuditTestTemplate[]> {
    const templates: InsertAuditTestTemplate[] = [
      {
        name: "Process Efficiency Testing",
        code: "OPS-PROC-001",
        categoryId,
        riskCategory: "operational",
        riskTypes: ["process_efficiency", "workflow_optimization"],
        complexityLevel: "moderate",
        auditScope: "controls",
        objective: "To evaluate the efficiency and effectiveness of key business processes and identify opportunities for improvement.",
        scope: "Core business processes including order-to-cash, procure-to-pay, and other critical operational workflows.",
        description: "Assessment of process design, execution, monitoring, and continuous improvement practices.",
        proceduresCount: 6,
        evidenceTypes: ["observational", "documentary", "inquiry", "analytical"],
        testingMethods: ["walkthrough", "controls_testing"],
        skillsRequired: ["Process Analysis", "Efficiency Measurement", "Workflow Design", "Performance Metrics"],
        estimatedHours: 20,
        toolsNeeded: ["Process Mapping Software", "Performance Analytics", "Time Studies"],
        reviewLevel: "standard",
        approvalRequired: false,
        isCustomizable: true,
        allowProcedureModification: true,
        version: "1.0",
        tags: ["process", "efficiency", "workflow", "optimization"]
      },
      {
        name: "Quality Control Testing",
        code: "OPS-QUAL-001",
        categoryId,
        riskCategory: "operational",
        riskTypes: ["quality_control", "quality_assurance"],
        complexityLevel: "moderate",
        auditScope: "controls",
        objective: "To assess the effectiveness of quality control measures and verify compliance with quality standards and customer requirements.",
        scope: "All quality control processes, quality assurance procedures, and customer satisfaction measures.",
        description: "Comprehensive evaluation of quality management systems, defect tracking, and continuous improvement processes.",
        proceduresCount: 7,
        evidenceTypes: ["documentary", "observational", "analytical"],
        testingMethods: ["controls_testing", "substantive", "sampling"],
        skillsRequired: ["Quality Management", "Statistical Analysis", "Quality Standards", "Customer Service"],
        estimatedHours: 16,
        toolsNeeded: ["Quality Management Systems", "Statistical Software", "Customer Survey Tools"],
        reviewLevel: "standard",
        approvalRequired: false,
        isCustomizable: true,
        allowProcedureModification: true,
        version: "1.0",
        tags: ["quality", "control", "standards", "customer"]
      },
      {
        name: "Inventory Management Testing",
        code: "OPS-INV-001",
        categoryId,
        riskCategory: "operational",
        riskTypes: ["inventory_management", "supply_chain"],
        complexityLevel: "complex",
        auditScope: "hybrid",
        objective: "To verify the accuracy of inventory records, assess inventory management controls, and evaluate supply chain effectiveness.",
        scope: "All inventory categories, warehouse operations, inventory tracking systems, and supplier relationships.",
        description: "Detailed testing of inventory cycles including receiving, storage, tracking, and disposition processes.",
        proceduresCount: 9,
        evidenceTypes: ["observational", "documentary", "analytical"],
        testingMethods: ["controls_testing", "substantive", "sampling"],
        skillsRequired: ["Inventory Management", "Supply Chain", "Warehouse Operations", "System Controls"],
        estimatedHours: 28,
        toolsNeeded: ["Inventory Management Systems", "RFID Scanners", "Cycle Count Tools"],
        reviewLevel: "enhanced",
        approvalRequired: true,
        isCustomizable: true,
        allowProcedureModification: true,
        version: "1.0",
        tags: ["inventory", "supply_chain", "warehouse", "tracking"]
      }
    ];

    const createdTemplates: AuditTestTemplate[] = [];
    for (const template of templates) {
      const created = await storage.createAuditTestTemplate(template);
      createdTemplates.push(created);
    }

    return createdTemplates;
  }

  /**
   * Create Compliance Risk Templates
   */
  private async createComplianceTemplates(categoryId: string): Promise<AuditTestTemplate[]> {
    const templates: InsertAuditTestTemplate[] = [
      {
        name: "Regulatory Compliance Testing",
        code: "COMP-REG-001",
        categoryId,
        riskCategory: "compliance",
        riskTypes: ["regulatory_compliance", "legal_requirements"],
        complexityLevel: "complex",
        auditScope: "controls",
        objective: "To verify compliance with applicable laws, regulations, and industry standards, and assess the effectiveness of compliance monitoring.",
        scope: "All applicable regulatory requirements including industry-specific regulations, data protection laws, and reporting obligations.",
        description: "Comprehensive assessment of compliance framework, monitoring processes, and regulatory reporting accuracy.",
        proceduresCount: 8,
        evidenceTypes: ["documentary", "inquiry", "analytical"],
        testingMethods: ["controls_testing", "substantive"],
        skillsRequired: ["Regulatory Knowledge", "Compliance Management", "Legal Requirements", "Risk Assessment"],
        estimatedHours: 32,
        toolsNeeded: ["Compliance Management Systems", "Regulatory Databases", "Legal Research Tools"],
        reviewLevel: "enhanced",
        approvalRequired: true,
        isCustomizable: true,
        allowProcedureModification: false,
        version: "1.0",
        tags: ["regulatory", "compliance", "legal", "monitoring"]
      },
      {
        name: "Policy Adherence Testing",
        code: "COMP-POL-001",
        categoryId,
        riskCategory: "compliance",
        riskTypes: ["policy_adherence", "internal_policies"],
        complexityLevel: "moderate",
        auditScope: "controls",
        objective: "To assess adherence to internal policies and procedures and evaluate the effectiveness of policy communication and training.",
        scope: "All significant internal policies including operational procedures, ethical guidelines, and governance policies.",
        description: "Testing of policy implementation, employee awareness, training effectiveness, and exception handling processes.",
        proceduresCount: 6,
        evidenceTypes: ["documentary", "inquiry", "observational"],
        testingMethods: ["controls_testing", "walkthrough"],
        skillsRequired: ["Policy Management", "Training Assessment", "Internal Controls", "Ethics"],
        estimatedHours: 14,
        toolsNeeded: ["Policy Management Systems", "Training Records", "Survey Tools"],
        reviewLevel: "standard",
        approvalRequired: false,
        isCustomizable: true,
        allowProcedureModification: true,
        version: "1.0",
        tags: ["policy", "procedures", "training", "ethics"]
      },
      {
        name: "Data Privacy Testing",
        code: "COMP-PRIV-001",
        categoryId,
        riskCategory: "compliance",
        riskTypes: ["data_privacy", "data_protection"],
        complexityLevel: "complex",
        auditScope: "hybrid",
        objective: "To verify compliance with data privacy regulations and assess the effectiveness of data protection controls and privacy management.",
        scope: "All personal data processing activities, privacy controls, data subject rights management, and cross-border data transfers.",
        description: "Comprehensive assessment of privacy framework including data mapping, consent management, and breach response procedures.",
        proceduresCount: 10,
        evidenceTypes: ["documentary", "observational", "inquiry"],
        testingMethods: ["controls_testing", "substantive"],
        skillsRequired: ["Data Privacy", "GDPR/Privacy Laws", "Data Mapping", "Privacy Engineering"],
        estimatedHours: 36,
        toolsNeeded: ["Privacy Management Platforms", "Data Discovery Tools", "Consent Management Systems"],
        reviewLevel: "expert",
        approvalRequired: true,
        isCustomizable: true,
        allowProcedureModification: false,
        version: "1.0",
        tags: ["privacy", "data_protection", "gdpr", "consent"]
      }
    ];

    const createdTemplates: AuditTestTemplate[] = [];
    for (const template of templates) {
      const created = await storage.createAuditTestTemplate(template);
      createdTemplates.push(created);
    }

    return createdTemplates;
  }

  /**
   * Create Strategic Risk Templates
   */
  private async createStrategicTemplates(categoryId: string): Promise<AuditTestTemplate[]> {
    const templates: InsertAuditTestTemplate[] = [
      {
        name: "Business Continuity Testing",
        code: "STRAT-BC-001",
        categoryId,
        riskCategory: "strategic",
        riskTypes: ["business_continuity", "disaster_recovery"],
        complexityLevel: "complex",
        auditScope: "controls",
        objective: "To assess the adequacy and effectiveness of business continuity and disaster recovery plans and capabilities.",
        scope: "All critical business functions, disaster recovery procedures, backup systems, and crisis management protocols.",
        description: "Comprehensive evaluation of business continuity framework including plan testing, recovery capabilities, and stakeholder communication.",
        proceduresCount: 8,
        evidenceTypes: ["documentary", "observational", "inquiry"],
        testingMethods: ["controls_testing", "walkthrough"],
        skillsRequired: ["Business Continuity", "Disaster Recovery", "Crisis Management", "Risk Assessment"],
        estimatedHours: 30,
        toolsNeeded: ["BCP Management Systems", "Recovery Testing Tools", "Communication Platforms"],
        reviewLevel: "enhanced",
        approvalRequired: true,
        isCustomizable: true,
        allowProcedureModification: true,
        version: "1.0",
        tags: ["continuity", "disaster_recovery", "crisis", "resilience"]
      },
      {
        name: "Strategic Planning Testing",
        code: "STRAT-PLAN-001",
        categoryId,
        riskCategory: "strategic",
        riskTypes: ["strategic_planning", "governance"],
        complexityLevel: "moderate",
        auditScope: "controls",
        objective: "To evaluate the effectiveness of strategic planning processes and assess alignment between strategic objectives and operational execution.",
        scope: "Strategic planning framework, goal setting, performance measurement, and strategic decision-making processes.",
        description: "Assessment of strategic planning methodology, stakeholder involvement, progress monitoring, and strategic risk management.",
        proceduresCount: 6,
        evidenceTypes: ["documentary", "inquiry", "analytical"],
        testingMethods: ["controls_testing", "analytical"],
        skillsRequired: ["Strategic Planning", "Performance Management", "Governance", "Business Analysis"],
        estimatedHours: 22,
        toolsNeeded: ["Strategic Planning Software", "Performance Dashboards", "Analytics Tools"],
        reviewLevel: "enhanced",
        approvalRequired: true,
        isCustomizable: true,
        allowProcedureModification: true,
        version: "1.0",
        tags: ["strategy", "planning", "governance", "performance"]
      }
    ];

    const createdTemplates: AuditTestTemplate[] = [];
    for (const template of templates) {
      const created = await storage.createAuditTestTemplate(template);
      createdTemplates.push(created);
    }

    return createdTemplates;
  }

  /**
   * Create IT & Security Risk Templates
   */
  private async createITSecurityTemplates(categoryId: string): Promise<AuditTestTemplate[]> {
    const templates: InsertAuditTestTemplate[] = [
      {
        name: "Access Controls Testing",
        code: "IT-ACCESS-001",
        categoryId,
        riskCategory: "it_security",
        riskTypes: ["access_controls", "user_management"],
        complexityLevel: "moderate",
        auditScope: "controls",
        objective: "To verify that access controls are properly designed and operating effectively to prevent unauthorized access to systems and data.",
        scope: "All IT systems, applications, databases, and network infrastructure requiring access controls.",
        description: "Comprehensive testing of user access management including provisioning, review, and deprovisioning processes.",
        proceduresCount: 7,
        evidenceTypes: ["documentary", "observational", "inquiry"],
        testingMethods: ["controls_testing", "sampling"],
        skillsRequired: ["IT Auditing", "Access Controls", "Identity Management", "Security Assessment"],
        estimatedHours: 20,
        toolsNeeded: ["Identity Management Systems", "Access Review Tools", "Log Analysis Software"],
        reviewLevel: "enhanced",
        approvalRequired: true,
        isCustomizable: true,
        allowProcedureModification: true,
        version: "1.0",
        tags: ["access", "identity", "security", "controls"]
      },
      {
        name: "Data Integrity Testing",
        code: "IT-DATA-001",
        categoryId,
        riskCategory: "it_security",
        riskTypes: ["data_integrity", "data_quality"],
        complexityLevel: "complex",
        auditScope: "hybrid",
        objective: "To verify the accuracy, completeness, and reliability of data across systems and assess data governance controls.",
        scope: "All critical data repositories, data processing systems, data integration processes, and data quality controls.",
        description: "Detailed assessment of data integrity controls including validation, reconciliation, and error handling processes.",
        proceduresCount: 9,
        evidenceTypes: ["analytical", "documentary", "observational"],
        testingMethods: ["substantive", "controls_testing"],
        skillsRequired: ["Data Analytics", "Data Governance", "Database Management", "Quality Assurance"],
        estimatedHours: 32,
        toolsNeeded: ["Data Analytics Platforms", "Data Quality Tools", "Database Query Tools"],
        reviewLevel: "expert",
        approvalRequired: true,
        isCustomizable: true,
        allowProcedureModification: false,
        version: "1.0",
        tags: ["data", "integrity", "quality", "governance"]
      },
      {
        name: "Cybersecurity Testing",
        code: "IT-CYBER-001",
        categoryId,
        riskCategory: "it_security",
        riskTypes: ["cybersecurity", "threat_management"],
        complexityLevel: "highly_complex",
        auditScope: "controls",
        objective: "To assess the effectiveness of cybersecurity controls and the organization's ability to detect, respond to, and recover from cyber threats.",
        scope: "All cybersecurity controls including firewalls, intrusion detection, security monitoring, incident response, and security awareness.",
        description: "Comprehensive evaluation of cybersecurity framework including threat detection, vulnerability management, and security incident response.",
        proceduresCount: 12,
        evidenceTypes: ["documentary", "observational", "analytical"],
        testingMethods: ["controls_testing", "substantive"],
        skillsRequired: ["Cybersecurity", "Threat Analysis", "Incident Response", "Vulnerability Assessment", "Security Architecture"],
        estimatedHours: 48,
        toolsNeeded: ["Security Information Systems", "Vulnerability Scanners", "Threat Intelligence Platforms"],
        reviewLevel: "expert",
        approvalRequired: true,
        isCustomizable: false,
        allowProcedureModification: false,
        version: "1.0",
        tags: ["cybersecurity", "threats", "incidents", "vulnerabilities"]
      }
    ];

    const createdTemplates: AuditTestTemplate[] = [];
    for (const template of templates) {
      const created = await storage.createAuditTestTemplate(template);
      createdTemplates.push(created);
    }

    return createdTemplates;
  }

  /**
   * Create Reputational Risk Templates
   */
  private async createReputationalTemplates(categoryId: string): Promise<AuditTestTemplate[]> {
    const templates: InsertAuditTestTemplate[] = [
      {
        name: "Brand Protection Testing",
        code: "REP-BRAND-001",
        categoryId,
        riskCategory: "reputational",
        riskTypes: ["brand_protection", "reputation_management"],
        complexityLevel: "moderate",
        auditScope: "controls",
        objective: "To assess the effectiveness of brand protection measures and reputation management controls.",
        scope: "All brand protection activities, marketing controls, social media management, and reputation monitoring processes.",
        description: "Evaluation of brand management framework including trademark protection, brand monitoring, and crisis communication preparedness.",
        proceduresCount: 6,
        evidenceTypes: ["documentary", "observational", "inquiry"],
        testingMethods: ["controls_testing", "walkthrough"],
        skillsRequired: ["Brand Management", "Reputation Monitoring", "Crisis Communication", "Marketing Controls"],
        estimatedHours: 18,
        toolsNeeded: ["Brand Monitoring Tools", "Social Media Analytics", "Communication Platforms"],
        reviewLevel: "standard",
        approvalRequired: false,
        isCustomizable: true,
        allowProcedureModification: true,
        version: "1.0",
        tags: ["brand", "reputation", "monitoring", "protection"]
      },
      {
        name: "Stakeholder Management Testing",
        code: "REP-STAKE-001",
        categoryId,
        riskCategory: "reputational",
        riskTypes: ["stakeholder_management", "communication"],
        complexityLevel: "moderate",
        auditScope: "controls",
        objective: "To evaluate the effectiveness of stakeholder engagement and communication processes and assess stakeholder satisfaction levels.",
        scope: "All stakeholder categories including customers, investors, employees, regulators, and community representatives.",
        description: "Assessment of stakeholder identification, engagement strategies, communication effectiveness, and feedback management.",
        proceduresCount: 7,
        evidenceTypes: ["documentary", "inquiry", "analytical"],
        testingMethods: ["controls_testing", "substantive"],
        skillsRequired: ["Stakeholder Management", "Communication Strategy", "Relationship Management", "Survey Analysis"],
        estimatedHours: 16,
        toolsNeeded: ["Stakeholder Management Systems", "Survey Platforms", "Communication Tools"],
        reviewLevel: "standard",
        approvalRequired: false,
        isCustomizable: true,
        allowProcedureModification: true,
        version: "1.0",
        tags: ["stakeholder", "engagement", "communication", "satisfaction"]
      }
    ];

    const createdTemplates: AuditTestTemplate[] = [];
    for (const template of templates) {
      const created = await storage.createAuditTestTemplate(template);
      createdTemplates.push(created);
    }

    return createdTemplates;
  }

  /**
   * Create detailed procedures for all templates
   */
  private async createTemplateProcedures(templates: AuditTestTemplate[]): Promise<void> {
    for (const template of templates) {
      await this.createProceduresForTemplate(template);
    }
  }

  /**
   * Create procedures for a specific template
   */
  private async createProceduresForTemplate(template: AuditTestTemplate): Promise<void> {
    const procedures = this.generateProceduresForTemplate(template);
    
    for (const procedure of procedures) {
      await storage.createTemplateProcedure({
        ...procedure,
        templateId: template.id
      });
    }
  }

  /**
   * Generate procedures based on template characteristics
   */
  private generateProceduresForTemplate(template: AuditTestTemplate): Omit<InsertTemplateProcedure, 'templateId'>[] {
    // This is a simplified version - in practice, this would be much more sophisticated
    // and would include comprehensive procedure libraries for each risk category
    
    if (template.code.startsWith('FIN-REV')) {
      return this.getRevenueRecognitionProcedures();
    } else if (template.code.startsWith('FIN-CASH')) {
      return this.getCashManagementProcedures();
    } else if (template.code.startsWith('OPS-PROC')) {
      return this.getProcessEfficiencyProcedures();
    } else if (template.code.startsWith('COMP-REG')) {
      return this.getRegulatoryComplianceProcedures();
    } else if (template.code.startsWith('IT-ACCESS')) {
      return this.getAccessControlsProcedures();
    }
    
    // Default generic procedures
    return this.getGenericAuditProcedures();
  }

  /**
   * Revenue Recognition Procedures
   */
  private getRevenueRecognitionProcedures(): Omit<InsertTemplateProcedure, 'templateId'>[] {
    return [
      {
        stepNumber: 1,
        procedureText: "Obtain and review the entity's revenue recognition policies and assess compliance with applicable accounting standards (IFRS 15/ASC 606).",
        expectedOutcome: "Understanding of revenue recognition framework and identification of potential compliance gaps.",
        evidenceType: "documentary",
        testingMethod: "substantive",
        category: "preparation",
        skillLevel: "intermediate",
        estimatedMinutes: 90,
        toolsRequired: ["Accounting Standards Database", "Policy Documentation"],
        isMandatory: true,
        isCustomizable: false,
        alternativeProcedures: [],
        guidance: "Focus on contract types, performance obligations, and timing of recognition. Pay special attention to complex arrangements.",
        commonIssues: ["Incomplete policies", "Non-compliance with new standards", "Lack of documentation"],
        evidenceRequirements: "Revenue recognition policy documents, accounting standards analysis, compliance assessment"
      },
      {
        stepNumber: 2,
        procedureText: "Select a sample of revenue transactions and verify supporting documentation including contracts, delivery confirmations, and payment records.",
        expectedOutcome: "Verification that revenue transactions are properly supported and accurately recorded.",
        evidenceType: "documentary",
        testingMethod: "sampling",
        category: "execution",
        skillLevel: "intermediate",
        estimatedMinutes: 180,
        toolsRequired: ["Sampling Software", "Document Management System"],
        isMandatory: true,
        isCustomizable: true,
        alternativeProcedures: ["Analytical procedures for low-risk transactions"],
        guidance: "Use statistical sampling for material revenue streams. Ensure sample covers all significant revenue types.",
        commonIssues: ["Missing supporting documentation", "Timing differences", "Inadequate contract analysis"],
        evidenceRequirements: "Sales contracts, invoices, delivery confirmations, payment receipts, journal entries"
      },
      {
        stepNumber: 3,
        procedureText: "Perform revenue cut-off testing by examining transactions recorded near year-end to ensure proper period allocation.",
        expectedOutcome: "Assurance that revenue is recorded in the correct accounting period.",
        evidenceType: "documentary",
        testingMethod: "substantive",
        category: "execution",
        skillLevel: "intermediate",
        estimatedMinutes: 120,
        toolsRequired: ["Transaction Analysis Tools", "Period-end Documentation"],
        isMandatory: true,
        isCustomizable: false,
        alternativeProcedures: [],
        guidance: "Test transactions 5-10 days before and after year-end. Focus on delivery terms and revenue recognition criteria.",
        commonIssues: ["Improper cut-off", "Bill and hold arrangements", "Consignment sales"],
        evidenceRequirements: "Shipping documents, delivery confirmations, sales agreements, journal entries"
      }
    ];
  }

  /**
   * Cash Management Procedures
   */
  private getCashManagementProcedures(): Omit<InsertTemplateProcedure, 'templateId'>[] {
    return [
      {
        stepNumber: 1,
        procedureText: "Obtain bank confirmations for all significant cash accounts and verify balances as of the audit date.",
        expectedOutcome: "Independent confirmation of cash balances and identification of any unrecorded transactions.",
        evidenceType: "documentary",
        testingMethod: "substantive",
        category: "execution",
        skillLevel: "basic",
        estimatedMinutes: 60,
        toolsRequired: ["Bank Confirmation Software", "Secure Communication"],
        isMandatory: true,
        isCustomizable: false,
        alternativeProcedures: [],
        guidance: "Send confirmations directly to banks. Follow up on non-responses and investigate unusual items.",
        commonIssues: ["Non-responsive banks", "Unrecorded transactions", "Stale confirmations"],
        evidenceRequirements: "Bank confirmation letters, bank statements, reconciliation documentation"
      },
      {
        stepNumber: 2,
        procedureText: "Review and test bank reconciliations for all cash accounts, verifying mathematical accuracy and investigating outstanding items.",
        expectedOutcome: "Verification of cash reconciliation accuracy and resolution of outstanding reconciling items.",
        evidenceType: "documentary",
        testingMethod: "substantive",
        category: "execution",
        skillLevel: "basic",
        estimatedMinutes: 90,
        toolsRequired: ["Reconciliation Software", "Spreadsheet Analysis"],
        isMandatory: true,
        isCustomizable: true,
        alternativeProcedures: ["Automated reconciliation review for low-risk accounts"],
        guidance: "Pay attention to old outstanding checks, deposits in transit, and bank errors. Verify subsequent clearance.",
        commonIssues: ["Unreconciled differences", "Stale outstanding items", "Missing supporting documentation"],
        evidenceRequirements: "Bank reconciliations, bank statements, outstanding item analysis, subsequent clearance evidence"
      }
    ];
  }

  /**
   * Process Efficiency Procedures
   */
  private getProcessEfficiencyProcedures(): Omit<InsertTemplateProcedure, 'templateId'>[] {
    return [
      {
        stepNumber: 1,
        procedureText: "Document and analyze key business processes to understand workflow, identify bottlenecks, and assess efficiency measures.",
        expectedOutcome: "Comprehensive understanding of process design and identification of inefficiencies.",
        evidenceType: "observational",
        testingMethod: "walkthrough",
        category: "preparation",
        skillLevel: "intermediate",
        estimatedMinutes: 180,
        toolsRequired: ["Process Mapping Software", "Time Study Tools"],
        isMandatory: true,
        isCustomizable: true,
        alternativeProcedures: ["Process documentation review for well-documented processes"],
        guidance: "Focus on critical processes with high transaction volumes. Use process mapping to visualize workflows.",
        commonIssues: ["Undocumented processes", "Process variations", "Lack of performance metrics"],
        evidenceRequirements: "Process documentation, workflow diagrams, performance metrics, efficiency measurements"
      }
    ];
  }

  /**
   * Regulatory Compliance Procedures
   */
  private getRegulatoryComplianceProcedures(): Omit<InsertTemplateProcedure, 'templateId'>[] {
    return [
      {
        stepNumber: 1,
        procedureText: "Identify all applicable regulations and assess the entity's compliance monitoring framework and regulatory change management process.",
        expectedOutcome: "Complete inventory of regulatory requirements and assessment of compliance framework adequacy.",
        evidenceType: "documentary",
        testingMethod: "controls_testing",
        category: "preparation",
        skillLevel: "advanced",
        estimatedMinutes: 240,
        toolsRequired: ["Regulatory Database", "Compliance Management System"],
        isMandatory: true,
        isCustomizable: false,
        alternativeProcedures: [],
        guidance: "Consider industry-specific regulations, multi-jurisdictional requirements, and recent regulatory changes.",
        commonIssues: ["Incomplete regulatory inventory", "Lack of change management", "Inadequate monitoring"],
        evidenceRequirements: "Regulatory inventory, compliance policies, monitoring procedures, training records"
      }
    ];
  }

  /**
   * Access Controls Procedures
   */
  private getAccessControlsProcedures(): Omit<InsertTemplateProcedure, 'templateId'>[] {
    return [
      {
        stepNumber: 1,
        procedureText: "Review user access management procedures including provisioning, modification, and deprovisioning processes for all critical systems.",
        expectedOutcome: "Understanding of access management lifecycle and identification of control weaknesses.",
        evidenceType: "documentary",
        testingMethod: "controls_testing",
        category: "preparation",
        skillLevel: "intermediate",
        estimatedMinutes: 120,
        toolsRequired: ["Identity Management System", "Access Review Tools"],
        isMandatory: true,
        isCustomizable: true,
        alternativeProcedures: ["Automated access review for standardized systems"],
        guidance: "Focus on privileged access, segregation of duties, and periodic access reviews. Test both automated and manual controls.",
        commonIssues: ["Excessive access rights", "Lack of periodic reviews", "Inadequate segregation of duties"],
        evidenceRequirements: "Access management procedures, user access reports, review documentation, approval records"
      }
    ];
  }

  /**
   * Generic Audit Procedures
   */
  private getGenericAuditProcedures(): Omit<InsertTemplateProcedure, 'templateId'>[] {
    return [
      {
        stepNumber: 1,
        procedureText: "Plan and design audit procedures based on risk assessment and understanding of the area under review.",
        expectedOutcome: "Comprehensive audit plan tailored to identified risks and control environment.",
        evidenceType: "documentary",
        testingMethod: "controls_testing",
        category: "preparation",
        skillLevel: "intermediate",
        estimatedMinutes: 60,
        toolsRequired: ["Audit Planning Software", "Risk Assessment Tools"],
        isMandatory: true,
        isCustomizable: true,
        alternativeProcedures: [],
        guidance: "Ensure procedures address identified risks and control gaps.",
        commonIssues: ["Inadequate planning", "Misaligned procedures", "Insufficient risk consideration"],
        evidenceRequirements: "Audit plan, risk assessment, procedure design documentation"
      }
    ];
  }

  /**
   * Check if templates are already seeded
   */
  async isRepositoryInitialized(): Promise<boolean> {
    const categories = await storage.getAuditTestTemplateCategories();
    return categories.length > 0;
  }

  /**
   * Clear existing templates (for re-seeding)
   */
  async clearRepository(): Promise<void> {
    // Implementation would clear all existing templates
    console.log('⚠️ Repository clearing not implemented - for safety reasons');
  }
}

// Export singleton instance
export const templateSeedingService = new TemplateSeedingService();