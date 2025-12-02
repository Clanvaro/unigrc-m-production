#!/usr/bin/env tsx
/**
 * Script to verify SQL Batch Calculation vs JS Iterative Calculation
 * Usage: npm run verify-calculation
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';

const { Pool } = pg;

async function verifyCalculation() {
    console.log('🚀 Starting Calculation Verification...\n');

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

    try {
        // 1. Setup Test Data
        console.log('📝 Setting up test data...');

        // Get a valid tenant ID
        const tenantResult = await db.execute(sql`SELECT id FROM tenants LIMIT 1`);
        if (tenantResult.rows.length === 0) {
            throw new Error('No tenants found in database. Cannot run test.');
        }
        const tenantId = tenantResult.rows[0].id;
        console.log(`   Using Tenant ID: ${tenantId}`);

        const testRiskId = 'test-risk-calc-verify';

        // Clean up previous test data
        await db.execute(sql`DELETE FROM risk_controls WHERE risk_id = ${testRiskId}`);
        await db.execute(sql`DELETE FROM risks WHERE id = ${testRiskId}`);
        await db.execute(sql`DELETE FROM controls WHERE id LIKE 'test-control-calc-%'`);

        // Create Risk (Prob: 5, Impact: 5)
        await db.execute(sql`
      INSERT INTO risks (id, code, name, probability, impact, inherent_risk, status, tenant_id)
      VALUES (${testRiskId}, 'TEST-CALC', 'Test Calculation Risk', 5, 5, 25, 'active', ${tenantId})
    `);

        // Create Controls
        // Control 1: 50% effectiveness (Prob) -> Factor 0.5
        // Control 2: 20% effectiveness (Impact) -> Factor 0.8
        // Control 3: 10% effectiveness (Both) -> Factor 0.9
        const controls = [
            { id: 'test-control-calc-1', eff: 50, target: 'probability' },
            { id: 'test-control-calc-2', eff: 20, target: 'impact' },
            { id: 'test-control-calc-3', eff: 10, target: 'both' }
        ];

        for (const c of controls) {
            await db.execute(sql`
        INSERT INTO controls (id, code, name, effectiveness, effect_target, status, tenant_id, type, frequency)
        VALUES (${c.id}, ${c.id}, ${c.id}, ${c.eff}, ${c.target}, 'active', ${tenantId}, 'preventive', 'monthly')
      `);

            await db.execute(sql`
        INSERT INTO risk_controls (risk_id, control_id, residual_risk)
        VALUES (${testRiskId}, ${c.id}, 0)
      `);
        }

        // 2. Calculate Expected Result (JS Logic)
        console.log('\n🧮 Calculating Expected Result (JS Logic)...');

        // Prob: 5 * (1-0.5) * (1-0.1) = 5 * 0.5 * 0.9 = 2.25 -> Round(2.3)
        // Impact: 5 * (1-0.2) * (1-0.1) = 5 * 0.8 * 0.9 = 3.6 -> Round(3.6)
        // Final: 2.3 * 3.6 = 8.28 -> Round(8.3)

        // Let's run the exact JS logic from the codebase
        let resProb = 5;
        // Prob controls: 1 (50%), 3 (10%)
        resProb = resProb * (1 - 50 / 100);
        resProb = resProb * (1 - 10 / 100);
        resProb = Math.max(0.1, Math.min(5, Math.round(resProb * 10) / 10)); // 2.3

        let resImpact = 5;
        // Impact controls: 2 (20%), 3 (10%)
        resImpact = resImpact * (1 - 20 / 100);
        resImpact = resImpact * (1 - 10 / 100);
        resImpact = Math.max(0.1, Math.min(5, Math.round(resImpact * 10) / 10)); // 3.6

        const expectedResidual = Math.round((resProb * resImpact) * 10) / 10; // 8.3

        console.log(`   Expected Residual Risk: ${expectedResidual}`);
        console.log(`   (Prob: ${resProb}, Impact: ${resImpact})`);

        // 3. Run SQL Calculation
        console.log('\n⚙️ Running SQL Calculation...');

        await db.execute(sql`
      WITH risk_calculations AS (
        SELECT 
          r.id as risk_id,
          r.probability,
          r.impact,
          -- Calculate Probability Reduction
          COALESCE(
            EXP(SUM(
              CASE WHEN c.effect_target IN ('probability', 'both') 
              THEN LN(GREATEST(0.0001, 1 - (c.effectiveness / 100.0))) 
              ELSE 0 END
            )), 
            1
          ) as prob_reduction,
          -- Calculate Impact Reduction
          COALESCE(
            EXP(SUM(
              CASE WHEN c.effect_target IN ('impact', 'both') 
              THEN LN(GREATEST(0.0001, 1 - (c.effectiveness / 100.0))) 
              ELSE 0 END
            )), 
            1
          ) as impact_reduction
        FROM risks r
        JOIN risk_controls rc ON r.id = rc.risk_id
        JOIN controls c ON rc.control_id = c.id
        WHERE r.id = ${testRiskId}
        GROUP BY r.id, r.probability, r.impact
      ),
      final_values AS (
        SELECT 
          risk_id,
          GREATEST(0.1, LEAST(5, ROUND((probability * prob_reduction)::numeric, 1))) as res_prob,
          GREATEST(0.1, LEAST(5, ROUND((impact * impact_reduction)::numeric, 1))) as res_impact
        FROM risk_calculations
      )
      UPDATE risk_controls rc
      SET residual_risk = ROUND((fv.res_prob * fv.res_impact)::numeric, 1)
      FROM final_values fv
      WHERE rc.risk_id = fv.risk_id;
    `);

        // 4. Verify Result
        const result = await db.execute(sql`SELECT residual_risk FROM risk_controls WHERE risk_id = ${testRiskId} LIMIT 1`);
        const actualResidual = Number(result.rows[0].residual_risk);

        console.log(`\n✅ Actual SQL Result: ${actualResidual}`);

        if (actualResidual === expectedResidual) {
            console.log('\n🎉 SUCCESS: SQL calculation matches JS logic exactly!');
        } else {
            console.error(`\n❌ FAILURE: Mismatch! Expected ${expectedResidual}, got ${actualResidual}`);
            process.exit(1);
        }

        // Cleanup
        console.log('\n🧹 Cleaning up...');
        await db.execute(sql`DELETE FROM risk_controls WHERE risk_id = ${testRiskId}`);
        await db.execute(sql`DELETE FROM risks WHERE id = ${testRiskId}`);
        await db.execute(sql`DELETE FROM controls WHERE id LIKE 'test-control-calc-%'`);

    } catch (error) {
        console.error('\n❌ ERROR:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

verifyCalculation().catch(console.error);
