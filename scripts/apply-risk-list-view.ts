#!/usr/bin/env tsx
/**
 * Script to apply the risk_list_view materialized view migration
 * Creates read-model for optimized risk list queries
 * 
 * Usage: npm run apply-risk-list-view
 * Or: npx tsx scripts/apply-risk-list-view.ts
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const { Pool } = pg;

async function applyRiskListView() {
    console.log('🚀 Starting Risk List View Migration...\n');

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error('❌ ERROR: DATABASE_URL environment variable not set');
        console.error('   Set it with: export DATABASE_URL="postgresql://..."');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes('cloudsql') || databaseUrl.includes('render.com') 
            ? { rejectUnauthorized: false } 
            : undefined,
    });

    const db = drizzle(pool);

    try {
        console.log('📊 Checking if materialized view already exists...');
        
        // Verificar si la vista ya existe
        const checkResult = await db.execute(sql`
            SELECT EXISTS (
                SELECT 1 
                FROM pg_matviews 
                WHERE matviewname = 'risk_list_view'
            ) as exists
        `);
        
        const exists = (checkResult.rows[0] as any)?.exists;
        
        if (exists) {
            console.log('⚠️  Materialized view risk_list_view already exists');
            console.log('   Refreshing existing view...\n');
            
            // Verificar si tiene índice único
            const indexCheck = await db.execute(sql`
                SELECT EXISTS (
                    SELECT 1 
                    FROM pg_indexes 
                    WHERE indexname = 'ux_risk_list_view_id'
                ) as exists
            `);
            
            const hasUniqueIndex = (indexCheck.rows[0] as any)?.exists;
            
            if (!hasUniqueIndex) {
                console.log('📝 Creating unique index for CONCURRENTLY refresh...');
                await db.execute(sql`
                    CREATE UNIQUE INDEX IF NOT EXISTS ux_risk_list_view_id 
                    ON risk_list_view(id)
                `);
                console.log('✅ Unique index created\n');
            }
            
            // Refrescar la vista
            console.log('🔄 Refreshing materialized view...');
            await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY risk_list_view`);
            console.log('✅ Materialized view refreshed\n');
            
            // Verificar índices adicionales
            console.log('📝 Checking additional indexes...');
            const additionalIndexes = [
                { name: 'idx_risk_list_view_status', sql: sql`CREATE INDEX IF NOT EXISTS idx_risk_list_view_status ON risk_list_view(status)` },
                { name: 'idx_risk_list_view_macroproceso', sql: sql`CREATE INDEX IF NOT EXISTS idx_risk_list_view_macroproceso ON risk_list_view(macroproceso_id)` },
                { name: 'idx_risk_list_view_process', sql: sql`CREATE INDEX IF NOT EXISTS idx_risk_list_view_process ON risk_list_view(process_id)` },
                { name: 'idx_risk_list_view_subproceso', sql: sql`CREATE INDEX IF NOT EXISTS idx_risk_list_view_subproceso ON risk_list_view(subproceso_id)` },
                { name: 'idx_risk_list_view_created_at', sql: sql`CREATE INDEX IF NOT EXISTS idx_risk_list_view_created_at ON risk_list_view(created_at DESC)` },
                { name: 'idx_risk_list_view_filters', sql: sql`CREATE INDEX IF NOT EXISTS idx_risk_list_view_filters ON risk_list_view(status, macroproceso_id, process_id) WHERE status <> 'deleted'` },
            ];
            
            for (const idx of additionalIndexes) {
                await db.execute(idx.sql);
                console.log(`   ✅ ${idx.name}`);
            }
            
            // Índice full-text (puede fallar si no hay extensión, pero no es crítico)
            try {
                await db.execute(sql`
                    CREATE INDEX IF NOT EXISTS idx_risk_list_view_search ON risk_list_view 
                    USING gin(to_tsvector('spanish', COALESCE(name, '') || ' ' || COALESCE(code, '')))
                `);
                console.log('   ✅ idx_risk_list_view_search');
            } catch (err) {
                console.warn('   ⚠️  idx_risk_list_view_search (full-text search may require extension)');
            }
            
            console.log('\n✅ Migration completed successfully!');
            console.log('   Materialized view refreshed and indexes verified.\n');
            
        } else {
            console.log('📝 Creating materialized view...\n');
            
            // Leer y ejecutar el SQL de la migración
            const migrationPath = join(process.cwd(), 'migrations', 'create-risk-list-view.sql');
            const migrationSQL = readFileSync(migrationPath, 'utf-8');
            
            // Dividir en statements (separados por ;)
            const statements = migrationSQL
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--'));
            
            console.log(`   Executing ${statements.length} SQL statements...\n`);
            
            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i];
                if (statement.length > 0) {
                    try {
                        await db.execute(sql.raw(statement));
                        console.log(`   ✅ Statement ${i + 1}/${statements.length} executed`);
                    } catch (err) {
                        const error = err instanceof Error ? err.message : String(err);
                        // Algunos errores son esperados (IF NOT EXISTS)
                        if (error.includes('already exists') || error.includes('duplicate')) {
                            console.log(`   ⚠️  Statement ${i + 1}/${statements.length} (already exists, skipping)`);
                        } else {
                            console.error(`   ❌ Statement ${i + 1}/${statements.length} failed:`, error);
                            throw err;
                        }
                    }
                }
            }
            
            console.log('\n✅ Migration completed successfully!');
            console.log('   Materialized view created and populated.\n');
        }
        
        // Verificar resultado
        console.log('📊 Verifying migration...');
        const countResult = await db.execute(sql`
            SELECT COUNT(*)::int as count 
            FROM risk_list_view
        `);
        const count = (countResult.rows[0] as any)?.count || 0;
        console.log(`   ✅ Materialized view contains ${count} risks\n`);
        
        // Verificar índices
        const indexesResult = await db.execute(sql`
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'risk_list_view'
            ORDER BY indexname
        `);
        const indexes = indexesResult.rows.map((r: any) => r.indexname);
        console.log(`   ✅ Created ${indexes.length} indexes:`);
        indexes.forEach(idx => console.log(`      - ${idx}`));
        
        console.log('\n🎉 Migration completed successfully!\n');
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        if (error instanceof Error) {
            console.error('   Error message:', error.message);
            console.error('   Stack:', error.stack);
        }
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Ejecutar si es llamado directamente
applyRiskListView().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});

export { applyRiskListView };

