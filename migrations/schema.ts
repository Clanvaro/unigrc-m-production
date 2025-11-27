import { pgTable, foreignKey, unique, varchar, text, timestamp, integer, boolean, numeric, index, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const processes = pgTable("processes", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	description: text(),
	owner: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	macroprocesoId: varchar("macroproceso_id"),
	fiscalEntityId: varchar("fiscal_entity_id"),
	entityScope: text("entity_scope").default('transversal').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.fiscalEntityId],
			foreignColumns: [fiscalEntities.id],
			name: "processes_fiscal_entity_id_fiscal_entities_id_fk"
		}),
	foreignKey({
			columns: [table.macroprocesoId],
			foreignColumns: [macroprocesos.id],
			name: "processes_macroproceso_id_macroprocesos_id_fk"
		}),
	unique("processes_code_unique").on(table.code),
]);

export const actionPlans = pgTable("action_plans", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	code: text().notNull(),
	riskId: varchar("risk_id").notNull(),
	name: text().notNull(),
	description: text(),
	responsible: text(),
	dueDate: timestamp("due_date", { mode: 'string' }),
	priority: text().notNull(),
	status: text().default('pending').notNull(),
	progress: integer().default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.riskId],
			foreignColumns: [risks.id],
			name: "action_plans_risk_id_risks_id_fk"
		}),
	unique("action_plans_code_unique").on(table.code),
]);

export const riskCategories = pgTable("risk_categories", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	color: text().default('#6b7280'),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("risk_categories_name_unique").on(table.name),
]);

export const userRoles = pgTable("user_roles", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	roleId: varchar("role_id").notNull(),
	assignedAt: timestamp("assigned_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "user_roles_role_id_roles_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_roles_user_id_users_id_fk"
		}),
]);

export const roles = pgTable("roles", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	permissions: text().array().default([""]),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("roles_name_unique").on(table.name),
]);

export const riskControls = pgTable("risk_controls", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	riskId: varchar("risk_id").notNull(),
	controlId: varchar("control_id").notNull(),
	residualRisk: numeric("residual_risk", { precision: 5, scale:  1 }).notNull(),
});

export const subprocesos = pgTable("subprocesos", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	description: text(),
	owner: text(),
	procesoId: varchar("proceso_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.procesoId],
			foreignColumns: [processes.id],
			name: "subprocesos_proceso_id_processes_id_fk"
		}),
	unique("subprocesos_code_unique").on(table.code),
]);

export const riskSnapshots = pgTable("risk_snapshots", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	riskId: varchar("risk_id").notNull(),
	snapshotDate: timestamp("snapshot_date", { mode: 'string' }).notNull(),
	probability: integer().notNull(),
	impact: integer().notNull(),
	inherentRisk: integer("inherent_risk").notNull(),
	residualRisk: integer("residual_risk"),
	validationStatus: text("validation_status").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.riskId],
			foreignColumns: [risks.id],
			name: "risk_snapshots_risk_id_risks_id_fk"
		}),
]);

export const users = pgTable("users", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	username: text(),
	email: text(),
	fullName: text("full_name"),
	password: text(),
	isActive: boolean("is_active").default(true).notNull(),
	lastLogin: timestamp("last_login", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	profileImageUrl: text("profile_image_url"),
	cargo: text(),
}, (table) => [
	unique("users_username_unique").on(table.username),
	unique("users_email_unique").on(table.email),
]);

export const risks = pgTable("risks", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	code: text().notNull(),
	processId: varchar("process_id"),
	name: text().notNull(),
	description: text(),
	category: text().array().default([""]),
	probability: integer().notNull(),
	impact: integer().notNull(),
	inherentRisk: integer("inherent_risk").notNull(),
	status: text().default('active').notNull(),
	processOwner: text("process_owner"),
	validationStatus: text("validation_status").default('pending_validation').notNull(),
	validatedBy: varchar("validated_by"),
	validatedAt: timestamp("validated_at", { mode: 'string' }),
	validationComments: text("validation_comments"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	subprocesoId: varchar("subproceso_id"),
	macroprocesoId: varchar("macroproceso_id"),
	frequencyOccurrence: integer("frequency_occurrence").default(3).notNull(),
	exposureVolume: integer("exposure_volume").default(3).notNull(),
	exposureMassivity: integer("exposure_massivity").default(3).notNull(),
	exposureCriticalPath: integer("exposure_critical_path").default(3).notNull(),
	complexity: integer().default(3).notNull(),
	changeVolatility: integer("change_volatility").default(3).notNull(),
	vulnerabilities: integer().default(3).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.macroprocesoId],
			foreignColumns: [macroprocesos.id],
			name: "risks_macroproceso_id_macroprocesos_id_fk"
		}),
	foreignKey({
			columns: [table.processId],
			foreignColumns: [processes.id],
			name: "risks_process_id_processes_id_fk"
		}),
	foreignKey({
			columns: [table.subprocesoId],
			foreignColumns: [subprocesos.id],
			name: "risks_subproceso_id_subprocesos_id_fk"
		}),
	foreignKey({
			columns: [table.validatedBy],
			foreignColumns: [users.id],
			name: "risks_validated_by_users_id_fk"
		}),
	unique("risks_code_unique").on(table.code),
]);

export const macroprocesos = pgTable("macroprocesos", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	description: text(),
	type: text().notNull(),
	order: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	fiscalEntityId: varchar("fiscal_entity_id"),
	entityScope: text("entity_scope").default('transversal').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.fiscalEntityId],
			foreignColumns: [fiscalEntities.id],
			name: "macroprocesos_fiscal_entity_id_fiscal_entities_id_fk"
		}),
	unique("macroprocesos_code_unique").on(table.code),
]);

export const auditControlEvaluations = pgTable("audit_control_evaluations", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	auditId: varchar("audit_id").notNull(),
	controlId: varchar("control_id").notNull(),
	designEffectiveness: text("design_effectiveness").notNull(),
	operatingEffectiveness: text("operating_effectiveness").notNull(),
	testingNature: text("testing_nature"),
	testingExtent: text("testing_extent"),
	testingResults: text("testing_results").notNull(),
	deficiencies: text(),
	recommendations: text(),
	newEffectivenessRating: integer("new_effectiveness_rating"),
	evaluatedBy: varchar("evaluated_by").notNull(),
	evaluatedDate: timestamp("evaluated_date", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.auditId],
			foreignColumns: [audits.id],
			name: "audit_control_evaluations_audit_id_audits_id_fk"
		}),
	foreignKey({
			columns: [table.controlId],
			foreignColumns: [controls.id],
			name: "audit_control_evaluations_control_id_controls_id_fk"
		}),
	foreignKey({
			columns: [table.evaluatedBy],
			foreignColumns: [users.id],
			name: "audit_control_evaluations_evaluated_by_users_id_fk"
		}),
]);

export const auditPrograms = pgTable("audit_programs", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	auditId: varchar("audit_id").notNull(),
	code: text().notNull(),
	name: text().notNull(),
	objective: text().notNull(),
	procedures: text().array().default([""]),
	estimatedHours: integer("estimated_hours"),
	assignedTo: varchar("assigned_to"),
	status: text().default('pending').notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.assignedTo],
			foreignColumns: [users.id],
			name: "audit_programs_assigned_to_users_id_fk"
		}),
	foreignKey({
			columns: [table.auditId],
			foreignColumns: [audits.id],
			name: "audit_programs_audit_id_audits_id_fk"
		}),
]);

export const auditReports = pgTable("audit_reports", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	auditId: varchar("audit_id").notNull(),
	code: text().notNull(),
	title: text().notNull(),
	executiveSummary: text("executive_summary").notNull(),
	background: text(),
	scope: text().notNull(),
	methodology: text().notNull(),
	keyFindings: text("key_findings").array().default([""]),
	conclusions: text().notNull(),
	overallOpinion: text("overall_opinion").notNull(),
	recommendations: text().array().default([""]),
	managementComments: text("management_comments"),
	reportType: text("report_type").notNull(),
	issuedDate: timestamp("issued_date", { mode: 'string' }),
	draftDate: timestamp("draft_date", { mode: 'string' }),
	preparedBy: varchar("prepared_by").notNull(),
	reviewedBy: varchar("reviewed_by"),
	approvedBy: varchar("approved_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "audit_reports_approved_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.auditId],
			foreignColumns: [audits.id],
			name: "audit_reports_audit_id_audits_id_fk"
		}),
	foreignKey({
			columns: [table.preparedBy],
			foreignColumns: [users.id],
			name: "audit_reports_prepared_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.reviewedBy],
			foreignColumns: [users.id],
			name: "audit_reports_reviewed_by_users_id_fk"
		}),
	unique("audit_reports_code_unique").on(table.code),
]);

export const auditPlans = pgTable("audit_plans", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	year: integer().notNull(),
	description: text(),
	status: text().default('draft').notNull(),
	approvedBy: varchar("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	createdBy: varchar("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "audit_plans_approved_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "audit_plans_created_by_users_id_fk"
		}),
	unique("audit_plans_code_unique").on(table.code),
]);

export const auditTeamMembers = pgTable("audit_team_members", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	auditorRoleId: varchar("auditor_role_id").notNull(),
	employeeCode: text("employee_code"),
	fullName: text("full_name").notNull(),
	email: text().notNull(),
	department: text(),
	position: text(),
	hireDate: timestamp("hire_date", { mode: 'string' }),
	certifications: text().array().default([""]),
	specializations: text().array().default([""]),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.auditorRoleId],
			foreignColumns: [auditorRoles.id],
			name: "audit_team_members_auditor_role_id_auditor_roles_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "audit_team_members_user_id_users_id_fk"
		}),
	unique("audit_team_members_employee_code_unique").on(table.employeeCode),
]);

export const auditorRoles = pgTable("auditor_roles", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	level: integer().notNull(),
	hourlyRate: integer("hourly_rate"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("auditor_roles_name_unique").on(table.name),
]);

export const auditorTimeDeductions = pgTable("auditor_time_deductions", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	teamMemberId: varchar("team_member_id").notNull(),
	type: text().notNull(),
	reason: text().notNull(),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }).notNull(),
	totalDays: integer("total_days").notNull(),
	totalHours: integer("total_hours").notNull(),
	status: text().default('pending').notNull(),
	approvedBy: varchar("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	comments: text(),
	documentReference: text("document_reference"),
	createdBy: varchar("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "auditor_time_deductions_approved_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "auditor_time_deductions_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.teamMemberId],
			foreignColumns: [auditTeamMembers.id],
			name: "auditor_time_deductions_team_member_id_audit_team_members_id_fk"
		}),
]);

export const auditorAvailability = pgTable("auditor_availability", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	teamMemberId: varchar("team_member_id").notNull(),
	year: integer().notNull(),
	month: integer().notNull(),
	totalWorkingDays: integer("total_working_days").notNull(),
	totalWorkingHours: integer("total_working_hours").notNull(),
	availableHours: integer("available_hours").notNull(),
	allocatedHours: integer("allocated_hours").default(0).notNull(),
	remainingHours: integer("remaining_hours").notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.teamMemberId],
			foreignColumns: [auditTeamMembers.id],
			name: "auditor_availability_team_member_id_audit_team_members_id_fk"
		}),
]);

export const auditFindings = pgTable("audit_findings", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	code: text().notNull(),
	auditId: varchar("audit_id").notNull(),
	programId: varchar("program_id"),
	riskId: varchar("risk_id"),
	controlId: varchar("control_id"),
	title: text().notNull(),
	description: text().notNull(),
	type: text().notNull(),
	severity: text().notNull(),
	condition: text().notNull(),
	criteria: text().notNull(),
	cause: text().notNull(),
	effect: text().notNull(),
	recommendation: text().notNull(),
	managementResponse: text("management_response"),
	agreedAction: text("agreed_action"),
	responsiblePerson: varchar("responsible_person"),
	dueDate: timestamp("due_date", { mode: 'string' }),
	status: text().default('open').notNull(),
	identifiedBy: varchar("identified_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.auditId],
			foreignColumns: [audits.id],
			name: "audit_findings_audit_id_audits_id_fk"
		}),
	foreignKey({
			columns: [table.controlId],
			foreignColumns: [controls.id],
			name: "audit_findings_control_id_controls_id_fk"
		}),
	foreignKey({
			columns: [table.identifiedBy],
			foreignColumns: [users.id],
			name: "audit_findings_identified_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.programId],
			foreignColumns: [auditPrograms.id],
			name: "audit_findings_program_id_audit_programs_id_fk"
		}),
	foreignKey({
			columns: [table.responsiblePerson],
			foreignColumns: [users.id],
			name: "audit_findings_responsible_person_users_id_fk"
		}),
	foreignKey({
			columns: [table.riskId],
			foreignColumns: [risks.id],
			name: "audit_findings_risk_id_risks_id_fk"
		}),
	unique("audit_findings_code_unique").on(table.code),
]);

