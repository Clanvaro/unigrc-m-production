-- Add index on controls.type for faster filtering
-- This index significantly improves performance when filtering controls by type
CREATE INDEX IF NOT EXISTS idx_controls_type ON controls(type);

-- Composite index for common filter combinations (type + status + deleted_at)
-- This helps when filtering by type AND status together
CREATE INDEX IF NOT EXISTS idx_controls_type_status_deleted ON controls(type, status, deleted_at);

-- Optimize control_owners queries for latest owner lookup
-- This helps the LEFT JOIN LATERAL in controls/with-details endpoint
CREATE INDEX IF NOT EXISTS idx_control_owners_control_active_assigned 
  ON control_owners(control_id, is_active, assigned_at DESC) 
  WHERE is_active = true;
