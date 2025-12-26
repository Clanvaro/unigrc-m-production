-- Migration: Optimize process_owners table for /api/process-owners endpoint
-- Date: 2024-12-26
-- Description: Add composite index (isActive, name) to improve query performance
--
-- Problem: The query `SELECT ... FROM process_owners WHERE isActive = true ORDER BY name`
-- was using separate indexes for filtering and sorting, causing slower performance.
--
-- Solution: Create a composite index that handles both WHERE and ORDER BY in a single index scan.
-- This should improve cold-start query time from ~200-500ms to ~20-50ms.

-- Create composite index for common query pattern: WHERE isActive = true ORDER BY name
-- Using CONCURRENTLY to avoid locking the table during index creation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_owners_active_name 
ON process_owners (is_active, name);

-- Verify the index was created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'process_owners';

-- Analyze table to update statistics for query planner
ANALYZE process_owners;