export const audits = pgTable("audits", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	type: text().notNull(),
	scope: text().notNull(),
	objectives: text().array().default([""]),
	planId: varchar("plan_id"),
	processId: varchar("process_id"),
	subprocesoId: varchar("subproceso_id"),
	status: text().default('planned').notNull(),
	priority: text().default('medium').notNull(),
	plannedStartDate: timestamp("planned_start_date", { mode: 'string' }),
	plannedEndDate: timestamp("planned_end_date", { mode: 'string' }),
	actualStartDate: timestamp("actual_start_date", { mode: 'string' }),
	actualEndDate: timestamp("actual_end_date", { mode: 'string' }),
	leadAuditor: varchar("lead_auditor").notNull(),
	auditTeam: text("audit_team").array().default([""]),
	createdBy: varchar("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	regulationId: varchar("regulation_id"),
	scopeEntity: text("scope_entity"),
	reviewPeriod: text("review_period"),
	reviewPeriodStartDate: timestamp("review_period_start_date", { mode: 'string' }),
	reviewPeriodEndDate: timestamp("review_period_end_date", { mode: 'string' }),
	scopeEntities: text("scope_entities").array().default([""]),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "audits_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.leadAuditor],
			foreignColumns: [users.id],
			name: "audits_lead_auditor_users_id_fk"
		}),
	foreignKey({
			columns: [table.planId],
			foreignColumns: [auditPlans.id],
			name: "audits_plan_id_audit_plans_id_fk"
		}),
	foreignKey({
			columns: [table.processId],
			foreignColumns: [processes.id],
			name: "audits_process_id_processes_id_fk"
		}),
	foreignKey({
			columns: [table.regulationId],
			foreignColumns: [regulations.id],
			name: "audits_regulation_id_regulations_id_fk"
		}),
	foreignKey({
			columns: [table.subprocesoId],
			foreignColumns: [subprocesos.id],
			name: "audits_subproceso_id_subprocesos_id_fk"
		}),
	unique("audits_code_unique").on(table.code),
]);

export const findingFollowUps = pgTable("finding_follow_ups", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	findingId: varchar("finding_id").notNull(),
	followUpDate: timestamp("follow_up_date", { mode: 'string' }).notNull(),
	status: text().notNull(),
	progress: integer().default(0).notNull(),
	comments: text(),
	evidence: text().array().default([""]),
	reviewedBy: varchar("reviewed_by").notNull(),
	nextReviewDate: timestamp("next_review_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.findingId],
			foreignColumns: [auditFindings.id],
			name: "finding_follow_ups_finding_id_audit_findings_id_fk"
		}),
	foreignKey({
			columns: [table.reviewedBy],
			foreignColumns: [users.id],
			name: "finding_follow_ups_reviewed_by_users_id_fk"
		}),
]);

export const workingPapers = pgTable("working_papers", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	code: text().notNull(),
	auditId: varchar("audit_id").notNull(),
	programId: varchar("program_id"),
	title: text().notNull(),
	description: text(),
	workPerformed: text("work_performed").notNull(),
	conclusions: text().notNull(),
	references: text().array().default([""]),
	preparedBy: varchar("prepared_by").notNull(),
	reviewedBy: varchar("reviewed_by"),
	preparedDate: timestamp("prepared_date", { mode: 'string' }).notNull(),
	reviewedDate: timestamp("reviewed_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.auditId],
			foreignColumns: [audits.id],
			name: "working_papers_audit_id_audits_id_fk"
		}),
	foreignKey({
			columns: [table.preparedBy],
			foreignColumns: [users.id],
			name: "working_papers_prepared_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.programId],
			foreignColumns: [auditPrograms.id],
			name: "working_papers_program_id_audit_programs_id_fk"
		}),
	foreignKey({
			columns: [table.reviewedBy],
			foreignColumns: [users.id],
			name: "working_papers_reviewed_by_users_id_fk"
		}),
]);

export const auditPlanCapacity = pgTable("audit_plan_capacity", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	planId: varchar("plan_id").notNull(),
	totalAvailableHours: integer("total_available_hours").notNull(),
	allocatedHours: integer("allocated_hours").default(0).notNull(),
	reservedHours: integer("reserved_hours").default(0).notNull(),
	q1AvailableHours: integer("q1_available_hours").default(0).notNull(),
	q2AvailableHours: integer("q2_available_hours").default(0).notNull(),
	q3AvailableHours: integer("q3_available_hours").default(0).notNull(),
	q4AvailableHours: integer("q4_available_hours").default(0).notNull(),
	q1AllocatedHours: integer("q1_allocated_hours").default(0).notNull(),
	q2AllocatedHours: integer("q2_allocated_hours").default(0).notNull(),
	q3AllocatedHours: integer("q3_allocated_hours").default(0).notNull(),
	q4AllocatedHours: integer("q4_allocated_hours").default(0).notNull(),
	contingencyPercentage: integer("contingency_percentage").default(15).notNull(),
	targetUtilization: integer("target_utilization").default(85).notNull(),
	calculatedAt: timestamp("calculated_at", { mode: 'string' }).defaultNow(),
	createdBy: varchar("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "audit_plan_capacity_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.planId],
			foreignColumns: [auditPlans.id],
			name: "audit_plan_capacity_plan_id_audit_plans_id_fk"
		}),
]);

export const auditUniverse = pgTable("audit_universe", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	macroprocesoId: varchar("macroproceso_id").notNull(),
	processId: varchar("process_id"),
	subprocesoId: varchar("subproceso_id"),
	auditableEntity: text("auditable_entity").notNull(),
	entityType: text("entity_type").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	mandatoryAudit: boolean("mandatory_audit").default(false).notNull(),
	auditFrequency: integer("audit_frequency").default(3).notNull(),
	lastAuditDate: timestamp("last_audit_date", { mode: 'string' }),
	nextScheduledAudit: timestamp("next_scheduled_audit", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.macroprocesoId],
			foreignColumns: [macroprocesos.id],
			name: "audit_universe_macroproceso_id_macroprocesos_id_fk"
		}),
	foreignKey({
			columns: [table.processId],
			foreignColumns: [processes.id],
			name: "audit_universe_process_id_processes_id_fk"
		}),
	foreignKey({
			columns: [table.subprocesoId],
			foreignColumns: [subprocesos.id],
			name: "audit_universe_subproceso_id_subprocesos_id_fk"
		}),
]);

export const controlEvaluationCriteria = pgTable("control_evaluation_criteria", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	weight: integer().notNull(),
	order: integer().default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const controlEvaluationOptions = pgTable("control_evaluation_options", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	criteriaId: varchar("criteria_id").notNull(),
	label: text().notNull(),
	description: text(),
	score: integer().notNull(),
	order: integer().default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.criteriaId],
			foreignColumns: [controlEvaluationCriteria.id],
			name: "control_evaluation_options_criteria_id_control_evaluation_crite"
		}),
]);

export const controlEvaluations = pgTable("control_evaluations", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	controlId: varchar("control_id").notNull(),
	criteriaId: varchar("criteria_id").notNull(),
	optionId: varchar("option_id").notNull(),
	comments: text(),
	evaluatedBy: varchar("evaluated_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.controlId],
			foreignColumns: [controls.id],
			name: "control_evaluations_control_id_controls_id_fk"
		}),
	foreignKey({
			columns: [table.criteriaId],
			foreignColumns: [controlEvaluationCriteria.id],
			name: "control_evaluations_criteria_id_control_evaluation_criteria_id_"
		}),
	foreignKey({
			columns: [table.evaluatedBy],
			foreignColumns: [users.id],
			name: "control_evaluations_evaluated_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.optionId],
			foreignColumns: [controlEvaluationOptions.id],
			name: "control_evaluations_option_id_control_evaluation_options_id_fk"
		}),
]);

export const systemConfig = pgTable("system_config", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	configKey: text("config_key").notNull(),
	configValue: text("config_value").notNull(),
	description: text(),
	dataType: text("data_type").default('string').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	updatedBy: varchar("updated_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "system_config_updated_by_users_id_fk"
		}),
	unique("system_config_config_key_unique").on(table.configKey),
]);

export const complianceTestControls = pgTable("compliance_test_controls", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	complianceTestId: varchar("compliance_test_id").notNull(),
	controlId: varchar("control_id").notNull(),
	riskId: varchar("risk_id"),
	testResult: text("test_result").notNull(),
	testingNature: text("testing_nature"),
	testingExtent: text("testing_extent"),
	sampleSize: integer("sample_size"),
	testingDetails: text("testing_details"),
	exceptions: text().array().default([""]),
	deficiencies: text(),
	effectivenessRating: integer("effectiveness_rating"),
	complianceLevel: text("compliance_level"),
	recommendations: text(),
	managementResponse: text("management_response"),
	correctiveActions: text("corrective_actions"),
	actionDueDate: timestamp("action_due_date", { mode: 'string' }),
	responsiblePerson: varchar("responsible_person"),
	testedBy: varchar("tested_by").notNull(),
	testedDate: timestamp("tested_date", { mode: 'string' }).notNull(),
	followUpRequired: boolean("follow_up_required").default(false).notNull(),
	followUpDate: timestamp("follow_up_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.complianceTestId],
			foreignColumns: [complianceTests.id],
			name: "compliance_test_controls_compliance_test_id_compliance_tests_id"
		}),
	foreignKey({
			columns: [table.controlId],
			foreignColumns: [controls.id],
			name: "compliance_test_controls_control_id_controls_id_fk"
		}),
	foreignKey({
			columns: [table.responsiblePerson],
			foreignColumns: [users.id],
			name: "compliance_test_controls_responsible_person_users_id_fk"
		}),
	foreignKey({
			columns: [table.riskId],
			foreignColumns: [risks.id],
			name: "compliance_test_controls_risk_id_risks_id_fk"
		}),
	foreignKey({
			columns: [table.testedBy],
			foreignColumns: [users.id],
			name: "compliance_test_controls_tested_by_users_id_fk"
		}),
]);

export const complianceTests = pgTable("compliance_tests", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	description: text(),
	regulationId: varchar("regulation_id").notNull(),
	testType: text("test_type").notNull(),
	scope: text().notNull(),
	objectives: text().array().default([""]),
	testProcedures: text("test_procedures").array().default([""]),
	plannedStartDate: timestamp("planned_start_date", { mode: 'string' }),
	plannedEndDate: timestamp("planned_end_date", { mode: 'string' }),
	actualStartDate: timestamp("actual_start_date", { mode: 'string' }),
	actualEndDate: timestamp("actual_end_date", { mode: 'string' }),
	status: text().default('planned').notNull(),
	priority: text().default('medium').notNull(),
	leadAuditor: varchar("lead_auditor").notNull(),
	auditTeam: text("audit_team").array().default([""]),
	complianceResult: text("compliance_result"),
	overallRating: integer("overall_rating"),
	keyFindings: text("key_findings").array().default([""]),
	recommendations: text().array().default([""]),
	conclusions: text(),
	evidenceCollected: text("evidence_collected").array().default([""]),
	createdBy: varchar("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "compliance_tests_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.leadAuditor],
			foreignColumns: [users.id],
			name: "compliance_tests_lead_auditor_users_id_fk"
		}),
	foreignKey({
			columns: [table.regulationId],
			foreignColumns: [regulations.id],
			name: "compliance_tests_regulation_id_regulations_id_fk"
		}),
	unique("compliance_tests_code_unique").on(table.code),
]);

export const riskRegulations = pgTable("risk_regulations", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	riskId: varchar("risk_id").notNull(),
	regulationId: varchar("regulation_id").notNull(),
	complianceRequirement: text("compliance_requirement").notNull(),
	nonComplianceImpact: text("non_compliance_impact"),
	criticality: text().default('medium').notNull(),
	status: text().default('compliant').notNull(),
	lastAssessmentDate: timestamp("last_assessment_date", { mode: 'string' }),
	nextAssessmentDate: timestamp("next_assessment_date", { mode: 'string' }),
	assessedBy: varchar("assessed_by"),
	comments: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.assessedBy],
			foreignColumns: [users.id],
			name: "risk_regulations_assessed_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.regulationId],
			foreignColumns: [regulations.id],
			name: "risk_regulations_regulation_id_regulations_id_fk"
		}),
	foreignKey({
			columns: [table.riskId],
			foreignColumns: [risks.id],
			name: "risk_regulations_risk_id_risks_id_fk"
		}),
]);

export const macroprocesoFiscalEntities = pgTable("macroproceso_fiscal_entities", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	macroprocesoId: varchar("macroproceso_id").notNull(),
	fiscalEntityId: varchar("fiscal_entity_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.fiscalEntityId],
			foreignColumns: [fiscalEntities.id],
			name: "macroproceso_fiscal_entities_fiscal_entity_id_fiscal_entities_i"
		}),
	foreignKey({
			columns: [table.macroprocesoId],
			foreignColumns: [macroprocesos.id],
			name: "macroproceso_fiscal_entities_macroproceso_id_macroprocesos_id_f"
		}),
]);

export const fiscalEntities = pgTable("fiscal_entities", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	type: text().notNull(),
	taxId: text("tax_id"),
	description: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("fiscal_entities_code_unique").on(table.code),
	unique("fiscal_entities_tax_id_unique").on(table.taxId),
]);

export const processFiscalEntities = pgTable("process_fiscal_entities", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	processId: varchar("process_id").notNull(),
	fiscalEntityId: varchar("fiscal_entity_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.fiscalEntityId],
			foreignColumns: [fiscalEntities.id],
			name: "process_fiscal_entities_fiscal_entity_id_fiscal_entities_id_fk"
		}),
	foreignKey({
			columns: [table.processId],
			foreignColumns: [processes.id],
			name: "process_fiscal_entities_process_id_processes_id_fk"
		}),
]);

