/**
 * Redis/Upstash Latency Diagnostic Script
 * 
 * This script measures and analyzes Redis cache performance to identify latency issues.
 * It tests various operations and provides detailed metrics.
 * 
 * Usage:
 *   npm run tsx scripts/diagnose-redis-latency.ts
 */

import redis, { usingRealRedis, distributedCache } from '../server/services/redis';
import { performance } from 'perf_hooks';

interface LatencyMetrics {
    operation: string;
    attempts: number;
    totalTime: number;
    avgTime: number;
    minTime: number;
    maxTime: number;
    p50: number;
    p95: number;
    p99: number;
    failures: number;
}

class RedisLatencyDiagnostic {
    private results: Map<string, number[]> = new Map();

    /**
     * Measure a single operation
     */
    private async measureOperation(
        name: string,
        operation: () => Promise<any>
    ): Promise<number> {
        const start = performance.now();
        try {
            await operation();
            const duration = performance.now() - start;

            if (!this.results.has(name)) {
                this.results.set(name, []);
            }
            this.results.get(name)!.push(duration);

            return duration;
        } catch (error) {
            console.error(`❌ Error in ${name}:`, error);
            return -1;
        }
    }

    /**
     * Calculate percentiles
     */
    private calculatePercentile(values: number[], percentile: number): number {
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }

    /**
     * Get metrics for an operation
     */
    private getMetrics(operation: string): LatencyMetrics {
        const times = this.results.get(operation) || [];
        const validTimes = times.filter(t => t >= 0);
        const failures = times.filter(t => t < 0).length;

        if (validTimes.length === 0) {
            return {
                operation,
                attempts: times.length,
                totalTime: 0,
                avgTime: 0,
                minTime: 0,
                maxTime: 0,
                p50: 0,
                p95: 0,
                p99: 0,
                failures
            };
        }

        return {
            operation,
            attempts: times.length,
            totalTime: validTimes.reduce((a, b) => a + b, 0),
            avgTime: validTimes.reduce((a, b) => a + b, 0) / validTimes.length,
            minTime: Math.min(...validTimes),
            maxTime: Math.max(...validTimes),
            p50: this.calculatePercentile(validTimes, 50),
            p95: this.calculatePercentile(validTimes, 95),
            p99: this.calculatePercentile(validTimes, 99),
            failures
        };
    }

