#!/usr/bin/env tsx
/**
 * Script to apply performance indexes for /api/risks/page-data-lite endpoint
 * Optimizes:
 * - LATERAL JOIN in getRisksLite() with risk_process_links
 * - JOINs in getAllProcessGerenciasRelations() with *_gerencias tables
 * 
 * Usage: npm run apply-page-data-lite-indexes
 * Or: tsx scripts/apply-page-data-lite-indexes.ts
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';

const { Pool } = pg;

async function applyPageDataLiteIndexes() {
    console.log('🚀 Starting Page Data Lite Performance Index Migration...\n');

    const databaseUrl = process.env.DATABASE_URL || process.env.RENDER_DATABASE_URL || process.env.POOLED_DATABASE_URL || process.env.DIRECT_DATABASE_URL;
    if (!databaseUrl) {
        console.error('❌ ERROR: DATABASE_URL environment variable not set');
        console.error('   Set DATABASE_URL, RENDER_DATABASE_URL, POOLED_DATABASE_URL, or DIRECT_DATABASE_URL');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
    });

    const db = drizzle(pool);

    try {
        console.log('📝 Creating indexes for page-data-lite optimization...');
        console.log('   This may take a few seconds...\n');

        const startTime = Date.now();

        // ============= RISK_PROCESS_LINKS - Optimización LATERAL JOIN =============
        console.log('   Creating indexes for risk_process_links...');
        
        console.log('   Creating idx_rpl_riskid_createdat_desc...');
        await db.execute(sql`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rpl_riskid_createdat_desc
            ON risk_process_links (risk_id, created_at DESC)
            WHERE responsible_override_id IS NOT NULL;
        `);
        console.log('   ✅ idx_rpl_riskid_createdat_desc created\n');

        console.log('   Creating idx_rpl_risk_responsible_created_desc_partial...');
        await db.execute(sql`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rpl_risk_responsible_created_desc_partial
            ON risk_process_links(risk_id, responsible_override_id, created_at DESC NULLS LAST)
            WHERE responsible_override_id IS NOT NULL;
        `);
        console.log('   ✅ idx_rpl_risk_responsible_created_desc_partial created\n');

        // ============= TABLAS *_GERENCIAS - Optimización JOINs =============
        console.log('   Creating indexes for *_gerencias tables...');
        
        console.log('   Creating indexes for macroproceso_gerencias...');
        await db.execute(sql`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_macroproceso_gerencias_macroproceso_id
            ON macroproceso_gerencias(macroproceso_id);
        `);
        await db.execute(sql`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_macroproceso_gerencias_gerencia_id
            ON macroproceso_gerencias(gerencia_id);
        `);
        console.log('   ✅ macroproceso_gerencias indexes created\n');

        console.log('   Creating indexes for process_gerencias...');
        await db.execute(sql`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_gerencias_process_id
            ON process_gerencias(process_id);
        `);
        await db.execute(sql`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_gerencias_gerencia_id
            ON process_gerencias(gerencia_id);
        `);
        console.log('   ✅ process_gerencias indexes created\n');

        console.log('   Creating indexes for subproceso_gerencias...');
        await db.execute(sql`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subproceso_gerencias_subproceso_id
            ON subproceso_gerencias(subproceso_id);
        `);
        await db.execute(sql`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subproceso_gerencias_gerencia_id
            ON subproceso_gerencias(gerencia_id);
        `);
        console.log('   ✅ subproceso_gerencias indexes created\n');

        // ============= ÍNDICES ADICIONALES PARA OPTIMIZAR FILTROS deleted_at =============
        console.log('   Creating indexes for deleted_at filters...');
        
        await db.execute(sql`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_macroprocesos_id_deleted
            ON macroprocesos(id) WHERE deleted_at IS NULL;
        `);
        await db.execute(sql`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_processes_id_deleted
            ON processes(id) WHERE deleted_at IS NULL;
        `);
        await db.execute(sql`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subprocesos_id_deleted
            ON subprocesos(id) WHERE deleted_at IS NULL;
        `);
        await db.execute(sql`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gerencias_id_deleted
            ON gerencias(id) WHERE deleted_at IS NULL;
        `);
        console.log('   ✅ deleted_at filter indexes created\n');

        // ============= ACTUALIZAR ESTADÍSTICAS =============
        console.log('   Updating statistics...');
        await db.execute(sql`ANALYZE risk_process_links;`);
        await db.execute(sql`ANALYZE macroproceso_gerencias;`);
        await db.execute(sql`ANALYZE process_gerencias;`);
        await db.execute(sql`ANALYZE subproceso_gerencias;`);
        await db.execute(sql`ANALYZE macroprocesos;`);
        await db.execute(sql`ANALYZE processes;`);
        await db.execute(sql`ANALYZE subprocesos;`);
        await db.execute(sql`ANALYZE gerencias;`);
        console.log('   ✅ Statistics updated\n');

        const duration = Date.now() - startTime;
        console.log(`✅ Migration completed successfully in ${duration}ms\n`);
        console.log('📊 Indexes created:');
        console.log('   - idx_rpl_riskid_createdat_desc (risk_process_links) - Optimizes LATERAL JOIN in getRisksLite()');
        console.log('   - idx_rpl_risk_responsible_created_desc_partial (risk_process_links)');
        console.log('   - idx_macroproceso_gerencias_macroproceso_id');
        console.log('   - idx_macroproceso_gerencias_gerencia_id');
        console.log('   - idx_process_gerencias_process_id');
        console.log('   - idx_process_gerencias_gerencia_id');
        console.log('   - idx_subproceso_gerencias_subproceso_id');
        console.log('   - idx_subproceso_gerencias_gerencia_id');
        console.log('   - idx_macroprocesos_id_deleted');
        console.log('   - idx_processes_id_deleted');
        console.log('   - idx_subprocesos_id_deleted');
        console.log('   - idx_gerencias_id_deleted');
        console.log('\n💡 These indexes will optimize:');
        console.log('   - LATERAL JOIN queries in getRisksLite()');
        console.log('   - UNION ALL queries in getAllProcessGerenciasRelations()');
        console.log('   - JOINs with deleted_at IS NULL filters\n');

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

applyPageDataLiteIndexes().catch(console.error);

