import { relations } from "drizzle-orm/relations";
import { fiscalEntities, processes, macroprocesos, risks, actionPlans, roles, userRoles, users, subprocesos, riskSnapshots, audits, auditControlEvaluations, controls, auditPrograms, auditReports, auditPlans, auditorRoles, auditTeamMembers, auditorTimeDeductions, auditorAvailability, auditFindings, regulations, findingFollowUps, workingPapers, auditPlanCapacity, auditUniverse, controlEvaluationCriteria, controlEvaluationOptions, controlEvaluations, systemConfig, complianceTests, complianceTestControls, riskRegulations, macroprocesoFiscalEntities, processFiscalEntities, auditPrioritizationFactors, auditPlanItems, auditTests, auditMilestones, auditNotifications, auditReviewComments, auditControls, auditAttachments, actions, auditCodeSequences, auditScope, auditTestWorkLogs, auditAttachmentCodeSequences, notificationTemplates, auditTestAttachments, notificationPreferences, notifications, reportGenerationLog, riskTrendingData, auditorPerformanceMetrics, notificationQueue, testGenerationSessions, generationAlgorithmConfig, riskAnalysisProfiles, auditContextAnalysis, auditorExpertiseProfiles, auditBestPractices, timelinePerformanceAnalysis, intelligentRecommendations, optimalTimelinePatterns, procedurePerformanceHistory, recommendationEffectiveness, recommendationFeedback, approvalRecords, approvalAuditTrail, approvalPerformanceMetrics, approvalPolicies, approvalWorkflows, approvalDelegations, approvalHierarchy, approvalNotifications, escalationPaths, approvalRules, auditTestTemplateCategories, auditTestTemplates, generatedTestsTracking, templateCustomizations, templateProcedures, complianceDocuments, controlOwners, revalidations } from "./schema";

export const processesRelations = relations(processes, ({one, many}) => ({
	fiscalEntity: one(fiscalEntities, {
		fields: [processes.fiscalEntityId],
		references: [fiscalEntities.id]
	}),
	macroproceso: one(macroprocesos, {
		fields: [processes.macroprocesoId],
		references: [macroprocesos.id]
	}),
	subprocesos: many(subprocesos),
	risks: many(risks),
	audits: many(audits),
	auditUniverses: many(auditUniverse),
	processFiscalEntities: many(processFiscalEntities),
}));

export const fiscalEntitiesRelations = relations(fiscalEntities, ({many}) => ({
	processes: many(processes),
	macroprocesos: many(macroprocesos),
	macroprocesoFiscalEntities: many(macroprocesoFiscalEntities),
	processFiscalEntities: many(processFiscalEntities),
}));

export const macroprocesosRelations = relations(macroprocesos, ({one, many}) => ({
	processes: many(processes),
	risks: many(risks),
	fiscalEntity: one(fiscalEntities, {
		fields: [macroprocesos.fiscalEntityId],
		references: [fiscalEntities.id]
	}),
	auditUniverses: many(auditUniverse),
	macroprocesoFiscalEntities: many(macroprocesoFiscalEntities),
}));

export const actionPlansRelations = relations(actionPlans, ({one}) => ({
	risk: one(risks, {
		fields: [actionPlans.riskId],
		references: [risks.id]
	}),
}));

export const risksRelations = relations(risks, ({one, many}) => ({
	actionPlans: many(actionPlans),
	riskSnapshots: many(riskSnapshots),
	macroproceso: one(macroprocesos, {
		fields: [risks.macroprocesoId],
		references: [macroprocesos.id]
	}),
	process: one(processes, {
		fields: [risks.processId],
		references: [processes.id]
	}),
	subproceso: one(subprocesos, {
		fields: [risks.subprocesoId],
		references: [subprocesos.id]
	}),
	user: one(users, {
		fields: [risks.validatedBy],
		references: [users.id]
	}),
	auditFindings: many(auditFindings),
	complianceTestControls: many(complianceTestControls),
	riskRegulations: many(riskRegulations),
	auditTests: many(auditTests),
	auditControls: many(auditControls),
	actions: many(actions),
	auditScopes: many(auditScope),
	notifications: many(notifications),
	riskTrendingData: many(riskTrendingData),
	riskAnalysisProfiles: many(riskAnalysisProfiles),
	generatedTestsTrackings: many(generatedTestsTracking),
	templateCustomizations: many(templateCustomizations),
}));

export const userRolesRelations = relations(userRoles, ({one}) => ({
	role: one(roles, {
		fields: [userRoles.roleId],
		references: [roles.id]
	}),
	user: one(users, {
		fields: [userRoles.userId],
		references: [users.id]
	}),
}));

export const rolesRelations = relations(roles, ({many}) => ({
	userRoles: many(userRoles),
}));

