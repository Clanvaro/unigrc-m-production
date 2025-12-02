/**
 * Database Performance Optimization
 * SQL scripts for creating indexes and optimizing queries
 */

export const PERFORMANCE_INDEXES = `
-- ============= CRITICAL INDEXES FOR PERFORMANCE =============

-- Risks table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_process_id ON risks(process_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_inherent_risk ON risks(inherent_risk DESC) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_residual_risk ON risks(residual_risk DESC) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_category ON risks(category) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_status ON risks(status) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_deleted_at ON risks(deleted_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_macroproceso_id ON risks(macroproceso_id) WHERE deleted_at IS NULL;

-- Controls table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_type ON controls(type) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_effectiveness ON controls(effectiveness DESC) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_frequency ON controls(frequency) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_deleted_at ON controls(deleted_at);

-- Risk-Control relationship
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_controls_risk_id ON risk_controls(risk_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_controls_control_id ON risk_controls(control_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_controls_composite ON risk_controls(risk_id, control_id);

-- Processes hierarchy
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processes_macroproceso_id ON processes(macroproceso_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processes_deleted_at ON processes(deleted_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subprocesos_proceso_id ON subprocesos(proceso_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subprocesos_deleted_at ON subprocesos(deleted_at);

-- Action plans
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_action_plans_risk_id ON action_plans(risk_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_action_plans_status ON action_plans(status) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_action_plans_due_date ON action_plans(due_date) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_action_plans_deleted_at ON action_plans(deleted_at);

-- Risk events
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_events_risk_id ON risk_events(risk_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_events_event_date ON risk_events(event_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_events_impact_level ON risk_events(impact_level) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_events_deleted_at ON risk_events(deleted_at);

-- Audits
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audits_type ON audits(type) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audits_status ON audits(status) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audits_start_date ON audits(start_date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audits_deleted_at ON audits(deleted_at);

-- Audit findings
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_findings_audit_id ON audit_findings(audit_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_findings_severity ON audit_findings(severity);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_findings_status ON audit_findings(status);

-- Audit tests (critical for Admin Dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_tests_status ON audit_tests(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_tests_risk_id ON audit_tests(risk_id) WHERE risk_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_tests_status_risk ON audit_tests(status, risk_id) WHERE risk_id IS NOT NULL;

-- Actions table (for open actions count)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_actions_status ON actions(status) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_actions_deleted_at ON actions(deleted_at);

-- Users and authentication
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_account_locked ON users(account_locked_until) WHERE account_locked_until IS NOT NULL;

-- Organizational structure
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gerencias_code ON gerencias(code) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_objetivos_code ON objetivos_estrategicos(code) WHERE deleted_at IS NULL;

-- Process associations (many-to-many)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_gerencias_process_id ON process_gerencias(process_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_gerencias_gerencia_id ON process_gerencias(gerencia_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_objetivos_process_id ON process_objetivos_estrategicos(process_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_objetivos_objetivo_id ON process_objetivos_estrategicos(objetivo_estrategico_id);

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_process_category ON risks(process_id, category) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_inherent_residual ON risks(inherent_risk DESC, residual_risk DESC) WHERE deleted_at IS NULL;

-- Full-text search indexes (if needed)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_search ON risks USING gin(to_tsvector('spanish', name || ' ' || description));
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_search ON controls USING gin(to_tsvector('spanish', name || ' ' || description));

-- Analytics optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_created_at ON risks(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_action_plans_created_at ON action_plans(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_events_created_at ON risk_events(created_at DESC);

-- Notifications (critical for performance - unread count queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unread ON notifications(recipient_id, tenant_id, is_read) WHERE is_read = false;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- User roles and permissions (critical for auth performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_roles_is_active ON roles(is_active) WHERE is_active = true;

-- Tenant users (critical for multi-tenant auth)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_users_user_id ON tenant_users(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_users_tenant_id ON tenant_users(tenant_id);
`;

export const PERFORMANCE_STATISTICS = `
-- ============= UPDATE STATISTICS FOR QUERY PLANNER =============

-- Analyze all critical tables to update statistics
ANALYZE risks;
ANALYZE controls;
ANALYZE risk_controls;
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
`;

export const VACUUM_MAINTENANCE = `
-- ============= VACUUM FOR PERFORMANCE =============

-- Regular maintenance to reclaim storage and update statistics
VACUUM ANALYZE risks;
VACUUM ANALYZE controls;
VACUUM ANALYZE processes;
VACUUM ANALYZE audits;
`;

// Query optimization patterns
export const QUERY_OPTIMIZATION_TIPS = {
  // Always use WHERE deleted_at IS NULL for soft-deleted tables
  softDelete: `
    -- Good: Uses index
    SELECT * FROM risks WHERE deleted_at IS NULL AND process_id = $1;
    
    -- Bad: Doesn't use index efficiently
    SELECT * FROM risks WHERE process_id = $1 AND deleted_at IS NULL;
  `,
  
  // Use specific columns instead of SELECT *
  selectSpecific: `
    -- Good: Only fetch needed columns
    SELECT id, name, inherent_risk FROM risks WHERE process_id = $1;
    
    -- Bad: Fetches all columns
    SELECT * FROM risks WHERE process_id = $1;
  `,
  
  // Use LIMIT for pagination
  pagination: `
    -- Good: Uses LIMIT and OFFSET
    SELECT id, name FROM risks 
    WHERE deleted_at IS NULL 
    ORDER BY created_at DESC 
    LIMIT 20 OFFSET 0;
  `,
  
  // Use EXISTS instead of COUNT for existence checks
  existence: `
    -- Good: Uses EXISTS (faster)
    SELECT EXISTS(SELECT 1 FROM risks WHERE process_id = $1 AND deleted_at IS NULL);
    
    -- Bad: Uses COUNT
    SELECT COUNT(*) FROM risks WHERE process_id = $1 AND deleted_at IS NULL;
  `,
  
  // Use JOIN instead of subqueries when possible
  joins: `
    -- Good: Uses JOIN
    SELECT r.*, p.name as process_name 
    FROM risks r
    JOIN processes p ON r.process_id = p.id
    WHERE r.deleted_at IS NULL;
    
    -- Bad: Uses subquery
    SELECT *, (SELECT name FROM processes WHERE id = risks.process_id) as process_name
    FROM risks WHERE deleted_at IS NULL;
  `
};

// Connection pool optimization for Neon serverless
export const NEON_POOL_CONFIG = {
  // Neon serverless optimizations
  max: parseInt(process.env.DB_POOL_MAX || '10', 10), // Max connections
  min: parseInt(process.env.DB_POOL_MIN || '2', 10),  // Min connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Fail fast if can't connect in 10s
  maxUses: 7500, // Rotate connections for serverless
  
  // Statement timeout to prevent long-running queries
  statement_timeout: 30000, // 30 seconds max per query
  
  // Keep-alive for serverless environments
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
};
