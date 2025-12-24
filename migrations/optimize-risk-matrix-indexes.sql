-- Optimize Risk Matrix Query Performance
-- This script adds indexes specifically for the /api/dashboard/risk-matrix endpoint
-- Run with: psql $DATABASE_URL -f optimize-risk-matrix-indexes.sql

-- ============================================================================
-- RISK_CONTROLS TABLE INDEXES
-- NOTE: risk_controls table does NOT have deleted_at column
-- ============================================================================

-- Index for GROUP BY risk_id in risk_control_factors CTE
-- Used in: GROUP BY rc.risk_id
-- Note: idx_rc_risk_id already exists, but this one is optimized for GROUP BY
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_controls_risk_id_group 
ON risk_controls(risk_id);

-- Composite index for JOIN with controls (control_id for JOIN performance)
-- Used in: JOIN controls c ON rc.control_id = c.id
-- Note: idx_rc_control_id already exists, but this composite helps with JOINs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_controls_control_id_matrix 
ON risk_controls(control_id);

-- Composite index for risk_id + control_id lookups (optimizes both JOINs)
-- Used in: control_codes_summary CTE and risk_control_factors CTE
-- Note: idx_rc_risk_control already exists, but this one is specifically for matrix queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_controls_risk_control_matrix 
ON risk_controls(risk_id, control_id);

-- ============================================================================
-- CONTROLS TABLE INDEXES
-- ============================================================================

-- Index for JOIN with risk_controls (id is primary key, but adding partial index for deleted_at filter)
-- Used in: JOIN controls c ON rc.control_id = c.id AND c.deleted_at IS NULL
-- Note: id is already indexed as primary key, but this partial index helps with the filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_id_deleted_matrix 
ON controls(id) 
WHERE deleted_at IS NULL;

-- Index for ordering by code in control_codes_summary
-- Used in: ORDER BY c.code
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_code 
ON controls(code) 
WHERE deleted_at IS NULL;

-- Composite index for effect_target filtering
-- Used in: CASE WHEN c.effect_target IN ('probability', 'both')
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_effect_target 
ON controls(effect_target) 
WHERE deleted_at IS NULL;

-- Composite index for effectiveness calculations
-- Used in: AVG(c.effectiveness), COUNT(CASE WHEN c.effectiveness > 0)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_effectiveness_deleted 
ON controls(effectiveness) 
WHERE deleted_at IS NULL AND effectiveness > 0;

-- ============================================================================
-- RISK_PROCESS_LINKS TABLE INDEXES
-- ============================================================================

-- Note: idx_risk_process_links_risk_id already exists in apply-performance-indexes.sql
-- This composite index optimizes GROUP BY with validation_status filtering
-- Used in: GROUP BY rpl.risk_id with FILTER (WHERE rpl.validation_status = 'rejected')
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_process_links_risk_validation 
ON risk_process_links(risk_id, validation_status);

-- Note: idx_risk_process_links_risk_id_created_at already exists, but this one is optimized for DISTINCT ON
-- Used in: DISTINCT ON (rpl.risk_id) ORDER BY rpl.risk_id, rpl.created_at
-- This index is specifically for the risk_process_primary CTE
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_process_links_risk_created_distinct 
ON risk_process_links(risk_id, created_at);

-- ============================================================================
-- RISKS TABLE INDEXES (if not already exist)
-- ============================================================================

-- Composite index for main query filter + ordering
-- Used in: WHERE r.status = 'active' AND r.deleted_at IS NULL ORDER BY r.inherent_risk DESC
-- This single composite index covers both filter and sort
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_matrix_query 
ON risks(status, deleted_at, inherent_risk DESC) 
WHERE status = 'active' AND deleted_at IS NULL;

-- Note: idx_risks_status_deleted already exists in optimize_performance.sql
-- This new index is optimized specifically for the matrix query pattern

-- ============================================================================
-- UPDATE STATISTICS
-- ============================================================================

-- Update statistics so query planner can use the new indexes
ANALYZE risk_controls;
ANALYZE controls;
ANALYZE risk_process_links;
ANALYZE risks;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check created indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('risk_controls', 'controls', 'risk_process_links', 'risks')
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

SELECT 'Risk matrix indexes created successfully! ✅' as status;