export const regulations = pgTable("regulations", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	description: text(),
	issuingOrganization: text("issuing_organization").notNull(),
	sourceType: text("source_type").notNull(),
	law: text(),
	article: text(),
	clause: text(),
	effectiveDate: timestamp("effective_date", { mode: 'string' }),
	lastUpdateDate: timestamp("last_update_date", { mode: 'string' }),
	status: text().default('active').notNull(),
	criticality: text().default('medium').notNull(),
	applicability: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdBy: varchar("created_by").notNull(),
	updatedBy: varchar("updated_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	promulgationDate: timestamp("promulgation_date", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "regulations_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "regulations_updated_by_users_id_fk"
		}),
	unique("regulations_code_unique").on(table.code),
]);

export const auditPrioritizationFactors = pgTable("audit_prioritization_factors", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	universeId: varchar("universe_id").notNull(),
	planId: varchar("plan_id").notNull(),
	riskScore: integer("risk_score").default(0).notNull(),
	previousAuditResult: text("previous_audit_result").default('ninguna'),
	strategicPriority: integer("strategic_priority").default(1).notNull(),
	fraudHistory: boolean("fraud_history").default(false).notNull(),
	regulatoryRequirement: boolean("regulatory_requirement").default(false).notNull(),
	managementRequest: boolean("management_request").default(false).notNull(),
	timesSinceLastAudit: integer("times_since_last_audit").default(0).notNull(),
	auditComplexity: integer("audit_complexity").default(50).notNull(),
	totalPriorityScore: integer("total_priority_score").default(0).notNull(),
	calculatedRanking: integer("calculated_ranking").default(0),
	estimatedAuditHours: integer("estimated_audit_hours").default(40).notNull(),
	riskJustification: text("risk_justification"),
	changesDescription: text("changes_description"),
	strategicJustification: text("strategic_justification"),
	calculatedAt: timestamp("calculated_at", { mode: 'string' }).defaultNow(),
	calculatedBy: varchar("calculated_by").notNull(),
	isApproved: boolean("is_approved").default(false).notNull(),
	approvedBy: varchar("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "audit_prioritization_factors_approved_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.calculatedBy],
			foreignColumns: [users.id],
			name: "audit_prioritization_factors_calculated_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.planId],
			foreignColumns: [auditPlans.id],
			name: "audit_prioritization_factors_plan_id_audit_plans_id_fk"
		}),
	foreignKey({
			columns: [table.universeId],
			foreignColumns: [auditUniverse.id],
			name: "audit_prioritization_factors_universe_id_audit_universe_id_fk"
		}),
]);

export const auditPlanItems = pgTable("audit_plan_items", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	planId: varchar("plan_id").notNull(),
	universeId: varchar("universe_id").notNull(),
	prioritizationId: varchar("prioritization_id").notNull(),
	status: text().default('proposed').notNull(),
	selectionReason: text("selection_reason"),
	plannedQuarter: integer("planned_quarter"),
	plannedMonth: integer("planned_month"),
	estimatedDuration: integer("estimated_duration").default(40).notNull(),
	proposedLeadAuditor: varchar("proposed_lead_auditor"),
	proposedTeamMembers: text("proposed_team_members").array().default([""]),
	inclusionJustification: text("inclusion_justification"),
	riskMitigationApproach: text("risk_mitigation_approach"),
	createdBy: varchar("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "audit_plan_items_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.planId],
			foreignColumns: [auditPlans.id],
			name: "audit_plan_items_plan_id_audit_plans_id_fk"
		}),
	foreignKey({
			columns: [table.prioritizationId],
			foreignColumns: [auditPrioritizationFactors.id],
			name: "audit_plan_items_prioritization_id_audit_prioritization_factors"
		}),
	foreignKey({
			columns: [table.proposedLeadAuditor],
			foreignColumns: [users.id],
			name: "audit_plan_items_proposed_lead_auditor_users_id_fk"
		}),
	foreignKey({
			columns: [table.universeId],
			foreignColumns: [auditUniverse.id],
			name: "audit_plan_items_universe_id_audit_universe_id_fk"
		}),
]);

export const auditTests = pgTable("audit_tests", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	code: text().notNull(),
	auditId: varchar("audit_id").notNull(),
	programId: varchar("program_id"),
	name: text().notNull(),
	description: text().notNull(),
	objective: text().notNull(),
	testProcedures: text("test_procedures").array().default([""]),
	riskId: varchar("risk_id"),
	controlId: varchar("control_id"),
	assignedTo: varchar("assigned_to").notNull(),
	reviewedBy: varchar("reviewed_by"),
	plannedStartDate: timestamp("planned_start_date", { mode: 'string' }),
	plannedEndDate: timestamp("planned_end_date", { mode: 'string' }),
	actualStartDate: timestamp("actual_start_date", { mode: 'string' }),
	actualEndDate: timestamp("actual_end_date", { mode: 'string' }),
	estimatedHours: integer("estimated_hours"),
	actualHours: integer("actual_hours"),
	status: text().default('pending').notNull(),
	priority: text().default('medium').notNull(),
	workPerformed: text("work_performed"),
	testingNature: text("testing_nature"),
	testingExtent: text("testing_extent"),
	sampleSize: integer("sample_size"),
	testResult: text("test_result"),
	exceptions: text().array().default([""]),
	deficiencies: text(),
	conclusions: text(),
	recommendations: text(),
	reviewComments: text("review_comments"),
	reviewStatus: text("review_status").default('pending'),
	createdBy: varchar("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	executorId: varchar("executor_id").notNull(),
	supervisorId: varchar("supervisor_id"),
	assignedAt: timestamp("assigned_at", { mode: 'string' }),
	progress: integer().default(0).notNull(),
}, (table) => [
	index("audit_tests_audit_idx").using("btree", table.auditId.asc().nullsLast().op("text_ops")),
	index("audit_tests_code_idx").using("btree", table.code.asc().nullsLast().op("text_ops")),
	index("audit_tests_executor_idx").using("btree", table.executorId.asc().nullsLast().op("text_ops")),
	index("audit_tests_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("audit_tests_supervisor_idx").using("btree", table.supervisorId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.assignedTo],
			foreignColumns: [users.id],
			name: "audit_tests_assigned_to_users_id_fk"
		}),
	foreignKey({
			columns: [table.auditId],
			foreignColumns: [audits.id],
			name: "audit_tests_audit_id_audits_id_fk"
		}),
	foreignKey({
			columns: [table.controlId],
			foreignColumns: [controls.id],
			name: "audit_tests_control_id_controls_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "audit_tests_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.executorId],
			foreignColumns: [users.id],
			name: "audit_tests_executor_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.programId],
			foreignColumns: [auditPrograms.id],
			name: "audit_tests_program_id_audit_programs_id_fk"
		}),
	foreignKey({
			columns: [table.reviewedBy],
			foreignColumns: [users.id],
			name: "audit_tests_reviewed_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.riskId],
			foreignColumns: [risks.id],
			name: "audit_tests_risk_id_risks_id_fk"
		}),
	foreignKey({
			columns: [table.supervisorId],
			foreignColumns: [users.id],
			name: "audit_tests_supervisor_id_users_id_fk"
		}),
	unique("audit_tests_code_unique").on(table.code),
]);

export const auditMilestones = pgTable("audit_milestones", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	auditId: varchar("audit_id").notNull(),
	name: text().notNull(),
	description: text(),
	plannedDate: timestamp("planned_date", { mode: 'string' }).notNull(),
	actualDate: timestamp("actual_date", { mode: 'string' }),
	status: text().default('pending').notNull(),
	isDeliverable: boolean("is_deliverable").default(false).notNull(),
	deliverableDescription: text("deliverable_description"),
	responsibleId: varchar("responsible_id"),
	completedBy: varchar("completed_by"),
	order: integer().default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.auditId],
			foreignColumns: [audits.id],
			name: "audit_milestones_audit_id_audits_id_fk"
		}),
	foreignKey({
			columns: [table.completedBy],
			foreignColumns: [users.id],
			name: "audit_milestones_completed_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.responsibleId],
			foreignColumns: [users.id],
			name: "audit_milestones_responsible_id_users_id_fk"
		}),
]);

export const auditNotifications = pgTable("audit_notifications", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	auditId: varchar("audit_id"),
	testId: varchar("test_id"),
	userId: varchar("user_id").notNull(),
	type: text().notNull(),
	title: text().notNull(),
	message: text().notNull(),
	priority: text().default('normal').notNull(),
	isRead: boolean("is_read").default(false).notNull(),
	actionUrl: text("action_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.auditId],
			foreignColumns: [audits.id],
			name: "audit_notifications_audit_id_audits_id_fk"
		}),
	foreignKey({
			columns: [table.testId],
			foreignColumns: [auditTests.id],
			name: "audit_notifications_test_id_audit_tests_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "audit_notifications_user_id_users_id_fk"
		}),
]);

export const auditReviewComments = pgTable("audit_review_comments", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	auditId: varchar("audit_id"),
	testId: varchar("test_id"),
	findingId: varchar("finding_id"),
	workingPaperId: varchar("working_paper_id"),
	commentType: text("comment_type").notNull(),
	comment: text().notNull(),
	severity: text().default('info').notNull(),
	section: text(),
	isResolved: boolean("is_resolved").default(false).notNull(),
	resolvedBy: varchar("resolved_by"),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	parentCommentId: varchar("parent_comment_id"),
	commentedBy: varchar("commented_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.auditId],
			foreignColumns: [audits.id],
			name: "audit_review_comments_audit_id_audits_id_fk"
		}),
	foreignKey({
			columns: [table.commentedBy],
			foreignColumns: [users.id],
			name: "audit_review_comments_commented_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.findingId],
			foreignColumns: [auditFindings.id],
			name: "audit_review_comments_finding_id_audit_findings_id_fk"
		}),
	foreignKey({
			columns: [table.resolvedBy],
			foreignColumns: [users.id],
			name: "audit_review_comments_resolved_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.testId],
			foreignColumns: [auditTests.id],
			name: "audit_review_comments_test_id_audit_tests_id_fk"
		}),
	foreignKey({
			columns: [table.workingPaperId],
			foreignColumns: [workingPapers.id],
			name: "audit_review_comments_working_paper_id_working_papers_id_fk"
		}),
]);

export const auditControls = pgTable("audit_controls", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	auditId: varchar("audit_id").notNull(),
	controlId: varchar("control_id").notNull(),
	riskId: varchar("risk_id"),
	testObjective: text("test_objective"),
	plannedTestDate: timestamp("planned_test_date", { mode: 'string' }),
	actualTestDate: timestamp("actual_test_date", { mode: 'string' }),
	testResult: text("test_result"),
	testNotes: text("test_notes"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.auditId],
			foreignColumns: [audits.id],
			name: "audit_controls_audit_id_audits_id_fk"
		}),
	foreignKey({
			columns: [table.controlId],
			foreignColumns: [controls.id],
			name: "audit_controls_control_id_controls_id_fk"
		}),
	foreignKey({
			columns: [table.riskId],
			foreignColumns: [risks.id],
			name: "audit_controls_risk_id_risks_id_fk"
		}),
]);

export const auditAttachments = pgTable("audit_attachments", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	auditId: varchar("audit_id"),
	testId: varchar("test_id"),
	findingId: varchar("finding_id"),
	programId: varchar("program_id"),
	workingPaperId: varchar("working_paper_id"),
	fileName: text("file_name").notNull(),
	originalFileName: text("original_file_name").notNull(),
	fileSize: integer("file_size").notNull(),
	mimeType: text("mime_type").notNull(),
	objectPath: text("object_path").notNull(),
	description: text(),
	category: text().notNull(),
	isConfidential: boolean("is_confidential").default(false).notNull(),
	uploadedBy: varchar("uploaded_by").notNull(),
	uploadedAt: timestamp("uploaded_at", { mode: 'string' }).defaultNow(),
	code: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.auditId],
			foreignColumns: [audits.id],
			name: "audit_attachments_audit_id_audits_id_fk"
		}),
	foreignKey({
			columns: [table.findingId],
			foreignColumns: [auditFindings.id],
			name: "audit_attachments_finding_id_audit_findings_id_fk"
		}),
	foreignKey({
			columns: [table.programId],
			foreignColumns: [auditPrograms.id],
			name: "audit_attachments_program_id_audit_programs_id_fk"
		}),
	foreignKey({
			columns: [table.testId],
			foreignColumns: [auditTests.id],
			name: "audit_attachments_test_id_audit_tests_id_fk"
		}),
	foreignKey({
			columns: [table.uploadedBy],
			foreignColumns: [users.id],
			name: "audit_attachments_uploaded_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.workingPaperId],
			foreignColumns: [workingPapers.id],
			name: "audit_attachments_working_paper_id_working_papers_id_fk"
		}),
	unique("audit_attachments_code_unique").on(table.code),
]);

export const actions = pgTable("actions", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	code: text().notNull(),
	origin: text().notNull(),
	riskId: varchar("risk_id"),
	auditFindingId: varchar("audit_finding_id"),
	title: text().notNull(),
	description: text(),
	responsible: varchar(),
	dueDate: timestamp("due_date", { mode: 'string' }),
	priority: text().notNull(),
	status: text().default('pending').notNull(),
	progress: integer().default(0).notNull(),
	managementResponse: text("management_response"),
	agreedAction: text("agreed_action"),
	createdBy: varchar("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.auditFindingId],
			foreignColumns: [auditFindings.id],
			name: "actions_audit_finding_id_audit_findings_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "actions_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.responsible],
			foreignColumns: [users.id],
			name: "actions_responsible_users_id_fk"
		}),
	foreignKey({
			columns: [table.riskId],
			foreignColumns: [risks.id],
			name: "actions_risk_id_risks_id_fk"
		}),
	unique("actions_code_unique").on(table.code),
]);

