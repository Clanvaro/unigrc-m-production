/**
 * Script para aplicar la migración de risk_events_list_view
 * Ejecuta el SQL de creación de la vista materializada
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

async function applyRiskEventsListViewMigration() {
    console.log('🚀 Starting Risk Events List View Migration...\n');

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error('❌ ERROR: DATABASE_URL environment variable not set');
        console.error('   Set it with: export DATABASE_URL="postgresql://..."');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
    });

    const db = drizzle(pool);

    try {
        console.log('📊 Checking if materialized view already exists...');
        const checkView = await db.execute(sql`
            SELECT 1 FROM pg_matviews WHERE matviewname = 'risk_events_list_view';
        `);

        if (checkView.rows.length > 0) {
            console.log('✅ materialized view risk_events_list_view already exists. Skipping creation, will attempt refresh.');
        } else {
            console.log('✨ Creating materialized view risk_events_list_view...');
            const migrationSql = fs.readFileSync(
                path.join(__dirname, '../migrations/create-risk-events-list-view.sql'),
                'utf8'
            );
            await db.execute(sql.raw(migrationSql));
            console.log('✅ materialized view risk_events_list_view created successfully.');
        }

        console.log('🔄 Attempting initial refresh of risk_events_list_view...');
        await db.execute(sql`REFRESH MATERIALIZED VIEW risk_events_list_view`);
        console.log('✅ Initial refresh completed.');

        console.log('🔍 Verifying data in risk_events_list_view...');
        const countResult = await db.execute(
            sql`SELECT COUNT(*)::int as total_events FROM risk_events_list_view;`
        );
        const totalEvents = (countResult.rows[0] as any)?.total_events || 0;
        console.log(`📊 risk_events_list_view contains ${totalEvents} events.`);

        console.log('\n🎉 Risk Events List View Migration Completed Successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        console.error('   Error message:', error instanceof Error ? error.message : 'Unknown error');
        console.error('   Stack:', error instanceof Error ? error.stack : 'No stack trace');
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Execute the migration script when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    applyRiskEventsListViewMigration();
}

export { applyRiskEventsListViewMigration };

