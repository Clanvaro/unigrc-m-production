#!/usr/bin/env tsx
/**
 * Script to apply gerencias performance index
 * Optimizes queries: WHERE deleted_at IS NULL ORDER BY level, order
 * 
 * Usage: npm run apply-gerencias-index
 * Or: tsx scripts/apply-gerencias-index.ts
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';

const { Pool } = pg;

async function applyGerenciasIndex() {
    console.log('🚀 Starting Gerencias Performance Index Migration...\n');

    const databaseUrl = process.env.DATABASE_URL || process.env.RENDER_DATABASE_URL || process.env.POOLED_DATABASE_URL;
    if (!databaseUrl) {
        console.error('❌ ERROR: DATABASE_URL environment variable not set');
        console.error('   Set DATABASE_URL, RENDER_DATABASE_URL, or POOLED_DATABASE_URL');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
    });

    const db = drizzle(pool);

    try {
        console.log('📝 Creating indexes for gerencias table...');
        console.log('   This may take a few seconds...\n');

        const startTime = Date.now();

        // 1. Index for deleted_at if it doesn't exist
        console.log('   Creating idx_gerencias_deleted_at...');
        await db.execute(sql`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gerencias_deleted_at 
            ON gerencias(deleted_at);
        `);
        console.log('   ✅ idx_gerencias_deleted_at created\n');

        // 2. Composite index for optimized queries: WHERE deleted_at IS NULL ORDER BY level, order
        console.log('   Creating idx_gerencias_deleted_level_order...');
        await db.execute(sql`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gerencias_deleted_level_order 
            ON gerencias(deleted_at, level, "order") 
            WHERE deleted_at IS NULL;
        `);
        console.log('   ✅ idx_gerencias_deleted_level_order created\n');

        // 3. Update statistics for query planner
        console.log('   Updating statistics...');
        await db.execute(sql`ANALYZE gerencias;`);
        console.log('   ✅ Statistics updated\n');

        const duration = Date.now() - startTime;
        console.log(`✅ Migration completed successfully in ${duration}ms\n`);
        console.log('📊 Indexes created:');
        console.log('   - idx_gerencias_deleted_at');
        console.log('   - idx_gerencias_deleted_level_order (composite, partial)');
        console.log('\n💡 These indexes will optimize queries like:');
        console.log('   SELECT * FROM gerencias WHERE deleted_at IS NULL ORDER BY level, "order";\n');

    } catch (error) {
        console.error('❌ Error applying indexes:', error);
        if (error instanceof Error) {
            console.error('   Message:', error.message);
            console.error('   Stack:', error.stack);
        }
        process.exit(1);
    } finally {
        await pool.end();
    }
}

applyGerenciasIndex().catch(console.error);