export const sessions = pgTable("sessions", {
	sid: varchar().primaryKey().notNull(),
	sess: jsonb().notNull(),
	expire: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
	index("IDX_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);

export const auditCodeSequences = pgTable("audit_code_sequences", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	auditId: varchar("audit_id").notNull(),
	entityType: text("entity_type").notNull(),
	scope: text().notNull(),
	nextNumber: integer("next_number").default(1).notNull(),
	prefix: text().notNull(),
	format: text().default('sequential').notNull(),
	description: text(),
	lastUsedAt: timestamp("last_used_at", { mode: 'string' }),
	lastGeneratedCode: text("last_generated_code"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("audit_code_seq_audit_idx").using("btree", table.auditId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.auditId],
			foreignColumns: [audits.id],
			name: "audit_code_sequences_audit_id_audits_id_fk"
		}),
]);

export const auditScope = pgTable("audit_scope", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	auditId: varchar("audit_id").notNull(),
	riskId: varchar("risk_id").notNull(),
	controlId: varchar("control_id"),
	testingApproach: text("testing_approach"),
	samplingMethod: text("sampling_method"),
	estimatedHours: integer("estimated_hours").default(0),
	priority: text().default('medium'),
	isSelected: boolean("is_selected").default(true).notNull(),
	selectionReason: text("selection_reason"),
	createdBy: varchar("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("audit_scope_audit_idx").using("btree", table.auditId.asc().nullsLast().op("text_ops")),
	index("audit_scope_risk_idx").using("btree", table.riskId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.auditId],
			foreignColumns: [audits.id],
			name: "audit_scope_audit_id_audits_id_fk"
		}),
	foreignKey({
			columns: [table.controlId],
			foreignColumns: [controls.id],
			name: "audit_scope_control_id_controls_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "audit_scope_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.riskId],
			foreignColumns: [risks.id],
			name: "audit_scope_risk_id_risks_id_fk"
		}),
]);

export const auditTestWorkLogs = pgTable("audit_test_work_logs", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	auditTestId: varchar("audit_test_id").notNull(),
	entryDate: timestamp("entry_date", { mode: 'string' }).notNull(),
	description: text().notNull(),
	workType: text("work_type").notNull(),
	hoursWorked: numeric("hours_worked", { precision: 4, scale:  2 }).notNull(),
	progressPercentage: integer("progress_percentage").default(0),
	challengesEncountered: text("challenges_encountered"),
	nextSteps: text("next_steps"),
	isReviewed: boolean("is_reviewed").default(false).notNull(),
	reviewedBy: varchar("reviewed_by"),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
	reviewComments: text("review_comments"),
	createdBy: varchar("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("audit_test_work_logs_created_by_idx").using("btree", table.createdBy.asc().nullsLast().op("text_ops")),
	index("audit_test_work_logs_date_idx").using("btree", table.entryDate.asc().nullsLast().op("timestamp_ops")),
	index("audit_test_work_logs_test_date_idx").using("btree", table.auditTestId.asc().nullsLast().op("text_ops"), table.entryDate.asc().nullsLast().op("text_ops")),
	index("audit_test_work_logs_test_idx").using("btree", table.auditTestId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.auditTestId],
			foreignColumns: [auditTests.id],
			name: "audit_test_work_logs_audit_test_id_audit_tests_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "audit_test_work_logs_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.reviewedBy],
			foreignColumns: [users.id],
			name: "audit_test_work_logs_reviewed_by_users_id_fk"
		}),
]);

export const auditAttachmentCodeSequences = pgTable("audit_attachment_code_sequences", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	auditTestId: varchar("audit_test_id").notNull(),
	testSequenceNumber: integer("test_sequence_number").notNull(),
	lastDocumentNumber: integer("last_document_number").default(0).notNull(),
	prefix: text().default('AT').notNull(),
	format: text().default('AT-{test}-DOC-{doc}').notNull(),
	description: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("audit_attachment_code_seq_test_idx").using("btree", table.auditTestId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.auditTestId],
			foreignColumns: [auditTests.id],
			name: "audit_attachment_code_sequences_audit_test_id_audit_tests_id_fk"
		}),
]);

export const notificationTemplates = pgTable("notification_templates", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	key: text().notNull(),
	name: text().notNull(),
	description: text(),
	channels: text().array().default(["in_app"]).notNull(),
	inAppTitle: text("in_app_title"),
	inAppMessage: text("in_app_message"),
	inAppActionText: text("in_app_action_text"),
	emailSubject: text("email_subject"),
	emailHtmlBody: text("email_html_body"),
	emailTextBody: text("email_text_body"),
	pushTitle: text("push_title"),
	pushMessage: text("push_message"),
	variables: text().array().default([""]),
	exampleData: jsonb("example_data").default({}),
	category: text().default('audit').notNull(),
	priority: text().default('normal').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdBy: varchar("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("notification_templates_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("notification_templates_key_idx").using("btree", table.key.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "notification_templates_created_by_users_id_fk"
		}),
	unique("notification_templates_key_unique").on(table.key),
]);

export const auditTestAttachments = pgTable("audit_test_attachments", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	auditTestId: varchar("audit_test_id").notNull(),
	fileName: text("file_name").notNull(),
	originalFileName: text("original_file_name").notNull(),
	fileSize: integer("file_size").notNull(),
	mimeType: text("mime_type").notNull(),
	attachmentCode: text("attachment_code").notNull(),
	storageUrl: text("storage_url").notNull(),
	objectPath: text("object_path").notNull(),
	description: text(),
	category: text().notNull(),
	tags: text().array().default([""]),
	isConfidential: boolean("is_confidential").default(false).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	uploadedBy: varchar("uploaded_by").notNull(),
	uploadedAt: timestamp("uploaded_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	workLogId: varchar("work_log_id"),
	reviewCommentId: varchar("review_comment_id"),
	progressPercentage: integer("progress_percentage"),
	workflowStage: text("workflow_stage").default('general').notNull(),
	workflowAction: text("workflow_action"),
	progressMilestone: text("progress_milestone"),
	reviewStage: text("review_stage"),
	attachmentPurpose: text("attachment_purpose"),
}, (table) => [
	index("audit_test_attachments_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("audit_test_attachments_code_idx").using("btree", table.attachmentCode.asc().nullsLast().op("text_ops")),
	index("audit_test_attachments_progress_idx").using("btree", table.progressPercentage.asc().nullsLast().op("int4_ops")),
	index("audit_test_attachments_review_idx").using("btree", table.reviewCommentId.asc().nullsLast().op("text_ops")),
	index("audit_test_attachments_test_idx").using("btree", table.auditTestId.asc().nullsLast().op("text_ops")),
	index("audit_test_attachments_test_progress_idx").using("btree", table.auditTestId.asc().nullsLast().op("text_ops"), table.progressPercentage.asc().nullsLast().op("text_ops")),
	index("audit_test_attachments_test_workflow_idx").using("btree", table.auditTestId.asc().nullsLast().op("text_ops"), table.workflowStage.asc().nullsLast().op("text_ops")),
	index("audit_test_attachments_uploaded_by_idx").using("btree", table.uploadedBy.asc().nullsLast().op("text_ops")),
	index("audit_test_attachments_work_log_idx").using("btree", table.workLogId.asc().nullsLast().op("text_ops")),
	index("audit_test_attachments_workflow_stage_idx").using("btree", table.workflowStage.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.auditTestId],
			foreignColumns: [auditTests.id],
			name: "audit_test_attachments_audit_test_id_audit_tests_id_fk"
		}),
	foreignKey({
			columns: [table.reviewCommentId],
			foreignColumns: [auditReviewComments.id],
			name: "audit_test_attachments_review_comment_id_audit_review_comments_"
		}),
	foreignKey({
			columns: [table.uploadedBy],
			foreignColumns: [users.id],
			name: "audit_test_attachments_uploaded_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.workLogId],
			foreignColumns: [auditTestWorkLogs.id],
			name: "audit_test_attachments_work_log_id_audit_test_work_logs_id_fk"
		}),
	unique("audit_test_attachments_attachment_code_unique").on(table.attachmentCode),
]);

export const notificationPreferences = pgTable("notification_preferences", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	userId: varchar("user_id").notNull(),
	notificationType: text("notification_type").notNull(),
	category: text().default('audit').notNull(),
	enabledChannels: text("enabled_channels").array().default(["in_app"]).notNull(),
	frequency: text().default('immediate').notNull(),
	quietHoursEnabled: boolean("quiet_hours_enabled").default(false).notNull(),
	quietHoursStart: text("quiet_hours_start").default('22:00'),
	quietHoursEnd: text("quiet_hours_end").default('08:00'),
	minPriority: text("min_priority").default('normal').notNull(),
	config: jsonb().default({}),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("notification_preferences_type_idx").using("btree", table.notificationType.asc().nullsLast().op("text_ops")),
	index("notification_preferences_user_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notification_preferences_user_id_users_id_fk"
		}),
]);

export const notifications = pgTable("notifications", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	recipientId: varchar("recipient_id").notNull(),
	auditId: varchar("audit_id"),
	auditTestId: varchar("audit_test_id"),
	auditFindingId: varchar("audit_finding_id"),
	actionId: varchar("action_id"),
	riskId: varchar("risk_id"),
	controlId: varchar("control_id"),
	type: text().notNull(),
	category: text().default('audit').notNull(),
	priority: text().default('normal').notNull(),
	title: text().notNull(),
	message: text().notNull(),
	actionText: text("action_text"),
	actionUrl: text("action_url"),
	data: jsonb().default({}),
	channels: text().array().default(["in_app"]).notNull(),
	status: text().default('pending').notNull(),
	isRead: boolean("is_read").default(false).notNull(),
	readAt: timestamp("read_at", { mode: 'string' }),
	scheduledFor: timestamp("scheduled_for", { mode: 'string' }).defaultNow(),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	deliveryAttempts: integer("delivery_attempts").default(0).notNull(),
	lastDeliveryError: text("last_delivery_error"),
	deliveryStatus: jsonb("delivery_status").default({}),
	groupingKey: text("grouping_key"),
	replacesNotificationId: varchar("replaces_notification_id"),
	createdBy: varchar("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("notifications_audit_test_idx").using("btree", table.auditTestId.asc().nullsLast().op("text_ops")),
	index("notifications_priority_idx").using("btree", table.priority.asc().nullsLast().op("text_ops")),
	index("notifications_read_idx").using("btree", table.isRead.asc().nullsLast().op("bool_ops")),
	index("notifications_recipient_idx").using("btree", table.recipientId.asc().nullsLast().op("text_ops")),
	index("notifications_recipient_type_idx").using("btree", table.recipientId.asc().nullsLast().op("text_ops"), table.type.asc().nullsLast().op("text_ops")),
	index("notifications_recipient_unread_idx").using("btree", table.recipientId.asc().nullsLast().op("text_ops"), table.isRead.asc().nullsLast().op("text_ops")),
	index("notifications_scheduled_idx").using("btree", table.scheduledFor.asc().nullsLast().op("timestamp_ops")),
	index("notifications_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("notifications_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.actionId],
			foreignColumns: [actions.id],
			name: "notifications_action_id_actions_id_fk"
		}),
	foreignKey({
			columns: [table.auditFindingId],
			foreignColumns: [auditFindings.id],
			name: "notifications_audit_finding_id_audit_findings_id_fk"
		}),
	foreignKey({
			columns: [table.auditId],
			foreignColumns: [audits.id],
			name: "notifications_audit_id_audits_id_fk"
		}),
	foreignKey({
			columns: [table.auditTestId],
			foreignColumns: [auditTests.id],
			name: "notifications_audit_test_id_audit_tests_id_fk"
		}),
	foreignKey({
			columns: [table.controlId],
			foreignColumns: [controls.id],
			name: "notifications_control_id_controls_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "notifications_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.recipientId],
			foreignColumns: [users.id],
			name: "notifications_recipient_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.riskId],
			foreignColumns: [risks.id],
			name: "notifications_risk_id_risks_id_fk"
		}),
]);

export const reportGenerationLog = pgTable("report_generation_log", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	reportType: text("report_type").notNull(),
	reportFormat: text("report_format").notNull(),
	requestedBy: varchar("requested_by").notNull(),
	parametersUsed: jsonb("parameters_used").default({}).notNull(),
	periodStart: timestamp("period_start", { mode: 'string' }),
	periodEnd: timestamp("period_end", { mode: 'string' }),
	status: text().default('pending').notNull(),
	fileSize: integer("file_size"),
	filePath: text("file_path"),
	downloadUrl: text("download_url"),
	processingTimeMs: integer("processing_time_ms"),
	recordsProcessed: integer("records_processed"),
	errorMessage: text("error_message"),
	errorStack: text("error_stack"),
	requestedAt: timestamp("requested_at", { mode: 'string' }).defaultNow(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
}, (table) => [
	index("report_generation_date_idx").using("btree", table.requestedAt.asc().nullsLast().op("timestamp_ops")),
	index("report_generation_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("report_generation_type_idx").using("btree", table.reportType.asc().nullsLast().op("text_ops")),
	index("report_generation_user_idx").using("btree", table.requestedBy.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.requestedBy],
			foreignColumns: [users.id],
			name: "report_generation_log_requested_by_users_id_fk"
		}),
]);

