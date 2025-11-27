/**
 * Load testing with autocannon
 * 
 * This script performs load testing on optimized endpoints to validate
 * performance improvements from batch processing and database-level pagination.
 * 
 * Run with: npx tsx tests/load-test.ts
 */

import autocannon from 'autocannon';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

interface TestResult {
  endpoint: string;
  requests: number;
  duration: number;
  avgLatency: number;
  p95Latency: number;
  errorsRate: number;
  throughput: number;
}

const testResults: TestResult[] = [];

/**
 * Test configuration for different endpoints
 */
const testConfigs = [
  {
    name: 'Risks List (Paginated)',
    url: `${BASE_URL}/api/risks?page=1&limit=20`,
    method: 'GET',
    description: 'Tests the paginated risks endpoint with database-level filtering'
  },
  {
    name: 'Audits List (Paginated)',
    url: `${BASE_URL}/api/audits?page=1&limit=20`,
    method: 'GET',
    description: 'Tests the paginated audits endpoint with database-level filtering'
  },
  {
    name: 'Admin Dashboard',
    url: `${BASE_URL}/api/dashboard/admin`,
    method: 'GET',
    description: 'Tests the admin dashboard with aggregated metrics'
  },
  {
    name: 'Process Owners',
    url: `${BASE_URL}/api/process-owners`,
    method: 'GET',
    description: 'Tests process owners endpoint (used in notification scheduler)'
  },
  {
    name: 'Health Check',
    url: `${BASE_URL}/health`,
    method: 'GET',
    description: 'Tests the health check endpoint (no auth required)'
  },
  {
    name: 'Metrics',
    url: `${BASE_URL}/metrics`,
    method: 'GET',
    description: 'Tests the metrics endpoint for observability'
  }
];

/**
 * Run a single load test
 */
async function runTest(config: typeof testConfigs[0]): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${config.name}`);
  console.log(`Description: ${config.description}`);
  console.log(`URL: ${config.url}`);
  console.log(`${'='.repeat(60)}\n`);

  const instance = autocannon({
    url: config.url,
    method: config.method,
    connections: 10, // concurrent connections
    duration: 10, // seconds
    pipelining: 1,
    headers: {
      'Content-Type': 'application/json',
      // Add session cookie if needed for authenticated endpoints
      // 'Cookie': 'connect.sid=...'
    }
  });

  return new Promise((resolve, reject) => {
    autocannon.track(instance, { renderProgressBar: true });

    instance.on('done', (result) => {
      // Process results
      const avgLatency = result.latency.mean;
      const p95Latency = result.latency.p95;
      const requests = result.requests.total;
      const duration = result.duration;
      const errors = result.non2xx + result.timeouts;
      const errorsRate = (errors / requests) * 100;
      const throughput = result.throughput.mean;

      testResults.push({
        endpoint: config.name,
        requests,
        duration,
        avgLatency,
        p95Latency,
        errorsRate,
        throughput
      });

      console.log('\n📊 Results:');
      console.log(`   Total Requests: ${requests}`);
      console.log(`   Duration: ${duration}s`);
      console.log(`   Avg Latency: ${avgLatency.toFixed(2)}ms`);
      console.log(`   P95 Latency: ${p95Latency.toFixed(2)}ms`);
      console.log(`   Requests/sec: ${result.requests.mean.toFixed(2)}`);
      console.log(`   Throughput: ${(throughput / 1024 / 1024).toFixed(2)} MB/s`);
      console.log(`   Errors: ${errors} (${errorsRate.toFixed(2)}%)`);

      resolve();
    });

    instance.on('error', (err) => {
      console.error(`❌ Error during test: ${err.message}`);
      reject(err);
    });
  });
}

/**
 * Print summary of all test results
 */
function printSummary(): void {
  console.log('\n\n' + '='.repeat(80));
  console.log('📈 LOAD TEST SUMMARY');
  console.log('='.repeat(80));
  console.log('\nPerformance Metrics:');
  console.log('-'.repeat(80));
  console.log(
    `${'Endpoint'.padEnd(30)} | ` +
    `${'Requests'.padEnd(10)} | ` +
    `${'Avg Latency'.padEnd(12)} | ` +
    `${'P95 Latency'.padEnd(12)} | ` +
    `${'Error Rate'.padEnd(10)}`
  );
  console.log('-'.repeat(80));

  testResults.forEach(result => {
    console.log(
      `${result.endpoint.padEnd(30)} | ` +
      `${result.requests.toString().padEnd(10)} | ` +
      `${result.avgLatency.toFixed(2).padEnd(12)}ms | ` +
      `${result.p95Latency.toFixed(2).padEnd(12)}ms | ` +
      `${result.errorsRate.toFixed(2).padEnd(10)}%`
    );
  });

  console.log('-'.repeat(80));

  // Performance evaluation
  console.log('\n🎯 Performance Evaluation:');
  const avgLatencyOverall = testResults.reduce((sum, r) => sum + r.avgLatency, 0) / testResults.length;
  const avgP95Overall = testResults.reduce((sum, r) => sum + r.p95Latency, 0) / testResults.length;
  const avgErrorRate = testResults.reduce((sum, r) => sum + r.errorsRate, 0) / testResults.length;

  console.log(`   Overall Avg Latency: ${avgLatencyOverall.toFixed(2)}ms`);
  console.log(`   Overall P95 Latency: ${avgP95Overall.toFixed(2)}ms`);
  console.log(`   Overall Error Rate: ${avgErrorRate.toFixed(2)}%`);

  // Performance benchmarks
  console.log('\n✅ Performance Benchmarks:');
  if (avgLatencyOverall < 200) {
    console.log('   ✅ Excellent: Average latency under 200ms');
  } else if (avgLatencyOverall < 500) {
    console.log('   ⚠️  Good: Average latency under 500ms');
  } else {
    console.log('   ❌ Needs improvement: Average latency over 500ms');
  }

  if (avgP95Overall < 1000) {
    console.log('   ✅ Excellent: P95 latency under 1 second');
  } else if (avgP95Overall < 2000) {
    console.log('   ⚠️  Good: P95 latency under 2 seconds');
  } else {
    console.log('   ❌ Needs improvement: P95 latency over 2 seconds');
  }

  if (avgErrorRate < 1) {
    console.log('   ✅ Excellent: Error rate under 1%');
  } else if (avgErrorRate < 5) {
    console.log('   ⚠️  Acceptable: Error rate under 5%');
  } else {
    console.log('   ❌ Needs improvement: Error rate over 5%');
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

/**
 * Main test runner
 */
async function main(): Promise<void> {
  console.log('🚀 Starting Load Tests...\n');
  console.log('Configuration:');
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Connections: 10 concurrent`);
  console.log(`   Duration: 10 seconds per test`);
  console.log(`   Total tests: ${testConfigs.length}\n`);

  try {
    // Run tests sequentially to avoid overwhelming the server
    for (const config of testConfigs) {
      await runTest(config);
      // Wait 2 seconds between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    printSummary();
  } catch (error) {
    console.error('❌ Load testing failed:', error);
    process.exit(1);
  }
}

// Run tests
main().catch(console.error);
