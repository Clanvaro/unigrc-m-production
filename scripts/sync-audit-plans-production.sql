-- Script to sync audit_plans table with missing columns in production
-- Run this in your Neon production database console

-- Add soft-delete columns if they don't exist
ALTER TABLE audit_plans ADD COLUMN IF NOT EXISTS deleted_by VARCHAR REFERENCES users(id);
ALTER TABLE audit_plans ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE audit_plans ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Add audit columns if they don't exist
ALTER TABLE audit_plans ADD COLUMN IF NOT EXISTS created_by VARCHAR NOT NULL DEFAULT 'system' REFERENCES users(id);
ALTER TABLE audit_plans ADD COLUMN IF NOT EXISTS updated_by VARCHAR REFERENCES users(id);
ALTER TABLE audit_plans ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE audit_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add wizard columns if they don't exist
ALTER TABLE audit_plans ADD COLUMN IF NOT EXISTS wizard_step INTEGER DEFAULT 0;
ALTER TABLE audit_plans ADD COLUMN IF NOT EXISTS wizard_data JSONB;

-- Add period columns if they don't exist
ALTER TABLE audit_plans ADD COLUMN IF NOT EXISTS period_type TEXT NOT NULL DEFAULT 'calendar';
ALTER TABLE audit_plans ADD COLUMN IF NOT EXISTS start_month INTEGER;
ALTER TABLE audit_plans ADD COLUMN IF NOT EXISTS end_month INTEGER;
ALTER TABLE audit_plans ADD COLUMN IF NOT EXISTS end_year INTEGER;

-- Verify the columns exist now
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'audit_plans' 
ORDER BY ordinal_position;