export const usersRelations = relations(users, ({many}) => ({
	userRoles: many(userRoles),
	risks: many(risks),
	auditControlEvaluations: many(auditControlEvaluations),
	auditPrograms: many(auditPrograms),
	auditReports_approvedBy: many(auditReports, {
		relationName: "auditReports_approvedBy_users_id"
	}),
	auditReports_preparedBy: many(auditReports, {
		relationName: "auditReports_preparedBy_users_id"
	}),
	auditReports_reviewedBy: many(auditReports, {
		relationName: "auditReports_reviewedBy_users_id"
	}),
	auditPlans_approvedBy: many(auditPlans, {
		relationName: "auditPlans_approvedBy_users_id"
	}),
	auditPlans_createdBy: many(auditPlans, {
		relationName: "auditPlans_createdBy_users_id"
	}),
	auditTeamMembers: many(auditTeamMembers),
	auditorTimeDeductions_approvedBy: many(auditorTimeDeductions, {
		relationName: "auditorTimeDeductions_approvedBy_users_id"
	}),
	auditorTimeDeductions_createdBy: many(auditorTimeDeductions, {
		relationName: "auditorTimeDeductions_createdBy_users_id"
	}),
	auditFindings_identifiedBy: many(auditFindings, {
		relationName: "auditFindings_identifiedBy_users_id"
	}),
	auditFindings_responsiblePerson: many(auditFindings, {
		relationName: "auditFindings_responsiblePerson_users_id"
	}),
	audits_createdBy: many(audits, {
		relationName: "audits_createdBy_users_id"
	}),
	audits_leadAuditor: many(audits, {
		relationName: "audits_leadAuditor_users_id"
	}),
	findingFollowUps: many(findingFollowUps),
	workingPapers_preparedBy: many(workingPapers, {
		relationName: "workingPapers_preparedBy_users_id"
	}),
	workingPapers_reviewedBy: many(workingPapers, {
		relationName: "workingPapers_reviewedBy_users_id"
	}),
	auditPlanCapacities: many(auditPlanCapacity),
	controlEvaluations: many(controlEvaluations),
	systemConfigs: many(systemConfig),
	complianceTestControls_responsiblePerson: many(complianceTestControls, {
		relationName: "complianceTestControls_responsiblePerson_users_id"
	}),
	complianceTestControls_testedBy: many(complianceTestControls, {
		relationName: "complianceTestControls_testedBy_users_id"
	}),
	complianceTests_createdBy: many(complianceTests, {
		relationName: "complianceTests_createdBy_users_id"
	}),
	complianceTests_leadAuditor: many(complianceTests, {
		relationName: "complianceTests_leadAuditor_users_id"
	}),
	riskRegulations: many(riskRegulations),
	regulations_createdBy: many(regulations, {
		relationName: "regulations_createdBy_users_id"
	}),
	regulations_updatedBy: many(regulations, {
		relationName: "regulations_updatedBy_users_id"
	}),
	auditPrioritizationFactors_approvedBy: many(auditPrioritizationFactors, {
		relationName: "auditPrioritizationFactors_approvedBy_users_id"
	}),
	auditPrioritizationFactors_calculatedBy: many(auditPrioritizationFactors, {
		relationName: "auditPrioritizationFactors_calculatedBy_users_id"
	}),
	auditPlanItems_createdBy: many(auditPlanItems, {
		relationName: "auditPlanItems_createdBy_users_id"
	}),
	auditPlanItems_proposedLeadAuditor: many(auditPlanItems, {
		relationName: "auditPlanItems_proposedLeadAuditor_users_id"
	}),
	auditTests_assignedTo: many(auditTests, {
		relationName: "auditTests_assignedTo_users_id"
	}),
	auditTests_createdBy: many(auditTests, {
		relationName: "auditTests_createdBy_users_id"
	}),
	auditTests_executorId: many(auditTests, {
		relationName: "auditTests_executorId_users_id"
	}),
	auditTests_reviewedBy: many(auditTests, {
		relationName: "auditTests_reviewedBy_users_id"
	}),
	auditTests_supervisorId: many(auditTests, {
		relationName: "auditTests_supervisorId_users_id"
	}),
	auditMilestones_completedBy: many(auditMilestones, {
		relationName: "auditMilestones_completedBy_users_id"
	}),
	auditMilestones_responsibleId: many(auditMilestones, {
		relationName: "auditMilestones_responsibleId_users_id"
	}),
	auditNotifications: many(auditNotifications),
	auditReviewComments_commentedBy: many(auditReviewComments, {
		relationName: "auditReviewComments_commentedBy_users_id"
	}),
	auditReviewComments_resolvedBy: many(auditReviewComments, {
		relationName: "auditReviewComments_resolvedBy_users_id"
	}),
	auditAttachments: many(auditAttachments),
	actions_createdBy: many(actions, {
		relationName: "actions_createdBy_users_id"
	}),
	actions_responsible: many(actions, {
		relationName: "actions_responsible_users_id"
	}),
	auditScopes: many(auditScope),
	auditTestWorkLogs_createdBy: many(auditTestWorkLogs, {
		relationName: "auditTestWorkLogs_createdBy_users_id"
	}),
	auditTestWorkLogs_reviewedBy: many(auditTestWorkLogs, {
		relationName: "auditTestWorkLogs_reviewedBy_users_id"
	}),
	notificationTemplates: many(notificationTemplates),
	auditTestAttachments: many(auditTestAttachments),
	notificationPreferences: many(notificationPreferences),
	notifications_createdBy: many(notifications, {
		relationName: "notifications_createdBy_users_id"
	}),
	notifications_recipientId: many(notifications, {
		relationName: "notifications_recipientId_users_id"
	}),
	reportGenerationLogs: many(reportGenerationLog),
	auditorPerformanceMetrics: many(auditorPerformanceMetrics),
	testGenerationSessions_approvedBy: many(testGenerationSessions, {
		relationName: "testGenerationSessions_approvedBy_users_id"
	}),
	testGenerationSessions_createdBy: many(testGenerationSessions, {
		relationName: "testGenerationSessions_createdBy_users_id"
	}),
	generationAlgorithmConfigs: many(generationAlgorithmConfig),
	riskAnalysisProfiles: many(riskAnalysisProfiles),
	auditContextAnalyses: many(auditContextAnalysis),
	auditorExpertiseProfiles: many(auditorExpertiseProfiles),
	auditBestPractices_createdBy: many(auditBestPractices, {
		relationName: "auditBestPractices_createdBy_users_id"
	}),
	auditBestPractices_validatedBy: many(auditBestPractices, {
		relationName: "auditBestPractices_validatedBy_users_id"
	}),
	timelinePerformanceAnalyses: many(timelinePerformanceAnalysis),
	intelligentRecommendations: many(intelligentRecommendations),
	optimalTimelinePatterns: many(optimalTimelinePatterns),
	procedurePerformanceHistories: many(procedurePerformanceHistory),
	recommendationFeedbacks: many(recommendationFeedback),
	approvalAuditTrails: many(approvalAuditTrail),
	approvalPerformanceMetrics: many(approvalPerformanceMetrics),
	approvalPolicies_approvedBy: many(approvalPolicies, {
		relationName: "approvalPolicies_approvedBy_users_id"
	}),
	approvalPolicies_createdBy: many(approvalPolicies, {
		relationName: "approvalPolicies_createdBy_users_id"
	}),
	approvalRecords_approvedBy: many(approvalRecords, {
		relationName: "approvalRecords_approvedBy_users_id"
	}),
	approvalRecords_submittedBy: many(approvalRecords, {
		relationName: "approvalRecords_submittedBy_users_id"
	}),
	approvalDelegations_delegateId: many(approvalDelegations, {
		relationName: "approvalDelegations_delegateId_users_id"
	}),
	approvalDelegations_delegatorId: many(approvalDelegations, {
		relationName: "approvalDelegations_delegatorId_users_id"
	}),
	approvalHierarchies_approverUserId: many(approvalHierarchy, {
		relationName: "approvalHierarchy_approverUserId_users_id"
	}),
	approvalHierarchies_backupApproverUserId: many(approvalHierarchy, {
		relationName: "approvalHierarchy_backupApproverUserId_users_id"
	}),
	approvalNotifications: many(approvalNotifications),
	escalationPaths_currentAssignee: many(escalationPaths, {
		relationName: "escalationPaths_currentAssignee_users_id"
	}),
	escalationPaths_resolvedBy: many(escalationPaths, {
		relationName: "escalationPaths_resolvedBy_users_id"
	}),
	approvalRules_createdBy: many(approvalRules, {
		relationName: "approvalRules_createdBy_users_id"
	}),
	approvalRules_lastModifiedBy: many(approvalRules, {
		relationName: "approvalRules_lastModifiedBy_users_id"
	}),
	auditTestTemplates: many(auditTestTemplates),
	templateCustomizations_approvedBy: many(templateCustomizations, {
		relationName: "templateCustomizations_approvedBy_users_id"
	}),
	templateCustomizations_createdBy: many(templateCustomizations, {
		relationName: "templateCustomizations_createdBy_users_id"
	}),
	complianceDocuments_createdBy: many(complianceDocuments, {
		relationName: "complianceDocuments_createdBy_users_id"
	}),
	complianceDocuments_updatedBy: many(complianceDocuments, {
		relationName: "complianceDocuments_updatedBy_users_id"
	}),
	controlOwners_assignedBy: many(controlOwners, {
		relationName: "controlOwners_assignedBy_users_id"
	}),
	controlOwners_userId: many(controlOwners, {
		relationName: "controlOwners_userId_users_id"
	}),
	controls: many(controls),
	revalidations: many(revalidations),
}));

