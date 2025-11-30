
import { storage } from '../server/storage';
import { db } from '../server/db';
import { riskEvents, riskEventMacroprocesos, riskEventProcesses, riskEventSubprocesos } from '../shared/schema';
import { eq, inArray, sql } from 'drizzle-orm';

async function measurePerformance() {
    console.log('🚀 Starting performance verification...');

    // 1. Measure getAllRiskLevelsOptimized
    console.log('\n📊 Testing getAllRiskLevelsOptimized...');
    const startRiskLevels = performance.now();
    try {
        const riskLevels = await storage.getAllRiskLevelsOptimized();
        const endRiskLevels = performance.now();
        console.log(`✅ getAllRiskLevelsOptimized took ${(endRiskLevels - startRiskLevels).toFixed(2)}ms`);
        console.log(`   - Macroprocesos: ${riskLevels.macroprocesos.size}`);
        console.log(`   - Processes: ${riskLevels.processes.size}`);
        console.log(`   - Subprocesos: ${riskLevels.subprocesos.size}`);
    } catch (error) {
        console.error('❌ getAllRiskLevelsOptimized failed:', error);
    }

    // 2. Measure Risk Events Query (simulating page-data)
    console.log('\n📊 Testing Risk Events Query (simulating /api/risk-events/page-data)...');
    const startRiskEvents = performance.now();
    try {
        // Fetch a page of risk events
        const events = await db.select().from(riskEvents).limit(10).offset(0);
        const eventIds = events.map(e => e.id);

        if (eventIds.length > 0) {
            // Fetch related data using inArray (simulating the N+1 optimization target)
            const startRelations = performance.now();

            const [macroprocesos, processes, subprocesos] = await Promise.all([
                db.select().from(riskEventMacroprocesos).where(inArray(riskEventMacroprocesos.riskEventId, eventIds)),
                db.select().from(riskEventProcesses).where(inArray(riskEventProcesses.riskEventId, eventIds)),
                db.select().from(riskEventSubprocesos).where(inArray(riskEventSubprocesos.riskEventId, eventIds))
            ]);

            const endRelations = performance.now();
            console.log(`✅ Risk Events Page Data Query took ${(performance.now() - startRiskEvents).toFixed(2)}ms`);
            console.log(`   - Events fetched: ${events.length}`);
            console.log(`   - Relations fetch time: ${(endRelations - startRelations).toFixed(2)}ms`);
            console.log(`   - Related Macroprocesos: ${macroprocesos.length}`);
            console.log(`   - Related Processes: ${processes.length}`);
            console.log(`   - Related Subprocesos: ${subprocesos.length}`);
        } else {
            console.log('⚠️ No risk events found to test relations.');
        }
    } catch (error) {
        console.error('❌ Risk Events Query failed:', error);
    }

    console.log('\n🏁 Verification complete.');
    process.exit(0);
}

measurePerformance();
