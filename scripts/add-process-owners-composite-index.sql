-- ============================================
-- Add Composite Index for Process Owners
-- Optimizes: WHERE isActive = true ORDER BY name
-- ============================================

-- This index optimizes the getProcessOwners() query which filters by isActive and orders by name
-- Without this index, PostgreSQL may need to:
-- 1. Filter by isActive (using idx_process_owners_active)
-- 2. Sort all results by name (expensive operation)
-- With this composite index, both operations can be done efficiently in one pass

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_owners_active_name 
ON process_owners(is_active, name)
WHERE is_active = true;

-- Verify the index was created
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'process_owners'
AND indexname = 'idx_process_owners_active_name';

-- Update table statistics for query planner
ANALYZE process_owners;

