-- Database Performance Optimization Script
-- Run this via Cloud Run or Cloud Shell to optimize database performance

-- 1. Update statistics for query planner (VACUUM ANALYZE)
VACUUM ANALYZE risks;
VACUUM ANALYZE controls;
VACUUM ANALYZE risk_controls;
VACUUM ANALYZE macroprocesos;
VACUUM ANALYZE processes;

-- 2. Add missing indexes on critical columns
-- These indexes will significantly improve query performance

-- Index on deleted_at for soft delete filtering (partial index for NULL values)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_deleted_at ON risks(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_deleted_at ON controls(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_macroprocesos_deleted_at ON macroprocesos(deleted_at) WHERE deleted_at IS NULL;

-- Index on status for active filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_status ON risks(status) WHERE deleted_at IS NULL;

-- Composite index for common query patterns (status + deleted_at)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_status_deleted ON risks(status, deleted_at);

-- Indexes on foreign keys for JOIN performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_controls_risk_id ON risk_controls(risk_id) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risk_controls_control_id ON risk_controls(control_id) WHERE deleted_at IS NULL;

-- Index on effectiveness for filtering controls
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_effectiveness ON controls(effectiveness) WHERE deleted_at IS NULL;

-- Index on process relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_process_id ON risks(process_id) WHERE deleted_at IS NULL;

SELECT 'Database optimization complete!' as status;