export const subprocesosRelations = relations(subprocesos, ({one, many}) => ({
	process: one(processes, {
		fields: [subprocesos.procesoId],
		references: [processes.id]
	}),
	risks: many(risks),
	audits: many(audits),
	auditUniverses: many(auditUniverse),
}));

export const riskSnapshotsRelations = relations(riskSnapshots, ({one}) => ({
	risk: one(risks, {
		fields: [riskSnapshots.riskId],
		references: [risks.id]
	}),
}));

export const auditControlEvaluationsRelations = relations(auditControlEvaluations, ({one}) => ({
	audit: one(audits, {
		fields: [auditControlEvaluations.auditId],
		references: [audits.id]
	}),
	control: one(controls, {
		fields: [auditControlEvaluations.controlId],
		references: [controls.id]
	}),
	user: one(users, {
		fields: [auditControlEvaluations.evaluatedBy],
		references: [users.id]
	}),
}));

export const auditsRelations = relations(audits, ({one, many}) => ({
	auditControlEvaluations: many(auditControlEvaluations),
	auditPrograms: many(auditPrograms),
	auditReports: many(auditReports),
	auditFindings: many(auditFindings),
	user_createdBy: one(users, {
		fields: [audits.createdBy],
		references: [users.id],
		relationName: "audits_createdBy_users_id"
	}),
	user_leadAuditor: one(users, {
		fields: [audits.leadAuditor],
		references: [users.id],
		relationName: "audits_leadAuditor_users_id"
	}),
	auditPlan: one(auditPlans, {
		fields: [audits.planId],
		references: [auditPlans.id]
	}),
	process: one(processes, {
		fields: [audits.processId],
		references: [processes.id]
	}),
	regulation: one(regulations, {
		fields: [audits.regulationId],
		references: [regulations.id]
	}),
	subproceso: one(subprocesos, {
		fields: [audits.subprocesoId],
		references: [subprocesos.id]
	}),
	workingPapers: many(workingPapers),
	auditTests: many(auditTests),
	auditMilestones: many(auditMilestones),
	auditNotifications: many(auditNotifications),
	auditReviewComments: many(auditReviewComments),
	auditControls: many(auditControls),
	auditAttachments: many(auditAttachments),
	auditCodeSequences: many(auditCodeSequences),
	auditScopes: many(auditScope),
	notifications: many(notifications),
	testGenerationSessions: many(testGenerationSessions),
}));

export const controlsRelations = relations(controls, ({one, many}) => ({
	auditControlEvaluations: many(auditControlEvaluations),
	auditFindings: many(auditFindings),
	controlEvaluations: many(controlEvaluations),
	complianceTestControls: many(complianceTestControls),
	auditTests: many(auditTests),
	auditControls: many(auditControls),
	auditScopes: many(auditScope),
	notifications: many(notifications),
	controlOwners: many(controlOwners),
	user: one(users, {
		fields: [controls.evaluatedBy],
		references: [users.id]
	}),
	revalidations: many(revalidations),
}));

export const auditProgramsRelations = relations(auditPrograms, ({one, many}) => ({
	user: one(users, {
		fields: [auditPrograms.assignedTo],
		references: [users.id]
	}),
	audit: one(audits, {
		fields: [auditPrograms.auditId],
		references: [audits.id]
	}),
	auditFindings: many(auditFindings),
	workingPapers: many(workingPapers),
	auditTests: many(auditTests),
	auditAttachments: many(auditAttachments),
}));

export const auditReportsRelations = relations(auditReports, ({one}) => ({
	user_approvedBy: one(users, {
		fields: [auditReports.approvedBy],
		references: [users.id],
		relationName: "auditReports_approvedBy_users_id"
	}),
	audit: one(audits, {
		fields: [auditReports.auditId],
		references: [audits.id]
	}),
	user_preparedBy: one(users, {
		fields: [auditReports.preparedBy],
		references: [users.id],
		relationName: "auditReports_preparedBy_users_id"
	}),
	user_reviewedBy: one(users, {
		fields: [auditReports.reviewedBy],
		references: [users.id],
		relationName: "auditReports_reviewedBy_users_id"
	}),
}));

export const auditPlansRelations = relations(auditPlans, ({one, many}) => ({
	user_approvedBy: one(users, {
		fields: [auditPlans.approvedBy],
		references: [users.id],
		relationName: "auditPlans_approvedBy_users_id"
	}),
	user_createdBy: one(users, {
		fields: [auditPlans.createdBy],
		references: [users.id],
		relationName: "auditPlans_createdBy_users_id"
	}),
	audits: many(audits),
	auditPlanCapacities: many(auditPlanCapacity),
	auditPrioritizationFactors: many(auditPrioritizationFactors),
	auditPlanItems: many(auditPlanItems),
}));

export const auditTeamMembersRelations = relations(auditTeamMembers, ({one, many}) => ({
	auditorRole: one(auditorRoles, {
		fields: [auditTeamMembers.auditorRoleId],
		references: [auditorRoles.id]
	}),
	user: one(users, {
		fields: [auditTeamMembers.userId],
		references: [users.id]
	}),
	auditorTimeDeductions: many(auditorTimeDeductions),
	auditorAvailabilities: many(auditorAvailability),
}));

export const auditorRolesRelations = relations(auditorRoles, ({many}) => ({
	auditTeamMembers: many(auditTeamMembers),
}));

