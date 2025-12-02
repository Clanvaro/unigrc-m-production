#!/usr/bin/env tsx
/**
 * Script to apply Validation Center optimization indexes
 * Sprint 2: Creates indexes for efficient filtering and sorting of controls
 * 
 * Usage: npm run apply-validation-indexes
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';

const { Pool } = pg;

async function applyValidationIndexes() {
    console.log('🚀 Starting Validation Center Index Migration...\n');

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error('❌ ERROR: DATABASE_URL environment variable not set');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
    });

    const db = drizzle(pool);

    try {
        console.log('📝 Creating indexes for Validation Center...');
        console.log('   This may take a few seconds...\n');

        const startTime = Date.now();

        // 1. Index for filtering by validation status (pending_validation)
        await db.execute(sql`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_validation_status 
      ON controls(validation_status) 
      WHERE status != 'deleted';
    `);

        // 2. Index for filtering by notification status (notified_at)
        await db.execute(sql`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_notified_at 
      ON controls(notified_at) 
      WHERE status != 'deleted';
    `);

        // 3. Index for joining control_owners efficiently
        await db.execute(sql`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_control_owners_control_id 
      ON control_owners(control_id) 
      WHERE is_active = true;
    `);

        // 4. Index for joining process_owners efficiently
        await db.execute(sql`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_control_owners_process_owner_id 
      ON control_owners(process_owner_id);
    `);

        const indexTime = Date.now() - startTime;
        console.log(`✅ Indexes created successfully in ${indexTime}ms\n`);

        console.log('📊 Analyzing tables to update statistics...');
        await db.execute(sql`ANALYZE controls`);
        await db.execute(sql`ANALYZE control_owners`);
        console.log('✅ Tables analyzed\n');

        // Verify indexes
        console.log('🔍 Verifying indexes...');
        const verification = await db.execute(sql`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename IN ('controls', 'control_owners')
      AND indexname IN (
        'idx_controls_validation_status', 
        'idx_controls_notified_at',
        'idx_control_owners_control_id',
        'idx_control_owners_process_owner_id'
      )
    `);

        verification.rows.forEach((row: any) => {
            console.log(`   - Verified: ${row.indexname}`);
        });

        console.log('\n🎉 Migration completed successfully!');

    } catch (error) {
        console.error('\n❌ ERROR during migration:');
        console.error(error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

applyValidationIndexes().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
