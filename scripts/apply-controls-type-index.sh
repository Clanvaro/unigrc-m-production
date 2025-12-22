#!/bin/bash
# Script to apply controls type index migration
# This improves performance when filtering controls by type

set -e

echo "🔧 Applying controls type index migration..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ] && [ -z "$PGBOUNCER_URL" ]; then
  echo "❌ Error: DATABASE_URL or PGBOUNCER_URL must be set"
  exit 1
fi

# Use PGBOUNCER_URL if available, otherwise DATABASE_URL
DB_URL="${PGBOUNCER_URL:-$DATABASE_URL}"

# Execute migration
psql "$DB_URL" -f migrations/add-controls-type-index.sql

echo "✅ Migration applied successfully!"
echo ""
echo "Indexes created:"
echo "  - idx_controls_type (on controls.type)"
echo "  - idx_controls_type_status_deleted (composite index)"
echo "  - idx_control_owners_control_active_assigned (for owner lookups)"