export const auditorTimeDeductionsRelations = relations(auditorTimeDeductions, ({one}) => ({
	user_approvedBy: one(users, {
		fields: [auditorTimeDeductions.approvedBy],
		references: [users.id],
		relationName: "auditorTimeDeductions_approvedBy_users_id"
	}),
	user_createdBy: one(users, {
		fields: [auditorTimeDeductions.createdBy],
		references: [users.id],
		relationName: "auditorTimeDeductions_createdBy_users_id"
	}),
	auditTeamMember: one(auditTeamMembers, {
		fields: [auditorTimeDeductions.teamMemberId],
		references: [auditTeamMembers.id]
	}),
}));

export const auditorAvailabilityRelations = relations(auditorAvailability, ({one}) => ({
	auditTeamMember: one(auditTeamMembers, {
		fields: [auditorAvailability.teamMemberId],
		references: [auditTeamMembers.id]
	}),
}));

export const auditFindingsRelations = relations(auditFindings, ({one, many}) => ({
	audit: one(audits, {
		fields: [auditFindings.auditId],
		references: [audits.id]
	}),
	control: one(controls, {
		fields: [auditFindings.controlId],
		references: [controls.id]
	}),
	user_identifiedBy: one(users, {
		fields: [auditFindings.identifiedBy],
		references: [users.id],
		relationName: "auditFindings_identifiedBy_users_id"
	}),
	auditProgram: one(auditPrograms, {
		fields: [auditFindings.programId],
		references: [auditPrograms.id]
	}),
	user_responsiblePerson: one(users, {
		fields: [auditFindings.responsiblePerson],
		references: [users.id],
		relationName: "auditFindings_responsiblePerson_users_id"
	}),
	risk: one(risks, {
		fields: [auditFindings.riskId],
		references: [risks.id]
	}),
	findingFollowUps: many(findingFollowUps),
	auditReviewComments: many(auditReviewComments),
	auditAttachments: many(auditAttachments),
	actions: many(actions),
	notifications: many(notifications),
}));

export const regulationsRelations = relations(regulations, ({one, many}) => ({
	audits: many(audits),
	complianceTests: many(complianceTests),
	riskRegulations: many(riskRegulations),
	user_createdBy: one(users, {
		fields: [regulations.createdBy],
		references: [users.id],
		relationName: "regulations_createdBy_users_id"
	}),
	user_updatedBy: one(users, {
		fields: [regulations.updatedBy],
		references: [users.id],
		relationName: "regulations_updatedBy_users_id"
	}),
}));

export const findingFollowUpsRelations = relations(findingFollowUps, ({one}) => ({
	auditFinding: one(auditFindings, {
		fields: [findingFollowUps.findingId],
		references: [auditFindings.id]
	}),
	user: one(users, {
		fields: [findingFollowUps.reviewedBy],
		references: [users.id]
	}),
}));

export const workingPapersRelations = relations(workingPapers, ({one, many}) => ({
	audit: one(audits, {
		fields: [workingPapers.auditId],
		references: [audits.id]
	}),
	user_preparedBy: one(users, {
		fields: [workingPapers.preparedBy],
		references: [users.id],
		relationName: "workingPapers_preparedBy_users_id"
	}),
	auditProgram: one(auditPrograms, {
		fields: [workingPapers.programId],
		references: [auditPrograms.id]
	}),
	user_reviewedBy: one(users, {
		fields: [workingPapers.reviewedBy],
		references: [users.id],
		relationName: "workingPapers_reviewedBy_users_id"
	}),
	auditReviewComments: many(auditReviewComments),
	auditAttachments: many(auditAttachments),
}));

export const auditPlanCapacityRelations = relations(auditPlanCapacity, ({one}) => ({
	user: one(users, {
		fields: [auditPlanCapacity.createdBy],
		references: [users.id]
	}),
	auditPlan: one(auditPlans, {
		fields: [auditPlanCapacity.planId],
		references: [auditPlans.id]
	}),
}));

export const auditUniverseRelations = relations(auditUniverse, ({one, many}) => ({
	macroproceso: one(macroprocesos, {
		fields: [auditUniverse.macroprocesoId],
		references: [macroprocesos.id]
	}),
	process: one(processes, {
		fields: [auditUniverse.processId],
		references: [processes.id]
	}),
	subproceso: one(subprocesos, {
		fields: [auditUniverse.subprocesoId],
		references: [subprocesos.id]
	}),
	auditPrioritizationFactors: many(auditPrioritizationFactors),
	auditPlanItems: many(auditPlanItems),
}));

export const controlEvaluationOptionsRelations = relations(controlEvaluationOptions, ({one, many}) => ({
	controlEvaluationCriterion: one(controlEvaluationCriteria, {
		fields: [controlEvaluationOptions.criteriaId],
		references: [controlEvaluationCriteria.id]
	}),
	controlEvaluations: many(controlEvaluations),
}));

export const controlEvaluationCriteriaRelations = relations(controlEvaluationCriteria, ({many}) => ({
	controlEvaluationOptions: many(controlEvaluationOptions),
	controlEvaluations: many(controlEvaluations),
}));

export const controlEvaluationsRelations = relations(controlEvaluations, ({one}) => ({
	control: one(controls, {
		fields: [controlEvaluations.controlId],
		references: [controls.id]
	}),
	controlEvaluationCriterion: one(controlEvaluationCriteria, {
		fields: [controlEvaluations.criteriaId],
		references: [controlEvaluationCriteria.id]
	}),
	user: one(users, {
		fields: [controlEvaluations.evaluatedBy],
		references: [users.id]
	}),
	controlEvaluationOption: one(controlEvaluationOptions, {
		fields: [controlEvaluations.optionId],
		references: [controlEvaluationOptions.id]
	}),
}));

export const systemConfigRelations = relations(systemConfig, ({one}) => ({
	user: one(users, {
		fields: [systemConfig.updatedBy],
		references: [users.id]
	}),
}));

export const complianceTestControlsRelations = relations(complianceTestControls, ({one}) => ({
	complianceTest: one(complianceTests, {
		fields: [complianceTestControls.complianceTestId],
		references: [complianceTests.id]
	}),
	control: one(controls, {
		fields: [complianceTestControls.controlId],
		references: [controls.id]
	}),
	user_responsiblePerson: one(users, {
		fields: [complianceTestControls.responsiblePerson],
		references: [users.id],
		relationName: "complianceTestControls_responsiblePerson_users_id"
	}),
	risk: one(risks, {
		fields: [complianceTestControls.riskId],
		references: [risks.id]
	}),
	user_testedBy: one(users, {
		fields: [complianceTestControls.testedBy],
		references: [users.id],
		relationName: "complianceTestControls_testedBy_users_id"
	}),
}));

