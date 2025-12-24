#!/usr/bin/env tsx
/**
 * Script para verificar que risk_list_view está funcionando correctamente
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';

const { Pool } = pg;

async function verifyRiskListView() {
    console.log('🔍 Verificando risk_list_view...\n');

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error('❌ ERROR: DATABASE_URL environment variable not set');
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
        // 1. Verificar que la vista existe
        console.log('1️⃣ Verificando que la vista existe...');
        const viewCheck = await db.execute(sql`
            SELECT EXISTS (
                SELECT 1 FROM pg_matviews WHERE matviewname = 'risk_list_view'
            ) as exists
        `);
        const exists = (viewCheck.rows[0] as any)?.exists;
        
        if (!exists) {
            console.error('❌ La vista materializada risk_list_view NO existe');
            console.error('   Ejecuta: npm run apply-risk-list-view');
            process.exit(1);
        }
        console.log('   ✅ Vista materializada existe\n');

        // 2. Verificar índice único
        console.log('2️⃣ Verificando índice único...');
        const indexCheck = await db.execute(sql`
            SELECT EXISTS (
                SELECT 1 FROM pg_indexes 
                WHERE indexname = 'ux_risk_list_view_id'
            ) as exists
        `);
        const hasUniqueIndex = (indexCheck.rows[0] as any)?.exists;
        
        if (!hasUniqueIndex) {
            console.error('❌ El índice único ux_risk_list_view_id NO existe');
            console.error('   Esto es requerido para REFRESH CONCURRENTLY');
            process.exit(1);
        }
        console.log('   ✅ Índice único existe\n');

        // 3. Contar registros
        console.log('3️⃣ Contando registros...');
        const countResult = await db.execute(sql`
            SELECT COUNT(*)::int as count FROM risk_list_view
        `);
        const count = (countResult.rows[0] as any)?.count || 0;
        console.log(`   ✅ Vista contiene ${count} riesgos\n`);

        // 4. Verificar índices adicionales
        console.log('4️⃣ Verificando índices adicionales...');
        const indexesResult = await db.execute(sql`
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'risk_list_view'
            ORDER BY indexname
        `);
        const indexes = indexesResult.rows.map((r: any) => r.indexname);
        console.log(`   ✅ ${indexes.length} índices encontrados:`);
        indexes.forEach(idx => console.log(`      - ${idx}`));
        console.log('');

        // 5. Probar query de ejemplo
        console.log('5️⃣ Probando query de ejemplo...');
        const sampleResult = await db.execute(sql`
            SELECT 
                id, code, name, status, 
                control_count, avg_effectiveness,
                residual_risk_approx
            FROM risk_list_view
            LIMIT 5
        `);
        console.log(`   ✅ Query exitosa, ${sampleResult.rows.length} registros de ejemplo\n`);

        // 6. Verificar última actualización
        console.log('6️⃣ Verificando última actualización...');
        const lastUpdate = await db.execute(sql`
            SELECT MAX(materialized_at) as last_update
            FROM risk_list_view
        `);
        const lastUpdateTime = (lastUpdate.rows[0] as any)?.last_update;
        console.log(`   ✅ Última actualización: ${lastUpdateTime || 'N/A'}\n`);

        console.log('🎉 ¡Todas las verificaciones pasaron!\n');
        console.log('✅ risk_list_view está lista para usar\n');
        console.log('📝 Próximos pasos:');
        console.log('   1. El servicio de refresh se iniciará automáticamente al arrancar el servidor');
        console.log('   2. Prueba el endpoint: GET /api/pages/risks');
        console.log('   3. (Opcional) Actualiza el frontend para usar el nuevo endpoint\n');

    } catch (error) {
        console.error('\n❌ Error en verificación:', error);
        if (error instanceof Error) {
            console.error('   Error message:', error.message);
        }
        process.exit(1);
    } finally {
        await pool.end();
    }
}

verifyRiskListView().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});

