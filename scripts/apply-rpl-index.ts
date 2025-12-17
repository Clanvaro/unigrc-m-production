#!/usr/bin/env tsx
/**
 * Script para aplicar el índice específico para optimizar getRisksLite()
 * Crea idx_rpl_riskid_createdat_desc en risk_process_links
 * 
 * Usage: npm run apply-rpl-index
 * Or: tsx scripts/apply-rpl-index.ts
 */

// Load environment variables from .env file
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env') });

import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

async function applyRplIndex() {
    console.log('🚀 Aplicando índice para optimizar getRisksLite() LATERAL JOIN...\n');

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
        console.log('📝 Creando índice idx_rpl_riskid_createdat_desc...');
        console.log('   Este índice optimiza el LATERAL JOIN en getRisksLite()\n');

        const startTime = Date.now();

        // Crear el índice específico
        await db.execute(sql`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rpl_riskid_createdat_desc
            ON risk_process_links (risk_id, created_at DESC)
            WHERE responsible_override_id IS NOT NULL;
        `);

        console.log('   ✅ Índice creado exitosamente\n');

        // Actualizar estadísticas
        console.log('   Actualizando estadísticas...');
        await db.execute(sql`ANALYZE risk_process_links;`);
        console.log('   ✅ Estadísticas actualizadas\n');

        // Verificar que el índice existe
        const indexCheck = await db.execute(sql`
            SELECT 
              schemaname,
              tablename,
              indexname,
              indexdef
            FROM pg_indexes
            WHERE indexname = 'idx_rpl_riskid_createdat_desc';
        `);

        if (indexCheck.rows.length > 0) {
            console.log('📊 Índice verificado:');
            console.log(`   Tabla: ${indexCheck.rows[0].tablename}`);
            console.log(`   Nombre: ${indexCheck.rows[0].indexname}`);
            console.log(`   Definición: ${indexCheck.rows[0].indexdef}\n`);
        }

        const duration = Date.now() - startTime;
        console.log(`✅ Índice aplicado exitosamente en ${duration}ms\n`);
        console.log('💡 Este índice optimiza:');
        console.log('   - LATERAL JOIN queries en getRisksLite()');
        console.log('   - Reduce tiempo de ~1200ms a mucho menos');
        console.log('   - Permite que ORDER BY ... LIMIT 1 use índice en lugar de escanear\n');

    } catch (error) {
        console.error('❌ Error aplicando índice:', error);
        if (error instanceof Error) {
            console.error('   Message:', error.message);
            console.error('   Stack:', error.stack);
        }
        process.exit(1);
    } finally {
        await pool.end();
    }
}

applyRplIndex().catch(console.error);

