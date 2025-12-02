#!/usr/bin/env tsx
/**
 * Script to measure performance baseline for critical endpoints
 * Usage: DATABASE_URL=... npm run measure-baseline
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';

const { Pool } = pg;

async function measureBaseline() {
    console.log('🚀 Starting Performance Baseline Measurement...\n');

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

    const iterations = 5;

    async function measureQuery(name: string, queryFn: () => Promise<any>) {
        console.log(`\n📊 Measuring: ${name}`);
        const times: number[] = [];

        // Warmup
        process.stdout.write('   Warmup... ');
        await queryFn();
        console.log('Done');

        for (let i = 0; i < iterations; i++) {
            process.stdout.write(`   Run ${i + 1}/${iterations}... `);
            const start = Date.now();
            await queryFn();
            const duration = Date.now() - start;
            times.push(duration);
            console.log(`${duration}ms`);
        }

        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);

        console.log(`   👉 Avg: ${avg.toFixed(2)}ms | Min: ${min}ms | Max: ${max}ms`);
        return { name, avg, min, max };
    }

    try {
        const results = [];

        // 1. Risk Matrix (Optimized)
        results.push(await measureQuery('Risk Matrix (Optimized)', async () => {
            // Fetch lightweight risk data
            const risksData = await db.execute(sql`
        SELECT 
          id, code, name, 
          probability, impact, 
          (probability * impact) as "inherentRisk",
          status, category,
          macroproceso_id as "macroprocesoId",
          process_id as "processId",
          subproceso_id as "subprocesoId"
        FROM risks
        WHERE status != 'deleted' 
          AND status = 'active'
      `);

            // Fetch control effectiveness
            const controlsData = await db.execute(sql`
        SELECT 
          rc.risk_id as "riskId",
          c.effectiveness
        FROM risk_controls rc
        JOIN controls c ON rc.control_id = c.id
        WHERE c.status != 'deleted'
      `);

            return { risks: risksData.rows.length, controls: controlsData.rows.length };
        }));

        // 2. Validation Center (Pending Controls)
        results.push(await measureQuery('Validation Center (Pending Controls)', async () => {
            return await db.execute(sql`
        SELECT 
          c.id, c.code, c.name, c.description,
          po.id as owner_id, po.name as owner_name
        FROM controls c
        LEFT JOIN control_owners co ON c.id = co.control_id
        LEFT JOIN process_owners po ON co.process_owner_id = po.id
        WHERE c.validation_status = 'pending_validation'
          AND c.status != 'deleted'
      `);
        }));

        // 3. Risk Events (List)
        results.push(await measureQuery('Risk Events (List 100)', async () => {
            return await db.execute(sql`
        SELECT * FROM risk_events 
        WHERE deleted_at IS NULL 
        ORDER BY event_date DESC 
        LIMIT 100
      `);
        }));

        // 4. Controls (List All)
        results.push(await measureQuery('Controls (List All)', async () => {
            return await db.execute(sql`
        SELECT * FROM controls 
        WHERE status != 'deleted' 
        ORDER BY code
      `);
        }));

        console.log('\n\n📈 FINAL RESULTS SUMMARY');
        console.log('================================================================');
        console.log('| Endpoint                       | Avg (ms) | Min (ms) | Max (ms) |');
        console.log('|--------------------------------|----------|----------|----------|');
        results.forEach(r => {
            console.log(`| ${r.name.padEnd(30)} | ${r.avg.toFixed(2).padStart(8)} | ${r.min.toString().padStart(8)} | ${r.max.toString().padStart(8)} |`);
        });
        console.log('================================================================\n');

    } catch (error) {
        console.error('\n❌ ERROR during measurement:', error);
    } finally {
        await pool.end();
    }
}

measureBaseline().catch(console.error);