export const notificationStats = pgTable("notification_stats", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	date: timestamp({ mode: 'string' }).notNull(),
	notificationType: text("notification_type").notNull(),
	channel: text().notNull(),
	totalSent: integer("total_sent").default(0).notNull(),
	totalDelivered: integer("total_delivered").default(0).notNull(),
	totalRead: integer("total_read").default(0).notNull(),
	totalClicked: integer("total_clicked").default(0).notNull(),
	totalFailed: integer("total_failed").default(0).notNull(),
	deliveryRate: numeric("delivery_rate", { precision: 5, scale:  2 }),
	readRate: numeric("read_rate", { precision: 5, scale:  2 }),
	clickRate: numeric("click_rate", { precision: 5, scale:  2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("notification_stats_date_idx").using("btree", table.date.asc().nullsLast().op("timestamp_ops")),
	index("notification_stats_type_idx").using("btree", table.notificationType.asc().nullsLast().op("text_ops")),
]);

export const riskTrendingData = pgTable("risk_trending_data", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	riskId: varchar("risk_id").notNull(),
	periodStart: timestamp("period_start", { mode: 'string' }).notNull(),
	periodEnd: timestamp("period_end", { mode: 'string' }).notNull(),
	averageInherentRisk: numeric("average_inherent_risk", { precision: 5, scale:  2 }).default('0').notNull(),
	averageResidualRisk: numeric("average_residual_risk", { precision: 5, scale:  2 }).default('0').notNull(),
	riskLevelTrend: text("risk_level_trend").default('stable').notNull(),
	totalAudits: integer("total_audits").default(0).notNull(),
	totalTestsCompleted: integer("total_tests_completed").default(0).notNull(),
	coveragePercentage: numeric("coverage_percentage", { precision: 5, scale:  2 }).default('0').notNull(),
	averageControlEffectiveness: numeric("average_control_effectiveness", { precision: 5, scale:  2 }).default('0').notNull(),
	controlEffectivenessTrend: text("control_effectiveness_trend").default('stable').notNull(),
	totalFindings: integer("total_findings").default(0).notNull(),
	criticalFindings: integer("critical_findings").default(0).notNull(),
	findingsResolved: integer("findings_resolved").default(0).notNull(),
	averageFindingSeverity: numeric("average_finding_severity", { precision: 5, scale:  2 }).default('0').notNull(),
	calculatedAt: timestamp("calculated_at", { mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("risk_trending_period_idx").using("btree", table.periodStart.asc().nullsLast().op("timestamp_ops"), table.periodEnd.asc().nullsLast().op("timestamp_ops")),
	index("risk_trending_risk_idx").using("btree", table.riskId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.riskId],
			foreignColumns: [risks.id],
			name: "risk_trending_data_risk_id_risks_id_fk"
		}),
]);

export const teamPerformanceMetrics = pgTable("team_performance_metrics", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	teamId: varchar("team_id"),
	departmentName: text("department_name"),
	periodStart: timestamp("period_start", { mode: 'string' }).notNull(),
	periodEnd: timestamp("period_end", { mode: 'string' }).notNull(),
	totalTeamMembers: integer("total_team_members").default(0).notNull(),
	totalTestsAssigned: integer("total_tests_assigned").default(0).notNull(),
	totalTestsCompleted: integer("total_tests_completed").default(0).notNull(),
	totalHoursWorked: numeric("total_hours_worked", { precision: 10, scale:  2 }).default('0').notNull(),
	averageCompletionRate: numeric("average_completion_rate", { precision: 5, scale:  2 }).default('0').notNull(),
	averageOnTimeRate: numeric("average_on_time_rate", { precision: 5, scale:  2 }).default('0').notNull(),
	averageProductivityScore: numeric("average_productivity_score", { precision: 5, scale:  2 }).default('0').notNull(),
	averageQualityScore: numeric("average_quality_score", { precision: 5, scale:  2 }).default('0').notNull(),
	topPerformerCount: integer("top_performer_count").default(0).notNull(),
	averagePerformerCount: integer("average_performer_count").default(0).notNull(),
	belowAveragePerformerCount: integer("below_average_performer_count").default(0).notNull(),
	calculatedAt: timestamp("calculated_at", { mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("team_performance_dept_idx").using("btree", table.departmentName.asc().nullsLast().op("text_ops")),
	index("team_performance_period_idx").using("btree", table.periodStart.asc().nullsLast().op("timestamp_ops"), table.periodEnd.asc().nullsLast().op("timestamp_ops")),
]);

export const auditorPerformanceMetrics = pgTable("auditor_performance_metrics", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	auditorId: varchar("auditor_id").notNull(),
	periodStart: timestamp("period_start", { mode: 'string' }).notNull(),
	periodEnd: timestamp("period_end", { mode: 'string' }).notNull(),
	totalTestsAssigned: integer("total_tests_assigned").default(0).notNull(),
	totalTestsCompleted: integer("total_tests_completed").default(0).notNull(),
	totalTestsOnTime: integer("total_tests_on_time").default(0).notNull(),
	completionRate: numeric("completion_rate", { precision: 5, scale:  2 }).default('0').notNull(),
	onTimeRate: numeric("on_time_rate", { precision: 5, scale:  2 }).default('0').notNull(),
	totalHoursWorked: numeric("total_hours_worked", { precision: 8, scale:  2 }).default('0').notNull(),
	averageHoursPerTest: numeric("average_hours_per_test", { precision: 6, scale:  2 }).default('0').notNull(),
	averageCompletionDays: numeric("average_completion_days", { precision: 6, scale:  2 }).default('0').notNull(),
	totalReviews: integer("total_reviews").default(0).notNull(),
	totalApprovals: integer("total_approvals").default(0).notNull(),
	totalRejections: integer("total_rejections").default(0).notNull(),
	totalRevisions: integer("total_revisions").default(0).notNull(),
	approvalRate: numeric("approval_rate", { precision: 5, scale:  2 }).default('0').notNull(),
	revisionRate: numeric("revision_rate", { precision: 5, scale:  2 }).default('0').notNull(),
	averageQualityScore: numeric("average_quality_score", { precision: 5, scale:  2 }).default('0').notNull(),
	testsPerWeek: numeric("tests_per_week", { precision: 6, scale:  2 }).default('0').notNull(),
	testsPerMonth: numeric("tests_per_month", { precision: 6, scale:  2 }).default('0').notNull(),
	productivityScore: numeric("productivity_score", { precision: 5, scale:  2 }).default('0').notNull(),
	calculatedAt: timestamp("calculated_at", { mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("auditor_performance_auditor_idx").using("btree", table.auditorId.asc().nullsLast().op("text_ops")),
	index("auditor_performance_period_idx").using("btree", table.periodStart.asc().nullsLast().op("timestamp_ops"), table.periodEnd.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.auditorId],
			foreignColumns: [users.id],
			name: "auditor_performance_metrics_auditor_id_users_id_fk"
		}),
]);

export const workflowEfficiencyMetrics = pgTable("workflow_efficiency_metrics", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	periodStart: timestamp("period_start", { mode: 'string' }).notNull(),
	periodEnd: timestamp("period_end", { mode: 'string' }).notNull(),
	averageCompletionTime: numeric("average_completion_time", { precision: 6, scale:  2 }).default('0').notNull(),
	medianCompletionTime: numeric("median_completion_time", { precision: 6, scale:  2 }).default('0').notNull(),
	averageReviewCycleTime: numeric("average_review_cycle_time", { precision: 6, scale:  2 }).default('0').notNull(),
	averageApprovalTime: numeric("average_approval_time", { precision: 6, scale:  2 }).default('0').notNull(),
	mostCommonBottleneck: text("most_common_bottleneck"),
	bottleneckPercentage: numeric("bottleneck_percentage", { precision: 5, scale:  2 }).default('0').notNull(),
	testsCompletedOnTime: integer("tests_completed_on_time").default(0).notNull(),
	testsCompletedLate: integer("tests_completed_late").default(0).notNull(),
	averageDaysOverdue: numeric("average_days_overdue", { precision: 6, scale:  2 }).default('0').notNull(),
	totalRevisions: integer("total_revisions").default(0).notNull(),
	averageRevisionsPerTest: numeric("average_revisions_per_test", { precision: 5, scale:  2 }).default('0').notNull(),
	revisionRate: numeric("revision_rate", { precision: 5, scale:  2 }).default('0').notNull(),
	calculatedAt: timestamp("calculated_at", { mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("workflow_efficiency_period_idx").using("btree", table.periodStart.asc().nullsLast().op("timestamp_ops"), table.periodEnd.asc().nullsLast().op("timestamp_ops")),
]);

export const notificationQueue = pgTable("notification_queue", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	notificationId: varchar("notification_id").notNull(),
	channel: text().notNull(),
	status: text().default('queued').notNull(),
	attempts: integer().default(0).notNull(),
	maxAttempts: integer("max_attempts").default(3).notNull(),
	lastError: text("last_error"),
	scheduledFor: timestamp("scheduled_for", { mode: 'string' }).notNull(),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	nextRetryAt: timestamp("next_retry_at", { mode: 'string' }),
	queuePriority: integer("queue_priority").default(5).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("notification_queue_channel_idx").using("btree", table.channel.asc().nullsLast().op("text_ops")),
	index("notification_queue_priority_idx").using("btree", table.queuePriority.asc().nullsLast().op("int4_ops")),
	index("notification_queue_processing_idx").using("btree", table.status.asc().nullsLast().op("text_ops"), table.scheduledFor.asc().nullsLast().op("int4_ops"), table.queuePriority.asc().nullsLast().op("timestamp_ops")),
	index("notification_queue_scheduled_idx").using("btree", table.scheduledFor.asc().nullsLast().op("timestamp_ops")),
	index("notification_queue_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.notificationId],
			foreignColumns: [notifications.id],
			name: "notification_queue_notification_id_notifications_id_fk"
		}),
]);

export const auditTestTemplateCategories = pgTable("audit_test_template_categories", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	code: text().notNull(),
	description: text(),
	color: text().default('#6b7280'),
	riskTypes: text("risk_types").array().default([""]),
	order: integer().default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("template_categories_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("template_categories_order_idx").using("btree", table.order.asc().nullsLast().op("int4_ops")),
	unique("audit_test_template_categories_name_unique").on(table.name),
	unique("audit_test_template_categories_code_unique").on(table.code),
]);

export const testGenerationSessions = pgTable("test_generation_sessions", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	auditId: varchar("audit_id"),
	sessionName: text("session_name").notNull(),
	description: text(),
	generationType: text("generation_type").notNull(),
	selectedRisks: text("selected_risks").array().notNull(),
	scopeFilters: jsonb("scope_filters").default({}),
	generationRules: jsonb("generation_rules").default({}),
	customizations: jsonb().default({}),
	testsGenerated: integer("tests_generated").default(0).notNull(),
	templatesUsed: text("templates_used").array().default([""]),
	totalEstimatedHours: integer("total_estimated_hours").default(0).notNull(),
	algorithmVersion: text("algorithm_version").default('1.0').notNull(),
	aiAssistanceLevel: text("ai_assistance_level").default('standard').notNull(),
	qualityThreshold: integer("quality_threshold").default(80).notNull(),
	status: text().default('draft').notNull(),
	approvedBy: varchar("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	rejectionReason: text("rejection_reason"),
	generationTimeSeconds: integer("generation_time_seconds"),
	userInteractions: integer("user_interactions").default(0).notNull(),
	customizationRate: numeric("customization_rate", { precision: 5, scale:  2 }).default('0'),
	createdBy: varchar("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("sessions_approved_by_idx").using("btree", table.approvedBy.asc().nullsLast().op("text_ops")),
	index("sessions_audit_idx").using("btree", table.auditId.asc().nullsLast().op("text_ops")),
	index("sessions_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("sessions_created_by_idx").using("btree", table.createdBy.asc().nullsLast().op("text_ops")),
	index("sessions_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("sessions_type_idx").using("btree", table.generationType.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "test_generation_sessions_approved_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.auditId],
			foreignColumns: [audits.id],
			name: "test_generation_sessions_audit_id_audits_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "test_generation_sessions_created_by_users_id_fk"
		}),
]);

export const generationAlgorithmConfig = pgTable("generation_algorithm_config", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	version: text().notNull(),
	description: text(),
	algorithmType: text("algorithm_type").notNull(),
	config: jsonb().default({}).notNull(),
	weights: jsonb().default({}),
	thresholds: jsonb().default({}),
	modelVersion: text("model_version"),
	trainingDataInfo: jsonb("training_data_info").default({}),
	accuracy: numeric({ precision: 5, scale:  2 }),
	avgGenerationTimeMs: integer("avg_generation_time_ms"),
	successRate: numeric("success_rate", { precision: 5, scale:  2 }).default('0'),
	userSatisfactionScore: numeric("user_satisfaction_score", { precision: 5, scale:  2 }),
	isActive: boolean("is_active").default(true).notNull(),
	isDefault: boolean("is_default").default(false).notNull(),
	requiresApproval: boolean("requires_approval").default(false).notNull(),
	createdBy: varchar("created_by"),
	lastTrainedAt: timestamp("last_trained_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("algorithm_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("algorithm_default_idx").using("btree", table.isDefault.asc().nullsLast().op("bool_ops")),
	index("algorithm_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("algorithm_type_idx").using("btree", table.algorithmType.asc().nullsLast().op("text_ops")),
	index("algorithm_version_idx").using("btree", table.version.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "generation_algorithm_config_created_by_users_id_fk"
		}),
	unique("generation_algorithm_config_name_unique").on(table.name),
]);

