#!/usr/bin/env tsx
/**
 * Script to apply the Risk Matrix optimization index
 * Sprint 1: Creates composite index for matrix aggregation queries
 * 
 * Usage: npm run apply-matrix-index
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';

const { Pool } = pg;

async function applyMatrixIndex() {
    console.log('🚀 Starting Risk Matrix Index Migration...\n');

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error('❌ ERROR: DATABASE_URL environment variable not set');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false }, // Required for Render PostgreSQL
    });

    const db = drizzle(pool);

    try {
        console.log('📊 Checking if index already exists...');

        // Check if index exists
        const existingIndex = await db.execute(sql`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'risks' 
        AND indexname = 'idx_risks_matrix_aggregation'
    `);

        if (existingIndex.rows.length > 0) {
            console.log('✅ Index idx_risks_matrix_aggregation already exists!');
            console.log('   No action needed.\n');
            await pool.end();
            return;
        }

        console.log('📝 Creating composite index for matrix aggregation...');
        console.log('   This may take 10-60 seconds depending on table size...\n');

        const startTime = Date.now();

        // Create index CONCURRENTLY (non-blocking)
        await db.execute(sql`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_risks_matrix_aggregation 
      ON risks(
        status,
        probability, 
        impact
      ) 
      WHERE status != 'deleted'
    `);

        const indexTime = Date.now() - startTime;
        console.log(`✅ Index created successfully in ${indexTime}ms\n`);

        console.log('📊 Analyzing table to update statistics...');
        await db.execute(sql`ANALYZE risks`);
        console.log('✅ Table analyzed\n');

        // Verify index was created
        console.log('🔍 Verifying index creation...');
        const verification = await db.execute(sql`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename = 'risks' 
        AND indexname = 'idx_risks_matrix_aggregation'
    `);

        if (verification.rows.length > 0) {
            console.log('✅ Index verified successfully!\n');
            console.log('Index details:');
            console.log(`   Name: ${verification.rows[0].indexname}`);
            console.log(`   Definition: ${verification.rows[0].indexdef}\n`);
        } else {
            console.log('⚠️  Warning: Index creation reported success but verification failed');
            console.log('   This may be a timing issue. Check manually with:');
            console.log('   SELECT * FROM pg_indexes WHERE tablename = \'risks\';\n');
        }

        // Show all indexes on risks table
        console.log('📋 All indexes on risks table:');
        const allIndexes = await db.execute(sql`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'risks' 
      ORDER BY indexname
    `);

        allIndexes.rows.forEach((row: any) => {
            console.log(`   - ${row.indexname}`);
        });

        console.log('\n🎉 Migration completed successfully!');
        console.log('\n📈 Expected performance improvements:');
        console.log('   - Matrix aggregation queries: ~500ms → ~20ms (25x faster)');
        console.log('   - /api/risks/matrix-data endpoint: 80-90% faster');
        console.log('   - Ready to scale to 1000+ risks\n');

    } catch (error) {
        console.error('\n❌ ERROR during migration:');
        console.error(error);
        console.error('\nTroubleshooting:');
        console.error('1. Check DATABASE_URL is correct');
        console.error('2. Ensure you have CREATE INDEX permissions');
        console.error('3. Check if there are any locks on the risks table');
        console.error('4. Try running manually: psql $DATABASE_URL < migrations/create-indexes-render.sql\n');
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the migration
applyMatrixIndex().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
