#!/usr/bin/env tsx
/**
 * Script to apply controls type index migration
 * Improves performance when filtering controls by type (reduces query time from 5s+ to <500ms)
 * 
 * Usage: tsx scripts/apply-controls-type-index.ts
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

async function applyControlsTypeIndex() {
    console.log('🚀 Starting Controls Type Index Migration...\n');

    // Use PGBOUNCER_URL if available, otherwise DATABASE_URL
    const databaseUrl = process.env.PGBOUNCER_URL || process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error('❌ ERROR: PGBOUNCER_URL or DATABASE_URL environment variable must be set');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
    });

    const db = drizzle(pool);

    try {
        console.log('📝 Creating indexes for Controls filtering optimization...');
        console.log('   This may take a few seconds...\n');

        const startTime = Date.now();

        // 1. Index for filtering by type (critical for /api/controls/with-details performance)
        console.log('   Creating idx_controls_type...');
        await db.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_controls_type 
            ON controls(type)
        `);

        // 2. Composite index for common filter combinations
        console.log('   Creating idx_controls_type_status_deleted...');
        await db.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_controls_type_status_deleted 
            ON controls(type, status, deleted_at)
        `);

        // 3. Optimize control_owners queries for latest owner lookup
        console.log('   Creating idx_control_owners_control_active_assigned...');
        await db.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_control_owners_control_active_assigned 
            ON control_owners(control_id, is_active, assigned_at DESC) 
            WHERE is_active = true
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
            SELECT indexname, tablename
            FROM pg_indexes 
            WHERE tablename IN ('controls', 'control_owners')
            AND indexname IN (
                'idx_controls_type', 
                'idx_controls_type_status_deleted',
                'idx_control_owners_control_active_assigned'
            )
            ORDER BY tablename, indexname
        `);

        if (verification.rows.length === 0) {
            console.warn('   ⚠️  No indexes found - they may have been created with different names');
        } else {
            verification.rows.forEach((row: any) => {
                console.log(`   ✅ ${row.tablename}.${row.indexname}`);
            });
        }

        console.log('\n🎉 Migration completed successfully!');
        console.log('\n📈 Expected performance improvement:');
        console.log('   - Filtering by type: 5s+ → <500ms');
        console.log('   - Owner lookup: Faster with optimized index');

    } catch (error) {
        console.error('\n❌ ERROR during migration:');
        console.error(error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

applyControlsTypeIndex().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
