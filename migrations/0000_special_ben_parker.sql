-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "processes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"owner" text,
	"created_at" timestamp DEFAULT now(),
	"macroproceso_id" varchar,
	"fiscal_entity_id" varchar,
	"entity_scope" text DEFAULT 'transversal' NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "processes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "action_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"risk_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"responsible" text,
	"due_date" timestamp,
	"priority" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "action_plans_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "risk_categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#6b7280',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "risk_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"role_id" varchar NOT NULL,
	"assigned_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"permissions" text[] DEFAULT '{""}',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "risk_controls" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"risk_id" varchar NOT NULL,
	"control_id" varchar NOT NULL,
	"residual_risk" numeric(5, 1) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subprocesos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"owner" text,
	"proceso_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "subprocesos_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "risk_snapshots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"risk_id" varchar NOT NULL,
	"snapshot_date" timestamp NOT NULL,
	"probability" integer NOT NULL,
	"impact" integer NOT NULL,
	"inherent_risk" integer NOT NULL,
	"residual_risk" integer,
	"validation_status" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text,
	"email" text,
	"full_name" text,
	"password" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"first_name" text,
	"last_name" text,
	"profile_image_url" text,
	"cargo" text,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "risks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"process_id" varchar,
	"name" text NOT NULL,
	"description" text,
	"category" text[] DEFAULT '{""}',
	"probability" integer NOT NULL,
	"impact" integer NOT NULL,
	"inherent_risk" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"process_owner" text,
	"validation_status" text DEFAULT 'pending_validation' NOT NULL,
	"validated_by" varchar,
	"validated_at" timestamp,
	"validation_comments" text,
	"created_at" timestamp DEFAULT now(),
	"subproceso_id" varchar,
	"macroproceso_id" varchar,
	"frequency_occurrence" integer DEFAULT 3 NOT NULL,
	"exposure_volume" integer DEFAULT 3 NOT NULL,
	"exposure_massivity" integer DEFAULT 3 NOT NULL,
	"exposure_critical_path" integer DEFAULT 3 NOT NULL,
	"complexity" integer DEFAULT 3 NOT NULL,
	"change_volatility" integer DEFAULT 3 NOT NULL,
	"vulnerabilities" integer DEFAULT 3 NOT NULL,
	CONSTRAINT "risks_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "macroprocesos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"fiscal_entity_id" varchar,
	"entity_scope" text DEFAULT 'transversal' NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "macroprocesos_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "audit_control_evaluations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_id" varchar NOT NULL,
	"control_id" varchar NOT NULL,
	"design_effectiveness" text NOT NULL,
	"operating_effectiveness" text NOT NULL,
	"testing_nature" text,
	"testing_extent" text,
	"testing_results" text NOT NULL,
	"deficiencies" text,
	"recommendations" text,
	"new_effectiveness_rating" integer,
	"evaluated_by" varchar NOT NULL,
	"evaluated_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_programs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_id" varchar NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"objective" text NOT NULL,
	"procedures" text[] DEFAULT '{""}',
	"estimated_hours" integer,
	"assigned_to" varchar,
	"status" text DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_id" varchar NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"executive_summary" text NOT NULL,
	"background" text,
	"scope" text NOT NULL,
	"methodology" text NOT NULL,
	"key_findings" text[] DEFAULT '{""}',
	"conclusions" text NOT NULL,
	"overall_opinion" text NOT NULL,
	"recommendations" text[] DEFAULT '{""}',
	"management_comments" text,
	"report_type" text NOT NULL,
	"issued_date" timestamp,
	"draft_date" timestamp,
	"prepared_by" varchar NOT NULL,
	"reviewed_by" varchar,
	"approved_by" varchar,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "audit_reports_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "audit_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"year" integer NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"approved_by" varchar,
	"approved_at" timestamp,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "audit_plans_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "audit_team_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"auditor_role_id" varchar NOT NULL,
	"employee_code" text,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"department" text,
	"position" text,
	"hire_date" timestamp,
	"certifications" text[] DEFAULT '{""}',
	"specializations" text[] DEFAULT '{""}',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "audit_team_members_employee_code_unique" UNIQUE("employee_code")
);
--> statement-breakpoint
CREATE TABLE "auditor_roles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"level" integer NOT NULL,
	"hourly_rate" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "auditor_roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "auditor_time_deductions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_member_id" varchar NOT NULL,
	"type" text NOT NULL,
	"reason" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"total_days" integer NOT NULL,
	"total_hours" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_by" varchar,
	"approved_at" timestamp,
	"comments" text,
	"document_reference" text,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "auditor_availability" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_member_id" varchar NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"total_working_days" integer NOT NULL,
	"total_working_hours" integer NOT NULL,
	"available_hours" integer NOT NULL,
	"allocated_hours" integer DEFAULT 0 NOT NULL,
	"remaining_hours" integer NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_findings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"audit_id" varchar NOT NULL,
	"program_id" varchar,
	"risk_id" varchar,
	"control_id" varchar,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"severity" text NOT NULL,
	"condition" text NOT NULL,
	"criteria" text NOT NULL,
	"cause" text NOT NULL,
	"effect" text NOT NULL,
	"recommendation" text NOT NULL,
	"management_response" text,
	"agreed_action" text,
	"responsible_person" varchar,
	"due_date" timestamp,
	"status" text DEFAULT 'open' NOT NULL,
	"identified_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "audit_findings_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "audits" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"scope" text NOT NULL,
	"objectives" text[] DEFAULT '{""}',
	"plan_id" varchar,
	"process_id" varchar,
	"subproceso_id" varchar,
	"status" text DEFAULT 'planned' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"planned_start_date" timestamp,
	"planned_end_date" timestamp,
	"actual_start_date" timestamp,
	"actual_end_date" timestamp,
	"lead_auditor" varchar NOT NULL,
	"audit_team" text[] DEFAULT '{""}',
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"regulation_id" varchar,
	"scope_entity" text,
	"review_period" text,
	"review_period_start_date" timestamp,
	"review_period_end_date" timestamp,
	"scope_entities" text[] DEFAULT '{""}',
	CONSTRAINT "audits_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "finding_follow_ups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"finding_id" varchar NOT NULL,
	"follow_up_date" timestamp NOT NULL,
	"status" text NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"comments" text,
	"evidence" text[] DEFAULT '{""}',
	"reviewed_by" varchar NOT NULL,
	"next_review_date" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "working_papers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"audit_id" varchar NOT NULL,
	"program_id" varchar,
	"title" text NOT NULL,
	"description" text,
	"work_performed" text NOT NULL,
	"conclusions" text NOT NULL,
	"references" text[] DEFAULT '{""}',
	"prepared_by" varchar NOT NULL,
	"reviewed_by" varchar,
	"prepared_date" timestamp NOT NULL,
	"reviewed_date" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_plan_capacity" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" varchar NOT NULL,
	"total_available_hours" integer NOT NULL,
	"allocated_hours" integer DEFAULT 0 NOT NULL,
	"reserved_hours" integer DEFAULT 0 NOT NULL,
	"q1_available_hours" integer DEFAULT 0 NOT NULL,
	"q2_available_hours" integer DEFAULT 0 NOT NULL,
	"q3_available_hours" integer DEFAULT 0 NOT NULL,
	"q4_available_hours" integer DEFAULT 0 NOT NULL,
	"q1_allocated_hours" integer DEFAULT 0 NOT NULL,
	"q2_allocated_hours" integer DEFAULT 0 NOT NULL,
	"q3_allocated_hours" integer DEFAULT 0 NOT NULL,
	"q4_allocated_hours" integer DEFAULT 0 NOT NULL,
	"contingency_percentage" integer DEFAULT 15 NOT NULL,
	"target_utilization" integer DEFAULT 85 NOT NULL,
	"calculated_at" timestamp DEFAULT now(),
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_universe" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"macroproceso_id" varchar NOT NULL,
	"process_id" varchar,
	"subproceso_id" varchar,
	"auditable_entity" text NOT NULL,
	"entity_type" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"mandatory_audit" boolean DEFAULT false NOT NULL,
	"audit_frequency" integer DEFAULT 3 NOT NULL,
	"last_audit_date" timestamp,
	"next_scheduled_audit" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "control_evaluation_criteria" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"weight" integer NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "control_evaluation_options" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"criteria_id" varchar NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"score" integer NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "control_evaluations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"control_id" varchar NOT NULL,
	"criteria_id" varchar NOT NULL,
	"option_id" varchar NOT NULL,
	"comments" text,
	"evaluated_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_key" text NOT NULL,
	"config_value" text NOT NULL,
	"description" text,
	"data_type" text DEFAULT 'string' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "system_config_config_key_unique" UNIQUE("config_key")
);
--> statement-breakpoint
CREATE TABLE "compliance_test_controls" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compliance_test_id" varchar NOT NULL,
	"control_id" varchar NOT NULL,
	"risk_id" varchar,
	"test_result" text NOT NULL,
	"testing_nature" text,
	"testing_extent" text,
	"sample_size" integer,
	"testing_details" text,
	"exceptions" text[] DEFAULT '{""}',
	"deficiencies" text,
	"effectiveness_rating" integer,
	"compliance_level" text,
	"recommendations" text,
	"management_response" text,
	"corrective_actions" text,
	"action_due_date" timestamp,
	"responsible_person" varchar,
	"tested_by" varchar NOT NULL,
	"tested_date" timestamp NOT NULL,
	"follow_up_required" boolean DEFAULT false NOT NULL,
	"follow_up_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "compliance_tests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"regulation_id" varchar NOT NULL,
	"test_type" text NOT NULL,
	"scope" text NOT NULL,
	"objectives" text[] DEFAULT '{""}',
	"test_procedures" text[] DEFAULT '{""}',
	"planned_start_date" timestamp,
	"planned_end_date" timestamp,
	"actual_start_date" timestamp,
	"actual_end_date" timestamp,
	"status" text DEFAULT 'planned' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"lead_auditor" varchar NOT NULL,
	"audit_team" text[] DEFAULT '{""}',
	"compliance_result" text,
	"overall_rating" integer,
	"key_findings" text[] DEFAULT '{""}',
	"recommendations" text[] DEFAULT '{""}',
	"conclusions" text,
	"evidence_collected" text[] DEFAULT '{""}',
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "compliance_tests_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "risk_regulations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"risk_id" varchar NOT NULL,
	"regulation_id" varchar NOT NULL,
	"compliance_requirement" text NOT NULL,
	"non_compliance_impact" text,
	"criticality" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'compliant' NOT NULL,
	"last_assessment_date" timestamp,
	"next_assessment_date" timestamp,
	"assessed_by" varchar,
	"comments" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "macroproceso_fiscal_entities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"macroproceso_id" varchar NOT NULL,
	"fiscal_entity_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fiscal_entities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"tax_id" text,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "fiscal_entities_code_unique" UNIQUE("code"),
	CONSTRAINT "fiscal_entities_tax_id_unique" UNIQUE("tax_id")
);
--> statement-breakpoint
CREATE TABLE "process_fiscal_entities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"process_id" varchar NOT NULL,
	"fiscal_entity_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "regulations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"issuing_organization" text NOT NULL,
	"source_type" text NOT NULL,
	"law" text,
	"article" text,
	"clause" text,
	"effective_date" timestamp,
	"last_update_date" timestamp,
	"status" text DEFAULT 'active' NOT NULL,
	"criticality" text DEFAULT 'medium' NOT NULL,
	"applicability" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" varchar NOT NULL,
	"updated_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"promulgation_date" timestamp,
	CONSTRAINT "regulations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "audit_prioritization_factors" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"universe_id" varchar NOT NULL,
	"plan_id" varchar NOT NULL,
	"risk_score" integer DEFAULT 0 NOT NULL,
	"previous_audit_result" text DEFAULT 'ninguna',
	"strategic_priority" integer DEFAULT 1 NOT NULL,
	"fraud_history" boolean DEFAULT false NOT NULL,
	"regulatory_requirement" boolean DEFAULT false NOT NULL,
	"management_request" boolean DEFAULT false NOT NULL,
	"times_since_last_audit" integer DEFAULT 0 NOT NULL,
	"audit_complexity" integer DEFAULT 50 NOT NULL,
	"total_priority_score" integer DEFAULT 0 NOT NULL,
	"calculated_ranking" integer DEFAULT 0,
	"estimated_audit_hours" integer DEFAULT 40 NOT NULL,
	"risk_justification" text,
	"changes_description" text,
	"strategic_justification" text,
	"calculated_at" timestamp DEFAULT now(),
	"calculated_by" varchar NOT NULL,
	"is_approved" boolean DEFAULT false NOT NULL,
	"approved_by" varchar,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_plan_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" varchar NOT NULL,
	"universe_id" varchar NOT NULL,
	"prioritization_id" varchar NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"selection_reason" text,
	"planned_quarter" integer,
	"planned_month" integer,
	"estimated_duration" integer DEFAULT 40 NOT NULL,
	"proposed_lead_auditor" varchar,
	"proposed_team_members" text[] DEFAULT '{""}',
	"inclusion_justification" text,
	"risk_mitigation_approach" text,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_tests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"audit_id" varchar NOT NULL,
	"program_id" varchar,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"objective" text NOT NULL,
	"test_procedures" text[] DEFAULT '{""}',
	"risk_id" varchar,
	"control_id" varchar,
	"assigned_to" varchar NOT NULL,
	"reviewed_by" varchar,
	"planned_start_date" timestamp,
	"planned_end_date" timestamp,
	"actual_start_date" timestamp,
	"actual_end_date" timestamp,
	"estimated_hours" integer,
	"actual_hours" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"work_performed" text,
	"testing_nature" text,
	"testing_extent" text,
	"sample_size" integer,
	"test_result" text,
	"exceptions" text[] DEFAULT '{""}',
	"deficiencies" text,
	"conclusions" text,
	"recommendations" text,
	"review_comments" text,
	"review_status" text DEFAULT 'pending',
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"executor_id" varchar NOT NULL,
	"supervisor_id" varchar,
	"assigned_at" timestamp,
	"progress" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "audit_tests_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "audit_milestones" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"planned_date" timestamp NOT NULL,
	"actual_date" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"is_deliverable" boolean DEFAULT false NOT NULL,
	"deliverable_description" text,
	"responsible_id" varchar,
	"completed_by" varchar,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_id" varchar,
	"test_id" varchar,
	"user_id" varchar NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"action_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_review_comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_id" varchar,
	"test_id" varchar,
	"finding_id" varchar,
	"working_paper_id" varchar,
	"comment_type" text NOT NULL,
	"comment" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"section" text,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_by" varchar,
	"resolved_at" timestamp,
	"parent_comment_id" varchar,
	"commented_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_controls" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_id" varchar NOT NULL,
	"control_id" varchar NOT NULL,
	"risk_id" varchar,
	"test_objective" text,
	"planned_test_date" timestamp,
	"actual_test_date" timestamp,
	"test_result" text,
	"test_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_attachments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_id" varchar,
	"test_id" varchar,
	"finding_id" varchar,
	"program_id" varchar,
	"working_paper_id" varchar,
	"file_name" text NOT NULL,
	"original_file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"object_path" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"is_confidential" boolean DEFAULT false NOT NULL,
	"uploaded_by" varchar NOT NULL,
	"uploaded_at" timestamp DEFAULT now(),
	"code" text NOT NULL,
	CONSTRAINT "audit_attachments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "actions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"origin" text NOT NULL,
	"risk_id" varchar,
	"audit_finding_id" varchar,
	"title" text NOT NULL,
	"description" text,
	"responsible" varchar,
	"due_date" timestamp,
	"priority" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"management_response" text,
	"agreed_action" text,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "actions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_code_sequences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_id" varchar NOT NULL,
	"entity_type" text NOT NULL,
	"scope" text NOT NULL,
	"next_number" integer DEFAULT 1 NOT NULL,
	"prefix" text NOT NULL,
	"format" text DEFAULT 'sequential' NOT NULL,
	"description" text,
	"last_used_at" timestamp,
	"last_generated_code" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_scope" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_id" varchar NOT NULL,
	"risk_id" varchar NOT NULL,
	"control_id" varchar,
	"testing_approach" text,
	"sampling_method" text,
	"estimated_hours" integer DEFAULT 0,
	"priority" text DEFAULT 'medium',
	"is_selected" boolean DEFAULT true NOT NULL,
	"selection_reason" text,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_test_work_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_test_id" varchar NOT NULL,
	"entry_date" timestamp NOT NULL,
	"description" text NOT NULL,
	"work_type" text NOT NULL,
	"hours_worked" numeric(4, 2) NOT NULL,
	"progress_percentage" integer DEFAULT 0,
	"challenges_encountered" text,
	"next_steps" text,
	"is_reviewed" boolean DEFAULT false NOT NULL,
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"review_comments" text,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_attachment_code_sequences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_test_id" varchar NOT NULL,
	"test_sequence_number" integer NOT NULL,
	"last_document_number" integer DEFAULT 0 NOT NULL,
	"prefix" text DEFAULT 'AT' NOT NULL,
	"format" text DEFAULT 'AT-{test}-DOC-{doc}' NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"channels" text[] DEFAULT '{"in_app"}' NOT NULL,
	"in_app_title" text,
	"in_app_message" text,
	"in_app_action_text" text,
	"email_subject" text,
	"email_html_body" text,
	"email_text_body" text,
	"push_title" text,
	"push_message" text,
	"variables" text[] DEFAULT '{""}',
	"example_data" jsonb DEFAULT '{}'::jsonb,
	"category" text DEFAULT 'audit' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "notification_templates_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "audit_test_attachments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_test_id" varchar NOT NULL,
	"file_name" text NOT NULL,
	"original_file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"attachment_code" text NOT NULL,
	"storage_url" text NOT NULL,
	"object_path" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"tags" text[] DEFAULT '{""}',
	"is_confidential" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"uploaded_by" varchar NOT NULL,
	"uploaded_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"work_log_id" varchar,
	"review_comment_id" varchar,
	"progress_percentage" integer,
	"workflow_stage" text DEFAULT 'general' NOT NULL,
	"workflow_action" text,
	"progress_milestone" text,
	"review_stage" text,
	"attachment_purpose" text,
	CONSTRAINT "audit_test_attachments_attachment_code_unique" UNIQUE("attachment_code")
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"notification_type" text NOT NULL,
	"category" text DEFAULT 'audit' NOT NULL,
	"enabled_channels" text[] DEFAULT '{"in_app"}' NOT NULL,
	"frequency" text DEFAULT 'immediate' NOT NULL,
	"quiet_hours_enabled" boolean DEFAULT false NOT NULL,
	"quiet_hours_start" text DEFAULT '22:00',
	"quiet_hours_end" text DEFAULT '08:00',
	"min_priority" text DEFAULT 'normal' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" varchar NOT NULL,
	"audit_id" varchar,
	"audit_test_id" varchar,
	"audit_finding_id" varchar,
	"action_id" varchar,
	"risk_id" varchar,
	"control_id" varchar,
	"type" text NOT NULL,
	"category" text DEFAULT 'audit' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"action_text" text,
	"action_url" text,
	"data" jsonb DEFAULT '{}'::jsonb,
	"channels" text[] DEFAULT '{"in_app"}' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"scheduled_for" timestamp DEFAULT now(),
	"sent_at" timestamp,
	"delivery_attempts" integer DEFAULT 0 NOT NULL,
	"last_delivery_error" text,
	"delivery_status" jsonb DEFAULT '{}'::jsonb,
	"grouping_key" text,
	"replaces_notification_id" varchar,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "report_generation_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_type" text NOT NULL,
	"report_format" text NOT NULL,
	"requested_by" varchar NOT NULL,
	"parameters_used" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"period_start" timestamp,
	"period_end" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"file_size" integer,
	"file_path" text,
	"download_url" text,
	"processing_time_ms" integer,
	"records_processed" integer,
	"error_message" text,
	"error_stack" text,
	"requested_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "notification_stats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" timestamp NOT NULL,
	"notification_type" text NOT NULL,
	"channel" text NOT NULL,
	"total_sent" integer DEFAULT 0 NOT NULL,
	"total_delivered" integer DEFAULT 0 NOT NULL,
	"total_read" integer DEFAULT 0 NOT NULL,
	"total_clicked" integer DEFAULT 0 NOT NULL,
	"total_failed" integer DEFAULT 0 NOT NULL,
	"delivery_rate" numeric(5, 2),
	"read_rate" numeric(5, 2),
	"click_rate" numeric(5, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "risk_trending_data" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"risk_id" varchar NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"average_inherent_risk" numeric(5, 2) DEFAULT '0' NOT NULL,
	"average_residual_risk" numeric(5, 2) DEFAULT '0' NOT NULL,
	"risk_level_trend" text DEFAULT 'stable' NOT NULL,
	"total_audits" integer DEFAULT 0 NOT NULL,
	"total_tests_completed" integer DEFAULT 0 NOT NULL,
	"coverage_percentage" numeric(5, 2) DEFAULT '0' NOT NULL,
	"average_control_effectiveness" numeric(5, 2) DEFAULT '0' NOT NULL,
	"control_effectiveness_trend" text DEFAULT 'stable' NOT NULL,
	"total_findings" integer DEFAULT 0 NOT NULL,
	"critical_findings" integer DEFAULT 0 NOT NULL,
	"findings_resolved" integer DEFAULT 0 NOT NULL,
	"average_finding_severity" numeric(5, 2) DEFAULT '0' NOT NULL,
	"calculated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "team_performance_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" varchar,
	"department_name" text,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"total_team_members" integer DEFAULT 0 NOT NULL,
	"total_tests_assigned" integer DEFAULT 0 NOT NULL,
	"total_tests_completed" integer DEFAULT 0 NOT NULL,
	"total_hours_worked" numeric(10, 2) DEFAULT '0' NOT NULL,
	"average_completion_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"average_on_time_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"average_productivity_score" numeric(5, 2) DEFAULT '0' NOT NULL,
	"average_quality_score" numeric(5, 2) DEFAULT '0' NOT NULL,
	"top_performer_count" integer DEFAULT 0 NOT NULL,
	"average_performer_count" integer DEFAULT 0 NOT NULL,
	"below_average_performer_count" integer DEFAULT 0 NOT NULL,
	"calculated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "auditor_performance_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auditor_id" varchar NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"total_tests_assigned" integer DEFAULT 0 NOT NULL,
	"total_tests_completed" integer DEFAULT 0 NOT NULL,
	"total_tests_on_time" integer DEFAULT 0 NOT NULL,
	"completion_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"on_time_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"total_hours_worked" numeric(8, 2) DEFAULT '0' NOT NULL,
	"average_hours_per_test" numeric(6, 2) DEFAULT '0' NOT NULL,
	"average_completion_days" numeric(6, 2) DEFAULT '0' NOT NULL,
	"total_reviews" integer DEFAULT 0 NOT NULL,
	"total_approvals" integer DEFAULT 0 NOT NULL,
	"total_rejections" integer DEFAULT 0 NOT NULL,
	"total_revisions" integer DEFAULT 0 NOT NULL,
	"approval_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"revision_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"average_quality_score" numeric(5, 2) DEFAULT '0' NOT NULL,
	"tests_per_week" numeric(6, 2) DEFAULT '0' NOT NULL,
	"tests_per_month" numeric(6, 2) DEFAULT '0' NOT NULL,
	"productivity_score" numeric(5, 2) DEFAULT '0' NOT NULL,
	"calculated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workflow_efficiency_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"average_completion_time" numeric(6, 2) DEFAULT '0' NOT NULL,
	"median_completion_time" numeric(6, 2) DEFAULT '0' NOT NULL,
	"average_review_cycle_time" numeric(6, 2) DEFAULT '0' NOT NULL,
	"average_approval_time" numeric(6, 2) DEFAULT '0' NOT NULL,
	"most_common_bottleneck" text,
	"bottleneck_percentage" numeric(5, 2) DEFAULT '0' NOT NULL,
	"tests_completed_on_time" integer DEFAULT 0 NOT NULL,
	"tests_completed_late" integer DEFAULT 0 NOT NULL,
	"average_days_overdue" numeric(6, 2) DEFAULT '0' NOT NULL,
	"total_revisions" integer DEFAULT 0 NOT NULL,
	"average_revisions_per_test" numeric(5, 2) DEFAULT '0' NOT NULL,
	"revision_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"calculated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_queue" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" varchar NOT NULL,
	"channel" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"last_error" text,
	"scheduled_for" timestamp NOT NULL,
	"processed_at" timestamp,
	"next_retry_at" timestamp,
	"queue_priority" integer DEFAULT 5 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_test_template_categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#6b7280',
	"risk_types" text[] DEFAULT '{""}',
	"order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "audit_test_template_categories_name_unique" UNIQUE("name"),
	CONSTRAINT "audit_test_template_categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "test_generation_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_id" varchar,
	"session_name" text NOT NULL,
	"description" text,
	"generation_type" text NOT NULL,
	"selected_risks" text[] NOT NULL,
	"scope_filters" jsonb DEFAULT '{}'::jsonb,
	"generation_rules" jsonb DEFAULT '{}'::jsonb,
	"customizations" jsonb DEFAULT '{}'::jsonb,
	"tests_generated" integer DEFAULT 0 NOT NULL,
	"templates_used" text[] DEFAULT '{""}',
	"total_estimated_hours" integer DEFAULT 0 NOT NULL,
	"algorithm_version" text DEFAULT '1.0' NOT NULL,
	"ai_assistance_level" text DEFAULT 'standard' NOT NULL,
	"quality_threshold" integer DEFAULT 80 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"approved_by" varchar,
	"approved_at" timestamp,
	"rejection_reason" text,
	"generation_time_seconds" integer,
	"user_interactions" integer DEFAULT 0 NOT NULL,
	"customization_rate" numeric(5, 2) DEFAULT '0',
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "generation_algorithm_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"version" text NOT NULL,
	"description" text,
	"algorithm_type" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"weights" jsonb DEFAULT '{}'::jsonb,
	"thresholds" jsonb DEFAULT '{}'::jsonb,
	"model_version" text,
	"training_data_info" jsonb DEFAULT '{}'::jsonb,
	"accuracy" numeric(5, 2),
	"avg_generation_time_ms" integer,
	"success_rate" numeric(5, 2) DEFAULT '0',
	"user_satisfaction_score" numeric(5, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"requires_approval" boolean DEFAULT false NOT NULL,
	"created_by" varchar,
	"last_trained_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "generation_algorithm_config_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "risk_analysis_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"risk_id" varchar NOT NULL,
	"risk_category" text NOT NULL,
	"complexity" text NOT NULL,
	"audit_scope" text NOT NULL,
	"priority" text NOT NULL,
	"control_environment" text NOT NULL,
	"control_gaps" text[] DEFAULT '{""}',
	"control_strength" integer NOT NULL,
	"required_skills" text[] DEFAULT '{""}',
	"estimated_hours" integer NOT NULL,
	"tools_needed" text[] DEFAULT '{""}',
	"inherent_risk_score" integer NOT NULL,
	"residual_risk_score" numeric(5, 2),
	"risk_trend" text DEFAULT 'stable' NOT NULL,
	"historical_issues" text[] DEFAULT '{""}',
	"regulatory_requirements" text[] DEFAULT '{""}',
	"compliance_level" text DEFAULT 'standard' NOT NULL,
	"confidence_score" numeric(5, 2) DEFAULT '0',
	"analysis_method" text DEFAULT 'rule_based' NOT NULL,
	"recommended_templates" text[] DEFAULT '{""}',
	"analyzed_by" varchar,
	"analysis_version" text DEFAULT '1.0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_context_analysis" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_test_id" varchar,
	"context_type" text NOT NULL,
	"context_factors" jsonb NOT NULL,
	"complexity_assessment" jsonb NOT NULL,
	"risk_profile" jsonb NOT NULL,
	"organizational_factors" jsonb DEFAULT '{}'::jsonb,
	"external_factors" jsonb DEFAULT '{}'::jsonb,
	"historical_context" jsonb DEFAULT '{}'::jsonb,
	"stakeholder_context" jsonb DEFAULT '{}'::jsonb,
	"resource_context" jsonb DEFAULT '{}'::jsonb,
	"timeline_context" jsonb DEFAULT '{}'::jsonb,
	"quality_requirements" jsonb DEFAULT '{}'::jsonb,
	"regulatory_requirements" jsonb DEFAULT '{}'::jsonb,
	"analysis_confidence" numeric(5, 2) NOT NULL,
	"last_analyzed" timestamp DEFAULT now(),
	"analyzed_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "auditor_expertise_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auditor_id" varchar NOT NULL,
	"risk_specializations" text[] DEFAULT '{""}',
	"industry_experience" text[] DEFAULT '{""}',
	"technical_skills" text[] DEFAULT '{""}',
	"certifications" text[] DEFAULT '{""}',
	"average_performance_score" numeric(5, 2) DEFAULT '0' NOT NULL,
	"completion_reliability" numeric(5, 2) DEFAULT '0' NOT NULL,
	"quality_consistency" numeric(5, 2) DEFAULT '0' NOT NULL,
	"learning_velocity" numeric(5, 2) DEFAULT '0' NOT NULL,
	"workload_capacity" integer DEFAULT 40 NOT NULL,
	"availability_score" numeric(5, 2) DEFAULT '100' NOT NULL,
	"team_collaboration_score" numeric(5, 2) DEFAULT '0' NOT NULL,
	"complexity_handling" text DEFAULT 'moderate' NOT NULL,
	"last_profile_update" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "auditor_expertise_profiles_auditor_id_unique" UNIQUE("auditor_id")
);
--> statement-breakpoint
CREATE TABLE "audit_best_practices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"practice_title" text NOT NULL,
	"risk_category" text NOT NULL,
	"procedure_type" text NOT NULL,
	"best_practice_text" text NOT NULL,
	"success_rate" numeric(5, 2) NOT NULL,
	"average_time_savings" numeric(5, 2) NOT NULL,
	"applicable_contexts" text[] NOT NULL,
	"supporting_evidence" text,
	"implementation_steps" jsonb DEFAULT '[]'::jsonb,
	"measurement_criteria" jsonb DEFAULT '{}'::jsonb,
	"created_by" varchar,
	"validated_by" varchar,
	"validation_date" timestamp,
	"validation_score" numeric(5, 2),
	"usage_count" integer DEFAULT 0,
	"effectiveness_rating" numeric(5, 2),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "identified_patterns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern_name" text NOT NULL,
	"pattern_type" text NOT NULL,
	"pattern_description" text NOT NULL,
	"identification_method" text NOT NULL,
	"pattern_strength" numeric(5, 2) NOT NULL,
	"applicability_scope" text NOT NULL,
	"supporting_data" jsonb NOT NULL,
	"statistical_significance" numeric(5, 2),
	"sample_size" integer,
	"correlation_factors" jsonb DEFAULT '{}'::jsonb,
	"recommended_actions" text[] DEFAULT '{""}',
	"business_impact" text,
	"validation_status" text DEFAULT 'identified' NOT NULL,
	"last_validated" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "timeline_performance_analysis" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_test_id" varchar,
	"planned_duration_hours" numeric(5, 2) NOT NULL,
	"actual_duration_hours" numeric(5, 2) NOT NULL,
	"variance_percentage" numeric(5, 2) NOT NULL,
	"delay_factors" text[] DEFAULT '{""}',
	"acceleration_factors" text[] DEFAULT '{""}',
	"auditor_id" varchar,
	"complexity_factors" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"external_dependencies" text[] DEFAULT '{""}',
	"resource_constraints" text[] DEFAULT '{""}',
	"completion_quality_score" integer NOT NULL,
	"timeline_accuracy_score" integer NOT NULL,
	"milestone_adherence" jsonb DEFAULT '{}'::jsonb,
	"buffer_utilization" numeric(5, 2),
	"predicted_accuracy" numeric(5, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "learning_system_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_name" text NOT NULL,
	"metric_type" text NOT NULL,
	"model_type" text NOT NULL,
	"metric_value" numeric(8, 4) NOT NULL,
	"measurement_period" text NOT NULL,
	"period_start_date" timestamp NOT NULL,
	"period_end_date" timestamp NOT NULL,
	"sample_size" integer,
	"confidence_interval" jsonb,
	"trend_direction" text,
	"benchmark_comparison" numeric(5, 2),
	"target_threshold" numeric(5, 2),
	"action_required" boolean DEFAULT false,
	"notes" text,
	"calculated_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ml_models" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_name" text NOT NULL,
	"model_type" text NOT NULL,
	"version" text NOT NULL,
	"configuration" jsonb NOT NULL,
	"training_data" jsonb,
	"model_metrics" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_trained" timestamp,
	"training_status" text DEFAULT 'ready' NOT NULL,
	"performance_score" numeric(5, 2),
	"training_data_size" integer,
	"validation_accuracy" numeric(5, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "ml_models_model_name_unique" UNIQUE("model_name")
);
--> statement-breakpoint
CREATE TABLE "intelligent_recommendations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_test_id" varchar,
	"recommendation_type" text NOT NULL,
	"recommendation_data" jsonb NOT NULL,
	"confidence_score" numeric(5, 2) NOT NULL,
	"reasoning" text NOT NULL,
	"alternative_options" jsonb DEFAULT '[]'::jsonb,
	"algorithm_version" text NOT NULL,
	"created_by" varchar,
	"was_accepted" boolean,
	"user_feedback" jsonb,
	"actual_outcome" jsonb,
	"effectiveness_score" numeric(5, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "optimal_timeline_patterns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern_name" text NOT NULL,
	"risk_category" text NOT NULL,
	"complexity_level" text NOT NULL,
	"organization_size" text,
	"industry_type" text,
	"optimal_duration_hours" numeric(5, 2) NOT NULL,
	"success_rate" numeric(5, 2) NOT NULL,
	"pattern_description" text NOT NULL,
	"applicable_conditions" jsonb NOT NULL,
	"performance_metrics" jsonb NOT NULL,
	"key_success_factors" text[] DEFAULT '{""}',
	"common_pitfalls" text[] DEFAULT '{""}',
	"recommended_milestones" jsonb DEFAULT '[]'::jsonb,
	"resource_requirements" jsonb DEFAULT '{}'::jsonb,
	"validated_by" varchar,
	"validation_date" timestamp NOT NULL,
	"validation_score" numeric(5, 2),
	"usage_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "procedure_performance_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_test_id" varchar,
	"procedure_id" varchar NOT NULL,
	"procedure_type" text NOT NULL,
	"completion_time_hours" numeric(5, 2) NOT NULL,
	"effectiveness_score" integer NOT NULL,
	"quality_rating" integer NOT NULL,
	"auditor_id" varchar,
	"findings_discovered" integer DEFAULT 0,
	"issues_identified" integer DEFAULT 0,
	"completion_status" text NOT NULL,
	"audit_date" timestamp NOT NULL,
	"risk_category" text NOT NULL,
	"complexity_level" text NOT NULL,
	"organization_size" text,
	"industry_type" text,
	"context_factors" jsonb DEFAULT '{}'::jsonb,
	"performance_metrics" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recommendation_effectiveness" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recommendation_id" varchar NOT NULL,
	"recommendation_type" text NOT NULL,
	"audit_test_id" varchar,
	"recommendation_score" numeric(5, 2) NOT NULL,
	"was_accepted" boolean NOT NULL,
	"actual_outcome_score" numeric(5, 2),
	"prediction_accuracy" numeric(5, 2),
	"user_satisfaction" integer,
	"improvement_achieved" boolean,
	"time_savings_hours" numeric(5, 2),
	"quality_improvement" numeric(5, 2),
	"cost_savings" numeric(8, 2),
	"risk_mitigation_improvement" numeric(5, 2),
	"feedback_comments" text,
	"measured_metrics" jsonb DEFAULT '{}'::jsonb,
	"benchmark_comparison" jsonb DEFAULT '{}'::jsonb,
	"long_term_impact" jsonb,
	"follow_up_required" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recommendation_feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recommendation_id" varchar NOT NULL,
	"feedback_type" text NOT NULL,
	"feedback_score" integer,
	"feedback_comments" text,
	"specific_aspects" jsonb DEFAULT '{}'::jsonb,
	"improvement_suggestions" text,
	"alternative_approach" text,
	"provided_by" varchar,
	"context_when_provided" jsonb DEFAULT '{}'::jsonb,
	"outcome_after_feedback" jsonb,
	"feedback_processed" boolean DEFAULT false,
	"model_improvement_applied" boolean DEFAULT false,
	"processing_notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "approval_analytics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"department" text,
	"approval_type" text,
	"total_approvals" integer NOT NULL,
	"automatic_approvals" integer NOT NULL,
	"manual_approvals" integer NOT NULL,
	"escalated_approvals" integer NOT NULL,
	"rejected_approvals" integer NOT NULL,
	"expired_approvals" integer NOT NULL,
	"average_processing_time" numeric(5, 2) NOT NULL,
	"median_processing_time" numeric(5, 2),
	"max_processing_time" numeric(5, 2),
	"approval_rate" numeric(5, 2) NOT NULL,
	"escalation_rate" numeric(5, 2) NOT NULL,
	"automatic_approval_rate" numeric(5, 2) NOT NULL,
	"policy_compliance_rate" numeric(5, 2) NOT NULL,
	"department_breakdown" jsonb NOT NULL,
	"risk_level_breakdown" jsonb NOT NULL,
	"approver_performance" jsonb,
	"bottleneck_analysis" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "approval_audit_trail" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"approval_record_id" varchar NOT NULL,
	"action" text NOT NULL,
	"performed_by" varchar,
	"previous_status" text,
	"new_status" text NOT NULL,
	"action_details" jsonb,
	"reasoning" text,
	"ip_address" text,
	"user_agent" text,
	"session_id" varchar,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_performance_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_date" timestamp NOT NULL,
	"approver_id" varchar,
	"department" text,
	"approvals_processed" integer DEFAULT 0 NOT NULL,
	"average_decision_time" numeric(5, 2),
	"accuracy_score" numeric(5, 2),
	"workload" integer DEFAULT 0 NOT NULL,
	"overdue_items" integer DEFAULT 0 NOT NULL,
	"decision_reversals" integer DEFAULT 0 NOT NULL,
	"escalation_initiated" integer DEFAULT 0 NOT NULL,
	"policy_violations" integer DEFAULT 0 NOT NULL,
	"stakeholder_feedback" numeric(3, 2),
	"process_efficiency" numeric(5, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "approval_policies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_name" text NOT NULL,
	"policy_description" text NOT NULL,
	"policy_type" text NOT NULL,
	"conditions" jsonb NOT NULL,
	"approval_action" text NOT NULL,
	"escalation_level" text,
	"priority" integer DEFAULT 100 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"applicable_departments" text[] DEFAULT '{""}',
	"effective_date" timestamp NOT NULL,
	"expiry_date" timestamp,
	"created_by" varchar,
	"approved_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "approval_workflows" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_name" text NOT NULL,
	"workflow_type" text NOT NULL,
	"item_type" text NOT NULL,
	"approval_steps" jsonb NOT NULL,
	"auto_escalation_enabled" boolean DEFAULT true NOT NULL,
	"escalation_timeout_hours" integer DEFAULT 72 NOT NULL,
	"bypass_conditions" jsonb,
	"notification_settings" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "approval_records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"approval_item_id" varchar NOT NULL,
	"approval_item_type" text NOT NULL,
	"approval_status" text NOT NULL,
	"decision_method" text NOT NULL,
	"approved_by" varchar,
	"approval_reasoning" text,
	"risk_level" text NOT NULL,
	"severity_analysis" jsonb,
	"policy_compliance" jsonb,
	"escalation_path" jsonb,
	"decision_confidence" numeric(5, 2),
	"processing_time_minutes" integer,
	"approval_date" timestamp,
	"expiry_date" timestamp,
	"approval_conditions" text[] DEFAULT '{""}',
	"follow_up_required" boolean DEFAULT false NOT NULL,
	"follow_up_date" timestamp,
	"workflow_id" varchar,
	"policy_id" varchar,
	"submitted_by" varchar NOT NULL,
	"submitted_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "approval_delegations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delegator_id" varchar NOT NULL,
	"delegate_id" varchar NOT NULL,
	"delegation_scope" text NOT NULL,
	"approval_types" text[] NOT NULL,
	"monetary_limit" numeric(12, 2),
	"risk_level_limit" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "approval_hierarchy" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department" text NOT NULL,
	"approval_level" text NOT NULL,
	"approver_role" text NOT NULL,
	"approver_user_id" varchar,
	"backup_approver_user_id" varchar,
	"approval_limits" jsonb NOT NULL,
	"escalation_timeout_hours" integer DEFAULT 72 NOT NULL,
	"auto_delegate_enabled" boolean DEFAULT false NOT NULL,
	"delegation_conditions" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"effective_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "approval_notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"approval_record_id" varchar,
	"escalation_path_id" varchar,
	"notification_type" text NOT NULL,
	"recipient_id" varchar NOT NULL,
	"channel" text NOT NULL,
	"subject" text,
	"message" text NOT NULL,
	"sent_at" timestamp,
	"delivery_status" text DEFAULT 'pending' NOT NULL,
	"read_at" timestamp,
	"action_taken" text,
	"action_taken_at" timestamp,
	"reminder_count" integer DEFAULT 0 NOT NULL,
	"last_reminder_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "escalation_paths" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"approval_record_id" varchar NOT NULL,
	"escalation_level" text NOT NULL,
	"current_assignee" varchar,
	"assigned_approvers" jsonb NOT NULL,
	"escalation_reason" text NOT NULL,
	"urgency" text NOT NULL,
	"timeout_hours" integer DEFAULT 72 NOT NULL,
	"next_escalation_level" text,
	"escalation_status" text DEFAULT 'pending' NOT NULL,
	"resolved_by" varchar,
	"resolved_at" timestamp,
	"resolution" text,
	"resolution_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "approval_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_name" text NOT NULL,
	"rule_description" text,
	"rule_type" text NOT NULL,
	"conditions" jsonb NOT NULL,
	"action" text NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"applicable_contexts" text[] DEFAULT '{""}',
	"effective_date" timestamp NOT NULL,
	"expiry_date" timestamp,
	"created_by" varchar,
	"last_modified_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_test_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"category_id" varchar NOT NULL,
	"risk_category" text NOT NULL,
	"risk_types" text[] DEFAULT '{""}',
	"complexity_level" text NOT NULL,
	"audit_scope" text NOT NULL,
	"objective" text NOT NULL,
	"scope" text NOT NULL,
	"description" text,
	"procedures_count" integer DEFAULT 0 NOT NULL,
	"evidence_types" text[] DEFAULT '{""}',
	"testing_methods" text[] DEFAULT '{""}',
	"skills_required" text[] DEFAULT '{""}',
	"estimated_hours" integer NOT NULL,
	"tools_needed" text[] DEFAULT '{""}',
	"review_level" text DEFAULT 'standard' NOT NULL,
	"approval_required" boolean DEFAULT false NOT NULL,
	"is_customizable" boolean DEFAULT true NOT NULL,
	"allow_procedure_modification" boolean DEFAULT true NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"success_rate" numeric(5, 2) DEFAULT '0',
	"avg_time_to_complete" integer,
	"version" text DEFAULT '1.0' NOT NULL,
	"tags" text[] DEFAULT '{""}',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "audit_test_templates_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "generated_tests_tracking" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"audit_test_id" varchar NOT NULL,
	"template_id" varchar,
	"risk_id" varchar NOT NULL,
	"generation_method" text NOT NULL,
	"customization_level" text DEFAULT 'none' NOT NULL,
	"customizations" jsonb DEFAULT '{}'::jsonb,
	"original_template_used" boolean DEFAULT true NOT NULL,
	"procedures_modified" integer DEFAULT 0 NOT NULL,
	"evidence_requirements_changed" boolean DEFAULT false NOT NULL,
	"generation_score" integer DEFAULT 100 NOT NULL,
	"validation_passed" boolean DEFAULT true NOT NULL,
	"issues_found" text[] DEFAULT '{""}',
	"generation_time_ms" integer,
	"user_review_time_min" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "template_customizations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar NOT NULL,
	"risk_id" varchar,
	"name" text NOT NULL,
	"description" text,
	"customization_type" text NOT NULL,
	"modified_objective" text,
	"modified_scope" text,
	"additional_procedures" jsonb DEFAULT '[]'::jsonb,
	"removed_procedures" text[] DEFAULT '{""}',
	"modified_procedures" jsonb DEFAULT '{}'::jsonb,
	"adjusted_hours" integer,
	"additional_skills" text[] DEFAULT '{""}',
	"additional_tools" text[] DEFAULT '{""}',
	"usage_count" integer DEFAULT 0 NOT NULL,
	"success_rate" numeric(5, 2) DEFAULT '0',
	"avg_effectiveness" numeric(5, 2) DEFAULT '0',
	"is_approved" boolean DEFAULT false NOT NULL,
	"approved_by" varchar,
	"approved_at" timestamp,
	"is_public" boolean DEFAULT false NOT NULL,
	"version" text DEFAULT '1.0' NOT NULL,
	"tags" text[] DEFAULT '{""}',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "template_procedures" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar NOT NULL,
	"step_number" integer NOT NULL,
	"procedure_text" text NOT NULL,
	"expected_outcome" text NOT NULL,
	"evidence_type" text NOT NULL,
	"testing_method" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"skill_level" text DEFAULT 'intermediate' NOT NULL,
	"estimated_minutes" integer NOT NULL,
	"tools_required" text[] DEFAULT '{""}',
	"is_mandatory" boolean DEFAULT true NOT NULL,
	"is_customizable" boolean DEFAULT true NOT NULL,
	"alternative_procedures" text[] DEFAULT '{""}',
	"guidance" text,
	"common_issues" text[] DEFAULT '{""}',
	"evidence_requirements" text,
	"order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "compliance_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"internal_code" text NOT NULL,
	"name" text NOT NULL,
	"issuing_organization" text NOT NULL,
	"publication_date" timestamp NOT NULL,
	"classification" text NOT NULL,
	"description" text,
	"document_url" text,
	"file_name" text,
	"original_file_name" text,
	"file_size" integer,
	"mime_type" text,
	"object_path" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"tags" text[] DEFAULT '{""}',
	"created_by" varchar NOT NULL,
	"updated_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"macroproceso_id" varchar,
	"applies_to_all_macroprocesos" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "control_owners" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"control_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"assigned_by" varchar NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "controls" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"frequency" text NOT NULL,
	"effectiveness" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_review" timestamp,
	"created_at" timestamp DEFAULT now(),
	"evaluation_completed_at" timestamp,
	"evaluated_by" varchar,
	"evidence" text,
	"effect_target" text DEFAULT 'both' NOT NULL,
	"revalidation_frequency_months" integer DEFAULT 24,
	"next_revalidation_date" timestamp,
	"revalidation_status" text DEFAULT 'vigente' NOT NULL,
	"last_revalidation_date" timestamp,
	CONSTRAINT "controls_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "revalidations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"control_id" varchar NOT NULL,
	"revalidated_by" varchar NOT NULL,
	"status" text NOT NULL,
	"compliance_declaration" text NOT NULL,
	"evidence_files" text[] DEFAULT '{""}',
	"comments" text,
	"next_revalidation_date" timestamp,
	"revalidation_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "revalidation_policies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"risk_level" text NOT NULL,
	"frequency_months" integer NOT NULL,
	"warning_days_before" integer DEFAULT 30 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "revalidation_policies_risk_level_key" UNIQUE("risk_level")
);
--> statement-breakpoint
ALTER TABLE "processes" ADD CONSTRAINT "processes_fiscal_entity_id_fiscal_entities_id_fk" FOREIGN KEY ("fiscal_entity_id") REFERENCES "public"."fiscal_entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processes" ADD CONSTRAINT "processes_macroproceso_id_macroprocesos_id_fk" FOREIGN KEY ("macroproceso_id") REFERENCES "public"."macroprocesos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_plans" ADD CONSTRAINT "action_plans_risk_id_risks_id_fk" FOREIGN KEY ("risk_id") REFERENCES "public"."risks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subprocesos" ADD CONSTRAINT "subprocesos_proceso_id_processes_id_fk" FOREIGN KEY ("proceso_id") REFERENCES "public"."processes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_snapshots" ADD CONSTRAINT "risk_snapshots_risk_id_risks_id_fk" FOREIGN KEY ("risk_id") REFERENCES "public"."risks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risks" ADD CONSTRAINT "risks_macroproceso_id_macroprocesos_id_fk" FOREIGN KEY ("macroproceso_id") REFERENCES "public"."macroprocesos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risks" ADD CONSTRAINT "risks_process_id_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risks" ADD CONSTRAINT "risks_subproceso_id_subprocesos_id_fk" FOREIGN KEY ("subproceso_id") REFERENCES "public"."subprocesos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risks" ADD CONSTRAINT "risks_validated_by_users_id_fk" FOREIGN KEY ("validated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "macroprocesos" ADD CONSTRAINT "macroprocesos_fiscal_entity_id_fiscal_entities_id_fk" FOREIGN KEY ("fiscal_entity_id") REFERENCES "public"."fiscal_entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_control_evaluations" ADD CONSTRAINT "audit_control_evaluations_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_control_evaluations" ADD CONSTRAINT "audit_control_evaluations_control_id_controls_id_fk" FOREIGN KEY ("control_id") REFERENCES "public"."controls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_control_evaluations" ADD CONSTRAINT "audit_control_evaluations_evaluated_by_users_id_fk" FOREIGN KEY ("evaluated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_programs" ADD CONSTRAINT "audit_programs_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_programs" ADD CONSTRAINT "audit_programs_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_reports" ADD CONSTRAINT "audit_reports_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_reports" ADD CONSTRAINT "audit_reports_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_reports" ADD CONSTRAINT "audit_reports_prepared_by_users_id_fk" FOREIGN KEY ("prepared_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_reports" ADD CONSTRAINT "audit_reports_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_plans" ADD CONSTRAINT "audit_plans_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_plans" ADD CONSTRAINT "audit_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_team_members" ADD CONSTRAINT "audit_team_members_auditor_role_id_auditor_roles_id_fk" FOREIGN KEY ("auditor_role_id") REFERENCES "public"."auditor_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_team_members" ADD CONSTRAINT "audit_team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditor_time_deductions" ADD CONSTRAINT "auditor_time_deductions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditor_time_deductions" ADD CONSTRAINT "auditor_time_deductions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditor_time_deductions" ADD CONSTRAINT "auditor_time_deductions_team_member_id_audit_team_members_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."audit_team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditor_availability" ADD CONSTRAINT "auditor_availability_team_member_id_audit_team_members_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."audit_team_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_control_id_controls_id_fk" FOREIGN KEY ("control_id") REFERENCES "public"."controls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_identified_by_users_id_fk" FOREIGN KEY ("identified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_program_id_audit_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."audit_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_responsible_person_users_id_fk" FOREIGN KEY ("responsible_person") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_risk_id_risks_id_fk" FOREIGN KEY ("risk_id") REFERENCES "public"."risks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_lead_auditor_users_id_fk" FOREIGN KEY ("lead_auditor") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_plan_id_audit_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."audit_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_process_id_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_regulation_id_regulations_id_fk" FOREIGN KEY ("regulation_id") REFERENCES "public"."regulations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audits" ADD CONSTRAINT "audits_subproceso_id_subprocesos_id_fk" FOREIGN KEY ("subproceso_id") REFERENCES "public"."subprocesos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_follow_ups" ADD CONSTRAINT "finding_follow_ups_finding_id_audit_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."audit_findings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finding_follow_ups" ADD CONSTRAINT "finding_follow_ups_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "working_papers" ADD CONSTRAINT "working_papers_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "working_papers" ADD CONSTRAINT "working_papers_prepared_by_users_id_fk" FOREIGN KEY ("prepared_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "working_papers" ADD CONSTRAINT "working_papers_program_id_audit_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."audit_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "working_papers" ADD CONSTRAINT "working_papers_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_plan_capacity" ADD CONSTRAINT "audit_plan_capacity_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_plan_capacity" ADD CONSTRAINT "audit_plan_capacity_plan_id_audit_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."audit_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_universe" ADD CONSTRAINT "audit_universe_macroproceso_id_macroprocesos_id_fk" FOREIGN KEY ("macroproceso_id") REFERENCES "public"."macroprocesos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_universe" ADD CONSTRAINT "audit_universe_process_id_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_universe" ADD CONSTRAINT "audit_universe_subproceso_id_subprocesos_id_fk" FOREIGN KEY ("subproceso_id") REFERENCES "public"."subprocesos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "control_evaluation_options" ADD CONSTRAINT "control_evaluation_options_criteria_id_control_evaluation_crite" FOREIGN KEY ("criteria_id") REFERENCES "public"."control_evaluation_criteria"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "control_evaluations" ADD CONSTRAINT "control_evaluations_control_id_controls_id_fk" FOREIGN KEY ("control_id") REFERENCES "public"."controls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "control_evaluations" ADD CONSTRAINT "control_evaluations_criteria_id_control_evaluation_criteria_id_" FOREIGN KEY ("criteria_id") REFERENCES "public"."control_evaluation_criteria"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "control_evaluations" ADD CONSTRAINT "control_evaluations_evaluated_by_users_id_fk" FOREIGN KEY ("evaluated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "control_evaluations" ADD CONSTRAINT "control_evaluations_option_id_control_evaluation_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."control_evaluation_options"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_config" ADD CONSTRAINT "system_config_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_test_controls" ADD CONSTRAINT "compliance_test_controls_compliance_test_id_compliance_tests_id" FOREIGN KEY ("compliance_test_id") REFERENCES "public"."compliance_tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_test_controls" ADD CONSTRAINT "compliance_test_controls_control_id_controls_id_fk" FOREIGN KEY ("control_id") REFERENCES "public"."controls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_test_controls" ADD CONSTRAINT "compliance_test_controls_responsible_person_users_id_fk" FOREIGN KEY ("responsible_person") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_test_controls" ADD CONSTRAINT "compliance_test_controls_risk_id_risks_id_fk" FOREIGN KEY ("risk_id") REFERENCES "public"."risks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_test_controls" ADD CONSTRAINT "compliance_test_controls_tested_by_users_id_fk" FOREIGN KEY ("tested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_tests" ADD CONSTRAINT "compliance_tests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_tests" ADD CONSTRAINT "compliance_tests_lead_auditor_users_id_fk" FOREIGN KEY ("lead_auditor") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_tests" ADD CONSTRAINT "compliance_tests_regulation_id_regulations_id_fk" FOREIGN KEY ("regulation_id") REFERENCES "public"."regulations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_regulations" ADD CONSTRAINT "risk_regulations_assessed_by_users_id_fk" FOREIGN KEY ("assessed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_regulations" ADD CONSTRAINT "risk_regulations_regulation_id_regulations_id_fk" FOREIGN KEY ("regulation_id") REFERENCES "public"."regulations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_regulations" ADD CONSTRAINT "risk_regulations_risk_id_risks_id_fk" FOREIGN KEY ("risk_id") REFERENCES "public"."risks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "macroproceso_fiscal_entities" ADD CONSTRAINT "macroproceso_fiscal_entities_fiscal_entity_id_fiscal_entities_i" FOREIGN KEY ("fiscal_entity_id") REFERENCES "public"."fiscal_entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "macroproceso_fiscal_entities" ADD CONSTRAINT "macroproceso_fiscal_entities_macroproceso_id_macroprocesos_id_f" FOREIGN KEY ("macroproceso_id") REFERENCES "public"."macroprocesos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_fiscal_entities" ADD CONSTRAINT "process_fiscal_entities_fiscal_entity_id_fiscal_entities_id_fk" FOREIGN KEY ("fiscal_entity_id") REFERENCES "public"."fiscal_entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_fiscal_entities" ADD CONSTRAINT "process_fiscal_entities_process_id_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."processes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regulations" ADD CONSTRAINT "regulations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regulations" ADD CONSTRAINT "regulations_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_prioritization_factors" ADD CONSTRAINT "audit_prioritization_factors_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_prioritization_factors" ADD CONSTRAINT "audit_prioritization_factors_calculated_by_users_id_fk" FOREIGN KEY ("calculated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_prioritization_factors" ADD CONSTRAINT "audit_prioritization_factors_plan_id_audit_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."audit_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_prioritization_factors" ADD CONSTRAINT "audit_prioritization_factors_universe_id_audit_universe_id_fk" FOREIGN KEY ("universe_id") REFERENCES "public"."audit_universe"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_plan_items" ADD CONSTRAINT "audit_plan_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_plan_items" ADD CONSTRAINT "audit_plan_items_plan_id_audit_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."audit_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_plan_items" ADD CONSTRAINT "audit_plan_items_prioritization_id_audit_prioritization_factors" FOREIGN KEY ("prioritization_id") REFERENCES "public"."audit_prioritization_factors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_plan_items" ADD CONSTRAINT "audit_plan_items_proposed_lead_auditor_users_id_fk" FOREIGN KEY ("proposed_lead_auditor") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_plan_items" ADD CONSTRAINT "audit_plan_items_universe_id_audit_universe_id_fk" FOREIGN KEY ("universe_id") REFERENCES "public"."audit_universe"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_tests" ADD CONSTRAINT "audit_tests_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_tests" ADD CONSTRAINT "audit_tests_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_tests" ADD CONSTRAINT "audit_tests_control_id_controls_id_fk" FOREIGN KEY ("control_id") REFERENCES "public"."controls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_tests" ADD CONSTRAINT "audit_tests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_tests" ADD CONSTRAINT "audit_tests_executor_id_users_id_fk" FOREIGN KEY ("executor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_tests" ADD CONSTRAINT "audit_tests_program_id_audit_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."audit_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_tests" ADD CONSTRAINT "audit_tests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_tests" ADD CONSTRAINT "audit_tests_risk_id_risks_id_fk" FOREIGN KEY ("risk_id") REFERENCES "public"."risks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_tests" ADD CONSTRAINT "audit_tests_supervisor_id_users_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_milestones" ADD CONSTRAINT "audit_milestones_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_milestones" ADD CONSTRAINT "audit_milestones_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_milestones" ADD CONSTRAINT "audit_milestones_responsible_id_users_id_fk" FOREIGN KEY ("responsible_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_notifications" ADD CONSTRAINT "audit_notifications_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_notifications" ADD CONSTRAINT "audit_notifications_test_id_audit_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."audit_tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_notifications" ADD CONSTRAINT "audit_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_review_comments" ADD CONSTRAINT "audit_review_comments_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_review_comments" ADD CONSTRAINT "audit_review_comments_commented_by_users_id_fk" FOREIGN KEY ("commented_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_review_comments" ADD CONSTRAINT "audit_review_comments_finding_id_audit_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."audit_findings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_review_comments" ADD CONSTRAINT "audit_review_comments_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_review_comments" ADD CONSTRAINT "audit_review_comments_test_id_audit_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."audit_tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_review_comments" ADD CONSTRAINT "audit_review_comments_working_paper_id_working_papers_id_fk" FOREIGN KEY ("working_paper_id") REFERENCES "public"."working_papers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_controls" ADD CONSTRAINT "audit_controls_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_controls" ADD CONSTRAINT "audit_controls_control_id_controls_id_fk" FOREIGN KEY ("control_id") REFERENCES "public"."controls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_controls" ADD CONSTRAINT "audit_controls_risk_id_risks_id_fk" FOREIGN KEY ("risk_id") REFERENCES "public"."risks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_attachments" ADD CONSTRAINT "audit_attachments_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_attachments" ADD CONSTRAINT "audit_attachments_finding_id_audit_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."audit_findings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_attachments" ADD CONSTRAINT "audit_attachments_program_id_audit_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."audit_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_attachments" ADD CONSTRAINT "audit_attachments_test_id_audit_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."audit_tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_attachments" ADD CONSTRAINT "audit_attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_attachments" ADD CONSTRAINT "audit_attachments_working_paper_id_working_papers_id_fk" FOREIGN KEY ("working_paper_id") REFERENCES "public"."working_papers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_audit_finding_id_audit_findings_id_fk" FOREIGN KEY ("audit_finding_id") REFERENCES "public"."audit_findings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_responsible_users_id_fk" FOREIGN KEY ("responsible") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actions" ADD CONSTRAINT "actions_risk_id_risks_id_fk" FOREIGN KEY ("risk_id") REFERENCES "public"."risks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_code_sequences" ADD CONSTRAINT "audit_code_sequences_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_scope" ADD CONSTRAINT "audit_scope_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_scope" ADD CONSTRAINT "audit_scope_control_id_controls_id_fk" FOREIGN KEY ("control_id") REFERENCES "public"."controls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_scope" ADD CONSTRAINT "audit_scope_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_scope" ADD CONSTRAINT "audit_scope_risk_id_risks_id_fk" FOREIGN KEY ("risk_id") REFERENCES "public"."risks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_test_work_logs" ADD CONSTRAINT "audit_test_work_logs_audit_test_id_audit_tests_id_fk" FOREIGN KEY ("audit_test_id") REFERENCES "public"."audit_tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_test_work_logs" ADD CONSTRAINT "audit_test_work_logs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_test_work_logs" ADD CONSTRAINT "audit_test_work_logs_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_attachment_code_sequences" ADD CONSTRAINT "audit_attachment_code_sequences_audit_test_id_audit_tests_id_fk" FOREIGN KEY ("audit_test_id") REFERENCES "public"."audit_tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_test_attachments" ADD CONSTRAINT "audit_test_attachments_audit_test_id_audit_tests_id_fk" FOREIGN KEY ("audit_test_id") REFERENCES "public"."audit_tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_test_attachments" ADD CONSTRAINT "audit_test_attachments_review_comment_id_audit_review_comments_" FOREIGN KEY ("review_comment_id") REFERENCES "public"."audit_review_comments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_test_attachments" ADD CONSTRAINT "audit_test_attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_test_attachments" ADD CONSTRAINT "audit_test_attachments_work_log_id_audit_test_work_logs_id_fk" FOREIGN KEY ("work_log_id") REFERENCES "public"."audit_test_work_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_audit_finding_id_audit_findings_id_fk" FOREIGN KEY ("audit_finding_id") REFERENCES "public"."audit_findings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_audit_test_id_audit_tests_id_fk" FOREIGN KEY ("audit_test_id") REFERENCES "public"."audit_tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_control_id_controls_id_fk" FOREIGN KEY ("control_id") REFERENCES "public"."controls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_risk_id_risks_id_fk" FOREIGN KEY ("risk_id") REFERENCES "public"."risks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_generation_log" ADD CONSTRAINT "report_generation_log_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_trending_data" ADD CONSTRAINT "risk_trending_data_risk_id_risks_id_fk" FOREIGN KEY ("risk_id") REFERENCES "public"."risks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditor_performance_metrics" ADD CONSTRAINT "auditor_performance_metrics_auditor_id_users_id_fk" FOREIGN KEY ("auditor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_generation_sessions" ADD CONSTRAINT "test_generation_sessions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_generation_sessions" ADD CONSTRAINT "test_generation_sessions_audit_id_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."audits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_generation_sessions" ADD CONSTRAINT "test_generation_sessions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_algorithm_config" ADD CONSTRAINT "generation_algorithm_config_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_analysis_profiles" ADD CONSTRAINT "risk_analysis_profiles_analyzed_by_users_id_fk" FOREIGN KEY ("analyzed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_analysis_profiles" ADD CONSTRAINT "risk_analysis_profiles_risk_id_risks_id_fk" FOREIGN KEY ("risk_id") REFERENCES "public"."risks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_context_analysis" ADD CONSTRAINT "audit_context_analysis_analyzed_by_users_id_fk" FOREIGN KEY ("analyzed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_context_analysis" ADD CONSTRAINT "audit_context_analysis_audit_test_id_audit_tests_id_fk" FOREIGN KEY ("audit_test_id") REFERENCES "public"."audit_tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditor_expertise_profiles" ADD CONSTRAINT "auditor_expertise_profiles_auditor_id_users_id_fk" FOREIGN KEY ("auditor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_best_practices" ADD CONSTRAINT "audit_best_practices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_best_practices" ADD CONSTRAINT "audit_best_practices_validated_by_users_id_fk" FOREIGN KEY ("validated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_performance_analysis" ADD CONSTRAINT "timeline_performance_analysis_audit_test_id_audit_tests_id_fk" FOREIGN KEY ("audit_test_id") REFERENCES "public"."audit_tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_performance_analysis" ADD CONSTRAINT "timeline_performance_analysis_auditor_id_users_id_fk" FOREIGN KEY ("auditor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intelligent_recommendations" ADD CONSTRAINT "intelligent_recommendations_audit_test_id_audit_tests_id_fk" FOREIGN KEY ("audit_test_id") REFERENCES "public"."audit_tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intelligent_recommendations" ADD CONSTRAINT "intelligent_recommendations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "optimal_timeline_patterns" ADD CONSTRAINT "optimal_timeline_patterns_validated_by_users_id_fk" FOREIGN KEY ("validated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_performance_history" ADD CONSTRAINT "procedure_performance_history_audit_test_id_audit_tests_id_fk" FOREIGN KEY ("audit_test_id") REFERENCES "public"."audit_tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure_performance_history" ADD CONSTRAINT "procedure_performance_history_auditor_id_users_id_fk" FOREIGN KEY ("auditor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_effectiveness" ADD CONSTRAINT "recommendation_effectiveness_audit_test_id_audit_tests_id_fk" FOREIGN KEY ("audit_test_id") REFERENCES "public"."audit_tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_effectiveness" ADD CONSTRAINT "recommendation_effectiveness_recommendation_id_intelligent_reco" FOREIGN KEY ("recommendation_id") REFERENCES "public"."intelligent_recommendations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_feedback" ADD CONSTRAINT "recommendation_feedback_provided_by_users_id_fk" FOREIGN KEY ("provided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_feedback" ADD CONSTRAINT "recommendation_feedback_recommendation_id_intelligent_recommend" FOREIGN KEY ("recommendation_id") REFERENCES "public"."intelligent_recommendations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_audit_trail" ADD CONSTRAINT "approval_audit_trail_approval_record_id_approval_records_id_fk" FOREIGN KEY ("approval_record_id") REFERENCES "public"."approval_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_audit_trail" ADD CONSTRAINT "approval_audit_trail_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_performance_metrics" ADD CONSTRAINT "approval_performance_metrics_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_policies" ADD CONSTRAINT "approval_policies_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_policies" ADD CONSTRAINT "approval_policies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_records" ADD CONSTRAINT "approval_records_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_records" ADD CONSTRAINT "approval_records_policy_id_approval_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."approval_policies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_records" ADD CONSTRAINT "approval_records_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_records" ADD CONSTRAINT "approval_records_workflow_id_approval_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."approval_workflows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_delegations" ADD CONSTRAINT "approval_delegations_delegate_id_users_id_fk" FOREIGN KEY ("delegate_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_delegations" ADD CONSTRAINT "approval_delegations_delegator_id_users_id_fk" FOREIGN KEY ("delegator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_hierarchy" ADD CONSTRAINT "approval_hierarchy_approver_user_id_users_id_fk" FOREIGN KEY ("approver_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_hierarchy" ADD CONSTRAINT "approval_hierarchy_backup_approver_user_id_users_id_fk" FOREIGN KEY ("backup_approver_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_notifications" ADD CONSTRAINT "approval_notifications_approval_record_id_approval_records_id_f" FOREIGN KEY ("approval_record_id") REFERENCES "public"."approval_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_notifications" ADD CONSTRAINT "approval_notifications_escalation_path_id_escalation_paths_id_f" FOREIGN KEY ("escalation_path_id") REFERENCES "public"."escalation_paths"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_notifications" ADD CONSTRAINT "approval_notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalation_paths" ADD CONSTRAINT "escalation_paths_approval_record_id_approval_records_id_fk" FOREIGN KEY ("approval_record_id") REFERENCES "public"."approval_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalation_paths" ADD CONSTRAINT "escalation_paths_current_assignee_users_id_fk" FOREIGN KEY ("current_assignee") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalation_paths" ADD CONSTRAINT "escalation_paths_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_rules" ADD CONSTRAINT "approval_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_rules" ADD CONSTRAINT "approval_rules_last_modified_by_users_id_fk" FOREIGN KEY ("last_modified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_test_templates" ADD CONSTRAINT "audit_test_templates_category_id_audit_test_template_categories" FOREIGN KEY ("category_id") REFERENCES "public"."audit_test_template_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_test_templates" ADD CONSTRAINT "audit_test_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_tests_tracking" ADD CONSTRAINT "generated_tests_tracking_audit_test_id_audit_tests_id_fk" FOREIGN KEY ("audit_test_id") REFERENCES "public"."audit_tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_tests_tracking" ADD CONSTRAINT "generated_tests_tracking_risk_id_risks_id_fk" FOREIGN KEY ("risk_id") REFERENCES "public"."risks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_tests_tracking" ADD CONSTRAINT "generated_tests_tracking_session_id_test_generation_sessions_id" FOREIGN KEY ("session_id") REFERENCES "public"."test_generation_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_tests_tracking" ADD CONSTRAINT "generated_tests_tracking_template_id_audit_test_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."audit_test_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_customizations" ADD CONSTRAINT "template_customizations_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_customizations" ADD CONSTRAINT "template_customizations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_customizations" ADD CONSTRAINT "template_customizations_risk_id_risks_id_fk" FOREIGN KEY ("risk_id") REFERENCES "public"."risks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_customizations" ADD CONSTRAINT "template_customizations_template_id_audit_test_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."audit_test_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_procedures" ADD CONSTRAINT "template_procedures_template_id_audit_test_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."audit_test_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_documents" ADD CONSTRAINT "compliance_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_documents" ADD CONSTRAINT "compliance_documents_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "control_owners" ADD CONSTRAINT "control_owners_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "control_owners" ADD CONSTRAINT "control_owners_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "public"."controls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "control_owners" ADD CONSTRAINT "control_owners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "controls" ADD CONSTRAINT "controls_evaluated_by_users_id_fk" FOREIGN KEY ("evaluated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revalidations" ADD CONSTRAINT "revalidations_control_id_fkey" FOREIGN KEY ("control_id") REFERENCES "public"."controls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revalidations" ADD CONSTRAINT "revalidations_revalidated_by_fkey" FOREIGN KEY ("revalidated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_tests_audit_idx" ON "audit_tests" USING btree ("audit_id" text_ops);--> statement-breakpoint
CREATE INDEX "audit_tests_code_idx" ON "audit_tests" USING btree ("code" text_ops);--> statement-breakpoint
CREATE INDEX "audit_tests_executor_idx" ON "audit_tests" USING btree ("executor_id" text_ops);--> statement-breakpoint
CREATE INDEX "audit_tests_status_idx" ON "audit_tests" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "audit_tests_supervisor_idx" ON "audit_tests" USING btree ("supervisor_id" text_ops);--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire" timestamp_ops);--> statement-breakpoint
CREATE INDEX "audit_code_seq_audit_idx" ON "audit_code_sequences" USING btree ("audit_id" text_ops);--> statement-breakpoint
CREATE INDEX "audit_scope_audit_idx" ON "audit_scope" USING btree ("audit_id" text_ops);--> statement-breakpoint
CREATE INDEX "audit_scope_risk_idx" ON "audit_scope" USING btree ("risk_id" text_ops);--> statement-breakpoint
CREATE INDEX "audit_test_work_logs_created_by_idx" ON "audit_test_work_logs" USING btree ("created_by" text_ops);--> statement-breakpoint
CREATE INDEX "audit_test_work_logs_date_idx" ON "audit_test_work_logs" USING btree ("entry_date" timestamp_ops);--> statement-breakpoint
CREATE INDEX "audit_test_work_logs_test_date_idx" ON "audit_test_work_logs" USING btree ("audit_test_id" text_ops,"entry_date" text_ops);--> statement-breakpoint
CREATE INDEX "audit_test_work_logs_test_idx" ON "audit_test_work_logs" USING btree ("audit_test_id" text_ops);--> statement-breakpoint
CREATE INDEX "audit_attachment_code_seq_test_idx" ON "audit_attachment_code_sequences" USING btree ("audit_test_id" text_ops);--> statement-breakpoint
CREATE INDEX "notification_templates_category_idx" ON "notification_templates" USING btree ("category" text_ops);--> statement-breakpoint
CREATE INDEX "notification_templates_key_idx" ON "notification_templates" USING btree ("key" text_ops);--> statement-breakpoint
CREATE INDEX "audit_test_attachments_category_idx" ON "audit_test_attachments" USING btree ("category" text_ops);--> statement-breakpoint
CREATE INDEX "audit_test_attachments_code_idx" ON "audit_test_attachments" USING btree ("attachment_code" text_ops);--> statement-breakpoint
CREATE INDEX "audit_test_attachments_progress_idx" ON "audit_test_attachments" USING btree ("progress_percentage" int4_ops);--> statement-breakpoint
CREATE INDEX "audit_test_attachments_review_idx" ON "audit_test_attachments" USING btree ("review_comment_id" text_ops);--> statement-breakpoint
CREATE INDEX "audit_test_attachments_test_idx" ON "audit_test_attachments" USING btree ("audit_test_id" text_ops);--> statement-breakpoint
CREATE INDEX "audit_test_attachments_test_progress_idx" ON "audit_test_attachments" USING btree ("audit_test_id" text_ops,"progress_percentage" text_ops);--> statement-breakpoint
CREATE INDEX "audit_test_attachments_test_workflow_idx" ON "audit_test_attachments" USING btree ("audit_test_id" text_ops,"workflow_stage" text_ops);--> statement-breakpoint
CREATE INDEX "audit_test_attachments_uploaded_by_idx" ON "audit_test_attachments" USING btree ("uploaded_by" text_ops);--> statement-breakpoint
CREATE INDEX "audit_test_attachments_work_log_idx" ON "audit_test_attachments" USING btree ("work_log_id" text_ops);--> statement-breakpoint
CREATE INDEX "audit_test_attachments_workflow_stage_idx" ON "audit_test_attachments" USING btree ("workflow_stage" text_ops);--> statement-breakpoint
CREATE INDEX "notification_preferences_type_idx" ON "notification_preferences" USING btree ("notification_type" text_ops);--> statement-breakpoint
CREATE INDEX "notification_preferences_user_idx" ON "notification_preferences" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "notifications_audit_test_idx" ON "notifications" USING btree ("audit_test_id" text_ops);--> statement-breakpoint
CREATE INDEX "notifications_priority_idx" ON "notifications" USING btree ("priority" text_ops);--> statement-breakpoint
CREATE INDEX "notifications_read_idx" ON "notifications" USING btree ("is_read" bool_ops);--> statement-breakpoint
CREATE INDEX "notifications_recipient_idx" ON "notifications" USING btree ("recipient_id" text_ops);--> statement-breakpoint
CREATE INDEX "notifications_recipient_type_idx" ON "notifications" USING btree ("recipient_id" text_ops,"type" text_ops);--> statement-breakpoint
CREATE INDEX "notifications_recipient_unread_idx" ON "notifications" USING btree ("recipient_id" text_ops,"is_read" text_ops);--> statement-breakpoint
CREATE INDEX "notifications_scheduled_idx" ON "notifications" USING btree ("scheduled_for" timestamp_ops);--> statement-breakpoint
CREATE INDEX "notifications_status_idx" ON "notifications" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "notifications_type_idx" ON "notifications" USING btree ("type" text_ops);--> statement-breakpoint
CREATE INDEX "report_generation_date_idx" ON "report_generation_log" USING btree ("requested_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "report_generation_status_idx" ON "report_generation_log" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "report_generation_type_idx" ON "report_generation_log" USING btree ("report_type" text_ops);--> statement-breakpoint
CREATE INDEX "report_generation_user_idx" ON "report_generation_log" USING btree ("requested_by" text_ops);--> statement-breakpoint
CREATE INDEX "notification_stats_date_idx" ON "notification_stats" USING btree ("date" timestamp_ops);--> statement-breakpoint
CREATE INDEX "notification_stats_type_idx" ON "notification_stats" USING btree ("notification_type" text_ops);--> statement-breakpoint
CREATE INDEX "risk_trending_period_idx" ON "risk_trending_data" USING btree ("period_start" timestamp_ops,"period_end" timestamp_ops);--> statement-breakpoint
CREATE INDEX "risk_trending_risk_idx" ON "risk_trending_data" USING btree ("risk_id" text_ops);--> statement-breakpoint
CREATE INDEX "team_performance_dept_idx" ON "team_performance_metrics" USING btree ("department_name" text_ops);--> statement-breakpoint
CREATE INDEX "team_performance_period_idx" ON "team_performance_metrics" USING btree ("period_start" timestamp_ops,"period_end" timestamp_ops);--> statement-breakpoint
CREATE INDEX "auditor_performance_auditor_idx" ON "auditor_performance_metrics" USING btree ("auditor_id" text_ops);--> statement-breakpoint
CREATE INDEX "auditor_performance_period_idx" ON "auditor_performance_metrics" USING btree ("period_start" timestamp_ops,"period_end" timestamp_ops);--> statement-breakpoint
CREATE INDEX "workflow_efficiency_period_idx" ON "workflow_efficiency_metrics" USING btree ("period_start" timestamp_ops,"period_end" timestamp_ops);--> statement-breakpoint
CREATE INDEX "notification_queue_channel_idx" ON "notification_queue" USING btree ("channel" text_ops);--> statement-breakpoint
CREATE INDEX "notification_queue_priority_idx" ON "notification_queue" USING btree ("queue_priority" int4_ops);--> statement-breakpoint
CREATE INDEX "notification_queue_processing_idx" ON "notification_queue" USING btree ("status" text_ops,"scheduled_for" int4_ops,"queue_priority" timestamp_ops);--> statement-breakpoint
CREATE INDEX "notification_queue_scheduled_idx" ON "notification_queue" USING btree ("scheduled_for" timestamp_ops);--> statement-breakpoint
CREATE INDEX "notification_queue_status_idx" ON "notification_queue" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "template_categories_active_idx" ON "audit_test_template_categories" USING btree ("is_active" bool_ops);--> statement-breakpoint
CREATE INDEX "template_categories_order_idx" ON "audit_test_template_categories" USING btree ("order" int4_ops);--> statement-breakpoint
CREATE INDEX "sessions_approved_by_idx" ON "test_generation_sessions" USING btree ("approved_by" text_ops);--> statement-breakpoint
CREATE INDEX "sessions_audit_idx" ON "test_generation_sessions" USING btree ("audit_id" text_ops);--> statement-breakpoint
CREATE INDEX "sessions_created_at_idx" ON "test_generation_sessions" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "sessions_created_by_idx" ON "test_generation_sessions" USING btree ("created_by" text_ops);--> statement-breakpoint
CREATE INDEX "sessions_status_idx" ON "test_generation_sessions" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "sessions_type_idx" ON "test_generation_sessions" USING btree ("generation_type" text_ops);--> statement-breakpoint
CREATE INDEX "algorithm_active_idx" ON "generation_algorithm_config" USING btree ("is_active" bool_ops);--> statement-breakpoint
CREATE INDEX "algorithm_default_idx" ON "generation_algorithm_config" USING btree ("is_default" bool_ops);--> statement-breakpoint
CREATE INDEX "algorithm_name_idx" ON "generation_algorithm_config" USING btree ("name" text_ops);--> statement-breakpoint
CREATE INDEX "algorithm_type_idx" ON "generation_algorithm_config" USING btree ("algorithm_type" text_ops);--> statement-breakpoint
CREATE INDEX "algorithm_version_idx" ON "generation_algorithm_config" USING btree ("version" text_ops);--> statement-breakpoint
CREATE INDEX "profiles_active_idx" ON "risk_analysis_profiles" USING btree ("is_active" bool_ops);--> statement-breakpoint
CREATE INDEX "profiles_category_idx" ON "risk_analysis_profiles" USING btree ("risk_category" text_ops);--> statement-breakpoint
CREATE INDEX "profiles_complexity_idx" ON "risk_analysis_profiles" USING btree ("complexity" text_ops);--> statement-breakpoint
CREATE INDEX "profiles_confidence_idx" ON "risk_analysis_profiles" USING btree ("confidence_score" numeric_ops);--> statement-breakpoint
CREATE INDEX "profiles_control_env_idx" ON "risk_analysis_profiles" USING btree ("control_environment" text_ops);--> statement-breakpoint
CREATE INDEX "profiles_priority_idx" ON "risk_analysis_profiles" USING btree ("priority" text_ops);--> statement-breakpoint
CREATE INDEX "profiles_risk_idx" ON "risk_analysis_profiles" USING btree ("risk_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_performance_metrics_unique" ON "approval_performance_metrics" USING btree ("approver_id" text_ops,"metric_date" timestamp_ops,"department" text_ops);--> statement-breakpoint
CREATE INDEX "templates_active_idx" ON "audit_test_templates" USING btree ("is_active" bool_ops);--> statement-breakpoint
CREATE INDEX "templates_category_idx" ON "audit_test_templates" USING btree ("category_id" text_ops);--> statement-breakpoint
CREATE INDEX "templates_complexity_idx" ON "audit_test_templates" USING btree ("complexity_level" text_ops);--> statement-breakpoint
CREATE INDEX "templates_name_idx" ON "audit_test_templates" USING btree ("name" text_ops);--> statement-breakpoint
CREATE INDEX "templates_risk_category_idx" ON "audit_test_templates" USING btree ("risk_category" text_ops);--> statement-breakpoint
CREATE INDEX "templates_usage_idx" ON "audit_test_templates" USING btree ("usage_count" int4_ops);--> statement-breakpoint
CREATE INDEX "tracking_method_idx" ON "generated_tests_tracking" USING btree ("generation_method" text_ops);--> statement-breakpoint
CREATE INDEX "tracking_risk_idx" ON "generated_tests_tracking" USING btree ("risk_id" text_ops);--> statement-breakpoint
CREATE INDEX "tracking_score_idx" ON "generated_tests_tracking" USING btree ("generation_score" int4_ops);--> statement-breakpoint
CREATE INDEX "tracking_session_idx" ON "generated_tests_tracking" USING btree ("session_id" text_ops);--> statement-breakpoint
CREATE INDEX "tracking_template_idx" ON "generated_tests_tracking" USING btree ("template_id" text_ops);--> statement-breakpoint
CREATE INDEX "tracking_test_idx" ON "generated_tests_tracking" USING btree ("audit_test_id" text_ops);--> statement-breakpoint
CREATE INDEX "customizations_active_idx" ON "template_customizations" USING btree ("is_active" bool_ops);--> statement-breakpoint
CREATE INDEX "customizations_created_by_idx" ON "template_customizations" USING btree ("created_by" text_ops);--> statement-breakpoint
CREATE INDEX "customizations_public_idx" ON "template_customizations" USING btree ("is_public" bool_ops);--> statement-breakpoint
CREATE INDEX "customizations_risk_idx" ON "template_customizations" USING btree ("risk_id" text_ops);--> statement-breakpoint
CREATE INDEX "customizations_template_idx" ON "template_customizations" USING btree ("template_id" text_ops);--> statement-breakpoint
CREATE INDEX "customizations_type_idx" ON "template_customizations" USING btree ("customization_type" text_ops);--> statement-breakpoint
CREATE INDEX "customizations_usage_idx" ON "template_customizations" USING btree ("usage_count" int4_ops);--> statement-breakpoint
CREATE INDEX "procedures_evidence_type_idx" ON "template_procedures" USING btree ("evidence_type" text_ops);--> statement-breakpoint
CREATE INDEX "procedures_method_idx" ON "template_procedures" USING btree ("testing_method" text_ops);--> statement-breakpoint
CREATE INDEX "procedures_order_idx" ON "template_procedures" USING btree ("order" int4_ops);--> statement-breakpoint
CREATE INDEX "procedures_step_idx" ON "template_procedures" USING btree ("step_number" int4_ops);--> statement-breakpoint
CREATE INDEX "procedures_template_idx" ON "template_procedures" USING btree ("template_id" text_ops);--> statement-breakpoint
CREATE INDEX "procedures_template_order_idx" ON "template_procedures" USING btree ("template_id" text_ops,"order" text_ops);
*/