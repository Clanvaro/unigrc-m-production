
import { storage } from '../server/storage';
import { db } from '../server/db';

async function measureSubprocesosPerformance() {
    console.log('🚀 Starting subprocesos performance verification...');

    // Measure getAllRiskLevelsOptimized with subprocesos entity filter
    console.log('\n📊 Testing getAllRiskLevelsOptimized({ entities: ["subprocesos"] })...');
    const startRiskLevels = performance.now();
    try {
        const riskLevels = await storage.getAllRiskLevelsOptimized({ entities: ['subprocesos'] });
        const endRiskLevels = performance.now();
        console.log(`✅ getAllRiskLevelsOptimized took ${(endRiskLevels - startRiskLevels).toFixed(2)}ms`);
        console.log(`   - Subprocesos with risks: ${riskLevels.subprocesos.size}`);

        // Verify that other maps are empty (as expected with optimization)
        console.log(`   - Macroprocesos map size: ${riskLevels.macroprocesos.size} (should be 0)`);
        console.log(`   - Processes map size: ${riskLevels.processes.size} (should be 0)`);

    } catch (error) {
        console.error('❌ getAllRiskLevelsOptimized failed:', error);
    }

    console.log('\n🏁 Verification complete.');
    process.exit(0);
}

measureSubprocesosPerformance();