    /**
     * Test basic Redis operations
     */
    async testBasicOperations(iterations: number = 10): Promise<void> {
        console.log(`\n🧪 Testing Basic Redis Operations (${iterations} iterations)...\n`);

        for (let i = 0; i < iterations; i++) {
            const testKey = `test:latency:${i}`;
            const testValue = JSON.stringify({ data: 'test', timestamp: Date.now() });

            // Test SET operation
            await this.measureOperation('SET', async () => {
                await redis.setex(testKey, 60, testValue);
            });

            // Test GET operation (cache hit)
            await this.measureOperation('GET (hit)', async () => {
                await redis.get(testKey);
            });

            // Test GET operation (cache miss)
            await this.measureOperation('GET (miss)', async () => {
                await redis.get(`nonexistent:${i}`);
            });

            // Test DEL operation
            await this.measureOperation('DEL', async () => {
                await redis.del(testKey);
            });

            // Small delay between iterations
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    /**
     * Test DistributedCache wrapper
     */
    async testDistributedCache(iterations: number = 10): Promise<void> {
        console.log(`\n🧪 Testing DistributedCache Wrapper (${iterations} iterations)...\n`);

        for (let i = 0; i < iterations; i++) {
            const testKey = `cache:test:${i}`;
            const testData = { id: i, name: `Test ${i}`, timestamp: Date.now() };

            // Test cache.set
            await this.measureOperation('cache.set', async () => {
                await distributedCache.set(testKey, testData, 60);
            });

            // Test cache.get (hit)
            await this.measureOperation('cache.get (hit)', async () => {
                await distributedCache.get(testKey);
            });

            // Test cache.get (miss)
            await this.measureOperation('cache.get (miss)', async () => {
                await distributedCache.get(`nonexistent:${i}`);
            });

            // Test cache.invalidate
            await this.measureOperation('cache.invalidate', async () => {
                await distributedCache.invalidate(testKey);
            });

            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    /**
     * Test realistic cache scenarios
     */
    async testRealisticScenarios(iterations: number = 5): Promise<void> {
        console.log(`\n🧪 Testing Realistic Cache Scenarios (${iterations} iterations)...\n`);

        for (let i = 0; i < iterations; i++) {
            // Simulate subprocesos cache (large payload)
            const largeData = Array.from({ length: 27 }, (_, idx) => ({
                id: `subproceso-${idx}`,
                name: `Subproceso ${idx}`,
                description: 'A'.repeat(200),
                riskLevel: Math.random() * 100,
                metadata: { created: Date.now(), updated: Date.now() }
            }));

            await this.measureOperation('Large Payload SET (27 items)', async () => {
                await distributedCache.set('subprocesos:test', largeData, 300);
            });

            await this.measureOperation('Large Payload GET', async () => {
                await distributedCache.get('subprocesos:test');
            });

            // Simulate process-owners cache (medium payload)
            const mediumData = Array.from({ length: 9 }, (_, idx) => ({
                id: `owner-${idx}`,
                name: `Owner ${idx}`,
                email: `owner${idx}@example.com`
            }));

            await this.measureOperation('Medium Payload SET (9 items)', async () => {
                await distributedCache.set('process-owners:test', mediumData, 300);
            });

            await this.measureOperation('Medium Payload GET', async () => {
                await distributedCache.get('process-owners:test');
            });

            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    /**
     * Test concurrent operations
     */
    async testConcurrentOperations(concurrency: number = 5): Promise<void> {
        console.log(`\n🧪 Testing Concurrent Operations (${concurrency} parallel requests)...\n`);

        const start = performance.now();

        const promises = Array.from({ length: concurrency }, async (_, i) => {
            const key = `concurrent:${i}`;
            await redis.setex(key, 60, JSON.stringify({ index: i }));
            await redis.get(key);
            await redis.del(key);
        });

        await Promise.all(promises);

        const duration = performance.now() - start;
        console.log(`✅ ${concurrency} concurrent operations completed in ${duration.toFixed(2)}ms`);
        console.log(`   Average per operation: ${(duration / concurrency).toFixed(2)}ms\n`);
    }

    /**
     * Print detailed report
     */
    printReport(): void {
        console.log('\n' + '='.repeat(80));
        console.log('📊 REDIS LATENCY DIAGNOSTIC REPORT');
        console.log('='.repeat(80) + '\n');

        console.log('🔧 Configuration:');
        console.log(`   Using Real Redis: ${usingRealRedis ? '✅ Yes' : '❌ No (In-Memory)'}`);
        console.log(`   Redis Type: ${this.getRedisType()}`);
        console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);

        const operations = Array.from(this.results.keys());

        if (operations.length === 0) {
            console.log('⚠️  No operations measured\n');
            return;
        }

        console.log('📈 Latency Metrics (all times in milliseconds):\n');
        console.log('┌─────────────────────────────────┬──────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬──────────┐');
        console.log('│ Operation                       │ N    │ Avg     │ Min     │ Max     │ P50     │ P95     │ P99     │ Failures │');
        console.log('├─────────────────────────────────┼──────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼──────────┤');

        for (const operation of operations) {
            const metrics = this.getMetrics(operation);
            console.log(
                `│ ${operation.padEnd(31)} │ ` +
                `${String(metrics.attempts).padStart(4)} │ ` +
                `${metrics.avgTime.toFixed(2).padStart(7)} │ ` +
                `${metrics.minTime.toFixed(2).padStart(7)} │ ` +
                `${metrics.maxTime.toFixed(2).padStart(7)} │ ` +
                `${metrics.p50.toFixed(2).padStart(7)} │ ` +
                `${metrics.p95.toFixed(2).padStart(7)} │ ` +
                `${metrics.p99.toFixed(2).padStart(7)} │ ` +
                `${String(metrics.failures).padStart(8)} │`
            );
        }

        console.log('└─────────────────────────────────┴──────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴──────────┘\n');

        this.printAnalysis();
    }

    /**
     * Print analysis and recommendations
     */
    private printAnalysis(): void {
        console.log('🔍 Analysis & Recommendations:\n');

        const getCacheHit = this.getMetrics('cache.get (hit)');
        const getCacheMiss = this.getMetrics('cache.get (miss)');
        const largePayloadGet = this.getMetrics('Large Payload GET');

        // Check for high latency
        if (getCacheHit.avgTime > 100) {
            console.log('⚠️  HIGH LATENCY DETECTED:');
            console.log(`   Cache GET operations averaging ${getCacheHit.avgTime.toFixed(2)}ms`);
            console.log('   Expected: < 50ms for Upstash, < 5ms for in-memory\n');

            if (usingRealRedis) {
                console.log('💡 Recommendations:');
                console.log('   1. Check Upstash region - should be geographically close to your server');
                console.log('   2. Verify network connectivity and firewall rules');
                console.log('   3. Consider implementing two-tier caching (in-memory + Redis)');
                console.log('   4. Add timeout to Redis operations with fallback to DB\n');
            }
        } else if (getCacheHit.avgTime > 50 && getCacheHit.avgTime <= 100) {
            console.log('⚡ MODERATE LATENCY:');
            console.log(`   Cache GET operations averaging ${getCacheHit.avgTime.toFixed(2)}ms`);
            console.log('   This is acceptable for distributed cache but could be optimized\n');
            console.log('💡 Recommendations:');
            console.log('   1. Implement in-memory cache for frequently accessed data');
            console.log('   2. Use Redis primarily for distributed/shared state\n');
        } else {
            console.log('✅ GOOD LATENCY:');
            console.log(`   Cache operations averaging ${getCacheHit.avgTime.toFixed(2)}ms\n`);
        }

        // Check for large payload issues
        if (largePayloadGet.avgTime > 200) {
            console.log('⚠️  LARGE PAYLOAD LATENCY:');
            console.log(`   Large payloads taking ${largePayloadGet.avgTime.toFixed(2)}ms`);
            console.log('💡 Recommendations:');
            console.log('   1. Consider pagination for large datasets');
            console.log('   2. Implement incremental loading');
            console.log('   3. Cache only essential data, fetch details on-demand\n');
        }

        // Check P95/P99 variance
        if (getCacheHit.p99 > getCacheHit.avgTime * 3) {
            console.log('⚠️  HIGH VARIANCE DETECTED:');
            console.log(`   P99 (${getCacheHit.p99.toFixed(2)}ms) is ${(getCacheHit.p99 / getCacheHit.avgTime).toFixed(1)}x the average`);
            console.log('💡 This suggests network instability or occasional slow responses\n');
        }

        console.log('📝 Next Steps:');
        console.log('   1. Run this diagnostic from your production environment');
        console.log('   2. Compare latency between development and production');
        console.log('   3. Monitor Redis/Upstash dashboard for connection metrics');
        console.log('   4. Consider implementing circuit breaker pattern for cache failures\n');
    }

    /**
     * Get Redis type
     */
    private getRedisType(): string {
        if (!usingRealRedis) return 'In-Memory Cache';
        if (process.env.UPSTASH_REDIS_REST_URL) return 'Upstash Redis (REST API)';
        if (process.env.REDIS_URL) return 'Redis (ioredis)';
        return 'Unknown';
    }

    /**
     * Cleanup test data
     */
    async cleanup(): Promise<void> {
        console.log('\n🧹 Cleaning up test data...');
        try {
            const patterns = ['test:*', 'cache:test:*', 'concurrent:*', 'subprocesos:test', 'process-owners:test'];
            for (const pattern of patterns) {
                const keys = await redis.keys(pattern);
                if (keys.length > 0) {
                    await redis.del(...keys);
                }
            }
            console.log('✅ Cleanup complete\n');
        } catch (error) {
            console.error('⚠️  Cleanup error:', error);
        }
    }
}

/**
 * Main execution
 */
async function main() {
    console.log('🚀 Starting Redis Latency Diagnostic...\n');
    console.log('This will measure cache performance and identify bottlenecks.\n');

    const diagnostic = new RedisLatencyDiagnostic();

    try {
        // Run all tests
        await diagnostic.testBasicOperations(20);
        await diagnostic.testDistributedCache(20);
        await diagnostic.testRealisticScenarios(10);
        await diagnostic.testConcurrentOperations(10);

        // Print comprehensive report
        diagnostic.printReport();

        // Cleanup
        await diagnostic.cleanup();

        console.log('✅ Diagnostic complete!\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Diagnostic failed:', error);
        process.exit(1);
    }
}

// Execute
main();