export const complianceTestsRelations = relations(complianceTests, ({one, many}) => ({
	complianceTestControls: many(complianceTestControls),
	user_createdBy: one(users, {
		fields: [complianceTests.createdBy],
		references: [users.id],
		relationName: "complianceTests_createdBy_users_id"
	}),
	user_leadAuditor: one(users, {
		fields: [complianceTests.leadAuditor],
		references: [users.id],
		relationName: "complianceTests_leadAuditor_users_id"
	}),
	regulation: one(regulations, {
		fields: [complianceTests.regulationId],
		references: [regulations.id]
	}),
}));

export const riskRegulationsRelations = relations(riskRegulations, ({one}) => ({
	user: one(users, {
		fields: [riskRegulations.assessedBy],
		references: [users.id]
	}),
	regulation: one(regulations, {
		fields: [riskRegulations.regulationId],
		references: [regulations.id]
	}),
	risk: one(risks, {
		fields: [riskRegulations.riskId],
		references: [risks.id]
	}),
}));

export const macroprocesoFiscalEntitiesRelations = relations(macroprocesoFiscalEntities, ({one}) => ({
	fiscalEntity: one(fiscalEntities, {
		fields: [macroprocesoFiscalEntities.fiscalEntityId],
		references: [fiscalEntities.id]
	}),
	macroproceso: one(macroprocesos, {
		fields: [macroprocesoFiscalEntities.macroprocesoId],
		references: [macroprocesos.id]
	}),
}));

export const processFiscalEntitiesRelations = relations(processFiscalEntities, ({one}) => ({
	fiscalEntity: one(fiscalEntities, {
		fields: [processFiscalEntities.fiscalEntityId],
		references: [fiscalEntities.id]
	}),
	process: one(processes, {
		fields: [processFiscalEntities.processId],
		references: [processes.id]
	}),
}));

export const auditPrioritizationFactorsRelations = relations(auditPrioritizationFactors, ({one, many}) => ({
	user_approvedBy: one(users, {
		fields: [auditPrioritizationFactors.approvedBy],
		references: [users.id],
		relationName: "auditPrioritizationFactors_approvedBy_users_id"
	}),
	user_calculatedBy: one(users, {
		fields: [auditPrioritizationFactors.calculatedBy],
		references: [users.id],
		relationName: "auditPrioritizationFactors_calculatedBy_users_id"
	}),
	auditPlan: one(auditPlans, {
		fields: [auditPrioritizationFactors.planId],
		references: [auditPlans.id]
	}),
	auditUniverse: one(auditUniverse, {
		fields: [auditPrioritizationFactors.universeId],
		references: [auditUniverse.id]
	}),
	auditPlanItems: many(auditPlanItems),
}));

export const auditPlanItemsRelations = relations(auditPlanItems, ({one}) => ({
	user_createdBy: one(users, {
		fields: [auditPlanItems.createdBy],
		references: [users.id],
		relationName: "auditPlanItems_createdBy_users_id"
	}),
	auditPlan: one(auditPlans, {
		fields: [auditPlanItems.planId],
		references: [auditPlans.id]
	}),
	auditPrioritizationFactor: one(auditPrioritizationFactors, {
		fields: [auditPlanItems.prioritizationId],
		references: [auditPrioritizationFactors.id]
	}),
	user_proposedLeadAuditor: one(users, {
		fields: [auditPlanItems.proposedLeadAuditor],
		references: [users.id],
		relationName: "auditPlanItems_proposedLeadAuditor_users_id"
	}),
	auditUniverse: one(auditUniverse, {
		fields: [auditPlanItems.universeId],
		references: [auditUniverse.id]
	}),
}));

export const auditTestsRelations = relations(auditTests, ({one, many}) => ({
	user_assignedTo: one(users, {
		fields: [auditTests.assignedTo],
		references: [users.id],
		relationName: "auditTests_assignedTo_users_id"
	}),
	audit: one(audits, {
		fields: [auditTests.auditId],
		references: [audits.id]
	}),
	control: one(controls, {
		fields: [auditTests.controlId],
		references: [controls.id]
	}),
	user_createdBy: one(users, {
		fields: [auditTests.createdBy],
		references: [users.id],
		relationName: "auditTests_createdBy_users_id"
	}),
	user_executorId: one(users, {
		fields: [auditTests.executorId],
		references: [users.id],
		relationName: "auditTests_executorId_users_id"
	}),
	auditProgram: one(auditPrograms, {
		fields: [auditTests.programId],
		references: [auditPrograms.id]
	}),
	user_reviewedBy: one(users, {
		fields: [auditTests.reviewedBy],
		references: [users.id],
		relationName: "auditTests_reviewedBy_users_id"
	}),
	risk: one(risks, {
		fields: [auditTests.riskId],
		references: [risks.id]
	}),
	user_supervisorId: one(users, {
		fields: [auditTests.supervisorId],
		references: [users.id],
		relationName: "auditTests_supervisorId_users_id"
	}),
	auditNotifications: many(auditNotifications),
	auditReviewComments: many(auditReviewComments),
	auditAttachments: many(auditAttachments),
	auditTestWorkLogs: many(auditTestWorkLogs),
	auditAttachmentCodeSequences: many(auditAttachmentCodeSequences),
	auditTestAttachments: many(auditTestAttachments),
	notifications: many(notifications),
	auditContextAnalyses: many(auditContextAnalysis),
	timelinePerformanceAnalyses: many(timelinePerformanceAnalysis),
	intelligentRecommendations: many(intelligentRecommendations),
	procedurePerformanceHistories: many(procedurePerformanceHistory),
	recommendationEffectivenesses: many(recommendationEffectiveness),
	generatedTestsTrackings: many(generatedTestsTracking),
}));

export const auditMilestonesRelations = relations(auditMilestones, ({one}) => ({
	audit: one(audits, {
		fields: [auditMilestones.auditId],
		references: [audits.id]
	}),
	user_completedBy: one(users, {
		fields: [auditMilestones.completedBy],
		references: [users.id],
		relationName: "auditMilestones_completedBy_users_id"
	}),
	user_responsibleId: one(users, {
		fields: [auditMilestones.responsibleId],
		references: [users.id],
		relationName: "auditMilestones_responsibleId_users_id"
	}),
}));

export const auditNotificationsRelations = relations(auditNotifications, ({one}) => ({
	audit: one(audits, {
		fields: [auditNotifications.auditId],
		references: [audits.id]
	}),
	auditTest: one(auditTests, {
		fields: [auditNotifications.testId],
		references: [auditTests.id]
	}),
	user: one(users, {
		fields: [auditNotifications.userId],
		references: [users.id]
	}),
}));

