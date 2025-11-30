-- Performance optimization indexes - November 30, 2025
-- Run this script on Render PostgreSQL production database

-- Index for validation center count queries
-- Covers: WHERE validation_status = X AND notification_sent = Y
-- Expected improvement: ~60-70% faster count queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rpl_validation_notification 
ON risk_process_links (validation_status, notification_sent);

-- Verify the index was created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'risk_process_links' 
  AND indexname = 'idx_rpl_validation_notification';
