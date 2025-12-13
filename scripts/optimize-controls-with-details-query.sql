-- ============================================================
-- OPTIMIZATION: Indexes for /api/controls/with-details endpoint
-- These indexes optimize the CTE-based query used in the endpoint
-- ============================================================

-- 1. Composite index for control_owners ORDER BY (control_id, assigned_at)
-- This optimizes the control_owners_agg CTE that orders by control_id and assigned_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_control_owners_control_active_assigned 
ON control_owners(control_id, is_active, assigned_at DESC)
WHERE is_active = true;

-- 2. Composite index for risk_controls JOIN with controls
-- This optimizes the risk_details_agg CTE that joins risk_controls with controls
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_controls_control_id_risk_id 
ON risk_controls(control_id, risk_id);

-- 3. Index for controls ORDER BY code (already exists but verify)
-- This optimizes the ORDER BY c.code in controls_base CTE
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_code 
ON controls(code)
WHERE status != 'deleted';

-- 4. Composite index for controls filtering (status + code for ordering)
-- This optimizes the WHERE clause and ORDER BY together
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_status_code 
ON controls(status, code)
WHERE status != 'deleted';

-- 5. Index for risks status filter in JOIN
-- This optimizes the LEFT JOIN risks with status filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_status_id_code 
ON risks(status, id, code)
WHERE status != 'deleted';

-- Verify indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('controls', 'control_owners', 'risk_controls', 'risks')
AND indexname IN (
    'idx_control_owners_control_active_assigned',
    'idx_risk_controls_control_id_risk_id',
    'idx_controls_code',
    'idx_controls_status_code',
    'idx_risks_status_id_code'
)
ORDER BY tablename, indexname;

-- Update statistics for query planner
ANALYZE controls;
ANALYZE control_owners;
ANALYZE risk_controls;
ANALYZE risks;

