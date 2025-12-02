#!/usr/bin/env tsx
/**
 * Script to apply Controls List optimization indexes
 * Sprint 3: Creates indexes for efficient filtering and searching of controls
 * 
 * Usage: npm run apply-controls-indexes
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';

const { Pool } = pg;

async function applyControlsIndexes() {
    console.log('🚀 Starting Controls List Index Migration...\n');

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
        console.log('📝 Creating indexes for Controls List...');
        console.log('   This may take a few seconds...\n');

        const startTime = Date.now();

        // 1. Index for filtering by type
        await db.execute(sql`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_type 
      ON controls(type) 
      WHERE status != 'deleted';
    `);

        // 2. Index for filtering by effectiveness
        await db.execute(sql`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_effectiveness 
      ON controls(effectiveness) 
      WHERE status != 'deleted';
    `);

        // 3. Index for filtering by active status
        await db.execute(sql`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_is_active 
      ON controls(is_active) 
      WHERE status != 'deleted';
    `);

        // 4. GIN Index for text search (name, code, description)
        // Note: We use the `pg_trgm` extension for efficient LIKE '%...%' queries if available, 
        // but standard btree on lower(name) is safer for basic compatibility without extensions.
        // Let's stick to standard indexes for now to avoid extension dependency issues.

        await db.execute(sql`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_name_lower 
      ON controls(lower(name)) 
      WHERE status != 'deleted';
    `);

        await db.execute(sql`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_controls_code_lower 
      ON controls(lower(code)) 
      WHERE status != 'deleted';
    `);

        const indexTime = Date.now() - startTime;
        console.log(`✅ Indexes created successfully in ${indexTime}ms\n`);

        console.log('📊 Analyzing table to update statistics...');
        await db.execute(sql`ANALYZE controls`);
        console.log('✅ Table analyzed\n');

        // Verify indexes
        console.log('🔍 Verifying indexes...');
        const verification = await db.execute(sql`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'controls'
      AND indexname IN (
        'idx_controls_type', 
        'idx_controls_effectiveness',
        'idx_controls_is_active',
        'idx_controls_name_lower',
        'idx_controls_code_lower'
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

applyControlsIndexes().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