export const riskAnalysisProfiles = pgTable("risk_analysis_profiles", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	riskId: varchar("risk_id").notNull(),
	riskCategory: text("risk_category").notNull(),
	complexity: text().notNull(),
	auditScope: text("audit_scope").notNull(),
	priority: text().notNull(),
	controlEnvironment: text("control_environment").notNull(),
	controlGaps: text("control_gaps").array().default([""]),
	controlStrength: integer("control_strength").notNull(),
	requiredSkills: text("required_skills").array().default([""]),
	estimatedHours: integer("estimated_hours").notNull(),
	toolsNeeded: text("tools_needed").array().default([""]),
	inherentRiskScore: integer("inherent_risk_score").notNull(),
	residualRiskScore: numeric("residual_risk_score", { precision: 5, scale:  2 }),
	riskTrend: text("risk_trend").default('stable').notNull(),
	historicalIssues: text("historical_issues").array().default([""]),
	regulatoryRequirements: text("regulatory_requirements").array().default([""]),
	complianceLevel: text("compliance_level").default('standard').notNull(),
	confidenceScore: numeric("confidence_score", { precision: 5, scale:  2 }).default('0'),
	analysisMethod: text("analysis_method").default('rule_based').notNull(),
	recommendedTemplates: text("recommended_templates").array().default([""]),
	analyzedBy: varchar("analyzed_by"),
	analysisVersion: text("analysis_version").default('1.0').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("profiles_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("profiles_category_idx").using("btree", table.riskCategory.asc().nullsLast().op("text_ops")),
	index("profiles_complexity_idx").using("btree", table.complexity.asc().nullsLast().op("text_ops")),
	index("profiles_confidence_idx").using("btree", table.confidenceScore.asc().nullsLast().op("numeric_ops")),
	index("profiles_control_env_idx").using("btree", table.controlEnvironment.asc().nullsLast().op("text_ops")),
	index("profiles_priority_idx").using("btree", table.priority.asc().nullsLast().op("text_ops")),
	index("profiles_risk_idx").using("btree", table.riskId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.analyzedBy],
			foreignColumns: [users.id],
			name: "risk_analysis_profiles_analyzed_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.riskId],
			foreignColumns: [risks.id],
			name: "risk_analysis_profiles_risk_id_risks_id_fk"
		}),
]);

export const auditContextAnalysis = pgTable("audit_context_analysis", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	auditTestId: varchar("audit_test_id"),
	contextType: text("context_type").notNull(),
	contextFactors: jsonb("context_factors").notNull(),
	complexityAssessment: jsonb("complexity_assessment").notNull(),
	riskProfile: jsonb("risk_profile").notNull(),
	organizationalFactors: jsonb("organizational_factors").default({}),
	externalFactors: jsonb("external_factors").default({}),
	historicalContext: jsonb("historical_context").default({}),
	stakeholderContext: jsonb("stakeholder_context").default({}),
	resourceContext: jsonb("resource_context").default({}),
	timelineContext: jsonb("timeline_context").default({}),
	qualityRequirements: jsonb("quality_requirements").default({}),
	regulatoryRequirements: jsonb("regulatory_requirements").default({}),
	analysisConfidence: numeric("analysis_confidence", { precision: 5, scale:  2 }).notNull(),
	lastAnalyzed: timestamp("last_analyzed", { mode: 'string' }).defaultNow(),
	analyzedBy: varchar("analyzed_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.analyzedBy],
			foreignColumns: [users.id],
			name: "audit_context_analysis_analyzed_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.auditTestId],
			foreignColumns: [auditTests.id],
			name: "audit_context_analysis_audit_test_id_audit_tests_id_fk"
		}),
]);

export const auditorExpertiseProfiles = pgTable("auditor_expertise_profiles", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	auditorId: varchar("auditor_id").notNull(),
	riskSpecializations: text("risk_specializations").array().default([""]),
	industryExperience: text("industry_experience").array().default([""]),
	technicalSkills: text("technical_skills").array().default([""]),
	certifications: text().array().default([""]),
	averagePerformanceScore: numeric("average_performance_score", { precision: 5, scale:  2 }).default('0').notNull(),
	completionReliability: numeric("completion_reliability", { precision: 5, scale:  2 }).default('0').notNull(),
	qualityConsistency: numeric("quality_consistency", { precision: 5, scale:  2 }).default('0').notNull(),
	learningVelocity: numeric("learning_velocity", { precision: 5, scale:  2 }).default('0').notNull(),
	workloadCapacity: integer("workload_capacity").default(40).notNull(),
	availabilityScore: numeric("availability_score", { precision: 5, scale:  2 }).default('100').notNull(),
	teamCollaborationScore: numeric("team_collaboration_score", { precision: 5, scale:  2 }).default('0').notNull(),
	complexityHandling: text("complexity_handling").default('moderate').notNull(),
	lastProfileUpdate: timestamp("last_profile_update", { mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.auditorId],
			foreignColumns: [users.id],
			name: "auditor_expertise_profiles_auditor_id_users_id_fk"
		}),
	unique("auditor_expertise_profiles_auditor_id_unique").on(table.auditorId),
]);

export const auditBestPractices = pgTable("audit_best_practices", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	practiceTitle: text("practice_title").notNull(),
	riskCategory: text("risk_category").notNull(),
	procedureType: text("procedure_type").notNull(),
	bestPracticeText: text("best_practice_text").notNull(),
	successRate: numeric("success_rate", { precision: 5, scale:  2 }).notNull(),
	averageTimeSavings: numeric("average_time_savings", { precision: 5, scale:  2 }).notNull(),
	applicableContexts: text("applicable_contexts").array().notNull(),
	supportingEvidence: text("supporting_evidence"),
	implementationSteps: jsonb("implementation_steps").default([]),
	measurementCriteria: jsonb("measurement_criteria").default({}),
	createdBy: varchar("created_by"),
	validatedBy: varchar("validated_by"),
	validationDate: timestamp("validation_date", { mode: 'string' }),
	validationScore: numeric("validation_score", { precision: 5, scale:  2 }),
	usageCount: integer("usage_count").default(0),
	effectivenessRating: numeric("effectiveness_rating", { precision: 5, scale:  2 }),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "audit_best_practices_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.validatedBy],
			foreignColumns: [users.id],
			name: "audit_best_practices_validated_by_users_id_fk"
		}),
]);

export const identifiedPatterns = pgTable("identified_patterns", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	patternName: text("pattern_name").notNull(),
	patternType: text("pattern_type").notNull(),
	patternDescription: text("pattern_description").notNull(),
	identificationMethod: text("identification_method").notNull(),
	patternStrength: numeric("pattern_strength", { precision: 5, scale:  2 }).notNull(),
	applicabilityScope: text("applicability_scope").notNull(),
	supportingData: jsonb("supporting_data").notNull(),
	statisticalSignificance: numeric("statistical_significance", { precision: 5, scale:  2 }),
	sampleSize: integer("sample_size"),
	correlationFactors: jsonb("correlation_factors").default({}),
	recommendedActions: text("recommended_actions").array().default([""]),
	businessImpact: text("business_impact"),
	validationStatus: text("validation_status").default('identified').notNull(),
	lastValidated: timestamp("last_validated", { mode: 'string' }),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const timelinePerformanceAnalysis = pgTable("timeline_performance_analysis", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	auditTestId: varchar("audit_test_id"),
	plannedDurationHours: numeric("planned_duration_hours", { precision: 5, scale:  2 }).notNull(),
	actualDurationHours: numeric("actual_duration_hours", { precision: 5, scale:  2 }).notNull(),
	variancePercentage: numeric("variance_percentage", { precision: 5, scale:  2 }).notNull(),
	delayFactors: text("delay_factors").array().default([""]),
	accelerationFactors: text("acceleration_factors").array().default([""]),
	auditorId: varchar("auditor_id"),
	complexityFactors: jsonb("complexity_factors").default({}).notNull(),
	externalDependencies: text("external_dependencies").array().default([""]),
	resourceConstraints: text("resource_constraints").array().default([""]),
	completionQualityScore: integer("completion_quality_score").notNull(),
	timelineAccuracyScore: integer("timeline_accuracy_score").notNull(),
	milestoneAdherence: jsonb("milestone_adherence").default({}),
	bufferUtilization: numeric("buffer_utilization", { precision: 5, scale:  2 }),
	predictedAccuracy: numeric("predicted_accuracy", { precision: 5, scale:  2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.auditTestId],
			foreignColumns: [auditTests.id],
			name: "timeline_performance_analysis_audit_test_id_audit_tests_id_fk"
		}),
	foreignKey({
			columns: [table.auditorId],
			foreignColumns: [users.id],
			name: "timeline_performance_analysis_auditor_id_users_id_fk"
		}),
]);

export const learningSystemMetrics = pgTable("learning_system_metrics", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	metricName: text("metric_name").notNull(),
	metricType: text("metric_type").notNull(),
	modelType: text("model_type").notNull(),
	metricValue: numeric("metric_value", { precision: 8, scale:  4 }).notNull(),
	measurementPeriod: text("measurement_period").notNull(),
	periodStartDate: timestamp("period_start_date", { mode: 'string' }).notNull(),
	periodEndDate: timestamp("period_end_date", { mode: 'string' }).notNull(),
	sampleSize: integer("sample_size"),
	confidenceInterval: jsonb("confidence_interval"),
	trendDirection: text("trend_direction"),
	benchmarkComparison: numeric("benchmark_comparison", { precision: 5, scale:  2 }),
	targetThreshold: numeric("target_threshold", { precision: 5, scale:  2 }),
	actionRequired: boolean("action_required").default(false),
	notes: text(),
	calculatedBy: varchar("calculated_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const mlModels = pgTable("ml_models", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	modelName: text("model_name").notNull(),
	modelType: text("model_type").notNull(),
	version: text().notNull(),
	configuration: jsonb().notNull(),
	trainingData: jsonb("training_data"),
	modelMetrics: jsonb("model_metrics").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	lastTrained: timestamp("last_trained", { mode: 'string' }),
	trainingStatus: text("training_status").default('ready').notNull(),
	performanceScore: numeric("performance_score", { precision: 5, scale:  2 }),
	trainingDataSize: integer("training_data_size"),
	validationAccuracy: numeric("validation_accuracy", { precision: 5, scale:  2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("ml_models_model_name_unique").on(table.modelName),
]);

export const intelligentRecommendations = pgTable("intelligent_recommendations", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	auditTestId: varchar("audit_test_id"),
	recommendationType: text("recommendation_type").notNull(),
	recommendationData: jsonb("recommendation_data").notNull(),
	confidenceScore: numeric("confidence_score", { precision: 5, scale:  2 }).notNull(),
	reasoning: text().notNull(),
	alternativeOptions: jsonb("alternative_options").default([]),
	algorithmVersion: text("algorithm_version").notNull(),
	createdBy: varchar("created_by"),
	wasAccepted: boolean("was_accepted"),
	userFeedback: jsonb("user_feedback"),
	actualOutcome: jsonb("actual_outcome"),
	effectivenessScore: numeric("effectiveness_score", { precision: 5, scale:  2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.auditTestId],
			foreignColumns: [auditTests.id],
			name: "intelligent_recommendations_audit_test_id_audit_tests_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "intelligent_recommendations_created_by_users_id_fk"
		}),
]);

export const optimalTimelinePatterns = pgTable("optimal_timeline_patterns", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	patternName: text("pattern_name").notNull(),
	riskCategory: text("risk_category").notNull(),
	complexityLevel: text("complexity_level").notNull(),
	organizationSize: text("organization_size"),
	industryType: text("industry_type"),
	optimalDurationHours: numeric("optimal_duration_hours", { precision: 5, scale:  2 }).notNull(),
	successRate: numeric("success_rate", { precision: 5, scale:  2 }).notNull(),
	patternDescription: text("pattern_description").notNull(),
	applicableConditions: jsonb("applicable_conditions").notNull(),
	performanceMetrics: jsonb("performance_metrics").notNull(),
	keySuccessFactors: text("key_success_factors").array().default([""]),
	commonPitfalls: text("common_pitfalls").array().default([""]),
	recommendedMilestones: jsonb("recommended_milestones").default([]),
	resourceRequirements: jsonb("resource_requirements").default({}),
	validatedBy: varchar("validated_by"),
	validationDate: timestamp("validation_date", { mode: 'string' }).notNull(),
	validationScore: numeric("validation_score", { precision: 5, scale:  2 }),
	usageCount: integer("usage_count").default(0),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.validatedBy],
			foreignColumns: [users.id],
			name: "optimal_timeline_patterns_validated_by_users_id_fk"
		}),
]);

