-- Migration: Add unique constraint to risk_controls table
-- This prevents a control from being associated multiple times with the same risk

-- First, remove any existing duplicates (keep the first one created)
DELETE FROM risk_controls a
USING risk_controls b
WHERE a.id > b.id 
  AND a.risk_id = b.risk_id 
  AND a.control_id = b.control_id;

-- Add unique constraint (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_risk_control'
  ) THEN
    CREATE UNIQUE INDEX unique_risk_control ON risk_controls(risk_id, control_id);
  END IF;
END $$;

-- Verify the constraint was created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'risk_controls' AND indexname = 'unique_risk_control';
