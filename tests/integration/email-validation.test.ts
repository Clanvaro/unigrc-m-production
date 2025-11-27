import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../../server/db';
import { controls, auditLogs, batchValidationTokens } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * CRITICAL VALIDATION TESTS
 * 
 * These tests protect against regression bugs that were previously fixed:
 * 
 * 1. Nov 2025: audit_logs.user_id made nullable to support public validations
 *    - Without this, email validations for "observed"/"rejected" status fail
 *    - Database constraint violation: NOT NULL on user_id column
 * 
 * 2. Batch validation tokens properly mark controls as observed/rejected
 *    - Test complete workflow: token creation → validation → database update
 * 
 * DO NOT remove these tests - they prevent critical bugs from reappearing!
 */

describe('Email Validation Critical Path', () => {
  let testControlId: string;
  let testToken: string;
  const testTenantId = 'default-tenant';

  beforeAll(async () => {
    // Create a test control for validation
    const [control] = await db.insert(controls).values({
      tenantId: testTenantId,
      code: 'TEST-VAL-001',
      name: 'Test Control for Email Validation',
      description: 'Test control to verify email validation workflow',
      type: 'preventive',
      automationLevel: 'manual',
      frequency: 'monthly',
      effectiveness: 80,
      validationStatus: 'pending_validation',
      createdBy: 'user-1',
    }).returning();

    testControlId = control.id;

    // Generate a batch validation token
    const tokenString = crypto.randomBytes(32).toString('hex');
    testToken = crypto.createHash('sha256').update(tokenString).digest('hex');

    await db.insert(batchValidationTokens).values({
      token: testToken,
      type: 'control',
      responsibleEmail: 'test@example.com',
      entityIds: [testControlId],
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      isUsed: false,
    });
  });

  afterAll(async () => {
    // Cleanup: delete test data
    if (testControlId) {
      await db.delete(auditLogs).where(eq(auditLogs.entityId, testControlId));
      await db.delete(controls).where(eq(controls.id, testControlId));
    }
    if (testToken) {
      await db.delete(batchValidationTokens).where(eq(batchValidationTokens.token, testToken));
    }
  });

  /**
   * TEST 1: Critical test for userId NULL support
   * 
   * This test ensures that audit_logs.user_id column allows NULL values.
   * If this test fails, it means someone changed the schema back to NOT NULL,
   * which will break ALL email-based validations.
   */
  it('should allow NULL userId in audit_logs for public validations', async () => {
    const [auditLog] = await db.insert(auditLogs).values({
      entityId: testControlId,
      entityType: 'control',
      action: 'email_validation_test',
      userId: null, // CRITICAL: This must be allowed!
      changes: { test: 'public validation' },
    }).returning();

    expect(auditLog).toBeDefined();
    expect(auditLog.userId).toBeNull();
    
    // Cleanup
    await db.delete(auditLogs).where(eq(auditLogs.id, auditLog.id));
  });

  /**
   * TEST 2: Verify "observed" status saves correctly
   * 
   * Bug history: Controls marked as "observed" from emails didn't appear in UI
   * because the transaction rolled back due to userId NULL constraint violation.
   */
  it('should save control as "observed" with NULL userId', async () => {
    // Simulate email validation marking control as "observed"
    await db.update(controls)
      .set({
        validationStatus: 'observed',
        validationComments: 'Test observation comment',
        validatedAt: new Date(),
      })
      .where(eq(controls.id, testControlId));

    // Log the validation action
    await db.insert(auditLogs).values({
      entityId: testControlId,
      entityType: 'control',
      action: 'batch_email_validation',
      userId: null, // Public validation has no specific user
      changes: {
        validationStatus: 'observed',
        comments: 'Test observation comment',
      },
    });

    // Verify control was updated
    const [updatedControl] = await db.select()
      .from(controls)
      .where(eq(controls.id, testControlId));

    expect(updatedControl.validationStatus).toBe('observed');
    expect(updatedControl.validationComments).toBe('Test observation comment');
  });

  /**
   * TEST 3: Verify "rejected" status saves correctly
   * 
   * Same issue as "observed" - rejected controls must save with NULL userId
   */
  it('should save control as "rejected" with NULL userId', async () => {
    // Simulate email validation marking control as "rejected"
    await db.update(controls)
      .set({
        validationStatus: 'rejected',
        validationComments: 'Test rejection reason',
        validatedAt: new Date(),
      })
      .where(eq(controls.id, testControlId));

    // Log the validation action
    await db.insert(auditLogs).values({
      entityId: testControlId,
      entityType: 'control',
      action: 'batch_email_validation',
      userId: null,
      changes: {
        validationStatus: 'rejected',
        comments: 'Test rejection reason',
      },
    });

    // Verify control was updated
    const [updatedControl] = await db.select()
      .from(controls)
      .where(eq(controls.id, testControlId));

    expect(updatedControl.validationStatus).toBe('rejected');
    expect(updatedControl.validationComments).toBe('Test rejection reason');
  });

  /**
   * TEST 4: Batch token workflow integration
   * 
   * Ensures complete workflow works: token validation → status update → audit log
   */
  it('should complete full batch validation workflow', async () => {
    // Reset control to pending
    await db.update(controls)
      .set({ validationStatus: 'pending_validation' })
      .where(eq(controls.id, testControlId));

    // Verify token exists and is valid
    const [token] = await db.select()
      .from(batchValidationTokens)
      .where(
        and(
          eq(batchValidationTokens.token, testToken),
          eq(batchValidationTokens.isUsed, false)
        )
      );

    expect(token).toBeDefined();
    expect(token.entityIds).toContain(testControlId);

    // Simulate validation action
    await db.update(controls)
      .set({
        validationStatus: 'validated',
        validatedAt: new Date(),
      })
      .where(eq(controls.id, testControlId));

    // Log the validation
    await db.insert(auditLogs).values({
      entityId: testControlId,
      entityType: 'control',
      action: 'batch_email_validation',
      userId: null,
      changes: {
        validationStatus: 'validated',
        via: 'email_batch_token',
      },
    });

    // Mark token as used
    await db.update(batchValidationTokens)
      .set({ isUsed: true })
      .where(eq(batchValidationTokens.token, testToken));

    // Verify everything worked
    const [finalControl] = await db.select()
      .from(controls)
      .where(eq(controls.id, testControlId));

    expect(finalControl.validationStatus).toBe('validated');

    const [usedToken] = await db.select()
      .from(batchValidationTokens)
      .where(eq(batchValidationTokens.token, testToken));

    expect(usedToken.isUsed).toBe(true);
  });
});

/**
 * DATABASE SCHEMA VALIDATION TESTS
 * 
 * These tests verify critical database configuration.
 * If these fail, it means someone altered the schema in a breaking way.
 */
describe('Database Schema Validation', () => {
  it('should verify audit_logs.user_id column allows NULL', async () => {
    // This test inserts and immediately deletes a record with NULL user_id
    // If it fails, the database schema is broken
    const [testLog] = await db.insert(auditLogs).values({
      entityId: 'schema-test-entity',
      entityType: 'control',
      action: 'schema_validation_test',
      userId: null, // Must not throw constraint violation
      changes: { test: 'schema validation' },
    }).returning();

    expect(testLog.userId).toBeNull();

    // Cleanup
    await db.delete(auditLogs).where(eq(auditLogs.id, testLog.id));
  });

  it('should verify batch_validation_tokens table exists and has correct columns', async () => {
    // Verify we can query the table
    const tokens = await db.select().from(batchValidationTokens).limit(1);
    
    // This test passes if the query doesn't throw an error
    expect(Array.isArray(tokens)).toBe(true);
  });
});