export const procedurePerformanceHistory = pgTable("procedure_performance_history", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	auditTestId: varchar("audit_test_id"),
	procedureId: varchar("procedure_id").notNull(),
	procedureType: text("procedure_type").notNull(),
	completionTimeHours: numeric("completion_time_hours", { precision: 5, scale:  2 }).notNull(),
	effectivenessScore: integer("effectiveness_score").notNull(),
	qualityRating: integer("quality_rating").notNull(),
	auditorId: varchar("auditor_id"),
	findingsDiscovered: integer("findings_discovered").default(0),
	issuesIdentified: integer("issues_identified").default(0),
	completionStatus: text("completion_status").notNull(),
	auditDate: timestamp("audit_date", { mode: 'string' }).notNull(),
	riskCategory: text("risk_category").notNull(),
	complexityLevel: text("complexity_level").notNull(),
	organizationSize: text("organization_size"),
	industryType: text("industry_type"),
	contextFactors: jsonb("context_factors").default({}),
	performanceMetrics: jsonb("performance_metrics").default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.auditTestId],
			foreignColumns: [auditTests.id],
			name: "procedure_performance_history_audit_test_id_audit_tests_id_fk"
		}),
	foreignKey({
			columns: [table.auditorId],
			foreignColumns: [users.id],
			name: "procedure_performance_history_auditor_id_users_id_fk"
		}),
]);

export const recommendationEffectiveness = pgTable("recommendation_effectiveness", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	recommendationId: varchar("recommendation_id").notNull(),
	recommendationType: text("recommendation_type").notNull(),
	auditTestId: varchar("audit_test_id"),
	recommendationScore: numeric("recommendation_score", { precision: 5, scale:  2 }).notNull(),
	wasAccepted: boolean("was_accepted").notNull(),
	actualOutcomeScore: numeric("actual_outcome_score", { precision: 5, scale:  2 }),
	predictionAccuracy: numeric("prediction_accuracy", { precision: 5, scale:  2 }),
	userSatisfaction: integer("user_satisfaction"),
	improvementAchieved: boolean("improvement_achieved"),
	timeSavingsHours: numeric("time_savings_hours", { precision: 5, scale:  2 }),
	qualityImprovement: numeric("quality_improvement", { precision: 5, scale:  2 }),
	costSavings: numeric("cost_savings", { precision: 8, scale:  2 }),
	riskMitigationImprovement: numeric("risk_mitigation_improvement", { precision: 5, scale:  2 }),
	feedbackComments: text("feedback_comments"),
	measuredMetrics: jsonb("measured_metrics").default({}),
	benchmarkComparison: jsonb("benchmark_comparison").default({}),
	longTermImpact: jsonb("long_term_impact"),
	followUpRequired: boolean("follow_up_required").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.auditTestId],
			foreignColumns: [auditTests.id],
			name: "recommendation_effectiveness_audit_test_id_audit_tests_id_fk"
		}),
	foreignKey({
			columns: [table.recommendationId],
			foreignColumns: [intelligentRecommendations.id],
			name: "recommendation_effectiveness_recommendation_id_intelligent_reco"
		}),
]);

export const recommendationFeedback = pgTable("recommendation_feedback", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	recommendationId: varchar("recommendation_id").notNull(),
	feedbackType: text("feedback_type").notNull(),
	feedbackScore: integer("feedback_score"),
	feedbackComments: text("feedback_comments"),
	specificAspects: jsonb("specific_aspects").default({}),
	improvementSuggestions: text("improvement_suggestions"),
	alternativeApproach: text("alternative_approach"),
	providedBy: varchar("provided_by"),
	contextWhenProvided: jsonb("context_when_provided").default({}),
	outcomeAfterFeedback: jsonb("outcome_after_feedback"),
	feedbackProcessed: boolean("feedback_processed").default(false),
	modelImprovementApplied: boolean("model_improvement_applied").default(false),
	processingNotes: text("processing_notes"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.providedBy],
			foreignColumns: [users.id],
			name: "recommendation_feedback_provided_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.recommendationId],
			foreignColumns: [intelligentRecommendations.id],
			name: "recommendation_feedback_recommendation_id_intelligent_recommend"
		}),
]);

export const approvalAnalytics = pgTable("approval_analytics", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	periodStart: timestamp("period_start", { mode: 'string' }).notNull(),
	periodEnd: timestamp("period_end", { mode: 'string' }).notNull(),
	department: text(),
	approvalType: text("approval_type"),
	totalApprovals: integer("total_approvals").notNull(),
	automaticApprovals: integer("automatic_approvals").notNull(),
	manualApprovals: integer("manual_approvals").notNull(),
	escalatedApprovals: integer("escalated_approvals").notNull(),
	rejectedApprovals: integer("rejected_approvals").notNull(),
	expiredApprovals: integer("expired_approvals").notNull(),
	averageProcessingTime: numeric("average_processing_time", { precision: 5, scale:  2 }).notNull(),
	medianProcessingTime: numeric("median_processing_time", { precision: 5, scale:  2 }),
	maxProcessingTime: numeric("max_processing_time", { precision: 5, scale:  2 }),
	approvalRate: numeric("approval_rate", { precision: 5, scale:  2 }).notNull(),
	escalationRate: numeric("escalation_rate", { precision: 5, scale:  2 }).notNull(),
	automaticApprovalRate: numeric("automatic_approval_rate", { precision: 5, scale:  2 }).notNull(),
	policyComplianceRate: numeric("policy_compliance_rate", { precision: 5, scale:  2 }).notNull(),
	departmentBreakdown: jsonb("department_breakdown").notNull(),
	riskLevelBreakdown: jsonb("risk_level_breakdown").notNull(),
	approverPerformance: jsonb("approver_performance"),
	bottleneckAnalysis: jsonb("bottleneck_analysis"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const approvalAuditTrail = pgTable("approval_audit_trail", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	approvalRecordId: varchar("approval_record_id").notNull(),
	action: text().notNull(),
	performedBy: varchar("performed_by"),
	previousStatus: text("previous_status"),
	newStatus: text("new_status").notNull(),
	actionDetails: jsonb("action_details"),
	reasoning: text(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	sessionId: varchar("session_id"),
	timestamp: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.approvalRecordId],
			foreignColumns: [approvalRecords.id],
			name: "approval_audit_trail_approval_record_id_approval_records_id_fk"
		}),
	foreignKey({
			columns: [table.performedBy],
			foreignColumns: [users.id],
			name: "approval_audit_trail_performed_by_users_id_fk"
		}),
]);

export const approvalPerformanceMetrics = pgTable("approval_performance_metrics", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	metricDate: timestamp("metric_date", { mode: 'string' }).notNull(),
	approverId: varchar("approver_id"),
	department: text(),
	approvalsProcessed: integer("approvals_processed").default(0).notNull(),
	averageDecisionTime: numeric("average_decision_time", { precision: 5, scale:  2 }),
	accuracyScore: numeric("accuracy_score", { precision: 5, scale:  2 }),
	workload: integer().default(0).notNull(),
	overdueItems: integer("overdue_items").default(0).notNull(),
	decisionReversals: integer("decision_reversals").default(0).notNull(),
	escalationInitiated: integer("escalation_initiated").default(0).notNull(),
	policyViolations: integer("policy_violations").default(0).notNull(),
	stakeholderFeedback: numeric("stakeholder_feedback", { precision: 3, scale:  2 }),
	processEfficiency: numeric("process_efficiency", { precision: 5, scale:  2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_performance_metrics_unique").using("btree", table.approverId.asc().nullsLast().op("text_ops"), table.metricDate.asc().nullsLast().op("timestamp_ops"), table.department.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.approverId],
			foreignColumns: [users.id],
			name: "approval_performance_metrics_approver_id_users_id_fk"
		}),
]);

export const approvalPolicies = pgTable("approval_policies", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	policyName: text("policy_name").notNull(),
	policyDescription: text("policy_description").notNull(),
	policyType: text("policy_type").notNull(),
	conditions: jsonb().notNull(),
	approvalAction: text("approval_action").notNull(),
	escalationLevel: text("escalation_level"),
	priority: integer().default(100).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	applicableDepartments: text("applicable_departments").array().default([""]),
	effectiveDate: timestamp("effective_date", { mode: 'string' }).notNull(),
	expiryDate: timestamp("expiry_date", { mode: 'string' }),
	createdBy: varchar("created_by"),
	approvedBy: varchar("approved_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "approval_policies_approved_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "approval_policies_created_by_users_id_fk"
		}),
]);

export const approvalWorkflows = pgTable("approval_workflows", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	workflowName: text("workflow_name").notNull(),
	workflowType: text("workflow_type").notNull(),
	itemType: text("item_type").notNull(),
	approvalSteps: jsonb("approval_steps").notNull(),
	autoEscalationEnabled: boolean("auto_escalation_enabled").default(true).notNull(),
	escalationTimeoutHours: integer("escalation_timeout_hours").default(72).notNull(),
	bypassConditions: jsonb("bypass_conditions"),
	notificationSettings: jsonb("notification_settings").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const approvalRecords = pgTable("approval_records", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	approvalItemId: varchar("approval_item_id").notNull(),
	approvalItemType: text("approval_item_type").notNull(),
	approvalStatus: text("approval_status").notNull(),
	decisionMethod: text("decision_method").notNull(),
	approvedBy: varchar("approved_by"),
	approvalReasoning: text("approval_reasoning"),
	riskLevel: text("risk_level").notNull(),
	severityAnalysis: jsonb("severity_analysis"),
	policyCompliance: jsonb("policy_compliance"),
	escalationPath: jsonb("escalation_path"),
	decisionConfidence: numeric("decision_confidence", { precision: 5, scale:  2 }),
	processingTimeMinutes: integer("processing_time_minutes"),
	approvalDate: timestamp("approval_date", { mode: 'string' }),
	expiryDate: timestamp("expiry_date", { mode: 'string' }),
	approvalConditions: text("approval_conditions").array().default([""]),
	followUpRequired: boolean("follow_up_required").default(false).notNull(),
	followUpDate: timestamp("follow_up_date", { mode: 'string' }),
	workflowId: varchar("workflow_id"),
	policyId: varchar("policy_id"),
	submittedBy: varchar("submitted_by").notNull(),
	submittedAt: timestamp("submitted_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "approval_records_approved_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.policyId],
			foreignColumns: [approvalPolicies.id],
			name: "approval_records_policy_id_approval_policies_id_fk"
		}),
	foreignKey({
			columns: [table.submittedBy],
			foreignColumns: [users.id],
			name: "approval_records_submitted_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.workflowId],
			foreignColumns: [approvalWorkflows.id],
			name: "approval_records_workflow_id_approval_workflows_id_fk"
		}),
]);

export const approvalDelegations = pgTable("approval_delegations", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	delegatorId: varchar("delegator_id").notNull(),
	delegateId: varchar("delegate_id").notNull(),
	delegationScope: text("delegation_scope").notNull(),
	approvalTypes: text("approval_types").array().notNull(),
	monetaryLimit: numeric("monetary_limit", { precision: 12, scale:  2 }),
	riskLevelLimit: text("risk_level_limit"),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.delegateId],
			foreignColumns: [users.id],
			name: "approval_delegations_delegate_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.delegatorId],
			foreignColumns: [users.id],
			name: "approval_delegations_delegator_id_users_id_fk"
		}),
]);

export const approvalHierarchy = pgTable("approval_hierarchy", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	department: text().notNull(),
	approvalLevel: text("approval_level").notNull(),
	approverRole: text("approver_role").notNull(),
	approverUserId: varchar("approver_user_id"),
	backupApproverUserId: varchar("backup_approver_user_id"),
	approvalLimits: jsonb("approval_limits").notNull(),
	escalationTimeoutHours: integer("escalation_timeout_hours").default(72).notNull(),
	autoDelegateEnabled: boolean("auto_delegate_enabled").default(false).notNull(),
	delegationConditions: jsonb("delegation_conditions"),
	isActive: boolean("is_active").default(true).notNull(),
	effectiveDate: timestamp("effective_date", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.approverUserId],
			foreignColumns: [users.id],
			name: "approval_hierarchy_approver_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.backupApproverUserId],
			foreignColumns: [users.id],
			name: "approval_hierarchy_backup_approver_user_id_users_id_fk"
		}),
]);

export const approvalNotifications = pgTable("approval_notifications", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	approvalRecordId: varchar("approval_record_id"),
	escalationPathId: varchar("escalation_path_id"),
	notificationType: text("notification_type").notNull(),
	recipientId: varchar("recipient_id").notNull(),
	channel: text().notNull(),
	subject: text(),
	message: text().notNull(),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	deliveryStatus: text("delivery_status").default('pending').notNull(),
	readAt: timestamp("read_at", { mode: 'string' }),
	actionTaken: text("action_taken"),
	actionTakenAt: timestamp("action_taken_at", { mode: 'string' }),
	reminderCount: integer("reminder_count").default(0).notNull(),
	lastReminderAt: timestamp("last_reminder_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.approvalRecordId],
			foreignColumns: [approvalRecords.id],
			name: "approval_notifications_approval_record_id_approval_records_id_f"
		}),
	foreignKey({
			columns: [table.escalationPathId],
			foreignColumns: [escalationPaths.id],
			name: "approval_notifications_escalation_path_id_escalation_paths_id_f"
		}),
	foreignKey({
			columns: [table.recipientId],
			foreignColumns: [users.id],
			name: "approval_notifications_recipient_id_users_id_fk"
		}),
]);

