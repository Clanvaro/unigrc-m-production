-- ============================================================
-- PERFORMANCE OPTIMIZATION: INDEXES FOR BATCH-RELATIONS ENDPOINT
-- These indexes optimize the /api/risks/batch-relations endpoint
-- which was taking ~25 seconds
-- ============================================================

BEGIN;

-- ============= RISK_PROCESS_LINKS TABLE =============
-- Critical index for WHERE risk_id IN (...) queries with up to 100 values
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_process_links_risk_id 
ON risk_process_links(risk_id);

-- Composite index to optimize ORDER BY created_at in the same query
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_process_links_risk_id_created_at 
ON risk_process_links(risk_id, created_at);

-- Index for responsibleOverrideId join optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_process_links_responsible_override_id 
ON risk_process_links(responsible_override_id) 
WHERE responsible_override_id IS NOT NULL;

-- Index for validatedBy join optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_process_links_validated_by 
ON risk_process_links(validated_by) 
WHERE validated_by IS NOT NULL;

-- ============= RISK_CONTROLS TABLE =============
-- Verify/ensure index exists for risk_id (should already exist, but ensure it)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_controls_risk_id 
ON risk_controls(risk_id);

COMMIT;

-- ============= UPDATE STATISTICS =============
ANALYZE risk_process_links;
ANALYZE risk_controls;

-- ============= SUCCESS MESSAGE =============
SELECT 'Batch-relations performance indexes created successfully! ✅' AS status;