export const auditReviewCommentsRelations = relations(auditReviewComments, ({one, many}) => ({
	audit: one(audits, {
		fields: [auditReviewComments.auditId],
		references: [audits.id]
	}),
	user_commentedBy: one(users, {
		fields: [auditReviewComments.commentedBy],
		references: [users.id],
		relationName: "auditReviewComments_commentedBy_users_id"
	}),
	auditFinding: one(auditFindings, {
		fields: [auditReviewComments.findingId],
		references: [auditFindings.id]
	}),
	user_resolvedBy: one(users, {
		fields: [auditReviewComments.resolvedBy],
		references: [users.id],
		relationName: "auditReviewComments_resolvedBy_users_id"
	}),
	auditTest: one(auditTests, {
		fields: [auditReviewComments.testId],
		references: [auditTests.id]
	}),
	workingPaper: one(workingPapers, {
		fields: [auditReviewComments.workingPaperId],
		references: [workingPapers.id]
	}),
	auditTestAttachments: many(auditTestAttachments),
}));

export const auditControlsRelations = relations(auditControls, ({one}) => ({
	audit: one(audits, {
		fields: [auditControls.auditId],
		references: [audits.id]
	}),
	control: one(controls, {
		fields: [auditControls.controlId],
		references: [controls.id]
	}),
	risk: one(risks, {
		fields: [auditControls.riskId],
		references: [risks.id]
	}),
}));

export const auditAttachmentsRelations = relations(auditAttachments, ({one}) => ({
	audit: one(audits, {
		fields: [auditAttachments.auditId],
		references: [audits.id]
	}),
	auditFinding: one(auditFindings, {
		fields: [auditAttachments.findingId],
		references: [auditFindings.id]
	}),
	auditProgram: one(auditPrograms, {
		fields: [auditAttachments.programId],
		references: [auditPrograms.id]
	}),
	auditTest: one(auditTests, {
		fields: [auditAttachments.testId],
		references: [auditTests.id]
	}),
	user: one(users, {
		fields: [auditAttachments.uploadedBy],
		references: [users.id]
	}),
	workingPaper: one(workingPapers, {
		fields: [auditAttachments.workingPaperId],
		references: [workingPapers.id]
	}),
}));

export const actionsRelations = relations(actions, ({one, many}) => ({
	auditFinding: one(auditFindings, {
		fields: [actions.auditFindingId],
		references: [auditFindings.id]
	}),
	user_createdBy: one(users, {
		fields: [actions.createdBy],
		references: [users.id],
		relationName: "actions_createdBy_users_id"
	}),
	user_responsible: one(users, {
		fields: [actions.responsible],
		references: [users.id],
		relationName: "actions_responsible_users_id"
	}),
	risk: one(risks, {
		fields: [actions.riskId],
		references: [risks.id]
	}),
	notifications: many(notifications),
}));

export const auditCodeSequencesRelations = relations(auditCodeSequences, ({one}) => ({
	audit: one(audits, {
		fields: [auditCodeSequences.auditId],
		references: [audits.id]
	}),
}));

export const auditScopeRelations = relations(auditScope, ({one}) => ({
	audit: one(audits, {
		fields: [auditScope.auditId],
		references: [audits.id]
	}),
	control: one(controls, {
		fields: [auditScope.controlId],
		references: [controls.id]
	}),
	user: one(users, {
		fields: [auditScope.createdBy],
		references: [users.id]
	}),
	risk: one(risks, {
		fields: [auditScope.riskId],
		references: [risks.id]
	}),
}));

export const auditTestWorkLogsRelations = relations(auditTestWorkLogs, ({one, many}) => ({
	auditTest: one(auditTests, {
		fields: [auditTestWorkLogs.auditTestId],
		references: [auditTests.id]
	}),
	user_createdBy: one(users, {
		fields: [auditTestWorkLogs.createdBy],
		references: [users.id],
		relationName: "auditTestWorkLogs_createdBy_users_id"
	}),
	user_reviewedBy: one(users, {
		fields: [auditTestWorkLogs.reviewedBy],
		references: [users.id],
		relationName: "auditTestWorkLogs_reviewedBy_users_id"
	}),
	auditTestAttachments: many(auditTestAttachments),
}));

export const auditAttachmentCodeSequencesRelations = relations(auditAttachmentCodeSequences, ({one}) => ({
	auditTest: one(auditTests, {
		fields: [auditAttachmentCodeSequences.auditTestId],
		references: [auditTests.id]
	}),
}));

export const notificationTemplatesRelations = relations(notificationTemplates, ({one}) => ({
	user: one(users, {
		fields: [notificationTemplates.createdBy],
		references: [users.id]
	}),
}));

