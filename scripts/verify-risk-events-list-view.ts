/**
 * Script para verificar que risk_events_list_view está funcionando correctamente
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';

const { Pool } = pg;

async function verifyRiskEventsListView() {
    console.log('🔍 Verifying Risk Events List View...\n');

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error('❌ ERROR: DATABASE_URL environment variable not set');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
    });

    const db = drizzle(pool);

    try {
        // Verificar que la vista existe
        const viewExists = await db.execute(sql`
            SELECT 1 FROM pg_matviews WHERE matviewname = 'risk_events_list_view';
        `);

        if (viewExists.rows.length === 0) {
            console.error('❌ ERROR: risk_events_list_view does not exist');
            console.error('   Run: npm run apply-risk-events-list-view');
            process.exit(1);
        }

        console.log('✅ risk_events_list_view exists');

        // Verificar índice único
        const uniqueIndex = await db.execute(sql`
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'risk_events_list_view' 
            AND indexname = 'ux_risk_events_list_view_id';
        `);

        if (uniqueIndex.rows.length === 0) {
            console.warn('⚠️  WARNING: Unique index ux_risk_events_list_view_id not found');
            console.warn('   REFRESH CONCURRENTLY will not work without this index');
        } else {
            console.log('✅ Unique index ux_risk_events_list_view_id exists');
        }

        // Contar eventos
        const countResult = await db.execute(
            sql`SELECT COUNT(*)::int as total FROM risk_events_list_view;`
        );
        const total = (countResult.rows[0] as any)?.total || 0;
        console.log(`📊 Total events in view: ${total}`);

        // Verificar índices adicionales
        const indexes = await db.execute(sql`
            SELECT indexname FROM pg_indexes 
            WHERE tablename = 'risk_events_list_view'
            ORDER BY indexname;
        `);
        console.log(`\n📋 Indexes (${indexes.rows.length}):`);
        indexes.rows.forEach((row: any) => {
            console.log(`   - ${row.indexname}`);
        });

        // Verificar una muestra de datos
        const sample = await db.execute(sql`
            SELECT id, code, event_date, event_type, status, severity
            FROM risk_events_list_view
            LIMIT 3;
        `);
        if (sample.rows.length > 0) {
            console.log('\n📝 Sample data:');
            sample.rows.forEach((row: any) => {
                console.log(`   - ${row.code}: ${row.event_type} (${row.status})`);
            });
        }

        console.log('\n✅ Verification completed successfully!');
    } catch (error) {
        console.error('❌ Verification failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Execute when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    verifyRiskEventsListView();
}

export { verifyRiskEventsListView };

