-- ============================================================
-- PERFORMANCE OPTIMIZATION: DATABASE INDEXES
-- Execute this script to create all performance indexes
-- ============================================================

-- IMPORTANT: CONCURRENTLY prevents table locking during index creation
-- This allows the application to continue running

BEGIN;

-- ============= RISKS TABLE =============
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_process_id 
ON risks(process_id) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_inherent_risk 
ON risks(inherent_risk DESC) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_residual_risk 
ON risks(residual_risk DESC) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_category 
ON risks(category) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_status 
ON risks(status) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_deleted_at 
ON risks(deleted_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_process_category 
ON risks(process_id, category) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_inherent_residual 
ON risks(inherent_risk DESC, residual_risk DESC) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_created_at 
ON risks(created_at DESC);

-- ============= CONTROLS TABLE =============
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_type 
ON controls(type) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_effectiveness 
ON controls(effectiveness DESC) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_frequency 
ON controls(frequency) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_deleted_at 
ON controls(deleted_at);

-- ============= RISK-CONTROL RELATIONSHIPS =============
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_controls_risk_id 
ON risk_controls(risk_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_controls_control_id 
ON risk_controls(control_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_controls_composite 
ON risk_controls(risk_id, control_id);

-- ============= PROCESSES HIERARCHY =============
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processes_macroproceso_id 
ON processes(macroproceso_id) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processes_deleted_at 
ON processes(deleted_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subprocesos_proceso_id 
ON subprocesos(proceso_id) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subprocesos_deleted_at 
ON subprocesos(deleted_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_macroprocesos_deleted_at 
ON macroprocesos(deleted_at);

-- ============= ACTION PLANS =============
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_action_plans_risk_id 
ON action_plans(risk_id) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_action_plans_status 
ON action_plans(status) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_action_plans_due_date 
ON action_plans(due_date) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_action_plans_deleted_at 
ON action_plans(deleted_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_action_plans_created_at 
ON action_plans(created_at DESC);

-- ============= RISK EVENTS =============
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_events_risk_id 
ON risk_events(risk_id) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_events_event_date 
ON risk_events(event_date DESC) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_events_impact_level 
ON risk_events(impact_level) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_events_deleted_at 
ON risk_events(deleted_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_events_created_at 
ON risk_events(created_at DESC);

-- ============= AUDITS =============
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audits_type 
ON audits(type) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audits_status 
ON audits(status) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audits_start_date 
ON audits(start_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audits_deleted_at 
ON audits(deleted_at);

-- ============= AUDIT FINDINGS =============
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_findings_audit_id 
ON audit_findings(audit_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_findings_severity 
ON audit_findings(severity);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_findings_status 
ON audit_findings(status);

-- ============= USERS & AUTHENTICATION =============
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
ON users(email) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username 
ON users(username) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_account_locked 
ON users(account_locked_until) WHERE account_locked_until IS NOT NULL;

-- ============= ORGANIZATIONAL STRUCTURE =============
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gerencias_code 
ON gerencias(code) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_objetivos_code 
ON objetivos_estrategicos(code) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gerencias_deleted_at 
ON gerencias(deleted_at);

-- Índice compuesto para optimizar consultas de gerencias ordenadas
-- Optimiza: WHERE deleted_at IS NULL ORDER BY level, order
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gerencias_deleted_level_order 
ON gerencias(deleted_at, level, "order") 
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_objetivos_deleted_at 
ON objetivos_estrategicos(deleted_at);

-- ============= PROCESS ASSOCIATIONS =============
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_gerencias_process_id 
ON process_gerencias(process_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_gerencias_gerencia_id 
ON process_gerencias(gerencia_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_objetivos_process_id 
ON process_objetivos_estrategicos(process_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_objetivos_objetivo_id 
ON process_objetivos_estrategicos(objetivo_estrategico_id);

-- ============= RISK PROCESS LINKS (for batch-relations endpoint) =============
-- Critical index for batch queries: WHERE risk_id IN (...)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_process_links_risk_id 
ON risk_process_links(risk_id);

-- Composite index to optimize ORDER BY created_at in batch queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_process_links_risk_id_created_at 
ON risk_process_links(risk_id, created_at);

-- Index for responsible override lookups (used in JOIN)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_process_links_responsible_override 
ON risk_process_links(responsible_override_id) 
WHERE responsible_override_id IS NOT NULL;

-- Index for validation lookups (used in JOIN)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_process_links_validated_by 
ON risk_process_links(validated_by) 
WHERE validated_by IS NOT NULL;

COMMIT;

-- ============= UPDATE STATISTICS =============
ANALYZE risks;
ANALYZE controls;
ANALYZE risk_controls;
ANALYZE risk_process_links;
ANALYZE processes;
ANALYZE subprocesos;
ANALYZE macroprocesos;
ANALYZE action_plans;
ANALYZE risk_events;
ANALYZE audits;
ANALYZE audit_findings;
ANALYZE users;
ANALYZE gerencias;
ANALYZE objetivos_estrategicos;
ANALYZE risk_process_links;

-- ============= SUCCESS MESSAGE =============
SELECT 'Performance indexes created successfully! ✅' AS status;