export const auditTestAttachmentsRelations = relations(auditTestAttachments, ({one}) => ({
	auditTest: one(auditTests, {
		fields: [auditTestAttachments.auditTestId],
		references: [auditTests.id]
	}),
	auditReviewComment: one(auditReviewComments, {
		fields: [auditTestAttachments.reviewCommentId],
		references: [auditReviewComments.id]
	}),
	user: one(users, {
		fields: [auditTestAttachments.uploadedBy],
		references: [users.id]
	}),
	auditTestWorkLog: one(auditTestWorkLogs, {
		fields: [auditTestAttachments.workLogId],
		references: [auditTestWorkLogs.id]
	}),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({one}) => ({
	user: one(users, {
		fields: [notificationPreferences.userId],
		references: [users.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one, many}) => ({
	action: one(actions, {
		fields: [notifications.actionId],
		references: [actions.id]
	}),
	auditFinding: one(auditFindings, {
		fields: [notifications.auditFindingId],
		references: [auditFindings.id]
	}),
	audit: one(audits, {
		fields: [notifications.auditId],
		references: [audits.id]
	}),
	auditTest: one(auditTests, {
		fields: [notifications.auditTestId],
		references: [auditTests.id]
	}),
	control: one(controls, {
		fields: [notifications.controlId],
		references: [controls.id]
	}),
	user_createdBy: one(users, {
		fields: [notifications.createdBy],
		references: [users.id],
		relationName: "notifications_createdBy_users_id"
	}),
	user_recipientId: one(users, {
		fields: [notifications.recipientId],
		references: [users.id],
		relationName: "notifications_recipientId_users_id"
	}),
	risk: one(risks, {
		fields: [notifications.riskId],
		references: [risks.id]
	}),
	notificationQueues: many(notificationQueue),
}));

export const reportGenerationLogRelations = relations(reportGenerationLog, ({one}) => ({
	user: one(users, {
		fields: [reportGenerationLog.requestedBy],
		references: [users.id]
	}),
}));

export const riskTrendingDataRelations = relations(riskTrendingData, ({one}) => ({
	risk: one(risks, {
		fields: [riskTrendingData.riskId],
		references: [risks.id]
	}),
}));

export const auditorPerformanceMetricsRelations = relations(auditorPerformanceMetrics, ({one}) => ({
	user: one(users, {
		fields: [auditorPerformanceMetrics.auditorId],
		references: [users.id]
	}),
}));

export const notificationQueueRelations = relations(notificationQueue, ({one}) => ({
	notification: one(notifications, {
		fields: [notificationQueue.notificationId],
		references: [notifications.id]
	}),
}));

export const testGenerationSessionsRelations = relations(testGenerationSessions, ({one, many}) => ({
	user_approvedBy: one(users, {
		fields: [testGenerationSessions.approvedBy],
		references: [users.id],
		relationName: "testGenerationSessions_approvedBy_users_id"
	}),
	audit: one(audits, {
		fields: [testGenerationSessions.auditId],
		references: [audits.id]
	}),
	user_createdBy: one(users, {
		fields: [testGenerationSessions.createdBy],
		references: [users.id],
		relationName: "testGenerationSessions_createdBy_users_id"
	}),
	generatedTestsTrackings: many(generatedTestsTracking),
}));

export const generationAlgorithmConfigRelations = relations(generationAlgorithmConfig, ({one}) => ({
	user: one(users, {
		fields: [generationAlgorithmConfig.createdBy],
		references: [users.id]
	}),
}));

export const riskAnalysisProfilesRelations = relations(riskAnalysisProfiles, ({one}) => ({
	user: one(users, {
		fields: [riskAnalysisProfiles.analyzedBy],
		references: [users.id]
	}),
	risk: one(risks, {
		fields: [riskAnalysisProfiles.riskId],
		references: [risks.id]
	}),
}));

export const auditContextAnalysisRelations = relations(auditContextAnalysis, ({one}) => ({
	user: one(users, {
		fields: [auditContextAnalysis.analyzedBy],
		references: [users.id]
	}),
	auditTest: one(auditTests, {
		fields: [auditContextAnalysis.auditTestId],
		references: [auditTests.id]
	}),
}));

export const auditorExpertiseProfilesRelations = relations(auditorExpertiseProfiles, ({one}) => ({
	user: one(users, {
		fields: [auditorExpertiseProfiles.auditorId],
		references: [users.id]
	}),
}));

export const auditBestPracticesRelations = relations(auditBestPractices, ({one}) => ({
	user_createdBy: one(users, {
		fields: [auditBestPractices.createdBy],
		references: [users.id],
		relationName: "auditBestPractices_createdBy_users_id"
	}),
	user_validatedBy: one(users, {
		fields: [auditBestPractices.validatedBy],
		references: [users.id],
		relationName: "auditBestPractices_validatedBy_users_id"
	}),
}));

export const timelinePerformanceAnalysisRelations = relations(timelinePerformanceAnalysis, ({one}) => ({
	auditTest: one(auditTests, {
		fields: [timelinePerformanceAnalysis.auditTestId],
		references: [auditTests.id]
	}),
	user: one(users, {
		fields: [timelinePerformanceAnalysis.auditorId],
		references: [users.id]
	}),
}));

export const intelligentRecommendationsRelations = relations(intelligentRecommendations, ({one, many}) => ({
	auditTest: one(auditTests, {
		fields: [intelligentRecommendations.auditTestId],
		references: [auditTests.id]
	}),
	user: one(users, {
		fields: [intelligentRecommendations.createdBy],
		references: [users.id]
	}),
	recommendationEffectivenesses: many(recommendationEffectiveness),
	recommendationFeedbacks: many(recommendationFeedback),
}));

export const optimalTimelinePatternsRelations = relations(optimalTimelinePatterns, ({one}) => ({
	user: one(users, {
		fields: [optimalTimelinePatterns.validatedBy],
		references: [users.id]
	}),
}));

export const procedurePerformanceHistoryRelations = relations(procedurePerformanceHistory, ({one}) => ({
	auditTest: one(auditTests, {
		fields: [procedurePerformanceHistory.auditTestId],
		references: [auditTests.id]
	}),
	user: one(users, {
		fields: [procedurePerformanceHistory.auditorId],
		references: [users.id]
	}),
}));

export const recommendationEffectivenessRelations = relations(recommendationEffectiveness, ({one}) => ({
	auditTest: one(auditTests, {
		fields: [recommendationEffectiveness.auditTestId],
		references: [auditTests.id]
	}),
	intelligentRecommendation: one(intelligentRecommendations, {
		fields: [recommendationEffectiveness.recommendationId],
		references: [intelligentRecommendations.id]
	}),
}));

export const recommendationFeedbackRelations = relations(recommendationFeedback, ({one}) => ({
	user: one(users, {
		fields: [recommendationFeedback.providedBy],
		references: [users.id]
	}),
	intelligentRecommendation: one(intelligentRecommendations, {
		fields: [recommendationFeedback.recommendationId],
		references: [intelligentRecommendations.id]
	}),
}));

export const approvalAuditTrailRelations = relations(approvalAuditTrail, ({one}) => ({
	approvalRecord: one(approvalRecords, {
		fields: [approvalAuditTrail.approvalRecordId],
		references: [approvalRecords.id]
	}),
	user: one(users, {
		fields: [approvalAuditTrail.performedBy],
		references: [users.id]
	}),
}));

export const approvalRecordsRelations = relations(approvalRecords, ({one, many}) => ({
	approvalAuditTrails: many(approvalAuditTrail),
	user_approvedBy: one(users, {
		fields: [approvalRecords.approvedBy],
		references: [users.id],
		relationName: "approvalRecords_approvedBy_users_id"
	}),
	approvalPolicy: one(approvalPolicies, {
		fields: [approvalRecords.policyId],
		references: [approvalPolicies.id]
	}),
	user_submittedBy: one(users, {
		fields: [approvalRecords.submittedBy],
		references: [users.id],
		relationName: "approvalRecords_submittedBy_users_id"
	}),
	approvalWorkflow: one(approvalWorkflows, {
		fields: [approvalRecords.workflowId],
		references: [approvalWorkflows.id]
	}),
	approvalNotifications: many(approvalNotifications),
	escalationPaths: many(escalationPaths),
}));

export const approvalPerformanceMetricsRelations = relations(approvalPerformanceMetrics, ({one}) => ({
	user: one(users, {
		fields: [approvalPerformanceMetrics.approverId],
		references: [users.id]
	}),
}));

export const approvalPoliciesRelations = relations(approvalPolicies, ({one, many}) => ({
	user_approvedBy: one(users, {
		fields: [approvalPolicies.approvedBy],
		references: [users.id],
		relationName: "approvalPolicies_approvedBy_users_id"
	}),
	user_createdBy: one(users, {
		fields: [approvalPolicies.createdBy],
		references: [users.id],
		relationName: "approvalPolicies_createdBy_users_id"
	}),
	approvalRecords: many(approvalRecords),
}));

export const approvalWorkflowsRelations = relations(approvalWorkflows, ({many}) => ({
	approvalRecords: many(approvalRecords),
}));

export const approvalDelegationsRelations = relations(approvalDelegations, ({one}) => ({
	user_delegateId: one(users, {
		fields: [approvalDelegations.delegateId],
		references: [users.id],
		relationName: "approvalDelegations_delegateId_users_id"
	}),
	user_delegatorId: one(users, {
		fields: [approvalDelegations.delegatorId],
		references: [users.id],
		relationName: "approvalDelegations_delegatorId_users_id"
	}),
}));

export const approvalHierarchyRelations = relations(approvalHierarchy, ({one}) => ({
	user_approverUserId: one(users, {
		fields: [approvalHierarchy.approverUserId],
		references: [users.id],
		relationName: "approvalHierarchy_approverUserId_users_id"
	}),
	user_backupApproverUserId: one(users, {
		fields: [approvalHierarchy.backupApproverUserId],
		references: [users.id],
		relationName: "approvalHierarchy_backupApproverUserId_users_id"
	}),
}));

export const approvalNotificationsRelations = relations(approvalNotifications, ({one}) => ({
	approvalRecord: one(approvalRecords, {
		fields: [approvalNotifications.approvalRecordId],
		references: [approvalRecords.id]
	}),
	escalationPath: one(escalationPaths, {
		fields: [approvalNotifications.escalationPathId],
		references: [escalationPaths.id]
	}),
	user: one(users, {
		fields: [approvalNotifications.recipientId],
		references: [users.id]
	}),
}));

export const escalationPathsRelations = relations(escalationPaths, ({one, many}) => ({
	approvalNotifications: many(approvalNotifications),
	approvalRecord: one(approvalRecords, {
		fields: [escalationPaths.approvalRecordId],
		references: [approvalRecords.id]
	}),
	user_currentAssignee: one(users, {
		fields: [escalationPaths.currentAssignee],
		references: [users.id],
		relationName: "escalationPaths_currentAssignee_users_id"
	}),
	user_resolvedBy: one(users, {
		fields: [escalationPaths.resolvedBy],
		references: [users.id],
		relationName: "escalationPaths_resolvedBy_users_id"
	}),
}));

export const approvalRulesRelations = relations(approvalRules, ({one}) => ({
	user_createdBy: one(users, {
		fields: [approvalRules.createdBy],
		references: [users.id],
		relationName: "approvalRules_createdBy_users_id"
	}),
	user_lastModifiedBy: one(users, {
		fields: [approvalRules.lastModifiedBy],
		references: [users.id],
		relationName: "approvalRules_lastModifiedBy_users_id"
	}),
}));

export const auditTestTemplatesRelations = relations(auditTestTemplates, ({one, many}) => ({
	auditTestTemplateCategory: one(auditTestTemplateCategories, {
		fields: [auditTestTemplates.categoryId],
		references: [auditTestTemplateCategories.id]
	}),
	user: one(users, {
		fields: [auditTestTemplates.createdBy],
		references: [users.id]
	}),
	generatedTestsTrackings: many(generatedTestsTracking),
	templateCustomizations: many(templateCustomizations),
	templateProcedures: many(templateProcedures),
}));

export const auditTestTemplateCategoriesRelations = relations(auditTestTemplateCategories, ({many}) => ({
	auditTestTemplates: many(auditTestTemplates),
}));

export const generatedTestsTrackingRelations = relations(generatedTestsTracking, ({one}) => ({
	auditTest: one(auditTests, {
		fields: [generatedTestsTracking.auditTestId],
		references: [auditTests.id]
	}),
	risk: one(risks, {
		fields: [generatedTestsTracking.riskId],
		references: [risks.id]
	}),
	testGenerationSession: one(testGenerationSessions, {
		fields: [generatedTestsTracking.sessionId],
		references: [testGenerationSessions.id]
	}),
	auditTestTemplate: one(auditTestTemplates, {
		fields: [generatedTestsTracking.templateId],
		references: [auditTestTemplates.id]
	}),
}));

export const templateCustomizationsRelations = relations(templateCustomizations, ({one}) => ({
	user_approvedBy: one(users, {
		fields: [templateCustomizations.approvedBy],
		references: [users.id],
		relationName: "templateCustomizations_approvedBy_users_id"
	}),
	user_createdBy: one(users, {
		fields: [templateCustomizations.createdBy],
		references: [users.id],
		relationName: "templateCustomizations_createdBy_users_id"
	}),
	risk: one(risks, {
		fields: [templateCustomizations.riskId],
		references: [risks.id]
	}),
	auditTestTemplate: one(auditTestTemplates, {
		fields: [templateCustomizations.templateId],
		references: [auditTestTemplates.id]
	}),
}));

export const templateProceduresRelations = relations(templateProcedures, ({one}) => ({
	auditTestTemplate: one(auditTestTemplates, {
		fields: [templateProcedures.templateId],
		references: [auditTestTemplates.id]
	}),
}));

export const complianceDocumentsRelations = relations(complianceDocuments, ({one}) => ({
	user_createdBy: one(users, {
		fields: [complianceDocuments.createdBy],
		references: [users.id],
		relationName: "complianceDocuments_createdBy_users_id"
	}),
	user_updatedBy: one(users, {
		fields: [complianceDocuments.updatedBy],
		references: [users.id],
		relationName: "complianceDocuments_updatedBy_users_id"
	}),
}));

export const controlOwnersRelations = relations(controlOwners, ({one}) => ({
	user_assignedBy: one(users, {
		fields: [controlOwners.assignedBy],
		references: [users.id],
		relationName: "controlOwners_assignedBy_users_id"
	}),
	control: one(controls, {
		fields: [controlOwners.controlId],
		references: [controls.id]
	}),
	user_userId: one(users, {
		fields: [controlOwners.userId],
		references: [users.id],
		relationName: "controlOwners_userId_users_id"
	}),
}));

export const revalidationsRelations = relations(revalidations, ({one}) => ({
	control: one(controls, {
		fields: [revalidations.controlId],
		references: [controls.id]
	}),
	user: one(users, {
		fields: [revalidations.revalidatedBy],
		references: [users.id]
	}),
}));