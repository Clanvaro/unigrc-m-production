/**
 * DATABASE SCHEMA VALIDATION SCRIPT
 * 
 * This script verifies critical database configuration is correct.
 * Run this at startup or in CI/CD to catch schema issues early.
 * 
 * CRITICAL VALIDATIONS:
 * 1. audit_logs.user_id allows NULL (required for email validations)
 * 2. batch_validation_tokens table exists
 * 3. controls table has correct validation columns
 * 
 * Usage:
 *   npm run validate-schema
 *   or
 *   tsx scripts/validate-database-schema.ts
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

async function validateSchema() {
  console.log('🔍 Starting database schema validation...\n');
  
  let errors: string[] = [];
  let warnings: string[] = [];

  // ========================================
  // VALIDATION 1: audit_logs.user_id nullable
  // ========================================
  try {
    const auditLogsColumns = await db.execute<ColumnInfo>(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'audit_logs' 
      AND column_name = 'user_id';
    `);

    if (auditLogsColumns.rows.length === 0) {
      errors.push('❌ CRITICAL: audit_logs.user_id column not found!');
    } else {
      const userIdColumn = auditLogsColumns.rows[0];
      if (userIdColumn.is_nullable !== 'YES') {
        errors.push(
          '❌ CRITICAL: audit_logs.user_id is NOT NULL!\n' +
          '   This will break email-based validations.\n' +
          '   Run: ALTER TABLE audit_logs ALTER COLUMN user_id DROP NOT NULL;'
        );
      } else {
        console.log('✅ audit_logs.user_id allows NULL (correct)');
      }
    }
  } catch (error) {
    errors.push(`❌ Error checking audit_logs table: ${error}`);
  }

  // ========================================
  // VALIDATION 2: batch_validation_tokens table exists
  // ========================================
  try {
    const tableExists = await db.execute<{ exists: boolean }>(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'batch_validation_tokens'
      );
    `);

    if (!tableExists.rows[0]?.exists) {
      errors.push('❌ CRITICAL: batch_validation_tokens table does not exist!');
    } else {
      console.log('✅ batch_validation_tokens table exists');
      
      // Check required columns
      const requiredColumns = ['token', 'type', 'responsible_email', 'entity_ids', 'expires_at', 'is_used'];
      const columns = await db.execute<ColumnInfo>(sql`
        SELECT column_name
        FROM information_schema.columns 
        WHERE table_name = 'batch_validation_tokens';
      `);
      
      const existingColumns = columns.rows.map(c => c.column_name);
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
      
      if (missingColumns.length > 0) {
        errors.push(`❌ batch_validation_tokens missing columns: ${missingColumns.join(', ')}`);
      } else {
        console.log('✅ batch_validation_tokens has all required columns');
      }
    }
  } catch (error) {
    errors.push(`❌ Error checking batch_validation_tokens table: ${error}`);
  }

  // ========================================
  // VALIDATION 3: controls table validation columns
  // ========================================
  try {
    const controlsColumns = await db.execute<ColumnInfo>(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'controls' 
      AND column_name IN ('validation_status', 'validated_by', 'validated_at', 'validation_comments', 'notified_at');
    `);

    const requiredValidationColumns = [
      'validation_status',
      'validated_by',
      'validated_at',
      'validation_comments',
      'notified_at'
    ];

    const existingValidationColumns = controlsColumns.rows.map(c => c.column_name);
    const missingValidationColumns = requiredValidationColumns.filter(
      col => !existingValidationColumns.includes(col)
    );

    if (missingValidationColumns.length > 0) {
      errors.push(`❌ controls table missing validation columns: ${missingValidationColumns.join(', ')}`);
    } else {
      console.log('✅ controls table has all validation columns');
    }
  } catch (error) {
    errors.push(`❌ Error checking controls table: ${error}`);
  }

  // ========================================
  // VALIDATION 4: Referential integrity checks
  // ========================================
  try {
    // Check if refetchOnWindowFocus is configured in frontend queries
    // This is a reminder, not a database check
    warnings.push(
      '⚠️  REMINDER: Ensure all validation queries have refetchOnWindowFocus: true\n' +
      '   Check: client/src/pages/risk-validation.tsx'
    );
  } catch (error) {
    // Non-critical
  }

  // ========================================
  // RESULTS
  // ========================================
  console.log('\n' + '='.repeat(60));
  console.log('VALIDATION RESULTS');
  console.log('='.repeat(60));

  if (errors.length > 0) {
    console.log('\n🔴 CRITICAL ERRORS FOUND:\n');
    errors.forEach(error => console.log(error));
    console.log('\n❌ Schema validation FAILED!');
    console.log('Please fix these issues before deploying.\n');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:\n');
    warnings.forEach(warning => console.log(warning));
  }

  console.log('\n✅ All critical schema validations passed!');
  console.log('Database schema is correctly configured.\n');
  process.exit(0);
}

// Run validation
validateSchema().catch((error) => {
  console.error('💥 Unexpected error during schema validation:', error);
  process.exit(1);
});