export const escalationPaths = pgTable("escalation_paths", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	approvalRecordId: varchar("approval_record_id").notNull(),
	escalationLevel: text("escalation_level").notNull(),
	currentAssignee: varchar("current_assignee"),
	assignedApprovers: jsonb("assigned_approvers").notNull(),
	escalationReason: text("escalation_reason").notNull(),
	urgency: text().notNull(),
	timeoutHours: integer("timeout_hours").default(72).notNull(),
	nextEscalationLevel: text("next_escalation_level"),
	escalationStatus: text("escalation_status").default('pending').notNull(),
	resolvedBy: varchar("resolved_by"),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	resolution: text(),
	resolutionNotes: text("resolution_notes"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.approvalRecordId],
			foreignColumns: [approvalRecords.id],
			name: "escalation_paths_approval_record_id_approval_records_id_fk"
		}),
	foreignKey({
			columns: [table.currentAssignee],
			foreignColumns: [users.id],
			name: "escalation_paths_current_assignee_users_id_fk"
		}),
	foreignKey({
			columns: [table.resolvedBy],
			foreignColumns: [users.id],
			name: "escalation_paths_resolved_by_users_id_fk"
		}),
]);

export const approvalRules = pgTable("approval_rules", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	ruleName: text("rule_name").notNull(),
	ruleDescription: text("rule_description"),
	ruleType: text("rule_type").notNull(),
	conditions: jsonb().notNull(),
	action: text().notNull(),
	priority: integer().default(100).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	applicableContexts: text("applicable_contexts").array().default([""]),
	effectiveDate: timestamp("effective_date", { mode: 'string' }).notNull(),
	expiryDate: timestamp("expiry_date", { mode: 'string' }),
	createdBy: varchar("created_by"),
	lastModifiedBy: varchar("last_modified_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "approval_rules_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.lastModifiedBy],
			foreignColumns: [users.id],
			name: "approval_rules_last_modified_by_users_id_fk"
		}),
]);

export const auditTestTemplates = pgTable("audit_test_templates", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	name: text().notNull(),
	code: text().notNull(),
	categoryId: varchar("category_id").notNull(),
	riskCategory: text("risk_category").notNull(),
	riskTypes: text("risk_types").array().default([""]),
	complexityLevel: text("complexity_level").notNull(),
	auditScope: text("audit_scope").notNull(),
	objective: text().notNull(),
	scope: text().notNull(),
	description: text(),
	proceduresCount: integer("procedures_count").default(0).notNull(),
	evidenceTypes: text("evidence_types").array().default([""]),
	testingMethods: text("testing_methods").array().default([""]),
	skillsRequired: text("skills_required").array().default([""]),
	estimatedHours: integer("estimated_hours").notNull(),
	toolsNeeded: text("tools_needed").array().default([""]),
	reviewLevel: text("review_level").default('standard').notNull(),
	approvalRequired: boolean("approval_required").default(false).notNull(),
	isCustomizable: boolean("is_customizable").default(true).notNull(),
	allowProcedureModification: boolean("allow_procedure_modification").default(true).notNull(),
	usageCount: integer("usage_count").default(0).notNull(),
	successRate: numeric("success_rate", { precision: 5, scale:  2 }).default('0'),
	avgTimeToComplete: integer("avg_time_to_complete"),
	version: text().default('1.0').notNull(),
	tags: text().array().default([""]),
	isActive: boolean("is_active").default(true).notNull(),
	createdBy: varchar("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("templates_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("templates_category_idx").using("btree", table.categoryId.asc().nullsLast().op("text_ops")),
	index("templates_complexity_idx").using("btree", table.complexityLevel.asc().nullsLast().op("text_ops")),
	index("templates_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("templates_risk_category_idx").using("btree", table.riskCategory.asc().nullsLast().op("text_ops")),
	index("templates_usage_idx").using("btree", table.usageCount.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [auditTestTemplateCategories.id],
			name: "audit_test_templates_category_id_audit_test_template_categories"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "audit_test_templates_created_by_users_id_fk"
		}),
	unique("audit_test_templates_code_unique").on(table.code),
]);

export const generatedTestsTracking = pgTable("generated_tests_tracking", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	sessionId: varchar("session_id").notNull(),
	auditTestId: varchar("audit_test_id").notNull(),
	templateId: varchar("template_id"),
	riskId: varchar("risk_id").notNull(),
	generationMethod: text("generation_method").notNull(),
	customizationLevel: text("customization_level").default('none').notNull(),
	customizations: jsonb().default({}),
	originalTemplateUsed: boolean("original_template_used").default(true).notNull(),
	proceduresModified: integer("procedures_modified").default(0).notNull(),
	evidenceRequirementsChanged: boolean("evidence_requirements_changed").default(false).notNull(),
	generationScore: integer("generation_score").default(100).notNull(),
	validationPassed: boolean("validation_passed").default(true).notNull(),
	issuesFound: text("issues_found").array().default([""]),
	generationTimeMs: integer("generation_time_ms"),
	userReviewTimeMin: integer("user_review_time_min"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("tracking_method_idx").using("btree", table.generationMethod.asc().nullsLast().op("text_ops")),
	index("tracking_risk_idx").using("btree", table.riskId.asc().nullsLast().op("text_ops")),
	index("tracking_score_idx").using("btree", table.generationScore.asc().nullsLast().op("int4_ops")),
	index("tracking_session_idx").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	index("tracking_template_idx").using("btree", table.templateId.asc().nullsLast().op("text_ops")),
	index("tracking_test_idx").using("btree", table.auditTestId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.auditTestId],
			foreignColumns: [auditTests.id],
			name: "generated_tests_tracking_audit_test_id_audit_tests_id_fk"
		}),
	foreignKey({
			columns: [table.riskId],
			foreignColumns: [risks.id],
			name: "generated_tests_tracking_risk_id_risks_id_fk"
		}),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [testGenerationSessions.id],
			name: "generated_tests_tracking_session_id_test_generation_sessions_id"
		}),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [auditTestTemplates.id],
			name: "generated_tests_tracking_template_id_audit_test_templates_id_fk"
		}),
]);

export const templateCustomizations = pgTable("template_customizations", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	templateId: varchar("template_id").notNull(),
	riskId: varchar("risk_id"),
	name: text().notNull(),
	description: text(),
	customizationType: text("customization_type").notNull(),
	modifiedObjective: text("modified_objective"),
	modifiedScope: text("modified_scope"),
	additionalProcedures: jsonb("additional_procedures").default([]),
	removedProcedures: text("removed_procedures").array().default([""]),
	modifiedProcedures: jsonb("modified_procedures").default({}),
	adjustedHours: integer("adjusted_hours"),
	additionalSkills: text("additional_skills").array().default([""]),
	additionalTools: text("additional_tools").array().default([""]),
	usageCount: integer("usage_count").default(0).notNull(),
	successRate: numeric("success_rate", { precision: 5, scale:  2 }).default('0'),
	avgEffectiveness: numeric("avg_effectiveness", { precision: 5, scale:  2 }).default('0'),
	isApproved: boolean("is_approved").default(false).notNull(),
	approvedBy: varchar("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	isPublic: boolean("is_public").default(false).notNull(),
	version: text().default('1.0').notNull(),
	tags: text().array().default([""]),
	isActive: boolean("is_active").default(true).notNull(),
	createdBy: varchar("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("customizations_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("customizations_created_by_idx").using("btree", table.createdBy.asc().nullsLast().op("text_ops")),
	index("customizations_public_idx").using("btree", table.isPublic.asc().nullsLast().op("bool_ops")),
	index("customizations_risk_idx").using("btree", table.riskId.asc().nullsLast().op("text_ops")),
	index("customizations_template_idx").using("btree", table.templateId.asc().nullsLast().op("text_ops")),
	index("customizations_type_idx").using("btree", table.customizationType.asc().nullsLast().op("text_ops")),
	index("customizations_usage_idx").using("btree", table.usageCount.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "template_customizations_approved_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "template_customizations_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.riskId],
			foreignColumns: [risks.id],
			name: "template_customizations_risk_id_risks_id_fk"
		}),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [auditTestTemplates.id],
			name: "template_customizations_template_id_audit_test_templates_id_fk"
		}),
]);

export const templateProcedures = pgTable("template_procedures", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	templateId: varchar("template_id").notNull(),
	stepNumber: integer("step_number").notNull(),
	procedureText: text("procedure_text").notNull(),
	expectedOutcome: text("expected_outcome").notNull(),
	evidenceType: text("evidence_type").notNull(),
	testingMethod: text("testing_method").notNull(),
	category: text().default('general').notNull(),
	skillLevel: text("skill_level").default('intermediate').notNull(),
	estimatedMinutes: integer("estimated_minutes").notNull(),
	toolsRequired: text("tools_required").array().default([""]),
	isMandatory: boolean("is_mandatory").default(true).notNull(),
	isCustomizable: boolean("is_customizable").default(true).notNull(),
	alternativeProcedures: text("alternative_procedures").array().default([""]),
	guidance: text(),
	commonIssues: text("common_issues").array().default([""]),
	evidenceRequirements: text("evidence_requirements"),
	order: integer().default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("procedures_evidence_type_idx").using("btree", table.evidenceType.asc().nullsLast().op("text_ops")),
	index("procedures_method_idx").using("btree", table.testingMethod.asc().nullsLast().op("text_ops")),
	index("procedures_order_idx").using("btree", table.order.asc().nullsLast().op("int4_ops")),
	index("procedures_step_idx").using("btree", table.stepNumber.asc().nullsLast().op("int4_ops")),
	index("procedures_template_idx").using("btree", table.templateId.asc().nullsLast().op("text_ops")),
	index("procedures_template_order_idx").using("btree", table.templateId.asc().nullsLast().op("text_ops"), table.order.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [auditTestTemplates.id],
			name: "template_procedures_template_id_audit_test_templates_id_fk"
		}),
]);

export const complianceDocuments = pgTable("compliance_documents", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	internalCode: text("internal_code").notNull(),
	name: text().notNull(),
	issuingOrganization: text("issuing_organization").notNull(),
	publicationDate: timestamp("publication_date", { mode: 'string' }).notNull(),
	classification: text().notNull(),
	description: text(),
	documentUrl: text("document_url"),
	fileName: text("file_name"),
	originalFileName: text("original_file_name"),
	fileSize: integer("file_size"),
	mimeType: text("mime_type"),
	objectPath: text("object_path"),
	isActive: boolean("is_active").default(true).notNull(),
	tags: text().array().default([""]),
	createdBy: varchar("created_by").notNull(),
	updatedBy: varchar("updated_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	macroprocesoId: varchar("macroproceso_id"),
	appliesToAllMacroprocesos: boolean("applies_to_all_macroprocesos").default(false).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "compliance_documents_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "compliance_documents_updated_by_users_id_fk"
		}),
]);

export const controlOwners = pgTable("control_owners", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	controlId: varchar("control_id").notNull(),
	userId: varchar("user_id").notNull(),
	assignedBy: varchar("assigned_by").notNull(),
	assignedAt: timestamp("assigned_at", { mode: 'string' }).defaultNow(),
	isActive: boolean("is_active").default(true).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.assignedBy],
			foreignColumns: [users.id],
			name: "control_owners_assigned_by_fkey"
		}),
	foreignKey({
			columns: [table.controlId],
			foreignColumns: [controls.id],
			name: "control_owners_control_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "control_owners_user_id_fkey"
		}),
]);

export const controls = pgTable("controls", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	description: text(),
	type: text().notNull(),
	frequency: text().notNull(),
	effectiveness: integer().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	lastReview: timestamp("last_review", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	evaluationCompletedAt: timestamp("evaluation_completed_at", { mode: 'string' }),
	evaluatedBy: varchar("evaluated_by"),
	evidence: text(),
	effectTarget: text("effect_target").default('both').notNull(),
	revalidationFrequencyMonths: integer("revalidation_frequency_months").default(24),
	nextRevalidationDate: timestamp("next_revalidation_date", { mode: 'string' }),
	revalidationStatus: text("revalidation_status").default('vigente').notNull(),
	lastRevalidationDate: timestamp("last_revalidation_date", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.evaluatedBy],
			foreignColumns: [users.id],
			name: "controls_evaluated_by_users_id_fk"
		}),
	unique("controls_code_unique").on(table.code),
]);

export const revalidations = pgTable("revalidations", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	controlId: varchar("control_id").notNull(),
	revalidatedBy: varchar("revalidated_by").notNull(),
	status: text().notNull(),
	complianceDeclaration: text("compliance_declaration").notNull(),
	evidenceFiles: text("evidence_files").array().default([""]),
	comments: text(),
	nextRevalidationDate: timestamp("next_revalidation_date", { mode: 'string' }),
	revalidationDate: timestamp("revalidation_date", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.controlId],
			foreignColumns: [controls.id],
			name: "revalidations_control_id_fkey"
		}),
	foreignKey({
			columns: [table.revalidatedBy],
			foreignColumns: [users.id],
			name: "revalidations_revalidated_by_fkey"
		}),
]);

export const revalidationPolicies = pgTable("revalidation_policies", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	riskLevel: text("risk_level").notNull(),
	frequencyMonths: integer("frequency_months").notNull(),
	warningDaysBefore: integer("warning_days_before").default(30).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("revalidation_policies_risk_level_key").on(table.riskLevel),
]);
